import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {reviewScript,selectReviewFrames,writeReview} from '../scripts/review-quality.mjs';
import {benchmarkSettings} from '../scripts/benchmark-render.mjs';
import {animationPreview} from '../scripts/preview-animation.mjs';

test('review copies cached scenes exclusively and leaves the source immutable',()=>{
  const source=animationPreview();
  for(const scene of source.scenes)for(const line of scene.lines)line.audio='cached.wav';
  source.outro.audio='cached.wav';
  const before=JSON.stringify(source),script=reviewScript(source,'dev-quality-test',4);
  assert.equal(JSON.stringify(source),before);
  assert.equal(script.presentationVersion,4);
  const picks=selectReviewFrames(script);
  for(const kind of ['dialogue','handover','walking','question','celebration','captions'])assert.ok(picks.some(p=>p.kind===kind),kind);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'quality-review-'));
  try {
    const sourceDir=path.join(dir,'source');fs.mkdirSync(sourceDir);fs.writeFileSync(path.join(sourceDir,'cached.wav'),'fixture');
    const file=writeReview(source,sourceDir,'dev-quality-test',4,dir);
    assert.ok(fs.existsSync(file));
    assert.throws(()=>writeReview(source,sourceDir,'dev-quality-test',4,dir),/exists/i);
    assert.throws(()=>writeReview(source,sourceDir,'production',4,dir),/dev-/);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('benchmark validates matrix settings and uses the production image format',()=>{
  assert.deepEqual(benchmarkSettings({concurrencies:'1,2,4'}).concurrencies,[1,2,4]);
  assert.equal(benchmarkSettings({}).imageFormat,'jpeg');
  for(const args of [{concurrencies:'0,2'},{concurrencies:'2,NaN'},{scale:2},{runs:0},{frames:'90-10'}])assert.throws(()=>benchmarkSettings(args));
});
