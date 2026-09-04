/** Read-only access to library/ recipes for the Node side (Director, templates, LLM prompt). */
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./common.mjs";

export const LIBRARY_DIR = path.join(ROOT, "library");

function readAll(kind) {
  const dir = path.join(LIBRARY_DIR, kind);
  if (!fs.existsSync(dir)) return {};
  const out = {};
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith(".json")) continue;
    try {
      out[path.basename(f, ".json")] = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    } catch (err) {
      console.warn(`[library] skipping ${kind}/${f}: ${err.message}`);
    }
  }
  return out;
}

export const CHARACTER_RECIPES = readAll("characters");
export const BACKGROUND_RECIPES = readAll("backgrounds");

export function saveRecipe(kind, name, recipe) {
  const dir = path.join(LIBRARY_DIR, kind);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${name}.json`);
  fs.writeFileSync(file, JSON.stringify({ name, ...recipe }, null, 2) + "\n");
  if (kind === "characters") CHARACTER_RECIPES[name] = { name, ...recipe };
  if (kind === "backgrounds") BACKGROUND_RECIPES[name] = { name, ...recipe };
  return file;
}
