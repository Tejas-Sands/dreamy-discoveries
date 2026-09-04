/**
 * Step 2: Director → TTS → reprise.
 *
 *  1. Runs the Director so the script has every line it needs (greeting,
 *     praise lines, moral chant, goodbye) and every creative decision filled in.
 *  2. Synthesizes each unique line ONCE. Files are named by a content hash, so
 *     re-running after a hand edit only synthesizes the lines that changed and
 *     identical lines (choruses, catchphrases) share one file.
 *  3. Measures real durations, estimates (or, with edge, records) word timings.
 *  4. Rhymes shorter than the target get "One more time!" + a full reprise.
 *
 * Usage: node scripts/generate-audio.mjs [--slug my-video] [--minutes 5.5] [--check]
 * Engines: TTS_ENGINE=kokoro (default, local model, no key) | edge | gemini
 * Files live in the global store .cache/voice/ (shared across videos and CI runs) and are
 * copied into public/generated/<slug>/. --check only lists lines the store is missing.
 */
import fs from "node:fs";
import path from "node:path";
import { parseFile } from "music-metadata";
import { loadDotEnv, parseArgs, readScript, writeScript, resolveSlug, GENERATED_DIR, ROOT } from "./lib/common.mjs";
import { directScript, songSceneCount } from "./lib/director.mjs";
import { estimateVideoSec } from "./lib/estimate.mjs";
import { VOICE_STORE, voiceSettings, lineHash, storePaths, inStore, missingTexts } from "./lib/voice.mjs";

loadDotEnv();

// ---------- word timing estimation ----------
export function estimateWords(text, durationSec) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const weights = words.map((w) => {
    const letters = w.replace(/[^\p{L}\p{N}]/gu, "").length;
    const pause = /[,.!?;:]$/.test(w) ? 1.2 : 0; // punctuation = a little breath
    return letters + 1.5 + pause;
  });
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const leadIn = Math.min(0.12, durationSec * 0.05);
  const usable = Math.max(0.2, durationSec - leadIn - 0.15);
  let t = leadIn;
  return words.map((w, i) => {
    const d = (usable * weights[i]) / totalWeight;
    const item = { text: w, start: +t.toFixed(3), end: +(t + d).toFixed(3) };
    t += d;
    return item;
  });
}

// ---------- engines ----------
let kokoroPromise = null;
function getKokoro() {
  if (!kokoroPromise) {
    kokoroPromise = (async () => {
      const { env } = await import("@huggingface/transformers");
      env.cacheDir = path.join(ROOT, ".cache", "models");
      const { KokoroTTS } = await import("kokoro-js");
      console.log("[tts] loading Kokoro-82M (first run downloads ~90MB)...");
      return KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", { dtype: "q8", device: "cpu" });
    })();
  }
  return kokoroPromise;
}

/** Kokoro output peaks around -8 dB; bring every line to the same healthy level. */
const VOICE_PEAK = 0.85;
function normalizeFloat(samples) {
  let peak = 0;
  for (let i = 0; i < samples.length; i++) peak = Math.max(peak, Math.abs(samples[i]));
  if (peak > 0.001) {
    const g = VOICE_PEAK / peak;
    for (let i = 0; i < samples.length; i++) samples[i] *= g;
  }
}

async function synthKokoro(text, voice, outPath) {
  const tts = await getKokoro();
  const audio = await tts.generate(text, { voice, speed: Number(process.env.TTS_SPEED || 0.95) });
  normalizeFloat(audio.audio);
  await audio.save(outPath);
  return { durationSec: audio.audio.length / audio.sampling_rate, words: null };
}

async function synthEdge(text, voice, outPath) {
  const { edgeSynthesize } = await import("./lib/edge-tts.mjs");
  const { words } = await edgeSynthesize({ text, voice, outputPath: outPath, rate: "-8%" });
  const meta = await parseFile(outPath);
  const durationSec = meta.format.duration;
  if (!durationSec) throw new Error(`Could not measure duration of ${outPath}`);
  return { durationSec, words: words.length > 0 ? words : null };
}

function pcmToWav(pcm, sampleRate = 24000) {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

async function synthGemini(text, voice, outPath) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("TTS_ENGINE=gemini requires GEMINI_API_KEY");
  const model = process.env.GEMINI_TTS_MODEL || "gemini-2.5-flash-preview-tts";
  const geminiVoice = /Neural/i.test(voice) ? "Leda" : voice;
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text }] }],
      generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: geminiVoice } } } },
    }),
  });
  if (!res.ok) throw new Error(`[gemini-tts] ${res.status}: ${(await res.text()).slice(0, 400)}`);
  const data = await res.json();
  const b64 = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!b64) throw new Error("[gemini-tts] no audio in response");
  const pcm = Buffer.from(b64, "base64");
  let peak = 1;
  for (let i = 0; i + 1 < pcm.length; i += 2) peak = Math.max(peak, Math.abs(pcm.readInt16LE(i)));
  const g = Math.min(8, (VOICE_PEAK * 32767) / peak);
  for (let i = 0; i + 1 < pcm.length; i += 2) pcm.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(pcm.readInt16LE(i) * g))), i);
  fs.writeFileSync(outPath, pcmToWav(pcm));
  return { durationSec: pcm.length / 2 / 24000, words: null };
}

async function synthesize(text, voice, outPath) {
  const engine = process.env.TTS_ENGINE || "kokoro";
  const fn = engine === "gemini" ? synthGemini : engine === "edge" ? synthEdge : synthKokoro;
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await fn(text, voice, outPath);
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      console.warn(`[tts] attempt ${attempt} failed: ${lastErr.message.slice(0, 200)}`);
      await new Promise((r) => setTimeout(r, attempt * 1500));
    }
  }
  throw lastErr;
}

async function main() {
  const args = parseArgs();
  const slug = resolveSlug(args);
  const dir = path.join(GENERATED_DIR, slug);
  fs.mkdirSync(dir, { recursive: true });

  let script = directScript(readScript(slug));

  const { engine, ext, voice } = voiceSettings(script, args);

  // --check: report what would need synthesis (used by the CI planner), touch nothing
  if (args.check) {
    const missing = missingTexts(script, { engine, ext, voice });
    console.log(JSON.stringify({ slug, engine, voice, missing: missing.length, texts: missing }));
    return;
  }
  console.log(`[tts] engine=${engine} voice=${voice} slug=${slug} store=${path.relative(ROOT, VOICE_STORE)}`);
  fs.mkdirSync(VOICE_STORE, { recursive: true });

  const cache = new Map();
  const used = new Set();
  let synthCount = 0;
  let reusedCount = 0;

  const speak = async (text) => {
    const key = text.trim().toLowerCase();
    if (cache.has(key)) return cache.get(key);
    const hash = lineHash(engine, voice, text);
    const file = `line-${hash}.${ext}`;
    const store = storePaths(hash, ext);
    let entry;
    if (inStore(hash, ext)) {
      entry = { ...JSON.parse(fs.readFileSync(store.meta, "utf8")), audio: file };
      reusedCount++;
    } else {
      const { durationSec, words } = await synthesize(text, voice, store.audio);
      entry = { audio: file, durationSec: +durationSec.toFixed(3), words: words ?? estimateWords(text, durationSec) };
      fs.writeFileSync(store.meta, JSON.stringify({ text, durationSec: entry.durationSec, words: entry.words }));
      synthCount++;
      console.log(`[tts] ${file} ${durationSec.toFixed(2)}s  "${text}"`);
    }
    // the video folder gets a copy (artifacts and the renderer only see public/)
    const local = path.join(dir, file);
    if (!fs.existsSync(local)) fs.copyFileSync(store.audio, local);
    cache.set(key, entry);
    used.add(file);
    return entry;
  };

  if (script.intro) Object.assign(script.intro, await speak(script.intro.text));
  for (const scene of script.scenes) {
    for (const line of scene.lines) Object.assign(line, await speak(line.text));
  }
  if (script.outro) Object.assign(script.outro, await speak(script.outro.text));

  // Auto-reprise: kids' songs loop. If the rhyme lands short of the target,
  // bridge with "One more time!" and repeat the whole song — zero extra TTS.
  const target = Number(args.minutes || process.env.TARGET_MINUTES || script.targetMinutes || 0);
  const alreadyReprised = script.scenes.some((s) => s.lines.some((l) => l.role === "bridge"));
  if (script.type === "rhyme" && target > 0 && !alreadyReprised && estimateVideoSec(script) < target * 60) {
    const songCount = songSceneCount(script);
    const song = script.scenes.slice(0, songCount).map((s) => JSON.parse(JSON.stringify(s)));
    const rest = script.scenes.slice(songCount);
    const reprised = [...song];
    let reprises = 0;
    const bridgeText = "One more time!";
    const bridge = await speak(bridgeText);
    const measure = () => estimateVideoSec({ ...script, scenes: [...reprised, ...rest] });
    while (measure() < target * 60 && reprises < 3) {
      reprised.push(
        {
          kind: "bridge",
          background: song[0].background,
          character: song[0].character,
          energy: "upbeat",
          transition: "pop",
          camera: "still",
          holdSec: 0,
          secondCharacter: null,
          gag: null,
          question: null,
          lines: [{ text: bridgeText, role: "bridge", speaker: "character", emotion: "excited", action: "cheer", sfx: ["tada"], callout: null, ...bridge }],
        },
        ...song.map((s) => JSON.parse(JSON.stringify(s)))
      );
      reprises++;
    }
    script.scenes = [...reprised, ...rest];
    // stars: question scenes repeat, so give the copies their own stars (max 10)
    let star = 0;
    for (const s of script.scenes) if (s.question) s.starIndex = star++;
    script.stars = star > 0 ? { total: Math.min(10, star) } : null;
    if (reprises > 0) console.log(`[tts] added ${reprises} reprise(s) to reach ~${target} min`);
  }

  // prune audio from previous runs that nothing references any more
  for (const f of fs.readdirSync(dir)) {
    if (/^line-.*\.(wav|mp3|json)$/.test(f) && !used.has(f)) fs.unlinkSync(path.join(dir, f));
  }
  if (args.minutes) script.targetMinutes = target;

  script.voice = voice;
  writeScript(slug, script);
  const totalMin = (estimateVideoSec(script) / 60).toFixed(1);
  console.log(`[tts] done — ${synthCount} lines synthesized, ${reusedCount} reused from the store, ~${totalMin} min of video`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
