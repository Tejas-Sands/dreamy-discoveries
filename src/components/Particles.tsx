import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { rand } from "../lib/random";
import { W } from "../lib/layout";

const CONFETTI_COLORS = ["#ff5d9e", "#ffd23f", "#7ed957", "#5db9ff", "#c9a2ff", "#ff8c42"];

/** burst of confetti from (x,y) starting at `from` (frames, relative to the current sequence) */
export const Confetti: React.FC<{ from: number; x: number; y: number; count?: number; spread?: number }> = ({ from, x, y, count = 46, spread = 900 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = (frame - from) / fps;
  if (t < 0 || t > 2.2) return null;
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {Array.from({ length: count }).map((_, i) => {
        const a = -Math.PI / 2 + (rand(i) - 0.5) * 2.2;
        const v = spread * (0.5 + rand(i + 50));
        const px = x + Math.cos(a) * v * t;
        const py = y + Math.sin(a) * v * t + 900 * t * t;
        const rot = rand(i + 90) * 360 + t * (200 + rand(i + 120) * 400);
        const w = 14 + rand(i + 20) * 16;
        const opacity = t > 1.6 ? Math.max(0, 1 - (t - 1.6) / 0.6) : 1;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: px,
              top: py,
              width: w,
              height: w * 0.6,
              borderRadius: rand(i + 7) > 0.5 ? 999 : 4,
              background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
              transform: `rotate(${rot}deg) scaleX(${Math.cos(t * 12 + i)})`,
              opacity,
            }}
          />
        );
      })}
    </div>
  );
};

const FourStar: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="-10 -10 20 20">
    <path d="M 0 -10 Q 2 -2 10 0 Q 2 2 0 10 Q -2 2 -10 0 Q -2 -2 0 -10 Z" fill={color} />
  </svg>
);

/** ambient twinkling sparkles for upbeat scenes */
export const Sparkles: React.FC<{ count?: number; seed?: number; color?: string }> = ({ count = 12, seed = 0, color = "#fff6a8" }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {Array.from({ length: count }).map((_, i) => {
        const k = i + seed * 13;
        const tw = Math.abs(Math.sin(frame / 9 + k * 2.1));
        const size = 26 + rand(k + 300) * 40;
        return (
          <div key={i} style={{ position: "absolute", left: rand(k + 1) * (W - 60) + 30, top: rand(k + 200) * 700 + 40, opacity: 0.25 + 0.75 * tw, transform: `scale(${0.6 + tw * 0.6}) rotate(${frame * 1.5 + k * 40}deg)` }}>
            <FourStar size={size} color={color} />
          </div>
        );
      })}
    </div>
  );
};

/** emoji drifting up from around (x, y): hearts, notes, zzz ... */
export const Floaters: React.FC<{ emoji: string | string[]; x: number; y: number; count?: number; seed?: number; size?: number; period?: number; dir?: 1 | -1 }> = ({ emoji, x, y, count = 5, seed = 0, size = 64, period = 2.6, dir = 1 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const list = Array.isArray(emoji) ? emoji : [emoji];
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {Array.from({ length: count }).map((_, i) => {
        const k = i + seed * 7;
        const offset = rand(k) * period;
        const t = ((frame / fps + offset) % period) / period;
        const px = x + (rand(k + 1) - 0.5) * 220 + Math.sin(t * 6 + k) * 30;
        const py = y - dir * t * 260;
        const opacity = t < 0.15 ? t / 0.15 : t > 0.7 ? Math.max(0, (1 - t) / 0.3) : 1;
        return (
          <div key={i} style={{ position: "absolute", left: px, top: py, fontSize: size * (0.7 + rand(k + 2) * 0.5), opacity, transform: `rotate(${Math.sin(t * 8 + k) * 15}deg)` }}>
            {list[i % list.length]}
          </div>
        );
      })}
    </div>
  );
};

/** a pattern interrupt: an emoji flies across the top of the screen (butterfly, bee, balloon, shooting star…) */
export const FlyBy: React.FC<{ emoji: string; from: number; durationSec?: number; y?: number; dir?: 1 | -1; size?: number }> = ({ emoji, from, durationSec = 3.2, y = 250, dir = 1, size = 110 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = (frame - from) / fps;
  if (t < 0 || t > durationSec) return null;
  const k = t / durationSec;
  const x = dir === 1 ? -200 + k * (W + 400) : W + 200 - k * (W + 400);
  const bob = Math.sin(t * 7) * 28;
  const tilt = Math.cos(t * 7) * 14;
  return (
    <div style={{ position: "absolute", left: x, top: y + bob, fontSize: size, lineHeight: 1, transform: `rotate(${tilt}deg) scaleX(${dir === 1 ? -1 : 1})`, filter: "drop-shadow(0 8px 6px rgba(0,0,0,0.2))", pointerEvents: "none" }}>
      {emoji}
    </div>
  );
};

/** a quick white flash (answer reveal, big landing) */
export const Flash: React.FC<{ from: number; strength?: number; color?: string }> = ({ from, strength = 0.55, color = "#fff" }) => {
  const frame = useCurrentFrame();
  const t = frame - from;
  if (t < 0 || t > 12) return null;
  const opacity = strength * Math.max(0, 1 - t / 12);
  return <div style={{ position: "absolute", inset: 0, background: color, opacity, pointerEvents: "none" }} />;
};

/** a ring that expands and fades from (x, y) — a "look here!" pulse */
export const Ripple: React.FC<{ from: number; x: number; y: number; color?: string; size?: number }> = ({ from, x, y, color = "#fff", size = 500 }) => {
  const frame = useCurrentFrame();
  const t = (frame - from) / 30;
  if (t < 0 || t > 0.7) return null;
  const k = t / 0.7;
  const r = size * (0.2 + 0.8 * (1 - Math.pow(1 - k, 3)));
  return <div style={{ position: "absolute", left: x - r / 2, top: y - r / 2, width: r, height: r, borderRadius: 999, border: `${14 * (1 - k) + 2}px solid ${color}`, opacity: (1 - k) * 0.9, pointerEvents: "none" }} />;
};
