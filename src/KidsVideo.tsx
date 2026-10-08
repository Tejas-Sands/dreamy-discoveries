import React, { useMemo } from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig, type CalculateMetadataFunction } from "remotion";
import {fontFamily, fontsReady} from "./lib/fonts";
import type { Emotion, KidsScript, Scene, SfxName } from "./lib/types";
import { BRAND_OUTRO_SEC, COUNTDOWN_SEC, FPS, computeSchedule, musicVolume, toFrames, TRANSITION_FRAMES, type SceneSlot } from "./lib/timing";
import { getPalette, type Palette } from "./lib/palettes";
import { CENTER_X, FRIEND_X, GROUND_Y, MAIN_X } from "./lib/layout";
import { mouthAt, mouthShapeAt } from "./lib/speech";
import {preparePerformance,samplePerformance} from './lib/acting';
import { beatPhase, easeInOutSine, easeOutBack, easeOutCubic, hop } from "./lib/anim";
import { Background, BackgroundForeground } from "./components/backgrounds/Background";
import { Character, characterBox } from "./components/characters/Character";
import { REACHABLE_KINDS, speciesKind } from './components/characters/performanceProfiles';
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
import { actionTrack, sampleAction, gagFrame, motionProfile, contactSounds, CONTACT_SFX, emotionalPushIn, actorEmotion, actorRole, ambientTimeline, ambientAt } from "./lib/sceneMotion";
import { impactAt } from "./lib/actionMotion";
import {prepareStage,sampleStage,stageMotion} from '../scripts/lib/staging.mjs';
import {StageProps} from './components/StageProps';
import {stageCamera,stageGaze,cinematicCamera,cinematicGaze,storyFocus} from './lib/stageCamera';
import {EnvironmentReaction} from './components/EnvironmentReaction';
import {MusicBed} from './components/MusicBed';
import {sceneScore,scoreSections} from './lib/score';


export type KidsVideoProps = {
  slug: string;
  script: KidsScript | null;
  /** baked scenery PNGs (public/baked/manifest.json), filled in by calculateMetadata */
  baked?: BakedMap;
  /** Developer comparisons can display a second view without duplicating audio. */
  muted?: boolean;
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
  await fontsReady;
  const res = await fetch(staticFile(`generated/${props.slug}/script.json`));
  if (!res.ok) {
    throw new Error(`Could not load script for slug "${props.slug}" — run the generate + tts steps first.`);
  }
  const script = withDefaults((await res.json()) as KidsScript);
  const schedule = computeSchedule(script);
  const baked = await fetchBaked();
  return { durationInFrames: schedule.total, props: { ...props, script, baked } };
};

const TRANSITION_SFX: Record<string, SfxName | null> = { none: null, pop: "pop", slide: "slide", iris: "whoosh", wipe: "whoosh", fade: null,leaf:'whoosh',page:'slide',ripple:'bubble' };

/** A brief heading leaves the first story action visible from the opening frame. */
const HookTitle: React.FC<{title: string}> = ({title}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const opacity = Math.min(1, Math.max(0, (2.8 - frame / fps) / 0.4));
  return <div style={{position:'absolute',left:64,top:34,maxWidth:1200,padding:'14px 28px',borderRadius:28,
    background:'#fff7e8ed',color:'#4d3b69',fontSize:40,lineHeight:1.2,opacity,pointerEvents:'none'}}>{title}</div>;
};

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
  ambientT?: number;
  scoreStart?: number;
  muted?: boolean;
}> = ({ scene, prev, slot, palette, slug, script, lead, index, baked, ambientT,scoreStart=0,muted=false }) => {
  const rawFrame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const frame = rawFrame - lead; // true scene clock (negative during the transition overlap)
  const sceneT = Math.max(0, frame) / fps;
  const absoluteT = Math.max(0,slot.from+frame)/fps;
  const musicT = Math.max(0, slot.from + frame-scoreStart) / fps;
  const direction = sceneDirection(scene, script);
  const profile = motionProfile(direction);
  const bpm = (script.presentationVersion??0)>=2 ? sceneScore(scene,script)?.bpm??120 : script.music?.bpm ?? 120;
  const preparedStage=useMemo(()=>(script.presentationVersion??0)>=2?prepareStage(scene,slot,fps):null,[scene,slot,fps,script.presentationVersion]);
  const stage=sampleStage(preparedStage,Math.max(0,frame));
  const expressive = (script.presentationVersion ?? 0) >= 3;
  // Carried props stay attached to the solved paw/wing and receive a finger overlap.
  const heldBy = (role:'character'|'friend') => {
    const owner=stage?.actors[role]?.owner;
    if(!expressive||!owner||!REACHABLE_KINDS.has(speciesKind(owner)))return undefined;
    const prop=stage?.props.find(prop=>!prop.hidden&&prop.owner===owner);
    return prop?{...prop,size:prop.kind==='basket'?1.45:1.3}:undefined;
  };
  const mainHeld=heldBy('character'),friendHeld=heldBy('friend');
  const focus = expressive ? storyFocus(scene,slot,Math.max(0,frame),fps,preparedStage?.events) : 0;
  const backgroundMotion = profile.ambient * (1 - .75 * focus);
  const mainStage=stage?.actors.character,friendStage=stage?.actors.friend;
  const environmentEvents=useMemo(()=>preparedStage?.events.map(event=>{
    const sample=sampleStage(preparedStage,event.until),prop=sample?.props.find(p=>p.id===event.propId);
    const kind=/pond|water|beach/.test(scene.background)?'ripple' as const:/forest|garden|meadow|autumn/.test(scene.background)?'leaf' as const:'sparkle' as const;
    return {from:event.until,kind,x:prop?.x??960,y:850};
  })??[],[preparedStage,scene.background]);
  const isQuestion = !!scene.question;
  const compact = script.type === "story";
  const upbeat = scene.energy === "upbeat";
  const party = profile.celebrate;
  const beat = beatPhase(musicT, bpm);
  const mainTrack = useMemo(() => actionTrack({...scene,direction}, slot, 'character', fps), [scene, direction, slot, fps]);
  const friendTrack = useMemo(() => actionTrack({...scene,direction}, slot, 'friend', fps), [scene, direction, slot, fps]);
  const mainMotion = sampleAction(mainTrack, frame, fps);
  const friendMotion = sampleAction(friendTrack, frame, fps);
  const stagedMainMotion=stageMotion(mainStage,mainMotion),stagedFriendMotion=stageMotion(friendStage,friendMotion);

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
  
  const speakerRole = actorRole(scene,ref?.line.speaker) ?? ref?.line.speaker ?? "narrator";
  const speakerKind = speakerRole === "character" ? scene.character : speakerRole === "friend" ? (scene.secondCharacter || "") : speakerRole;
  
  const getMouth = (kind: string) => (talking && speakerKind === kind ? mouthAt(ref!.line, lineT) : 0);
  
  const mainSpeaks = talking && speakerKind === scene.character;
  const friendSpeaks = talking && (speakerRole === "friend" || speakerKind === scene.secondCharacter);

  let mouth = getMouth(scene.character);
  let friendMouth = friendSpeaks || (scene.secondCharacter && speakerKind === scene.secondCharacter) ? getMouth(scene.secondCharacter!) : 0;

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
  if ((script.presentationVersion ?? 0) >= 1) mainEmotion = danceBreak ? 'excited' : actorEmotion(scene,slot,'character',frame,fps);
  if (laugh !== null && !voxFriend) mainEmotion = "excited";
  const friendEmotion = laugh !== null && voxFriend ? 'excited' : (script.presentationVersion ?? 0) >= 1
    ? danceBreak ? 'excited' : actorEmotion(scene,slot,'friend',frame,fps)
    : friendSpeaks ? emotion : emotion === 'thinking' || emotion === 'sad' || emotion === 'worried' ? 'happy' : emotion;
  const performanceTracks=useMemo(()=>expressive?{
    character:preparePerformance(scene,slot,'character',fps,script.presentationVersion),
    friend:preparePerformance(scene,slot,'friend',fps,script.presentationVersion),
  }:null,[expressive,scene,slot,fps,script.presentationVersion]);
  const mainPerformance = performanceTracks ? samplePerformance(performanceTracks.character,frame) : undefined;
  const friendPerformance = performanceTracks ? samplePerformance(performanceTracks.friend,frame) : undefined;
  if (mainPerformance && (danceBreak || laugh !== null && !voxFriend)) mainPerformance.emotion = 'excited';
  if (friendPerformance && (danceBreak || laugh !== null && voxFriend)) friendPerformance.emotion = 'excited';
  const mainView = expressive && stage ? cinematicGaze(stage,scene,slot,'character',Math.max(0,frame),fps,preparedStage?.events,at=>sampleStage(preparedStage,at)) : undefined;
  const friendView = expressive && stage ? cinematicGaze(stage,scene,slot,'friend',Math.max(0,frame),fps,preparedStage?.events,at=>sampleStage(preparedStage,at)) : undefined;
  const previousStage = expressive && frame > 0 ? sampleStage(preparedStage,frame - 1) : null;
  const turnVelocity = (role:'character'|'friend',view:typeof mainView) => previousStage && view
    ? (view.turn - cinematicGaze(previousStage,scene,slot,role,frame - 1,fps,preparedStage?.events,at=>sampleStage(preparedStage,at)).turn) * fps : 0;
  const mainAction = mainMotion.action;

  // ── layout ──
  const hasCallouts = isQuestion || scene.lines.some((l) => l.callout);
  const friend = scene.secondCharacter && scene.secondCharacter !== "none" ? scene.secondCharacter : null;
  const extras = (scene.extras ?? []).filter((k) => k && k !== "none" && k !== scene.character && k !== friend).slice(0, 2);
  const mainX = mainStage?.x ?? (friend || hasCallouts ? MAIN_X : CENTER_X - 90);
  const friendX = friendStage?.x ?? FRIEND_X;
  const mainBox = characterBox(mainX, mainStage?.y??GROUND_Y, MAIN_W);
  const headY = GROUND_Y - MAIN_W * 1.15;
  const friendHeadY = GROUND_Y - FRIEND_W * 1.15;

  // ── entrances: hop in from the edge on a cut ──
  const hook = (script.presentationVersion ?? 0) >= 1 && index === 0 && script.opening === 'hook';
  const cut = isCut(scene, prev) && !hook;
  // alternate the side the hero comes from (always from the left when a friend is waiting on the right)
  const enterDir: 1 | -1 = friend || index % 2 === 0 ? 1 : -1;
  const enterDistance = enterDir === 1 ? mainX + 320 : 1920 - mainX + 320;
  const mainEnter = !stage && profile.entrance && cut && scene.transition !== "slide" ? hopIn(sceneT, enterDir, enterDistance, ENTER_SEC) : { dx: 0, dy: 0 };
  const friendCut = !!friend && (!prev || prev.secondCharacter !== friend || cut) && !hook;
  const friendEnter = !stage && profile.entrance && friendCut ? hopIn(sceneT - 0.12, -1, 1920 - FRIEND_X + 300, ENTER_SEC) : { dx: 0, dy: 0 };

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

  // Camera drift and emotional push-in
  const isEmotional = ref?.line.emotion === "sad" || ref?.line.emotion === "love" || ref?.line.emotion === "worried" || ref?.line.emotion === "thinking";
  const cameraMotion = scene.camera === 'still' ? 0 : profile.camera;
  const pushIn = isEmotional && ref ? emotionalPushIn(lineT, ref.line.durationSec ?? 2) * cameraMotion : 0;
  const driftX = Math.sin(sceneT * 0.4) * 8 * cameraMotion;
  const driftY = Math.sin(sceneT * 0.3) * 5 * cameraMotion;

  const cinematicFraming=stage && expressive
    ? cinematicCamera(stage,scene,slot,Math.max(0,frame),fps,preparedStage?.events,at=>sampleStage(preparedStage,at)) : null;
  const framing=cinematicFraming ?? (stage ? stageCamera(stage,scene,slot,Math.max(0,frame),fps,preparedStage?.events) : null);
  const finalZoom = framing?.zoom ?? (shotZoom + linePunch + beatPulse + pushIn);
  const finalOrigin = framing?.origin ?? { x: origin.x + driftX, y: origin.y + driftY };
  const parallax=stage?{x:(finalOrigin.x-960)*.025,y:(finalOrigin.y-565)*.012}:undefined;

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
    const contacts = [...contactSounds(mainTrack,slot,'character',fps,scene), ...contactSounds(friendTrack,slot,'friend',fps,scene)];
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
  }, [slot,mainTrack,friendTrack,fps,scene]);
  const transitionSfx = profile.entrance ? TRANSITION_SFX[scene.transition ?? "pop"] : null;

  const renderExtra = (kind: string, i: number) => {
    const x = EXTRA_X[i];
    if (i === 1 && (hasCallouts || friend)) return null;
    const dir: 1 | -1 = i === 0 ? 1 : -1;
    const { dx, dy } = hopIn(sceneT - 0.2 - i * 0.1, dir, 700, ENTER_SEC);
    
    const isSpeaking = speakerKind === kind;
    const extraMouth = getMouth(kind);
    const extraEmotion = isSpeaking ? emotion : party ? 'excited' : 'happy';

    return (
      <div key={`extra${i}`} style={{ position: "absolute", ...characterBox(x, GROUND_Y + 30, EXTRA_W), transform: `translate(${dx}px, ${dy}px)` }}>
        <Character kind={kind} emotion={extraEmotion} action={party ? "dance" : "idle"} mouth={extraMouth} width={EXTRA_W} flip={dir === -1} actionT={sceneT} musicT={musicT} clockT={musicT} motionScale={profile.amplitude} bpm={bpm} groove={party} />
      </div>
    );
  };

  return (
    <AbsoluteFill>
      <Camera kind={scene.camera ?? "still"} duration={slot.duration} frameOffset={-lead} shake={shake} punch={punch} zoom={finalZoom} origin={finalOrigin} pan={cinematicFraming?.pan}>
        <Background kind={scene.background} palette={palette} frameOffset={slot.from-lead} motion={backgroundMotion} splitForeground={!!stage} parallax={parallax}
          animationT={ambientT} baked={baked} />
        {sadK > 0 ? <AbsoluteFill style={{ background: "#3b4fa0", opacity: 0.16 * sadK }} /> : null}
        {party ? (
          // a soft spotlight behind the hero, breathing on the beat
          <div style={{ position: "absolute", left: mainX - 520, top: headY - 260, width: 1040, height: 1040, borderRadius: 999, background: "radial-gradient(circle, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.06) 35%, rgba(255,255,255,0) 68%)", transform: `scale(${0.92 + 0.1 * hop(beat.beats)})`, pointerEvents: "none" }} />
        ) : null}
        {party && !hasCallouts ? <Sparkles count={6} seed={index} /> : null}
        {extras.map(renderExtra)}
        {friend ? (
          <div style={{ position: "absolute", ...characterBox(friendX, friendStage?.y??GROUND_Y, FRIEND_W), transform: `translate(${friendEnter.dx}px, ${friendEnter.dy}px)` }}>
            <Character
              kind={friend}
              emotion={friendEmotion}
              performance={friendPerformance}
              mouthShape={expressive ? laugh !== null && voxFriend ? 'open' : friendSpeaks ? mouthShapeAt(ref?.line,lineT) : 'rest' : undefined}
              turn={friendView ? friendView.turn * ((friendStage?.flip ?? true) ? -1 : 1) : undefined}
              turnVelocity={friendView ? turnVelocity('friend',friendView) * ((friendStage?.flip ?? true) ? -1 : 1) : undefined}
              action={stagedFriendMotion.action}
              mouth={friendMouth}
              width={FRIEND_W}
              flip={friendStage?.flip??true}
              actionT={stagedFriendMotion.t}
              previousAction={stagedFriendMotion.previousAction}
              blend={stagedFriendMotion.blend}
              musicT={musicT}
              clockT={absoluteT}
              stageCenter={friendStage?{x:friendStage.x,y:friendStage.y}:undefined}
              reach={stage?.reaches.friend}
              heldProp={friendHeld}
              motionScale={profile.amplitude}
              gaze={friendView?.gaze ?? (stage?inReveal?{x:0,y:0}:stageGaze(stage,'friend',friendSpeaks,inHold):!friendSpeaks && !inHold && !inReveal ? {x:-4,y:0} : {x:0,y:0})}
              bpm={bpm}
              groove={party}
            />
          </div>
        ) : null}
        <div style={{ position: "absolute", ...mainBox, transform: `translate(${mainEnter.dx}px, ${mainEnter.dy}px)` }}>
          <Character kind={scene.character} emotion={mainEmotion} performance={mainPerformance}
            heldProp={mainHeld}
            mouthShape={expressive ? laugh !== null && !voxFriend ? 'open' : mainSpeaks ? mouthShapeAt(ref?.line,lineT) : 'rest' : undefined}
              turn={mainView ? mainView.turn * ((mainStage?.flip ?? false) ? -1 : 1) : undefined}
              turnVelocity={mainView ? turnVelocity('character',mainView) * ((mainStage?.flip ?? false) ? -1 : 1) : undefined}
            action={stagedMainMotion.action} mouth={mouth} actionT={stagedMainMotion.t} previousAction={stagedMainMotion.previousAction} blend={stagedMainMotion.blend} flip={mainStage?.flip??false} stageCenter={mainStage?{x:mainStage.x,y:mainStage.y}:undefined} reach={stage?.reaches.character} musicT={musicT} clockT={absoluteT} motionScale={profile.amplitude} gaze={mainView?.gaze ?? (stage?inReveal?{x:0,y:0}:stageGaze(stage,'character',mainSpeaks,inHold):friendSpeaks ? {x:4,y:0} : inHold ? {x:0,y:-2} : {x:0,y:0})} bpm={bpm} width={MAIN_W} groove={party} />
        </div>
        {stage?<StageProps props={stage.props.filter(prop=>prop.id!==mainHeld?.id&&prop.id!==friendHeld?.id)} events={preparedStage?.events} frame={Math.max(0,frame)} fps={fps} quiet={['tender','lullaby','thinking'].includes(direction)}/>:null}
        {peek ? (
          <div style={{ position: "absolute", ...characterBox(peekX, GROUND_Y + 10, 300) }}>
            <Character kind={gag!.character ?? "bear"} emotion="excited" action="wave" width={300} flip={peekSide === 1} actionT={gagT} clockT={musicT} musicT={musicT} bpm={bpm} />
          </div>
        ) : null}
        {flyby ? <FlyBy emoji={flybyEmoji(scene)} from={lead + gagStart} dir={gag?.side === "left" ? 1 : -1} y={scene.kind === "chorus" ? 150 : 230} size={140} /> : null}
        {!isQuestion
          ? slot.lines.filter((l) => l.line.role === "praise").map((l, i) => <Confetti key={`pc${i}`} from={lead + l.from + 2} x={mainX} y={headY} count={40} />)
          : null}
        {floaters && !inHold && !hasCallouts && focus < .5 ? <Floaters emoji={floaters} x={mainX} y={action === "cry" ? headY + 120 : headY} count={party ? 5 : 2} seed={index} dir={action === "cry" ? -1 : 1} size={action === "cry" ? 44 : 64} /> : null}
        {stage?<><EnvironmentReaction background={scene.background} events={environmentEvents} quiet={['tender','lullaby','thinking'].includes(direction)} frameOffset={-lead}/><BackgroundForeground kind={scene.background} palette={palette} frameOffset={slot.from-lead} motion={backgroundMotion} animationT={ambientT} parallax={parallax}/></>:null}
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
          <Karaoke line={active.line} palette={palette} t={lineT} size={compact ? "small" : "big"} presentationVersion={script.presentationVersion} />
        ) : inHold && last ? (
          // keep the question on screen while the child thinks
          <Karaoke line={last.line} palette={palette} t={999} size={compact ? "small" : "big"} presentationVersion={script.presentationVersion} />
        ) : null
      ) : active && !chantLines.includes(active.line.text) ? (
        // chant banner carries the rhyme lines; other lines (e.g. "Hooray!") keep the bottom pill
        <Karaoke line={active.line} palette={palette} t={lineT} size="small" presentationVersion={script.presentationVersion} />
      ) : null}

      {/* ── audio: voice lines + sound effects (frames relative to this sequence) ── */}
      {!muted ? <>
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
      </> : null}
    </AbsoluteFill>
  );
};

export const KidsVideo: React.FC<KidsVideoProps> = ({ slug, script: rawScript, baked, muted=false }) => {
  const episodeFrame = useCurrentFrame();
  const script = useMemo(() => rawScript ? withDefaults(rawScript) : null, [rawScript]);
  const schedule = useMemo(() => script ? computeSchedule(script) : null, [script]);
  const scores=useMemo(()=>script&&schedule&&(script.presentationVersion??0)>=2?scoreSections(script,schedule):[],[script,schedule]);
  const ambient = useMemo(() => {
    const rates = script?.scenes.map(scene => motionProfile(sceneDirection(scene,script)).ambient) ?? [];
    return {rates,starts:schedule ? ambientTimeline(schedule.scenes,rates,FPS) : []};
  }, [script,schedule]);
  if (!script || !schedule) {
    return (
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", fontSize: 40, background: "#222", color: "#fff" }}>
        Waiting for script.json…
      </AbsoluteFill>
    );
  }
  const palette = getPalette(script.palette);
  const ambientT = (script.presentationVersion ?? 0) >= 1 ? ambientAt(schedule.scenes,ambient.rates,ambient.starts,episodeFrame,FPS) : undefined;
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
      {!muted ? (script.presentationVersion??0)>=2?<MusicBed script={script} schedule={schedule}/>:script.music?.file ? (
        <Sequence durationInFrames={schedule.brandFrom} name="Episode music">
          <Audio loop loopVolumeCurveBehavior="extend" src={staticFile(`music/${script.music.file}`)} volume={(f) => musicVolume(f, schedule)} name="music" />
        </Sequence>
      ) : null : null}

      {schedule.intro > 0 ? <Sequence durationInFrames={schedule.intro + T} name="Title">
        <TitleCard script={script} palette={palette} slug={slug} countdownFrom={schedule.countdownFrom} baked={baked} ambientT={ambientT} muted={muted} />
      </Sequence> : null}

      {script.scenes.map((scene, i) => {
        const slot = schedule.scenes[i];
        const lead = (script.presentationVersion ?? 0) >= 1 && (scene.transition === 'none' || i === 0 && script.opening === 'hook') ? 0 : T;
        return (
          <Sequence key={i} from={slot.from - lead} durationInFrames={slot.duration + lead + T} name={`Scene ${i + 1}: ${scene.kind ?? ""} ${scene.background}`}>
            <SceneTransition kind={scene.transition ?? "pop"} frames={T}>
              <SceneView scene={scene} prev={script.scenes[i - 1]} slot={slot} palette={palette} slug={slug} script={script} lead={lead} index={i} baked={baked} ambientT={ambientT} scoreStart={scores.find(s=>slot.from>=s.coreFrom&&slot.from<s.coreTo)?.from??0} muted={muted}/>
            </SceneTransition>
          </Sequence>
        );
      })}

      <Sequence from={schedule.endFrom - T} durationInFrames={schedule.endDuration + T} name="End">
        <SceneTransition kind="pop" frames={T}>
          <Sequence from={T}>
            <EndCard script={script} palette={palette} slug={slug} starsEarned={earnedAt.filter((x) => x !== undefined).length} baked={baked} ambientT={ambientT} muted={muted}/>
          </Sequence>
        </SceneTransition>
      </Sequence>

      {/* "Ready… set… GO!" sits above the title card AND the first scene popping in */}
      {schedule.countdownFrom >= 0 ? <Sequence from={schedule.countdownFrom} durationInFrames={toFrames(COUNTDOWN_SEC) + 24} name="Countdown">
        <Countdown script={script} palette={palette} muted={muted}/>
      </Sequence> : <Sequence durationInFrames={toFrames(2.8)} name="Story title">
        <HookTitle title={script.title} />
      </Sequence>}

      <Sequence from={schedule.brandFrom} durationInFrames={toFrames(BRAND_OUTRO_SEC)} name="Dreamy Discoveries">
        <BrandOutro muted={muted}/>
      </Sequence>

      {starsTotal > 0 ? (
        <Sequence from={schedule.intro} durationInFrames={schedule.endFrom - schedule.intro} name="Stars">
          <StarHud total={starsTotal} earnedAt={earnedAt.map((f) => f - schedule.intro)} />
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
};
