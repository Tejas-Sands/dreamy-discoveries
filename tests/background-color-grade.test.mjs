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
Module._load = function(name, ...args) {
  return name === 'remotion' ? {
    useCurrentFrame:()=>45, useVideoConfig:()=>({fps:30}), staticFile:path=>path,
    AbsoluteFill:props=>React.createElement('div',props), Img:props=>React.createElement('img',props),
  } : originalLoad.call(this,name,...args);
};
const {Background, BackgroundForeground, BackgroundLayer} = require('../src/components/backgrounds/Background.tsx');
const {Bake} = require('../src/Bake.tsx');
Module._load = originalLoad;
const {getPalette} = require('../src/lib/palettes.ts');
const recipes = fs.readdirSync(new URL('../library/backgrounds/',import.meta.url)).map(file=>JSON.parse(fs.readFileSync(new URL(`../library/backgrounds/${file}`,import.meta.url))));
const draw = (Component,props) => renderToStaticMarkup(React.createElement(Component,props));
const filters = markup => [...markup.matchAll(/\bfilter:([^;\"]+)/g)].map(match=>match[1]);
const daylightGrade = 'saturate(1.8) contrast(1.15) brightness(0.985)';
const nightGrade = 'saturate(1.45) contrast(1.08) brightness(1.01)';

test('the shared character policy defaults to production and preserves explicit preview looks', () => {
  const {characterColorGrade} = require('../src/lib/colorGrade.ts');
  assert.equal(characterColorGrade(),'saturate(1.4) contrast(1.15) brightness(0.985)');
  for (const [mode,expected] of [
    ['original','none'],
    ['sunny','saturate(1.3) contrast(1.12) brightness(0.99)'],
    ['vivid','saturate(1.5) contrast(1.18) brightness(0.98)'],
    ['production','saturate(1.4) contrast(1.15) brightness(0.985)'],
  ]) assert.equal(characterColorGrade(mode),expected);
});

test('every production background grades live and cached scenery once at the shared root', () => {
  assert.equal(recipes.length,25);
  for (const recipe of recipes) {
    // Deliberately pass a different caption palette: scenery follows its recipe.
    const props = {kind:recipe.name,palette:getPalette('candy')};
    const expected = recipe.palette === 'night' ? nightGrade : daylightGrade;
    for (const baked of [undefined,{[recipe.name]:'cached.png'}]) {
      const markup = draw(Background,{...props,baked});
      assert.deepEqual(filters(markup),[expected],`${recipe.name}: expected one production grade`);
      assert.match(markup,/^<div style="[^"]*filter:/,`${recipe.name}: the grade must wrap every scenery layer`);
      if (baked) assert.match(markup,/src="baked\/cached.png"/);
    }
    const foreground = draw(BackgroundForeground,props);
    assert.deepEqual(filters(foreground),[expected],`${recipe.name}: split foreground must match the background`);
    assert.match(foreground,/^<svg[^>]*style="[^"]*filter:/);
  }
});

test('explicit background preview modes replace the production grade', () => {
  for (const kind of ['meadow','night']) {
    const props = {kind,palette:getPalette('meadow')};
    for (const [colorGrade,expected] of [
      ['original','none'],
      ['sunny','saturate(1.65) contrast(1.12) brightness(0.99)'],
      ['vivid','saturate(1.95) contrast(1.18) brightness(0.98)'],
      ['production',kind === 'night' ? nightGrade : daylightGrade],
    ]) {
      for (const Component of [Background,BackgroundForeground]) {
        assert.deepEqual(filters(draw(Component,{...props,colorGrade})),[expected],`${kind}: ${colorGrade}`);
      }
    }
    assert.equal(draw(BackgroundForeground,{...props,splitForeground:false}),'');
  }
});

test('bake output and raw scenery layers remain ungraded for cache reuse', () => {
  for (const recipe of recipes) {
    assert.deepEqual(filters(draw(Bake,{background:recipe.name})),[],`${recipe.name}: cache must contain raw artwork`);
    for (const group of ['back','static','front']) {
      const markup = renderToStaticMarkup(React.createElement('svg',null,
        React.createElement(BackgroundLayer,{recipe,group,t:2,palette:getPalette(recipe.palette)})));
      assert.deepEqual(filters(markup),[],`${recipe.name}/${group}: raw layers must not grade their parent twice`);
    }
  }
});
