/** library/catalog.json & DB episodes table — what has been produced. */
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./common.mjs";
import { getClient } from "./db.mjs";

export const LIBRARY_DIR = path.join(ROOT, "library");
export const CATALOG_FILE = path.join(LIBRARY_DIR, "catalog.json");

export function readCatalog() {
  if (!fs.existsSync(CATALOG_FILE)) return { episodes: [], compilations: [] };
  const c = JSON.parse(fs.readFileSync(CATALOG_FILE, "utf8"));
  c.episodes ??= [];
  c.compilations ??= [];
  return c;
}

export async function readCatalogAsync() {
  try {
    const db = getClient();
    const res = await db.execute("SELECT * FROM episodes ORDER BY created_at DESC");
    const episodes = res.rows.map((row) => ({
      slug: row.slug,
      title: row.title,
      type: row.type,
      template: row.template,
      topic: row.topic,
      hero: row.hero,
      heroName: row.hero_name,
      palette: row.palette,
      backgrounds: row.backgrounds_json ? JSON.parse(row.backgrounds_json) : [],
      lines: row.lines,
      stars: row.stars,
      questions: row.questions,
      status: row.status,
      months: row.months,
      releaseUrl: row.release_url,
      releaseTag: row.release_tag,
    }));
    return { episodes, compilations: [] };
  } catch (err) {
    return readCatalog();
  }
}

export function writeCatalog(catalog) {
  fs.mkdirSync(LIBRARY_DIR, { recursive: true });
  fs.writeFileSync(CATALOG_FILE, JSON.stringify(catalog, null, 2) + "\n");
}

export async function upsertEpisodeAsync(entry) {
  try {
    const db = getClient();
    await db.execute({
      sql: `INSERT INTO episodes (
        slug, title, type, template, topic, hero, hero_name, palette,
        backgrounds_json, lines, stars, questions, status, months, release_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(slug) DO UPDATE SET
        title = excluded.title,
        type = excluded.type,
        template = excluded.template,
        topic = excluded.topic,
        hero = excluded.hero,
        hero_name = excluded.hero_name,
        palette = excluded.palette,
        backgrounds_json = excluded.backgrounds_json,
        lines = excluded.lines,
        stars = excluded.stars,
        questions = excluded.questions,
        status = excluded.status,
        months = excluded.months,
        release_url = COALESCE(excluded.release_url, episodes.release_url),
        updated_at = CURRENT_TIMESTAMP`,
      args: [
        entry.slug,
        entry.title,
        entry.type ?? "story",
        entry.template ?? null,
        entry.topic ?? null,
        entry.hero ?? null,
        entry.heroName ?? null,
        entry.palette ?? null,
        JSON.stringify(entry.backgrounds ?? []),
        entry.lines ?? 0,
        entry.stars ?? 0,
        entry.questions ?? 0,
        entry.status ?? "released",
        entry.months ?? new Date().toISOString().slice(0, 7),
        entry.releaseUrl ?? entry.release ?? null,
      ],
    });
  } catch (err) {
    console.warn(`[catalog] db upsert error: ${err.message}`);
  }

  // Also sync to JSON mirror
  return upsertEpisode(entry);
}

/** insert or update an episode entry by slug (sync wrapper with JSON mirror) */
export function upsertEpisode(entry) {
  const catalog = readCatalog();
  const i = catalog.episodes.findIndex((e) => e.slug === entry.slug);
  if (i === -1) catalog.episodes.push(entry);
  else catalog.episodes[i] = { ...catalog.episodes[i], ...entry };
  writeCatalog(catalog);
  return catalog;
}

/** small summary of a script for the catalog */
export function summarizeScript(script, extra = {}) {
  return {
    slug: script.slug,
    title: script.title,
    type: script.type,
    template: script.template ?? null,
    topic: script.topic ?? null,
    hero: script.mainCharacter?.kind ?? null,
    heroName: script.mainCharacter?.name ?? null,
    palette: script.palette,
    backgrounds: [...new Set((script.scenes ?? []).map((s) => s.background))],
    lines: (script.scenes ?? []).reduce((n, s) => n + s.lines.length, 0),
    ...extra,
  };
}
