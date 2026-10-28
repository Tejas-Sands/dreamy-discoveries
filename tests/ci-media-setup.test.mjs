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
    # Reproduce the hosted failure: downloads consume most of the timeout,
    # then the combined install is killed with dpkg only partly unpacked.
    if [ "$MEDIA_MODE" = slow_download ] && [[ "$*" = *' install '* ]] && [[ "$*" != *--download-only* ]] && [ ! -f "$MEDIA_DOWNLOADED" ] && [ ! -f "$MEDIA_INTERRUPTED" ]; then
      printf 'interrupted' > "$MEDIA_INTERRUPTED"
      exit 124
    fi
    shift 2
    exec "$@"
  `);
  put('apt-get',`
    printf 'apt %s\\n' "$*" >> "$MEDIA_LOG"
    if [[ "$*" = *' update'* ]]; then
      if [ "$MEDIA_MODE" = broken ]; then exit 100; fi
      exit 0
    fi
    if [ -f "$MEDIA_INTERRUPTED" ]; then
      printf 'E: dpkg was interrupted; run dpkg --configure -a\\n' >&2
      exit 100
    fi
    if [ "$MEDIA_MODE" = broken ]; then exit 100; fi
    if [[ "$MEDIA_MODE" = stale || "$MEDIA_MODE" = refresh_timeout || "$MEDIA_MODE" = download_timeout ]] && [ ! -f "$MEDIA_STATE" ]; then
      printf 'failed once' > "$MEDIA_STATE"
      if [ "$MEDIA_MODE" = download_timeout ]; then exit 124; fi
      exit 100
    fi
    if [[ "$*" = *--download-only* ]]; then
      printf 'downloaded' > "$MEDIA_DOWNLOADED"
      exit 0
    fi
    if [[ "$*" = *--no-download* ]] && [ ! -f "$MEDIA_DOWNLOADED" ]; then exit 100; fi
    if [ "$MEDIA_MODE" = install_failure ]; then exit 100; fi
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
    MEDIA_STATE:path.join(dir,'state'),MEDIA_DOWNLOADED:path.join(dir,'downloaded'),
    MEDIA_INTERRUPTED:path.join(dir,'interrupted'),GITHUB_PATH:githubPath};
  const run=(command=setup.run)=>spawnSync('/bin/bash',['-e','-c',command],{cwd:root,env,encoding:'utf8',timeout:5000});
  const calls=()=>fs.existsSync(log)?fs.readFileSync(log,'utf8').trim().split('\n'):[];
  return {run,calls,githubPath,bin,interrupted:env.MEDIA_INTERRUPTED};
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
  assert.equal(apt.length,2);assert.match(apt[0],/install.*--download-only.*ffmpeg/);
  assert.match(apt[1],/install.*--no-download.*ffmpeg/);
  assert.equal(calls().filter(line=>line.startsWith('limit ')).length,2,'download and installation must each have a total timeout');
});

test('a stale package index gets one bounded Ubuntu-only refresh and one install retry',t=>{
  const {run,calls}=fixture(t,{mode:'stale'});
  const result=run();assert.ifError(result.error);assert.equal(result.status,0,result.stderr);
  const apt=calls().filter(line=>line.startsWith('apt '));
  assert.equal(apt.length,4);
  assert.match(apt[0],/install.*--download-only.*ffmpeg/);assert.match(apt[1],/update/);
  assert.match(apt[2],/install.*--download-only.*ffmpeg/);assert.match(apt[3],/install.*--no-download.*ffmpeg/);
  assert.match(apt[1],/Dir::Etc::sourceparts=-/,'unrelated third-party package mirrors must not be refreshed');
  assert.match(apt[1],/Dir::Etc::sourcelist=\/etc\/apt\/(sources\.list|sources\.list\.d\/ubuntu\.sources)/);
  // Worst case, including every kill grace, must fit the existing 4-minute step.
  const limits=calls().filter(line=>line.startsWith('limit '));
  const seconds=limits.reduce((sum,line)=>sum+Number(line.match(/--kill-after=5s (\d+)s /)[1])+5,0);
  assert.ok(seconds<240,`package operations can consume ${seconds}s`);
});

test('a timed-out index refresh still permits a successful cached-index install retry',t=>{
  const {run,calls}=fixture(t,{mode:'refresh_timeout'});
  const result=run();assert.ifError(result.error);assert.equal(result.status,0,result.stderr);
  assert.equal(calls().filter(line=>/^apt .*--download-only/.test(line)).length,2);
  assert.equal(calls().filter(line=>line.startsWith('limit ')).length,4);
  assert.match(result.stdout,/refresh.*(failed|timed out)/i);
});

test('persistent download failures stop before mutating the package database',t=>{
  const {run,calls}=fixture(t,{mode:'broken'});
  const result=run();assert.ifError(result.error);assert.equal(result.status,1);
  assert.equal(calls().filter(line=>/^apt .*install/.test(line)).length,2);
  assert.equal(calls().filter(line=>line.startsWith('limit ')).length,3);
  assert.ok(calls().filter(line=>/^apt .*install/.test(line)).every(line=>line.includes('--download-only')));
  assert.match(result.stderr,/media tools.*(install|unavailable|missing)/i);
});

test('render-only font setup installs no unnecessary media packages',t=>{
  const {run,calls}=fixture(t);
  const result=run('/bin/bash .github/scripts/install-media.sh --emoji-only');
  assert.ifError(result.error);assert.equal(result.status,0,result.stderr);
  const apt=calls().filter(line=>line.startsWith('apt '));
  assert.equal(apt.length,2);
  for(const line of apt){assert.match(line,/fonts-noto-color-emoji/);assert.doesNotMatch(line,/ffmpeg/);}
});

test('combined setup installs media and emoji together, then skips an already prepared runner',t=>{
  const {run,calls}=fixture(t);
  const command='/bin/bash .github/scripts/install-media.sh --emoji';
  const result=run(command);assert.ifError(result.error);assert.equal(result.status,0,result.stderr);
  const apt=calls().filter(line=>line.startsWith('apt '));
  assert.equal(apt.length,2);
  for(const line of apt){assert.match(line,/ffmpeg/);assert.match(line,/fonts-noto-color-emoji/);}
  const before=calls();
  const repeat=run(command);assert.ifError(repeat.error);assert.equal(repeat.status,0,repeat.stderr);
  assert.deepEqual(calls(),before);
});

test('slow downloads finish before dpkg starts so the install cannot inherit their elapsed time',t=>{
  const {run,bin,interrupted}=fixture(t,{mode:'slow_download'});
  const result=run('/bin/bash .github/scripts/install-media.sh --emoji');
  assert.ifError(result.error);assert.equal(result.status,0,`${result.stdout}\n${result.stderr}`);
  assert.equal(fs.existsSync(interrupted),false,'setup must never start unpacking with a spent download timeout');
  for(const name of ['ffmpeg','ffprobe','fc-match'])assert.ok(fs.existsSync(path.join(bin,name)),`${name} must be ready for stitching`);
});

test('a timed-out download retries without leaving an interrupted dpkg transaction',t=>{
  const {run,calls,bin,interrupted}=fixture(t,{mode:'download_timeout'});
  const result=run();assert.ifError(result.error);assert.equal(result.status,0,result.stderr);
  assert.equal(fs.existsSync(interrupted),false);
  for(const name of ['ffmpeg','ffprobe'])assert.ok(fs.existsSync(path.join(bin,name)));
  assert.equal(calls().filter(line=>/^apt .*--download-only/.test(line)).length,2);
  assert.equal(calls().filter(line=>/^apt .*--no-download/.test(line)).length,1);
});

test('a failed unpack stops visibly instead of refreshing indexes and retrying an interrupted install',t=>{
  const {run,calls,bin}=fixture(t,{mode:'install_failure'});
  const result=run();assert.ifError(result.error);assert.equal(result.status,1);
  assert.equal(fs.existsSync(path.join(bin,'ffmpeg')),false);
  const apt=calls().filter(line=>line.startsWith('apt '));
  assert.equal(apt.length,2);assert.match(apt[0],/--download-only/);assert.match(apt[1],/--no-download/);
  assert.match(result.stderr,/install.*(failed|complete|limit)/i);
});
