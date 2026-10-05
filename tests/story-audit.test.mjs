import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const module = await import('../scripts/lib/story-audit.mjs').catch(error => {
  if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
  return {};
});

const scene = (...texts) => ({kind: 'story', character: 'bunny', lines: texts.map(text => ({text, speaker: 'character', action: 'nod'}))});
function completeStory() {
  return {type: 'story', title: 'The Torn Boat', moral: 'Honesty helps friends repair mistakes.', scenes: [
    scene('Oh no! The paper boat has a torn sail.', 'I want to sail our paper boat together.'),
    scene('First, I hide the torn sail under leaves.', 'Daisy cannot find our paper boat.'),
    scene('Then, I try tying the sail with string.', 'The string slips, and the sail falls.'),
    scene('I could hide it or tell Daisy the truth.', 'I choose to tell Daisy what happened.'),
    {...scene('I am sorry. I tore our sail.', 'Taffy tapes the torn sail with Daisy.'), kind: 'lesson'},
    scene('Our paper boat floats with its fixed sail!', 'Daisy smiles as they sail the boat together.'),
  ]};
}

test('the offline audit finds textual arc candidates and cites their real scene lines', () => {
  assert.equal(typeof module.auditStory, 'function', 'offline story audit is available');
  const script = completeStory();
  const report = module.auditStory(script);
  for (const key of ['hook', 'goal', 'attempts', 'choice', 'repair', 'payoff']) {
    assert.equal(report.beats[key].status, 'candidate', key);
    assert.ok(report.beats[key].evidence.length, key);
    for (const evidence of report.beats[key].evidence) {
      assert.equal(evidence.text, script.scenes[evidence.sceneIndex].lines[evidence.lineIndex].text);
    }
  }
  assert.equal(report.beats.attempts.evidence.length, 2);
  assert.equal(report.beats.repair.evidence[0].sceneNumber, 5);
  assert.equal(report.beats.payoff.evidence[0].sceneNumber, 6);
  assert.ok(report.uncertainties.some(text => /heuristic|human/i.test(text)));
  assert.equal(report.advisory, true);
  assert.deepEqual(script, completeStory(), 'audit must not add narrative annotations');
});

test('scene counts, labels and an apology do not manufacture attempts, repair or payoff', () => {
  assert.equal(typeof module.auditStory, 'function');
  const report = module.auditStory({type: 'story', moral: 'Sharing is caring.', storyBrief: {repair: 'share the boat'}, scenes: [
    ...Array.from({length: 7}, () => scene('We can be kind and share together.')),
    {...scene('I am sorry.', 'Sharing is caring.'), kind: 'lesson'},
    {...scene('Sharing is caring.'), kind: 'moral'},
  ]});
  for (const key of ['goal', 'attempts', 'repair', 'payoff']) assert.equal(report.beats[key].status, 'missing', key);
  assert.ok(report.findings.some(finding => finding.code === 'repeated-dialogue'));
  assert.ok(report.findings.some(finding => finding.code === 'unearned-moral'));
});

test('rewording the same attempt is flagged instead of counting as a new strategy', () => {
  assert.equal(typeof module.auditStory, 'function');
  const script = completeStory();
  script.scenes[2] = scene('Then, I hide the torn sail under some leaves.', 'Daisy still cannot find it.');
  const report = module.auditStory(script);
  assert.equal(report.beats.attempts.status, 'uncertain');
  assert.equal(report.beats.attempts.evidence.length, 1);
  const duplicated = report.findings.find(finding => finding.code === 'duplicate-attempt');
  assert.deepEqual(duplicated.evidence.map(item => item.sceneNumber), [2, 3]);
});

test('a successful action before the repair cannot earn the ending', () => {
  assert.equal(typeof module.auditStory, 'function');
  const script = completeStory();
  script.scenes[2].lines.push({text: 'Our paper boat floats with its fixed sail!', speaker: 'narrator'});
  script.scenes[5] = scene('Honesty is always the best choice.');
  const report = module.auditStory(script);
  assert.equal(report.beats.payoff.status, 'missing');
  assert.ok(report.findings.some(finding => finding.code === 'unearned-moral'));
  assert.match(module.storyAuditText(report), /scene 5, line 2/i);
});

test('generic retries and vague promises remain uncertain rather than plot evidence', () => {
  assert.equal(typeof module.auditStory, 'function');
  const report = module.auditStory({type: 'story', scenes: [scene('Let us try again!', 'We can mend it together.', 'I will be kind.'), scene('Hooray! We learned kindness!')]});
  assert.equal(report.beats.attempts.status, 'missing');
  assert.equal(report.beats.repair.status, 'missing');
  assert.equal(report.beats.payoff.status, 'missing');
});

test('negated actions and failed outcomes never count as a repair or a payoff', () => {
  const script = completeStory();
  script.scenes[4] = {...scene('Taffy cannot tape the torn sail.', 'Taffy did not mend the torn sail.'), kind: 'lesson'};
  script.scenes[5] = scene('The paper boat does not float.', 'Daisy cannot enjoy the boat.');
  const report = module.auditStory(script);
  assert.equal(report.beats.repair.status, 'missing');
  assert.equal(report.beats.payoff.status, 'missing');
  script.scenes[4] = completeStory().scenes[4];
  assert.equal(module.auditStory(script).beats.payoff.status, 'missing');
});

test('two different actions on the same object count as distinct attempts', () => {
  const script = completeStory();
  script.scenes[1] = scene('First, I hide the torn sail under these leaves.');
  script.scenes[2] = scene('Then, I wrap the torn sail under these leaves.');
  const report = module.auditStory(script);
  assert.equal(report.beats.attempts.status, 'candidate');
  assert.equal(report.findings.some(finding => finding.code === 'duplicate-attempt'), false);
});

test('the audit CLI leaves a permanent script intact and prints exact scene references', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dreamy-story-audit-'));
  t.after(() => fs.rmSync(dir, {recursive: true, force: true}));
  const input = path.join(dir, 'script.json');
  const source = JSON.stringify(completeStory());
  fs.writeFileSync(input, source);
  const run = spawnSync(process.execPath, ['scripts/audit-story.mjs', '--input', input], {encoding: 'utf8'});
  assert.ifError(run.error);
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /scene 5, line 2: "Taffy tapes the torn sail with Daisy\."/);
  assert.equal(fs.readFileSync(input, 'utf8'), source);
});
