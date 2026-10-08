import type {KidsScript, MusicSpec, Scene} from './types';
import type {Schedule} from './timing';
import {sceneDirection} from './sceneDirection.mjs';

const TRACKS: Record<'story' | 'bouncy' | 'lullaby' | 'tender' | 'curious' | 'resolution', MusicSpec> = {
  story: {file: 'story.wav', bpm: 96, mood: 'story'},
  bouncy: {file: 'bouncy.wav', bpm: 120, mood: 'bouncy'},
  lullaby: {file: 'lullaby.wav', bpm: 72, mood: 'lullaby'},
  tender: {file:'tender-v1.wav',bpm:80,mood:'tender'},
  curious: {file:'curious-v1.wav',bpm:96,mood:'curious'},
  resolution: {file:'resolution-v1.wav',bpm:96,mood:'resolution'},
};
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const enabled = (music: MusicSpec | null | undefined): music is MusicSpec => !!music?.file && music.mood !== 'none';
const defaultScore = (script: KidsScript): MusicSpec | null => script.music !== undefined
  ? enabled(script.music) ? script.music : null
  : TRACKS[script.type === 'story' ? 'story' : 'bouncy'];

/** The same selected asset and BPM drive both the music and actor beat animation. */
export function sceneScore(scene: Scene & {music?: MusicSpec | null}, script: KidsScript): MusicSpec | null {
  if (scene.music !== undefined) return enabled(scene.music) ? scene.music : null;
  const base = defaultScore(script);
  if (!base) return null;
  const direction = sceneDirection(scene, script);
  if (direction === 'lullaby') return TRACKS.lullaby;
  if (direction === 'celebration') return TRACKS.bouncy;
  if ((script.presentationVersion??0)>=4 && script.type==='story') {
    if (scene.kind==='lesson'||scene.kind==='moral') return TRACKS.resolution;
    if (direction==='tender') return TRACKS.tender;
    if (direction==='thinking') return TRACKS.curious;
  }
  if (script.type === 'story') return TRACKS.story;
  return base;
}

export interface ScoreSection {
  /** Audio sequence bounds, including the crossfade. */
  from: number;
  to: number;
  /** Scene bounds before the overlap. */
  coreFrom: number;
  coreTo: number;
  music: MusicSpec;
  fadeInFrames: number;
  fadeOutFrames: number;
}

/** Adjacent identical tracks form one loop; only actual story score changes restart audio. */
export function scoreSections(script: KidsScript, schedule: Schedule): ScoreSection[] {
  const spans: Array<{from: number; to: number; music: MusicSpec | null}> = [];
  if (schedule.intro > 0) spans.push({from: 0, to: schedule.intro, music: defaultScore(script)});
  script.scenes.forEach((scene, index) => {
    const slot = schedule.scenes[index];
    if (slot) spans.push({from: slot.from, to: slot.from + slot.duration, music: sceneScore(scene, script)});
  });
  spans.push({from: schedule.endFrom, to: schedule.brandFrom, music: spans.length ? spans[spans.length - 1].music : defaultScore(script)});
  const cores: Array<{from: number; to: number; music: MusicSpec}> = [];
  for (const span of spans) {
    if (!span.music || span.to <= span.from) continue;
    const previous = cores.at(-1);
    if (previous && previous.to === span.from && previous.music.file === span.music.file && previous.music.bpm === span.music.bpm && previous.music.mood === span.music.mood) previous.to = span.to;
    else cores.push({...span, music: span.music});
  }
  return cores.map((core, index) => {
    const previous = cores[index - 1], next = cores[index + 1];
    const overlapsBefore = previous?.to === core.from, overlapsAfter = next?.from === core.to;
    return {from: Math.max(0, core.from - (overlapsBefore ? 9 : 0)), to: Math.min(schedule.brandFrom, core.to + (overlapsAfter ? 9 : 0)),
      coreFrom: core.from, coreTo: core.to, music: core.music,
      fadeInFrames: core.from === 0 ? 20 : 18, fadeOutFrames: core.to === schedule.brandFrom ? 45 : 18};
  });
}

/** Absolute-frame gain: section fades, scene restraint and speech/vox ducking share one clock. */
export function scoreVolume(frame: number, section: ScoreSection, script: KidsScript, schedule: Schedule): number {
  if (frame < section.from || frame >= section.to) return 0;
  let base = .28, ducked = .1;
  for (let index = 0; index < schedule.scenes.length; index++) {
    const start = schedule.scenes[index].from;
    if (frame < start - 9) break;
    const direction = sceneDirection(script.scenes[index], script);
    const [nextBase, nextDucked] = direction === 'thinking' ? [.12, .05] : direction === 'lullaby' ? [.16, .06] : direction === 'tender' ? [.18, .07] : [.28, .1];
    const blend = clamp01((frame - start + 9) / 18);
    base += (nextBase - base) * blend;
    ducked += (nextDucked - ducked) * blend;
  }
  let volume = base;
  for (const [start, end] of schedule.voice) {
    if (frame < start - 8 || frame > end + 8) continue;
    const edge = frame < start ? (start - frame) / 8 : frame > end ? (frame - end) / 8 : 0;
    volume = Math.min(volume, ducked + (base - ducked) * edge);
  }
  const fadeIn = clamp01((frame - section.from) / section.fadeInFrames);
  const fadeOut = clamp01((section.to - frame) / section.fadeOutFrames);
  return volume * Math.min(fadeIn, fadeOut);
}
