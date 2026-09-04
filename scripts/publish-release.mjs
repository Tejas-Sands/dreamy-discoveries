/**
 * Store a finished episode durably as a GitHub Release (free, permanent, 2 GB/file).
 *   node scripts/publish-release.mjs --slug S [--files out/S.mp4,out/S.png,...] [--tag video-S]
 * Needs the `gh` CLI and GH_TOKEN (present on Actions runners). Prints the release URL and
 * writes release_url to $GITHUB_OUTPUT. Locally without gh it just says so.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { parseArgs, readScript, resolveSlug, OUT_DIR, GENERATED_DIR } from "./lib/common.mjs";

function gh(args, opts = {}) {
  const res = spawnSync("gh", args, { encoding: "utf8", ...opts });
  return { ok: res.status === 0, out: (res.stdout || "").trim(), err: (res.stderr || "").trim() };
}

function main() {
  const args = parseArgs();
  const slug = resolveSlug(args);
  const scriptFile = path.join(GENERATED_DIR, slug, "script.json");
  const script = fs.existsSync(scriptFile) ? readScript(slug) : { title: args.title || slug, youtube: null };
  const tag = args.tag || `video-${slug}`;
  const title = args.title || script.title;
  const files = (args.files ? String(args.files).split(",") : [
    path.join(OUT_DIR, `${slug}.mp4`),
    path.join(OUT_DIR, `${slug}.png`),
    path.join(OUT_DIR, `${slug}.metadata.txt`),
    path.join(GENERATED_DIR, slug, "script.json"),
  ]).filter((f) => fs.existsSync(f));

  if (!gh(["--version"]).ok) {
    console.log("[release] gh CLI not available — skipping (this step runs in GitHub Actions)");
    return;
  }
  const view = gh(["release", "view", tag, "--json", "url", "-q", ".url"]);
  let url = view.ok ? view.out : "";
  if (!url) {
    const notes = `${script.youtube?.title ?? script.title}\n\n${script.youtube?.description ?? ""}\n\nRendered automatically by Dreamy Discoveries.`;
    const created = gh(["release", "create", tag, "--title", String(title), "--notes", notes, "--latest=false"]);
    if (!created.ok) throw new Error(`gh release create failed: ${created.err}`);
    url = gh(["release", "view", tag, "--json", "url", "-q", ".url"]).out;
  }
  // script.json would collide across releases in the asset list, so rename it
  const uploads = files.map((f) => (path.basename(f) === "script.json" ? `${f}#${slug}.script.json` : f));
  const up = gh(["release", "upload", tag, ...uploads, "--clobber"]);
  if (!up.ok) throw new Error(`gh release upload failed: ${up.err}`);
  console.log(`[release] ${url} (${files.length} files)`);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `release_url=${url}\n`);
}

main();
