/**
 * library/character-bible.json → library/characters/*.json
 *
 * Bootstraps missing recipes from the descriptive bible. Existing recipes are
 * finished artwork specifications and are always kept. Edit those recipes and
 * their SVG drawing code directly; do not regenerate them from prose.
 * Unsupported accessories in new entries are reported and dropped.
 *
 * Usage: node scripts/import-character-bible.mjs [--dry]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateCharacterRecipe } from "./lib/recipes.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BIBLE = path.join(ROOT, "library", "character-bible.json");
const CHARS = path.join(ROOT, "library", "characters");
const EARS = {
  round: "round", "round-side": "round", "tiny-round": "round", "small-round": "round",
  "large-round-side": "big", "huge-round": "big", "large-fluffy": "big",
  "pointed-triangle": "pointy", "pointed-up": "pointy", "pointed-round": "pointy", "pointed-side": "pointy",
  tufted: "tuft", "feather-tufts": "tuft",
  "long-upright": "long",
  floppy: "floppy", "side-droop": "floppy", "floppy-side": "floppy", "folded-tip": "floppy",
  finned: "pointy",
};

const TAILS = {
  stub: "stub", "tiny-stub": "stub", "flat-stub": "stub", "tiny-point": "stub", stinger: "stub",
  puff: "pom", "fluffy-stub": "pom",
  "bushy-large": "bushy", "bushy-ringed": "bushy", "huge-bushy": "bushy",
  "long-curved": "curved", "wagging-curve": "curved", "thin-tufted": "curved", "tufted-end": "curved",
  "long-thin-curved": "curved", "thick-tapered": "curved", "spiked-reptile": "curved", fluke: "curved", "caudal-fin": "curved",
  "long-prehensile": "long", "long-hair": "long",
  curly: "curly",
  "feather-fan": "feathers", "feather-wedge": "feathers", "short-feather": "feathers", wedge: "feathers",
};

const SNOUT = {
  "rounded-oval": "snout", "rounded-soft": "snout", "small-rounded": "snout", "wide-rounded": "snout",
  "wide-oval": "snout", "wide-flat": "snout", "large-oval": "snout", "long-oval": "snout",
  pointed: "snout", "pointed-tiny": "snout", "rounded-box": "snout", "rounded-block": "snout",
  "rounded-beak": "snout", "wide-heart": "snout",
  "huge-rounded": "hippoSnout",
  "button-nose": "pinkNose",
  "flat-disc": "pigSnout",
  carrot: "carrotNose",
  "beak-small": "beakSmall", "beak-tiny": "beakSmall", "beak-pointed": "beakSmall", beak: "beakSmall",
};

const APPEND_AS_FEATURE = {
  wings: "wingsBack", antennae: "antennae", horns: "horns", trunk: "trunk", horn: "hornUnicorn",
  mane: "mane", wool: "wool", crest: "tuftTop", "head-tuft": "tuftTop", spikes: "spikes",
  "dorsal-spikes": "spikes", quills: "spikes", spout: "spout", ossicones: "horns", tusks: "spikes",
  leaf: "leaf", bamboo: "bamboo", "bee-bands": "beeBands", stripes: "beeBands",
};

const ACCESSORIES = {
  scarf: { kind: "scarf", map: [["color", 0]] },
  topHat: { kind: "topHat", map: [["color", 0], ["band", 1]] },
  "top-hat": { kind: "topHat", map: [["color", 0], ["band", 1]] },
  glasses: { kind: "glasses", map: [["color", 0]] },
  bowtie: { kind: "bow", map: [["color", 0]] },
  bow: { kind: "bow", map: [["color", 0]] },
  crown: { kind: "crown", map: [] },
  bandana: { kind: "bandana", map: [["color", 0], ["dark", 1]] },
  beanie: { kind: "beanie", map: [["color", 0], ["band", 1]] },
  "ear-flaps": { kind: "beanie", map: [["color", 0], ["band", 1]] },
  "pom-pom": { kind: "beanie", map: [["color", 0], ["band", 1]] },
  collar: { kind: "collar", map: [["color", 0], ["ring", 1]] },
  cowbell: { kind: "collar", map: [["color", 0], ["ring", 1]] },
  "bone-tag": { kind: "collar", map: [["color", 0], ["ring", 1]] },
  "golden-bell": { kind: "collar", map: [["color", 0], ["ring", 1]] },
  vest: { kind: "vest", map: [["color", 0]] },
  necklace: { kind: "necklace", map: [["color", 0]] },
  pendant: { kind: "necklace", map: [["color", 0]] },
  "amulet-collar": { kind: "necklace", map: [["color", 0]] },
  "tribal-collar": { kind: "necklace", map: [["color", 0]] },
  "tribal-beaded": { kind: "necklace", map: [["color", 0]] },
  beaded: { kind: "necklace", map: [["color", 0]] },
  earmuffs: { kind: "earmuffs", map: [["color", 0]] },
  headphones: { kind: "headphones", map: [["color", 0], ["pad", 1]] },
  headdress: { kind: "headdress", map: [["color", 0], ["band", 1]] },
  sailorCollar: { kind: "sailorCollar", map: [["color", 0]] },
  "sailor-collar": { kind: "sailorCollar", map: [["color", 0]] },
  saddle: { kind: "saddle", map: [["color", 0], ["trim", 1]] },
  stripedBeanie: { kind: "stripedBeanie", map: [["color", 0], ["stripe", 1]] },
  "striped-beanie": { kind: "stripedBeanie", map: [["color", 0], ["stripe", 1]] },
  leaf: { kind: "leaf", map: [["color", 0]] },
  bamboo: { kind: "bamboo", map: [["color", 0]] },
};

const MARKING_AS_FEATURE = { "eye-patch": "eyePatches", "eye-patches": "eyePatches", "bandit-mask": "mask", "face-mask": "mask", mask: "mask" };

function convert(entry) {
  const { id, metadata, palette, anatomy, face, markings, accessories, linguistics } = entry;
  const p = palette ?? {};
  const raw = {
    name: id,
    emoji: metadata?.emoji ?? "⭐",
    rig: ({star: "star", snowman: "snowman", frog: "frog", bee: "insect", ladybug: "insect", dinosaur: "tRex", dragon: "tRex", giraffe: "longNeck", bird: "bird", chick: "bird", penguin: "bird"})[id] ?? (metadata?.rigType === "aquatic" ? (id === "whale" ? "whale" : "fish") : metadata?.rigType === "quadruped" ? "quadruped" : "biped"),
    colors: {
      body: p.primary ?? "#ffffff",
      belly: p.secondary ?? "#ffffff",
      limb: p.primary ?? "#ffffff",
      ...(p.accent1 ? { accent: p.accent1 } : {}),
      ...(p.accent2 ? { dark: p.accent2 } : {}),
    },
    ears: anatomy?.ears ? EARS[anatomy.ears.style] ?? "round" : "none",
    tail: anatomy?.tail ? TAILS[anatomy.tail.style] ?? "none" : "none",
    features: [],
    markings: (markings ?? [])
      .filter((m) => m?.type === "spots" || m?.type === "stripes")
      .map((m) => (p[m.colorRef] ? { kind: m.type, color: p[m.colorRef] } : m.type)),
    accessories: [],
  };
  for (const a of accessories ?? []) {
    const A = ACCESSORIES[a.kind] ?? ACCESSORIES[a.style];
    if (!A) { console.warn(`[bible] ${id}: dropped accessory "${a.kind}" (${a.style ?? ""})`); continue; }
    const spec = { kind: A.kind };
    for (const [k, i] of A.map) if (a.colors?.[i]) spec[k] = a.colors[i];
    raw.accessories.push(spec);
  }
  for (const ap of anatomy?.appendages ?? []) {
    const feat = APPEND_AS_FEATURE[ap.type];
    if (feat) raw.features.push(feat);
    if (ap.type === "eye-bulges") raw.faceSockets = true;
    if (ap.type === "flippers" || ap.type === "fins" || ap.type === "points" || ap.type === "shell" || ap.type === "arms") continue;
  }
  for (const m of markings ?? []) {
    const feat = MARKING_AS_FEATURE[m.type];
    if (feat) raw.features.push(feat);
  }
  if (face?.snout?.style) {
    const f = SNOUT[face.snout.style];
    if (f) raw.features.push(f);
    if (face.snout.style === "flat-bill") raw.face = { ...(raw.face ?? {}), beak: true };
  }
  if (raw.faceSockets) raw.face = { ...(raw.face ?? {}), sockets: true };
  raw.face = { ...(raw.face ?? {}), eyeGap: face?.eyeGap, eyeSize: face?.eyeSize, mouthY: face?.mouthY ?? undefined };
  raw.words = {
    name: linguistics?.name ?? id,
    one: linguistics?.singular ?? id,
    plural: linguistics?.plural ?? `${id}s`,
    verb: linguistics?.verb ?? "hop",
    verbs: `${linguistics?.verb ?? "hop"}s`,
    verbing: `${linguistics?.verb ?? "hop"}ing`,
    home: linguistics?.home ?? "meadow",
    sound: null,
  };

  const recipe = validateCharacterRecipe(raw, id);
  if (!recipe) { console.warn(`[bible] ${id}: failed validation — skipped`); return null; }
  return recipe;
}

const bible = JSON.parse(fs.readFileSync(BIBLE, "utf8"));
const dry = process.argv.includes("--dry");
let ok = 0;
for (const entry of bible.characters) {
  const existingPath = path.join(CHARS, `${entry.id}.json`);
  const existing = fs.existsSync(existingPath) ? JSON.parse(fs.readFileSync(existingPath, "utf8")) : null;
  // Recipes are finished artwork specifications, not disposable bible translations.
  if (existing) {
    console.log(`[bible] ${entry.id}: kept existing design`);
    ok++;
    continue;
  }
  const recipe = convert(entry);
  if (!recipe) continue;
  const out = JSON.stringify(recipe, null, 2) + "\n";
  if (!dry) fs.writeFileSync(existingPath, out);
  ok++;
  const access = (recipe.accessories ?? []).map((a) => a.kind).join(",") || "—";
  console.log(`[bible] ${entry.id.padEnd(10)} rig=${recipe.rig.padEnd(8)} ears=${recipe.ears} tail=${recipe.tail} features=[${(recipe.features ?? []).length}] accessories=[${access}] pal=${recipe.colors.body}`);
}
console.log(`\n[bible] ${ok}/${bible.characters.length} characters${dry ? " (dry run)" : " written"}`);
