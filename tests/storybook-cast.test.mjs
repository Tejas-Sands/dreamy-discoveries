import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
// Load the real TSX artwork without a browser or an extra test dependency.
require.extensions['.ts'] = require.extensions['.tsx'] = (module, file) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2022,
  } });
  module._compile(outputText, file);
};
const { StorybookBody } = require('../src/components/characters/StorybookBody.tsx');
const { computePose } = require('../src/components/characters/pose.ts');
const { getRecipe } = require('../src/components/characters/Character.tsx');
const cast = JSON.parse(fs.readFileSync(new URL('../library/cast.json', import.meta.url))).members;
const recipes = cast.map(c => JSON.parse(fs.readFileSync(new URL(`../library/characters/${c.kind}.json`, import.meta.url))));
const props = recipe => ({ recipe, pose: computePose({action:'idle',t:.4,bpm:120}), emotion:'happy', mouth:0, blink:0, showFace:true });
const draw = p => renderToStaticMarkup(React.createElement('svg', null, React.createElement(StorybookBody, p)));

test('cast IDs and existing species slugs resolve to the same character', () => {
  for (const member of cast) assert.equal(getRecipe(member.id).name, getRecipe(member.kind).name, member.id);
});

test('each main cast member responds to speech, blinking, and turning away', () => {
  for (const recipe of recipes) {
    const p = props(recipe), resting = draw(p);
    assert.notEqual(resting, draw({...p,mouth:1}), `${recipe.name}: mouth does not respond`);
    assert.notEqual(resting, draw({...p,blink:1}), `${recipe.name}: blink does not respond`);
    assert.match(resting, /aria-label="happy face"/);
    assert.doesNotMatch(draw({...p,showFace:false}), /aria-label="happy face"/);
  }
});

test('simultaneous copies have independent SVG paint and clip definitions', () => {
  const markup = renderToStaticMarkup(React.createElement('svg', null,
    ...recipes.flatMap((recipe,i) => [0,1].map(j => React.createElement(StorybookBody, {...props(recipe),key:`${i}-${j}`})))));
  const ids = [...markup.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  assert.ok(ids.length > 0, 'expected shaded artwork');
  assert.equal(new Set(ids).size, ids.length, 'duplicate SVG identifiers corrupt overlapping characters');
  for (const [,ref] of markup.matchAll(/url\(#([^)]+)\)/g)) assert.ok(ids.includes(ref), `missing definition ${ref}`);
});

test('all existing actions and emotions produce finite, frame-stable artwork', () => {
  const actions = ['idle','wave','jump','clap','dance','spin','nod','shake','point','hug','sleep','think','cheer','stomp','swim','fly','walk','cry','eat','look'];
  const emotions = ['happy','excited','sad','surprised','thinking','sleepy','love','worried','neutral'];
  for (const recipe of recipes) for (const action of actions) for (const emotion of emotions) {
    const pose = computePose({action,t:.57,bpm:120,seed:3});
    const p = {...props(recipe),pose,emotion,mouth:.4,showFace:pose.flip>=-.05};
    const rendered = draw(p);
    assert.doesNotMatch(rendered, /NaN|Infinity|undefined/, `${recipe.name}/${action}/${emotion}`);
    assert.equal(rendered, draw(p), 'rendering must not depend on prior frames');
  }
});
