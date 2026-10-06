import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

const require=createRequire(import.meta.url);
require.extensions['.ts']=require.extensions['.tsx']=(module,file)=>{
  const {outputText}=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2022}});
  module._compile(outputText,file);
};
const originalLoad=Module._load;
Module._load=function(name,...args){return name==='remotion'?{...originalLoad.call(this,name,...args),useCurrentFrame:()=>17,useVideoConfig:()=>({fps:30})}:originalLoad.call(this,name,...args);};
const {Character,getRecipe}=require('../src/components/characters/Character.tsx');
Module._load=originalLoad;
const {StorybookBody}=require('../src/components/characters/StorybookBody.tsx');
const {StorybookFace}=require('../src/components/characters/StorybookFace.tsx');
const {FACES,facialParameters}=require('../src/components/characters/Face.tsx');
const {computePose}=require('../src/components/characters/pose.ts');
const {mouthAt,mouthShapeAt}=require('../src/lib/speech.ts');
const actingPath=new URL('../src/lib/acting.ts',import.meta.url);
const {actorPerformance}=fs.existsSync(actingPath)?require('../src/lib/acting.ts'):{};
const cast=[['taffy','bunny'],['ben','bear'],['daisy','duck'],['fiona','fox'],['tilly','turtle'],['ozzy','owl']];
const performance={emotion:'excited',fromEmotion:'sad',blend:.5,emphasis:.7,listening:false};
const draw=(Component,props)=>renderToStaticMarkup(React.createElement('svg',null,React.createElement(Component,props)));
const line=(from,speaker,emotion,text='Look! A beautiful ball!')=>({from,pre:0,duration:69,line:{speaker,emotion,text,durationSec:2,words:[{text:'Look!',start:0,end:.3},{text:'beautiful',start:.6,end:1.1},{text:'ball!',start:1.3,end:1.8}]}});
const scene={character:'taffy',secondCharacter:'ben',emotion:'neutral',lines:[]};
const slot={from:100,duration:250,lines:[line(0,'taffy','sad'),line(69,'ben','excited')],holdFrom:138,holdDuration:60,revealFrom:-1,praiseFrom:-1};

test('speaking emotions ease, listeners react after a delay, and aliases seek identically',()=>{
  assert.equal(typeof actorPerformance,'function');
  const start=actorPerformance(scene,slot,'character',0,30),mid=actorPerformance(scene,slot,'character',5,30),settled=actorPerformance(scene,slot,'character',30,30);
  assert.equal(start.blend,0);assert.equal(start.fromEmotion,'neutral');assert.equal(start.emotion,'sad');
  assert.ok(mid.blend>0&&mid.blend<1);assert.equal(settled.blend,1);
  assert.equal(actorPerformance(scene,slot,'friend',0,30).emotion,'neutral');
  assert.equal(actorPerformance(scene,slot,'friend',6,30).emotion,'worried');
  assert.equal(actorPerformance(scene,slot,'friend',12,30).listening,true);
  const frames=[0,6,12,69,74,90],expected=frames.map(f=>actorPerformance(scene,slot,'friend',f,30));
  for(const f of [90,6,74,0,69,12])assert.deepEqual(actorPerformance(scene,slot,'friend',f,30),expected[frames.indexOf(f)]);
  const roles={...slot,lines:[line(0,'character','sad'),line(69,'friend','excited')]};
  for(const f of frames)assert.deepEqual(actorPerformance(scene,slot,'character',f,30),actorPerformance(scene,roles,'character',f,30));
});

test('phrase accents respond to spoken words and settle in silence and protected thinking holds',()=>{
  assert.equal(typeof actorPerformance,'function');
  const at=f=>actorPerformance(scene,slot,'character',f,30);
  assert.ok(at(3).emphasis>at(17).emphasis,'phrase onset should accent head/brows');
  assert.equal(at(65).emphasis,0,'no talking accent after measured speech');
  const q={...slot,holdFrom:138,revealFrom:198,praiseFrom:249};
  assert.equal(actorPerformance({...scene,question:{answer:{text:'Help'}}},q,'character',160,30).emotion,'thinking');
  assert.equal(actorPerformance({...scene,question:{answer:{text:'Help'}}},q,'character',160,30).emphasis,0);
});

test('mouth shapes use spelling and word times while measured silence closes the lips',()=>{
  assert.equal(typeof mouthShapeAt,'function');
  const timed=text=>({durationSec:1,words:[{text,start:0,end:1}],envelope:{fps:10,values:Array(11).fill(.8)}});
  assert.equal(mouthShapeAt(timed('moon'),.4),'round');
  assert.equal(mouthShapeAt(timed('cheese'),.4),'wide');
  assert.equal(mouthShapeAt(timed('cat'),.4),'open');
  assert.equal(mouthShapeAt(timed('map'),.02),'closed');
  const quiet={...timed('cat'),envelope:{fps:10,values:Array(11).fill(0)}};
  assert.equal(mouthShapeAt(quiet,.4),'rest');assert.equal(mouthShapeAt(null,.4),'rest');
  assert.equal(mouthShapeAt(timed('moon'),-1),'rest');assert.equal(mouthShapeAt(timed('moon'),1.1),'rest');
  const gap={durationSec:1,words:[{text:'wow',start:0,end:.3}]};
  assert.equal(mouthShapeAt(gap,.7),'rest');
  assert.equal(mouthAt(quiet,.4),0,'existing amplitude API remains compatible');
});

test('all numeric facial channels interpolate through the midpoint without a discrete brow switch',()=>{
  assert.equal(typeof facialParameters,'function');
  for(const key of ['eyeScale','pupil','lid','browDy','browAngle','mouthW','curve','open','blush']) {
    const f=facialParameters('excited',{...performance,emphasis:0});
    assert.ok(Math.abs(f[key]-(FACES.sad[key]+FACES.excited[key])/2)<1e-8,key);
    const a=facialParameters('excited',{...performance,blend:.49999,emphasis:0}),b=facialParameters('excited',{...performance,blend:.5,emphasis:0});
    assert.ok(Math.abs(a[key]-b[key])<.001,key);
  }
});

test('six cast species have distinct opt-in upper-body acting and alias-equivalent motion',()=>{
  const base={action:'idle',t:.6,clockT:1.2,bpm:120,seed:7,storybook:true};
  const acted=cast.map(([id,kind])=>{
    const p=computePose({...base,kind,performance});
    assert.deepEqual(p,computePose({...base,kind:id,performance}),id);
    assert.notDeepEqual(p,computePose(base),`${id}: performance is invisible`);
    assert.equal(p.legL,0);assert.equal(p.legR,0);
    return JSON.stringify([p.head,p.armL,p.armR]);
  });
  assert.equal(new Set(acted).size,6);
  assert.deepEqual(computePose({...base,kind:'bunny'}),computePose(base),'kind alone must not alter older presentation');
});

test('angled views reshape the cheek and occlude the far eye while leaving paws and feet anchored',()=>{
  for(const [,kind] of cast) {
    const pose=computePose({action:'idle',t:.5,bpm:120});
    const props={recipe:getRecipe(kind),pose,emotion:'happy',mouth:.6,blink:0,showFace:true,performance};
    const front=draw(StorybookBody,{...props,turn:0}),profile=draw(StorybookBody,{...props,turn:1});
    const head=m=>m.match(/data-storybook-head="[^"]+" d="([^"]+)"/)[1];
    assert.notEqual(head(front),head(profile),kind);
    assert.match(profile,/data-view="profile"/);
    const face=draw(StorybookFace,{kind,emotion:'happy',mouth:.6,blink:0,eyes:pose.eyes,uid:'test',outline:'#765',turn:1});
    const far=face.match(/<g data-face-eye="far"[^>]*opacity="([^"]+)"/);
    assert.ok(far&&Number(far[1])<.05,`${kind}: far eye visible in profile`);
    const handTransforms=m=>[...m.matchAll(/<g transform="([^"]+)"><g transform="scale\(1 ([^)]*)\)">/g)].map(x=>x[1]+x[2]).sort();
    assert.deepEqual(handTransforms(front),handTransforms(profile),`${kind}: turn moved contact geometry`);
  }
});

test('mouth shape geometry and silent rest visibly override emotional open mouths',()=>{
  const props={kind:'bunny',emotion:'excited',mouth:.8,blink:0,eyes:{dx:0,dy:0,mode:'open'},uid:'test',outline:'#765',performance};
  const round=draw(StorybookFace,{...props,mouthShape:'round'}),wide=draw(StorybookFace,{...props,mouthShape:'wide'}),quiet=draw(StorybookFace,{...props,mouth:0,mouthShape:'rest'});
  assert.notEqual(round,wide);
  assert.doesNotMatch(quiet,/fill="#765066"/,'emotion must not keep a speech mouth open in measured silence');
});

test('standalone still calls ignore opt-in motion, and legacy zoo art remains front-compatible',()=>{
  const props={kind:'taffy',action:'wave',still:true,width:300};
  assert.equal(draw(Character,props),draw(Character,{...props,performance,turn:1,mouthShape:'round'}));
  const legacy={kind:'cat',width:300};
  assert.equal(draw(Character,legacy),draw(Character,{...legacy,turn:1}));
});

test('rapid emotional changes remain continuous at dialogue and reveal boundaries',()=>{
  assert.equal(typeof actorPerformance,'function');
  const quick={...slot,lines:[line(0,'character','sad'),line(4,'character','excited'),line(7,'character','thinking')]};
  for(const boundary of [4,7]) {
    const before=facialParameters('neutral',{...actorPerformance(scene,quick,'character',boundary-.00001,30),emphasis:0});
    const after=facialParameters('neutral',{...actorPerformance(scene,quick,'character',boundary,30),emphasis:0});
    for(const key of ['eyeScale','pupil','lid','browDy','browAngle','mouthW','curve','open','blush'])assert.ok(Math.abs(before[key]-after[key])<.001,`${boundary}/${key}: interrupted acting jumps`);
  }
});

test('secondary motion responds to acceleration and settles after a turn independently of frame seeking',()=>{
  const props={action:'idle',bpm:120,seed:7,storybook:true,kind:'bunny',clockT:1,performance:{...performance,emphasis:0},turn:1};
  const velocity=t=>3*Math.exp(-t/.3);
  const starting=computePose({...props,t:0,turnVelocity:velocity(0)}),settled=computePose({...props,t:4,turnVelocity:velocity(4)});
  assert.ok(starting.secondary&&settled.secondary,'secondary motion is missing');
  assert.ok(Math.abs(starting.secondary.ears)>Math.abs(settled.secondary.ears)+3,'ear response never settles');
  const frames=[0,.18,.4,1,4],expected=frames.map(t=>computePose({...props,t,turnVelocity:velocity(t)}));
  for(const t of [4,.4,0,1,.18])assert.deepEqual(computePose({...props,t,turnVelocity:velocity(t)}),expected[frames.indexOf(t)]);
  const staticBody={...props,performance:undefined};
  assert.equal(computePose({...staticBody,t:.4}).secondary,undefined,'older rig receives new inertia');
});

// Inspect the actual SVG transform chain, including external mirroring and crouch.
const identity=[1,0,0,1,0,0];
const multiply=(a,b)=>[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];
const translate=(x,y=0)=>[1,0,0,1,x,y];
const matrix=value=>{
  let result=identity;
  for(const [,name,args] of (value??'').matchAll(/(translate|rotate|scale)\(([^)]*)\)/g)) {
    const [a,b,c]=args.trim().split(/[ ,]+/).map(Number);
    let next;
    if(name==='translate')next=translate(a,b);
    else if(name==='scale')next=[a,0,0,b??a,0,0];
    else {const k=a*Math.PI/180,r=[Math.cos(k),Math.sin(k),-Math.sin(k),Math.cos(k),0,0];next=b===undefined?r:multiply(multiply(translate(b,c),r),translate(-b,-c));}
    result=multiply(result,next);
  }
  return result;
};
const anchors=markup=>{
  const stack=[identity],found=[];
  for(const [tag,,body] of markup.matchAll(/<\/?([\w:-]+)\b([^>]*?)\/?\s*>/g)) {
    if(tag.startsWith('</')){stack.pop();continue;}
    const attrs=Object.fromEntries([...body.matchAll(/([\w:-]+)="([^"]*)"/g)].map(([,k,v])=>[k,v]));
    const transform=multiply(stack.at(-1),matrix(attrs.transform));
    if(attrs['data-storybook-hand']||attrs['data-storybook-foot'])found.push({attrs,transform});
    if(!tag.endsWith('/>'))stack.push(transform);
  }
  return found;
};

test('expressive mirrored reaching keeps every cast paw on its world target and view turns keep feet unchanged',()=>{
  for(const [kind] of cast)for(const flip of [false,true])for(const turn of [-.8,.8]) {
    const center={x:850,y:870},target={x:1005,y:705},width=450;
    const props={kind,width,flip,action:'wave',actionT:.57,performance,turn,stageCenter:center,reach:{target,amount:1,crouch:.18}};
    const parts=anchors(draw(Character,props));
    const hand=parts.find(p=>p.attrs['data-hand-gesture']==='cup');
    assert.ok(hand,kind);
    const world={x:center.x+(hand.transform[4]-100)*width/240,y:center.y+(hand.transform[5]-250)*width/240};
    assert.ok(Math.hypot(world.x-target.x,world.y-target.y)<1,`${kind}/${flip}/${turn}: acted paw missed its target`);
    const feet=at=>anchors(draw(Character,{...props,turn:at})).filter(p=>p.attrs['data-storybook-foot']).sort((a,b)=>a.attrs['data-storybook-foot'].localeCompare(b.attrs['data-storybook-foot'])).map(p=>p.transform);
    assert.deepEqual(feet(turn),feet(0),`${kind}: view art moves grounded feet`);
  }
});

test('species weight changes jump travel without shifting landing/contact timing',()=>{
  const {actionContacts}=require('../src/lib/actionMotion.ts');
  const props={action:'jump',bpm:120,seed:7,storybook:true,performance};
  const heights=cast.map(([,kind])=>computePose({...props,kind,t:.3}).y);
  assert.equal(new Set(heights).size,6,'all six species jump with the same weight');
  for(const [,kind] of cast)for(const t of actionContacts('jump',3)) {
    const p=computePose({...props,kind,t});
    assert.ok(Math.abs(p.y)<1e-7,`${kind}: landing shifted at ${t}`);
  }
});

test('late view-turn velocity drives ears, tail and scarf while static views add no impulse',()=>{
  const props={action:'idle',t:5,clockT:5,bpm:120,seed:7,storybook:true,kind:'bear',performance:{...performance,emphasis:0}};
  const rest=computePose({...props,turn:.6,turnVelocity:0});
  const turning=computePose({...props,turn:.6,turnVelocity:2});
  for(const channel of ['ears','tail','cloth']) {
    assert.ok(Math.abs(turning.secondary[channel]-rest.secondary[channel])>1,`${channel}: late view turn has no inertial response`);
    const stopped=computePose({...props,turn:.6,turnVelocity:0});
    const frontal=computePose({...props,turn:0,turnVelocity:0});
    assert.equal(stopped.secondary[channel],frontal.secondary[channel],`${channel}: static view retains a fake turn impulse`);
    const left=computePose({...props,turn:-.6,turnVelocity:-2});
    assert.ok(Math.abs((turning.secondary[channel]-rest.secondary[channel])+(left.secondary[channel]-rest.secondary[channel]))<1e-8,`${channel}: local turn signs are not symmetric`);
  }
  const frames=[0,1,4,5,5.1,6],velocity=t=>t<5||t>=5.3?0:2*Math.sin((t-5)/.3*Math.PI);
  const expected=frames.map(t=>computePose({...props,t,clockT:t,turnVelocity:velocity(t)}));
  for(const t of [6,5,0,5.1,1,4])assert.deepEqual(computePose({...props,t,clockT:t,turnVelocity:velocity(t)}),expected[frames.indexOf(t)]);
});

test('turn velocity preserves still and legacy artwork and leaves solved contact geometry unchanged',()=>{
  for(const props of [{kind:'ben',still:true,performance},{kind:'cat',actionT:5}])assert.equal(draw(Character,props),draw(Character,{...props,turnVelocity:3}));
  const props={kind:'ben',width:450,flip:true,action:'wave',actionT:5,performance,turn:-.6,stageCenter:{x:850,y:870},reach:{target:{x:1005,y:705},amount:1,crouch:.18}};
  const at=turnVelocity=>anchors(draw(Character,{...props,turnVelocity})).map(({attrs,transform})=>({part:attrs['data-storybook-hand']??attrs['data-storybook-foot'],transform}));
  assert.deepEqual(at(3),at(0),'secondary response changes solved paw or foot transforms');
  assert.notEqual(draw(Character,{...props,turnVelocity:3}),draw(Character,{...props,turnVelocity:0}),'Character never forwards view velocity to the visible rig');
});

test('Ozzy projects and occludes each ear tuft and its highlight independently in either profile',()=>{
  const pose=computePose({action:'idle',t:.5,bpm:120});
  const earsAt=turn=>{
    const markup=draw(StorybookBody,{recipe:getRecipe('ozzy'),pose,emotion:'happy',mouth:0,blink:0,showFace:true,turn});
    const stack=[{transform:identity,opacity:1}],found=[];
    for(const [tag,name,body] of markup.matchAll(/<\/?([\w:-]+)\b([^>]*?)\/?\s*>/g)) {
      if(tag.startsWith('</')){stack.pop();continue;}
      const attrs=Object.fromEntries([...body.matchAll(/([\w:-]+)="([^"]*)"/g)].map(([,k,v])=>[k,v]));
      const parent=stack.at(-1),item={transform:multiply(parent.transform,matrix(attrs.transform)),opacity:parent.opacity*Number(attrs.opacity??1)};
      if(name==='path'&&/^(M130 176|M322 140|M132 118|M369 119)/.test(attrs.d??''))found.push({...item,d:attrs.d});
      if(!tag.endsWith('/>'))stack.push(item);
    }
    return found;
  };
  for(const turn of [-1,1]) {
    const parts=earsAt(turn),left=parts.find(p=>p.d.startsWith('M130 176')),right=parts.find(p=>p.d.startsWith('M322 140'));
    assert.ok(left&&right,'owl ear artwork missing');
    const near=turn>0?left:right,far=turn>0?right:left;
    assert.ok(far.opacity<.05,'far ear tuft remains visible outside the profile head');
    assert.equal(near.opacity,1,'near ear tuft is hidden with the far ear');
    assert.ok(Math.abs(far.transform[0]/near.transform[0]-.6)<1e-8,'far ear uses the near ear view projection');
    const farHighlight=parts.find(p=>p.d.startsWith(turn>0?'M369 119':'M132 118'));
    assert.ok(farHighlight&&farHighlight.opacity<.05,'far ear highlight floats outside its hidden tuft');
    assert.deepEqual(farHighlight.transform,far.transform,'far ear highlight uses a different projection from its tuft');
  }
  const front=earsAt(0);
  assert.equal(front.find(p=>p.d.startsWith('M130 176')).opacity,1);
  assert.equal(front.find(p=>p.d.startsWith('M322 140')).opacity,1);
});
