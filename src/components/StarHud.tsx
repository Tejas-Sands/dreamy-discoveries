import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { easeInOutSine } from "../lib/anim";

const OUT = "#2f2438";

export const StarIcon: React.FC<{ size: number; filled: boolean; glow?: number }> = ({ size, filled, glow = 0 }) => (
  <svg width={size} height={size} viewBox="-55 -55 110 110" style={{ filter: glow > 0 ? `drop-shadow(0 0 ${glow * 14}px #ffd23f)` : undefined }}>
    <path
      d="M 0 -50 L 14 -16 L 50 -14 L 22 10 L 30 46 L 0 27 L -30 46 L -22 10 L -50 -14 L -14 -16 Z"
      fill={filled ? "#ffd23f" : "rgba(255,255,255,0.35)"}
      stroke={filled ? "#f4a900" : "rgba(255,255,255,0.8)"}
      strokeWidth={6}
      strokeLinejoin="round"
    />
    {filled ? <circle cx={-12} cy={-16} r={7} fill="#fff8c8" /> : null}
  </svg>
);

/** where star slot i sits on screen (absolute px) */
export const starSlotPosition = (i: number, total: number) => {
  const size = total > 6 ? 54 : 66;
  const gap = 8;
  const width = total * (size + gap) + 34;
  const left = 1920 - 34 - width;
  return { x: left + 26 + i * (size + gap) + size / 2, y: 44 + 16 + size / 2, size };
};

/**
 * The reward jar in the corner. `earnedAt` are absolute frames a star was won;
 * `flyFrom` = where the newest star flies in from.
 */
export const StarHud: React.FC<{ total: number; earnedAt: number[]; flyFrom?: { x: number; y: number } }> = ({ total, earnedAt, flyFrom = { x: 1470, y: 470 } }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (total <= 0) return null;
  const size = total > 6 ? 54 : 66;
  const gap = 8;
  const width = total * (size + gap) + 34;
  const FLY = 22;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, pointerEvents: "none" }}>
      <div style={{ position: "absolute", right: 34, top: 44, width, height: size + 32, background: "rgba(47,36,56,0.45)", border: "5px solid rgba(255,255,255,0.85)", borderRadius: 999, display: "flex", alignItems: "center", padding: "0 17px", gap, boxShadow: "0 8px 20px rgba(0,0,0,0.2)" }}>
        {Array.from({ length: total }).map((_, i) => {
          const at = earnedAt[i];
          const landed = at !== undefined && frame >= at + FLY;
          const sinceLand = landed ? frame - (at + FLY) : -1;
          const bounce = landed ? spring({ frame: sinceLand, fps, config: { damping: 7, stiffness: 200 } }) : 0;
          const glow = landed ? Math.max(0, 1 - sinceLand / 30) : 0;
          return (
            <div key={i} style={{ width: size, height: size, transform: landed ? `scale(${0.7 + 0.3 * bounce + glow * 0.25})` : "scale(1)" }}>
              <StarIcon size={size} filled={landed} glow={glow} />
            </div>
          );
        })}
      </div>
      {earnedAt.map((at, i) => {
        if (at === undefined || frame < at || frame >= at + FLY) return null;
        const k = easeInOutSine((frame - at) / FLY);
        const to = starSlotPosition(i, total);
        const x = interpolate(k, [0, 1], [flyFrom.x, to.x]);
        const y = interpolate(k, [0, 1], [flyFrom.y, to.y]) - Math.sin(k * Math.PI) * 220;
        const s = interpolate(k, [0, 1], [2.4, 1]);
        return (
          <div key={i} style={{ position: "absolute", left: x - size / 2, top: y - size / 2, width: size, height: size, transform: `scale(${s}) rotate(${k * 360}deg)` }}>
            <StarIcon size={size} filled glow={1} />
          </div>
        );
      })}
    </div>
  );
};
