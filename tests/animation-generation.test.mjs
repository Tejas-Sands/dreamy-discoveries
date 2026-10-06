import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {directScript} from '../scripts/lib/director.mjs';

test('zero-AI generation enables v3, pins cast voices, and preserves immutable slug reruns',t=>{
  const root=new URL('../',import.meta.url).pathname,dir=fs.mkdtempSync(path.join(os.tmpdir(),'dreamy-animation-generation-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  for(const part of ['scripts','library','src/lib'])fs.cpSync(path.join(root,part),path.join(dir,part),{recursive:true,filter:file=>!file.endsWith('.db')});
  fs.symlinkSync(path.join(root,'node_modules'),path.join(dir,'node_modules'));
  const env={...process.env,GROQ_API_KEY:'',GEMINI_API_KEY:'',OPENROUTER_API_KEY:'',LLM_API_KEY:'',TURSO_URL:'',TURSO_AUTH_TOKEN:'',GITHUB_OUTPUT:'',TTS_ENGINE:'kokoro',TTS_VOICE:'',NARRATOR_VOICE:'',TTS_SPEED:'0.88'};
  const run=args=>spawnSync(process.execPath,['scripts/generate-script.mjs',...args],{cwd:dir,encoding:'utf8',env,timeout:15000});
  const slug='new-animation-counting';
  const result=run(['--template','counting','--hero','bunny','--seed','42','--slug',slug]);
  assert.equal(result.status,0,result.stderr);
  const generated=path.join(dir,'public/generated',slug,'script.json');
  const script=JSON.parse(fs.readFileSync(generated,'utf8'));
  assert.equal(script.presentationVersion,3);
  assert.equal(script.synthesis.cacheVersion,3);
  assert.equal(new Set(Object.values(script.synthesis.castVoices)).size,6);
  assert.deepEqual(JSON.parse(JSON.stringify(directScript(script))),script);
  assert.equal(fs.existsSync(path.join(dir,'library/scripts',`${slug}.json`)),false);

  const permanentSlug='permanent-animation-v2';
  const permanent=path.join(dir,'library/scripts',`${permanentSlug}.json`);
  const old={...script,slug:permanentSlug,presentationVersion:2};
  fs.writeFileSync(permanent,JSON.stringify(old));
  const before=fs.readFileSync(permanent,'utf8');
  const rerun=run(['--slug',permanentSlug]);assert.equal(rerun.status,0,rerun.stderr);
  assert.equal(fs.readFileSync(permanent,'utf8'),before);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir,'public/generated',permanentSlug,'script.json'))),old);
});

test('object action supplies automatic comedy while authored gags survive',()=>{
  const raw={slug:'object-comedy',title:'A Little Ball',type:'story',presentationVersion:3,palette:'meadow',mainCharacter:{kind:'duck',name:'Daisy'},intro:null,outro:null,moral:null,
    scenes:[{kind:'story',background:'playground',character:'duck',secondCharacter:'fox',prop:'ball',lines:[{text:'I push the ball to Fiona.',speaker:'character',emotion:'happy',action:'idle'}],gag:{kind:'flyby',emoji:'🦋',atSec:1,auto:true}}]};
  const automatic=directScript(raw);assert.ok(automatic.scenes[0].staging.events.some(e=>e.kind==='push'));assert.equal(automatic.scenes[0].gag,null);
  const authored=structuredClone(raw);delete authored.scenes[0].gag.auto;
  assert.equal(directScript(authored).scenes[0].gag.kind,'flyby');
  assert.deepEqual(directScript(automatic),automatic);
});
