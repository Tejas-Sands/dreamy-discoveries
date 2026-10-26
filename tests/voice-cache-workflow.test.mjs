import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import YAML from 'yaml';

test('planning keeps available media tools without package installation or PATH replacement',t=>{
  const {jobs}=YAML.parse(fs.readFileSync(new URL('../.github/workflows/make-video.yml',import.meta.url),'utf8'));
  const setup=jobs.plan.steps.find(step=>/media tools for regression tests/i.test(step.name??''));
  assert.ok(setup);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dreamy-ci-media-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const output=path.join(dir,'github-path');
  const mediaPath=new URL('../node_modules/@remotion/compositor-linux-x64-gnu',import.meta.url).pathname;
  const result=spawnSync('/bin/bash',['-e','-c',setup.run],{
    cwd:new URL('../',import.meta.url),encoding:'utf8',env:{...process.env,PATH:mediaPath,GITHUB_PATH:output},
  });
  assert.ifError(result.error);assert.equal(result.status,0,result.stderr);
  assert.equal(fs.existsSync(output),false,'fixture generation must keep its full host FFmpeg');
  for(const tool of ['ffmpeg','ffprobe']) {
    const version=spawnSync(tool,['-version'],{encoding:'utf8',env:{...process.env,PATH:mediaPath}});
    assert.ifError(version.error);assert.equal(version.status,0,version.stderr);
    assert.match(version.stdout,new RegExp(`${tool} version`));
  }
});

test('CI restores and saves the engine selected by the script before checking voice needs', () => {
  const {jobs}=YAML.parse(fs.readFileSync(new URL('../.github/workflows/make-video.yml',import.meta.url),'utf8'));
  const plan=jobs.plan;
  assert.equal(plan.outputs.voice_engine,'${{ steps.plan.outputs.voice_engine }}');
  const restore=plan.steps.find(s=>s.uses==='actions/cache/restore@v4' && s.with.path==='.cache/voice');
  assert.equal(restore.with.key,'voice-${{ steps.script.outputs.voice_engine }}-${{ github.run_id }}');
  assert.equal(restore.with['restore-keys'],'voice-${{ steps.script.outputs.voice_engine }}-');
  assert.ok(plan.steps.findIndex(s=>s.id==='script')<plan.steps.indexOf(restore),'select the script before restoring its voice engine');
  const check=plan.steps.find(s=>s.id==='plan');
  assert.ok(plan.steps.indexOf(check)>plan.steps.indexOf(restore),'check missing lines after restoring the selected engine');
  assert.match(check.run,/--slug/,'the second pass must reuse the selected script without another writing call');
  assert.equal(jobs.voice.env.TTS_ENGINE,'${{ needs.plan.outputs.voice_engine }}');
  for(const step of jobs.voice.steps.filter(s=>s.with?.path==='.cache/voice')) {
    assert.equal(step.with.key,'voice-${{ env.TTS_ENGINE }}-${{ github.run_id }}');
    if(step.uses==='actions/cache/restore@v4') assert.equal(step.with['restore-keys'],'voice-${{ env.TTS_ENGINE }}-');
  }
});
test('render caches include the shared staging module that the composition imports',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/make-video.yml',import.meta.url),'utf8');
  const keys=workflow.split('\n').filter(line=>line.includes('key: remotion-'));
  assert.equal(keys.length,3);
  for(const key of keys)assert.ok(key.includes("'scripts/lib/staging.mjs'"),key);
});
