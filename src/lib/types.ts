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

export type TransitionKind = "none" | "pop" | "slide" | "iris" | "wipe" | "fade" | "leaf" | "page" | "ripple";
export type CameraKind = "still" | "zoom-in" | "zoom-out" | "pan";
export type SceneDirection = "dialogue" | "demonstration" | "thinking" | "celebration" | "lullaby" | "tender";

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
  /** who is "saying" it: character / friend (their mouth moves) or narrator (character just reacts), or a specific character ID */
  speaker?: "character" | "narrator" | "friend" | (string & {});
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
  /** Kokoro amplitude sampled once at synthesis time; old audio uses word timing. */
  envelope?: {fps: number; values: number[]};
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
  /** Director-generated timing may move into a speech gap; authored timing stays fixed. */
  auto?: boolean;
}

export interface Scene {
  kind?: SceneKind;
  direction?: SceneDirection;
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
  staging?: SceneStaging;
  music?: MusicSpec | null;
}

export type StageRole = 'character' | 'friend';
export interface StagePoint {x: number; y: number}
export interface StageMove {line: number; delaySec?: number; durationSec?: number; to: StagePoint}
export interface StageProp extends StagePoint {
  id: string; kind: string; label?: string; owner: string | null; location?: string; hidden?: boolean;
  /** Persistent degrees of rotation; rolling derives this from world distance. */
  rotation?: number;
  /** Optional state keeps old books/constructions fully drawn when unspecified. */
  openProgress?: number;
  buildProgress?: number;
  waterAmount?: number;
  /** Frame-derived watering tool; omitted outside the active pour. */
  watering?: StagePoint & {target: StagePoint; amount: number; tilt: number; flow: number};
}
export interface StageEvent {
  kind: 'show' | 'pick-up' | 'give' | 'drop' | 'push' | 'roll' | 'catch' | 'open' | 'water' | 'build';
  propId: string; line: number; actor?: StageRole; to?: StageRole; delaySec?: number; durationSec?: number;
  /** Ground destination for push/roll; optional launch point for catch. */
  endpoint?: StagePoint;
  /** Signed world travel in pixels when push/roll has no endpoint. */
  distance?: number;
  /** Bounded incremental water/build state; defaults to .34. */
  amount?: number;
}
export interface SceneStaging {
  actors: Partial<Record<StageRole, StagePoint & {moves?: StageMove[]}>>;
  props: StageProp[];
  events: StageEvent[];
  shot: 'dialogue' | 'prop' | 'reaction' | 'discovery' | 'celebration' | 'quiet';
  auto?: boolean;
}
export interface StageActorSample extends StagePoint {owner: string; moving: boolean; walkT: number; flip: boolean; stoppedFor: number | null}
export interface StageReach {target: StagePoint; amount: number; crouch: number; grip?: number}
export interface StageSample {actors: Partial<Record<StageRole, StageActorSample>>; props: StageProp[]; reaches: Partial<Record<StageRole, StageReach>>; shot: SceneStaging['shot']}

export interface YoutubeMeta {
  title: string;
  description: string;
  tags: string[];
}

export interface MusicSpec {
  /** filename inside public/music/ */
  file: string;
  bpm: number;
  mood: "bouncy" | "story" | "lullaby" | "tender" | "curious" | "resolution" | "none";
}

export interface KidsScript {
  version?: 2;
  /** Opt in to new direction rules without changing existing episodes. */
  presentationVersion?: 1 | 2 | 3 | 4;
  opening?: "hook" | "title";
  /** Enable bell artwork only for videos that are not marked Made for kids. */
  subscription?: {bellEnabled?: boolean};
  type: "rhyme" | "story";
  template?: string | null;
  slug: string;
  title: string;
  palette: PaletteKind;
  mainCharacter: { kind: CharacterKind; name: string };
  /** spoken over the title card: "Hi friends! I'm Benny!..." */
  intro?: Line | null;
  /** spoken over the end card */
  outro?: Line | null;
  voice?: string | null;
  castVoices?: Record<string,string>;
  synthesis?: {engine: string; ext: string; voice: string; narratorVoice: string; speed: number; model: string; cacheVersion: number; castVoices?: Record<string,string>};
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
