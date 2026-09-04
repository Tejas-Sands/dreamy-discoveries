import React from "react";
import { AbsoluteFill, staticFile, type CalculateMetadataFunction } from "remotion";
import { loadFont } from "@remotion/google-fonts/Fredoka";
import type { KidsScript } from "./lib/types";
import { getPalette } from "./lib/palettes";
import { Background } from "./components/backgrounds/Background";
import { Character, characterBox } from "./components/characters/Character";
import { Sparkles } from "./components/Particles";

const { fontFamily } = loadFont();

export type ThumbnailProps = {
  slug: string;
  script: KidsScript | null;
  /** compilation mode: big title + a row of heroes */
  compilation?: { title: string; heroes: string[] } | null;
};

export const calculateThumbnailMetadata: CalculateMetadataFunction<ThumbnailProps> = async ({ props }) => {
  const res = await fetch(staticFile(`generated/${props.slug}/script.json`));
  if (!res.ok) throw new Error(`Could not load script for slug "${props.slug}"`);
  return { props: { ...props, script: (await res.json()) as KidsScript } };
};

/** 1280x720 thumbnail: hero front and center, huge title, bright frame. Rendered at 1920x1080 and scaled. */
export const Thumbnail: React.FC<ThumbnailProps> = ({ script, compilation }) => {
  if (!script) return <AbsoluteFill style={{ background: "#222" }} />;
  const palette = getPalette(script.palette);
  if (compilation) {
    const heroes = compilation.heroes.slice(0, 5);
    return (
      <AbsoluteFill style={{ fontFamily, width: 1920, height: 1080, transform: "scale(0.6667)", transformOrigin: "0 0" }}>
        <Background kind={script.scenes[0]?.background ?? "meadow"} palette={palette} frameOffset={40} />
        <Sparkles count={14} />
        {heroes.map((h, i) => (
          <div key={i} style={{ position: "absolute", ...characterBox(960 + (i - (heroes.length - 1) / 2) * Math.min(360, 1500 / Math.max(1, heroes.length)), 1000, 380) }}>
            <Character kind={h} emotion="excited" action={i % 2 ? "wave" : "cheer"} width={380} still seed={i + 10} />
          </div>
        ))}
        <div style={{ position: "absolute", left: 100, right: 100, top: 60, textAlign: "center", fontSize: compilation.title.length > 24 ? 120 : 150, fontWeight: 700, lineHeight: 1.02, color: "#fff", WebkitTextStroke: `12px #2f2438`, paintOrder: "stroke fill", textShadow: "0 14px 0 rgba(0,0,0,0.2)" }}>
          {compilation.title}
        </div>
        <AbsoluteFill style={{ border: `34px solid ${palette.accent}`, boxShadow: "inset 0 0 0 12px #fff", pointerEvents: "none" }} />
      </AbsoluteFill>
    );
  }
  const first = script.scenes[0];
  const main = script.mainCharacter?.kind && script.mainCharacter.kind !== "none" ? script.mainCharacter.kind : first?.character ?? "bunny";
  const friend = script.scenes.find((s) => s.secondCharacter)?.secondCharacter ?? null;
  // a prop that is not just an animal emoji (the cartoon hero next to a photo-style 🐰 looks odd)
  const boring = new Set(["🐰", "🐻", "🐱", "🐶", "🦆", "🐘", "🐸", "🦁", "🐷", "🐵", "🐟", "💡", "🤗", "🙂"]);
  const emoji =
    script.scenes.map((s) => s.question?.answer.emoji).find((e) => e && !boring.has(e)) ??
    script.scenes.flatMap((s) => s.lines.map((l) => l.callout?.emoji)).find((e) => e && !boring.has(e)) ??
    script.scenes.map((s) => s.prop).find((e) => e && !boring.has(e)) ??
    null;
  return (
    <AbsoluteFill style={{ fontFamily, width: 1920, height: 1080, transform: "scale(0.6667)", transformOrigin: "0 0" }}>
      <Background kind={first?.background ?? "meadow"} palette={palette} frameOffset={40} />
      <Sparkles count={12} />
      <div style={{ position: "absolute", ...characterBox(430, 990, 640) }}>
        <Character kind={main} emotion="excited" action="cheer" width={640} still seed={3} />
      </div>
      {friend ? (
        <div style={{ position: "absolute", ...characterBox(1560, 1010, 420) }}>
          <Character kind={friend} emotion="happy" action="wave" width={420} still flip seed={4} />
        </div>
      ) : emoji ? (
        <div style={{ position: "absolute", left: 1420, top: 560, fontSize: 300, lineHeight: 1, transform: "rotate(-8deg)", filter: "drop-shadow(0 14px 10px rgba(0,0,0,0.25))" }}>{emoji}</div>
      ) : null}
      <div style={{ position: "absolute", left: 700, top: 70, width: 1160, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0 0.25em", textAlign: "center", fontSize: script.title.length > 20 ? 130 : 160, fontWeight: 700, lineHeight: 1.02, color: "#fff", WebkitTextStroke: `12px #2f2438`, paintOrder: "stroke fill", textShadow: "0 14px 0 rgba(0,0,0,0.2)" }}>
        {script.title.split(" ").map((w, i) => (
          <span key={i} style={{ display: "inline-block", transform: `rotate(${(i % 2 ? 1 : -1) * 4}deg)`, color: i % 3 === 1 ? palette.accent : "#fff" }}>
            {w}
          </span>
        ))}
      </div>
      <AbsoluteFill style={{ border: `34px solid ${palette.accent}`, boxShadow: "inset 0 0 0 12px #fff", pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};
