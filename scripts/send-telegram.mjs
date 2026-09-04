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
import { loadDotEnv, parseArgs, readScript, resolveSlug, OUT_DIR, ROOT } from "./lib/common.mjs";

loadDotEnv();

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const API = `https://api.telegram.org/bot${TOKEN}`;
const MAX_UPLOAD_BYTES = 49 * 1024 * 1024;

async function tg(method, form) {
  const res = await fetch(`${API}/${method}`, { method: "POST", body: form });
  const data = await res.json();
  if (!data.ok) throw new Error(`[telegram] ${method} failed: ${JSON.stringify(data).slice(0, 300)}`);
  return data;
}

function fileBlob(filePath, type) {
  return new Blob([fs.readFileSync(filePath)], { type });
}

async function main() {
  if (!TOKEN || !CHAT_ID) {
    console.log("[telegram] TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set — skipping delivery");
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
  if (args["link-only"]) {
    const form = new FormData();
    form.append("chat_id", CHAT_ID);
    form.append("text", `🎞️ ${script.title}\n\nReady: ${args["release-url"] || process.env.RELEASE_URL || process.env.RUN_URL || "(see workflow artifacts)"}`);
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
  // the pristine 1080p stays in out/ and in the workflow artifacts.
  if (size > MAX_UPLOAD_BYTES) {
    const previewPath = path.join(OUT_DIR, `${slug}.preview.mp4`);
    console.log(`[telegram] ${(size / 1024 / 1024).toFixed(0)} MB > 50 MB bot limit — making 720p review copy`);
    const res = spawnSync(
      "npx",
      ["remotion", "ffmpeg", "-i", videoPath, "-vf", "scale=1280:720", "-c:v", "libx264",
       "-crf", "28", "-preset", "veryfast", "-c:a", "aac", "-b:a", "96k", "-y", previewPath],
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
    form.append("caption", caption + previewNote);
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
