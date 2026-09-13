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
        <ellipse key={i} cx={100 + s * num(o.x, 68)} cy={num(o.y, 104)} rx={num(o.rx, 18)} ry={num(o.ry, 38)} fill={str(o.color, c.dark ?? c.limb)} transform={`rotate(${s * -18} ${100 + s * num(o.x, 68)} ${num(o.y, 104)})`} {...O} />
      ))}
    </g>
  ),
  big: ({ c, o }) => (
    <g>
      {[-1, 1].map((s, i) => (
        <g key={i}>
          <ellipse cx={100 + s * num(o.x, 62)} cy={num(o.y, 100)} rx={num(o.rx, 36)} ry={num(o.ry, 44)} fill={c.body} {...O} />
          <ellipse cx={100 + s * num(o.x, 62)} cy={num(o.y, 100) + 2} rx={num(o.rx, 36) * .67} ry={num(o.ry, 44) * .72} fill={str(o.inner, c.inner ?? c.belly)} />
        </g>
      ))}
    </g>
  ),
  tuft: ({ c, o }) => (
    <g>
      {[-1, 1].map((s, i) => (
        <path key={i} d={`M ${100 + s * 24} 57 Q ${100 + s * 47} 40 ${100 + s * 64} ${num(o.y, 18)} Q ${100 + s * 68} 42 ${100 + s * 52} 62 Z`} fill={str(o.color, c.body)} {...O} strokeWidth={3} />
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
  /** a pale cartoon muzzle under the eyes with no nose — pair with a nose feature (bunny) */
  muzzle: { layer: "headFront", Part: ({ o }) => (
    <ellipse cx={100} cy={num(o.y, 120)} rx={num(o.rx, 26)} ry={num(o.ry, 20)} fill={str(o.color, "#ffffff")} opacity={0.5} />
  ) },
  /** bunny buck teeth peeking under the nose */
  buckTeeth: { layer: "headFront", Part: ({ o }) => (
    <g>
      <rect x={91} y={num(o.y, 112)} width={8} height={11} rx={2.5} fill="#ffffff" stroke={OUTLINE} strokeWidth={2} />
      <rect x={100} y={num(o.y, 112)} width={8} height={11} rx={2.5} fill="#fff6ea" stroke={OUTLINE} strokeWidth={2} />
    </g>
  ) },
  pigSnout: { layer: "headFront", Part: ({ c, o }) => (
    <g>
      <ellipse cx={100} cy={num(o.y,118)} rx={num(o.rx,21)} ry={num(o.ry,14)} fill={str(o.color, c.accent ?? c.inner ?? c.belly)} {...O} />
      <ellipse cx={100-num(o.rx,21)*.35} cy={num(o.y,118)} rx={3.5} ry={4.5} fill={str(o.dark, c.dark ?? OUTLINE)} />
      <ellipse cx={100+num(o.rx,21)*.35} cy={num(o.y,118)} rx={3.5} ry={4.5} fill={str(o.dark, c.dark ?? OUTLINE)} />
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
    const points = Array.from({length: 40}, (_,i) => {
      const a = i * Math.PI / 20;
      const radius = i % 2 ? 80 : 90;
      return `${100 + Math.cos(a)*radius},${99 + Math.sin(a)*radius}`;
    }).join(" ");
    return (
      <g>
        <polygon points={points} fill={color} {...O} />
        <path d="M 45 63 Q 29 89 42 122 M 155 63 Q 171 89 158 122 M 70 163 L 77 174 M 125 165 L 122 175" fill="none" stroke="#e2a45b" strokeWidth={3}/>
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
        <path key={s} d={`M ${100 + s * 32} 52 Q ${100 + s * 56} 47 ${100 + s * 47} ${num(o.y, 17)} Q ${100 + s * 37} 26 ${100 + s * 39} 40 Z`} fill={str(o.color, c.accent ?? "#e8d3a4")} {...O} />
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
      <path d="M 89 112 C 89 137 107 162 120 157 Q 135 147 131 135 Q 144 128 145 145 C 143 183 110 185 97 162 Q 79 139 81 120 Z" fill={c.body} {...O} />
      <path d="M 86 128 L 97 126 M 91 142 L 103 137 M 99 156 L 110 149 M 113 168 L 118 159" fill="none" stroke="#69758e" strokeWidth={2}/>
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
      <g opacity={0.85}>
        <ellipse cx={46} cy={158} rx={28 + flap * 8} ry={54} fill={color} {...O} strokeWidth={3} transform="rotate(28 46 158)" />
        <ellipse cx={154} cy={158} rx={28 + flap * 8} ry={54} fill={color} {...O} strokeWidth={3} transform="rotate(-28 154 158)" />
      </g>
    );
  } },
  beeBands: { layer: "body", Part: ({ c, o }) => {
    const color = str(o.color, c.dark ?? "#333333");
    return (
      <g>
        {[168, 196, 224].map((y, i) => (
          <g key={i}>
            <ellipse cx={100} cy={y} rx={56} ry={14} fill={OUTLINE} opacity={0.9} />
            <ellipse cx={100} cy={y} rx={52} ry={10} fill={color} />
          </g>
        ))}
      </g>
    );
  } },
  leaf: { layer: "headFront", Part: ({ o }) => {
    const color = str(o.color, "#5a8a4f");
    return (
      <g transform="translate(100 44) rotate(-15)">
        <ellipse cx={0} cy={0} rx={10} ry={18} fill={color} {...O} strokeWidth={3} />
        <path d="M 0 -16 L 0 14" stroke={OUTLINE} strokeWidth={2} fill="none" />
      </g>
    );
  } },
  bamboo: { layer: "body", Part: ({ o }) => {
    const color = str(o.color, "#669c54");
    return (
      <g transform="translate(146 168) rotate(12)">
        <rect x={-6} y={-46} width={12} height={92} rx={6} fill={color} {...O} strokeWidth={3} />
        <path d="M -6 -20 L 6 -24 M -6 6 L 6 2 M -6 32 L 6 28" stroke={OUTLINE} strokeWidth={2} fill="none" opacity={0.6} />
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
  scarf: ({ o }) => {
    const color = str(o.color, "#ff5d5d");
    return (
      <g>
        {/* wrap around neck */}
        <path d="M 50 150 Q 100 174 150 150 L 150 166 Q 100 190 50 166 Z" fill={color} {...O} strokeWidth={3.5} />
        {/* two hanging ends */}
        <path d="M 58 168 L 54 206 Q 52 214 62 212 L 76 206 L 74 168 Z" fill={color} {...O} strokeWidth={3.5} />
        <path d="M 86 172 L 82 198 Q 80 206 90 204 L 104 198 L 102 172 Z" fill={color} {...O} strokeWidth={3.5} />
        <g fill="none" stroke={str(o.dark, "#526448")} strokeWidth={5} opacity={0.7}>
          <path d="M 62 156 L 62 168 M 80 160 L 80 174 M 100 162 L 100 177 M 120 160 L 120 174 M 140 156 L 140 168" />
          <path d="M 57 184 L 75 184 M 55 199 L 76 199 M 85 185 L 103 185" />
        </g>
        <path d="M 54 162 Q 100 184 148 162 M 64 173 L 61 207 M 94 178 L 90 201" fill="none" stroke="#e3bd80" strokeWidth={1.5} opacity={0.7} />
      </g>
    );
  },
  crown: () => (
    <g>
      <path d="M 66 46 L 70 14 L 84 34 L 100 6 L 116 34 L 130 14 L 134 46 Z" fill="#ffd23f" {...O} />
      <circle cx={100} cy={20} r={5} fill="#ff5d5d" />
    </g>
  ),
  bandana: ({ o }) => {
    const color = str(o.color, "#e23b3b");
    return (
      <g>
        <path d="M 129 155 Q 152 141 162 151 L 145 163 L 161 173 Q 143 177 131 164 Z" fill={color} {...O} strokeWidth={2}/>
        <path d="M 62 151 Q 100 169 138 151 Q 122 177 100 193 Q 78 177 62 151 Z" fill={color} {...O} strokeWidth={2.5}/>
        <path d="M 71 160 Q 100 176 129 160 L 100 183 Z" fill="none" stroke="#f4e8c3" strokeWidth={1.5} strokeDasharray="2 4"/>
        <circle cx={134} cy={159} r={5} fill={color} {...O} strokeWidth={2}/>
      </g>
    );
  },
  beanie: ({ o }) => {
    const color = str(o.color, "#e23b3b"), band = str(o.band, "#ffffff");
    return (
      <g>
        <path d="M 62 46 Q 64 4 100 4 Q 136 4 138 46 Z" fill={color} {...O} />
        <path d="M 77 39 Q 77 18 87 10 M 92 39 L 95 8 M 108 39 L 105 8 M 123 39 Q 123 18 113 10" fill="none" stroke={band} strokeWidth={2} />
        <rect x={58} y={36} width={84} height={16} rx={6} fill={band} {...O} strokeWidth={3} />
        <circle cx={100} cy={-3} r={9} fill={color} {...O} strokeWidth={3} />
      </g>
    );
  },
  collar: ({ o }) => {
    const color = str(o.color, "#4a2c16"), bell = str(o.ring, "#f5d76e");
    return (
      <g>
        <path d="M 66 146 Q 100 164 134 146 Q 136 156 100 172 Q 64 156 66 146 Z" fill={color} {...O} />
        <circle cx={100} cy={158} r={9} fill={bell} {...O} strokeWidth={3} />
        <circle cx={100} cy={158} r={3} fill="#7a4a12" />
      </g>
    );
  },
  vest: ({ o }) => {
    const color = str(o.color, "#5c8bb5");
    return (
      <g>
        <path d="M 64 151 L 84 157 L 100 182 L 116 157 L 136 151 L 143 210 L 114 220 L 100 211 L 86 220 L 57 210 Z" fill={color} {...O} strokeWidth={3} />
        <path d="M 84 158 L 100 182 L 116 158 M 100 182 L 100 211" fill="none" {...O} strokeWidth={2} />
        <path d="M 69 166 L 65 204 M 77 173 L 73 212 M 85 184 L 82 214 M 131 166 L 135 204 M 123 173 L 127 212 M 115 184 L 118 214" stroke="#ffffff" strokeWidth={1.5} opacity={0.35} />
        <path d="M 65 197 L 84 200 M 116 200 L 135 197" fill="none" {...O} strokeWidth={2} />
        {[189, 201].map((y) => <circle key={y} cx={103} cy={y} r={2.5} fill="#f6e3ba" stroke={OUTLINE} strokeWidth={1} />)}
      </g>
    );
  },
  necklace: ({ o }) => {
    const color = str(o.color, "#e8b931");
    return (
      <g>
        {Array.from({ length: 9 }).map((_, i) => {
          const a = Math.PI * (i / 8);
          const x = 100 + Math.cos(a) * 34;
          const y = 154 + 15 * Math.sin(a);
          return <circle key={i} cx={x} cy={y} r={4.2} fill={color} {...O} strokeWidth={2.5} />;
        })}
      </g>
    );
  },
  earmuffs: ({ o }) => {
    const color = str(o.color, "#764fa3");
    return (
      <g>
        <path d="M 56 84 Q 100 60 144 84" stroke={color} strokeWidth={9} fill="none" strokeLinecap="round" />
        <circle cx={50} cy={94} r={17} fill={color} {...O} />
        <circle cx={150} cy={94} r={17} fill={color} {...O} />
        <circle cx={50} cy={94} r={7} fill="#fff" opacity={0.5} />
        <circle cx={150} cy={94} r={7} fill="#fff" opacity={0.5} />
      </g>
    );
  },
  headdress: ({ o }) => {
    const color = str(o.color, "#e8b931"), band = str(o.band, "#c43b50");
    return (
      <g>
        <path d="M 50 62 Q 100 12 150 62 L 139 70 Q 100 33 61 70 Z" fill={band} {...O}/>
        <path d="M 56 64 Q 100 24 144 64" fill="none" stroke={color} strokeWidth={4}/>
        <path d="M 100 44 L 109 61 L 100 77 L 91 61 Z" fill={color} {...O} strokeWidth={2}/>
      </g>
    );
  },
  sailorCollar: ({ o }) => {
    const color = str(o.color, "#326ba8");
    return (
      <g>
        <path d="M 52 148 Q 100 172 148 148 L 152 162 Q 100 188 48 162 Z" fill={color} {...O} strokeWidth={3.5} />
        <path d="M 48 162 L 60 180 L 76 164" fill="none" stroke="#ffffff" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        <path d="M 152 162 L 140 180 L 124 164" fill="none" stroke="#ffffff" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
      </g>
    );
  },
  headphones: ({ o }) => {
    const color = str(o.color, "#764fa3"), pad = str(o.pad, "#4a2c6e");
    return (
      <g>
        <path d="M 48 86 Q 100 48 152 86" stroke={color} strokeWidth={8} fill="none" strokeLinecap="round" />
        <rect x={42} y={82} width={22} height={32} rx={10} fill={pad} {...O} strokeWidth={3} />
        <rect x={136} y={82} width={22} height={32} rx={10} fill={pad} {...O} strokeWidth={3} />
        <circle cx={53} cy={98} r={5} fill="#fff" opacity={0.5} />
        <circle cx={147} cy={98} r={5} fill="#fff" opacity={0.5} />
      </g>
    );
  },
  saddle: ({ o }) => {
    const color = str(o.color, "#388c6f"), trim = str(o.trim, "#f5d76e");
    return (
      <g>
        <path d="M 58 152 Q 100 170 142 152 L 146 200 Q 100 220 54 200 Z" fill={color} {...O} strokeWidth={4} />
        <path d="M 58 152 Q 100 170 142 152" stroke={trim} strokeWidth={5} fill="none" strokeLinecap="round" />
        <rect x={92} y={156} width={16} height={40} rx={4} fill={trim} {...O} strokeWidth={2.5} />
      </g>
    );
  },
  stripedBeanie: ({ o }) => {
    const color = str(o.color, "#58a69a"), stripe = str(o.stripe, "#ffffff");
    return (
      <g>
        <path d="M 52 61 Q 52 18 100 18 Q 148 18 148 61 Z" fill={color} {...O} />
        <path d="M 61 40 Q 100 22 139 40 M 55 51 Q 100 35 145 51" fill="none" stroke={stripe} strokeWidth={5}/>
        <rect x={50} y={54} width={100} height={12} rx={6} fill={stripe} {...O} strokeWidth={3} />
        <circle cx={100} cy={30} r={10} fill="#fff" {...O} strokeWidth={3} />
      </g>
    );
  },
};
