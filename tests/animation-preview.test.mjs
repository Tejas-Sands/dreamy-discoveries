import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Module,{createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {directScript} from '../scripts/lib/director.mjs';
const previewPath=new URL('../scripts/preview-animation.mjs',import.meta.url);
const preview=fs.existsSync(previewPath)?await import(previewPath.href):{};
const require=createRequire(import.meta.url);
require.extensions['.ts']=require.extensions['.tsx']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2022}}).outputText,file);
let frame=15;
const sequences=[];
const originalLoad=Module._load;
Module._load=function(name,...args){
  if(name.startsWith('@remotion/google-fonts/'))return {loadFont:()=>({fontFamily:'sans-serif'})};
  if(name==='remotion')return {...originalLoad.call(this,name,...args),useCurrentFrame:()=>frame,useVideoConfig:()=>({fps:30,width:1920,height:1080,durationInFrames:2000}),Sequence:({children,...props})=>{sequences.push(props);return React.createElement(React.Fragment,null,children);},AbsoluteFill:({children,style})=>React.createElement('div',{style},children),Audio:props=>React.createElement('audio',{src:props.src}),Img:props=>React.createElement('img',props)};
  return originalLoad.call(this,name,...args);
};
const comparisonPath=new URL('../src/AnimationComparison.tsx',import.meta.url);
const comparison=fs.existsSync(comparisonPath)?require('../src/AnimationComparison.tsx'):{};
const {KidsVideo}=require('../src/KidsVideo.tsx');
const {TitleCard,Countdown,EndCard}=require('../src/components/Cards.tsx');
const {BrandOutro,BrandIntro}=require('../src/components/BrandOutro.tsx');
Module._load=originalLoad;
const {computeSchedule}=require('../src/lib/timing.ts');
const {getPalette}=require('../src/lib/palettes.ts');

test('zero-AI authored showcase covers six cast, six physical actions and safe resolution',()=>{
  assert.equal(typeof preview.animationPreview,'function');const s=preview.animationPreview();
  assert.equal(s.slug,'dev-animation-v3');assert.equal(s.presentationVersion,3);assert.equal(s.opening,'hook');assert.equal(s.intro,null);
  assert.deepEqual(new Set(s.scenes.flatMap(scene=>[scene.character,scene.secondCharacter]).filter(Boolean)),new Set(['bunny','bear','duck','fox','turtle','owl']));
  const kinds=new Set(s.scenes.flatMap(scene=>scene.staging?.events.map(e=>e.kind)??[]));for(const kind of ['push','roll','catch','open','water','build','give'])assert.ok(kinds.has(kind),kind);
  assert.equal(s.scenes[0].staging.events[0].kind,'roll');assert.equal(s.scenes[0].staging.events[0].line,0);assert.equal(s.scenes[0].staging.events[0].delaySec,0);
  assert.ok(s.scenes.some(scene=>scene.question));assert.equal(s.scenes.at(-1).direction,'lullaby');assert.ok(s.scenes.every(scene=>scene.gag===null));assert.equal(s.synthesis.engine,'kokoro');assert.equal(new Set(Object.values(s.synthesis.castVoices)).size,6);
  assert.deepEqual(preview.animationPreview(),s);assert.deepEqual(directScript(s),s);
  const seconds=computeSchedule(s).endFrom/30;assert.ok(seconds>=45&&seconds<=65,`${seconds}s untimed estimate`);
});

test('showcase writer creates exclusively, preserves existing voice timings and never touches latest/history',()=>{
  assert.equal(typeof preview.writeAnimationPreview,'function');
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'animation-preview-'));
  try {
    fs.writeFileSync(path.join(root,'latest.json'),'keep-latest');const file=preview.writeAnimationPreview('dev-preview-fixture',root);
    const s=JSON.parse(fs.readFileSync(file,'utf8'));s.scenes[0].lines[0].durationSec=7;fs.writeFileSync(file,JSON.stringify(s));const bytes=fs.readFileSync(file,'utf8');
    preview.writeAnimationPreview('dev-preview-fixture',root);assert.equal(fs.readFileSync(file,'utf8'),bytes);assert.equal(fs.readFileSync(path.join(root,'latest.json'),'utf8'),'keep-latest');assert.deepEqual(fs.readdirSync(root).sort(),['dev-preview-fixture','latest.json']);
    assert.throws(()=>preview.writeAnimationPreview('../escape',root));assert.throws(()=>preview.writeAnimationPreview('sample-share',root));
  } finally {fs.rmSync(root,{recursive:true,force:true});}
});

test('before comparison preserves the exact timeline and legacy events without changing the source',()=>{
  assert.equal(typeof comparison.comparisonBefore,'function');const after=preview.animationPreview(),bytes=JSON.stringify(after),before=comparison.comparisonBefore(after);
  assert.equal(before.presentationVersion,2);assert.deepEqual(computeSchedule(before),computeSchedule(after));assert.equal(JSON.stringify(after),bytes);
  assert.ok(before.scenes.flatMap(s=>s.staging.events).some(e=>e.kind==='give'));assert.ok(before.scenes.flatMap(s=>s.staging.events).every(e=>!['push','roll','catch','open','water','build'].includes(e.kind)));
  for(const scene of before.scenes)for(const p of scene.staging.props)for(const key of ['rotation','openProgress','buildProgress','waterAmount','watering'])assert.equal(p[key],undefined);
  before.scenes[0].lines[0].text='Changed';assert.notEqual(after.scenes[0].lines[0].text,'Changed');
});

test('comparison renders both real panels with only one audible copy and deterministic script state',()=>{
  assert.equal(typeof comparison.AnimationComparison,'function');const script=preview.animationPreview();for(const scene of script.scenes)for(const line of scene.lines)line.audio='audio/fixture.wav';
  const markup=renderToStaticMarkup(React.createElement(comparison.AnimationComparison,{slug:script.slug,script,baked:{}}));assert.match(markup,/Before/);assert.match(markup,/After/);assert.match(markup,/scale\(0\.5\)/);
  const single=renderToStaticMarkup(React.createElement(KidsVideo,{slug:script.slug,script,baked:{}}));assert.equal((markup.match(/<audio /g)??[]).length,(single.match(/<audio /g)??[]).length);assert.ok(markup.includes('Rolling')||markup.includes('roll'));
  assert.equal(typeof comparison.animationComparisonState,'function');const state=comparison.animationComparisonState(script,15);assert.deepEqual(comparison.animationComparisonState(script,15),state);assert.ok(state.props.some(p=>p.kind==='ball'));
});

test('muted video, title, countdown, endcard and brand remove all audio while defaults retain it',()=>{
  const script={slug:'dev-audio',type:'story',presentationVersion:2,opening:'title',title:'Hello',palette:'meadow',mainCharacter:{kind:'bunny',name:'Taffy'},intro:{text:'Hello!',audio:'audio/intro.wav',durationSec:1},outro:{text:'Bye!',audio:'audio/outro.wav',durationSec:1},music:{file:'story.wav',bpm:96,mood:'story'},scenes:[{kind:'story',background:'meadow',character:'bunny',lines:[{text:'Hello!',audio:'audio/line.wav',durationSec:1,sfx:['pop']}]}]};
  const palette=getPalette('meadow');
  for(const [Component,props] of [[KidsVideo,{slug:script.slug,script,baked:{}}],[TitleCard,{slug:script.slug,script,palette,countdownFrom:70,baked:{}}],[Countdown,{script,palette}],[EndCard,{slug:script.slug,script,palette,starsEarned:0,baked:{}}],[BrandOutro,{}]]){
    const draw=extension=>renderToStaticMarkup(React.createElement(Component,{...props,...extension}));assert.doesNotMatch(draw({muted:true}),/<audio /,Component.name);assert.match(draw({}),/<audio /,Component.name);assert.equal(draw({muted:false}),draw({}));
  }
});

test('welcome branding uses the existing logo/music and is silent in muted render chunks',()=>{
  assert.equal(typeof BrandIntro,'function');
  const draw=muted=>renderToStaticMarkup(React.createElement(BrandIntro,{muted}));
  frame=30;
  const first=draw(false);
  assert.match(first,/brand\/dreamy-d-original\.png/);
  assert.match(first,/brand\/dream-sky\.png/);
  assert.match(first,/sfx\/dreamy-outro\.wav/);
  assert.doesNotMatch(draw(true),/<audio /);
  frame=60;draw(false);frame=30;
  assert.equal(draw(false),first,'seeking into the opening must reproduce the same frame');
});

test('a welcome greeting stays visible and does not enter an absent countdown',()=>{
  frame=60;
  const script={slug:'dev-welcome',type:'story',presentationVersion:4,opening:'welcome',title:'Rocky and the Balloon',
    palette:'meadow',mainCharacter:{kind:'raccoon',name:'Rocky'},intro:{text:'Hi friends! I am Rocky!',audio:'intro.wav',durationSec:5},
    scenes:[{kind:'story',background:'park',character:'raccoon',lines:[]}]};
  const markup=renderToStaticMarkup(React.createElement(TitleCard,{script,palette:getPalette('meadow'),slug:script.slug,countdownFrom:-1,baked:{}}));
  const panel=markup.match(/<div style="([^"]*left:960px[^"]*width:770px[^"]*)"/);
  assert.ok(panel,'the greeting panel must be rendered');
  assert.doesNotMatch(panel[1],/opacity:0(?:;|$)/,'an absent countdown must not hide the welcome');
  assert.match(markup,/Hi friends! I am Rocky!/);
  assert.doesNotMatch(markup,/sfx\/intro\.wav/,'the title must not restart the channel sting');
});

test('the composition mounts logo, title/greeting and first story in separate ordered sequences',()=>{
  frame=30;sequences.length=0;
  const script={slug:'dev-welcome-phases',type:'story',presentationVersion:4,opening:'welcome',title:'Rocky and the Balloon',
    palette:'meadow',mainCharacter:{kind:'raccoon',name:'Rocky'},intro:{text:'Hi friends! I am Rocky!',audio:'intro.wav',durationSec:5},
    scenes:[{kind:'story',background:'park',character:'raccoon',transition:'none',lines:[{text:'Our story begins!',audio:'story.wav',durationSec:2}]}]};
  renderToStaticMarkup(React.createElement(KidsVideo,{script,slug:script.slug,baked:{}}));
  assert.equal(sequences.find(s=>s.name==='Channel welcome').durationInFrames,72);
  assert.equal(sequences.find(s=>s.name==='Title').from,72);
  assert.equal(sequences.find(s=>s.name.startsWith('Scene 1:')).from,270);
  assert.equal(sequences.find(s=>s.name==='greeting').from,30,'the greeting uses the local title clock');
  assert.ok(!sequences.some(s=>s.name==='Story title'||s.name==='Countdown'));
});

test('comparison metadata loads the measured script and caps both halves at the same endcard boundary',async()=>{
  assert.equal(typeof comparison.calculateAnimationComparisonMetadata,'function');const script=preview.animationPreview(),requests=[],originalFetch=globalThis.fetch;
  globalThis.fetch=async url=>{requests.push(String(url));return {ok:true,json:async()=>String(url).includes('script.json')?script:{}};};
  try {const metadata=await comparison.calculateAnimationComparisonMetadata({props:{slug:script.slug,script:null},abortSignal:new AbortController().signal,compositionId:'Animation-Comparison',isRendering:false});assert.equal(metadata.durationInFrames,computeSchedule(script).endFrom);assert.deepEqual(metadata.props.script,script);assert.ok(requests.some(url=>url.includes('generated/dev-animation-v3/script.json')));}finally{globalThis.fetch=originalFetch;}
});
