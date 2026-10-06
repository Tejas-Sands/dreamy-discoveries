import React,{useMemo} from 'react';
import {AbsoluteFill,useCurrentFrame,type CalculateMetadataFunction} from 'remotion';
import {KidsVideo,calculateKidsVideoMetadata,type KidsVideoProps} from './KidsVideo';
import {computeSchedule,FPS} from './lib/timing';
import type {KidsScript,StageProp} from './lib/types';
import {prepareStage,sampleStage} from '../scripts/lib/staging.mjs';

export type AnimationComparisonProps = KidsVideoProps & {includeEndcards?: boolean};
const physical=new Set(['push','roll','catch','open','water','build']);

/** Keep recorded speech and every frame slot identical; only new presentation is removed. */
export function comparisonBefore(script:KidsScript):KidsScript {
  const before=structuredClone(script);
  before.presentationVersion=2;
  for(const scene of before.scenes)if(scene.staging){
    scene.staging.events=scene.staging.events.filter(event=>!physical.has(event.kind));
    for(const prop of scene.staging.props){
      delete prop.rotation;delete prop.openProgress;delete prop.buildProgress;delete prop.waterAmount;delete prop.watering;
    }
  }
  return before;
}

/** This is actual sampled script state, suitable for a review readout, not analytics. */
export function animationComparisonState(script:KidsScript,frame:number){
  const schedule=computeSchedule(script);
  const index=schedule.scenes.findIndex(slot=>frame>=slot.from&&frame<slot.from+slot.duration);
  if(index<0)return {scene:null,background:'',events:[] as string[],props:[] as StageProp[]};
  const scene=script.scenes[index],slot=schedule.scenes[index],local=frame-slot.from;
  const prepared=prepareStage(scene,slot,FPS),sample=sampleStage(prepared,local);
  return {scene:index+1,background:scene.background,events:prepared?.events.filter(event=>local>=event.from&&local<event.until).map(event=>event.kind)??[],props:sample?.props.filter(prop=>!prop.hidden)??[]};
}

export const calculateAnimationComparisonMetadata:CalculateMetadataFunction<AnimationComparisonProps>=async context=>{
  const result=await calculateKidsVideoMetadata(context);
  const script=result.props?.script;
  if(!script)throw new Error('Animation comparison requires a loaded episode script');
  return {...result,props:{...context.props,...result.props},durationInFrames:context.props.includeEndcards?result.durationInFrames:computeSchedule(script).endFrom};
};

const propDescription=(prop:StageProp)=>{
  const details=[prop.owner?`held by ${prop.owner}`:'grounded'];
  if(prop.openProgress!==undefined)details.push(`book ${Math.round(prop.openProgress*100)}% open`);
  if(prop.buildProgress!==undefined)details.push(`built ${Math.round(prop.buildProgress*100)}%`);
  if(prop.waterAmount!==undefined)details.push(`watered ${Math.round(prop.waterAmount*100)}%`);
  if(prop.rotation!==undefined)details.push(`rotation ${Math.round(prop.rotation)}°`);
  return `${prop.label??prop.kind}: ${details.join(', ')}`;
};

export const AnimationComparison:React.FC<AnimationComparisonProps>=({slug,script,baked})=>{
  const frame=useCurrentFrame();
  const before=useMemo(()=>script?comparisonBefore(script):null,[script]);
  const state=script?animationComparisonState(script,frame):null;
  return <AbsoluteFill style={{background:'#eee7ee',color:'#554661',fontFamily:'sans-serif'}}>
    <div style={{position:'absolute',top:38,left:56,fontSize:34,fontWeight:700}}>Dreamy Discoveries · Expressive animation</div>
    <div style={{position:'absolute',top:98,left:56,fontSize:22}}>Same story, recorded voices and frame · Audio from After</div>
    {([{label:'Before',subtitle:'Presentation 2',script:before,muted:true},{label:'After',subtitle:'Presentation 3',script,muted:false}] as const).map((panel,index)=><React.Fragment key={panel.label}>
      <div style={{position:'absolute',left:index*960+28,top:166,fontSize:30,fontWeight:700}}>{panel.label}<span style={{marginLeft:18,fontSize:19,fontWeight:400}}>{panel.subtitle}</span></div>
      <div style={{position:'absolute',left:index*960,top:226,width:960,height:540,overflow:'hidden',borderTop:'2px solid #cabbd0',borderBottom:'2px solid #cabbd0'}}>
        <div style={{position:'absolute',width:1920,height:1080,transform:'scale(0.5)',transformOrigin:'top left'}}><KidsVideo slug={slug} script={panel.script} baked={baked} muted={panel.muted}/></div>
      </div>
    </React.Fragment>)}
    <div style={{position:'absolute',top:810,left:56,right:56,lineHeight:1.55,fontSize:24}}>
      <div style={{fontWeight:700}}>Script state · {state?.scene?`Scene ${state.scene} · ${state.background}`:'Episode cards'} · Frame {frame}</div>
      <div>{state?.events.length?`Action: ${state.events.join(' + ')}`:'Action: resting / dialogue'}</div>
      <div>{state?.props.length?state.props.map(propDescription).join(' · '):'No visible stage objects'}</div>
    </div>
  </AbsoluteFill>;
};
