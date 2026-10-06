import type {Action, Emotion, Scene, Gag, SceneDirection, SfxName} from './types';
import type {SceneSlot} from './timing';
import {nextActionBoundary, actionContacts} from './actionMotion';

export const CONTACT_SFX: Partial<Record<Action,SfxName>> = {jump:'boing',clap:'clap',stomp:'stomp'};

export interface ActionCue { from: number; action: Action }

const responseEmotion = (emotion: Emotion): Emotion => emotion === 'sad' ? 'worried' : emotion === 'excited' ? 'happy' : emotion;

const CAST_ALIASES:Record<string,string>={taffy:'bunny',ben:'bear',daisy:'duck',fiona:'fox',tilly:'turtle',ozzy:'owl'};
const animal=(kind:string|undefined|null)=>kind?CAST_ALIASES[kind]??kind:null;
/** Resolve role, species and cast-ID dialogue consistently for faces, gestures and audio. */
export function actorRole(scene:Pick<Scene,'character'|'secondCharacter'>,speaker:string|undefined):'character'|'friend'|null {
  if (!speaker || speaker==='character') return 'character';
  if (speaker==='friend') return 'friend';
  if (speaker==='narrator') return null;
  return animal(speaker)===animal(scene.character)?'character':animal(speaker)===animal(scene.secondCharacter)?'friend':null;
}

/** A listener notices the speaker a few frames later; no previous render state is needed. */
export function actorEmotion(scene: Scene, slot: SceneSlot, actor: 'character' | 'friend', frame: number, fps: number): Emotion {
  if (scene.question && frame >= slot.holdFrom && frame < slot.revealFrom) return 'thinking';
  if (scene.question && frame >= slot.revealFrom && frame < slot.praiseFrom) return frame - slot.revealFrom < fps * .45 ? 'surprised' : 'excited';
  const owns = (speaker: string | undefined) => actorRole(scene,speaker) === actor;
  const latest = (at: number) => slot.lines.filter(line => line.from <= at).at(-1);
  const active = latest(frame);
  if (active && owns(active.line.speaker)) return active.line.emotion ?? scene.emotion ?? 'neutral';
  const noticed = latest(frame - Math.round(fps * .16));
  if (!noticed) return scene.emotion ? responseEmotion(scene.emotion) : 'neutral';
  const feeling = noticed.line.emotion ?? scene.emotion ?? 'neutral';
  return owns(noticed.line.speaker) ? feeling : responseEmotion(feeling);
}

/** Integrate speed over the episode so scene boundaries never reset environmental phase. */
export function ambientTimeline(slots: ReadonlyArray<Pick<SceneSlot,'from' | 'duration'>>, rates: readonly number[], fps: number): number[] {
  let time = (slots[0]?.from ?? 0) / fps * .55;
  return slots.map((slot, i) => {
    const from = time;
    time += slot.duration / fps * Math.max(0, Math.min(1, rates[i] ?? .55));
    return from;
  });
}

/** Every visible scene samples the same absolute clock, including both sides of a fade. */
export function ambientAt(slots: ReadonlyArray<Pick<SceneSlot,'from' | 'duration'>>, rates: readonly number[], starts: readonly number[], frame: number, fps: number): number {
  if (!slots.length || frame < slots[0].from) return Math.max(0,frame) / fps * .55;
  let index=0;
  while (index+1 < slots.length && frame >= slots[index+1].from) index++;
  return starts[index] + (frame-slots[index].from) / fps * Math.max(0,Math.min(1,rates[index] ?? .55));
}

/** Slow emotional framing settles at the end of speech instead of growing through holds. */
export function emotionalPushIn(t: number, durationSec: number): number {
  const k = Math.max(0, Math.min(1, t / Math.max(2, durationSec)));
  return .045 * k * k * (3 - 2 * k);
}

/** Per-actor actions on the scene clock. Adjacent identical actions form one run. */
export function actionTrack(scene: Scene, slot: SceneSlot, actor: 'character' | 'friend', fps: number): ActionCue[] {
  const cues: ActionCue[] = [{from: 0, action: 'idle'}];
  for (const l of slot.lines) {
    const action = l.line.action ?? scene.action ?? 'idle';
    const speaking = actorRole(scene,l.line.speaker) === actor;
    const together = ['dance','cheer','hug','walk'].includes(action);
    const listening = actor === 'character' ? 'look' : 'idle';
    cues.push({from: l.from, action: speaking || together || l.line.speaker === 'narrator' && actor === 'character' ? action : listening});
  }
  if (scene.question) {
    cues.push({from:slot.holdFrom, action:'think'}, {from:slot.revealFrom, action:'idle'}, {from:slot.revealFrom + Math.round(0.45 * fps), action:'cheer'});
  } else if (scene.energy === 'upbeat' && slot.holdDuration > 0 && !['thinking','lullaby','tender'].includes(scene.direction ?? '')) {
    cues.push({from:slot.holdFrom,action:'dance'});
  }
  cues.sort((a,b)=>a.from-b.from);
  const track: ActionCue[]=[];
  for (const cue of cues) {
    if (track.at(-1)?.from === cue.from) track.pop();
    if (track.at(-1)?.action !== cue.action) track.push(cue);
  }
  const landed: ActionCue[] = [];
  for (let i = 0; i < track.length; i++) {
    const cue = track[i];
    const previous = landed.at(-1);
    if (previous?.action === cue.action) continue;
    // Question/reveal timing is exact. Ordinary gestures may wait for contact.
    const hardBoundary = scene.question && cue.from >= slot.holdFrom;
    const from = previous && !hardBoundary
      ? previous.from + Math.ceil(nextActionBoundary(previous.action, (cue.from - previous.from) / fps) * fps - 1e-9)
      : cue.from;
    // A later request supersedes a gesture that never got a chance to start.
    if (from > cue.from && from >= (track[i + 1]?.from ?? slot.duration)) continue;
    landed.push({...cue,from});
  }
  return landed;
}

export function sampleAction(track: ActionCue[], frame: number, fps: number) {
  let index = track.length-1;
  while (index >= 0 && track[index].from > frame) index--;
  const cue = track[index] ?? {from:0,action:'idle' as const};
  const previous = track[index-1];
  const t = Math.max(0, (frame-cue.from)/fps);
  const k = Math.min(1,t/0.22);
  return {
    action:cue.action, t, from:cue.from,
    blend:previous ? k*k*(3-2*k) : 1,
    previousAction:previous ? {action:previous.action,t:(cue.from-previous.from)/fps} : undefined,
  };
}

/** Contacts follow actual action runs, including a landing delayed beyond its line. */
export function contactSounds(track: ActionCue[], slot: SceneSlot, actor: 'character'|'friend', fps:number, scene?:Pick<Scene,'character'|'secondCharacter'>) {
  const sounds: Array<{at:number;name:SfxName}>=[];
  for (let i=0;i<track.length;i++) {
    const run=track[i], name=CONTACT_SFX[run.action];
    if (!name) continue;
    const end=track[i+1]?.from ?? slot.duration;
    for (const t of actionContacts(run.action,(end-run.from+1)/fps)) {
      const at=run.from+Math.ceil(t*fps-1e-9);
      if (at>=slot.duration || at>end) continue;
      // The latest authored line controls whether its ongoing action makes sound.
      const sources=slot.lines.filter(l=>l.from<=at && l.line.action===run.action &&
        (scene ? actorRole(scene,l.line.speaker)===actor || l.line.speaker==='narrator'&&actor==='character' : l.line.speaker==='friend' ? actor==='friend' : actor==='character'));
      const source=sources.at(-1);
      if (source && (source.line.sfx ?? [name]).includes(name)) sounds.push({at,name});
    }
  }
  return sounds;
}

/** Manual timings are authoritative. Automatic gags only occupy unvoiced gaps. */
export function gagFrame(gag: Gag | null | undefined, slot: SceneSlot, fps: number): number | null {
  if (!gag) return null;
  const preferred = Math.round(gag.atSec * fps);
  const duration = Math.ceil(3 * fps);
  if (!gag.auto) return preferred + duration < slot.duration ? preferred : null;
  const busy = slot.lines.map(l=>[l.from-l.pre,l.from-l.pre+l.duration]);
  if (slot.revealFrom >= 0) busy.push([slot.holdFrom,slot.praiseFrom]);
  busy.sort((a,b)=>a[0]-b[0]);
  let cursor = preferred;
  for (const [start,end] of busy) {
    if (cursor + duration <= start) return cursor;
    if (cursor < end) cursor=end;
  }
  return cursor + duration < slot.duration ? cursor : null;
}

/** Restraint comes from scene intent, without changing explicit gestures. */
export function motionProfile(direction: SceneDirection) {
  switch(direction) {
    case 'lullaby': return {amplitude:0.55,ambient:0.18,camera:0.25,celebrate:false,entrance:false};
    case 'tender': return {amplitude:0.72,ambient:0.3,camera:0.45,celebrate:false,entrance:false};
    case 'thinking': return {amplitude:0.7,ambient:0.12,camera:0,celebrate:false,entrance:false};
    case 'demonstration': return {amplitude:1,ambient:0.3,camera:0.4,celebrate:false,entrance:true};
    case 'celebration': return {amplitude:1,ambient:1,camera:1,celebrate:true,entrance:true};
    default: return {amplitude:0.9,ambient:0.55,camera:0.65,celebrate:false,entrance:true};
  }
}
