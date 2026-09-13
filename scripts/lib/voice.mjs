/**
 * The global voice store: every synthesized line lives ONCE in .cache/voice/<hash>.<ext>
 * (+ <hash>.json with duration and word timings). DB voice_cache table keeps an index.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { ROOT } from "./common.mjs";
import { getClient } from "./db.mjs";

export const VOICE_STORE = path.join(ROOT, ".cache", "voice");

export const ENGINE_DEFAULT_VOICE = { kokoro: "af_heart", edge: "en-US-AnaNeural", gemini: "Leda" };

export function voiceSettings(script, args = {}) {
  const engine = process.env.TTS_ENGINE || "kokoro";
  const ext = engine === "edge" ? "mp3" : "wav";
  let voice = args.voice || script?.voice || process.env.TTS_VOICE || ENGINE_DEFAULT_VOICE[engine];
  if (engine === "kokoro" && !/^[a-z]{2}_[a-z]+$/.test(voice)) voice = ENGINE_DEFAULT_VOICE.kokoro;
  if (engine === "edge" && !/Neural/i.test(voice)) voice = ENGINE_DEFAULT_VOICE.edge;
  return { engine, ext, voice };
}

export const normalizeText = (text) => text.trim().toLowerCase();

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

export function recordVoiceCache(hash, text, voice, filePath) {
  inStore(hash, path.extname(filePath).replace(".", ""))
  try {
    const db = getClient();
    db.execute({
      sql: "INSERT OR REPLACE INTO voice_cache (hash, text, voice_id, file_path) VALUES (?, ?, ?, ?)",
      args: [hash, text, voice, filePath],
    }).catch(() => {});
  } catch (_) {}
}

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
