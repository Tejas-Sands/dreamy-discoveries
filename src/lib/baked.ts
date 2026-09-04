import { staticFile } from "remotion";

export type BakedMap = Record<string, string>;

/** public/baked/manifest.json → { background: "name-hash.png" }; missing = draw scenery live */
export async function fetchBaked(): Promise<BakedMap> {
  try {
    const res = await fetch(staticFile("baked/manifest.json"));
    if (!res.ok) return {};
    return (await res.json()) as BakedMap;
  } catch {
    return {};
  }
}
