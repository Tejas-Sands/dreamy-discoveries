import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ScriptSchema} from '../scripts/lib/script-schema.mjs';
import {storyQualityIssues} from '../scripts/lib/story-planner.mjs';
import {directScript} from '../scripts/lib/director.mjs';

test('the edited story bank validates and preserves each chosen ending', () => {
  const dir = new URL('../batches/bank-01/', import.meta.url);
  const stories = fs.readdirSync(dir).filter(file => file.endsWith('.json'))
    .flatMap(file => JSON.parse(fs.readFileSync(new URL(file, dir))).stories);
  assert.equal(stories.length, 51);
  assert.equal(new Set(stories.map(story => story.slug)).size, 51);
  assert.equal(new Set(stories.map(story => story.title)).size, 51);
  assert.equal(stories.filter(story => story.moral === null).length, 18);
  const plots = new Set();
  for (const story of stories) {
    const {slug, targetMinutes, ...raw} = story;
    assert.ok(ScriptSchema.safeParse(raw).success, slug);
    assert.deepEqual(storyQualityIssues(raw, targetMinutes), [], slug);
    const text = raw.scenes.flatMap(scene => scene.lines.map(line => line.text)).join(' ');
    assert.ok(text.split(/\s+/).length >= 300, slug);
    assert.doesNotMatch(text, /Slow and kind — now I remember|Oh no! My part tipped right over|We saved your place right here/, slug);
    assert.ok(!plots.has(text), slug);
    plots.add(text);
    const directed = directScript({...story, presentationVersion: 4, outro: {text: story.outro}});
    assert.equal(directed.scenes.some(scene => scene.kind === 'moral'), raw.moral !== null, slug);
    assert.equal(directed.stars.total, 2, slug);
    const rawEnding = raw.scenes.at(-1).lines.map(line => line.text);
    assert.ok(directed.scenes.some(scene => scene.lines.map(line => line.text).join('|') === rawEnding.join('|')), slug);
  }
});
