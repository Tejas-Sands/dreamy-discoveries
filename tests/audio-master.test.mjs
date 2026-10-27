import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {ffmpegBin} from '../scripts/lib/media-check.mjs';
const url=new URL('../scripts/lib/audio-master.mjs',import.meta.url);
const audio=fs.existsSync(url)?await import(url.href):{};

test('mastering measures levels and produces bounded audio without changing its input',t=>{
  assert.equal(typeof audio.masterAudio,'function');
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'dreamy-master-'));
  t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const input=path.join(directory,'voice.wav'),out=path.join(directory,'master.aac');
  const made=spawnSync('ffmpeg',['-v','error','-f','lavfi','-i','sine=frequency=440:duration=3','-af','volume=0.25',input]);
  assert.ifError(made.error);assert.equal(made.status,0);
  const before=fs.readFileSync(input),result=audio.masterAudio(input,out);
  assert.deepEqual(fs.readFileSync(input),before);
  assert.ok(Math.abs(result.after.integrated+16)<1,JSON.stringify(result));
  assert.ok(result.after.truePeak<=-1.5,JSON.stringify(result));
  assert.ok(fs.statSync(out).size>0);
  const repeat=audio.masterAudio(input,path.join(directory,'repeat.aac'));
  assert.deepEqual(repeat,result);
  assert.deepEqual(fs.readFileSync(out),fs.readFileSync(path.join(directory,'repeat.aac')));
});

test('silent mixes remain silent and malformed loudness results fail explicitly',t=>{
  assert.equal(typeof audio.masterAudio,'function');
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dreamy-silent-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const input=path.join(dir,'silent.wav'),out=path.join(dir,'silent.aac');
  const made=spawnSync('ffmpeg',['-v','error','-f','lavfi','-i','anullsrc=r=48000:cl=mono','-t','1',input]);
  assert.equal(made.status,0);
  assert.equal(audio.masterAudio(input,out).silent,true);
  assert.throws(()=>audio.parseLoudness('not JSON'),/loudness/i);
  assert.throws(()=>audio.parseLoudness('{"input_i":"oops"}'),/loudness/i);
});

test('mastering meets its targets without depending on host FFmpeg',t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dreamy-pinned-master-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const input=path.join(dir,'voice.wav'),out=path.join(dir,'master.aac');
  const made=spawnSync(ffmpegBin(),['-v','error','-f','lavfi','-i','sine=frequency=440:duration=3',input]);
  assert.ifError(made.error);assert.equal(made.status,0,String(made.stderr));
  const source=`import {masterAudio} from ${JSON.stringify(url.href)}; console.log(JSON.stringify(masterAudio(process.argv[1],process.argv[2])));`;
  const result=spawnSync(process.execPath,['--input-type=module','-e',source,input,out],{
    encoding:'utf8',env:{...process.env,PATH:dir},
  });
  assert.ifError(result.error);assert.equal(result.status,0,result.stderr);
  const report=JSON.parse(result.stdout);
  assert.ok(Math.abs(report.after.integrated+16)<=1,JSON.stringify(report));
  assert.ok(report.after.truePeak<=-1.5,JSON.stringify(report));
  assert.ok(fs.statSync(out).size>0);
});

// A sine-only fixture cannot expose AAC ringing around sharp sound effects.
// This deterministic 20ms burst reproduces the scheduled episode's failure.
for(const [frequency,channels] of [[7000,1],[5000,2]]) test(`AAC transient mixes meet decoded loudness and peak limits (${frequency}Hz, ${channels} channel)`,t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dreamy-aac-transient-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const input=path.join(dir,'transients.wav'),out=path.join(dir,'master.aac');
  const signal=`0.1*sin(2*PI*440*n/48000)+if(lt(mod(n\\,24000)\\,960)\\,0.8*sin(2*PI*${frequency}*n/48000)\\,0)`;
  const made=spawnSync('ffmpeg',['-v','error','-f','lavfi','-i',`aevalsrc=${signal}:s=48000:d=6`,'-ac',String(channels),input],{encoding:'utf8'});
  assert.ifError(made.error);assert.equal(made.status,0,made.stderr);
  const original=fs.readFileSync(input);
  const report=audio.masterAudio(input,out);
  const decoded=audio.measureAudio(out);
  assert.ok(Math.abs(decoded.integrated+16)<=1,JSON.stringify(report));
  assert.ok(decoded.truePeak<=-1.5,JSON.stringify(report));
  assert.ok(report.attempts>=(channels===1?2:1)&&report.attempts<=3,JSON.stringify(report));
  assert.deepEqual(fs.readFileSync(input),original,'correction must re-encode the source without modifying it');
  assert.deepEqual(fs.readdirSync(dir).sort(),['master.aac','transients.wav']);
});

test('invalid and too-short inputs preserve the previous output',t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dreamy-master-failure-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const input=path.join(dir,'bad.wav'),out=path.join(dir,'existing.aac');
  fs.writeFileSync(out,'previous verified audio');
  fs.writeFileSync(input,'not a recording');
  assert.throws(()=>audio.masterAudio(input,out),/ffmpeg|invalid/i);
  assert.equal(fs.readFileSync(out,'utf8'),'previous verified audio');
  assert.throws(()=>audio.masterAudio(out,out),/separate output/i);
  // A clip shorter than the loudness measurement window is not digital silence.
  const short=path.join(dir,'short.wav');
  const made=spawnSync('ffmpeg',['-v','error','-f','lavfi','-i','sine=frequency=440:duration=0.1',short]);
  assert.ifError(made.error);assert.equal(made.status,0);
  assert.throws(()=>audio.masterAudio(short,out),/loudness|finite/i);
  assert.equal(fs.readFileSync(out,'utf8'),'previous verified audio');
  assert.equal(fs.readdirSync(dir).some(file=>file.includes('mastering-')),false);
});

test('exhausted correction stops after three encodes and preserves source and prior output',t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dreamy-master-exhausted-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const input=path.join(dir,'voice.wav'),out=path.join(dir,'existing.aac');
  const made=spawnSync('ffmpeg',['-v','error','-f','lavfi','-i','sine=frequency=440:duration=3',input]);
  assert.ifError(made.error);assert.equal(made.status,0);
  const original=fs.readFileSync(input);fs.writeFileSync(out,'previous verified audio');
  // Real source measurement and real encodes; inject an analyzer that keeps
  // reporting an unacceptable decoded peak to exercise the exhaustion branch.
  const source=`
    import cp from 'node:child_process';
    import assert from 'node:assert/strict';
    import {syncBuiltinESMExports} from 'node:module';
    const real=cp.spawnSync;let encodes=0;
    cp.spawnSync=(command,args,options)=>{
      if(args.includes('192k'))encodes++;
      const measured=args[args.indexOf('-i')+1];
      if(args.includes('null')&&measured.includes('.mastering-'))return {status:0,stdout:'',stderr:JSON.stringify({
        input_i:'-16',input_tp:'0',input_lra:'0',input_thresh:'-26',target_offset:'0'
      })};
      return real(command,args,options);
    };
    syncBuiltinESMExports();
    const {masterAudio}=await import(${JSON.stringify(url.href)});
    assert.throws(()=>masterAudio(process.argv[1],process.argv[2]),/after correction/);
    console.log(JSON.stringify({encodes}));
  `;
  const result=spawnSync(process.execPath,['--input-type=module','-e',source,input,out],{
    encoding:'utf8',timeout:30000,env:{...process.env,NODE_TEST_CONTEXT:''},
  });
  assert.ifError(result.error);assert.equal(result.status,0,result.stderr);
  assert.equal(JSON.parse(result.stdout).encodes,3);
  assert.deepEqual(fs.readFileSync(input),original);
  assert.equal(fs.readFileSync(out,'utf8'),'previous verified audio');
  assert.deepEqual(fs.readdirSync(dir).sort(),['existing.aac','voice.wav']);
});
