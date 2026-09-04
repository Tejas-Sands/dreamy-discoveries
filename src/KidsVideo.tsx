import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig, type CalculateMetadataFunction } from "remotion";
import { loadFont } from "@remotion/google-fonts/Fredoka";
import type { Action, Emotion, KidsScript, Scene, SfxName } from "./lib/types";
import { computeSchedule, musicVolume, toFrames, TRANSITION_FRAMES, type SceneSlot } from "./lib/timing";
import { getPalette, type Palette } from "./lib/palettes";
import { CENTER_X, FRIEND_X, GROUND_Y, MAIN_X } from "./lib/layout";
import { mouthAt } from "./lib/speech";
import { easeOutBack, easeOutCubic } from "./lib/anim";
import { Background } from "./components/backgrounds/Background";
import { Character, characterBox } from "./components/characters/Character";
import { Karaoke } from "./components/Karaoke";
import { Callout } from "./components/Callout";
import { QuestionOverlay } from "./components/Question";
import { Confetti, Floaters, Sparkles } from "./components/Particles";
import { Camera, SceneTransition } from "./components/Transition";
import { Sfx, SfxLoop } from "./components/Sfx";
import { StarHud } from "./components/StarHud";
import { EndCard, TitleCard } from "./components/Cards";
import { fetchBaked, type BakedMap } from "./lib/baked";

const { fontFamily } = loadFont();

export type KidsVideoProps = {
  slug: string;
  script: KidsScript | null;
  /** baked scenery PNGs (public/baked/manifest.json), filled in by calculateMetadata */
  baked?: BakedMap;
};

/** Enough defaults to preview a script in the Studio before the Director/TTS ran. */
function withDefaults(script: KidsScript): KidsScript {
  const scenes = (script.scenes ?? []).map((s) => ({
    ...s,
    lines: (s.lines ?? []).map((l) => (typeof l === "string" ? { text: l } : l)),
  }));
  const main = script.mainCharacter ?? { kind: scenes[0]?.character ?? "bunny", name: "Benny" };
  return { ...script, scenes, mainCharacter: main.kind === "none" ? { ...main, kind: "bunny" } : main };
}

export const calculateKidsVideoMetadata: CalculateMetadataFunction<KidsVideoProps> = async ({ props }) => {
  const res = await fetch(staticFile(`generated/${props.slug}/script.json`));
  if (!res.ok) {
    throw new Error(`Could not load script for slug "${props.slug}" — run the generate + tts steps first.`);
  }
  const script = withDefaults((await res.json()) as KidsScript);
  const schedule = computeSchedule(script);
  const baked = await fetchBaked();
  return { durationInFrames: schedule.total, props: { ...props, script, baked } };
};

const TRANSITION_SFX: Record<string, SfxName | null> = { pop: "pop", slide: "slide", iris: "whoosh", wipe: "whoosh", fade: null };

const SceneView: React.FC<{
  scene: Scene;
  slot: SceneSlot;
  palette: Palette;
  slug: string;
  script: KidsScript;
  lead: number;
  index: number;
  baked?: BakedMap;
}> = ({ scene, slot, palette, slug, script, lead, index, baked }) => {
  const rawFrame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const frame = rawFrame - lead; // true scene clock (negative during the transition overlap)
  const sceneT = Math.max(0, frame) / fps;
  const bpm = script.music?.bpm ?? 120;
  const isQuestion = !!scene.question;
  const compact = script.type === "story";

  // ── which line is live, and is the character speaking right now? ──
  const active = slot.lines.find((l) => frame >= l.from && frame < l.from + l.duration) ?? null;
  const started = slot.lines.filter((l) => frame >= l.from);
  const last = started[started.length - 1] ?? null;
  const ref = active ?? last;
  const lineT = ref ? (frame - ref.from) / fps : 0;
  const talking = !!ref && lineT <= (ref.line.durationSec ?? 0);
  const friendSpeaks = talking && ref!.line.speaker === "friend";
  const mouth = talking && ref!.line.speaker === "character" ? mouthAt(ref!.line, lineT) : 0;
  const friendMouth = friendSpeaks ? mouthAt(ref!.line, lineT) : 0;

  const inHold = isQuestion && frame >= slot.holdFrom && frame < slot.revealFrom;
  const inReveal = isQuestion && frame >= slot.revealFrom && frame < slot.praiseFrom;
  const danceBreak = !isQuestion && !active && frame >= slot.holdFrom && scene.energy === "upbeat";

  let emotion: Emotion = ref?.line.emotion ?? scene.emotion ?? (scene.energy === "upbeat" ? "excited" : "happy");
  let action: Action = ref?.line.action ?? scene.action ?? (scene.energy === "upbeat" ? "dance" : "idle");
  let actionT = ref ? lineT : sceneT;
  if (frame < 0 || (!ref && !danceBreak)) {
    action = scene.energy === "upbeat" ? "dance" : "idle";
    actionT = sceneT;
  }
  if (danceBreak) {
    action = "dance";
    emotion = "excited";
  }
  if (inHold) {
    emotion = "thinking";
    action = "think";
    actionT = (frame - slot.holdFrom) / fps;
  }
  if (inReveal) {
    const rt = (frame - slot.revealFrom) / fps;
    emotion = rt < 0.45 ? "surprised" : "excited";
    action = rt < 0.45 ? "idle" : "cheer";
    actionT = rt;
  }
  if (action === "dance") actionT = sceneT; // stay on the beat across lines
  const mainEmotion: Emotion = friendSpeaks ? (emotion === "sad" || emotion === "worried" ? "worried" : "happy") : emotion;
  const mainAction: Action = friendSpeaks ? "look" : action;

  // ── layout ──
  const hasCallouts = isQuestion || scene.lines.some((l) => l.callout);
  const friend = scene.secondCharacter && scene.secondCharacter !== "none" ? scene.secondCharacter : null;
  const mainX = friend || hasCallouts ? MAIN_X : CENTER_X - 90;
  const mainW = 430;
  const mainBox = characterBox(mainX, GROUND_Y, mainW);
  const headY = GROUND_Y - mainW * 1.15;

  // ── impact shake & reveal punch ──
  let shake = 0;
  if (ref && active && (action === "stomp" || action === "jump")) {
    const period = action === "stomp" ? 0.3125 : 0.62;
    const ph = (lineT + (action === "jump" ? 0.05 : 0)) % period;
    shake = 6 * Math.exp(-ph * 14);
  }
  const punch = inReveal ? 0.05 * Math.exp(-((frame - slot.revealFrom) / fps) * 5) : 0;

  // ── peek-a-boo gag ──
  const gag = scene.gag;
  const gagStart = gag ? toFrames(gag.atSec) : -1;
  const gagT = gag ? (frame - gagStart) / fps : -1;
  const gagVisible = gag && gagT >= 0 && gagT < 2.6 && slot.duration / fps > gag.atSec + 3;
  const gagX = gagVisible ? 1790 + 340 * (1 - easeOutBack(Math.min(1, gagT / 0.45))) + (gagT > 1.9 ? 400 * easeOutCubic((gagT - 1.9) / 0.7) : 0) : 0;

  // ── floating emoji by mood ──
  const floaters =
    action === "hug" || emotion === "love" ? "❤️" : action === "sleep" ? "💤" : action === "dance" || scene.kind === "chorus" ? ["🎵", "🎶"] : action === "cry" ? "💧" : null;

  const chant =
    scene.kind === "moral"
      ? scene.lines.filter((l) => l.role === "moral" && !/say it with me/i.test(l.text)).map((l) => l.text).join("  ")
      : "";

  const claps: number[] = [];
  for (const l of slot.lines) {
    if (l.line.action === "clap") {
      const dur = l.line.durationSec ?? 2;
      for (let k = 0; k < 6 && 0.19 + k * 0.385 < dur; k++) claps.push(l.from + toFrames(0.19 + k * 0.385));
    }
  }
  const transitionSfx = TRANSITION_SFX[scene.transition ?? "pop"];

  return (
    <AbsoluteFill>
      <Camera kind={scene.camera ?? "still"} duration={slot.duration} shake={shake} punch={punch}>
        <Background kind={scene.background} palette={palette} frameOffset={slot.from} baked={baked} />
        {scene.energy === "upbeat" ? <Sparkles count={10} seed={index} /> : null}
        {friend ? (
          <div style={{ position: "absolute", ...characterBox(FRIEND_X, GROUND_Y, 360) }}>
            <Character
              kind={friend}
              emotion={friendSpeaks ? emotion : emotion === "thinking" ? "happy" : emotion === "sad" || emotion === "worried" ? "happy" : emotion}
              action={friendSpeaks ? action : action === "cheer" ? "cheer" : action === "dance" ? "dance" : action === "hug" ? "hug" : action === "walk" ? "walk" : "nod"}
              mouth={friendMouth}
              width={360}
              flip
              seed={index + 7}
              actionT={friendSpeaks ? lineT : sceneT}
              bpm={bpm}
            />
          </div>
        ) : null}
        <div style={{ position: "absolute", ...mainBox }}>
          <Character kind={scene.character} emotion={mainEmotion} action={mainAction} mouth={mouth} actionT={actionT} bpm={bpm} width={mainW} seed={index} />
        </div>
        {gagVisible ? (
          <div style={{ position: "absolute", ...characterBox(gagX, GROUND_Y + 10, 300) }}>
            <Character kind={gag!.character} emotion="excited" action="wave" width={300} flip seed={index + 99} actionT={gagT} bpm={bpm} />
          </div>
        ) : null}
        {!isQuestion
          ? slot.lines.filter((l) => l.line.role === "praise").map((l, i) => <Confetti key={`pc${i}`} from={lead + l.from + 2} x={mainX} y={headY} count={40} />)
          : null}
        {floaters ? <Floaters emoji={floaters} x={mainX} y={action === "cry" ? headY + 120 : headY} count={5} seed={index} dir={action === "cry" ? -1 : 1} size={action === "cry" ? 44 : 64} /> : null}
      </Camera>

      {active && active.line.callout && !inHold ? (
        <Callout spec={active.line.callout} words={active.line.words} t={lineT} lineSec={active.line.durationSec ?? 2} palette={palette} area={friend ? "top" : "right"} />
      ) : null}

      {isQuestion && frame >= 0 ? (
        // the overlay animates off the raw sequence frame, which runs `lead` frames ahead of the scene clock
        <QuestionOverlay spec={scene.question!} palette={palette} holdFrom={lead + slot.holdFrom} revealFrom={lead + slot.revealFrom} holdDuration={slot.holdDuration} revealDuration={slot.revealDuration} bubbleX={mainX + 120} bubbleY={headY - 60} compact={!!friend} />
      ) : null}

      {active ? (
        <Karaoke line={active.line} palette={palette} t={lineT} size={compact ? "small" : "big"} />
      ) : inHold && last ? (
        // keep the question on screen while the child thinks
        <Karaoke line={last.line} palette={palette} t={999} size={compact ? "small" : "big"} />
      ) : danceBreak && chant ? (
        // "say it with me!" — keep the chant on screen while they say it
        <Karaoke line={{ text: chant, role: "praise" }} palette={palette} t={999} size="small" />
      ) : null}

      {/* ── audio: voice lines + sound effects (frames relative to this sequence) ── */}
      {slot.lines.map((l, i) =>
        l.line.audio ? (
          <Sequence key={i} from={lead + l.from} durationInFrames={l.duration} name={`Line: ${l.line.text.slice(0, 24)}`}>
            <Audio src={staticFile(`generated/${slug}/${l.line.audio}`)} />
          </Sequence>
        ) : null
      )}
      {transitionSfx ? <Sfx name={transitionSfx} at={0} volume={0.45} /> : null}
      {slot.lines.flatMap((l, i) =>
        (l.line.sfx ?? []).filter((s) => s !== "clap").map((s, k) => <Sfx key={`${i}-${k}`} name={s} at={lead + l.from + (s === "applause" ? 6 : 2)} volume={s === "applause" ? 0.55 : s === "tada" ? 0.7 : 0.65} />)
      )}
      {claps.map((at, i) => <Sfx key={`clap${i}`} name="clap" at={lead + at} volume={0.6} />)}
      {isQuestion ? (
        <>
          <SfxLoop name="ticktock" from={lead + slot.holdFrom} duration={slot.holdDuration} volume={0.4} />
          <Sfx name="drumroll" at={lead + slot.holdFrom + Math.max(0, slot.holdDuration - toFrames(1.1))} volume={0.35} />
          <Sfx name="ding" at={lead + slot.revealFrom} volume={0.85} />
          <Sfx name="sparkle" at={lead + slot.revealFrom + 4} volume={0.7} />
          <Sfx name="coin" at={lead + slot.praiseFrom + 4} volume={0.7} />
        </>
      ) : null}
      {gag ? <Sfx name="boing" at={lead + gagStart} volume={0.5} /> : null}
    </AbsoluteFill>
  );
};

export const KidsVideo: React.FC<KidsVideoProps> = ({ slug, script: rawScript, baked }) => {
  if (!rawScript) {
    return (
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", fontSize: 40, background: "#222", color: "#fff" }}>
        Waiting for script.json…
      </AbsoluteFill>
    );
  }
  const script = withDefaults(rawScript);
  const palette = getPalette(script.palette);
  const schedule = computeSchedule(script);
  const T = TRANSITION_FRAMES;
  const starsTotal = script.stars?.total ?? 0;
  const earnedAt: number[] = [];
  script.scenes.forEach((scene, i) => {
    if (scene.question && scene.starIndex !== undefined && scene.starIndex < starsTotal) {
      earnedAt[scene.starIndex] = schedule.scenes[i].from + schedule.scenes[i].praiseFrom + 4;
    }
  });

  return (
    <AbsoluteFill style={{ fontFamily, background: palette.bgB }}>
      {script.music?.file ? (
        <Audio loop src={staticFile(`music/${script.music.file}`)} volume={(f) => musicVolume(f, schedule)} name="music" />
      ) : null}

      <Sequence durationInFrames={schedule.intro + T} name="Title">
        <TitleCard script={script} palette={palette} slug={slug} baked={baked} />
      </Sequence>

      {script.scenes.map((scene, i) => {
        const slot = schedule.scenes[i];
        return (
          <Sequence key={i} from={slot.from - T} durationInFrames={slot.duration + 2 * T} name={`Scene ${i + 1}: ${scene.kind ?? ""} ${scene.background}`}>
            <SceneTransition kind={scene.transition ?? "pop"} frames={T}>
              <SceneView scene={scene} slot={slot} palette={palette} slug={slug} script={script} lead={T} index={i} baked={baked} />
            </SceneTransition>
          </Sequence>
        );
      })}

      <Sequence from={schedule.endFrom - T} durationInFrames={schedule.endDuration + T} name="End">
        <SceneTransition kind="pop" frames={T}>
          <Sequence from={T}>
            <EndCard script={script} palette={palette} slug={slug} starsEarned={earnedAt.filter((x) => x !== undefined).length} baked={baked} />
          </Sequence>
        </SceneTransition>
      </Sequence>

      {starsTotal > 0 ? (
        <Sequence from={schedule.intro} durationInFrames={schedule.endFrom - schedule.intro} name="Stars">
          <StarHud total={starsTotal} earnedAt={earnedAt.map((f) => f - schedule.intro)} />
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
};
