import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {stagingPreview} from '../scripts/preview-staging.mjs';

test('version2 planning persists an explicit voice override for the voice job, with immutable library and dry reruns',t=>{
  const root=new URL('../',import.meta.url).pathname,dir=fs.mkdtempSync(path.join(os.tmpdir(),'dreamy-plan-voice-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  for(const part of ['scripts','library','src/lib'])fs.cpSync(path.join(root,part),path.join(dir,part),{recursive:true,filter:file=>!file.endsWith('.db')});
  fs.symlinkSync(path.join(root,'node_modules'),path.join(dir,'node_modules'));
  const slug='v2-voice-pin',script=stagingPreview(slug),permanent=path.join(dir,'library/scripts',`${slug}.json`);
  fs.writeFileSync(permanent,JSON.stringify(script));const before=fs.readFileSync(permanent,'utf8');
  const run=extra=>spawnSync(process.execPath,['scripts/plan.mjs','--slug',slug,'--voice','am_michael',...extra],{cwd:dir,encoding:'utf8',env:{...process.env,TURSO_URL:'',TURSO_AUTH_TOKEN:'',GITHUB_OUTPUT:''},timeout:15000});
  const result=run([]);assert.equal(result.status,0,result.stderr);
  const generated=path.join(dir,'public/generated',slug,'script.json');
  assert.equal(JSON.parse(fs.readFileSync(generated)).synthesis.castVoices.bunny,'am_michael');
  assert.equal(fs.readFileSync(permanent,'utf8'),before);
  const generatedBefore=fs.readFileSync(generated,'utf8'),dry=run(['--dry']);assert.equal(dry.status,0,dry.stderr);assert.equal(fs.readFileSync(generated,'utf8'),generatedBefore);
});
