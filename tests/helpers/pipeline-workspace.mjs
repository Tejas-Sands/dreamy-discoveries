import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

export const root=fileURLToPath(new URL('../../',import.meta.url));

/** Run the production CLIs against disposable history, without local .env/secrets. */
export function pipelineWorkspace(t,{modelDownloads=false}={}) {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dreamy-pipeline-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  for(const folder of ['scripts','src','library'])fs.cpSync(path.join(root,folder),path.join(dir,folder),{
    recursive:true,filter:file=>!/^local\.db(?:-|$)/.test(path.basename(file)),
  });
  for(const file of ['package.json','package-lock.json','tsconfig.json','remotion.config.ts']) {
    fs.copyFileSync(path.join(root,file),path.join(dir,file));
  }
  fs.symlinkSync(path.join(root,'node_modules'),path.join(dir,'node_modules'),'dir');
  fs.mkdirSync(path.join(dir,'public'),{recursive:true});
  for(const folder of ['brand','fonts','music','sfx','vox']) {
    fs.symlinkSync(path.join(root,'public',folder),path.join(dir,'public',folder),'dir');
  }
  const preload=path.join(dir,'network-guard.mjs');
  fs.writeFileSync(preload,`
    const originalFetch=globalThis.fetch;
    globalThis.fetch=(input,...args)=>{
      const url=new URL(typeof input==='string'||input instanceof URL?input:input.url);
      const local=['localhost','127.0.0.1','[::1]'].includes(url.hostname);
      const model=${JSON.stringify(modelDownloads)}&&(url.hostname==='huggingface.co'||url.hostname.endsWith('.huggingface.co')||url.hostname.endsWith('.hf.co'));
      if(!local&&!model)throw new Error('External request forbidden in pipeline test: '+url.hostname);
      return originalFetch(input,...args);
    };
  `);
  const env={...process.env,NODE_OPTIONS:`--import=${preload}`,NODE_TEST_CONTEXT:'',CI:'true',
    TTS_ENGINE:'kokoro',TTS_VOICE:'',NARRATOR_VOICE:'',TTS_SPEED:'.95',TARGET_MINUTES:'0',
    GROQ_API_KEY:'',GEMINI_API_KEY:'',OPENROUTER_API_KEY:'',LLM_API_KEY:'',LLM_BASE_URL:'',LLM_MODEL:'',
    TELEGRAM_BOT_TOKEN:'',TELEGRAM_CHAT_ID:'',GH_TOKEN:'',GITHUB_TOKEN:'',GITHUB_OUTPUT:'',
    TURSO_URL:'',TURSO_AUTH_TOKEN:'',RENDER_CONCURRENCY:'2'};
  const file=relative=>path.join(dir,relative);
  const write=(relative,value)=>{
    fs.mkdirSync(path.dirname(file(relative)),{recursive:true});
    fs.writeFileSync(file(relative),typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value,null,2));
  };
  const read=relative=>fs.readFileSync(file(relative),'utf8');
  const run=(entry,args=[],{success=true,timeout=180000}={})=>{
    const result=spawnSync(process.execPath,[`scripts/${entry}.mjs`,...args],{
      cwd:dir,env,encoding:'utf8',timeout,maxBuffer:16*1024*1024,
    });
    assert.ifError(result.error);
    const details=`${entry} ${args.join(' ')}\n${result.stdout.slice(-3500)}\n${result.stderr.slice(-3500)}`;
    if(success)assert.equal(result.status,0,details);
    else assert.notEqual(result.status,0,details);
    return result;
  };
  return {dir,env,file,write,read,run};
}
