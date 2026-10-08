import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import YAML from 'yaml';
import {buildStoryKit, importStories, rawStoryExample} from '../scripts/lib/story-tools.mjs';
import {castMemberByKind} from '../scripts/lib/cast.mjs';

const repo = new URL('../', import.meta.url);
function workspace(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dreamy-story-tools-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  fs.cpSync(new URL('library/', repo), path.join(root, 'library'), {recursive: true});
  const file = path.join(root, 'batch.json');
  const example = rawStoryExample();
  const story = {...example, slug: 'imported-new-adventure', title: 'A New Adventure'};
  const write = value => fs.writeFileSync(file, JSON.stringify(value));
  return {root, file, story, write};
}

test('brief contains every renderable library character, settings, histories and exact batch format', () => {
  const kit = buildStoryKit();
  const designs = fs.readdirSync(new URL('library/characters/', repo)).filter(file => file.endsWith('.json')).map(file => file.slice(0, -5)).sort();
  assert.equal(kit.context.counts.characters, designs.length);
  assert.deepEqual(kit.context.cast.map(member => member.kind).sort(), designs);
  for (const member of kit.context.cast) assert.equal(member.name, castMemberByKind(member.kind).name);
  assert.ok(kit.context.counts.backgrounds >= 25);
  assert.ok(kit.context.usedStories.length >= 6);
  assert.ok(kit.context.unusedStories.length >= 21);
  assert.ok(kit.context.cast.every(member => !Object.hasOwn(member, 'family')));
  assert.match(kit.prompt, /50/);
  assert.match(kit.prompt, /3 complete/);
  assert.match(kit.prompt, /background/);
  assert.match(kit.prompt, new RegExp(`${designs.length} renderable characters`));
  assert.doesNotMatch(kit.prompt, /only the SIX|closed cast/i);
  assert.match(kit.prompt, /"stories"/);
  assert.ok(kit.schema.anyOf.length >= 2);
  assert.equal(kit.example.type, 'story');
});

test('an elephant hero and lion friend survive import, Director enrichment and queue selection', t => {
  const {root, file, story, write} = workspace(t);
  story.mainCharacter = {kind: 'elephant', name: castMemberByKind('elephant').name};
  story.scenes = story.scenes.map(scene => ({...scene, character: 'elephant', secondCharacter: scene.secondCharacter ? 'lion' : null}));
  write(story);
  const result = importStories(file, {root});
  assert.deepEqual(result.added, [story.slug]);
  const saved = JSON.parse(fs.readFileSync(path.join(root, 'library/scripts', `${story.slug}.json`), 'utf8'));
  assert.deepEqual(saved.mainCharacter, story.mainCharacter);
  assert.ok(saved.scenes.some(scene => scene.character === 'elephant' && scene.secondCharacter === 'lion'));
  assert.ok(saved.scenes.some(scene => scene.kind === 'moral'));
  const queued = YAML.parse(fs.readFileSync(path.join(root, 'library/queue.yml'), 'utf8')).items.find(item => item.slug === story.slug);
  assert.equal(queued.hero, castMemberByKind('elephant').id);
  assert.equal(queued.type, 'story');
});

test('feed directs a single story and queues a slug without a writer call; repeating is a no-op', t => {
  const {root, file, story, write} = workspace(t);
  write(story);
  const result = importStories(file, {root});
  assert.deepEqual(result.added, [story.slug]);
  const saved = path.join(root, 'library/scripts', `${story.slug}.json`);
  const before = fs.readFileSync(saved, 'utf8');
  const script = JSON.parse(before);
  assert.ok(script.scenes.some(scene => scene.kind === 'moral'));
  assert.equal(script.stars.total, 2);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'library/standby.json'), 'utf8'));
  assert.ok(manifest.slugs.includes(story.slug));
  const queued = () => YAML.parse(fs.readFileSync(path.join(root, 'library/queue.yml'), 'utf8')).items.filter(item => item.slug === story.slug);
  assert.equal(queued().length, 1);
  assert.equal(queued()[0].type, 'story');
  assert.ok(queued()[0].topic);
  assert.deepEqual(importStories(file, {root}).unchanged, [story.slug]);
  assert.equal(fs.readFileSync(saved, 'utf8'), before);
  assert.equal(queued().length, 1);
});

test('a malformed batch writes nothing, and changed or unsafe slugs cannot overwrite scripts', t => {
  const {root, file, story, write} = workspace(t);
  const queueFile = path.join(root, 'library/queue.yml');
  const before = fs.readFileSync(queueFile, 'utf8');
  write({stories: [story, {...story, slug: 'bad-story', scenes: []}]});
  assert.throws(() => importStories(file, {root}), /bad-story|scenes/);
  assert.ok(!fs.existsSync(path.join(root, 'library/scripts', `${story.slug}.json`)));
  assert.equal(fs.readFileSync(queueFile, 'utf8'), before);
  write({...story, slug: '../outside'});
  assert.throws(() => importStories(file, {root}), /slug/i);
  write(story);
  importStories(file, {root});
  write({...story, title: 'Changed Story'});
  assert.throws(() => importStories(file, {root}), /existing|overwrite|different/i);
});

test('dry runs preserve the library, and batch imports preserve intentional background changes', t => {
  const {root, file, story, write} = workspace(t);
  const multi = structuredClone(story);
  multi.slug = 'two-settings-adventure';
  multi.scenes[4].background = 'garden';
  multi.scenes[5].background = 'garden';
  write([story, multi]);
  assert.equal(importStories(file, {root, dryRun: true}).added.length, 2);
  assert.ok(!fs.existsSync(path.join(root, 'library/scripts', `${story.slug}.json`)));
  importStories(file, {root, queue: false});
  const script = JSON.parse(fs.readFileSync(path.join(root, 'library/scripts', `${multi.slug}.json`), 'utf8'));
  assert.equal(script.scenes[4].background, 'garden');
  assert.ok(new Set(script.scenes.map(scene => scene.background)).size >= 2);
  const queue = YAML.parse(fs.readFileSync(path.join(root, 'library/queue.yml'), 'utf8'));
  assert.ok(!queue.items.some(item => [story.slug, multi.slug].includes(item.slug)));
});

test('directory imports accept multiple files and reject duplicate slugs before writing', t => {
  const {root, story} = workspace(t);
  const input = path.join(root, 'incoming');
  fs.mkdirSync(input);
  fs.writeFileSync(path.join(input, 'one.json'), JSON.stringify(story));
  fs.writeFileSync(path.join(input, 'two.json'), JSON.stringify({...story, slug: 'second-new-adventure'}));
  assert.equal(importStories(input, {root, dryRun: true}).added.length, 2);
  fs.writeFileSync(path.join(input, 'two.json'), JSON.stringify(story));
  assert.throws(() => importStories(input, {root}), /duplicate/i);
});

test('a stored unused import can be queued later, but used stories cannot be automatically requeued', t => {
  const {root, file, story, write} = workspace(t);
  write(story);
  importStories(file, {root, queue: false});
  assert.equal(importStories(file, {root}).queued, 1);
  assert.equal(importStories(file, {root}).queued, 0);
  const queueFile = path.join(root, 'library/queue.yml');
  fs.writeFileSync(queueFile, YAML.stringify({items: []}));
  const manifestFile = path.join(root, 'library/standby.json');
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  manifest.usage[story.slug] = {status: 'used'};
  fs.writeFileSync(manifestFile, JSON.stringify(manifest));
  assert.equal(importStories(file, {root}).queued, 0);
});

test('a conflicting generated draft cannot shadow a newly imported permanent script', t => {
  const {root, file, story, write} = workspace(t);
  write(story);
  const generated = path.join(root, 'public/generated', story.slug);
  fs.mkdirSync(generated, {recursive: true});
  fs.writeFileSync(path.join(generated, 'script.json'), JSON.stringify({slug: story.slug, title: 'Different local draft'}));
  assert.throws(() => importStories(file, {root}), /generated|draft|different/i);
  assert.ok(!fs.existsSync(path.join(root, 'library/scripts', `${story.slug}.json`)));
});

test('real feed, scheduled queue selection and slug planning work with every writer request forbidden', t => {
  const {root, file, story, write} = workspace(t);
  fs.cpSync(new URL('scripts/', repo), path.join(root, 'scripts'), {recursive: true});
  fs.mkdirSync(path.join(root, 'src/lib'), {recursive: true});
  fs.copyFileSync(new URL('src/lib/sceneDirection.mjs', repo), path.join(root, 'src/lib/sceneDirection.mjs'));
  fs.symlinkSync(new URL('node_modules/', repo).pathname, path.join(root, 'node_modules'));
  fs.writeFileSync(path.join(root, 'library/queue.yml'), YAML.stringify({items: []}));
  const guard = path.join(root, 'no-network.mjs');
  fs.writeFileSync(guard, 'globalThis.fetch = async () => { throw new Error("Unexpected network call"); };');
  const run = args => {
    const result = spawnSync(process.execPath, ['--import', guard, ...args], {cwd: root, encoding: 'utf8', timeout: 15000,
      env: {...process.env, NODE_OPTIONS: '', GITHUB_OUTPUT: '', TURSO_URL: '', TURSO_AUTH_TOKEN: ''}});
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr);
    return result.stdout;
  };
  write({stories: [story]});
  assert.match(run(['scripts/stories.mjs', 'feed', file]), /1 new/);
  const permanentFile = path.join(root, 'library/scripts', `${story.slug}.json`);
  const before = fs.readFileSync(permanentFile, 'utf8');
  assert.match(run(['scripts/standby.mjs', 'sync']), /stories/);
  assert.ok(fs.existsSync(path.join(root, 'library/standby', `${story.slug}.md`)));
  const picked = JSON.parse(run(['scripts/queue.mjs', 'pop', '--stories-only']));
  assert.equal(picked.slug, story.slug);
  assert.match(run(['scripts/plan.mjs', '--slug', picked.slug, '--dry']), /script_source=library/);
  assert.equal(fs.readFileSync(permanentFile, 'utf8'), before);
});
