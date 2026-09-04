import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import type { Action, Emotion } from "../../lib/types";
import { rand } from "../../lib/random";
import { computePose, type Pose } from "./pose";
import { Face, OUTLINE } from "./Face";
import type { CharacterRecipe, FeatureSpec } from "./recipe";
import { toSpec } from "./recipe";
import { ACCESSORIES, EARS, FEATURES, MARKINGS, TAILS } from "./parts";
import { CHARACTER_RECIPES } from "../../generated/registry";

/** The rig lives in this viewBox; feet at y=250, head top around y=-32 (bunny ears) */
export const RIG_VB = { x: -20, y: -50, w: 240, h: 310 };

/** any recipe name from library/characters; unknown names fall back to the bunny */
export const getRecipe = (kind: string): CharacterRecipe => CHARACTER_RECIPES[kind] ?? CHARACTER_RECIPES.bunny;
export const characterEmoji = (kind: string): string => (kind === "none" ? "⭐" : getRecipe(kind).emoji);

export interface CharacterProps {
  kind: string;
  emotion?: Emotion;
  action?: Action;
  /** 0..1 how open the mouth is (speech), from the parent */
  mouth?: number;
  /** seconds since the current action started (defaults to the frame clock) */
  actionT?: number;
  bpm?: number;
  /** rendered width in px */
  width?: number;
  /** mirror horizontally (a friend facing the main character) */
  flip?: boolean;
  seed?: number;
  /** freeze animation (thumbnail) */
  still?: boolean;
  style?: React.CSSProperties;
}

const O = { stroke: OUTLINE, strokeWidth: 4, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

/** blinks every ~3.5 s, offset per seed so a crowd never blinks in sync */
function blinkAmount(frame: number, seed: number): number {
  const period = 95 + Math.round(rand(seed + 3) * 40);
  const t = (frame + Math.round(rand(seed) * period)) % period;
  if (t < 3) return t / 3;
  if (t < 6) return 1 - (t - 3) / 3;
  return 0;
}

const Limb: React.FC<{ x: number; y: number; angle: number; color: string; length?: number; width?: number; handScale?: number; wing?: boolean }> = ({ x, y, angle, color, length = 52, width = 24, handScale = 1, wing = false }) => (
  <g transform={`rotate(${angle} ${x} ${y})`}>
    {wing ? (
      <path d={`M ${x - 12} ${y - 4} Q ${x - 30} ${y + length * 0.6} ${x} ${y + length} Q ${x + 30} ${y + length * 0.6} ${x + 12} ${y - 4} Z`} fill={color} {...O} />
    ) : (
      <>
        <rect x={x - width / 2} y={y - 6} width={width} height={length} rx={width / 2} fill={color} {...O} />
        <circle cx={x} cy={y + length - 4} r={13 * handScale} fill={color} {...O} />
      </>
    )}
  </g>
);

const Leg: React.FC<{ x: number; lift: number; color: string; width?: number; foot?: "round" | "duck" | "none" }> = ({ x, lift, color, width = 26, foot = "round" }) =>
  foot === "none" ? null : (
    <g transform={`translate(0 ${lift})`}>
      {foot === "duck" ? (
        <>
          <rect x={x - 5} y={206} width={10} height={40} rx={5} fill={color} {...O} />
          <ellipse cx={x + 2} cy={246} rx={19} ry={7} fill={color} {...O} />
        </>
      ) : (
        <rect x={x - width / 2} y={204} width={width} height={46} rx={width / 2} fill={color} {...O} />
      )}
    </g>
  );

const ClapSpark: React.FC<{ amount: number; x: number; y: number }> = ({ amount, x, y }) =>
  amount <= 0 ? null : (
    <g opacity={amount}>
      {Array.from({ length: 6 }).map((_, i) => {
        const a = (i / 6) * Math.PI * 2;
        return <line key={i} x1={x + Math.cos(a) * 14} y1={y + Math.sin(a) * 14} x2={x + Math.cos(a) * (26 + amount * 10)} y2={y + Math.sin(a) * (26 + amount * 10)} stroke="#ffd23f" strokeWidth={5} strokeLinecap="round" />;
      })}
    </g>
  );

function partList<T extends string>(items: Array<T | FeatureSpec> | undefined): FeatureSpec[] {
  return (items ?? []).map((f) => toSpec(f));
}

export const Character: React.FC<CharacterProps> = ({ kind, emotion = "happy", action = "idle", mouth = 0, actionT, bpm = 120, width = 400, flip = false, seed = 0, still = false, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (kind === "none") return null;
  const recipe = getRecipe(kind);
  const c = recipe.colors;
  const t = still ? 0.35 : (actionT ?? frame / fps);
  const pose: Pose = computePose({ action, t, bpm, seed, legless: recipe.rig === "fish" });
  if (still) {
    pose.y = 0;
    pose.lean = 0;
    pose.flip = 1;
    pose.x = 0;
  }
  const blink = still ? 0 : blinkAmount(frame, seed);
  const height = (width * RIG_VB.h) / RIG_VB.w;
  const uid = `c${recipe.name}${seed}`;
  const showFace = pose.flip >= -0.05;
  const f = recipe.face ?? {};
  const features = partList(recipe.features);
  const markings = partList(recipe.markings);
  const accessories = partList(recipe.accessories);
  const pp = (o: FeatureSpec) => ({ c, pose, o });

  const renderFeatures = (layer: "headBack" | "headFront" | "back" | "body") =>
    features
      .filter((sp) => FEATURES[sp.kind]?.layer === layer)
      .map((sp, i) => {
        const P = FEATURES[sp.kind].Part;
        return <P key={`${sp.kind}${i}`} {...pp(sp)} />;
      });

  const Ears = EARS[recipe.ears ?? "none"] ?? EARS.none;
  const Tail = TAILS[recipe.tail ?? "none"] ?? TAILS.none;
  const earO = (recipe.earOptions ?? {}) as FeatureSpec;
  const tailO = (recipe.tailOptions ?? {}) as FeatureSpec;

  const face = showFace ? (
    <Face emotion={emotion} mouth={mouth} blink={blink} eyeMode={pose.eyes.mode} look={{ dx: pose.eyes.dx, dy: pose.eyes.dy }} skin={c.body} uid={uid} eyeY={f.eyeY} eyeGap={f.eyeGap} mouthY={f.mouthY} mouthDx={f.mouthDx} eyeSize={f.eyeSize} beak={f.beak} sockets={f.sockets} />
  ) : null;

  const headDecor = (
    <>
      {renderFeatures("headBack")}
      <Ears {...pp(earO)} />
    </>
  );
  const headFront = (
    <>
      {showFace ? renderFeatures("headFront") : null}
      {face}
      {showFace ? accessories.map((sp, i) => { const P = ACCESSORIES[sp.kind]; return P ? <P key={`${sp.kind}${i}`} {...pp(sp)} /> : null; }) : null}
    </>
  );
  const bodyMarkings = (
    <>
      {markings.map((sp, i) => { const P = MARKINGS[sp.kind]; return P ? <P key={`${sp.kind}${i}`} {...pp(sp)} /> : null; })}
      {renderFeatures("body")}
    </>
  );

  const body = (() => {
    if (recipe.rig === "fish") {
      return (
        <g>
          <g transform={`rotate(${pose.tail} 168 150)`}>
            <path d="M 166 150 L 212 112 Q 224 150 212 188 Z" fill={c.limb} {...O} />
          </g>
          <path d="M 70 100 Q 96 60 130 96 Z" fill={c.limb} {...O} />
          {renderFeatures("headBack")}
          <ellipse cx={100} cy={150} rx={82} ry={56} fill={c.body} {...O} />
          <ellipse cx={92} cy={172} rx={58} ry={26} fill={c.belly} opacity={0.9} />
          <g stroke={c.limb} strokeWidth={3} fill="none" opacity={0.7}>
            <path d="M 132 122 q 10 10 0 20" />
            <path d="M 148 132 q 10 10 0 20" />
            <path d="M 140 152 q 10 10 0 20" />
          </g>
          <g transform={`rotate(${-pose.armL * 0.4} 62 186)`}>
            <path d="M 62 180 Q 40 200 60 214 Q 76 200 62 180 Z" fill={c.limb} {...O} />
          </g>
          <g transform={`rotate(${pose.armR * 0.4} 138 186)`}>
            <path d="M 138 180 Q 160 200 140 214 Q 124 200 138 180 Z" fill={c.limb} {...O} />
          </g>
          {face}
        </g>
      );
    }
    if (recipe.rig === "star") {
      const pts: string[] = [];
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? 100 : 48;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        pts.push(`${100 + Math.cos(a) * r},${146 + Math.sin(a) * r}`);
      }
      return (
        <g>
          <Leg x={62} lift={pose.legL} color={c.limb} width={22} />
          <Leg x={138} lift={pose.legR} color={c.limb} width={22} />
          <polygon points={pts.join(" ")} fill={c.body} {...O} strokeWidth={5} />
          <polygon points={pts.join(" ")} fill="none" stroke={c.belly} strokeWidth={10} opacity={0.5} transform="translate(100 146) scale(0.8) translate(-100 -146)" />
          {face}
          <Limb x={14} y={118} angle={pose.armL - 20} color={c.limb} length={36} width={20} />
          <Limb x={186} y={118} angle={-(pose.armR - 20)} color={c.limb} length={36} width={20} handScale={pose.handScaleR} />
          <ClapSpark amount={pose.clapSpark} x={100} y={190} />
        </g>
      );
    }
    if (recipe.rig === "bird") {
      // egg-shaped body with the face on it (owl, penguin, chick, bee, snowman ...)
      const wing = recipe.arm !== "capsule";
      return (
        <g>
          {renderFeatures("back")}
          <Tail {...pp(tailO)} />
          <Leg x={80} lift={pose.legL} color={c.limb} width={recipe.legWidth ?? 22} foot={recipe.foot ?? "duck"} />
          <Leg x={120} lift={pose.legR} color={c.limb} width={recipe.legWidth ?? 22} foot={recipe.foot ?? "duck"} />
          <g transform={`translate(${pose.head.dx} ${pose.head.dy * 0.5}) rotate(${pose.head.tilt * 0.5} 100 200)`}>
            <g transform="translate(0 26)">{headDecor}</g>
            <ellipse cx={100} cy={150} rx={70} ry={92} fill={c.body} {...O} />
            <ellipse cx={100} cy={178} rx={44} ry={52} fill={c.belly} />
            {bodyMarkings}
            {headFront}
          </g>
          <Limb x={42} y={150} angle={pose.armL} color={wing ? c.body : c.limb} wing={wing} length={wing ? 58 : 44} width={18} />
          <Limb x={158} y={150} angle={-pose.armR} color={wing ? c.body : c.limb} wing={wing} length={wing ? 58 : 44} width={18} handScale={pose.handScaleR} />
          <ClapSpark amount={pose.clapSpark} x={100} y={214} />
        </g>
      );
    }
    // biped / shell / longNeck
    const neck = recipe.rig === "longNeck" ? 44 : 0;
    return (
      <g>
        {renderFeatures("back")}
        {recipe.rig === "shell" ? (
          <g>
            <ellipse cx={100} cy={182} rx={74} ry={64} fill={c.accent ?? c.dark ?? c.limb} {...O} strokeWidth={5} />
            <g fill="none" stroke={c.dark ?? OUTLINE} strokeWidth={3} opacity={0.6}>
              <path d="M 100 130 L 122 142 L 122 166 L 100 178 L 78 166 L 78 142 Z" />
              <path d="M 122 142 L 146 130 M 122 166 L 148 178 M 78 142 L 54 130 M 78 166 L 52 178 M 100 178 L 100 206" />
            </g>
          </g>
        ) : null}
        <Tail {...pp(tailO)} />
        <Leg x={78} lift={pose.legL} color={c.limb} width={recipe.legWidth ?? 26} foot={recipe.foot ?? "round"} />
        <Leg x={122} lift={pose.legR} color={c.limb} width={recipe.legWidth ?? 26} foot={recipe.foot ?? "round"} />
        <ellipse cx={100} cy={190} rx={54} ry={46} fill={c.body} {...O} />
        <ellipse cx={100} cy={198} rx={34} ry={30} fill={c.belly} />
        {bodyMarkings}
        {neck ? <rect x={84} y={108} width={32} height={70} rx={14} fill={c.body} {...O} /> : null}
        <g transform={`translate(${pose.head.dx} ${pose.head.dy - neck}) rotate(${pose.head.tilt} 100 ${150 + neck})`}>
          {headDecor}
          <circle cx={100} cy={98} r={64} fill={c.body} {...O} />
          {headFront}
        </g>
        <Limb x={52} y={168} angle={pose.armL} color={c.limb} wing={recipe.arm === "wing"} />
        <Limb x={148} y={168} angle={-pose.armR} color={c.limb} handScale={pose.handScaleR} wing={recipe.arm === "wing"} />
        <ClapSpark amount={pose.clapSpark} x={100} y={214} />
      </g>
    );
  })();

  const flipX = (flip ? -1 : 1) * pose.flip;
  return (
    <div style={{ width, height, ...style }}>
      <svg viewBox={`${RIG_VB.x} ${RIG_VB.y} ${RIG_VB.w} ${RIG_VB.h}`} width={width} height={height} style={{ overflow: "visible", filter: "drop-shadow(0 10px 8px rgba(0,0,0,0.18))" }}>
        <g transform={`translate(${100 + pose.x} 250) rotate(${pose.lean}) scale(${flipX * pose.sx} ${pose.sy}) translate(-100 -250) translate(0 ${pose.y})`}>{body}</g>
      </svg>
    </div>
  );
};

/** Place a character so its feet stand on `groundY`, centered at `centerX`. */
export const characterBox = (centerX: number, groundY: number, width: number) => {
  const scale = width / RIG_VB.w;
  return { left: centerX - (100 - RIG_VB.x) * scale, top: groundY - (250 - RIG_VB.y) * scale, width };
};
