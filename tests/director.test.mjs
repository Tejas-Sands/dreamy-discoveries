import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import test from 'node:test';
import {directScript} from '../scripts/lib/director.mjs';
import {castKinds} from '../scripts/lib/cast.mjs';
import {sceneDirection} from '../src/lib/sceneDirection.mjs';

const scene = (overrides = {}) => ({background: 'meadow', character: 'bunny', lines: [{text: 'The path led across the meadow.', durationSec: 7}], ...overrides});
const script = (scenes, overrides = {}) => ({title: 'A meadow visit', type: 'story', mainCharacter: {kind: 'bunny', name: 'Taffy'}, scenes, ...overrides});

test('new stories open on the problem; authored greetings and legacy stories retain the title opening', () => {
  const input = script([scene({lines: [{text: 'Oh no! My paper boat is stuck!', emotion: 'worried'}]})], {presentationVersion: 1});
  const output = directScript(input);
  assert.equal(output.opening, 'hook');
  assert.equal(output.intro, null);
  assert.equal(output.scenes[0].transition, 'none');
  assert.deepEqual(directScript(output), output);
  assert.equal(directScript(script([scene()])).intro.role, 'greeting');
  const authored = directScript({...input, intro: {text: 'Hello, my dear friends!'}, scenes: [scene({transition: 'iris'})]});
  assert.equal(authored.opening, 'title');
  assert.equal(authored.intro.text, 'Hello, my dear friends!');
  assert.equal(authored.scenes[0].transition, 'iris');
});

test('new transitions follow continuity, location and intent instead of a rotating cycle', () => {
  const output = directScript(script([
    scene(), scene(), scene({background: 'pond'}),
    scene({background: 'pond', direction: 'celebration'}),
    scene({background: 'pond', direction: 'celebration'}),
    scene({background: 'pond', direction: 'thinking'}),
    scene({background: 'bedroom', direction: 'lullaby'}),
    scene({background: 'bedroom', transition: 'slide'}),
  ], {presentationVersion: 1}));
  assert.deepEqual(output.scenes.map(s => s.transition), ['none', 'none', 'wipe', 'pop', 'none', 'fade', 'fade', 'slide']);
  assert.deepEqual(directScript(JSON.parse(JSON.stringify(output))), output);
});

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

test('generated party guests can include any installed character seen earlier', () => {
  const output = directScript(script([
    scene({character: 'monkey', secondCharacter: 'lion'}),
    scene({kind: 'chorus'}),
  ]));
  assert.ok(output.scenes[1].extras.length > 0);
  assert.ok(output.scenes[1].extras.every((kind) => castKinds().includes(kind)));
});

test('paper stars and toy animals remain props while named friends are inferred', () => {
  for (const text of ['Share a paper star with your friend.', 'A toy lion sits beside the paper crown.']) {
    const output = directScript(script([scene({lines: [{text}]})]));
    assert.equal(output.scenes[0].secondCharacter, null);
  }
  const named = directScript(script([scene({lines: [{text: 'Taffy asked Ben to help.'}]})]));
  assert.equal(named.scenes[0].secondCharacter, 'bear');
  const legacy = directScript(script([scene({secondCharacter: 'lion'})]));
  assert.equal(legacy.scenes[0].secondCharacter, 'lion', 'explicit legacy scenes must remain rerenderable');
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

test('question answers retain complete words and remain idempotent', () => {
  const answer = 'Make a simple meeting plan';
  const once = directScript(script([scene({kind: 'question', question: {answer: {text: `  ${answer}  `}}, lines: [{text: 'What can we make?'}]})]));
  assert.equal(once.scenes[0].question.answer.text, answer);
  assert.deepEqual(directScript(once), once);
});

test('newly generated moral scenes are normalized on their first directing pass', () => {
  const output = directScript(script([scene()], {presentationVersion: 4, moral: 'Sharing helps everyone.', moralRhyme: ['Share a smile today!', 'Help a friend and play!']}));
  assert.equal(output.scenes.filter(scene => scene.kind === 'moral').length, 3);
  assert.deepEqual(directScript(output), output);
});

test('named onstage dialogue keeps its actor while unavailable speakers use the normal fallback', () => {
  const kinds = castKinds();
  for (const [i, hero] of kinds.entries()) {
    const friend = kinds[(i + 1) % kinds.length], offstage = kinds[(i + 2) % kinds.length];
    const output = directScript(script([scene({character: hero, secondCharacter: friend, lines: [
      {speaker: hero, text: 'Hello, dear friend!'}, {speaker: friend, text: 'Hello, I can help!'},
      {speaker: 'narrator', text: 'The friends looked up.'}, {speaker: 'missing-design', text: 'The wind was gentle.'},
      {speaker: offstage, text: 'The wind was gentle.'},
    ]})]));
    assert.deepEqual(output.scenes[0].lines.map(line => line.speaker), ['character', 'friend', 'narrator', 'narrator', 'narrator']);
    assert.deepEqual(directScript(output), output);
  }
  const aliased = directScript(script([scene({character: 'taffy', secondCharacter: 'ben', lines: [
    {speaker: 'taffy', text: 'Hello, Ben!'}, {speaker: 'ben', text: 'Hello, Taffy!'},
  ]})]));
  assert.deepEqual(aliased.scenes[0].lines.map(line => line.speaker), ['character', 'friend']);
  assert.equal(aliased.scenes[0].character, 'bunny');
  assert.equal(aliased.scenes[0].secondCharacter, 'bear');
  const extras = directScript(script([scene({extras: ['duck'], lines: [{speaker: 'daisy', text: 'Good morning!'}]})]));
  assert.equal(extras.scenes[0].lines[0].speaker, 'duck');
  assert.deepEqual(directScript(extras), extras);
});

test('automatic counting needs a clear one-to-n enumeration rather than a numeric comparison', () => {
  for (const [text, count] of [['One, two, three!', 3], ['1, 2, 3, 4!', 4], ['One little star, two little stars,', 2]]) {
    const line = directScript(script([scene({lines: [{text}]})])).scenes[0].lines[0];
    assert.equal(line.callout?.kind, 'count', text);
    assert.equal(line.callout.count, count, text);
  }
  for (const text of ['Taffy had used three throws while Fiona had used four.', 'Four little stars, five stars bright,', 'We have one biscuit, and we have two friends.', 'One goal, then another, then two more points.']) {
    assert.notEqual(directScript(script([scene({lines: [{text}]})])).scenes[0].lines[0].callout?.kind, 'count', text);
  }
  const authored = {kind: 'count', count: 5, emoji: '⭐'};
  const output = directScript(script([scene({lines: [{text: 'Four little stars, five stars bright,', callout: authored}]})]));
  assert.deepEqual(output.scenes[0].lines[0].callout, authored);
  assert.deepEqual(directScript(output), output);
});
