import React, { useMemo } from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig, type CalculateMetadataFunction } from "remotion";
import { loadFont } from "@remotion/google-fonts/Fredoka";
import type { Emotion, KidsScript, Scene, SfxName } from "./lib/types";
import { BRAND_OUTRO_SEC, COUNTDOWN_SEC, computeSchedule, musicVolume, toFrames, TRANSITION_FRAMES, type SceneSlot } from "./lib/timing";
import { getPalette, type Palette } from "./lib/palettes";
import { CENTER_X, FRIEND_X, GROUND_Y, MAIN_X } from "./lib/layout";
import { mouthAt } from "./lib/speech";
import { beatPhase, easeInOutSine, easeOutBack, easeOutCubic, hop } from "./lib/anim";
import { Background } from "./components/backgrounds/Background";
import { Character, characterBox } from "./components/characters/Character";
import { Karaoke } from "./components/Karaoke";
import { Callout, countTimes } from "./components/Callout";
import { QuestionOverlay } from "./components/Question";
import { Confetti, Flash, Floaters, FlyBy, Ripple, Sparkles } from "./components/Particles";
import { Camera, SceneTransition } from "./components/Transition";
import { Sfx, SfxLoop } from "./components/Sfx";
import { StarHud } from "./components/StarHud";
import { Countdown, EndCard, TitleCard, hopIn } from "./components/Cards";
import { MoralChant } from "./components/MoralChant";
import { VoxAudio, laughMouth, voxAt, voxEvents } from "./components/Vox";
import { fetchBaked, type BakedMap } from "./lib/baked";
import { BrandOutro } from "./components/BrandOutro";
import { sceneDirection } from "./lib/sceneDirection.mjs";
import { actionTrack, sampleAction, gagFrame, motionProfile, contactSounds, CONTACT_SFX } from "./lib/sceneMotion";
import { impactAt } from "./lib/actionMotion";

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

/** main character width per layout; friends and extras are a bit smaller */
const MAIN_W = 450;
const FRIEND_W = 370;
const EXTRA_W = 270;
const EXTRA_X = [230, 1700] as const;
/** seconds a character takes to hop in from the edge at the start of a scene */
const ENTER_SEC = 0.9;
/** Maximum story close-up, reduced by the scene's motion profile. */
const SHOT_ZOOM = 1.13;

/** the scene is a "cut" (new place or new people) — characters hop in instead of just being there */
function isCut(scene: Scene, prev: Scene | undefined): boolean {
  if (!prev) return true;
  return prev.background !== scene.background || prev.character !== scene.character;
}

/** flyby emoji that fits the place, unless the gag names one */
function flybyEmoji(scene: Scene): string {
  if (scene.gag?.emoji) return scene.gag.emoji;
  const bg = scene.background;
  if (/underwater|pond|beach/.test(bg)) return "🐠";
  if (/night|space|campfire/.test(bg)) return "🌠";
  if (/snow/.test(bg)) return "❄️";
  if (/candy|circus|playground|city|park/.test(bg)) return "🎈";
  if (/garden|meadow|farm|forest|jungle|autumn/.test(bg)) return "🦋";
  return "🐦";
}

const SceneView: React.FC<{
  scene: Scene;
  prev?: Scene;
  slot: SceneSlot;
  palette: Palette;
  slug: string;
  script: KidsScript;
  lead: number;
  index: number;
  baked?: BakedMap;
}> = ({ scene, prev, slot, palette, slug, script, lead, index, baked }) => {
  const rawFrame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const frame = rawFrame - lead; // true scene clock (negative during the transition overlap)
  const sceneT = Math.max(0, frame) / fps;
  const musicT = Math.max(0, slot.from + frame) / fps;
  const direction = sceneDirection(scene, script);
  const profile = motionProfile(direction);
  const bpm = script.music?.bpm ?? 120;
  const isQuestion = !!scene.question;
  const compact = script.type === "story";
  const upbeat = scene.energy === "upbeat";
  const party = profile.celebrate;
  const beat = beatPhase(musicT, bpm);
  const mainTrack = useMemo(() => actionTrack({...scene,direction}, slot, 'character', fps), [scene, direction, slot, fps]);
  const friendTrack = useMemo(() => actionTrack({...scene,direction}, slot, 'friend', fps), [scene, direction, slot, fps]);
  const mainMotion = sampleAction(mainTrack, frame, fps);
  const friendMotion = sampleAction(friendTrack, frame, fps);

  // ── which line is live, and is the character speaking right now? ──
  // (a slot starts `pre` frames before its speech when a recorded laugh leads into it)
  const active = slot.lines.find((l) => frame >= l.from - l.pre && frame < l.from - l.pre + l.duration) ?? null;
  const started = slot.lines.filter((l) => frame >= l.from - l.pre);
  const last = started[started.length - 1] ?? null;
  const ref = active ?? last;
  const lineIdx = ref ? slot.lines.indexOf(ref) : -1;
  const lineT = ref ? (frame - ref.from) / fps : 0; // negative while the lead-in recording plays
  const speechT = Math.max(0, lineT);
  const talking = !!ref && lineT >= 0 && lineT <= (ref.line.durationSec ?? 0);
  const friendSpeaks = talking && ref!.line.speaker === "friend";
  let mouth = talking && ref!.line.speaker === "character" ? mouthAt(ref!.line, lineT) : 0;
  let friendMouth = friendSpeaks ? mouthAt(ref!.line, lineT) : 0;

  // ── recorded vocalizations (giggles, gasps …) around the lines, on the raw sequence clock ──
  const vox = useMemo(
    () => slot.lines.flatMap((l, i) => voxEvents(l.line, lead + l.from, l.pre, `${slug}:${index}:${i}`)),
    [slot, lead, slug, index]
  );
  const voxHit = voxAt(vox, rawFrame, fps);
  const laugh = laughMouth(voxHit);
  const voxFriend = !!voxHit && voxHit.event.speaker === "friend";
  if (laugh !== null) {
    if (voxFriend) friendMouth = laugh;
    else mouth = laugh;
  }

  const inHold = isQuestion && frame >= slot.holdFrom && frame < slot.revealFrom;
  const inReveal = isQuestion && frame >= slot.revealFrom && frame < slot.praiseFrom;
  const danceBreak = !isQuestion && !active && frame >= slot.holdFrom && upbeat && !['tender','lullaby','thinking'].includes(direction);

  let emotion: Emotion = ref?.line.emotion ?? scene.emotion ?? (upbeat ? "excited" : "happy");
  const speakingMotion = friendSpeaks ? friendMotion : mainMotion;
  const action = speakingMotion.action;
  if (danceBreak) {
    emotion = "excited";
  }
  if (inHold) {
    emotion = "thinking";
  }
  if (inReveal) {
    const rt = (frame - slot.revealFrom) / fps;
    emotion = rt < 0.45 ? "surprised" : "excited";
  }
  let mainEmotion: Emotion = friendSpeaks ? (emotion === "sad" || emotion === "worried" ? "worried" : "happy") : emotion;
  if (laugh !== null && !voxFriend) mainEmotion = "excited";
  const mainAction = mainMotion.action;

  // ── layout ──
  const hasCallouts = isQuestion || scene.lines.some((l) => l.callout);
  const friend = scene.secondCharacter && scene.secondCharacter !== "none" ? scene.secondCharacter : null;
  const extras = (scene.extras ?? []).filter((k) => k && k !== "none" && k !== scene.character && k !== friend).slice(0, 2);
  const mainX = friend || hasCallouts ? MAIN_X : CENTER_X - 90;
  const mainBox = characterBox(mainX, GROUND_Y, MAIN_W);
  const headY = GROUND_Y - MAIN_W * 1.15;
  const friendHeadY = GROUND_Y - FRIEND_W * 1.15;

  // ── entrances: hop in from the edge on a cut ──
  const cut = isCut(scene, prev);
  // alternate the side the hero comes from (always from the left when a friend is waiting on the right)
  const enterDir: 1 | -1 = friend || index % 2 === 0 ? 1 : -1;
  const enterDistance = enterDir === 1 ? mainX + 320 : 1920 - mainX + 320;
  const mainEnter = profile.entrance && cut && scene.transition !== "slide" ? hopIn(sceneT, enterDir, enterDistance, ENTER_SEC) : { dx: 0, dy: 0 };
  const friendCut = !!friend && (!prev || prev.secondCharacter !== friend || cut);
  const friendEnter = profile.entrance && friendCut ? hopIn(sceneT - 0.12, -1, 1920 - FRIEND_X + 300, ENTER_SEC) : { dx: 0, dy: 0 };

  // ── camera: eased speaker framing, praise accents and musical celebration pulses ──
  const shotFor = (i: number) => (compact && !isQuestion && i >= 0 ? 1 + (SHOT_ZOOM-1)*profile.camera : 1);
  const target = shotFor(lineIdx);
  const before = shotFor(lineIdx - 1);
  const shotK = ref ? easeInOutSine(Math.max(0,Math.min(1, lineT / 0.45))) : 0;
  const shotZoom = ref && !inHold && !inReveal && !danceBreak ? before + (target - before) * shotK : 1;
  const speakerOrigin = (i:number) => slot.lines[i]?.line.speaker === 'friend' && friend ? {x:FRIEND_X,y:friendHeadY+40} : {x:mainX,y:headY+60};
  const fromOrigin=speakerOrigin(lineIdx-1), toOrigin=speakerOrigin(lineIdx);
  const origin={x:fromOrigin.x+(toOrigin.x-fromOrigin.x)*shotK,y:fromOrigin.y+(toOrigin.y-fromOrigin.y)*shotK};
  const linePunch = active?.line.role === 'praise' ? 0.012 * Math.exp(-speechT * 8)*profile.camera : 0;
  const beatPulse = party && upbeat ? 0.008 * hop(beat.beats) : 0;

  // ── impact shake & reveal punch ──
  const motionImpact = (motion:typeof mainMotion) => {
    const current = ['jump','stomp'].includes(motion.action) ? impactAt(motion.action,motion.t)*motion.blend : 0;
    const previous = motion.previousAction;
    const landing = previous && ['jump','stomp'].includes(previous.action) ? impactAt(previous.action,previous.t+motion.t)*(1-motion.blend) : 0;
    return Math.max(current,landing);
  };
  const shake = 4 * Math.max(motionImpact(mainMotion),friend ? motionImpact(friendMotion) : 0)*profile.camera;
  const punch = inReveal ? 0.04 * Math.exp(-((frame - slot.revealFrom) / fps) * 5) : 0;

  // ── gags: peek-a-boo from an edge, or an emoji flying past ──
  const gag = scene.gag;
  const scheduledGag = gagFrame(gag,slot,fps);
  const gagStart = scheduledGag ?? -1;
  const gagT = gag ? (frame - gagStart) / fps : -1;
  const gagFits = !!gag && scheduledGag !== null;
  const peek = gag?.kind === "peek" && gagFits && gagT >= 0 && gagT < 2.6;
  const peekSide = gag?.side === "left" ? -1 : 1;
  const peekSlide = 340 * (1 - easeOutBack(Math.min(1, gagT / 0.45))) + (gagT > 1.9 ? 400 * easeOutCubic((gagT - 1.9) / 0.7) : 0);
  const peekX = peekSide === 1 ? 1790 + peekSlide : 130 - peekSlide;
  const flyby = gag?.kind === "flyby" && gagFits;

  // ── mood: sad beats get a cool tint so the feeling reads even without words ──
  const sadNow = (emotion === "sad" || emotion === "worried") && !inReveal;
  const sadK = sadNow ? Math.min(1, Math.max(0, lineT) / 0.5) : 0;

  // ── floating emoji by mood ──
  const partyFloaters = [["🎵", "🎶"], ["⭐", "✨"], ["🎵", "💫"], ["🎶", "🌟"]][index % 4];
  const tender = emotion !== "sad" && emotion !== "worried"; // a worried hug (clutching the basket) gets no hearts
  const floaters =
    (action === "hug" && tender) || emotion === "love" ? "❤️" : action === "sleep" ? "💤" : action === "dance" || scene.kind === "chorus" ? partyFloaters : action === "cry" ? "💧" : null;

  // ── the moral chant: both rhyme lines held up big, with a "Say it with me!" prompt ──
  const isChant = scene.kind === "moral" && scene.energy === "upbeat";
  const chantLines = isChant ? scene.lines.filter((l) => l.role === "moral" && !/say it with me/i.test(l.text)).map((l) => l.text) : [];
  const sayIt = isChant ? scene.lines.find((l) => /say it with me/i.test(l.text)) : null;
  const sayItSlot = sayIt ? slot.lines.find((l) => l.line === sayIt) : null;
  const chantActive =
    active && chantLines.includes(active.line.text) ? { index: chantLines.indexOf(active.line.text), words: active.line.words, t: lineT } : null;
  const prompt = isChant && !!sayItSlot && danceBreak;
  const promptT = sayItSlot ? (frame - (sayItSlot.from + sayItSlot.duration)) / fps : 0;

  // clap/pop sound timings depend only on the scene's lines, not on the frame
  const { contacts, pops } = useMemo(() => {
    const contacts = [...contactSounds(mainTrack,slot,'character',fps), ...contactSounds(friendTrack,slot,'friend',fps)];
    const pops: number[] = [];
    for (const l of slot.lines) {
      const co = l.line.callout;
      if (co && co.kind === "count") {
        for (const sec of countTimes(co, l.line.words, l.line.durationSec ?? 2)) pops.push(l.from + toFrames(sec));
      } else if (co && !(l.line.sfx ?? []).includes("pop")) {
        pops.push(l.from + 4);
      }
    }
    return { contacts, pops };
  }, [slot,mainTrack,friendTrack,fps]);
  const transitionSfx = profile.entrance ? TRANSITION_SFX[scene.transition ?? "pop"] : null;

  const renderExtra = (kind: string, i: number) => {
    const x = EXTRA_X[i];
    if (i === 1 && (hasCallouts || friend)) return null;
    const dir: 1 | -1 = i === 0 ? 1 : -1;
    const { dx, dy } = hopIn(sceneT - 0.2 - i * 0.1, dir, 700, ENTER_SEC);
    return (
      <div key={`extra${i}`} style={{ position: "absolute", ...characterBox(x, GROUND_Y + 30, EXTRA_W), transform: `translate(${dx}px, ${dy}px)` }}>
        <Character kind={kind} emotion={party ? 'excited' : 'happy'} action={party ? "dance" : "idle"} width={EXTRA_W} flip={dir === -1} actionT={sceneT} musicT={musicT} clockT={musicT} motionScale={profile.amplitude} bpm={bpm} groove={party} />
      </div>
    );
  };

  return (
    <AbsoluteFill>
      <Camera kind={scene.camera ?? "still"} duration={slot.duration} frameOffset={-lead} shake={shake} punch={punch} zoom={shotZoom + linePunch + beatPulse} origin={origin}>
        <Background kind={scene.background} palette={palette} frameOffset={slot.from-lead} motion={profile.ambient} baked={baked} />
        {sadK > 0 ? <AbsoluteFill style={{ background: "#3b4fa0", opacity: 0.16 * sadK }} /> : null}
        {party ? (
          // a soft spotlight behind the hero, breathing on the beat
          <div style={{ position: "absolute", left: mainX - 520, top: headY - 260, width: 1040, height: 1040, borderRadius: 999, background: "radial-gradient(circle, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.06) 35%, rgba(255,255,255,0) 68%)", transform: `scale(${0.92 + 0.1 * hop(beat.beats)})`, pointerEvents: "none" }} />
        ) : null}
        {party && !hasCallouts ? <Sparkles count={6} seed={index} /> : null}
        {extras.map(renderExtra)}
        {friend ? (
          <div style={{ position: "absolute", ...characterBox(FRIEND_X, GROUND_Y, FRIEND_W), transform: `translate(${friendEnter.dx}px, ${friendEnter.dy}px)` }}>
            <Character
              kind={friend}
              emotion={laugh !== null && voxFriend ? "excited" : friendSpeaks ? emotion : emotion === "thinking" ? "happy" : emotion === "sad" || emotion === "worried" ? "happy" : emotion}
              action={friendMotion.action}
              mouth={friendMouth}
              width={FRIEND_W}
              flip
              actionT={friendMotion.t}
              previousAction={friendMotion.previousAction}
              blend={friendMotion.blend}
              musicT={musicT}
              clockT={musicT}
              motionScale={profile.amplitude}
              gaze={!friendSpeaks && !inHold && !inReveal ? {x:-4,y:0} : {x:0,y:0}}
              bpm={bpm}
              groove={party}
            />
          </div>
        ) : null}
        <div style={{ position: "absolute", ...mainBox, transform: `translate(${mainEnter.dx}px, ${mainEnter.dy}px)` }}>
          <Character kind={scene.character} emotion={mainEmotion} action={mainAction} mouth={mouth} actionT={mainMotion.t} previousAction={mainMotion.previousAction} blend={mainMotion.blend} musicT={musicT} clockT={musicT} motionScale={profile.amplitude} gaze={friendSpeaks ? {x:4,y:0} : inHold ? {x:0,y:-2} : {x:0,y:0}} bpm={bpm} width={MAIN_W} groove={party} />
        </div>
        {peek ? (
          <div style={{ position: "absolute", ...characterBox(peekX, GROUND_Y + 10, 300) }}>
            <Character kind={gag!.character ?? "bear"} emotion="excited" action="wave" width={300} flip={peekSide === 1} actionT={gagT} clockT={musicT} musicT={musicT} bpm={bpm} />
          </div>
        ) : null}
        {flyby ? <FlyBy emoji={flybyEmoji(scene)} from={lead + gagStart} dir={gag?.side === "left" ? 1 : -1} y={scene.kind === "chorus" ? 150 : 230} size={140} /> : null}
        {!isQuestion
          ? slot.lines.filter((l) => l.line.role === "praise").map((l, i) => <Confetti key={`pc${i}`} from={lead + l.from + 2} x={mainX} y={headY} count={40} />)
          : null}
        {floaters && !inHold && !hasCallouts ? <Floaters emoji={floaters} x={mainX} y={action === "cry" ? headY + 120 : headY} count={party ? 5 : 2} seed={index} dir={action === "cry" ? -1 : 1} size={action === "cry" ? 44 : 64} /> : null}
      </Camera>

      {active && active.line.callout && !inHold ? (
        <Callout spec={active.line.callout} words={active.line.words} t={lineT} lineSec={active.line.durationSec ?? 2} palette={palette} area={friend ? "top" : "right"} />
      ) : null}

      {isQuestion && frame >= 0 ? (
        // the overlay animates off the raw sequence frame, which runs `lead` frames ahead of the scene clock
        <>
          <Flash from={lead + slot.revealFrom} strength={0.45} />
          <Ripple from={lead + slot.revealFrom} x={friend ? 960 : 1470} y={friend ? 260 : 460} color="#fff" size={760} />
          <QuestionOverlay spec={scene.question!} palette={palette} holdFrom={lead + slot.holdFrom} revealFrom={lead + slot.revealFrom} holdDuration={slot.holdDuration} revealDuration={slot.revealDuration} bubbleX={mainX + 120} bubbleY={headY - 60} compact={!!friend} />
        </>
      ) : null}

      {isChant ? (
        <MoralChant rhyme={chantLines} active={chantActive} prompt={prompt} promptT={promptT} palette={palette} bpm={bpm} sceneT={sceneT} />
      ) : null}
      {!isChant ? (
        active ? (
          <Karaoke line={active.line} palette={palette} t={lineT} size={compact ? "small" : "big"} />
        ) : inHold && last ? (
          // keep the question on screen while the child thinks
          <Karaoke line={last.line} palette={palette} t={999} size={compact ? "small" : "big"} />
        ) : null
      ) : active && !chantLines.includes(active.line.text) ? (
        // chant banner carries the rhyme lines; other lines (e.g. "Hooray!") keep the bottom pill
        <Karaoke line={active.line} palette={palette} t={lineT} size="small" />
      ) : null}

      {/* ── audio: voice lines + sound effects (frames relative to this sequence) ── */}
      {slot.lines.map((l, i) =>
        l.line.audio ? (
          <Sequence key={i} from={lead + l.from} durationInFrames={l.duration} name={`Line: ${l.line.text.slice(0, 24)}`}>
            <Audio src={staticFile(`generated/${slug}/${l.line.audio}`)} />
          </Sequence>
        ) : null
      )}
      <VoxAudio events={vox} />
      {transitionSfx ? <Sfx name={transitionSfx} at={0} volume={0.45} /> : null}
      {slot.lines.flatMap((l, i) =>
        (l.line.sfx ?? []).filter((s) => s !== (l.line.action && CONTACT_SFX[l.line.action])).map((s, k) => <Sfx key={`${i}-${k}`} name={s} at={lead + l.from + (s === "applause" ? 6 : 2)} volume={s === "applause" ? 0.55 : s === "tada" ? 0.7 : 0.65} />)
      )}
      {contacts.map(({at,name}, i) => <Sfx key={`contact${i}`} name={name} at={lead + at} volume={0.48} />)}
      {pops.map((at, i) => <Sfx key={`pop${i}`} name="pop" at={lead + at} volume={0.5} />)}
      {isQuestion ? (
        <>
          <SfxLoop name="ticktock" from={lead + slot.holdFrom} duration={slot.holdDuration} volume={0.4} />
          <Sfx name="drumroll" at={lead + slot.holdFrom + Math.max(0, slot.holdDuration - toFrames(1.1))} volume={0.35} />
          <Sfx name="ding" at={lead + slot.revealFrom} volume={0.85} />
          <Sfx name="sparkle" at={lead + slot.revealFrom + 4} volume={0.7} />
          <Sfx name="coin" at={lead + slot.praiseFrom + 4} volume={0.7} />
        </>
      ) : null}
      {gag && gagFits ? <Sfx name={gag.kind === "flyby" ? "whoosh" : "boing"} at={lead + gagStart} volume={gag.kind === "flyby" ? 0.3 : 0.5} /> : null}
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
        <Sequence durationInFrames={schedule.brandFrom} name="Episode music">
          <Audio loop loopVolumeCurveBehavior="extend" src={staticFile(`music/${script.music.file}`)} volume={(f) => musicVolume(f, schedule)} name="music" />
        </Sequence>
      ) : null}

      <Sequence durationInFrames={schedule.intro + T} name="Title">
        <TitleCard script={script} palette={palette} slug={slug} countdownFrom={schedule.countdownFrom} baked={baked} />
      </Sequence>

      {script.scenes.map((scene, i) => {
        const slot = schedule.scenes[i];
        return (
          <Sequence key={i} from={slot.from - T} durationInFrames={slot.duration + 2 * T} name={`Scene ${i + 1}: ${scene.kind ?? ""} ${scene.background}`}>
            <SceneTransition kind={scene.transition ?? "pop"} frames={T}>
              <SceneView scene={scene} prev={script.scenes[i - 1]} slot={slot} palette={palette} slug={slug} script={script} lead={T} index={i} baked={baked} />
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

      {/* "Ready… set… GO!" sits above the title card AND the first scene popping in */}
      <Sequence from={schedule.countdownFrom} durationInFrames={toFrames(COUNTDOWN_SEC) + 24} name="Countdown">
        <Countdown script={script} palette={palette} />
      </Sequence>

      <Sequence from={schedule.brandFrom} durationInFrames={toFrames(BRAND_OUTRO_SEC)} name="Dreamy Discoveries">
        <BrandOutro />
      </Sequence>

      {starsTotal > 0 ? (
        <Sequence from={schedule.intro} durationInFrames={schedule.endFrom - schedule.intro} name="Stars">
          <StarHud total={starsTotal} earnedAt={earnedAt.map((f) => f - schedule.intro)} />
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
};
