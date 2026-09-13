/**
 * Import recorded vocalizations (giggles, laughs, gasps …) into the library.
 *
 *   node scripts/import-vox.mjs [--inbox .cache/vox-inbox] [--local] [--replace]
 *
 * Drop downloaded files into the inbox. The kind is read from the file name:
 * "giggle__anything.mp3", "kids-laughing.wav", "yay_3.ogg" … (first keyword wins:
 * giggle laugh yay wow gasp yum yawn hmm aww sigh; "chuckle"/"laughing" count as laugh,
 * "cheer"/"hooray" as yay, "surprise" as gasp). Every file is trimmed, capped at 2.5 s,
 * loudness-normalized and written as mono 24 kHz WAV under a neutral name:
 *   public/vox/<kind>-<n>.wav          (default: CC0 recordings, committed)
 *   public/vox-local/<kind>-<n>.wav    (--local: licences that forbid redistribution, gitignored)
 * The original file names are recorded ONLY in .cache/vox-sources.json (gitignored) in
 * case a licence question ever comes up; nothing in the repo names a source or an author.
 * --replace empties the target folder first.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { parseArgs, ROOT } from "./lib/common.mjs";
import { VOX_KINDS, VOX_DIRS, wavDurationSec } from "./lib/vox.mjs";
import { buildRegistry } from "./build-registry.mjs";

const SYNONYMS = { chuckle: "laugh", laughing: "laugh", laughter: "laugh", giggling: "giggle", giggles: "giggle", cheer: "yay", cheering: "yay", hooray: "yay", hurray: "yay", surprise: "gasp", surprised: "gasp", shock: "gasp", yummy: "yum", mmm: "yum", tired: "yawn", thinking: "hmm", awww: "aww", sad: "aww", disappointed: "aww" };
const MAX_SEC = 2.5;

export function kindOf(filename) {
  const base = path.basename(filename).toLowerCase();
  const explicit = base.match(/^([a-z]+)__/);
  if (explicit && VOX_KINDS.includes(explicit[1])) return explicit[1];
  const words = base.replace(/\.[a-z0-9]+$/, "").split(/[^a-z]+/).filter(Boolean);
  for (const w of words) {
    if (VOX_KINDS.includes(w)) return w;
    if (SYNONYMS[w]) return SYNONYMS[w];
  }
  return null;
}

function nextIndex(dir, kind) {
  let n = 0;
  for (const f of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
    const m = f.match(new RegExp(`^${kind}-(\\d+)\\.wav$`));
    if (m) n = Math.max(n, Number(m[1]));
  }
  return n + 1;
}

/** ffmpeg: mono 24 kHz, strip leading/trailing silence, cap length, fade out, normalize loudness */
export function convert(src, dest) {
  const filters = [
    "silenceremove=start_periods=1:start_threshold=-42dB:start_silence=0.05",
    "areverse",
    "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.08",
    "areverse",
    `atrim=0:${MAX_SEC}`,
    "afade=t=out:st=" + (MAX_SEC - 0.12) + ":d=0.12",
    "loudnorm=I=-18:TP=-2:LRA=9",
    "aresample=24000",
  ].join(",");
  const res = spawnSync("ffmpeg", ["-v", "error", "-y", "-i", src, "-ac", "1", "-af", filters, "-ar", "24000", "-c:a", "pcm_s16le", dest], { encoding: "utf8" });
  if (res.status !== 0) throw new Error(`ffmpeg failed for ${src}: ${res.stderr}`);
  return wavDurationSec(dest);
}

function main() {
  const args = parseArgs();
  const inbox = path.resolve(ROOT, String(args.inbox || ".cache/vox-inbox"));
  const target = args.local ? VOX_DIRS[1] : VOX_DIRS[0];
  fs.mkdirSync(target.dir, { recursive: true });
  if (args.replace) for (const f of fs.readdirSync(target.dir)) if (f.endsWith(".wav")) fs.unlinkSync(path.join(target.dir, f));
  const sourcesFile = path.join(ROOT, ".cache", "vox-sources.json");
  const sources = fs.existsSync(sourcesFile) ? JSON.parse(fs.readFileSync(sourcesFile, "utf8")) : {};
  const files = fs.existsSync(inbox) ? fs.readdirSync(inbox).filter((f) => /\.(wav|mp3|ogg|flac|m4a|aac|webm)$/i.test(f)).sort() : [];
  if (files.length === 0) {
    console.log(`[vox] nothing in ${path.relative(ROOT, inbox)} — drop giggle/laugh/yay/gasp… recordings there (kind in the file name)`);
    return;
  }
  let imported = 0;
  const skipped = [];
  for (const f of files) {
    const kind = kindOf(f);
    if (!kind) { skipped.push(f); continue; }
    const n = nextIndex(target.dir, kind);
    const dest = path.join(target.dir, `${kind}-${n}.wav`);
    try {
      const sec = convert(path.join(inbox, f), dest);
      if (!sec || sec < 0.15) { fs.unlinkSync(dest); skipped.push(`${f} (too short after trimming)`); continue; }
      sources[`${target.url}/${kind}-${n}.wav`] = f;
      imported++;
      console.log(`[vox] ${f} → ${target.url}/${kind}-${n}.wav (${sec.toFixed(2)}s)`);
      fs.renameSync(path.join(inbox, f), path.join(inbox, `.done-${f}`));
    } catch (err) {
      skipped.push(`${f} (${err.message.split("\n")[0]})`);
    }
  }
  fs.mkdirSync(path.dirname(sourcesFile), { recursive: true });
  fs.writeFileSync(sourcesFile, JSON.stringify(sources, null, 2));
  const reg = buildRegistry();
  console.log(`[vox] imported ${imported}, skipped ${skipped.length}${skipped.length ? ": " + skipped.join(", ") : ""}; library now has ${Object.entries(reg.vox).map(([k, n]) => `${k}:${n}`).join(" ") || "nothing"}`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname;
if (isMain) main();
