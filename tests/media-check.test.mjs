import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {concat} from '../scripts/stitch.mjs';

const url = new URL('../scripts/lib/media-check.mjs', import.meta.url);
const media = fs.existsSync(url) ? await import(url.href) : {};
const run = args => {
  const result = spawnSync('ffmpeg', ['-hide_banner','-loglevel','error','-y',...args], {encoding:'utf8'});
  assert.ifError(result.error); assert.equal(result.status,0,result.stderr);
};
test('episode verification rejects silent, short, corrupt and wrong-rate output', t => {
  assert.equal(typeof media.verifyEpisode,'function');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(),'dreamy-media-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const video = path.join(dir,'silent.mp4'), audio = path.join(dir,'voice.wav'), output = path.join(dir,'episode.mp4');
  run(['-f','lavfi','-i','color=c=blue:s=160x90:r=30','-frames:v','30','-c:v','libx264','-pix_fmt','yuv420p',video]);
  run(['-f','lavfi','-i','sine=frequency=440:duration=1','-ar','48000',audio]);
  run(['-i',video,'-i',audio,'-c:v','copy','-c:a','aac',output]);
  const report = media.verifyEpisode(output,{frames:30});
  assert.equal(report.video.frames,30); assert.equal(report.video.fps,30); assert.ok(report.audio.duration>0.9);
  assert.throws(()=>media.verifyEpisode(video,{frames:30}),/audio/i);
  assert.throws(()=>media.verifyEpisode(output,{frames:60}),/frame|duration/i);
  assert.throws(()=>media.verifyEpisode(output,{frames:30,fps:24}),/rate|fps/i);
  const short=path.join(dir,'short.mp4');
  run(['-i',video,'-f','lavfi','-i','sine=frequency=440:duration=0.3','-c:v','copy','-c:a','aac',short]);
  assert.throws(()=>media.verifyEpisode(short,{frames:30}),/audio.*duration/i);
  fs.writeFileSync(path.join(dir,'broken.mp4'),'invalid');
  assert.throws(()=>media.verifyEpisode(path.join(dir,'broken.mp4'),{frames:30}),/probe|invalid|ffprobe/i);
});

test('chunk validation checks IDs, exact voiced frame ranges and compatible geometry', t => {
  assert.equal(typeof media.validateChunks,'function');
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dreamy-chunks-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const files=[0,1].map(i=>path.join(dir,`chunk-${i}.mp4`));
  for(const file of files)run(['-f','lavfi','-i','color=c=green:s=160x90:r=30','-frames:v','15','-c:v','libx264',file]);
  assert.equal(media.validateChunks(files,{frames:30,count:2}).length,2);
  assert.throws(()=>media.validateChunks(files.slice(0,1),{frames:30,count:2}),/chunk/i);
  assert.throws(()=>media.validateChunks([files[1]],{frames:15,count:1}),/chunk/i);
  assert.throws(()=>media.validateChunks(files,{frames:31,count:2}),/frame/i);
  run(['-f','lavfi','-i','color=c=green:s=320x180:r=30','-frames:v','15','-c:v','libx264',files[1]]);
  assert.throws(()=>media.validateChunks(files,{frames:30,count:2}),/geometry|dimension|compatible/i);
});

test('compilation concatenation preserves the source audio without an external audio track', t => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dreamy-concat-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const input=path.join(dir,'part.mp4'),output=path.join(dir,'compilation.mp4');
  run(['-f','lavfi','-i','color=c=blue:s=160x90:r=30','-f','lavfi','-i','sine=frequency=440:duration=1','-t','1','-c:v','libx264','-c:a','aac',input]);
  concat([input,input],null,output);
  const result=spawnSync('ffprobe',['-v','error','-select_streams','a:0','-show_entries','stream=codec_type','-of','csv=p=0',output],{encoding:'utf8'});
  assert.equal(result.stdout.trim(),'audio');
});
