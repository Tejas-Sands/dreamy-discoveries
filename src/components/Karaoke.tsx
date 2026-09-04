import React from "react";
import { spring, useVideoConfig } from "remotion";
import type { Line } from "../lib/types";
import type { Palette } from "../lib/palettes";
import { easeOutBack } from "../lib/anim";

/**
 * The sing-along text pill. Words light up and pop as the voice reaches them.
 * `t` = seconds since the line's audio started.
 */
export const Karaoke: React.FC<{ line: Line; palette: Palette; t: number; size?: "big" | "small" }> = ({ line, palette, t, size = "big" }) => {
  const { fps } = useVideoConfig();
  // entrance is keyed to the line start (t), not to the scene's frame clock
  const enter = spring({ frame: Math.max(0, Math.round(t * fps)), fps, config: { damping: 13, stiffness: 160 } });
  const words = line.words ?? line.text.split(/\s+/).map((w) => ({ text: w, start: 0, end: 0 }));
  const fontSize = size === "big" ? 72 : 60;
  const praise = line.role === "praise";
  const border = praise ? "#ffd23f" : palette.accent;

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 44,
        display: "flex",
        justifyContent: "center",
        transform: `translateY(${(1 - enter) * 60}px) scale(${0.85 + enter * 0.15})`,
        opacity: Math.min(1, enter * 1.4),
      }}
    >
      <div
        style={{
          maxWidth: 1580,
          background: palette.card,
          border: `9px solid ${border}`,
          borderRadius: 56,
          padding: size === "big" ? "26px 64px" : "22px 56px",
          boxShadow: "0 18px 40px rgba(0,0,0,0.22)",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "baseline",
          gap: "0 0.3em",
          fontSize,
          fontWeight: 700,
          lineHeight: 1.22,
          textAlign: "center",
        }}
      >
        {words.map((word, i) => {
          const timed = word.end > 0;
          const active = timed && t >= word.start && t < word.end;
          const done = timed && t >= word.end;
          const since = t - word.start;
          const pop = active ? 1 + 0.12 * easeOutBack(Math.min(1, since / 0.14)) : 1;
          const lift = active ? -10 * easeOutBack(Math.min(1, since / 0.14)) : 0;
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                color: active ? palette.accent : done ? palette.text : `${palette.text}80`,
                transform: `translateY(${lift}px) scale(${pop})`,
                transformOrigin: "50% 80%",
                textShadow: active ? "0 4px 0 rgba(0,0,0,0.12)" : "none",
                whiteSpace: "nowrap",
              }}
            >
              {word.text}
            </span>
          );
        })}
      </div>
    </div>
  );
};
