/**
 * When the queue is empty, choose the next curated moral-story seed.
 * Reads story seeds, queue, catalog history, and hero usage directly from DB (or catalog fallback).
 * Outputs fields for queue.mjs and appends them to $GITHUB_OUTPUT.
 */
import fs from "node:fs";
import path from "node:path";
import { readCatalog, LIBRARY_DIR } from "./lib/catalog.mjs";
import { rng } from "./lib/templates/engine.mjs";
import { leastStarred } from "./lib/universe.mjs";
import { getClient } from "./lib/db.mjs";
import { planStory } from "./lib/story-planner.mjs";

const config = fs.existsSync(path.join(LIBRARY_DIR, "config.json")) ? JSON.parse(fs.readFileSync(path.join(LIBRARY_DIR, "config.json"), "utf8")) : {};
const catalog = readCatalog();
const today = new Date().toISOString().slice(0, 10);
const r = rng(`autopilot|${today}|${catalog.episodes.length}`);

function emit(fields) {
  const out = { id: `auto-${today}`, topic: "", template: "", type: "story", hero: "", place: "", minutes: String(config.minutes ?? 5.5), empty: "false", ...fields };
  console.log(JSON.stringify(out));
  if (process.env.GITHUB_OUTPUT) for (const [k, v] of Object.entries(out)) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`);
}

async function runAutopilot() {
  // Try reading pending queue items from DB first
  try {
    const db = getClient();
    const qRes = await db.execute("SELECT * FROM queue WHERE status = 'pending' AND topic IS NOT NULL AND trim(topic) != '' ORDER BY id ASC LIMIT 1");
    if (qRes.rows.length > 0) {
      const q = qRes.rows[0];
      await db.execute({ sql: "UPDATE queue SET status = 'processing' WHERE id = ?", args: [q.id] });
      emit({
        id: `q-${q.id}`,
        topic: q.topic || "",
        type: "story",
        template: "",
        hero: q.hero || "",
      });
      return;
    }
  } catch (_) {}

  if (config.autopilot === false) {
    console.log(JSON.stringify({ empty: "true" }));
    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, "empty=true\n");
  } else {
    emit(planStory(config, catalog.episodes, r, leastStarred()));
  }
}

runAutopilot();
