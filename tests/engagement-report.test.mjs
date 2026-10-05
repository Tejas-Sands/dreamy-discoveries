import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const module = await import('../scripts/lib/engagement-report.mjs').catch(error => {
  if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
  return {};
});
const timedScript = () => ({slug: 'boat', title: 'The Boat', type: 'story', presentationVersion: 1, opening: 'hook',
  scenes: [
    {kind: 'story', lines: [{text: 'The boat tips.', durationSec: 5}], holdSec: 0},
    {kind: 'question', lines: [{text: 'What can we do?', durationSec: 3}, {text: 'Yes, try a wider sail!', durationSec: 2, role: 'praise'}], question: {answer: {text: 'Wider sail'}}, holdSec: 3},
    {kind: 'lesson', lines: [{text: 'The boat floats.', durationSec: 4}], holdSec: 0},
  ]});

test('Studio CSV accepts BOM, quoted commas, escaped quotes and multiline titles', () => {
  assert.equal(typeof module.parseStudioExport, 'function', 'offline export reader is available');
  const parsed = module.parseStudioExport('\uFEFFVideo ID,Video title,Views,Impressions,Impressions click-through rate (%),Average view duration,Average percentage viewed (%)\r\nboat,"The Boat, says ""Hello""\nAgain","1,234","5,000",4.8,1:32,48.5\r\n');
  assert.deepEqual(parsed.episodes[0], {id: 'boat', title: 'The Boat, says "Hello"\nAgain', views: 1234, impressions: 5000, ctrPercent: 4.8, averageViewSec: 92, averageViewedPercent: 48.5});
  assert.equal(parsed.retention.length, 0);
});

test('JSON overview and ratio retention exports normalize without inventing missing metrics', () => {
  assert.equal(typeof module.parseStudioExport, 'function');
  const parsed = module.parseStudioExport(JSON.stringify({rows: [{content: 'boat', videoTitle: 'The Boat', views: 250, averageViewDuration: '00:01:32'}],
    retention: [{videoId: 'boat', elapsedVideoTimeRatio: .5, audienceWatchRatio: .72}]}), {format: 'json'});
  assert.equal(parsed.episodes[0].averageViewSec, 92);
  assert.equal(parsed.episodes[0].impressions, undefined);
  assert.deepEqual(parsed.retention[0], {videoId: 'boat', elapsedRatio: .5, retentionPercent: 72});
});

test('partial or malformed exports give actionable local errors and preserve legitimate zeroes', () => {
  assert.equal(typeof module.parseStudioExport, 'function');
  assert.throws(() => module.parseStudioExport('Views,Video title\n2,"unfinished'), /quoted|unterminated/i);
  assert.throws(() => module.parseStudioExport('{"something": []}', {format: 'json'}), /rows|array|export/i);
  const parsed = module.parseStudioExport('Video title,Views,Average percentage viewed (%)\nEmpty,0,0\nUnknown,N/A,—\nTotal,100,30');
  assert.equal(parsed.episodes.length, 2, 'summary row must not be treated as an episode');
  assert.equal(parsed.episodes[0].views, 0);
  assert.equal(parsed.episodes[1].views, undefined);
  assert.ok(parsed.warnings.length);
});

test('small and unknown samples are insufficient and never produce content prescriptions', () => {
  assert.equal(typeof module.buildEngagementReport, 'function');
  const report = module.buildEngagementReport({analytics: {episodes: [{id: 'boat', title: 'The Boat', views: 12, ctrPercent: 1}], retention: [
    {videoId: 'boat', elapsedSec: 0, retentionPercent: 100}, {videoId: 'boat', elapsedSec: 7, retentionPercent: 30},
  ], warnings: []}, script: timedScript()});
  assert.equal(report.sample.status, 'insufficient');
  assert.equal(report.recommendations.length, 0);
  assert.ok(report.observations.some(item => /70 percentage points/.test(item.message)));
  assert.match(module.engagementReportText(report), /insufficient/i);
  const unknown = module.buildEngagementReport({analytics: {episodes: [{title: 'The Boat', ctrPercent: 1}], retention: [], warnings: []}});
  assert.equal(unknown.sample.status, 'insufficient');
  assert.match(unknown.sample.reason, /unknown|not supplied/i);
});

test('retention intervals map to exact question timing and acknowledge uncertain causality', () => {
  assert.equal(typeof module.buildEngagementReport, 'function');
  const report = module.buildEngagementReport({analytics: {episodes: [{id: 'boat', title: 'The Boat', views: 300}], retention: [
    {videoId: 'boat', elapsedSec: 6, retentionPercent: 90}, {videoId: 'boat', elapsedSec: 10, retentionPercent: 65},
    {videoId: 'boat', elapsedSec: 14, retentionPercent: 64},
  ], warnings: []}, script: timedScript()});
  assert.equal(report.sample.status, 'reviewable');
  assert.deepEqual(report.timeline.scenes.map(item => [item.sceneNumber, item.startFrame, item.endFrame]), [[1, 0, 176], [2, 176, 502], [3, 502, 648]]);
  assert.equal(report.timeline.durationSec, 32.6);
  const drop = report.observations.find(item => item.kind === 'retention-drop');
  assert.equal(drop.dropPoints, 25);
  assert.deepEqual(drop.scenes.map(scene => scene.sceneNumber), [2]);
  assert.ok(report.recommendations.some(item => /scene 2/i.test(item.message)));
  assert.ok(report.limitations.some(item => /cause|causal/i.test(item)));
});

test('ratio samples use the full episode duration and missing voice durations are labeled estimates', () => {
  assert.equal(typeof module.buildEngagementReport, 'function');
  const script = timedScript();
  delete script.scenes[0].lines[0].durationSec;
  const report = module.buildEngagementReport({analytics: {episodes: [{id: 'boat', views: 200}], retention: [
    {videoId: 'boat', elapsedRatio: .5, retentionPercent: 80}, {videoId: 'boat', elapsedRatio: .75, retentionPercent: 65},
  ], warnings: []}, script});
  assert.equal(report.timeline.timing, 'estimated');
  assert.equal(report.retention[0].elapsedSec, report.timeline.durationSec / 2);
  assert.ok(report.limitations.some(item => /estimated/i.test(item)));
});

test('multiple-video exports do not silently attach unrelated retention to one script', () => {
  assert.equal(typeof module.buildEngagementReport, 'function');
  const analytics = {episodes: [{id: 'other', title: 'Other', views: 500}, {id: 'boat', title: 'The Boat', views: 200}],
    retention: [{videoId: 'other', elapsedSec: 0, retentionPercent: 90}, {videoId: 'other', elapsedSec: 7, retentionPercent: 5}], warnings: []};
  const report = module.buildEngagementReport({analytics, script: timedScript()});
  assert.equal(report.episode.id, 'boat');
  assert.deepEqual(report.retention, []);
  assert.equal(report.recommendations.length, 0);
  assert.throws(() => module.buildEngagementReport({analytics, videoId: 'missing'}), /not found/i);
});

test('HTML report escapes supplied titles and contains a local retention chart', () => {
  assert.equal(typeof module.engagementReportHtml, 'function');
  const report = module.buildEngagementReport({analytics: {episodes: [{title: '<script>alert(1)</script>', views: 100}], retention: [
    {elapsedSec: 0, retentionPercent: 100}, {elapsedSec: 10, retentionPercent: 80},
  ], warnings: []}});
  const html = module.engagementReportHtml(report);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /<svg/);
  assert.doesNotMatch(html, /https?:\/\/|<script\b|<iframe\b/);
});

test('the local CLI writes a report without changing its script or analytics input', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dreamy-report-'));
  t.after(() => fs.rmSync(dir, {recursive: true, force: true}));
  const input = path.join(dir, 'studio.csv');
  const scriptPath = path.join(dir, 'script.json');
  const output = path.join(dir, 'report.json');
  const source = 'Video ID,Video title,Views\nboat,The Boat,300\n';
  const scriptSource = JSON.stringify(timedScript());
  fs.writeFileSync(input, source);
  fs.writeFileSync(scriptPath, scriptSource);
  const run = spawnSync(process.execPath, ['scripts/report-analytics.mjs', '--input', input, '--script', scriptPath, '--out', output, '--format', 'json'], {encoding: 'utf8'});
  assert.ifError(run.error);
  assert.equal(run.status, 0, run.stderr);
  assert.equal(JSON.parse(fs.readFileSync(output)).episode.id, 'boat');
  assert.equal(fs.readFileSync(input, 'utf8'), source);
  assert.equal(fs.readFileSync(scriptPath, 'utf8'), scriptSource);
});

test('the CLI joins separate local overview and retention exports without network access', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dreamy-retention-'));
  t.after(() => fs.rmSync(dir, {recursive: true, force: true}));
  const input = path.join(dir, 'overview.csv'), retention = path.join(dir, 'retention.csv'), output = path.join(dir, 'report.json');
  fs.writeFileSync(input, 'Video ID,Views,Video duration\nboat,300,0:30\n');
  fs.writeFileSync(retention, 'Elapsed video time (seconds),Audience retention (%)\n0,100\n10,75\n');
  const run = spawnSync(process.execPath, ['scripts/report-analytics.mjs', '--input', input, '--retention', retention, '--out', output], {encoding: 'utf8'});
  assert.ifError(run.error);
  assert.equal(run.status, 0, run.stderr);
  const report = JSON.parse(fs.readFileSync(output));
  assert.equal(report.retention.length, 2);
  assert.equal(report.observations[0].dropPoints, 25);
});

test('duplicate timestamps are merged honestly and out-of-range timings are excluded', () => {
  const report = module.buildEngagementReport({analytics: {episodes: [{id: 'boat', views: 300, durationSec: 30}], retention: [
    {elapsedSec: 0, retentionPercent: 100}, {elapsedSec: 10, retentionPercent: 80},
    {elapsedSec: 10, retentionPercent: 20}, {elapsedSec: 35, retentionPercent: 0},
  ], warnings: []}});
  assert.equal(report.retention.length, 1, 'conflicting samples are excluded, not averaged into invented data');
  assert.equal(report.observations.length, 0);
  assert.ok(report.warnings.some(text => /conflict|duplicate/i.test(text)));
  assert.ok(report.warnings.some(text => /outside|duration/i.test(text)));
});

test('missing video IDs do not match a script accidentally when titles identify another episode', () => {
  const report = module.buildEngagementReport({analytics: {episodes: [{title: 'Other', views: 1000}, {title: 'The Boat', views: 300}],
    retention: [], warnings: []}, script: timedScript()});
  assert.equal(report.episode.title, 'The Boat');
});

test('exported video duration takes precedence and mismatched local timing never yields precise scene claims', () => {
  const report = module.buildEngagementReport({analytics: {episodes: [{id: 'boat', views: 300, durationSec: 60}], retention: [
    {videoId: 'boat', elapsedRatio: .2, retentionPercent: 90}, {videoId: 'boat', elapsedRatio: .5, retentionPercent: 65},
  ], warnings: []}, script: timedScript()});
  assert.equal(report.retention[0].elapsedSec, 12);
  assert.equal(report.retention[1].elapsedSec, 30);
  assert.deepEqual(report.observations[0].scenes, []);
  assert.ok(report.limitations.some(text => /duration.*differ|mismatch/i.test(text)));
});
