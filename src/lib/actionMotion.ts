import type { Action } from "./types";

export const JUMP_PERIOD = 0.72;
export const JUMP_OFFSET = 0.08;
/** Normalized phase at which the feet reach the ground. */
export const JUMP_LAND = 0.82;
export const CLAP_PERIOD = 1 / 2.6;
export const STOMP_PERIOD = 1 / 1.6;

export const jumpPhase = (t: number): number => ((t + JUMP_OFFSET) / JUMP_PERIOD % 1 + 1) % 1;
export const clapAmount = (t: number): number => 0.5 - 0.5 * Math.cos(t * Math.PI * 2 / CLAP_PERIOD);
export const stompPhase = (t: number): number => Math.sin(t * Math.PI * 2 / STOMP_PERIOD);

function contactCycle(action: Action): { first: number; period: number } | null {
  switch (action) {
    case "jump": return { first: JUMP_LAND * JUMP_PERIOD - JUMP_OFFSET, period: JUMP_PERIOD };
    case "clap": return { first: CLAP_PERIOD / 2, period: CLAP_PERIOD };
    // Each alternating foot lands once per half cycle; time zero is the initial stance.
    case "stomp": return { first: STOMP_PERIOD / 2, period: STOMP_PERIOD / 2 };
    default: return null;
  }
}

/** Contact times in the half-open action interval [0, durationSec). */
export function actionContacts(action: Action, durationSec: number): number[] {
  const cycle = contactCycle(action);
  if (!cycle || !Number.isFinite(durationSec) || durationSec <= 0) return [];
  const contacts: number[] = [];
  for (let i = 0; ; i++) {
    const t = cycle.first + i * cycle.period;
    if (t >= durationSec) return contacts;
    contacts.push(t);
  }
}

/** Short post-contact envelope, shared by visual accents and camera response. */
export function impactAt(action: Action, t: number): number {
  const cycle = contactCycle(action);
  if (!cycle || !Number.isFinite(t) || t < cycle.first - 1e-9) return 0;
  const index = Math.floor((t - cycle.first + 1e-9) / cycle.period);
  const elapsed = Math.max(0, t - (cycle.first + index * cycle.period));
  return Math.max(0, 1 - elapsed / 0.12);
}

/** Let an airborne jump reach contact before an ordinary gesture takes over. */
export function nextActionBoundary(action: Action, t: number): number {
  if (action !== "jump") return t;
  const phase = jumpPhase(t);
  if (phase < 0.18 || phase >= JUMP_LAND) return t;
  return t + (JUMP_LAND - phase) * JUMP_PERIOD;
}
