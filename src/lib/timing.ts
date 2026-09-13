import type { KidsScript, Line } from "./types";

export const FPS = 30;
export const INTRO_MIN_SEC = 3.4;
/** the greeting is spoken this long after the title card starts */
export const INTRO_SPEAK_AT_SEC = 1.0;
/** after the greeting: "Ready… set… GO!" (or "Story time!" / "Sleepy time!") before the first scene */
export const COUNTDOWN_SEC = 1.9;
export const LINE_GAP_SEC = 0.3;
export const SCENE_PAD_SEC = 0.55;
/** answer reveal (bubble pops, big answer, confetti) between the thinking pause and the praise line */
export const REVEAL_SEC = 1.7;
export const END_MIN_SEC = 5;
/** scenes overlap the previous scene by this many frames so transitions can animate on top of it */
export const TRANSITION_FRAMES = 12;
/** Fallback when a line has no measured audio duration (e.g. in the Studio before TTS ran) */
const DEFAULT_LINE_SEC = 2.2;

export const toFrames = (sec: number) => Math.round(sec * FPS);

export interface LineSlot {
  /** frames, relative to scene start, where the SPEECH starts (the slot itself starts `pre` frames earlier) */
  from: number;
  /** frames reserved before the speech for a start-of-line vocalization */
  pre: number;
  /** total frames of the slot measured from `from - pre` */
  duration: number;
  line: Line;
}

export interface SceneSlot {
  from: number; // frames, absolute
  duration: number;
  lines: LineSlot[];
  /** question scenes: thinking pause + answer reveal (frames relative to scene start) */
  holdFrom: number;
  holdDuration: number;
  revealFrom: number;
  revealDuration: number;
  /** first praise line start (relative), or -1 */
  praiseFrom: number;
}

export interface Schedule {
  intro: number;
  scenes: SceneSlot[];
  endFrom: number;
  endDuration: number;
  total: number;
  /** absolute frame ranges where a voice is speaking (music ducks here) */
  voice: Array<[number, number]>;
  /** absolute frame the countdown starts on the title card */
  countdownFrom: number;
}

/** speech + gap, plus the room reserved for a recorded vocalization before / after it */
const lineFrames = (line: Line) => toFrames((line.voxPreSec ?? 0) + (line.durationSec ?? DEFAULT_LINE_SEC) + LINE_GAP_SEC + (line.voxPostSec ?? 0));
const preFrames = (line: Line) => toFrames(line.voxPreSec ?? 0);

export function computeSchedule(script: KidsScript): Schedule {
  const voice: Array<[number, number]> = [];
  const introSpeech = script.intro?.durationSec ?? 0;
  const intro = toFrames(Math.max(INTRO_MIN_SEC, INTRO_SPEAK_AT_SEC + introSpeech + 0.4 + COUNTDOWN_SEC));
  if (introSpeech > 0) voice.push([toFrames(INTRO_SPEAK_AT_SEC), toFrames(INTRO_SPEAK_AT_SEC + introSpeech)]);

  let cursor = intro;
  const scenes: SceneSlot[] = script.scenes.map((scene) => {
    const isQuestion = !!scene.question;
    const asked = scene.lines.filter((l) => l.role !== "praise");
    const praise = scene.lines.filter((l) => l.role === "praise");
    const lines: LineSlot[] = [];
    let local = 0;
    for (const line of asked) {
      const duration = lineFrames(line);
      const pre = preFrames(line);
      lines.push({ from: local + pre, pre, duration, line });
      local += duration;
    }
    let holdFrom = local;
    let holdDuration = toFrames(scene.holdSec ?? 0);
    let revealFrom = -1;
    let revealDuration = 0;
    let praiseFrom = -1;
    if (isQuestion) {
      revealFrom = holdFrom + holdDuration;
      revealDuration = toFrames(REVEAL_SEC);
      local = revealFrom + revealDuration;
      praiseFrom = local;
      for (const line of praise) {
        const duration = lineFrames(line);
        const pre = preFrames(line);
        lines.push({ from: local + pre, pre, duration, line });
        local += duration;
      }
      local += toFrames(SCENE_PAD_SEC);
    } else {
      // non-question scenes keep praise-role lines in order (moral chant ending)
      for (const line of praise) {
        const duration = lineFrames(line);
        const pre = preFrames(line);
        lines.push({ from: local + pre, pre, duration, line });
        local += duration;
      }
      holdFrom = local;
      local += holdDuration + toFrames(SCENE_PAD_SEC);
    }
    const slot: SceneSlot = {
      from: cursor,
      duration: local,
      lines,
      holdFrom,
      holdDuration,
      revealFrom,
      revealDuration,
      praiseFrom,
    };
    // order lines by time (praise lines were appended after the reveal)
    slot.lines.sort((a, b) => a.from - b.from);
    for (const l of slot.lines) {
      const spoken = toFrames(l.line.durationSec ?? DEFAULT_LINE_SEC);
      const post = toFrames(l.line.voxPostSec ?? 0);
      // the music ducks under the speech and under the recorded vocalizations around it
      voice.push([cursor + l.from - l.pre, cursor + l.from + spoken + post]);
    }
    cursor += local;
    return slot;
  });

  const endFrom = cursor;
  const outroSpeech = script.outro?.durationSec ?? 0;
  const endDuration = toFrames(Math.max(END_MIN_SEC, 0.8 + outroSpeech + 1.6));
  if (outroSpeech > 0) voice.push([endFrom + toFrames(0.8), endFrom + toFrames(0.8 + outroSpeech)]);
  cursor += endDuration;

  return { intro, scenes, endFrom, endDuration, total: cursor, voice, countdownFrom: intro - toFrames(COUNTDOWN_SEC) };
}

/** music gain for a frame: ducks under speech, fades in/out at the ends */
export function musicVolume(frame: number, schedule: Schedule, base = 0.36, ducked = 0.13): number {
  const ramp = 8;
  let v = base;
  for (const [a, b] of schedule.voice) {
    if (frame >= a - ramp && frame <= b + ramp) {
      const edge = frame < a ? (a - frame) / ramp : frame > b ? (frame - b) / ramp : 0;
      v = Math.min(v, ducked + (base - ducked) * edge);
    }
  }
  const fadeIn = Math.min(1, frame / 20);
  const fadeOut = Math.min(1, Math.max(0, (schedule.total - frame) / 45));
  return v * fadeIn * fadeOut;
}
