/**
 * Programmatic Remotion helpers: bundle once, then render many stills (used by the
 * background baker and the dev "sheet" scripts — each CLI call would re-bundle).
 */
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { ROOT } from "./common.mjs";

let bundlePromise = null;
export function getBundle() {
  if (!bundlePromise) {
    bundlePromise = bundle({
      entryPoint: path.join(ROOT, "src", "index.ts"),
      publicDir: path.join(ROOT, "public"),
      onProgress: () => {},
    });
  }
  return bundlePromise;
}

export async function still({ composition, props = {}, output, frame = 0, imageFormat = "png", scale = 1 }) {
  const serveUrl = await getBundle();
  const comp = await selectComposition({ serveUrl, id: composition, inputProps: props, logLevel: "error" });
  await renderStill({ composition: comp, serveUrl, output, inputProps: props, frame, imageFormat, scale, logLevel: "error", overwrite: true });
  return output;
}
