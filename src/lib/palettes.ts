import type { PaletteKind } from "./types";

export interface Palette {
  bgA: string;
  bgB: string;
  card: string;
  text: string;
  accent: string;
  accentSoft: string;
  ground: string;
  /** Dark ink for an active word on a light caption card. */
  highlight: string;
}

export const PALETTES: Record<PaletteKind, Palette> = {
  night: { highlight: "#7350ad", bgA: "#2a2f7a", bgB: "#5a3d9a", card: "#fffdf5", text: "#33295e", accent: "#ffd23f", accentSoft: "#a99ae0", ground: "#3a3178" },
  meadow: { highlight: "#b8430b", bgA: "#8fdcff", bgB: "#dffbc8", card: "#ffffff", text: "#2f5d3a", accent: "#ff7a1a", accentSoft: "#34c9b0", ground: "#7fd35a" },
  ocean: { highlight: "#095b98", bgA: "#7fdcff", bgB: "#2f86c9", card: "#f4fcff", text: "#144a73", accent: "#ffb703", accentSoft: "#35cce0", ground: "#1f6ea6" },
  candy: { highlight: "#b62270", bgA: "#ffd6e8", bgB: "#ffe9c9", card: "#fffafc", text: "#7a3b5e", accent: "#ff4f9a", accentSoft: "#ad83f5", ground: "#f7b8d4" },
  sunshine: { highlight: "#b53a19", bgA: "#ffe98a", bgB: "#ffc46b", card: "#fffef2", text: "#7a4a12", accent: "#ff5e2e", accentSoft: "#ffd93d", ground: "#f5b957" },
  forest: { highlight: "#ad4709", bgA: "#b6ecff", bgB: "#cdeeb0", card: "#ffffff", text: "#2b4d2a", accent: "#ff8c1a", accentSoft: "#48cba4", ground: "#5fb548" },
  berry: { highlight: "#a52c65", bgA: "#e9d5ff", bgB: "#ffd1e8", card: "#fffafd", text: "#4b2a6b", accent: "#ff5c8a", accentSoft: "#9d7cf2", ground: "#c98ae6" },
};

export const getPalette = (kind: string | undefined): Palette =>
  PALETTES[(kind as PaletteKind) ?? "meadow"] ?? PALETTES.meadow;
