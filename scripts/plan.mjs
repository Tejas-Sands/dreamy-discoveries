/**
 * The CI planner: gets a script (LLM, template, or an existing slug), runs the
 * Director, and decides what work is needed — which voice lines are missing from
 * the store, how many render chunks to fan out, and where things go.
 *
 *   node scripts/plan.mjs --topic "..." --type story [--minutes 5.5]     (LLM)
 *   node scripts/plan.mjs --template counting [--hero duck] [--place farm] (no AI)
 *   node scripts/plan.mjs --slug existing-slug                            (re-run from the library)
 *   flags: --preview  --frames-per-chunk 3000  --max-chunks 8  --dry  --library (copy script into library/scripts)
 *   node scripts/plan.mjs --slug S --range 2/4        → prints the frame range of chunk 2 of 4
 *   node scripts/plan.mjs --slug S --verify-timing    → checks estimate.mjs against Remotion's own duration
 *
 * Outputs are appended to $GITHUB_OUTPUT when it is set.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadDotEnv, parseArgs, readScript, writeScript, setLatestSlug, GENERATED_DIR, ROOT } from "./lib/common.mjs";
import { directScript } from "./lib/director.mjs";
import { estimateFrames, chunkRanges } from "./lib/estimate.mjs";
import { voiceSettings, missingTexts } from "./lib/voice.mjs";
import { LIBRARY_DIR } from "./lib/catalog.mjs";

loadDotEnv();
const here = path.dirname(fileURLToPath(import.meta.url));

function output(obj) {
  for (const [k, v] of Object.entries(obj)) {
    const val = typeof v === "string" ? v : JSON.stringify(v);
    console.log(`[plan] ${k}=${val}`);
    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${val}\n`);
  }
}

function generate(args) {
  const pass = [];
  for (const k of ["topic", "type", "minutes", "voice", "template", "hero", "place", "seed", "slug-prefix"]) {
    if (args[k] !== undefined) pass.push(`--${k}`, String(args[k]));
  }
  const res = spawnSync(process.execPath, [path.join(here, "generate-script.mjs"), ...pass], { stdio: "inherit" });
  if (res.status !== 0) throw new Error("script generation failed");
  return JSON.parse(fs.readFileSync(path.join(GENERATED_DIR, "latest.json"), "utf8")).slug;
}

function loadFromLibrary(slug) {
  const lib = path.join(LIBRARY_DIR, "scripts", `${slug}.json`);
  const gen = path.join(GENERATED_DIR, slug, "script.json");
  if (!fs.existsSync(gen) && fs.existsSync(lib)) {
    fs.mkdirSync(path.dirname(gen), { recursive: true });
    fs.copyFileSync(lib, gen);
  }
  if (!fs.existsSync(gen)) throw new Error(`no script for slug "${slug}" in public/generated or library/scripts`);
  return slug;
}

function main() {
  const args = parseArgs();

  // chunk range for one matrix job
  if (args.range) {
    const [i, n] = String(args.range).split("/").map(Number);
    const slug = loadFromLibrary(args.slug);
    const total = estimateFrames(readScript(slug));
    const ranges = chunkRanges(total, n);
    const r = ranges[i] ?? `${total - 1}-${total - 1}`;
    console.log(r);
    return;
  }

  if (args["verify-timing"]) {
    const slug = loadFromLibrary(args.slug);
    const est = estimateFrames(readScript(slug));
    const res = spawnSync("npx", ["remotion", "compositions", "--props", JSON.stringify({ slug, script: null })], { cwd: ROOT, encoding: "utf8" });
    const line = `${res.stdout || ""}\n${res.stderr || ""}`.split("\n").find((l) => /^\s*Video\s+\d+/.test(l)) || "";
    const m = line.match(/(\d+)\s*\(/); // "Video  30  1920x1080  4623 (154.10 sec)"
    console.log(`[plan] estimate.mjs=${est} remotion="${line.trim()}"`);
    if (m && Number(m[1]) !== est) {
      console.error(`[plan] MISMATCH: scripts/lib/estimate.mjs (${est}) != Remotion (${m[1]}) — keep timing.ts and estimate.mjs in sync`);
      process.exit(1);
    }
    return;
  }

  const slug = args.slug ? loadFromLibrary(args.slug) : generate(args);
  let script = directScript(readScript(slug));
  if (args.minutes) script.targetMinutes = Number(args.minutes);
  if (!args.dry) writeScript(slug, script);
  setLatestSlug(slug);

  const settings = voiceSettings(script, args);
  const missing = missingTexts(script, settings);
  const frames = estimateFrames(script);
  const perChunk = Number(args["frames-per-chunk"] || 3000);
  const maxChunks = Number(args["max-chunks"] || 8);
  const chunkCount = args.preview ? 1 : Math.max(1, Math.min(maxChunks, Math.ceil(frames / perChunk)));

  if (args.library && !args.dry) {
    const dest = path.join(LIBRARY_DIR, "scripts", `${slug}.json`);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, JSON.stringify(script, null, 2) + "\n");
    console.log(`[plan] library: ${path.relative(ROOT, dest)}`);
  }

  output({
    slug,
    title: script.title,
    type: script.type,
    voice_needed: missing.length > 0 ? "true" : "false",
    voice_missing: missing.length,
    frames_estimate: frames,
    minutes_estimate: (frames / 30 / 60).toFixed(1),
    chunk_count: chunkCount,
    chunks: Array.from({ length: chunkCount }, (_, i) => i),
    preview: args.preview ? "true" : "false",
  });
}

main();
