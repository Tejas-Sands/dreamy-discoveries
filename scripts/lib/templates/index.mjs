/**
 * AI-free song templates. Every template returns a v2 script the Director then
 * enriches exactly like an LLM script. Pick one with:
 *   node scripts/generate-script.mjs --template counting [--hero duck] [--place farm] [--seed 42]
 */
import { rng, pick } from "./engine.mjs";
import { HEROES, PLACES, heroFor, placeFor } from "./heroes.mjs";
import { counting } from "./counting.mjs";
import { colors } from "./colors.mjs";
import { actions } from "./actions.mjs";
import { animalSounds } from "./animal-sounds.mjs";
import { bodyParts } from "./body-parts.mjs";
import { shapes } from "./shapes.mjs";
import { lullaby } from "./lullaby.mjs";
import { opposites } from "./opposites.mjs";

export const TEMPLATES = Object.fromEntries([counting, colors, actions, animalSounds, bodyParts, shapes, lullaby, opposites].map((t) => [t.id, t]));
export const TEMPLATE_IDS = Object.keys(TEMPLATES);

export function generateFromTemplate({ template, hero, place, seed }) {
  const t = TEMPLATES[template];
  if (!t) throw new Error(`unknown template "${template}" (have: ${TEMPLATE_IDS.join(", ")})`);
  const s = seed ?? Math.floor(Math.random() * 1e9);
  const r = rng(`${template}|${hero ?? ""}|${place ?? ""}|${s}`);
  const heroKind = hero && HEROES[hero] ? hero : pick(r, Object.keys(HEROES).filter((k) => k !== "star" || template === "lullaby"));
  const h = heroFor(heroKind);
  const p = placeFor(place || h.home);
  const script = t.generate({ r, hero: h, place: p, seed: s });
  script.template = template;
  script.seed = s;
  return script;
}

export { HEROES, PLACES };
