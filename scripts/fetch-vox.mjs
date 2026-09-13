/**
 * Pull CC0 vocalizations from Freesound into the inbox, then import them.
 *
 *   FREESOUND_API_KEY=... node scripts/fetch-vox.mjs [--per-kind 4] [--kinds giggle,laugh] [--dry]
 *
 * Get a free key at https://freesound.org/apiv2/apply (needs a Freesound account).
 * Only sounds licensed "Creative Commons 0" are taken (no attribution required, so they
 * can be committed without naming anyone); results are ranked by rating and downloads.
 * The HQ previews (mp3) are fetched — plenty for 1-2 second vocalizations.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { loadDotEnv, parseArgs, ROOT } from "./lib/common.mjs";
import { VOX_KINDS } from "./lib/vox.mjs";

loadDotEnv();

const QUERIES = {
  giggle: ["child giggle", "kid giggling", "toddler giggle"],
  laugh: ["child laugh", "kids laughing", "baby laugh"],
  yay: ["children yay", "kids cheering", "kid hooray"],
  wow: ["child wow", "kid says wow"],
  gasp: ["child gasp", "surprised gasp"],
  yum: ["yummy mmm", "child yum"],
  yawn: ["child yawn", "yawn cute"],
  hmm: ["hmm thinking", "child hmm"],
  aww: ["aww disappointed", "child aww"],
  sigh: ["child sigh", "sigh relief"],
};

async function search(key, query) {
  const url = new URL("https://freesound.org/apiv2/search/text/");
  url.searchParams.set("query", query);
  url.searchParams.set("filter", 'license:"Creative Commons 0" duration:[0.3 TO 4]');
  url.searchParams.set("fields", "id,name,previews,duration,avg_rating,num_downloads,license");
  url.searchParams.set("sort", "rating_desc");
  url.searchParams.set("page_size", "15");
  const res = await fetch(url, { headers: { Authorization: `Token ${key}` } });
  if (!res.ok) throw new Error(`freesound ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()).results ?? [];
}

async function main() {
  const args = parseArgs();
  const key = process.env.FREESOUND_API_KEY;
  if (!key) {
    console.error("Set FREESOUND_API_KEY (free: https://freesound.org/apiv2/apply) — or download CC0 files by hand into .cache/vox-inbox and run scripts/import-vox.mjs");
    process.exit(1);
  }
  const perKind = Number(args["per-kind"] || 4);
  const kinds = args.kinds ? String(args.kinds).split(",") : VOX_KINDS;
  const inbox = path.join(ROOT, ".cache", "vox-inbox");
  fs.mkdirSync(inbox, { recursive: true });
  let total = 0;
  for (const kind of kinds) {
    const seen = new Set();
    const picks = [];
    for (const q of QUERIES[kind] ?? [kind]) {
      for (const r of await search(key, q)) {
        if (seen.has(r.id) || !(/Creative Commons 0/i.test(r.license) || /publicdomain\/zero/i.test(r.license))) continue;
        seen.add(r.id);
        picks.push(r);
      }
    }
    picks.sort((a, b) => (b.avg_rating || 0) * 1000 + (b.num_downloads || 0) - ((a.avg_rating || 0) * 1000 + (a.num_downloads || 0)));
    for (const r of picks.slice(0, perKind)) {
      const url = r.previews?.["preview-hq-mp3"];
      if (!url) continue;
      const dest = path.join(inbox, `${kind}__fs${r.id}.mp3`);
      if (args.dry) { console.log(`[vox] would fetch ${kind}: #${r.id} "${r.name}" ${r.duration.toFixed(1)}s ★${r.avg_rating?.toFixed(1)}`); continue; }
      const res = await fetch(url);
      if (!res.ok) { console.warn(`[vox] skip #${r.id}: ${res.status}`); continue; }
      fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
      total++;
      console.log(`[vox] ${kind}: #${r.id} ${r.duration.toFixed(1)}s ★${(r.avg_rating || 0).toFixed(1)} → inbox`);
    }
  }
  console.log(`[vox] ${total} files in ${path.relative(ROOT, inbox)}`);
  if (!args.dry && total > 0) {
    const res = spawnSync(process.execPath, [path.join(ROOT, "scripts", "import-vox.mjs")], { stdio: "inherit" });
    process.exit(res.status ?? 0);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
