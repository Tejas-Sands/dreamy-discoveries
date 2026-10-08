/**
 * The Sunny Meadow cast — the universe's single source of truth.
 *
 * library/cast.json holds the original characters' personalities and relationships.
 * Every additional design in library/characters is also available, with its
 * established recipe name and words. Everything
 * in the pipeline that picks a character — the LLM prompt, the Director's party
 * guests and gag cameos, the AI-free templates — pulls from here, so stories tell
 * one consistent world and nothing is ever invented twice.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {CHARACTER_RECIPES} from './library.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CAST_PATH = path.join(ROOT, "library", "cast.json");

let _cache = null;
let _members = null;
export function loadCast() {
  if (!_cache) _cache = JSON.parse(fs.readFileSync(CAST_PATH, "utf8"));
  return _cache;
}

/** Every installed design is usable; authored personality cards take precedence. */
export function castMembers() {
  if (!_members) {
    const originals = loadCast().members;
    const originalKinds = new Set(originals.map(member => member.kind));
    _members = [...originals, ...Object.entries(CHARACTER_RECIPES)
      .filter(([kind]) => !originalKinds.has(kind))
      .map(([kind, recipe]) => ({
        id: kind, kind, name: recipe.words?.name || kind[0].toUpperCase() + kind.slice(1),
        role: 'a Sunny Meadow friend', personality: recipe.words?.personality || 'a curious, playful friend',
        catchphrase: recipe.words?.catchphrase || "Let's try together!",
        favorite: recipe.words?.verbing || 'exploring together', livesAt: recipe.words?.home || 'meadow',
        friends: [], rivals: [], family: [], mentor: null,
      }))];
  }
  return _members;
}
/** All species/design IDs in the character library. */
export const castKinds = () => [...new Set(castMembers().map((m) => m.kind))];
export const castMemberById = (id) => castMembers().find((m) => m.id === id) ?? null;
/** the main card for a species (first adult, hero first) */
export const castMemberByKind = (kind) => castMembers().find((m) => m.kind === kind) ?? null;
export const castHeroKind = () => castMemberById(loadCast().hero)?.kind ?? "bunny";

/** member ids → kinds for one relationship edge (friends / rivals / mentor) */
export function castKindsOf(memberId, edge) {
  const m = castMemberById(memberId);
  if (!m) return [];
  const ids = Array.isArray(m[edge]) ? m[edge] : m[edge] ? [m[edge]] : [];
  return ids.map(castMemberById).filter(Boolean).map((x) => x.kind);
}
export const castFriendsOf = (kind) => castKindsOf(castMemberByKind(kind)?.id, "friends");
export const castRivalsOf = (kind) => castKindsOf(castMemberByKind(kind)?.id, "rivals");
/** family of a kind: array of {kind, name, role} cards (e.g. baby bunny Toto) */
export function castFamilyOf(kind) {
  const m = castMemberByKind(kind);
  return m && Array.isArray(m.family) ? m.family : [];
}

/** the species of everyone who might appear next to a character (friends first, then the rest of the cast) */
export function castNeighboursOf(kind) {
  const all = castKinds();
  return [...castFriendsOf(kind), ...castRivalsOf(kind), ...all.filter((k) => k !== kind && !castFriendsOf(kind).includes(k) && !castRivalsOf(kind).includes(k))];
}

/** preferred order for party guests / gag cameos (the hero never wants to dance with itself) */
export const castOrder = () => castMembers().map((m) => m.kind).filter((k, i, a) => a.indexOf(k) === i);

/** the cast block for the LLM prompt: names, personalities, relationships, rules */
export function castPrompt() {
  const cast = loadCast();
  const mem = (id) => castMemberById(id);
  const lines = [
    `The world is "${cast.universe}" — ${cast.tagline.replace(/\.$/, "")}.`,
    `AVAILABLE CHARACTERS (${castMembers().length} installed designs): any of these can be a hero, friend or cameo. Use the exact kind and name; do not invent an unavailable design.`,
  ];
  for (const m of castMembers()) {
    if (!cast.members.some(original => original.kind === m.kind)) {
      lines.push(`  · ${m.name} (${m.kind}), home: ${m.livesAt}, enjoys ${m.favorite}. Catchphrase: "${m.catchphrase}"`);
      continue;
    }
    const family = Array.isArray(m.family) && m.family.some(f => mem(f.id))
      ? ` Family: ${m.family.filter(f => mem(f.id)).map((f) => `${f.name} the ${f.kind} (${f.role})`).join(", ")}.`
      : "";
    const friends = (m.friends ?? []).map(mem).filter(Boolean).map((x) => x.name).join(", ") || "–";
    const rivals = (m.rivals ?? []).map(mem).filter(Boolean).map((x) => x.name).join(", ") || "none";
    const mentor = m.mentor ? mem(m.mentor)?.name : null;
    const tag = m.catchphrase ? ` Catchphrase: "${m.catchphrase}"` : "";
    lines.push(
      `  · ${m.name} the ${m.kind} — ${m.role}, ${m.personality}. Lives at the ${m.livesAt}. Loves ${m.favorite}. Friends: ${friends}. Rivals (Sunny Meadow Games only): ${rivals}.${mentor ? ` Mentor: ${mentor}.` : ""}${tag}${family}`
    );
  }
  // Family names without their own designs are not separate renderable characters.
  for (const rule of cast.rules.filter(rule => !rule.startsWith('Family ='))) lines.push(`  · RULE: ${rule}`);
  return lines.join("\n");
}
