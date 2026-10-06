import React, {useId} from 'react';
import {sampleBackgroundLife} from '../../lib/backgroundLife';
import type {BackgroundLifeSample} from '../../lib/backgroundLife';
import {W} from '../../lib/layout';

const OUT='#968a9b', GREEN='#96b99c', PAPER='#fbf1df';
const stemStyle={fill:'none',stroke:GREEN,strokeWidth:3,strokeLinecap:'round' as const};

/** A handful of broad leaves, articulated above fixed roots/pots. */
const Leaves: React.FC<{rotation:number; color:string; fern?:boolean}> = ({rotation,color,fern=false}) => <g transform={`rotate(${rotation})`}>
  <path d={fern ? 'M0 0Q-7 -67 0 -130' : 'M0 0Q10 -44 0 -91'} {...stemStyle}/>
  {[0,1,2].map(i=><g key={i} transform={`translate(${fern ? -3 : 2} ${-28-i*(fern ? 31 : 23)})`}>
    <path d={fern ? 'M0 0Q-53 -30 -54 -11Q-33 13 0 0M0 -7Q49 -46 48 -20Q27 0 0 -7' : 'M0 0Q-40 -25 -37 -5Q-21 13 0 0M0 -9Q35 -39 38 -17Q24 1 0 -9'} fill={color} stroke={GREEN} strokeWidth="1.5"/>
    {fern ? <path d="M-8 -2l-28 -10M7 -13l26 -14" {...stemStyle} strokeWidth="1.2" opacity=".5"/> : null}
  </g>)}
</g>;

const Flower: React.FC<{a:BackgroundLifeSample}> = ({a}) => <g transform={`rotate(${a.rotation})`}>
  <path d="M0 0Q7 -38 0 -93" {...stemStyle}/>
  <path d="M2 -31Q-36 -62 -31 -35Q-14 -21 2 -31M2 -52Q32 -78 29 -52Q16 -39 2 -52" fill="#aac7a2"/>
  <g transform={`translate(0 -93) scale(${a.behavior==='bloom' ? .7+.3*a.gesture : 1})`}>
    {[0,72,144,216,288].map(angle=><ellipse key={angle} cy="-15" rx="9" ry="18" fill={a.color??'#e4b0bc'} stroke={OUT} strokeWidth="1.4" transform={`rotate(${angle})`}/>)}
    <circle r="9" fill="#ecd497"/><circle cx="-2" cy="-3" r="3" fill={PAPER}/>
  </g>
</g>;

const Insect: React.FC<{a:BackgroundLifeSample}> = ({a}) => {
  const bee=a.motif==='bee', dragonfly=a.motif==='dragonfly', width=.25+.75*a.wing;
  return <g transform={`rotate(${a.rotation})`}>
    <g transform={`scale(${width} 1)`} stroke={OUT} strokeWidth="1.5">
      {dragonfly ? <g fill="#d7e4e3" opacity=".8"><ellipse cx="-20" cy="-10" rx="24" ry="6" transform="rotate(16)"/><ellipse cx="20" cy="-10" rx="24" ry="6" transform="rotate(-16)"/><ellipse cx="-19" cy="3" rx="21" ry="5" transform="rotate(-12)"/><ellipse cx="19" cy="3" rx="21" ry="5" transform="rotate(12)"/></g>
        : bee ? <g fill="#f2eedf" opacity=".85"><ellipse cx="-11" cy="-14" rx="13" ry="8" transform="rotate(20)"/><ellipse cx="10" cy="-14" rx="13" ry="8" transform="rotate(-20)"/></g>
        : <g fill={a.color??'#d9aec7'}>
          <path d="M-3 -1C-45 -38 -42 10 -8 5C-35 13 -25 33 -4 13ZM3 -1C45 -38 42 10 8 5C35 13 25 33 4 13Z"/>
          <ellipse cx="-21" cy="-7" rx="5" ry="8" fill={PAPER} opacity=".55"/><ellipse cx="21" cy="-7" rx="5" ry="8" fill={PAPER} opacity=".55"/>
        </g>}
    </g>
    {bee ? <g><ellipse rx="17" ry="10" fill={a.color??'#e4c579'} stroke={OUT} strokeWidth="2"/><path d="M-5 -9v18M4 -9v18" stroke={OUT} strokeWidth="4"/><circle cx="15" cy="-2" r="7" fill="#ae9d8c"/><circle cx="18" cy="-4" r="1.6" fill={PAPER}/></g>
      : dragonfly ? <g><path d="M0 -14v40" stroke={a.color??'#a8c9d8'} strokeWidth="6" strokeLinecap="round"/><circle cy="-16" r="6" fill="#a0b59c"/><circle cx="-3" cy="-19" r="2" fill={PAPER}/><circle cx="3" cy="-19" r="2" fill={PAPER}/></g>
      : <g><path d="M0 -9v23" stroke={OUT} strokeWidth="4" strokeLinecap="round"/><path d="M-1 -7q-8 -10 -8 -15M1 -7q8 -10 8 -15" fill="none" stroke={OUT} strokeWidth="1.5"/></g>}
  </g>;
};

const Bird: React.FC<{a:BackgroundLifeSample}> = ({a}) => {
  const flying=a.behavior==='soar';
  return <g transform={`rotate(${a.rotation}) scale(${a.turn} 1)`}>
    {flying ? <g transform={`rotate(${-15-a.wing*40})`}><path d="M0 -14Q-52 -63 -68 -32Q-35 -8 2 -4Z" fill={a.color??'#b8c5ce'} stroke={OUT} strokeWidth="2"/></g> : <path d="M-8 -5l-2 7m16 -7l2 7" stroke="#b69c7e" strokeWidth="2"/>}
    <path d="M-11 -24L-40 -30L-29 -13L-7 -10" fill={a.color??'#b8c5ce'} stroke={OUT} strokeWidth="2"/>
    <ellipse cx="-1" cy="-20" rx="21" ry="15" fill={a.color??'#b8c5ce'} stroke={OUT} strokeWidth="2"/>
    <path d="M-13 -21Q-7 -9 8 -18" fill="#d3d8cf" opacity=".8"/>
    <g transform={`rotate(${a.gesture*47} 11 -23)`}>
      <circle cx="17" cy="-32" r="12" fill={a.color??'#b8c5ce'} stroke={OUT} strokeWidth="2"/>
      <path d="M27 -31l11 5l-11 3Z" fill="#e7c28b"/><circle cx="21" cy="-35" r="2.1" fill="#7c748d"/>
    </g>
    {flying ? <g transform={`rotate(${10+a.wing*25})`}><path d="M0 -16Q28 -56 49 -49Q34 -20 5 -7Z" fill={a.color??'#b8c5ce'} stroke={OUT} strokeWidth="2"/></g> : null}
  </g>;
};

const Crab: React.FC<{a:BackgroundLifeSample}> = ({a}) => <g>
  <ellipse cy="3" rx="34" ry="5" fill="#a58e99" opacity=".12"/>
  {[-1,1].map(side=><g key={side} transform={`scale(${side} 1)`} stroke={OUT} strokeWidth="2.7" fill="none" strokeLinecap="round">
    {[0,1,2].map(i=><path key={i} d={`M${13-i*2} -9l${17+i*4} ${-6+i*4+a.gesture*(i%2 ? 5 : -5)}l7 ${10-i*2}`}/>)}
    <path d={`M18 -17Q${34+a.gesture*3} -22 34 -39`}/>
    <path d="M34 -34Q18 -43 28 -55L34 -45L41 -54Q51 -40 34 -34Z" fill={a.color??'#dfa88b'} strokeWidth="2"/>
  </g>)}
  <ellipse cy="-13" rx="25" ry="17" fill={a.color??'#dfa88b'} stroke={OUT} strokeWidth="2.5"/>
  <path d="M-8 -23v-9M8 -23v-9" stroke={OUT} strokeWidth="3"/>
  <circle cx="-8" cy="-33" r="4" fill={PAPER}/><circle cx="8" cy="-33" r="4" fill={PAPER}/>
  <circle cx="-8" cy="-33" r="1.8" fill={OUT}/><circle cx="8" cy="-33" r="1.8" fill={OUT}/>
</g>;

const Motif: React.FC<{a:BackgroundLifeSample}> = ({a}) => {
  const color=a.color??GREEN;
  switch(a.motif) {
    case 'butterfly': case 'moth': case 'bee': case 'dragonfly': return <Insect a={a}/>;
    case 'bird': return <Bird a={a}/>;
    case 'flower': return <Flower a={a}/>;
    case 'fern': return <Leaves rotation={a.rotation} color={color} fern/>;
    case 'herb': return <g>
      <ellipse cy="1" rx="30" ry="4" fill="#bdac9e" opacity=".3"/>
      <Leaves rotation={a.rotation} color={color}/>
      <path d="M-22 -26H22L16 0H-16Z" fill="#d5ad98" stroke={OUT} strokeWidth="2"/>
      <rect x="-24" y="-28" width="48" height="8" rx="3" fill="#e4c4ac" stroke={OUT} strokeWidth="1.5"/>
    </g>;
    case 'terrarium': return <g>
      <path d="M-24 -109Q-60 -71 -42 -17H42Q60 -71 24 -109Z" fill="#e5e1f0" fillOpacity=".16" stroke="#d4d5dd" strokeWidth="2.5"/>
      <g transform="translate(0 -19) scale(.68)"><Leaves rotation={a.rotation} color={color}/></g>
      <ellipse cy="-16" rx="43" ry="9" fill="#bca7a0"/>
      <path d="M-37 -87Q-49 -66 -43 -41" stroke={PAPER} strokeWidth="4" opacity=".65" fill="none" strokeLinecap="round"/>
      <rect x="-26" y="-113" width="52" height="8" rx="4" fill="#c8c5d4"/>
    </g>;
    case 'wheat': return <g transform={`rotate(${a.rotation})`}>
      {[-1,0,1].map((side,i)=><g key={side} transform={`translate(${side*23} 0) rotate(${side*12})`}>
        <path d={`M0 0V${-91-i*9}`} {...stemStyle} stroke="#bcac83"/>
        {[0,1,2,3].map(j=><g key={j} transform={`translate(0 ${-63-i*9-j*10})`}><ellipse cx="-6" cy="-4" rx="5" ry="10" fill={color} transform="rotate(-32)"/><ellipse cx="6" cy="-4" rx="5" ry="10" fill={color} transform="rotate(32)"/></g>)}
      </g>)}
    </g>;
    case 'pine': return <g transform={`rotate(${a.rotation})`}>
      <path d="M0 0v-110" stroke="#b3a297" strokeWidth="5"/>
      {[0,1,2].map(i=><g key={i} transform={`translate(0 ${-i*24}) scale(${1-i*.21})`}><path d="M0 -66Q22 -29 43 -17Q17 -10 0 -18Q-17 -10 -43 -17Q-22 -29 0 -66Z" fill={color}/><path d="M0 -66Q12 -44 23 -33Q8 -30 0 -37Q-9 -30 -23 -33Q-12 -44 0 -66Z" fill={PAPER}/></g>)}
    </g>;
    case 'cactus': return <g>
      <path d="M0 0v-92M0 -28h-27v-29M0 -48h28v-22" fill="none" stroke={color} strokeWidth="22" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M-3 -13v-59" stroke="#d0dcbd" strokeWidth="2"/>
      <g transform={`translate(0 -99) scale(${.65+a.gesture*.35})`} fill="#d8a9bc"><ellipse rx="17" ry="7"/><ellipse rx="7" ry="17"/><circle r="5" fill="#ead69b"/></g>
    </g>;
    case 'mushroom': return <g transform={`rotate(${a.rotation})`}>
      <path d="M-10 0Q-6 -21 -9 -42H9Q6 -21 13 0Z" fill="#e9dbc5" stroke={OUT} strokeWidth="2"/>
      <path d="M-46 -38Q-43 -84 0 -83Q43 -80 46 -38Q0 -23 -46 -38Z" fill={color} stroke={OUT} strokeWidth="2"/>
      <ellipse cx="-14" cy="-58" rx="9" ry="5" fill={PAPER} opacity=".7"/><ellipse cx="18" cy="-51" rx="6" ry="4" fill={PAPER} opacity=".7"/>
    </g>;
    case 'snail': return <g transform={`scale(${a.turn} 1)`}>
      <path d={`M-29 -4Q0 -22 35 -11L${43+a.gesture*5} -21Q58 -16 50 -5Q10 8 -29 -4Z`} fill="#b7c3a0" stroke={OUT} strokeWidth="2"/>
      <circle cx="-6" cy="-25" r="22" fill={color} stroke={OUT} strokeWidth="2"/>
      <path d="M-20 -22a14 14 0 1 1 22 10a9 9 0 1 1 -6 -16q8 -2 7 5" fill="none" stroke="#a18b84" strokeWidth="2.5"/>
      <path d="M45 -18l1 -15M48 -15l10 -12" stroke={OUT} strokeWidth="2"/>
      <circle cx="46" cy="-33" r="2.5" fill={OUT}/><circle cx="58" cy="-27" r="2.5" fill={OUT}/>
    </g>;
    case 'ladybird': return <g transform={`scale(${a.turn} 1)`}>
      <path d={`M-11 -3l-11 ${4+a.gesture*4}M0 -4l-1 10M11 -3l10 ${4-a.gesture*4}`} fill="none" stroke={OUT} strokeWidth="2"/>
      <ellipse cy="-9" rx="20" ry="13" fill={color} stroke={OUT} strokeWidth="2"/><path d="M0 -21v24" stroke={OUT} strokeWidth="1.5"/>
      <circle cx="-10" cy="-10" r="3" fill={OUT}/><circle cx="9" cy="-13" r="3" fill={OUT}/><circle cx="21" cy="-9" r="7" fill="#9d9299"/>
    </g>;
    case 'lizard': return <g transform={`scale(${a.turn} 1)`}>
      <path d="M-6 -12Q-27 -13 -52 -2Q-29 -2 -6 -4" fill={color} stroke={OUT} strokeWidth="2"/>
      <ellipse cy="-9" rx="24" ry="10" fill={color} stroke={OUT} strokeWidth="2"/><ellipse cx="29" cy="-12" rx="14" ry="9" fill={color} stroke={OUT} strokeWidth="2"/>
      <path d={`M-13 -5l-11 ${7+a.gesture*4}m33 -8l12 ${6-a.gesture*3}`} fill="none" stroke={OUT} strokeWidth="3" strokeLinecap="round"/>
      <circle cx="34" cy="-16" r="2" fill={OUT}/>
    </g>;
    case 'crab': return <Crab a={a}/>;
    case 'fish': return <g transform={`scale(${a.turn} 1)`} opacity=".8">
      <g transform={`rotate(${-14+28*a.wing} -22 0)`}><path d="M-18 0L-48 -19Q-40 0 -48 19Z" fill={color} stroke={OUT} strokeWidth="2"/></g>
      <ellipse rx="28" ry="14" fill={color} stroke={OUT} strokeWidth="2"/>
      <path d="M-5 -13l-9 -9l21 9M-3 6l-10 7l15 -3" fill="#eee0b1"/><circle cx="17" cy="-4" r="3.5" fill={PAPER}/><circle cx="18" cy="-4" r="1.6" fill={OUT}/>
    </g>;
    case 'jellyfish': return <g transform={`rotate(${a.rotation})`}>
      {[-24,-8,8,24].map((x,i)=><path key={x} d={`M${x} 9Q${x-13+a.gesture*18} 40 ${x+3} ${64+i%2*10}`} fill="none" stroke={color} strokeWidth="3.5" opacity=".75" strokeLinecap="round"/>)}
      <path d={`M-43 9Q-46 ${-50+a.gesture*9} 0 ${-54+a.gesture*6}Q46 ${-50+a.gesture*9} 43 9Q22 21 0 11Q-22 21 -43 9Z`} fill={color} fillOpacity=".65" stroke="#dbd4e4" strokeWidth="2"/>
      <path d="M-24 -18Q-19 -32 -9 -34" fill="none" stroke={PAPER} strokeWidth="4" opacity=".55" strokeLinecap="round"/>
      <circle cx="39" cy="-66" r="5" fill="none" stroke="#d7e7e7" strokeWidth="2" opacity=".6"/>
    </g>;
    case 'firefly': return <g>
      <circle r={14+a.gesture*4} fill={color} opacity=".12"/>
      <ellipse cx="-5" cy="-7" rx="7" ry={3+a.wing*3} fill={PAPER} opacity=".65"/><ellipse cx="5" cy="-7" rx="7" ry={3+a.wing*3} fill={PAPER} opacity=".65"/>
      <ellipse rx="5" ry="8" fill={color}/><circle cy="-8" r="3" fill={OUT}/>
    </g>;
    case 'seed': return <g transform={`rotate(${a.rotation*3})`}>
      <path d="M0 0Q-6 18 -2 34" stroke="#c3af94" strokeWidth="1.8" fill="none"/><ellipse cx="-2" cy="34" rx="3" ry="5" fill={a.color??'#c3af94'}/>
      {[-48,-24,0,24,48].map(angle=><path key={angle} d="M0 0v-19m0 7l-5 -5m5 5l5 -5" transform={`rotate(${angle})`} stroke={PAPER} strokeWidth="1.5" fill="none"/>)}
    </g>;
    case 'ripple': return <g fill="none" stroke={a.color??PAPER} strokeWidth="2" opacity={Math.sin(a.gesture*Math.PI)*.55}>
      <ellipse rx={9+a.gesture*31} ry={2+a.gesture*8}/><ellipse rx={4+a.gesture*23} ry={1+a.gesture*5} opacity=".65"/>
    </g>;
    case 'kettle': return <g>
      <path d="M-23 -28Q-49 -67 -12 -69Q18 -69 23 -30" fill="none" stroke={OUT} strokeWidth="5"/>
      <path d="M-21 -29Q-43 -13 -28 0H28Q42 -13 22 -29Z" fill={color} stroke={OUT} strokeWidth="2.5"/>
      <path d="M25 -18Q43 -21 47 -35L38 -37Q35 -28 24 -27" fill={color} stroke={OUT} strokeWidth="2"/>
      <path d={`M-23 ${-29-a.gesture*2}H23`} stroke="#d5e0db" strokeWidth="5" strokeLinecap="round"/>
      <path d={`M43 -43q${-9+a.gesture*14} -12 1 -21q${8-a.gesture*12} -12 -3 -22`} fill="none" stroke={PAPER} strokeWidth="3" opacity=".55" strokeLinecap="round"/>
    </g>;
    case 'balloon': return <g transform={`rotate(${a.rotation})`}>
      <path d="M0 43Q-9 72 1 105" fill="none" stroke={OUT} strokeWidth="2"/>
      <ellipse rx="29" ry="38" fill={color} stroke={OUT} strokeWidth="2"/><path d="M-5 36l5 8l5 -8" fill={color}/><ellipse cx="-10" cy="-14" rx="6" ry="10" fill={PAPER} opacity=".55"/>
    </g>;
    case 'cloud': return <g transform={`rotate(${a.rotation})`}>
      <path d="M-51 8Q-66 -17 -40 -29Q-20 -59 3 -32Q32 -47 45 -20Q70 -6 45 14Z" fill={color} fillOpacity=".8"/>
      <path d="M-33 -5Q-23 -26 -7 -13Q6 1 -7 5" fill="none" stroke={PAPER} strokeWidth="3" opacity=".7" strokeLinecap="round"/>
    </g>;
    case 'satellite': return <g transform={`rotate(${a.rotation+12})`}>
      <path d="M-47 0h94" stroke={OUT} strokeWidth="3"/>
      {[-1,1].map(side=><g key={side} transform={`translate(${side*40} 0)`}><rect x="-18" y="-19" width="36" height="38" rx="3" fill="#9eb6d1" stroke="#c6cbdc" strokeWidth="2"/><path d="M-18 -6h36m-36 12h36M0 -19v38" stroke="#d1d6e0" strokeWidth="1"/></g>)}
      <rect x="-15" y="-16" width="30" height="32" rx="7" fill={color} stroke={OUT} strokeWidth="2"/>
      <path d="M0 -16v-14M-12 -29Q0 -18 12 -29Z" fill="#d8d5e3" stroke={OUT} strokeWidth="2"/><circle cy="-33" r="2.5" fill={PAPER}/>
    </g>;
  }
};

/** Always live, including over cached scenery; below actors and clipped out of the caption area. */
export const BackgroundLife: React.FC<{kind:string; t:number; motion:number; transform?:string}> = ({kind,t,motion,transform}) => {
  const uid=`background-life-${useId().replace(/:/g,'')}`;
  return <svg data-background-life={kind} aria-hidden="true" width={W} height={1080} viewBox={`0 0 ${W} 1080`} style={{position:'absolute',left:0,top:0,pointerEvents:'none'}}>
    <defs><clipPath id={uid}><rect width={W} height={925}/></clipPath></defs>
    <g clipPath={`url(#${uid})`}>
      <g style={{transform,transformOrigin:'0 0'}}>
        {sampleBackgroundLife(kind,t,motion).map(a=><g key={a.id} data-life-action={a.id} data-life-motif={a.motif} data-living={a.living} opacity={a.opacity} transform={`translate(${a.x} ${a.y}) scale(${a.scale??1})`}>
          <Motif a={a}/>
        </g>)}
      </g>
    </g>
  </svg>;
};
