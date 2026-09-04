import fs from "node:fs";
import path from "node:path";

/** write <slug>.metadata.txt (title/description/tags to paste into YouTube Studio) */
export function writeMetadata(slug, script, outDir, extra = {}) {
  const yt = script.youtube ?? { title: script.title, description: "", tags: [] };
  const lines = [
    `TITLE:\n${yt.title}`,
    `\nDESCRIPTION:\n${yt.description}`,
    `\nTAGS:\n${(yt.tags ?? []).join(", ")}`,
    `\nAUDIENCE: Made for kids (set this on YouTube!)`,
  ];
  if (extra.releaseUrl) lines.push(`\nRELEASE:\n${extra.releaseUrl}`);
  const file = path.join(outDir, `${slug}.metadata.txt`);
  fs.writeFileSync(file, lines.join("\n"));
  return file;
}
