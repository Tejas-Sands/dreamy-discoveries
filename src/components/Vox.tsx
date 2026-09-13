import React from "react";
import { Audio, Sequence, staticFile } from "remotion";
import type { Line } from "../lib/types";
import { VOX } from "../generated/registry";
import { seedOf } from "../lib/random";
import { toFrames } from "../lib/timing";

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
  const out: VoxEvent[] = [];
  // several cues on the same side play one after another
  let startCursor = speechFrom - pre;
  let endCursor = speechFrom + toFrames(line?.durationSec ?? 2.2) + 3;
  (line?.vox ?? []).forEach((cue, i) => {
    const list = VOX[cue.kind];
    if (!list || list.length === 0) return; // no recording of that kind on disk: silence beats a fake "ha ha"
    const pick = list[seedOf(`${key}:${cue.kind}:${i}`) % list.length];
    const len = toFrames(pick.durationSec) + 2;
    let from: number;
    if (cue.at === "start") {
      from = startCursor;
      startCursor += len;
    } else {
      from = endCursor;
      endCursor += len;
    }
    out.push({ ...pick, from, kind: cue.kind, speaker: cue.speaker ?? line?.speaker });
  });
  return out;
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
