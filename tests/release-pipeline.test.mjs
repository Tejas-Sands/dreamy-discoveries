import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import YAML from 'yaml';

const root = fileURLToPath(new URL('../', import.meta.url));
const workflow = name => YAML.parse(fs.readFileSync(path.join(root, '.github/workflows', name), 'utf8'));
const episode = slug => ({slug, title: `Story ${slug}`, type: 'story', palette: 'meadow',
  mainCharacter: {kind: 'bunny', name: 'Taffy'}, targetMinutes: 5,
  scenes: [{background: 'meadow', character: 'bunny', lines: [{text: 'Hello!', durationSec: 2.345}]}]});

// Every CLI/network/render boundary is intercepted; fixtures never leave /tmp.
const mockCommands = `
import fs from 'node:fs';
import path from 'node:path';
import childProcess from 'node:child_process';
import {syncBuiltinESMExports} from 'node:module';
globalThis.fetch = async () => { throw new Error('Network forbidden in release fixtures'); };
childProcess.spawnSync = (command, args) => {
  const call = {command, args};
  const result = {status: 0, stdout: '', stderr: ''};
  if (command === 'gh') {
    if (args[0] === '--version') result.stdout = 'gh fixture';
    else if (args[1] === 'view') {
      if (process.env.MOCK_RELEASE_NEW && !fs.existsSync(process.env.MOCK_CALLS + '.created')) result.status = 1;
      else result.stdout = 'https://example.invalid/release';
    } else if (args[1] === 'create') fs.writeFileSync(process.env.MOCK_CALLS + '.created', 'created');
    else if (args[1] === 'upload') {
      call.assets = args.slice(3).filter(arg => !arg.startsWith('--')).map(file => ({
        name: path.basename(file.split('#')[0]), file: file.split('#')[0],
        content: fs.readFileSync(file.split('#')[0], 'utf8'),
      }));
      if (process.env.MOCK_UPLOAD_FAIL) { result.status = 1; result.stderr = 'fixture upload failure'; }
    } else if (args[1] === 'download') {
      const assets = JSON.parse(process.env.MOCK_RELEASES || '{}')[args[2]] || {};
      const dir = args[args.indexOf('-D') + 1];
      const patterns = args.filter((_, i) => args[i - 1] === '-p');
      const selected = Object.keys(assets).filter(name => patterns.includes(name));
      fs.mkdirSync(dir, {recursive: true});
      if (!selected.length || process.env.MOCK_DOWNLOAD_FAIL) {
        fs.writeFileSync(path.join(dir, patterns[0]), 'partial download');
        result.status = 1; result.stderr = 'fixture asset download failure';
      } else for (const name of selected) fs.writeFileSync(path.join(dir, name), assets[name]);
    }
  } else if (command === 'npx' && args[0] === 'remotion') {
    const output = args[3], props = JSON.parse(args.find(arg => arg.startsWith('--props=')).slice(8));
    call.props = props;
    fs.mkdirSync(path.dirname(output), {recursive: true});
    fs.writeFileSync(output, JSON.stringify(props));
  } else if (path.basename(command) === 'ffmpeg') {
    const list = args[args.indexOf('-i') + 1];
    call.parts = fs.readFileSync(list, 'utf8');
    fs.writeFileSync(args.at(-1), 'compiled fixture');
  } else throw new Error('Unexpected subprocess: ' + command);
  fs.appendFileSync(process.env.MOCK_CALLS, JSON.stringify(call) + '\\n');
  return result;
};
syncBuiltinESMExports();
`;

function workspace(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dreamy-release-test-'));
  t.after(() => fs.rmSync(dir, {recursive: true, force: true}));
  fs.cpSync(path.join(root, 'scripts'), path.join(dir, 'scripts'), {recursive: true});
  fs.cpSync(path.join(root, 'src/lib'), path.join(dir, 'src/lib'), {recursive: true});
  fs.mkdirSync(path.join(dir, 'library/characters'), {recursive: true});
  fs.mkdirSync(path.join(dir, 'library/backgrounds'), {recursive: true});
  for (const file of ['cast.json', 'vocab.json']) {
    const source = path.join(root, 'library', file);
    if (fs.existsSync(source)) fs.copyFileSync(source, path.join(dir, 'library', file));
  }
  fs.copyFileSync(path.join(root, 'library/characters/bunny.json'), path.join(dir, 'library/characters/bunny.json'));
  fs.symlinkSync(path.join(root, 'node_modules'), path.join(dir, 'node_modules'));
  const mock = path.join(dir, 'mock-commands.mjs');
  fs.writeFileSync(mock, mockCommands);
  const calls = path.join(dir, 'calls.jsonl');
  fs.writeFileSync(calls, '');
  const output = path.join(dir, 'github-output');
  const env = {...process.env, NODE_OPTIONS: `--import=${mock}`, MOCK_CALLS: calls,
    MOCK_RELEASES: '{}', MOCK_UPLOAD_FAIL: '', MOCK_DOWNLOAD_FAIL: '', MOCK_RELEASE_NEW: '', NODE_TEST_CONTEXT: '',
    TURSO_URL: '', TURSO_AUTH_TOKEN: '', GITHUB_OUTPUT: output};
  const write = (file, content) => {
    fs.mkdirSync(path.dirname(path.join(dir, file)), {recursive: true});
    fs.writeFileSync(path.join(dir, file), typeof content === 'string' ? content : JSON.stringify(content));
  };
  const read = file => fs.readFileSync(path.join(dir, file), 'utf8');
  const run = (entry, args = [], extra = {}) => spawnSync(process.execPath, [`scripts/${entry}.mjs`, ...args], {
    cwd: dir, env: {...env, ...extra}, encoding: 'utf8', timeout: 15000,
  });
  const logged = () => read('calls.jsonl').trim().split('\n').filter(Boolean).map(JSON.parse);
  const saveEpisode = slug => {
    write(`public/generated/${slug}/script.json`, episode(slug));
    write(`library/scripts/${slug}.json`, episode(slug));
    for (const extension of ['mp4', 'png', 'metadata.txt']) write(`out/episodes/${slug}.${extension}`, extension);
  };
  return {dir, env, write, read, run, logged, saveEpisode};
}

test('restoring planned episode inputs preserves newer mutable production history', t => {
  const {dir, write} = workspace(t);
  const upload = workflow('make-video.yml').jobs.plan.steps.find(step => step.uses === 'actions/upload-artifact@v4');
  const source = path.join(dir, 'snapshot'), checkout = path.join(dir, 'checkout');
  const state = ['catalog.json', 'universe.json', 'queue.yml', 'calendar.json', 'standby.json'];
  for (const file of state) {
    write(`snapshot/library/${file}`, 'old history');
    write(`checkout/library/${file}`, 'new history');
  }
  for (const file of ['public/generated/a/script.json', 'library/scripts/a.json',
    'library/characters/bunny.json', 'library/backgrounds/meadow.json', 'library/cast.json']) write(`snapshot/${file}`, file);
  for (const line of upload.with.path.trim().split('\n')) {
    if (line.startsWith('!')) continue;
    const file = line.trim().replace('${{ steps.plan.outputs.slug }}', 'a');
    fs.cpSync(path.join(source, file), path.join(checkout, file), {recursive: true});
  }
  for (const file of state) assert.equal(fs.readFileSync(path.join(checkout, 'library', file), 'utf8'), 'new history', file);
  for (const file of ['public/generated/a/script.json', 'library/scripts/a.json',
    'library/characters/bunny.json', 'library/backgrounds/meadow.json']) assert.ok(fs.existsSync(path.join(checkout, file)), file);
});

test('compilation publishing succeeds without an episode script or universe entry', t => {
  const {dir, write, read, run} = workspace(t);
  const name = 'compilation-fixture';
  for (const ext of ['mp4', 'png', 'metadata.txt']) write(`out/episodes/${name}.${ext}`, ext);
  write(`out/episodes/${name}.json`, {name, title: 'Friends', slugs: ['a']});
  const files = ['mp4', 'png', 'metadata.txt', 'json'].map(ext => `out/episodes/${name}.${ext}`).join(',');
  const result = run('publish-release', ['--slug', name, '--compilation', '--files', files]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(read('github-output'), /release_url=https:\/\/example.invalid\/release/);
  assert.equal(fs.existsSync(path.join(dir, 'library/universe.json')), false);
  assert.equal(fs.existsSync(path.join(dir, 'library/catalog.json')), false, 'the compilation catalog workflow owns its record');
});

test('missing episode scripts fail before any release command', t => {
  const {write, run, logged} = workspace(t);
  write('out/episodes/missing.mp4', 'video');
  const result = run('publish-release', ['--slug', 'missing', '--files', 'out/episodes/missing.mp4']);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Missing episode script/);
  assert.equal(logged().length, 0, 'do not publish incomplete episodes');
});

test('episode release uploads the measured script under its actual per-slug filename and cleans temporary files', t => {
  const {dir, read, run, logged, saveEpisode} = workspace(t);
  saveEpisode('measured');
  const before = read('public/generated/measured/script.json');
  const result = run('publish-release', ['--slug', 'measured']);
  assert.equal(result.status, 0, result.stderr);
  const assets = logged().find(call => call.args[1] === 'upload').assets;
  assert.deepEqual(assets.map(asset => asset.name), ['measured.mp4', 'measured.png', 'measured.metadata.txt', 'measured.script.json']);
  const script = assets.at(-1);
  assert.equal(script.content, before);
  assert.equal(fs.existsSync(script.file), false, 'only the temporary upload copy is cleaned');
  assert.equal(read('public/generated/measured/script.json'), before);
  assert.equal(JSON.parse(read('library/universe.json')).stories[0].status, 'released');
  assert.ok(fs.existsSync(path.join(dir, 'out/episodes/measured.mp4')));
});

test('failed script uploads clean only their temporary copies', t => {
  const {read, run, logged, saveEpisode} = workspace(t);
  saveEpisode('failed');
  const before = read('public/generated/failed/script.json');
  const result = run('publish-release', ['--slug', 'failed'], {MOCK_UPLOAD_FAIL: 'true'});
  assert.notEqual(result.status, 0);
  const script = logged().find(call => call.args[1] === 'upload').assets.at(-1);
  assert.equal(script.name, 'failed.script.json');
  assert.equal(fs.existsSync(script.file), false);
  assert.equal(read('public/generated/failed/script.json'), before);
});

for (const legacy of [false, true]) test(`compilation downloads the ${legacy ? 'legacy' : 'modern'} final release script even with a cached video`, t => {
  const {write, read, run, logged} = workspace(t);
  write('out/episodes/a.mp4', 'cached video');
  write('library/scripts/a.json', {...episode('a'), title: 'Earlier library copy'});
  const script = {...episode('a'), title: 'Measured release script'};
  const assets = {[legacy ? 'script.json' : 'a.script.json']: JSON.stringify(script)};
  const result = run('compile', ['--slugs', 'a', '--name', 'compilation-download', '--no-bumpers'], {
    MOCK_RELEASES: JSON.stringify({'video-a': assets}),
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(read('public/generated/a/script.json')).title, script.title);
  const downloads = logged().filter(call => call.args[1] === 'download');
  assert.equal(downloads.length, legacy ? 2 : 1);
  assert.equal(read('out/episodes/a.mp4'), 'cached video');
  assert.deepEqual(fs.readdirSync(path.dirname(path.join(downloads[0].args[downloads[0].args.indexOf('-D') + 1]))).filter(name => name.startsWith('.download-')), []);
});

test('a failed episode download leaves no partial cache or temporary files', t => {
  const {dir, run} = workspace(t);
  const result = run('compile', ['--slugs', 'a', '--no-bumpers'], {MOCK_DOWNLOAD_FAIL: 'true'});
  assert.notEqual(result.status, 0);
  assert.equal(fs.existsSync(path.join(dir, 'out/episodes/a.mp4')), false);
  assert.deepEqual(fs.readdirSync(path.join(dir, 'out/episodes')).filter(name => name.startsWith('.download-')), []);
});

test('release progress survives delivery failure while its queue entry remains retryable', t => {
  const {dir, env, write, read, run, saveEpisode} = workspace(t);
  saveEpisode('a');
  const steps = workflow('make-video.yml').jobs.stitch.steps;
  const catalog = steps.find(step => step.name === 'Record in the catalog');
  const delivery = steps.find(step => step.id === 'delivery');
  assert.ok(delivery, 'delivery must expose its outcome separately from release');
  assert.match(catalog.if, /always\(\).*steps\.release\.outcome == 'success'/);
  assert.equal(catalog.env.DELIVERY_OUTCOME, '${{ steps.delivery.outcome }}');
  const record = outcome => spawnSync('bash', ['-e', '-c', catalog.run.split('git config')[0]], {
    cwd: dir, env: {...env, SLUG: 'a', QUEUE_ID: 'q1', DELIVERY_OUTCOME: outcome,
      RELEASE_URL: 'https://example.invalid/release'}, encoding: 'utf8', timeout: 15000,
  });
  write('library/queue.yml', YAML.stringify({items: [{id: 'q1', topic: 'Kindness', slug: 'a', status: 'running'}]}));
  const failed = record('failure');
  assert.equal(failed.status, 0, failed.stderr);
  assert.equal(JSON.parse(read('library/catalog.json')).episodes[0].release, 'https://example.invalid/release');
  assert.equal(YAML.parse(read('library/queue.yml')).items[0].status, 'running');
  assert.equal(run('queue', ['retry', 'q1', '--slug', 'a']).status, 0);
  assert.equal(YAML.parse(read('library/queue.yml')).items[0].status, 'pending');
  const delivered = record('success');
  assert.equal(delivered.status, 0, delivered.stderr);
  assert.equal(YAML.parse(read('library/queue.yml')).items[0].status, 'done');
  run('queue', ['retry', 'q1', '--slug', 'a']);
  assert.equal(YAML.parse(read('library/queue.yml')).items[0].status, 'done');
});

test('compilation titles survive workflow output and publisher invocation literally', t => {
  const {dir, env, read, run, logged, saveEpisode} = workspace(t);
  saveEpisode('a');
  const title = 'Bedtime "$5" `stories` $(printf expanded)\nA second line';
  const compiled = run('compile', ['--slugs', 'a', '--name', 'compilation-literal', '--no-bumpers', '--title', title]);
  assert.equal(compiled.status, 0, compiled.stderr);
  const lines = read('github-output').split('\n');
  const start = lines.findIndex(line => line.startsWith('title<<'));
  assert.ok(start >= 0, 'multiline titles require the supported GitHub output format');
  const delimiter = lines[start].slice('title<<'.length), end = lines.indexOf(delimiter, start + 1);
  assert.equal(lines.slice(start + 1, end).join('\n'), title);
  const publish = workflow('compile.yml').jobs.compile.steps.find(step => step.id === 'release');
  assert.equal(publish.env.TITLE, '${{ steps.compile.outputs.title }}');
  assert.equal(publish.run.includes('${{'), false, 'the shell receives values through environment variables');
  const result = spawnSync('bash', ['-e', '-c', publish.run], {cwd: dir,
    env: {...env, NAME: 'compilation-literal', TITLE: title, MOCK_RELEASE_NEW: 'true'}, encoding: 'utf8', timeout: 15000});
  assert.equal(result.status, 0, result.stderr);
  const upload = logged().find(call => call.args[1] === 'create');
  assert.ok(upload, 'the mocked creation records the actual publisher arguments');
  assert.equal(upload.args[upload.args.indexOf('--title') + 1], title);
  assert.equal(JSON.parse(read('out/episodes/compilation-literal.json')).title, title);
});

test('reordered compilations reuse only matching first/next bumper variants', t => {
  const {dir, write, run, logged, saveEpisode} = workspace(t);
  saveEpisode('a'); saveEpisode('b');
  write('out/episodes/compile/a.bumper.mp4', 'old cached bumper');
  for (const slugs of ['a,b', 'b,a', 'a,b']) {
    const result = run('compile', ['--slugs', slugs, '--name', 'compilation-order']);
    assert.equal(result.status, 0, result.stderr);
  }
  const renders = logged().filter(call => call.command === 'npx' && call.args[2] === 'Bumper');
  assert.equal(renders.length, 4, 'each episode needs exactly one first and one next variant');
  assert.deepEqual(renders.map(call => [call.props.slug, call.props.label]), [
    ['a', 'First up!'], ['b', 'Next up!'], ['b', 'First up!'], ['a', 'Next up!'],
  ]);
  assert.equal(fs.readFileSync(path.join(dir, 'out/episodes/compile/a.bumper.mp4'), 'utf8'), 'old cached bumper');
});
