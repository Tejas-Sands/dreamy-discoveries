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
// Supply only the frame clock; exercise the actual Character and nested SVG rigs.
const originalLoad = Module._load;
Module._load = function(name, ...args) {
  return name === 'remotion' ? {useCurrentFrame: () => 45, useVideoConfig: () => ({fps:30})} : originalLoad.call(this, name, ...args);
};
const {Character} = require('../src/components/characters/Character.tsx');
Module._load = originalLoad;
const {STORYBOOK_KINDS} = require('../src/components/characters/StorybookBody.tsx');
const kinds = fs.readdirSync(new URL('../library/characters/', import.meta.url)).map(file => file.replace('.json',''));
const others = kinds.filter(kind => !STORYBOOK_KINDS.has(kind));
const draw = props => renderToStaticMarkup(React.createElement(Character, props));

test('every remaining recipe uses storybook paint and animated speech', () => {
  assert.equal(others.length, 32);
  for (const kind of others) {
    const resting = draw({kind});
    assert.match(resting, new RegExp(`data-storybook="${kind}"`));
    assert.match(resting, /-iris\)/, `${kind}: glossy eyes missing`);
    assert.notEqual(resting, draw({kind,mouth:1}), `${kind}: speech disconnected`);
  }
});

test('all 38 characters and identical copies have unique, resolved paint and clip references', () => {
  const markup = renderToStaticMarkup(React.createElement('div', null,
    ...kinds.flatMap(kind => [0,1].map(copy => React.createElement(Character, {kind,seed:0,key:`${kind}-${copy}`})))));
  const ids = [...markup.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const [,ref] of markup.matchAll(/url\(#([^)]+)\)/g)) assert.ok(ids.includes(ref), `missing ${ref}`);
});

test('every library rig preserves finite, deterministic actions and emotions', () => {
  const actions = ['idle','wave','jump','clap','dance','spin','nod','shake','point','hug','sleep','think','cheer','stomp','swim','fly','walk','cry','eat','look'];
  const emotions = ['happy','excited','sad','surprised','thinking','sleepy','love','worried','neutral'];
  for (const kind of others) {
    for (const state of [...actions.map(action => ({action})), ...emotions.map(emotion => ({emotion}))]) {
      const props = {kind,...state,actionT:.57,mouth:.4};
      const markup = draw(props);
      assert.doesNotMatch(markup, /NaN|Infinity|undefined/, `${kind}/${JSON.stringify(state)}`);
      assert.equal(markup, draw(props));
    }
    assert.doesNotMatch(draw({kind,action:'spin',actionT:.4}), /aria-label="happy face"/, `${kind}: face visible while turned away`);
  }
});
