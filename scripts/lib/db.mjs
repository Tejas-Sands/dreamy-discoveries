/**
 * Database client for Dreamy Discoveries (Turso / libSQL SQLite).
 * Uses TURSO_URL and TURSO_AUTH_TOKEN if available, otherwise falls back to local file: file:library/local.db
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";
import { ROOT, loadDotEnv } from "./common.mjs";

loadDotEnv();

const DB_DIR = path.join(ROOT, "library");
const LOCAL_DB_PATH = path.join(DB_DIR, "local.db");

let clientInstance = null;

export function getClient() {
  if (clientInstance) return clientInstance;

  const url = process.env.TURSO_URL || `file:${LOCAL_DB_PATH}`;
  const authToken = process.env.TURSO_AUTH_TOKEN || undefined;

  if (!process.env.TURSO_URL) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  clientInstance = createClient({ url, authToken });
  return clientInstance;
}

export async function initDbSchema() {
  const db = getClient();

  await db.batch([
    `CREATE TABLE IF NOT EXISTS episodes (
      slug TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      template TEXT,
      topic TEXT,
      hero TEXT,
      hero_name TEXT,
      palette TEXT,
      backgrounds_json TEXT,
      lines INTEGER DEFAULT 0,
      stars INTEGER DEFAULT 0,
      questions INTEGER DEFAULT 0,
      status TEXT DEFAULT 'scripted',
      months TEXT,
      release_url TEXT,
      release_tag TEXT,
      timeline_json TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS canon (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event TEXT UNIQUE NOT NULL,
      story TEXT NOT NULL,
      at TEXT NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS cast_stats (
      hero_id TEXT PRIMARY KEY,
      usage_count INTEGER DEFAULT 0,
      appeared_count INTEGER DEFAULT 0
    )`,

    `CREATE TABLE IF NOT EXISTS queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic TEXT NOT NULL,
      type TEXT DEFAULT 'story',
      template TEXT,
      hero TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS topic_bank (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT,
      topic TEXT UNIQUE NOT NULL,
      performance_score REAL DEFAULT 0.0
    )`,

    `CREATE TABLE IF NOT EXISTS analytics (
      slug TEXT PRIMARY KEY,
      video_id TEXT,
      views INTEGER DEFAULT 0,
      likes INTEGER DEFAULT 0,
      comments INTEGER DEFAULT 0,
      ctr REAL DEFAULT 0,
      fetched_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS voice_cache (
      hash TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      voice_id TEXT NOT NULL,
      file_path TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`
  ], "write");
}

export async function seedFromFiles() {
  const db = getClient();
  await initDbSchema();

  const countRes = await db.execute("SELECT COUNT(*) as count FROM episodes");
  const count = Number(countRes.rows[0]?.count ?? 0);
  if (count > 0) return;

  const catalogFile = path.join(DB_DIR, "catalog.json");
  const universeFile = path.join(DB_DIR, "universe.json");

  if (fs.existsSync(universeFile)) {
    try {
      const u = JSON.parse(fs.readFileSync(universeFile, "utf8"));

      // Seed canon
      for (const c of u.canon ?? []) {
        await db.execute({
          sql: "INSERT OR IGNORE INTO canon (event, story, at) VALUES (?, ?, ?)",
          args: [c.event, c.story, c.at]
        });
      }

      // Seed usage & appeared stats
      const allCastIds = new Set([...Object.keys(u.usage ?? {}), ...Object.keys(u.appeared ?? {})]);
      for (const id of allCastIds) {
        await db.execute({
          sql: "INSERT OR REPLACE INTO cast_stats (hero_id, usage_count, appeared_count) VALUES (?, ?, ?)",
          args: [id, u.usage?.[id] ?? 0, u.appeared?.[id] ?? 0]
        });
      }

      // Seed stories
      for (const s of u.stories ?? []) {
        await db.execute({
          sql: `INSERT OR REPLACE INTO episodes (
            slug, title, type, template, topic, hero, hero_name, palette,
            backgrounds_json, lines, stars, questions, status, months,
            release_url, release_tag, timeline_json, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          args: [
            s.id,
            s.title,
            s.type,
            s.template ?? null,
            s.topic ?? null,
            s.hero ?? null,
            s.heroName ?? null,
            s.palette ?? null,
            JSON.stringify(s.backgrounds ?? []),
            0,
            s.stars ?? 0,
            s.questions ?? 0,
            s.status ?? "released",
            s.months ?? new Date().toISOString().slice(0, 7),
            s.release?.url ?? null,
            s.release?.tag ?? null,
            JSON.stringify(s.timeline ?? {})
          ]
        });
      }
    } catch (e) {
      console.warn(`[db] warning seeding from universe.json: ${e.message}`);
    }
  }

  if (fs.existsSync(catalogFile)) {
    try {
      const c = JSON.parse(fs.readFileSync(catalogFile, "utf8"));
      for (const ep of c.episodes ?? []) {
        await db.execute({
          sql: `INSERT INTO episodes (
            slug, title, type, template, topic, hero, hero_name, palette,
            backgrounds_json, lines, stars, questions, status, months, release_url
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(slug) DO UPDATE SET
            release_url = COALESCE(excluded.release_url, episodes.release_url),
            lines = excluded.lines`,
          args: [
            ep.slug,
            ep.title,
            ep.type ?? "story",
            ep.template ?? null,
            ep.topic ?? null,
            ep.hero ?? null,
            ep.heroName ?? null,
            ep.palette ?? null,
            JSON.stringify(ep.backgrounds ?? []),
            ep.lines ?? 0,
            ep.stars ?? 0,
            ep.questions ?? 0,
            ep.status ?? "released",
            ep.months ?? new Date().toISOString().slice(0, 7),
            ep.releaseUrl ?? ep.release ?? null
          ]
        });
      }
    } catch (e) {
      console.warn(`[db] warning seeding from catalog.json: ${e.message}`);
    }
  }

  console.log("[db] Seeding from JSON files completed.");
}

// CLI entry point
const isMain = process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname;
if (isMain) {
  (async () => {
    try {
      await initDbSchema();
      await seedFromFiles();
      console.log("[db] Database initialized successfully.");
    } catch (err) {
      console.error("[db] Database initialization error:", err);
      process.exit(1);
    }
  })();
}
