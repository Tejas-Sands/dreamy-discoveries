import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

const require = createRequire(import.meta.url);
require.extensions['.ts'] = require.extensions['.tsx'] = (module, file) => {
  const {outputText} = ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2022,
  }});
  module._compile(outputText, file);
};
// Only the Remotion frame context is supplied here; all rig and drawing code is real.
const originalLoad = Module._load;
Module._load = function(name, ...args) {
  if (name !== 'remotion') return originalLoad.call(this, name, ...args);
  return {...originalLoad.call(this, name, ...args), useCurrentFrame:()=>17, useVideoConfig:()=>({fps:30})};
};
const {Character, getRecipe} = require('../src/components/characters/Character.tsx');
Module._load = originalLoad;
const {StorybookBody} = require('../src/components/characters/StorybookBody.tsx');
const {computePose} = require('../src/components/characters/pose.ts');
const {handAnchor} = require('../src/lib/rigHands.ts');
const cast = JSON.parse(fs.readFileSync(new URL('../library/cast.json', import.meta.url))).members;

const identity = [1,0,0,1,0,0];
const multiply = (a,b) => [a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];
const translate = (x,y=0) => [1,0,0,1,x,y];
const transform = value => {
  let matrix = identity;
  for (const [,name,args] of (value??'').matchAll(/(translate|rotate|scale)\(([^)]*)\)/g)) {
    const [a,b,c] = args.trim().split(/[ ,]+/).map(Number);
    let next;
    if (name === 'translate') next = translate(a,b);
    else if (name === 'scale') next = [a,0,0,b??a,0,0];
    else {
      const angle = a*Math.PI/180, rotation = [Math.cos(angle),Math.sin(angle),-Math.sin(angle),Math.cos(angle),0,0];
      next = b === undefined ? rotation : multiply(multiply(translate(b,c),rotation),translate(-b,-c));
    }
    matrix = multiply(matrix,next);
  }
  return matrix;
};
// Read actual SVG transforms, so a stretched paw or misplaced artwork fails at the drawing boundary.
const hands = markup => {
  const found = [], stack = [{matrix:identity}];
  for (const [tag,name,body] of markup.matchAll(/<\/?([\w:-]+)\b([^>]*?)\/?\s*>/g)) {
    if (tag.startsWith('</')) { stack.pop(); continue; }
    const attrs = Object.fromEntries([...body.matchAll(/([\w:-]+)="([^"]*)"/g)].map(([,key,value])=>[key,value]));
    const parent = stack.at(-1), matrix = multiply(parent.matrix,transform(attrs.transform));
    const hand = attrs['data-storybook-hand'] ? {attrs,matrix,parts:[]} : parent.hand;
    if (attrs['data-storybook-hand']) found.push(hand);
    if (attrs['data-storybook-head']) found.push({attrs,matrix,parts:[]});
    if (hand && attrs['data-hand-part']) hand.parts.push({name,attrs,matrix});
    if (!tag.endsWith('/>')) stack.push({matrix,hand});
  }
  return found;
};
const drawCharacter = props => hands(renderToStaticMarkup(React.createElement(Character,{width:450,actionT:.57,shadow:false,...props})));
const findHand = (rendered,side) => {
  const hand = rendered.find(h=>h.attrs['data-storybook-hand']===side);
  assert.ok(hand, `expected the ${side} storybook hand in the rendered artwork`);
  return hand;
};
const contours = hand => hand.parts.filter(p=>['digit','thumb','feather','alula','palm'].includes(p.attrs['data-hand-part'])).map(p=>p.attrs.d);
const pathSize = path => {
  const values=path.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi).map(Number);
  const xs=values.filter((_,i)=>i%2===0),ys=values.filter((_,i)=>i%2===1);
  return {width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)};
};
const contourNumbers = paths => paths.flatMap(d=>d.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi).map(Number));
const applyMatrix = (matrix,{x,y}) => ({x:matrix[0]*x+matrix[2]*y+matrix[4],y:matrix[1]*x+matrix[3]*y+matrix[5]});
// Flatten the actual cheek outline for an occlusion check, without hard-coding
// a face width or deciding which shoulder angle the artist must choose.
const pathPolygon = path => {
  const tokens=path.match(/[A-Za-z]|-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi),points=[];
  let at=0,command,x=0,y=0,start;
  const next=()=>Number(tokens[at++]);
  while (at<tokens.length) {
    if (/^[A-Za-z]$/.test(tokens[at])) command=tokens[at++];
    if (command==='Z') { points.push(start); break; }
    if (command==='M'||command==='L') {
      x=next();y=next();points.push({x,y});
      if (command==='M') {start={x,y};command='L';}
    } else if (command==='Q') {
      const cx=next(),cy=next(),endX=next(),endY=next();
      for (let step=1;step<=20;step++) {
        const k=step/20,r=1-k;
        points.push({x:r*r*x+2*r*k*cx+k*k*endX,y:r*r*y+2*r*k*cy+k*k*endY});
      }
      x=endX;y=endY;
    } else if (command==='C') {
      const aX=next(),aY=next(),bX=next(),bY=next(),endX=next(),endY=next();
      for (let step=1;step<=20;step++) {
        const k=step/20,r=1-k;
        points.push({x:r*r*r*x+3*r*r*k*aX+3*r*k*k*bX+k*k*k*endX,y:r*r*r*y+3*r*r*k*aY+3*r*k*k*bY+k*k*k*endY});
      }
      x=endX;y=endY;
    } else throw new Error(`Unsupported head path command ${command}`);
  }
  return points;
};
const contains = (polygon,point) => {
  let inside=false;
  for (let i=0,j=polygon.length-1;i<polygon.length;j=i++) {
    const a=polygon[i],b=polygon[j];
    if ((a.y>point.y)!==(b.y>point.y) && point.x<(b.x-a.x)*(point.y-a.y)/(b.y-a.y)+a.x) inside=!inside;
  }
  return inside;
};

test('waves expose an open hand while the resting hand keeps a relaxed silhouette', () => {
  for (const {id} of cast) {
    const rendered = drawCharacter({kind:id,action:'wave'});
    assert.equal(findHand(rendered,'R').attrs['data-hand-gesture'],'open',id);
    assert.equal(findHand(rendered,'L').attrs['data-hand-gesture'],'relaxed',id);
    assert.notDeepEqual(contours(findHand(rendered,'R')),contours(findHand(rendered,'L')),`${id}: wave still has a closed outline`);
  }
});

test('waving palms remain visible beside the cheek throughout the wave cycle', () => {
  for (const {id} of cast) for (const t of [0,.11,.22,.33,.44,.55,.66]) {
    const rendered=drawCharacter({kind:id,action:'wave',actionT:t});
    const hand=findHand(rendered,'R'),head=rendered.find(part=>part.attrs['data-storybook-head']);
    assert.ok(head,`${id}: missing the rendered head contour`);
    const outline=pathPolygon(head.attrs.d).map(point=>applyMatrix(head.matrix,point));
    const center={x:hand.matrix[4],y:hand.matrix[5]};
    assert.equal(contains(outline,center),false,`${id}/${t}: waving palm is hidden behind the cheek`);
  }
});

test('pointing uses a single leading digit or feather instead of the open wave outline', () => {
  for (const {id} of cast) {
    const pointing = findHand(drawCharacter({kind:id,action:'point'}),'R');
    const waving = findHand(drawCharacter({kind:id,action:'wave'}),'R');
    assert.equal(pointing.attrs['data-hand-gesture'],'point',id);
    assert.notDeepEqual(contours(pointing),contours(waving),`${id}: pointing does not change the tip silhouette`);
    const digits = pointing.parts.filter(p=>['digit','feather'].includes(p.attrs['data-hand-part']));
    assert.equal(digits.filter(p=>p.attrs['data-leading-digit']==='true').length,1,id);
  }
});

test('a contacted hand cups around its target even when the authored action is pointing', () => {
  for (const {id} of cast) for (const [side,target] of [['R',{x:955,y:735}],['L',{x:745,y:735}]]) {
    const rendered = drawCharacter({kind:id,action:'point',stageCenter:{x:850,y:870},reach:{target,amount:1,crouch:0}});
    const contacted = findHand(rendered,side);
    assert.equal(contacted.attrs['data-hand-gesture'],'cup',`${id}/${side}`);
    const other = findHand(rendered,side==='R'?'L':'R');
    assert.equal(other.attrs['data-hand-gesture'],side==='R'?'relaxed':'point',`${id}: unrelated hand lost its action`);
    const waveGrip = findHand(drawCharacter({kind:id,action:'wave',stageCenter:{x:850,y:870},reach:{target,amount:1,crouch:0}}),side);
    assert.deepEqual(contours(contacted),contours(waveGrip),`${id}: grip depends on the outgoing gesture`);
  }
});

test('fingers curl continuously as reach fades and fully reopen after release', () => {
  const partsAt = amount => contours(findHand(drawCharacter({kind:'taffy',action:'point',stageCenter:{x:850,y:870},reach:{target:{x:955,y:735},amount,crouch:0}}),'R'));
  const open = partsAt(0), cupped = partsAt(1), halfway = partsAt(.5);
  assert.notDeepEqual(halfway,open);
  assert.notDeepEqual(halfway,cupped);
  const nearOpen = contourNumbers(partsAt(.001)), released = contourNumbers(open), full = contourNumbers(cupped);
  assert.equal(nearOpen.length,released.length,'morph must retain its curve topology');
  const fullTravel = Math.max(...released.map((n,i)=>Math.abs(n-full[i])));
  assert.ok(fullTravel>0,'gripping must move the fingers');
  assert.ok(Math.max(...released.map((n,i)=>Math.abs(n-nearOpen[i])))<fullTravel*.01,'grip snaps shut at the beginning of a reach');
  assert.deepEqual(partsAt(0),open,'release depends on a previous rendered frame');
});

test('hand outlines morph through action blend midpoints before the carrying curl is applied', () => {
  for (const {id} of cast) for (const amount of [0,.4]) for (const [from,to] of [['wave','point'],['point','wave']]) {
    const props={kind:id,action:to,actionT:.1,previousAction:{action:from,t:.4},stageCenter:{x:850,y:870},reach:{target:{x:955,y:735},amount,crouch:0}};
    const at=blend=>contours(findHand(drawCharacter({...props,blend}),'R'));
    const outgoing=contourNumbers(at(0)),incoming=contourNumbers(at(1));
    const before=contourNumbers(at(.49999)),midpoint=contourNumbers(at(.5));
    const travel=Math.max(...outgoing.map((n,i)=>Math.abs(n-incoming[i])));
    assert.ok(travel>0,`${id}: gestures have the same silhouette`);
    assert.equal(before.length,midpoint.length,'transition changes curve topology');
    assert.ok(Math.max(...before.map((n,i)=>Math.abs(n-midpoint[i])))<travel*.001,`${id}/${amount}: hand outline pops at the action midpoint`);
    assert.notDeepEqual(at(.5),at(0),'hand waits until the midpoint to start changing');
    assert.notDeepEqual(at(.5),at(1),'hand switches directly to the incoming gesture');
  }
});

test('the six cast keep rounded paws, webbed flippers, and feather tips with readable filled digits', () => {
  for (const {id,kind} of cast) {
    const hand = findHand(drawCharacter({kind:id,action:'wave'}),'R');
    const wing = kind==='duck'||kind==='owl';
    assert.equal(hand.attrs['data-hand-anatomy'],wing?'wing':kind==='turtle'?'flipper':'paw',id);
    const digits = hand.parts.filter(p=>p.attrs['data-hand-part']===(wing?'feather':'digit'));
    assert.equal(digits.length,3,`${id}: expected three distinct rounded tips`);
    assert.equal(new Set(digits.map(p=>p.attrs.d)).size,3,`${id}: overlapping identical fingers`);
    for (const digit of digits) {
      assert.equal(digit.name,'path');
      assert.ok(digit.attrs.fill && digit.attrs.fill!=='none',`${id}: finger is only an etched line`);
    }
    assert.equal(hand.parts.filter(p=>p.attrs['data-hand-part']===(wing?'alula':'thumb')).length,1,`${id}: missing separate thumb`);
  }
});

test('Tilly has broad short flipper tips instead of the mammals long paw fingers', () => {
  const middleTip = kind => findHand(drawCharacter({kind,action:'wave'}),'R').parts.filter(p=>p.attrs['data-hand-part']==='digit')[1].attrs.d;
  const flipper=pathSize(middleTip('tilly')),paw=pathSize(middleTip('taffy'));
  assert.ok(flipper.width>paw.width,'flipper tip should be broader than a paw finger');
  assert.ok(flipper.height<paw.height,'flipper tip should be shorter than a paw finger');
});

test('extending an arm preserves hand proportions and the existing rig contact center', () => {
  for (const {id,kind} of cast) for (const side of ['L','R']) {
    const pose = computePose({action:'idle',t:.4,bpm:120});
    const render = extension => findHand(hands(renderToStaticMarkup(React.createElement('svg',null,React.createElement(StorybookBody,{
      recipe:getRecipe(id),pose,emotion:'happy',mouth:0,blink:0,showFace:true,armExtension:{[side]:extension},
    })))),side);
    const resting = render(1);
    for (const extension of [.5,1.7,2.2]) {
      const extended = render(extension), center = handAnchor(kind,pose,side,extension);
      assert.ok(Math.hypot(extended.matrix[4]-center.x,extended.matrix[5]-center.y)<1e-8,`${id}/${side}: visible paw does not match its rig anchor`);
      for (let i=0;i<4;i++) assert.ok(Math.abs(resting.matrix[i]-extended.matrix[i])<1e-8,`${id}/${side}: reaching stretches the hand`);
      assert.deepEqual(contours(extended),contours(resting),`${id}/${side}: reach changes paw proportions`);
    }
  }
});

test('rendered hands meet world objects through cast aliases, mirroring, lean, and crouching', () => {
  for (const {id} of cast) for (const flip of [false,true]) {
    // This target stays within every species' existing .5..2.2 reach limits,
    // including Ben's wider shoulders after the requested crouch.
    const center = {x:850,y:870},target={x:1005,y:705},width=450;
    const rendered = drawCharacter({kind:id,width,flip,action:'wave',stageCenter:center,reach:{target,amount:1,crouch:.18}});
    const contacted = rendered.find(h=>h.attrs['data-hand-gesture']==='cup');
    assert.ok(contacted,`${id}: missing carrying hand`);
    const world={x:center.x+(contacted.matrix[4]-100)*width/240,y:center.y+(contacted.matrix[5]-250)*width/240};
    assert.ok(Math.hypot(world.x-target.x,world.y-target.y)<1,`${id}/${flip}: hand misses the prop by ${Math.hypot(world.x-target.x,world.y-target.y)}px`);
  }
});
