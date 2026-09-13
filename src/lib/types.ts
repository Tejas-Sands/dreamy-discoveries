/**
 * script.json schema (v2) — the single source of truth for a video.
 *
 *   LLM  ──writes──►  script.json  ──Director enriches──►  script.json  ──TTS enriches──►  script.json  ──Remotion renders
 *
 * The renderer is deliberately "dumb": every creative decision (emotion, action,
 * callouts, praise lines, gags, star rewards, moral sequence, music mood) is
 * already written into the file by scripts/lib/director.mjs, so a hand-edited
 * script renders exactly as written. Keep this in sync with scripts/lib/vocab.mjs.
 */

export type BackgroundKind = string; // any recipe name in library/backgrounds

export type CharacterKind = string; // any recipe name in library/characters, or "none"

export type PaletteKind = "night" | "meadow" | "ocean" | "candy" | "sunshine" | "forest" | "berry";

export type Emotion =
  | "happy"
  | "excited"
  | "sad"
  | "surprised"
  | "thinking"
  | "sleepy"
  | "love"
  | "worried"
  | "neutral";

export type Action =
  | "idle"
  | "wave"
  | "jump"
  | "clap"
  | "dance"
  | "spin"
  | "nod"
  | "shake"
  | "point"
  | "hug"
  | "sleep"
  | "think"
  | "cheer"
  | "stomp"
  | "swim"
  | "fly"
  | "walk"
  | "cry"
  | "eat"
  | "look";

export type SceneKind =
  | "verse"
  | "chorus"
  | "question"
  | "story"
  | "lesson"
  | "moral"
  | "bridge";

export type TransitionKind = "pop" | "slide" | "iris" | "wipe" | "fade";
export type CameraKind = "still" | "zoom-in" | "zoom-out" | "pan";

export type SfxName =
  | "pop"
  | "boing"
  | "whoosh"
  | "ding"
  | "sparkle"
  | "clap"
  | "applause"
  | "ticktock"
  | "drumroll"
  | "splash"
  | "coin"
  | "heart"
  | "bubble"
  | "magic"
  | "tada"
  | "slide"
  | "yawn"
  | "stomp";

export interface Word {
  text: string;
  /** seconds, relative to the start of the line's audio */
  start: number;
  end: number;
}

export interface Callout {
  kind: "word" | "number" | "count" | "color" | "emoji";
  /** big text to show (e.g. "RED", "3", "SHARE!") */
  text?: string;
  /** emoji shown with the text, or the object that gets counted */
  emoji?: string;
  /** css color for color callouts */
  color?: string;
  /** for kind "count": how many objects appear (1..10), synced to number words */
  count?: number;
}

export type VoxKind = "giggle" | "laugh" | "yay" | "wow" | "gasp" | "yum" | "yawn" | "hmm" | "aww" | "sigh";

/** a real recorded vocalization played at the start or the end of a line (never spoken by the TTS) */
export interface VoxCue {
  kind: VoxKind;
  at: "start" | "end";
  /** who makes the sound when it is not the line's own speaker (a laugh moved from the next line) */
  speaker?: "character" | "narrator" | "friend";
}

export interface Line {
  text: string;
  /** who is "saying" it: character / friend (their mouth moves) or narrator (character just reacts) */
  speaker?: "character" | "narrator" | "friend";
  emotion?: Emotion;
  action?: Action;
  callout?: Callout | null;
  sfx?: SfxName[];
  /** question scenes: "question" lines are asked, then the hold, then the "praise" line */
  role?: "question" | "praise" | "greeting" | "moral" | "bridge";
  /** giggles / laughs / gasps … stripped from the text by the Director and played as recordings */
  vox?: VoxCue[];
  /** seconds reserved before / after the speech for those recordings (Director) */
  voxPreSec?: number;
  voxPostSec?: number;
  /** filename inside public/generated/<slug>/, set by the TTS step */
  audio?: string;
  durationSec?: number;
  words?: Word[];
}

export interface Question {
  answer: { text: string; emoji?: string; color?: string };
}

export interface Gag {
  /** "peek": a different character peeks in from the edge for a beat; "flyby": an emoji crosses the sky */
  kind: "peek" | "flyby";
  /** peek: who peeks */
  character?: CharacterKind;
  /** flyby: what flies past (🦋 🐝 🎈 🌠 …) */
  emoji?: string;
  /** which edge it comes from (default right) */
  side?: "left" | "right";
  /** seconds after the scene starts */
  atSec: number;
}

export interface Scene {
  kind?: SceneKind;
  background: BackgroundKind;
  character: CharacterKind;
  /** an optional friend standing on the right */
  secondCharacter?: CharacterKind | null;
  /** scene-level defaults, lines can override */
  emotion?: Emotion;
  action?: Action;
  energy?: "calm" | "upbeat";
  /** extra seconds of silent animation after the lines (thinking pause, dance break) */
  holdSec?: number;
  lines: Line[];
  question?: Question | null;
  gag?: Gag | null;
  camera?: CameraKind;
  transition?: TransitionKind;
  /** which star (0-based) is awarded when this scene's praise line plays */
  starIndex?: number;
  /** an emoji prop the character holds/shows in this scene */
  prop?: string | null;
  /** party scenes (chorus, moral chant, finale): extra friends who hop in and dance at the edges */
  extras?: CharacterKind[] | null;
}

export interface YoutubeMeta {
  title: string;
  description: string;
  tags: string[];
}

export interface MusicSpec {
  /** filename inside public/music/ */
  file: string;
  bpm: number;
  mood: "bouncy" | "story" | "lullaby" | "none";
}

export interface KidsScript {
  version?: 2;
  type: "rhyme" | "story";
  slug: string;
  title: string;
  palette: PaletteKind;
  mainCharacter: { kind: CharacterKind; name: string };
  /** spoken over the title card: "Hi friends! I'm Benny!..." */
  intro?: Line | null;
  /** spoken over the end card */
  outro?: Line | null;
  voice?: string | null;
  music?: MusicSpec | null;
  /** one-sentence lesson (stories) — the Director turns it into moral scenes */
  moral?: string | null;
  /** two short rhyming lines the kids chant (stories) */
  moralRhyme?: string[] | null;
  stars?: { total: number } | null;
  youtube?: YoutubeMeta;
  scenes: Scene[];
  targetMinutes?: number;
  directed?: boolean;
}
