import React from "react";
import { AbsoluteFill } from "remotion";
import { loadFont } from "@remotion/google-fonts/Fredoka";
import type { Action, Emotion } from "./lib/types";
import { Character } from "./components/characters/Character";
import { CHARACTER_NAMES } from "./generated/registry";

const { fontFamily } = loadFont();

const KINDS = CHARACTER_NAMES;
const EMOTIONS: Emotion[] = ["happy", "excited", "sad", "surprised", "thinking", "sleepy", "love", "worried"];
const ACTIONS: Action[] = ["idle", "wave", "jump", "clap", "dance", "spin", "point", "hug", "sleep", "think", "cheer", "stomp", "walk", "cry", "eat", "look"];

/** Dev-only composition: every species, then one species in every emotion and action. */
export const CharacterSheet: React.FC<{ mode: "species" | "emotions" | "actions"; kind: string }> = ({ mode, kind }) => {
  const items =
    mode === "species"
      ? KINDS.map((k) => ({ label: k, kind: k, emotion: "happy" as Emotion, action: "idle" as Action }))
      : mode === "emotions"
        ? EMOTIONS.map((e) => ({ label: e, kind, emotion: e, action: "idle" as Action }))
        : ACTIONS.map((a) => ({ label: a, kind, emotion: "happy" as Emotion, action: a }));
  const cols = mode === "actions" ? 8 : mode === "species" ? 10 : 6;
  const rows = Math.ceil(items.length / cols);
  const cell = Math.min(500, Math.floor(1040 / rows));
  return (
    <AbsoluteFill style={{ background: "#dff3ff", fontFamily, flexDirection: "row", flexWrap: "wrap", alignContent: "flex-start", padding: 20 }}>
      {items.map((it, i) => (
        <div key={i} style={{ width: (1880 / cols) - 10, height: cell, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", margin: 5, background: "rgba(255,255,255,0.35)", borderRadius: 24 }}>
          <Character kind={it.kind} emotion={it.emotion} action={it.action} mouth={mode === "emotions" ? 0.5 * (i % 2) : 0} width={Math.min(250, cell * 0.5)} seed={i} bpm={120} />
          <div style={{ fontSize: Math.min(30, cell * 0.08), fontWeight: 700, color: "#334", padding: 6 }}>{it.label}</div>
        </div>
      ))}
    </AbsoluteFill>
  );
};
