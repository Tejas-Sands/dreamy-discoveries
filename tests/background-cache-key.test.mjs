import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {ROOT,GENERATED_DIR} from '../scripts/lib/common.mjs';

test('background cache identity distinguishes complete sets, ignores order and does not bake',t=>{
  const slug=`dev-cache-key-${process.pid}`,dir=path.join(GENERATED_DIR,slug);
  fs.mkdirSync(dir,{recursive:true});t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const key=names=>{
    fs.writeFileSync(path.join(dir,'script.json'),JSON.stringify({scenes:names.map(background=>({background}))}));
    const result=spawnSync(process.execPath,['scripts/bake-backgrounds.mjs','--slug',slug,'--cache-key'],{cwd:ROOT,encoding:'utf8'});
    assert.equal(result.status,0,result.stderr);assert.match(result.stdout.trim(),/^[a-f0-9]{12}$/);return result.stdout.trim();
  };
  assert.equal(key(['meadow','pond']),key(['pond','meadow','pond']));
  assert.notEqual(key(['meadow']),key(['pond','meadow']));
});
