import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const url=new URL('../scripts/lib/audio-master.mjs',import.meta.url);
const audio=fs.existsSync(url)?await import(url.href):{};

test('mastering measures levels and produces bounded audio without changing its input',t=>{
  assert.equal(typeof audio.masterAudio,'function');
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'dreamy-master-'));
  t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const input=path.join(directory,'voice.wav'),out=path.join(directory,'master.aac');
  const made=spawnSync('ffmpeg',['-v','error','-f','lavfi','-i','sine=frequency=440:duration=3','-af','volume=0.25',input]);
  assert.ifError(made.error);assert.equal(made.status,0);
  const before=fs.readFileSync(input),result=audio.masterAudio(input,out);
  assert.deepEqual(fs.readFileSync(input),before);
  assert.ok(Math.abs(result.after.integrated+16)<1,JSON.stringify(result));
  assert.ok(result.after.truePeak<=-1.5,JSON.stringify(result));
  assert.ok(fs.statSync(out).size>0);
  const repeat=audio.masterAudio(input,path.join(directory,'repeat.aac'));
  assert.deepEqual(repeat,result);
  assert.deepEqual(fs.readFileSync(out),fs.readFileSync(path.join(directory,'repeat.aac')));
});

test('silent mixes remain silent and malformed loudness results fail explicitly',t=>{
  assert.equal(typeof audio.masterAudio,'function');
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dreamy-silent-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const input=path.join(dir,'silent.wav'),out=path.join(dir,'silent.aac');
  const made=spawnSync('ffmpeg',['-v','error','-f','lavfi','-i','anullsrc=r=48000:cl=mono','-t','1',input]);
  assert.equal(made.status,0);
  assert.equal(audio.masterAudio(input,out).silent,true);
  assert.throws(()=>audio.parseLoudness('not JSON'),/loudness/i);
  assert.throws(()=>audio.parseLoudness('{"input_i":"oops"}'),/loudness/i);
});
