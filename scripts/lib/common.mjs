import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const GENERATED_DIR = path.join(ROOT, "public", "generated");
export const OUT_DIR = path.join(ROOT, "out", "episodes");
export const LATEST_FILE = path.join(GENERATED_DIR, "latest.json");

/** Tiny CLI arg parser: --key value / --flag */
export function parseArgs(argv = process.argv.slice(2)) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

/** Load .env into process.env (no dependency needed) */
export function loadDotEnv() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const rawLine of fs.readFileSync(envPath, "utf8").split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (key && !(key in process.env) && value) process.env[key] = value;
  }
}

export function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

export function scriptPath(slug) {
  return path.join(GENERATED_DIR, slug, "script.json");
}

export function readScript(slug) {
  return JSON.parse(fs.readFileSync(scriptPath(slug), "utf8"));
}

export function writeScript(slug, script) {
  const dir = path.join(GENERATED_DIR, slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(scriptPath(slug), JSON.stringify(script, null, 2));
}

export function setLatestSlug(slug) {
  fs.mkdirSync(GENERATED_DIR, { recursive: true });
  fs.writeFileSync(LATEST_FILE, JSON.stringify({ slug }, null, 2));
  // Expose to GitHub Actions steps when running in CI
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `slug=${slug}\n`);
  }
}

export function resolveSlug(args) {
  if (args.slug) return args.slug;
  if (fs.existsSync(LATEST_FILE)) {
    return JSON.parse(fs.readFileSync(LATEST_FILE, "utf8")).slug;
  }
  throw new Error("No --slug given and no public/generated/latest.json found. Run the generate step first.");
}
