import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import ts from 'typescript';
import YAML from 'yaml';
import * as director from '../scripts/lib/director.mjs';
import {estimateFrames} from '../scripts/lib/estimate.mjs';
import {voiceSettings,collectUtterances,voiceHash} from '../scripts/lib/voice.mjs';
import {summarizeScript} from '../scripts/lib/catalog.mjs';
import {chooseStandby} from '../scripts/lib/standby.mjs';
import {buildEngagementReport} from '../scripts/lib/engagement-report.mjs';
import {pipelineWorkspace,root} from './helpers/pipeline-workspace.mjs';

const require=createRequire(import.meta.url);
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
}).outputText,file);
const {computeSchedule}=require('../src/lib/timing.ts');
const {scoreSections,scoreVolume}=require('../src/lib/score.ts');
const raw={slug:'opening-story',type:'story',title:'Rocky Shares a Ball',presentationVersion:4,palette:'meadow',
  mainCharacter:{kind:'raccoon',name:'Rocky'},intro:null,outro:{text:'Goodbye, friends!'},moral:null,
  scenes:[{kind:'story',background:'park',character:'raccoon',secondCharacter:'squirrel',holdSec:0,
    lines:[{text:'Our ball is rolling away!',speaker:'character',action:'point'}]}]};

test('a welcome reserves the logo, finishes its greeting, then starts the story without a countdown',()=>{
  const script={...raw,opening:'welcome',intro:{text:'Hi friends! I am Rocky.',durationSec:5}};
  const schedule=computeSchedule(script);
  assert.equal(schedule.brandIntro,72);
  assert.equal(schedule.intro,270);
  assert.equal(schedule.countdownFrom,-1);
  assert.equal(schedule.scenes[0].from,270);
  assert.deepEqual(schedule.voice[0],[102,252]);
  assert.ok(schedule.voice[0][1]<schedule.scenes[0].from);
  assert.equal(estimateFrames(script),schedule.total);
  const sections=scoreSections(script,schedule);
  assert.equal(sections[0].from,72,'the story score must not play over the logo signature');
  assert.equal(scoreVolume(30,sections[0],script,schedule),0);
  assert.ok(scoreVolume(110,sections[0],script,schedule)<scoreVolume(80,sections[0],script,schedule));
});

test('long greetings and pinned reaction recordings cannot overlap the first story line',()=>{
  for(const [speech,pre,post] of [[12,0,0],[2.1,1.2,.4]]) {
    const intro={text:'Hello friends!',durationSec:speech,voxPreSec:pre,voxPostSec:post,
      vox:[{kind:'giggle',at:'start',file:'giggle.wav'}]};
    const script={...raw,opening:'welcome',intro};
    const schedule=computeSchedule(script);
    const greetingEnd=72+Math.max(30,Math.round(pre*30))+Math.round(speech*30)+Math.round(post*30);
    assert.equal(schedule.voice[0][1],greetingEnd);
    assert.equal(schedule.scenes[0].from,greetingEnd+18);
    assert.equal(estimateFrames(script),schedule.total);
  }
});

test('the Director preserves welcome mode and authors one reusable hero greeting',()=>{
  const script=director.directScript({...raw,opening:'welcome'});
  assert.equal(script.opening,'welcome');
  assert.match(script.intro.text,/Rocky/);
  assert.match(script.intro.text,/Dreamy Discoveries/);
  assert.equal(script.intro.speaker,'character');
  assert.deepEqual(director.directScript(script),script);
});

test('a new welcome story still stages its first rolling-object problem on the ground',()=>{
  const scene={kind:'story',background:'park',character:'raccoon',secondCharacter:'squirrel',prop:'ball',
    lines:[{text:'Oops! My ball is rolling away!',speaker:'character',action:'point'}]};
  const script=director.directScript({...raw,opening:'welcome',scenes:[scene]});
  const stage=script.scenes[0].staging;
  assert.ok(stage.events.some(event=>event.kind==='roll'&&event.line===0),'the welcome must not suppress the first story action');
  assert.equal(stage.props.find(prop=>prop.kind==='ball').owner,null);
  const question=director.directScript({...raw,opening:'welcome',scenes:[{...scene,
    lines:[{text:'Is my ball rolling away?',speaker:'character',action:'point'}]}]});
  assert.ok(!question.scenes[0].staging.events.some(event=>event.kind==='roll'));
});

test('welcome revisions preserve the source, its spoken story and all existing voice identities',()=>{
  assert.equal(typeof director.welcomeRevision,'function');
  const source=JSON.parse(JSON.stringify(director.directScript({...raw,opening:'hook'})));
  source.synthesis=voiceSettings({...source,synthesis:{engine:'kokoro',castVoices:{}}},{voice:'am_michael',speed:.95});
  const before=JSON.stringify(source);
  const revised=director.welcomeRevision(source);
  assert.equal(revised.slug,'opening-story-welcome');
  assert.equal(revised.revisionOf,'opening-story');
  assert.equal(revised.opening,'welcome');
  assert.deepEqual(revised.scenes,source.scenes);
  assert.deepEqual(revised.synthesis,source.synthesis);
  const directed=director.directScript(revised);
  const keys=s=>collectUtterances(s,source.synthesis).map(({text,voice})=>voiceHash(source.synthesis,voice,text));
  for(const key of keys(source))assert.ok(keys(directed).includes(key));
  assert.equal(keys(directed).length,keys(source).length+1);
  assert.equal(JSON.stringify(source),before);
  assert.equal(JSON.stringify(director.welcomeRevision(directed)),JSON.stringify(directed),'a saved retry must not change the revision');
  const rhyme={...raw,type:'rhyme'};
  assert.deepEqual(director.welcomeRevision(rhyme),rhyme);
});

test('local scene reports include the complete welcome before assigning story timestamps',()=>{
  const script={...raw,opening:'welcome',intro:{text:'Hello friends!',durationSec:5}};
  const report=buildEngagementReport({script,analytics:{episodes:[],retention:[]}});
  assert.equal(report.timeline.scenes[0].startFrame,270);
  assert.equal(report.timeline.durationSec,692/30);
});

test('planning a scheduled welcome creates one immutable revision and needs only its new greeting',t=>{
  const {file,write,read,run}=pipelineWorkspace(t);
  const source=director.directScript({...raw,opening:'hook'});
  source.synthesis=voiceSettings({...source,synthesis:{engine:'kokoro',castVoices:{}}},{voice:'am_michael',speed:.95});
  write(`library/scripts/${source.slug}.json`,source);
  const original=read(`library/scripts/${source.slug}.json`);
  for(const {text,voice} of collectUtterances(source,source.synthesis)) {
    const key=voiceHash(source.synthesis,voice,text);
    write(`.cache/voice/${key}.wav`,'existing cached speech');
    write(`.cache/voice/${key}.json`,{text,durationSec:2,words:[]});
  }
  const planned=run('plan',['--slug',source.slug,'--welcome','--library']);
  assert.match(planned.stdout,/slug=opening-story-welcome/);
  assert.match(planned.stdout,/voice_missing=1(?:\s|$)/);
  const revision=read('library/scripts/opening-story-welcome.json');
  assert.equal(JSON.parse(revision).revisionOf,source.slug);
  assert.equal(read(`library/scripts/${source.slug}.json`),original);
  run('plan',['--slug',source.slug,'--welcome','--library']);
  assert.equal(read('library/scripts/opening-story-welcome.json'),revision);
  const old=run('plan',['--slug',source.slug,'--dry']);
  assert.match(old.stdout,/slug=opening-story(?:\s|$)/);
  assert.match(old.stdout,/voice_missing=0(?:\s|$)/);
  run('lib/universe',['--record','opening-story-welcome','--status','rendered']);
  assert.equal(JSON.parse(read('library/universe.json')).stories.find(story=>story.id==='opening-story-welcome').revisionOf,source.slug);
  write('library/scripts/collision-welcome.json',{...source,slug:'collision-welcome',revisionOf:'someone-else'});
  write('library/scripts/collision.json',{...source,slug:'collision'});
  const occupied=read('library/scripts/collision-welcome.json');
  assert.match(run('plan',['--slug','collision','--welcome','--library'],{success:false}).stderr,/revision|belongs|collision/i);
  assert.equal(read('library/scripts/collision-welcome.json'),occupied);
  assert.ok(fs.existsSync(file('.cache/voice')));
});

test('a released welcome consumes its original standby story in both durable histories',()=>{
  const entries=[{...raw,slug:'reserve-a'},{...raw,slug:'reserve-b'}];
  const revision={...raw,slug:'reserve-a-welcome',revisionOf:'reserve-a'};
  const summary=summarizeScript(revision);
  assert.equal(summary.revisionOf,'reserve-a');
  assert.equal(chooseStandby(entries,[summary]).slug,'reserve-b');
  assert.equal(chooseStandby(entries,[],[{id:revision.slug,revisionOf:'reserve-a',status:'rendered'}]).slug,'reserve-b');
});

test('scheduled stories opt into welcome revisions while a normal manual slug rerun stays explicit',t=>{
  const make=YAML.parse(fs.readFileSync(path.join(root,'.github/workflows/make-video.yml'),'utf8'));
  const schedule=YAML.parse(fs.readFileSync(path.join(root,'.github/workflows/schedule.yml'),'utf8'));
  assert.equal(schedule.jobs.make.with.welcome,true);
  assert.equal(make.on.workflow_dispatch.inputs.welcome.default,false);
  assert.equal(make.on.workflow_call.inputs.welcome.default,false);
  const {file,write}=pipelineWorkspace(t);
  write('bin/node','#!/bin/bash\nprintf "%s\\n" "$@" > "$OPENING_ARGS"\n');
  fs.chmodSync(file('bin/node'),0o755);
  const step=make.jobs.plan.steps.find(step=>step.id==='script');
  for(const enabled of ['true','false']) {
    const result=spawnSync('/bin/bash',['-e','-c',step.run],{encoding:'utf8',cwd:root,
      env:{...process.env,PATH:`${file('bin')}:${process.env.PATH}`,OPENING_ARGS:file('args'),
        TARGET_MINUTES:'5.5',IN_SLUG:'saved-story',IN_WELCOME:enabled,IN_VOICE:'',IN_PREVIEW:'false'}});
    assert.ifError(result.error);assert.equal(result.status,0,result.stderr);
    const args=fs.readFileSync(file('args'),'utf8').trim().split('\n');
    assert.equal(args.includes('--welcome'),enabled==='true');
    assert.ok(args.includes('saved-story'));
  }
});
