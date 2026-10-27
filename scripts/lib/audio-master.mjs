import fs from 'node:fs';
import path from 'node:path';
import {ffmpegBin,runMedia} from './media-check.mjs';

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
  return parseLoudness(runMedia(ffmpegBin(),['-hide_banner','-nostats','-i',input,'-vn','-af',`loudnorm=${target}:print_format=json`,'-f','null','-']).stderr);
}

export function masterAudio(input,output) {
  if(path.resolve(input)===path.resolve(output))throw new Error('Mastering requires a separate output; source audio is immutable');
  const before=measureAudio(input);
  fs.mkdirSync(path.dirname(output),{recursive:true});
  const temporary=path.join(path.dirname(output),`.${path.basename(output)}.mastering-${process.pid}.aac`);
  try {
    let peak=MIX_TARGET.truePeak,offset=before.offset,after;
    for(let attempts=1;attempts<=3;attempts++) {
      const args=['-y','-hide_banner','-loglevel','error','-i',input,'-vn'];
      if(!before.silent)args.push('-af',`loudnorm=I=${MIX_TARGET.integrated}:TP=${peak}:LRA=${MIX_TARGET.range}:measured_I=${before.integrated}:measured_TP=${before.truePeak}:measured_LRA=${before.range}:measured_thresh=${before.threshold}:offset=${offset}:linear=true`);
      args.push('-ar','48000','-c:a','aac','-b:a','192k','-f','adts',temporary);
      runMedia(ffmpegBin(),args);
      after=measureAudio(temporary);
      if(before.silent||!after.silent&&Math.abs(after.integrated-MIX_TARGET.integrated)<=1&&after.truePeak<=-1.5) {
        fs.renameSync(temporary,output);
        return {version:1,target:MIX_TARGET,before,after,silent:!!before.silent,attempts};
      }
      if(after.silent)break;
      // AAC can reconstruct peaks above the PCM limiter ceiling, even with the
      // pinned encoder. Correct measured overshoot, always from the original mix.
      const reduction=Math.max(0,after.truePeak-(-1.75)); // 0.25 dB below the acceptance limit.
      peak=Math.max(-9,peak-reduction);
      // A lower limiter ceiling can lower loudness too; compensate on the next
      // source encode and validate both measurements again, rather than scaling AAC.
      offset=Math.max(-99,Math.min(99,offset+MIX_TARGET.integrated-after.integrated+reduction));
    }
    throw new Error(`Mastered audio did not meet loudness/peak limits after correction: I=${after.integrated} LUFS, TP=${after.truePeak} dBTP (expected I=${MIX_TARGET.integrated} +/-1, TP<=-1.5)`);
  } finally {if(fs.existsSync(temporary))fs.unlinkSync(temporary);}
}
