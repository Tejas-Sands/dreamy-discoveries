/**
 * Frame arithmetic that mirrors src/lib/timing.ts EXACTLY (same constants, same
 * rounding), so scripts can plan render chunks and predict video length without
 * bundling Remotion. If you change timing.ts, change this too (checked by
 * `node scripts/plan.mjs --verify-timing`).
 */
export const FPS = 30;
export const T = { INTRO_MIN: 3.4, INTRO_SPEAK_AT: 1.0, COUNTDOWN: 1.9, LINE_GAP: 0.3, SCENE_PAD: 0.55, REVEAL: 1.7, END_MIN: 5, BRAND_OUTRO: 6, BRAND_INTRO: 2.4, DEFAULT_LINE: 2.2 };
const toFrames = (sec) => Math.round(sec * FPS);
const lineFrames = (line,precise) => precise
  ? toFrames(line.voxPreSec ?? 0) + toFrames(line.durationSec ?? T.DEFAULT_LINE) + toFrames(T.LINE_GAP) + toFrames(line.voxPostSec ?? 0)
  : toFrames((line.voxPreSec ?? 0) + (line.durationSec ?? T.DEFAULT_LINE) + T.LINE_GAP + (line.voxPostSec ?? 0));
const pinnedPre = line => line?.vox?.some(cue => cue.file !== undefined) ? toFrames(line.voxPreSec ?? 0) : 0;

/** Shared opening offset for planning and local scene reports. */
export function estimateIntroFrames(script) {
  const precise = (script.presentationVersion ?? 0) >= 4;
  const introSpeech = script.intro?.durationSec ?? 0;
  const introAt = Math.max(toFrames(T.INTRO_SPEAK_AT),pinnedPre(script.intro));
  return script.opening === 'welcome'
    ? toFrames(T.BRAND_INTRO) + Math.max(toFrames(T.INTRO_MIN),introAt + toFrames(introSpeech) + (precise ? toFrames(script.intro?.voxPostSec ?? 0) : 0) + toFrames(.6))
    : (script.presentationVersion ?? 0) >= 1 && script.opening === 'hook' ? 0 : precise
    ? Math.max(toFrames(T.INTRO_MIN),introAt + toFrames(introSpeech) + toFrames(script.intro?.voxPostSec ?? 0) + toFrames(.4 + T.COUNTDOWN))
    : toFrames(Math.max(T.INTRO_MIN, T.INTRO_SPEAK_AT + introSpeech + 0.4 + T.COUNTDOWN));
}

/** total frames of the composition for this script (same as computeSchedule(script).total) */
export function estimateFrames(script) {
  const precise = (script.presentationVersion ?? 0) >= 4;
  let cursor = estimateIntroFrames(script);
  for (const scene of script.scenes ?? []) {
    const asked = scene.lines.filter((l) => l.role !== "praise");
    const praise = scene.lines.filter((l) => l.role === "praise");
    let local = 0;
    for (const line of asked) local += lineFrames(line,precise);
    const holdDuration = toFrames(scene.holdSec ?? 0);
    if (scene.question) {
      local += holdDuration + toFrames(T.REVEAL);
      for (const line of praise) local += lineFrames(line,precise);
      local += toFrames(T.SCENE_PAD);
    } else {
      for (const line of praise) local += lineFrames(line,precise);
      local += holdDuration + toFrames(T.SCENE_PAD);
    }
    cursor += local;
  }
  const outroSpeech = script.outro?.durationSec ?? 0;
  cursor += precise ? Math.max(toFrames(T.END_MIN),Math.max(toFrames(.8),pinnedPre(script.outro)) + toFrames(outroSpeech) + toFrames(script.outro?.voxPostSec ?? 0) + toFrames(1.6))
    : toFrames(Math.max(T.END_MIN, 0.8 + outroSpeech + 1.6));
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
