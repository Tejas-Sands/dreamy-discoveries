import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const file = new URL('../src/lib/sceneMotion.ts', import.meta.url);
const source = fs.readFileSync(file, 'utf8');
const {outputText} = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});
const actionSource = fs.readFileSync(new URL('../src/lib/actionMotion.ts',import.meta.url),'utf8');
const actionOutput = ts.transpileModule(actionSource,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const actionUrl = `data:text/javascript;base64,${Buffer.from(actionOutput).toString('base64')}`;
const linkedOutput = outputText.replace("'./actionMotion'",JSON.stringify(actionUrl));
const {actionTrack, sampleAction, gagFrame, contactSounds} = await import(`data:text/javascript;base64,${Buffer.from(linkedOutput).toString('base64')}`);
const line = (from, action, speaker='character') => ({from,pre:0,duration:69,line:{text:'Move together',durationSec:2,action,speaker}});
const slot = {from:102,duration:240,lines:[line(0,'wave'),line(69,'wave'),line(138,'point')],holdFrom:207,holdDuration:0,revealFrom:-1,praiseFrom:-1};
const scene = {character:'bunny',energy:'calm',lines:slot.lines.map(l=>l.line)};

test('identical gestures continue across speech boundaries and new gestures blend from the outgoing pose',()=>{
  const track=actionTrack(scene,slot,'character',30);
  const before=sampleAction(track,68,30),after=sampleAction(track,70,30);
  assert.equal(after.action,'wave');
  assert.ok(Math.abs(after.t-before.t-2/30)<1e-10);
  const changed=sampleAction(track,138,30);
  assert.equal(changed.action,'point');
  assert.equal(changed.blend,0);
  assert.equal(changed.previousAction.action,'wave');
  assert.equal(changed.previousAction.t,138/30);
});

test('question thinking and reveal interrupt gestures for both actors',()=>{
  const s={...scene,question:{answer:{text:'Yes'}}};
  const q={...slot,holdFrom:150,holdDuration:60,revealFrom:210,praiseFrom:261,duration:300};
  for(const actor of ['character','friend']) {
    const track=actionTrack(s,q,actor,30);
    assert.equal(sampleAction(track,180,30).action,'think');
    assert.equal(sampleAction(track,211,30).action,'idle');
    assert.equal(sampleAction(track,230,30).action,'cheer');
  }
});

test('sampling frames out of order produces the same poses at chunk boundaries',()=>{
  const track=actionTrack(scene,slot,'character',30);
  const expected=[137,138,139,144].map(f=>sampleAction(track,f,30));
  for(const f of [144,139,138,137]) assert.deepEqual(sampleAction(track,f,30),expected[[137,138,139,144].indexOf(f)]);
  assert.ok(sampleAction(track,-8,30).t>=0);
});

test('automatic gags need an actual silent window; explicit gag timing is retained',()=>{
  assert.equal(gagFrame({kind:'peek',auto:true,atSec:1.6},slot,30),null);
  assert.equal(gagFrame({kind:'peek',atSec:1.6},slot,30),48);
  const gap={...slot,lines:[line(0,'wave')],duration:210};
  assert.ok(gagFrame({kind:'peek',auto:true,atSec:1.6},gap,30)>=69);
});

test('contact sounds include a delayed landing and respect explicit silent actions',()=>{
  assert.equal(typeof contactSounds,'function');
  const q={...slot,lines:[line(0,'jump'),line(8,'point')],duration:90};
  const track=actionTrack(scene,q,'character',30);
  const sounds=contactSounds(track,q,'character',30);
  assert.ok(sounds.some(e=>e.name==='boing' && e.at===16));
  q.lines[0].line.sfx=[];
  assert.equal(contactSounds(track,q,'character',30).length,0);
});

test('airborne jump finishes its landing before the next ordinary gesture begins',()=>{
  const jumpSlot={...slot,lines:[line(0,'jump'),line(8,'point')]};
  const track=actionTrack(scene,jumpSlot,'character',30);
  assert.equal(sampleAction(track,8,30).action,'jump');
  assert.equal(sampleAction(track,15,30).action,'jump');
  // First landing is at .5104 seconds: frame 16 is the first frame on the ground.
  const changed=sampleAction(track,16,30);
  assert.equal(changed.action,'point');
  assert.equal(changed.blend,0);
  assert.equal(changed.previousAction.action,'jump');
  assert.equal(changed.previousAction.t,16/30);
  assert.ok(sampleAction(track,19,30).blend>0);
  assert.equal(jumpSlot.lines[1].from,8,'speech timing must stay fixed');
});

test('a newer gesture supersedes a delayed cue rather than being overtaken by it',()=>{
  const jumpSlot={...slot,lines:[line(0,'jump'),line(8,'point'),line(12,'wave')]};
  const track=actionTrack(scene,jumpSlot,'character',30);
  assert.deepEqual(track,[{from:0,action:'jump'},{from:16,action:'wave'}]);
  assert.equal(sampleAction(track,16,30).action,'wave');
});

test('grounded jumps hand off immediately and questions interrupt at their exact frame',()=>{
  const grounded={...slot,lines:[line(0,'jump'),line(17,'point')]};
  assert.equal(sampleAction(actionTrack(scene,grounded,'character',30),17,30).action,'point');
  const question={...scene,question:{answer:{text:'Yes'}}};
  const q={...slot,lines:[line(0,'jump'),line(8,'point')],holdFrom:12,holdDuration:60,revealFrom:72,praiseFrom:123};
  const track=actionTrack(question,q,'character',30);
  assert.equal(sampleAction(track,11,30).action,'jump');
  assert.equal(sampleAction(track,12,30).action,'think');
  assert.equal(sampleAction(track,16,30).action,'think');
});

test('quiet direction prevents upbeat hold defaults from replacing deliberate sleep',()=>{
  const sleepy={...slot,lines:[line(0,'sleep')],holdFrom:69,holdDuration:45};
  for(const direction of ['thinking','tender','lullaby']) {
    const quiet={...scene,direction,energy:'upbeat'};
    assert.equal(sampleAction(actionTrack(quiet,sleepy,'character',30),75,30).action,'sleep');
  }
});
