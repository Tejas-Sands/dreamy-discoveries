import type { Line } from "./types";

/**
 * How open the mouth should be `t` seconds into a spoken line (0..1).
 * Uses the word timings: the mouth flaps while a word is being said and
 * closes in the gaps, which is what sells the "she's really singing" effect.
 */
export function mouthAt(line: Line | null | undefined, t: number): number {
  if (!line || t < 0) return 0;
  const dur = line.durationSec ?? 0;
  if (dur > 0 && t > dur) return 0;
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
      return 0.25 + 0.75 * flap * Math.min(1, edge + 0.4);
    }
  }
  return 0;
}
