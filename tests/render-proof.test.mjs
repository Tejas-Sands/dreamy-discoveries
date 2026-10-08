import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {renderIdentity,writeRenderProof,verifyRenderProof} from '../scripts/lib/render-proof.mjs';

test('render proof rejects stale scripts, sources, ranges and same-length media replacements',t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'render-proof-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const file=path.join(dir,'chunk-0.mp4'),script={slug:'test',scenes:[]};fs.writeFileSync(file,'original');
  const identity=renderIdentity(script,dir);
  assert.throws(()=>verifyRenderProof(file,identity,[0,29]),/Missing/);
  writeRenderProof(file,identity,[0,29]);verifyRenderProof(file,identity,[0,29]);
  assert.throws(()=>verifyRenderProof(file,renderIdentity({...script,slug:'other'},dir),[0,29]),/Stale/);
  assert.throws(()=>verifyRenderProof(file,identity,[30,59]),/Stale/);
  fs.writeFileSync(path.join(dir,'remotion.config.ts'),'changed');
  assert.throws(()=>verifyRenderProof(file,renderIdentity(script,dir),[0,29]),/Stale/);
  fs.writeFileSync(file,'replaced');assert.throws(()=>verifyRenderProof(file,identity,[0,29]),/Stale/);
});
