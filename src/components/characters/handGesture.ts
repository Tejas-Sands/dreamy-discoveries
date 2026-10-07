import type { Action } from "../../lib/types";

export type HandGesture = "relaxed" | "open" | "point" | "cup";

/** Gesture intent comes from the action, rather than the shoulder angle. A reach
 * can then curl either hand without turning a carrying paw into a pointer. */
export function handGesture(action: Action, side: "L" | "R"): HandGesture {
  if (action === "point" && side === "R") return "point";
  if (action === "wave") return side === "R" ? "open" : "relaxed";
  if (["clap", "cheer", "dance", "jump", "fly"].includes(action)) return "open";
  if (action === "hug" || ((action === "think" || action === "eat") && side === "R")) return "cup";
  return "relaxed";
}
