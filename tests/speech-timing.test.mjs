import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const url=new URL('../scripts/lib/speech-timing.mjs',import.meta.url);
const timing=fs.existsSync(url)?await import(url.href):{};
const words=[{text:'Hello,',start:.12,end:.5},{text:'friend!',start:.5,end:.9}];

test('word estimates snap to nearby measured silence, retain all text and never mutate inputs',()=>{
  assert.equal(typeof timing.refineWords,'function');
  const envelope={fps:20,values:[0,0,...Array(6).fill(.8),0,0,0,0,...Array(6).fill(.8),0,0]};
  const original=structuredClone(words),result=timing.refineWords(words,1,envelope);
  assert.deepEqual(words,original);
  assert.deepEqual(result.map(w=>w.text),words.map(w=>w.text));
  assert.equal(result[0].start,.1);assert.equal(result[0].end,.4);
  assert.equal(result[1].start,.6);assert.equal(result[1].end,.9);
  assert.deepEqual(timing.refineWords(words,1,{fps:20,values:Array(20).fill(0)}),words);
  assert.deepEqual(timing.refineWords(words,1,undefined),words);
  for(const word of result)assert.ok(word.start>=0&&word.start<word.end&&word.end<=1);
});

test('distant pauses and dense speech cannot produce reversed, overlapping or unbounded intervals',()=>{
  assert.equal(typeof timing.refineWords,'function');
  const dense=Array.from({length:16},(_,i)=>({text:`word${i}`,start:i/16,end:(i+1)/16}));
  for(const values of [Array(20).fill(.5),[0,...Array(16).fill(.8),0,0,0],[.5,.5,...Array(15).fill(0),.5,.5,.5]]) {
    const result=timing.refineWords(dense,1,{fps:20,values});
    for(const [i,w] of result.entries()) {
      assert.ok(w.start>=0&&w.end>w.start&&w.end<=1);
      if(i)assert.ok(w.start>=result[i-1].end);
      assert.ok(Math.abs(w.start-dense[i].start)<=.18001&&Math.abs(w.end-dense[i].end)<=.18001);
    }
  }
  assert.throws(()=>timing.refineWords(words,NaN,{fps:20,values:[1]}),/duration/i);
});

test('malformed cached intervals fall back to ordered bounded estimates',()=>{
  for(const words of [[{text:'one',start:-.2,end:2}],[{text:'one',start:0,end:.7},{text:'two',start:.2,end:.9}],[{text:'one',start:0}]]) {
    const output=timing.refineWords(words,1,{fps:20,values:Array(20).fill(.6)});
    assert.deepEqual(output.map(w=>w.text),words.map(w=>w.text));
    output.forEach((w,i)=>assert.ok(w.start>=0&&w.end>w.start&&w.end<=1&&(!i||w.start>=output[i-1].end)));
  }
});

function wav(format=1) {
  const bytes=format===1?2:4,data=Buffer.alloc(1000*bytes),header=Buffer.alloc(44);
  header.write('RIFF');header.writeUInt32LE(36+data.length,4);header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);
  header.writeUInt16LE(format,20);header.writeUInt16LE(1,22);header.writeUInt32LE(1000,24);header.writeUInt32LE(1000*bytes,28);header.writeUInt16LE(bytes,32);header.writeUInt16LE(bytes*8,34);header.write('data',36);header.writeUInt32LE(data.length,40);
  for(let i=100;i<900;i++)if(i<400||i>=600){const value=.5*Math.sin(i);format===1?data.writeInt16LE(Math.round(value*32767),i*bytes):data.writeFloatLE(value,i*bytes);}
  return Buffer.concat([header,data]);
}

test('PCM16 and float32 voice analysis uses additive sidecars and leaves all recordings/metadata untouched',t=>{
  assert.equal(typeof timing.timingForVoice,'function');
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dreamy-word-timing-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  for(const format of [1,3]) {
    const audio=path.join(dir,`${format}.wav`),meta=path.join(dir,`${format}.json`);
    fs.writeFileSync(audio,wav(format));fs.writeFileSync(meta,JSON.stringify({words,durationSec:1}));
    const bytes=fs.readFileSync(audio),metadata=fs.readFileSync(meta);
    let created=0;
    const first=timing.timingForVoice({audio,meta,text:'Hello, friend!',onCreate:()=>created++});
    assert.equal(first.words[0].end,.4);assert.equal(first.words[1].start,.6);
    assert.ok(first.envelope.values.some(v=>v>0));
    const before=fs.readdirSync(dir).sort();
    assert.deepEqual(timing.timingForVoice({audio,meta,text:'Hello, friend!',onCreate:()=>created++}),first);
    assert.equal(created,1);
    assert.deepEqual(fs.readdirSync(dir).sort(),before);
    assert.deepEqual(fs.readFileSync(audio),bytes);assert.deepEqual(fs.readFileSync(meta),metadata);
    assert.ok(before.some(f=>f.startsWith(`${format}.json.timing-v1-`)));
  }
});
