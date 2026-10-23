import React, { useId } from "react";
import type {ActorPerformance} from "../../lib/acting";
import type {MouthShape} from "../../lib/speech";
import {solveReach} from '../../lib/rigHands';
import {PropArt} from '../StageProps';
import type {StagePoint,StageReach} from '../../lib/types';
import { useCurrentFrame, useVideoConfig } from "remotion";
import type { Action, Emotion } from "../../lib/types";
import { rand } from "../../lib/random";
import { computePose, blendPoses, type Pose } from "./pose";
import type { CharacterRecipe } from "./recipe";
import { SpeciesBody } from "./SpeciesBody";
import { CHARACTER_RECIPES } from "../../generated/registry";
import { STORYBOOK_KINDS, StorybookBody } from "./StorybookBody";
import { UPRIGHT_KINDS, REACHABLE_KINDS, speciesKind } from './performanceProfiles';
import { SpeciesStorybookFace } from './StorybookFace';
import { StorybookPaint } from "./StorybookPaint";
import {characterColorGrade, type ColorGradeMode} from '../../lib/colorGrade';
import {propScale} from '../../lib/propGeometry';

/** The rig lives in this viewBox; feet at y=250, head top around y=-32 (bunny ears) */
export const RIG_VB = { x: -20, y: -50, w: 240, h: 310 };

/** Cast IDs and permanent recipe names share the same artwork. */
export const getRecipe = (kind: string): CharacterRecipe => CHARACTER_RECIPES[speciesKind(kind)] ?? CHARACTER_RECIPES.bunny;
/** Recipe identity keeps cast aliases and legacy names in the same motion family. */
export const characterSeed = (kind: string): number => {
  let seed = 0;
  for (const char of getRecipe(kind).name) seed = (seed * 31 + char.charCodeAt(0)) >>> 0;
  return seed % 65536;
};
export const characterEmoji = (kind: string): string => (kind === "none" ? "⭐" : getRecipe(kind).emoji);

export interface CharacterProps {
  kind: string;
  colorGrade?: ColorGradeMode;
  emotion?: Emotion;
  action?: Action;
  /** 0..1 how open the mouth is (speech), from the parent */
  mouth?: number;
  performance?: ActorPerformance;
  /** Optional frame-sampled acting pose; copied before reach/scaling mutates it. */
  authoredPose?: Pose;
  mouthShape?: MouthShape;
  /** Local signed head/body turn; external flip mirrors this. */
  turn?: number;
  /** Local view-turn speed per second; sampled externally without render state. */
  turnVelocity?: number;
  /** seconds since the current action started (defaults to the frame clock) */
  actionT?: number;
  /** Outgoing gesture frozen at the transition boundary. */
  previousAction?: { action: Action; t: number };
  /** 0 = outgoing pose; 1 = incoming pose. */
  blend?: number;
  musicT?: number;
  /** Absolute clock for blinking across line/scene Sequence boundaries. */
  clockT?: number;
  motionScale?: number;
  /** Look offset in rig pixels, applied to the shared face renderer. */
  gaze?: { x: number; y: number };
  reach?: StageReach;
  /** Draw carried artwork at its world center, above the limb touching its edge. */
  heldProp?: {kind: string; label?: string; size?: number; offset?: StagePoint; openProgress?: number; buildProgress?: number; waterAmount?: number};
  stageCenter?: StagePoint;
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

/** blinks every ~3.5 s, offset per seed so a crowd never blinks in sync */
function blinkAmount(frame: number, seed: number): number {
  const period = 95 + Math.round(rand(seed + 3) * 40);
  const t = (frame + Math.round(rand(seed) * period)) % period;
  if (t < 3) return t / 3;
  if (t < 6) return 1 - (t - 3) / 3;
  return 0;
}

export const Character: React.FC<CharacterProps> = ({ kind, colorGrade = 'production', emotion = "happy", action = "idle", mouth = 0, performance: performanceProp, authoredPose, mouthShape: mouthShapeProp, turn: turnProp, turnVelocity: turnVelocityProp, actionT, previousAction, blend = 1, musicT, clockT, motionScale = 1, gaze, reach, heldProp, stageCenter, bpm = 120, width = 400, flip = false, seed: seedProp, still = false, groove = false, shadow = true, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const uid = `character-${useId().replace(/:/g, "")}`;
  if (kind === "none") return null;
  const recipe = getRecipe(kind);
  const seed = seedProp ?? characterSeed(kind);
  const performance=still?undefined:performanceProp;
  const mouthShape=still?undefined:mouthShapeProp;
  const turn=still?undefined:turnProp;
  const turnVelocity=still?undefined:turnVelocityProp;
  const t = still ? 0.35 : (actionT ?? frame / fps);
  const legless = recipe.rig === "fish" || recipe.rig === "whale";
  const input = { action, t, bpm, seed, legless, groove, storybook: STORYBOOK_KINDS.has(recipe.name), kind:recipe.name, performance, turn, turnVelocity, musicT: still ? 0.35 : musicT, clockT: still ? 0.35 : clockT };
  const incoming = authoredPose && !still
    ? {...authoredPose, head: {...authoredPose.head}, eyes: {...authoredPose.eyes}, secondary: authoredPose.secondary ? {...authoredPose.secondary} : undefined}
    : computePose(input);
  const pose: Pose = previousAction && !still && blend < 1
    ? blendPoses(computePose({ ...input, action: previousAction.action, t: previousAction.t, musicT: musicT === undefined ? undefined : musicT - t, clockT: clockT === undefined ? undefined : clockT - t }), incoming, blend)
    : incoming;
  // Quiet direction reduces body travel without erasing the readable hand gesture.
  const amplitude = Math.max(0, Math.min(1.3, motionScale));
  pose.x *= amplitude;
  pose.y = (legless ? -70 : 0) + (pose.y - (legless ? -70 : 0)) * amplitude;
  pose.lean *= amplitude;
  pose.torsoTilt *= amplitude;
  pose.vx *= amplitude;
  pose.vy *= amplitude;
  pose.sx = 1 + (pose.sx - 1) * amplitude;
  pose.sy = 1 + (pose.sy - 1) * amplitude;
  pose.tail *= amplitude;
  if (gaze) {
    pose.eyes.dx = Math.max(-7, Math.min(7, gaze.x)) * (flip ? -1 : 1);
    pose.eyes.dy = Math.max(-7, Math.min(7, gaze.y));
  }
  if (still) {
    pose.y = 0;
    pose.lean = 0;
    pose.torsoTilt = 0;
    pose.torsoTurn = 0;
    pose.flip = 1;
    pose.x = 0;
    pose.vy = 0;
  }
  const objectReach=reach&&heldProp?{...reach,object:reach.object??heldProp}:reach;
  const solved=objectReach&&stageCenter&&!still&&REACHABLE_KINDS.has(recipe.name)?solveReach(pose,recipe.name,flip,width,stageCenter,objectReach):null;
  const armExtension=solved?{[solved.side]:solved.extension}:undefined;
  const grip = Math.max(0,Math.min(1,reach?.grip??reach?.amount??0));
  const handGrip=solved?{[solved.side]:grip}:undefined;
  // contact shadow: shrinks and fades as the character leaves the ground
  const airborne = Math.max(0, Math.min(1, (legless ? -pose.y - 60 : -pose.y) / 90));
  const shadowScale = 1 - 0.45 * airborne;
  const shadowOpacity = (0.22 - 0.12 * airborne) * (legless ? 0.6 : 1);
  const blink = still ? 0 : blinkAmount(clockT === undefined ? frame : clockT * fps, seed);
  const height = (width * RIG_VB.h) / RIG_VB.w;
  const showFace = pose.flip >= -0.05;
  const body = UPRIGHT_KINDS.has(recipe.name)
    ? <StorybookBody recipe={recipe} pose={pose} emotion={emotion} mouth={mouth} blink={blink} showFace={showFace} action={action} previousAction={!still?previousAction?.action:undefined} actionBlend={blend} armExtension={armExtension} handGrip={handGrip} crouch={solved?Math.max(0,Math.min(.4,reach?.crouch??0))*Math.max(0,Math.min(1,reach?.amount??0)):0} performance={performance} mouthShape={mouthShape} turn={turn} />
    : <SpeciesBody recipe={recipe} pose={pose} face={showFace ?
        <SpeciesStorybookFace recipe={recipe} emotion={emotion} mouth={mouth} blink={blink}
          eyes={pose.eyes} uid={uid} performance={performance} mouthShape={mouthShape} turn={turn}/> : null}
        turn={turn} action={action} mouth={mouth} mouthShape={mouthShape} emotion={emotion} performance={performance} armExtension={armExtension} />;

  const flipX = (flip ? -1 : 1) * pose.flip;
  // A single contact shadow grounds the artwork without a costly silhouette filter.
  const k = width / RIG_VB.w;
  const contact = solved && heldProp && reach && stageCenter
    ? {x:100+(reach.target.x-stageCenter.x)/k,y:250+(reach.target.y-stageCenter.y)/k} : null;
  const shadowRx = 62 * shadowScale * k;
  const shadowRy = 11 * shadowScale * k;
  return (
    <div style={{ width, height, position: "relative", filter: characterColorGrade(colorGrade), ...style }}>
      {shadow && !still ? (
        <div style={{ position: "absolute", left: (120 + pose.x) * k - shadowRx, top: 304 * k - shadowRy, width: shadowRx * 2, height: shadowRy * 2, borderRadius: "50%", background: "#2f2438", opacity: shadowOpacity }} />
      ) : null}
      <svg viewBox={`${RIG_VB.x} ${RIG_VB.y} ${RIG_VB.w} ${RIG_VB.h}`} width={width} height={height} style={{ overflow: "visible", position: "absolute", left: 0, top: 0 }}>
        <g transform={`translate(${100 + pose.x} 250) rotate(${pose.lean}) scale(${flipX * pose.sx} ${pose.sy}) translate(-100 -250) translate(0 ${pose.y})`}>{UPRIGHT_KINDS.has(recipe.name) ? body : <StorybookPaint recipe={recipe} uid={uid}>{body}</StorybookPaint>}</g>
        {contact && heldProp ? <g data-held-prop={heldProp.kind} transform={`translate(${contact.x} ${contact.y}) scale(${1/k})`}>
          <g transform={`translate(${heldProp.offset?.x??0} ${heldProp.offset?.y??0}) scale(${heldProp.size??propScale(heldProp.kind)})`}><PropArt {...heldProp}/></g>
        </g> : null}
      </svg>
    </div>
  );
};

/** Place a character so its feet stand on `groundY`, centered at `centerX`. */
export const characterBox = (centerX: number, groundY: number, width: number) => {
  const scale = width / RIG_VB.w;
  return { left: centerX - (100 - RIG_VB.x) * scale, top: groundY - (250 - RIG_VB.y) * scale, width };
};
