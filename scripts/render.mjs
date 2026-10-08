/**
 * Step 3: render with Remotion.
 *
 *   node scripts/render.mjs [--slug my-video]                 full video + thumbnail + metadata (local one-shot)
 *   node scripts/render.mjs --slug S --frames 0-2999 --muted --out out/chunks/S/chunk-0.mp4   one video-only chunk (CI)
 *   node scripts/render.mjs --slug S --audio-only --out out/episodes/S.aac                             the audio track only (CI)
 *   extra: --scale 0.5 (preview), --thumbnail-only [--thumbnail-text "Paper Boat"] [--out cover.png]
 *
 * Chunks from several runners are joined by scripts/stitch.mjs.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { parseArgs, readScript, resolveSlug, OUT_DIR, ROOT } from "./lib/common.mjs";
import { writeMetadata } from "./lib/metadata.mjs";
import { buildRegistry } from "./build-registry.mjs";
import { recordStory } from "./lib/universe.mjs";
import {verifyVideo} from './verify-video.mjs';
import {masterAudio} from './lib/audio-master.mjs';
import {runMedia} from './lib/media-check.mjs';
import {renderIdentity,writeRenderProof} from './lib/render-proof.mjs';

function run(cmd, cmdArgs) {
  console.log(`[render] ${cmd} ${cmdArgs.join(" ")}`);
  const res = spawnSync(cmd, cmdArgs, { stdio: "inherit", cwd: ROOT });
  if (res.status !== 0) throw new Error(`${cmd} exited with code ${res.status}`);
}

export function renderThumbnail(slug, outPath, headline) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const props = JSON.stringify({ slug, script: null, ...(typeof headline === 'string' ? {headline} : {}) });
  run("npx", ["remotion", "still", "Thumbnail", outPath, `--props=${props}`]);
}

function main() {
  const args = parseArgs();
  const slug = resolveSlug(args);
  const script = readScript(slug);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  buildRegistry();

  const props = JSON.stringify({ slug, script: null });
  const thumbOut = path.join(OUT_DIR, `${slug}.png`);
  const concurrency = Number(process.env.RENDER_CONCURRENCY) || Math.max(1, os.cpus().length);

  if (args["thumbnail-only"]) {
    renderThumbnail(slug, args.out || thumbOut, args['thumbnail-text']);
    return;
  }

  if (args["audio-only"]) {
    const identity=renderIdentity(script);
    const out = args.out || path.join(OUT_DIR, `${slug}.aac`);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    if((script.presentationVersion??0)>=4) {
      const raw=`${out}.mix-${process.pid}.wav`;
      try {
        run('npx',['remotion','render','Video',raw,`--props=${props}`,'--codec=wav',`--concurrency=${concurrency}`]);
        const report=masterAudio(raw,out);
        fs.writeFileSync(`${out}.loudness.json`,JSON.stringify(report,null,2)+'\n');
      } finally {if(fs.existsSync(raw))fs.unlinkSync(raw);}
    } else run("npx", ["remotion", "render", "Video", out, `--props=${props}`, "--codec=aac", `--concurrency=${concurrency}`]);
    writeRenderProof(out,identity);
    console.log(`[render] audio: ${out}`);
    return;
  }

  const chunkMode = !!args.frames;
  const videoOut = args.out || path.join(OUT_DIR, `${slug}.mp4`);
  const master=(script.presentationVersion??0)>=4&&!chunkMode;
  const renderOut=chunkMode?videoOut:`${videoOut}.rendering-${process.pid}.mp4`;
  fs.mkdirSync(path.dirname(videoOut), { recursive: true });
  const extra = [`--concurrency=${concurrency}`];
  const identity=chunkMode?renderIdentity(script):null;
  if (args.scale) extra.push(`--scale=${args.scale}`);
  if (args.frames) extra.push(`--frames=${args.frames}`);
  if (args.muted) extra.push("--muted");
  const audio=`${videoOut}.master-${process.pid}.aac`,finished=`${videoOut}.finishing-${process.pid}.mp4`;
  try {
    run("npx", ["remotion", "render", "Video", renderOut, `--props=${props}`, "--codec=h264", ...extra]);
    if (chunkMode) {
      writeRenderProof(videoOut,identity,String(args.frames).split('-').map(Number));
      console.log(`[render] chunk: ${videoOut} (${(fs.statSync(videoOut).size / 1024 / 1024).toFixed(1)} MB)`);
      return;
    }
    let report;
    if(master) {
      report=masterAudio(renderOut,audio);
      runMedia('ffmpeg',['-y','-v','error','-i',renderOut,'-i',audio,'-map','0:v:0','-map','1:a:0','-c','copy','-movflags','+faststart',finished]);
    }
    const candidate=master?finished:renderOut;
    const verification=verifyVideo(slug,candidate);
    fs.renameSync(candidate,videoOut);
    fs.writeFileSync(`${videoOut}.verification.json`,JSON.stringify({...verification,file:path.basename(videoOut)},null,2)+'\n');
    if(report)fs.writeFileSync(`${videoOut}.loudness.json`,JSON.stringify(report,null,2)+'\n');
  } finally {
    if(!chunkMode)for(const file of [renderOut,audio,finished,`${renderOut}.verification.json`,`${finished}.verification.json`])if(fs.existsSync(file))fs.unlinkSync(file);
  }
  renderThumbnail(slug, thumbOut);
  writeMetadata(slug, script, OUT_DIR);
  const sizeMb = (fs.statSync(videoOut).size / 1024 / 1024).toFixed(1);
  console.log(`[render] done: ${videoOut} (${sizeMb} MB), ${thumbOut}, ${slug}.metadata.txt`);
  if (!args.scale) {
    recordStory(slug, { status: "rendered", timeline: { rendered: new Date().toISOString().slice(0, 10) } });
    console.log(`[render] recorded ${slug} in library/universe.json`);
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname;
if (isMain) main();
