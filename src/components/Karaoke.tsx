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
  const ball = praise ? "#ffd23f" : "#ff5d9e";
  const ballSize = size === "big" ? 30 : 26;

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
          background: `linear-gradient(${palette.card}, ${palette.card}) padding-box, linear-gradient(115deg, ${border}, ${palette.accentSoft}, ${border}) border-box`,
          border: "9px solid transparent",
          borderRadius: 56,
          padding: size === "big" ? "44px 64px 26px" : "38px 56px 22px",
          boxShadow: "0 0 0 5px rgba(255,255,255,0.9), 0 12px 0 rgba(47,36,56,0.12), 0 18px 32px rgba(47,36,56,0.16)",
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
          const since = t - word.start;
          const pop = active ? 1 + 0.12 * easeOutBack(Math.min(1, since / 0.14)) : 1;
          const lift = active ? -10 * easeOutBack(Math.min(1, since / 0.14)) : 0;
          // the sing-along ball: hops onto each word as it is sung (an arc across the word's duration)
          const wordLen = Math.max(0.12, word.end - word.start);
          const ballK = active ? Math.min(1, since / wordLen) : 0;
          const ballY = active ? -Math.sin(Math.PI * ballK) * 20 : 0;
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                position: "relative",
                color: active ? palette.highlight : palette.text,
                transform: `translateY(${lift}px) scale(${pop})`,
                transformOrigin: "50% 80%",
                textShadow: active ? "0 4px 0 rgba(0,0,0,0.12)" : "none",
                whiteSpace: "nowrap",
              }}
            >
              {active && timed ? (
                <span
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: -ballSize * 0.9,
                    width: ballSize,
                    height: ballSize,
                    marginLeft: -ballSize / 2,
                    borderRadius: 999,
                    background: `radial-gradient(circle at 35% 30%, #fff 0, ${ball} 45%, ${ball} 100%)`,
                    border: "3px solid #2f2438",
                    boxShadow: "0 4px 0 rgba(0,0,0,0.15)",
                    transform: `translateY(${ballY}px) scale(${1 - 0.15 * Math.sin(Math.PI * ballK)})`,
                  }}
                />
              ) : null}
              {word.text}
            </span>
          );
        })}
      </div>
    </div>
  );
};
