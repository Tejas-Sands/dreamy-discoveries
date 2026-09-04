import type { Action } from "../../lib/types";
import { hop } from "../../lib/anim";

/**
 * A pose is everything the rig needs to draw one frame of an action.
 * Units are rig pixels (the rig lives in a 200x260 box, feet at y=250).
 */
export interface Pose {
  /** whole-body offset (negative y = up) */
  x: number;
  y: number;
  /** rotation of the whole body around the feet, degrees */
  lean: number;
  /** squash & stretch */
  sx: number;
  sy: number;
  /** horizontal flip factor for spinning (1 = facing us, -1 = back) */
  flip: number;
  head: { tilt: number; dx: number; dy: number };
  /** outward raise of each arm in degrees; negative = inward (clapping, hugging, hand to chin) */
  armL: number;
  armR: number;
  /** enlarge the right hand (pointing at the viewer) */
  handScaleR: number;
  /** leg lift, negative = up */
  legL: number;
  legR: number;
  eyes: { dx: number; dy: number; mode: "open" | "closed" | "happy" };
  tail: number;
  /** small burst at the hands (clap contact) 0..1 */
  clapSpark: number;
}

const base = (): Pose => ({
  x: 0,
  y: 0,
  lean: 0,
  sx: 1,
  sy: 1,
  flip: 1,
  head: { tilt: 0, dx: 0, dy: 0 },
  armL: 8,
  armR: 8,
  handScaleR: 1,
  legL: 0,
  legR: 0,
  eyes: { dx: 0, dy: 0, mode: "open" },
  tail: 0,
  clapSpark: 0,
});

export interface PoseInput {
  action: Action;
  /** seconds since the action started */
  t: number;
  bpm: number;
  /** de-syncs characters standing next to each other */
  seed?: number;
  /** fish swim instead of standing; ducks flap when they fly */
  legless?: boolean;
}

export function computePose({ action, t, bpm, seed = 0, legless = false }: PoseInput): Pose {
  const p = base();
  const s = seed * 1.7;
  const beat = (t * bpm) / 60; // beats elapsed
  const bph = beat - Math.floor(beat); // phase within the beat
  const TAU = Math.PI * 2;

  // everyone breathes and sways a little
  p.y = 1.5 * Math.sin(t * 2.4 + s);
  p.head.tilt = 2.5 * Math.sin(t * 1.3 + s);
  p.armL = 8 + 3 * Math.sin(t * 2 + s);
  p.armR = 8 + 3 * Math.sin(t * 2 + 1 + s);
  p.tail = 12 * Math.sin(t * 3 + s);
  if (legless) {
    // fish hover and wiggle
    p.y = -70 + 8 * Math.sin(t * 2.2 + s);
    p.lean = 4 * Math.sin(t * 1.6 + s);
    p.tail = 22 * Math.sin(t * 7 + s);
  }

  switch (action) {
    case "idle":
    case "look":
      if (action === "look") {
        p.head.tilt = 8 + 2 * Math.sin(t * 3);
        p.head.dx = 4;
        p.eyes.dx = 5;
        p.eyes.dy = -3;
        p.armR = 125 + 6 * Math.sin(t * 4);
      }
      break;
    case "wave":
      p.armR = 150 + 18 * Math.sin(t * TAU * 2.2);
      p.head.tilt = 6 + 2 * Math.sin(t * 3);
      p.y += -3 * hop(t * 1.4);
      break;
    case "nod":
      p.head.dy = 6 * Math.sin(t * TAU * 1.4);
      p.head.tilt = 3 * Math.sin(t * TAU * 0.7);
      p.eyes.mode = Math.sin(t * TAU * 1.4) > 0.6 ? "happy" : "open";
      break;
    case "shake":
      p.head.dx = 9 * Math.sin(t * TAU * 2.4);
      p.eyes.dx = -5 * Math.sin(t * TAU * 2.4);
      p.armL = 20 + 12 * Math.sin(t * TAU * 2.4);
      p.armR = 20 - 12 * Math.sin(t * TAU * 2.4);
      break;
    case "jump": {
      const period = 0.62;
      const ph = ((t + 0.05) / period) % 1;
      const air = Math.sin(Math.PI * ph);
      p.y = -78 * air;
      p.sx = ph < 0.12 || ph > 0.9 ? 1.14 : 1 - 0.07 * air;
      p.sy = ph < 0.12 || ph > 0.9 ? 0.86 : 1 + 0.1 * air;
      p.armL = 10 + 150 * air;
      p.armR = 10 + 150 * air;
      p.legL = -8 * air;
      p.legR = -8 * air;
      p.eyes.mode = air > 0.85 ? "happy" : "open";
      break;
    }
    case "clap": {
      const c = 0.5 + 0.5 * Math.sin(t * TAU * 2.6 - Math.PI / 2); // 0 open .. 1 together
      p.armL = -(58 + 48 * c);
      p.armR = -(58 + 48 * c);
      p.y += -4 * c;
      p.head.dy = 2 * c;
      p.clapSpark = c > 0.93 ? (c - 0.93) / 0.07 : 0;
      break;
    }
    case "dance": {
      const sw = Math.sin(beat * Math.PI); // alternates every beat
      p.lean = 9 * sw;
      p.y = -14 * hop(beat) - 2;
      p.sx = 1 + 0.04 * hop(beat);
      p.sy = 1 - 0.04 * hop(beat);
      p.head.tilt = -7 * sw;
      p.armL = 95 + 55 * sw;
      p.armR = 95 - 55 * sw;
      p.legL = -6 * Math.max(0, sw);
      p.legR = -6 * Math.max(0, -sw);
      p.tail = 20 * sw;
      break;
    }
    case "spin": {
      const ph = ((t + 0.15) / 1.3) % 1;
      p.flip = Math.cos(ph * TAU);
      p.armL = 85;
      p.armR = 85;
      p.y = -6 * hop(t * 2);
      p.eyes.mode = "happy";
      break;
    }
    case "point":
      p.armR = 92 + 3 * Math.sin(t * 5);
      p.handScaleR = 1.3;
      p.head.tilt = -5;
      p.y += -3 * hop(t * 1.2);
      p.eyes.dy = 2;
      break;
    case "hug":
      p.armL = -72 + 4 * Math.sin(t * 3);
      p.armR = -72 + 4 * Math.sin(t * 3 + 1);
      p.lean = 3 * Math.sin(t * 1.8);
      p.eyes.mode = "happy";
      p.head.tilt = 8 * Math.sin(t * 1.8);
      break;
    case "sleep":
      p.lean = -9;
      p.head.tilt = -12;
      p.head.dy = 4;
      p.sy = 1 + 0.025 * Math.sin(t * 1.5);
      p.y = 2;
      p.eyes.mode = "closed";
      p.armL = 4;
      p.armR = 4;
      break;
    case "think":
      p.armR = -118 + 3 * Math.sin(t * 2);
      p.head.tilt = 9;
      p.eyes.dx = 6;
      p.eyes.dy = -7;
      break;
    case "cheer": {
      const period = 0.46;
      const ph = (t / period) % 1;
      const air = Math.sin(Math.PI * ph);
      p.y = -34 * air;
      p.armL = 160 + 12 * Math.sin(t * TAU * 8);
      p.armR = 160 + 12 * Math.sin(t * TAU * 8 + 1.5);
      p.sx = ph < 0.12 ? 1.1 : 1;
      p.sy = ph < 0.12 ? 0.9 : 1;
      p.head.tilt = 5 * Math.sin(t * 6);
      break;
    }
    case "stomp": {
      const ph = Math.sin(t * TAU * 1.6);
      p.legL = -16 * Math.max(0, ph);
      p.legR = -16 * Math.max(0, -ph);
      p.y = -3 * Math.abs(ph);
      p.lean = 3 * ph;
      p.armL = 25 + 30 * ph;
      p.armR = 25 - 30 * ph;
      p.head.dy = 2 * Math.abs(ph);
      break;
    }
    case "swim":
      p.x = 26 * Math.sin(t * 1.5 + s);
      p.lean = 10 * Math.sin(t * 1.5 + s);
      p.y = (legless ? -70 : -30) + 8 * Math.sin(t * 3.2);
      p.armL = 60 + 40 * Math.sin(t * TAU * 1.2);
      p.armR = 60 + 40 * Math.sin(t * TAU * 1.2 + Math.PI);
      p.tail = 24 * Math.sin(t * 8);
      break;
    case "fly":
      p.y = -60 + 12 * Math.sin(t * 4 + s);
      p.armL = 45 + 55 * Math.sin(t * TAU * 3);
      p.armR = 45 + 55 * Math.sin(t * TAU * 3);
      p.legL = -8;
      p.legR = -8;
      p.lean = 4 * Math.sin(t * 2);
      break;
    case "walk": {
      const ph = Math.sin(t * TAU * 2.2);
      p.y = -4 * Math.abs(ph);
      p.legL = -10 * Math.max(0, ph);
      p.legR = -10 * Math.max(0, -ph);
      p.armL = 15 + 25 * ph;
      p.armR = 15 - 25 * ph;
      p.lean = 2;
      p.head.dy = 1.5 * Math.abs(ph);
      break;
    }
    case "cry":
      p.head.dy = 6;
      p.head.tilt = -4;
      p.armL = -100;
      p.armR = -100;
      p.x = 2 * Math.sin(t * 22);
      p.eyes.mode = "closed";
      break;
    case "eat":
      p.armR = -112 + 18 * Math.sin(t * TAU * 1.5);
      p.head.tilt = 4;
      p.eyes.mode = Math.sin(t * TAU * 1.5) > 0.3 ? "happy" : "open";
      break;
  }
  return p;
}
