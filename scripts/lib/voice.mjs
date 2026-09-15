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
export const ENGINE_DEFAULT_NARRATOR_VOICE = { kokoro: "af_bella", edge: "en-US-JennyNeural", gemini: "Kore" };

function validVoice(engine, voice, fallback) {
  if (engine === "kokoro" && !/^[a-z]{2}_[a-z]+$/.test(voice)) return fallback;
  if (engine === "edge" && !/Neural/i.test(voice)) return fallback;
  return voice;
}

export function voiceSettings(script, args = {}) {
  const engine = process.env.TTS_ENGINE || "kokoro";
  const ext = engine === "edge" ? "mp3" : "wav";
  const defaultVoice = ENGINE_DEFAULT_VOICE[engine] ?? ENGINE_DEFAULT_VOICE.kokoro;
  const defaultNarrator = ENGINE_DEFAULT_NARRATOR_VOICE[engine] ?? defaultVoice;
  const voice = validVoice(engine, args.voice || script?.voice || process.env.TTS_VOICE || defaultVoice, defaultVoice);
  const narratorVoice = validVoice(engine, args.narratorVoice || script?.narratorVoice || process.env.NARRATOR_VOICE || defaultNarrator, defaultNarrator);
  return { engine, ext, voice, narratorVoice };
}

export function voiceForSpeaker(settings, speaker) {
  return speaker === "narrator" ? settings.narratorVoice || settings.voice : settings.voice;
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

export function collectUtterances(script, settings) {
  const utterances = [];
  if (script.intro?.text) utterances.push({ text: script.intro.text, speaker: "character" });
  for (const scene of script.scenes ?? []) {
    for (const line of scene.lines ?? []) if (line.text) utterances.push({ text: line.text, speaker: line.speaker || "character" });
  }
  if (script.outro?.text) utterances.push({ text: script.outro.text, speaker: "character" });
  if (script.type === "rhyme") utterances.push({ text: "One more time!", speaker: "character" });
  const seen = new Set();
  return utterances.flatMap((utterance) => {
    const voice = voiceForSpeaker(settings, utterance.speaker);
    const key = `${voice}|${normalizeText(utterance.text)}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ ...utterance, voice }];
  });
}

export function missingTexts(script, settings, hasAudio = inStore) {
  return collectUtterances(script, settings)
    .filter(({ text, voice }) => !hasAudio(lineHash(settings.engine, voice, text), settings.ext))
    .map(({ text }) => text);
}
