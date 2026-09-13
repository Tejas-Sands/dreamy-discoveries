/**
 * Step 4: send the rendered video + thumbnail + metadata to your Telegram chat.
 * Needs TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID.
 *
 * Usage: node scripts/send-telegram.mjs [--slug my-video]
 * Note: the Bot API caps uploads at 50 MB — bigger renders fall back to a
 * message pointing at the GitHub Actions artifact (RUN_URL env).
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { readCalendar, readPublicationState, findSlot, publicationFor, uploadKeyboard } from "./lib/calendar.mjs";
import { createTelegramClient } from "./lib/telegram-api.mjs";
import { estimateVideoSec } from "./lib/estimate.mjs";
import { loadDotEnv, parseArgs, readScript, resolveSlug, OUT_DIR, ROOT } from "./lib/common.mjs";

loadDotEnv();

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const MAX_UPLOAD_BYTES = 47 * 1024 * 1024;
const tg = TOKEN ? createTelegramClient(TOKEN) : null;

function fileBlob(filePath, type) {
  return new Blob([fs.readFileSync(filePath)], { type });
}

async function main() {
  if (!TOKEN || !CHAT_ID) {
    console.log("[telegram] TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set — skipping delivery");
    if (process.env.GITHUB_ACTIONS) throw new Error("Telegram delivery requires both configured secrets");
    return;
  }
  const args = parseArgs();
  const slug = resolveSlug(args);
  const scriptFile = path.join(ROOT, "public", "generated", slug, "script.json");
  const script = fs.existsSync(scriptFile) ? readScript(slug) : { title: slug, youtube: null };
  const videoPath = path.join(OUT_DIR, `${slug}.mp4`);
  const thumbPath = path.join(OUT_DIR, `${slug}.png`);
  const metaPath = path.join(OUT_DIR, `${slug}.metadata.txt`);

  const yt = script.youtube ?? {};
  const slot = findSlot(readCalendar(), {slug});
  const keyboard = slot && !args.preview && process.env.PREVIEW !== "true"
    ? uploadKeyboard(slot.schedule_id, publicationFor(slot, readPublicationState()).publication_status === "uploaded", slug) : null;
  const addButtons = form => { if (keyboard) form.append("reply_markup", JSON.stringify(keyboard)); };
  const uploadNote = keyboard ? "\n\nAfter uploading to YouTube, tap the button below. Calendar sync usually takes about 5 minutes once enabled." : "";
  if (args["link-only"]) {
    const form = new FormData();
    form.append("chat_id", CHAT_ID);
    form.append("text", `🎞️ ${script.title}\n\nReady: ${args["release-url"] || process.env.RELEASE_URL || process.env.RUN_URL || "(see workflow artifacts)"}`);
    if (keyboard) form.set("text", form.get("text") + uploadNote);
    addButtons(form);
    await tg("sendMessage", form);
    if (fs.existsSync(thumbPath)) {
      const photo = new FormData();
      photo.append("chat_id", CHAT_ID);
      photo.append("photo", fileBlob(thumbPath, "image/png"), `${slug}.png`);
      await tg("sendPhoto", photo);
    }
    console.log("[telegram] sent link");
    return;
  }
  const releaseUrl = args["release-url"] || process.env.RELEASE_URL || "";
  const caption = `🎬 ${script.title}\n\nYouTube title: ${yt.title ?? script.title}\n\nReady to review & upload!${releaseUrl ? `\n\n📦 Full-quality download: ${releaseUrl}` : ""}`;

  let sendPath = videoPath;
  let size = fs.statSync(videoPath).size;
  let previewNote = "";

  // Telegram's Bot API caps uploads at 50 MB. If the full render is bigger,
  // transcode a 720p review copy (Remotion bundles ffmpeg) and send that —
  // the pristine 1080p stays in out/episodes/ and in the workflow artifacts.
  if (size > MAX_UPLOAD_BYTES) {
    const previewPath = path.join(OUT_DIR, `${slug}.preview.mp4`);
    console.log(`[telegram] ${(size / 1024 / 1024).toFixed(0)} MB > 50 MB bot limit — making 720p review copy`);
    const seconds = Math.max(1, estimateVideoSec(script));
    const bitrate = Math.max(120, Math.min(1800, Math.floor((44 * 1024 * 1024 * 8 / seconds / 1000 - 96) * 0.94)));
    const res = spawnSync(
      "npx",
      ["remotion", "ffmpeg", "-i", videoPath, "-vf", "scale=1280:720", "-c:v", "libx264",
       "-b:v", `${bitrate}k`, "-maxrate", `${bitrate}k`, "-bufsize", `${bitrate * 2}k`, "-preset", "veryfast", "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", "-y", previewPath],
      { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] }
    );
    if (res.status === 0 && fs.statSync(previewPath).size <= MAX_UPLOAD_BYTES) {
      sendPath = previewPath;
      size = fs.statSync(previewPath).size;
      previewNote = releaseUrl ? "\n(720p review copy — the 1080p file is in the release above)" : "\n(720p review copy — full 1080p is in the workflow artifacts)";
    }
  }

  if (size <= MAX_UPLOAD_BYTES) {
    const form = new FormData();
    form.append("chat_id", CHAT_ID);
    form.append("video", fileBlob(sendPath, "video/mp4"), path.basename(sendPath));
    form.append("caption", (caption + previewNote + uploadNote).slice(0, 1024));
    addButtons(form);
    form.append("supports_streaming", "true");
    await tg("sendVideo", form);
    console.log(`[telegram] sent video (${(size / 1024 / 1024).toFixed(1)} MB)`);
  } else {
    const runUrl = process.env.RUN_URL || "(no run URL)";
    const form = new FormData();
    form.append("chat_id", CHAT_ID);
    form.append(
      "text",
      `🎬 ${script.title} rendered, but even the preview is over Telegram's 50 MB bot limit.\nDownload it here: ${releaseUrl || runUrl}`
    );
    if (keyboard) form.set("text", form.get("text") + uploadNote);
    addButtons(form);
    await tg("sendMessage", form);
    console.log("[telegram] video too big for bot API — sent artifact link instead");
  }

  if (fs.existsSync(thumbPath)) {
    const form = new FormData();
    form.append("chat_id", CHAT_ID);
    form.append("photo", fileBlob(thumbPath, "image/png"), `${slug}.png`);
    form.append("caption", "🖼️ Thumbnail");
    await tg("sendPhoto", form);
  }

  if (fs.existsSync(metaPath)) {
    const form = new FormData();
    form.append("chat_id", CHAT_ID);
    form.append("document", fileBlob(metaPath, "text/plain"), `${slug}.metadata.txt`);
    form.append("caption", "📋 Copy-paste metadata for the YouTube upload form");
    await tg("sendDocument", form);
  }

  console.log("[telegram] delivery complete");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
