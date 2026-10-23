import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import {validateChunks,verifyEpisode} from '../scripts/lib/media-check.mjs';
import {ROOT,GENERATED_DIR} from '../scripts/lib/common.mjs';
import {VIDEO_ENCODING,VIDEO_ENCODING_FLAGS} from '../scripts/lib/render-profile.mjs';
const ffmpeg=args=>{const r=spawnSync('ffmpeg',['-y','-v','error',...args],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);};
const require=createRequire(import.meta.url);

test('BT.709 JPEG encoding preserves the decoded source colors with the bundled FFmpeg',t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dreamy-jpeg-color-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const jpeg=path.join(dir,'source.jpg'),output=path.join(dir,'encoded.mp4');
  ffmpeg(['-f','lavfi','-i','color=c=0xE7A8A3:s=64x64','-frames:v','1','-q:v','2',jpeg]);
  const {generateFfmpegArgs}=require(path.join(ROOT,'node_modules/@remotion/renderer/dist/ffmpeg-args.js'));
  const generated=generateFfmpegArgs({hasPreencoded:false,proResProfileName:null,pixelFormat:VIDEO_ENCODING.pixelFormat,
    colorSpace:VIDEO_ENCODING.colorSpace,codec:'h264',crf:18,x264Preset:'ultrafast',gopSize:null,
    videoBitrate:null,encodingMaxRate:null,encodingBufferSize:null,hardwareAcceleration:'disable',indent:false,logLevel:'error'}).flat(2).filter(Boolean);
  const original=['-y','-v','error','-r','30','-f','image2','-vcodec','mjpeg','-i',jpeg,'-frames:v','1',...generated,output];
  const args=VIDEO_ENCODING.ffmpegOverride?.({type:'pre-stitcher',args:original})??original;
  const encoded=spawnSync(path.join(ROOT,'node_modules/@remotion/compositor-linux-x64-gnu/ffmpeg'),args,{timeout:15000,killSignal:'SIGKILL'});
  assert.equal(encoded.status,0,String(encoded.stderr));
  const rgb=file=>{
    const result=spawnSync('ffmpeg',['-v','error','-i',file,'-frames:v','1','-vf','scale=1:1','-pix_fmt','rgb24','-f','rawvideo','pipe:1']);
    assert.equal(result.status,0,String(result.stderr));return [...result.stdout];
  };
  const source=rgb(jpeg),actual=rgb(output);
  assert.ok(actual.every((value,i)=>Math.abs(value-source[i])<=2),`JPEG ${source} became ${actual}`);
  const probe=JSON.parse(spawnSync('ffprobe',['-v','error','-show_frames','-show_entries','stream=color_space,color_range,pix_fmt,color_primaries,color_transfer:frame=color_primaries,color_transfer','-of','json',output],{encoding:'utf8'}).stdout);
  const metadata=probe.streams[0];
  assert.equal(metadata.color_space,'bt709');assert.equal(metadata.color_range,'tv');assert.equal(metadata.pix_fmt,'yuv420p');
  for (const details of [metadata,...probe.frames]) {
    assert.equal(details.color_primaries,'bt709','SDR primaries must be explicit in both the stream and encoded frames');
    assert.equal(details.color_transfer,'bt709','SDR transfer metadata must survive the JPEG filter');
  }
});

test('CLI and API share a targeted immutable JPEG conversion policy',()=>{
  assert.equal(typeof VIDEO_ENCODING.ffmpegOverride,'function');
  const calls={};
  const config=new Proxy({}, {get:(_,name)=>value=>{calls[name]=value;}});
  const source=ts.transpileModule(fs.readFileSync(path.join(ROOT,'remotion.config.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(source,{exports:{},require:specifier=>specifier==='@remotion/cli/config'?{Config:config}:specifier==='./scripts/lib/render-profile.mjs'?{VIDEO_ENCODING}:require(specifier)});
  assert.equal(calls.overrideFfmpegCommand,VIDEO_ENCODING.ffmpegOverride);
  assert.equal(calls.setColorSpace,VIDEO_ENCODING.colorSpace);assert.equal(calls.setPixelFormat,VIDEO_ENCODING.pixelFormat);
  assert.deepEqual(VIDEO_ENCODING_FLAGS,['--color-space=bt709','--pixel-format=yuv420p']);
  const filter='zscale=matrix=709:matrixin=709:range=limited';
  const jpeg=['-f','image2pipe','-vcodec','mjpeg','-i','-','-vf',filter,'out.mp4'];
  const before=[...jpeg],corrected=VIDEO_ENCODING.ffmpegOverride({type:'pre-stitcher',args:jpeg});
  assert.deepEqual(jpeg,before,'the override must not mutate the renderer arguments');
  assert.notDeepEqual(corrected,jpeg);
  for(const [type,args]of [['stitcher',jpeg],['pre-stitcher',jpeg.map(arg=>arg==='mjpeg'?'png':arg)],
    ['pre-stitcher',['-i','audio.wav','-codec:a','pcm_s16le','out.wav']],
    ['pre-stitcher',jpeg.map(arg=>arg===filter?'scale=32:32':arg)]]) {
    assert.equal(VIDEO_ENCODING.ffmpegOverride({type,args}),args,'PNG, audio and unrelated filters remain untouched');
  }
});

test('chunk verification rejects mixed HD/SD color metadata and reports the encoded color space',t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dreamy-color-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const chunks=[0,1].map(i=>path.join(dir,`chunk-${i}.mp4`));
  for(const [i,color] of ['bt709','smpte170m'].entries())ffmpeg(['-f','lavfi','-i','color=c=green:s=160x90:r=30','-frames:v','15','-c:v','libx264','-pix_fmt','yuv420p','-colorspace',color,'-color_primaries',color,'-color_trc',color,chunks[i]]);
  assert.throws(()=>validateChunks(chunks,{frames:30,count:2}),/color|compatible|geometry/i);
});

test('local mastered video uses muted video plus a lossless audio render',t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dreamy-pcm-')),slug=`dev-pcm-check-${process.pid}`,generated=path.join(GENERATED_DIR,slug);
  fs.mkdirSync(generated,{recursive:true});t.after(()=>{fs.rmSync(dir,{recursive:true,force:true});fs.rmSync(generated,{recursive:true,force:true});});
  fs.writeFileSync(path.join(generated,'script.json'),JSON.stringify({slug,title:'PCM review',type:'story',presentationVersion:4,opening:'hook',scenes:[],intro:null,outro:null}));
  const log=path.join(dir,'calls.jsonl');
  fs.writeFileSync(path.join(dir,'npx'),`#!/usr/bin/env node
const fs=require('node:fs'),{spawnSync}=require('node:child_process');
const args=process.argv.slice(2),out=args[3];fs.appendFileSync(process.env.DREAMY_TEST_CALLS,JSON.stringify(args)+'\\n');
const input=args.includes('--codec=wav')?['-f','lavfi','-i','sine=frequency=440:duration=11','-ar','48000']:args[1]==='still'?['-f','lavfi','-i','color=c=blue:s=160x90','-frames:v','1']:['-f','lavfi','-i','color=c=blue:s=160x90:r=30',...(args.includes('--muted')?[]:['-f','lavfi','-i','sine=frequency=440:duration=11']),'-t','11','-c:v','libx264','-pix_fmt','yuv420p'];
const r=spawnSync('/usr/bin/ffmpeg',['-y','-v','error',...input,out],{stdio:'inherit'});process.exit(r.status??1);
`,{mode:0o755});
  const out=path.join(dir,'episode.mp4');
  const result=spawnSync(process.execPath,['scripts/render.mjs','--slug',slug,'--out',out,'--scale','0.5'],{cwd:ROOT,encoding:'utf8',env:{...process.env,PATH:`${dir}:${process.env.PATH}`,DREAMY_TEST_CALLS:log}});
  assert.equal(result.status,0,result.stderr||result.stdout);
  const calls=fs.readFileSync(log,'utf8').trim().split('\n').map(JSON.parse),video=calls.find(a=>a[1]==='render'&&a[3].endsWith('.mp4'));
  assert.ok(video.includes('--muted'),'AAC must not be encoded into the intermediate video');
  assert.ok(video.includes('--color-space=bt709'));
  assert.ok(video.includes('--pixel-format=yuv420p'));
  assert.equal(calls.filter(a=>a.includes('--codec=wav')).length,1,'mastering must receive lossless PCM');
  assert.equal(verifyEpisode(out,{frames:330}).decoded,true);
});
