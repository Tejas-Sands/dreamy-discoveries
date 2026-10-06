import React, {useId} from 'react';
import type {StageProp} from '../lib/types';
import {propMotion, type PropCue} from '../lib/propMotion';

/** Small reusable vector objects; no downloaded or generated artwork is needed. */
const unit=(value:number)=>Math.max(0,Math.min(1,Number.isFinite(value)?value:0));
export const PropArt:React.FC<{kind:string;label?:string;openProgress?:number;buildProgress?:number;waterAmount?:number}>=({kind,label,openProgress=1,buildProgress=1,waterAmount=0})=>{
  const open=unit(openProgress),build=unit(buildProgress);
  const portion=(index:number)=>unit(build*3-index);
  const id=`prop-${useId().replace(/:/g,'')}`;
  const outline={stroke:'#765472',strokeWidth:3,strokeLinejoin:'round' as const};
  return <g {...outline}>
    <defs><linearGradient id={id} x2='.8' y2='1'><stop stopColor='#fff4c5'/><stop offset='1' stopColor='#eaa56a'/></linearGradient></defs>
    {kind==='strawberry'?<><path d='M-34 -25Q-55 -9 -27 27Q0 59 27 27Q55 -9 34 -25Q0 -41 -34 -25Z' fill='#ee7588'/><path d='M-31 -24L-24 -43L-7 -33L0 -50L10 -32L28 -41L32 -22L9 -16L0 -25L-10 -15Z' fill='#94bd85'/>{[[-20,-10],[6,-9],[23,5],[-11,11],[2,28]].map(([x,y],i)=><ellipse key={i} cx={x} cy={y} rx='2.5' ry='4' fill='#ffe3a4' stroke='none'/>)}<path d='M-27 -13Q-33 -1 -23 10' fill='none' stroke='#ffd6ce' strokeWidth='5'/></>:
    kind==='umbrella'?<><path d='M-49 1Q-37 -57 0 -46Q38 -57 49 1Q32 -13 16 1Q0 -13 -16 1Q-32 -13 -49 1Z' fill='#e9b2ce'/><path d='M-16 1Q-13 -37 0 -46Q13 -37 16 1Q0 -13 -16 1Z' fill='#a8d4d0'/><path d='M0 1V37Q0 56 19 44' fill='none' stroke='#96775f' strokeWidth='5'/></>:
    kind==='parcel'?<><rect x='-43' y='-34' width='86' height='75' rx='8' fill={`url(#${id})`}/><path d='M-43 -10H43M-9 -34V41H9V-34' fill='#bb9acb'/><path d='M0 -34Q-42 -68 -29 -29Q-14 -24 0 -34Q42 -68 29 -29Q14 -24 0 -34Z' fill='#d5b9de'/><rect x='13' y='7' width='20' height='19' rx='3' fill='#fff5da' stroke='none'/></>:
    kind==='glasses'?<><rect x='-48' y='-17' width='40' height='34' rx='13' fill='#d8e7ecaa' stroke='#7d658b' strokeWidth='6'/><rect x='8' y='-17' width='40' height='34' rx='13' fill='#d8e7ecaa' stroke='#7d658b' strokeWidth='6'/><path d='M-8 -3Q0 -13 8 -3M-49 -9L-56 -23M49 -9L56 -23' fill='none' stroke='#7d658b' strokeWidth='5'/><path d='M-36 -7L-23 6M20 -7L33 6' stroke='#fff8ed' strokeWidth='4'/></>:
    kind==='crown'?<><path d='M-45 -31L-21 -6L0 -39L21 -6L45 -31L35 33H-35Z' fill='#f1cf87'/><path d='M-36 18H36' stroke='#ca9f74' strokeWidth='6'/>{[-24,0,24].map(x=><circle key={x} cx={x} cy={x===0?-3:5} r='6' fill='#bb9bcc'/>)}</>:
    kind==='cloud'?<><path d='M-38 24C-68 13 -53 -21 -30 -16C-33 -55 19 -60 28 -25C62 -35 68 17 42 24Z' fill='#fbf6f3'/><path d='M-34 21H35' stroke='#d4c4e3' strokeWidth='5' opacity='.6'/></>:
    kind==='apple'?<><path d='M0 -26C-36 -49 -56 -7 -35 29Q-14 51 0 36Q16 50 36 27C57 -8 34 -47 0 -26Z' fill='#ed6c71'/><path d='M0 -24Q-4 -38 3 -48' fill='none' stroke='#88623f' strokeWidth='6'/><path d='M5 -35Q12 -59 34 -44Q27 -25 5 -35Z' fill='#86b97e'/><path d='M-27 -15Q-34 -1 -25 12' fill='none' stroke='#ffd4be' strokeWidth='7' strokeLinecap='round'/></>:
    kind==='ball'?<><circle r='41' fill='#97cbd2'/><path d='M-27 -30Q0 -8 28 -30M-38 10Q0 -8 38 10M-7 -39Q0 -8 -10 39M0 -8L30 28' fill='none' stroke='#fff6dc' strokeWidth='7'/></>:
    kind==='basket'?<><path d='M-28 -10V-28Q0 -67 28 -28V-10' fill='none' stroke='#ae8063' strokeWidth='9'/><path d='M-48 -11H48L35 39Q0 50 -35 39Z' fill={`url(#${id})`}/><path d='M-39 2H39M-36 15H36M-33 28H33M-20 -10L-15 39M0 -10V43M20 -10L15 39' fill='none' stroke='#c99166'/></>:
    kind==='book'?<><g transform={`scale(${.15+.85*open} 1)`}><path d='M-45 -30Q-23 -40 0 -25Q23 -40 45 -30V34Q23 23 0 38Q-23 23 -45 34Z' fill='#fff3dd'/><path d='M0 -25V38M-34 -18L-10 -12M-34 -4L-10 2M10 -12L34 -18M10 2L34 -4' fill='none' stroke='#99b6c5' strokeWidth='4'/></g>{open<1?<g opacity={1-open}><rect x='-22' y='-35' width='44' height='74' rx='5' fill='#9abfcf'/><path d='M-15 -34V37M-8 -21H13M-8 -9H13' fill='none' stroke='#fff3dd' strokeWidth='4'/></g>:null}</>:
    kind==='flower'?<><path d='M0 0V45M0 30Q-30 31 -25 13Q-7 13 0 30' stroke='#74a77c' fill='#95c48d' strokeWidth='5'/>{[0,60,120,180,240,300].map(a=><ellipse key={a} cy='-23' rx='14' ry='23' fill='#e7abc5' transform={`rotate(${a})`}/>)}<circle r='15' fill='#f6d98c'/></>:
    kind==='kite'?<><path d='M0 -45L34 0L0 37L-34 0Z' fill='#e8b2cf'/><path d='M0 -45V37M-34 0H34M0 37Q33 56 10 72' fill='none' stroke='#fff0d5'/><path d='M13 57L1 48L3 67Z' fill='#98c4c8'/></>:
    kind==='seed'?<><ellipse cy='18' rx='28' ry='20' fill='#b88c64'/><path d='M0 17V-18M0 -9Q-33 -36 -32 -8Q-14 2 0 -9M0 -18Q30 -46 32 -20Q13 -5 0 -18' stroke='#71a077' fill='#9dc18a' strokeWidth='4'/></>:
    kind==='cookie'?<><circle r='40' fill={`url(#${id})`}/>{[[-17,-18],[16,-14],[0,10],[-22,21],[24,17]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r='6' fill='#92664f' stroke='none'/>)}</>:
    kind==='star'?<path d='M0 -43L13 -14L44 -10L22 12L27 44L0 29L-27 44L-22 12L-44 -10L-13 -14Z' fill='#f2d485'/>:
    kind==='boat'?<><path d='M-48 13H48L27 38H-27Z' fill='#99c5ca'/><path d='M0 -46V13M0 -45L-38 6H0ZM5 -31L37 6H5Z' fill='#fff1da'/><path d='M-38 16L-25 26H25L38 16' fill='none' stroke='#d6e8df'/></>:
    kind==='castle'&&build<1?<>
      <g opacity={portion(0)} transform={`translate(0 ${12*(1-portion(0))})`}><path d='M-43 38V13H43V38Z' fill={`url(#${id})`}/><path d='M-36 17H-16M16 17H36' stroke='#e3c18e'/></g>
      <g opacity={portion(1)} transform={`translate(0 ${18*(1-portion(1))})`}><path d='M-43 15V-6H43V15M-10 38V16Q0 1 10 16V38' fill={`url(#${id})`}/><path d='M-36 0H-16M16 0H36' stroke='#e3c18e'/><path d='M-10 38V16Q0 1 10 16V38' fill='#ba977b'/></g>
      <g opacity={portion(2)} transform={`translate(0 ${22*(1-portion(2))})`}><path d='M-43 -5V-32H-31V-22H-19V-32H-7V-5M7 -5V-32H19V-22H31V-32H43V-5' fill={`url(#${id})`}/></g>
    </>:
    kind==='castle'?<><path d='M-43 38V-32H-31V-22H-19V-32H-7V-6H7V-32H19V-22H31V-32H43V38Z' fill={`url(#${id})`}/><path d='M-10 38V16Q0 1 10 16V38' fill='#ba977b'/><path d='M-36 0H-16M16 0H36M-36 17H-16M16 17H36' stroke='#e3c18e'/></>:
    kind==='leaf'?<><path d='M-41 25Q-49 -35 38 -36Q48 34 -41 25Z' fill='#9fbf83'/><path d='M-44 36L31 -29M-29 22V-11M-12 8L-9 -23M0 -4L26 6' fill='none' stroke='#739477' strokeWidth='4'/></>:
    kind==='snowman'?<>
      <g opacity={portion(0)} transform={`translate(0 47) scale(${.12+.88*portion(0)}) translate(0 -47)`}><circle cy='17' r='30' fill='#f5f7ea'/></g>
      <g opacity={portion(1)} transform={`translate(0 ${22*(1-portion(1))})`}><circle cy='-23' r='22' fill='#f5f7ea'/></g>
      <g opacity={portion(2)}><path d='M-16 -6Q0 3 17 -7L22 1L-15 7Z' fill='#9cbccc'/><path d='M0 -26L21 -21L0 -18Z' fill='#eca977'/><circle cx='-8' cy='-30' r='2' fill='#766578'/><circle cx='8' cy='-30' r='2' fill='#766578'/><path d='M-30 7L-43 -7M30 7L43 -7' stroke='#a38670'/></g>
    </>:
    kind==='heart'?<path d='M0 37C-73 -1 -36 -62 0 -28C36 -62 73 -1 0 37Z' fill='#e4b1c2'/>:
    <><rect x='-48' y='-36' width='96' height='72' rx='18' fill={`url(#${id})`}/><text y='7' textAnchor='middle' fontSize='16' fill='#684f67' stroke='none'>{(label??'Treasure').slice(0,16)}</text></>}
    {waterAmount>0&&['seed','flower'].includes(kind)?<g opacity={unit(waterAmount)*.7} fill='#99cfd5' stroke='none'><ellipse cy='44' rx='36' ry='5'/><ellipse cx='-20' cy='-7' rx='3' ry='5'/><ellipse cx='18' cy='10' rx='3' ry='5'/></g>:null}
  </g>;
};

export const StageProps:React.FC<{props:StageProp[];events?:readonly PropCue[];frame?:number;fps?:number;quiet?:boolean}>=({props,events=[],frame=0,fps=30,quiet=false})=><svg viewBox='0 0 1920 1080' style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none',overflow:'visible'}}>
  {props.filter(p=>!p.hidden).map(p=>{const motion=propMotion(p.id,events,frame,fps,quiet),size=p.kind==='basket'?1.45:1.3;return <g key={p.id} aria-label={p.label??p.kind}>
    {!p.owner?<ellipse cx={p.x} cy='869' rx='55' ry='10' fill='#554763' opacity='.14'/>:null}
    <g transform={`translate(${p.x} ${p.y}) rotate(${(p.rotation??0)+motion.rotation}) scale(${size*motion.sx} ${size*motion.sy})`}><PropArt kind={p.kind} label={p.label} openProgress={p.openProgress} buildProgress={p.buildProgress} waterAmount={p.waterAmount}/></g>
    {p.watering?<WateringTool water={p.watering} frame={frame} fps={fps}/>:null}
    {motion.accent>0?<g transform={`translate(${p.x} ${p.y})`} stroke='#e7bd69' strokeWidth='3.5' strokeLinecap='round' opacity={motion.accent}>
      {[35,145,215,325].map(angle=><path key={angle} d='M0 -69v-10' transform={`rotate(${angle})`}/>)}
    </g>:null}
  </g>;})}
</svg>;

/** The can and droplets use the same sampled world target as the actor's reach. */
const WateringTool:React.FC<{water:NonNullable<StageProp['watering']>;frame:number;fps:number}>=({water,frame,fps})=>{
  const side=water.target.x>=water.x?1:-1;
  const radians=water.tilt*Math.PI/180;
  const spout={x:water.x+side*58*Math.cos(radians)+13*Math.sin(radians),y:water.y+side*58*Math.sin(radians)-13*Math.cos(radians)};
  const clock=frame/Math.max(1,fps);
  return <g opacity={unit(water.amount)}>
    <g aria-label='Watering can' transform={`translate(${water.x} ${water.y}) rotate(${water.tilt}) scale(${side} 1)`} stroke='#765472' strokeWidth='3' strokeLinejoin='round'>
      <path d='M-22 -13Q-58 -21 -47 13L-23 16' fill='none' strokeWidth='6'/><path d='M-25 -22H23V23Q-2 36 -25 23Z' fill='#a8ccd0'/><path d='M22 6L53 -14L61 -8L28 23' fill='#a8ccd0'/><path d='M49 -20L64 -4' stroke='#789dac' strokeWidth='6'/><path d='M-20 -22Q0 -38 19 -22' fill='none' stroke='#789dac'/><path d='M-16 -6H13' stroke='#dfeae3' strokeWidth='5'/>
    </g>
    <g aria-label='Water droplets' opacity={unit(water.flow)} fill='#91cbd6' stroke='#d7edf0' strokeWidth='1'>
      {Array.from({length:9},(_,i)=>{const progress=((clock*1.75+i/9)%1+1)%1;const x=spout.x+(water.target.x-spout.x)*progress+Math.sin(i*2.4)*4;const y=spout.y+(water.target.y-spout.y)*progress*progress;return <ellipse key={i} cx={x} cy={y} rx='3.3' ry='5.2' opacity={Math.sin(progress*Math.PI)}/>;})}
    </g>
  </g>;
};
