import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import YAML from 'yaml';

const root = fileURLToPath(new URL('../', import.meta.url));
// Intercept every request in child processes; these tests never contact a provider.
const mockWriter = `
import fs from 'node:fs';
const timer = globalThis.setTimeout;
globalThis.setTimeout = (fn, ms, ...args) => timer(fn, [10000, 20000].includes(ms) ? 1 : ms, ...args);
globalThis.fetch = async (url, request) => {
  fs.appendFileSync(process.env.MOCK_REQUESTS, new URL(url).hostname + '\\n');
  if (process.env.MOCK_MODE === 'outage' || process.env.MOCK_MODE === 'success' && !url.includes('api.groq.com')) return Response.json({error: {message: 'high demand'}}, {status: 503});
  const body = JSON.parse(request.body);
  const brief = JSON.parse(body.messages.at(-1).content.split('Episode brief (follow its cast, setting, attempts and repair): ')[1]);
  const scenes = Array.from({length: 25}, (_, i) => ({
    kind: [7, 16].includes(i) ? 'question' : i === 21 ? 'lesson' : 'story',
    background: brief.settings[0], character: brief.hero.kind, secondCharacter: brief.friend.kind,
    energy: 'calm', holdSec: 2, prop: brief.prop,
    question: [7, 16].includes(i) ? {answer: {text: 'Tell the truth!', emoji: '💛'}, praise: 'Yes! Friends can help us repair things.'} : null,
    lines: Array.from({length: 3}, () => ({text: 'We can tell the truth and mend it together.', speaker: 'character', emotion: 'happy', action: 'nod'})),
  }));
  const script = {type: 'story', title: 'A Small Honest Choice', palette: 'meadow',
    mainCharacter: {kind: brief.hero.kind, name: brief.hero.name}, intro: null, outro: null,
    moral: 'Telling the truth helps friends repair mistakes.', moralRhyme: ['Tell the truth and show you care!', 'Friends can help us to repair!'],
    youtube: {title: 'A Small Honest Choice', description: 'A gentle story about honesty.', tags: ['kids', 'story', 'honesty']}, scenes};
  let content;
  if (url.includes('generativelanguage.googleapis.com')) {
    if (process.env.MOCK_MODE === 'short') script.scenes = scenes.map(scene => ({...scene, lines: scene.lines.slice(0, 1)}));
    if (process.env.MOCK_MODE === 'invalid-enum') script.scenes[0].energy = 'excited';
    if (process.env.MOCK_MODE === 'wrong-type') script.type = 'rhyme';
    if (process.env.MOCK_MODE === 'wrong-hero') script.mainCharacter.name = 'New Friend';
    if (process.env.MOCK_MODE === 'wrong-setting') script.scenes[0].background = 'space';
    if (process.env.MOCK_MODE === 'invalid-json') content = '{';
  }
  content ??= JSON.stringify(script);
  return Response.json({choices: [{finish_reason: 'stop', message: {content}}]});
};
`;

function workspace(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dreamy-reliability-'));
  t.after(() => fs.rmSync(dir, {recursive: true, force: true}));
  fs.cpSync(path.join(root, 'scripts'), path.join(dir, 'scripts'), {recursive: true});
  // Copy authored content, but give each test its own production history. A
  // successful daily release must not change reserve counts or exhaust fixtures.
  const stateFiles = new Set(['catalog.json', 'universe.json', 'queue.yml']);
  fs.cpSync(path.join(root, 'library'), path.join(dir, 'library'), {recursive: true,
    filter: file => !stateFiles.has(path.basename(file)) && !/\.db(?:-(?:wal|shm|journal))?$/.test(file)});
  fs.writeFileSync(path.join(dir, 'library/catalog.json'), JSON.stringify({episodes: [], compilations: []}));
  fs.writeFileSync(path.join(dir, 'library/queue.yml'), YAML.stringify({items: []}));
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'library/standby.json'), 'utf8'));
  fs.writeFileSync(path.join(dir, 'library/standby.json'), JSON.stringify({...manifest, usage: {}}));
  fs.mkdirSync(path.join(dir, 'src/lib'), {recursive: true});
  fs.copyFileSync(path.join(root, 'src/lib/sceneDirection.mjs'), path.join(dir, 'src/lib/sceneDirection.mjs'));
  fs.symlinkSync(path.join(root, 'node_modules'), path.join(dir, 'node_modules'));
  const preload = path.join(dir, 'mock-writer.mjs');
  fs.writeFileSync(preload, mockWriter);
  const requests = path.join(dir, 'requests.txt');
  fs.writeFileSync(requests, '');
  const env = {...process.env, GEMINI_API_KEY: 'test-gemini', GROQ_API_KEY: 'test-groq', OPENROUTER_API_KEY: '',
    GEMINI_MODEL: '', GROQ_MODEL: '', OPENROUTER_MODEL: '', GITHUB_TOKEN: '',
    LLM_BASE_URL: '', LLM_API_KEY: '', LLM_MODEL: '', TURSO_URL: '', TURSO_AUTH_TOKEN: '',
    GITHUB_OUTPUT: '', MOCK_REQUESTS: requests, NODE_OPTIONS: `--import=${preload}`};
  const run = (entry, args, mode = 'success') => {
    const result = spawnSync(process.execPath, ['--import', preload, `scripts/${entry}.mjs`, ...args], {
      cwd: dir, env: {...env, MOCK_MODE: mode}, encoding: 'utf8', timeout: 15000,
    });
    assert.ifError(result.error);
    return result;
  };
  const read = file => fs.readFileSync(path.join(dir, file), 'utf8');
  return {dir, run, read, requests};
}

test('the planner survives Gemini 503s, directs the Groq result, and preserves committed scripts on reruns', t => {
  const {dir, run, read, requests} = workspace(t);
  const result = run('plan', ['--topic', 'A friend learns honesty', '--hero', 'ben', '--library']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /provider=groq/);
  assert.match(result.stdout, /script_source=llm/);
  const slug = JSON.parse(read('public/generated/latest.json')).slug;
  const permanent = read(`library/scripts/${slug}.json`);
  const script = JSON.parse(permanent);
  assert.equal(script.mainCharacter.name, 'Ben');
  assert.equal(script.stars.total, 2);
  assert.ok(script.scenes.some(scene => scene.kind === 'moral'));
  assert.deepEqual(fs.readFileSync(requests, 'utf8').trim().split('\n'), [
    'generativelanguage.googleapis.com', 'generativelanguage.googleapis.com', 'generativelanguage.googleapis.com', 'api.groq.com',
  ]);
  fs.writeFileSync(requests, '');
  for (const [entry, args] of [
    ['generate-script', ['--slug', slug, '--topic', 'Do not replace this story']],
    ['plan', ['--slug', slug, '--minutes', '6', '--library']],
  ]) assert.equal(run(entry, args, 'outage').status, 0);
  assert.equal(read(`library/scripts/${slug}.json`), permanent);
  assert.equal(fs.readFileSync(requests, 'utf8'), '');
  assert.ok(fs.existsSync(path.join(dir, 'public/generated', slug, 'script.json')));
});

test('rejected Gemini scripts fall through to a validated Groq story before anything is saved', t => {
  const {dir, run, read, requests} = workspace(t);
  for (const mode of ['short', 'invalid-json', 'invalid-enum', 'wrong-type', 'wrong-hero', 'wrong-setting']) {
    fs.writeFileSync(requests, '');
    const result = run('plan', ['--topic', 'A friend learns honesty', '--hero', 'ben', '--library'], mode);
    assert.equal(result.status, 0, `${mode}: ${result.stderr}`);
    assert.match(result.stdout, /provider=groq/);
    assert.match(result.stdout, /script_source=llm/);
    assert.deepEqual(fs.readFileSync(requests, 'utf8').trim().split('\n'), [
      'generativelanguage.googleapis.com', 'api.groq.com',
    ]);
    const {slug} = JSON.parse(read('public/generated/latest.json'));
    const script = JSON.parse(read(`library/scripts/${slug}.json`));
    assert.equal(script.mainCharacter.name, 'Ben');
    assert.ok(script.scenes.reduce((total, scene) => total + scene.lines.length, 0) >= 49);
    assert.equal(script.stars.total, 2);
    assert.ok(script.scenes.some(scene => scene.kind === 'moral'));
  }
});

test('a complete provider outage uses an unused standby and stops clearly when the reserve is exhausted', t => {
  const {dir, run, read} = workspace(t);
  const args = ['--topic', 'A friend learns honesty', '--hero', 'ben', '--standby', '--dry'];
  const result = run('plan', args, 'outage');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /slug=standby-ben-and-the-paper-boat/);
  assert.match(result.stdout, /script_source=standby/);
  assert.ok(!fs.existsSync(path.join(dir, 'public/generated/latest.json')), 'a dry plan must not replace the latest pointer');
  const catalog = JSON.parse(read('library/catalog.json'));
  const manifest = JSON.parse(read('library/standby.json'));
  catalog.episodes.push(...manifest.slugs.map(slug => ({slug})));
  fs.writeFileSync(path.join(dir, 'library/catalog.json'), JSON.stringify(catalog));
  const exhausted = run('plan', args, 'outage');
  assert.notEqual(exhausted.status, 0);
  assert.match(exhausted.stderr, /no unused standby stories remain/);
});

test('bad inputs and missing rerun slugs are reported instead of silently substituting a standby', t => {
  const {run, requests} = workspace(t);
  for (const args of [
    ['--topic', 'Honesty', '--minutes', 'bad', '--standby'],
    ['--topic', 'Honesty', '--hero', 'unicorn', '--standby'],
    ['--slug', 'does-not-exist', '--standby'],
  ]) {
    const result = run('plan', args, 'outage');
    assert.notEqual(result.status, 0);
    assert.doesNotMatch(result.stderr, /using unused standby/);
  }
  assert.equal(fs.readFileSync(requests, 'utf8'), '');
});

test('template planning stays AI-free and commits a directed script', t => {
  const {run, read, requests} = workspace(t);
  const result = run('plan', ['--template', 'counting', '--hero', 'bunny', '--seed', '42', '--library'], 'outage');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /script_source=template/);
  const {slug} = JSON.parse(read('public/generated/latest.json'));
  assert.equal(JSON.parse(read(`library/scripts/${slug}.json`)).template, 'counting');
  assert.equal(fs.readFileSync(requests, 'utf8'), '');
});

test('a queued slug survives downstream failure even if the reusable workflow returns no outputs', t => {
  const {dir, run, read} = workspace(t);
  fs.writeFileSync(path.join(dir, 'library/queue.yml'), YAML.stringify({items: [{id: 'q-retry', status: 'running', topic: 'Honesty'}]}));
  const slug = 'standby-ben-and-the-paper-boat';
  assert.equal(run('queue', ['remember', 'q-retry', '--slug', slug]).status, 0);
  let entry = YAML.parse(read('library/queue.yml')).items[0];
  assert.equal(entry.status, 'running');
  assert.equal(entry.slug, slug);
  assert.equal(run('queue', ['retry', 'q-retry']).status, 0);
  entry = YAML.parse(read('library/queue.yml')).items[0];
  assert.equal(entry.status, 'pending');
  assert.equal(entry.slug, slug);
  const next = run('queue', ['pop', '--stories-only']);
  assert.equal(JSON.parse(next.stdout).slug, slug);
  run('queue', ['done', 'q-retry']);
  run('queue', ['retry', 'q-retry']);
  assert.equal(YAML.parse(read('library/queue.yml')).items[0].status, 'done');
});

test('autopilot topics enter the persistent queue so failures can be retried', t => {
  const {dir, run, read} = workspace(t);
  fs.writeFileSync(path.join(dir, 'library/queue.yml'), YAML.stringify({items: [], pausedTemplates: [{id: 'song', template: 'colors'}]}));
  const picked = run('autopilot', []);
  assert.equal(picked.status, 0, picked.stderr);
  const output = JSON.parse(picked.stdout);
  const state = YAML.parse(read('library/queue.yml'));
  assert.equal(state.items.length, 1);
  assert.equal(state.items[0].id, output.id);
  assert.equal(state.items[0].topic, output.topic);
  assert.equal(state.items[0].status, 'running');
  assert.deepEqual(state.pausedTemplates, [{id: 'song', template: 'colors'}]);
  run('queue', ['retry', output.id]);
  assert.equal(JSON.parse(run('queue', ['pop', '--stories-only']).stdout).topic, output.topic);
  const second = JSON.parse(run('autopilot', []).stdout);
  assert.notEqual(second.id, output.id, 'another manual run must have its own queue record');
});

test('standby usage persists, readable pages follow releases, and permanent scripts stay untouched', t => {
  const {dir, run, read, requests} = workspace(t);
  const manifestBefore = read('library/standby.json');
  const slug = JSON.parse(manifestBefore).slugs[0];
  const permanentBefore = read(`library/scripts/${slug}.json`);
  const dry = run('standby', ['used', '--slug', slug, '--dry-run']);
  assert.equal(dry.status, 0, dry.stderr);
  assert.equal(read('library/standby.json'), manifestBefore);
  const marked = run('standby', ['used', '--slug', slug, '--release', 'https://example.com/video', '--run', '42']);
  assert.equal(marked.status, 0, marked.stderr);
  const usage = JSON.parse(read('library/standby.json')).usage[slug];
  assert.equal(usage.status, 'used');
  assert.equal(usage.releaseUrl, 'https://example.com/video');
  assert.equal(usage.runId, '42');
  assert.match(read('library/STANDBY.md'), /Used/);
  assert.match(read(`library/standby/${slug}.md`), /Completed video release/);
  assert.equal(read(`library/scripts/${slug}.json`), permanentBefore);
  assert.equal(JSON.parse(run('standby', ['list', '--json']).stdout).used, 1);
  const catalog = JSON.parse(read('library/catalog.json'));
  const otherSlug = JSON.parse(manifestBefore).slugs[1];
  catalog.episodes.push({slug: otherSlug, renderedAt: '2026-10-01T01:00:00Z', release: {url: 'https://example.com/second'}});
  fs.writeFileSync(path.join(dir, 'library/catalog.json'), JSON.stringify(catalog));
  assert.equal(run('standby', ['sync']).status, 0);
  const updated = JSON.parse(read('library/standby.json')).usage;
  assert.deepEqual(updated[slug], usage, 'sync must preserve the first-use marker');
  assert.equal(updated[otherSlug].usedAt, '2026-10-01T01:00:00Z');
  assert.equal(updated[otherSlug].releaseUrl, 'https://example.com/second');
  const fallback = run('plan', ['--topic', 'Honesty', '--hero', 'ben', '--standby', '--dry'], 'outage');
  assert.equal(fallback.status, 0, fallback.stderr);
  assert.doesNotMatch(fallback.stdout, new RegExp(`slug=${slug}(?:\\s|$)`));
  assert.match(fallback.stdout, /script_source=standby/);
  assert.equal(run('standby', ['used', '--slug', 'unknown-story']).status, 1);
  fs.writeFileSync(requests, '');
  const rerun = run('plan', ['--slug', slug, '--dry'], 'outage');
  assert.equal(rerun.status, 0, rerun.stderr);
  assert.equal(fs.readFileSync(requests, 'utf8'), '');
  assert.equal(read(`library/scripts/${slug}.json`), permanentBefore);
});
