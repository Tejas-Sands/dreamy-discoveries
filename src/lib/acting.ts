import type {Emotion, Line, Scene} from './types';
import type {SceneSlot} from './timing';
import {actorRole} from './sceneMotion';
import {mouthAt} from './speech';

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

/** Sample scene-relative frames; no render history, timers or audio recognition. */
export function actorPerformance(scene:Scene,slot:SceneSlot,actor:'character'|'friend',frame:number,fps:number):ActorPerformance {
  const rate=Math.max(1,fps),delay=Math.round(.16*rate),easeFrames=Math.max(1,Math.round(.34*rate));
  const initial=scene.emotion??'neutral';
  const cues:Array<{from:number;emotion:Emotion}>=[{from:-easeFrames,emotion:initial}];
  for(const line of slot.lines) {
    const owns=actorRole(scene,line.line.speaker)===actor;
    const feeling=line.line.emotion??scene.emotion??'neutral';
    cues.push({from:line.from+(owns?0:delay),emotion:owns?feeling:response(feeling)});
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
  let index=track.length-1;
  while(index>0&&track[index].from>frame)index--;
  const cue=track[index],previous=track[index-1];
  const active=slot.lines.filter(line=>frame>=line.from&&frame<line.from+(line.line.durationSec??2.2)*rate).at(-1);
  const speaking=!!active&&actorRole(scene,active.line.speaker)===actor;
  const thinking=!!scene.question&&frame>=slot.holdFrom&&frame<slot.praiseFrom;
  const emphasis=active&&!thinking?phraseAccent(active.line,(frame-active.from)/rate-(speaking?0:.16))*(speaking?1:.28):0;
  return {emotion:cue.emotion,fromEmotion:previous?.emotion??cue.emotion,blend:previous?smooth((frame-cue.from)/Math.min(easeFrames,Math.max(1,(track[index+1]?.from??Infinity)-cue.from))):1,emphasis,listening:!speaking};
}
