import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig, type CalculateMetadataFunction} from 'remotion';
import {calculateKidsVideoMetadata, type KidsVideoProps} from './KidsVideo';
import {Character, characterBox, characterSeed} from './components/characters/Character';
import {computePose, walkCycle, type Pose} from './components/characters/pose';
import {performanceProfile} from './components/characters/performanceProfiles';
import {Background, BackgroundForeground} from './components/backgrounds/Background';
import {PropArt} from './components/StageProps';
import type {ActorPerformance} from './lib/acting';
import type {Emotion} from './lib/types';
import {mouthAt, mouthShapeAt} from './lib/speech';
import {getPalette} from './lib/palettes';
import {fontFamily} from './lib/fonts';
import {characterColorGrade, type ColorGradeMode} from './lib/colorGrade';

// Throwaway direction study. Production episodes keep their stored presentation.
export const PILOT_SECONDS = 24;
export type AnimationPilotProps = KidsVideoProps & {colorGrade?: ColorGradeMode};
const GROUND = 870;
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const smooth = (n: number) => {const k = clamp(n); return k * k * (3 - 2 * k);};
const ramp = (t: number, from: number, to: number) => smooth((t - from) / (to - from));
const hold = (t: number, from: number, peak: number, end: number) => ramp(t, from, peak) * (1 - ramp(t, peak, end));
type Keys = readonly (readonly [number, number])[];
const track = (t: number, keys: Keys) => {
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [from, a] = keys[i - 1], [to, b] = keys[i];
      return a + (b - a) * ramp(t, from, to);
    }
  }
  return keys[keys.length - 1][1];
};
const hop = (t: number, from: number, to: number) => t > from && t < to ? Math.sin(Math.PI * (t - from) / (to - from)) : 0;

export const pilotBeats = [
  {time: 1.8, label: 'Notice · eyes lead the body'},
  {time: 3.65, label: 'Anticipate · gather weight'},
  {time: 5.0, label: 'Chase · quick, uneven hops'},
  {time: 6.3, label: 'Miss · reach beyond the body'},
  {time: 7.7, label: 'Catch · plant, compress, recover'},
  {time: 10.1, label: 'Reassure · look back at Taffy'},
  {time: 14.0, label: 'Return · shared hand contact'},
  {time: 21.5, label: 'Play · a relaxed ending'},
];

function position(kind: string, t: number) {
  return kind === 'bunny'
    ? track(t, [[0, 530], [2.6, 530], [3.5, 500], [3.8, 500], [4.45, 645], [4.65, 645], [5.2, 780], [5.35, 780], [5.9, 875], [6.55, 925], [7.2, 900], [11.4, 900], [13.5, 1100], [24, 1100]])
    : track(t, [[0, 1480], [6.6, 1480], [7.3, 1445], [8.0, 1460], [24, 1460]]);
}

function heading(kind: string, t: number) {
  return kind === 'bunny'
    ? track(t, [[0, .05], [.6, .05], [1.0, .35], [2.8, .35], [3.6, .55], [6.5, .55], [8.2, .28], [12.2, .4], [14.5, .2], [16.0, .05], [17.0, .35], [22.0, .22], [24, .02]])
    : track(t, [[0, -.08], [4.0, -.08], [5.5, -.32], [7.4, -.48], [8.6, -.24], [9.5, -.4], [13.6, -.32], [16.0, -.1], [19.5, -.35], [24, -.05]]);
}

/** One ball throughout: distance-driven roll, catch, handover, then a return roll. */
function ballAt(t: number) {
  if (t < 7.5) return {x: track(t, [[0, 735], [.65, 735], [3.5, 930], [5.9, 1175], [7.5, 1317]]),
    y: 812 - 16 * hop(t, 5.9, 6.4) - 25 * ramp(t, 7.1, 7.5)};
  if (t < 14.25) return {x: track(t, [[7.5, 1317], [8.1, 1328], [9.0, 1325], [12.1, 1325], [14.25, 1282]]),
    y: track(t, [[7.5, 787], [7.8, 802], [9.0, 685], [12.1, 685], [14.25, 708]])};
  if (t < 17.8) return {x: track(t, [[14.25, 1282], [15.2, 1228], [16.7, 1228], [17.8, 1250]]),
    y: track(t, [[14.25, 708], [15.2, 710], [16.7, 710], [17.8, 812]])};
  return {x: track(t, [[17.8, 1250], [19.35, 1328], [20.2, 1328], [22.2, 1265], [24, 1265]]),
    y: 812 - 16 * hop(t, 18.15, 18.65)};
}

function feeling(kind: string, t: number): ActorPerformance {
  const cues: ReadonlyArray<readonly [number, Emotion]> = kind === 'bunny'
    ? [[0, 'happy'], [.85, 'surprised'], [3.4, 'thinking'], [5.8, 'worried'], [8.5, 'happy'], [13.6, 'love'], [16.6, 'happy']]
    : [[0, 'happy'], [5.3, 'thinking'], [7.4, 'surprised'], [8.4, 'excited'], [12.1, 'happy']];
  let index = 0;
  while (index + 1 < cues.length && t >= cues[index + 1][0]) index++;
  return {emotion: cues[index][1], fromEmotion: cues[Math.max(0, index - 1)][1],
    blend: ramp(t, cues[index][0], cues[index][0] + .24),
    emphasis: kind === 'bunny' ? hold(t, .85, 1.02, 1.55) : hold(t, 9.2, 9.4, 9.9),
    listening: kind === 'bunny' ? t < 1 || t > 3.525 : t < 9.2 || t > 11.25};
}

function rawPose(kind: string, t: number): Pose {
  const p = computePose({action: 'idle', t, clockT: t, bpm: 100, seed: characterSeed(kind), storybook: true, kind, turn: heading(kind, t)});
  const ball = ballAt(t), x = position(kind, t);
  p.eyes.dx = Math.max(-6, Math.min(6, (ball.x - x) / 38));
  p.eyes.dy = 3.5;
  if (kind === 'bunny') {
    const notice = hold(t, .8, 1.1, 2.1), prep = hold(t, 3.1, 3.65, 4.05);
    const air = hop(t, 3.8, 4.45) + hop(t, 4.65, 5.2) + hop(t, 5.35, 5.9);
    const land = hold(t, 4.42, 4.52, 4.65) + hold(t, 5.17, 5.25, 5.35) + hold(t, 5.87, 5.98, 6.16);
    const miss = hold(t, 5.9, 6.35, 7.25), recover = hold(t, 6.7, 7.1, 8.0);
    const walk = ramp(t, 11.4, 11.6) * (1 - ramp(t, 13.2, 13.5));
    const profile = performanceProfile(kind)!;
    const walkDistance = Math.max(0, x - position(kind, 11.4)) * 240 / 440;
    const gait = walkCycle(kind, walkDistance / profile.stride * profile.stepSeconds);
    p.y += notice * -5 + prep * 13 - air * 53 + land * 9;
    p.sx += prep * .09 - air * .065 + land * .1;
    p.sy += -prep * .09 + air * .08 - land * .1;
    p.lean += -notice * 5 + air * 5 + miss * 13 - recover * 6;
    p.torsoTilt += miss * 13 - prep * 5;
    p.head.tilt += notice * -8 + miss * -7 + recover * 9;
    p.head.dy += -notice * 7 + prep * 5;
    p.armR = 8 + notice * 38 + air * 70 + miss * 86;
    p.armL = 8 + prep * 22 + air * 38 - miss * 18 + recover * 20;
    p.armBendL = .25; p.armBendR = .22;
    p.legL = -air * 9 + gait.left.lift * walk;
    p.legR = -air * 7 + gait.right.lift * walk;
    p.legXL = gait.left.x * walk; p.legXR = gait.right.x * walk;
    p.legSwL = air * 22; p.legSwR = -air * 18;
    p.armL -= gait.right.x * .7 * walk; p.armR -= gait.left.x * .7 * walk;
    const relief = hold(t, 8.3, 9.0, 10.1) + hold(t, 15.0, 15.5, 16.2);
    p.head.tilt += relief * 7;
    p.eyes.dy *= 1 - ramp(t, 8.2, 8.65) + ramp(t, 16.7, 17.3);
    if (t > 8.65 && t < 12.0) p.eyes.dx = 4;
    if (relief > .7) p.eyes.mode = 'happy';
  } else {
    const brace = hold(t, 6.45, 7.35, 8.55), impact = hold(t, 7.5, 7.68, 8.2);
    const offer = hold(t, 12.0, 13.5, 15.0), nod = hold(t, 9.35, 9.65, 10.3);
    const stop = hold(t, 18.8, 19.35, 20.1), push = hold(t, 20.2, 20.65, 21.4);
    p.y += brace * 9 + impact * 8 + stop * 7;
    p.sx += brace * .045 + impact * .06;
    p.sy -= brace * .045 + impact * .06;
    p.torsoTilt += brace * -8 + impact * 11 + offer * -4 + stop * -7 + push * -5;
    p.head.tilt += brace * 5 - impact * 8 + nod * -7;
    p.head.dy += nod * 5;
    p.armL = 8 + brace * 42 + offer * 45 + stop * 60 + push * 50;
    p.armR = 8 + brace * 26 + impact * 15;
    p.armBendL = .38; p.armBendR = .35;
    p.legXL = -brace * 5; p.legXR = brace * 5;
    p.legSwL = brace * -7; p.legSwR = brace * 7;
    p.eyes.dy = 3.5 * (1 - ramp(t, 8.2, 9.1)) + stop * 3;
    if (t > 9.1 && t < 16.5) p.eyes.dx = -4;
  }
  return p;
}

export function pilotPose(kind: string, t: number) {
  const pose = rawPose(kind, t), previous = rawPose(kind, t - 1 / 30);
  const vy = (pose.y - previous.y) * 30;
  const vx = (position(kind, t) - position(kind, t - 1 / 30)) * 30 * 240 / 440;
  const lag = (pose.head.tilt - previous.head.tilt) * 30;
  pose.vy = vy; pose.vx = vx;
  pose.secondary = {ears: Math.max(-17, Math.min(17, -vy * .028 - lag * .065)),
    tail: Math.max(-16, Math.min(16, -vx * .035 + vy * .018)), cloth: Math.max(-12, Math.min(12, -vx * .02 - vy * .02))};
  pose.tail += pose.secondary.tail;
  return pose;
}

export const calculateAnimationPilotMetadata: CalculateMetadataFunction<AnimationPilotProps> = async context => ({
  ...await calculateKidsVideoMetadata(context), durationInFrames: PILOT_SECONDS * 30,
});

export const AnimationPilot: React.FC<AnimationPilotProps> = ({slug, script, baked, colorGrade = 'production'}) => {
  const frame = useCurrentFrame(), {fps} = useVideoConfig(), t = frame / fps;
  if (!script) return null;
  const lines = script.scenes[0].lines;
  const speech = [{at: 1, line: lines[0], kind: 'bunny'}, {at: 9.2, line: lines[1], kind: 'bear'}];
  const speaking = speech.find(cue => t >= cue.at && t < cue.at + (cue.line.durationSec ?? 0));
  const ball = ballAt(t), benHolds = t >= 7.5 && t < 14.25, taffyHolds = t >= 14.25 && t < 17.8;
  const zoom = track(t, [[0, 1.03], [3.6, 1.03], [4.25, 1.1], [6.8, 1.1], [7.5, 1.45], [11.4, 1.45], [12.1, 1.35], [16.2, 1.35], [17.2, 1.03], [24, 1.03]]);
  const cx = track(t, [[0, 960], [3.6, 960], [6.8, 1050], [7.5, 1250], [11.4, 1250], [12.1, 1190], [16.2, 1190], [17.2, 1060], [24, 1060]]);
  const cy = 580;
  const cameraX = Math.max(1920 * (1 - zoom), Math.min(0, 960 - cx * zoom));
  const cameraY = Math.max(1080 * (1 - zoom), Math.min(0, 540 - cy * zoom));
  const captionOpacity = speaking ? Math.min(ramp(t, speaking.at, speaking.at + .12), 1 - ramp(t, speaking.at + (speaking.line.durationSec ?? 0) - .15, speaking.at + (speaking.line.durationSec ?? 0))) : 0;
  const gain = (f: number) => Math.min(1, f / fps, (PILOT_SECONDS * fps - f) / fps);
  return <AbsoluteFill style={{background: '#d5e7d5'}}>
    <AbsoluteFill style={{transform: `translate(${cameraX}px, ${cameraY}px) scale(${zoom})`, transformOrigin: '0 0'}}>
      <Background kind="meadow" colorGrade={colorGrade} palette={getPalette('meadow')} baked={baked} splitForeground motion={.2} animationT={t * .35} parallax={{x: (cx - 960) * -.04, y: 0}} />
      {['bear', 'bunny'].map(kind => {
        const x = position(kind, t), width = kind === 'bunny' ? 440 : 490;
        const performance = feeling(kind, t), talking = speaking?.kind === kind ? speaking : null;
        const carry = kind === 'bear' ? benHolds : taffyHolds;
        const contact = kind === 'bear'
          ? ramp(t, 6.6, 7.5) * (1 - ramp(t, 14.25, 14.65))
          : ramp(t, 13.3, 14.25) * (1 - ramp(t, 17.8, 18.1));
        const miss = kind === 'bunny' ? hold(t, 5.9, 6.35, 7.05) : 0;
        const rollContact = kind === 'bear' ? hold(t, 18.8, 19.35, 20.15) + hold(t, 20.2, 20.65, 21.4) : 0;
        const reach = Math.max(contact, miss, rollContact);
        const target = miss > contact ? {x: ball.x - 80, y: ball.y - 6} : ball;
        return <div key={kind} style={{position: 'absolute', ...characterBox(x, GROUND, width)}}>
          <Character kind={kind} colorGrade={colorGrade} width={width} authoredPose={pilotPose(kind, t)} action="idle" actionT={t} clockT={t} turn={heading(kind, t)}
            emotion={performance.emotion} performance={performance} mouth={talking ? mouthAt(talking.line, t - talking.at) : 0}
            mouthShape={talking ? mouthShapeAt(talking.line, t - talking.at) : 'rest'} stageCenter={{x, y: GROUND}}
            reach={reach > 0 ? {target, amount: reach, crouch: 0, grip: carry ? 1 : .12, object: miss > contact ? undefined : {kind:'ball',size:1.4}} : undefined} />
        </div>;
      })}
      <svg width="1920" height="1080" style={{position: 'absolute', inset: 0, overflow: 'visible', filter: characterColorGrade(colorGrade)}}>
        {!benHolds && !taffyHolds ? <ellipse cx={ball.x} cy={GROUND - 2} rx="53" ry="9" fill="#51495d" opacity=".14" /> : null}
        <g transform={`translate(${ball.x} ${ball.y}) rotate(${(ball.x - 735) / 57.4 * 180 / Math.PI}) scale(1.4)`}><PropArt kind="ball" /></g>
      </svg>
      <BackgroundForeground kind="meadow" colorGrade={colorGrade} palette={getPalette('meadow')} motion={.2} animationT={t * .35} />
    </AbsoluteFill>
    {speaking ? <div style={{position: 'absolute', bottom: 45, left: 200, right: 200, textAlign: 'center', opacity: captionOpacity}}>
      <span style={{display: 'inline-block', padding: '16px 34px', borderRadius: 26, background: '#fffaf0f2', color: '#51425c', fontFamily, fontWeight: 500, fontSize: 44}}>{speaking.line.text}</span>
    </div> : null}
    {speech.map(({at, line}) => <Sequence key={at} from={Math.round(at * fps)} durationInFrames={Math.ceil((line.durationSec ?? 0) * fps)} layout="none">
      <Audio src={staticFile(`generated/${slug}/${line.audio}`)} volume={.95} />
    </Sequence>)}
    <Audio src={staticFile('music/curious-v1.wav')} loop volume={f => .13 * gain(f)} />
    {[{at: 3.8, file: 'boing', volume: .14}, {at: 4.65, file: 'boing', volume: .11}, {at: 5.35, file: 'boing', volume: .1},
      {at: 6.35, file: 'whoosh', volume: .12}, {at: 7.5, file: 'pop', volume: .2}, {at: 8.9, file: 'ding', volume: .12},
      {at: 14.25, file: 'heart', volume: .13}].map(({at, file, volume}) => <Sequence key={at} from={Math.round(at * fps)} durationInFrames={fps} layout="none"><Audio src={staticFile(`sfx/${file}.wav`)} volume={volume} /></Sequence>)}
    <AbsoluteFill style={{pointerEvents: 'none', background: '#fff9ee', opacity: 1 - ramp(t, 0, .35) + ramp(t, 23.5, 24)}} />
  </AbsoluteFill>;
};
