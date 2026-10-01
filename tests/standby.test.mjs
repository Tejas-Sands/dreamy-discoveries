import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {directScript} from '../scripts/lib/director.mjs';
import {storyQualityIssues} from '../scripts/lib/story-planner.mjs';
import {castKinds, castMembers} from '../scripts/lib/cast.mjs';
import {estimateVideoSec} from '../scripts/lib/estimate.mjs';
const {chooseStandby, markStandbyUsed, standbyStatus} = await import('../scripts/lib/standby.mjs').catch(() => ({}));
const entries = ['bunny', 'bear', 'duck'].map((kind, i) => ({slug: `reserve-${i}`, type: 'story', mainCharacter: {kind}, scenes: [{lines: [{text: 'Hello'}]}]}));

test('standby stories prefer the requested hero and never repeat cataloged episodes', () => {
  assert.equal(typeof chooseStandby, 'function');
  assert.equal(chooseStandby(entries, [], [], 'ben').slug, 'reserve-1');
  assert.equal(chooseStandby(entries, [{slug: 'reserve-1'}], [], 'ben').slug, 'reserve-0');
});

test('rendered or released universe stories also consume the reserve', () => {
  assert.equal(typeof chooseStandby, 'function');
  const stories = [{id: 'reserve-0', status: 'rendered'}, {id: 'reserve-1', release: 'https://example.com/video'}];
  assert.equal(chooseStandby(entries, [], stories).slug, 'reserve-2');
  assert.equal(chooseStandby(entries, entries, stories), null);
});

test('explicit used markers exclude stories even before the catalog is available', () => {
  const usage = {'reserve-1': {status: 'used', usedAt: '2026-10-01T12:00:00Z'}};
  assert.equal(chooseStandby(entries, [], [], 'ben', usage).slug, 'reserve-0');
  assert.equal(standbyStatus('reserve-1', usage).status, 'used');
  assert.equal(standbyStatus('reserve-2', usage).status, 'available');
  assert.equal(standbyStatus('reserve-0', {}, [], [{id: 'reserve-0', status: 'released'}]).status, 'used');
});

test('usage recording preserves the first use timestamp and rejects unknown slugs', () => {
  const manifest = {slugs: ['reserve-0'], usage: {}};
  markStandbyUsed(manifest, 'reserve-0', {usedAt: '2026-10-01T12:00:00Z', releaseUrl: 'https://example.com/one', runId: '42'});
  markStandbyUsed(manifest, 'reserve-0', {usedAt: '2026-10-02T12:00:00Z'});
  assert.deepEqual(manifest.usage['reserve-0'], {status: 'used', usedAt: '2026-10-01T12:00:00Z', releaseUrl: 'https://example.com/one', runId: '42'});
  assert.throws(() => markStandbyUsed(manifest, 'missing'), /unknown standby/i);
});

test('all authored standby stories are substantial, directed and limited to the closed cast', () => {
  const manifestFile = new URL('../library/standby.json', import.meta.url);
  assert.ok(fs.existsSync(manifestFile), 'no standby manifest');
  const {slugs} = JSON.parse(fs.readFileSync(manifestFile));
  assert.ok(slugs.length >= 3);
  for (const slug of slugs) {
    const script = JSON.parse(fs.readFileSync(new URL(`../library/scripts/${slug}.json`, import.meta.url)));
    assert.equal(script.slug, slug);
    assert.deepEqual(storyQualityIssues(script, 5.5), []);
    for (const scene of script.scenes) {
      assert.ok(castKinds().includes(scene.character));
      if (scene.secondCharacter) assert.ok(castKinds().includes(scene.secondCharacter));
    }
    assert.deepEqual(JSON.parse(JSON.stringify(directScript(script))), script);
  }
});

test('the new collection gives every hero four substantial stories with varied pairings and settings', () => {
  const {slugs} = JSON.parse(fs.readFileSync(new URL('../library/standby.json', import.meta.url)));
  const collection = slugs.map(slug => JSON.parse(fs.readFileSync(new URL(`../library/scripts/${slug}.json`, import.meta.url))))
    .filter(script => script.standby?.collection === 'Sunny Meadow Standby Collection');
  assert.equal(collection.length, 24);
  const pairings = new Set();
  const settings = new Set();
  const repairs = new Set();
  for (const member of castMembers()) {
    assert.equal(collection.filter(script => script.mainCharacter.kind === member.kind).length, 4, member.name);
  }
  for (const script of collection) {
    const member = castMembers().find(entry => entry.kind === script.mainCharacter.kind);
    const narrative = script.scenes.filter(scene => scene.kind !== 'moral');
    const text = narrative.flatMap(scene => scene.lines.filter(line => line.role !== 'praise')).map(line => line.text).join(' ');
    assert.ok(text.split(/\s+/).length >= 650, script.slug);
    assert.equal(text.split(member.catchphrase).length - 1, 3, script.slug);
    assert.equal(script.scenes.filter(scene => scene.kind === 'question').length, 2, script.slug);
    assert.ok(script.scenes.some(scene => scene.kind === 'lesson'), script.slug);
    assert.ok(estimateVideoSec(script) >= 280 && estimateVideoSec(script) <= 390, script.slug);
    const friends = new Set(narrative.map(scene => scene.secondCharacter).filter(Boolean));
    assert.equal(friends.size, 1, script.slug);
    pairings.add(`${member.kind}:${[...friends][0]}`);
    settings.add(script.scenes[0].background);
    for (const field of ['summary', 'moralTheme', 'heroGoal', 'firstAttempt', 'secondAttempt', 'consequence', 'repair', 'ending']) {
      assert.ok(script.standby[field]?.trim(), `${script.slug}: missing ${field}`);
    }
    assert.notEqual(script.standby.firstAttempt, script.standby.secondAttempt, script.slug);
    repairs.add(script.standby.repair);
    assert.ok(new Set(narrative.flatMap(scene => scene.lines.map(line => line.emotion))).size >= 4, script.slug);
  }
  assert.equal(pairings.size, 24);
  assert.equal(settings.size, 24);
  assert.equal(repairs.size, 24);
});
