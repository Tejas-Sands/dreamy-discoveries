import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const envelopeModule = new URL('../scripts/lib/speech-envelope.mjs',import.meta.url);
const {speechEnvelope} = fs.existsSync(envelopeModule) ? await import(envelopeModule.href) : {};
const source=fs.readFileSync(new URL('../src/lib/speech.ts',import.meta.url),'utf8');
const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const {mouthAt}=await import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);

test('compact PCM envelopes retain silence and amplitude changes without another audio model', () => {
  assert.equal(typeof speechEnvelope,'function');
  const samples=Float32Array.from({length:1000},(_,i)=>i<250 || i>=750 ? 0 : (i<500 ? .2 : .8) * Math.sin(i));
  const envelope=speechEnvelope(samples,1000);
  assert.equal(envelope.fps,20);
  assert.equal(envelope.values.length,20);
  assert.equal(envelope.values[0],0);
  assert.equal(envelope.values.at(-1),0);
  assert.ok(envelope.values[12]>envelope.values[6]);
  assert.ok(envelope.values.every(v=>v>=0 && v<=1));
  assert.deepEqual(speechEnvelope(new Float32Array(1000),1000).values,Array(20).fill(0));
});

test('mouths sample measured envelopes, close in silence and interpolate independently of frame order', () => {
  const line={durationSec:1,envelope:{fps:20,values:[0,0,1,1,0]},words:[{text:'Hi!',start:0,end:1}]};
  assert.equal(mouthAt(line,0),0);
  assert.equal(mouthAt(line,.1),1);
  assert.ok(mouthAt(line,.075)>0 && mouthAt(line,.075)<1);
  assert.equal(mouthAt(line,.2),0);
  assert.equal(mouthAt(line,-1),0);
  assert.equal(mouthAt(line,1.1),0);
  const frames=[0,.05,.075,.1,.2],expected=frames.map(t=>mouthAt(line,t));
  for(const t of [.2,.1,0,.075,.05]) assert.equal(mouthAt(line,t),expected[frames.indexOf(t)]);
  assert.ok(mouthAt({durationSec:1,words:line.words},.075)>0,'legacy audio retains its word-timed fallback');
});
