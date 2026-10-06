import type {Scene, StageRole, StageSample} from './types';
import type {SceneSlot} from './timing';
import {actorRole} from './sceneMotion';
import type {PropCue} from './propMotion';
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const smooth=(n:number)=>{const k=clamp(n,0,1);return k*k*(3-2*k);};
const mix=(a:number,b:number,k:number)=>a+(b-a)*k;

/** Replay the tiny focus timeline so short lines and chunk seeks never snap the camera. */
export function stageCamera(stage:StageSample,scene:Scene,slot:SceneSlot,frame:number,fps:number,events:readonly PropCue[]=[]) {
  const main=stage.actors.character,friend=stage.actors.friend;
  const center=main&&friend?(main.x+friend.x)/2:main?.x??960;
  const sourceProps=scene.staging?.props??stage.props;
  const propAt=(at:number)=>{
    const source=sourceProps.find(p=>stage.props.some(current=>current.id===p.id) &&
      (!p.hidden || events.some(e=>e.kind==='show'&&e.propId===p.id&&e.from<=at)));
    return source?stage.props.find(p=>p.id===source.id):undefined;
  };
  const quiet=stage.shot==='quiet';
  const shared=quiet || stage.shot==='celebration' || !!scene.question;
  if (scene.question) return {zoom:1,origin:{x:clamp(center,520,1370),y:565}};
  const zoom=quiet?1.025:stage.shot==='prop'?1.18:stage.shot==='reaction'?1.20:stage.shot==='discovery'?1.20:stage.shot==='celebration'?1.035:1.14;
  const initial=propAt(0);
  let from={x:center,y:stage.shot==='prop'&&initial?clamp(initial.y,430,740):565},to={...from},start=0;
  const duration=Math.max(1,Math.round(fps*.7));
  const cues=[...slot.lines.map(line=>({from:line.from,speaker:line.line.speaker})),
    ...events.filter(e=>e.kind==='show').map(e=>({from:e.from,speaker:'narrator'}))].sort((a,b)=>a.from-b.from);
  for (const cue of cues) {
    if (cue.from>frame) break;
    const k=smooth((cue.from-start)/duration);
    from={x:mix(from.x,to.x,k),y:mix(from.y,to.y,k)};
    const role=actorRole(scene,cue.speaker),prop=propAt(cue.from);
    to={x:shared?center:stage.shot==='prop'&&prop?prop.x:role?stage.actors[role]?.x??center:center,
      y:stage.shot==='prop'&&prop?clamp(prop.y,430,740):565};
    start=cue.from;
  }
  const k=smooth((frame-start)/duration);
  return {zoom:1+(zoom-1)*smooth(frame/(fps*.9)),origin:{x:clamp(mix(from.x,to.x,k),520,1370),y:mix(from.y,to.y,k)}};
}

/** World-space eye targets keep a handover readable even when the actors swap sides. */
export function stageGaze(stage:StageSample,role:StageRole,speaking:boolean,question:boolean) {
  if (question) return {x:0,y:-2};
  const actor=stage.actors[role];
  if (!actor) return {x:0,y:0};
  if (actor.moving) return {x:actor.flip?-4:4,y:-1};
  const reach=stage.reaches[role];
  if (reach && reach.amount>.2) return {x:clamp((reach.target.x-actor.x)/35,-5,5),y:3*reach.amount};
  const other=stage.actors[role==='character'?'friend':'character'];
  return !speaking&&other ? {x:clamp((other.x-actor.x)/65,-5,5),y:0} : {x:0,y:0};
}

type Shot = 'wide' | 'shared' | 'actor' | 'prop' | 'reaction';
type CameraEvent = PropCue & {actor?: string; to?: string};
interface ShotCue {from: number; shot: Shot; actor?: StageRole; propId?: string}
interface Framing {zoom: number; origin: {x: number; y: number}}

const actorSide = (role: string | undefined): StageRole => role === 'friend' ? 'friend' : 'character';
const quietScene = (scene: Scene) => scene.staging?.shot === 'quiet' || ['tender','lullaby','thinking'].includes(scene.direction ?? '');

/** A small edit list tied to spoken lines and actual object contacts, never a cut timer. */
function shots(scene: Scene, slot: SceneSlot, fps: number, events: readonly CameraEvent[]): ShotCue[] {
  const cues: ShotCue[] = [{from: 0, shot: 'wide'}];
  for (const [index, line] of slot.lines.entries()) {
    const from = line.from + (index === 0 ? Math.round(fps * .45) : 0);
    const duringAction = events.some(event => from >= event.from - Math.round(fps * .3) && from <= event.until + Math.round(fps * 1.4));
    if (duringAction) continue;
    const actor = actorRole(scene, line.line.speaker);
    const feeling = line.line.emotion;
    const reaction = ['surprised','worried','sad','love','thinking'].includes(feeling ?? '');
    cues.push({from, shot: actor ? reaction ? 'reaction' : index === 0 ? 'shared' : 'actor' : 'shared', actor: actor ?? undefined});
  }
  for (const [index,event] of events.entries()) {
    const visible = scene.staging?.props.find(prop => prop.id === event.propId);
    const shownAt = events.find(cue => cue.propId === event.propId && cue.kind === 'show')?.from;
    const reveal = event.kind === 'show';
    const from = reveal ? event.from : Math.max(0, event.from - Math.round(fps * .3));
    if (!visible || visible.hidden && (shownAt === undefined || from < shownAt)) continue;
    cues.push({from, shot: 'prop', propId: event.propId});
    const next = events[index + 1];
    const nextFocus = next ? Math.max(0,next.from - Math.round(fps * (next.kind === 'show' ? 0 : .3))) : Infinity;
    const reactionFrom = event.until + Math.round(fps * .12), sharedFrom = event.until + Math.round(fps * 1.4);
    if (!reveal && reactionFrom < nextFocus) cues.push({from: reactionFrom, shot: 'reaction', actor: actorSide(event.kind === 'give' ? event.to : event.actor)});
    if (sharedFrom < nextFocus) cues.push({from: sharedFrom, shot: 'shared'});
  }
  if (slot.holdFrom > 0) cues.push({from: slot.holdFrom, shot: 'shared'});
  return cues.sort((a,b) => a.from - b.from).filter(cue => cue.from < slot.duration);
}

function shotFraming(cue: ShotCue, stage: StageSample): Framing {
  const main = stage.actors.character, friend = stage.actors.friend;
  const center = main && friend ? (main.x + friend.x) / 2 : main?.x ?? 960;
  if (cue.shot === 'prop') {
    const prop = stage.props.find(item => item.id === cue.propId && !item.hidden);
    if (prop) return {zoom: 1.48, origin: {x: prop.x, y: clamp(prop.y - 35, 510, 745)}};
  }
  if (cue.shot === 'actor' || cue.shot === 'reaction') {
    const actor = stage.actors[cue.actor ?? 'character'];
    if (actor) return {zoom: cue.shot === 'reaction' ? 1.62 : 1.35,
      origin: {x: actor.x, y: actor.y - (cue.actor === 'friend' ? 225 : 275)}};
  }
  return {zoom: cue.shot === 'wide' ? 1 : 1.08, origin: {x: center, y: 590}};
}

/** Replay interrupted edits, then follow the live subject; no playback history is needed. */
export function cinematicCamera(stage: StageSample, scene: Scene, slot: SceneSlot, frame: number, fps: number,
  events: readonly CameraEvent[] = [], stageAt: (at: number) => StageSample | null = () => stage) {
  const center = (stage.actors.character?.x ?? 960) / 2 + (stage.actors.friend?.x ?? stage.actors.character?.x ?? 960) / 2;
  if (scene.question || quietScene(scene)) {
    return {shot: 'shared' as Shot, zoom: scene.question ? 1 : 1.04, origin: {x: center, y: 590}, pan: {x: 0, y: 0}};
  }
  if (scene.staging && !scene.staging.auto) {
    const authored = stageCamera(stage,scene,slot,frame,fps,events);
    const shot: Shot = stage.shot === 'prop' && stage.props.some(prop => !prop.hidden) ? 'prop'
      : ['reaction','discovery'].includes(stage.shot) ? 'reaction' : 'shared';
    return {...authored,shot,pan: {x: 0,y: 0}};
  }
  const timeline = shots(scene,slot,fps,events);
  const duration = Math.max(1,Math.round(fps * .7));
  let source = shotFraming(timeline[0],stageAt(0) ?? stage), cue = timeline[0], start = 0;
  for (const next of timeline.slice(1)) {
    if (next.from > frame) break;
    const previousTarget = shotFraming(cue,stageAt(next.from) ?? stage);
    const k = smooth((next.from - start) / duration);
    source = {zoom: mix(source.zoom,previousTarget.zoom,k), origin: {
      x: mix(source.origin.x,previousTarget.origin.x,k), y: mix(source.origin.y,previousTarget.origin.y,k),
    }};
    cue = next; start = next.from;
  }
  const target = shotFraming(cue,stage), k = smooth((frame - start) / duration);
  const zoom = clamp(mix(source.zoom,target.zoom,k),1,1.7);
  const origin = {x: clamp(mix(source.origin.x,target.origin.x,k),280,1640), y: clamp(mix(source.origin.y,target.origin.y,k),440,760)};
  // Translate the subject toward the image center, bounded by the enlarged scenery edges.
  const pan = {x: clamp(960 - origin.x,(zoom - 1) * (origin.x - 1920),(zoom - 1) * origin.x),
    y: clamp(560 - origin.y,(zoom - 1) * (origin.y - 1080),(zoom - 1) * origin.y)};
  return {shot: cue.shot, zoom, origin, pan};
}

/** Eyes lead the paw; dialogue turns toward a friend and questions address the audience. */
export function cinematicGaze(stage: StageSample, scene: Scene, slot: SceneSlot, role: StageRole,
  frame: number, fps: number, events: readonly CameraEvent[] = [], stageAt: (at: number) => StageSample | null = () => stage) {
  const duration = Math.max(1,Math.round(fps * .3));
  if (scene.question) {
    const thinking = smooth((frame - slot.holdFrom) / duration) * (1 - smooth((frame - slot.revealFrom) / duration));
    return {gaze: {x: 0, y: -2 * thinking}, turn: 0};
  }
  const actor = stage.actors[role];
  if (!actor) return {gaze: {x: 0, y: 0}, turn: 0};
  const dialogue = (sample: StageSample, speaking: boolean) => {
    const current = sample.actors[role], other = sample.actors[role === 'character' ? 'friend' : 'character'];
    const delta = current && other ? other.x - current.x : 0;
    return {x: clamp(delta / 100,-4,4) * (speaking ? .5 : 1), y: 0,
      turn: clamp(delta / 90,-1,1) * (speaking ? .28 : .55)};
  };
  const cues = slot.lines.flatMap((line,index) => {
    const speechEnd = line.from + Math.min(line.duration,Math.round((line.line.durationSec ?? 2.2) * fps));
    return [{from: line.from, speaking: actorRole(scene,line.line.speaker) === role},
      ...(speechEnd < (slot.lines[index + 1]?.from ?? Infinity) ? [{from: speechEnd, speaking: false}] : [])];
  });
  let cue = {from: 0, speaking: cues[0]?.from === 0 ? cues[0].speaking : false};
  let source = dialogue(stageAt(0) ?? stage,cue.speaking);
  for (const next of cues) {
    if (next.from > frame) break;
    const target = dialogue(stageAt(next.from) ?? stage,cue.speaking), k = smooth((next.from - cue.from) / duration);
    source = {x: mix(source.x,target.x,k), y: 0, turn: mix(source.turn,target.turn,k)};
    cue = next;
  }
  const target = dialogue(stage,cue.speaking), k = smooth((frame - cue.from) / duration);
  let gaze = {x: mix(source.x,target.x,k), y: 0}, turn = mix(source.turn,target.turn,k);
  // Walking starts with a look along the route and settles back into conversation.
  let previous = scene.staging?.actors[role];
  for (const move of previous?.moves ?? []) {
    const line = slot.lines[move.line];
    const available = Math.max(1,Math.min(line?.duration ?? fps * 2,Math.round((line?.line.durationSec ?? 2) * fps)));
    const from = (line?.from ?? 0) + clamp(Math.round((move.delaySec ?? 0) * fps),0,Math.min(available - 1,Math.floor(available * .45)));
    const until = from + Math.max(1,Math.min(Math.round((move.durationSec ?? .8) * fps),available - (from - (line?.from ?? 0))));
    const amount = smooth((frame - from + duration) / duration) * (1 - smooth((frame - until) / duration));
    const sign = Math.sign(move.to.x - (previous?.x ?? actor.x));
    gaze = {x: mix(gaze.x,sign * 4,amount), y: mix(gaze.y,-1,amount)};
    turn = mix(turn,sign * .88,amount);
    previous = move.to;
  }
  for (const event of events) {
    if (actorSide(event.actor) !== role && !(event.kind === 'give' && actorSide(event.to) === role)) continue;
    const prepare = event.from - Math.round(fps * .4), release = event.until + Math.round(fps * .35);
    if (frame < prepare || frame > release) continue;
    const prop = stage.props.find(item => item.id === event.propId && !item.hidden);
    if (!prop) continue;
    const amount = smooth((frame - prepare) / Math.max(1,event.from - prepare)) * (1 - smooth((frame - event.until) / Math.max(1,release - event.until)));
    gaze = {x: mix(gaze.x,clamp((prop.x - actor.x) / 45,-5,5),amount), y: mix(gaze.y,3.8,amount)};
    turn = mix(turn,Math.sign(prop.x - actor.x) * .35,amount);
  }
  return {gaze,turn};
}

/** Quiet the surroundings at preparation/contact and let them recover after the reaction. */
export function storyFocus(scene: Scene, slot: SceneSlot, frame: number, fps: number, events: readonly CameraEvent[] = []) {
  if (scene.question || quietScene(scene)) return 1;
  let focus = 0;
  for (const event of events) {
    if (event.kind === 'show') continue;
    const lead = Math.max(1,Math.round(fps * .4)), tail = Math.max(1,Math.round(fps * .7));
    focus = Math.max(focus,smooth((frame - event.from + lead) / lead) * (1 - smooth((frame - event.until) / tail)));
  }
  for (const line of slot.lines) {
    if (!['surprised','worried','sad','love','thinking'].includes(line.line.emotion ?? '')) continue;
    const enter = Math.max(1,Math.round(fps * .25)), leave = Math.max(1,Math.round(fps * .4));
    const end = line.from + Math.min(line.duration,Math.round((line.line.durationSec ?? 2.2) * fps));
    focus = Math.max(focus,.7 * smooth((frame - line.from) / enter) * (1 - smooth((frame - end) / leave)));
  }
  return focus;
}
