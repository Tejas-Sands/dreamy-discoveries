import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Fredoka";
import type { Action, Emotion } from "./lib/types";
import { Character, characterBox } from "./components/characters/Character";
import { CHARACTER_NAMES } from "./generated/registry";
import cast from "../library/cast.json";

const { fontFamily } = loadFont();

const KINDS = CHARACTER_NAMES;
const EMOTIONS: Emotion[] = ["happy", "excited", "sad", "surprised", "thinking", "sleepy", "love", "worried"];
const ACTIONS: Action[] = ["idle", "wave", "jump", "clap", "dance", "spin", "point", "hug", "sleep", "think", "cheer", "stomp", "walk", "cry", "eat", "look"];

/** Dev-only composition: every species, then one species in every emotion and action. */
const DANCE_RIGS = ["bear", "owl", "fish", "star", "turtle", "giraffe"];

/** A reusable visual check of the main cast's clothing, gestures and speaking faces. */
export const CastPreview: React.FC<{page?: number; still?: boolean}> = ({page, still = false}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const beat = Math.floor(frame / (3 * fps)) % 4;
  const action: Action = (["idle", "wave", "idle", "dance"] as const)[beat];
  const actionT = (frame % (3 * fps)) / fps;
  const mouth = beat === 2 ? Math.max(0, Math.sin(actionT * 19)) * 0.7 : 0;
  const library = page !== undefined;
  const mainKinds = new Set(cast.members.map(member => member.kind));
  const members = library ? KINDS.filter(kind => !mainKinds.has(kind))
    .slice(page * 8, (page + 1) * 8).map(kind => ({kind, name: kind[0].toUpperCase() + kind.slice(1)})) : cast.members;
  return (
    <AbsoluteFill style={{ background: "#e6f1f5", fontFamily, padding: "28px 48px", color: "#6a577d" }}>
      <Img src={staticFile("brand/sunny-meadow.png")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: .55 }}/>
      <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontSize: 44, fontWeight: 600 }}>{library ? `The storybook library · ${(page ?? 0) + 1} / 4` : "Meet your Sunny Meadow friends"}</div>
        <div style={{ fontSize: 28 }}>{["A little hello", "Wave with us!", "Let's tell a story", "Time to dance!"][beat]}</div>
      </div>
      <div style={{ position: "relative", display: "grid", gridTemplateColumns: `repeat(${library ? 4 : 3}, 1fr)`, gridTemplateRows: "repeat(2, 1fr)", gap: 18, flex: 1, marginTop: 20 }}>
        {members.map(({kind,name}, seed) => (
          <div key={kind} style={{ position: "relative", background: "linear-gradient(145deg, #fffaf3e8, #f1e5f2c9)", border: "3px solid #fffaf0", borderRadius: 32 }}>
            <div style={{position:"absolute", ...characterBox(library ? 217 : 295, 386, library ? 285 : 340)}}>
              <Character kind={kind} action={action} actionT={actionT} emotion={beat === 3 ? "excited" : "happy"} mouth={mouth} width={library ? 285 : 340} seed={seed} still={still} />
            </div>
            <div style={{ position: "absolute", bottom: 17, left: 0, right: 0, textAlign: "center", fontSize: 32, fontWeight: 500 }}>{name}</div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

export const LibraryPreview: React.FC<{still?: boolean}> = ({still}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return <CastPreview page={Math.floor(frame / (12 * fps))} still={still}/>;
};

export const CharacterSheet: React.FC<{ mode: "species" | "emotions" | "actions" | "dances"; kind: string; animate?: boolean }> = ({ mode, kind, animate = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const phase = Math.floor(frame / (3 * fps)) % 4;
  const showcaseAction: Action = (["idle", "wave", "walk", "dance"] as const)[phase];
  const items =
    mode === "species"
      ? KINDS.map((k) => ({ label: k, kind: k, emotion: "happy" as Emotion, action: animate ? showcaseAction : "idle" as Action, seed: undefined as number | undefined }))
      : mode === "emotions"
        ? EMOTIONS.map((e) => ({ label: e, kind, emotion: e, action: "idle" as Action, seed: undefined }))
        : mode === "dances"
          ? DANCE_RIGS.flatMap((k) => [0, 1, 2, 3].map((style) => ({ label: `${k} ${style}`, kind: k, emotion: "excited" as Emotion, action: "dance" as Action, seed: style as number | undefined })))
          : ACTIONS.map((a) => ({ label: a, kind, emotion: "happy" as Emotion, action: a, seed: undefined }));
  const cols = mode === "actions" ? 8 : mode === "species" ? 10 : mode === "dances" ? 8 : 6;
  const rows = Math.ceil(items.length / cols);
  const cell = Math.min(500, Math.floor(1040 / rows) - 10);
  return (
    <AbsoluteFill style={{ background: "#dff3ff", fontFamily, flexDirection: "row", flexWrap: "wrap", alignContent: "flex-start", padding: 20 }}>
      {items.map((it, i) => (
        <div key={i} style={{ width: (1880 / cols) - 10, height: cell, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", margin: 5, background: "rgba(255,255,255,0.35)", borderRadius: 24 }}>
          <Character kind={it.kind} emotion={it.emotion} action={it.action} actionT={animate ? (frame % (3 * fps)) / fps : undefined} mouth={mode === "emotions" ? 0.5 * (i % 2) : 0} width={Math.min(250, cell * 0.6)} seed={it.seed ?? i} bpm={120} groove={mode !== "species"} still={mode === "species" && !animate} />
          <div style={{ fontSize: Math.min(30, cell * 0.08), fontWeight: 700, color: "#334", padding: 6 }}>{it.label}</div>
        </div>
      ))}
    </AbsoluteFill>
  );
};
