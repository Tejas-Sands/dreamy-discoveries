/** Per-species words the templates need — restricted to the Sunny Meadow cast
 *  (plus the sleepy star, a sky thing, kept only for the lullaby). */
import { CHARACTER_RECIPES } from "../library.mjs";
import { castMembers } from "../cast.mjs";

const CAST_KINDS = new Set(castMembers().map((m) => m.kind));

/** words per species come from library/characters/<kind>.json → "words" */
export const HEROES = Object.fromEntries(
  Object.entries(CHARACTER_RECIPES)
    .filter(([kind, r]) => (CAST_KINDS.has(kind) || kind === "star") && r.words && r.words.name)
    .map(([kind, r]) => [kind, { ...r.words, emoji: r.emoji || "⭐" }])
);

export const PLACES = {
  meadow: { name: "meadow", the: "the meadow", things: ["the flowers", "the sun", "the butterflies"], palette: "meadow" },
  forest: { name: "forest", the: "the forest", things: ["the tall trees", "the mushrooms", "the fireflies"], palette: "forest" },
  night: { name: "night sky", the: "the night sky", things: ["the moon", "the stars"], palette: "night" },
  underwater: { name: "sea", the: "the deep blue sea", things: ["the bubbles", "the seaweed", "the little fish"], palette: "ocean" },
  sky: { name: "sky", the: "the big blue sky", things: ["the clouds", "the rainbow", "the balloons"], palette: "sunshine" },
  candy: { name: "candy land", the: "candy land", things: ["the lollipops", "the cupcakes"], palette: "candy" },
  beach: { name: "beach", the: "the sunny beach", things: ["the waves", "the sandcastle", "the seashells"], palette: "ocean" },
  snow: { name: "snow", the: "the sparkly snow", things: ["the snowflakes", "the snowman"], palette: "berry" },
  space: { name: "space", the: "outer space", things: ["the planets", "the rocket", "the stars"], palette: "night" },
  farm: { name: "farm", the: "the farm", things: ["the barn", "the sunflowers", "the fence"], palette: "sunshine" },
  bedroom: { name: "bedroom", the: "the cozy bedroom", things: ["the little bed", "the teddy bear"], palette: "berry" },
};

export function heroFor(kind, overrides = {}) {
  const base = HEROES[kind] ?? HEROES.bunny;
  return { kind: HEROES[kind] ? kind : "bunny", ...base, ...overrides };
}

export function placeFor(name, fallback = "meadow") {
  const key = PLACES[name] ? name : fallback;
  return { key, ...PLACES[key] };
}
