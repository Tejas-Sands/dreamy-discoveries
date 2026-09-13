/**
 * When the queue is empty, invent the next video (mostly AI-free):
 * Reads topic bank, queue, analytics feedback, and hero usage directly from DB (or catalog fallback).
 * Outputs fields for queue.mjs and appends them to $GITHUB_OUTPUT.
 */
import fs from "node:fs";
import path from "node:path";
import { readCatalog, LIBRARY_DIR } from "./lib/catalog.mjs";
import { rng } from "./lib/templates/engine.mjs";
import { TEMPLATE_IDS, HEROES } from "./lib/templates/index.mjs";
import { leastStarred } from "./lib/universe.mjs";
import { getClient } from "./lib/db.mjs";

const config = fs.existsSync(path.join(LIBRARY_DIR, "config.json")) ? JSON.parse(fs.readFileSync(path.join(LIBRARY_DIR, "config.json"), "utf8")) : {};
const catalog = readCatalog();
const today = new Date().toISOString().slice(0, 10);
const r = rng(`autopilot|${today}|${catalog.episodes.length}`);

function leastUsed(keys, usage) {
  const min = Math.min(...keys.map((k) => usage[k] ?? 0));
  const pool = keys.filter((k) => (usage[k] ?? 0) === min);
  return pool[Math.floor(r() * pool.length)];
}

function emit(fields) {
  const out = { id: `auto-${today}`, topic: "", template: "", type: "rhyme", hero: "", place: "", minutes: String(config.minutes ?? 5.5), empty: "false", ...fields };
  console.log(JSON.stringify(out));
  if (process.env.GITHUB_OUTPUT) for (const [k, v] of Object.entries(out)) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`);
}

async function runAutopilot() {
  // Try reading pending queue items from DB first
  try {
    const db = getClient();
    const qRes = await db.execute("SELECT * FROM queue WHERE status = 'pending' ORDER BY id ASC LIMIT 1");
    if (qRes.rows.length > 0) {
      const q = qRes.rows[0];
      await db.execute({ sql: "UPDATE queue SET status = 'processing' WHERE id = ?", args: [q.id] });
      emit({
        id: `q-${q.id}`,
        topic: q.topic || "",
        type: q.type || "story",
        template: q.template || "",
        hero: q.hero || "",
      });
      return;
    }
  } catch (_) {}

  if (config.autopilot === false) {
    console.log(JSON.stringify({ empty: "true" }));
    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, "empty=true\n");
  } else if (r() < (config.templateShare ?? 0.6) || !(config.topicBank ?? []).length) {
    const tUsage = {};
    const hUsage = {};
    for (const e of catalog.episodes) {
      if (e.template) tUsage[e.template] = (tUsage[e.template] ?? 0) + 1;
      if (e.hero) hUsage[e.hero] = (hUsage[e.hero] ?? 0) + 1;
    }
    const template = leastUsed(TEMPLATE_IDS, tUsage);
    const heroes = Object.keys(HEROES).filter((k) => template !== "animal-sounds" || HEROES[k].sound !== null || true).filter((k) => k !== "star" || template === "lullaby");
    const hero = leastUsed(heroes, hUsage);
    emit({ template, hero, type: "rhyme" });
  } else {
    const used = new Set(catalog.episodes.map((e) => e.topic).filter(Boolean));
    const fresh = config.topicBank.filter((t) => !used.has(t));
    const topic = (fresh.length ? fresh : config.topicBank)[Math.floor(r() * (fresh.length ? fresh.length : config.topicBank.length))];
    const star = leastStarred();
    emit({ topic, type: "story", hero: star.id, heroName: star.name });
  }
}

runAutopilot();
