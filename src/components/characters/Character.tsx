import React, { useId } from "react";
import type {ActorPerformance} from "../../lib/acting";
import type {MouthShape} from "../../lib/speech";
import {solveReach, handAnchor, rigToWorld} from '../../lib/rigHands';
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
import { UPRIGHT_KINDS, REACHABLE_KINDS, FEATHERED_KINDS, speciesKind } from './performanceProfiles';
import { SpeciesStorybookFace } from './StorybookFace';
import { StorybookPaint, softMix } from "./StorybookPaint";

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
  emotion?: Emotion;
  action?: Action;
  /** 0..1 how open the mouth is (speech), from the parent */
  mouth?: number;
  performance?: ActorPerformance;
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
  /** Draw carried artwork at the solved contact, including a small finger overlap. */
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

export const Character: React.FC<CharacterProps> = ({ kind, emotion = "happy", action = "idle", mouth = 0, performance: performanceProp, mouthShape: mouthShapeProp, turn: turnProp, turnVelocity: turnVelocityProp, actionT, previousAction, blend = 1, musicT, clockT, motionScale = 1, gaze, reach, heldProp, stageCenter, bpm = 120, width = 400, flip = false, seed: seedProp, still = false, groove = false, shadow = true, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const uid = `character-${useId().replace(/:/g, "")}`;
  if (kind === "none") return null;
  const recipe = getRecipe(kind);
  const c = recipe.colors;
  const seed = seedProp ?? characterSeed(kind);
  const performance=still?undefined:performanceProp;
  const mouthShape=still?undefined:mouthShapeProp;
  const turn=still?undefined:turnProp;
  const turnVelocity=still?undefined:turnVelocityProp;
  const t = still ? 0.35 : (actionT ?? frame / fps);
  const legless = recipe.rig === "fish" || recipe.rig === "whale";
  const input = { action, t, bpm, seed, legless, groove, storybook: STORYBOOK_KINDS.has(recipe.name), kind:recipe.name, performance, turn, turnVelocity, musicT: still ? 0.35 : musicT, clockT: still ? 0.35 : clockT };
  const incoming = computePose(input);
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
  const solved=reach&&stageCenter&&!still&&REACHABLE_KINDS.has(recipe.name)?solveReach(pose,recipe.name,flip,width,stageCenter,reach):null;
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
  const contact = solved && heldProp ? rigToWorld(handAnchor(recipe.name,pose,solved.side,solved.extension),pose,flip,240,{x:100,y:250}) : null;
  const shadowRx = 62 * shadowScale * k;
  const shadowRy = 11 * shadowScale * k;
  return (
    <div style={{ width, height, position: "relative", ...style }}>
      {shadow && !still ? (
        <div style={{ position: "absolute", left: (120 + pose.x) * k - shadowRx, top: 304 * k - shadowRy, width: shadowRx * 2, height: shadowRy * 2, borderRadius: "50%", background: "#2f2438", opacity: shadowOpacity }} />
      ) : null}
      <svg viewBox={`${RIG_VB.x} ${RIG_VB.y} ${RIG_VB.w} ${RIG_VB.h}`} width={width} height={height} style={{ overflow: "visible", position: "absolute", left: 0, top: 0 }}>
        <g transform={`translate(${100 + pose.x} 250) rotate(${pose.lean}) scale(${flipX * pose.sx} ${pose.sy}) translate(-100 -250) translate(0 ${pose.y})`}>{UPRIGHT_KINDS.has(recipe.name) ? body : <StorybookPaint recipe={recipe} uid={uid}>{body}</StorybookPaint>}</g>
        {contact && heldProp ? <g data-held-prop={heldProp.kind} transform={`translate(${contact.x} ${contact.y}) scale(${1/k})`}>
          <g transform={`translate(${heldProp.offset?.x??0} ${heldProp.offset?.y??0}) scale(${heldProp.size??1})`}><PropArt {...heldProp}/></g>
          <g opacity={grip} fill={recipe.name==='duck'?'#f4cd58':recipe.foot==='hoof'?softMix(c.limb,'#604950',.65):recipe.name==='panda'?c.limb:c.body} stroke={recipe.name==='duck'?'#ae772d':recipe.name==='bear'?'#79503d':softMix(c.body,'#67516c',.58)} strokeWidth="2.5" strokeLinecap="round">
            {FEATHERED_KINDS.has(recipe.name) ? <path d="M-17 -7Q-22 7 -13 16Q-9 20 -5 13Q0 22 5 14Q13 18 16 7L13 -5"/> : recipe.name==='penguin' ? <path d="M-17 -7Q-24 9 -11 18Q1 25 16 8L14 -5"/> : recipe.foot==='hoof' ? <><path d="M-18 -6Q-23 6 -13 14L-2 13L0 3L2 13L15 13Q24 4 18 -6"/><path d="M0 3v-6" fill="none"/></> : <>
              <path d="M-17 -6Q-25 -1 -20 10Q-16 15 -11 8L-9 -2"/>
              <path d="M-4 -5Q-10 1 -6 11Q-1 15 3 8L4 -3M9 -6Q4 1 8 9Q13 12 17 5L16 -5"/>
            </>}
          </g>
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
