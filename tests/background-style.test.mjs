import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import YAML from 'yaml';
import {renderToStaticMarkup} from 'react-dom/server';

const require = createRequire(import.meta.url);
require.extensions['.ts'] = require.extensions['.tsx'] = (module, file) => {
  const {outputText} = ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2022,
  }});
  module._compile(outputText, file);
};
const originalLoad = Module._load;
Module._load = function(name, ...args) {
  return name === 'remotion' ? {useCurrentFrame:()=>45,useVideoConfig:()=>({fps:30}),staticFile:path=>path,
    AbsoluteFill:({children})=>React.createElement('div',null,children), Img:props=>React.createElement('img',props)} : originalLoad.call(this,name,...args);
};
const {Background,BackgroundLayer} = require('../src/components/backgrounds/Background.tsx');
Module._load = originalLoad;
const {PARTS} = require('../src/components/backgrounds/parts.tsx');
const {getPalette} = require('../src/lib/palettes.ts');
const recipes = fs.readdirSync(new URL('../library/backgrounds/',import.meta.url)).map(file=>JSON.parse(fs.readFileSync(new URL(`../library/backgrounds/${file}`,import.meta.url))));
const layer = (recipe,group,t,key) => React.createElement(BackgroundLayer,{recipe,group,t,palette:getPalette(recipe.palette),key});
const draw = node => renderToStaticMarkup(React.createElement('svg',null,node));

test('all 25 backgrounds retain their parts and have frame-independent static artwork',()=>{
  assert.equal(recipes.length,25);
  for(const recipe of recipes) {
    for(const part of recipe.parts) assert.ok(PARTS[part.part],`${recipe.name}: unknown ${part.part}`);
    const a=draw(layer(recipe,'static',0)), b=draw(layer(recipe,'static',13));
    assert.equal(a,b,`${recipe.name}: cached artwork depends on time`);
    assert.match(a,new RegExp(`data-storybook-scenery="${recipe.name}"`));
    for(const group of ['back','static','front']) assert.doesNotMatch(draw(layer(recipe,group,2)),/NaN|Infinity|undefined/);
  }
});

test('overlapping copies of every scenery layer have unique, resolved gradients',()=>{
  const markup=draw(recipes.flatMap(recipe=>['back','static','front'].flatMap(group=>[0,1].map(copy=>layer(recipe,group,2,`${recipe.name}-${group}-${copy}`)))));
  const ids=[...markup.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
  assert.equal(new Set(ids).size,ids.length);
  for(const [,ref] of markup.matchAll(/url\(#([^)]+)\)/g)) assert.ok(ids.includes(ref),`missing ${ref}`);
});

test('cached backgrounds use PNG scenery while preserving live foreground animation',()=>{
  for(const recipe of recipes) {
    const props={kind:recipe.name,palette:getPalette(recipe.palette),baked:{[recipe.name]:'cached.png'}};
    const markup=renderToStaticMarkup(React.createElement(Background,props));
    assert.match(markup,/src="baked\/cached.png"/);
    assert.doesNotMatch(markup,/data-storybook-scenery=/,'static detail must not be redrawn with a cache hit');
  }
  assert.equal(PARTS.window.group,'front','bedroom window must render above its opaque wall');
  assert.match(draw(layer(recipes.find(r=>r.name==='pond'),'static',0)),/id="pond-/,'pond must have a visible water surface');
});

test('both CI bake caches track the same shared drawing dependencies',()=>{
  const workflow=YAML.parse(fs.readFileSync(new URL('../.github/workflows/make-video.yml',import.meta.url),'utf8'));
  const caches=Object.values(workflow.jobs).flatMap(job=>job.steps??[]).filter(step=>step.with?.path==='public/baked');
  assert.equal(caches.length,2);
  for(const cache of caches) for(const source of ['library/backgrounds/**','src/components/backgrounds/**','src/lib/palettes.ts','src/lib/random.ts','src/lib/layout.ts','src/Bake.tsx','scripts/bake-backgrounds.mjs']) assert.ok(cache.with.key.includes(source),`cache misses ${source}`);
});
