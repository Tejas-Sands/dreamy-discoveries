/**
 * Procedural music + sound effects. No samples, no licenses, no downloads:
 * a tiny software synth composes everything deterministically and writes
 * WAV files (gapless, so music loops seamlessly) into public/music and public/sfx.
 *
 *   node scripts/build-audio-assets.mjs            # build everything
 *   node scripts/build-audio-assets.mjs --only sfx # or: music
 *
 * Music loops: bouncy (120 bpm), story (96 bpm), lullaby (72 bpm, 3/4).
 * The Director picks one per video; the renderer ducks it under the voice.
 */
import fs from "node:fs";
import path from "node:path";
import { ROOT, parseArgs } from "./lib/common.mjs";

const SR = 32000;
const TAU = Math.PI * 2;

// ───────────────────────── helpers ─────────────────────────
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const midiHz = (m) => 440 * 2 ** ((m - 69) / 12);
const secs = (n) => Math.round(n * SR);

class Track {
  constructor(sec) {
    this.buf = new Float32Array(secs(sec));
  }
  /** mix `src` at `at` seconds; wrap=true folds tails around the loop end */
  add(src, at, gain = 1, wrap = false) {
    const start = secs(at);
    const n = this.buf.length;
    for (let i = 0; i < src.length; i++) {
      let j = start + i;
      if (j >= n) {
        if (!wrap) break;
        j %= n;
      }
      this.buf[j] += src[i] * gain;
    }
  }
}

function env(len, attack, decayRate, sustain = 0, release = 0) {
  // exponential decay after a linear attack; optional final linear release
  const out = new Float32Array(len);
  const a = Math.max(1, secs(attack));
  const r = secs(release);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    let v = i < a ? i / a : Math.max(sustain, Math.exp(-decayRate * (t - attack)));
    if (r > 0 && i > len - r) v *= (len - i) / r;
    out[i] = v;
  }
  return out;
}

/** additive tone: partials = [[ratio, amp, decayRate], ...] */
function tone(freq, sec, partials, attack = 0.003) {
  const len = secs(sec);
  const out = new Float32Array(len);
  for (const [ratio, amp, decay] of partials) {
    const f = freq * ratio;
    if (f > SR / 2.2) continue;
    for (let i = 0; i < len; i++) {
      const t = i / SR;
      const a = i < secs(attack) ? i / secs(attack) : Math.exp(-decay * (t - attack));
      out[i] += amp * a * Math.sin(TAU * f * t);
    }
  }
  const rel = secs(0.01);
  for (let i = 0; i < rel; i++) out[len - 1 - i] *= i / rel;
  return out;
}

const marimba = (f, sec = 0.8) => tone(f, sec, [[1, 1, 5], [4, 0.35, 12], [10, 0.08, 25]]);
const glock = (f, sec = 1.2) => tone(f, sec, [[1, 0.8, 3], [2.75, 0.25, 6], [5.4, 0.1, 9]]);
const musicBox = (f, sec = 1.6) => tone(f, sec, [[1, 0.9, 2.2], [3.9, 0.22, 5], [8.7, 0.06, 8]], 0.002);
const softPad = (f, sec) => tone(f, sec, [[1, 0.5, 0.6], [2, 0.18, 0.8], [3, 0.06, 1]], 0.15);

/** Karplus-Strong plucked string (ukulele / guitar) */
function pluck(freq, sec, { decay = 0.996, bright = 0.6, seed = 1 } = {}) {
  const len = secs(sec);
  const N = Math.max(2, Math.round(SR / freq));
  const r = rng(seed * 7919 + Math.round(freq));
  const ring = new Float32Array(N);
  let prev = 0;
  for (let i = 0; i < N; i++) {
    const white = r() * 2 - 1;
    prev = prev * (1 - bright) + white * bright; // darker string = less bright
    ring[i] = prev;
  }
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const k = i % N;
    const next = (k + 1) % N;
    out[i] = ring[k];
    ring[k] = decay * 0.5 * (ring[k] + ring[next]);
  }
  const rel = secs(0.02);
  for (let i = 0; i < rel; i++) out[len - 1 - i] *= i / rel;
  return out;
}

function bass(freq, sec) {
  const len = secs(sec);
  const out = new Float32Array(len);
  const e = env(len, 0.005, 5, 0, 0.02);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const p = TAU * freq * t;
    out[i] = e[i] * (Math.sin(p) + 0.25 * Math.sin(2 * p) + 0.08 * Math.sin(3 * p));
  }
  return out;
}

function noise(sec, seed = 3) {
  const r = rng(seed);
  const out = new Float32Array(secs(sec));
  for (let i = 0; i < out.length; i++) out[i] = r() * 2 - 1;
  return out;
}

function lowpass(buf, cutoffHz) {
  const out = new Float32Array(buf.length);
  const rc = 1 / (TAU * cutoffHz);
  const dt = 1 / SR;
  const a = dt / (rc + dt);
  let y = 0;
  for (let i = 0; i < buf.length; i++) {
    y += a * (buf[i] - y);
    out[i] = y;
  }
  return out;
}

function highpass(buf, cutoffHz) {
  const lp = lowpass(buf, cutoffHz);
  const out = new Float32Array(buf.length);
  for (let i = 0; i < buf.length; i++) out[i] = buf[i] - lp[i];
  return out;
}

function mul(buf, other) {
  const out = new Float32Array(buf.length);
  for (let i = 0; i < buf.length; i++) out[i] = buf[i] * (typeof other === "number" ? other : other[i] ?? 0);
  return out;
}

function kick(sec = 0.3) {
  const len = secs(sec);
  const out = new Float32Array(len);
  let phase = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const f = 48 + 130 * Math.exp(-t * 28);
    phase += (TAU * f) / SR;
    out[i] = Math.sin(phase) * Math.exp(-t * 11) * (i < 20 ? i / 20 : 1);
  }
  return out;
}

function snare(sec = 0.25, seed = 5) {
  const n = mul(highpass(noise(sec, seed), 1800), env(secs(sec), 0.001, 22));
  const body = tone(190, sec, [[1, 0.6, 30]]);
  const out = new Float32Array(n.length);
  for (let i = 0; i < out.length; i++) out[i] = n[i] * 0.8 + body[i];
  return out;
}

function clapHit(seed = 9) {
  const t = new Track(0.35);
  for (let k = 0; k < 3; k++) {
    t.add(mul(highpass(lowpass(noise(0.08, seed + k), 5000), 900), env(secs(0.08), 0.001, 60)), k * 0.011, 0.7);
  }
  t.add(mul(highpass(lowpass(noise(0.3, seed + 7), 4000), 800), env(secs(0.3), 0.001, 18)), 0.03, 0.8);
  return t.buf;
}

function shaker(sec = 0.12, seed = 11) {
  return mul(highpass(noise(sec, seed), 5500), env(secs(sec), 0.008, 40));
}

function hat(sec = 0.08, seed = 13) {
  return mul(highpass(noise(sec, seed), 7000), env(secs(sec), 0.001, 70));
}

function woodblock(freq = 1200, sec = 0.18) {
  return tone(freq, sec, [[1, 1, 45], [2.1, 0.35, 70], [3.4, 0.1, 90]], 0.001);
}

/** simple feedback delay — enough "room" for lullabies and sparkles */
function delay(buf, timeSec, feedback, mix) {
  const out = new Float32Array(buf.length);
  const d = secs(timeSec);
  for (let i = 0; i < buf.length; i++) {
    const wet = i >= d ? out[i - d] * feedback + buf[i - d] * (1 - feedback) : 0;
    out[i] = buf[i] + wet * mix;
  }
  return out;
}

function finalize(buf, peak = 0.85) {
  // soft clip, then normalize
  const out = new Float32Array(buf.length);
  let max = 0;
  for (let i = 0; i < buf.length; i++) {
    out[i] = Math.tanh(buf[i] * 0.9);
    max = Math.max(max, Math.abs(out[i]));
  }
  const g = max > 0 ? peak / max : 1;
  for (let i = 0; i < out.length; i++) out[i] *= g;
  // 4 ms edge fades so loops and one-shots never click
  const edge = secs(0.004);
  for (let i = 0; i < edge; i++) {
    out[i] *= i / edge;
    out[out.length - 1 - i] *= i / edge;
  }
  return out;
}

function writeWav(file, buf) {
  const data = Buffer.alloc(buf.length * 2);
  for (let i = 0; i < buf.length; i++) {
    const v = Math.max(-1, Math.min(1, buf[i]));
    data.writeInt16LE(Math.round(v * 32767), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(SR, 24);
  header.writeUInt32LE(SR * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.concat([header, data]));
  console.log(`[audio] ${path.relative(ROOT, file)}  ${(buf.length / SR).toFixed(2)}s  ${((44 + data.length) / 1024).toFixed(0)} KB`);
}

// ───────────────────────── music theory bits ─────────────────────────
const CHORDS = {
  C: [60, 64, 67], G: [55, 59, 62], Am: [57, 60, 64], F: [53, 57, 60],
  Dm: [50, 53, 57], Em: [52, 55, 59], G7: [55, 59, 62, 65],
};
const PENTA = [0, 2, 4, 7, 9]; // C major pentatonic degrees

/** generate a catchy AABA melody in the pentatonic scale, fitted to the chords */
function melody({ bars, beatsPerBar, chords, seed, base = 72, density = 1 }) {
  const r = rng(seed);
  const patterns =
    beatsPerBar === 3
      ? [[1, 1, 1], [2, 1], [1, 2], [1.5, 0.5, 1], [3]]
      : [[1, 1, 1, 1], [1, 0.5, 0.5, 1, 1], [0.5, 0.5, 1, 1, 1], [1, 1, 2], [2, 1, 1], [1.5, 0.5, 1, 1], [1, 0.5, 0.5, 2]];
  const pentaAbs = [];
  for (let oct = -1; oct <= 1; oct++) for (const d of PENTA) pentaAbs.push(base + oct * 12 + d);
  const nearestChordTone = (m, chord) => {
    let best = m;
    let bd = 99;
    for (const p of pentaAbs) {
      const dist = Math.abs(p - m);
      if (chord.some((c) => (c - p) % 12 === 0) && dist < bd) { bd = dist; best = p; }
    }
    return best;
  };
  const makePhrase = (nBars, startIdx) => {
    const notes = [];
    let idx = startIdx;
    for (let b = 0; b < nBars; b++) {
      const pat = patterns[Math.floor(r() * patterns.length)];
      let beat = 0;
      for (let k = 0; k < pat.length; k++) {
        if (density < 1 && r() > density && k > 0) { beat += pat[k]; continue; }
        const step = r() < 0.2 ? 0 : r() < 0.7 ? (r() < 0.5 ? 1 : -1) : r() < 0.5 ? 2 : -2;
        idx = Math.max(3, Math.min(pentaAbs.length - 4, idx + step));
        notes.push({ bar: b, beat, dur: pat[k], midi: pentaAbs[idx] });
        beat += pat[k];
      }
    }
    return notes;
  };
  const half = Math.max(1, Math.round(bars / 4));
  const A = makePhrase(half, 7);
  const B = makePhrase(half, 9);
  const form = [A, A, B, A];
  const out = [];
  let bar = 0;
  for (const phrase of form) {
    for (const n of phrase) {
      const absBar = bar + n.bar;
      if (absBar >= bars) continue;
      const chord = chords[absBar % chords.length];
      // last note of each phrase lands on a chord tone
      const isLast = n === phrase[phrase.length - 1];
      const midi = isLast || r() < 0.35 ? nearestChordTone(n.midi, CHORDS[chord]) : n.midi;
      out.push({ bar: absBar, beat: n.beat, dur: n.dur, midi });
    }
    bar += half;
  }
  return out;
}

// ───────────────────────── music loops ─────────────────────────
function buildBouncy() {
  const bpm = 120, beatsPerBar = 4, bars = 16;
  const beat = 60 / bpm;
  const total = bars * beatsPerBar * beat;
  const t = new Track(total);
  const chords = ["C", "G", "Am", "F", "C", "G", "F", "G", "C", "G", "Am", "F", "F", "G", "C", "C"];
  const at = (bar, b) => (bar * beatsPerBar + b) * beat;

  for (let bar = 0; bar < bars; bar++) {
    const chord = CHORDS[chords[bar]];
    // ukulele strum: d - d u - u d u
    const strumPattern = [[0, 1, 1], [1, 0.6, 1], [1.5, 0.45, -1], [2.5, 0.45, -1], [3, 0.9, 1], [3.5, 0.45, -1]];
    for (const [b, g, dir] of strumPattern) {
      const notes = [...chord, chord[0] + 12];
      notes.forEach((m, i) => {
        const order = dir > 0 ? i : notes.length - 1 - i;
        t.add(pluck(midiHz(m), 0.7, { decay: 0.994, bright: 0.5, seed: bar * 10 + i }), at(bar, b) + order * 0.012, 0.28 * g, true);
      });
    }
    // oom-pah bass
    t.add(bass(midiHz(chord[0] - 24), 0.45), at(bar, 0), 0.75, true);
    t.add(bass(midiHz(chord[2] - 24), 0.4), at(bar, 1), 0.5, true);
    t.add(bass(midiHz(chord[0] - 24), 0.45), at(bar, 2), 0.75, true);
    t.add(bass(midiHz(chord[2] - 24), 0.4), at(bar, 3), 0.5, true);
    // drums
    t.add(kick(), at(bar, 0), 0.9, true);
    t.add(kick(), at(bar, 2), 0.8, true);
    t.add(clapHit(bar), at(bar, 1), 0.45, true);
    t.add(clapHit(bar + 40), at(bar, 3), 0.45, true);
    for (let e = 0; e < 8; e++) t.add(shaker(0.12, bar * 8 + e), at(bar, e * 0.5), e % 2 === 0 ? 0.22 : 0.12, true);
    // fill on the last beat of every 4th bar
    if (bar % 4 === 3) for (let k = 0; k < 4; k++) t.add(snare(0.15, bar + k), at(bar, 3 + k * 0.25), 0.25 + k * 0.08, true);
  }
  for (const n of melody({ bars, beatsPerBar, chords, seed: 2026, base: 72 })) {
    t.add(marimba(midiHz(n.midi), Math.min(1.1, n.dur * beat + 0.3)), at(n.bar, n.beat), 0.55, true);
    if (n.bar >= 8) t.add(glock(midiHz(n.midi + 12), 0.6), at(n.bar, n.beat), 0.16, true);
  }
  return finalize(t.buf, 0.8);
}

function buildStory() {
  const bpm = 96, beatsPerBar = 4, bars = 16;
  const beat = 60 / bpm;
  const t = new Track(bars * beatsPerBar * beat);
  const chords = ["C", "Am", "F", "G", "C", "Em", "F", "G", "Am", "F", "C", "G", "F", "Em", "Dm", "G7"];
  const at = (bar, b) => (bar * beatsPerBar + b) * beat;
  for (let bar = 0; bar < bars; bar++) {
    const chord = CHORDS[chords[bar]];
    // gentle 8th-note arpeggio: 1 5 3 5 8 5 3 5
    const arp = [chord[0], chord[2], chord[1], chord[2], chord[0] + 12, chord[2], chord[1], chord[2]];
    arp.forEach((m, i) => t.add(marimba(midiHz(m), 0.55), at(bar, i * 0.5), i % 4 === 0 ? 0.4 : 0.26, true));
    t.add(pluck(midiHz(chord[0] - 12), 1.6, { decay: 0.998, bright: 0.35, seed: bar }), at(bar, 0), 0.4, true);
    t.add(pluck(midiHz(chord[1]), 1.2, { decay: 0.997, bright: 0.35, seed: bar + 3 }), at(bar, 2), 0.22, true);
    t.add(bass(midiHz(chord[0] - 24), 1.2), at(bar, 0), 0.5, true);
    for (let e = 0; e < 4; e++) t.add(shaker(0.15, 100 + bar * 4 + e), at(bar, e + 0.5), 0.09, true);
    t.add(softPad(midiHz(chord[0]), beatsPerBar * beat), at(bar, 0), 0.06, true);
  }
  for (const n of melody({ bars, beatsPerBar, chords, seed: 77, base: 79, density: 0.6 })) {
    t.add(glock(midiHz(n.midi), Math.min(1.6, n.dur * beat + 0.5)), at(n.bar, n.beat), 0.3, true);
  }
  return finalize(delay(t.buf, beat * 0.75, 0.3, 0.25), 0.75);
}

function buildLullaby() {
  const bpm = 72, beatsPerBar = 3, bars = 16;
  const beat = 60 / bpm;
  const t = new Track(bars * beatsPerBar * beat);
  const chords = ["C", "F", "C", "G", "C", "F", "G", "C", "Am", "F", "C", "G", "F", "C", "G", "C"];
  const at = (bar, b) => (bar * beatsPerBar + b) * beat;
  for (let bar = 0; bar < bars; bar++) {
    const chord = CHORDS[chords[bar]];
    t.add(musicBox(midiHz(chord[0]), 1.8), at(bar, 0), 0.5, true);
    t.add(musicBox(midiHz(chord[1] + 12), 1.2), at(bar, 1), 0.3, true);
    t.add(musicBox(midiHz(chord[2] + 12), 1.2), at(bar, 2), 0.3, true);
    t.add(musicBox(midiHz(chord[0] + 24), 0.9), at(bar, 1.5), 0.14, true);
    t.add(softPad(midiHz(chord[0] - 12), beatsPerBar * beat), at(bar, 0), 0.12, true);
  }
  for (const n of melody({ bars, beatsPerBar, chords, seed: 5, base: 84, density: 0.7 })) {
    t.add(musicBox(midiHz(n.midi), Math.min(2.2, n.dur * beat + 0.8)), at(n.bar, n.beat), 0.36, true);
  }
  return finalize(delay(t.buf, beat * 0.66, 0.4, 0.35), 0.7);
}

// ───────────────────────── sound effects ─────────────────────────
function sweep(sec, f0, f1, { curve = 6, wobbleHz = 0, wobbleAmt = 0, harmonics = [[1, 1]] } = {}) {
  const len = secs(sec);
  const out = new Float32Array(len);
  let phase = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const k = 1 - Math.exp(-curve * (t / sec));
    let f = f0 + (f1 - f0) * k;
    if (wobbleHz) f *= 1 + wobbleAmt * Math.sin(TAU * wobbleHz * t) * Math.exp(-t * 4);
    phase += (TAU * f) / SR;
    let v = 0;
    for (const [h, a] of harmonics) v += a * Math.sin(phase * h);
    out[i] = v;
  }
  return out;
}

const SFX = {
  pop: () => mul(sweep(0.16, 380, 950, { curve: 10 }), env(secs(0.16), 0.002, 22)),
  bubble: () => mul(sweep(0.22, 300, 760, { curve: 4 }), env(secs(0.22), 0.004, 16)),
  boing: () =>
    mul(
      sweep(0.55, 520, 110, { curve: 5, wobbleHz: 14, wobbleAmt: 0.18, harmonics: [[1, 1], [2, 0.35], [3, 0.15]] }),
      env(secs(0.55), 0.003, 6)
    ),
  whoosh: () => {
    const n = noise(0.55, 21);
    const len = n.length;
    const out = new Float32Array(len);
    let y = 0;
    for (let i = 0; i < len; i++) {
      const t = i / len;
      const cutoff = 300 + 5000 * Math.sin(Math.PI * t);
      const a = (1 / SR) / (1 / (TAU * cutoff) + 1 / SR);
      y += a * (n[i] - y);
      out[i] = y * Math.sin(Math.PI * t) ** 1.5;
    }
    return highpass(out, 250);
  },
  slide: () => {
    const n = noise(0.45, 22);
    const out = new Float32Array(n.length);
    let y = 0;
    for (let i = 0; i < n.length; i++) {
      const t = i / n.length;
      const cutoff = 4500 * (1 - t) + 300;
      const a = (1 / SR) / (1 / (TAU * cutoff) + 1 / SR);
      y += a * (n[i] - y);
      out[i] = y * Math.sin(Math.PI * t);
    }
    return highpass(out, 200);
  },
  ding: () => {
    const t = new Track(1.2);
    t.add(glock(1568, 1.2), 0, 1);
    t.add(glock(3136, 0.8), 0, 0.3);
    return t.buf;
  },
  sparkle: () => {
    const t = new Track(1.3);
    [84, 88, 91, 96, 100, 103].forEach((m, i) => t.add(glock(midiHz(m), 0.8), i * 0.055, 0.5 - i * 0.04));
    return delay(t.buf, 0.11, 0.35, 0.4);
  },
  magic: () => {
    const t = new Track(1.5);
    t.add(mul(sweep(1.0, 300, 2400, { curve: 2, wobbleHz: 9, wobbleAmt: 0.05 }), env(secs(1.0), 0.05, 2.5)), 0, 0.35);
    [79, 84, 88, 91, 96, 100, 103, 108].forEach((m, i) => t.add(glock(midiHz(m), 0.9), 0.35 + i * 0.06, 0.4));
    return delay(t.buf, 0.13, 0.35, 0.35);
  },
  clap: () => clapHit(33),
  applause: () => {
    const t = new Track(2.4);
    const r = rng(44);
    for (let i = 0; i < 70; i++) {
      const at = r() * 2.1;
      const g = (0.35 + r() * 0.5) * Math.sin(Math.PI * Math.min(1, at / 2.2)) ** 0.7;
      t.add(mul(highpass(lowpass(noise(0.06, 500 + i), 3500 + r() * 2500), 700), env(secs(0.06), 0.001, 55)), at, g);
    }
    return lowpass(t.buf, 6000);
  },
  ticktock: () => {
    const t = new Track(2.0);
    t.add(woodblock(1400, 0.15), 0, 0.8);
    t.add(woodblock(950, 0.15), 0.5, 0.65);
    t.add(woodblock(1400, 0.15), 1.0, 0.8);
    t.add(woodblock(950, 0.15), 1.5, 0.65);
    return t.buf;
  },
  drumroll: () => {
    const t = new Track(1.3);
    for (let i = 0; i < 40; i++) t.add(snare(0.09, 60 + i), i * 0.03, 0.25 + (i / 40) * 0.6);
    t.add(clapHit(61), 1.2, 0.8);
    return t.buf;
  },
  splash: () => {
    const t = new Track(0.8);
    t.add(mul(lowpass(noise(0.7, 70), 2500), env(secs(0.7), 0.01, 7)), 0, 0.9);
    t.add(mul(sweep(0.25, 700, 250, { curve: 5 }), env(secs(0.25), 0.003, 14)), 0.02, 0.4);
    for (let i = 0; i < 6; i++) t.add(SFX.bubble(), 0.15 + i * 0.09, 0.25);
    return t.buf;
  },
  coin: () => {
    const t = new Track(0.6);
    t.add(tone(988, 0.12, [[1, 1, 8], [2, 0.3, 10]]), 0, 0.7);
    t.add(tone(1319, 0.5, [[1, 1, 6], [2, 0.3, 8]]), 0.09, 0.7);
    return t.buf;
  },
  heart: () => {
    const t = new Track(1.1);
    t.add(musicBox(659, 0.9), 0, 0.6);
    t.add(musicBox(784, 0.9), 0.18, 0.6);
    return delay(t.buf, 0.15, 0.3, 0.4);
  },
  tada: () => {
    const t = new Track(2.6);
    for (let i = 0; i < 24; i++) t.add(snare(0.08, 80 + i), i * 0.028, 0.15 + (i / 24) * 0.35);
    [72, 76, 79, 84].forEach((m, i) => {
      t.add(glock(midiHz(m), 1.4), 0.7 + i * 0.09, 0.55);
      t.add(pluck(midiHz(m - 12), 1.2, { decay: 0.997, seed: i }), 0.7 + i * 0.09, 0.35);
    });
    t.add(glock(midiHz(88), 1.8), 1.05, 0.6);
    t.add(mul(highpass(noise(1.2, 90), 3000), env(secs(1.2), 0.002, 4)), 1.05, 0.35);
    t.add(kick(), 1.05, 0.8);
    return delay(t.buf, 0.14, 0.3, 0.3);
  },
  yawn: () => {
    const len = secs(1.3);
    const out = new Float32Array(len);
    let phase = 0;
    for (let i = 0; i < len; i++) {
      const t = i / SR;
      const f = 250 - 90 * (t / 1.3) + 6 * Math.sin(TAU * 5 * t);
      phase += (TAU * f) / SR;
      const e = Math.sin(Math.PI * Math.min(1, t / 1.3)) ** 1.3;
      out[i] = e * (Math.sin(phase) + 0.5 * Math.sin(2 * phase) + 0.25 * Math.sin(3 * phase) + 0.12 * Math.sin(4 * phase));
    }
    return lowpass(out, 1200);
  },
  stomp: () => {
    const t = new Track(0.35);
    t.add(kick(0.3), 0, 1);
    t.add(mul(lowpass(noise(0.12, 99), 900), env(secs(0.12), 0.001, 35)), 0, 0.5);
    return t.buf;
  },
  intro: () => {
    const t = new Track(2.4);
    [60, 64, 67, 72, 76, 79, 84].forEach((m, i) => t.add(pluck(midiHz(m), 1.0, { decay: 0.997, seed: i }), i * 0.07, 0.5));
    [84, 88, 91, 96].forEach((m, i) => t.add(glock(midiHz(m), 1.2), 0.5 + i * 0.08, 0.4));
    for (let e = 0; e < 8; e++) t.add(shaker(0.1, e), e * 0.125, 0.15);
    t.add(kick(), 0.5, 0.7);
    return delay(t.buf, 0.12, 0.3, 0.3);
  },
};

// ───────────────────────── main ─────────────────────────
function main() {
  const args = parseArgs();
  const only = args.only;
  if (!only || only === "music") {
    writeWav(path.join(ROOT, "public", "music", "bouncy.wav"), buildBouncy());
    writeWav(path.join(ROOT, "public", "music", "story.wav"), buildStory());
    writeWav(path.join(ROOT, "public", "music", "lullaby.wav"), buildLullaby());
  }
  if (!only || only === "sfx") {
    for (const [name, make] of Object.entries(SFX)) {
      writeWav(path.join(ROOT, "public", "sfx", `${name}.wav`), finalize(make(), 0.9));
    }
  }
}

main();
