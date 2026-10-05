import React, {useId} from 'react';
import type {StageProp} from '../lib/types';

/** Small reusable vector objects; no downloaded or generated artwork is needed. */
export const PropArt:React.FC<{kind:string;label?:string}>=({kind,label})=>{
  const id=`prop-${useId().replace(/:/g,'')}`;
  const outline={stroke:'#765472',strokeWidth:3,strokeLinejoin:'round' as const};
  return <g {...outline}>
    <defs><linearGradient id={id} x2='.8' y2='1'><stop stopColor='#fff4c5'/><stop offset='1' stopColor='#eaa56a'/></linearGradient></defs>
    {kind==='apple'?<><path d='M0 -26C-36 -49 -56 -7 -35 29Q-14 51 0 36Q16 50 36 27C57 -8 34 -47 0 -26Z' fill='#ed6c71'/><path d='M0 -24Q-4 -38 3 -48' fill='none' stroke='#88623f' strokeWidth='6'/><path d='M5 -35Q12 -59 34 -44Q27 -25 5 -35Z' fill='#86b97e'/><path d='M-27 -15Q-34 -1 -25 12' fill='none' stroke='#ffd4be' strokeWidth='7' strokeLinecap='round'/></>:
    kind==='ball'?<><circle r='41' fill='#97cbd2'/><path d='M-27 -30Q0 -8 28 -30M-38 10Q0 -8 38 10M-7 -39Q0 -8 -10 39M0 -8L30 28' fill='none' stroke='#fff6dc' strokeWidth='7'/></>:
    kind==='basket'?<><path d='M-28 -10V-28Q0 -67 28 -28V-10' fill='none' stroke='#ae8063' strokeWidth='9'/><path d='M-48 -11H48L35 39Q0 50 -35 39Z' fill={`url(#${id})`}/><path d='M-39 2H39M-36 15H36M-33 28H33M-20 -10L-15 39M0 -10V43M20 -10L15 39' fill='none' stroke='#c99166'/></>:
    kind==='book'?<><path d='M-45 -30Q-23 -40 0 -25Q23 -40 45 -30V34Q23 23 0 38Q-23 23 -45 34Z' fill='#fff3dd'/><path d='M0 -25V38M-34 -18L-10 -12M-34 -4L-10 2M10 -12L34 -18M10 2L34 -4' fill='none' stroke='#99b6c5' strokeWidth='4'/></>:
    kind==='flower'?<><path d='M0 0V45M0 30Q-30 31 -25 13Q-7 13 0 30' stroke='#74a77c' fill='#95c48d' strokeWidth='5'/>{[0,60,120,180,240,300].map(a=><ellipse key={a} cy='-23' rx='14' ry='23' fill='#e7abc5' transform={`rotate(${a})`}/>)}<circle r='15' fill='#f6d98c'/></>:
    kind==='kite'?<><path d='M0 -45L34 0L0 37L-34 0Z' fill='#e8b2cf'/><path d='M0 -45V37M-34 0H34M0 37Q33 56 10 72' fill='none' stroke='#fff0d5'/><path d='M13 57L1 48L3 67Z' fill='#98c4c8'/></>:
    kind==='seed'?<><ellipse cy='18' rx='28' ry='20' fill='#b88c64'/><path d='M0 17V-18M0 -9Q-33 -36 -32 -8Q-14 2 0 -9M0 -18Q30 -46 32 -20Q13 -5 0 -18' stroke='#71a077' fill='#9dc18a' strokeWidth='4'/></>:
    kind==='cookie'?<><circle r='40' fill={`url(#${id})`}/>{[[-17,-18],[16,-14],[0,10],[-22,21],[24,17]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r='6' fill='#92664f' stroke='none'/>)}</>:
    kind==='star'?<path d='M0 -43L13 -14L44 -10L22 12L27 44L0 29L-27 44L-22 12L-44 -10L-13 -14Z' fill='#f2d485'/>:
    kind==='boat'?<><path d='M-48 13H48L27 38H-27Z' fill='#99c5ca'/><path d='M0 -46V13M0 -45L-38 6H0ZM5 -31L37 6H5Z' fill='#fff1da'/><path d='M-38 16L-25 26H25L38 16' fill='none' stroke='#d6e8df'/></>:
    kind==='castle'?<><path d='M-43 38V-32H-31V-22H-19V-32H-7V-6H7V-32H19V-22H31V-32H43V38Z' fill={`url(#${id})`}/><path d='M-10 38V16Q0 1 10 16V38' fill='#ba977b'/><path d='M-36 0H-16M16 0H36M-36 17H-16M16 17H36' stroke='#e3c18e'/></>:
    kind==='leaf'?<><path d='M-41 25Q-49 -35 38 -36Q48 34 -41 25Z' fill='#9fbf83'/><path d='M-44 36L31 -29M-29 22V-11M-12 8L-9 -23M0 -4L26 6' fill='none' stroke='#739477' strokeWidth='4'/></>:
    kind==='snowman'?<><circle cy='17' r='30' fill='#f5f7ea'/><circle cy='-23' r='22' fill='#f5f7ea'/><path d='M-16 -6Q0 3 17 -7L22 1L-15 7Z' fill='#9cbccc'/><path d='M0 -26L21 -21L0 -18Z' fill='#eca977'/><circle cx='-8' cy='-30' r='2' fill='#766578'/><circle cx='8' cy='-30' r='2' fill='#766578'/><path d='M-30 7L-43 -7M30 7L43 -7' stroke='#a38670'/></>:
    kind==='heart'?<path d='M0 37C-73 -1 -36 -62 0 -28C36 -62 73 -1 0 37Z' fill='#e4b1c2'/>:
    <><rect x='-48' y='-36' width='96' height='72' rx='18' fill={`url(#${id})`}/><text y='7' textAnchor='middle' fontSize='16' fill='#684f67' stroke='none'>{(label??'Treasure').slice(0,16)}</text></>}
  </g>;
};

export const StageProps:React.FC<{props:StageProp[]}>=({props})=><svg viewBox='0 0 1920 1080' style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none',overflow:'visible'}}>
  {props.filter(p=>!p.hidden).map(p=><g key={p.id} aria-label={p.label??p.kind}>
    {!p.owner?<ellipse cx={p.x} cy='869' rx='55' ry='10' fill='#554763' opacity='.14'/>:null}
    <g transform={`translate(${p.x} ${p.y}) scale(${p.kind==='basket'?1.3:1.12})`}><PropArt kind={p.kind} label={p.label}/></g>
  </g>)}
</svg>;
