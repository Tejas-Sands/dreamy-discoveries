/**
 * The global voice store: every synthesized line lives ONCE in .cache/voice/<hash>.<ext>
 * (+ <hash>.json with duration and word timings). Videos copy what they need into
 * public/generated/<slug>/. In CI the store is an actions/cache entry shared by every
 * run, so greetings, praise lines, choruses and "One more time!" are synthesized once ever.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { ROOT } from "./common.mjs";

export const VOICE_STORE = path.join(ROOT, ".cache", "voice");

export const ENGINE_DEFAULT_VOICE = { kokoro: "af_heart", edge: "en-US-AnaNeural", gemini: "Leda" };

/** engine / voice / file extension, with the same guards generate-audio always applied */
export function voiceSettings(script, args = {}) {
  const engine = process.env.TTS_ENGINE || "kokoro";
  const ext = engine === "edge" ? "mp3" : "wav";
  let voice = args.voice || script?.voice || process.env.TTS_VOICE || ENGINE_DEFAULT_VOICE[engine];
  if (engine === "kokoro" && !/^[a-z]{2}_[a-z]+$/.test(voice)) voice = ENGINE_DEFAULT_VOICE.kokoro;
  if (engine === "edge" && !/Neural/i.test(voice)) voice = ENGINE_DEFAULT_VOICE.edge;
  return { engine, ext, voice };
}

export const normalizeText = (text) => text.trim().toLowerCase();

/** bump the "v" tag whenever synthesis changes (normalization, speed) so old files are not reused */
export function lineHash(engine, voice, text) {
  return crypto.createHash("sha1").update(`${engine}|${voice}|v2|${normalizeText(text)}`).digest("hex").slice(0, 10);
}

export function storePaths(hash, ext) {
  return { audio: path.join(VOICE_STORE, `${hash}.${ext}`), meta: path.join(VOICE_STORE, `${hash}.json`) };
}

export function inStore(hash, ext) {
  const p = storePaths(hash, ext);
  return fs.existsSync(p.audio) && fs.existsSync(p.meta);
}

/** every distinct text a script will speak (incl. the reprise bridge for rhymes) */
export function collectTexts(script) {
  const texts = [];
  if (script.intro?.text) texts.push(script.intro.text);
  for (const scene of script.scenes ?? []) for (const line of scene.lines ?? []) if (line.text) texts.push(line.text);
  if (script.outro?.text) texts.push(script.outro.text);
  if (script.type === "rhyme") texts.push("One more time!");
  const seen = new Set();
  return texts.filter((t) => {
    const k = normalizeText(t);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function missingTexts(script, settings) {
  return collectTexts(script).filter((t) => !inStore(lineHash(settings.engine, settings.voice, t), settings.ext));
}
