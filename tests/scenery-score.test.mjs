import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

const require = createRequire(import.meta.url);
require.extensions['.ts'] = require.extensions['.tsx'] = (module, file) => {
  const {outputText} = ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2022,
  }});
  module._compile(outputText, file);
};
const load = path => fs.existsSync(new URL(path, import.meta.url)) ? require(path) : {};
const environment = load('../src/lib/environment.ts');
const score = load('../src/lib/score.ts');
const originalLoad = Module._load;
let currentFrame = 0;
Module._load = function(name, ...args) {
  return name === 'remotion' ? {useCurrentFrame:()=>currentFrame,useVideoConfig:()=>({fps:30}),staticFile:path=>path,
    AbsoluteFill:({children,style})=>React.createElement('div',{style},children), Img:props=>React.createElement('img',props)} : originalLoad.call(this,name,...args);
};
const {Background, BackgroundForeground} = require('../src/components/backgrounds/Background.tsx');
const {EnvironmentReaction} = load('../src/components/EnvironmentReaction.tsx');
Module._load = originalLoad;
const {getPalette} = require('../src/lib/palettes.ts');
const {computeSchedule} = require('../src/lib/timing.ts');
const draw = (Component,props) => renderToStaticMarkup(React.createElement(Component,props));
const baseScript = {type:'story',slug:'score-fixture',title:'Sharing an apple',palette:'meadow',mainCharacter:{kind:'bunny',name:'Taffy'},
  music:{file:'story.wav',bpm:96,mood:'story'},scenes:[]};
const scene = (direction, extra={}) => ({background:'meadow',character:'bunny',direction,lines:[{text:'Hello!',durationSec:1}],...extra});

test('splitting the actor foreground keeps bedroom architecture behind and moves only eligible foliage',()=>{
  assert.equal(typeof BackgroundForeground,'function');
  const bedroom={kind:'bedroom',palette:getPalette('night'),splitForeground:true,animationT:1};
  const behind=draw(Background,bedroom), front=draw(BackgroundForeground,bedroom);
  assert.match(behind,/<rect x="0" y="0" width="360" height="300"/,'window must stay visible behind actors');
  assert.doesNotMatch(front,/<rect x="0" y="0" width="360" height="300"/);
  const meadow={kind:'meadow',palette:getPalette('meadow'),splitForeground:true,animationT:1,baked:{meadow:'cached.png'}};
  assert.match(draw(Background,meadow),/src="baked\/cached.png"/);
  assert.doesNotMatch(draw(Background,meadow),/data-scenery-part="flowers"/);
  assert.match(draw(BackgroundForeground,meadow),/data-scenery-part="flowers"/);
  assert.doesNotMatch(draw(BackgroundForeground,meadow),/data-scenery-part="butterflies"/);
});

test('parallax stays bounded and quiet motion reduces every depth while a frozen clock ignores render order',()=>{
  assert.equal(typeof environment.sceneryParallax,'function');
  for(const t of [0,1,50,900]) {
    const normal=environment.sceneryParallax(t,1,{x:100000,y:-100000});
    const quiet=environment.sceneryParallax(t,.12,{x:100000,y:-100000});
    for(const layer of ['back','middle','front']) {
      assert.ok(Math.abs(normal[layer].x)<=20 && Math.abs(normal[layer].y)<=8);
      assert.ok(Math.abs(quiet[layer].x)<=Math.abs(normal[layer].x)*.121+1e-8);
    }
    assert.deepEqual(environment.sceneryParallax(t,0,{x:20,y:10}),{back:{x:0,y:0},middle:{x:0,y:0},front:{x:0,y:0}});
  }
  const props={kind:'autumn',palette:getPalette('forest'),animationT:2,motion:.12,parallax:{x:12,y:4},splitForeground:true};
  currentFrame=0; const first=draw(BackgroundForeground,props);
  currentFrame=900; assert.equal(draw(BackgroundForeground,props),first);
});

test('environment reactions respect location, event age, quiet restraint and the caption boundary',()=>{
  assert.equal(typeof environment.sampleEnvironment,'function');
  const events=[{from:30,kind:'ripple',x:960,y:870},{from:30,kind:'leaf',x:500,y:860},{from:30,kind:'sparkle',x:1200,y:870}];
  assert.deepEqual(environment.sampleEnvironment('pond',events,29,30,false),[]);
  assert.deepEqual(environment.sampleEnvironment('pond',events,120,30,false),[]);
  assert.equal(environment.sampleEnvironment('bedroom',[events[0]],40,30,false).length,0);
  assert.equal(environment.sampleEnvironment('pond',[events[0]],40,30,false)[0].kind,'ripple');
  assert.equal(environment.sampleEnvironment('forest',[events[1]],40,30,true).length,0);
  const busy=Array.from({length:20},()=>({from:30,kind:'sparkle',x:10000,y:10000}));
  const normal=environment.sampleEnvironment('meadow',busy,40,30,false), quiet=environment.sampleEnvironment('meadow',busy,40,30,true);
  assert.ok(normal.length<=3); assert.ok(quiet.length<=1);
  assert.ok(quiet[0].opacity<normal[0].opacity);
  for(const event of normal) assert.ok(event.x<=1864 && event.y+event.radius<=925);
  assert.deepEqual(environment.sampleEnvironment('pond',events,40,30,false),environment.sampleEnvironment('pond',events,40,30,false));
  assert.equal(typeof EnvironmentReaction,'function');
  currentFrame=40;
  const props={background:'pond',events:[events[0]],quiet:false};
  const reaction=draw(EnvironmentReaction,props);
  assert.match(reaction,/<ellipse/);
  currentFrame=10; assert.equal(draw(EnvironmentReaction,{...props,frameOffset:30}),reaction,'chunk-local frame must sample the same scene time');
});

test('scene score chooses an existing asset with its matching BPM and honors authored silence',()=>{
  assert.equal(typeof score.sceneScore,'function');
  assert.deepEqual(score.sceneScore(scene('dialogue'),baseScript),{file:'story.wav',bpm:96,mood:'story'});
  assert.deepEqual(score.sceneScore(scene('celebration'),baseScript),{file:'bouncy.wav',bpm:120,mood:'bouncy'});
  assert.deepEqual(score.sceneScore(scene('lullaby'),baseScript),{file:'lullaby.wav',bpm:72,mood:'lullaby'});
  assert.equal(score.sceneScore(scene('dialogue',{music:null}),baseScript),null);
  assert.equal(score.sceneScore(scene('celebration'),{...baseScript,music:{file:'',bpm:120,mood:'none'}}),null);
  const authored={file:'lullaby.wav',bpm:72,mood:'lullaby'};
  assert.deepEqual(score.sceneScore(scene('celebration',{music:authored}),baseScript),authored);
});

test('continuous scenes keep one loop and changed sections crossfade on a shared absolute clock',()=>{
  assert.equal(typeof score.scoreSections,'function');
  const script={...baseScript,scenes:[scene('dialogue'),scene('thinking'),scene('celebration')]};
  const schedule=computeSchedule(script), sections=score.scoreSections(script,schedule);
  assert.equal(sections.length,2,'same-track dialogue and thinking must not restart');
  const boundary=schedule.scenes[2].from;
  assert.equal(sections[0].to-boundary,9);
  assert.equal(boundary-sections[1].from,9);
  assert.equal(sections[1].music.bpm,120);
  assert.equal(sections.at(-1).to,schedule.brandFrom,'music must stop before the channel signature');
  const silentVoice={...schedule,voice:[]};
  // The quiet-to-active gain transition is halfway from .12 to .28 at this frame.
  const gain=score.scoreVolume(boundary,sections[0],script,silentVoice)+score.scoreVolume(boundary,sections[1],script,silentVoice);
  assert.ok(Math.abs(gain-.2)<1e-8,`crossfade gain jumped to ${gain}`);
});

test('score ducks smoothly under voices, stays quieter during thinking and is stable when frames arrive out of order',()=>{
  assert.equal(typeof score.scoreVolume,'function');
  const script={...baseScript,scenes:[scene('dialogue',{holdSec:3}),scene('thinking',{holdSec:3})]};
  const schedule=computeSchedule(script), section=score.scoreSections(script,schedule)[0];
  const voiceFrame=schedule.scenes[0].from+15, gapFrame=schedule.scenes[0].from+65, quietFrame=schedule.scenes[1].from+65;
  assert.ok(score.scoreVolume(voiceFrame,section,script,schedule)<score.scoreVolume(gapFrame,section,script,schedule));
  assert.ok(score.scoreVolume(quietFrame,section,script,schedule)<score.scoreVolume(gapFrame,section,script,schedule));
  for(const frame of [0,voiceFrame,gapFrame,quietFrame,schedule.brandFrom]) {
    const value=score.scoreVolume(frame,section,script,schedule);
    assert.ok(value>=0 && value<=.28);
    assert.equal(score.scoreVolume(frame,section,script,schedule),value);
  }
  assert.equal(score.scoreVolume(0,section,script,schedule),0);
  assert.equal(score.scoreVolume(schedule.brandFrom,section,script,schedule),0);
  const levels=Array.from({length:20},(_,i)=>score.scoreVolume(schedule.scenes[0].from+i-10,section,script,schedule));
  for(let i=1;i<levels.length;i++) assert.ok(Math.abs(levels[i]-levels[i-1])<=.04,'voice duck has a gain discontinuity');
});

test('authored scene silence continues through the goodbye without reviving the global music',()=>{
  const script={...baseScript,scenes:[scene('dialogue'),scene('tender',{music:null})]};
  const schedule=computeSchedule(script), sections=score.scoreSections(script,schedule);
  assert.equal(sections.length,1);
  assert.equal(sections[0].to,schedule.scenes[1].from);
  assert.equal(score.scoreVolume(schedule.endFrom+30,sections[0],script,schedule),0);
});

test('a continuous track eases its gain into quiet scenes instead of jumping at the cut',()=>{
  const script={...baseScript,scenes:[scene('dialogue',{holdSec:2}),scene('thinking',{holdSec:2})]};
  const schedule={...computeSchedule(script),voice:[]}, section=score.scoreSections(script,schedule)[0];
  const boundary=schedule.scenes[1].from;
  const levels=Array.from({length:25},(_,i)=>score.scoreVolume(boundary+i-12,section,script,schedule));
  for(let i=1;i<levels.length;i++) assert.ok(Math.abs(levels[i]-levels[i-1])<=.012,'quiet scene gain jumps at the boundary');
  assert.ok(levels[0]>levels.at(-1));
});
