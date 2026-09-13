import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import type { Action, Emotion } from "../../lib/types";
import { rand } from "../../lib/random";
import { computePose, type Pose } from "./pose";
import { Face, OUTLINE } from "./Face";
import type { CharacterRecipe, FeatureSpec, RecipeColors } from "./recipe";
import { toSpec } from "./recipe";
import { ACCESSORIES, EARS, FEATURES, MARKINGS, TAILS } from "./parts";
import { SpeciesBody, SPECIES_RIGS } from "./SpeciesBody";
import { MammalDetails } from "./MammalDetails";
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
  /** upbeat scene: bob on the beat even while idle / talking */
  groove?: boolean;
  /** draw the soft contact shadow under the feet (off for characters that fly in from the side) */
  shadow?: boolean;
  style?: React.CSSProperties;
}

const O = { stroke: OUTLINE, strokeWidth: 4, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

// Clothing follows the torso; hats and glasses follow the head.
const BODY_ACCESSORIES = new Set(["scarf", "bandana", "collar", "vest", "necklace", "sailorCollar", "saddle"]);
const HEAD_SHAPES: Record<string, string> = {
  bunny: "M 100 46 C 130 46 148 64 150 88 C 151 99 164 105 161 121 C 158 143 131 155 100 155 C 69 155 42 143 39 121 C 36 105 49 99 50 88 C 52 64 70 46 100 46 Z",
  bear: "M 100 46 C 136 46 154 61 157 87 C 160 103 167 111 159 128 C 149 148 126 155 100 155 C 74 155 51 148 41 128 C 33 111 40 103 43 87 C 46 61 64 46 100 46 Z",
  fox: "M 100 44 C 127 44 147 65 151 89 Q 154 103 166 110 Q 160 114 156 114 Q 159 119 160 123 C 143 128 127 150 100 155 C 73 150 57 128 40 123 Q 41 119 44 114 Q 40 114 34 110 Q 46 103 49 89 C 53 65 73 44 100 44 Z",
  turtle: "M 100 55 C 133 55 150 70 151 93 C 152 103 162 110 160 122 C 157 144 131 153 100 153 C 69 153 43 144 40 122 C 38 110 48 103 49 93 C 50 70 67 55 100 55 Z",
  cat: "M 100 43 Q 137 40 151 76 L 158 112 Q 151 145 100 156 Q 49 145 42 112 L 49 76 Q 63 40 100 43 Z",
  dog: "M 100 44 C 135 44 149 66 150 96 Q 164 139 128 151 Q 100 163 72 151 Q 36 139 50 96 C 51 66 65 44 100 44 Z",
  elephant: "M 100 38 Q 158 37 158 92 L 148 127 Q 135 152 100 150 Q 65 152 52 127 L 42 92 Q 42 37 100 38 Z",
  cow: "M 100 38 Q 139 38 145 75 L 155 114 Q 163 157 100 159 Q 37 157 45 114 L 55 75 Q 61 38 100 38 Z",
  pig: "M 100 46 C 140 44 163 69 162 106 C 166 145 134 158 100 158 C 66 158 34 145 38 106 C 37 69 60 44 100 46 Z",
  hippo: "M 100 46 Q 150 45 152 90 L 160 117 Q 174 158 100 161 Q 26 158 40 117 L 48 90 Q 50 45 100 46 Z",
  panda: "M 100 43 C 142 43 160 67 160 104 Q 164 153 100 158 Q 36 153 40 104 C 40 67 58 43 100 43 Z",
  koala: "M 100 49 Q 145 48 152 81 L 153 119 Q 143 156 100 156 Q 57 156 47 119 L 48 81 Q 55 48 100 49 Z",
  mouse: "M 100 55 C 134 53 149 75 146 104 Q 144 131 100 154 Q 56 131 54 104 C 51 75 66 53 100 55 Z",
  monkey: "M 100 44 Q 133 41 153 74 Q 160 95 145 124 Q 142 154 100 158 Q 58 154 55 124 Q 40 95 47 74 Q 67 41 100 44 Z",
  raccoon: "M 100 47 Q 133 48 151 78 L 166 103 L 155 114 L 159 123 Q 129 140 100 155 Q 71 140 41 123 L 45 114 L 34 103 L 49 78 Q 67 48 100 47 Z",
  hedgehog: "M 100 69 Q 128 68 140 95 Q 144 115 129 129 L 108 146 Q 100 153 92 146 L 71 129 Q 56 115 60 95 Q 72 68 100 69 Z",
  sheep: "M 100 55 Q 139 53 142 88 L 137 121 Q 133 149 100 155 Q 67 149 63 121 L 58 88 Q 61 53 100 55 Z",
  squirrel: "M 100 53 Q 136 51 145 80 L 149 104 Q 164 128 130 144 L 100 155 L 70 144 Q 36 128 51 104 L 55 80 Q 64 51 100 53 Z",
  lion: "M 100 40 C 140 40 158 62 157 96 Q 162 149 100 158 Q 38 149 43 96 C 42 62 60 40 100 40 Z",
  tiger: "M 100 43 Q 143 42 155 77 L 159 112 Q 151 154 100 157 Q 49 154 41 112 L 45 77 Q 57 42 100 43 Z",
};

/** blinks every ~3.5 s, offset per seed so a crowd never blinks in sync */
function blinkAmount(frame: number, seed: number): number {
  const period = 95 + Math.round(rand(seed + 3) * 40);
  const t = (frame + Math.round(rand(seed) * period)) % period;
  if (t < 3) return t / 3;
  if (t < 6) return 1 - (t - 3) / 3;
  return 0;
}

/**
 * A tapered forearm flowing into a rounded paw. Mirror the local drawing so
 * both thumbs face inward; rotate the whole limb around the shoulder.
 */
const Arm: React.FC<{ x: number; y: number; angle: number; color: string; length?: number; width?: number; handScale?: number; wing?: boolean; bend?: number; point?: boolean }> = ({ x, y, angle, color, length = 48, width = 22, handScale = 1, wing = false, bend = 0.3, point = false }) => {
  if (wing) {
    return (
      <g transform={`rotate(${angle} ${x} ${y})`}>
        <g transform={`translate(${x} ${y}) scale(${x > 100 ? -1 : 1} 1)`}>
          <path d={`M -10 0 C -25 14 -24 ${length * 0.7} -12 ${length} Q -8 ${length + 5} -5 ${length - 4} Q 0 ${length + 4} 3 ${length - 7} Q 10 ${length - 2} 10 ${length - 15} C 21 17 12 -12 -1 -9 Q -7 -8 -10 0 Z`} fill={color} {...O} strokeWidth={3} />
          <path d={`M -10 ${length * 0.48} Q -12 ${length * 0.7} -5 ${length - 9} M 0 ${length * 0.52} Q -1 ${length * 0.7} 3 ${length - 13}`} fill="none" stroke={OUTLINE} strokeWidth={1.5} opacity={0.55} />
        </g>
      </g>
    );
  }
  // a gently curved arm reads cuter than a perfectly straight stick
  const curve = bend * 10;
  const r = width / 2;
  const paw = r * handScale;
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${x > 100 ? -1 : 1} 1)`}>
      <path d={`M ${-r} 2
        C ${-r} ${-r * 1.2} ${r} ${-r * 1.2} ${r} 2
        C ${r + curve} ${length * 0.35} ${r * 0.55} ${length * 0.6} ${paw * 0.55} ${length - 13}
        C ${paw * 0.6} ${length - 9} ${paw * 1.2} ${length - 8} ${paw * 1.25} ${length - 4}
        C ${paw * 1.35} ${length + 0.5} ${paw * 0.95} ${length + 3} ${paw * 0.65} ${length}
        C ${paw * 0.75} ${length + 12} ${-paw} ${length + 12} ${-paw} ${length}
        C ${-paw - 2} ${length - 8} ${-r + curve} ${length * 0.4} ${-r} 2 Z`} fill={color} {...O} strokeWidth={3} />
      <path d={`M ${paw * 0.6} ${length - 5} Q ${paw * 0.35} ${length - 2} ${paw * 0.45} ${length + 1} M ${-paw * 0.45} ${length + 2} l 0 4 M 0 ${length + 3} l 0 4`} fill="none" stroke={OUTLINE} strokeWidth={1.5} strokeLinecap="round" opacity={0.7} />
      {point ? <path d={`M ${-paw * 0.45} ${length + 3} v 10 q 3 5 6 0 v -10`} fill={color} stroke={OUTLINE} strokeWidth={2} strokeLinejoin="round" /> : null}
    </g>
  );
};

const Leg: React.FC<{ x: number; lift: number; swing: number; color: string; width?: number; foot?: "round" | "duck" | "hoof" | "none" }> = ({ x, lift, swing, color, width = 24, foot = "round" }) =>
  foot === "none" ? null : (
    <g transform={`translate(0 ${lift}) rotate(${swing} ${x} 208)`}>
      {foot === "duck" ? (
        <>
          <line x1={x} y1={208} x2={x} y2={242} stroke={color} strokeWidth={width + 4} strokeLinecap="round" />
          <line x1={x} y1={208} x2={x} y2={242} stroke={color} strokeWidth={width} strokeLinecap="round" />
          <ellipse cx={x + 2} cy={246} rx={18} ry={7} fill={color} {...O} strokeWidth={3} />
        </>
      ) : (
        <>
          <line x1={x} y1={208} x2={x} y2={248} stroke={OUTLINE} strokeWidth={width + 4} strokeLinecap="round" />
          <line x1={x} y1={208} x2={x} y2={248} stroke={color} strokeWidth={width} strokeLinecap="round" />
          {foot === "hoof" ? <g><rect x={x-width*.55} y={238} width={width*1.1} height={15} rx={4} fill="#49414a" {...O} strokeWidth={2}/><path d={`M ${x} 244 v 8`} stroke="#b7a7a1" strokeWidth={1.5}/></g>
            : <ellipse cx={x} cy={250} rx={width * 0.72} ry={width * 0.34} fill={color} {...O} strokeWidth={3} />}
        </>
      )}
    </g>
  );

/** soft top-left rim light — gives the flat cartoon shapes a little roundness */
const Sheen: React.FC<{ cx: number; cy: number; rx: number; ry: number; rot?: number; opacity?: number }> = ({ cx, cy, rx, ry, rot = 0, opacity = 0.06 }) => (
  <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#ffffff" opacity={opacity} transform={`rotate(${rot} ${cx} ${cy})`} />
);

/** darken/lighten a #rrggbb fill by amt in [-1, 1] */
const shade = (hex: string, amt: number): string => {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt))));
  const to = (v: number) => v.toString(16).padStart(2, "0");
  return `#${to(f((n >> 16) & 255))}${to(f((n >> 8) & 255))}${to(f(n & 255))}`;
};

/** soft round-the-body shading so characters look storybook, not clip-art */
const BodyShade: React.FC<{ name: string; c: RecipeColors }> = ({ name, c }) => (
  <defs>
    <radialGradient id={`cbody-${name}`} cx="0.34" cy="0.28" r="0.95">
      <stop offset="0" stopColor={shade(c.body, 0.16)} />
      <stop offset="1" stopColor={shade(c.body, -0.18)} />
    </radialGradient>
    <radialGradient id={`cbelly-${name}`} cx="0.5" cy="0.3" r="0.9">
      <stop offset="0" stopColor={shade(c.belly, 0.08)} />
      <stop offset="1" stopColor={shade(c.belly, -0.14)} />
    </radialGradient>
  </defs>
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

export const Character: React.FC<CharacterProps> = ({ kind, emotion = "happy", action = "idle", mouth = 0, actionT, bpm = 120, width = 400, flip = false, seed = 0, still = false, groove = false, shadow = true, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (kind === "none") return null;
  const recipe = getRecipe(kind);
  const c = recipe.colors;
  const t = still ? 0.35 : (actionT ?? frame / fps);
  const legless = recipe.rig === "fish" || recipe.rig === "whale";
  const pose: Pose = computePose({ action, t, bpm, seed, legless, groove });
  if (still) {
    pose.y = 0;
    pose.lean = 0;
    pose.flip = 1;
    pose.x = 0;
    pose.vy = 0;
  }
  // ── secondary motion ──
  // ears / tails lag behind a fast-moving body (follow-through); talking bobs the head a little
  const lag = Math.max(-9, Math.min(9, -pose.vy * 0.018));
  const talkDy = -mouth * 2.6;
  const talkTilt = mouth * 1.4;
  // contact shadow: shrinks and fades as the character leaves the ground
  const airborne = Math.max(0, Math.min(1, (legless ? -pose.y - 60 : -pose.y) / 90));
  const shadowScale = 1 - 0.45 * airborne;
  const shadowOpacity = (0.22 - 0.12 * airborne) * (legless ? 0.6 : 1);
  const blink = still ? 0 : blinkAmount(frame, seed);
  const height = (width * RIG_VB.h) / RIG_VB.w;
  const uid = `c${recipe.name}${seed}`;
  const showFace = pose.flip >= -0.05;
  const f = recipe.face ?? {};
  const features = partList(recipe.features);
  const markings = partList(recipe.markings);
  const accessories = partList(recipe.accessories);
  const pp = (o: FeatureSpec) => ({ c, pose, o });
  const renderAccessories = (onBody: boolean) => showFace ? accessories
    .filter((sp) => BODY_ACCESSORIES.has(sp.kind) === onBody)
    .map((sp, i) => { const P = ACCESSORIES[sp.kind]; return P ? <P key={`${sp.kind}${i}`} {...pp(sp)} /> : null; }) : null;

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
      <g transform={`translate(0 ${lag}) scale(1 ${1 - Math.abs(lag) * 0.012})`}>
        <Ears {...pp(earO)} />
      </g>
    </>
  );
  const headFront = (
    <>
      {showFace ? renderFeatures("headFront") : null}
      {showFace ? <MammalDetails recipe={recipe} pose={pose} layer="face" /> : null}
      {face}
      {renderAccessories(false)}
    </>
  );
  const bodyMarkings = (
    <>
      {markings.map((sp, i) => { const P = MARKINGS[sp.kind]; return P ? <P key={`${sp.kind}${i}`} {...pp(sp)} /> : null; })}
      {renderFeatures("body")}
      <MammalDetails recipe={recipe} pose={pose} layer="body" />
    </>
  );

  const body = (() => {
    if (SPECIES_RIGS.has(recipe.rig)) {
      return <SpeciesBody recipe={recipe} pose={pose} face={face} headFront={headFront} clothes={renderAccessories(true)} />;
    }
    if (recipe.rig === "bird") {
      const penguin = recipe.name === "penguin";
      return <g>
        <BodyShade name={recipe.name} c={c} />
        <Tail {...pp(tailO)} />
        <Leg x={80} lift={pose.legL} swing={pose.legSwL} color={c.limb} width={14} foot="duck" />
        <Leg x={120} lift={pose.legR} swing={pose.legSwR} color={c.limb} width={14} foot="duck" />
        <g transform={`translate(${pose.head.dx} ${pose.head.dy * .5 + talkDy * .5}) rotate(${pose.head.tilt * .5 + talkTilt} 100 200)`}>
          <g transform="translate(0 26)">{headDecor}</g>
          <ellipse cx={100} cy={150} rx={penguin ? 61 : 65} ry={92} fill={`url(#cbody-${recipe.name})`} {...O} />
          <ellipse cx={100} cy={179} rx={43} ry={53} fill={`url(#cbelly-${recipe.name})`} />
          {penguin ? <path d="M 100 88 C 65 49 43 81 53 117 L 68 164 Q 100 181 132 164 L 147 117 C 157 81 135 49 100 88 Z" fill={c.belly} /> : null}
          {bodyMarkings}{headFront}
        </g>
        {renderAccessories(true)}
        <Arm x={45} y={151} angle={pose.armL} color={c.body} wing length={58} />
        <Arm x={155} y={151} angle={-pose.armR} color={c.body} wing length={58} />
        <ClapSpark amount={pose.clapSpark} x={100} y={214} />
      </g>;
    }

    // Upright mammals and the main cast's turtle.
    const bodyWidth = ["elephant", "hippo", "pig", "panda"].includes(recipe.name) ? 64 : ["mouse", "squirrel"].includes(recipe.name) ? 49 : 58;
    return (
      <g>
        {renderFeatures("back")}
        <MammalDetails recipe={recipe} pose={pose} layer="back" />
        <BodyShade name={recipe.name} c={c} />
        <g transform={`translate(0 ${lag * 0.6})`}>
          <Tail {...pp(tailO)} />
        </g>
        {recipe.rig === "shell" ? (
          <g>
            <ellipse cx={100} cy={182} rx={74} ry={64} fill={c.accent ?? c.dark ?? c.limb} {...O} strokeWidth={5} />
            <Sheen cx={76} cy={156} rx={18} ry={12} rot={-14} opacity={0.16} />
            <g fill="none" stroke={c.dark ?? OUTLINE} strokeWidth={3} opacity={0.6}>
              <path d="M 100 130 L 122 142 L 122 166 L 100 178 L 78 166 L 78 142 Z" />
              <path d="M 122 142 L 146 130 M 122 166 L 148 178 M 78 142 L 54 130 M 78 166 L 52 178 M 100 178 L 100 206" />
            </g>
          </g>
        ) : null}
        <Leg x={78} lift={pose.legL} swing={pose.legSwL} color={c.limb} width={recipe.legWidth ?? 26} foot={recipe.foot ?? "round"} />
        <Leg x={122} lift={pose.legR} swing={pose.legSwR} color={c.limb} width={recipe.legWidth ?? 26} foot={recipe.foot ?? "round"} />
        <ellipse cx={100} cy={192} rx={bodyWidth} ry={50} fill={`url(#cbody-${recipe.name})`} {...O} />
        <ellipse cx={100} cy={200} rx={38} ry={32} fill={`url(#cbelly-${recipe.name})`} />
        <Sheen cx={76} cy={172} rx={20} ry={28} rot={-16} />
        {bodyMarkings}
        {recipe.rig === "shell" ? (
          <path d="M 66 186 L 134 186 M 64 204 L 136 204 M 75 222 L 125 222 M 100 172 L 100 230" fill="none" stroke={c.accent} strokeWidth={2.5} opacity={0.65} />
        ) : null}
        <g transform={`translate(${pose.head.dx} ${pose.head.dy + talkDy}) rotate(${pose.head.tilt + talkTilt} 100 150)`}>
          {headDecor}
          {HEAD_SHAPES[recipe.name]
            ? <path d={HEAD_SHAPES[recipe.name]} fill={`url(#cbody-${recipe.name})`} {...O} />
            : <circle cx={100} cy={96} r={68} fill={`url(#cbody-${recipe.name})`} {...O} />}
          <Sheen cx={72} cy={76} rx={17} ry={24} rot={-18} />
          {showFace && recipe.name === "bunny" ? (
            <path d="M 100 114 C 84 104 69 114 75 128 C 80 141 92 140 100 136 C 108 140 120 141 125 128 C 131 114 116 104 100 114 Z" fill={c.belly} opacity={0.8} />
          ) : null}
          {headFront}
        </g>
        {renderAccessories(true)}
        <Arm x={52} y={168} angle={pose.armL} color={c.limb} wing={recipe.arm === "wing"} bend={pose.armBendL} />
        <Arm x={148} y={168} angle={-pose.armR} color={c.limb} handScale={pose.handScaleR} wing={recipe.arm === "wing"} bend={pose.armBendR} point={pose.handScaleR > 1.1} />
        <ClapSpark amount={pose.clapSpark} x={100} y={214} />
      </g>
    );
  })();

  const flipX = (flip ? -1 : 1) * pose.flip;
  // A single contact shadow grounds the artwork without a costly silhouette filter.
  const k = width / RIG_VB.w;
  const shadowRx = 62 * shadowScale * k;
  const shadowRy = 11 * shadowScale * k;
  return (
    <div style={{ width, height, position: "relative", ...style }}>
      {shadow && !still ? (
        <div style={{ position: "absolute", left: (120 + pose.x) * k - shadowRx, top: 304 * k - shadowRy, width: shadowRx * 2, height: shadowRy * 2, borderRadius: "50%", background: "#2f2438", opacity: shadowOpacity }} />
      ) : null}
      <svg viewBox={`${RIG_VB.x} ${RIG_VB.y} ${RIG_VB.w} ${RIG_VB.h}`} width={width} height={height} style={{ overflow: "visible", position: "absolute", left: 0, top: 0 }}>
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
