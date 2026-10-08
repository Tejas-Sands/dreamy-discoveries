import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {ROOT,GENERATED_DIR} from '../scripts/lib/common.mjs';

test('failed full renders preserve an existing custom output for legacy and v4 scripts',t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'render-failure-'));
  const slug=`dev-render-check-${process.pid}`,generated=path.join(GENERATED_DIR,slug);
  fs.mkdirSync(generated,{recursive:true});
  t.after(()=>{fs.rmSync(dir,{recursive:true,force:true});fs.rmSync(generated,{recursive:true,force:true});});
  fs.writeFileSync(path.join(dir,'npx'),`#!/usr/bin/env node\nrequire('fs').writeFileSync(process.argv[5], 'broken render');\n`,{mode:0o755});
  const out=path.join(dir,'existing.mp4');
  for(const presentationVersion of [3,4]) {
    fs.writeFileSync(path.join(generated,'script.json'),JSON.stringify({slug,presentationVersion,scenes:[]}));
    fs.writeFileSync(out,'existing verified video');
    const result=spawnSync(process.execPath,['scripts/render.mjs','--slug',slug,'--out',out,'--scale','0.5'],{cwd:ROOT,encoding:'utf8',env:{...process.env,PATH:`${dir}:${process.env.PATH}`}});
    assert.notEqual(result.status,0,'invalid media must fail the full render');
    assert.equal(fs.readFileSync(out,'utf8'),'existing verified video');
    assert.equal(fs.readdirSync(dir).filter(f=>/rendering|finishing|master-/.test(f)).length,0);
  }
});
