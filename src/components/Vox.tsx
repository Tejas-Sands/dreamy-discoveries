import React from "react";
import { Sequence, staticFile } from "remotion";
import {MixAudio as Audio} from '../lib/audioMix';
import type { Line } from "../lib/types";
import { VOX } from "../generated/registry";
import { toFrames } from "../lib/timing";
import {resolveVoxEvents} from '../lib/voxTiming.mjs';

/** a recording scheduled on the current sequence's clock */
export interface VoxEvent {
  file: string;
  durationSec: number;
  from: number;
  kind: string;
  speaker: Line["speaker"];
}

/**
 * Resolve a line's vox cues to recordings. `speechFrom` is where the speech starts on the
 * caller's clock, `pre` the frames reserved before it (a "start" cue plays there); an "end"
 * cue plays right after the speech. The pick is deterministic per key, so re-renders match
 * and reprises don't always giggle the same way.
 */
export function voxEvents(line: Line | null | undefined, speechFrom: number, pre: number, key: string): VoxEvent[] {
  return resolveVoxEvents(line,speechFrom,pre,key,VOX);
}

export const VoxAudio: React.FC<{ events: VoxEvent[]; volume?: number }> = ({ events, volume = 0.9 }) => (
  <>
    {events.map((e, i) => (
      <Sequence key={i} from={Math.max(0, e.from)} durationInFrames={toFrames(e.durationSec) + 2} name={`vox:${e.kind}`}>
        <Audio src={staticFile(e.file)} volume={volume} />
      </Sequence>
    ))}
  </>
);

const LAUGHY = /giggle|laugh|yay/;

/** the recording playing at `frame` (same clock as the events), if any */
export function voxAt(events: VoxEvent[], frame: number, fps: number): { event: VoxEvent; t: number } | null {
  for (const e of events) {
    const t = (frame - e.from) / fps;
    if (t >= 0 && t <= e.durationSec) return { event: e, t };
  }
  return null;
}

/** 0..1 mouth flutter for a laugh-like recording (null when nothing laugh-like plays) */
export function laughMouth(hit: { event: VoxEvent; t: number } | null): number | null {
  if (!hit || !LAUGHY.test(hit.event.kind)) return null;
  return 0.35 + 0.65 * Math.abs(Math.sin(hit.t * Math.PI * 2 * 7));
}
