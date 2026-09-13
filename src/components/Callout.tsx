import React from "react";
import { spring, useVideoConfig } from "remotion";
import type { Callout as CalloutSpec, Word } from "../lib/types";
import type { Palette } from "../lib/palettes";
import { CALLOUT_BOX } from "../lib/layout";
import { rand } from "../lib/random";

const NUMBER_WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };

/** seconds (into the line) at which each counted object pops: on the number words when we have timings */
export function countTimes(spec: CalloutSpec, words: Word[] | undefined, lineSec: number): number[] {
  const n = Math.max(1, Math.min(10, spec.count ?? 3));
  const numberWords = (words ?? []).filter((w) => NUMBER_WORDS[w.text.toLowerCase().replace(/[^a-z]/g, "")] || /^(10|[1-9])$/.test(w.text.replace(/[^0-9]/g, "")));
  const times: number[] = [];
  for (let i = 0; i < n; i++) {
    times.push(numberWords[i] ? numberWords[i].start : 0.2 + ((lineSec - 0.6) * i) / Math.max(1, n - 1));
  }
  return times;
}

const OutlinedText: React.FC<{ text: string; size: number; color: string; stroke?: string; strokeWidth?: number }> = ({ text, size, color, stroke = "#2f2438", strokeWidth = 8 }) => (
  <div
    style={{
      fontSize: size,
      fontWeight: 700,
      color,
      WebkitTextStroke: `${strokeWidth}px ${stroke}`,
      paintOrder: "stroke fill",
      textShadow: "0 10px 0 rgba(0,0,0,0.15)",
      lineHeight: 1,
      whiteSpace: "nowrap",
      position: "relative",
      zIndex: 1,
    }}
  >
    {text}
  </div>
);

const Splat: React.FC<{ color: string; size: number }> = ({ color, size }) => (
  <svg width={size} height={size} viewBox="-100 -100 200 200" style={{ position: "absolute", left: 0, top: 0, filter: "drop-shadow(0 12px 0 rgba(47,36,56,0.18))" }}>
    <path
      d="M -70 -20 C -90 -60, -40 -95, -10 -80 C 20 -100, 70 -80, 80 -40 C 100 -10, 90 40, 60 60 C 40 95, -20 90, -40 65 C -80 70, -95 20, -70 -20 Z"
      fill={color}
      stroke="#fffdf4"
      strokeWidth={7}
      strokeLinejoin="round"
    />
    <ellipse cx={-30} cy={-40} rx={18} ry={10} fill="#fff" opacity={0.35} />
  </svg>
);

/**
 * Big learning callouts on the right: a number, objects to count (synced to the
 * number words as they are spoken), a color splat, a key word, or a huge emoji.
 * `t` = seconds since the line started.
 */
const TOP_BOX = { x: 560, y: 30, w: 800, h: 400 };

export const Callout: React.FC<{ spec: CalloutSpec; words?: Word[]; t: number; lineSec: number; palette: Palette; area?: "right" | "top" }> = ({ spec, words, t, lineSec, palette, area = "right" }) => {
  const { fps } = useVideoConfig();
  // with a friend on the right, callouts float between the two heads instead
  const box = area === "top" ? TOP_BOX : CALLOUT_BOX;
  const zoom = area === "top" ? 0.7 : 1;
  // pops are keyed to the line clock (t), not the scene's frame clock
  const popAt = (sec: number) => spring({ frame: Math.round((t - sec) * fps), fps, config: { damping: 9, stiffness: 150 } });
  const wobble = Math.sin(t * 3) * 3;

  if (spec.kind === "count") {
    const n = Math.max(1, Math.min(10, spec.count ?? 3));
    const times = countTimes(spec, words, lineSec);
    const visible = times.filter((x) => t >= x).length;
    const perRow = n <= 5 ? n : 5;
    const size = n <= 5 ? 130 : 105;
    return (
      <div style={{ position: "absolute", left: box.x, top: box.y, width: box.w, height: box.h, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 26, transform: `scale(${zoom})`, transformOrigin: "50% 0" }}>
        <div style={{ transform: `scale(${popAt(times[Math.max(0, visible - 1)])}) rotate(${wobble}deg)`, background: palette.accent, borderRadius: 999, width: 190, height: 190, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 12px 0 rgba(0,0,0,0.18)", border: "8px solid #fff" }}>
          <OutlinedText text={String(Math.max(1, visible))} size={140} color="#fff" strokeWidth={10} />
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", width: perRow * (size + 14), gap: 14 }}>
          {Array.from({ length: n }).map((_, i) => {
            const s = popAt(times[i]);
            const bob = Math.sin(t * 4 + i) * 6;
            return (
              <div key={i} style={{ width: size, height: size, fontSize: size * 0.82, lineHeight: `${size}px`, textAlign: "center", transform: `scale(${s}) translateY(${bob}px) rotate(${(rand(i) - 0.5) * 16 + (1 - Math.min(1, s)) * 90}deg)`, filter: "drop-shadow(0 6px 4px rgba(0,0,0,0.2))" }}>
                {spec.emoji ?? "⭐"}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const s = popAt(0.12);
  const common: React.CSSProperties = { position: "absolute", left: box.x, top: box.y, width: box.w, height: box.h, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", transform: `scale(${s * zoom}) rotate(${wobble - 3}deg)`, transformOrigin: area === "top" ? "50% 20%" : "50% 60%" };

  if (spec.kind === "number") {
    return (
      <div style={common}>
        <div style={{ position: "relative", width: 300, height: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: 999, background: palette.accent, border: "10px solid #fff", boxShadow: "0 14px 0 rgba(0,0,0,0.18)" }} />
          <OutlinedText text={spec.text ?? "1"} size={210} color="#fff" strokeWidth={12} />
        </div>
        {spec.emoji ? <div style={{ fontSize: 120, marginTop: 20 }}>{spec.emoji}</div> : null}
      </div>
    );
  }

  if (spec.kind === "color") {
    return (
      <div style={common}>
        <div style={{ position: "relative", width: 520, height: 520, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Splat color={spec.color ?? "#ff3b3b"} size={520} />
          <OutlinedText text={spec.text ?? ""} size={spec.text && spec.text.length > 5 ? 96 : 120} color="#fff" strokeWidth={10} />
        </div>
      </div>
    );
  }

  if (spec.kind === "word") {
    return (
      <div style={common}>
        <div style={{ background: palette.accent, border: "10px solid #fff", borderRadius: 48, padding: "18px 44px", boxShadow: "0 14px 0 rgba(0,0,0,0.18)" }}>
          <OutlinedText text={spec.text ?? ""} size={spec.text && spec.text.length > 8 ? 88 : 120} color="#fff" strokeWidth={10} />
        </div>
        {spec.emoji ? <div style={{ fontSize: 130, marginTop: 24 }}>{spec.emoji}</div> : null}
      </div>
    );
  }

  // emoji
  return (
    <div style={common}>
      <div style={{ position: "absolute", width: 420, height: 420, borderRadius: 999, background: "rgba(255,255,255,0.55)", transform: `scale(${1 + 0.05 * Math.sin(t * 5)})` }} />
      <div style={{ fontSize: 280, lineHeight: 1, transform: `scale(${1 + 0.04 * Math.sin(t * 5)})` }}>{spec.emoji}</div>
      {spec.text ? <div style={{ marginTop: 10 }}><OutlinedText text={spec.text} size={90} color="#fff" strokeWidth={9} /></div> : null}
    </div>
  );
};
