import test from 'node:test';
import assert from 'node:assert/strict';
import {stageStory,prepareStage,sampleStage} from '../scripts/lib/staging.mjs';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

const require=createRequire(import.meta.url);
for(const extension of ['.ts','.tsx'])require.extensions[extension]=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText,file);
const {StageProps}=require('../src/components/StageProps.tsx');
const {propMotion}=require('../src/lib/propMotion.ts');

const scene=(text,prop='ball',extra={})=>({background:'meadow',character:'bunny',secondCharacter:'bear',prop,lines:[{text,speaker:'character',durationSec:3}],...extra});
const slot=(count=1)=>({duration:count*100,lines:Array.from({length:count},(_,i)=>({from:i*100+8,duration:90,line:{durationSec:3}}))});
const authored=(kind,prop='ball',options={})=>scene('',prop,{staging:{actors:{character:{x:700,y:870},friend:{x:1200,y:870}},props:[{id:prop,kind:prop,owner:null,x:790,y:826,openProgress:0,buildProgress:0}],events:[{kind,propId:prop,line:0,actor:'character',durationSec:1,...options}],shot:'prop'}});

// Missing action inference would leave the prop static and omit the interaction.
for(const [kind,text,prop] of [['push','I push the ball.','ball'],['roll','I roll the ball.','ball'],['catch','Ben catches the ball.','ball'],['open','I open the book.','book'],['water','I water the flower.','flower'],['build','I build the castle.','castle']])test(`version 3 infers completed ${kind} and leaves older episodes alone`,()=>{
  const s=scene(text,prop,{lines:[{text,speaker:kind==='catch'?'narrator':'character'}]});
  const script={presentationVersion:3,scenes:[s]};stageStory(script);assert.equal(s.staging.events[0]?.kind,kind);
  const old={presentationVersion:2,scenes:[scene(text,prop)]};stageStory(old);assert.equal(old.scenes[0].staging.events.length,0);
  const before=JSON.stringify(script);stageStory(script);assert.equal(JSON.stringify(script),before);
});

// Losing the action's frozen endpoint would drag the ball along with its previous owner.
for(const kind of ['push','roll'])test(`${kind} stops on the ground and roll rotation follows travel`,()=>{
  const s=authored(kind,'ball',{endpoint:{x:1050,y:826}});
  s.staging.props[0].owner='bunny';s.staging.actors.character.moves=[{line:1,durationSec:1,to:{x:1300,y:870}}];
  const p=prepareStage(s,slot(2)),e=p.events[0];
  const mid=sampleStage(p,(e.from+e.until)/2).props[0],end=sampleStage(p,e.until).props[0],later=sampleStage(p,190).props[0];
  assert.ok(mid.x>790&&mid.x<1050);assert.equal(end.owner,null);assert.equal(end.x,1050);assert.equal(end.y,826);assert.equal(later.x,1050);assert.equal(later.y,826);
  if(kind==='roll'){assert.ok(mid.rotation>0);assert.ok(end.rotation>mid.rotation);assert.equal(later.rotation,end.rotation);assert.ok(Math.abs(end.rotation-260/53.3*180/Math.PI)<.01);}
});

// An instantaneous ownership swap would hide the visible catching arc.
test('catch travels into the receiving paw then follows its persistent owner',()=>{
  const s=authored('catch');s.staging.events[0].actor='friend';s.staging.actors.friend.moves=[{line:1,durationSec:1,to:{x:1400,y:870}}];
  const p=prepareStage(s,slot(2)),e=p.events[0],start=sampleStage(p,e.from).props[0],mid=sampleStage(p,(e.from+e.until)/2).props[0],end=sampleStage(p,e.until),later=sampleStage(p,190);
  assert.equal(start.x,790);assert.ok(mid.x>790&&mid.x<1110);assert.ok(mid.y<826);assert.equal(end.props[0].owner,'bear');assert.equal(end.props[0].x,1110);assert.equal(later.props[0].x,1310);assert.equal(end.reaches.friend.amount,1);
});

test('open, water and repeated builds accumulate visible bounded state',()=>{
  const opened=prepareStage(authored('open','book'),slot()),oe=opened.events[0];
  assert.equal(sampleStage(opened,0).props[0].openProgress,0);assert.ok(sampleStage(opened,(oe.from+oe.until)/2).props[0].openProgress>0);assert.equal(sampleStage(opened,99).props[0].openProgress,1);
  const watered=prepareStage(authored('water','flower',{amount:.4}),slot()),we=watered.events[0];
  const wet=sampleStage(watered,(we.from+we.until)/2).props[0];assert.ok(wet.watering.flow>0);assert.equal(wet.watering.target.x,790);assert.ok(wet.waterAmount>0&&wet.waterAmount<.4);assert.equal(sampleStage(watered,99).props[0].waterAmount,.4);assert.equal(sampleStage(watered,99).props[0].watering,undefined);
  const s=authored('build','castle',{amount:.4});s.staging.events.push({kind:'build',propId:'castle',line:1,actor:'friend',amount:.4},{kind:'build',propId:'castle',line:2,actor:'character',amount:.4});
  const built=prepareStage(s,slot(3));assert.equal(sampleStage(built,99).props[0].buildProgress,.4);assert.equal(sampleStage(built,199).props[0].buildProgress,.8);assert.equal(sampleStage(built,299).props[0].buildProgress,1);
});

test('same-scene roll then catch respects ordered world state',()=>{
  const s=scene('', 'ball',{lines:[{text:'I roll the ball.',speaker:'character'},{text:'Ben catches the ball.',speaker:'narrator'}]});
  stageStory({presentationVersion:3,scenes:[s]});assert.deepEqual(s.staging.events.map(e=>e.kind),['roll','catch']);
  const p=prepareStage(s,slot(2));const rolled=sampleStage(p,99).props[0],caught=sampleStage(p,199).props[0];assert.equal(rolled.owner,null);assert.equal(caught.owner,'bear');assert.ok(caught.rotation>0);
});

test('authored event order follows line timing across cuts and preserves the authored snapshot',()=>{
  const s=authored('roll','ball',{endpoint:{x:1050,y:826}});
  s.staging.events.unshift({kind:'catch',propId:'ball',line:1,actor:'friend'});
  const snapshot=JSON.stringify(s.staging),next=scene('Hello.',null,{character:'bear',secondCharacter:'bunny',background:'pond'});
  stageStory({presentationVersion:3,scenes:[s,next]});assert.equal(JSON.stringify(s.staging),snapshot);
  assert.equal(next.staging.props[0]?.owner,'bear');
  const final=sampleStage(prepareStage(s,slot(2)),199).props[0];assert.equal(final.owner,'bear');assert.equal(final.rotation,next.staging.props[0].rotation);
});

test('authored progress and increments stay bounded and cannot undo completed construction or watering',()=>{
  for(const [kind,prop,field] of [['water','seed','waterAmount'],['build','snowman','buildProgress']]){
    const s=authored(kind,prop,{amount:-5});s.staging.props[0][field]=.5;s.staging.props[0].location='meadow';
    const next=scene('Hello.',null);stageStory({presentationVersion:3,scenes:[s,next]});
    assert.equal(sampleStage(prepareStage(s,slot()),99).props[0][field],.5);assert.equal(next.staging.props[0][field],.5);
    s.staging.events[0].amount=99;assert.equal(sampleStage(prepareStage(s,slot()),99).props[0][field],1);
  }
  const s=authored('open','book');s.staging.props[0].openProgress=-5;assert.equal(sampleStage(prepareStage(s,slot()),0).props[0].openProgress,0);
});

test('an authored grounded prop with optional location omitted persists at its scene location',()=>{
  const s=authored('water','flower'),next=scene('Hello.',null);
  stageStory({presentationVersion:3,scenes:[s,next]});assert.equal(next.staging.props[0]?.kind,'flower');assert.equal(next.staging.props[0]?.location,'meadow');
});

test('a committed moving-object hook starts a grounded roll immediately for its present speaker',()=>{
  for(const [text,kind,speaker] of [['Oh! My ball rolled away!','ball','character'],['Oops! Our apple is rolling away!','apple','friend'],['The ball rolls away.','ball','taffy']]){
    const s=scene(text,kind,{lines:[{text,speaker}]});stageStory({presentationVersion:3,opening:'hook',scenes:[s]});
    const e=s.staging.events[0];assert.equal(e?.kind,'roll',text);assert.equal(e.delaySec,0);assert.equal(s.staging.props[0].owner,null);
    const p=prepareStage(s,{duration:90,lines:[{from:0,duration:90,line:{durationSec:3}}]});assert.equal(p.events[0].from,0);assert.ok(sampleStage(p,15).props[0].x!==sampleStage(p,0).props[0].x);
  }
});

test('moving-object opening inference rejects intentions, questions, narrator/unknown/missing speakers and later scenes',()=>{
  for(const [text,speaker,extra] of [['Oh! My ball might roll away!','character',{}],['Oh! My ball did not roll away!','character',{}],['Oh! My ball rolled away?','character',{}],['Oh! My ball almost rolled away!','character',{}],['Oh! My ball rolled away!','narrator',{}],['Oh! My ball rolled away!','sam',{}],['Oh! My ball rolled away!','friend',{secondCharacter:undefined}],['Sam rolls the ball away!','character',{}]]){
    const s=scene(text,'ball',{...extra,lines:[{text,speaker}]});stageStory({presentationVersion:3,opening:'hook',scenes:[s]});assert.equal(s.staging.events.length,0,text+' '+speaker);
  }
  for(const version of [1,2]){const s=scene('Oh! My ball rolled away!');stageStory({presentationVersion:version,opening:'hook',scenes:[s]});assert.equal(s.staging?.events.length??0,0);}
  const s=scene('Oh! My ball rolled away!');stageStory({presentationVersion:3,opening:'hook',scenes:[scene('Hello.',null),s]});assert.equal(s.staging.events.length,0);
});

test('snow friend and snow friends are concrete direct objects of a completed build',()=>{
  for(const text of ['I build a snow friend.','Ben built our snow friends.']){
    const s=scene(text,'snow friend',{lines:[{text,speaker:text.startsWith('Ben')?'narrator':'character'}]});stageStory({presentationVersion:3,scenes:[s]});assert.equal(s.staging.props[0].kind,'snowman');assert.equal(s.staging.events[0]?.kind,'build',text);
  }
  const s=scene('I build courage for my snow friend.','snow friend');stageStory({presentationVersion:3,scenes:[s]});assert.equal(s.staging.events.length,0);
});

test('ownership and visible states survive reversed roles, location cuts and return visits',()=>{
  const scenes=[scene('I open the book.','book'),scene('I give Ben the book.','book'),scene('Hello.','book',{character:'bear',secondCharacter:'bunny',background:'pond'}),scene('I build the castle.','castle'),scene('I build the castle.','castle'),scene('Hello.',null,{background:'forest'}),scene('Hello.',null)];
  const script={presentationVersion:3,scenes};stageStory(script);
  assert.equal(scenes[2].staging.props.find(p=>p.id==='book').owner,'bear');assert.equal(scenes[2].staging.props.find(p=>p.id==='book').openProgress,1);
  assert.equal(scenes[5].staging.props.some(p=>p.id==='castle'),false);assert.ok(scenes[6].staging.props.find(p=>p.id==='castle').buildProgress>.6);
  const before=JSON.stringify(script);stageStory(script);assert.equal(JSON.stringify(script),before);
});

test('negative, speculative, unknown and absent subjects never animate object actions',()=>{
  for(const text of ['Can I roll the ball?','I do not roll the ball.','I will roll the ball.','I try to catch the ball.','I failed to catch the ball.','I almost caught the ball.','I cannot push the ball.','I never roll the ball.','Sam rolls the ball.','Ben rolls the ball.']){
    const s=scene(text,'ball',{secondCharacter:undefined,lines:[{text,speaker:'narrator'}]});stageStory({presentationVersion:3,scenes:[s]});assert.equal(s.staging.events.length,0,text);
  }
  for(const [text,prop] of [['I open my eyes beside the book.','book'],['I roll my eyes at the ball.','ball'],['I water the path beside the flower.','flower'],['I build courage beside the castle.','castle'],['I push Ben toward the ball.','ball'],['I roll no ball.','ball']]){
    const s=scene(text,prop);stageStory({presentationVersion:3,scenes:[s]});assert.equal(s.staging.events.length,0,text);
  }
});

test('arbitrary frame seeking agrees and very short cues stay finite and inside their line',()=>{
  for(const kind of ['push','roll','catch','open','water','build']){
    const s=authored(kind,kind==='open'?'book':kind==='water'?'seed':kind==='build'?'snowman':'ball',{endpoint:{x:99999,y:-100},durationSec:.01,delaySec:99});
    const p=prepareStage(s,{duration:2,lines:[{from:0,duration:2,line:{durationSec:2/30}}]});assert.ok(p.events[0].from>=0);assert.ok(p.events[0].until<=2);assert.ok(p.events[0].until>p.events[0].from);
    const expected=new Map([0,1,2,10].map(f=>[f,sampleStage(p,f)]));for(const f of [10,1,2,0,1]){const result=sampleStage(p,f);assert.deepEqual(result,expected.get(f));const prop=result.props[0];assert.ok(Number.isFinite(prop.x)&&Number.isFinite(prop.y));assert.ok(prop.x>=300&&prop.x<=1600);assert.ok(prop.y>=350&&prop.y<=900);}
  }
});

test('new interaction paws prepare and release without resurrecting a finished roll',()=>{
  for(const kind of ['push','roll','catch','open','water','build']){
    const p=prepareStage(authored(kind,kind==='open'?'book':kind==='water'?'flower':kind==='build'?'castle':'ball',{delaySec:.4}),slot()),e=p.events[0];
    const reach=f=>sampleStage(p,f).reaches.character;
    for(const f of [e.from,e.until]){
      const a=reach(f-1),b=reach(f);
      assert.ok(Math.abs((a?.amount??0)-(b?.amount??0))<.12,`${kind} reach at ${f}`);
      assert.ok(Math.abs((a?.crouch??0)*(a?.amount??0)-(b?.crouch??0)*(b?.amount??0))<.07,`${kind} crouch at ${f}`);
    }
    if(kind==='roll')assert.equal(reach(e.until)?.amount??0,0);
  }
});

// The rendering consumer must use state, not merely return it from the sampler.
test('vector props visibly consume open, construction, roll and watering state',()=>{
  const draw=props=>renderToStaticMarkup(React.createElement(StageProps,{props,frame:20}));
  const book={id:'book',kind:'book',x:700,y:700,owner:'bunny'};
  assert.notEqual(draw([{...book,openProgress:0}]),draw([{...book,openProgress:1}]));
  for(const kind of ['castle','snowman']){const object={id:kind,kind,x:790,y:826,owner:null};assert.notEqual(draw([{...object,buildProgress:.34}]),draw([{...object,buildProgress:1}]));}
  const ball={id:'ball',kind:'ball',x:700,y:826,owner:null};assert.match(draw([{...ball,rotation:75}]),/rotate\(75\)/);
  const p=prepareStage(authored('water','flower'),slot()),e=p.events[0],wet=sampleStage(p,(e.from+e.until)/2).props[0];
  const pouring=draw([wet]);assert.match(pouring,/aria-label="Watering can"/);assert.match(pouring,/aria-label="Water droplets"/);assert.notEqual(pouring,draw([{...wet,watering:undefined}]));
  const cues=[{kind:'roll',propId:'ball',from:10,until:40}];assert.equal(propMotion('ball',cues,25,30,false).rotation,0,'rolling angle must come only from actual distance');
});
