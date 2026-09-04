/**
 * Step 3: render with Remotion.
 *
 *   node scripts/render.mjs [--slug my-video]                 full video + thumbnail + metadata (local one-shot)
 *   node scripts/render.mjs --slug S --frames 0-2999 --muted --out out/chunks/S/chunk-0.mp4   one video-only chunk (CI)
 *   node scripts/render.mjs --slug S --audio-only --out out/S.aac                             the audio track only (CI)
 *   extra: --scale 0.5 (preview), --thumbnail-only
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

function run(cmd, cmdArgs) {
  console.log(`[render] ${cmd} ${cmdArgs.join(" ")}`);
  const res = spawnSync(cmd, cmdArgs, { stdio: "inherit", cwd: ROOT });
  if (res.status !== 0) throw new Error(`${cmd} exited with code ${res.status}`);
}

export function renderThumbnail(slug, outPath) {
  const props = JSON.stringify({ slug, script: null });
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
    renderThumbnail(slug, thumbOut);
    return;
  }

  if (args["audio-only"]) {
    const out = args.out || path.join(OUT_DIR, `${slug}.aac`);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    run("npx", ["remotion", "render", "Video", out, `--props=${props}`, "--codec=aac", `--concurrency=${concurrency}`]);
    console.log(`[render] audio: ${out}`);
    return;
  }

  const chunkMode = !!(args.frames || args.out);
  const videoOut = args.out || path.join(OUT_DIR, `${slug}.mp4`);
  fs.mkdirSync(path.dirname(videoOut), { recursive: true });
  const extra = [`--concurrency=${concurrency}`];
  if (args.scale) extra.push(`--scale=${args.scale}`);
  if (args.frames) extra.push(`--frames=${args.frames}`);
  if (args.muted) extra.push("--muted");
  run("npx", ["remotion", "render", "Video", videoOut, `--props=${props}`, "--codec=h264", ...extra]);

  if (chunkMode) {
    console.log(`[render] chunk: ${videoOut} (${(fs.statSync(videoOut).size / 1024 / 1024).toFixed(1)} MB)`);
    return;
  }
  renderThumbnail(slug, thumbOut);
  writeMetadata(slug, script, OUT_DIR);
  const sizeMb = (fs.statSync(videoOut).size / 1024 / 1024).toFixed(1);
  console.log(`[render] done: ${videoOut} (${sizeMb} MB), ${thumbOut}, ${slug}.metadata.txt`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname;
if (isMain) main();
