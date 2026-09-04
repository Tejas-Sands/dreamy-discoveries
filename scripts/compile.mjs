/**
 * Build a long "best of" video from finished episodes — no AI, no re-render:
 * download the episode mp4s (from GitHub Releases, or out/), render a 3-second
 * bumper per episode, and concatenate everything with ffmpeg (stream copy).
 *
 *   node scripts/compile.mjs --slugs a,b,c [--title "..."] [--no-bumpers] [--out out/compilation-x.mp4]
 *   node scripts/compile.mjs --auto rhyme --count 6        (last 6 rhymes from library/catalog.json)
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { parseArgs, readScript, slugify, OUT_DIR, GENERATED_DIR, ROOT } from "./lib/common.mjs";
import { readCatalog } from "./lib/catalog.mjs";
import { concat, ffmpegBin } from "./stitch.mjs";
import { writeMetadata } from "./lib/metadata.mjs";

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { stdio: "inherit", cwd: ROOT, ...opts });
  if (res.status !== 0) throw new Error(`${cmd} ${args[0]} failed (${res.status})`);
}

function ensureEpisode(slug) {
  const mp4 = path.join(OUT_DIR, `${slug}.mp4`);
  const scriptFile = path.join(GENERATED_DIR, slug, "script.json");
  if (!fs.existsSync(mp4)) {
    console.log(`[compile] downloading ${slug} from release video-${slug}`);
    run("gh", ["release", "download", `video-${slug}`, "-p", `${slug}.mp4`, "-p", `${slug}.script.json`, "-D", OUT_DIR, "--clobber"]);
  }
  if (!fs.existsSync(scriptFile)) {
    const fromRelease = path.join(OUT_DIR, `${slug}.script.json`);
    const fromLibrary = path.join(ROOT, "library", "scripts", `${slug}.json`);
    const src = fs.existsSync(fromRelease) ? fromRelease : fromLibrary;
    if (!fs.existsSync(src)) throw new Error(`no script for ${slug}`);
    fs.mkdirSync(path.dirname(scriptFile), { recursive: true });
    fs.copyFileSync(src, scriptFile);
  }
  return mp4;
}

function renderBumper(slug, index) {
  const out = path.join(OUT_DIR, "compile", `${slug}.bumper.mp4`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  if (!fs.existsSync(out)) {
    const props = JSON.stringify({ slug, script: null, label: index === 0 ? "First up!" : "Next up!" });
    run("npx", ["remotion", "render", "Bumper", out, `--props=${props}`, "--codec=h264", "--log=error"]);
  }
  return out;
}

function main() {
  const args = parseArgs();
  const catalog = readCatalog();
  let slugs = args.slugs ? String(args.slugs).split(",").map((s) => s.trim()).filter(Boolean) : [];
  if (!slugs.length && args.auto) {
    const type = String(args.auto);
    slugs = catalog.episodes.filter((e) => (type === "any" ? true : e.type === type) && e.release).slice(-Number(args.count || 6)).map((e) => e.slug);
  }
  if (!slugs.length) throw new Error("give --slugs a,b,c or --auto rhyme|story|any");

  const parts = [];
  const scripts = [];
  slugs.forEach((slug, i) => {
    const mp4 = ensureEpisode(slug);
    scripts.push(readScript(slug));
    if (!args["no-bumpers"]) parts.push(renderBumper(slug, i));
    parts.push(mp4);
  });

  const title = args.title || `${scripts[0].mainCharacter?.name ?? "Friends"} & Friends: ${scripts.length} Songs & Stories`;
  const name = args.name || `compilation-${slugify(title).slice(0, 40)}-${new Date().toISOString().slice(0, 10)}`;
  const out = args.out || path.join(OUT_DIR, `${name}.mp4`);
  console.log(`[compile] ${parts.length} parts → ${out}`);
  try {
    concat(parts, null, out);
  } catch {
    console.warn("[compile] stream-copy concat failed (mismatched encodes?) — re-encoding");
    const list = out + ".txt";
    fs.writeFileSync(list, parts.map((f) => `file '${path.resolve(f)}'`).join("\n"));
    run(ffmpegBin(), ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list, "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", out]);
    fs.unlinkSync(list);
  }

  // thumbnail + metadata
  const heroes = [...new Set(scripts.map((s) => s.mainCharacter?.kind).filter(Boolean))];
  const props = JSON.stringify({ slug: slugs[0], script: null, compilation: { title, heroes } });
  run("npx", ["remotion", "still", "Thumbnail", path.join(OUT_DIR, `${name}.png`), `--props=${props}`, "--log=error"]);
  const meta = {
    slug: name,
    title,
    youtube: {
      title: `${title} 🎶 ${Math.round(scripts.reduce((n, s) => n + (s.targetMinutes ?? 5), 0))}+ Minutes of Kids Songs & Stories`,
      description: `${scripts.map((s, i) => `${i + 1}. ${s.title}`).join("\n")}\n\nSing-along songs and stories with a moral for toddlers and preschoolers.\n#kidssongs #nurseryrhymes #compilation #toddlers #storiesforkids`,
      tags: [...new Set(["kids songs compilation", "nursery rhymes", "kids stories", "toddler songs", "preschool", ...scripts.flatMap((s) => (s.youtube?.tags ?? []).slice(0, 4))])].slice(0, 25),
    },
  };
  writeMetadata(name, meta, OUT_DIR);
  fs.writeFileSync(path.join(OUT_DIR, `${name}.json`), JSON.stringify({ name, title, slugs, heroes }, null, 2));
  console.log(`[compile] done: ${out} (${(fs.statSync(out).size / 1024 / 1024).toFixed(0)} MB), ${name}.png, ${name}.metadata.txt`);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `name=${name}\ntitle=${title}\n`);
}

main();
