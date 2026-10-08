/** Verify an episode locally without publishing or mutating its script/history. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs,readScript,resolveSlug,OUT_DIR} from './lib/common.mjs';
import {estimateFrames} from './lib/estimate.mjs';
import {verifyEpisode} from './lib/media-check.mjs';

export function verifyVideo(slug,file=path.join(OUT_DIR,`${slug}.mp4`)) {
  const report=verifyEpisode(file,{frames:estimateFrames(readScript(slug))});
  fs.writeFileSync(`${file}.verification.json`,JSON.stringify(report,null,2)+'\n');
  return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const args=parseArgs();
  try {console.log(JSON.stringify(verifyVideo(resolveSlug(args),args.file),null,2));}
  catch(error){console.error(`[verify] ${error.message}`);process.exitCode=1;}
}
