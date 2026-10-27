import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import YAML from 'yaml';

const root=new URL('../',import.meta.url).pathname;
const workflow=YAML.parse(fs.readFileSync(new URL('../.github/workflows/test.yml',import.meta.url),'utf8'));
const setup=workflow.jobs.checks.steps.find(step=>/Install media tools if missing/.test(step.name??''));

function fixture(t,{mode='success',installed=false}={}) {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dreamy-media-setup-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const bin=path.join(dir,'bin');fs.mkdirSync(bin);
  const put=(name,body)=>fs.writeFileSync(path.join(bin,name),`#!/bin/bash\nset -e\n${body}\n`,{mode:0o755});
  const tool=path.join(dir,'media-tool');fs.writeFileSync(tool,'#!/bin/bash\nprintf "media fixture\\n"\n',{mode:0o755});
  if(installed)for(const name of ['ffmpeg','ffprobe'])fs.copyFileSync(tool,path.join(bin,name));
  fs.symlinkSync('/usr/bin/env',path.join(bin,'env'));
  put('sudo','if [ "$1" = "-n" ]; then shift; fi\nexec "$@"');
  put('timeout',`
    printf 'limit %s\\n' "$*" >> "$MEDIA_LOG"
    if [ "$MEDIA_MODE" = refresh_timeout ] && [[ "$*" = *' update'* ]]; then exit 124; fi
    shift 2
    exec "$@"
  `);
  put('apt-get',`
    printf 'apt %s\\n' "$*" >> "$MEDIA_LOG"
    if [[ "$*" = *' update'* ]]; then
      if [ "$MEDIA_MODE" = broken ]; then exit 100; fi
      exit 0
    fi
    if [ "$MEDIA_MODE" = broken ]; then exit 100; fi
    if [ "$MEDIA_MODE" != success ] && [ ! -f "$MEDIA_STATE" ]; then
      printf 'failed once' > "$MEDIA_STATE"
      exit 100
    fi
    if [[ "$*" = *ffmpeg* ]]; then
      /bin/cp "$MEDIA_TOOL" "$MEDIA_BIN/ffmpeg"
      /bin/cp "$MEDIA_TOOL" "$MEDIA_BIN/ffprobe"
    fi
    if [[ "$*" = *fonts-noto-color-emoji* ]]; then
      printf '#!/bin/bash\\nprintf "Noto Color Emoji"\\n' > "$MEDIA_BIN/fc-match"
      /bin/chmod +x "$MEDIA_BIN/fc-match"
    fi
  `);
  const log=path.join(dir,'calls'),githubPath=path.join(dir,'github-path');
  const env={...process.env,PATH:bin,MEDIA_MODE:mode,MEDIA_LOG:log,MEDIA_BIN:bin,MEDIA_TOOL:tool,
    MEDIA_STATE:path.join(dir,'state'),GITHUB_PATH:githubPath};
  const run=(command=setup.run)=>spawnSync('/bin/bash',['-e','-c',command],{cwd:root,env,encoding:'utf8',timeout:5000});
  const calls=()=>fs.existsSync(log)?fs.readFileSync(log,'utf8').trim().split('\n'):[];
  return {run,calls,githubPath};
}

test('available media tools skip all package work and preserve PATH',t=>{
  const {run,calls,githubPath}=fixture(t,{installed:true});
  const result=run();assert.ifError(result.error);assert.equal(result.status,0,result.stderr);
  assert.deepEqual(calls(),[]);assert.equal(fs.existsSync(githubPath),false);
});

test('missing media tools install from existing package indexes before any refresh',t=>{
  const {run,calls}=fixture(t);
  const result=run();assert.ifError(result.error);assert.equal(result.status,0,result.stderr);
  const apt=calls().filter(line=>line.startsWith('apt '));
  assert.equal(apt.length,1);assert.match(apt[0],/install.*ffmpeg/);assert.doesNotMatch(apt[0],/update/);
  assert.equal(calls().filter(line=>line.startsWith('limit ')).length,1,'package installation must have a total timeout');
});

test('a stale package index gets one bounded Ubuntu-only refresh and one install retry',t=>{
  const {run,calls}=fixture(t,{mode:'stale'});
  const result=run();assert.ifError(result.error);assert.equal(result.status,0,result.stderr);
  const apt=calls().filter(line=>line.startsWith('apt '));
  assert.equal(apt.length,3);
  assert.match(apt[0],/install.*ffmpeg/);assert.match(apt[1],/update/);assert.match(apt[2],/install.*ffmpeg/);
  assert.match(apt[1],/Dir::Etc::sourceparts=-/,'unrelated third-party package mirrors must not be refreshed');
  assert.match(apt[1],/Dir::Etc::sourcelist=\/etc\/apt\/(sources\.list|sources\.list\.d\/ubuntu\.sources)/);
  for(const line of calls().filter(line=>line.startsWith('limit ')))assert.match(line,/--kill-after=5s 60s /);
});

test('a timed-out index refresh still permits a successful cached-index install retry',t=>{
  const {run,calls}=fixture(t,{mode:'refresh_timeout'});
  const result=run();assert.ifError(result.error);assert.equal(result.status,0,result.stderr);
  assert.equal(calls().filter(line=>/^apt .*install/.test(line)).length,2);
  assert.equal(calls().filter(line=>line.startsWith('limit ')).length,3);
  assert.match(result.stdout,/refresh.*(failed|timed out)/i);
});

test('persistent package failures stop after two installs with a visible error',t=>{
  const {run,calls}=fixture(t,{mode:'broken'});
  const result=run();assert.ifError(result.error);assert.equal(result.status,1);
  assert.equal(calls().filter(line=>/^apt .*install/.test(line)).length,2);
  assert.equal(calls().filter(line=>line.startsWith('limit ')).length,3);
  assert.match(result.stderr,/media tools.*(install|unavailable|missing)/i);
});

test('render-only font setup installs no unnecessary media packages',t=>{
  const {run,calls}=fixture(t);
  const result=run('/bin/bash .github/scripts/install-media.sh --emoji-only');
  assert.ifError(result.error);assert.equal(result.status,0,result.stderr);
  const apt=calls().filter(line=>line.startsWith('apt '));
  assert.equal(apt.length,1);assert.match(apt[0],/fonts-noto-color-emoji/);assert.doesNotMatch(apt[0],/ffmpeg/);
});

test('combined setup installs media and emoji together, then skips an already prepared runner',t=>{
  const {run,calls}=fixture(t);
  const command='/bin/bash .github/scripts/install-media.sh --emoji';
  const result=run(command);assert.ifError(result.error);assert.equal(result.status,0,result.stderr);
  const apt=calls().filter(line=>line.startsWith('apt '));
  assert.equal(apt.length,1);assert.match(apt[0],/ffmpeg/);assert.match(apt[0],/fonts-noto-color-emoji/);
  const before=calls();
  const repeat=run(command);assert.ifError(repeat.error);assert.equal(repeat.status,0,repeat.stderr);
  assert.deepEqual(calls(),before);
});
