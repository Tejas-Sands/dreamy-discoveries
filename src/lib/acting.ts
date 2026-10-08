import type {Emotion, Line, Scene} from './types';
import type {SceneSlot} from './timing';
import {actorRole} from './sceneMotion';
import {mouthAt} from './speech';
import {speciesKind} from '../components/characters/performanceProfiles';

export interface ActorPerformance {
  emotion: Emotion;
  fromEmotion: Emotion;
  /** Eased progress through the current emotional change. */
  blend: number;
  /** A short phrase accent, never a continuous talking oscillation. */
  emphasis: number;
  listening: boolean;
}

const clamp = (n:number) => Math.max(0,Math.min(1,n));
const smooth = (n:number) => {const k=clamp(n);return k*k*(3-2*k);};
const response = (emotion:Emotion):Emotion => emotion==='sad'?'worried':emotion==='excited'?'happy':emotion;
const REACTIONS:Record<string,{delay:number;accent:number}>={
  bunny:{delay:.16,accent:.28},bear:{delay:.24,accent:.2},duck:{delay:.12,accent:.3},
  fox:{delay:.2,accent:.24},turtle:{delay:.32,accent:.16},owl:{delay:.28,accent:.22},
};

function listenerFeeling(line:Line,feeling:Emotion,kind:string):Emotion {
  if(/\bthank(?:s| you)\b/i.test(line.text))return ['bunny','duck','turtle'].includes(kind)?'love':'happy';
  if(/\b(it(?:'s| is) okay|we can|i can help|i will help|let me help|do not worry|don't worry)\b/i.test(line.text))return 'happy';
  if(['sad','worried','scared'].includes(feeling))return 'worried';
  return response(feeling);
}

/** Small, spelling/phrase based accents, gated by actual speech amplitude when available. */
function phraseAccent(line:Line,t:number):number {
  const duration=line.durationSec??2.2;
  if(t<0||t>=duration)return 0;
  let accent=0;
  for(const [i,word] of (line.words??[]).entries()) {
    const strong=i===0||/[!?]/.test(word.text)||/^(look|wow|help|yes|no|please|thank|sorry|beautiful|brave|share|kind)\b/i.test(word.text);
    if(!strong)continue;
    const k=(t-word.start)/Math.min(.32,Math.max(.16,word.end-word.start));
    if(k>=0&&k<=1)accent=Math.max(accent,Math.sin(Math.PI*k)*(i===0?.7:1));
  }
  // Old recordings without word times still receive one finite phrase accent.
  if(!line.words?.length&&t<.32)accent=Math.sin(Math.PI*t/.32)*.7;
  return accent*smooth((duration-t)/.08)*(line.envelope?clamp(mouthAt(line,t)*2):1);
}

/** Prepare immutable cues once per scene/actor, independently of the sampled frame. */
export function preparePerformance(scene:Scene,slot:SceneSlot,actor:'character'|'friend',fps:number,presentationVersion=3) {
  const kind=speciesKind(actor==='character'?scene.character:scene.secondCharacter??'');
  const modern=presentationVersion>=4,profile=REACTIONS[kind]??{delay:.16,accent:.28};
  const delaySec=modern?profile.delay:.16;
  const quiet=['tender','lullaby','thinking'].includes(scene.direction??'');
  const accent=modern?profile.accent*(quiet?.5:1):.28;
  const rate=Math.max(1,fps),delay=Math.round(delaySec*rate),easeFrames=Math.max(1,Math.round(.34*rate));
  const initial=scene.emotion??'neutral';
  const cues:Array<{from:number;emotion:Emotion}>=[{from:-easeFrames,emotion:initial}];
  for(const [index,line] of slot.lines.entries()) {
    const owns=actorRole(scene,line.line.speaker)===actor;
    const feeling=line.line.emotion??scene.emotion??'neutral';
    const lag=modern?Math.min(delay,Math.max(0,(slot.lines[index+1]?.from??Infinity)-line.from-1)):delay;
    cues.push({from:line.from+(owns?0:lag),emotion:owns?feeling:modern?listenerFeeling(line.line,feeling,kind):response(feeling)});
  }
  if(scene.question) {
    cues.push({from:slot.holdFrom,emotion:'thinking'}, {from:slot.revealFrom,emotion:'surprised'}, {from:slot.revealFrom+Math.round(.45*rate),emotion:'excited'});
  }
  cues.sort((a,b)=>a.from-b.from);
  const track:typeof cues=[];
  for(const cue of cues) {
    if(track.at(-1)?.from===cue.from)track.pop();
    if(track.at(-1)?.emotion!==cue.emotion)track.push(cue);
  }
  return {scene,slot,actor,rate,easeFrames,track,delaySec,accent};
}

/** Sample scene-relative frames; no render history, timers or audio recognition. */
export function samplePerformance({scene,slot,actor,rate,easeFrames,track,delaySec,accent}:ReturnType<typeof preparePerformance>,frame:number):ActorPerformance {
  let index=track.length-1;
  while(index>0&&track[index].from>frame)index--;
  const cue=track[index],previous=track[index-1];
  const active=slot.lines.filter(line=>frame>=line.from&&frame<line.from+(line.line.durationSec??2.2)*rate).at(-1);
  const speaking=!!active&&actorRole(scene,active.line.speaker)===actor;
  const thinking=!!scene.question&&frame>=slot.holdFrom&&frame<slot.praiseFrom;
  const emphasis=active&&!thinking?phraseAccent(active.line,(frame-active.from)/rate-(speaking?0:delaySec))*(speaking?1:accent):0;
  return {emotion:cue.emotion,fromEmotion:previous?.emotion??cue.emotion,blend:previous?smooth((frame-cue.from)/Math.min(easeFrames,Math.max(1,(track[index+1]?.from??Infinity)-cue.from))):1,emphasis,listening:!speaking};
}

export function actorPerformance(scene:Scene,slot:SceneSlot,actor:'character'|'friend',frame:number,fps:number,presentationVersion=3):ActorPerformance {
  return samplePerformance(preparePerformance(scene,slot,actor,fps,presentationVersion),frame);
}
