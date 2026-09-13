import React from "react";
import { spring, useVideoConfig } from "remotion";
import type { Palette } from "../lib/palettes";
import type { Word } from "../lib/types";
import { beatPhase, easeOutBack } from "../lib/anim";
import { rand } from "../lib/random";

const OUT = "#2f2438";

/**
 * One chant line rendered as big bouncy words. When it is the line currently
 * being spoken, its words light up and pop in sync with the voice; the other
 * line stays readable but softer, and everything sways gently on the beat.
 */
const ChantLine: React.FC<{
  text: string;
  words?: Word[];
  active: boolean;
  t: number;
  index: number;
  palette: Palette;
  bpm: number;
  sceneT: number;
}> = ({ text, words, active, t, index, palette, bpm, sceneT }) => {
  const { fps } = useVideoConfig();
  const enter = spring({ frame: index * 6, fps, config: { damping: 12, stiffness: 120 } });
  const tokens = words && words.length ? words : text.split(/\s+/).map((w) => ({ text: w, start: 0, end: 0 }));
  const beat = beatPhase(sceneT, bpm);
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: "0 0.26em",
        alignItems: "baseline",
        transform: `translateY(${(1 - enter) * 28}px)`,
        opacity: Math.min(1, enter * 1.4),
      }}
    >
      {tokens.map((word, i) => {
        const timed = word.end > 0;
        const on = active && timed && t >= word.start && t < word.end;
        const done = active && timed && t >= word.end;
        const since = t - word.start;
        const pop = on ? 1 + 0.18 * easeOutBack(Math.min(1, since / 0.14)) : 1 + 0.035 * Math.sin(beat.beats * 2 + index + i);
        const lift = on ? -14 * easeOutBack(Math.min(1, since / 0.14)) : 0;
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              color: active ? (on ? palette.accent : done ? palette.text : `${palette.text}cc`) : `${palette.text}66`,
              transform: `translateY(${lift}px) scale(${pop}) rotate(${(rand(i + index * 9) - 0.5) * 5}deg)`,
              textShadow: "0 6px 0 rgba(0,0,0,0.16)",
              whiteSpace: "nowrap",
            }}
          >
            {word.text}
          </span>
        );
      })}
    </div>
  );
};

/**
 * The moral chant banner for the ending sequence: both rhyme lines held up big
 * so the child can read (and say) them along, with a "Say it with me!" prompt
 * that pulses during the pause. Lives above the scene, below the title.
 */
export const MoralChant: React.FC<{
  rhyme: string[];
  active: { index: number; words?: Word[]; t: number } | null;
  prompt: boolean;
  promptT: number;
  palette: Palette;
  bpm: number;
  sceneT: number;
}> = ({ rhyme, active, prompt, promptT, palette, bpm, sceneT }) => {
  const { fps } = useVideoConfig();
  const card = spring({ frame: 0, fps, config: { damping: 11, stiffness: 110 } });
  const pSpring = spring({ frame: Math.max(0, Math.round(promptT * fps)), fps, config: { damping: 10, stiffness: 170 } });
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 118, display: "flex", flexDirection: "column", alignItems: "center", gap: 22, pointerEvents: "none" }}>
      <div
        style={{
          background: palette.card,
          border: `10px solid ${palette.accent}`,
          borderRadius: 64,
          padding: "30px 60px 34px",
          boxShadow: "0 20px 44px rgba(0,0,0,0.24)",
          transform: `scale(${0.9 + card * 0.1})`,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {rhyme.map((text, i) => (
          <ChantLine
            key={i}
            text={text}
            words={active?.index === i ? active.words : undefined}
            active={active?.index === i}
            t={active?.index === i ? active.t : 0}
            index={i}
            palette={palette}
            bpm={bpm}
            sceneT={sceneT}
          />
        ))}
      </div>
      {prompt ? (
        <div
          style={{
            background: palette.accent,
            border: "8px solid #fff",
            borderRadius: 40,
            padding: "10px 32px",
            color: "#fff",
            fontSize: 44,
            fontWeight: 700,
            WebkitTextStroke: `4px ${OUT}`,
            paintOrder: "stroke fill",
            transform: `scale(${1 + 0.12 * easeOutBack(Math.min(1, pSpring))}) rotate(${-2 + Math.sin(promptT * 3) * 2}deg)`,
          }}
        >
          Say it with me!
        </div>
      ) : null}
    </div>
  );
};
