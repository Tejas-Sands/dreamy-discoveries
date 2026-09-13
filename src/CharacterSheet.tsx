import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Fredoka";
import type { Action, Emotion } from "./lib/types";
import { Character, getRecipe } from "./components/characters/Character";
import { CHARACTER_NAMES } from "./generated/registry";

const { fontFamily } = loadFont();

const KINDS = CHARACTER_NAMES;
const EMOTIONS: Emotion[] = ["happy", "excited", "sad", "surprised", "thinking", "sleepy", "love", "worried"];
const ACTIONS: Action[] = ["idle", "wave", "jump", "clap", "dance", "spin", "point", "hug", "sleep", "think", "cheer", "stomp", "walk", "cry", "eat", "look"];

/** Dev-only composition: every species, then one species in every emotion and action. */
const DANCE_RIGS = ["bear", "owl", "fish", "star", "turtle", "giraffe"];

/** A reusable visual check of the main cast's clothing, gestures and speaking faces. */
export const CastPreview: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const beat = Math.floor(frame / (3 * fps)) % 4;
  const action: Action = (["idle", "wave", "idle", "dance"] as const)[beat];
  const actionT = (frame % (3 * fps)) / fps;
  const mouth = beat === 2 ? Math.max(0, Math.sin(actionT * 19)) * 0.7 : 0;
  return (
    <AbsoluteFill style={{ background: "#e6f1f5", fontFamily, padding: "28px 48px", color: "#3d3542" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontSize: 40, fontWeight: 600 }}>Sunny Meadow · character studio</div>
        <div style={{ fontSize: 25 }}>{["Resting pose", "Wave", "Talking", "Dance"][beat]}</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gridTemplateRows: "repeat(2, 1fr)", gap: 18, flex: 1, marginTop: 20 }}>
        {["bunny", "bear", "duck", "fox", "turtle", "owl"].map((kind, seed) => (
          <div key={kind} style={{ background: "#fffaf2", borderRadius: 28, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", paddingBottom: 12 }}>
            <Character kind={kind} action={action} actionT={actionT} emotion={beat === 3 ? "excited" : "happy"} mouth={mouth} width={250} seed={seed} />
            <div style={{ fontSize: 26 }}>{getRecipe(kind).words?.name} <span style={{ opacity: 0.55 }}>· {kind}</span></div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
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
