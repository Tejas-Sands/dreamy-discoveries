import type { Line } from "./types";

/**
 * How open the mouth should be `t` seconds into a spoken line (0..1).
 * Uses the word timings: the mouth flaps while a word is being said and
 * closes in the gaps, which is what sells the "she's really singing" effect.
 */
export function mouthAt(line: Line | null | undefined, t: number): number {
  if (!line || t < 0) return 0;
  const dur = line.durationSec ?? 0;
  if (dur > 0 && t >= dur) return 0;
  const envelope = line.envelope;
  if (envelope && envelope.fps > 0 && envelope.values.length > 0) {
    const sampleAt = (time: number) => {
      const sample = Math.max(0,time) * envelope.fps;
      const index = Math.floor(sample);
      const a = envelope.values[index] ?? 0, b = envelope.values[index+1] ?? 0;
      return a+(b-a)*(sample-index);
    };
    return Math.max(0,Math.min(1,.25*sampleAt(t-.025)+.5*sampleAt(t)+.25*sampleAt(t+.025)));
  }
  const words = line.words;
  if (!words || words.length === 0) {
    return dur > 0 ? 0.35 + 0.65 * Math.abs(Math.sin(t * 2 * Math.PI * 5.5)) : 0;
  }
  for (const w of words) {
    if (t >= w.start && t < w.end) {
      const len = Math.max(0.08, w.end - w.start);
      const k = (t - w.start) / len; // 0..1 through the word
      const syllables = Math.max(1, Math.round(w.text.replace(/[^a-z]/gi, "").length / 3));
      const flap = Math.abs(Math.sin(k * Math.PI * syllables));
      const edge = Math.min(1, k / 0.15, (1 - k) / 0.15);
      return (0.25 + 0.75 * flap) * Math.max(0,edge);
    }
  }
  return 0;
}

/** Approximate spelling shapes. This uses cached timing/envelopes, not phonemes. */
export type MouthShape = 'rest' | 'closed' | 'open' | 'wide' | 'round';

export function mouthShapeAt(line: Line | null | undefined, t: number): MouthShape {
  if (!line || t < 0 || (line.durationSec !== undefined && t >= line.durationSec)) return 'rest';
  if (mouthAt(line,t) < .07) return 'rest';
  const word=line.words?.find(w=>t>=w.start&&t<w.end);
  // Word gaps stay closed even when a measured envelope contains room noise.
  if(line.words?.length&&!word)return 'rest';
  if(!word)return 'open';
  const text=word.text.toLowerCase().replace(/[^a-z]/g,'');
  const k=(t-word.start)/Math.max(.08,word.end-word.start);
  if ((/^[bmp]/.test(text)&&k<.18)||(/[bmp]$/.test(text)&&k>.8)) return 'closed';
  if(/oo|ou|ow|oa|[ou]/.test(text))return 'round';
  if(/ee|ea|ie|[ei]/.test(text))return 'wide';
  return 'open';
}
