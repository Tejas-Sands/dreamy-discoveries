import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url);
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);
const acting=require('../src/lib/acting.ts');
const cast=[['taffy','bunny'],['ben','bear'],['daisy','duck'],['fiona','fox'],['tilly','turtle'],['ozzy','owl']];
const scene={character:'taffy',secondCharacter:'ben',emotion:'neutral',lines:[]};
const line=(text='Thank you for helping me!',speaker='character',emotion='happy')=>({from:0,pre:0,duration:69,line:{text,speaker,emotion,durationSec:2,words:[{text:'Thank',start:0,end:.4},{text:'you',start:.4,end:.8}]}});
const slot={from:0,duration:180,lines:[line()],holdFrom:69,revealFrom:129,praiseFrom:159};

test('v4 listeners have distinct cast delays, gratitude responses and stable aliases',()=>{
  assert.equal(typeof acting.preparePerformance,'function');
  const starts=[];
  for(const [alias,kind] of cast) {
    const s={...scene,secondCharacter:kind},prepared=acting.preparePerformance(s,slot,'friend',30,4);
    const start=Array.from({length:12},(_,i)=>i).find(f=>acting.samplePerformance(prepared,f).emotion!=='neutral');
    assert.ok(start>=Math.round(.12*30)&&start<=Math.round(.32*30));starts.push(start);
    const result=acting.samplePerformance(prepared,30);
    assert.ok(['love','happy'].includes(result.emotion));assert.equal(result.listening,true);
    assert.deepEqual(result,acting.actorPerformance({...s,secondCharacter:alias},slot,'friend',30,30,4));
  }
  assert.equal(new Set(starts).size,6);
});

test('legacy behavior, questions, narrator reactions and shuffled sampling remain stable',()=>{
  assert.equal(typeof acting.preparePerformance,'function');
  const legacy=acting.actorPerformance(scene,slot,'friend',30,30);
  assert.equal(legacy.emotion,'happy');
  assert.deepEqual(legacy,acting.actorPerformance(scene,slot,'friend',30,30,3));
  const question={...scene,question:{answer:{text:'Help'}}};
  assert.equal(acting.actorPerformance(question,slot,'friend',90,30,4).emotion,'thinking');
  assert.equal(acting.actorPerformance(question,slot,'friend',90,30,4).emphasis,0);
  const narration={...slot,lines:[line('It is okay. I can help!','narrator','worried')]};
  const prepared=acting.preparePerformance(scene,narration,'friend',30,4);
  assert.equal(acting.samplePerformance(prepared,30).emotion,'happy');
  assert.equal(acting.samplePerformance(prepared,30).listening,true);
  const times=[0,4,8,30,70],expected=times.map(f=>acting.samplePerformance(prepared,f));
  for(const f of [70,8,0,30,4])assert.deepEqual(acting.samplePerformance(prepared,f),expected[times.indexOf(f)]);
  assert.ok(expected.every(p=>p.emphasis>=0&&p.emphasis<=.35));
});
