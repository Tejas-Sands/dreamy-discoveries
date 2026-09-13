/**
 * The Sunny Meadow universe ledger — library/universe.json and Turso DB.
 *
 * Keeps track of EVERYTHING happening in the world:
 *   - every story/rhyme produced, with its hero, cast, moral, catchphrases
 *   - canon "firsts": one-time world events future stories can build on
 *   - cast usage: how many times each cast member has starred
 *
 * DB is single source of truth, JSON is mirrored for legacy/fallback.
 */
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { ROOT, readScript } from "./common.mjs";
import { castMemberByKind, castMemberById, castMembers } from "./cast.mjs";
import { upsertEpisode, upsertEpisodeAsync, summarizeScript } from "./catalog.mjs";
import { getClient } from "./db.mjs";

export const UNIVERSE_FILE = path.join(ROOT, "library", "universe.json");

const StoryRecord = z.object({
  id: z.string(),
  type: z.enum(["story", "rhyme"]),
  title: z.string(),
  hero: z.string().nullable(),
  heroName: z.string().nullable(),
  cast: z.array(z.string()),
  moral: z.string().nullable(),
  moralRhyme: z.array(z.string()).nullable(),
  catchphrases: z.array(z.string()),
  questions: z.number(),
  stars: z.number(),
  backgrounds: z.array(z.string()),
  palette: z.string(),
  firsts: z.array(z.string()),
  status: z.enum(["scripted", "voiced", "rendered", "released"]),
  template: z.string().nullable(),
  topic: z.string().nullable(),
  months: z.string(),
  timeline: z
    .object({
      scripted: z.string().nullable(),
      voiced: z.string().nullable(),
      rendered: z.string().nullable(),
      released: z.string().nullable(),
    })
    .optional(),
  release: z.object({ url: z.string(), tag: z.string() }).nullable().optional(),
});

const UniverseSchema = z.object({
  universe: z.string(),
  version: z.number(),
  updatedAt: z.string(),
  counts: z.object({ stories: z.number(), rhymes: z.number(), episodes: z.number(), stars: z.number() }),
  usage: z.record(z.number()),
  appeared: z.record(z.number()),
  canon: z.array(z.object({ event: z.string(), story: z.string(), at: z.string() })),
  stories: z.array(StoryRecord),
});

const EMPTY = {
  universe: "Sunny Meadow",
  version: 1,
  updatedAt: new Date().toISOString(),
  counts: { stories: 0, rhymes: 0, episodes: 0, stars: 0 },
  usage: {},
  appeared: {},
  canon: [],
  stories: [],
};

export function loadUniverse() {
  if (!fs.existsSync(UNIVERSE_FILE)) return EMPTY;
  const raw = JSON.parse(fs.readFileSync(UNIVERSE_FILE, "utf8"));
  const parsed = UniverseSchema.safeParse(raw);
  if (!parsed.success) throw new Error(`library/universe.json is corrupt: ${parsed.error.message}`);
  return parsed.data;
}

export function writeUniverse(u) {
  fs.mkdirSync(path.dirname(UNIVERSE_FILE), { recursive: true });
  fs.writeFileSync(UNIVERSE_FILE, JSON.stringify({ ...u, updatedAt: new Date().toISOString() }, null, 2) + "\n");
}

const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
const nowDate = () => new Date().toISOString().slice(0, 10);
const nowMonth = () => new Date().toISOString().slice(0, 7);

export function uidFor(kind) {
  return castMemberByKind(kind)?.id ?? kind;
}

export function castIdsOf(script) {
  const ids = [];
  const push = (kind) => {
    if (!kind || kind === "none") return;
    const id = uidFor(kind);
    if (!ids.includes(id)) ids.push(id);
  };
  if (script.mainCharacter) push(script.mainCharacter.kind);
  for (const s of script.scenes ?? []) {
    push(s.character);
    push(s.secondCharacter);
  }
  return ids;
}

export function catchphrasesOf(script) {
  const spoken = [];
  const texts = [script.intro?.text, ...(script.scenes ?? []).flatMap((s) => s.lines.map((l) => l.text)), script.outro?.text].filter(Boolean);
  const n = (t) => norm(t);
  for (const m of castMembers()) {
    if (!m.catchphrase) continue;
    if (texts.some((t) => n(t).includes(n(m.catchphrase)))) spoken.push(m.catchphrase);
  }
  return spoken;
}

export function recordStory(slug, { status = "released", release = null, timeline = {} } = {}) {
  const script = readScript(slug);
  const u = loadUniverse();
  const questions = (script.scenes ?? []).filter((s) => s.question).length;
  const stars = script.stars?.total ?? questions;
  const cast = castIdsOf(script);
  const hero = script.mainCharacter ? uidFor(script.mainCharacter.kind) : null;
  const prev = u.stories.find((s) => s.id === slug);
  const story = prev
    ? { ...prev, status, release: release ?? prev.release, timeline: { ...prev.timeline, ...timeline } }
    : {
        id: slug,
        type: script.type === "story" ? "story" : "rhyme",
        title: script.title,
        hero,
        heroName: script.mainCharacter?.name ?? null,
        cast,
        moral: script.moral ?? null,
        moralRhyme: script.moralRhyme ?? null,
        catchphrases: catchphrasesOf(script),
        questions,
        stars,
        backgrounds: [...new Set((script.scenes ?? []).map((s) => s.background))],
        palette: script.palette,
        firsts: [],
        status,
        template: script.template ?? null,
        topic: script.topic ?? null,
        months: nowMonth(),
        timeline: { scripted: null, voiced: null, rendered: null, released: null, ...timeline },
        release,
      };

  if (!prev) {
    const before = new Set(Object.keys(u.appeared));
    for (const id of cast) {
      if (before.has(id)) continue;
      const m = castMemberById(id);
      const who = m ? `${m.name} the ${m.kind}` : id;
      u.canon.push({ event: `First appearance: ${who}.`, story: slug, at: nowDate() });
    }
    if (hero) u.usage[hero] = (u.usage[hero] ?? 0) + 1;
    for (const id of cast) u.appeared[id] = (u.appeared[id] ?? 0) + 1;
  }
  story.months = nowMonth();

  const i = u.stories.findIndex((s) => s.id === slug);
  if (i === -1) u.stories.push(story);
  else u.stories[i] = story;

  u.counts.stories = u.stories.filter((s) => s.type === "story").length;
  u.counts.rhymes = u.stories.filter((s) => s.type === "rhyme").length;
  u.counts.episodes = u.stories.length;
  u.counts.stars = u.stories.reduce((a, s) => a + s.stars, 0);

  writeUniverse(u);
  upsertEpisode(
    summarizeScript(script, { stars, questions, status, months: nowMonth(), releaseUrl: release?.url ?? null, release: release?.url ?? null })
  );

  // Sync asynchronously to DB
  (async () => {
    try {
      const db = getClient();
      if (hero) {
        await db.execute({
          sql: "INSERT INTO cast_stats (hero_id, usage_count, appeared_count) VALUES (?, 1, 1) ON CONFLICT(hero_id) DO UPDATE SET usage_count = usage_count + 1, appeared_count = appeared_count + 1",
          args: [hero],
        });
      }
      for (const id of cast) {
        if (id !== hero) {
          await db.execute({
            sql: "INSERT INTO cast_stats (hero_id, usage_count, appeared_count) VALUES (?, 0, 1) ON CONFLICT(hero_id) DO UPDATE SET appeared_count = appeared_count + 1",
            args: [id],
          });
        }
      }
      await upsertEpisodeAsync(
        summarizeScript(script, { stars, questions, status, months: nowMonth(), releaseUrl: release?.url ?? null })
      );
    } catch (err) {
      console.warn(`[universe] DB sync error: ${err.message}`);
    }
  })();

  return story;
}

export function leastStarred() {
  const u = loadUniverse();
  const order = castMembers();
  let best = order[0];
  let min = Infinity;
  for (const m of order) {
    const n = u.usage[m.id] ?? 0;
    if (n < min) { min = n; best = m; }
  }
  return { id: best.id, kind: best.kind, name: best.name, count: u.usage[best.id] ?? 0 };
}

export function universeSummary() {
  const u = loadUniverse();
  const c = u.counts;
  return {
    universe: u.universe,
    stories: c.stories,
    rhymes: c.rhymes,
    episodes: c.episodes,
    stars: c.stars,
    canonEvents: u.canon.length,
    updatedAt: u.updatedAt,
  };
}

// ── CLI: node scripts/lib/universe.mjs --record serve --status rendered ──
import { parseArgs } from "./common.mjs";
const isMain = process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname;
if (isMain) {
  const args = parseArgs();
  if (args.record) {
    const s = recordStory(args.record, { status: args.status === "rendered" ? "rendered" : args.status });
    console.log(`[universe] recorded ${s.id} (${s.status}) — ${loadUniverse().counts.episodes} episodes, ${loadUniverse().canon.length} canon events`);
  } else if (args["least-starred"]) {
    console.log(JSON.stringify(leastStarred()));
  } else if (args.summary) {
    console.log(JSON.stringify(universeSummary()));
  } else {
    console.error("usage: node scripts/lib/universe.mjs --record <slug> [--status rendered|released] | --least-starred | --summary");
  }
}