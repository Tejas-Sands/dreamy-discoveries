/**
 * The Sunny Meadow cast — the universe's single source of truth.
 *
 * library/cast.json holds the 6 animals, their names, personalities, catchphrases,
 * homes and a relationship graph (friends / rivals / family / mentor). Everything
 * in the pipeline that picks a character — the LLM prompt, the Director's party
 * guests and gag cameos, the AI-free templates — pulls from here, so stories tell
 * one consistent world and nothing is ever invented twice.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CAST_PATH = path.join(ROOT, "library", "cast.json");

let _cache = null;
export function loadCast() {
  if (!_cache) _cache = JSON.parse(fs.readFileSync(CAST_PATH, "utf8"));
  return _cache;
}

/** every cast member card (one per named character; a kind can repeat as family) */
export const castMembers = () => loadCast().members;
/** the distinct species of the universe (6) */
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
    `THE CAST (these SIX animals are the WHOLE world; a story NEVER introduces a new species — every friend, party guest and gag is one of them):`,
  ];
  for (const m of castMembers()) {
    const family = Array.isArray(m.family) && m.family.length
      ? ` Family: ${m.family.map((f) => `${f.name} the ${f.kind} (${f.role})`).join(", ")}.`
      : "";
    const friends = (m.friends ?? []).map(mem).filter(Boolean).map((x) => x.name).join(", ") || "–";
    const rivals = (m.rivals ?? []).map(mem).filter(Boolean).map((x) => x.name).join(", ") || "none";
    const mentor = m.mentor ? mem(m.mentor)?.name : null;
    const tag = m.catchphrase ? ` Catchphrase: "${m.catchphrase}"` : "";
    lines.push(
      `  · ${m.name} the ${m.kind} — ${m.role}, ${m.personality}. Lives at the ${m.livesAt}. Loves ${m.favorite}. Friends: ${friends}. Rivals (Sunny Meadow Games only): ${rivals}.${mentor ? ` Mentor: ${mentor}.` : ""}${tag}${family}`
    );
  }
  for (const rule of cast.rules) lines.push(`  · RULE: ${rule}`);
  return lines.join("\n");
}