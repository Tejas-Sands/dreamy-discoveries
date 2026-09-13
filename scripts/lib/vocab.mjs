/**
 * Shared vocabulary for the pipeline (LLM prompt, validation, Director).
 * Must stay in sync with the union types in src/lib/types.ts.
 */
import { BACKGROUND_RECIPES, CHARACTER_RECIPES } from "./library.mjs";

const BUILTIN_BACKGROUNDS = [
  "meadow", "forest", "night", "underwater", "sky", "candy",
  "beach", "snow", "space", "farm", "bedroom",
];
/** every background: built-ins + recipes in library/backgrounds */
export const BACKGROUNDS = [...new Set([...BUILTIN_BACKGROUNDS, ...Object.keys(BACKGROUND_RECIPES)])];

/** every character = a recipe in library/characters (12 classics + the rest of the zoo) */
export const CHARACTERS = Object.keys(CHARACTER_RECIPES).length
  ? Object.keys(CHARACTER_RECIPES)
  : ["bunny", "bear", "cat", "dog", "duck", "elephant", "frog", "lion", "pig", "monkey", "fish", "star"];

/** emoji per character, from the recipes */
export const CHARACTER_EMOJI = Object.fromEntries(Object.entries(CHARACTER_RECIPES).map(([k, r]) => [k, r.emoji || "⭐"]));

export const PALETTES = ["night", "meadow", "ocean", "candy", "sunshine", "forest", "berry"];

export const EMOTIONS = [
  "happy", "excited", "sad", "surprised", "thinking", "sleepy", "love", "worried", "neutral",
];

export const ACTIONS = [
  "idle", "wave", "jump", "clap", "dance", "spin", "nod", "shake", "point", "hug",
  "sleep", "think", "cheer", "stomp", "swim", "fly", "walk", "cry", "eat", "look",
];

export const SCENE_KINDS = ["verse", "chorus", "question", "story", "lesson", "moral", "bridge"];

export const TRANSITIONS = ["pop", "slide", "iris", "wipe", "fade"];

export const GAG_KINDS = ["peek", "flyby"];

export const SFX = [
  "pop", "boing", "whoosh", "ding", "sparkle", "clap", "applause", "ticktock", "drumroll",
  "splash", "coin", "heart", "bubble", "magic", "tada", "slide", "yawn", "stomp",
];

/** old (v1) background names → v2 */
export const BACKGROUND_ALIASES = {
  stars: "night",
  clouds: "sky",
  hills: "meadow",
  rainbow: "sky",
};

/** old (v1) character names → v2 */
export const CHARACTER_ALIASES = {
  bird: "duck",
};

/** default friendly names the Director uses when the LLM gives none (from the recipes' words) */
export const DEFAULT_NAMES = Object.fromEntries(
  Object.entries(CHARACTER_RECIPES).map(([k, r]) => [k, r.words?.name || k.charAt(0).toUpperCase() + k.slice(1)])
);

/** css colors for color callouts */
export const COLOR_WORDS = {
  red: "#ff3b3b",
  orange: "#ff8c1a",
  yellow: "#ffd60a",
  green: "#3ecf4a",
  blue: "#2f8cff",
  purple: "#a55eea",
  pink: "#ff6fb5",
  brown: "#a0673b",
  black: "#333333",
  white: "#f7f7f7",
};

export const NUMBER_WORDS = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};

/** emoji the counting callout uses when nothing better is known */
export const COUNT_EMOJI = {
  apple: "🍎", apples: "🍎", star: "⭐", stars: "⭐", fish: "🐟", duck: "🦆", ducks: "🦆",
  flower: "🌸", flowers: "🌸", balloon: "🎈", balloons: "🎈", bird: "🐦", birds: "🐦",
  frog: "🐸", frogs: "🐸", cookie: "🍪", cookies: "🍪", carrot: "🥕", carrots: "🥕",
  bunny: "🐰", bunnies: "🐰", bear: "🧸", bears: "🧸", cat: "🐱", cats: "🐱", dog: "🐶",
  dogs: "🐶", egg: "🥚", eggs: "🥚", banana: "🍌", bananas: "🍌", hop: "🐰", hops: "🐰",
  bounce: "🐰", bounces: "🐰", jump: "⭐", jumps: "⭐", clap: "👏", claps: "👏", ball: "⚽",
  balls: "⚽", butterfly: "🦋", butterflies: "🦋", bee: "🐝", bees: "🐝", heart: "❤️",
  hearts: "❤️", cloud: "☁️", clouds: "☁️", boat: "⛵", boats: "⛵", car: "🚗", cars: "🚗",
  bubble: "🫧", bubbles: "🫧", cupcake: "🧁", cupcakes: "🧁", candy: "🍬", candies: "🍬",
  shell: "🐚", shells: "🐚", snowflake: "❄️", snowflakes: "❄️", rocket: "🚀", rockets: "🚀",
  planet: "🪐", planets: "🪐", strawberry: "🍓", strawberries: "🍓", leaf: "🍃", leaves: "🍃",
  friend: "🙂", friends: "🙂", kiss: "💋", kisses: "💋", hug: "🤗", hugs: "🤗",
};

export const isOneOf = (list, value) => typeof value === "string" && list.includes(value);
