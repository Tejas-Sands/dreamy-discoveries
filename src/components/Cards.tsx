import React from "react";
import { AbsoluteFill, Audio, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { KidsScript, Line } from "../lib/types";
import type { Palette } from "../lib/palettes";
import { Background } from "./backgrounds/Background";
import { Character, characterBox } from "./characters/Character";
import { Confetti, Flash, Sparkles } from "./Particles";
import { StarIcon } from "./StarHud";
import { Sfx } from "./Sfx";
import { CENTER_X, GROUND_Y } from "../lib/layout";
import { rand } from "../lib/random";
import { mouthAt } from "../lib/speech";
import { COUNTDOWN_SEC, INTRO_SPEAK_AT_SEC, toFrames } from "../lib/timing";
import { easeOutBack, easeOutCubic, hop } from "../lib/anim";
import type { BakedMap } from "../lib/baked";
import { VoxAudio, laughMouth, voxAt, voxEvents } from "./Vox";

const OUT = "#2f2438";

const BigWords: React.FC<{ text: string; color: string; secondary?: string; fontSize?: number; delay?: number }> = ({ text, color, secondary = color, fontSize = 150, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0 0.28em", maxWidth: 1700, textAlign: "center", fontSize, lineHeight: 1.05 }}>
      {text.split(" ").map((word, i) => {
        const s = spring({ frame: frame - delay - i * 4, fps, config: { damping: 9, stiffness: 130 } });
        const bob = Math.sin(frame / 9 + i) * 6;
        return (
          <span key={i} style={{ fontWeight: 700, color: i % 2 ? secondary : color, display: "inline-block", transform: `scale(${s}) rotate(${(rand(i) - 0.5) * 8}deg) translateY(${bob}px)`, WebkitTextStroke: `10px ${OUT}`, paintOrder: "stroke fill", textShadow: "0 12px 0 rgba(0,0,0,0.18)" }}>
            {word}
          </span>
        );
      })}
    </div>
  );
};

/** a voice line that starts at frame `at` of the card (a Sequence, not a conditional mount: Remotion times audio by
 *  its enclosing Sequence, so a conditionally rendered <Audio> would play from the card's first frame, skipping its start) */
const SpokenLine: React.FC<{ line: Line | null | undefined; slug: string; at: number }> = ({ line, slug, at }) =>
  line?.audio ? (
    <Sequence from={at} durationInFrames={Math.max(1, toFrames((line.durationSec ?? 3) + 0.5))} name="greeting">
      <Audio src={staticFile(`generated/${slug}/${line.audio}`)} volume={1} />
    </Sequence>
  ) : null;

/** hops in from off-screen with three decaying bounces; `t` seconds since the hop started */
export const hopIn = (t: number, dir: 1 | -1, distance = 1000, sec = 0.75) => {
  const k = Math.max(0, Math.min(1, t / sec));
  return { dx: -dir * (1 - easeOutCubic(k)) * distance, dy: -hop(k * 3) * 70 * (1 - k * 0.6) };
};

/** the hero stands left of center on the title card; the countdown / mood label sits on the right */
const TITLE_HERO_X = CENTER_X - 300;
const COUNTDOWN_X = 1330;

/** which mood beat the title card ends on */
export const introMood = (script: KidsScript): "countdown" | "story" | "sleepy" => {
  if (script.music?.mood === "lullaby") return "sleepy";
  if (script.type === "story") return "story";
  return "countdown";
};

/**
 * "Ready… set… GO!" — big numbers slam in on the beat, then GO! bursts over the first
 * scene. Stories get "Story time!" and lullabies "Sleepy time!" instead. Rendered at the
 * top level of the video, above the scenes, from `schedule.countdownFrom`.
 */
export const Countdown: React.FC<{ script: KidsScript; palette: Palette }> = ({ script, palette }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const mood = introMood(script);
  const step = 14; // frames per number
  if (mood !== "countdown") {
    const label = mood === "story" ? "📖 Story time!" : "🌙 Sleepy time!";
    const s = spring({ frame, fps, config: { damping: 9, stiffness: 120 } });
    const life = frame / fps;
    // leaves as the first scene pops in
    const fade = Math.max(0, Math.min(1, (COUNTDOWN_SEC - 0.4 - life) / 0.25));
    return (
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <Sfx name={mood === "story" ? "magic" : "sparkle"} at={0} volume={0.6} />
        <div style={{ position: "absolute", left: COUNTDOWN_X - 500, width: 1000, top: 380, display: "flex", justifyContent: "center", opacity: fade }}>
          <div style={{ background: palette.card, border: `12px solid ${palette.accent}`, borderRadius: 60, padding: "24px 64px", boxShadow: "0 18px 0 rgba(0,0,0,0.18)", transform: `scale(${s}) rotate(${-3 + Math.sin(life * 4) * 2}deg)` }}>
            <div style={{ fontSize: 110, fontWeight: 700, color: palette.text, whiteSpace: "nowrap", lineHeight: 1.1 }}>{label}</div>
          </div>
        </div>
      </div>
    );
  }
  const idx = Math.floor(frame / step); // 0,1,2 → 3,2,1 ; 3+ → GO
  const local = frame - idx * step;
  const isGo = idx >= 3;
  const goLife = (frame - 3 * step) / fps;
  const s = spring({ frame: local, fps, config: { damping: 8, stiffness: 190 } });
  const colors = ["#ff5d9e", "#ffd23f", "#5db9ff"];
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <Sfx name="pop" at={0} volume={0.7} />
      <Sfx name="pop" at={step} volume={0.75} />
      <Sfx name="pop" at={2 * step} volume={0.8} />
      <Sfx name="whoosh" at={3 * step} volume={0.6} />
      <Sfx name="tada" at={3 * step + 2} volume={0.55} />
      {isGo ? (
        <>
          <Flash from={3 * step} strength={0.5} />
          <Confetti from={3 * step} x={960} y={420} count={70} spread={1300} />
          <div style={{ position: "absolute", left: 0, right: 0, top: 260, display: "flex", justifyContent: "center", opacity: Math.max(0, 1 - Math.max(0, goLife - 0.45) / 0.3) }}>
            <div style={{ fontSize: 340, fontWeight: 700, color: "#fff", WebkitTextStroke: `16px ${OUT}`, paintOrder: "stroke fill", textShadow: "0 18px 0 rgba(0,0,0,0.2)", transform: `scale(${1 + 0.6 * easeOutBack(Math.min(1, goLife / 0.3))}) rotate(-6deg)`, lineHeight: 1 }}>GO!</div>
          </div>
        </>
      ) : (
        <div style={{ position: "absolute", left: COUNTDOWN_X - 210, top: 330, width: 420, height: 420, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: 999, background: colors[idx], border: "14px solid #fff", boxShadow: "0 16px 0 rgba(0,0,0,0.18)", transform: `scale(${s}) rotate(${(idx % 2 ? 1 : -1) * 8}deg)` }} />
          <div style={{ position: "relative", fontSize: 300, fontWeight: 700, color: "#fff", WebkitTextStroke: `14px ${OUT}`, paintOrder: "stroke fill", transform: `scale(${s})`, lineHeight: 1 }}>{3 - idx}</div>
        </div>
      )}
    </div>
  );
};

/** Title card: the hero hops in, big bouncy title, "Hi friends!", then the countdown beat. */
export const TitleCard: React.FC<{ script: KidsScript; palette: Palette; slug: string; countdownFrom: number; baked?: BakedMap }> = ({ script, palette, slug, countdownFrom, baked }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const speakAt = toFrames(INTRO_SPEAK_AT_SEC);
  const t = (frame - speakAt) / fps;
  const vox = voxEvents(script.intro, speakAt, 24, `${slug}:intro`);
  const mouth = laughMouth(voxAt(vox, frame, fps)) ?? mouthAt(script.intro, t);
  const box = characterBox(TITLE_HERO_X, GROUND_Y + 20, 470);
  const bg = script.scenes[0]?.background ?? "meadow";
  const mood = introMood(script);
  const bpm = script.music?.bpm ?? 120;
  const inCountdown = frame >= countdownFrom;
  const cdT = (frame - countdownFrom) / fps;
  const hopT = frame / fps;
  const { dx, dy } = hopIn(hopT, 1, 1100, 0.8);
  const speaking = t >= 0 && t <= (script.intro?.durationSec ?? 0);
  const action = inCountdown ? (mood === "countdown" ? "jump" : mood === "story" ? "cheer" : "wave") : speaking ? (script.intro?.action ?? "wave") : hopT < 0.8 ? "jump" : "wave";
  return (
    <AbsoluteFill>
      <Background kind={bg} palette={palette} baked={baked} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 18%, ${palette.accentSoft}24, transparent 65%)` }} />
      <Sparkles count={14} />
      <Sfx name="intro" at={0} volume={0.45} />
      <Sfx name="sparkle" at={6} volume={0.5} />
      <SpokenLine line={script.intro} slug={slug} at={speakAt} />
      <VoxAudio events={vox} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 80, display: "flex", justifyContent: "center" }}>
        <BigWords text={script.title} color={palette.accent} secondary={palette.accentSoft} fontSize={script.title.length > 22 ? 120 : 150} delay={6} />
      </div>
      <div style={{ position: "absolute", ...box, transform: `translate(${dx}px, ${dy}px)` }}>
        <Character kind={script.mainCharacter.kind} emotion={inCountdown ? "excited" : script.intro?.emotion ?? "excited"} action={action} mouth={mouth} width={470} seed={1} actionT={inCountdown ? cdT : hopT} bpm={bpm} groove={mood === "countdown"} />
      </div>
    </AbsoluteFill>
  );
};

/** friends who appeared in the video (for the end-card party) */
export const castOf = (script: KidsScript, max = 3): string[] => {
  const seen: string[] = [];
  const add = (k: string | null | undefined) => {
    if (k && k !== "none" && k !== script.mainCharacter.kind && !seen.includes(k)) seen.push(k);
  };
  for (const s of script.scenes) {
    add(s.secondCharacter);
    if (s.character !== script.mainCharacter.kind) add(s.character);
  }
  for (const s of script.scenes) for (const e of s.extras ?? []) add(e);
  for (const s of script.scenes) if (s.gag?.kind === "peek") add(s.gag.character);
  return seen.slice(0, max);
};

/** End card: "The End!", the stars collected, a dance party with everyone, the hero says bye. */
export const EndCard: React.FC<{ script: KidsScript; palette: Palette; slug: string; starsEarned: number; baked?: BakedMap }> = ({ script, palette, slug, starsEarned, baked }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const speakAt = Math.round(0.8 * fps);
  const t = (frame - speakAt) / fps;
  const vox = voxEvents(script.outro, speakAt, 20, `${slug}:outro`);
  const mouth = laughMouth(voxAt(vox, frame, fps)) ?? mouthAt(script.outro, t);
  const bg = script.scenes[script.scenes.length - 1]?.background ?? "meadow";
  const total = script.stars?.total ?? 0;
  const allStars = total > 0 && starsEarned >= total;
  const bpm = script.music?.bpm ?? 120;
  const sleepy = script.music?.mood === "lullaby";
  const cast = castOf(script, 3);
  const speaking = t >= 0 && t <= (script.outro?.durationSec ?? 0);
  const heroAction = speaking ? (script.outro?.action ?? "wave") : sleepy ? "wave" : "dance";
  const box = characterBox(CENTER_X, GROUND_Y + 40, 400);
  const heroHop = hopIn(frame / fps, 1, 0, 0.6); // just the bounce
  const subtitle = allStars ? "You got ALL the stars! ⭐" : total > 0 && starsEarned > 0 ? "Great job! 🎉" : sleepy ? "Sweet dreams! 🌙" : "Bye bye! 👋";
  const subS = spring({ frame: frame - 30, fps, config: { damping: 10, stiffness: 120 } });
  // friends dance around the hero
  const slots = [
    { x: CENTER_X - 500, dir: 1 as const, w: 320 },
    { x: CENTER_X + 500, dir: -1 as const, w: 320 },
    { x: CENTER_X - 830, dir: 1 as const, w: 240 },
  ];
  return (
    <AbsoluteFill>
      <Background kind={bg} palette={palette} baked={baked} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 18%, ${palette.accentSoft}24, transparent 65%)` }} />
      <Sparkles count={16} />
      <Confetti from={2} x={960} y={300} count={60} spread={1100} />
      {!sleepy ? <Confetti from={50} x={400} y={350} count={40} spread={900} /> : null}
      {!sleepy ? <Confetti from={70} x={1500} y={350} count={40} spread={900} /> : null}
      {allStars ? <Confetti from={100} x={960} y={250} count={80} spread={1300} /> : null}
      <Sfx name="tada" at={0} volume={0.7} />
      {allStars ? <Sfx name="applause" at={4} volume={0.5} /> : null}
      <SpokenLine line={script.outro} slug={slug} at={speakAt} />
      <VoxAudio events={vox} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 60, display: "flex", justifyContent: "center" }}>
        <BigWords text="The End!" color={palette.accent} secondary={palette.accentSoft} fontSize={170} />
      </div>
      {total > 0 ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: 262, display: "flex", justifyContent: "center", alignItems: "center", gap: 10 }}>
          {Array.from({ length: total }).map((_, i) => {
            const s = spring({ frame: frame - 14 - i * 5, fps, config: { damping: 8, stiffness: 160 } });
            return (
              <div key={i} style={{ transform: `scale(${s}) rotate(${Math.sin(frame / 8 + i) * 8}deg)` }}>
                <StarIcon size={total > 6 ? 84 : 110} filled={i < starsEarned} glow={0.5} />
              </div>
            );
          })}
        </div>
      ) : null}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 40, display: "flex", justifyContent: "center", transform: `scale(${subS})`, transformOrigin: "50% 100%" }}>
        <div style={{ background: palette.card, border: `10px solid ${allStars ? "#ffd23f" : palette.accent}`, borderRadius: 50, padding: "14px 46px", boxShadow: "0 14px 0 rgba(0,0,0,0.16)", fontSize: 72, fontWeight: 700, color: palette.text, whiteSpace: "nowrap" }}>{subtitle}</div>
      </div>
      {cast.map((kind, i) => {
        const slot = slots[i];
        if (!slot) return null;
        const { dx, dy } = hopIn(frame / fps - 0.15 * i, slot.dir, 900, 0.8);
        const w = slot.w;
        return (
          <div key={kind} style={{ position: "absolute", ...characterBox(slot.x, GROUND_Y + 50, w), transform: `translate(${dx}px, ${dy}px)` }}>
            <Character kind={kind} emotion={sleepy ? "sleepy" : "excited"} action={sleepy ? "wave" : "dance"} width={w} seed={20 + i} flip={slot.dir === -1} actionT={frame / fps} bpm={bpm} groove={!sleepy} />
          </div>
        );
      })}
      <div style={{ position: "absolute", ...box, transform: `translate(0px, ${heroHop.dy}px)` }}>
        <Character kind={script.mainCharacter.kind} emotion={script.outro?.emotion ?? "happy"} action={heroAction} mouth={mouth} width={400} seed={2} actionT={frame / fps} bpm={bpm} groove={!sleepy} />
      </div>
    </AbsoluteFill>
  );
};
