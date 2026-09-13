/**
 * Recipe vocabulary + validation for characters and backgrounds. The LLM may PROPOSE
 * a recipe made only of these parts; anything else is dropped, so a bad proposal
 * degrades to a plainer animal instead of a broken render.
 * Mirrors src/components/characters/recipe.ts and src/components/backgrounds/parts.tsx.
 */
export const CHARACTER_PARTS = {
  rigs: ["biped", "fish", "star", "bird", "shell", "longNeck", "tRex", "whale", "quadruped", "insect", "snowman", "frog"],
  ears: ["none", "round", "pointy", "long", "floppy", "big", "tuft"],
  tails: ["none", "pom", "curved", "curly", "long", "stub", "feathers", "bushy", "thin"],
  features: [
    "snout", "pigSnout", "hippoSnout", "pinkNose", "blackNose", "koalaNose", "carrotNose", "beakSmall",
    "whiskers", "mask", "eyePatches", "nostrils", "headStripe", "tigerStripes", "mane", "wool", "hair",
    "horns", "hornUnicorn", "antennae", "spikes", "trunk", "tuftTop", "headCap", "wingsBack", "spout", "buttons",
    "beeBands", "leaf", "bamboo",
  ],
  markings: ["spots", "stripes"],
  accessories: ["bow", "partyHat", "topHat", "glasses", "scarf", "crown", "bandana", "beanie", "collar", "vest", "necklace", "earmuffs", "headdress", "sailorCollar", "headphones", "saddle", "stripedBeanie"],
};

export const BACKGROUND_PARTS = {
  back: ["sun", "moon", "clouds", "birds", "twinkles", "shootingStar", "balloons", "smallFish", "lightRays", "sea", "planet", "rocket", "floatingCandy", "window", "rainClouds"],
  static: [
    "hill", "ground", "wavyGround", "curvedGround", "cloudFloor", "roundTree", "pine", "rainbow", "mushroom", "seaweed", "coral", "shell", "palm",
    "sandcastle", "snowman", "lollipop", "cupcake", "sprinkles", "barn", "fence", "wallDots", "rug", "bed", "lamp", "building", "road", "streetLamp",
    "slide", "swing", "sandbox", "tiles", "counter", "fridge", "stove", "mountains", "rock", "cactus", "castle", "tent", "puddle", "pumpkin", "bench",
    "lilyPad", "reeds", "logs", "campTent", "house",
  ],
  front: ["flowers", "sunflowers", "butterflies", "bubbles", "snowflakes", "fireflies", "foam", "lampGlow", "rain", "leaves", "steam", "fire", "sparkleDust"],
};
export const ALL_BACKGROUND_PARTS = [...BACKGROUND_PARTS.back, ...BACKGROUND_PARTS.static, ...BACKGROUND_PARTS.front];

const HEX = /^#[0-9a-f]{6}$/i;
const hex = (v, d) => (typeof v === "string" && HEX.test(v.trim()) ? v.trim().toLowerCase() : d);
const oneOf = (list, v, d) => (typeof v === "string" && list.includes(v) ? v : d);
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
export const recipeName = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24);

function specList(items, allowed) {
  if (!Array.isArray(items)) return [];
  const out = [];
  for (const it of items) {
    const kind = typeof it === "string" ? it : it && typeof it === "object" ? it.kind : null;
    if (!allowed.includes(kind)) continue;
    if (typeof it === "string") out.push(it);
    else {
      const spec = { kind };
      for (const [k, v] of Object.entries(it)) {
        if (k === "kind") continue;
        if (typeof v === "number" || typeof v === "boolean") spec[k] = v;
        else if (typeof v === "string" && (HEX.test(v) || k === "colors" || k === "tip" || k === "tuft" || k === "rings" || k === "inner" || k === "color" || k === "nose" || k === "dark" || k === "band" || k === "light")) spec[k] = v;
      }
      out.push(spec);
    }
  }
  return out;
}

/** returns a clean character recipe, or null when the proposal is hopeless */
export function validateCharacterRecipe(raw, name) {
  if (!raw || typeof raw !== "object") return null;
  const n = recipeName(name || raw.name);
  if (!n) return null;
  const c = raw.colors && typeof raw.colors === "object" ? raw.colors : {};
  const body = hex(c.body, null);
  if (!body) return null;
  const recipe = {
    emoji: typeof raw.emoji === "string" && raw.emoji.trim() ? [...raw.emoji.trim()].slice(0, 2).join("") : "⭐",
    rig: oneOf(CHARACTER_PARTS.rigs, raw.rig, "biped"),
    colors: {
      body,
      belly: hex(c.belly, "#ffffff"),
      limb: hex(c.limb, body),
      ...(hex(c.inner, null) ? { inner: hex(c.inner, null) } : {}),
      ...(hex(c.accent, null) ? { accent: hex(c.accent, null) } : {}),
      ...(hex(c.dark, null) ? { dark: hex(c.dark, null) } : {}),
    },
    ears: oneOf(CHARACTER_PARTS.ears, raw.ears, "round"),
    tail: oneOf(CHARACTER_PARTS.tails, raw.tail, "none"),
    features: specList(raw.features, CHARACTER_PARTS.features).slice(0, 6),
    markings: specList(raw.markings, CHARACTER_PARTS.markings).slice(0, 2),
    accessories: specList(raw.accessories, CHARACTER_PARTS.accessories).slice(0, 2),
  };
  if (raw.earOptions && typeof raw.earOptions === "object") recipe.earOptions = Object.fromEntries(Object.entries(raw.earOptions).filter(([, v]) => typeof v === "number" || (typeof v === "string" && HEX.test(v))));
  if (raw.tailOptions && typeof raw.tailOptions === "object") recipe.tailOptions = Object.fromEntries(Object.entries(raw.tailOptions).filter(([, v]) => typeof v === "number" || (typeof v === "string" && HEX.test(v))));
  if (raw.face && typeof raw.face === "object") {
    const f = {};
    for (const k of ["eyeY", "eyeGap", "mouthY", "mouthDx", "eyeSize"]) if (typeof raw.face[k] === "number") f[k] = Math.max(-40, Math.min(200, raw.face[k]));
    for (const k of ["beak", "sockets"]) if (typeof raw.face[k] === "boolean") f[k] = raw.face[k];
    if (Object.keys(f).length) recipe.face = f;
  }
  recipe.arm = oneOf(["capsule", "wing"], raw.arm, recipe.rig === "bird" ? "wing" : "capsule");
  recipe.foot = oneOf(["round", "duck", "hoof", "none"], raw.foot, recipe.rig === "bird" ? "duck" : "round");
  if (typeof raw.legWidth === "number") recipe.legWidth = Math.max(10, Math.min(40, raw.legWidth));
  const w = raw.words && typeof raw.words === "object" ? raw.words : {};
  const heroName = typeof w.name === "string" && w.name.trim() ? w.name.trim().slice(0, 20) : cap(n);
  recipe.words = {
    name: heroName,
    one: typeof w.one === "string" ? w.one : n,
    plural: typeof w.plural === "string" ? w.plural : `${n}s`,
    verb: typeof w.verb === "string" ? w.verb : "hop",
    verbs: typeof w.verbs === "string" ? w.verbs : `${typeof w.verb === "string" ? w.verb : "hop"}s`,
    verbing: typeof w.verbing === "string" ? w.verbing : `${typeof w.verb === "string" ? w.verb : "hop"}ping`,
    home: typeof w.home === "string" ? w.home : "meadow",
    sound: typeof w.sound === "string" ? w.sound : null,
  };
  return { name: n, ...recipe };
}

/** returns a clean background recipe, or null */
export function validateBackgroundRecipe(raw, name) {
  if (!raw || typeof raw !== "object") return null;
  const n = recipeName(name || raw.name);
  if (!n) return null;
  const g = Array.isArray(raw.gradient) ? raw.gradient : [];
  const gradient = [hex(g[0], "#8fdcff"), hex(g[1], "#dffbc8")];
  const parts = [];
  for (const p of Array.isArray(raw.parts) ? raw.parts : []) {
    const part = typeof p === "string" ? p : p && typeof p === "object" ? p.part : null;
    if (!ALL_BACKGROUND_PARTS.includes(part)) continue;
    const spec = { part };
    if (typeof p === "object") {
      for (const [k, v] of Object.entries(p)) {
        if (k === "part") continue;
        if (typeof v === "number" || typeof v === "boolean") spec[k] = v;
        else if (typeof v === "string" && v.length < 40) spec[k] = v;
        else if (Array.isArray(v) && v.every((x) => typeof x === "string" || typeof x === "number") && v.length <= 12) spec[k] = v;
      }
    }
    parts.push(spec);
  }
  if (parts.length < 2) return null;
  // every scene needs something to stand on
  if (!parts.some((p) => ["ground", "hill", "wavyGround", "curvedGround", "cloudFloor", "road", "counter"].includes(p.part))) parts.push({ part: "ground", color: "#7fd35a", top: 860, shade: "#56a83f" });
  return {
    name: n,
    gradient,
    palette: typeof raw.palette === "string" ? raw.palette : "meadow",
    description: typeof raw.description === "string" ? raw.description.slice(0, 120) : undefined,
    parts: parts.slice(0, 24),
  };
}
