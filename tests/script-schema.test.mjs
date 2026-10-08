import test from 'node:test';
import assert from 'node:assert/strict';
const {ScriptSchema, scriptJsonSchema} = await import('../scripts/lib/script-schema.mjs').catch(() => ({}));
const fixture = () => ({type: 'story', title: 'A Small Kind Choice', palette: 'meadow', mainCharacter: {kind: 'bunny', name: 'Taffy'},
  intro: null, outro: null, moral: 'Kindness helps our friends.', moralRhyme: ['Kindness every day!', 'Helps us work and play!'],
  youtube: {title: 'A Small Kind Choice', description: 'A kind story.', tags: ['kids', 'story', 'kindness']},
  scenes: Array.from({length: 3}, () => ({kind: 'story', background: 'pond', character: 'bunny', secondCharacter: null,
    energy: 'calm', holdSec: 0, prop: null, question: null, lines: [{text: 'We can fix this together.', speaker: 'character', emotion: 'happy', action: 'nod'}]}))});

test('new scripts accept existing character designs and reject unavailable assets or vocabulary', () => {
  assert.ok(ScriptSchema);
  assert.equal(ScriptSchema.safeParse(fixture()).success, true);
  const expanded = fixture(); expanded.scenes[0].character = 'elephant';
  assert.equal(ScriptSchema.safeParse(expanded).success, true);
  for (const mutate of [s => {s.scenes[0].character = 'missing-design';}, s => {s.scenes[0].background = 'missing';},
    s => {s.scenes[0].lines[0].action = 'teleport';}, s => {s.newCharacters = [{name: 'Someone'}];}]) {
    const invalid = fixture(); mutate(invalid);
    assert.equal(ScriptSchema.safeParse(invalid).success, false);
  }
});

test('provider schema requires every field and forbids extra keys at every object', () => {
  assert.ok(scriptJsonSchema);
  const walk = node => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'object') {
      assert.equal(node.additionalProperties, false);
      assert.deepEqual([...node.required].sort(), Object.keys(node.properties).sort());
    }
    for (const value of Object.values(node)) if (typeof value === 'object') {
      if (Array.isArray(value)) value.forEach(walk); else walk(value);
    }
  };
  walk(scriptJsonSchema);
});
