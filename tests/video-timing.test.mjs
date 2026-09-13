import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { estimateFrames, chunkRanges } from '../scripts/lib/estimate.mjs';

const source = fs.readFileSync(new URL('../src/lib/timing.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
const { computeSchedule, musicVolume } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

test('logo signature follows the complete spoken goodbye and owns the final six seconds', () => {
  const script = { scenes: [], outro: { durationSec: 9 } };
  const schedule = computeSchedule(script);
  assert.equal(schedule.brandFrom, schedule.endFrom + schedule.endDuration);
  assert.equal(schedule.total - schedule.brandFrom, 180);
  assert.ok(schedule.voice.at(-1)[1] < schedule.brandFrom);
  assert.equal(musicVolume(schedule.brandFrom, schedule), 0);
  assert.equal(musicVolume(schedule.total - 1, schedule), 0);
  assert.ok(musicVolume(schedule.brandFrom - 60, schedule) > 0);
});

test('planner and compositor agree for all permanent scripts, with contiguous chunks including the signature', () => {
  for (const file of fs.readdirSync(new URL('../library/scripts/', import.meta.url)).filter(f => f.endsWith('.json'))) {
    const script = JSON.parse(fs.readFileSync(new URL(`../library/scripts/${file}`, import.meta.url)));
    const schedule = computeSchedule(script);
    assert.equal(estimateFrames(script), schedule.total, file);
    const chunks = chunkRanges(schedule.total, 4).map(r => r.split('-').map(Number));
    assert.equal(chunks[0][0], 0);
    assert.equal(chunks.at(-1)[1], schedule.total - 1);
    for (let i = 1; i < chunks.length; i++) assert.equal(chunks[i][0], chunks[i - 1][1] + 1);
  }
});
