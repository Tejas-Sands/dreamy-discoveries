import React from "react";
import { AbsoluteFill, spring, staticFile, useCurrentFrame, useVideoConfig, type CalculateMetadataFunction } from "remotion";
import { loadFont } from "@remotion/google-fonts/Fredoka";
import type { KidsScript } from "./lib/types";
import { getPalette } from "./lib/palettes";
import { Background } from "./components/backgrounds/Background";
import { Character, characterBox } from "./components/characters/Character";
import { Sparkles } from "./components/Particles";
import { Sfx } from "./components/Sfx";
import { CENTER_X, GROUND_Y } from "./lib/layout";

const { fontFamily } = loadFont();

export type BumperProps = { slug: string; script: KidsScript | null; label?: string };

export const calculateBumperMetadata: CalculateMetadataFunction<BumperProps> = async ({ props }) => {
  const res = await fetch(staticFile(`generated/${props.slug}/script.json`));
  if (!res.ok) throw new Error(`Could not load script for slug "${props.slug}"`);
  return { props: { ...props, script: (await res.json()) as KidsScript } };
};

/** 3-second "next up" card between episodes in a compilation. */
export const Bumper: React.FC<BumperProps> = ({ script, label = "Next up!" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (!script) return <AbsoluteFill style={{ background: "#222" }} />;
  const palette = getPalette(script.palette);
  const s = spring({ frame: frame - 4, fps, config: { damping: 10, stiffness: 120 } });
  const box = characterBox(CENTER_X + 420, GROUND_Y + 10, 420);
  return (
    <AbsoluteFill style={{ fontFamily }}>
      <Background kind={script.scenes[0]?.background ?? "meadow"} palette={palette} frameOffset={30} />
      <AbsoluteFill style={{ background: "rgba(255,255,255,0.15)" }} />
      <Sparkles count={12} />
      <Sfx name="intro" at={0} volume={0.5} />
      <div style={{ position: "absolute", left: 120, top: 250, width: 1100 }}>
        <div style={{ fontSize: 64, fontWeight: 700, color: "#fff", WebkitTextStroke: `7px #2f2438`, paintOrder: "stroke fill", transform: `scale(${s})`, transformOrigin: "0 50%" }}>{label}</div>
        <div style={{ marginTop: 20, fontSize: script.title.length > 22 ? 110 : 140, fontWeight: 700, lineHeight: 1.05, color: palette.accent, WebkitTextStroke: `10px #2f2438`, paintOrder: "stroke fill", textShadow: "0 12px 0 rgba(0,0,0,0.18)", transform: `scale(${s})`, transformOrigin: "0 50%" }}>{script.title}</div>
      </div>
      <div style={{ position: "absolute", ...box }}>
        <Character kind={script.mainCharacter?.kind ?? "bunny"} emotion="excited" action="wave" width={420} seed={5} />
      </div>
    </AbsoluteFill>
  );
};
