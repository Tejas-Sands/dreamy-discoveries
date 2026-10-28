import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {directScript} from '../../scripts/lib/director.mjs';
import {probeMedia,runMedia} from '../../scripts/lib/media-check.mjs';
import {pipelineWorkspace,root} from '../helpers/pipeline-workspace.mjs';

test('real local Kokoro inference fills a cold voice store and reruns entirely from cache',{timeout:540000},t=>{
  const {file,write,read,run}=pipelineWorkspace(t,{modelDownloads:true});
  fs.mkdirSync(file('.cache'),{recursive:true});
  fs.mkdirSync(path.join(root,'.cache/models'),{recursive:true});
  fs.symlinkSync(path.join(root,'.cache/models'),file('.cache/models'),'dir');
  const slug='kokoro-local-smoke';
  write(`public/generated/${slug}/script.json`,directScript({slug,type:'story',title:'Local Voices',presentationVersion:4,opening:'welcome',
    palette:'meadow',mainCharacter:{kind:'bear',name:'Ben'},intro:{text:"Hi friends, I'm Ben! Welcome to our story!"},outro:{text:'Bye!'},moral:null,
    scenes:[{kind:'story',background:'meadow',character:'bear',secondCharacter:'duck',holdSec:0,
      lines:[{text:'Hello, Daisy!',speaker:'character'},{text:'Hello, Ben!',speaker:'friend'},
        {text:'Friends say hello.',speaker:'narrator'}]}]}));
  const check=JSON.parse(run('generate-audio',['--slug',slug,'--check']).stdout);
  assert.equal(check.engine,'kokoro');assert.equal(check.missing,5);
  const first=run('generate-audio',['--slug',slug],{timeout:480000});
  assert.match(first.stdout,/5 lines synthesized/);
  const generated=read(`public/generated/${slug}/script.json`),script=JSON.parse(generated);
  const lines=[script.intro,...script.scenes.flatMap(scene=>scene.lines),script.outro];
  assert.equal(new Set(lines.map(line=>line.audio)).size,5);
  for(const line of lines) {
    assert.ok(line.durationSec>.1&&line.durationSec<20);
    assert.ok(line.words.length>0);assert.ok(line.envelope);
    const audio=file(`public/generated/${slug}/${line.audio}`),stream=probeMedia(audio).streams[0];
    assert.equal(stream.codec_name,'pcm_f32le');assert.equal(Number(stream.sample_rate),24000);
    const result=runMedia('ffmpeg',['-hide_banner','-i',audio,'-af','volumedetect','-f','null','-']);
    const peak=result.stderr.match(/max_volume: (-?[\d.]+) dB/);
    assert.ok(peak&&Number(peak[1])>-10,'normalized speech must contain audible samples');
  }
  assert.equal(JSON.parse(run('generate-audio',['--slug',slug,'--check']).stdout).missing,0);
  assert.match(run('generate-audio',['--slug',slug]).stdout,/0 lines synthesized/);
  assert.equal(read(`public/generated/${slug}/script.json`),generated);
  t.diagnostic('Five real CPU syntheses covered welcome, hero, friend, narrator and goodbye without API keys.');
});
