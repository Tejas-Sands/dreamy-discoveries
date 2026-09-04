import React from "react";
import { AbsoluteFill, Audio, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { KidsScript, Line } from "../lib/types";
import type { Palette } from "../lib/palettes";
import { Background } from "./backgrounds/Background";
import { Character, characterBox } from "./characters/Character";
import { Confetti, Sparkles } from "./Particles";
import { StarIcon } from "./StarHud";
import { Sfx } from "./Sfx";
import { CENTER_X, GROUND_Y } from "../lib/layout";
import { rand } from "../lib/random";
import { mouthAt } from "../lib/speech";
import type { BakedMap } from "../lib/baked";

const OUT = "#2f2438";

const BigWords: React.FC<{ text: string; color: string; fontSize?: number; delay?: number }> = ({ text, color, fontSize = 150, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0 0.28em", maxWidth: 1700, textAlign: "center", fontSize, lineHeight: 1.05 }}>
      {text.split(" ").map((word, i) => {
        const s = spring({ frame: frame - delay - i * 4, fps, config: { damping: 9, stiffness: 130 } });
        const bob = Math.sin(frame / 9 + i) * 6;
        return (
          <span key={i} style={{ fontWeight: 700, color, display: "inline-block", transform: `scale(${s}) rotate(${(rand(i) - 0.5) * 8}deg) translateY(${bob}px)`, WebkitTextStroke: `10px ${OUT}`, paintOrder: "stroke fill", textShadow: "0 12px 0 rgba(0,0,0,0.18)" }}>
            {word}
          </span>
        );
      })}
    </div>
  );
};

const SpokenLine: React.FC<{ line: Line | null | undefined; slug: string; at: number }> = ({ line, slug, at }) =>
  line?.audio ? (
    <Audio src={staticFile(`generated/${slug}/${line.audio}`)} startFrom={0} volume={1} />
  ) : null;

/** Title card: big bouncy title, the hero waving and saying hi. */
export const TitleCard: React.FC<{ script: KidsScript; palette: Palette; slug: string; baked?: BakedMap }> = ({ script, palette, slug, baked }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const speakAt = Math.round(1.0 * fps);
  const t = (frame - speakAt) / fps;
  const mouth = mouthAt(script.intro, t);
  const box = characterBox(CENTER_X, GROUND_Y + 20, 460);
  const bg = script.scenes[0]?.background ?? "meadow";
  return (
    <AbsoluteFill>
      <Background kind={bg} palette={palette} baked={baked} />
      <AbsoluteFill style={{ background: "rgba(255,255,255,0.12)" }} />
      <Sparkles count={14} />
      <Sfx name="intro" at={0} volume={0.45} />
      {frame >= speakAt ? <SpokenLine line={script.intro} slug={slug} at={speakAt} /> : null}
      <div style={{ position: "absolute", left: 0, right: 0, top: 90, display: "flex", justifyContent: "center" }}>
        <BigWords text={script.title} color={palette.accent} fontSize={script.title.length > 22 ? 120 : 150} delay={4} />
      </div>
      <div style={{ position: "absolute", ...box }}>
        <Character kind={script.mainCharacter.kind} emotion={script.intro?.emotion ?? "excited"} action={t > 0 ? script.intro?.action ?? "wave" : "jump"} mouth={mouth} width={460} seed={1} actionT={frame / fps} />
      </div>
    </AbsoluteFill>
  );
};

/** End card: "The End", stars collected, the hero says bye. */
export const EndCard: React.FC<{ script: KidsScript; palette: Palette; slug: string; starsEarned: number; baked?: BakedMap }> = ({ script, palette, slug, starsEarned, baked }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const speakAt = Math.round(0.8 * fps);
  const t = (frame - speakAt) / fps;
  const mouth = mouthAt(script.outro, t);
  const box = characterBox(CENTER_X, GROUND_Y + 40, 380);
  const bg = script.scenes[script.scenes.length - 1]?.background ?? "meadow";
  const total = script.stars?.total ?? 0;
  return (
    <AbsoluteFill>
      <Background kind={bg} palette={palette} baked={baked} />
      <AbsoluteFill style={{ background: "rgba(255,255,255,0.12)" }} />
      <Sparkles count={16} />
      <Confetti from={2} x={960} y={300} count={60} spread={1100} />
      <Sfx name="tada" at={0} volume={0.7} />
      {frame >= speakAt ? <SpokenLine line={script.outro} slug={slug} at={speakAt} /> : null}
      <div style={{ position: "absolute", left: 0, right: 0, top: 70, display: "flex", justifyContent: "center" }}>
        <BigWords text="The End!" color={palette.accent} fontSize={170} />
      </div>
      {total > 0 ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: 270, display: "flex", justifyContent: "center", alignItems: "center", gap: 10 }}>
          {Array.from({ length: total }).map((_, i) => {
            const s = spring({ frame: frame - 14 - i * 5, fps, config: { damping: 8, stiffness: 160 } });
            return (
              <div key={i} style={{ transform: `scale(${s}) rotate(${Math.sin(frame / 8 + i) * 8}deg)` }}>
                <StarIcon size={total > 6 ? 84 : 110} filled={i < starsEarned} glow={0.5} />
              </div>
            );
          })}
        </div>
      ) : null}
      <div style={{ position: "absolute", ...box }}>
        <Character kind={script.mainCharacter.kind} emotion={script.outro?.emotion ?? "happy"} action={t > 0 ? script.outro?.action ?? "wave" : "cheer"} mouth={mouth} width={380} seed={2} actionT={frame / fps} />
      </div>
    </AbsoluteFill>
  );
};
