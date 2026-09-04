/**
 * Bake the static scenery of every background recipe to one transparent PNG
 * (public/baked/<name>-<hash>.png) so renders don't redraw hills and trees 30 times a
 * second. Cached in CI; only recipes whose JSON or parts code changed are re-baked.
 *   node scripts/bake-backgrounds.mjs [--slug S]   (with --slug: only the backgrounds that video uses)
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { parseArgs, readScript, ROOT } from "./lib/common.mjs";
import { BACKGROUND_RECIPES } from "./lib/library.mjs";
import { buildRegistry } from "./build-registry.mjs";

const OUT = path.join(ROOT, "public", "baked");
const MANIFEST = path.join(OUT, "manifest.json");

function hashFor(name) {
  const parts = fs.readFileSync(path.join(ROOT, "src", "components", "backgrounds", "parts.tsx"), "utf8");
  return crypto.createHash("sha1").update(JSON.stringify(BACKGROUND_RECIPES[name]) + parts).digest("hex").slice(0, 8);
}

async function main() {
  const args = parseArgs();
  buildRegistry();
  fs.mkdirSync(OUT, { recursive: true });
  const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, "utf8")) : {};
  let names = Object.keys(BACKGROUND_RECIPES);
  if (args.slug) {
    const script = readScript(args.slug);
    const used = new Set(script.scenes.map((s) => s.background));
    names = names.filter((n) => used.has(n));
  }
  let baked = 0;
  const todo = [];
  for (const name of names) {
    const file = `${name}-${hashFor(name)}.png`;
    if (fs.existsSync(path.join(OUT, file))) manifest[name] = file;
    else todo.push({ name, file });
  }
  if (todo.length) {
    const { still } = await import("./lib/remotion-api.mjs");
    for (const { name, file } of todo) {
      await still({ composition: "Bake", props: { background: name }, output: path.join(OUT, file), imageFormat: "png" });
      manifest[name] = file;
      baked++;
      console.log(`[bake] ${file}`);
    }
  }
  // drop stale files
  for (const f of fs.readdirSync(OUT)) {
    if (f.endsWith(".png") && !Object.values(manifest).includes(f)) fs.unlinkSync(path.join(OUT, f));
  }
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
  console.log(`[bake] ${baked} baked, ${names.length - baked} cached → public/baked/manifest.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
