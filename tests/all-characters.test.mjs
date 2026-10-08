import test from 'node:test';
import assert from 'node:assert/strict';
import {CHARACTER_RECIPES} from '../scripts/lib/library.mjs';
import {castMembers, castKinds, castMemberById, castMemberByKind, castPrompt} from '../scripts/lib/cast.mjs';
import {ScriptSchema, scriptJsonSchema} from '../scripts/lib/script-schema.mjs';
import {buildStoryBrief} from '../scripts/lib/story-planner.mjs';
import {directScript} from '../scripts/lib/director.mjs';
import {rawStoryExample} from '../scripts/lib/story-tools.mjs';
import {HEROES} from '../scripts/lib/templates/heroes.mjs';

test('every installed design is available to prompts, schema, hero planning and templates', () => {
  const kinds = Object.keys(CHARACTER_RECIPES);
  assert.ok(kinds.length >= 38);
  assert.deepEqual([...castKinds()].sort(), kinds.sort());
  assert.equal(new Set(castMembers().map(member => member.id)).size, kinds.length);
  const prompt = castPrompt();
  assert.doesNotMatch(prompt, /SIX animals|six.*whole world|closed cast/i);
  const {slug, targetMinutes, ...example} = rawStoryExample();
  for (const kind of kinds) {
    const member = castMemberByKind(kind);
    assert.ok(member, kind);
    assert.equal(castMemberById(member.id), member);
    assert.match(prompt, new RegExp(`\\b${kind}\\b`), kind);
    assert.ok(scriptJsonSchema.properties.mainCharacter.properties.kind.enum.includes(kind), kind);
    const script = structuredClone(example);
    script.mainCharacter = {kind, name: member.name};
    script.scenes[0].character = kind;
    assert.equal(ScriptSchema.safeParse(script).success, true, kind);
    assert.equal(directScript({...script, presentationVersion: 4}).scenes[0].character, kind, `Director must preserve ${kind}`);
    assert.equal(buildStoryBrief({topic: 'A friend learns kindness', hero: member}).hero.kind, kind);
    assert.ok(HEROES[kind], kind);
  }
});

test('the familiar six keep their IDs, names and catchphrases', () => {
  for (const [id, kind, name] of [['taffy', 'bunny', 'Taffy'], ['ben', 'bear', 'Ben'], ['daisy', 'duck', 'Daisy'],
    ['fiona', 'fox', 'Fiona'], ['tilly', 'turtle', 'Grandpa Tilly'], ['ozzy', 'owl', 'Professor Ozzy']]) {
    const member = castMemberById(id);
    assert.equal(member.kind, kind);
    assert.equal(member.name, name);
    assert.ok(member.catchphrase);
  }
});

test('new designs can be on-screen friends and party guests without inventing assets', () => {
  const {slug, targetMinutes, ...example} = rawStoryExample();
  const script = directScript({...example, slug: 'elephants-and-lions', presentationVersion: 4,
    mainCharacter: {kind: 'elephant', name: 'Eli'},
    scenes: [{...example.scenes[0], character: 'elephant', secondCharacter: 'lion'},
      {...example.scenes[0], character: 'elephant', secondCharacter: 'lion', kind: 'chorus'}]});
  assert.equal(script.mainCharacter.kind, 'elephant');
  assert.equal(script.scenes[0].secondCharacter, 'lion');
  assert.ok(script.scenes[1].extras.every(kind => castKinds().includes(kind)));
  assert.deepEqual(JSON.parse(JSON.stringify(directScript(script))), JSON.parse(JSON.stringify(script)));
});
