/**
 * When the queue is empty, invent the next video (mostly AI-free):
 * with probability config.templateShare pick a template song for the least-used
 * hero, otherwise an LLM story topic from config.topicBank that isn't in the catalog yet.
 * Prints the same fields as `queue.mjs pop` and appends them to $GITHUB_OUTPUT.
 */
import fs from "node:fs";
import path from "node:path";
import { readCatalog, LIBRARY_DIR } from "./lib/catalog.mjs";
import { rng } from "./lib/templates/engine.mjs";
import { TEMPLATE_IDS, HEROES } from "./lib/templates/index.mjs";

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
  emit({ topic, type: "story" });
}
