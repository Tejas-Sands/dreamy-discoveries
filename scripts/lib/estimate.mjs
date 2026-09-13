/**
 * Frame arithmetic that mirrors src/lib/timing.ts EXACTLY (same constants, same
 * rounding), so scripts can plan render chunks and predict video length without
 * bundling Remotion. If you change timing.ts, change this too (checked by
 * `node scripts/plan.mjs --verify-timing`).
 */
export const FPS = 30;
export const T = { INTRO_MIN: 3.4, INTRO_SPEAK_AT: 1.0, COUNTDOWN: 1.9, LINE_GAP: 0.3, SCENE_PAD: 0.55, REVEAL: 1.7, END_MIN: 5, BRAND_OUTRO: 6, DEFAULT_LINE: 2.2 };
const toFrames = (sec) => Math.round(sec * FPS);
const lineFrames = (line) => toFrames((line.voxPreSec ?? 0) + (line.durationSec ?? T.DEFAULT_LINE) + T.LINE_GAP + (line.voxPostSec ?? 0));

/** total frames of the composition for this script (same as computeSchedule(script).total) */
export function estimateFrames(script) {
  const introSpeech = script.intro?.durationSec ?? 0;
  let cursor = toFrames(Math.max(T.INTRO_MIN, T.INTRO_SPEAK_AT + introSpeech + 0.4 + T.COUNTDOWN));
  for (const scene of script.scenes ?? []) {
    const asked = scene.lines.filter((l) => l.role !== "praise");
    const praise = scene.lines.filter((l) => l.role === "praise");
    let local = 0;
    for (const line of asked) local += lineFrames(line);
    const holdDuration = toFrames(scene.holdSec ?? 0);
    if (scene.question) {
      local += holdDuration + toFrames(T.REVEAL);
      for (const line of praise) local += lineFrames(line);
      local += toFrames(T.SCENE_PAD);
    } else {
      for (const line of praise) local += lineFrames(line);
      local += holdDuration + toFrames(T.SCENE_PAD);
    }
    cursor += local;
  }
  const outroSpeech = script.outro?.durationSec ?? 0;
  cursor += toFrames(Math.max(T.END_MIN, 0.8 + outroSpeech + 1.6));
  cursor += toFrames(T.BRAND_OUTRO);
  return cursor;
}

export const estimateVideoSec = (script) => estimateFrames(script) / FPS;

/** split [0, total) into n contiguous inclusive ranges "a-b" for `remotion render --frames` */
export function chunkRanges(total, n) {
  const count = Math.max(1, Math.min(n, total));
  const size = Math.ceil(total / count);
  const ranges = [];
  for (let i = 0; i < count; i++) {
    const a = i * size;
    const b = Math.min(total - 1, a + size - 1);
    if (a > b) break;
    ranges.push(`${a}-${b}`);
  }
  return ranges;
}
