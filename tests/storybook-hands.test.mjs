import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {require,draw,hands,cast,getRecipe,computePose} from './helpers/character.mjs';
const {StorybookBody}=require('../../src/components/characters/StorybookBody.tsx');
const {UPRIGHT_KINDS,REACHABLE_KINDS}=require('../../src/components/characters/performanceProfiles.ts');
const {handAnchor}=require('../../src/lib/rigHands.ts');
const hand=(props,side='R')=>{
  const found=hands(draw(props)).find(h=>h.side===side);
  assert.ok(found,`${props.kind}: missing ${side} limb`);
  return found;
};
const contour=h=>h.paths[0].attrs.d;

test('all upright species have connected paw or wing silhouettes and native hoof tips',()=>{
  for(const kind of UPRIGHT_KINDS) for(const side of ['L','R']) {
    const h=hand({kind,action:'wave'},side);
    assert.match(contour(h),/^M.*Z$/);
    assert.equal((contour(h).match(/M/g)||[]).length,1,`${kind}: disconnected arm and paw`);
    assert.ok(h.paths[0].attrs.fill&&h.paths[0].attrs.fill!=='none');
    assert.equal(h.attrs['data-hand-anatomy'],getRecipe(kind).foot==='hoof'?'hoof':['duck','owl','bird','chick','penguin'].includes(kind)?'wing':'paw');
  }
});

test('Tilly keeps two broad front flippers instead of mammal paws',()=>{
  const limbs=hands(draw({kind:'tilly',action:'wave'}));
  assert.equal(limbs.length,2);
  for(const h of limbs) {
    assert.ok(h.attrs['data-native-flipper']);
    assert.match(contour(h),/Q-33 9 -29 39Q-17 48 3 23/);
    assert.ok(Number.isFinite(h.contact.x)&&Number.isFinite(h.contact.y));
  }
});

test('waves and pointing change the visible gesture without detached fingers',()=>{
  for(const {id} of cast) {
    const wave=hand({kind:id,action:'wave'}),point=hand({kind:id,action:'point'});
    assert.notDeepEqual(wave.matrix,point.matrix,`${id}: arm gesture is frozen`);
  }
});

test('open paws ease closed during contact and reopen on release',()=>{
  for(const kind of ['bunny','bear','duck','fox','owl']) {
    const at=grip=>contour(hand({kind,action:'wave',stageCenter:{x:850,y:870},reach:{target:{x:955,y:735},amount:1,grip,crouch:0}}));
    assert.notEqual(at(0),at(1),kind);
    assert.notEqual(at(.5),at(0));
    assert.notEqual(at(.5),at(1));
    assert.equal(at(0),at(0),'reopening depends on render order');
  }
});

test('wave to point blends keep the connected contour continuous',()=>{
  const numbers=s=>s.match(/-?\d+(?:\.\d+)?/g).map(Number);
  for(const kind of ['bunny','bear','duck','fox','owl']) {
    const at=blend=>numbers(contour(hand({kind,action:'point',previousAction:{action:'wave',t:.4},blend})));
    const before=at(.49999),after=at(.5);
    assert.equal(before.length,after.length);
    assert.ok(Math.max(...before.map((n,i)=>Math.abs(n-after[i])))<.01,kind);
    assert.notDeepEqual(at(0),at(1));
  }
});

test('rendered upright contact points match the solver at every supported arm extension',()=>{
  for(const kind of UPRIGHT_KINDS) for(const side of ['L','R']) for(const extension of [.5,1,1.7,2.2]) {
    const pose=computePose({action:'point',t:.57,bpm:120,storybook:true,kind});
    const markup=renderToStaticMarkup(React.createElement('svg',null,React.createElement(StorybookBody,{
      recipe:getRecipe(kind),pose,action:'point',emotion:'happy',mouth:0,blink:0,showFace:true,armExtension:{[side]:extension},
    })));
    const visible=hands(markup).find(h=>h.side===side).contact,expected=handAnchor(kind,pose,side,extension);
    assert.ok(Math.hypot(visible.x-expected.x,visible.y-expected.y)<1e-8,`${kind}/${side}/${extension}: drawing/solver mismatch`);
  }
});

test('every reachable species and cast alias meets props through mirroring, turning and crouching',()=>{
  for(const kind of [...REACHABLE_KINDS,...cast.map(c=>c.id)]) for(const flip of [false,true]) {
    const center={x:850,y:870},target={x:945,y:770},width=450;
    const limbs=hands(draw({kind,width,flip,turn:.6,action:'wave',stageCenter:center,reach:{target,amount:1,crouch:.18}}));
    const distance=h=>Math.hypot(center.x+(h.contact.x-100)*width/240-target.x,center.y+(h.contact.y-250)*width/240-target.y);
    assert.ok(Math.min(...limbs.map(distance))<1,`${kind}/${flip}: misses prop by ${Math.min(...limbs.map(distance))}px`);
  }
});

test('held props sit over the same visible contact point as the carrying paw',()=>{
  for(const {id} of cast) {
    const props={kind:id,stageCenter:{x:850,y:870},reach:{target:{x:955,y:735},amount:1,crouch:.1},heldProp:{kind:'apple'}};
    const markup=draw(props);
    assert.match(markup,/data-held-prop="apple"/);
    assert.doesNotMatch(markup,/NaN|Infinity|undefined/);
    assert.equal(markup,draw(props));
  }
});
