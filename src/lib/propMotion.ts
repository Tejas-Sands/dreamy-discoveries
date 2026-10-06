export interface PropCue {propId: string; kind: string; from: number; until: number}
const smooth = (value: number) => {const k=Math.max(0,Math.min(1,value));return k*k*(3-2*k);};

/** One brief anticipation/settle per authored event; resting objects remain still. */
export function propMotion(id: string, events: readonly PropCue[], frame: number, fps: number, quiet: boolean) {
  const rest = {rotation:0,sx:1,sy:1,accent:0};
  if (!Number.isFinite(frame) || !Number.isFinite(fps) || fps<=0) return rest;
  const event = events.filter(e=>e.propId===id && e.kind!=='show' && frame>=e.from-6).at(-1);
  if (!event) return rest;
  // Rolling already has a physical distance-derived angle. Decorative wobble would
  // make it slide or continue rotating after reaching its frozen endpoint.
  if(event.kind==='roll') return rest;
  const amount = quiet ? .25 : 1;
  if (frame < event.until) {
    const progress = smooth((frame-event.from)/Math.max(1,event.until-event.from));
    const arc = Math.sin(progress*Math.PI);
    const anticipation = frame < event.from ? Math.sin(Math.PI*(frame-event.from+6)/6)*.035 : 0;
    return {rotation:(event.kind==='give' ? -8 : 5)*arc*amount,sx:1+anticipation*amount,sy:1-anticipation*amount,accent:0};
  }
  const age = (frame-event.until)/fps;
  if (age >= .55) return rest;
  const fade = 1-smooth(age/.55);
  const settle = Math.sin(age/.55*Math.PI*2)*fade*amount;
  return {rotation:3*settle,sx:1+(event.kind==='drop' ? .075 : .035)*settle,
    sy:1-(event.kind==='drop' ? .075 : .035)*settle,accent:Math.sin(age/.55*Math.PI)*fade*amount};
}
