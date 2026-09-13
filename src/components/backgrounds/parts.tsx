import React, {useId} from "react";
import type { Palette } from "../../lib/palettes";
import { rand } from "../../lib/random";
import { GROUND_Y, W } from "../../lib/layout";
import type { PartGroup } from "./recipe";

const OUT = "#998698";
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
  const full = hex.length === 4 ? "#" + [...hex.slice(1)].map(c => c+c).join("") : hex;
  const n = parseInt(full.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(amt >= 0 ? c + (255 - c) * amt : c * (1 + amt))));
  const to = (v: number) => v.toString(16).padStart(2, "0");
  return `#${to(f(r))}${to(f(g))}${to(f(b))}`;
}

/* ───────────────── shared drawings ───────────────── */
const SceneryGradient: React.FC<{id:string; color:string}> = ({id,color}) => <radialGradient id={id} cx=".27" cy=".15" r=".95">
  <stop stopColor={shade(color,.52)}/><stop offset=".42" stopColor={shade(color,.2)}/><stop offset=".8" stopColor={color}/><stop offset="1" stopColor={shade(color,-.13)}/>
</radialGradient>;

const Cloud: React.FC<{ x: number; y: number; s?: number; opacity?: number; color?: string }> = ({ x, y, s = 1, opacity = 1, color = "#fff" }) => {
  const id = `cloud-${useId().replace(/:/g,"")}`;
  return <g transform={`translate(${x} ${y}) scale(${s})`} opacity={opacity}>
    <defs><SceneryGradient id={id} color={color === "#fff" ? "#d8d5e5" : color}/></defs>
    <g fill={`url(#${id})`}>
      <ellipse cy="8" rx="100" ry="37"/>
      <circle cx="-64" cy="-6" r="35"/><circle cx="-24" cy="-29" r="44"/>
      <circle cx="27" cy="-36" r="48"/><circle cx="73" cy="-7" r="34"/>
    </g>
    <path d="M-92 -8q6 -28 30 -29M-54 -42q12 -28 38 -27M1 -75q35 -17 57 10" stroke="#fff6e5" strokeWidth="3" opacity=".55" fill="none" strokeLinecap="round"/>
  </g>;
};

const RoundTree: React.FC<{ x: number; base: number; s?: number; leaf?: string; sway?: number }> = ({ x, base, s = 1, leaf = "#a8c8ae", sway = 0 }) => {
  const id = `tree-${useId().replace(/:/g,"")}`;
  return <g transform={`translate(${x} ${base}) scale(${s * 1.7}) rotate(${sway})`}>
    <defs><SceneryGradient id={id} color={leaf}/><SceneryGradient id={`${id}-bark`} color="#bd9f99"/></defs>
    <ellipse cy="3" rx="95" ry="14" fill="#728f89" opacity=".15"/>
    <path d="M-19 0Q-9 -88 -23 -172L20 -178Q12 -84 26 0Z" fill={`url(#${id}-bark)`}/>
    <path d="M-1 -80Q-50 -105 -69 -159M4 -121Q51 -132 68 -178" stroke="#bb9a96" strokeWidth="13" fill="none" strokeLinecap="round"/>
    <g fill={`url(#${id})`}>
      <ellipse cy="-170" rx="123" ry="59"/>
      <circle cx="-82" cy="-186" r="53"/><circle cx="-32" cy="-221" r="66"/>
      <circle cx="39" cy="-227" r="71"/><circle cx="91" cy="-184" r="53"/>
      <ellipse cx="-40" cy="-151" rx="62" ry="42"/><ellipse cx="45" cy="-150" rx="67" ry="43"/>
    </g>
    {Array.from({length:55},(_,i) => <ellipse key={i} cx={(rand(i+8)-.5)*205} cy={-238+rand(i+48)*105} rx={2+rand(i+18)*4} ry={1+rand(i+28)*2} fill="#f1efcd" opacity=".35" transform={`rotate(-18 ${(rand(i+8)-.5)*205} ${-238+rand(i+48)*105})`}/>)}
    <path d="M-7 -15Q-13 -47 -7 -65M8 -46Q3 -66 6 -83" stroke="#f0d7bc" strokeWidth="2.5" fill="none" opacity=".65"/>
  </g>;
};

const Pine: React.FC<{ x: number; base: number; s?: number; color?: string; snow?: boolean }> = ({ x, base, s = 1, color = "#8fab9b", snow = false }) => {
  const id = `pine-${useId().replace(/:/g,"")}`;
  return <g transform={`translate(${x} ${base}) scale(${s * 1.15})`}>
    <defs><SceneryGradient id={id} color={color}/></defs>
    <rect x="-10" y="-48" width="20" height="50" rx="7" fill="#b69a89"/>
    {[0,1,2].map(i => <g key={i} transform={`translate(0 ${-i*66}) scale(${1-i*.18})`}>
      <path d="M-106 -35Q-60 -64 -40 -91Q-18 -123 0 -166Q25 -104 50 -78Q73 -52 107 -35Q53 -15 0 -27Q-50 -13 -106 -35Z" fill={`url(#${id})`} stroke="#8fa696" strokeWidth="1.5"/>
      <path d="M-75 -45Q-30 -40 0 -50Q32 -39 75 -46" fill="none" stroke="#dce4c6" strokeWidth="3" opacity=".45"/>
      {[-1,1].map(side => <g key={side} fill="none" stroke="#e6ecd3" strokeWidth="1.3" opacity=".35">{[0,1,2,3].map(j => <path key={j} d={`M${side*(12+j*10)} ${-110+j*16}l${side*(13+j*3)} -5`}/>)}</g>)}
      {snow ? <path d="M-66 -73Q-26 -114 0 -166Q25 -113 66 -73Q38 -70 23 -82Q0 -68 -19 -81Q-45 -70 -66 -73Z" fill="#f6f3ef"/> : null}
    </g>)}
  </g>;
};

const Flower: React.FC<{ x: number; base: number; color: string; s?: number; sway?: number }> = ({ x, base, color, s = 1, sway = 0 }) => {
  const id = `flower-${useId().replace(/:/g,"")}`;
  return <g transform={`translate(${x} ${base}) scale(${s}) rotate(${sway})`}>
    <defs><SceneryGradient id={id} color={color}/></defs>
    <path d="M0 0Q8 -33 0 -72" stroke="#88aa92" strokeWidth="4" fill="none"/>
    <path d="M2 -24Q-32 -52 -23 -24Q-9 -11 2 -24M3 -43Q35 -67 25 -42Q16 -29 3 -43" fill="#adc5a1"/>
    {[0,72,144,216,288].map(a => <ellipse key={a} cx="0" cy="-91" rx="12" ry="21" fill={`url(#${id})`} transform={`rotate(${a} 0 -74)`}/>)}
    <circle cy="-74" r="12" fill="#e7cd92"/><circle cx="-3" cy="-78" r="4" fill="#fff1ce"/>
  </g>;
};

/* ───────────────── the parts ───────────────── */
export const PARTS: Record<string, { group: PartGroup; Part: Part }> = {
  /* ── back: animated sky things ── */
  sun: { group: "back", Part: ({ t, o }) => {
    const x = num(o.x, 300), y = num(o.y, 210), r = num(o.r, 70);
    return (
      <g transform={`translate(${x} ${y})`}>
        <circle r={r * 1.9} fill="#faf0c1" opacity={0.25} />
        <g transform={`rotate(${t * 6})`}>
          {Array.from({ length: 12 }).map((_, i) => (
            <rect key={i} x={-7} y={-r - 42} width={14} height={38} rx={7} fill="#f4d780" transform={`rotate(${i * 30})`} />
          ))}
        </g>
        <circle r={r} fill="#f4d780" stroke="#e9c157" strokeWidth={5} />
        <circle cx={-r * 0.25} cy={-r * 0.25} r={r * 0.28} fill="#fbf2d6" opacity={0.8} />
      </g>
    );
  } },
  moon: { group: "back", Part: ({ o }) => (
    <g transform={`translate(${num(o.x, 1560)} ${num(o.y, 220)})`}>
      <circle r={150} fill="#fbf1d2" opacity={0.18} />
      <circle r={80} fill="#fbf3de" stroke="#edddad" strokeWidth={5} />
      <circle cx={-22} cy={-18} r={13} fill="#f1e3be" />
      <circle cx={26} cy={14} r={9} fill="#f1e3be" />
      <circle cx={-6} cy={34} r={7} fill="#f1e3be" />
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
    const count = num(o.count, 40), maxY = num(o.maxY, 700), color = str(o.color, "#fbf2d6");
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
      {list(o.colors, ["#ea89ac", "#f4d780", "#a4d588"]).map((color, i) => {
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
      {list(o.colors, ["#f4d780", "#eea0bb", "#a7d3ec", "#d1b7eb"]).map((color, i) => {
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
    const colors = list(o.colors, ["#8fc5da", "#a7d2e3", "#c1dfea"]);
    return (
      <g>
        <rect x={0} y={top} width={W} height={1080 - top} fill={str(o.color, "#79b1cb")} />
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
      <circle r={num(o.r, 110)} fill={str(o.color, "#efb47d")} stroke={OUT} strokeWidth={4} />
      {o.ring ? <ellipse rx={num(o.r, 110) * 1.7} ry={40} fill="none" stroke={str(o.ring, "#f7dec0")} strokeWidth={16} transform="rotate(-18)" /> : null}
      <circle cx={-num(o.r, 110) * 0.3} cy={-num(o.r, 110) * 0.2} r={num(o.r, 110) * 0.18} fill="#fff" opacity={0.3} />
      {o.land ? <path d="M -60 -20 Q -20 -50 10 -30 Q 40 -10 50 30 Q 10 10 -30 30 Z" fill={str(o.land, "#a4d588")} /> : null}
    </g>
  ) },
  rocket: { group: "back", Part: ({ t, o }) => (
    <g transform={`translate(${num(o.x, 1100) + Math.sin(t * 0.5) * 40} ${num(o.y, 180) + Math.cos(t * 0.7) * 25}) rotate(-30)`}>
      <path d="M -30 60 L -50 100 L -20 80 Z" fill="#e88786" stroke={OUT} strokeWidth={3} />
      <path d="M 30 60 L 50 100 L 20 80 Z" fill="#e88786" stroke={OUT} strokeWidth={3} />
      <path d="M 0 -80 Q 40 -20 34 70 L -34 70 Q -40 -20 0 -80 Z" fill="#f5f1f2" stroke={OUT} strokeWidth={4} />
      <circle cy={-10} r={16} fill="#a7d3ec" stroke={OUT} strokeWidth={4} />
      <path d={`M -18 72 Q 0 ${100 + Math.abs(Math.sin(t * 20)) * 40} 18 72 Z`} fill="#f4d780" />
    </g>
  ) },
  floatingCandy: { group: "back", Part: ({ t }) => (
    <g>
      {Array.from({ length: 14 }).map((_, i) => {
        const size = 24 + rand(i) * 40;
        const float = Math.sin(t * 1.5 + i * 2) * 18;
        const colors = ["#ea89ac", "#d1b7eb", "#8fc1e7", "#f5dc80", "#a4d588"];
        const x = rand(i + 33) * 1850, y = rand(i + 66) * 700 + float;
        return rand(i + 99) > 0.5 ? (
          <circle key={i} cx={x} cy={y} r={size / 2} fill={colors[i % 5]} opacity={0.55} />
        ) : (
          <rect key={i} x={x} y={y} width={size} height={size} rx={10} fill={colors[i % 5]} opacity={0.55} transform={`rotate(${t * 20 + i * 30} ${x + size / 2} ${y + size / 2})`} />
        );
      })}
    </g>
  ) },
  window: { group: "front", Part: ({ t, o }) => (
    <g transform={`translate(${num(o.x, 1440)} ${num(o.y, 130)})`}>
      <rect x={0} y={0} width={360} height={300} rx={20} fill="#5d5d86" stroke="#fff" strokeWidth={14} />
      {Array.from({ length: 9 }).map((_, i) => (
        <circle key={i} cx={20 + rand(i + 300) * 320} cy={20 + rand(i + 400) * 260} r={4 + rand(i) * 3} fill="#fbf2d6" opacity={0.4 + 0.6 * Math.abs(Math.sin(t * 2 + i))} />
      ))}
      <circle cx={260} cy={90} r={40} fill="#fbf3de" />
      <line x1={180} y1={0} x2={180} y2={300} stroke="#fff" strokeWidth={10} />
      <line x1={0} y1={150} x2={360} y2={150} stroke="#fff" strokeWidth={10} />
      <rect x={-30} y={-20} width={60} height={340} fill="#f4c4ce" opacity={0.9} rx={8} />
      <rect x={330} y={-20} width={60} height={340} fill="#f4c4ce" opacity={0.9} rx={8} />
    </g>
  ) },
  rainClouds: { group: "back", Part: ({ t, o }) => (
    <g>
      {Array.from({ length: num(o.count, 5) }).map((_, i) => (
        <Cloud key={i} x={((rand(i + 10) * 2400 + t * 18) % 2500) - 300} y={60 + rand(i + 20) * 200} s={1 + rand(i + 30) * 0.8} color="#d6d8df" />
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
    <g><path d={`M -100 ${num(o.top, GROUND_Y - 10)} Q 400 ${num(o.top, GROUND_Y - 10) - 50} 900 ${num(o.top, GROUND_Y - 10) - 10} T 2000 ${num(o.top, GROUND_Y - 10) - 20} L 2000 1100 L -100 1100 Z`} fill={str(o.color, "#f9e7c1")} />
      {o.scene === "pond" ? <g>
        <defs><linearGradient id={`pond-${o.uid}`} x2=".3" y2="1"><stop stopColor="#d4e5df"/><stop offset=".55" stopColor="#a6d0ce"/><stop offset="1" stopColor="#85b7bf"/></linearGradient></defs>
        <path d="M620 900C650 817 1220 781 1580 817Q1880 864 1790 965Q1530 1065 985 1020Q713 1006 620 900Z" fill={`url(#pond-${o.uid})`} stroke="#d5debd" strokeWidth="13"/>
        {Array.from({length:32},(_,i) => <path key={i} d={`M${820+rand(i+7)*810} ${871+rand(i+37)*115}h${15+rand(i+87)*60}`} stroke="#f0efe0" strokeWidth="2" opacity=".5" strokeLinecap="round"/>)}
      </g> : null}
    </g>
  ) },
  curvedGround: { group: "static", Part: ({ o }) => {
    const color = str(o.color, "#c8c1d4");
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
        {o.craters ? [300, 800, 1400].map((x, i) => <ellipse key={i} cx={x} cy={GROUND_Y + 50 + i * 25} rx={60 - i * 8} ry={16} fill={str(o.craters, "#b4adc5")} stroke="#a49db7" strokeWidth={4} />) : null}
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
  roundTree: { group: "static", Part: ({ o }) => <RoundTree x={num(o.x, 1720)} base={num(o.base, 880)} s={num(o.s, 1)} leaf={str(o.leaf, "#88bc79")} /> },
  pine: { group: "static", Part: ({ o }) => <Pine x={num(o.x, 200)} base={num(o.base, 890)} s={num(o.s, 1)} color={str(o.color, "#6a9e77")} snow={!!o.snow} /> },
  rainbow: { group: "static", Part: ({ o }) => {
    const colors = ["#e88786", "#eeb178", "#f5dc80", "#a4d588", "#8fc1e7", "#d1b7eb"];
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
      <rect x={-10} y={-40} width={20} height={44} rx={8} fill="#fbefde" stroke={OUT} strokeWidth={3} />
      <ellipse rx={38} ry={22} cy={-40} fill={str(o.color, "#e88786")} stroke={OUT} strokeWidth={3} />
      <circle cx={-14} cy={-46} r={6} fill="#fff" />
      <circle cx={12} cy={-38} r={5} fill="#fff" />
    </g>
  ) },
  seaweed: { group: "static", Part: ({ o }) => {
    const x = num(o.x, 100), h = num(o.h, 260);
    return <path d={`M ${x} 1000 Q ${x + 18} ${1000 - h * 0.5} ${x + 8} ${1000 - h}`} stroke={str(o.color, "#77b890")} strokeWidth={22} fill="none" strokeLinecap="round" opacity={0.9} />;
  } },
  coral: { group: "static", Part: ({ o }) => (
    <g transform={`translate(${num(o.x, 600)} ${num(o.y, GROUND_Y + 30)})`}>
      <ellipse rx={90} ry={40} fill={str(o.color, "#eda0b0")} stroke={OUT} strokeWidth={3} />
      {[-50, -10, 30].map((dx, j) => <circle key={j} cx={dx} cy={-38 + (j % 2) * 10} r={22} fill={str(o.light, "#f1b7c3")} stroke={OUT} strokeWidth={3} />)}
    </g>
  ) },
  shell: { group: "static", Part: ({ o }) => (
    <g transform={`translate(${num(o.x, 300)} ${num(o.y, GROUND_Y + 40)})`}>
      <path d="M -30 0 Q -25 -40 0 -46 Q 25 -40 30 0 Z" fill={str(o.color, "#f9e7c1")} stroke={OUT} strokeWidth={3} />
      <path d="M -18 -6 L 0 -38 M 18 -6 L 0 -38" stroke={OUT} strokeWidth={2} opacity={0.5} />
    </g>
  ) },
  palm: { group: "static", Part: ({ o }) => (
    <g transform={`translate(${num(o.x, 1650)} ${num(o.base, GROUND_Y - 20)}) scale(${num(o.s, 1)})`}>
      <path d="M -14 0 Q -10 -120 30 -220" stroke="#b28c70" strokeWidth={26} fill="none" strokeLinecap="round" />
      <path d="M -14 0 Q -10 -120 30 -220" stroke="#cba386" strokeWidth={14} fill="none" strokeLinecap="round" />
      {[-70, -30, 20, 60].map((a, i) => (
        <ellipse key={i} cx={30} cy={-224} rx={95} ry={26} fill={i % 2 ? "#76ad7d" : "#88bc79"} stroke={OUT} strokeWidth={4} transform={`rotate(${a} 30 -224) translate(80 0)`} />
      ))}
      <circle cx={30} cy={-214} r={16} fill="#9d7e66" stroke={OUT} strokeWidth={3} />
    </g>
  ) },
  sandcastle: { group: "static", Part: ({ o }) => (
    <g transform={`translate(${num(o.x, 300)} ${num(o.y, GROUND_Y + 40)})`}>
      <rect x={-70} y={-70} width={140} height={80} fill="#eed099" stroke={OUT} strokeWidth={4} />
      {[-70, -20, 30].map((dx) => <rect key={dx} x={dx} y={-92} width={30} height={24} fill="#eed099" stroke={OUT} strokeWidth={4} />)}
      <path d="M 0 -92 L 0 -140 L 40 -125 L 0 -110 Z" fill="#e88786" stroke={OUT} strokeWidth={3} />
    </g>
  ) },
  snowman: { group: "static", Part: ({ o }) => (
    <g transform={`translate(${num(o.x, 1450)} ${num(o.y, GROUND_Y + 20)})`}>
      <circle cy={-60} r={70} fill="#fff" stroke={OUT} strokeWidth={4} />
      <circle cy={-165} r={52} fill="#fff" stroke={OUT} strokeWidth={4} />
      <circle cy={-240} r={40} fill="#fff" stroke={OUT} strokeWidth={4} />
      <circle cx={-14} cy={-248} r={5} fill={OUT} />
      <circle cx={14} cy={-248} r={5} fill={OUT} />
      <path d="M 0 -236 L 26 -230 L 0 -224 Z" fill="#eca663" stroke={OUT} strokeWidth={2} />
      <path d="M -10 -222 Q 0 -212 10 -222" stroke={OUT} strokeWidth={3} fill="none" strokeLinecap="round" />
      <rect x={-34} y={-300} width={68} height={16} rx={4} fill="#e88786" stroke={OUT} strokeWidth={3} />
      <rect x={-22} y={-330} width={44} height={34} rx={4} fill="#e88786" stroke={OUT} strokeWidth={3} />
      <path d="M -40 -190 Q -30 -186 30 -196 L 46 -200" stroke="#e88786" strokeWidth={12} fill="none" strokeLinecap="round" />
      <line x1={-50} y1={-160} x2={-100} y2={-200} stroke="#9d7e66" strokeWidth={6} strokeLinecap="round" />
      <line x1={50} y1={-160} x2={100} y2={-200} stroke="#9d7e66" strokeWidth={6} strokeLinecap="round" />
    </g>
  ) },
  lollipop: { group: "static", Part: ({ o }) => (
    <g transform={`translate(${num(o.x, 260)} ${num(o.y, GROUND_Y)})`}>
      <rect x={-12} y={-250} width={24} height={260} rx={10} fill="#fff" stroke={OUT} strokeWidth={4} />
      <circle cy={-280} r={90} fill={str(o.color, "#ea89ac")} stroke={OUT} strokeWidth={5} />
      <path d="M 0 -280 m -60 0 a 60 60 0 1 1 120 0 a 40 40 0 1 1 -80 0 a 20 20 0 1 1 40 0" stroke="#fff" strokeWidth={14} fill="none" strokeLinecap="round" />
    </g>
  ) },
  cupcake: { group: "static", Part: ({ o }) => (
    <g transform={`translate(${num(o.x, 760)} ${num(o.y, GROUND_Y + 30)})`}>
      <path d="M -60 0 L -46 -80 L 46 -80 L 60 0 Z" fill="#f7dec6" stroke={OUT} strokeWidth={4} strokeLinejoin="round" />
      <path d="M -70 -80 Q -30 -150 0 -110 Q 30 -150 70 -80 Z" fill={str(o.color, "#f4c4ce")} stroke={OUT} strokeWidth={4} strokeLinejoin="round" />
      <circle cy={-125} r={12} fill="#e46f6e" stroke={OUT} strokeWidth={3} />
    </g>
  ) },
  sprinkles: { group: "static", Part: () => (
    <g>
      {Array.from({ length: 30 }).map((_, i) => (
        <rect key={i} x={rand(i + 200) * 1900} y={GROUND_Y + 30 + rand(i + 300) * 180} width={14} height={5} rx={2.5} fill={["#ea89ac", "#8fc1e7", "#f5dc80", "#a4d588"][i % 4]} transform={`rotate(${rand(i + 400) * 180} ${rand(i + 200) * 1900} ${GROUND_Y + 30 + rand(i + 300) * 180})`} />
      ))}
    </g>
  ) },
  barn: { group: "static", Part: ({ o }) => (
    <g transform={`translate(${num(o.x, 1480)} ${num(o.y, GROUND_Y - 10)})`}>
      <rect x={-200} y={-260} width={400} height={260} rx={12} fill="#dd8c7e" stroke="#a76b6d" strokeWidth={5} />
      {[-160, -110, -60, 0, 60, 110, 160].map((x) => <path key={x} d={`M ${x} -255 V -8`} stroke="#f2bfa5" strokeWidth={4} opacity={0.5} />)}
      <path d="M -230 -260 L 0 -412 L 230 -260 Z" fill="#667882" stroke="#5b6c71" strokeWidth={6} strokeLinejoin="round" />
      <path d="M -216 -264 L 0 -402 L 216 -264" fill="none" stroke="#9bbec2" strokeWidth={10} strokeLinejoin="round" />
      <circle cy={-305} r={30} fill="#f9e7bd" stroke="#fbf2df" strokeWidth={9} />
      <path d="M -30 -305 H 30 M 0 -335 V -275" stroke="#d8b08e" strokeWidth={5} />
      <rect x={-70} y={-150} width={140} height={150} rx={70} fill="#90685f" stroke={OUT} strokeWidth={4} />
      <line x1={-70} y1={-80} x2={70} y2={0} stroke="#f0dbbc" strokeWidth={8} />
      <line x1={70} y1={-80} x2={-70} y2={0} stroke="#f0dbbc" strokeWidth={8} />
      <rect x={-120} y={-230} width={60} height={50} fill="#fbf3e0" stroke={OUT} strokeWidth={4} />
      <rect x={60} y={-230} width={60} height={50} fill="#fbf3e0" stroke={OUT} strokeWidth={4} />
    </g>
  ) },
  fence: { group: "static", Part: ({ o }) => {
    const x = num(o.x, 40), w = num(o.w, 820), posts = Math.max(2, Math.round(w / 150));
    return (
      <g>
        {Array.from({ length: posts }).map((_, i) => (
          <rect key={i} x={x + 20 + i * (w / (posts - 1)) - 10} y={GROUND_Y - 80} width={20} height={100} rx={4} fill="#fbefde" stroke={OUT} strokeWidth={3} />
        ))}
        <rect x={x} y={GROUND_Y - 60} width={w} height={14} fill="#fbefde" stroke={OUT} strokeWidth={3} />
        <rect x={x} y={GROUND_Y - 20} width={w} height={14} fill="#fbefde" stroke={OUT} strokeWidth={3} />
      </g>
    );
  } },
  wallDots: { group: "static", Part: ({ o }) => (
    <g>
      <rect x={0} y={0} width={W} height={GROUND_Y - 10} fill={str(o.wall, "#f6eaf5")} />
      {Array.from({ length: 24 }).map((_, i) => (
        <circle key={i} cx={(i % 8) * 260 + 130} cy={Math.floor(i / 8) * 260 + 120} r={26} fill={str(o.color, "#f9dfeb")} />
      ))}
    </g>
  ) },
  rug: { group: "static", Part: ({ o }) => (
    <g>
      <ellipse cx={num(o.x, 760)} cy={num(o.y, 1010)} rx={420} ry={60} fill={str(o.color, "#f0acc1")} opacity={0.8} />
      <ellipse cx={num(o.x, 760)} cy={num(o.y, 1010)} rx={300} ry={40} fill={str(o.light, "#f4c4ce")} opacity={0.9} />
    </g>
  ) },
  bed: { group: "static", Part: ({ o }) => (
    <g transform={`translate(${num(o.x, 240)} ${GROUND_Y})`}>
      <rect x={-160} y={-240} width={320} height={110} rx={24} fill="#9d7e66" stroke={OUT} strokeWidth={4} />
      <rect x={-170} y={-150} width={340} height={130} rx={18} fill="#a7d3ec" stroke={OUT} strokeWidth={4} />
      <rect x={-140} y={-175} width={120} height={50} rx={16} fill="#fff" stroke={OUT} strokeWidth={4} />
      <path d="M -170 -100 Q 0 -70 170 -100 L 170 -20 L -170 -20 Z" fill="#f0acc1" stroke={OUT} strokeWidth={4} />
      <rect x={-160} y={-20} width={24} height={40} fill="#9d7e66" stroke={OUT} strokeWidth={3} />
      <rect x={136} y={-20} width={24} height={40} fill="#9d7e66" stroke={OUT} strokeWidth={3} />
    </g>
  ) },
  lamp: { group: "static", Part: ({ o }) => (
    <g transform={`translate(${num(o.x, 1700)} ${GROUND_Y})`}>
      <rect x={-60} y={-200} width={120} height={200} rx={12} fill="#d1b7eb" stroke={OUT} strokeWidth={4} />
      <rect x={-50} y={-180} width={100} height={70} rx={8} fill="#e9dbf2" stroke={OUT} strokeWidth={3} />
      <rect x={-50} y={-95} width={100} height={70} rx={8} fill="#e9dbf2" stroke={OUT} strokeWidth={3} />
      <circle cy={-145} r={7} fill={OUT} />
      <circle cy={-60} r={7} fill={OUT} />
      <path d="M -20 -290 L 20 -290 L 30 -220 L -30 -220 Z" fill="#f4d780" stroke={OUT} strokeWidth={4} strokeLinejoin="round" />
      <rect x={-6} y={-220} width={12} height={20} fill={OUT} />
    </g>
  ) },
  building: { group: "static", Part: ({ o }) => {
    const x = num(o.x, 200), w = num(o.w, 220), h = num(o.h, 420), color = str(o.color, "#f4c4ce");
    const cols = Math.max(1, Math.floor(w / 70)), rows = Math.max(1, Math.floor(h / 90));
    return (
      <g transform={`translate(${x} ${GROUND_Y - 10})`}>
        <rect x={0} y={-h} width={w} height={h} rx={8} fill={color} stroke={OUT} strokeWidth={4} />
        {Array.from({ length: cols * rows }).map((_, i) => (
          <rect key={i} x={20 + (i % cols) * 70} y={-h + 30 + Math.floor(i / cols) * 90} width={34} height={44} rx={5} fill={rand(i + x) > 0.3 ? "#fbf2d6" : "#a7d3ec"} stroke={OUT} strokeWidth={2.5} />
        ))}
        <rect x={w / 2 - 30} y={-80} width={60} height={80} rx={6} fill="#9d7e66" stroke={OUT} strokeWidth={3} />
      </g>
    );
  } },
  road: { group: "static", Part: () => (
    <g>
      <rect x={0} y={GROUND_Y - 10} width={W} height={220} fill="#9b9da3" />
      {Array.from({ length: 10 }).map((_, i) => <rect key={i} x={i * 200 + 40} y={GROUND_Y + 90} width={100} height={14} rx={6} fill="#fbf2d6" />)}
      <rect x={0} y={GROUND_Y - 10} width={W} height={26} fill="#d5d6da" />
    </g>
  ) },
  streetLamp: { group: "static", Part: ({ o }) => (
    <g transform={`translate(${num(o.x, 1500)} ${GROUND_Y - 10})`}>
      <rect x={-8} y={-330} width={16} height={330} rx={6} fill="#747075" stroke={OUT} strokeWidth={3} />
      <path d="M -8 -330 Q -8 -380 50 -380" stroke="#747075" strokeWidth={14} fill="none" strokeLinecap="round" />
      <circle cx={52} cy={-370} r={22} fill="#fbf2d6" stroke={OUT} strokeWidth={3} />
    </g>
  ) },
  slide: { group: "static", Part: ({ o }) => (
    <g transform={`translate(${num(o.x, 1500)} ${GROUND_Y})`}>
      <rect x={-20} y={-300} width={26} height={300} fill="#8fc1e7" stroke={OUT} strokeWidth={3} />
      {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={-46} y={-280 + i * 60} width={52} height={10} fill="#f4d780" stroke={OUT} strokeWidth={2} />)}
      <path d="M 6 -300 Q 120 -290 200 -60 L 240 0 L 190 0 Q 130 -220 6 -256 Z" fill="#ea89ac" stroke={OUT} strokeWidth={4} strokeLinejoin="round" />
      <rect x={-20} y={-310} width={70} height={16} rx={6} fill="#ea89ac" stroke={OUT} strokeWidth={3} />
    </g>
  ) },
  swing: { group: "static", Part: ({ o }) => (
    <g transform={`translate(${num(o.x, 300)} ${GROUND_Y})`}>
      <path d="M -160 0 L -60 -320 L 60 -320 L 160 0" stroke="#eca663" strokeWidth={16} fill="none" strokeLinejoin="round" />
      <line x1={-40} y1={-320} x2={-40} y2={-120} stroke={OUT} strokeWidth={4} />
      <line x1={40} y1={-320} x2={40} y2={-120} stroke={OUT} strokeWidth={4} />
      <rect x={-56} y={-124} width={112} height={18} rx={6} fill="#9d7e66" stroke={OUT} strokeWidth={3} />
    </g>
  ) },
  sandbox: { group: "static", Part: ({ o }) => (
    <g transform={`translate(${num(o.x, 900)} ${GROUND_Y + 40})`}>
      <rect x={-200} y={-30} width={400} height={60} rx={14} fill="#f9e7c1" stroke={OUT} strokeWidth={4} />
      <rect x={-210} y={-44} width={420} height={20} rx={8} fill="#cba386" stroke={OUT} strokeWidth={3} />
      <path d="M -60 -30 L -40 -90 L -20 -30 Z" fill="#e88786" stroke={OUT} strokeWidth={3} />
      <circle cx={60} cy={-50} r={22} fill="#8fc1e7" stroke={OUT} strokeWidth={3} />
    </g>
  ) },
  tiles: { group: "static", Part: ({ o }) => (
    <g>
      <rect x={0} y={0} width={W} height={GROUND_Y - 10} fill={str(o.color, "#fbf2e4")} />
      {Array.from({ length: 12 }).map((_, i) => (
        <rect key={i} x={i * 160} y={GROUND_Y - 330} width={160} height={320} fill={i % 2 ? "#f9e3d0" : "#fbf2e4"} stroke="#f6d8bf" strokeWidth={4} />
      ))}
    </g>
  ) },
  counter: { group: "static", Part: ({ o }) => (
    <g>
      <rect x={0} y={GROUND_Y - 10} width={W} height={220} fill={str(o.color, "#ceb49b")} />
      <rect x={0} y={GROUND_Y - 10} width={W} height={24} fill="#e7d2b8" />
    </g>
  ) },
  fridge: { group: "static", Part: ({ o }) => (
    <g transform={`translate(${num(o.x, 1600)} ${GROUND_Y - 10})`}>
      <rect x={-110} y={-460} width={220} height={460} rx={16} fill="#e6e7f1" stroke={OUT} strokeWidth={4} />
      <line x1={-110} y1={-300} x2={110} y2={-300} stroke={OUT} strokeWidth={4} />
      <rect x={70} y={-270} width={14} height={80} rx={6} fill="#a5a5b1" />
      <rect x={70} y={-430} width={14} height={60} rx={6} fill="#a5a5b1" />
      <rect x={-80} y={-250} width={60} height={70} rx={8} fill="#f4d780" stroke={OUT} strokeWidth={3} />
    </g>
  ) },
  stove: { group: "static", Part: ({ o }) => (
    <g transform={`translate(${num(o.x, 300)} ${GROUND_Y - 10})`}>
      <rect x={-160} y={-200} width={320} height={200} rx={12} fill="#fdfaf8" stroke={OUT} strokeWidth={4} />
      <rect x={-140} y={-140} width={280} height={110} rx={10} fill="#747075" />
      <ellipse cx={-70} cy={-210} rx={50} ry={14} fill="#747075" stroke={OUT} strokeWidth={3} />
      <ellipse cx={80} cy={-210} rx={50} ry={14} fill="#747075" stroke={OUT} strokeWidth={3} />
      <path d="M 30 -215 L 30 -290 Q 30 -300 40 -300 L 120 -300 Q 130 -300 130 -290 L 130 -215 Z" fill="#e88786" stroke={OUT} strokeWidth={4} />
      <rect x={20} y={-306} width={120} height={14} rx={6} fill="#eea9a7" stroke={OUT} strokeWidth={3} />
    </g>
  ) },
  mountains: { group: "static", Part: ({ o }) => {
    const color = str(o.color, "#b7c0d2"), snow = str(o.snow, "#fdfaf8");
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
      <path d="M -70 0 Q -80 -50 -30 -70 Q 20 -90 70 -50 Q 90 -20 70 0 Z" fill={str(o.color, "#bdbec3")} stroke={OUT} strokeWidth={4} strokeLinejoin="round" />
      <path d="M -30 -60 Q 0 -70 30 -55" stroke="#fff" strokeWidth={5} opacity={0.4} fill="none" />
    </g>
  ) },
  cactus: { group: "static", Part: ({ o }) => (
    <g transform={`translate(${num(o.x, 400)} ${GROUND_Y}) scale(${num(o.s, 1)})`}>
      <rect x={-28} y={-260} width={56} height={270} rx={28} fill="#82b679" stroke={OUT} strokeWidth={4} />
      <rect x={-90} y={-200} width={40} height={110} rx={20} fill="#82b679" stroke={OUT} strokeWidth={4} />
      <rect x={-90} y={-130} width={70} height={36} rx={18} fill="#82b679" stroke={OUT} strokeWidth={4} />
      <rect x={50} y={-160} width={40} height={90} rx={20} fill="#82b679" stroke={OUT} strokeWidth={4} />
      <rect x={20} y={-100} width={70} height={36} rx={18} fill="#82b679" stroke={OUT} strokeWidth={4} />
      <circle cx={0} cy={-262} r={14} fill="#ea89ac" stroke={OUT} strokeWidth={3} />
    </g>
  ) },
  castle: { group: "static", Part: ({ o }) => {
    const color = str(o.color, "#e0d7eb"), roof = str(o.roof, "#a690d0"), x = num(o.x, 1400);
    return (
      <g transform={`translate(${x} ${GROUND_Y - 10})`}>
        {[-260, 0, 260].map((dx, i) => (
          <g key={i}>
            <rect x={dx - 70} y={i === 1 ? -520 : -400} width={140} height={i === 1 ? 520 : 400} fill={color} stroke={OUT} strokeWidth={4} />
            <path d={`M ${dx - 86} ${i === 1 ? -520 : -400} L ${dx} ${i === 1 ? -660 : -520} L ${dx + 86} ${i === 1 ? -520 : -400} Z`} fill={roof} stroke={OUT} strokeWidth={4} strokeLinejoin="round" />
            <rect x={dx - 18} y={i === 1 ? -420 : -320} width={36} height={56} rx={18} fill="#a7d3ec" stroke={OUT} strokeWidth={3} />
            <path d={`M ${dx} ${i === 1 ? -660 : -520} L ${dx} ${i === 1 ? -720 : -580} L ${dx + 50} ${i === 1 ? -700 : -560} L ${dx} ${i === 1 ? -680 : -540} Z`} fill="#e88786" stroke={OUT} strokeWidth={3} />
          </g>
        ))}
        <rect x={-190} y={-300} width={380} height={300} fill={color} stroke={OUT} strokeWidth={4} />
        <rect x={-60} y={-150} width={120} height={150} rx={60} fill="#9d7e66" stroke={OUT} strokeWidth={4} />
      </g>
    );
  } },
  tent: { group: "static", Part: ({ o }) => {
    const x = num(o.x, 1300), a = str(o.a, "#e88786"), b = str(o.b, "#fdfaf8");
    return (
      <g transform={`translate(${x} ${GROUND_Y - 10})`}>
        <path d="M -420 0 Q -300 -120 0 -380 Q 300 -120 420 0 Z" fill={a} stroke={OUT} strokeWidth={5} strokeLinejoin="round" />
        {[-320, -160, 0, 160].map((dx, i) => (
          <path key={i} d={`M ${dx} 0 Q ${dx * 0.55} -180 0 -380 Q ${(dx + 160) * 0.55} -180 ${dx + 160} 0 Z`} fill={i % 2 ? a : b} opacity={0.95} />
        ))}
        <rect x={-70} y={-160} width={140} height={160} rx={70} fill="#90685f" stroke={OUT} strokeWidth={4} />
        <path d="M 0 -380 L 0 -440 L 60 -420 L 0 -400 Z" fill="#f4d780" stroke={OUT} strokeWidth={3} />
      </g>
    );
  } },
  puddle: { group: "static", Part: ({ o }) => <ellipse cx={num(o.x, 600)} cy={num(o.y, GROUND_Y + 60)} rx={num(o.rx, 120)} ry={22} fill="#a7d3ec" opacity={0.8} stroke="#8fc1e7" strokeWidth={3} /> },
  pumpkin: { group: "static", Part: ({ o }) => (
    <g transform={`translate(${num(o.x, 600)} ${num(o.y, GROUND_Y + 30)}) scale(${num(o.s, 1)})`}>
      <ellipse rx={60} ry={44} fill="#eca663" stroke={OUT} strokeWidth={4} />
      <ellipse rx={28} ry={44} fill="#eca663" stroke={OUT} strokeWidth={3} />
      <rect x={-8} y={-62} width={16} height={24} rx={6} fill="#82b679" stroke={OUT} strokeWidth={3} />
    </g>
  ) },
  bench: { group: "static", Part: ({ o }) => (
    <g transform={`translate(${num(o.x, 1500)} ${GROUND_Y})`}>
      <rect x={-150} y={-120} width={300} height={22} rx={8} fill="#cba386" stroke={OUT} strokeWidth={3} />
      <rect x={-150} y={-80} width={300} height={22} rx={8} fill="#cba386" stroke={OUT} strokeWidth={3} />
      <rect x={-140} y={-80} width={18} height={80} fill="#9d7e66" stroke={OUT} strokeWidth={3} />
      <rect x={122} y={-80} width={18} height={80} fill="#9d7e66" stroke={OUT} strokeWidth={3} />
      <rect x={-140} y={-170} width={18} height={100} fill="#9d7e66" stroke={OUT} strokeWidth={3} />
      <rect x={122} y={-170} width={18} height={100} fill="#9d7e66" stroke={OUT} strokeWidth={3} />
    </g>
  ) },
  lilyPad: { group: "static", Part: ({ o }) => (
    <g transform={`translate(${num(o.x, 600)} ${num(o.y, GROUND_Y + 40)}) scale(${num(o.s, 1)})`}>
      <path d="M 0 0 m -70 0 a 70 38 0 1 0 140 0 L 0 0 Z" fill="#82b679" stroke={OUT} strokeWidth={4} />
      {o.flower ? <ellipse cx={-20} cy={-14} rx={18} ry={12} fill="#f0acc1" stroke={OUT} strokeWidth={3} /> : null}
    </g>
  ) },
  reeds: { group: "static", Part: ({ o }) => (
    <g transform={`translate(${num(o.x, 200)} ${GROUND_Y + 20})`}>
      {[-40, -10, 20, 50].map((dx, i) => (
        <g key={i}>
          <line x1={dx} y1={0} x2={dx + 6} y2={-200 - i * 20} stroke="#75a66d" strokeWidth={8} strokeLinecap="round" />
          <ellipse cx={dx + 6} cy={-200 - i * 20} rx={9} ry={26} fill="#9d7e66" stroke={OUT} strokeWidth={3} />
        </g>
      ))}
    </g>
  ) },
  logs: { group: "static", Part: ({ o }) => (
    <g transform={`translate(${num(o.x, 960)} ${GROUND_Y + 40})`}>
      <rect x={-90} y={-30} width={180} height={34} rx={17} fill="#9d7e66" stroke={OUT} strokeWidth={4} transform="rotate(-14)" />
      <rect x={-90} y={-30} width={180} height={34} rx={17} fill="#b28c70" stroke={OUT} strokeWidth={4} transform="rotate(14)" />
      {[-160, 160].map((dx) => <circle key={dx} cx={dx} cy={0} r={22} fill="#bdbec3" stroke={OUT} strokeWidth={3} />)}
    </g>
  ) },
  campTent: { group: "static", Part: ({ o }) => (
    <g transform={`translate(${num(o.x, 1500)} ${GROUND_Y - 10})`}>
      <path d="M -220 0 L 0 -300 L 220 0 Z" fill={str(o.color, "#eda77a")} stroke={OUT} strokeWidth={5} strokeLinejoin="round" />
      <path d="M -70 0 L 0 -180 L 70 0 Z" fill="#665957" />
    </g>
  ) },
  house: { group: "static", Part: ({ o }) => (
    <g transform={`translate(${num(o.x, 400)} ${GROUND_Y - 10}) scale(${num(o.s, 1)})`}>
      <rect x={-150} y={-260} width={300} height={260} fill={str(o.color, "#fbefde")} stroke={OUT} strokeWidth={4} />
      <path d="M -180 -260 L 0 -400 L 180 -260 Z" fill={str(o.roof, "#d2756c")} stroke={OUT} strokeWidth={4} strokeLinejoin="round" />
      <rect x={-50} y={-130} width={100} height={130} rx={12} fill="#9d7e66" stroke={OUT} strokeWidth={4} />
      <rect x={-130} y={-220} width={60} height={60} fill="#a7d3ec" stroke={OUT} strokeWidth={3} />
      <rect x={70} y={-220} width={60} height={60} fill="#a7d3ec" stroke={OUT} strokeWidth={3} />
    </g>
  ) },

  /* ── front: animated things in front of the scenery ── */
  flowers: { group: "front", Part: ({ t, o }) => {
    const colors = list(o.colors, ["#eda77a", "#ea89ac", "#f5dc80", "#d1b7eb"]);
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
          <rect x={-6} y={-150} width={12} height={150} fill="#75a66d" />
          {Array.from({ length: 10 }).map((_, k) => (
            <ellipse key={k} cx={0} cy={-190} rx={10} ry={26} fill="#f4d780" stroke={OUT} strokeWidth={2} transform={`rotate(${k * 36} 0 -160)`} />
          ))}
          <circle cy={-160} r={20} fill="#91724f" stroke={OUT} strokeWidth={3} />
        </g>
      ))}
    </g>
  ) },
  butterflies: { group: "front", Part: ({ t, o }) => (
    <g>
      {list(o.colors, ["#f0acc1", "#b2d5ed", "#f4d780"]).map((color, i) => {
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
        return <circle key={i} cx={200 + rand(i + 70) * 1500 + Math.sin(t + i) * 20} cy={350 + rand(i + 80) * 400 + Math.cos(t * 0.8 + i) * 20} r={6} fill="#fbf3c3" opacity={tw} />;
      })}
    </g>
  ) },
  foam: { group: "front", Part: ({ t, o }) => (
    <path d={`M -100 ${num(o.top, GROUND_Y - 4)} Q 400 ${num(o.top, GROUND_Y - 4) - 50} 900 ${num(o.top, GROUND_Y - 4) - 10} T 2000 ${num(o.top, GROUND_Y - 4) - 20}`} stroke="#fff" strokeWidth={8} fill="none" opacity={0.8} transform={`translate(0 ${Math.sin(t * 1.5) * 6})`} />
  ) },
  lampGlow: { group: "front", Part: ({ t, o }) => <circle cx={num(o.x, 1700)} cy={num(o.y, GROUND_Y - 250)} r={90} fill="#faf0c1" opacity={0.25 + 0.06 * Math.sin(t * 3)} /> },
  rain: { group: "front", Part: ({ t, o }) => (
    <g stroke="#bbcfed" strokeWidth={4} strokeLinecap="round" opacity={0.7}>
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
        return <ellipse key={i} cx={x} cy={y} rx={14} ry={8} fill={["#eca663", "#d2756c", "#f4d780"][i % 3]} stroke={OUT} strokeWidth={2} transform={`rotate(${t * 120 + i * 40} ${x} ${y})`} />;
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
        <circle r={220} fill="#f1c282" opacity={0.15 + 0.05 * Math.sin(t * 10)} />
        <path d={`M -70 0 Q -80 ${-90 * f} 0 ${-150 * f} Q 80 ${-90 * f} 70 0 Z`} fill="#eca663" stroke={OUT} strokeWidth={4} strokeLinejoin="round" />
        <path d={`M -36 0 Q -40 ${-60 * g} 0 ${-95 * g} Q 40 ${-60 * g} 36 0 Z`} fill="#f4d780" />
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
      <ellipse cx={20} cy={10} rx={260} ry={72} fill="#5b938d" />
      {[-42, -12, 22, 52].map((angle, i) => <g key={angle} transform={`translate(${30 + i * 28} 0) rotate(${angle})`}>
        <path d="M 0 0 C -105 -85 -90 -196 -20 -245 C 50 -172 65 -77 0 0 Z" fill={["#639e97", "#76bba2", "#9fcf9b", "#78b094"][i]} />
        <path d="M 0 -12 Q -22 -110 -20 -216" fill="none" stroke="#cbe5b1" strokeWidth={5} opacity={0.55} />
      </g>)}
      <Flower x={174} base={-10} color="#e99aae" s={1.25} />
      <Flower x={76} base={-68} color="#f4d192" s={1.05} />
    </g>)}
  </g>;
};
