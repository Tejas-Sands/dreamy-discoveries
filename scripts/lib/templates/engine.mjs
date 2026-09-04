/**
 * Shared bits for the AI-free templates: a seeded RNG, slot filling and script scaffolding.
 * Templates only ever choose between human-written verses and fill slots — they
 * never invent grammar, so the result always scans and rhymes.
 */
import { slugify } from "../common.mjs";

export function rng(seed) {
  let a = (typeof seed === "number" ? seed : hashString(String(seed))) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
export const shuffle = (r, arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
export const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

/** replace {slot} / {Slot} tokens; a capitalized token capitalizes the value */
export function fill(pattern, vars) {
  return pattern.replace(/\{([A-Za-z0-9_]+)\}/g, (_, key) => {
    const lower = key.charAt(0).toLowerCase() + key.slice(1);
    const v = vars[key] ?? vars[lower];
    if (v === undefined) return `{${key}}`;
    return key.charAt(0) === key.charAt(0).toUpperCase() && key !== lower ? cap(String(v)) : String(v);
  });
}

export const line = (text, extra = {}) => ({ text, ...extra });

export function scene({ background, character, kind = "verse", energy, lines, secondCharacter = null, question = null, holdSec = 0, prop = null, action, emotion }) {
  return {
    kind,
    background,
    character,
    secondCharacter,
    energy: energy ?? (kind === "chorus" || kind === "question" ? "upbeat" : "calm"),
    holdSec,
    prop,
    question,
    ...(action ? { action } : {}),
    ...(emotion ? { emotion } : {}),
    lines: lines.map((l) => (typeof l === "string" ? { text: l } : l)),
  };
}

/** the common envelope every template returns */
export function baseScript({ template, title, hero, palette, intro, outro, youtube, scenes, seed, music = "bouncy" }) {
  return {
    version: 2,
    type: "rhyme",
    template,
    seed,
    music,
    slug: `${template}-${slugify(hero.name)}-${slugify(String(seed)).slice(0, 6)}`,
    title,
    palette,
    mainCharacter: { kind: hero.kind, name: hero.name },
    intro: { text: intro },
    outro: { text: outro },
    moral: null,
    moralRhyme: null,
    youtube,
    scenes,
  };
}

export function youtubeMeta({ title, description, tags }) {
  return { title, description, tags };
}
