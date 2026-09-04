import type { PaletteKind } from "./types";

export interface Palette {
  bgA: string;
  bgB: string;
  card: string;
  text: string;
  accent: string;
  accentSoft: string;
  ground: string;
}

export const PALETTES: Record<PaletteKind, Palette> = {
  night: { bgA: "#2a2f7a", bgB: "#5a3d9a", card: "#fffdf5", text: "#33295e", accent: "#ffd23f", accentSoft: "#a99ae0", ground: "#3a3178" },
  meadow: { bgA: "#8fdcff", bgB: "#dffbc8", card: "#ffffff", text: "#2f5d3a", accent: "#ff7a1a", accentSoft: "#7ed957", ground: "#7fd35a" },
  ocean: { bgA: "#7fdcff", bgB: "#2f86c9", card: "#f4fcff", text: "#144a73", accent: "#ffb703", accentSoft: "#61c9e8", ground: "#1f6ea6" },
  candy: { bgA: "#ffd6e8", bgB: "#ffe9c9", card: "#fffafc", text: "#7a3b5e", accent: "#ff4f9a", accentSoft: "#c9a2ff", ground: "#f7b8d4" },
  sunshine: { bgA: "#ffe98a", bgB: "#ffc46b", card: "#fffef2", text: "#7a4a12", accent: "#ff5e2e", accentSoft: "#ffd93d", ground: "#f5b957" },
  forest: { bgA: "#b6ecff", bgB: "#cdeeb0", card: "#ffffff", text: "#2b4d2a", accent: "#ff8c1a", accentSoft: "#8bd66a", ground: "#5fb548" },
  berry: { bgA: "#e9d5ff", bgB: "#ffd1e8", card: "#fffafd", text: "#4b2a6b", accent: "#ff5c8a", accentSoft: "#b28dff", ground: "#c98ae6" },
};

export const getPalette = (kind: string | undefined): Palette =>
  PALETTES[(kind as PaletteKind) ?? "meadow"] ?? PALETTES.meadow;
