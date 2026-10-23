import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';
import {createRequire} from 'node:module';
import * as vox from '../scripts/lib/vox.mjs';
import {estimateFrames} from '../scripts/lib/estimate.mjs';
import {directScript} from '../scripts/lib/director.mjs';

const require=createRequire(import.meta.url);
require.extensions['.ts']=require.extensions['.tsx']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2022},
}).outputText,file);
const {computeSchedule}=require('../src/lib/timing.ts');
const {voxEvents}=require('../src/components/Vox.tsx');
const {scoreSections,scoreVolume}=require('../src/lib/score.ts');
const catalog={laugh:[{file:'vox/laugh-1.wav',durationSec:2.501}],yay:[{file:'vox/yay-1.wav',durationSec:1.873}],
  gasp:[{file:'vox/gasp-1.wav',durationSec:.587}]};
const fixture=()=>({presentationVersion:4,opening:'hook',type:'story',slug:'reaction-fixture',title:'Our friend',
  mainCharacter:{kind:'bunny',name:'Taffy'},scenes:[{character:'bunny',direction:'dialogue',lines:[
    {text:'Here we go!',speaker:'character',durationSec:.517,vox:[{kind:'laugh',at:'start'},{kind:'yay',at:'start'},
      {kind:'gasp',at:'end'},{kind:'laugh',at:'end'},{kind:'yay',at:'end'}]},
    {text:'Your turn!',durationSec:1.013},
  ],holdSec:2}]});

test('selected recordings fit before speech and before the next line, with matching music ducking',()=>{
  assert.equal(typeof vox.planVox,'function');
  const script=vox.planVox(fixture(),catalog),line=script.scenes[0].lines[0];
  const schedule=computeSchedule(script),slot=schedule.scenes[0].lines[0],next=schedule.scenes[0].lines[1];
  const events=voxEvents(line,slot.from,slot.pre,'different-render-key');
  assert.equal(events.length,5);
  assert.equal(events[0].file,'vox/laugh-1.wav');
  assert.ok(events.filter(e=>e.from<slot.from).every(e=>e.from+Math.round(e.durationSec*30)+2<=slot.from));
  assert.ok(events.every(e=>e.from+Math.round(e.durationSec*30)+2<=next.from));
  assert.equal(estimateFrames(script),schedule.total);
  const latestEnd=Math.max(...events.map(e=>e.from+Math.round(e.durationSec*30)));
  assert.ok(schedule.voice[0][1]>=latestEnd);
  const section=scoreSections(script,schedule)[0];
  assert.ok(scoreVolume(latestEnd-1,section,script,schedule)<=.100001);
});

test('public reaction pins survive catalog growth and local variants require an explicit pin',()=>{
  assert.equal(typeof vox.planVox,'function');
  const script=vox.planVox(fixture(),catalog),before=structuredClone(script);
  const grown=Object.fromEntries(Object.entries(catalog).map(([kind,files])=>[kind,[
    {file:`vox-local/${kind}-9.wav`,durationSec:.1},...files,{file:`vox/${kind}-99.wav`,durationSec:2.3},
  ]]));
  assert.deepEqual(vox.planVox(script,grown),before);
  assert.ok(vox.planVox(fixture(),grown).scenes[0].lines[0].vox.every(cue=>cue.file.startsWith('vox/')));
  const local=fixture();
  local.scenes[0].lines[0].vox=[{kind:'laugh',at:'end',file:'vox-local/laugh-9.wav',durationSec:.1}];
  assert.equal(vox.planVox(local,grown).scenes[0].lines[0].vox[0].file,'vox-local/laugh-9.wav');
  assert.throws(()=>vox.planVox(local,catalog),/recording|pin/i);
  const wrongDuration=fixture();
  wrongDuration.scenes[0].lines[0].vox=[{kind:'laugh',at:'end',file:'vox/laugh-1.wav',durationSec:.1}];
  assert.throws(()=>vox.planVox(wrongDuration,catalog),/duration/i);
});

test('missing unpinned reactions reserve no silence and legacy scripts retain their old timing',()=>{
  assert.equal(typeof vox.planVox,'function');
  const script=vox.planVox(fixture(),{}),line=script.scenes[0].lines[0];
  assert.equal(line.voxPreSec??0,0);assert.equal(line.voxPostSec??0,0);
  assert.deepEqual(voxEvents(line,0,0,'missing'),[]);
  const legacy={...fixture(),presentationVersion:3};
  legacy.scenes[0].lines[0].voxPreSec=.9;
  const before=structuredClone(legacy);
  assert.deepEqual(vox.planVox(legacy,catalog),before);
});

test('directing pins real recordings before chunk estimation and remains idempotent',()=>{
  const input=fixture(),original=structuredClone(input),first=directScript(input);
  assert.ok(first.scenes[0].lines[0].vox.every(cue=>typeof cue.file==='string'&&cue.durationSec>0));
  assert.deepEqual(directScript(first),first);
  assert.deepEqual(input,original);
  assert.equal(estimateFrames(first),computeSchedule(first).total);
});

test('intro and goodbye allocate full reaction durations and share estimator timing',()=>{
  assert.equal(typeof vox.planVox,'function');
  const source=fixture();source.opening='title';
  source.intro={text:'Hello!',durationSec:1,vox:[{kind:'laugh',at:'start'},{kind:'yay',at:'end'}]};
  source.outro={text:'Goodbye!',durationSec:1,vox:[{kind:'laugh',at:'start'},{kind:'yay',at:'end'}]};
  const script=vox.planVox(source,catalog),schedule=computeSchedule(script);
  assert.equal(estimateFrames(script),schedule.total);
  const [introRange,...ranges]=schedule.voice,outroRange=ranges.at(-1);
  assert.equal(introRange[0],0);
  assert.ok(introRange[1]<schedule.countdownFrom);
  assert.equal(outroRange[0],schedule.endFrom);
  assert.ok(outroRange[1]<=schedule.brandFrom);
});

test('reaction duration reads the WAV data chunk rather than counting RIFF metadata as samples',t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dreamy-vox-header-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const head=Buffer.alloc(36);head.write('RIFF',0);head.write('WAVEfmt ',8);head.writeUInt32LE(16,16);
  head.writeUInt16LE(1,20);head.writeUInt16LE(1,22);head.writeUInt32LE(1000,24);head.writeUInt32LE(2000,28);
  head.writeUInt16LE(2,32);head.writeUInt16LE(16,34);
  const junk=Buffer.alloc(20);junk.write('JUNK',0);junk.writeUInt32LE(12,4);
  const data=Buffer.alloc(2008);data.write('data',0);data.writeUInt32LE(2000,4);
  const bytes=Buffer.concat([head,junk,data]);bytes.writeUInt32LE(bytes.length-8,4);
  const file=path.join(dir,'laugh-1.wav');fs.writeFileSync(file,bytes);
  assert.equal(vox.wavDurationSec(file),1);
});
