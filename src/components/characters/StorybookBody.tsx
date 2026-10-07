import React, {useId} from 'react';
import type {CharacterRecipe} from './recipe';
import type {Pose} from './pose';
import type {ActorPerformance} from '../../lib/acting';
import type {MouthShape} from '../../lib/speech';
import type {Action, Emotion} from '../../lib/types';
import {StorybookFace} from './StorybookFace';
import {handGesture} from './handGesture';
import {StorybookDetails, STORYBOOK_HEADS} from './StorybookDetails';
import {FEATHERED_KINDS} from './performanceProfiles';
import {UPRIGHT_LAYOUTS} from './chartLayout';
import {softMix as mix} from './StorybookPaint';
export {STORYBOOK_KINDS} from './performanceProfiles';

export interface StorybookBodyProps {
  recipe:CharacterRecipe; pose:Pose; emotion:Emotion; mouth:number; blink:number; showFace:boolean;
  action?:Action; previousAction?:Action; actionBlend?:number;
  armExtension?:Partial<Record<'L'|'R',number>>; handGrip?:Partial<Record<'L'|'R',number>>;
  performance?:ActorPerformance; mouthShape?:MouthShape; turn?:number; crouch?:number;
}

/** The supplied limb chart determines geometry. The existing pose engine only
 * animates it. A paw/wing is one connected silhouette, without a separate wrist. */
export const StorybookBody:React.FC<StorybookBodyProps>=({recipe:r,pose:p,emotion,mouth,blink,showFace,
  action='idle',previousAction,actionBlend=1,armExtension,handGrip,performance,mouthShape,turn=0,crouch=0})=>{
  const uid=`chart-${useId().replace(/:/g,'')}`,k=r.name,c=r.colors,L=UPRIGHT_LAYOUTS[k];
  const fill=(name:string)=>`url(#${uid}-${name})`;
  const outline=mix(c.body,'#685568',.65);
  const yaw=Math.max(-1,Math.min(1,turn)),a=Math.abs(yaw),bodyYaw=p.torsoTurn??0;
  const projection=1-Math.abs(bodyYaw)*.22;
  const tilt=`rotate(${p.torsoTilt??0} 250 510)`;
  const bodyTurn=`translate(${bodyYaw*20} 0) translate(250 0) scale(${projection} 1) translate(-250 0)`;
  const headMotion=`translate(${p.head.dx*2.5} ${(p.head.dy-mouth*.5)*2.5}) rotate(${p.head.tilt} 250 320) translate(250 340) scale(${L.headScale} ${L.headScale/(1-crouch)}) translate(-250 -340)`;
  const headTurn=`translate(${yaw*12} 0) translate(250 0) scale(${1-a*.17} 1) translate(-250 0)`;
  const faceTurn=`translate(${yaw*42} 0) translate(250 0) scale(${1-a*.18} 1) translate(-250 0)`;
  const feathered=FEATHERED_KINDS.has(k),bird=feathered||k==='penguin';
  const hoof=r.foot==='hoof';
  const pawTip=['fox','raccoon'].includes(k)?'paws':['mouse','koala'].includes(k)?'inner':k==='monkey'?'belly':null;
  const frontPaws=k==='hedgehog';
  const headWidth=({duck:142,owl:148,chick:132,penguin:122,bird:113} as Record<string,number>)[k]??125;
  const bodyPath=k==='sheep'?'M163 340Q172 314 195 329Q216 305 237 324Q258 310 278 326Q302 310 318 338Q345 323 354 352Q382 356 369 384Q389 407 367 427Q387 450 365 470Q371 499 343 503Q332 533 306 521Q285 548 258 529Q233 548 209 529Q179 545 167 517Q137 520 135 492Q111 478 128 451Q109 429 128 409Q109 386 132 368Q137 340 163 340Z':L.unibody
    ? k==='hedgehog'?'M250 210C205 166 151 199 145 268C118 342 121 408 143 478Q158 544 250 544Q342 544 357 478C379 408 382 342 355 268C349 199 295 166 250 210Z'
    : k==='bird'||k==='penguin'?`M250 ${L.bodyTop}C${250+headWidth} ${L.bodyTop} ${250+L.bodyWidth*1.07} 286 ${250+L.bodyWidth} 397Q${250+L.bodyWidth*1.1} 544 250 544Q${250-L.bodyWidth*1.1} 544 ${250-L.bodyWidth} 397C${250-L.bodyWidth*1.07} 286 ${250-headWidth} ${L.bodyTop} 250 ${L.bodyTop}Z`
    : `M250 ${L.bodyTop}C${250+headWidth*.72} ${L.bodyTop} ${250+headWidth} 182 ${250+headWidth} 247Q${250+headWidth*1.12} 310 ${250+headWidth*.7} 338C${250+L.bodyWidth*1.13} 378 ${250+L.bodyWidth*1.1} 488 ${250+L.bodyWidth*.65} 525Q250 560 ${250-L.bodyWidth*.65} 525C${250-L.bodyWidth*1.1} 488 ${250-L.bodyWidth*1.13} 378 ${250-headWidth*.7} 338Q${250-headWidth*1.12} 310 ${250-headWidth} 247C${250-headWidth} 182 ${250-headWidth*.72} ${L.bodyTop} 250 ${L.bodyTop}Z`
    : `M250 ${L.bodyTop}C${250+L.bodyWidth*.74} ${L.bodyTop} ${250+L.bodyWidth} 365 ${250+L.bodyWidth} 433C${250+L.bodyWidth} 514 ${250+L.bodyWidth*.63} 541 250 544C${250-L.bodyWidth*.63} 541 ${250-L.bodyWidth} 514 ${250-L.bodyWidth} 433C${250-L.bodyWidth} 365 ${250-L.bodyWidth*.74} ${L.bodyTop} 250 ${L.bodyTop}Z`;
  const headPath=STORYBOOK_HEADS[k];
  const gradient=(name:string,color:string)=> <radialGradient id={`${uid}-${name}`} cx=".35" cy=".25" r=".85"><stop stopColor={mix(color,'#fff9ee',.3)}/><stop offset=".7" stopColor={color}/><stop offset="1" stopColor={mix(color,'#745965',.12)}/></radialGradient>;
  const details=(layer:React.ComponentProps<typeof StorybookDetails>['layer'])=><StorybookDetails recipe={r} pose={p} layer={layer} fill={fill} turn={yaw}/>;
  const arm=(right:boolean)=>{
    const side=right?'R':'L',s=right?-1:1;
    const x=250+(right?L.shoulder:-L.shoulder)*projection+bodyYaw*20;
    const y=L.shoulderY+(right?-1:1)*bodyYaw*10;
    const acorn=k==='squirrel'&&!right&&!handGrip?.L&&['idle','wave','nod','think'].includes(action);
    const angle=acorn?-48:right?-p.armR:p.armL;
    const grip=handGrip?.[side]??0;
    const gesture=handGesture(action,side),previous=previousAction?handGesture(previousAction,side):gesture;
    const spread=((previous==='open'?1-actionBlend:0)+(gesture==='open'?actionBlend:0))*(1-grip);
    const inward=Math.min(1,Math.max(0,-(right?p.armR:p.armL)/90));
    const stretch=armExtension?.[side]??(bird?1:1+inward*(k==='bear'?.4:.16));
    const len=L.armLength*stretch,w=L.armWidth;
    const color=hoof?fill('body'):k==='panda'?fill('accent'):fill('body');
    return <g data-storybook-hand={side} data-hand-anatomy={hoof?'hoof':bird?'wing':'paw'} transform={`translate(${x} ${y}) rotate(${angle}) scale(${s} 1)`}>
      {feathered ? <>
        <path d={`M-${w*.6} -10C-${w*1.7} 0 -${w*1.65} ${len*.55} -${w} ${len-5}Q-${w*.7} ${len+17} -${w*.2} ${len+6}Q${w*.23} ${len+23+spread*9} ${w*.58} ${len+7}Q${w*1.4} ${len+15} ${w*1.35} ${len-5}C${w*1.2} ${len*.5} ${w*1.3} 1 ${w*.45} -10Q0 -17 -${w*.6} -10Z`} fill={fill('body')}/>
        <path d={`M-${w*.65} ${len*.52}Q-${w*.5} ${len*.8} -${w*.2} ${len+6}M${w*.3} ${len*.56}Q${w*.4} ${len*.83} ${w*.58} ${len+7}`} fill="none" strokeWidth="2.5" opacity=".4"/>
      </> : k==='penguin'?<path d={`M-14 -9C-36 0 -40 ${len*.48} -19 ${len+12}Q-4 ${len+31} 9 ${len+5}C29 ${len*.64} 28 15 15 -6Q0 -16 -14 -9Z`} fill={fill('body')}/> : <>
        <path d={`M-${w*.72} -9C-${w*1.35} 0 -${w*1.5} ${len*.51} -${w*.94} ${len-4}Q-${w*1.2} ${len+15} -${w*.48} ${len+17}Q-${w*.1} ${len+23+spread*3} ${w*.25} ${len+17}Q${w*.96} ${len+22} ${w} ${len+8}Q${w*1.45} ${len+2} ${w*.86} ${len-12}C${w*.66} ${len*.54} ${w*1.16} 1 ${w*.6} -8Q0 -17 -${w*.72} -9Z`} fill={color}/>
        {pawTip?<path d={`M-${w*.98} ${len-2}Q0 ${len-8} ${w*.98} ${len-2}Q${w*1.36} ${len+9} ${w*.25} ${len+17}Q-${w*.1} ${len+23} -${w*.48} ${len+17}Q-${w*1.2} ${len+15} -${w*.98} ${len-2}Z`} fill={fill(pawTip)} stroke="none"/>:null}
        {hoof?<><path d={`M-${w*.98} ${len-7}Q0 ${len-2} ${w*.99} ${len-7}L${w} ${len+8}Q${w*.96} ${len+22} ${w*.25} ${len+17}Q-${w*.1} ${len+23} -${w*.48} ${len+17}Q-${w*1.2} ${len+15} -${w*.98} ${len-7}Z`} fill={fill('hooves')}/><path d={`M0 ${len+5}v13`} strokeWidth="2.3"/></>:
          <path d={`M-${w*.42} ${len+6}l1 7M${w*.12} ${len+7}v8`} fill="none" strokeWidth="2" opacity=".45"/>}
        {spread>.1&&!hoof?<ellipse cx="0" cy={len+1} rx={w*.4} ry={w*.3} fill={fill('inner')} stroke="none" opacity={spread*.7}/>:null}
        {['zebra','cat','tiger'].includes(k)?<path d={`M-${w} ${len*.25}l${w*1.65} 10l-${w*1.7} 2M${w} ${len*.57}l-${w*1.65} 11l${w*1.6} 2`} fill={fill('accent')} stroke="none"/>:null}
        {acorn?<g transform={`translate(8 ${len+2}) rotate(48)`}><path d="M-19 -7Q-23 13 0 28Q23 13 19 -7Z" fill="#a16c40"/><path d="M-22 -7Q-18 -27 0 -23Q18 -27 22 -7Q0 2 -22 -7Z" fill="#855638"/><path d="M0 -23q-5 -8 3 -12" fill="none" strokeWidth="4"/></g>:null}
      </>}
    </g>;
  };
  const foot=(right:boolean)=>{
    const s=right?1:-1,w=L.footWidth;
    return <g data-storybook-foot={right?'R':'L'} transform={`translate(${250+s*L.footGap+(right?p.legXR:p.legXL)*2.5} ${517+(right?p.legR:p.legL)*2.5}) rotate(${right?p.legSwR:p.legSwL})`}>
      {k==='owl'?<path d="M-9 -2L-10 17L-28 27Q-35 38 -23 37L-8 30L-9 43Q0 52 7 42L8 30L23 37Q35 37 28 27L10 17L9 -2Z" fill={fill('bill')}/>:bird?<><path d={`M-10 -1L-11 20Q-${w+10} 22 -${w} 34L-8 35Q0 43 8 35L${w} 34Q${w+10} 22 11 20L10 -1Z`} fill={fill('bill')}/><path d="M-7 24l-7 8M7 24l7 8" fill="none" strokeWidth="2" opacity=".4"/></>:
      <><path d={`M-${w*.72} -9Q-${w+3} 5 -${w} 25Q-${w+7} 41 -5 42L${w*.7} 41Q${w+9} 34 ${w} 19L${w*.72} -9Z`} fill={fill(hoof?'body':k==='panda'?'accent':'body')}/>
        {hoof?<><path d={`M-${w} 22L${w} 22L${w} 35Q${w*.8} 44 0 40Q-${w*.85} 44 -${w} 35Z`} fill={fill('hooves')}/><path d="M0 30v10" strokeWidth="2.5"/></>:
        <path d={`M-11 32v6M0 34v6M11 32v6`} fill="none" strokeWidth="2" opacity=".5"/>}
        {pawTip?<path d={`M-${w} 27Q0 20 ${w} 27L${w} 34Q${w*.8} 44 0 40Q-${w*.85} 44 -${w} 34Z`} fill={fill(pawTip)} stroke="none"/>:null}
        {['elephant','hippo','lion','tiger'].includes(k)?[-12,0,12].map(x=><ellipse key={x} cx={x} cy="36" rx="4" ry="5" fill={fill('belly')} stroke="none"/>):null}
      </>}
    </g>;
  };
  return <g data-chart-layout={k} transform="translate(0 26) scale(.4)" stroke={outline} strokeWidth="3.3" strokeLinecap="round" strokeLinejoin="round">
    <defs>
      {gradient('body',c.body)}{gradient('belly',c.belly)}{gradient('inner',c.inner??'#e9b2bd')}
      {gradient('accent',c.accent??c.body)}{gradient('paws',c.limb)}{gradient('wing',c.body)}
      {gradient('hooves',k==='zebra'?c.limb:mix(c.limb,'#544557',.82))}
      {gradient('bill',k==='owl'?'#e3ad59':'#eda451')}
      <clipPath id={`${uid}-torso`}><path d={bodyPath}/></clipPath>
      {k==='penguin'?<clipPath id={`${uid}-projected-torso`}><path d={bodyPath} transform={bodyTurn}/></clipPath>:null}
      <clipPath id={`${uid}-head`}><path d={headPath??bodyPath}/></clipPath>
      {k==='raccoon'?<clipPath id={`${uid}-turned-head`}><path d={headPath} transform={headTurn}/></clipPath>:null}
    </defs>
    <g transform={tilt}>{details('back')}</g>
    {foot(false)}{foot(true)}
    <g data-storybook-torso={k} transform={tilt}>
      {!frontPaws&&k!=='squirrel'&&p.armL>=0&&p.armL<=32?arm(false):null}{!frontPaws&&p.armR>=0&&p.armR<=32?arm(true):null}
      <g transform={bodyTurn}>
        <path d={bodyPath} fill={fill('body')}/>
        <g clipPath={fill('torso')}>
          {showFace?<ellipse cx="250" cy={L.unibody?421:445} rx={L.bellyWidth} ry={L.unibody?104:82} fill={fill('belly')} stroke="none"/>:null}
          {details('body')}
        </g>
        {showFace?details('clothes'):null}
      </g>
      <g clipPath={k==='penguin'?fill('projected-torso'):undefined}><g transform={headMotion}>
        <g transform={headTurn}>{details('ears')}{!L.unibody?<path data-storybook-head={k} d={headPath} fill={fill('body')}/>:null}</g>
        {showFace?<>
          <g clipPath={k==='penguin'?fill('torso'):k==='raccoon'?fill('turned-head'):undefined}><g transform={faceTurn}>{details('face')}</g></g>
          <StorybookFace kind={k} emotion={emotion} mouth={mouth} blink={blink} eyes={p.eyes} uid={uid} outline={outline} performance={performance} mouthShape={mouthShape} turn={yaw}
            layout={{turnShift:42,turnCompression:.18,eyeSize:k==='elephant'?.9:k==='owl'?1.05:.92,...(k==='elephant'?{mouthDx:-48,mouthY:316}:k==='zebra'?{mouthY:330}:{} )}}/>
          <g clipPath={k==='cat'||k==='tiger'||k==='zebra'?fill('head'):undefined}><g transform={faceTurn}>{details('features')}</g></g>
        </>:null}
      </g></g>
      {/* Raised paws stay above the torso, with no circular shoulder/wrist seam. */}
      {frontPaws||k==='squirrel'||p.armL>32||p.armL<0?arm(false):null}{frontPaws||p.armR>32||p.armR<0?arm(true):null}
    </g>
  </g>;
};
