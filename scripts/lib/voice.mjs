/**
 * The global voice store: every synthesized line lives ONCE in .cache/voice/<hash>.<ext>
 * (+ <hash>.json with duration and word timings). DB voice_cache table keeps an index.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { ROOT } from "./common.mjs";
import { getClient } from "./db.mjs";
import { castMembers } from "./cast.mjs";

export const VOICE_STORE = path.join(ROOT, ".cache", "voice");

export const ENGINE_DEFAULT_VOICE = { kokoro: "af_heart", edge: "en-US-AnaNeural", gemini: "Leda" };
export const ENGINE_DEFAULT_NARRATOR_VOICE = { kokoro: "af_bella", edge: "en-US-JennyNeural", gemini: "Kore" };

// These English voices ship with kokoro-js 1.2.1; no extra model or service is used.
const KOKORO_CAST_VOICES = { bunny: "af_heart", bear: "am_michael", duck: "af_sarah", fox: "bf_emma", turtle: "bm_george", owl: "am_fenrir" };
const castAlias = value => typeof value === "string" ? value.trim().toLowerCase().replace(/[\s_-]+/g, " ") : "";
function castKind(value) {
  const alias = castAlias(value);
  return castMembers().find(member => [member.kind, member.id, member.name].some(name => castAlias(name) === alias))?.kind;
}

function heroKind(script) {
  return castKind(script?.mainCharacter?.kind) || castKind(script?.mainCharacter?.name) || castKind(script?.hero) || castKind(script?.scenes?.[0]?.character);
}

function validVoice(engine, voice, fallback) {
  if (engine === "kokoro" && !/^[a-z]{2}_[a-z]+$/.test(voice)) return fallback;
  if (engine === "edge" && !/Neural/i.test(voice)) return fallback;
  return voice;
}

export function voiceSettings(script, args = {}) {
  const pinned = script?.synthesis;
  const engine = pinned?.engine || process.env.TTS_ENGINE || "kokoro";
  if (!Object.hasOwn(ENGINE_DEFAULT_VOICE, engine)) throw new Error(`Unknown TTS engine: ${engine}`);
  const ext = engine === "edge" ? "mp3" : "wav";
  const defaultVoice = ENGINE_DEFAULT_VOICE[engine] ?? ENGINE_DEFAULT_VOICE.kokoro;
  const defaultNarrator = ENGINE_DEFAULT_NARRATOR_VOICE[engine] ?? defaultVoice;
  let voice = validVoice(engine, args.voice || pinned?.voice || script?.voice || process.env.TTS_VOICE || defaultVoice, defaultVoice);
  const narratorVoice = validVoice(engine, args.narratorVoice || pinned?.narratorVoice || script?.narratorVoice || process.env.NARRATOR_VOICE || defaultNarrator, defaultNarrator);
  const speed = engine === 'kokoro' ? Number(args.speed ?? pinned?.speed ?? process.env.TTS_SPEED ?? .95) : engine === 'edge' ? .92 : 1;
  if (!Number.isFinite(speed) || speed < .5 || speed > 2) throw new Error('TTS speed must be a number between 0.5 and 2');
  const model = pinned?.model || (engine === 'kokoro' ? 'Kokoro-82M-v1.0-ONNX:q8:peak-v1' : engine === 'edge' ? 'edge:rate-8:protocol-v1' : process.env.GEMINI_TTS_MODEL || 'gemini-2.5-flash-preview-tts');
  const cacheVersion = pinned?.cacheVersion ?? ([1, 2].includes(script?.presentationVersion) || engine === 'kokoro' && speed !== .95 ? 3 : 2);
  let castVoices;
  // A previously pinned generic recording stays generic even if its script is version 2.
  if (script?.presentationVersion === 2 && engine === "kokoro" && (!pinned || pinned.castVoices)) {
    castVoices = { ...KOKORO_CAST_VOICES };
    for (const overrides of [pinned?.castVoices || script?.castVoices, args.castVoices]) {
      if (!overrides || typeof overrides !== "object") continue;
      for (const [animal, selectedVoice] of Object.entries(overrides)) {
        const kind = castKind(animal);
        if (kind && typeof selectedVoice === "string") castVoices[kind] = validVoice(engine, selectedVoice, castVoices[kind]);
      }
    }
    const hero = heroKind(script);
    const explicitVoice = args.voice || (!pinned && (script?.voice || process.env.TTS_VOICE));
    if (hero && explicitVoice) castVoices[hero] = voice;
    else if (hero && !pinned) voice = castVoices[hero];
  }
  return { engine, ext, voice, narratorVoice, speed, model, cacheVersion, ...(castVoices ? { castVoices } : {}) };
}

export function voiceForSpeaker(settings, speaker, scene) {
  if (speaker === "narrator") return settings.narratorVoice || settings.voice;
  if (settings.castVoices) {
    const animal = speaker === "friend" ? scene?.secondCharacter : !speaker || speaker === "character" ? scene?.character : speaker;
    const kind = castKind(animal);
    if (kind && settings.castVoices[kind]) return settings.castVoices[kind];
  }
  return settings.voice;
}

export const normalizeText = (text) => text.trim().toLowerCase();

export function lineHash(engine, voice, text, synthesis) {
  const identity = synthesis
    ? JSON.stringify([engine,voice,'v3',synthesis.model,synthesis.speed,normalizeText(text)])
    : `${engine}|${voice}|v2|${normalizeText(text)}`;
  return crypto.createHash("sha1").update(identity).digest("hex").slice(0, synthesis ? 20 : 10);
}

/** Planner and synthesis share this identity; old default recordings keep their existing keys. */
export const voiceHash = (settings, voice, text) => lineHash(settings.engine, voice, text, settings.cacheVersion === 3 ? settings : undefined);

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
  const heroScene = { character: heroKind(script) };
  const add = (text, speaker = "character", scene = heroScene) => {
    if (text) utterances.push({ text, speaker, voice: voiceForSpeaker(settings, speaker, scene) });
  };
  add(script.intro?.text);
  for (const scene of script.scenes ?? []) {
    for (const line of scene.lines ?? []) add(line.text, line.speaker || "character", scene);
  }
  add(script.outro?.text);
  if (script.type === "rhyme") add("One more time!");
  const seen = new Set();
  return utterances.flatMap((utterance) => {
    const key = `${utterance.voice}|${normalizeText(utterance.text)}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [utterance];
  });
}

export function missingTexts(script, settings, hasAudio = inStore) {
  return collectUtterances(script, settings)
    .filter(({ text, voice }) => !hasAudio(voiceHash(settings, voice, text), settings.ext))
    .map(({ text }) => text);
}
