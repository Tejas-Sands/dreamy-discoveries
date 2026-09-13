/**
 * The Director — deterministic enrichment of script.json.
 *
 * The LLM is good at words and bad at consistency, so every engagement
 * mechanic lives here, in plain code, and is written INTO the script:
 *   - normalizes v1 scripts (old background/character names, moral string)
 *   - pulls laughs / giggles / gasps OUT of the spoken text into vox cues (real recordings, never TTS)
 *   - infers a speaker, emotion, action and sound effects for every line
 *   - detects counting / number / color lines and attaches big callouts
 *   - question scenes get an answer, a "praise" line and a star reward
 *   - adds a spoken greeting over the title card
 *   - stories get a moral sequence: lesson recap → chant → "say it with me" → chant again
 *   - sprinkles pattern interrupts (peek-a-boo from an edge, an emoji flying past) every few scenes
 *   - invites party guests (extras dancing at the edges) into choruses, the chant and the finale
 *   - picks scene transitions, camera moves and the music mood
 *
 * Idempotent: running it again on a directed (or hand-edited) script only
 * fills in what is missing.
 */
import {
  BACKGROUNDS, CHARACTERS, PALETTES, EMOTIONS, ACTIONS, SCENE_KINDS, TRANSITIONS, SFX,
  BACKGROUND_ALIASES, CHARACTER_ALIASES, DEFAULT_NAMES, COLOR_WORDS, NUMBER_WORDS,
  COUNT_EMOJI, CHARACTER_EMOJI, isOneOf,
} from "./vocab.mjs";

import { validateBackgroundRecipe } from "./recipes.mjs";
import { extractVox, normalizeVox, VOX_PRE_SEC, VOX_POST_SEC } from "./vox.mjs";
import { hintCharacter, hintBackground } from "./hints.mjs";
import { saveRecipe } from "./library.mjs";
import { castMembers, castKinds, castOrder } from "./cast.mjs";

/** the Sunny Meadow universe — the species that may appear on screen (plus the legacy zoo for old samples) */
const UNIVERSE_KINDS = castKinds();

const SPECIES_EMOJI = CHARACTER_EMOJI;

/** LLM-proposed backgrounds: validate and save to the library (characters never — Sunny Meadow is closed) */
function adoptNewRecipes(script) {
  const adopted = [];
  for (const item of Array.isArray(script.newCharacters) ? script.newCharacters : []) {
    const name = item?.name ?? item?.recipe?.name;
    console.warn(`[director] ignored new character "${name}" — the world only has the library/cast.json cast`);
  }
  for (const item of Array.isArray(script.newBackgrounds) ? script.newBackgrounds : []) {
    const name = item?.name ?? item?.recipe?.name;
    const recipe = validateBackgroundRecipe(item?.recipe ?? item, name);
    if (!recipe || BACKGROUNDS.includes(recipe.name)) continue;
    saveRecipe("backgrounds", recipe.name, recipe);
    BACKGROUNDS.push(recipe.name);
    adopted.push(`background:${recipe.name}`);
  }
  delete script.newCharacters;
  delete script.newBackgrounds;
  if (adopted.length) console.log(`[director] adopted new recipes: ${adopted.join(", ")}`);
  return adopted;
}

const resolveCharacter = (raw, fallback) => {
  const aliased = CHARACTER_ALIASES[raw] || raw;
  if (aliased === "none") return "none";
  return isOneOf(CHARACTERS, aliased) ? aliased : hintCharacter(aliased, CHARACTERS) ?? fallback;
};
const resolveBackground = (raw, fallback) => {
  const aliased = BACKGROUND_ALIASES[raw] || raw;
  return isOneOf(BACKGROUNDS, aliased) ? aliased : hintBackground(aliased, BACKGROUNDS) ?? fallback;
};

const ACTION_RULES = [
  [/\b(clap|clapping|clapped)\b/i, "clap"],
  [/\b(spin|spinning|spun|twirl|twirling|turn around)\b/i, "spin"],
  [/\b(stomp|stomping|march|marching)\b/i, "stomp"],
  [/\b(jump|jumping|jumped|hop|hopping|hopped|bounce|bouncing|bounced|leap)\b/i, "jump"],
  [/\b(hug|hugging|hugged|cuddle|cuddled)\b/i, "hug"],
  [/\b(sleep|sleeping|asleep|goodnight|good night|yawn|yawned|snuggle|snuggled|dream|dreams)\b/i, "sleep"],
  [/\b(cry|crying|cried|tears|sob|sobbed)\b/i, "cry"],
  [/\b(hooray|yay|hurray|yippee|we did it|great job|well done|you did it)\b/i, "cheer"],
  [/\b(dance|dancing|danced|wiggle|wiggling|wiggled|boogie|shake your)\b/i, "dance"],
  [/\b(wave|waving|waved|hello|hi friends|bye|goodbye)\b/i, "wave"],
  [/\b(swim|swimming|swam|splash|splashing|splashed)\b/i, "swim"],
  [/\b(fly|flying|flew|flap|flapping|soar)\b/i, "fly"],
  [/\b(think|thinking|thought|wonder|wondered|hmm)\b/i, "think"],
  [/\b(eat|eating|ate|yummy|munch|munched|nibble|nibbled)\b/i, "eat"],
  [/\b(walk|walking|walked|run|running|ran|went|hurried|skipped)\b/i, "walk"],
  [/\b(look|looked|see|saw|watch|watched|point|peek)\b/i, "look"],
  [/\b(nod|nodded)\b/i, "nod"],
];

const EMOTION_RULES = [
  [/\b(sad|sadly|cried|cry|crying|lonely|alone|sorry|tears|miss|missed|unhappy)\b/i, "sad"],
  [/\b(scared|afraid|worried|oh no|uh oh|lost|dark|nervous|shy)\b/i, "worried"],
  [/\b(wow|whoa|surprise|surprised|suddenly|oh my|what's that|look!)\b/i, "surprised"],
  [/\b(love|loved|hug|hugs|heart|thank you|thanks|kind|kindness|friend|friends|share|sharing)\b/i, "love"],
  [/\b(sleep|sleepy|asleep|yawn|tired|dream|dreams|snuggle|goodnight|bedtime|lullaby)\b/i, "sleepy"],
  [/\b(think|thinking|wonder|wondered|hmm|maybe|what should|which|should)\b/i, "thinking"],
  [/\b(yay|hooray|hurray|yippee|let's go|great job|so fun|party|dance|jump|bounce)\b/i, "excited"],
];

const ACTION_EMOTION = {
  sleep: "sleepy", cry: "sad", think: "thinking", cheer: "excited", hug: "love",
  dance: "excited", jump: "excited", clap: "happy", spin: "excited",
};

const ACTION_SFX = {
  jump: ["boing"], clap: ["clap"], spin: ["whoosh"], cheer: ["tada"], stomp: ["stomp"],
  swim: ["splash"], fly: ["whoosh"], hug: ["heart"], sleep: ["yawn"],
};

const PRAISE_TEMPLATES = [
  "Yes! {A}! Great job!",
  "That's right, {A}! Hooray!",
  "{A}! You got it! High five!",
  "Yes! {A}! You are so smart!",
  "Wonderful! {A}! Well done!",
];

/** party guests (chorus / chant / finale) and gag cameos come from the Sunny Meadow cast via cast.mjs */
const DANCE_MOVES = ["dance", "spin", "clap", "jump", "stomp", "cheer"];

/** what flies past in a flyby gag, by place */
const FLYBY_BY_PLACE = [
  [/underwater|pond|beach/, "🐠"],
  [/night|space|campfire/, "🌠"],
  [/snow/, "❄️"],
  [/candy|circus|playground|city|park/, "🎈"],
  [/garden|meadow|farm|forest|jungle|autumn/, "🦋"],
];
const flybyFor = (background, n = 0) => {
  const first = (FLYBY_BY_PLACE.find(([re]) => re.test(background)) ?? [null, "🐦"])[1];
  const alternates = { "🦋": ["🦋", "🐝", "🐦", "🎈"], "🐠": ["🐠", "🐙", "🐢", "🫧"], "🌠": ["🌠", "🚀", "🦉", "🌙"], "❄️": ["❄️", "🐧", "⛄", "🎈"], "🎈": ["🎈", "🦋", "🐦", "🪁"], "🐦": ["🐦", "🦋", "🎈", "🐝"] };
  const list = alternates[first] ?? [first];
  return list[n % list.length];
};

const clone = (x) => JSON.parse(JSON.stringify(x));
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const norm = (s) => String(s ?? "").toLowerCase().replace(/[^\p{L}\p{N}\s']/gu, " ").replace(/\s+/g, " ").trim();

function pick(list, value, fallback) {
  return isOneOf(list, value) ? value : fallback;
}

export function inferAction(text) {
  for (const [re, action] of ACTION_RULES) if (re.test(text)) return action;
  return null;
}

export function inferEmotion(text) {
  for (const [re, emotion] of EMOTION_RULES) if (re.test(text)) return emotion;
  return null;
}

const ONE_AS_PRONOUN_BEFORE = new Set(["another", "the", "that", "this", "no", "some", "each", "every", "which", "any"]);
const ONE_AS_PRONOUN_AFTER = new Set(["more", "day", "time", "of", "another", "by"]);

function numberTokens(text) {
  const out = [];
  const words = norm(text).split(" ").map((raw) => raw.replace(/'s$/, ""));
  words.forEach((w, i) => {
    if (w === "one" && (ONE_AS_PRONOUN_BEFORE.has(words[i - 1]) || ONE_AS_PRONOUN_AFTER.has(words[i + 1]))) return; // "another one", "one more"
    if (NUMBER_WORDS[w]) out.push(NUMBER_WORDS[w]);
    else if (/^(10|[1-9])$/.test(w)) out.push(Number(w));
  });
  return out;
}

function findEmoji(texts, fallback) {
  for (const t of texts) {
    for (const raw of norm(t).split(" ")) {
      const w = raw.replace(/'s$/, "");
      if (COUNT_EMOJI[w]) return COUNT_EMOJI[w];
    }
  }
  return fallback;
}

function inferCallout(line, scene, main) {
  const text = line.text;
  const nums = numberTokens(text);
  const fallbackEmoji = scene.prop || SPECIES_EMOJI[scene.character] || SPECIES_EMOJI[main.kind] || "⭐";
  const emoji = findEmoji([text, ...scene.lines.map((l) => l.text)], fallbackEmoji);

  // Counting up: "one little hop, two little hops, three..."
  if (nums.length >= 2) {
    let ascending = true;
    for (let i = 1; i < nums.length; i++) if (nums[i] !== nums[i - 1] + 1) ascending = false;
    if (ascending) return { kind: "count", emoji, count: Math.min(10, nums[nums.length - 1]) };
  }
  if (nums.length === 1 && nums[0] <= 10) {
    return { kind: "number", text: String(nums[0]), emoji };
  }

  const colors = Object.keys(COLOR_WORDS).filter((c) => new RegExp(`\\b${c}\\b`, "i").test(text));
  if (colors.length >= 3) return { kind: "emoji", text: "RAINBOW", emoji: "🌈" };
  if (colors.length >= 1) {
    const c = colors[0];
    return { kind: "color", text: c.toUpperCase(), color: COLOR_WORDS[c], emoji };
  }
  return null;
}

function validCallout(c) {
  if (!c || typeof c !== "object") return null;
  const kind = pick(["word", "number", "count", "color", "emoji"], c.kind, null);
  if (!kind) return null;
  const out = { kind };
  if (typeof c.text === "string" && c.text.trim()) out.text = c.text.trim().slice(0, 18);
  if (typeof c.emoji === "string" && c.emoji.trim()) out.emoji = c.emoji.trim().slice(0, 4);
  if (typeof c.color === "string" && /^#[0-9a-f]{3,8}$/i.test(c.color)) out.color = c.color;
  if (kind === "color" && !out.color) {
    const key = Object.keys(COLOR_WORDS).find((k) => k === (out.text || "").toLowerCase());
    out.color = key ? COLOR_WORDS[key] : "#ff3b3b";
  }
  if (kind === "count") out.count = Math.max(1, Math.min(10, Math.round(Number(c.count) || 3)));
  if (kind === "number" && !out.text) return null;
  if (kind === "word" && !out.text) return null;
  if (kind === "emoji" && !out.emoji) return null;
  return out;
}

function looksSpoken(text) {
  return (
    /["“”]/.test(text) ||
    /\b(i|i'm|i'll|i've|we|we're|let's|you|your|can you|my|me|hi|hello|thank you|please|sorry)\b/i.test(text)
  );
}

/**
 * Normalize a line and pull the vocalizations out of it: "Ha ha! That tickles!" becomes
 * text "That tickles!" + vox [{ kind: "laugh", at: "start" }]. A line that was ONLY a laugh
 * comes back with an empty text; the scene normalizer hands its cues to a neighbour.
 */
function normalizeLine(raw) {
  const obj = typeof raw === "string" ? { text: raw } : raw;
  if (!obj || typeof obj !== "object" || typeof obj.text !== "string") return null;
  const { text, cues } = extractVox(obj.text);
  const vox = normalizeVox([...(Array.isArray(obj.vox) ? obj.vox : []), ...cues]);
  const line = { ...obj, text };
  // assign (not delete) so a re-run keeps the key order and the committed JSON stays byte-identical
  line.vox = vox.length ? vox : undefined;
  line.voxPreSec = undefined;
  line.voxPostSec = undefined;
  if (!line.text && !line.vox) return null;
  return line;
}

/** merge laugh-only lines into their neighbours, move start cues to the end of the previous line, reserve room */
function settleVox(lines) {
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.text) { out.push(line); continue; }
    // a cue that moves to another line keeps its own speaker (the friend's laugh stays the friend's)
    const cues = (line.vox ?? []).map((v) => ({ ...v, speaker: v.speaker ?? line.speaker }));
    const prev = out[out.length - 1];
    const next = lines.slice(i + 1).find((l) => l.text);
    if (prev) prev.vox = normalizeVox([...(prev.vox ?? []), ...cues.map((v) => ({ ...v, at: "end" }))]);
    else if (next) next.vox = normalizeVox([...cues.map((v) => ({ ...v, at: "start" })), ...(next.vox ?? [])]);
  }
  for (let i = 1; i < out.length; i++) {
    const starts = (out[i].vox ?? []).filter((v) => v.at === "start");
    if (starts.length === 0) continue;
    // a laugh before this line IS a laugh after the previous one — no extra silence needed
    out[i - 1].vox = normalizeVox([...(out[i - 1].vox ?? []), ...starts.map((v) => ({ ...v, at: "end", speaker: v.speaker ?? out[i].speaker }))]);
    const rest = out[i].vox.filter((v) => v.at !== "start");
    out[i].vox = rest.length ? rest : undefined;
  }
  for (const line of out) {
    if (!line.vox) continue;
    // several cues at the same anchor play one after another: reserve room for each (max 2 per side)
    const starts = line.vox.filter((v) => v.at === "start").length;
    const ends = line.vox.filter((v) => v.at === "end").length;
    if (starts) line.voxPreSec = +(VOX_PRE_SEC * Math.min(2, starts)).toFixed(2);
    if (ends) line.voxPostSec = +(VOX_POST_SEC * Math.min(2, ends)).toFixed(2);
  }
  return out;
}

function normalizeScene(raw, main) {
  const scene = { ...raw };
  scene.background = resolveBackground(scene.background, "meadow");
  scene.character = resolveCharacter(scene.character, main.kind);
  if (scene.secondCharacter) {
    scene.secondCharacter = resolveCharacter(scene.secondCharacter, null);
    if (!scene.secondCharacter || scene.secondCharacter === "none" || scene.secondCharacter === scene.character) scene.secondCharacter = null;
  }
  scene.lines = settleVox((Array.isArray(scene.lines) ? scene.lines : []).map(normalizeLine).filter(Boolean));
  scene.energy = scene.energy === "upbeat" ? "upbeat" : scene.energy === "calm" ? "calm" : undefined;
  scene.holdSec = Math.max(0, Math.min(6, Number(scene.holdSec) || 0));
  scene.kind = pick(SCENE_KINDS, scene.kind, undefined);
  scene.emotion = pick(EMOTIONS, scene.emotion, undefined);
  scene.action = pick(ACTIONS, scene.action, undefined);
  scene.transition = pick(TRANSITIONS, scene.transition, undefined);
  scene.camera = pick(["still", "zoom-in", "zoom-out", "pan"], scene.camera, undefined);
  if (typeof scene.prop !== "string" || !scene.prop.trim()) scene.prop = null;
  if (Array.isArray(scene.extras)) {
    scene.extras = scene.extras.map((k) => resolveCharacter(k, null)).filter((k) => k && k !== "none" && k !== scene.character).slice(0, 2);
  } else if (scene.extras !== null) {
    scene.extras = undefined; // the Director decides below
  }
  if (scene.gag && typeof scene.gag === "object") {
    const kind = scene.gag.kind === "flyby" ? "flyby" : "peek";
    const side = scene.gag.side === "left" ? "left" : "right";
    const atSec = Math.max(0.5, Math.min(20, Number(scene.gag.atSec) || 2.2));
    scene.gag = kind === "flyby"
      ? { kind, emoji: typeof scene.gag.emoji === "string" && scene.gag.emoji.trim() ? scene.gag.emoji.trim().slice(0, 4) : flybyFor(scene.background), side, atSec }
      : { kind, character: resolveCharacter(scene.gag.character, "monkey"), side, atSec };
  }
  if (scene.question && typeof scene.question === "object") {
    const a = scene.question.answer;
    const answer =
      typeof a === "string"
        ? { text: a }
        : a && typeof a === "object" && typeof a.text === "string"
          ? { text: a.text, emoji: a.emoji, color: a.color }
          : null;
    scene.question = answer ? { answer: { ...answer, text: answer.text.trim().slice(0, 24) } } : null;
    if (typeof raw.question?.praise === "string" && raw.question.praise.trim()) {
      scene.question = { ...(scene.question || { answer: { text: "Yes!" } }), praise: raw.question.praise.trim() };
    }
  } else {
    scene.question = null;
  }
  return scene;
}

function mainCharacterOf(script) {
  const given = script.mainCharacter;
  let kind = given && typeof given === "object" ? resolveCharacter(given.kind, null) : null;
  if (!kind || kind === "none") {
    const counts = {};
    for (const s of script.scenes ?? []) {
      const k = resolveCharacter(s.character, null);
      if (k && k !== "none") counts[k] = (counts[k] || 0) + 1;
    }
    kind = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0] || hintCharacter(String(script.topic ?? "").split(/\s+/).find((w) => hintCharacter(w, CHARACTERS)) ?? "", CHARACTERS) || "bunny";
  }
  const name =
    given && typeof given.name === "string" && given.name.trim()
      ? given.name.trim().slice(0, 20)
      : DEFAULT_NAMES[kind];
  return { kind, name };
}

function chorusKeys(scenes) {
  const seen = new Map();
  for (const s of scenes) {
    const key = s.lines.map((l) => norm(l.text)).join("|");
    if (s.lines.length >= 2) seen.set(key, (seen.get(key) || 0) + 1);
  }
  // A chorus repeats more than the verses do. If the whole song was reprised
  // (every verse appears twice), only the group that repeats the most counts.
  const counts = [...seen.values()];
  const max = Math.max(0, ...counts);
  const threshold = counts.filter((n) => n >= 2).length > counts.length * 0.6 ? Math.max(3, max) : 2;
  return new Set([...seen.entries()].filter(([, n]) => n >= threshold).map(([k]) => k));
}

function inferKind(scene, script, choruses) {
  if (scene.kind) return scene.kind;
  if (scene.question) return "question";
  const joined = scene.lines.map((l) => l.text).join(" ");
  const asksChild = /\bcan you\b|\bwhat (color|colour|is|do you)\b|\bhow many\b|\bdo you\b|\bwhere is\b/i.test(joined);
  if (asksChild && /\?/.test(joined) && scene.holdSec >= 1.5) return "question";
  if (choruses.has(scene.lines.map((l) => norm(l.text)).join("|"))) return "chorus";
  return script.type === "story" ? "story" : "verse";
}

function otherSpecies(exclude, n = 0) {
  // cameos come from the Sunny Meadow cast only
  const pool = UNIVERSE_KINDS.filter((k) => !exclude.includes(k));
  return pool.length ? pool[n % pool.length] : "bunny";
}

/** `count` party guests from the Sunny Meadow cast, not already on screen; friends seen earlier come first */
function partyGuests(script, scene, si, count, main) {
  const onScreen = new Set([scene.character, scene.secondCharacter, main.kind, scene.gag?.character].filter(Boolean)).add("none");
  const seen = [];
  for (const s of script.scenes.slice(0, si)) {
    for (const k of [s.secondCharacter, s.character, s.gag?.character]) if (k && !onScreen.has(k) && !seen.includes(k)) seen.push(k);
  }
  const pool = [...seen, ...castOrder()].filter((k, i, arr) => !onScreen.has(k) && arr.indexOf(k) === i);
  // rotate so consecutive parties don't always show the same guests
  const start = pool.length ? si % pool.length : 0;
  return [...pool.slice(start), ...pool.slice(0, start)].slice(0, count);
}

const VERSE_CYCLE = ["idle", "nod", "wave", "dance", "look", "jump"];
const STORY_CYCLE = ["idle", "walk", "look", "nod", "idle", "think"];

export function directScript(input, opts = {}) {
  const script = clone(input);
  script.version = 2;
  script.type = script.type === "story" ? "story" : "rhyme";
  if (!isOneOf(PALETTES, script.palette)) script.palette = script.type === "story" ? "forest" : "meadow";
  if (!Array.isArray(script.scenes)) script.scenes = [];

  adoptNewRecipes(script);
  const main = mainCharacterOf(script);
  script.mainCharacter = main;
  delete script.moralAudio; // v1

  script.scenes = script.scenes.map((s) => normalizeScene(s, main)).filter((s) => s.lines.length > 0);

  // ── greeting over the title card ──
  const intro = script.intro ? normalizeLine(script.intro) : null;
  if (intro && !intro.text) intro.text = `Hi friends! I'm ${main.name}!`;
  script.intro = intro
    ? { ...intro, role: "greeting", speaker: "character", emotion: intro.emotion ?? "excited", action: intro.action ?? "wave" }
    : {
        text:
          script.type === "story"
            ? `Hi friends! I'm ${main.name}! I have a story for you. Are you ready?`
            : `Hi friends! I'm ${main.name}! Are you ready to sing? Let's go!`,
        role: "greeting",
        speaker: "character",
        emotion: "excited",
        action: "wave",
      };

  // ── goodbye over the end card ──
  const outro = script.outro ? normalizeLine(script.outro) : null;
  if (outro && !outro.text) outro.text = "Bye bye, friends!";
  script.outro = outro
    ? { ...outro, role: "greeting", speaker: "character", emotion: outro.emotion ?? "happy", action: outro.action ?? "wave" }
    : {
        text: script.type === "story"
          ? `Bye bye, friends! See you next time!`
          : `That was so much fun! Bye bye, friends!`,
        role: "greeting",
        speaker: "character",
        emotion: "happy",
        action: "wave",
      };

  // ── moral sequence (stories, or any script with a moral) ──
  const moral = typeof script.moral === "string" && script.moral.trim() ? script.moral.trim() : null;
  script.moral = moral;
  const rhyme = Array.isArray(script.moralRhyme)
    ? script.moralRhyme.filter((l) => typeof l === "string" && l.trim()).map((l) => l.trim()).slice(0, 2)
    : [];
  script.moralRhyme = rhyme.length === 2 ? rhyme : null;
  // ("lesson" is the in-story lightbulb beat; only generated "moral" scenes mean the chant already exists)
  const hasMoralScenes = script.scenes.some((s) => s.kind === "moral");
  if (moral && !hasMoralScenes) {
    const last = script.scenes[script.scenes.length - 1];
    const bg = last?.background ?? "meadow";
    const chant = script.moralRhyme ?? [moral];
    script.scenes.push(
      {
        kind: "moral",
        background: bg,
        character: main.kind,
        energy: "calm",
        transition: "iris",
        camera: "zoom-in",
        holdSec: 0.6,
        lines: [
          { text: `${main.name} learned something very important!`, speaker: "narrator", emotion: "surprised", action: "think", sfx: ["magic"], role: "moral" },
          { text: moral, speaker: "character", emotion: "love", action: "nod", role: "moral", callout: { kind: "emoji", emoji: "💡" } },
        ],
      },
      {
        kind: "moral",
        background: bg,
        character: main.kind,
        energy: "upbeat",
        transition: "pop",
        holdSec: 1.6,
        lines: [
          ...chant.map((t) => ({ text: t, speaker: "character", emotion: "excited", action: "dance", role: "moral" })),
          { text: "Can you say it with me?", speaker: "character", emotion: "happy", action: "point", role: "moral" },
        ],
      },
      {
        kind: "moral",
        background: bg,
        character: main.kind,
        energy: "upbeat",
        transition: "pop",
        holdSec: 0.8,
        lines: [
          ...chant.map((t) => ({ text: t, speaker: "character", emotion: "excited", action: "cheer", role: "moral" })),
          { text: "Hooray! You did it!", speaker: "character", emotion: "excited", action: "cheer", role: "praise", sfx: ["tada", "applause"] },
        ],
      }
    );
  }

  // ── scenes ──
  const choruses = chorusKeys(script.scenes);
  let praiseIdx = 0;
  let starIndex = 0;
  let lastGagScene = -10;
  let gagAlt = 0;
  let peekCount = 0;
  let flybyCount = 0;
  let transitionAlt = 0;
  let cameraAlt = 0;
  let upbeatCameraAlt = 0;
  let chorusTransitionAlt = 0;
  const chorusSeen = new Map(); // chorus text → how many times it has played

  script.scenes.forEach((scene, si) => {
    scene.kind = inferKind(scene, script, choruses);
    const isQuestion = scene.kind === "question";
    // reprise number of this chorus (0 = first time): the moves change every time it comes back
    const chorusKey = scene.kind === "chorus" ? scene.lines.map((l) => norm(l.text)).join("|") : null;
    const reprise = chorusKey ? chorusSeen.get(chorusKey) ?? 0 : 0;
    if (chorusKey) chorusSeen.set(chorusKey, reprise + 1);
    const upbeatKind = isQuestion || scene.kind === "chorus" || scene.kind === "moral";
    if (!scene.energy) scene.energy = upbeatKind ? "upbeat" : "calm";

    // a friend mentioned by species OR by cast name ("Taffy asked Ben…") gets to stand on the right
    if (script.type === "story" && scene.secondCharacter === undefined && scene.character !== "none") {
      const joined = scene.lines.map((l) => l.text).join(" ");
      let mentioned = CHARACTERS.find(
        (k) => k !== scene.character && k !== main.kind && new RegExp(`\\b${k}s?\\b`, "i").test(joined)
      );
      if (!mentioned) {
        for (const m of castMembers()) {
          if (m.kind === scene.character || m.kind === main.kind) continue;
          const short = m.name.split(/\s+/).pop();
          if (new RegExp(`\\b${short}\\b`, "i").test(joined)) { mentioned = m.kind; break; }
        }
      }
      scene.secondCharacter = mentioned ?? null;
    }
    if (scene.secondCharacter === undefined) scene.secondCharacter = null;

    // question: make sure there is an answer + a praise line, and award a star
    if (isQuestion) {
      const qText = scene.lines.map((l) => l.text).join(" ");
      if (!scene.question) {
        const colors = Object.keys(COLOR_WORDS).filter((c) => new RegExp(`\\b${c}\\b`, "i").test(qText));
        const nums = numberTokens(qText);
        scene.question = colors[0]
          ? { answer: { text: cap(colors[0]), color: COLOR_WORDS[colors[0]] } }
          : nums.length
            ? { answer: { text: String(nums[nums.length - 1]), emoji: findEmoji([qText], SPECIES_EMOJI[scene.character] || "⭐") } }
            : { answer: { text: "Yes!", emoji: "⭐" } };
      }
      const a = scene.question.answer;
      if (!a.emoji && !a.color) a.emoji = findEmoji([a.text, qText], SPECIES_EMOJI[scene.character] || "⭐");
      if (!a.color) {
        const c = Object.keys(COLOR_WORDS).find((k) => k === a.text.toLowerCase());
        if (c) a.color = COLOR_WORDS[c];
      }
      if (scene.holdSec < 2) scene.holdSec = 2.5;
      const hasPraise = scene.lines.some((l) => l.role === "praise");
      if (!hasPraise) {
        const praiseText =
          scene.question.praise ||
          PRAISE_TEMPLATES[praiseIdx++ % PRAISE_TEMPLATES.length].replace("{A}", a.text.replace(/[!.]+$/, ""));
        scene.lines.push({ text: praiseText, role: "praise" });
      }
      delete scene.question.praise;
      for (const l of scene.lines) if (l.role !== "praise") l.role = "question";
      scene.starIndex = starIndex++;
    }

    // per-line enrichment
    scene.lines.forEach((line, li) => {
      const isPraise = line.role === "praise";
      line.speaker = pick(["character", "narrator", "friend"], line.speaker, undefined);
      if (line.speaker === "friend" && !scene.secondCharacter) line.speaker = "character";
      if (!line.speaker) {
        line.speaker =
          script.type === "rhyme" || isQuestion || isPraise || scene.kind === "moral" || scene.kind === "chorus"
            ? "character"
            : looksSpoken(line.text)
              ? "character"
              : "narrator";
      }
      if (scene.character === "none") line.speaker = "narrator";

      line.action = pick(ACTIONS, line.action, undefined);
      if (!line.action) {
        line.action =
          isPraise ? "cheer"
          : isQuestion ? (inferAction(line.text) ?? "point")
          : inferAction(line.text) ??
            scene.action ??
            (scene.kind === "chorus" || scene.kind === "moral" ? "dance"
              : script.type === "story" ? STORY_CYCLE[(si + li) % STORY_CYCLE.length]
              : VERSE_CYCLE[(si * 2 + li) % VERSE_CYCLE.length]);
        if (reprise > 0) {
          // same words, new moves: a chorus that comes back is danced differently each time
          if (line.action === "dance") line.action = DANCE_MOVES[(reprise + li) % DANCE_MOVES.length];
          else if (line.action === "think") line.action = ["think", "look", "point"][reprise % 3];
          else if (line.action === "idle" || line.action === "nod") line.action = ["nod", "wave", "clap", "jump"][(reprise + li) % 4];
        }
      }

      line.emotion = pick(EMOTIONS, line.emotion, undefined);
      if (!line.emotion) {
        line.emotion =
          isPraise ? "excited"
          : inferEmotion(line.text) ??
            ACTION_EMOTION[line.action] ??
            scene.emotion ??
            (scene.energy === "upbeat" ? "excited" : "happy");
      }

      const given = validCallout(line.callout);
      line.callout = given ?? (isPraise || scene.kind === "chorus" ? null : inferCallout(line, scene, main));

      const sfx = new Set((Array.isArray(line.sfx) ? line.sfx : []).filter((s) => isOneOf(SFX, s)));
      if (sfx.size === 0 && line.sfx === undefined) {
        // one "tada" per scene is plenty
        const cheerAlready = scene.lines.slice(0, li).some((l) => (l.sfx ?? []).includes("tada"));
        for (const s of ACTION_SFX[line.action] ?? []) if (!(s === "tada" && cheerAlready)) sfx.add(s);
        if (line.emotion === "surprised") sfx.add("pop");
        if (isPraise) { sfx.add("ding"); sfx.add("applause"); }
      }
      line.sfx = [...sfx].slice(0, 3);
    });

    // transitions + camera
    if (!scene.transition) {
      scene.transition =
        si === 0 ? "pop"
        : scene.kind === "moral" ? "pop"
        : scene.kind === "chorus" ? ["pop", "iris", "wipe"][chorusTransitionAlt++ % 3]
        : isQuestion ? "iris"
        : ["slide", "wipe", "fade"][transitionAlt++ % 3];
    }
    if (!scene.camera) {
      scene.camera = scene.energy === "upbeat" ? ["still", "pan", "still", "zoom-out"][upbeatCameraAlt++ % 4] : ["zoom-in", "pan", "zoom-out"][cameraAlt++ % 3];
      if (isQuestion) scene.camera = "zoom-in";
    }

    // pattern interrupts every few scenes: a peek-a-boo from one edge, or something flying past
    // (set "gag": false to switch it off for a scene)
    if (scene.gag && typeof scene.gag === "object") {
      lastGagScene = si;
    } else if (scene.gag === false) {
      scene.gag = null;
    } else {
      const longEnough = scene.lines.length >= 3 || scene.lines.reduce((a, l) => a + (l.durationSec ?? 2.2), 0) >= 6;
      const eligible =
        longEnough && scene.character !== "none" && si - lastGagScene >= 3 &&
        scene.kind !== "lesson" && scene.kind !== "moral" && scene.kind !== "question";
      if (eligible) {
        const peekOk = scene.energy === "calm" && !scene.secondCharacter;
        const flybyTurn = gagAlt++ % 2 === 1;
        scene.gag =
          peekOk && !flybyTurn
            ? { kind: "peek", character: otherSpecies([scene.character, main.kind, scene.secondCharacter], peekCount++), side: peekCount % 2 ? "right" : "left", atSec: 2.2 }
            : { kind: "flyby", emoji: flybyFor(scene.background, flybyCount++), side: si % 2 ? "left" : "right", atSec: 1.6 };
        lastGagScene = si;
      } else {
        scene.gag = null;
      }
    }

    // party guests: choruses, the moral chant and the last upbeat verse get friends dancing at the edges
    if (scene.extras === undefined) {
      const finale = si === script.scenes.length - 1 || (script.scenes[si + 1]?.kind === "moral" && scene.kind !== "moral");
      const chantScene = scene.kind === "moral" && scene.energy === "upbeat";
      const partyScene = scene.kind === "chorus" || chantScene || (finale && scene.energy === "upbeat" && !isQuestion);
      const calloutFree = !scene.lines.some((l) => l.callout);
      scene.extras = partyScene && scene.character !== "none" ? partyGuests(script, scene, si, calloutFree && !scene.secondCharacter ? 2 : 1, main) : null;
    }
  });

  script.stars = starIndex > 0 ? { total: starIndex } : null;

  // ── music ──
  if (script.music === "none" || script.music === false) {
    script.music = null;
  } else if (typeof script.music === "string") {
    const MOODS = { bouncy: { file: "bouncy.wav", bpm: 120, mood: "bouncy" }, story: { file: "story.wav", bpm: 96, mood: "story" }, lullaby: { file: "lullaby.wav", bpm: 72, mood: "lullaby" } };
    script.music = MOODS[script.music] ?? { file: script.music, bpm: 120, mood: "bouncy" };
  } else if (!script.music || typeof script.music !== "object" || !script.music.file) {
    const sleepyRe = /\b(sleep|sleepy|bedtime|lullaby|goodnight|good night|dream|dreams)\b/i;
    const allLines = script.scenes.flatMap((s) => s.lines.map((l) => l.text));
    const sleepyShare = allLines.filter((t) => sleepyRe.test(t)).length / Math.max(1, allLines.length);
    const sleepy = sleepyRe.test(script.title) || sleepyShare > 0.3 || script.palette === "night";
    script.music = sleepy
      ? { file: "lullaby.wav", bpm: 72, mood: "lullaby" }
      : script.type === "story"
        ? { file: "story.wav", bpm: 96, mood: "story" }
        : { file: "bouncy.wav", bpm: 120, mood: "bouncy" };
  }

  if (!script.youtube || typeof script.youtube !== "object") {
    script.youtube = { title: script.title, description: "", tags: [] };
  }
  script.directed = true;
  return script;
}

/** Number of scenes that belong to the "song" (before the generated moral block). */
export function songSceneCount(script) {
  const idx = script.scenes.findIndex((s) => s.kind === "moral");
  return idx === -1 ? script.scenes.length : idx;
}
