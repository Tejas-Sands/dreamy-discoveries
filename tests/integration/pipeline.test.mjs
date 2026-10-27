import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {directScript} from '../../scripts/lib/director.mjs';
import {collectUtterances,voiceHash,voiceSettings} from '../../scripts/lib/voice.mjs';
import {estimateFrames} from '../../scripts/lib/estimate.mjs';
import {measureAudio} from '../../scripts/lib/audio-master.mjs';
import {probeMedia,verifyEpisode} from '../../scripts/lib/media-check.mjs';
import {pipelineWorkspace,root} from '../helpers/pipeline-workspace.mjs';

const digest=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

test('directed script → cached speech → real Remotion audio/chunks → stitch and verified video', {timeout:540000},t=>{
  const {file,write,read,run}=pipelineWorkspace(t);
  const slug='integration-story';
  // Short scenes exercise dialogue, narration, overlapping SFX, music and the
  // full end card/logo. The Director remains part of the production path.
  const script=directScript({slug,type:'story',title:'Ben Shares a Ball',presentationVersion:4,palette:'meadow',
    mainCharacter:{kind:'bear',name:'Ben'},intro:null,outro:{text:'Goodbye, friends!'},moral:null,
    scenes:[
      {kind:'story',background:'meadow',character:'bear',secondCharacter:'bunny',energy:'upbeat',holdSec:0,
        lines:[{text:'Here is our ball!',speaker:'character',action:'cheer',sfx:['tada']}]},
      {kind:'story',background:'forest',character:'bunny',secondCharacter:'bear',energy:'calm',holdSec:0,
        lines:[{text:'Friends take turns.',speaker:'narrator',action:'nod'}]},
    ]});
  // Pin the fixture independently of the developer's .env engine/voice choices.
  script.synthesis=voiceSettings({...script,synthesis:{engine:'kokoro',castVoices:{}}},
    {voice:'am_michael',narratorVoice:'af_bella',speed:.95});
  write(`library/scripts/${slug}.json`,script);
  const permanent=read(`library/scripts/${slug}.json`);
  const history=read('library/universe.json');
  const settings=script.synthesis;
  const recording=path.join(root,'public/generated/sample-share/line-bc3bc97310.wav');
  const duration=Number(probeMedia(recording).format.duration);
  for(const {text,voice} of collectUtterances(script,settings)) {
    const key=voiceHash(settings,voice,text);
    write(`.cache/voice/${key}.wav`,fs.readFileSync(recording));
    write(`.cache/voice/${key}.json`,{text,durationSec:duration,words:[]});
  }
  const cache=()=>fs.readdirSync(file('.cache/voice')).sort().map(name=>[name,digest(file(`.cache/voice/${name}`))]);
  const cached=cache();
  run('plan',['--slug',slug,'--dry']);
  assert.equal(JSON.parse(run('generate-audio',['--slug',slug,'--check']).stdout).missing,0);
  assert.match(run('generate-audio',['--slug',slug]).stdout,/0 lines synthesized/);
  const warmed=cache();
  for(const [name,hash] of cached)assert.equal(digest(file(`.cache/voice/${name}`)),hash,'existing recordings and metadata must be immutable');
  const generated=read(`public/generated/${slug}/script.json`);
  assert.match(run('generate-audio',['--slug',slug]).stdout,/0 lines synthesized/);
  assert.equal(read(`public/generated/${slug}/script.json`),generated);
  assert.deepEqual(cache(),warmed,'warm-cache reruns must not change recordings or timing sidecars');
  const frames=estimateFrames(JSON.parse(generated));
  const audio=file(`out/episodes/${slug}.aac`);
  run('render',['--slug',slug,'--audio-only','--out',audio]);
  const loudness=measureAudio(audio);
  assert.ok(Math.abs(loudness.integrated+16)<=1,JSON.stringify(loudness));
  assert.ok(loudness.truePeak<=-1.5,JSON.stringify(loudness));
  assert.equal(JSON.parse(read(`out/episodes/${slug}.aac.loudness.json`)).silent,false);
  for(const index of [0,1]) {
    const range=run('plan',['--slug',slug,'--range',`${index}/2`]).stdout.trim();
    assert.match(range,/^\d+-\d+$/);
    run('render',['--slug',slug,'--frames',range,'--muted','--scale','0.25',
      '--out',file(`out/chunks/${slug}/chunk-${index}.mp4`)]);
  }
  run('stitch',['--slug',slug,'--expected-chunks','2']);
  const video=file(`out/episodes/${slug}.mp4`),verified=verifyEpisode(video,{frames});
  assert.equal(verified.video.width,480);assert.equal(verified.video.height,270);
  assert.equal(verified.video.frames,frames);assert.equal(verified.audio.codec,'aac');
  for(const extension of ['png','metadata.txt','mp4.verification.json']) {
    assert.ok(fs.statSync(file(`out/episodes/${slug}.${extension}`)).size>0,extension);
  }
  const before=digest(video);
  // Exercise real failure boundaries after a successful output exists.
  assert.match(run('stitch',['--slug',slug,'--expected-chunks','3'],{success:false}).stderr,/chunks/i);
  const audioBytes=fs.readFileSync(audio);
  fs.writeFileSync(audio,'corrupted cached track');
  assert.match(run('stitch',['--slug',slug,'--expected-chunks','2'],{success:false}).stderr,/mismatched|stale/i);
  assert.equal(digest(video),before,'invalid retries must preserve the verified episode');
  fs.writeFileSync(audio,audioBytes);
  run('stitch',['--slug',slug,'--expected-chunks','2','--no-thumbnail']);
  assert.equal(digest(video),before,'stitching the same artifacts must be repeatable');
  assert.equal(read(`library/scripts/${slug}.json`),permanent);
  assert.equal(read('library/universe.json'),history,'integration checks must never publish or record production history');

  // Legacy episodes keep their existing direct-AAC path and audio timing.
  write(`public/generated/${slug}/script.json`,{...JSON.parse(generated),presentationVersion:3});
  const legacy=file('out/episodes/legacy.aac');
  run('render',['--slug',slug,'--audio-only','--out',legacy]);
  assert.equal(probeMedia(legacy).streams[0].codec_name,'aac');
  assert.equal(fs.existsSync(`${legacy}.render.json`),true);
  assert.equal(fs.existsSync(`${legacy}.loudness.json`),false);
  t.diagnostic(`Verified ${frames} frames, ${loudness.integrated} LUFS, ${loudness.truePeak} dBTP; no API credentials or publication.`);
});
