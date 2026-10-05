import test from 'node:test';
import assert from 'node:assert/strict';
import {stageStory, prepareStage, sampleStage,stageMotion} from '../scripts/lib/staging.mjs';
import {stagingPreview} from '../scripts/preview-staging.mjs';
import {directScript} from '../scripts/lib/director.mjs';
import {sceneTransition} from '../src/lib/sceneDirection.mjs';

const scene = (text, extra = {}) => ({background:'meadow',character:'bunny',secondCharacter:'bear',kind:'story',prop:'apple',lines:[{text,speaker:'character',durationSec:3}],...extra});
const slot = {duration:110,lines:[{from:8,duration:90,line:{durationSec:3}}]};
test('handover changes ownership once and persists through role changes and cuts', () => {
  const script={presentationVersion:2,scenes:[scene('I give Ben the apple.'),scene('Thank you!',{character:'bear',secondCharacter:'bunny',prop:null}),scene('We walk to the pond.',{background:'pond',prop:null,character:'bear',secondCharacter:'bunny'})]};
  stageStory(script);
  const first=script.scenes[0].staging;
  assert.equal(first.events[0].kind,'give');
  assert.equal(script.scenes[1].staging.props[0].owner,'bear');
  assert.equal(script.scenes[2].staging.props[0].owner,'bear');
  const prepared=prepareStage(script.scenes[0],slot,30);
  const before=sampleStage(prepared,0), after=sampleStage(prepared,109);
  assert.equal(before.props[0].owner,'bunny');
  assert.equal(after.props[0].owner,'bear');
  assert.ok(Math.abs(after.actors.character.x-after.actors.friend.x)<260);
  const cut=prepareStage(script.scenes[1],slot,30);
  assert.equal(sampleStage(cut,0).props[0].owner,'bear');
  const original=JSON.stringify(script);stageStory(script);assert.equal(JSON.stringify(script),original);
});
test('questions and negatives cannot trigger a transfer; authored staging wins; legacy stays unchanged', () => {
  for(const text of ['Should I give Ben the apple?','I do not give Ben the apple.','If I give Ben the apple, will he smile?','I tried to give Ben the apple but missed.','I give Ben the apple, but Ben refuses it.']) {
    const script={presentationVersion:2,scenes:[scene(text)]};stageStory(script);
    assert.equal(script.scenes[0].staging.events.length,0,text);
  }
  const authored={actors:{character:{x:730,y:870}},props:[],events:[],shot:'quiet'};
  const script={presentationVersion:2,scenes:[scene('I give Ben the apple.',{staging:authored})]};stageStory(script);
  assert.deepEqual(script.scenes[0].staging,authored);
  const old={presentationVersion:1,scenes:[scene('I give Ben the apple.')]};stageStory(old);assert.equal(old.scenes[0].staging,undefined);
});
test('pickup/drop are continuous, frame-derived and visible only in their location', () => {
  const script={presentationVersion:2,scenes:[scene('I pick up the apple.'),scene('I drop the apple.'),scene('A new place.',{background:'pond',prop:null})]};stageStory(script);
  assert.equal(script.scenes[0].staging.props[0].owner,null);
  const prepared=prepareStage(script.scenes[0],slot,30);
  let last=sampleStage(prepared,0).props[0];
  for(let f=1;f<110;f++){const next=sampleStage(prepared,f).props[0];assert.ok(Math.hypot(next.x-last.x,next.y-last.y)<30);last=next;}
  assert.equal(last.owner,'bunny');
  assert.equal(sampleStage(prepareStage(script.scenes[2],slot,30),0).props.length,0);
  assert.deepEqual(sampleStage(prepared,55),sampleStage(prepared,55));
});
test('travel phases follow distance and remain at the destination after stopping', () => {
  const s=scene('We walk.',{staging:{actors:{character:{x:620,y:870,moves:[{line:0,durationSec:1,to:{x:850,y:870}}]},friend:{x:1360,y:870}},props:[],events:[],shot:'dialogue'}});
  const p=prepareStage(s,slot,30);const start=sampleStage(p,8),middle=sampleStage(p,23),end=sampleStage(p,90);
  assert.ok(middle.actors.character.x>start.actors.character.x);assert.ok(middle.actors.character.walkT>0);
  assert.equal(end.actors.character.x,850);assert.equal(end.actors.character.moving,false);
  assert.deepEqual(sampleStage(p,23),middle);assert.equal(sampleStage(p,100).actors.character.x,850);
  const fallback={action:'walk',t:2,blend:1};
  assert.equal(stageMotion(middle.actors.character,fallback).action,'walk');
  assert.equal(stageMotion(end.actors.character,fallback).action,'idle');
});
test('pickup then give can happen in one scene, without transferring an unrelated idea',()=>{
  const s=scene('',{lines:[{text:'I pick up the apple.',speaker:'character'},{text:'I give Ben the apple.',speaker:'character'}]});
  const script={presentationVersion:2,scenes:[s,scene('Thank you!',{prop:null})]};stageStory(script);
  assert.deepEqual(s.staging.events.map(e=>e.kind),['pick-up','give']);assert.equal(script.scenes[1].staging.props[0].owner,'bear');
  const unrelated={presentationVersion:2,scenes:[scene('I share a happy smile.')]};stageStory(unrelated);assert.equal(unrelated.scenes[0].staging.events.length,0);
});
test('a carried object cannot jump when a walking actor turns toward a friend',()=>{
  const s=scene('We walk.',{character:'bear',secondCharacter:'bunny',staging:{actors:{character:{x:1060,y:870,moves:[{line:0,durationSec:1,to:{x:1200,y:870}}]},friend:{x:850,y:870}},props:[{id:'apple',kind:'apple',owner:'bear',x:960,y:826}],events:[],shot:'dialogue'}});
  const p=prepareStage(s,slot,30);let previous=sampleStage(p,0).props[0];
  for(let f=1;f<110;f++){const next=sampleStage(p,f).props[0];assert.ok(Math.hypot(next.x-previous.x,next.y-previous.y)<20);previous=next;}
});
test('version2 Director enriches staging idempotently and gives location transitions a purpose',()=>{
  const script=stagingPreview();assert.equal(script.opening,'hook');assert.equal(script.intro,null);
  assert.equal(new Set(Object.values(script.synthesis.castVoices)).size,6);
  assert.deepEqual(directScript(script),script);
  assert.equal(sceneTransition(scene('Hello',{background:'pond'}),scene('Hello'),{presentationVersion:2}),'ripple');
  assert.equal(sceneTransition(scene('Hello',{background:'forest'}),scene('Hello'),{presentationVersion:2}),'leaf');
  assert.equal(sceneTransition(scene('Hello',{background:'bedroom'}),scene('Hello'),{presentationVersion:2}),'page');
  assert.equal(script.scenes.at(-1).transition,'page');
});
test('a dropped object stays on the ground while its previous owner walks away',()=>{
  const s=scene('',{lines:[{text:'I drop the apple.',speaker:'character',durationSec:2},{text:'I walk away.',speaker:'character',action:'walk',durationSec:2}],staging:{actors:{character:{x:700,y:870,moves:[{line:1,durationSec:1,to:{x:1000,y:870}}]},friend:{x:1360,y:870}},props:[{id:'apple',kind:'apple',owner:'bunny',x:790,y:826}],events:[{kind:'drop',propId:'apple',line:0,actor:'character',durationSec:.8}],shot:'prop'}});
  const p=prepareStage(s,{duration:160,lines:[{from:8,duration:60,line:{durationSec:2}},{from:80,duration:60,line:{durationSec:2}}]},30);
  const dropped=sampleStage(p,45).props[0],later=sampleStage(p,145).props[0];
  assert.equal(later.owner,null);assert.equal(later.x,dropped.x);assert.equal(later.y,dropped.y);
});
test('pickup and drop ease crouching instead of snapping the whole body at contact',()=>{
  for(const kind of ['pick-up','drop']){
    const s=scene('',{staging:{actors:{character:{x:700,y:870},friend:{x:1360,y:870}},props:[{id:'apple',kind:'apple',owner:kind==='drop'?'bunny':null,x:790,y:826}],events:[{kind,propId:'apple',line:0,actor:'character',delaySec:.4,durationSec:.8}],shot:'prop'}});
    const p=prepareStage(s,slot,30),event=p.events[0];
    const squash=f=>{const r=sampleStage(p,f).reaches.character;return r?r.crouch*r.amount:0;};
    assert.ok(Math.abs(squash(event.from)-squash(event.from-1))<.07,`${kind} onset snaps`);
    assert.ok(Math.abs(squash(event.until)-squash(event.until-1))<.07,`${kind} release snaps`);
    assert.equal(squash(event.until+15),0);
  }
});
test('the receiver keeps its paw reaching through ownership transfer',()=>{
  const script={presentationVersion:2,scenes:[scene('I give Ben the apple.')]};stageStory(script);
  const p=prepareStage(script.scenes[0],slot,30),end=p.events[0].until;
  assert.ok(sampleStage(p,end-1).reaches.friend.amount>.9);assert.equal(sampleStage(p,end).reaches.friend.amount,1);
});
