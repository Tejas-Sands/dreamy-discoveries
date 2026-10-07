import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
import {prepareStage, sampleStage} from '../scripts/lib/staging.mjs';

const require=createRequire(import.meta.url);
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
}).outputText,file);
const load=file=>fs.existsSync(new URL(file,import.meta.url))?require(file):{};
const {thumbnailPlan,headlineLines}=load('../src/lib/thumbnail.ts');
const {stageCamera,stageGaze}=require('../src/lib/stageCamera.ts');
const {propMotion}=load('../src/lib/propMotion.ts');
const base={slug:'visual-fixture',type:'story',title:'Ben and the Paper Boat',palette:'ocean',mainCharacter:{kind:'ben',name:'Ben'},scenes:[
  {kind:'story',background:'pond',character:'bear',secondCharacter:'duck',prop:'⛵',lines:[{text:'Oh no! My paper boat!',emotion:'surprised'}]},
  {kind:'moral',background:'garden',character:'bear',secondCharacter:'bunny',prop:'❤️',lines:[{text:'Kindness helps.',emotion:'love'}]},
]};

test('the cover uses an actual story moment, its friend and object, rather than the moral finale',()=>{
  assert.equal(typeof thumbnailPlan,'function');
  const before=JSON.stringify(base),plan=thumbnailPlan(base);
  assert.equal(plan.hero,'bear');assert.equal(plan.friend,'duck');assert.equal(plan.background,'pond');
  assert.equal(plan.prop.kind,'boat');assert.equal(plan.emotion,'surprised');
  assert.equal(plan.headline,'Paper Boat');
  assert.equal(JSON.stringify(base),before,'a thumbnail render must never rewrite the episode');
  assert.deepEqual(thumbnailPlan(base),plan);
});

test('headlines fit two readable lines even for long names and words',()=>{
  assert.equal(typeof headlineLines,'function');
  for(const title of [base.title,'Daisy and the Different-Sized Baskets','Grandpa Tilly\u2019s Sweet Treat','Supercalifragilisticexpialidocious Adventure']) {
    const lines=headlineLines(title);
    assert.ok(lines.length>0&&lines.length<=2);
    assert.ok(lines.every(line=>line.length<=18),JSON.stringify(lines));
  }
});

test('bedtime covers stay gentle and animal emoji are never promoted to story objects',()=>{
  assert.equal(typeof thumbnailPlan,'function');
  const night={...base,title:'Goodnight, Tilly',template:'lullaby',mainCharacter:{kind:'turtle',name:'Grandpa Tilly'},scenes:[
    {background:'bedroom',character:'turtle',secondCharacter:'tilly',prop:'🐢',lines:[{text:'Sleep well.',emotion:'sleepy'}]},
  ]};
  const p=thumbnailPlan(night);
  assert.equal(p.hero,'turtle');assert.equal(p.friend,null);assert.equal(p.prop,null);assert.equal(p.emotion,'sleepy');
});

const slot={duration:150,lines:[{from:0,duration:60,line:{speaker:'character',durationSec:2}},{from:60,duration:60,line:{speaker:'friend',durationSec:2}}],holdFrom:120,revealFrom:-1};
const scene={character:'bunny',secondCharacter:'bear',background:'meadow',lines:slot.lines.map(l=>l.line),staging:{
  actors:{character:{x:620,y:870},friend:{x:1360,y:870}},props:[],events:[],shot:'dialogue',
}};
test('speaker framing eases across a line boundary and gives narrators a shared shot',()=>{
  const stage=sampleStage(prepareStage(scene,slot),60);
  const camera=f=>stageCamera(stage,scene,slot,f,30);
  const before=camera(59),after=camera(60);
  assert.ok(Math.abs(after.origin.x-before.origin.x)<5,'the camera jumps at a speaker change');
  assert.ok(Math.abs(camera(61).origin.x-after.origin.x)<10);
  assert.ok(camera(90).origin.x>camera(60).origin.x);
  const narrative={...slot,lines:[{from:0,duration:120,line:{speaker:'narrator'}}]};
  assert.equal(stageCamera(stage,scene,narrative,90,30).origin.x,990);
  for(const f of [0,59,60,61,90,149])assert.deepEqual(camera(f),camera(f),'seeking must not change framing');
});

test('question holds keep framing steady and quiet shots use less camera movement',()=>{
  const stage=sampleStage(prepareStage(scene,slot),0);
  const question={...scene,question:{answer:{text:'Share'}}};
  const q={...slot,holdFrom:70,revealFrom:130};
  assert.deepEqual(stageCamera(stage,question,q,90,30),stageCamera(stage,question,q,120,30));
  assert.ok(stageCamera({...stage,shot:'quiet'},scene,slot,90,30).zoom<stageCamera(stage,scene,slot,90,30).zoom);
});

test('pickup follows an arc while the reaching paw stays attached to the object',()=>{
  const s={...scene,staging:{...scene.staging,props:[{id:'apple',kind:'apple',owner:null,x:710,y:826}],events:[{kind:'pick-up',propId:'apple',line:0,actor:'character',durationSec:1}]}};
  const prepared=prepareStage(s,slot),middle=sampleStage(prepared,15),end=sampleStage(prepared,30);
  assert.ok(middle.props[0].y<(826+end.props[0].y)/2,'pickup still follows a straight path');
  assert.deepEqual(middle.reaches.character.target,{x:middle.props[0].x,y:middle.props[0].y});
  assert.equal(end.props[0].owner,'bunny');
});

test('object accents settle, remain bounded and quiet scenes soften them',()=>{
  assert.equal(typeof propMotion,'function');
  const events=[{kind:'drop',propId:'apple',from:30,until:60}];
  const sample=f=>propMotion('apple',events,f,30,false);
  assert.deepEqual(sample(0),{rotation:0,sx:1,sy:1,accent:0});
  assert.notDeepEqual(sample(65),sample(0));
  assert.deepEqual(sample(120),sample(0),'there must be no perpetual bouncing');
  assert.ok(propMotion('apple',events,65,30,true).accent<sample(65).accent);
  for(let f=0;f<150;f++) {
    const p=sample(f);assert.ok(Math.abs(p.rotation)<=10&&p.sx>=.9&&p.sx<=1.1&&p.sy>=.9&&p.sy<=1.1);
    assert.ok(p.accent>=0&&p.accent<=1);assert.deepEqual(sample(f),p);
  }
});

test('listeners look toward the actual partner or held object after actors exchange sides',()=>{
  assert.equal(typeof stageGaze,'function');
  const stage=sampleStage(prepareStage(scene,slot),0);
  assert.ok(stageGaze(stage,'character',false,false).x>0);
  assert.ok(stageGaze(stage,'friend',false,false).x<0);
  const swapped={...stage,actors:{character:{...stage.actors.character,x:1300},friend:{...stage.actors.friend,x:700}}};
  assert.ok(stageGaze(swapped,'character',false,false).x<0);
  const holding={...stage,reaches:{character:{amount:1,crouch:0,target:{x:710,y:735}}}};
  assert.ok(stageGaze(holding,'character',true,false).y>0,'the actor should notice the object in its paw');
  assert.deepEqual(stageGaze(stage,'character',true,false),{x:0,y:0});
  assert.deepEqual(stageGaze(holding,'character',true,true),{x:0,y:-2});
});

test('revealing a hidden prop eases framing from its previous target without changing past cues',()=>{
  const s={...scene,staging:{...scene.staging,props:[{id:'apple',kind:'apple',owner:null,x:1500,y:740,hidden:true}],
    events:[{kind:'show',propId:'apple',line:1}],shot:'prop'}};
  const prepared=prepareStage(s,slot),sample=f=>stageCamera(sampleStage(prepared,f),s,slot,f,30,prepared.events);
  const before=sample(59),reveal=sample(60),next=sample(61);
  assert.ok(Math.abs(reveal.origin.x-before.origin.x)<5);
  assert.ok(Math.abs(reveal.origin.y-before.origin.y)<2);
  assert.ok(Math.abs(next.origin.x-reveal.origin.x)<10);
  assert.ok(sample(90).origin.x>sample(60).origin.x);
  const short={...slot,lines:[slot.lines[0],{...slot.lines[1],from:5}]};
  const p=prepareStage(s,short),cam=f=>stageCamera(sampleStage(p,f),s,short,f,30,p.events);
  assert.ok(Math.abs(cam(5).origin.x-cam(4).origin.x)<30,'a short line must not finish its previous move instantly');
});

test('a permanently hidden prop is not advertised as the cover object',()=>{
  const s={...base,title:'Ben and the Apple',scenes:[{...base.scenes[0],prop:null,lines:[{text:'Hello there.'}],staging:{
    actors:{character:{x:620,y:870}},props:[{id:'apple',kind:'apple',owner:null,x:1500,y:740,hidden:true}],events:[],shot:'prop',
  }}]};
  assert.equal(thumbnailPlan(s).prop,null);
  s.scenes[0].prop='🍎';
  assert.equal(thumbnailPlan(s).prop,null,'a legacy prop label cannot advertise an explicitly hidden object');
  s.scenes[0].prop=null;
  s.scenes[0].lines=[{text:'I wonder where the apple is.'}];
  assert.equal(thumbnailPlan(s).prop,null,'mentioning a hidden object cannot make it visible on the cover');
  s.scenes[0].staging.props[0].hidden=false;
  s.scenes[0].staging.props[0].location='forest';
  assert.equal(thumbnailPlan(s).prop,null,'an object in another location is absent from this story moment');
  s.scenes[0].staging.props[0].hidden=true;
  delete s.scenes[0].staging.props[0].location;
  s.scenes[0].staging.events.push({kind:'show',propId:'apple',line:0});
  assert.equal(thumbnailPlan(s).prop.kind,'apple');
  delete s.scenes[0].staging;
  assert.equal(thumbnailPlan(s).prop.kind,'apple','legacy scenes retain the text fallback');
});

test('an unrevealed held object cannot pull the actor\u2019s paw or gaze away from dialogue',()=>{
  const s={...scene,staging:{...scene.staging,props:[{id:'apple',kind:'apple',owner:'bunny',x:710,y:735,hidden:true}]}};
  const prepared=prepareStage(s,slot),sample=sampleStage(prepared,90);
  assert.equal(sample.reaches.character,undefined);
  assert.deepEqual(stageGaze(sample,'character',true,false),{x:0,y:0});
});
