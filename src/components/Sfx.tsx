import React from "react";
import { Audio, Sequence, staticFile } from "remotion";
import type { SfxName } from "../lib/types";

/** One-shot sound effect at frame `at` (relative to the current sequence). */
export const Sfx: React.FC<{ name: SfxName | "intro"; at?: number; volume?: number }> = ({ name, at = 0, volume = 0.8 }) => (
  <Sequence from={Math.max(0, at)} durationInFrames={100} name={`sfx:${name}`}>
    <Audio src={staticFile(`sfx/${name}.wav`)} volume={volume} />
  </Sequence>
);

/** Looping sound effect between two frames (relative to the current sequence). */
export const SfxLoop: React.FC<{ name: SfxName; from: number; duration: number; volume?: number }> = ({ name, from, duration, volume = 0.5 }) =>
  duration <= 0 ? null : (
    <Sequence from={from} durationInFrames={duration} name={`sfxloop:${name}`}>
      <Audio src={staticFile(`sfx/${name}.wav`)} volume={volume} loop />
    </Sequence>
  );
