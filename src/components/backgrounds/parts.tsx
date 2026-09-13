import React from "react";
import type { Palette } from "../../lib/palettes";
import { rand } from "../../lib/random";
import { GROUND_Y, W } from "../../lib/layout";
import type { PartGroup } from "./recipe";

const OUT = "#2f2438";
export interface PartProps {
  /** seconds (continuous across scenes) */
  t: number;
  o: Record<string, unknown>;
  p: Palette;
}
type Part = React.FC<PartProps>;
const num = (v: unknown, d: number) => (typeof v === "number" ? v : d);
const str = (v: unknown, d: string) => (typeof v === "string" ? v : d);
const list = (v: unknown, d: string[]) => (Array.isArray(v) ? (v as string[]) : d);

/** lighten (amt>0) or darken (amt<0) a #rrggbb color, amt in [-1, 1] */
function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(amt >= 0 ? c + (255 - c) * amt : c * (1 + amt))));
  const to = (v: number) => v.toString(16).padStart(2, "0");
  return `#${to(f(r))}${to(f(g))}${to(f(b))}`;
}

/* ───────────────── shared drawings ───────────────── */
const Cloud: React.FC<{ x: number; y: number; s?: number; opacity?: number; color?: string }> = ({ x, y, s = 1, opacity = 1, color = "#fff" }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} opacity={opacity}>
    <ellipse cx={0} cy={0} rx={90} ry={38} fill={color} />
    <circle cx={-40} cy={-14} r={38} fill={color} />
    <circle cx={12} cy={-30} r={48} fill={color} />
    <circle cx={55} cy={-10} r={34} fill={color} />
  </g>
);

const RoundTree: React.FC<{ x: number; base: number; s?: number; leaf?: string; sway?: number }> = ({ x, base, s = 1, leaf = "#58b847", sway = 0 }) => (
  <g transform={`translate(${x} ${base}) scale(${s}) rotate(${sway})`}>
    <ellipse cy={3} rx={78} ry={12} fill="#183e44" opacity={0.12} />
    <path d="M -18 0 Q -10 -64 -20 -132 L 18 -132 Q 10 -62 22 0 Z" fill="#a66b43" />
    <path d="M -4 -8 L -4 -115 M -4 -70 L -40 -105 M -3 -83 L 34 -125" fill="none" stroke="#e5a86d" strokeWidth={8} strokeLinecap="round" />
    <path d="M -82 -100 C -112 -145 -74 -185 -38 -178 C -32 -225 42 -232 60 -182 C 112 -192 130 -127 92 -101 C 70 -67 -51 -58 -82 -100 Z" fill={shade(leaf, -0.22)} />
    <ellipse cx={-22} cy={-147} rx={69} ry={55} fill={leaf} />
    <ellipse cx={38} cy={-164} rx={55} ry={48} fill={leaf} />
    <ellipse cx={-33} cy={-166} rx={38} ry={25} fill={shade(leaf, 0.22)} transform="rotate(-25 -33 -166)" />
    <path d="M 5 -130 Q 23 -148 41 -138 M -50 -122 Q -32 -135 -19 -124" fill="none" stroke={shade(leaf, -0.15)} strokeWidth={5} strokeLinecap="round" />
  </g>
);

const Pine: React.FC<{ x: number; base: number; s?: number; color?: string; snow?: boolean }> = ({ x, base, s = 1, color = "#2f8f4e", snow = false }) => (
  <g transform={`translate(${x} ${base}) scale(${s})`}>
    <rect x={-12} y={-40} width={24} height={44} rx={8} fill="#8a5a33" stroke={OUT} strokeWidth={4} />
    {[0, 1, 2].map((i) => (
      <g key={i}>
        <path d={`M ${-90 + i * 18} ${-40 - i * 60} L 0 ${-150 - i * 60} L ${90 - i * 18} ${-40 - i * 60} Z`} fill={shade(color, i * 0.09)} stroke={shade(color, -0.25)} strokeWidth={3} strokeLinejoin="round" />
        <path d={`M 0 ${-150 - i * 60} L ${22 - i * 3} ${-40 - i * 60} L ${90 - i * 18} ${-40 - i * 60} Z`} fill={shade(color, -0.16)} opacity={0.6} />
        {snow ? <path d={`M ${-60 + i * 12} ${-52 - i * 60} Q 0 ${-70 - i * 60} ${60 - i * 12} ${-52 - i * 60} Q 0 ${-40 - i * 60} ${-60 + i * 12} ${-52 - i * 60}`} fill="#fff" /> : null}
      </g>
    ))}
  </g>
);

const Flower: React.FC<{ x: number; base: number; color: string; s?: number; sway?: number }> = ({ x, base, color, s = 1, sway = 0 }) => (
  <g transform={`translate(${x} ${base}) scale(${s}) rotate(${sway})`}>
    <rect x={-5} y={-70} width={10} height={72} rx={5} fill="#3f9a3a" />
    <ellipse cx={-14} cy={-40} rx={14} ry={7} fill="#3f9a3a" transform="rotate(-30 -14 -40)" />
    {[0, 72, 144, 216, 288].map((a) => (
      <ellipse key={a} cx={0} cy={-92} rx={12} ry={20} fill={color} stroke={OUT} strokeWidth={3} transform={`rotate(${a} 0 -74)`} />
    ))}
    <circle cx={0} cy={-74} r={13} fill="#ffd23f" stroke={OUT} strokeWidth={3} />
  </g>
);

/* ───────────────── the parts ───────────────── */
export const PARTS: Record<string, { group: PartGroup; Part: Part }> = {
  /* ── back: animated sky things ── */
  sun: { group: "back", Part: ({ t, o }) => {
    const x = num(o.x, 300), y = num(o.y, 210), r = num(o.r, 70);
    return (
      <g transform={`translate(${x} ${y})`}>
        <circle r={r * 1.9} fill="#fff3a6" opacity={0.25} />
        <g transform={`rotate(${t * 6})`}>
          {Array.from({ length: 12 }).map((_, i) => (
            <rect key={i} x={-7} y={-r - 42} width={14} height={38} rx={7} fill="#ffd23f" transform={`rotate(${i * 30})`} />
          ))}
        </g>
        <circle r={r} fill="#ffd23f" stroke="#f4b400" strokeWidth={5} />
        <circle cx={-r * 0.25} cy={-r * 0.25} r={r * 0.28} fill="#fff6c8" opacity={0.8} />
      </g>
    );
  } },
  moon: { group: "back", Part: ({ o }) => (
    <g transform={`translate(${num(o.x, 1560)} ${num(o.y, 220)})`}>
      <circle r={150} fill="#fff4c2" opacity={0.18} />
      <circle r={80} fill="#fff7d6" stroke="#f0d98a" strokeWidth={5} />
      <circle cx={-22} cy={-18} r={13} fill="#f3e2a4" />
      <circle cx={26} cy={14} r={9} fill="#f3e2a4" />
      <circle cx={-6} cy={34} r={7} fill="#f3e2a4" />
    </g>
  ) },
  clouds: { group: "back", Part: ({ t, o }) => {
    const count = num(o.count, 5), yBase = num(o.yBase, 80), speed = num(o.speed, 22), opacity = num(o.opacity, 0.95), color = str(o.color, "#fff");
    return (
      <g>
        {Array.from({ length: count }).map((_, i) => {
          const sp = speed * (0.6 + rand(i) * 0.8);
          const x = ((rand(i + 10) * 2400 + t * sp) % 2500) - 300;
          return <Cloud key={i} x={x} y={yBase + rand(i + 20) * 300} s={0.7 + rand(i + 30) * 0.8} opacity={opacity} color={color} />;
        })}
      </g>
    );
  } },
  birds: { group: "back", Part: ({ t, o }) => (
    <g>
      {Array.from({ length: num(o.count, 3) }).map((_, i) => {
        const seed = i + 40;
        const x = ((rand(seed) * 2000 + t * 55) % 2300) - 200;
        const y = 120 + rand(seed + 5) * 250 + Math.sin(t * 2 + seed) * 12;
        const flap = Math.sin(t * 9 + seed) * 8;
        return <path key={i} d={`M ${x - 22} ${y + flap} Q ${x} ${y - 10} ${x + 22} ${y + flap}`} stroke={OUT} strokeWidth={5} fill="none" strokeLinecap="round" opacity={0.7} />;
      })}
    </g>
  ) },
  twinkles: { group: "back", Part: ({ t, o }) => {
    const count = num(o.count, 40), maxY = num(o.maxY, 700), color = str(o.color, "#fff6c8");
    return (
      <g>
        {Array.from({ length: count }).map((_, i) => {
          const s = 5 + rand(i + 5) * 9;
          const tw = 0.35 + 0.65 * Math.abs(Math.sin(t * 2.2 + i * 1.7));
          return (
            <g key={i} transform={`translate(${rand(i) * W} ${rand(i + 100) * maxY}) scale(${tw})`} opacity={tw}>
              <path d={`M 0 ${-s} Q ${s * 0.25} ${-s * 0.25} ${s} 0 Q ${s * 0.25} ${s * 0.25} 0 ${s} Q ${-s * 0.25} ${s * 0.25} ${-s} 0 Q ${-s * 0.25} ${-s * 0.25} 0 ${-s} Z`} fill={color} />
            </g>
          );
        })}
      </g>
    );
  } },
  shootingStar: { group: "back", Part: ({ t }) => {
    const ph = (t % 7) / 7;
    if (ph > 0.18) return null;
    const k = ph / 0.18;
    const x = 300 + k * 900, y = 120 + k * 260;
    return (
      <g opacity={Math.sin(k * Math.PI)}>
        <line x1={x} y1={y} x2={x - 160} y2={y - 46} stroke="#fff" strokeWidth={6} strokeLinecap="round" opacity={0.7} />
        <circle cx={x} cy={y} r={10} fill="#fff" />
      </g>
    );
  } },
  balloons: { group: "back", Part: ({ t, o }) => (
    <g>
      {list(o.colors, ["#ff5d9e", "#ffd23f", "#7ed957"]).map((color, i) => {
        const seed = i * 7 + 3;
        const x = 150 + rand(seed) * 1600, y = 250 + rand(seed + 1) * 350 + Math.sin(t * 1.1 + seed) * 30;
        return (
          <g key={i} transform={`translate(${x} ${y}) rotate(${Math.sin(t * 0.8 + seed) * 8})`}>
            <path d="M 0 60 q 6 40 0 90" stroke={OUT} strokeWidth={3} fill="none" />
            <ellipse rx={42} ry={54} fill={color} stroke={OUT} strokeWidth={4} />
            <ellipse cx={-14} cy={-18} rx={10} ry={16} fill="#fff" opacity={0.45} />
            <path d="M -8 54 L 8 54 L 0 66 Z" fill={color} stroke={OUT} strokeWidth={3} />
          </g>
        );
      })}
    </g>
  ) },
  smallFish: { group: "back", Part: ({ t, o }) => (
    <g>
      {list(o.colors, ["#ffd23f", "#ff7fb0", "#7fd0ff", "#c9a2ff"]).map((color, i) => {
        const seed = i * 5 + 2;
        const dir = rand(seed + 9) > 0.5 ? 1 : -1;
        const x = ((((rand(seed) * 2000 + t * (60 + rand(seed + 1) * 50) * dir) % 2300) + 2300) % 2300) - 200;
        const y = 200 + rand(seed + 2) * 500 + Math.sin(t * 2 + seed) * 25;
        const tail = Math.sin(t * 10 + seed) * 12;
        return (
          <g key={i} transform={`translate(${x} ${y}) scale(${dir} 1)`}>
            <path d={`M 30 0 L 60 ${-20 + tail} L 60 ${20 + tail} Z`} fill={color} stroke={OUT} strokeWidth={3} />
            <ellipse rx={38} ry={22} fill={color} stroke={OUT} strokeWidth={3} />
            <circle cx={-16} cy={-5} r={6} fill="#fff" />
            <circle cx={-16} cy={-5} r={3} fill={OUT} />
          </g>
        );
      })}
    </g>
  ) },
  lightRays: { group: "back", Part: ({ t }) => (
    <g>
      {Array.from({ length: 5 }).map((_, i) => (
        <path key={i} d={`M ${-100 + i * 480} 0 L ${200 + i * 480 + Math.sin(t + i) * 40} 700 L ${330 + i * 480 + Math.sin(t + i) * 40} 700 L ${60 + i * 480} 0 Z`} fill="#fff" opacity={0.07} />
      ))}
    </g>
  ) },
  sea: { group: "back", Part: ({ t, o }) => {
    const top = num(o.top, 560);
    const colors = list(o.colors, ["#5cc0e8", "#7fd0f0", "#a5e0f6"]);
    return (
      <g>
        <rect x={0} y={top} width={W} height={1080 - top} fill={str(o.color, "#3ea6d6")} />
        {colors.map((c, i) => (
          <path
            key={i}
            d={`M -200 ${top + 80 + i * 70} ${Array.from({ length: 12 }).map((_, k) => `Q ${-200 + k * 200 + 100} ${top + 80 + i * 70 + (k % 2 ? 18 : -18)} ${-200 + (k + 1) * 200} ${top + 80 + i * 70}`).join(" ")} L 2200 1100 L -200 1100 Z`}
            fill={c}
            transform={`translate(${Math.sin(t * 0.9 + i) * 40} 0)`}
          />
        ))}
      </g>
    );
  } },
  planet: { group: "back", Part: ({ t, o }) => (
    <g transform={`translate(${num(o.x, 1560)} ${num(o.y, 260) + Math.sin(t * 0.8 + num(o.x, 0)) * 10})`}>
      <circle r={num(o.r, 110)} fill={str(o.color, "#ff9f43")} stroke={OUT} strokeWidth={4} />
      {o.ring ? <ellipse rx={num(o.r, 110) * 1.7} ry={40} fill="none" stroke={str(o.ring, "#ffd9a8")} strokeWidth={16} transform="rotate(-18)" /> : null}
      <circle cx={-num(o.r, 110) * 0.3} cy={-num(o.r, 110) * 0.2} r={num(o.r, 110) * 0.18} fill="#fff" opacity={0.3} />
      {o.land ? <path d="M -60 -20 Q -20 -50 10 -30 Q 40 -10 50 30 Q 10 10 -30 30 Z" fill={str(o.land, "#7ed957")} /> : null}
    </g>
  ) },
  rocket: { group: "back", Part: ({ t, o }) => (
    <g transform={`translate(${num(o.x, 1100) + Math.sin(t * 0.5) * 40} ${num(o.y, 180) + Math.cos(t * 0.7) * 25}) rotate(-30)`}>
      <path d="M -30 60 L -50 100 L -20 80 Z" fill="#ff5d5d" stroke={OUT} strokeWidth={3} />
      <path d="M 30 60 L 50 100 L 20 80 Z" fill="#ff5d5d" stroke={OUT} strokeWidth={3} />
      <path d="M 0 -80 Q 40 -20 34 70 L -34 70 Q -40 -20 0 -80 Z" fill="#f4f4f8" stroke={OUT} strokeWidth={4} />
      <circle cy={-10} r={16} fill="#7fd0ff" stroke={OUT} strokeWidth={4} />
      <path d={`M -18 72 Q 0 ${100 + Math.abs(Math.sin(t * 20)) * 40} 18 72 Z`} fill="#ffd23f" />
    </g>
  ) },
  floatingCandy: { group: "back", Part: ({ t }) => (
    <g>
      {Array.from({ length: 14 }).map((_, i) => {
        const size = 24 + rand(i) * 40;
        const float = Math.sin(t * 1.5 + i * 2) * 18;
        const colors = ["#ff5d9e", "#c9a2ff", "#5db9ff", "#ffd93d", "#7ed957"];
        const x = rand(i + 33) * 1850, y = rand(i + 66) * 700 + float;
        return rand(i + 99) > 0.5 ? (
          <circle key={i} cx={x} cy={y} r={size / 2} fill={colors[i % 5]} opacity={0.55} />
        ) : (
          <rect key={i} x={x} y={y} width={size} height={size} rx={10} fill={colors[i % 5]} opacity={0.55} transform={`rotate(${t * 20 + i * 30} ${x + size / 2} ${y + size / 2})`} />
        );
      })}
    </g>
  ) },
  window: { group: "back", Part: ({ t, o }) => (
    <g transform={`translate(${num(o.x, 1440)} ${num(o.y, 130)})`}>
      <rect x={0} y={0} width={360} height={300} rx={20} fill="#2a2f7a" stroke="#fff" strokeWidth={14} />
      {Array.from({ length: 9 }).map((_, i) => (
        <circle key={i} cx={20 + rand(i + 300) * 320} cy={20 + rand(i + 400) * 260} r={4 + rand(i) * 3} fill="#fff6c8" opacity={0.4 + 0.6 * Math.abs(Math.sin(t * 2 + i))} />
      ))}
      <circle cx={260} cy={90} r={40} fill="#fff7d6" />
      <line x1={180} y1={0} x2={180} y2={300} stroke="#fff" strokeWidth={10} />
      <line x1={0} y1={150} x2={360} y2={150} stroke="#fff" strokeWidth={10} />
      <rect x={-30} y={-20} width={60} height={340} fill="#ffb3c6" opacity={0.9} rx={8} />
      <rect x={330} y={-20} width={60} height={340} fill="#ffb3c6" opacity={0.9} rx={8} />
    </g>
  ) },
  rainClouds: { group: "back", Part: ({ t, o }) => (
    <g>
      {Array.from({ length: num(o.count, 5) }).map((_, i) => (
        <Cloud key={i} x={((rand(i + 10) * 2400 + t * 18) % 2500) - 300} y={60 + rand(i + 20) * 200} s={1 + rand(i + 30) * 0.8} color="#c9d3e3" />
      ))}
    </g>
  ) },

  /* ── static scenery ── */
  hill: { group: "static", Part: ({ o, p }) => {
    const cx = num(o.cx, 960), top = num(o.top, 850), rx = num(o.rx, 1500);
    const color = str(o.color, p.ground);
    const id = `bh-${o.uid ?? "h"}`;
    return (
      <g>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={shade(color, 0.10)} />
            <stop offset="1" stopColor={shade(color, -0.16)} />
          </linearGradient>
        </defs>
        <ellipse cx={cx} cy={top + rx * 0.55} rx={rx} ry={rx * 0.55} fill={`url(#${id})`} />
      </g>
    );
  } },
  ground: { group: "static", Part: ({ o, p }) => {
    const top = num(o.top, GROUND_Y - 10);
    const color = str(o.color, p.ground);
    const id = `bg-${o.uid ?? "g"}`;
    return (
      <g>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={shade(color, 0.08)} />
            <stop offset="1" stopColor={shade(color, -0.2)} />
          </linearGradient>
        </defs>
        <rect x={0} y={top} width={W} height={1080 - top} fill={`url(#${id})`} />
        <path d={`M 0 ${top + 9} Q 450 ${top - 5} 960 ${top + 8} T 1920 ${top + 9}`} fill="none" stroke={shade(color, 0.28)} strokeWidth={12} opacity={0.6} />
        {o.shade ? <rect x={0} y={top} width={W} height={18} fill={str(o.shade, "#000")} opacity={0.35} /> : null}
      </g>
    );
  } },
  wavyGround: { group: "static", Part: ({ o }) => (
    <path d={`M -100 ${num(o.top, GROUND_Y - 10)} Q 400 ${num(o.top, GROUND_Y - 10) - 50} 900 ${num(o.top, GROUND_Y - 10) - 10} T 2000 ${num(o.top, GROUND_Y - 10) - 20} L 2000 1100 L -100 1100 Z`} fill={str(o.color, "#ffe6a8")} />
  ) },
  curvedGround: { group: "static", Part: ({ o }) => {
    const color = str(o.color, "#b9b3d8");
    const id = `bcg-${o.uid ?? "cg"}`;
    return (
      <g>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={shade(color, 0.3)} />
            <stop offset="1" stopColor={shade(color, -0.16)} />
          </linearGradient>
        </defs>
        <path d={`M -100 ${GROUND_Y + 20} Q 960 ${GROUND_Y - 80} 2020 ${GROUND_Y + 20} L 2020 1100 L -100 1100 Z`} fill={`url(#${id})`} />
        {o.craters ? [300, 800, 1400].map((x, i) => <ellipse key={i} cx={x} cy={GROUND_Y + 50 + i * 25} rx={60 - i * 8} ry={16} fill={str(o.craters, "#9f98c6")} stroke="#8a83b3" strokeWidth={4} />) : null}
      </g>
    );
  } },
  cloudFloor: { group: "static", Part: () => (
    <g>
      <Cloud x={620} y={910} s={2.6} />
      <Cloud x={1300} y={930} s={2.4} />
      <Cloud x={-40} y={960} s={2} />
      <Cloud x={1900} y={960} s={2} />
      <rect x={0} y={960} width={W} height={200} fill="#fff" />
    </g>
  ) },
  roundTree: { group: "static", Part: ({ o }) => <RoundTree x={num(o.x, 1720)} base={num(o.base, 880)} s={num(o.s, 1)} leaf={str(o.leaf, "#58b847")} /> },
  pine: { group: "static", Part: ({ o }) => <Pine x={num(o.x, 200)} base={num(o.base, 890)} s={num(o.s, 1)} color={str(o.color, "#2f8f4e")} snow={!!o.snow} /> },
  rainbow: { group: "static", Part: ({ o }) => {
    const colors = ["#ff5d5d", "#ff9a3c", "#ffd93d", "#7ed957", "#5db9ff", "#c9a2ff"];
    const r = num(o.r, 720);
    return (
      <g transform={`translate(${num(o.x, 760)} ${num(o.y, 880)})`} opacity={0.9}>
        {colors.map((c, i) => (
          <path key={i} d={`M ${-(r - i * 34)} 0 A ${r - i * 34} ${r - i * 34} 0 0 1 ${r - i * 34} 0`} stroke={c} strokeWidth={34} fill="none" />
        ))}
      </g>
    );
  } },
  mushroom: { group: "static", Part: ({ o }) => (
    <g transform={`translate(${num(o.x, 300)} ${num(o.y, 1000)}) scale(${num(o.s, 1)})`}>
      <rect x={-10} y={-40} width={20} height={44} rx={8} fill="#fff1d6" stroke={OUT} strokeWidth={3} />
      <ellipse rx={38} ry={22} cy={-40} fill={str(o.color, "#ff5d5d")} stroke={OUT} strokeWidth={3} />
      <circle cx={-14} cy={-46} r={6} fill="#fff" />
      <circle cx={12} cy={-38} r={5} fill="#fff" />
    </g>
  ) },
  seaweed: { group: "static", Part: ({ o }) => {
    const x = num(o.x, 100), h = num(o.h, 260);
    return <path d={`M ${x} 1000 Q ${x + 18} ${1000 - h * 0.5} ${x + 8} ${1000 - h}`} stroke={str(o.color, "#3cb371")} strokeWidth={22} fill="none" strokeLinecap="round" opacity={0.9} />;
  } },
  coral: { group: "static", Part: ({ o }) => (
    <g transform={`translate(${num(o.x, 600)} ${num(o.y, GROUND_Y + 30)})`}>
      <ellipse rx={90} ry={40} fill={str(o.color, "#ff7f9e")} stroke={OUT} strokeWidth={3} />
      {[-50, -10, 30].map((dx, j) => <circle key={j} cx={dx} cy={-38 + (j % 2) * 10} r={22} fill={str(o.light, "#ff9fb8")} stroke={OUT} strokeWidth={3} />)}
    </g>
  ) },
  shell: { group: "static", Part: ({ o }) => (
    <g transform={`translate(${num(o.x, 300)} ${num(o.y, GROUND_Y + 40)})`}>
      <path d="M -30 0 Q -25 -40 0 -46 Q 25 -40 30 0 Z" fill={str(o.color, "#ffe6a8")} stroke={OUT} strokeWidth={3} />
      <path d="M -18 -6 L 0 -38 M 18 -6 L 0 -38" stroke={OUT} strokeWidth={2} opacity={0.5} />
    </g>
  ) },
  palm: { group: "static", Part: ({ o }) => (
    <g transform={`translate(${num(o.x, 1650)} ${num(o.base, GROUND_Y - 20)}) scale(${num(o.s, 1)})`}>
      <path d="M -14 0 Q -10 -120 30 -220" stroke="#a86b3f" strokeWidth={26} fill="none" strokeLinecap="round" />
      <path d="M -14 0 Q -10 -120 30 -220" stroke="#c9895a" strokeWidth={14} fill="none" strokeLinecap="round" />
      {[-70, -30, 20, 60].map((a, i) => (
        <ellipse key={i} cx={30} cy={-224} rx={95} ry={26} fill={i % 2 ? "#3ea354" : "#58b847"} stroke={OUT} strokeWidth={4} transform={`rotate(${a} 30 -224) translate(80 0)`} />
      ))}
      <circle cx={30} cy={-214} r={16} fill="#8a5a33" stroke={OUT} strokeWidth={3} />
    </g>
  ) },
  sandcastle: { group: "static", Part: ({ o }) => (
    <g transform={`translate(${num(o.x, 300)} ${num(o.y, GROUND_Y + 40)})`}>
      <rect x={-70} y={-70} width={140} height={80} fill="#f5c76b" stroke={OUT} strokeWidth={4} />
      {[-70, -20, 30].map((dx) => <rect key={dx} x={dx} y={-92} width={30} height={24} fill="#f5c76b" stroke={OUT} strokeWidth={4} />)}
      <path d="M 0 -92 L 0 -140 L 40 -125 L 0 -110 Z" fill="#ff5d5d" stroke={OUT} strokeWidth={3} />
    </g>
  ) },
  snowman: { group: "static", Part: ({ o }) => (
    <g transform={`translate(${num(o.x, 1450)} ${num(o.y, GROUND_Y + 20)})`}>
      <circle cy={-60} r={70} fill="#fff" stroke={OUT} strokeWidth={4} />
      <circle cy={-165} r={52} fill="#fff" stroke={OUT} strokeWidth={4} />
      <circle cy={-240} r={40} fill="#fff" stroke={OUT} strokeWidth={4} />
      <circle cx={-14} cy={-248} r={5} fill={OUT} />
      <circle cx={14} cy={-248} r={5} fill={OUT} />
      <path d="M 0 -236 L 26 -230 L 0 -224 Z" fill="#ff8c1a" stroke={OUT} strokeWidth={2} />
      <path d="M -10 -222 Q 0 -212 10 -222" stroke={OUT} strokeWidth={3} fill="none" strokeLinecap="round" />
      <rect x={-34} y={-300} width={68} height={16} rx={4} fill="#ff5d5d" stroke={OUT} strokeWidth={3} />
      <rect x={-22} y={-330} width={44} height={34} rx={4} fill="#ff5d5d" stroke={OUT} strokeWidth={3} />
      <path d="M -40 -190 Q -30 -186 30 -196 L 46 -200" stroke="#ff5d5d" strokeWidth={12} fill="none" strokeLinecap="round" />
      <line x1={-50} y1={-160} x2={-100} y2={-200} stroke="#8a5a33" strokeWidth={6} strokeLinecap="round" />
      <line x1={50} y1={-160} x2={100} y2={-200} stroke="#8a5a33" strokeWidth={6} strokeLinecap="round" />
    </g>
  ) },
  lollipop: { group: "static", Part: ({ o }) => (
    <g transform={`translate(${num(o.x, 260)} ${num(o.y, GROUND_Y)})`}>
      <rect x={-12} y={-250} width={24} height={260} rx={10} fill="#fff" stroke={OUT} strokeWidth={4} />
      <circle cy={-280} r={90} fill={str(o.color, "#ff5d9e")} stroke={OUT} strokeWidth={5} />
      <path d="M 0 -280 m -60 0 a 60 60 0 1 1 120 0 a 40 40 0 1 1 -80 0 a 20 20 0 1 1 40 0" stroke="#fff" strokeWidth={14} fill="none" strokeLinecap="round" />
    </g>
  ) },
  cupcake: { group: "static", Part: ({ o }) => (
    <g transform={`translate(${num(o.x, 760)} ${num(o.y, GROUND_Y + 30)})`}>
      <path d="M -60 0 L -46 -80 L 46 -80 L 60 0 Z" fill="#ffd9b3" stroke={OUT} strokeWidth={4} strokeLinejoin="round" />
      <path d="M -70 -80 Q -30 -150 0 -110 Q 30 -150 70 -80 Z" fill={str(o.color, "#ffb3c6")} stroke={OUT} strokeWidth={4} strokeLinejoin="round" />
      <circle cy={-125} r={12} fill="#ff3b3b" stroke={OUT} strokeWidth={3} />
    </g>
  ) },
  sprinkles: { group: "static", Part: () => (
    <g>
      {Array.from({ length: 30 }).map((_, i) => (
        <rect key={i} x={rand(i + 200) * 1900} y={GROUND_Y + 30 + rand(i + 300) * 180} width={14} height={5} rx={2.5} fill={["#ff5d9e", "#5db9ff", "#ffd93d", "#7ed957"][i % 4]} transform={`rotate(${rand(i + 400) * 180} ${rand(i + 200) * 1900} ${GROUND_Y + 30 + rand(i + 300) * 180})`} />
      ))}
    </g>
  ) },
  barn: { group: "static", Part: ({ o }) => (
    <g transform={`translate(${num(o.x, 1480)} ${num(o.y, GROUND_Y - 10)})`}>
      <rect x={-200} y={-260} width={400} height={260} rx={12} fill="#ec6551" stroke="#9e3c43" strokeWidth={5} />
      {[-160, -110, -60, 0, 60, 110, 160].map((x) => <path key={x} d={`M ${x} -255 V -8`} stroke="#ffad84" strokeWidth={4} opacity={0.5} />)}
      <path d="M -230 -260 L 0 -412 L 230 -260 Z" fill="#31576b" stroke="#244653" strokeWidth={6} strokeLinejoin="round" />
      <path d="M -216 -264 L 0 -402 L 216 -264" fill="none" stroke="#72b5bf" strokeWidth={10} strokeLinejoin="round" />
      <circle cy={-305} r={30} fill="#ffe6a1" stroke="#fff5d8" strokeWidth={9} />
      <path d="M -30 -305 H 30 M 0 -335 V -275" stroke="#db9b64" strokeWidth={5} />
      <rect x={-70} y={-150} width={140} height={150} rx={70} fill="#7a3b2f" stroke={OUT} strokeWidth={4} />
      <line x1={-70} y1={-80} x2={70} y2={0} stroke="#f4d6a4" strokeWidth={8} />
      <line x1={70} y1={-80} x2={-70} y2={0} stroke="#f4d6a4" strokeWidth={8} />
      <rect x={-120} y={-230} width={60} height={50} fill="#fff6d8" stroke={OUT} strokeWidth={4} />
      <rect x={60} y={-230} width={60} height={50} fill="#fff6d8" stroke={OUT} strokeWidth={4} />
    </g>
  ) },
  fence: { group: "static", Part: ({ o }) => {
    const x = num(o.x, 40), w = num(o.w, 820), posts = Math.max(2, Math.round(w / 150));
    return (
      <g>
        {Array.from({ length: posts }).map((_, i) => (
          <rect key={i} x={x + 20 + i * (w / (posts - 1)) - 10} y={GROUND_Y - 80} width={20} height={100} rx={4} fill="#fff1d6" stroke={OUT} strokeWidth={3} />
        ))}
        <rect x={x} y={GROUND_Y - 60} width={w} height={14} fill="#fff1d6" stroke={OUT} strokeWidth={3} />
        <rect x={x} y={GROUND_Y - 20} width={w} height={14} fill="#fff1d6" stroke={OUT} strokeWidth={3} />
      </g>
    );
  } },
  wallDots: { group: "static", Part: ({ o }) => (
    <g>
      <rect x={0} y={0} width={W} height={GROUND_Y - 10} fill={str(o.wall, "#f7e9ff")} />
      {Array.from({ length: 24 }).map((_, i) => (
        <circle key={i} cx={(i % 8) * 260 + 130} cy={Math.floor(i / 8) * 260 + 120} r={26} fill={str(o.color, "#ffd9f0")} />
      ))}
    </g>
  ) },
  rug: { group: "static", Part: ({ o }) => (
    <g>
      <ellipse cx={num(o.x, 760)} cy={num(o.y, 1010)} rx={420} ry={60} fill={str(o.color, "#ff8fb8")} opacity={0.8} />
      <ellipse cx={num(o.x, 760)} cy={num(o.y, 1010)} rx={300} ry={40} fill={str(o.light, "#ffb3c6")} opacity={0.9} />
    </g>
  ) },
  bed: { group: "static", Part: ({ o }) => (
    <g transform={`translate(${num(o.x, 240)} ${GROUND_Y})`}>
      <rect x={-160} y={-240} width={320} height={110} rx={24} fill="#8a5a33" stroke={OUT} strokeWidth={4} />
      <rect x={-170} y={-150} width={340} height={130} rx={18} fill="#7fd0ff" stroke={OUT} strokeWidth={4} />
      <rect x={-140} y={-175} width={120} height={50} rx={16} fill="#fff" stroke={OUT} strokeWidth={4} />
      <path d="M -170 -100 Q 0 -70 170 -100 L 170 -20 L -170 -20 Z" fill="#ff8fb8" stroke={OUT} strokeWidth={4} />
      <rect x={-160} y={-20} width={24} height={40} fill="#8a5a33" stroke={OUT} strokeWidth={3} />
      <rect x={136} y={-20} width={24} height={40} fill="#8a5a33" stroke={OUT} strokeWidth={3} />
    </g>
  ) },
  lamp: { group: "static", Part: ({ o }) => (
    <g transform={`translate(${num(o.x, 1700)} ${GROUND_Y})`}>
      <rect x={-60} y={-200} width={120} height={200} rx={12} fill="#c9a2ff" stroke={OUT} strokeWidth={4} />
      <rect x={-50} y={-180} width={100} height={70} rx={8} fill="#e6d4ff" stroke={OUT} strokeWidth={3} />
      <rect x={-50} y={-95} width={100} height={70} rx={8} fill="#e6d4ff" stroke={OUT} strokeWidth={3} />
      <circle cy={-145} r={7} fill={OUT} />
      <circle cy={-60} r={7} fill={OUT} />
      <path d="M -20 -290 L 20 -290 L 30 -220 L -30 -220 Z" fill="#ffd23f" stroke={OUT} strokeWidth={4} strokeLinejoin="round" />
      <rect x={-6} y={-220} width={12} height={20} fill={OUT} />
    </g>
  ) },
  building: { group: "static", Part: ({ o }) => {
    const x = num(o.x, 200), w = num(o.w, 220), h = num(o.h, 420), color = str(o.color, "#ffb3c6");
    const cols = Math.max(1, Math.floor(w / 70)), rows = Math.max(1, Math.floor(h / 90));
    return (
      <g transform={`translate(${x} ${GROUND_Y - 10})`}>
        <rect x={0} y={-h} width={w} height={h} rx={8} fill={color} stroke={OUT} strokeWidth={4} />
        {Array.from({ length: cols * rows }).map((_, i) => (
          <rect key={i} x={20 + (i % cols) * 70} y={-h + 30 + Math.floor(i / cols) * 90} width={34} height={44} rx={5} fill={rand(i + x) > 0.3 ? "#fff6c8" : "#7fd0ff"} stroke={OUT} strokeWidth={2.5} />
        ))}
        <rect x={w / 2 - 30} y={-80} width={60} height={80} rx={6} fill="#8a5a33" stroke={OUT} strokeWidth={3} />
      </g>
    );
  } },
  road: { group: "static", Part: () => (
    <g>
      <rect x={0} y={GROUND_Y - 10} width={W} height={220} fill="#7c8593" />
      {Array.from({ length: 10 }).map((_, i) => <rect key={i} x={i * 200 + 40} y={GROUND_Y + 90} width={100} height={14} rx={6} fill="#fff6c8" />)}
      <rect x={0} y={GROUND_Y - 10} width={W} height={26} fill="#c9d0da" />
    </g>
  ) },
  streetLamp: { group: "static", Part: ({ o }) => (
    <g transform={`translate(${num(o.x, 1500)} ${GROUND_Y - 10})`}>
      <rect x={-8} y={-330} width={16} height={330} rx={6} fill="#4a4a55" stroke={OUT} strokeWidth={3} />
      <path d="M -8 -330 Q -8 -380 50 -380" stroke="#4a4a55" strokeWidth={14} fill="none" strokeLinecap="round" />
      <circle cx={52} cy={-370} r={22} fill="#fff6c8" stroke={OUT} strokeWidth={3} />
    </g>
  ) },
  slide: { group: "static", Part: ({ o }) => (
    <g transform={`translate(${num(o.x, 1500)} ${GROUND_Y})`}>
      <rect x={-20} y={-300} width={26} height={300} fill="#5db9ff" stroke={OUT} strokeWidth={3} />
      {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={-46} y={-280 + i * 60} width={52} height={10} fill="#ffd23f" stroke={OUT} strokeWidth={2} />)}
      <path d="M 6 -300 Q 120 -290 200 -60 L 240 0 L 190 0 Q 130 -220 6 -256 Z" fill="#ff5d9e" stroke={OUT} strokeWidth={4} strokeLinejoin="round" />
      <rect x={-20} y={-310} width={70} height={16} rx={6} fill="#ff5d9e" stroke={OUT} strokeWidth={3} />
    </g>
  ) },
  swing: { group: "static", Part: ({ o }) => (
    <g transform={`translate(${num(o.x, 300)} ${GROUND_Y})`}>
      <path d="M -160 0 L -60 -320 L 60 -320 L 160 0" stroke="#ff8c1a" strokeWidth={16} fill="none" strokeLinejoin="round" />
      <line x1={-40} y1={-320} x2={-40} y2={-120} stroke={OUT} strokeWidth={4} />
      <line x1={40} y1={-320} x2={40} y2={-120} stroke={OUT} strokeWidth={4} />
      <rect x={-56} y={-124} width={112} height={18} rx={6} fill="#8a5a33" stroke={OUT} strokeWidth={3} />
    </g>
  ) },
  sandbox: { group: "static", Part: ({ o }) => (
    <g transform={`translate(${num(o.x, 900)} ${GROUND_Y + 40})`}>
      <rect x={-200} y={-30} width={400} height={60} rx={14} fill="#ffe6a8" stroke={OUT} strokeWidth={4} />
      <rect x={-210} y={-44} width={420} height={20} rx={8} fill="#c9895a" stroke={OUT} strokeWidth={3} />
      <path d="M -60 -30 L -40 -90 L -20 -30 Z" fill="#ff5d5d" stroke={OUT} strokeWidth={3} />
      <circle cx={60} cy={-50} r={22} fill="#5db9ff" stroke={OUT} strokeWidth={3} />
    </g>
  ) },
  tiles: { group: "static", Part: ({ o }) => (
    <g>
      <rect x={0} y={0} width={W} height={GROUND_Y - 10} fill={str(o.color, "#fff4e0")} />
      {Array.from({ length: 12 }).map((_, i) => (
        <rect key={i} x={i * 160} y={GROUND_Y - 330} width={160} height={320} fill={i % 2 ? "#ffe0c2" : "#fff4e0"} stroke="#ffd1a8" strokeWidth={4} />
      ))}
    </g>
  ) },
  counter: { group: "static", Part: ({ o }) => (
    <g>
      <rect x={0} y={GROUND_Y - 10} width={W} height={220} fill={str(o.color, "#c9a27a")} />
      <rect x={0} y={GROUND_Y - 10} width={W} height={24} fill="#e8c9a0" />
    </g>
  ) },
  fridge: { group: "static", Part: ({ o }) => (
    <g transform={`translate(${num(o.x, 1600)} ${GROUND_Y - 10})`}>
      <rect x={-110} y={-460} width={220} height={460} rx={16} fill="#dfe6fb" stroke={OUT} strokeWidth={4} />
      <line x1={-110} y1={-300} x2={110} y2={-300} stroke={OUT} strokeWidth={4} />
      <rect x={70} y={-270} width={14} height={80} rx={6} fill="#8a8fa8" />
      <rect x={70} y={-430} width={14} height={60} rx={6} fill="#8a8fa8" />
      <rect x={-80} y={-250} width={60} height={70} rx={8} fill="#ffd23f" stroke={OUT} strokeWidth={3} />
    </g>
  ) },
  stove: { group: "static", Part: ({ o }) => (
    <g transform={`translate(${num(o.x, 300)} ${GROUND_Y - 10})`}>
      <rect x={-160} y={-200} width={320} height={200} rx={12} fill="#ffffff" stroke={OUT} strokeWidth={4} />
      <rect x={-140} y={-140} width={280} height={110} rx={10} fill="#4a4a55" />
      <ellipse cx={-70} cy={-210} rx={50} ry={14} fill="#4a4a55" stroke={OUT} strokeWidth={3} />
      <ellipse cx={80} cy={-210} rx={50} ry={14} fill="#4a4a55" stroke={OUT} strokeWidth={3} />
      <path d="M 30 -215 L 30 -290 Q 30 -300 40 -300 L 120 -300 Q 130 -300 130 -290 L 130 -215 Z" fill="#ff5d5d" stroke={OUT} strokeWidth={4} />
      <rect x={20} y={-306} width={120} height={14} rx={6} fill="#ff8c8c" stroke={OUT} strokeWidth={3} />
    </g>
  ) },
  mountains: { group: "static", Part: ({ o }) => {
    const color = str(o.color, "#9fb4d6"), snow = str(o.snow, "#ffffff");
    const peaks = [[100, 380], [520, 240], [960, 330], [1400, 210], [1820, 360]];
    return (
      <g>
        {peaks.map(([x, y], i) => (
          <g key={i}>
            <path d={`M ${x - 420} 900 L ${x} ${y} L ${x + 420} 900 Z`} fill={color} stroke={OUT} strokeWidth={4} strokeLinejoin="round" />
            <path d={`M ${x - 90} ${y + 130} L ${x} ${y} L ${x + 90} ${y + 130} Q ${x + 40} ${y + 110} ${x + 10} ${y + 150} Q ${x - 30} ${y + 110} ${x - 90} ${y + 130} Z`} fill={snow} />
          </g>
        ))}
      </g>
    );
  } },
  rock: { group: "static", Part: ({ o }) => (
    <g transform={`translate(${num(o.x, 500)} ${num(o.y, GROUND_Y + 20)}) scale(${num(o.s, 1)})`}>
      <path d="M -70 0 Q -80 -50 -30 -70 Q 20 -90 70 -50 Q 90 -20 70 0 Z" fill={str(o.color, "#a9b0bd")} stroke={OUT} strokeWidth={4} strokeLinejoin="round" />
      <path d="M -30 -60 Q 0 -70 30 -55" stroke="#fff" strokeWidth={5} opacity={0.4} fill="none" />
    </g>
  ) },
  cactus: { group: "static", Part: ({ o }) => (
    <g transform={`translate(${num(o.x, 400)} ${GROUND_Y}) scale(${num(o.s, 1)})`}>
      <rect x={-28} y={-260} width={56} height={270} rx={28} fill="#4faf4a" stroke={OUT} strokeWidth={4} />
      <rect x={-90} y={-200} width={40} height={110} rx={20} fill="#4faf4a" stroke={OUT} strokeWidth={4} />
      <rect x={-90} y={-130} width={70} height={36} rx={18} fill="#4faf4a" stroke={OUT} strokeWidth={4} />
      <rect x={50} y={-160} width={40} height={90} rx={20} fill="#4faf4a" stroke={OUT} strokeWidth={4} />
      <rect x={20} y={-100} width={70} height={36} rx={18} fill="#4faf4a" stroke={OUT} strokeWidth={4} />
      <circle cx={0} cy={-262} r={14} fill="#ff5d9e" stroke={OUT} strokeWidth={3} />
    </g>
  ) },
  castle: { group: "static", Part: ({ o }) => {
    const color = str(o.color, "#d9d0f5"), roof = str(o.roof, "#8f6fe0"), x = num(o.x, 1400);
    return (
      <g transform={`translate(${x} ${GROUND_Y - 10})`}>
        {[-260, 0, 260].map((dx, i) => (
          <g key={i}>
            <rect x={dx - 70} y={i === 1 ? -520 : -400} width={140} height={i === 1 ? 520 : 400} fill={color} stroke={OUT} strokeWidth={4} />
            <path d={`M ${dx - 86} ${i === 1 ? -520 : -400} L ${dx} ${i === 1 ? -660 : -520} L ${dx + 86} ${i === 1 ? -520 : -400} Z`} fill={roof} stroke={OUT} strokeWidth={4} strokeLinejoin="round" />
            <rect x={dx - 18} y={i === 1 ? -420 : -320} width={36} height={56} rx={18} fill="#7fd0ff" stroke={OUT} strokeWidth={3} />
            <path d={`M ${dx} ${i === 1 ? -660 : -520} L ${dx} ${i === 1 ? -720 : -580} L ${dx + 50} ${i === 1 ? -700 : -560} L ${dx} ${i === 1 ? -680 : -540} Z`} fill="#ff5d5d" stroke={OUT} strokeWidth={3} />
          </g>
        ))}
        <rect x={-190} y={-300} width={380} height={300} fill={color} stroke={OUT} strokeWidth={4} />
        <rect x={-60} y={-150} width={120} height={150} rx={60} fill="#8a5a33" stroke={OUT} strokeWidth={4} />
      </g>
    );
  } },
  tent: { group: "static", Part: ({ o }) => {
    const x = num(o.x, 1300), a = str(o.a, "#ff5d5d"), b = str(o.b, "#ffffff");
    return (
      <g transform={`translate(${x} ${GROUND_Y - 10})`}>
        <path d="M -420 0 Q -300 -120 0 -380 Q 300 -120 420 0 Z" fill={a} stroke={OUT} strokeWidth={5} strokeLinejoin="round" />
        {[-320, -160, 0, 160].map((dx, i) => (
          <path key={i} d={`M ${dx} 0 Q ${dx * 0.55} -180 0 -380 Q ${(dx + 160) * 0.55} -180 ${dx + 160} 0 Z`} fill={i % 2 ? a : b} opacity={0.95} />
        ))}
        <rect x={-70} y={-160} width={140} height={160} rx={70} fill="#7a3b2f" stroke={OUT} strokeWidth={4} />
        <path d="M 0 -380 L 0 -440 L 60 -420 L 0 -400 Z" fill="#ffd23f" stroke={OUT} strokeWidth={3} />
      </g>
    );
  } },
  puddle: { group: "static", Part: ({ o }) => <ellipse cx={num(o.x, 600)} cy={num(o.y, GROUND_Y + 60)} rx={num(o.rx, 120)} ry={22} fill="#7fd0ff" opacity={0.8} stroke="#5db9ff" strokeWidth={3} /> },
  pumpkin: { group: "static", Part: ({ o }) => (
    <g transform={`translate(${num(o.x, 600)} ${num(o.y, GROUND_Y + 30)}) scale(${num(o.s, 1)})`}>
      <ellipse rx={60} ry={44} fill="#ff8c1a" stroke={OUT} strokeWidth={4} />
      <ellipse rx={28} ry={44} fill="#ff8c1a" stroke={OUT} strokeWidth={3} />
      <rect x={-8} y={-62} width={16} height={24} rx={6} fill="#4faf4a" stroke={OUT} strokeWidth={3} />
    </g>
  ) },
  bench: { group: "static", Part: ({ o }) => (
    <g transform={`translate(${num(o.x, 1500)} ${GROUND_Y})`}>
      <rect x={-150} y={-120} width={300} height={22} rx={8} fill="#c9895a" stroke={OUT} strokeWidth={3} />
      <rect x={-150} y={-80} width={300} height={22} rx={8} fill="#c9895a" stroke={OUT} strokeWidth={3} />
      <rect x={-140} y={-80} width={18} height={80} fill="#8a5a33" stroke={OUT} strokeWidth={3} />
      <rect x={122} y={-80} width={18} height={80} fill="#8a5a33" stroke={OUT} strokeWidth={3} />
      <rect x={-140} y={-170} width={18} height={100} fill="#8a5a33" stroke={OUT} strokeWidth={3} />
      <rect x={122} y={-170} width={18} height={100} fill="#8a5a33" stroke={OUT} strokeWidth={3} />
    </g>
  ) },
  lilyPad: { group: "static", Part: ({ o }) => (
    <g transform={`translate(${num(o.x, 600)} ${num(o.y, GROUND_Y + 40)}) scale(${num(o.s, 1)})`}>
      <path d="M 0 0 m -70 0 a 70 38 0 1 0 140 0 L 0 0 Z" fill="#4faf4a" stroke={OUT} strokeWidth={4} />
      {o.flower ? <ellipse cx={-20} cy={-14} rx={18} ry={12} fill="#ff8fb8" stroke={OUT} strokeWidth={3} /> : null}
    </g>
  ) },
  reeds: { group: "static", Part: ({ o }) => (
    <g transform={`translate(${num(o.x, 200)} ${GROUND_Y + 20})`}>
      {[-40, -10, 20, 50].map((dx, i) => (
        <g key={i}>
          <line x1={dx} y1={0} x2={dx + 6} y2={-200 - i * 20} stroke="#3f9a3a" strokeWidth={8} strokeLinecap="round" />
          <ellipse cx={dx + 6} cy={-200 - i * 20} rx={9} ry={26} fill="#8a5a33" stroke={OUT} strokeWidth={3} />
        </g>
      ))}
    </g>
  ) },
  logs: { group: "static", Part: ({ o }) => (
    <g transform={`translate(${num(o.x, 960)} ${GROUND_Y + 40})`}>
      <rect x={-90} y={-30} width={180} height={34} rx={17} fill="#8a5a33" stroke={OUT} strokeWidth={4} transform="rotate(-14)" />
      <rect x={-90} y={-30} width={180} height={34} rx={17} fill="#a86b3f" stroke={OUT} strokeWidth={4} transform="rotate(14)" />
      {[-160, 160].map((dx) => <circle key={dx} cx={dx} cy={0} r={22} fill="#a9b0bd" stroke={OUT} strokeWidth={3} />)}
    </g>
  ) },
  campTent: { group: "static", Part: ({ o }) => (
    <g transform={`translate(${num(o.x, 1500)} ${GROUND_Y - 10})`}>
      <path d="M -220 0 L 0 -300 L 220 0 Z" fill={str(o.color, "#ff8c42")} stroke={OUT} strokeWidth={5} strokeLinejoin="round" />
      <path d="M -70 0 L 0 -180 L 70 0 Z" fill="#3b2a2a" />
    </g>
  ) },
  house: { group: "static", Part: ({ o }) => (
    <g transform={`translate(${num(o.x, 400)} ${GROUND_Y - 10}) scale(${num(o.s, 1)})`}>
      <rect x={-150} y={-260} width={300} height={260} fill={str(o.color, "#fff1d6")} stroke={OUT} strokeWidth={4} />
      <path d="M -180 -260 L 0 -400 L 180 -260 Z" fill={str(o.roof, "#e0463a")} stroke={OUT} strokeWidth={4} strokeLinejoin="round" />
      <rect x={-50} y={-130} width={100} height={130} rx={12} fill="#8a5a33" stroke={OUT} strokeWidth={4} />
      <rect x={-130} y={-220} width={60} height={60} fill="#7fd0ff" stroke={OUT} strokeWidth={3} />
      <rect x={70} y={-220} width={60} height={60} fill="#7fd0ff" stroke={OUT} strokeWidth={3} />
    </g>
  ) },

  /* ── front: animated things in front of the scenery ── */
  flowers: { group: "front", Part: ({ t, o }) => {
    const colors = list(o.colors, ["#ff8c42", "#ff5d9e", "#ffd93d", "#c9a2ff"]);
    const count = num(o.count, 7);
    return (
      <g>
        {Array.from({ length: count }).map((_, i) => (
          <Flower key={i} x={120 + i * (1700 / count) + rand(i + 40) * 80} base={num(o.base, 960) + rand(i + 50) * 80} color={colors[i % colors.length]} s={0.8 + rand(i) * 0.4} sway={Math.sin(t * 1.5 + i) * 5} />
        ))}
      </g>
    );
  } },
  sunflowers: { group: "front", Part: ({ t, o }) => (
    <g>
      {list(o.xs, ["1000", "1120", "1240"]).map((xs, i) => (
        <g key={i} transform={`translate(${Number(xs)} ${GROUND_Y + 40}) rotate(${Math.sin(t * 1.2 + i) * 4})`}>
          <rect x={-6} y={-150} width={12} height={150} fill="#3f9a3a" />
          {Array.from({ length: 10 }).map((_, k) => (
            <ellipse key={k} cx={0} cy={-190} rx={10} ry={26} fill="#ffd23f" stroke={OUT} strokeWidth={2} transform={`rotate(${k * 36} 0 -160)`} />
          ))}
          <circle cy={-160} r={20} fill="#7a4a12" stroke={OUT} strokeWidth={3} />
        </g>
      ))}
    </g>
  ) },
  butterflies: { group: "front", Part: ({ t, o }) => (
    <g>
      {list(o.colors, ["#ff8fb8", "#8fd3ff", "#ffd23f"]).map((color, i) => {
        const seed = i * 3 + 1;
        const x = 200 + rand(seed) * 1500 + Math.sin(t * 0.7 + seed) * 120;
        const y = 250 + rand(seed + 1) * 400 + Math.sin(t * 1.3 + seed * 2) * 60;
        const flap = Math.abs(Math.sin(t * 14 + seed));
        return (
          <g key={i} transform={`translate(${x} ${y}) rotate(${Math.sin(t + seed) * 12})`}>
            <ellipse cx={-16} cy={0} rx={18} ry={13} fill={color} stroke={OUT} strokeWidth={3} transform={`scale(${0.35 + flap * 0.65} 1)`} />
            <ellipse cx={16} cy={0} rx={18} ry={13} fill={color} stroke={OUT} strokeWidth={3} transform={`scale(${0.35 + flap * 0.65} 1)`} />
            <ellipse cx={0} cy={0} rx={4} ry={12} fill={OUT} />
          </g>
        );
      })}
    </g>
  ) },
  bubbles: { group: "front", Part: ({ t, o }) => (
    <g>
      {Array.from({ length: num(o.count, 12) }).map((_, i) => {
        const size = 10 + rand(i) * 26, speed = 40 + rand(i + 7) * 60;
        const y = 1150 - ((t * speed + rand(i + 3) * 1300) % 1400);
        const x = rand(i + 60) * 1880 + Math.sin(t * 1.6 + i) * 22;
        return (
          <g key={i} transform={`translate(${x} ${y})`}>
            <circle r={size} fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.7)" strokeWidth={4} />
            <circle cx={-size * 0.35} cy={-size * 0.35} r={size * 0.22} fill="#fff" opacity={0.8} />
          </g>
        );
      })}
    </g>
  ) },
  snowflakes: { group: "front", Part: ({ t, o }) => (
    <g>
      {Array.from({ length: num(o.count, 28) }).map((_, i) => {
        const size = 5 + rand(i) * 11, speed = 35 + rand(i + 7) * 45;
        const y = ((t * speed + rand(i + 3) * 1200) % 1250) - 100;
        return <circle key={i} cx={rand(i + 60) * 1920 + Math.sin(t * 1.2 + i) * 30} cy={y} r={size} fill="#fff" opacity={0.85} />;
      })}
    </g>
  ) },
  fireflies: { group: "front", Part: ({ t, o }) => (
    <g>
      {Array.from({ length: num(o.count, 12) }).map((_, i) => {
        const tw = 0.3 + 0.7 * Math.abs(Math.sin(t * 2.5 + i * 2));
        return <circle key={i} cx={200 + rand(i + 70) * 1500 + Math.sin(t + i) * 20} cy={350 + rand(i + 80) * 400 + Math.cos(t * 0.8 + i) * 20} r={6} fill="#fff8a8" opacity={tw} />;
      })}
    </g>
  ) },
  foam: { group: "front", Part: ({ t, o }) => (
    <path d={`M -100 ${num(o.top, GROUND_Y - 4)} Q 400 ${num(o.top, GROUND_Y - 4) - 50} 900 ${num(o.top, GROUND_Y - 4) - 10} T 2000 ${num(o.top, GROUND_Y - 4) - 20}`} stroke="#fff" strokeWidth={8} fill="none" opacity={0.8} transform={`translate(0 ${Math.sin(t * 1.5) * 6})`} />
  ) },
  lampGlow: { group: "front", Part: ({ t, o }) => <circle cx={num(o.x, 1700)} cy={num(o.y, GROUND_Y - 250)} r={90} fill="#fff3a6" opacity={0.25 + 0.06 * Math.sin(t * 3)} /> },
  rain: { group: "front", Part: ({ t, o }) => (
    <g stroke="#9fc9ff" strokeWidth={4} strokeLinecap="round" opacity={0.7}>
      {Array.from({ length: num(o.count, 60) }).map((_, i) => {
        const y = ((t * (600 + rand(i) * 300) + rand(i + 3) * 1200) % 1250) - 100;
        const x = rand(i + 60) * 1920;
        return <line key={i} x1={x} y1={y} x2={x - 6} y2={y + 26} />;
      })}
    </g>
  ) },
  leaves: { group: "front", Part: ({ t, o }) => (
    <g>
      {Array.from({ length: num(o.count, 18) }).map((_, i) => {
        const y = ((t * (40 + rand(i + 7) * 50) + rand(i + 3) * 1200) % 1250) - 100;
        const x = rand(i + 60) * 1920 + Math.sin(t * 1.4 + i) * 60;
        return <ellipse key={i} cx={x} cy={y} rx={14} ry={8} fill={["#ff8c1a", "#e0463a", "#ffd23f"][i % 3]} stroke={OUT} strokeWidth={2} transform={`rotate(${t * 120 + i * 40} ${x} ${y})`} />;
      })}
    </g>
  ) },
  steam: { group: "front", Part: ({ t, o }) => (
    <g>
      {[0, 1, 2].map((i) => {
        const k = ((t * 0.5 + i * 0.33) % 1);
        return <ellipse key={i} cx={num(o.x, 380) + Math.sin(k * 6 + i) * 14} cy={num(o.y, GROUND_Y - 330) - k * 160} rx={18 + k * 20} ry={14 + k * 12} fill="#fff" opacity={0.6 * (1 - k)} />;
      })}
    </g>
  ) },
  fire: { group: "front", Part: ({ t, o }) => {
    const x = num(o.x, 960), y = num(o.y, GROUND_Y + 20);
    const f = 1 + 0.15 * Math.sin(t * 18), g = 1 + 0.2 * Math.sin(t * 23 + 1);
    return (
      <g transform={`translate(${x} ${y})`}>
        <circle r={220} fill="#ffb347" opacity={0.15 + 0.05 * Math.sin(t * 10)} />
        <path d={`M -70 0 Q -80 ${-90 * f} 0 ${-150 * f} Q 80 ${-90 * f} 70 0 Z`} fill="#ff8c1a" stroke={OUT} strokeWidth={4} strokeLinejoin="round" />
        <path d={`M -36 0 Q -40 ${-60 * g} 0 ${-95 * g} Q 40 ${-60 * g} 36 0 Z`} fill="#ffd23f" />
      </g>
    );
  } },
  sparkleDust: { group: "front", Part: ({ t, o }) => (
    <g>
      {Array.from({ length: num(o.count, 10) }).map((_, i) => {
        const tw = Math.abs(Math.sin(t * 3 + i * 1.3));
        return <circle key={i} cx={rand(i + 500) * 1920} cy={100 + rand(i + 600) * 700} r={4 + tw * 5} fill={str(o.color, "#fff")} opacity={0.3 + tw * 0.6} />;
      })}
    </g>
  ) },
};

/** Baked edge framing for green outdoor sets; the center remains clear for teaching. */
export const SceneryFrame: React.FC<{ kind: string }> = ({ kind }) => {
  if (!["meadow", "forest", "farm", "garden", "park", "jungle", "pond", "playground", "castle"].includes(kind)) return null;
  return <g>
    {[false, true].map((flip) => <g key={String(flip)} transform={`translate(${flip ? W : 0} 1025) scale(${flip ? -1 : 1} 1)`}>
      <ellipse cx={20} cy={10} rx={260} ry={72} fill="#187f78" />
      {[-42, -12, 22, 52].map((angle, i) => <g key={angle} transform={`translate(${30 + i * 28} 0) rotate(${angle})`}>
        <path d="M 0 0 C -105 -85 -90 -196 -20 -245 C 50 -172 65 -77 0 0 Z" fill={["#238e85", "#39b78e", "#77cf78", "#40a77a"][i]} />
        <path d="M 0 -12 Q -22 -110 -20 -216" fill="none" stroke="#b7e993" strokeWidth={5} opacity={0.55} />
      </g>)}
      <Flower x={174} base={-10} color="#fa779c" s={1.25} />
      <Flower x={76} base={-68} color="#ffc95e" s={1.05} />
    </g>)}
  </g>;
};
