import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const url=new URL('../src/lib/captions.ts',import.meta.url);
const code=fs.existsSync(url)?ts.transpileModule(fs.readFileSync(url,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText:'export {};';
const {captionPages,captionPageAt}=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const measure=text=>Array.from(text).length*30;
const timed=text=>text.split(' ').map((text,i)=>({text,start:i*.4,end:(i+1)*.4}));

test('caption pages retain every word in order, with at most eight words and two measured rows',()=>{
  assert.equal(typeof captionPages,'function');
  const words=timed('Thank you for helping me, Ben! Together we can carry this basket all the way home.');
  const pages=captionPages(words,measure,{maxWidth:700});
  assert.ok(pages.length>=3);
  assert.deepEqual(pages.flatMap(p=>p.rows.flat()).map(w=>w.text),words.map(w=>w.text));
  for(const p of pages){assert.ok(p.rows.length<=2);assert.ok(p.rows.flat().length<=8);for(const row of p.rows)assert.ok(row.reduce((n,w)=>n+measure(w.text),0)+(row.length-1)*18<=700);}
  assert.ok(pages.some(p=>/[!,.]$/.test(p.rows.flat().at(-1).text)));
});

test('page selection uses original line time, holds through pauses and supports arbitrary frame order',()=>{
  assert.equal(typeof captionPages,'function');
  const pages=captionPages(timed('One two three four five six seven eight nine ten eleven twelve'),measure,{maxWidth:700});
  for(let i=0;i<pages.length;i++)assert.equal(captionPageAt(pages,pages[i].start),pages[i]);
  assert.equal(captionPageAt(pages,-1),pages[0]);assert.equal(captionPageAt(pages,999),pages.at(-1));
  const times=[0,.5,1.3,3.8,999],expected=times.map(t=>captionPageAt(pages,t));
  for(const t of [999,1.3,0,3.8,.5])assert.deepEqual(captionPageAt(pages,t),expected[times.indexOf(t)]);
});

test('oversized words wrap into measured fragments without losing characters or using a tiny font',()=>{
  assert.equal(typeof captionPages,'function');
  const text='Supercalifragilisticexpialidocious';
  const pages=captionPages([{text,start:0,end:4}],measure,{maxWidth:240});
  const fragments=pages.flatMap(p=>p.rows.flat());
  assert.equal(fragments.map(w=>w.text).join(''),text);
  assert.ok(fragments.every(w=>measure(w.text)<=240&&w.end>w.start));
  assert.ok(pages.every(p=>p.rows.length<=2));
  assert.equal(captionPages([],measure,{maxWidth:700}).length,0);
  assert.equal(captionPageAt([],0),undefined);
  const untimed=captionPages([{text:'Hello',start:0,end:0},{text:'friend',start:0,end:0}],measure,{maxWidth:700});
  assert.equal(untimed.flatMap(p=>p.rows.flat()).length,2);
});

test('untimed words advance through pages instead of starting every page at zero',()=>{
  const pages=captionPages('one two three four five six seven eight nine ten eleven twelve'.split(' ').map(text=>({text,start:0,end:0})),measure,{maxWidth:300});
  assert.equal(captionPageAt(pages,0),pages[0]);
  assert.ok(pages.every((page,i)=>i===0||page.start>pages[i-1].start));
});
