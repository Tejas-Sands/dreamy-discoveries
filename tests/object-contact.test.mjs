import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {draw, hands, elements, applyMatrix, cast, require} from './helpers/character.mjs';
import {prepareStage, sampleStage} from '../scripts/lib/staging.mjs';
const {StageProps}=require('../../src/components/StageProps.tsx');
const {propSurfaceContact}=require('../../src/lib/propGeometry.ts');

test('rendered paws contact the ball surface instead of its center through turns and mirroring',()=>{
  const center={x:850,y:870},target={x:1000,y:735},width=450,radius=41*1.3;
  for(const kind of ['bunny','bear','duck','fox','owl','turtle'])for(const flip of [false,true]) {
    const markup=draw({kind,width,flip,turn:.35,stageCenter:center,
      reach:{target,amount:1,crouch:0,object:{kind:'ball',size:1.3}},heldProp:{kind:'ball',size:1.3}});
    const distances=hands(markup).map(h=>Math.hypot(center.x+(h.contact.x-100)*width/240-target.x,center.y+(h.contact.y-250)*width/240-target.y));
    assert.ok(Math.min(...distances)>=radius-1,`${kind}/${flip}: paw penetrates the ball`);
    assert.ok(distances.some(d=>Math.abs(d-radius)<1),`${kind}/${flip}: paw misses the ball surface`);
    const object=elements(markup).find(n=>n.attrs['data-held-prop']==='ball');
    const x=center.x+(object.matrix[4]-100)*width/240,y=center.y+(object.matrix[5]-250)*width/240;
    assert.ok(Math.hypot(x-target.x,y-target.y)<1e-6,'carried object center must stay on the sampled world path');
    assert.equal(markup,draw({kind,width,flip,turn:.35,stageCenter:center,
      reach:{target,amount:1,crouch:0,object:{kind:'ball',size:1.3}},heldProp:{kind:'ball',size:1.3}}));
  }
});

test('carried artwork contains the prop without detached fingers painted over its center',()=>{
  for(const {id} of cast) {
    const markup=draw({kind:id,stageCenter:{x:850,y:870},reach:{target:{x:1000,y:735},amount:1,crouch:0},heldProp:{kind:'ball',size:1.3}});
    const object=markup.slice(markup.indexOf('data-held-prop="ball"'));
    assert.doesNotMatch(object,/M-17 -6Q-25|M-17 -7Q-22|M-4 -5Q-10/,'floating finger artwork must not cover the ball center');
  }
});

test('staging supplies object geometry for both sides of a handover without changing its world center',()=>{
  const scene={character:'bunny',secondCharacter:'bear',background:'meadow',lines:[],staging:{
    actors:{character:{x:700,y:870},friend:{x:1080,y:870}},props:[{id:'ball',kind:'ball',x:790,y:735,owner:'bunny'}],
    events:[{kind:'give',propId:'ball',line:0,actor:'character',to:'friend',durationSec:1}],shot:'prop'}};
  const stage=prepareStage(scene,{duration:100,lines:[{from:0,duration:90,line:{durationSec:3}}]},30);
  const sample=sampleStage(stage,15);
  for(const role of ['character','friend']) {
    assert.equal(sample.reaches[role].object?.kind,'ball');
    assert.equal(sample.reaches[role].target.x,sample.props[0].x);
    assert.equal(sample.reaches[role].target.y,sample.props[0].y);
  }
});

test('held and unowned props retain sampled rotation and scale throughout interactions',()=>{
  for(const owner of ['bunny',null])for(const kind of ['give','pick-up','catch','push']) {
    const markup=renderToStaticMarkup(React.createElement(StageProps,{props:[{id:'book',kind:'book',x:950,y:735,owner,rotation:12}],
      events:[{propId:'book',kind,from:0,until:30}],frame:15,fps:30}));
    assert.ok(markup.includes('translate(950 735) rotate(12) scale(1.3 1.3)'), `${kind}/${owner}: decorative motion separates the book from its contact`);
  }
});

test('rotated books and round fruit use their visible footprint while coincident targets stay finite',()=>{
  const center={x:900,y:700};
  const closed=propSurfaceContact(center,{x:700,y:700},{kind:'book',size:1.3,openProgress:0});
  const open=propSurfaceContact(center,{x:700,y:700},{kind:'book',size:1.3,openProgress:1});
  assert.ok(Math.abs(closed.x-(900-22*1.3))<1e-8);
  assert.ok(Math.abs(open.x-(900-45*1.3))<1e-8);
  const turned=propSurfaceContact(center,{x:900,y:500},{kind:'book',size:1.3,openProgress:1,rotation:90});
  assert.ok(Math.abs(turned.y-(700-45*1.3))<1e-8);
  for(const kind of ['apple','ball','basket','book']) {
    const point=propSurfaceContact(center,center,{kind});
    assert.ok(Number.isFinite(point.x)&&Number.isFinite(point.y));
    assert.ok(Math.hypot(point.x-center.x,point.y-center.y)>20);
  }
});

test('seed contact accounts for its body being drawn below the artwork origin',()=>{
  const center={x:940,y:735},size=1.3;
  const contact=propSurfaceContact(center,{x:850,y:870},{kind:'seed',size});
  const x=(contact.x-center.x)/size,y=(contact.y-center.y)/size;
  assert.ok(Math.abs((x/28)**2+((y-18)/20)**2-1)<1e-8,'contact must be on the offset seed ellipse');
  const markup=draw({kind:'bunny',width:450,stageCenter:{x:850,y:870},reach:{target:center,amount:1,crouch:0},heldProp:{kind:'seed',size}});
  const ellipse=elements(markup).find(n=>n.name==='ellipse'&&n.attrs.cy==='18'&&n.attrs.rx==='28');
  assert.ok(ellipse,'use the actual drawn seed body');
  const drawnCenter=applyMatrix(ellipse.matrix,{x:0,y:18});
  const rx=Math.abs(ellipse.matrix[0])*28,ry=Math.abs(ellipse.matrix[3])*20;
  const radii=hands(markup).map(h=>((h.contact.x-drawnCenter.x)/rx)**2+((h.contact.y-drawnCenter.y)/ry)**2);
  assert.ok(radii.every(r=>r>=.98)&&radii.some(r=>Math.abs(r-1)<.02),'visible paw must meet the rendered seed surface');
});

test('carrying at a stage edge keeps the reach center identical to the visible object',()=>{
  for(const x of [300,1600]) {
    const scene={character:'bunny',background:'meadow',lines:[],staging:{actors:{character:{x,y:870}},
      props:[{id:'ball',kind:'ball',x,y:735,owner:'bunny'}],events:[],shot:'prop'}};
    const sample=sampleStage(prepareStage(scene,{duration:90,lines:[]},30),0);
    assert.equal(sample.reaches.character.target.x,sample.props[0].x);
    assert.equal(sample.reaches.character.target.y,sample.props[0].y);
  }
});
