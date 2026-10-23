import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import Module,{createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import ts from 'typescript';
import {masterAudio} from '../scripts/lib/audio-master.mjs';

const require=createRequire(import.meta.url),originalLoad=Module._load;
require.extensions['.tsx']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2022},
}).outputText,file);
Module._load=function(name,...args){return name==='remotion'?{
  Audio:props=>React.createElement('audio',{'data-volume':typeof props.volume==='function'?props.volume(12):props.volume,src:props.src}),
}:originalLoad.call(this,name,...args);};
const mixPath=new URL('../src/lib/audioMix.tsx',import.meta.url);
const mix=fs.existsSync(mixPath)?require(mixPath.pathname):{};
Module._load=originalLoad;
const gain=(presentationVersion,volume=1)=>{
  const html=renderToStaticMarkup(React.createElement(mix.MixGainProvider,{presentationVersion},
    React.createElement(mix.MixAudio,{src:'voice.wav',volume})));
  return Number(html.match(/data-volume="([^"]+)"/)[1]);
};

test('one episode provider attenuates numeric and frame-based volumes while legacy and standalone audio stay unchanged',()=>{
  assert.equal(typeof mix.MixAudio,'function');assert.equal(typeof mix.MixGainProvider,'function');
  assert.equal(gain(4),.25);assert.equal(gain(4,.6),.15);assert.equal(gain(4,frame=>frame/20),.15);
  for(const version of [undefined,1,2,3])assert.equal(gain(version,.6),.6);
  assert.match(renderToStaticMarkup(React.createElement(mix.MixAudio,{src:'legacy.wav'})),/data-volume="1"/);
  assert.equal(gain(4,0),0);
});

test('real busy voice/effect samples retain headroom before PCM16 and still meet final mastering targets',t=>{
  assert.equal(typeof mix.MixAudio,'function');
  const voice=new URL('../public/generated/sample-share/line-bc3bc97310.wav',import.meta.url).pathname;
  const effect=new URL('../public/sfx/tada.wav',import.meta.url).pathname;
  const digest=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  const originals=[voice,effect].map(digest);
  const decode=file=>{
    const result=spawnSync('ffmpeg',['-v','error','-i',file,'-f','f32le','-ar','48000','-ac','1','pipe:1'],{maxBuffer:8*1024*1024});
    assert.ifError(result.error);assert.equal(result.status,0,result.stderr.toString());
    return new Float32Array(result.stdout.buffer.slice(result.stdout.byteOffset,result.stdout.byteOffset+result.stdout.length));
  };
  const a=decode(voice),b=decode(effect),offset=3200,raw=new Float32Array(Math.max(a.length,offset+b.length));
  for(let i=0;i<a.length;i++)raw[i]+=a[i];for(let i=0;i<b.length;i++)raw[i+offset]+=.7*b[i];
  const peak=samples=>samples.reduce((maximum,value)=>Math.max(maximum,Math.abs(value)),0);
  assert.ok(peak(raw)>1.4,'fixture must reproduce the original clipping');
  const safe=raw.map(value=>value*gain(4));assert.ok(peak(safe)<.8);
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'dreamy-busy-mix-'));
  t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const input=path.join(directory,'mix.f32'),wav=path.join(directory,'mix.wav'),out=path.join(directory,'mix.aac');
  // Give FFmpeg's 3-second loudness window several spoken passages, as in an episode.
  const passages=new Float32Array(safe.length*4);
  for(let i=0;i<4;i++)passages.set(safe,i*safe.length);
  fs.writeFileSync(input,Buffer.from(passages.buffer));
  const converted=spawnSync('ffmpeg',['-v','error','-f','f32le','-ar','48000','-ac','1','-i',input,wav]);
  assert.equal(converted.status,0,converted.stderr.toString());
  const report=masterAudio(wav,out);
  assert.ok(Math.abs(report.after.integrated+16)<=1);assert.ok(report.after.truePeak<=-1.5);
  assert.deepEqual([voice,effect].map(digest),originals);
});
