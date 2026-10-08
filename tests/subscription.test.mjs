import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {subscriptionReminders} from '../src/lib/subscription.mjs';

const require = createRequire(import.meta.url);
require.extensions['.ts'] = require.extensions['.tsx'] = (module, file) => {
  module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2022,
  }}).outputText, file);
};
const {computeSchedule} = require('../src/lib/timing.ts');
const originalLoad = Module._load;
let frame = 45;
Module._load = function(name, ...args) {
  if (name === 'remotion') return {useCurrentFrame: () => frame, useVideoConfig: () => ({fps: 30})};
  if (name === '../lib/fonts') return {fontFamily: 'Fredoka'};
  return originalLoad.call(this, name, ...args);
};
const {SubscribeReminder} = require('../src/components/SubscribeReminder.tsx');
Module._load = originalLoad;

const scene = (kind = 'story', extra = {}) => ({kind, lines: [{text: 'A little kindness.', durationSec: 10}], ...extra});

test('reminders reuse the timeline and choose a quiet boundary near halfway', () => {
  const script = {scenes: Array.from({length: 12}, () => scene())};
  script.scenes[6] = scene('question', {question: {answer: {text: 'Help'}}, holdSec: 3});
  script.scenes[7] = scene('moral');
  const schedule = computeSchedule(script);
  const snapshot = JSON.stringify({script, schedule});
  const [middle, end] = subscriptionReminders(script, schedule);
  assert.equal(JSON.stringify({script, schedule}), snapshot, 'rendering must not rewrite voice/script data');
  assert.equal(middle.duration, 150);
  assert.ok(schedule.scenes.some(slot => slot.from === middle.from));
  assert.ok(Math.abs(middle.from - schedule.total / 2) < (schedule.endFrom - schedule.intro) * 0.2);
  assert.ok(!schedule.scenes.some((slot, i) => ['question', 'moral'].includes(script.scenes[i].kind) && slot.from < middle.from + middle.duration && slot.from + slot.duration > middle.from));
  assert.deepEqual(end, {placement: 'end', from: schedule.endFrom, duration: 150});
  assert.ok(end.from + end.duration <= schedule.brandFrom);
});

test('existing scripts get both reminders, with integer frames inside the episode', () => {
  const directory = new URL('../library/scripts/', import.meta.url);
  let checked = 0;
  for (const name of fs.readdirSync(directory).filter(name => name.endsWith('.json'))) {
    const script = JSON.parse(fs.readFileSync(new URL(name, directory), 'utf8'));
    if (!script.scenes?.length) continue;
    const schedule = computeSchedule(script), reminders = subscriptionReminders(script, schedule);
    assert.equal(reminders.length, 2, name);
    for (const reminder of reminders) {
      assert.ok(Number.isInteger(reminder.from) && Number.isInteger(reminder.duration), name);
      assert.ok(reminder.from >= schedule.intro && reminder.duration > 0, name);
      assert.ok(reminder.from + reminder.duration <= schedule.brandFrom, name);
    }
    assert.ok(reminders[0].from + reminders[0].duration <= reminders[1].from, name);
    assert.deepEqual(subscriptionReminders(script, schedule), reminders, name);
    checked++;
  }
  assert.ok(checked > 0);
});

test('very short and all-question timelines remain bounded without extending the video', () => {
  for (const script of [
    {scenes: [scene('question', {question: {answer: {text: 'Yes'}}, holdSec: 2})]},
    {presentationVersion: 1, opening: 'hook', scenes: [scene('story', {lines: [{text: 'Hi', durationSec: 0.1}]})]},
    {scenes: []},
  ]) {
    const schedule = computeSchedule(script);
    for (const slot of subscriptionReminders(script, schedule)) {
      assert.ok(slot.from >= 0 && slot.duration > 0);
      assert.ok(slot.from + slot.duration <= schedule.brandFrom);
    }
  }
});

test('kids default addresses parents without a bell; explicit opt-in includes SVG bell artwork', () => {
  const draw = props => renderToStaticMarkup(React.createElement(SubscribeReminder, {placement: 'middle', durationInFrames: 150, ...props}));
  const kids = draw({});
  assert.match(kids, /Parents, subscribe for more stories/);
  assert.match(kids, /<svg/);
  assert.doesNotMatch(kids, /data-subscription-bell|tap the bell|<audio/);
  assert.match(draw({bellEnabled: true}), /Subscribe &amp; tap the bell/);
  assert.match(draw({bellEnabled: true}), /data-subscription-bell="true"/);
  assert.match(draw({placement: 'end'}), /data-subscription-reminder="end"/);
  const frames = [0, 12, 45, 65, 149], samples = frames.map(f => {frame = f; return draw({bellEnabled: true});});
  for (const f of [149, 45, 0, 65, 12]) {frame = f; assert.equal(draw({bellEnabled: true}), samples[frames.indexOf(f)]);}
  assert.notEqual(samples[1], samples[2], 'click animation should change with frame');
});
