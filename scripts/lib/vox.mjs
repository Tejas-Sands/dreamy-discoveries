/**
 * Vocalizations ("vox"): giggles, laughs, gasps, yawns … are NOT words, so the
 * narrator must never read them. The Director strips them out of the spoken text
 * and turns them into cues that play a real recording at that moment.
 *
 *   "Ha ha! That tickles!"        → text "That tickles!"        vox [{kind:"laugh",  at:"start"}]
 *   "I love carrots! {giggle}"    → text "I love carrots!"      vox [{kind:"giggle", at:"end"}]
 *   "Hee hee hee!"                → (empty line) → the cue moves to the neighbouring line
 *
 * Recordings live in public/vox/<kind>-<n>.wav (committed, CC0 only) and
 * public/vox-local/ (gitignored, e.g. Pixabay licence: local renders only).
 * scripts/build-registry.mjs scans both into src/generated/registry.ts → VOX.
 */
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./common.mjs";

export const VOX_KINDS = ["giggle", "laugh", "yay", "wow", "gasp", "yum", "yawn", "hmm", "aww", "sigh"];
/** room reserved before / after the speech when a cue sits at the start / end of a line (seconds) */
export const VOX_PRE_SEC = 0.9;
export const VOX_POST_SEC = 0.8;

export const VOX_DIRS = [
  { dir: path.join(ROOT, "public", "vox"), url: "vox" },
  { dir: path.join(ROOT, "public", "vox-local"), url: "vox-local" },
];

/** words that are not words: two or more laugh syllables, or a glued laugh */
const LAUGH_SYL = "(?:ha|hah|heh|hee|tee|ho)";
const LAUGH_RE = new RegExp(`(?:^|(?<=\\s|[("'\\-]))(${LAUGH_SYL}(?:[\\s-]*${LAUGH_SYL})+|hahaha+|haha|hehe+|heehee+|teehee+)[!.,?]*(?=\\s|$|[)"'])`, "gi");
/** explicit tags the LLM / a hand-edit can write: {giggle} [laugh] (yawns) */
const TAG_RE = new RegExp(`[\\[({]\\s*(${VOX_KINDS.join("|")})s?\\s*[\\])}]`, "gi");

const kindOfLaugh = (raw) => (/hee|tee|heh/i.test(raw) ? "giggle" : "laugh");

/**
 * Pull vocalizations out of a line. Returns the cleaned text and the cues, each
 * placed at the "start" or the "end" (a mid-sentence cue goes to the end so it never
 * talks over the narrator).
 */
export function extractVox(input) {
  const src = String(input ?? "");
  const found = []; // { kind, index }
  let m;
  TAG_RE.lastIndex = 0;
  while ((m = TAG_RE.exec(src))) found.push({ kind: m[1].toLowerCase(), index: m.index, len: m[0].length });
  LAUGH_RE.lastIndex = 0;
  while ((m = LAUGH_RE.exec(src))) found.push({ kind: kindOfLaugh(m[1]), index: m.index, len: m[0].length });
  if (found.length === 0) return { text: src.trim(), cues: [] };
  found.sort((a, b) => a.index - b.index);
  // rebuild the text without the tokens
  let out = "";
  let cursor = 0;
  for (const f of found) {
    out += src.slice(cursor, f.index);
    cursor = f.index + f.len;
  }
  out += src.slice(cursor);
  const cleaned = out.replace(/\s+/g, " ").replace(/^[\s,;:!.?-]+/, "").replace(/\s+([,.!?;:])/g, "$1").trim();
  const text = cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : "";
  // a token before the first letter of the cleaned text is a "start" cue, everything else "end"
  const firstWordAt = (() => {
    const i = src.search(/[\p{L}\p{N}]/u);
    // if the first letter belongs to a token, look for the first letter outside every token
    for (let k = i; k < src.length; k++) {
      if (!/[\p{L}\p{N}]/u.test(src[k])) continue;
      if (!found.some((f) => k >= f.index && k < f.index + f.len)) return k;
    }
    return src.length;
  })();
  const cues = found.map((f) => ({ kind: f.kind, at: f.index < firstWordAt ? "start" : "end" }));
  return { text, cues };
}

/** normalize a hand-written / LLM-written vox array */
export function normalizeVox(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const v of list) {
    const kind = typeof v === "string" ? v : v?.kind;
    if (!VOX_KINDS.includes(kind)) continue;
    const at = v?.at === "start" ? "start" : "end";
    if (out.some((o) => o.kind === kind && o.at === at)) continue;
    const cue = { kind, at };
    if (v?.speaker === "character" || v?.speaker === "friend" || v?.speaker === "narrator") cue.speaker = v.speaker;
    out.push(cue);
  }
  // start cues first, then end cues, in the order written
  return [...out.filter((o) => o.at === "start"), ...out.filter((o) => o.at === "end")];
}

/** duration of a 16-bit PCM WAV from its header (the importer always writes this format) */
export function wavDurationSec(file) {
  const fd = fs.openSync(file, "r");
  try {
    const head = Buffer.alloc(64);
    fs.readSync(fd, head, 0, 64, 0);
    if (head.toString("ascii", 0, 4) !== "RIFF") return null;
    const channels = head.readUInt16LE(22);
    const rate = head.readUInt32LE(24);
    const bits = head.readUInt16LE(34);
    const size = fs.statSync(file).size - 44;
    return size / (rate * channels * (bits / 8));
  } finally {
    fs.closeSync(fd);
  }
}

/** every recording on disk, grouped by kind: { giggle: [{ file: "vox/giggle-1.wav", durationSec }], ... } */
export function scanVox() {
  const out = {};
  for (const { dir, url } of VOX_DIRS) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).sort()) {
      const m = f.match(/^([a-z]+)-(\d+)\.wav$/);
      if (!m || !VOX_KINDS.includes(m[1])) continue;
      const durationSec = wavDurationSec(path.join(dir, f));
      if (!durationSec) continue;
      (out[m[1]] ??= []).push({ file: `${url}/${f}`, durationSec: +durationSec.toFixed(3) });
    }
  }
  return out;
}
