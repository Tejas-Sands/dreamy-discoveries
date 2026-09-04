/**
 * A character recipe: everything needed to draw a species on the shared rig.
 * Recipes live in library/characters/<name>.json (hand-written, or proposed by
 * the LLM from this vocabulary and validated by the Director) and are bundled
 * through src/generated/registry.ts. New animals never need new drawing code.
 */
export type Rig = "biped" | "fish" | "star" | "bird" | "shell" | "longNeck";

export const EAR_KINDS = ["none", "round", "pointy", "long", "floppy", "big", "tuft"] as const;
export type EarKind = (typeof EAR_KINDS)[number];

export const TAIL_KINDS = ["none", "pom", "curved", "curly", "long", "stub", "feathers", "bushy", "thin"] as const;
export type TailKind = (typeof TAIL_KINDS)[number];

export const FEATURE_KINDS = [
  "snout", "pigSnout", "hippoSnout", "pinkNose", "blackNose", "koalaNose", "carrotNose", "beakSmall",
  "whiskers", "mask", "eyePatches", "nostrils", "headStripe", "tigerStripes", "mane", "wool", "hair",
  "horns", "hornUnicorn", "antennae", "spikes", "trunk", "tuftTop", "headCap", "wingsBack", "spout", "buttons",
] as const;
export type FeatureKind = (typeof FEATURE_KINDS)[number];

export const MARKING_KINDS = ["spots", "stripes"] as const;
export type MarkingKind = (typeof MARKING_KINDS)[number];

export const ACCESSORY_KINDS = ["bow", "partyHat", "topHat", "glasses", "scarf", "crown"] as const;
export type AccessoryKind = (typeof ACCESSORY_KINDS)[number];

export interface RecipeColors {
  body: string;
  belly: string;
  limb: string;
  /** inner ear / soft parts */
  inner?: string;
  /** manes, shells, tufts, spots */
  accent?: string;
  /** noses, patches, stripes */
  dark?: string;
}

export interface FeatureSpec {
  kind: FeatureKind;
  color?: string;
  /** free-form tweaks a part may read (y, rx, ry, size, dx ...) */
  [key: string]: string | number | boolean | undefined;
}

export interface CharacterRecipe {
  name: string;
  emoji: string;
  rig: Rig;
  colors: RecipeColors;
  ears?: EarKind;
  earOptions?: Record<string, number | string>;
  tail?: TailKind;
  tailOptions?: Record<string, number | string>;
  features?: Array<FeatureKind | FeatureSpec>;
  markings?: Array<MarkingKind | FeatureSpec>;
  accessories?: Array<AccessoryKind | FeatureSpec>;
  face?: {
    eyeY?: number;
    eyeGap?: number;
    mouthY?: number;
    mouthDx?: number;
    eyeSize?: number;
    beak?: boolean;
    sockets?: boolean;
  };
  arm?: "capsule" | "wing";
  foot?: "round" | "duck" | "none";
  legWidth?: number;
  /** words the AI-free templates use */
  words?: {
    name: string;
    one: string;
    plural: string;
    verb: string;
    verbs: string;
    verbing: string;
    home: string;
    sound: string | null;
  };
}

export const toSpec = <K extends string>(f: K | FeatureSpec): FeatureSpec => (typeof f === "string" ? { kind: f as FeatureKind } : f);
