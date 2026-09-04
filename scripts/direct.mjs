/**
 * Re-run the Director on an existing script (e.g. after hand-editing it).
 * Usage: node scripts/direct.mjs [--slug my-video]
 */
import { parseArgs, readScript, writeScript, resolveSlug } from "./lib/common.mjs";
import { directScript } from "./lib/director.mjs";

const args = parseArgs();
const slug = resolveSlug(args);
const script = directScript(readScript(slug));
writeScript(slug, script);
const lines = script.scenes.reduce((n, s) => n + s.lines.length, 0);
console.log(`[direct] ${slug}: ${script.scenes.length} scenes, ${lines} lines, ${script.stars?.total ?? 0} stars, music=${script.music?.mood ?? "none"}`);
