import type { Action } from "../../lib/types";
import { hop, easeOutBack } from "../../lib/anim";

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
  /** elbow flex, 0 = straight, 1 = folded */
  armBendL: number;
  armBendR: number;
  /** enlarge the right hand (pointing at the viewer) */
  handScaleR: number;
  /** leg lift, negative = up */
  legL: number;
  legR: number;
  /** leg swing rotation around each hip in degrees (positive = foot forward). Gives walks & dances a real gait. */
  legSwL: number;
  legSwR: number;
  eyes: { dx: number; dy: number; mode: "open" | "closed" | "happy" };
  tail: number;
  /** small burst at the hands (clap contact) 0..1 */
  clapSpark: number;
  /** vertical velocity of the body in rig px/s (negative = moving up) — ears and tails lag behind it */
  vy: number;
  /** horizontal velocity in rig px/s — the body leans into lateral motion */
  vx: number;
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
  /** elbow flex 0..1 (0 = straight, 1 = folded); -1 = auto-derive from the shoulder angle */
  armBendL: -1,
  armBendR: -1,
  handScaleR: 1,
  legL: 0,
  legR: 0,
  legSwL: 0,
  legSwR: 0,
  eyes: { dx: 0, dy: 0, mode: "open" },
  tail: 0,
  clapSpark: 0,
  vy: 0,
  vx: 0,
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
  /** upbeat scene: even idle characters bob on the beat so the whole screen pulses with the music */
  groove?: boolean;
}

export function computePose(input: PoseInput): Pose {
  const p = poseAt(input);
  // follow-through: how fast is the body moving right now? (ears/tails drag behind)
  const dt = 1 / 30;
  const prev = poseAt({ ...input, t: input.t - dt });
  p.vy = (p.y - prev.y) / dt;
  p.vx = (p.x - prev.x) / dt;
  // lean into lateral motion (dance steps, slides) — sells the momentum
  p.lean += Math.max(-7, Math.min(7, p.vx * 0.02));
  return p;
}

/** actions that keep a gentle bob on the beat in upbeat scenes (the others have their own strong motion) */
const GROOVERS = new Set<Action>(["idle", "look", "nod", "point", "walk", "eat"]);

function poseAt({ action, t, bpm, seed = 0, legless = false, groove = false }: PoseInput): Pose {
  const p = base();
  const s = seed * 1.7;
  const beat = (t * bpm) / 60; // beats elapsed
  const bph = beat - Math.floor(beat); // phase within the beat
  const TAU = Math.PI * 2;

  // calm base: a slow breath and a still, confident frame (no constant arm-waving or tail-wagging)
  p.y = 0.7 * Math.sin(t * 1.2 + s);
  p.head.tilt = 1.4 * Math.sin(t * 0.8 + s);
  p.armL = 8;
  p.armR = 8;
  p.tail = 5 * Math.sin(t * 1.2 + s);
  if (legless) {
    // fish hover and wiggle
    p.y = -70 + 5 * Math.sin(t * 1.6 + s);
    p.lean = 3 * Math.sin(t * 1.2 + s);
    p.tail = 18 * Math.sin(t * 4 + s);
  }

  switch (action) {
    case "idle": {
      // breathing + a slow weight shift so a standing hero never looks frozen
      const br = Math.sin(t * 1.5 + s);
      p.sx = 1 + 0.02 * br;
      p.sy = 1 - 0.02 * br;
      p.y += -0.9 * br;
      p.x = 0.9 * Math.sin(t * 0.5 + s);
      p.lean = 1.4 * Math.sin(t * 0.5 + s);
      p.head.tilt = 2 * Math.sin(t * 0.8 + s);
      break;
    }
    case "look":
      p.head.tilt = 8 + 2 * Math.sin(t * 3);
      p.head.dx = 4;
      p.eyes.dx = 5;
      p.eyes.dy = -3;
      p.armR = 125 + 6 * Math.sin(t * 4);
      break;
    case "wave":
      p.armR = 150 + 15 * Math.sin(t * TAU * 1.5);
      p.armBendR = 0.5;
      p.head.tilt = 5 + 1.5 * Math.sin(t * 2);
      p.y += -2 * hop(t * 1.2);
      break;
    case "nod":
      p.head.dy = 5 * Math.sin(t * TAU * 1.1);
      p.head.tilt = 2.5 * Math.sin(t * TAU * 0.55);
      p.eyes.mode = Math.sin(t * TAU * 1.1) > 0.6 ? "happy" : "open";
      break;
    case "shake":
      p.head.dx = 7 * Math.sin(t * TAU * 1.6);
      p.eyes.dx = -4 * Math.sin(t * TAU * 1.6);
      p.armL = 20 + 10 * Math.sin(t * TAU * 1.6);
      p.armR = 20 - 10 * Math.sin(t * TAU * 1.6);
      break;
    case "jump": {
      // anticipation (crouch) → stretch on take-off → hang → squash on landing
      const period = 0.72;
      const ph = ((t + 0.08) / period) % 1;
      const CROUCH = 0.18;
      const LAND = 0.82;
      if (ph < CROUCH) {
        const k = ph / CROUCH; // sink then spring
        const c = Math.sin(Math.PI * k);
        p.y = 8 * c;
        p.sx = 1 + 0.14 * c;
        p.sy = 1 - 0.14 * c;
        p.armL = 8 - 30 * c;
        p.armR = 8 - 30 * c;
        p.head.dy = 4 * c;
      } else if (ph < LAND) {
        const a = (ph - CROUCH) / (LAND - CROUCH);
        const air = Math.sin(Math.PI * a);
        const stretch = Math.max(0, 1 - a * 3); // stretched just after take-off
        p.y = -88 * air;
        p.sx = 1 - 0.08 * air - 0.05 * stretch;
        p.sy = 1 + 0.1 * air + 0.08 * stretch;
        p.armL = 10 + 150 * air;
        p.armR = 10 + 150 * air;
        p.legL = -10 * air;
        p.legR = -10 * air;
        // tuck the knees on the way up, reach them forward at the peak
        p.legSwL = 22 * air;
        p.legSwR = -22 * air;
        p.eyes.mode = air > 0.85 ? "happy" : "open";
      } else {
        // a springy landing: squash hard, then a couple of damped little bounces that settle out
        const k = (ph - LAND) / (1 - LAND);
        const c = Math.sin(Math.PI * easeOutBack(k, 1.2));
        const damp = Math.max(0, 1 - k * 0.9);
        p.y = 8 * c * damp;
        p.sx = 1 + 0.18 * c * damp;
        p.sy = 1 - 0.18 * c * damp;
        p.head.dy = 4 * c * damp;
      }
      break;
    }
    case "clap": {
      const c = 0.5 + 0.5 * Math.sin(t * TAU * 2.6 - Math.PI / 2); // 0 open .. 1 together
      p.armL = -(58 + 48 * c);
      p.armR = -(58 + 48 * c);
      p.armBendL = 0.55;
      p.armBendR = 0.55;
      p.y += -4 * c;
      p.head.dy = 2 * c;
      p.clapSpark = c > 0.93 ? (c - 0.93) / 0.07 : 0;
      break;
    }
    case "dance": {
      const sw = Math.sin(beat * Math.PI); // alternates every beat
      const h = hop(beat);
      const style = Math.abs(Math.round(seed)) % 4;
      p.tail = 20 * sw;
      if (style === 0) {
        // side-to-side sway, arms swinging
        p.lean = 9 * sw;
        p.y = -14 * h - 2;
        p.sx = 1 + 0.04 * h;
        p.sy = 1 - 0.04 * h;
        p.head.tilt = -7 * sw;
        p.armL = 95 + 55 * sw;
        p.armR = 95 - 55 * sw;
        p.armBendL = 0.35;
        p.armBendR = 0.35;
        p.legL = -6 * Math.max(0, sw);
        p.legR = -6 * Math.max(0, -sw);
        p.legSwL = 20 * sw;
        p.legSwR = -20 * sw;
      } else if (style === 1) {
        // bounce with both arms up ("raise the roof"), squash on the downbeat
        p.y = -18 * h;
        p.sx = 1 + 0.07 * (1 - h);
        p.sy = 1 - 0.07 * (1 - h);
        p.armL = 140 + 22 * h;
        p.armR = 140 + 22 * h;
        p.head.dy = -3 * h;
        p.head.tilt = 4 * sw;
        p.legL = -5 * h;
        p.legR = -5 * h;
        p.legSwL = -7 * sw;
        p.legSwR = 7 * sw;
        p.eyes.mode = h > 0.9 ? "happy" : "open";
      } else if (style === 2) {
        // the twist: hips turn, one arm up one down, little hops
        p.flip = 0.72 + 0.28 * Math.cos(beat * Math.PI);
        p.lean = -6 * sw;
        p.y = -8 * hop(beat * 2) - 2;
        p.armL = 110 + 50 * sw;
        p.armR = 40 - 30 * sw;
        p.head.tilt = 5 * sw;
        p.legL = -4 * Math.max(0, -sw);
        p.legR = -4 * Math.max(0, sw);
        p.legSwL = -14 * sw;
        p.legSwR = 14 * sw;
      } else {
        // the wiggle: fast hip shake and a head bob on every half beat
        const wig = Math.sin(beat * Math.PI * 2);
        p.x = 5 * wig;
        p.lean = 4 * wig;
        p.y = -6 * hop(beat * 2) - 2;
        p.head.dx = -6 * wig;
        p.head.tilt = -8 * wig;
        p.armL = 60 + 20 * wig;
        p.armR = 60 - 20 * wig;
        p.legSwL = 9 * wig;
        p.legSwR = -9 * wig;
        p.sx = 1 + 0.03 * Math.abs(wig);
        p.sy = 1 - 0.03 * Math.abs(wig);
      }
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
      p.armBendR = 0.15;
      p.armBendL = 0.4;
      p.handScaleR = 1.3;
      p.head.tilt = -5;
      p.y += -3 * hop(t * 1.2);
      p.eyes.dy = 2;
      break;
    case "hug":
      p.armL = -72 + 4 * Math.sin(t * 3);
      p.armR = -72 + 4 * Math.sin(t * 3 + 1);
      p.armBendL = 0.75;
      p.armBendR = 0.75;
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
      p.armBendL = 0.4;
      p.armBendR = 0.4;
      break;
    case "think":
      p.armR = -118 + 3 * Math.sin(t * 2);
      p.armBendR = 0.85;
      p.armBendL = 0.35;
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
      p.armBendL = 0.08;
      p.armBendR = 0.08;
      p.sx = ph < 0.12 ? 1.1 : 1;
      p.sy = ph < 0.12 ? 0.9 : 1;
      // little alternating leg kicks between hops
      const kick = Math.sin(t * TAU * 4);
      p.legL = -14 * Math.max(0, kick);
      p.legR = -14 * Math.max(0, -kick);
      p.legSwL = 14 * kick;
      p.legSwR = -14 * kick;
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
      const absPh = Math.abs(ph);
      p.y = -5 * absPh;
      // one foot lifts and swings forward while the other plants and pushes off
      p.legL = -13 * Math.max(0, ph);
      p.legR = -13 * Math.max(0, -ph);
      p.legSwL = 22 * ph;
      p.legSwR = -22 * ph;
      // arms swing OPPOSITE to their same-side leg (a proper gait)
      p.armL = 18 - 28 * ph;
      p.armR = 18 + 28 * ph;
      // body sways into the supporting leg, head counter-balances
      p.lean = 4 * ph;
      p.head.tilt = -2 * ph;
      p.head.dy = 2 * absPh;
      p.sx = 1 + 0.015 * absPh;
      p.sy = 1 - 0.015 * absPh;
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
      p.armBendL = 0.45;
      p.armBendR = 0.5;
      p.head.tilt = 4;
      p.eyes.mode = Math.sin(t * TAU * 1.5) > 0.3 ? "happy" : "open";
      break;
  }

  // elbows: hanging arms relax into a gentle bend; raised arms straighten out
  const bendOf = (ang: number) => Math.max(0.08, Math.min(0.74, 0.62 - ang / 210));
  if (p.armBendL < 0) p.armBendL = bendOf(p.armL);
  if (p.armBendR < 0) p.armBendR = bendOf(p.armR);

  if (groove && GROOVERS.has(action) && !legless) {
    // a gentle pulse on the beat + a little knee wave — the group breathes, it doesn't bounce
    const sw = Math.sin(beat * Math.PI);
    const h = hop(beat);
    p.y += -4 * h;
    p.lean += 1.6 * sw;
    p.head.tilt += 1.4 * sw;
    p.sx *= 1 + 0.013 * (1 - h);
    p.sy *= 1 - 0.013 * (1 - h);
    p.tail += 5 * sw;
    p.legSwL += 5 * sw;
    p.legSwR += -5 * sw;
  }
  return p;
}
