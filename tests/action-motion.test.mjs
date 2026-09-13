import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, {createRequire} from 'node:module';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import ts from 'typescript';

const require = createRequire(import.meta.url);
require.extensions['.ts'] = require.extensions['.tsx'] = (module, file) => {
  const {outputText} = ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2022,
  }});
  module._compile(outputText, file);
};
const motionFile = new URL('../src/lib/actionMotion.ts', import.meta.url);
const motion = fs.existsSync(motionFile) ? require('../src/lib/actionMotion.ts') : {};
const {computePose, blendPoses} = require('../src/components/characters/pose.ts');
const originalLoad = Module._load;
let renderFrame = 0;
Module._load = function(name,...args) {
  return name === 'remotion' ? {useCurrentFrame:()=>renderFrame,useVideoConfig:()=>({fps:30})} : originalLoad.call(this,name,...args);
};
const {Character,characterSeed} = require('../src/components/characters/Character.tsx');
Module._load = originalLoad;
const draw = props => renderToStaticMarkup(React.createElement(Character,{kind:'taffy',clockT:2,...props}));
const pose = (action, t, extra = {}) => computePose({action, t, bpm:120, ...extra});
const close = (a,b,tolerance=1e-8) => assert.ok(Math.abs(a-b)<tolerance, `${a} != ${b}`);

test('twist dancing keeps a readable front-facing silhouette',()=>{
  for(let frame=0;frame<120;frame++) assert.ok(pose('dance',frame/30,{seed:2,musicT:frame/30}).flip>=0.75);
});

test('jump, clap and stomp contacts match the visible pose for every repeated cycle', () => {
  assert.equal(typeof motion.actionContacts, 'function');
  for (const action of ['jump','clap','stomp']) {
    const contacts = motion.actionContacts(action, 30);
    assert.ok(contacts.length > 35, `${action} contacts were capped`);
    assert.ok(contacts.every((t,i) => t > 0 && t < 30 && (!i || t > contacts[i-1])));
    for (const t of contacts) {
      const p = pose(action,t);
      close(motion.impactAt(action,t),1);
      if (action === 'clap') { close(p.clapSpark,1); close(p.armL,-106); }
      else {
        close(p.y,0);
        close(p.legL,0); close(p.legR,0);
        assert.ok(pose(action,t-.02).y < -.1, 'impact must follow descent');
      }
      close(motion.impactAt(action,t+.13),0);
    }
  }
  assert.deepEqual(motion.actionContacts('idle',30),[]);
  assert.deepEqual(motion.actionContacts('jump',0),[]);
  assert.deepEqual(motion.actionContacts('jump',Infinity),[]);
  close(motion.impactAt('jump',0),0);
  close(motion.impactAt('jump',-1),0);
});

test('pose blending preserves endpoints, nested values and signed spin orientation without mutation', () => {
  assert.equal(typeof blendPoses,'function');
  const from = pose('spin',.5), to = pose('point',.3);
  const snapshot = structuredClone({from,to});
  assert.deepEqual(blendPoses(from,to,0),from);
  assert.deepEqual(blendPoses(from,to,1),to);
  assert.deepEqual(blendPoses(from,to,-1),from);
  assert.deepEqual(blendPoses(from,to,2),to);
  const mid = blendPoses(from,to,.5);
  close(mid.armR,(from.armR+to.armR)/2);
  close(mid.head.tilt,(from.head.tilt+to.head.tilt)/2);
  close(mid.flip,(from.flip+to.flip)/2);
  assert.deepEqual({from,to},snapshot);
});

test('dance beat and follow-through use the independent music clock across action resets', () => {
  for (const seed of [0,1,2,3]) {
    const a = pose('dance',.1,{musicT:7.17,seed});
    const b = pose('dance',4.6,{musicT:7.17,seed});
    for (const key of ['x','y','armL','armR','legSwL','legSwR','sx','sy','flip','vx','vy','lean']) close(a[key],b[key]);
    close(a.vy,pose('dance',7.17,{seed}).vy);
  }
  assert.notEqual(pose('wave',.1,{musicT:5}).armR,pose('wave',.3,{musicT:5}).armR);
});

test('canonical IDs and recipe names retain identical stable motion identity', () => {
  assert.equal(typeof characterSeed,'function');
  const cast = JSON.parse(fs.readFileSync(new URL('../library/cast.json',import.meta.url))).members;
  const seeds = cast.map(member => {
    assert.equal(characterSeed(member.id),characterSeed(member.kind));
    assert.equal(characterSeed(member.id),characterSeed(member.id));
    return characterSeed(member.id);
  });
  assert.equal(new Set(seeds).size,cast.length);
});


test('outgoing rhythmic pose stays frozen throughout a gesture transition', () => {
  const props = {action:'point',previousAction:{action:'dance',t:1.7},blend:0};
  assert.ok(draw({...props,actionT:0,musicT:7}) === draw({...props,actionT:.1,musicT:7.1}), 'outgoing dance must use the music clock at the boundary');
});

test('character gaze reaches both rigs and explicit clock makes chunk frames identical', () => {
  for (const kind of ['taffy','elephant']) {
    const props = {kind, action:'wave',actionT:.2,musicT:5,clockT:9};
    assert.notEqual(draw(props),draw({...props,gaze:{x:6,y:-2}}));
    renderFrame = 3;
    const whole = draw(props);
    renderFrame = 1200;
    assert.equal(draw(props),whole);
    assert.notEqual(draw(props),draw({...props,motionScale:.3}));
  }
});
