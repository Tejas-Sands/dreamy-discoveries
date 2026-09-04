import React from "react";
import type { Pose } from "./pose";
import type { FeatureSpec, RecipeColors } from "./recipe";
import { OUTLINE } from "./Face";
import { rand } from "../../lib/random";

const O = { stroke: OUTLINE, strokeWidth: 4, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

export interface PartProps {
  c: RecipeColors;
  pose: Pose;
  o: Record<string, string | number | boolean | undefined>;
}
type Part = React.FC<PartProps>;
const num = (v: unknown, d: number) => (typeof v === "number" ? v : d);
const str = (v: unknown, d: string) => (typeof v === "string" ? v : d);

/* ───────────── ears (behind the head) ───────────── */
export const EARS: Record<string, Part> = {
  none: () => null,
  round: ({ c, o }) => {
    const r = num(o.r, 21), y = num(o.y, 48), x = num(o.x, 52);
    const color = str(o.color, c.body), inner = str(o.inner, c.inner ?? c.belly);
    return (
      <g>
        {[x, 200 - x].map((cx, i) => (
          <g key={i}>
            <circle cx={cx} cy={y} r={r} fill={color} {...O} />
            <circle cx={cx} cy={y} r={r * 0.52} fill={inner} />
          </g>
        ))}
      </g>
    );
  },
  pointy: ({ c, o }) => {
    const size = num(o.size, 1);
    return (
      <g>
        {[1, -1].map((s, i) => (
          <g key={i} transform={`translate(100 0) scale(${s * size} ${size}) translate(-100 0)`}>
            <path d="M 44 70 L 56 10 L 98 46 Z" fill={str(o.color, c.body)} {...O} />
            <path d="M 54 60 L 60 28 L 84 48 Z" fill={str(o.inner, c.inner ?? c.belly)} />
          </g>
        ))}
      </g>
    );
  },
  long: ({ c, pose }) => {
    const flop = -pose.head.tilt * 0.7;
    return (
      <g>
        {[-1, 1].map((s, i) => (
          <g key={i} transform={`rotate(${s * 9 + flop} ${100 + s * 26} 56)`}>
            <ellipse cx={100 + s * 26} cy={14} rx={17} ry={46} fill={c.body} {...O} />
            <ellipse cx={100 + s * 26} cy={18} rx={8} ry={32} fill={c.inner ?? c.belly} />
          </g>
        ))}
      </g>
    );
  },
  floppy: ({ c, o }) => (
    <g>
      {[-1, 1].map((s, i) => (
        <ellipse key={i} cx={100 + s * num(o.x, 68)} cy={num(o.y, 104)} rx={num(o.rx, 18)} ry={num(o.ry, 38)} fill={str(o.color, c.dark ?? c.limb)} transform={`rotate(${s * 22} ${100 + s * 60} 66)`} {...O} />
      ))}
    </g>
  ),
  big: ({ c }) => (
    <g>
      {[-1, 1].map((s, i) => (
        <g key={i}>
          <ellipse cx={100 + s * 62} cy={100} rx={36} ry={44} fill={c.body} {...O} />
          <ellipse cx={100 + s * 62} cy={102} rx={24} ry={32} fill={c.inner ?? c.belly} />
        </g>
      ))}
    </g>
  ),
  tuft: ({ c, o }) => (
    <g>
      {[-1, 1].map((s, i) => (
        <path key={i} d={`M ${100 + s * 30} 58 L ${100 + s * 58} ${num(o.y, 8)} L ${100 + s * 62} 60 Z`} fill={str(o.color, c.body)} {...O} />
      ))}
    </g>
  ),
};

/* ───────────── tails (behind the body, pivot near (148, 214)) ───────────── */
export const TAILS: Record<string, Part> = {
  none: () => null,
  pom: ({ c, o }) => <circle cx={150} cy={216} r={num(o.r, 14)} fill={str(o.color, c.body)} {...O} />,
  curved: ({ c, pose, o }) => {
    const width = num(o.width, 14);
    const color = str(o.color, c.body);
    const rings = typeof o.rings === "string" ? o.rings : null;
    return (
      <g transform={`rotate(${pose.tail * num(o.wag, 1)} 148 214)`}>
        <path d="M 148 214 C 185 210, 192 170, 174 150" fill="none" stroke={OUTLINE} strokeWidth={width + 7} strokeLinecap="round" />
        <path d="M 148 214 C 185 210, 192 170, 174 150" fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" />
        {rings ? [0.35, 0.65].map((t, i) => <circle key={i} cx={148 + 30 * t + 4} cy={214 - 60 * t} r={width * 0.55} fill={rings} />) : null}
        {typeof o.tuft === "string" ? <circle cx={174} cy={150} r={11} fill={o.tuft} {...O} /> : null}
      </g>
    );
  },
  bushy: ({ c, pose, o }) => {
    const big = num(o.big, 1);
    return (
      <g transform={`rotate(${pose.tail * 0.8} 146 210) scale(${big}) translate(${(1 - big) * 146} ${(1 - big) * 210})`}>
        <path d="M 146 210 C 200 205, 215 150, 180 118" fill="none" stroke={OUTLINE} strokeWidth={40} strokeLinecap="round" />
        <path d="M 146 210 C 200 205, 215 150, 180 118" fill="none" stroke={str(o.color, c.body)} strokeWidth={33} strokeLinecap="round" />
        <circle cx={180} cy={118} r={16} fill={str(o.tip, c.belly)} />
      </g>
    );
  },
  curly: ({ c, pose }) => (
    <g transform={`rotate(${pose.tail * 0.6} 150 208)`}>
      <path d="M 150 208 c 12 -14, 26 -4, 16 6 c -7 7, -17 2, -11 -6" fill="none" stroke={OUTLINE} strokeWidth={11} strokeLinecap="round" />
      <path d="M 150 208 c 12 -14, 26 -4, 16 6 c -7 7, -17 2, -11 -6" fill="none" stroke={c.body} strokeWidth={6} strokeLinecap="round" />
    </g>
  ),
  long: ({ c, pose, o }) => {
    const width = num(o.width, 10);
    return (
      <g transform={`rotate(${pose.tail * 0.8} 150 206)`}>
        <path d="M 150 206 C 205 202, 212 140, 178 128" fill="none" stroke={OUTLINE} strokeWidth={width + 6} strokeLinecap="round" />
        <path d="M 150 206 C 205 202, 212 140, 178 128" fill="none" stroke={str(o.color, c.body)} strokeWidth={width} strokeLinecap="round" />
      </g>
    );
  },
  thin: ({ c, pose, o }) => (
    <g transform={`rotate(${pose.tail * 0.9} 150 210)`}>
      <path d="M 150 210 C 195 215, 210 175, 196 140" fill="none" stroke={OUTLINE} strokeWidth={10} strokeLinecap="round" />
      <path d="M 150 210 C 195 215, 210 175, 196 140" fill="none" stroke={str(o.color, c.limb)} strokeWidth={5} strokeLinecap="round" />
      {typeof o.tuft === "string" ? <circle cx={196} cy={138} r={9} fill={o.tuft} {...O} /> : null}
    </g>
  ),
  stub: ({ c }) => (
    <g>
      <path d="M 152 212 L 174 236" stroke={OUTLINE} strokeWidth={10} strokeLinecap="round" />
      <path d="M 152 212 L 174 236" stroke={c.body} strokeWidth={6} strokeLinecap="round" />
      <circle cx={175} cy={238} r={7} fill={c.dark ?? c.limb} />
    </g>
  ),
  feathers: ({ c }) => <path d="M 148 205 L 182 190 L 176 214 Z" fill={c.body} {...O} />,
};

/* ───────────── features on the head ───────────── */
const Snout: React.FC<{ color: string; nose?: string; y?: number; rx?: number; ry?: number; nostrils?: boolean }> = ({ color, nose = "#3b2a2a", y = 120, rx = 22, ry = 15, nostrils = false }) => (
  <g>
    <ellipse cx={100} cy={y} rx={rx} ry={ry} fill={color} {...O} />
    {nostrils ? (
      <>
        <ellipse cx={92} cy={y - 2} rx={3.5} ry={4.5} fill={OUTLINE} />
        <ellipse cx={108} cy={y - 2} rx={3.5} ry={4.5} fill={OUTLINE} />
      </>
    ) : (
      <>
        <ellipse cx={100} cy={y - 8} rx={8} ry={6} fill={nose} />
        <ellipse cx={97} cy={y - 10} rx={2.5} ry={1.5} fill="#fff" opacity={0.7} />
      </>
    )}
  </g>
);

export const FEATURES: Record<string, { layer: "headBack" | "headFront" | "back" | "body"; Part: Part }> = {
  snout: { layer: "headFront", Part: ({ c, o }) => <Snout color={str(o.color, c.belly)} y={num(o.y, 120)} rx={num(o.rx, 22)} ry={num(o.ry, 15)} nostrils={!!o.nostrils} nose={str(o.nose, "#3b2a2a")} /> },
  pigSnout: { layer: "headFront", Part: ({ c, o }) => (
    <g>
      <ellipse cx={100} cy={118} rx={21} ry={14} fill={str(o.color, c.accent ?? c.inner ?? c.belly)} {...O} />
      <ellipse cx={93} cy={118} rx={3.5} ry={4.5} fill={str(o.dark, c.dark ?? OUTLINE)} />
      <ellipse cx={107} cy={118} rx={3.5} ry={4.5} fill={str(o.dark, c.dark ?? OUTLINE)} />
    </g>
  ) },
  hippoSnout: { layer: "headFront", Part: ({ c, o }) => (
    <g>
      <ellipse cx={100} cy={128} rx={46} ry={26} fill={str(o.color, c.belly)} {...O} />
      <ellipse cx={86} cy={120} rx={5} ry={6} fill={OUTLINE} />
      <ellipse cx={114} cy={120} rx={5} ry={6} fill={OUTLINE} />
    </g>
  ) },
  pinkNose: { layer: "headFront", Part: ({ o }) => <path d={`M 93 ${num(o.y, 110)} L 107 ${num(o.y, 110)} L 100 ${num(o.y, 110) + 9} Z`} fill={str(o.color, "#ff7f9e")} {...O} strokeWidth={2.5} /> },
  blackNose: { layer: "headFront", Part: ({ o }) => <ellipse cx={100} cy={num(o.y, 113)} rx={9} ry={7} fill={str(o.color, OUTLINE)} /> },
  koalaNose: { layer: "headFront", Part: () => <rect x={89} y={104} width={22} height={30} rx={11} fill={OUTLINE} /> },
  carrotNose: { layer: "headFront", Part: () => <path d="M 100 112 L 150 122 L 100 128 Z" fill="#ff8c1a" {...O} strokeWidth={3} /> },
  beakSmall: { layer: "headFront", Part: ({ o }) => <path d={`M 90 ${num(o.y, 118)} L 110 ${num(o.y, 118)} L 100 ${num(o.y, 118) + 16} Z`} fill={str(o.color, "#ff9f1a")} {...O} strokeWidth={3} /> },
  whiskers: { layer: "headFront", Part: ({ o }) => {
    const y = num(o.y, 116);
    return (
      <g stroke={OUTLINE} strokeWidth={2.5} strokeLinecap="round" opacity={0.8}>
        {[-1, 1].map((s) => (
          <g key={s}>
            <line x1={100 + s * 40} y1={y} x2={100 + s * 66} y2={y - 6} />
            <line x1={100 + s * 40} y1={y + 7} x2={100 + s * 66} y2={y + 11} />
          </g>
        ))}
      </g>
    );
  } },
  mask: { layer: "headFront", Part: ({ c, o }) => <ellipse cx={100} cy={num(o.y, 112)} rx={num(o.rx, 44)} ry={num(o.ry, 38)} fill={str(o.color, c.belly)} /> },
  eyePatches: { layer: "headFront", Part: ({ c, o }) => (
    <g>
      <ellipse cx={76} cy={94} rx={21} ry={25} fill={str(o.color, c.dark ?? OUTLINE)} transform="rotate(-15 76 94)" />
      <ellipse cx={124} cy={94} rx={21} ry={25} fill={str(o.color, c.dark ?? OUTLINE)} transform="rotate(15 124 94)" />
    </g>
  ) },
  nostrils: { layer: "headFront", Part: ({ o }) => (
    <g>
      <circle cx={100 - num(o.dx, 8)} cy={num(o.y, 112)} r={3} fill={OUTLINE} />
      <circle cx={100 + num(o.dx, 8)} cy={num(o.y, 112)} r={3} fill={OUTLINE} />
    </g>
  ) },
  headStripe: { layer: "headFront", Part: ({ c, o }) => <path d="M 84 50 q 8 -12 16 0 q 8 -12 16 0" fill="none" stroke={str(o.color, c.limb)} strokeWidth={5} strokeLinecap="round" /> },
  tigerStripes: { layer: "headFront", Part: ({ c, o }) => {
    const color = str(o.color, c.dark ?? OUTLINE);
    return (
      <g stroke={color} strokeWidth={6} strokeLinecap="round" fill="none">
        <path d="M 88 40 q 12 -8 24 0" />
        <path d="M 78 52 q 22 -10 44 0" />
        {[-1, 1].map((s) => (
          <g key={s}>
            <path d={`M ${100 + s * 56} 100 q ${s * -10} 6 ${s * -4} 14`} />
            <path d={`M ${100 + s * 60} 120 q ${s * -12} 6 ${s * -6} 14`} />
          </g>
        ))}
      </g>
    );
  } },
  mane: { layer: "headBack", Part: ({ c, o }) => {
    const color = str(o.color, c.accent ?? c.limb);
    return (
      <g>
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return <circle key={i} cx={100 + Math.cos(a) * 70} cy={98 + Math.sin(a) * 70} r={26} fill={color} {...O} />;
        })}
        <circle cx={100} cy={98} r={80} fill={color} />
      </g>
    );
  } },
  wool: { layer: "headBack", Part: ({ o }) => {
    const color = str(o.color, "#ffffff");
    return (
      <g>
        {Array.from({ length: 10 }).map((_, i) => {
          const a = -Math.PI * 0.95 + (i / 9) * Math.PI * 0.9;
          return <circle key={i} cx={100 + Math.cos(a) * 62} cy={92 + Math.sin(a) * 62} r={26} fill={color} {...O} />;
        })}
        <circle cx={100} cy={60} r={40} fill={color} />
      </g>
    );
  } },
  hair: { layer: "headFront", Part: ({ c, o }) => {
    const colors = typeof o.colors === "string" ? o.colors.split(",") : [str(o.color, c.accent ?? c.dark ?? c.limb)];
    return (
      <g>
        {[[80, 46, 15], [98, 38, 17], [116, 44, 15], [132, 56, 13], [66, 60, 12]].map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} fill={colors[i % colors.length]} {...O} />
        ))}
      </g>
    );
  } },
  horns: { layer: "headBack", Part: ({ c, o }) => (
    <g>
      {[-1, 1].map((s) => (
        <path key={s} d={`M ${100 + s * 40} 52 L ${100 + s * 46} ${num(o.y, 14)} L ${100 + s * 62} 46 Z`} fill={str(o.color, c.accent ?? "#e8d3a4")} {...O} />
      ))}
    </g>
  ) },
  hornUnicorn: { layer: "headBack", Part: ({ o }) => (
    <g>
      <path d="M 88 42 L 100 -22 L 112 42 Z" fill={str(o.color, "#ffd23f")} {...O} />
      <path d="M 91 28 L 108 24 M 94 12 L 105 9" stroke="#e0a800" strokeWidth={3} strokeLinecap="round" />
    </g>
  ) },
  antennae: { layer: "headBack", Part: ({ c, o }) => {
    const color = str(o.color, c.dark ?? OUTLINE);
    return (
      <g>
        {[-1, 1].map((s) => (
          <g key={s}>
            <path d={`M ${100 + s * 22} 42 Q ${100 + s * 40} 20 ${100 + s * 44} 2`} stroke={color} strokeWidth={5} fill="none" strokeLinecap="round" />
            <circle cx={100 + s * 44} cy={2} r={7} fill={color} />
          </g>
        ))}
      </g>
    );
  } },
  spikes: { layer: "headBack", Part: ({ c, o }) => {
    const color = str(o.color, c.accent ?? c.limb);
    const dense = num(o.dense, 0);
    const pts = dense ? [[52, 60], [64, 44], [78, 36], [92, 30], [106, 30], [120, 36], [134, 44], [146, 60]] : [[78, 42], [100, 34], [122, 42]];
    return (
      <g>
        {pts.map(([x, y], i) => (
          <path key={i} d={`M ${x - 12} ${y + 18} L ${x} ${y - 20} L ${x + 12} ${y + 18} Z`} fill={color} {...O} />
        ))}
      </g>
    );
  } },
  trunk: { layer: "headFront", Part: ({ c }) => (
    <g>
      <path d="M 100 124 C 102 150, 132 148, 134 176" fill="none" stroke={OUTLINE} strokeWidth={24} strokeLinecap="round" />
      <path d="M 100 124 C 102 150, 132 148, 134 176" fill="none" stroke={c.body} strokeWidth={17} strokeLinecap="round" />
      <path d="M 106 138 C 110 150, 126 154, 128 166" fill="none" stroke={c.belly} strokeWidth={4} strokeLinecap="round" opacity={0.8} />
    </g>
  ) },
  tuftTop: { layer: "headFront", Part: ({ c, o }) => {
    const color = str(o.color, c.body);
    return (
      <g>
        {[-10, 0, 10].map((dx, i) => (
          <path key={`o${i}`} d={`M ${100 + dx} 40 q ${dx * 0.6} -16 ${dx * 1.4 - 2} -22`} fill="none" stroke={OUTLINE} strokeWidth={7} strokeLinecap="round" />
        ))}
        {[-10, 0, 10].map((dx, i) => (
          <path key={i} d={`M ${100 + dx} 40 q ${dx * 0.6} -16 ${dx * 1.4 - 2} -22`} fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" />
        ))}
      </g>
    );
  } },
  headCap: { layer: "headFront", Part: ({ c, o }) => <path d="M 38 90 A 64 64 0 0 1 162 90 Z" fill={str(o.color, c.dark ?? OUTLINE)} /> },
  wingsBack: { layer: "back", Part: ({ c, o, pose }) => {
    const color = str(o.color, "#dff6ff");
    const flap = Math.abs(Math.sin(pose.armL / 20));
    return (
      <g opacity={0.9}>
        <ellipse cx={52} cy={160} rx={22 + flap * 6} ry={44} fill={color} {...O} transform="rotate(25 52 160)" />
        <ellipse cx={148} cy={160} rx={22 + flap * 6} ry={44} fill={color} {...O} transform="rotate(-25 148 160)" />
      </g>
    );
  } },
  spout: { layer: "headBack", Part: ({ pose }) => (
    <g transform={`translate(0 ${Math.sin(pose.tail / 6) * 3})`}>
      {[-1, 0, 1].map((s) => (
        <path key={s} d={`M 100 88 Q ${100 + s * 26} 60 ${100 + s * 34} 40`} stroke="#7fd0ff" strokeWidth={7} fill="none" strokeLinecap="round" />
      ))}
      {[-1, 0, 1].map((s) => (
        <circle key={s} cx={100 + s * 36} cy={34} r={7} fill="#7fd0ff" />
      ))}
    </g>
  ) },
  buttons: { layer: "body", Part: ({ c }) => (
    <g>
      {[172, 196, 220].map((y) => <circle key={y} cx={100} cy={y} r={6} fill={c.dark ?? OUTLINE} />)}
    </g>
  ) },
};

/* ───────────── markings on the body ───────────── */
export const MARKINGS: Record<string, Part> = {
  spots: ({ c, o }) => {
    const color = str(o.color, c.accent ?? c.dark ?? c.limb);
    const seed = num(o.seed, 1);
    return (
      <g opacity={0.85}>
        {Array.from({ length: num(o.count, 5) }).map((_, i) => {
          const a = rand(seed + i) * Math.PI * 2;
          const d = 0.35 + rand(seed + i + 10) * 0.5;
          return <circle key={i} cx={100 + Math.cos(a) * 50 * d} cy={190 + Math.sin(a) * 42 * d} r={7 + rand(seed + i + 20) * 7} fill={color} />;
        })}
      </g>
    );
  },
  stripes: ({ c, o }) => {
    const color = str(o.color, c.dark ?? OUTLINE);
    return (
      <g stroke={color} strokeWidth={num(o.width, 9)} strokeLinecap="round" fill="none" opacity={0.9}>
        <path d="M 60 165 Q 100 178 140 165" />
        <path d="M 52 190 Q 100 204 148 190" />
        <path d="M 60 215 Q 100 226 140 215" />
      </g>
    );
  },
};

/* ───────────── accessories (over everything) ───────────── */
export const ACCESSORIES: Record<string, Part> = {
  bow: ({ o }) => {
    const color = str(o.color, "#ff5d9e");
    return (
      <g transform={`translate(${num(o.x, 142)} ${num(o.y, 46)})`}>
        <path d="M 0 0 L -30 -18 L -30 18 Z" fill={color} {...O} />
        <path d="M 0 0 L 30 -18 L 30 18 Z" fill={color} {...O} />
        <circle r={9} fill={color} {...O} />
      </g>
    );
  },
  partyHat: ({ o }) => (
    <g>
      <path d="M 66 44 L 100 -30 L 134 44 Z" fill={str(o.color, "#5db9ff")} {...O} />
      <path d="M 76 22 L 124 22" stroke="#fff" strokeWidth={6} opacity={0.7} />
      <circle cx={100} cy={-30} r={10} fill="#ffd23f" {...O} />
    </g>
  ),
  topHat: ({ o }) => (
    <g>
      <rect x={52} y={30} width={96} height={14} rx={6} fill={str(o.color, "#2f2438")} {...O} />
      <rect x={66} y={-30} width={68} height={64} rx={6} fill={str(o.color, "#2f2438")} {...O} />
      <rect x={66} y={14} width={68} height={12} fill={str(o.band, "#ff5d5d")} />
    </g>
  ),
  glasses: ({ o }) => (
    <g stroke={str(o.color, OUTLINE)} strokeWidth={5} fill="none">
      <circle cx={76} cy={92} r={21} />
      <circle cx={124} cy={92} r={21} />
      <path d="M 97 92 L 103 92" />
    </g>
  ),
  scarf: ({ o }) => (
    <g>
      <path d="M 52 150 Q 100 172 148 150 L 148 164 Q 100 186 52 164 Z" fill={str(o.color, "#ff5d5d")} {...O} />
      <path d="M 120 166 L 128 200 L 146 194 L 134 162 Z" fill={str(o.color, "#ff5d5d")} {...O} />
    </g>
  ),
  crown: () => (
    <g>
      <path d="M 66 46 L 70 14 L 84 34 L 100 6 L 116 34 L 130 14 L 134 46 Z" fill="#ffd23f" {...O} />
      <circle cx={100} cy={20} r={5} fill="#ff5d5d" />
    </g>
  ),
};
