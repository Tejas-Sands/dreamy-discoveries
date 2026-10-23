import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

const require = createRequire(import.meta.url);
require.extensions['.ts'] = require.extensions['.tsx'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: {module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true},
}).outputText, file);
const originalLoad = Module._load, remotion = require('remotion');
let frame = 10;
Module._load = function(name, ...args) {
  return name === 'remotion' ? {...remotion, useCurrentFrame: () => frame, useVideoConfig: () => ({fps: 30}),
    staticFile: path => path, AbsoluteFill: ({children, ...props}) => React.createElement('div', props, children),
    Sequence: ({children}) => React.createElement(React.Fragment, null, children),
    Audio: ({src}) => React.createElement('audio', {src}), Img: props => React.createElement('img', props),
  } : originalLoad.call(this, name, ...args);
};
const {MoralChant} = require('../src/components/MoralChant.tsx');
const {EndCard} = require('../src/components/Cards.tsx');
const {countTimes} = require('../src/components/Callout.tsx');
const {getPalette} = require('../src/lib/palettes.ts');
Module._load = originalLoad;
const draw = (component, props) => renderToStaticMarkup(React.createElement(component, props));
const palette = getPalette('meadow');

test('both moral rhymes enter visibly on the scene clock with readable bounded typography', () => {
  const props = {rhyme: ['Share a smile today!', 'Help a friend and play!'], active: null, prompt: false, promptT: 0, palette, bpm: 120};
  const at = sceneT => draw(MoralChant, {...props, sceneT});
  const start = at(0), later = at(1);
  const lineStyles = [...later.matchAll(/<div style="([^"]*flex-wrap:wrap[^"]*)"/g)].map(match => match[1]);
  assert.equal(lineStyles.length, 2);
  assert.ok(lineStyles.every(style => !/opacity:0(?:;|$)/.test(style)), 'a rhyme stays invisible after its entrance');
  assert.notEqual(start, later);
  assert.match(later, /font-size:(?:[6-9]\d|1\d\d)px/);
  assert.match(later, /max-width:/);
  const long = draw(MoralChant, {...props, rhyme: ['Togetherwecanhelpourfriendswithaverylongword', 'Small kind steps can make a brighter day.'], sceneT: 4});
  assert.match(long, /overflow-wrap:anywhere/);
  assert.doesNotMatch(long, /white-space:nowrap/);
  assert.equal(at(1), later, 'arbitrary scene-time sampling must be deterministic');
});

test('explicit count timings follow numeric values, including enumeration that starts above one', () => {
  const words = [{text: 'Four,', start: .4, end: .8}, {text: 'five!', start: 1.2, end: 1.6}];
  const times = countTimes({kind: 'count', count: 5}, words, 2);
  assert.equal(times.filter(time => time < .4).length, 3, 'three existing objects precede the spoken fourth');
  assert.equal(times.filter(time => time <= .4).length, 4);
  assert.equal(times.filter(time => time <= 1.2).length, 5);
  assert.deepEqual(countTimes({kind: 'count', count: 3}, [{text: '1', start: .2, end: .4}, {text: '2', start: .6, end: .8}, {text: '3', start: 1, end: 1.2}], 2), [.2, .6, 1]);
  assert.deepEqual(countTimes({kind: 'count', count: 3}, [{text: 'one', start: 1, end: 1.04}, {text: 'three', start: 1.1, end: 1.3}], 2), [1, 1.05, 1.1]);
  const fallback = countTimes({kind: 'count', count: 3}, undefined, 2);
  assert.equal(fallback.length, 3);
  assert.ok(fallback.every((time, i) => Number.isFinite(time) && time >= 0 && time < 2 && (i === 0 || time > fallback[i - 1])));
});

test('sleepy end cards keep their goodbye without initial, later, or all-stars celebrations', () => {
  const script = {title: 'Good night', type: 'rhyme', mainCharacter: {kind: 'bunny', name: 'Taffy'}, music: {mood: 'lullaby', bpm: 72},
    stars: {total: 2}, scenes: [{background: 'meadow', character: 'bunny', lines: []}], outro: {text: 'Good night!', audio: 'goodbye.wav', durationSec: 2}};
  for (const at of [10, 60, 110]) {
    frame = at;
    const sleepy = draw(EndCard, {script, palette, slug: 'in-memory', starsEarned: 2});
    assert.match(sleepy, /generated\/in-memory\/goodbye.wav/);
    assert.doesNotMatch(sleepy, /sfx\/(?:tada|applause)\.wav/);
    assert.doesNotMatch(sleepy, /rotate\([^)]*deg\) scaleX\(/, 'confetti still bursts during a sleepy ending');
  }
  frame = 10;
  const ordinary = draw(EndCard, {script: {...script, music: {mood: 'bouncy', bpm: 120}}, palette, slug: 'in-memory', starsEarned: 2});
  assert.match(ordinary, /sfx\/tada\.wav/);
  assert.match(ordinary, /sfx\/applause\.wav/);
  assert.match(ordinary, /rotate\([^)]*deg\) scaleX\(/);
});
