/**
 * One-shot local pipeline: script -> voices -> render -> telegram.
 *
 * Usage: node scripts/pipeline.mjs --topic "counting ducks song" --type rhyme
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { parseArgs } from "./lib/common.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

function step(name, scriptFile, extraArgs = []) {
  console.log(`\n━━━ ${name} ━━━`);
  const res = spawnSync(process.execPath, [path.join(here, scriptFile), ...extraArgs], {
    stdio: "inherit",
  });
  if (res.status !== 0) {
    console.error(`\n✖ ${name} failed`);
    process.exit(res.status ?? 1);
  }
}

const args = parseArgs();
const passthrough = process.argv.slice(2);

if (!args.slug) {
  step("1/4 Write script (LLM)", "generate-script.mjs", passthrough);
} else {
  console.log(`\n━━━ 1/4 Using existing script: ${args.slug} ━━━`);
}
step("2/4 Direct the show + generate voices (TTS)", "generate-audio.mjs", args.slug ? ["--slug", args.slug] : []);
step("3/4 Render video (Remotion)", "render.mjs", args.slug ? ["--slug", args.slug] : []);
step("4/4 Send to Telegram", "send-telegram.mjs", args.slug ? ["--slug", args.slug] : []);

console.log("\n✔ Pipeline complete — check out/episodes/ (and your Telegram).");
