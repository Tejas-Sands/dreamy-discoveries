export interface EnvironmentEvent {
  /** Scene-relative frame. */
  from: number;
  kind: 'ripple' | 'leaf' | 'sparkle';
  x: number;
  y: number;
}

export interface EnvironmentSample extends EnvironmentEvent {
  opacity: number;
  radius: number;
  rotation: number;
  progress: number;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, Number.isFinite(value) ? value : 0));

// Architecture, fire and roaming animals remain behind the actors.
export const isActorForeground = (part: string): boolean => ['flowers', 'sunflowers', 'leaves', 'snowflakes', 'rain', 'foam'].includes(part);

/** Pixel offsets, restrained by the same scene motion factor as the ambient clock. */
export function sceneryParallax(t: number, motion = .55, parallax?: {x: number; y: number}) {
  const m = clamp(motion, 0, 1), x = clamp(parallax?.x ?? 0, -16, 16), y = clamp(parallax?.y ?? 0, -8, 8);
  const drift = Math.sin((Number.isFinite(t) ? t : 0) * .16);
  const point = (px: number, py: number) => ({x: m === 0 ? 0 : px * m, y: m === 0 ? 0 : py * m});
  return {back: point(x * .2 + drift * 3, y * .2), middle: point(x * .45, y * .45), front: point(x * .8 - drift * 7, y * .8)};
}

/** Small, short-lived responses sampled directly from scene time, never render history. */
export function sampleEnvironment(background: string, events: readonly EnvironmentEvent[], frame: number, fps: number, quiet: boolean): EnvironmentSample[] {
  if (!Number.isFinite(frame) || !Number.isFinite(fps) || fps <= 0) return [];
  const water = /pond|lake|beach|underwater|ocean|rainy/.test(background);
  const foliage = /forest|jungle|meadow|garden|park|farm|autumn|campfire/.test(background);
  const samples: EnvironmentSample[] = [];
  for (const event of events) {
    if (![event.from, event.x, event.y].every(Number.isFinite)) continue;
    if (event.kind === 'ripple' && !water || event.kind === 'leaf' && (!foliage || quiet)) continue;
    const duration = Math.round(fps * (event.kind === 'ripple' ? 1.2 : event.kind === 'leaf' ? 1.5 : 1));
    const age = frame - event.from;
    if (age < 0 || age >= duration) continue;
    const progress = age / duration;
    const envelope = Math.min(1, age / Math.max(1, fps * .12)) * (1 - progress);
    const radius = event.kind === 'ripple' ? 20 + progress * (quiet ? 24 : 42) : event.kind === 'leaf' ? 14 : 8 + Math.sin(progress * Math.PI) * 9;
    const x = clamp(event.x + (event.kind === 'leaf' ? Math.sin(progress * Math.PI) * 25 : 0), 56, 1864);
    const y = clamp(event.y + (event.kind === 'leaf' ? progress * 22 : 0), 800, 910 - radius);
    samples.push({...event, x, y, radius, progress, rotation: event.kind === 'leaf' ? progress * 65 : 0, opacity: envelope * (quiet ? .22 : .65)});
    if (samples.length >= (quiet ? 1 : 3)) break;
  }
  return samples;
}
