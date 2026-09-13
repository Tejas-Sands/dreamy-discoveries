import type { Callout, KidsScript } from "./types";

export function episodeOverview(script: KidsScript): Callout[] {
  const topics: Callout[] = [];
  const seen = new Set<string>();
  for (const scene of script.scenes) {
    if (scene.question || scene.kind === "question" || scene.kind === "moral") continue;
    for (const line of scene.lines) {
      const c = line.callout;
      if (!c || line.role === "praise" || line.role === "moral") continue;
      const label = c.text ?? (c.count !== undefined ? String(c.count) : c.emoji);
      if (!label || seen.has(label.toLowerCase())) continue;
      seen.add(label.toLowerCase());
      topics.push(c);
      if (topics.length === 3) return topics;
    }
  }
  return topics;
}
