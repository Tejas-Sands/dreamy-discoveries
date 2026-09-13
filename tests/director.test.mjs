import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import test from 'node:test';
import {directScript} from '../scripts/lib/director.mjs';
import {castKinds} from '../scripts/lib/cast.mjs';
import {sceneDirection} from '../src/lib/sceneDirection.mjs';

const scene = (overrides = {}) => ({background: 'meadow', character: 'bunny', lines: [{text: 'The path led across the meadow.', durationSec: 7}], ...overrides});
const script = (scenes, overrides = {}) => ({title: 'A meadow visit', type: 'story', mainCharacter: {kind: 'bunny', name: 'Taffy'}, scenes, ...overrides});

test('explicit music and gag off survive JSON round trips and reruns', () => {
  for (const music of [false, 'none', null]) {
    for (const gag of [false, null]) {
      const once = directScript(script([scene({gag})], {music}));
      const twice = directScript(JSON.parse(JSON.stringify(once)));
      assert.equal(once.music, null);
      assert.equal(twice.music, null);
      assert.equal(twice.scenes[0].gag, null);
      assert.deepEqual(JSON.parse(JSON.stringify(twice)), JSON.parse(JSON.stringify(once)));
    }
  }
});

test('automatic gags remain identifiable after reruns; authored timing is preserved', () => {
  const automatic = directScript(script([scene()]));
  assert.equal(automatic.scenes[0].gag.auto, true);
  assert.equal(directScript(automatic).scenes[0].gag.auto, true);
  const gag = {kind: 'flyby', emoji: '🦋', side: 'left', atSec: 3.75};
  assert.deepEqual(directScript(script([scene({gag})])).scenes[0].gag, gag);
  assert.equal(directScript(script([scene({gag: {...gag, atSec: 0}})])).scenes[0].gag.atSec, 0);
});

test('quiet intent settles defaults and prevents decorative guests and gags', () => {
  for (const direction of ['thinking', 'lullaby', 'tender']) {
    const output = directScript(script([scene({direction, kind: 'chorus'})])).scenes[0];
    assert.equal(output.direction, direction);
    assert.equal(output.energy, 'calm');
    assert.equal(output.camera, 'still');
    assert.equal(output.gag, null);
    assert.equal(output.extras, null);
    assert.ok(['idle', 'think', 'sleep'].includes(output.lines[0].action));
  }
});

test('direction is derived for questions, lullabies, lessons, demonstrations and celebrations', () => {
  const cases = [
    [scene({kind: 'question'}), {}, 'thinking'],
    [scene(), {template: 'lullaby'}, 'lullaby'],
    [scene({kind: 'lesson'}), {}, 'tender'],
    [scene({lines: [{text: 'Clap your hands!'}]}), {}, 'demonstration'],
    [scene({kind: 'chorus'}), {}, 'celebration'],
    [scene({direction: 'invalid'}), {}, 'dialogue'],
  ];
  for (const [input, options, direction] of cases) {
    assert.equal(directScript(script([input], options)).scenes[0].direction, direction);
  }
});

test('legacy scene defaults identify demonstrations without overreacting to incidental affection', () => {
  assert.equal(sceneDirection(scene({action: 'jump'})), 'demonstration');
  assert.equal(sceneDirection(scene({energy: 'upbeat', lines: [{text: 'Hello friend!', action: 'hug'}]})), 'dialogue');
  assert.equal(sceneDirection(scene({lines: [{text: 'Come along.', emotion: 'love'}, {text: 'The sun is bright.'}, {text: 'Across the hill.'}]})), 'dialogue');
  assert.equal(sceneDirection(scene({lines: [{text: 'I miss home.', emotion: 'sad'}, {text: 'Come here.', action: 'hug'}]})), 'tender');
});

test('valid authored direction, camera, action, energy and extras survive quiet defaults', () => {
  const output = directScript(script([scene({direction: 'tender', energy: 'upbeat', camera: 'pan', extras: ['fox'], lines: [{text: 'A little twirl.', action: 'spin'}]})])).scenes[0];
  assert.equal(output.direction, 'tender');
  assert.equal(output.energy, 'upbeat');
  assert.equal(output.camera, 'pan');
  assert.equal(output.lines[0].action, 'spin');
  assert.deepEqual(output.extras, ['fox']);
});

test('generated party guests exclude legacy zoo characters seen earlier', () => {
  const output = directScript(script([
    scene({character: 'monkey', secondCharacter: 'lion'}),
    scene({kind: 'chorus'}),
  ]));
  assert.ok(output.scenes[1].extras.length > 0);
  assert.ok(output.scenes[1].extras.every((kind) => castKinds().includes(kind)));
});

test('every library script is idempotent in memory and inputs remain unchanged', () => {
  for (const file of readdirSync(new URL('../library/scripts/', import.meta.url)).filter((name) => name.endsWith('.json'))) {
    const input = JSON.parse(readFileSync(new URL(`../library/scripts/${file}`, import.meta.url), 'utf8'));
    // Recipe adoption writes assets; exclude those proposals from this read-only audit.
    delete input.newCharacters;
    delete input.newBackgrounds;
    const before = structuredClone(input);
    const once = directScript(input);
    assert.deepEqual(directScript(once), once, file);
    assert.deepEqual(input, before, file);
  }
});

test('repeated choruses preserve quiet intent and authored scene gestures', () => {
  for(const options of [{direction:'tender'}, {action:'nod'}]) {
    const chorus = scene({...options,kind:'chorus',lines:[{text:'Together we belong.'},{text:'Here beside the stream.'}]});
    const output=directScript(script([chorus,structuredClone(chorus)]));
    assert.deepEqual(output.scenes[1].lines.map(l=>l.action), output.scenes[0].lines.map(l=>l.action));
  }
});
