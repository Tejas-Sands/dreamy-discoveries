/** Small animation helpers shared by the components. */
export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeOutBack = (t: number, s = 1.6) => {
  const x = clamp01(t) - 1;
  return x * x * ((s + 1) * x + s) + 1;
};
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);
export const easeInOutSine = (t: number) => -(Math.cos(Math.PI * clamp01(t)) - 1) / 2;
/** |sin| hop with a soft landing, 0..1 */
export const hop = (phase: number) => Math.abs(Math.sin(Math.PI * phase));

/** beat helpers: bpm → phase in [0,1) of the current beat and the beat index */
export const beatPhase = (sec: number, bpm: number) => {
  const b = (sec * bpm) / 60;
  return { phase: b - Math.floor(b), index: Math.floor(b), beats: b };
};
