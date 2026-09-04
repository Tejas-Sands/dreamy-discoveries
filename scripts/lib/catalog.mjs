/** library/catalog.json — what has been produced (small JSON, committed by CI). */
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./common.mjs";

export const LIBRARY_DIR = path.join(ROOT, "library");
export const CATALOG_FILE = path.join(LIBRARY_DIR, "catalog.json");

export function readCatalog() {
  if (!fs.existsSync(CATALOG_FILE)) return { episodes: [], compilations: [] };
  const c = JSON.parse(fs.readFileSync(CATALOG_FILE, "utf8"));
  c.episodes ??= [];
  c.compilations ??= [];
  return c;
}

export function writeCatalog(catalog) {
  fs.mkdirSync(LIBRARY_DIR, { recursive: true });
  fs.writeFileSync(CATALOG_FILE, JSON.stringify(catalog, null, 2) + "\n");
}

/** insert or update an episode entry by slug */
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
