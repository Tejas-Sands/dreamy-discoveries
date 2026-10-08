/**
 * Join video-only chunks rendered on several runners + the audio track into the
 * final mp4 (stream copy, no re-encode), then thumbnail + metadata.
 *
 *   node scripts/stitch.mjs --slug S [--chunks out/chunks/S] [--audio out/episodes/S.aac] [--out out/episodes/S.mp4]
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { parseArgs, readScript, resolveSlug, OUT_DIR, ROOT } from "./lib/common.mjs";
import { writeMetadata } from "./lib/metadata.mjs";
import { renderThumbnail } from "./render.mjs";
import {estimateFrames} from './lib/estimate.mjs';
import {ffmpegBin,validateChunks,verifyEpisode} from './lib/media-check.mjs';
import {renderIdentity,verifyRenderProof} from './lib/render-proof.mjs';
export {ffmpegBin} from './lib/media-check.mjs';

export function concat(chunkFiles, audioFile, outFile) {
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  const list = path.join(path.dirname(outFile), `${path.basename(outFile, ".mp4")}.concat.txt`);
  fs.writeFileSync(list, chunkFiles.map((f) => `file '${path.resolve(f).replace(/'/g, "'\\''")}'`).join("\n") + "\n");
  const args = ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list];
  if (audioFile) args.push("-i", audioFile);
  args.push("-map", "0:v:0");
  if (audioFile) args.push("-map", "1:a:0", "-c:a", "copy", "-bsf:a", "aac_adtstoasc");
  else args.push('-map','0:a:0?','-c:a','copy');
  args.push("-c:v", "copy", "-movflags", "+faststart", outFile);
  try {
    const res = spawnSync(ffmpegBin(), args, { stdio: "inherit" });
    if (res.status !== 0) throw new Error(`ffmpeg concat failed (${res.status})`);
  } finally {fs.unlinkSync(list);}
}

function main() {
  const args = parseArgs();
  const slug = resolveSlug(args);
  const script = readScript(slug);
  const chunkDir = args.chunks || path.join(ROOT, "out", "chunks", slug);
  const audio = args.audio || path.join(OUT_DIR, `${slug}.aac`);
  const out = args.out || path.join(OUT_DIR, `${slug}.mp4`);
  const chunks = fs
    .readdirSync(chunkDir)
    .filter((f) => /^chunk-\d+\.mp4$/.test(f))
    .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]))
    .map((f) => path.join(chunkDir, f));
  if (chunks.length === 0) throw new Error(`no chunk-*.mp4 in ${chunkDir}`);
  if (!fs.existsSync(audio)) throw new Error(`Missing episode audio: ${audio}`);
  const frames=estimateFrames(script);
  const chunkReport=validateChunks(chunks,{frames,count:args['expected-chunks']===undefined?chunks.length:Number(args['expected-chunks'])});
  const identity=renderIdentity(script);
  chunks.forEach((file,i)=>verifyRenderProof(file,identity,[chunkReport[i].from,chunkReport[i].to]));
  verifyRenderProof(audio,identity);
  fs.mkdirSync(path.dirname(out),{recursive:true});
  const temp=path.join(path.dirname(out),`.${path.basename(out)}.verifying-${process.pid}.mp4`);
  console.log(`[stitch] ${chunks.length} validated chunk(s) + ${path.basename(audio)} → ${out}`);
  try {
    concat(chunks,audio,temp);
    const report=verifyEpisode(temp,{frames});
    fs.renameSync(temp,out);
    fs.writeFileSync(`${out}.verification.json`,JSON.stringify({...report,file:path.basename(out),chunks:chunkReport},null,2)+'\n');
  } finally {if(fs.existsSync(temp))fs.unlinkSync(temp);}
  if (!args["no-thumbnail"]) renderThumbnail(slug, path.join(OUT_DIR, `${slug}.png`));
  writeMetadata(slug, script, OUT_DIR, { releaseUrl: args["release-url"] });
  console.log(`[stitch] done: ${out} (${(fs.statSync(out).size / 1024 / 1024).toFixed(1)} MB)`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname;
if (isMain) main();
