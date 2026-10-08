import fs from 'node:fs';
import path from 'node:path';
import {runMedia} from './media-check.mjs';

// Project mix targets; cached individual voice recordings are never modified.
export const MIX_TARGET={integrated:-16,truePeak:-2,range:11};
const target=`I=${MIX_TARGET.integrated}:TP=${MIX_TARGET.truePeak}:LRA=${MIX_TARGET.range}`;

export function parseLoudness(stderr) {
  const blocks=stderr.match(/\{[^{}]*\}/g)??[];
  let data;
  try {data=JSON.parse(blocks.at(-1));} catch {throw new Error('Missing FFmpeg loudness analysis');}
  if(data.input_i==='-inf'&&data.input_tp==='-inf')return {integrated:null,truePeak:null,range:0,threshold:null,offset:null,silent:true};
  const result=Object.fromEntries(Object.entries({integrated:'input_i',truePeak:'input_tp',range:'input_lra',threshold:'input_thresh',offset:'target_offset'})
    .map(([key,field])=>[key,Number(data[field])]));
  if(!Object.values(result).every(Number.isFinite))throw new Error('Invalid/non-finite FFmpeg loudness analysis');
  return result;
}

export function measureAudio(input) {
  return parseLoudness(runMedia('ffmpeg',['-hide_banner','-nostats','-i',input,'-vn','-af',`loudnorm=${target}:print_format=json`,'-f','null','-']).stderr);
}

export function masterAudio(input,output) {
  if(path.resolve(input)===path.resolve(output))throw new Error('Mastering requires a separate output; source audio is immutable');
  const before=measureAudio(input);
  fs.mkdirSync(path.dirname(output),{recursive:true});
  const temporary=path.join(path.dirname(output),`.${path.basename(output)}.mastering-${process.pid}.aac`);
  try {
    const args=['-y','-hide_banner','-loglevel','error','-i',input,'-vn'];
    if(!before.silent)args.push('-af',`loudnorm=${target}:measured_I=${before.integrated}:measured_TP=${before.truePeak}:measured_LRA=${before.range}:measured_thresh=${before.threshold}:offset=${before.offset}:linear=true`);
    args.push('-ar','48000','-c:a','aac','-b:a','192k','-f','adts',temporary);
    runMedia('ffmpeg',args);
    const after=measureAudio(temporary);
    if(!before.silent&&(after.silent||Math.abs(after.integrated-MIX_TARGET.integrated)>1||after.truePeak>-1.5))throw new Error('Mastered audio did not meet loudness/peak limits');
    fs.renameSync(temporary,output);
    return {version:1,target:MIX_TARGET,before,after,silent:!!before.silent};
  } finally {if(fs.existsSync(temporary))fs.unlinkSync(temporary);}
}
