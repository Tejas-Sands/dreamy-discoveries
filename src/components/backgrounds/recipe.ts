/**
 * A background recipe: an ordered list of parts. Each part belongs to a group:
 *   back   = animated things behind the scenery (sun, clouds, stars, fish, waves)
 *   static = scenery that never moves (hills, trees, ground, props) → baked to one PNG once
 *   front  = animated things in front (butterflies, bubbles, snow, swaying flowers)
 * Recipes live in library/backgrounds/<name>.json and are bundled via src/generated/registry.ts.
 */
export type PartGroup = "back" | "static" | "front";

export interface BackgroundPart {
  part: string;
  [option: string]: string | number | boolean | undefined | Array<string | number>;
}

export interface BackgroundRecipe {
  name: string;
  /** top → bottom sky gradient */
  gradient: [string, string];
  /** palette hint for the Director */
  palette?: string;
  parts: BackgroundPart[];
  /** a friendly description the LLM prompt can show */
  description?: string;
}
