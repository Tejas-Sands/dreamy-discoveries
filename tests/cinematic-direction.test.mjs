import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {createRequire} from 'node:module';
import {prepareStage, sampleStage} from '../scripts/lib/staging.mjs';
import {directScript} from '../scripts/lib/director.mjs';
import {voiceSettings} from '../scripts/lib/voice.mjs';
import {buildEngagementReport} from '../scripts/lib/engagement-report.mjs';

const require=createRequire(import.meta.url);
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
}).outputText,file);
const {cinematicCamera,cinematicGaze,storyFocus}=require('../src/lib/stageCamera.ts');
const line=(from,speaker,emotion='happy')=>({from,pre:0,duration:90,line:{text:'Look at this little apple.',speaker,emotion,durationSec:3}});
const slot={from:0,duration:330,lines:[line(0,'character'),line(100,'friend','surprised'),line(210,'character','love')],holdFrom:300,holdDuration:20,revealFrom:-1};
const scene={kind:'story',background:'meadow',character:'bunny',secondCharacter:'bear',direction:'dialogue',lines:slot.lines.map(l=>l.line),staging:{
  actors:{character:{x:650,y:870},friend:{x:1250,y:870}},
  props:[{id:'apple',kind:'apple',owner:'bunny',x:750,y:735}],events:[{kind:'give',propId:'apple',line:0,actor:'character',to:'friend',delaySec:.65,durationSec:1}],shot:'prop',auto:true,
}};
const prepared=prepareStage(scene,slot),stageAt=f=>sampleStage(prepared,f);
const cameraAt=f=>cinematicCamera(stageAt(f),scene,slot,f,30,prepared.events,stageAt);

test('cinematic framing establishes the scene, follows the object, and shows the receiver reaction',()=>{
  assert.equal(typeof cinematicCamera,'function');
  assert.equal(cameraAt(0).shot,'wide');
  assert.equal(cameraAt(35).shot,'prop');
  assert.equal(cameraAt(70).shot,'reaction');
  assert.ok(cameraAt(35).zoom>cameraAt(0).zoom);
  assert.ok(cameraAt(70).zoom>1.2);
  assert.ok(cameraAt(70).origin.x>950,'the receiver is on the right');
});

test('interrupted focus changes stay continuous and arbitrary frame seeking agrees',()=>{
  assert.equal(typeof cinematicCamera,'function');
  const short={...slot,lines:[line(0,'character'),line(8,'friend'),line(15,'character')],duration:110,holdFrom:100};
  const s={...scene,staging:{...scene.staging,events:[],shot:'dialogue'}};
  const p=prepareStage(s,short),at=f=>sampleStage(p,f),cam=f=>cinematicCamera(at(f),s,short,f,30,p.events,at);
  for(let f=1;f<110;f++) {
    const a=cam(f-1),b=cam(f);
    assert.ok(Math.abs(a.pan.x-b.pan.x)<60);
    assert.ok(Math.abs(a.zoom-b.zoom)<.1);
    assert.ok(b.zoom>=1&&b.zoom<=1.7);
  }
  const expected=new Map([0,14,15,31,72,100].map(f=>[f,cam(f)]));
  for(const f of [72,0,31,15,100,14])assert.deepEqual(cam(f),expected.get(f));
});

test('an earlier action cannot take camera focus back during the next catch',()=>{
  const timeline={...slot,lines:[line(0,'character','surprised'),line(75,'friend')],duration:210,holdFrom:180};
  const s={...scene,staging:{...scene.staging,props:[{id:'apple',kind:'apple',owner:null,x:790,y:826}],
    events:[{kind:'roll',propId:'apple',line:0,actor:'character',durationSec:1.3},
      {kind:'catch',propId:'apple',line:1,actor:'friend',delaySec:.15,durationSec:1.1}]}};
  const p=prepareStage(s,timeline),at=f=>sampleStage(p,f),catchCue=p.events[1];
  for(let f=catchCue.from;f<catchCue.until;f++)assert.equal(cinematicCamera(at(f),s,timeline,f,30,p.events,at).shot,'prop',`catch lost focus at ${f}`);
});

test('explicit authored prop, reaction and celebration framing takes precedence',()=>{
  for(const preset of ['prop','reaction','celebration']) {
    const staging={...scene.staging,shot:preset,events:[]};delete staging.auto;
    const s={...scene,staging};const p=prepareStage(s,slot),at=f=>sampleStage(p,f);
    const camera=cinematicCamera(at(90),s,slot,90,30,[],at);
    if(preset==='prop'){assert.equal(camera.shot,'prop');assert.ok(camera.origin.x<900);}
    if(preset==='reaction'){assert.equal(camera.shot,'reaction');assert.ok(camera.origin.x<900);}
    if(preset==='celebration'){assert.equal(camera.shot,'shared');assert.ok(camera.zoom<1.08);}
  }
});

test('questions and quiet passages retain steady shared framing',()=>{
  assert.equal(typeof cinematicCamera,'function');
  const q={...scene,question:{answer:{text:'Share it.'}},staging:{...scene.staging,shot:'prop'}};
  const a=cinematicCamera(stageAt(130),q,slot,130,30,prepared.events,stageAt);
  const b=cinematicCamera(stageAt(175),q,slot,175,30,prepared.events,stageAt);
  assert.equal(a.shot,'shared');assert.equal(a.zoom,1);assert.deepEqual(a,b);
  const quiet={...scene,direction:'tender',staging:{...scene.staging,shot:'quiet'}};
  assert.ok(cinematicCamera(stageAt(90),quiet,slot,90,30,prepared.events,stageAt).zoom<=1.08);
});

test('hidden objects cannot attract camera or eye focus before their reveal',()=>{
  assert.equal(typeof cinematicGaze,'function');
  const hidden={...scene,staging:{...scene.staging,props:[{id:'apple',kind:'apple',owner:null,x:1450,y:826,hidden:true}],
    events:[{kind:'show',propId:'apple',line:1,actor:'friend'}]}};
  const p=prepareStage(hidden,slot),at=f=>sampleStage(p,f);
  for(const f of [0,30,60,99]) {
    assert.notEqual(cinematicCamera(at(f),hidden,slot,f,30,p.events,at).shot,'prop');
    assert.ok(cinematicGaze(at(f),hidden,slot,'character',f,30,p.events).gaze.y<2);
  }
  assert.equal(cinematicCamera(at(120),hidden,slot,120,30,p.events,at).shot,'prop');
});

test('the object is noticed before a handover and focus softens surrounding motion',()=>{
  assert.equal(typeof cinematicGaze,'function');assert.equal(typeof storyFocus,'function');
  const event=prepared.events[0];
  const before=cinematicGaze(stageAt(event.from-4),scene,slot,'character',event.from-4,30,prepared.events);
  assert.ok(before.gaze.y>0,'look down before the reaching paw makes contact');
  assert.ok(Math.abs(before.turn)>0);
  assert.ok(storyFocus(scene,slot,event.from+8,30,prepared.events)>.5);
  assert.equal(storyFocus(scene,slot,320,30,prepared.events),0);
});

test('eye turns ease through short interrupted dialogue and thinking boundaries',()=>{
  const short={...slot,lines:[line(0,'character'),line(8,'friend'),line(15,'character')],duration:110,holdFrom:100};
  const s={...scene,staging:{...scene.staging,events:[]}};
  const p=prepareStage(s,short),at=f=>sampleStage(p,f),look=f=>cinematicGaze(at(f),s,short,'character',f,30,[],at);
  for(let f=1;f<105;f++) {
    const a=look(f-1),b=look(f);
    assert.ok(Math.abs(a.gaze.x-b.gaze.x)<.45,`gaze jumped at ${f}`);
    assert.ok(Math.abs(a.turn-b.turn)<.07,`view jumped at ${f}`);
  }
  const expected=look(17);look(90);assert.deepEqual(look(17),expected);
  const q={...s,question:{answer:{text:'Helping!'}}};
  const questionSlot={...short,revealFrom:120};
  const qa=cinematicGaze(at(100),q,questionSlot,'character',100,30,[]);
  const qb=cinematicGaze(at(101),q,questionSlot,'character',101,30,[]);
  assert.ok(Math.abs(qa.gaze.y-qb.gaze.y)<.5);
});

test('emotional focus fades at speech boundaries without jumping the scenery',()=>{
  const s={...scene,staging:{...scene.staging,events:[]}};
  const timeline={...slot,lines:[line(20,'character','sad')],holdFrom:180};
  for(let f=1;f<160;f++)assert.ok(Math.abs(storyFocus(s,timeline,f,30)-storyFocus(s,timeline,f-1,30))<.2,`focus jumped at ${f}`);
  assert.ok(storyFocus(s,timeline,55,30)>.5);
  assert.equal(storyFocus(s,timeline,145,30),0);
});

test('version3 remains idempotent and keeps authored gags and quiet choices',()=>{
  const raw={slug:'v3-direction-test',presentationVersion:3,type:'story',title:'A Little Apple',palette:'meadow',mainCharacter:{kind:'bunny',name:'Taffy'},intro:null,outro:null,moral:null,
    scenes:[{...scene,staging:undefined,gag:{kind:'peek',character:'bear',atSec:1.2},camera:'still',lines:[{text:'I give Ben the apple.',speaker:'character',emotion:'happy',action:'idle'}]}]};
  const directed=directScript(raw);
  assert.equal(directed.opening,'hook');assert.equal(directed.scenes[0].camera,'still');
  assert.equal(directed.scenes[0].gag.kind,'peek');
  assert.deepEqual(directScript(directed),directed);
});

test('version3 preserves six voice identities and analytics uses its actual hook timeline',()=>{
  const settings=voiceSettings({presentationVersion:3,mainCharacter:{kind:'bunny',name:'Taffy'}});
  assert.equal(new Set(Object.values(settings.castVoices??{})).size,6);
  assert.equal(settings.cacheVersion,3);
  const script={slug:'v3',title:'V3',type:'story',presentationVersion:3,opening:'hook',intro:null,scenes:[{kind:'story',lines:[{text:'Here is our apple.',durationSec:3}],holdSec:0}]};
  const report=buildEngagementReport({script,analytics:{episodes:[{id:'v3',title:'V3',views:300}],retention:[],warnings:[]}});
  assert.equal(report.timeline.scenes[0].startFrame,0);
});
