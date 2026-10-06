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
const originalLoad = Module._load;
let currentFrame = 0;
Module._load = function(name, ...args) {
  return name === 'remotion' ? {useCurrentFrame:()=>currentFrame,useVideoConfig:()=>({fps:30}),staticFile:path=>path,
    AbsoluteFill:({children,...props})=>React.createElement('div',props,children), Img:props=>React.createElement('img',props)} : originalLoad.call(this,name,...args);
};
const {Background, BackgroundForeground, BackgroundLayer} = require('../src/components/backgrounds/Background.tsx');
const {Bake} = require('../src/Bake.tsx');
Module._load = originalLoad;
const {getPalette} = require('../src/lib/palettes.ts');
const recipes = fs.readdirSync(new URL('../library/backgrounds/',import.meta.url)).map(file=>JSON.parse(fs.readFileSync(new URL(`../library/backgrounds/${file}`,import.meta.url))));
const lifeFile = new URL('../src/lib/backgroundLife.ts', import.meta.url);
const life = fs.existsSync(lifeFile) ? require('../src/lib/backgroundLife.ts') : {};
const sample = (...args) => {
  assert.equal(typeof life.sampleBackgroundLife, 'function', 'the deterministic background activity sampler is missing');
  return life.sampleBackgroundLife(...args);
};
const draw = (kind, props={}) => renderToStaticMarkup(React.createElement(Background, {kind,palette:getPalette(kind),...props}));
const overlay = markup => {
  const svg = markup.match(/<svg\b[^>]*data-background-life="[^"]+"[\s\S]*?<\/svg>/)?.[0];
  assert.ok(svg, 'live SVG activity layer is missing');
  return svg.replace(/background-life-[^" )]+/g,'background-life-id');
};

// Catches a missing setting, an empty fallback, or activities accidentally rendered only on cache misses.
test('all 25 settings show a sparse layer with a living motif on both cached and live scenery', () => {
  assert.equal(recipes.length, 25);
  const activitySets = new Set();
  for (const {name} of recipes) {
    const live = overlay(draw(name,{animationT:4,motion:.55}));
    const baked = overlay(draw(name,{animationT:4,motion:.55,baked:{[name]:'cached.png'}}));
    assert.equal(baked,live,`${name}: caching changes the activities`);
    const actions = [...live.matchAll(/data-life-action="([^"]+)"/g)].map(match=>match[1]);
    assert.ok(actions.length>=2 && actions.length<=4, `${name}: expected 2–4 modest activities`);
    assert.match(live,/data-living="true"/,`${name}: no live creature or plant`);
    assert.ok((live.match(/<(?:path|ellipse|circle|rect|line)\b/g)??[]).length<130, `${name}: per-frame artwork is too heavy`);
    activitySets.add(actions.join(','));
  }
  assert.equal(activitySets.size,25,'settings must have their own intentional actions');
});

// Catches frame/history dependence and wing/leaf animation continuing when the activity layer is paused.
test('motion zero freezes living activities even if the supplied clock keeps advancing', () => {
  for (const {name} of recipes) {
    currentFrame=0;
    const a=overlay(draw(name,{animationT:0,motion:0}));
    currentFrame=300;
    assert.equal(overlay(draw(name,{animationT:99,motion:0})),a,`${name}: a paused activity moved`);
    assert.deepEqual(sample(name,100,0),sample(name,0,0));
    const foreground = t => renderToStaticMarkup(React.createElement(BackgroundForeground,{kind:name,palette:getPalette(name),animationT:t,motion:0}));
    currentFrame=300;
    const explicitSnapshot=foreground(2);
    currentFrame=0;
    assert.ok(foreground(2)===explicitSnapshot,`${name}: explicit foreground snapshot depends on frame`);
  }
  currentFrame=0;
});

test('activity seeking is deterministic and all settings visibly change over time', () => {
  for (const {name} of recipes) {
    const times=[0,3,9,47,1000], snapshots=times.map(t=>sample(name,t,.55));
    for (const t of [47,3,1000,0,9]) assert.deepEqual(sample(name,t,.55),snapshots[times.indexOf(t)],`${name}: seek depends on history`);
    assert.notEqual(overlay(draw(name,{animationT:3,motion:.55})),overlay(draw(name,{animationT:9,motion:.55})),`${name}: no activity moves`);
  }
});

test('quiet scenes reduce travel and contrast while retaining every living motif', () => {
  for (const {name} of recipes) {
    const ordinary=Array.from({length:121},(_,i)=>sample(name,i/2,1));
    const quiet=Array.from({length:121},(_,i)=>sample(name,i/2,.12));
    assert.equal(quiet[0].length,ordinary[0].length);
    for (let j=0;j<ordinary[0].length;j++) {
      const extent=(samples,key)=>Math.max(...samples.map(s=>s[j][key]))-Math.min(...samples.map(s=>s[j][key]));
      for (const key of ['x','y','rotation']) {
        const full=extent(ordinary,key);
        if(full>.1) assert.ok(extent(quiet,key)<full*.8,`${name}/${ordinary[0][j].id}: quiet ${key} is too strong`);
      }
      assert.ok(quiet[0][j].opacity>0,`${name}: quiet life disappeared`);
      assert.ok(quiet[0][j].opacity<ordinary[0][j].opacity,`${name}: quiet life has full contrast`);
    }
  }
});

test('garden visitors land, forest snails pause, and pond fish turn smoothly', () => {
  const find=(kind,id,t)=>sample(kind,t,1).find(a=>a.id===id);
  const bee=find('garden','bee-visits-blossom',0);
  assert.ok(bee,'garden needs a flower visitor');
  const resting=find('garden',bee.id,bee.period*.1), flying=find('garden',bee.id,bee.period*.5);
  assert.equal(resting.x,bee.x); assert.equal(resting.y,bee.y);
  assert.equal(resting.wing,0,'landed bee must fold its wings');
  assert.ok(Math.hypot(flying.x-bee.x,flying.y-bee.y)>50,'bee never leaves its blossom');
  const snail=find('forest','snail-explores-mushroom',0);
  assert.ok(snail);
  assert.equal(find('forest',snail.id,snail.period*.1).x,snail.x,'snail must rest between advances');
  assert.ok(find('forest',snail.id,snail.period*.5).x>snail.x+25,'snail never advances');
  const fish=find('pond','fish-turns-in-water',0);
  assert.ok(fish);
  assert.ok(find('pond',fish.id,fish.period*.3).turn>.9);
  assert.ok(find('pond',fish.id,fish.period*.75).turn<-.9);
});

test('paths remain finite, bounded and continuous through long-loop boundaries', () => {
  for (const {name} of recipes) {
    const initial=sample(name,0,1);
    for(let j=0;j<initial.length;j++) {
      const a=initial[j];
      assert.ok(a.period>=12,`${name}/${a.id}: repeated action is too fast`);
      for (const t of [-100000,0,1,11,100000,...[1,2,40].flatMap(n=>[a.period*n-.0001,a.period*n+.0001])]) {
        const point=sample(name,t,1)[j];
        for(const key of ['x','y','rotation','opacity','wing','gesture','turn']) assert.ok(Number.isFinite(point[key]),`${name}/${a.id}: invalid ${key}`);
        assert.ok(point.x>=40 && point.x<=1880 && point.y>=65 && point.y<=920,`${name}/${a.id}: path leaves the safe scenery band`);
        assert.ok(point.opacity>=0 && point.opacity<=1);
      }
      const before=sample(name,a.period-.0001,1)[j], after=sample(name,a.period+.0001,1)[j];
      for(const key of ['x','y','rotation','opacity','wing','gesture','turn']) assert.ok(Math.abs(after[key]-before[key])<.06,`${name}/${a.id}: ${key} snaps at loop reset`);
    }
    assert.doesNotMatch(overlay(draw(name,{animationT:100000,motion:.55})),/NaN|Infinity|undefined/);
  }
  for(const [t,motion] of [[NaN,.55],[Infinity,.55],[1,NaN],[1,Infinity]]) {
    for(const point of sample('meadow',t,motion)) assert.ok([point.x,point.y,point.rotation,point.opacity].every(Number.isFinite));
  }
});

test('bedroom moths stay outside in a single window pane and captions remain clipped clear', () => {
  for(let t=0;t<=60;t+=.5) {
    const moth=sample('bedroom',t,1).find(a=>a.motif==='moth');
    assert.ok(moth);
    assert.ok(moth.x>=1485 && moth.x<=1585 && moth.y>=310 && moth.y<=390,'moth flies in front of the wall or window crossbars');
  }
  for(const {name} of recipes) assert.match(overlay(draw(name)),/<clipPath\b[^>]*><rect\b[^>]*height="925"/);
});

test('ambient creatures are excluded from baked static artwork', () => {
  for(const recipe of recipes) {
    const props={recipe,group:'static',t:0,palette:getPalette(recipe.palette)};
    const staticLayer=renderToStaticMarkup(React.createElement('svg',null,React.createElement(BackgroundLayer,props)));
    const later=renderToStaticMarkup(React.createElement('svg',null,React.createElement(BackgroundLayer,{...props,t:99})));
    assert.equal(later,staticLayer,`${recipe.name}: static cache now depends on time`);
    assert.doesNotMatch(staticLayer,/data-background-life|data-life-action/);
    const baked=renderToStaticMarkup(React.createElement(Bake,{background:recipe.name}));
    assert.doesNotMatch(baked,/data-background-life|data-life-action/,'Bake must not include the activity layer');
  }
});
