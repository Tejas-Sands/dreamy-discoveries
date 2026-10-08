import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {ROOT} from './common.mjs';
import {chunkRanges} from './estimate.mjs';

export function ffmpegBin() {
  const bundled=path.join(ROOT,'node_modules/@remotion/compositor-linux-x64-gnu/ffmpeg');
  return fs.existsSync(bundled)?bundled:'ffmpeg';
}

export function runMedia(binary,args) {
  const result=spawnSync(binary,args,{encoding:'utf8',maxBuffer:4*1024*1024});
  if(result.error)throw new Error(`${path.basename(binary)} could not start: ${result.error.message}`);
  if(result.status!==0)throw new Error(`${path.basename(binary)} failed: ${(result.stderr||'').slice(-3000)}`);
  return result;
}

export function probeMedia(file) {
  if(!fs.existsSync(file)||!fs.statSync(file).size)throw new Error(`Missing or empty media: ${file}`);
  const result=runMedia('ffprobe',['-v','error','-count_frames','-show_streams','-show_format','-of','json',file]);
  if(result.stderr.trim())throw new Error(`ffprobe found corrupt media ${file}: ${result.stderr.slice(-2000)}`);
  return JSON.parse(result.stdout);
}

const rate=value=>{const [n,d=1]=String(value).split('/').map(Number);return n/d;};
const videoInfo=stream=>({frames:Number(stream.nb_read_frames??stream.nb_frames),fps:rate(stream.avg_frame_rate),
  width:stream.width,height:stream.height,codec:stream.codec_name,pixelFormat:stream.pix_fmt});

export function audioDuration(stream,format) {
  // Raw ADTS duration is bitrate-estimated. Decoded AAC frames are exact (1024 samples).
  if(stream.codec_name==='aac'&&Number(stream.nb_read_frames)>0)return Number(stream.nb_read_frames)*1024/Number(stream.sample_rate);
  return Number(stream.duration??format?.duration);
}

function checkVideo(video,frames,fps,label) {
  if(!Number.isInteger(frames)||frames<1||!Number.isFinite(fps)||fps<=0)throw new Error('Expected frames/fps must be positive');
  if(video.frames!==frames)throw new Error(`${label}: video frame count ${video.frames}; expected ${frames}`);
  if(!Number.isFinite(video.fps)||Math.abs(video.fps-fps)>0.001)throw new Error(`${label}: video frame rate ${video.fps}; expected ${fps}`);
}

export function validateChunks(files,{frames,count=files.length,fps=30}) {
  if(!Number.isInteger(count)||count<1||files.length!==count)throw new Error(`Expected ${count} chunks, found ${files.length}`);
  const ranges=chunkRanges(frames,count);
  if(ranges.length!==count)throw new Error('More chunks than expected video frames');
  let geometry;
  return files.map((file,index)=>{
    if(path.basename(file)!==`chunk-${index}.mp4`)throw new Error(`Expected chunk-${index}.mp4, found ${path.basename(file)}`);
    const data=probeMedia(file),stream=data.streams.find(s=>s.codec_type==='video');
    if(!stream)throw new Error(`Chunk has no video: ${file}`);
    const video=videoInfo(stream),[start,end]=ranges[index].split('-').map(Number);
    checkVideo(video,end-start+1,fps,file);
    const shape=JSON.stringify([video.width,video.height,video.codec,video.pixelFormat,stream.time_base]);
    if(geometry&&geometry!==shape)throw new Error(`Incompatible chunk geometry or encoding: ${file}`);
    geometry=shape;
    return {file:path.basename(file),from:start,to:end,...video};
  });
}

export function verifyEpisode(file,{frames,fps=30,decode=true}) {
  const data=probeMedia(file),v=data.streams.filter(s=>s.codec_type==='video'),a=data.streams.filter(s=>s.codec_type==='audio');
  if(v.length!==1)throw new Error('Episode must contain exactly one video stream');
  if(a.length!==1)throw new Error('Episode must contain exactly one audio stream');
  const video=videoInfo(v[0]); checkVideo(video,frames,fps,file);
  const expected=frames/fps,duration=Number(data.format.duration),audio={duration:audioDuration(a[0],data.format),codec:a[0].codec_name,sampleRate:Number(a[0].sample_rate)};
  if(!Number.isFinite(audio.duration)||Math.abs(audio.duration-expected)>0.15)throw new Error(`Audio duration ${audio.duration}s differs from expected ${expected}s`);
  if(!Number.isFinite(duration)||Math.abs(duration-expected)>0.15)throw new Error(`Container duration ${duration}s differs from expected ${expected}s`);
  if(decode) {
    const result=runMedia('ffmpeg',['-hide_banner','-v','error','-xerror','-i',file,'-map','0:v:0','-map','0:a:0','-f','null','-']);
    if(result.stderr.trim())throw new Error(`Episode decode failed: ${result.stderr.slice(-2000)}`);
  }
  return {version:1,file:path.basename(file),video,audio,duration,decoded:decode};
}
