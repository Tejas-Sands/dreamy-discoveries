import fs from 'node:fs';
import crypto from 'node:crypto';
import {speechEnvelope} from './speech-envelope.mjs';

/** Refine spelling-weighted estimates only where nearby measurable silence supports it. */
export function refineWords(words,durationSec,envelope) {
  if(!Number.isFinite(durationSec)||durationSec<=0)throw new Error('Speech duration must be positive');
  const input=Array.isArray(words)?words:[];
  const valid=input.every((word,i)=>Number.isFinite(word.start)&&Number.isFinite(word.end)&&word.start>=0&&word.end>word.start&&word.end<=durationSec&&(!i||word.start>=input[i-1].end));
  // Old or incomplete metadata must not turn a cache hit into a TTS failure.
  words=valid?input:input.map((word,i)=>({...word,start:durationSec*i/input.length,end:durationSec*(i+1)/input.length}));
  const result=words.map(word=>({...word}));
  if(!result.length||!envelope||!Number.isFinite(envelope.fps)||envelope.fps<=0||!Array.isArray(envelope.values)||!envelope.values.every(Number.isFinite))return result;
  const {values,fps}=envelope,voiced=values.map(value=>value>.05),first=voiced.indexOf(true),last=voiced.lastIndexOf(true);
  if(first<0)return result;
  const limit=.18,minimum=.02;
  const onset=Math.min(durationSec,first/fps),end=Math.min(durationSec,(last+1)/fps);
  if(Math.abs(onset-result[0].start)<=limit&&onset<result[0].end-minimum)result[0].start=onset;
  if(Math.abs(end-result.at(-1).end)<=limit&&end>result.at(-1).start+minimum)result.at(-1).end=end;
  const pauses=[];
  for(let index=first;index<=last;index++) {
    if(voiced[index])continue;
    const start=index;
    while(index<=last&&!voiced[index])index++;
    if((index-start)/fps>=.1)pauses.push({start:start/fps,end:index/fps});
  }
  for(let index=1;index<result.length;index++) {
    const left=result[index-1],right=result[index],boundary=(words[index-1].end+words[index].start)/2;
    const nearby=pauses.filter(pause=>Math.abs(pause.start-words[index-1].end)<=limit&&Math.abs(pause.end-words[index].start)<=limit&&
      pause.start>left.start+minimum&&pause.end<right.end-minimum).sort((a,b)=>Math.abs((a.start+a.end)/2-boundary)-Math.abs((b.start+b.end)/2-boundary));
    if(nearby[0]){left.end=nearby[0].start;right.start=nearby[0].end;}
  }
  return result.map(word=>({...word,start:+word.start.toFixed(4),end:+word.end.toFixed(4)}));
}

/** Kokoro WAVs: PCM16 or IEEE float32, optional RIFF chunks, any channel count. */
function wavEnvelope(buffer) {
  if(buffer.toString('ascii',0,4)!=='RIFF'||buffer.toString('ascii',8,12)!=='WAVE')return undefined;
  let format,channels,sampleRate,bits,align,data;
  for(let offset=12;offset+8<=buffer.length;) {
    const name=buffer.toString('ascii',offset,offset+4),size=buffer.readUInt32LE(offset+4),start=offset+8;
    if(start+size>buffer.length)return undefined;
    if(name==='fmt '&&size>=16) {
      format=buffer.readUInt16LE(start);channels=buffer.readUInt16LE(start+2);sampleRate=buffer.readUInt32LE(start+4);
      align=buffer.readUInt16LE(start+12);bits=buffer.readUInt16LE(start+14);
      if(format===65534&&size>=40)format=buffer.readUInt16LE(start+24);
    }
    if(name==='data')data=buffer.subarray(start,start+size);
    offset=start+size+(size%2);
  }
  if(!data||!channels||!sampleRate||!((format===1&&bits===16)||(format===3&&bits===32))||align!==channels*bits/8)return undefined;
  const samples=new Float32Array(Math.floor(data.length/align)),bytes=bits/8;
  for(let i=0;i<samples.length;i++)for(let channel=0;channel<channels;channel++) {
    const offset=i*align+channel*bytes;
    const value=format===1?data.readInt16LE(offset)/32768:data.readFloatLE(offset);
    if(!Number.isFinite(value))return undefined;
    samples[i]+=value/channels;
  }
  return speechEnvelope(samples,sampleRate);
}

/** Add-only sidecar identity includes input bytes/text and the analysis version. */
export function timingForVoice({audio,meta,text,onCreate}) {
  const bytes=fs.readFileSync(audio),metadata=fs.readFileSync(meta),entry=JSON.parse(metadata);
  const hash=crypto.createHash('sha256').update(bytes).update(metadata).update(text).digest('hex').slice(0,20);
  const sidecar=`${meta}.timing-v1-${hash}.json`;
  if(fs.existsSync(sidecar))return JSON.parse(fs.readFileSync(sidecar,'utf8'));
  const envelope=entry.envelope??wavEnvelope(bytes);
  const result={words:refineWords(entry.words,entry.durationSec,envelope),...(envelope?{envelope}:{})};
  try {fs.writeFileSync(sidecar,JSON.stringify(result),{flag:'wx'});onCreate?.();}
  catch(error){if(error.code!=='EEXIST')throw error;}
  return result;
}
