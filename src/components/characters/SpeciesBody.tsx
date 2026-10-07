import React from "react";
import type { CharacterRecipe } from "./recipe";
import type { Pose } from "./pose";
import { OUTLINE, facialParameters } from "./Face";
import type {Action, Emotion} from '../../lib/types';
import type {MouthShape} from '../../lib/speech';
import type {ActorPerformance} from '../../lib/acting';

const O = { stroke: OUTLINE, strokeWidth: 3, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

/** Species with anatomy that cannot be assembled from the upright mammal body. */
export const SPECIES_RIGS = new Set(["quadruped", "insect", "snowman", "frog", "fish", "whale", "star", "tRex", "longNeck", "shell"]);

export const SpeciesBody: React.FC<{
  recipe: CharacterRecipe; pose: Pose; face: React.ReactNode;
  turn?: number; action?: Action;
  mouth?: number; mouthShape?: MouthShape;
  emotion?: Emotion; performance?: ActorPerformance;
  armExtension?: Partial<Record<'L'|'R',number>>;
}> = ({ recipe: r, pose: p, face, turn=0, action='idle', mouth=0, mouthShape, emotion='happy', performance, armExtension }) => {
  const uid=`native-${React.useId().replace(/:/g,'')}`;
  const c = r.colors;
  const yaw = Math.max(-1,Math.min(1,turn));
  const headMotion = `translate(${p.head.dx+yaw*4} ${p.head.dy}) rotate(${p.head.tilt} 100 145) translate(100 0) scale(${1-Math.abs(yaw)*.08} 1) translate(-100 0)`;
  const lag = p.secondary?.ears ?? 0;
  const hip = r.rig==='quadruped' ? [132,200] : r.rig==='longNeck' ? [110,200]
    : r.rig==='fish'||r.rig==='whale' ? [100,150] : r.rig==='snowman' ? [100,249]
    : r.rig==='insect' ? [100,r.name==='bee'?180:243] : [100,r.rig==='shell'?230:225];
  const lean = (p.torsoTilt??0)*(r.rig==='longNeck'?.62:r.rig==='quadruped'?.72:r.rig==='snowman'?.55:r.rig==='shell'?1:.9);
  const torsoTilt = `rotate(${lean} ${hip[0]} ${hip[1]})`;
  const plantedFeet = `rotate(${-lean} ${hip[0]} ${hip[1]})`;
  const glint = (d: string) => <path d={d} fill="none" stroke="#fff5df" strokeWidth="2" strokeLinecap="round" opacity=".45"/>;
  const hoof = (x: number, back: boolean, index: number) => {
    const lift = index % 2 ? p.legR : p.legL;
    const stride = index % 2 ? p.legXR : p.legXL;
    const swing = (index % 2 ? p.legSwR : p.legSwL) + (!back && index === 0 ? Math.max(0, p.armR - 35) * .85 : 0);
    return <g key={x} transform={`${plantedFeet} translate(${stride} ${lift * 0.5}) rotate(${swing * 0.65} ${x} 186)`}>
      <path d={`M ${x - 8} 185 Q ${x - 13} 216 ${x - 9} 244 L ${x + 9} 244 L ${x + 8} 186 Z`} fill={back&&r.name!=='unicorn' ? c.accent : c.body} {...O} />
      <path d={`M ${x - 9} 233 L ${x + 9} 233 L ${x + 10} 247 Q ${x} 251 ${x - 11} 247 Z`} fill={c.limb} {...O} />
      {glint(`M${x-4} 196L${x-5} 217`)}
    </g>;
  };

  // The chart's turtle has a horizontal shell and four native flippers.
  if (r.rig==='shell') return <g data-species-torso={r.name} transform={torsoTilt}>
    <defs><clipPath id={`${uid}-shell`}><path d="M75 178C72 117 179 106 199 172Q170 205 75 178Z"/></clipPath></defs>
    <path d="M188 187Q213 191 207 202L184 207Z" fill={c.body} {...O}/>
    {[[154,188,-1],[178,190,1]].map(([x,y,s])=><path key={x} transform={`rotate(${s*(p.legSwL+p.tail*.2)} ${x} ${y})`} d={`M${x} ${y}Q${x+36} ${y+3} ${x+33} ${y+30}Q${x+12} ${y+33} ${x-8} ${y+8}Z`} fill={c.body} {...O}/>)}
    <ellipse cx="139" cy="182" rx="64" ry="39" fill={c.belly} {...O}/>
    <path d="M88 195Q142 228 189 195M113 201l4 15m23 -9v13m25 -19l-4 16" fill="none" stroke="#b7a467" strokeWidth="1.5"/>
    <path d="M75 178C72 117 179 106 199 172Q170 205 75 178Z" fill={c.accent} {...O}/>
    <g clipPath={`url(#${uid}-shell)`} fill="none" stroke="#c5cc75" strokeWidth="2.5"><path d="M126 129l-12 24l13 25l32 -1l16 -23l-15 -26M114 153l-31 -4m43 29l-14 17m47 -18l14 16m2 -39l20 -5"/></g>
    <g transform={`translate(${p.head.dx*.4} ${p.head.dy*.4}) rotate(${p.head.tilt*.5} 94 174)`}>
      <path d="M16 140C19 108 40 89 70 90C104 88 126 112 129 144C134 174 116 191 77 193C40 195 12 185 9 164Q7 153 16 140Z" fill={c.body} {...O}/>
      <g transform="translate(-25 48) scale(.94)">{face}</g>
      {glint('M28 122Q37 101 61 101')}
    </g>
    {[[78,190,-1],[132,201,1]].map(([x,y,s])=><g key={x} data-native-flipper={s>0?'R':'L'} transform={`translate(${x} ${y}) rotate(${s>0?-p.armR:p.armL}) scale(1 ${armExtension?.[s>0?'R':'L']??1})`}>
      <path d="M-9 -8Q-33 9 -29 39Q-17 48 3 23Q14 4 8 -5Z" fill={c.body} {...O}/>
      <g fill={c.belly} opacity=".55">{[[-25,31],[-18,33],[-10,26]].map(([a,b])=><ellipse key={a} cx={a} cy={b} rx="2" ry="3" transform={`rotate(25 ${a} ${b})`}/>)}</g>
    </g>)}
  </g>;

  // Compact pony anatomy: short legs grow from the body, beneath a broad face.
  if (r.name==='unicorn') {
    const ponyLeg=(x:number,back:boolean,right:boolean)=>{
      const lift=right?p.legR:p.legL,stride=right?p.legXR:p.legXL;
      const swing=(right?p.legSwR:p.legSwL)*.55+(!back&&right?Math.max(0,p.armR-35)*.25:0);
      return <g key={x} transform={`${plantedFeet} translate(${stride*.65} ${lift*.4}) rotate(${swing} ${x} 204)`}>
        <path d={`M${x-11} 196Q${x-15} 216 ${x-12} 241Q${x} 249 ${x+13} 241L${x+14} 198Z`} fill={back?'#eee0ef':c.body}/>
        <path d={`M${x-11} 215Q${x-15} 229 ${x-12} 241Q${x} 249 ${x+13} 241L${x+14} 215`} fill="none" {...O}/>
        <path d={`M${x-12} 236Q${x} 241 ${x+13} 236L${x+13} 243Q${x} 250 ${x-12} 243Z`} fill={c.limb} {...O}/>
        <ellipse cx={x-5} cy="241" rx="2.5" ry="1.5" fill="#ead4e9"/>
      </g>;
    };
    return <g data-species-torso={r.name} transform={torsoTilt}>
      <defs>
        <linearGradient id={`${uid}-mane`} x2=".9" y2="1"><stop stopColor="#d4b8ed"/><stop offset="1" stopColor="#b28acb"/></linearGradient>
        <linearGradient id={`${uid}-blue-mane`} x2=".8" y2="1"><stop stopColor="#b5dff0"/><stop offset="1" stopColor="#80bbdf"/></linearGradient>
        <linearGradient id={`${uid}-horn`}><stop stopColor="#ffeabb"/><stop offset=".55" stopColor="#f5d990"/><stop offset="1" stopColor="#d9b76f"/></linearGradient>
      </defs>
      <g transform={`rotate(${p.tail*.45} 143 185)`}>
        <path d="M134 179C156 155 190 162 190 187C190 208 173 216 178 229Q184 238 194 224Q198 246 178 249C153 253 145 229 155 208Q162 190 137 196Z" fill={`url(#${uid}-mane)`} {...O}/>
        <path d="M147 180C166 167 181 178 177 195Q163 221 171 234Q181 244 189 235Q168 246 164 227Q157 214 168 196Q174 179 147 180Z" fill={`url(#${uid}-blue-mane)`}/>
      </g>
      {ponyLeg(64,true,false)}{ponyLeg(140,true,true)}
      <path d="M77 165Q51 175 54 207Q55 226 77 229Q104 237 134 226Q153 217 149 191Q145 169 124 163Z" fill={c.body} {...O}/>
      {ponyLeg(84,false,false)}{ponyLeg(119,false,true)}
      <g transform={`translate(${p.head.dx*.4+yaw*2} ${p.head.dy*.3}) rotate(${p.head.tilt*.6} 100 172)`}>
        <path d="M61 67C34 83 35 103 39 119Q22 148 43 169Q40 190 69 189L135 175Q151 201 165 179Q151 176 157 148Q166 111 146 68Z" fill={`url(#${uid}-mane)`} {...O}/>
        <path d="M47 88Q39 109 47 123Q34 155 50 170" fill="none" stroke="#e3c6ef" strokeWidth="6" strokeLinecap="round"/>
        <path d="M54 104Q29 85 35 54Q35 47 42 51Q67 60 74 83M126 80Q136 54 155 50Q165 71 147 105Z" fill={c.body} {...O}/>
        <path d="M50 88Q39 73 42 60Q59 68 64 87ZM137 86Q141 67 153 60Q156 79 145 94Z" fill="#eab3d0"/>
        <path d="M49 117C47 77 67 61 99 62C137 60 153 84 152 119Q162 146 148 164Q134 183 100 182Q62 181 49 165Q36 149 49 117Z" fill={c.body} {...O}/>
        <path d="M62 82C47 52 77 33 104 43C124 46 138 63 143 82L151 108Q160 126 171 110C172 136 149 148 137 125L130 100Q124 116 106 114Q117 101 112 90Q87 110 67 98Z" fill={`url(#${uid}-blue-mane)`} {...O}/>
        <path d="M59 73Q76 81 111 63Q105 85 71 88Q94 90 118 76Q112 99 83 102Q62 102 59 90Z" fill={`url(#${uid}-mane)`}/>
        <path d="M87 69Q99 36 117 15Q122 9 121 19L113 67Q102 74 87 69Z" fill={`url(#${uid}-horn)`} stroke="#bca171" strokeWidth="1.8"/>
        <path d="M93 55Q101 62 114 58M99 41Q107 48 116 45M107 28Q113 35 119 33" fill="none" stroke="#d3b477" strokeWidth="1.6"/>
        {face}
        <g transform={`translate(${yaw*11.5} 0)`}><ellipse cx="94" cy="153" rx="1.6" ry="2" fill="#dca4be"/><ellipse cx="106" cy="153" rx="1.6" ry="2" fill="#dca4be"/></g>
        <g transform="translate(151 180)">{[0,72,144,216,288].map(a=><ellipse key={a} cy="-4" rx="3.6" ry="5" transform={`rotate(${a})`} fill="#f4c2d8" stroke="#cc91b2" strokeWidth=".8"/>)}<circle r="2.8" fill="#f8e2a5"/></g>
      </g>
    </g>;
  }

  if (r.name==='ladybug') return <g data-species-torso={r.name} transform={torsoTilt}>
    {[-1,1].map(s=><g key={s}>
      <path d={`M${100+s*28} 219l${s*6} 18`} fill="none" stroke="#514151" strokeWidth="11" strokeLinecap="round"/>
      <ellipse cx={100+s*36} cy="241" rx="12" ry="6" fill="#645362" {...O}/>
      <ellipse cx={100+s*35} cy="181" rx="32" ry="54" fill="#d95f6a" {...O}/>
      {[151,181,208].map((y,i)=><ellipse key={y} cx={100+s*(i===1?56:44)} cy={y} rx="8" ry="10" fill="#574552"/>)}
    </g>)}
    <ellipse cx="100" cy="186" rx="42" ry="58" fill="#645362" {...O}/>
    <path d="M63 169Q100 183 137 169M60 190Q100 207 140 190M67 213Q100 229 133 213" fill="none" stroke="#453844" strokeWidth="2"/>
    {[-1,1].map(s=><g key={s} transform={`rotate(${-s*(s>0?p.armR:p.armL)*.6} ${100+s*36} 158)`}><path d={`M${100+s*34} 150Q${100+s*61} 156 ${100+s*64} 180Q${100+s*73} 177 ${100+s*74} 185Q${100+s*80} 194 ${100+s*69} 198Q${100+s*54} 202 ${100+s*53} 186L${100+s*31} 166Z`} fill="#645362" {...O}/></g>)}
    <g transform={headMotion}>
      <g transform={`rotate(${lag*.5} 100 62)`}><path d="M79 58Q78 20 62 20M121 58Q122 20 138 20" fill="none" stroke="#645362" strokeWidth="4"/><circle cx="62" cy="20" r="6" fill="#645362"/><circle cx="138" cy="20" r="6" fill="#645362"/></g>
      <ellipse cx="100" cy="97" rx="52" ry="49" fill="#645362" {...O}/>
      <path d="M100 80C70 52 51 89 61 116Q67 143 100 144Q133 143 139 116C149 89 130 52 100 80Z" fill="#f4d7b5"/>
      <g transform="translate(0 9)">{face}</g>
    </g>
  </g>;

  if (r.rig === "quadruped") {
    const zebra = r.name === "zebra", unicorn = r.name === "unicorn";
    return <g data-species-torso={r.name} transform={torsoTilt}>
      <g transform={`rotate(${p.tail * 0.7} 184 164)`}>
        <path d="M 181 160 C 222 151 208 188 217 212 Q 194 211 193 184 Q 195 174 181 178 Z" fill={c.accent} {...O} />
        <path d="M 193 168 Q 206 177 204 197" fill="none" stroke={unicorn ? "#eda6d3" : c.belly} strokeWidth={4} />
      </g>
      {hoof(105, true, 1)}{hoof(176, true, 0)}
      <path d="M73 198Q59 192 65 175C46 157 61 125 53 109L82 84Q103 116 106 137C140 124 194 135 196 174Q197 214 142 214Q101 218 73 198Z" fill={c.body} {...O}/>
      {glint('M112 148Q139 136 164 152')}
      {zebra ? <g fill={c.accent}>
        <path d="M 112 135 L 119 169 L 126 141 Z M 134 135 L 139 183 L 150 137 Z M 158 141 L 162 187 L 173 148 Z M 186 163 L 173 190 L 193 178 Z M 83 134 L 101 139 L 98 147 L 80 144 Z" />
      </g> : <path d="M 113 197 Q 150 211 179 187" fill="none" stroke={c.belly} strokeWidth={8} strokeLinecap="round" />}
      {hoof(84, false, 0)}{hoof(154, false, 1)}
      <g transform={`translate(${p.head.dx * 0.5+yaw*3} ${p.head.dy * 0.5}) rotate(${p.head.tilt+yaw*2} 77 130)`}>
        <path d="M 77 66 Q 116 78 103 113 L 115 133 L 97 131 L 103 145 L 87 136 Q 93 101 77 66 Z" fill={c.accent} {...O} />
        <path transform={`rotate(${lag*.5} 67 73)`} d="M 49 77 Q 35 50 47 38 Q 64 48 65 73 M 74 69 Q 70 47 83 39 Q 92 61 84 77" fill={c.body} {...O} />
        <path d="M 48 50 L 55 68 M 82 50 L 79 67" stroke={unicorn ? "#e7a5c9" : c.belly} strokeWidth={5} strokeLinecap="round" />
        {unicorn ? <g><path d="M 55 68 L 61 16 L 72 66 Z" fill="#f4d184" {...O} /><path d="M 59 48 L 68 44 M 60 35 L 65 33" stroke="#ab8546" strokeWidth={2} /></g> : null}
        <path d="M 65 66 C 87 60 102 77 97 97 Q 96 112 79 121 L 60 136 Q 40 146 28 133 Q 20 122 36 107 L 43 86 Q 45 71 65 66 Z" fill={c.body} {...O} />
        <path d="M54 78Q59 70 68 71Q65 90 54 110L41 110Q51 92 54 78Z" fill="#f7e9cd"/>
        {glint('M48 91Q49 79 59 77')}
        <path d="M 37 108 Q 49 114 61 125 Q 56 146 32 135 Q 19 124 37 108 Z" fill={zebra ? "#5b5662" : c.belly} {...O} strokeWidth={2} />
        <path d="M 64 64 Q 86 57 94 79 Q 78 74 77 87 Q 64 81 64 64 Z" fill={c.accent} {...O} />
        {zebra ? <path d="M 49 88 L 57 96 L 43 98 M 85 91 L 80 106 L 93 100" fill={c.accent} /> : null}
        <g transform="translate(-32 0)">{face}</g>
        <circle cx={34} cy={122} r={2.5} fill={OUTLINE} />
      </g>
    </g>;
  }

  if (r.rig === "longNeck") return <g data-species-torso={r.name} transform={torsoTilt}>
    <g transform={`rotate(${p.tail*.4} 132 197)`}><path d="M132 197Q184 213 177 155" fill="none" stroke={c.body} strokeWidth={6} />
    <path d="M 171 150 Q 183 135 185 154 Q 181 166 175 164 Z" fill={c.accent} {...O} /></g>
    {hoof(82,false,0)}{hoof(122,false,1)}
    <path d="M80 75Q98 65 117 75L116 150Q137 169 137 194Q137 224 100 224Q64 224 64 194Q64 169 81 150Z" fill={c.body} {...O}/>
    <ellipse cx="101" cy="194" rx="19" ry="25" fill={c.belly}/>
    {glint('M85 89L82 151')}
    <g fill={c.accent}>{[[88,96],[110,104],[98,119],[84,137],[109,143],[94,155],[77,174],[124,176],[74,200],[126,207]].map(([x,y],i)=><ellipse key={i} cx={x} cy={y} rx={i%2?5:6} ry={i%2?7:5}/>)}</g>
    <g transform={`translate(${p.head.dx * 0.5+yaw*3} ${p.head.dy * 0.5}) rotate(${p.head.tilt} 100 81)`}>
      <path d="M 74 42 Q 43 18 48 45 Q 52 61 77 59 M 124 42 Q 151 18 152 43 Q 149 58 125 59" fill={c.body} {...O} />
      <path d="M 85 34 L 82 4 M 111 34 L 116 4" stroke={OUTLINE} strokeWidth={9} strokeLinecap="round" />
      <path d="M 85 34 L 82 4 M 111 34 L 116 4" stroke={c.body} strokeWidth={5} />
      <circle cx={82} cy={3} r={7} fill={c.accent} {...O}/><circle cx={116} cy={3} r={7} fill={c.accent} {...O}/>
      <ellipse cx={100} cy={59} rx={38} ry={40} fill={c.body} {...O}/>
      <path d="M87 22l4 14M99 22l-1 10M111 23l-3 12" stroke={c.accent} strokeWidth="7" strokeLinecap="round"/>
      {glint('M72 47Q77 32 89 31')}
      <ellipse cx={100} cy={83} rx={28} ry={18} fill="#f0bd70" {...O} strokeWidth={2}/>
      <g transform="translate(30 -15) scale(.7)">{face}</g>
      <circle cx={91} cy={78} r={2} fill={OUTLINE}/><circle cx={109} cy={78} r={2} fill={OUTLINE}/>
    </g>
  </g>;

  if (r.rig === "insect") {
    const bee = r.name === "bee";
    return <g data-species-torso={r.name} transform={torsoTilt}>
      {bee || action==='fly' ? <g fill="#e4f5fc" {...O} strokeWidth={2}>
        {[-1,1].map(s=><g key={s} transform={`rotate(${s * p.armL * .13} ${100+s*40} 140)`}>
          <ellipse cx={100+s*63} cy={115} rx={26} ry={45} transform={`rotate(${s*45} ${100+s*63} 115)`}/>
          <ellipse cx={100+s*59} cy={155} rx={28} ry={17} transform={`rotate(${s*16} ${100+s*59} 155)`}/>
          <path d={`M ${100+s*40} 148 L ${100+s*89} 91 M ${100+s*58} 126 L ${100+s*82} 126`} fill="none" stroke="#88b0bf" strokeWidth={1.5}/>
        </g>)}
      </g> : null}
      {[-1,1].map(s=><g key={s} fill="none" stroke="#39313a" strokeWidth={3} strokeLinecap="round">
        {[145,180,213].map((y,i)=>{
          const gesture=s<0?p.armL:p.armR;
          const lift=(s<0?p.legL:p.legR)*(i===1?-.3:.3);
          return <path key={y} d={`M ${100+s*43} ${y} Q ${100+s*56} ${y+(i-1)*7} ${100+s*61} ${y+(i-1)*14+(i===0 ? -gesture*.15 : lift)}`}/>;
        })}
      </g>)}
      <ellipse cx={100} cy={177} rx={55} ry={66} fill={bee ? c.body : "#d84c46"} {...O}/>
      {glint('M57 169Q59 148 73 140')}
      {bee ? <g fill="#39313a"><path d="M 48 156 Q 100 175 152 156 L 155 174 Q 100 194 45 174 Z M 47 195 Q 100 215 153 195 L 146 215 Q 100 232 54 215 Z"/><path d="M 87 237 L 100 250 L 113 237 Z"/></g>
        : <g fill="#342e37"><path d="M 100 126 L 100 243" stroke="#342e37" strokeWidth={4}/>{[[70,153,10],[128,154,10],[67,184,12],[132,187,11],[79,219,9],[122,219,9]].map(([x,y,size])=><circle key={x} cx={x} cy={y} r={size}/>)}</g>}
      <g transform={headMotion}>
        <g transform={`rotate(${lag*.6} 100 59)`}><path d="M 80 59 Q 79 25 59 25 M 120 59 Q 121 25 141 25" fill="none" stroke="#39313a" strokeWidth={4}/>
        <circle cx={59} cy={25} r={6} fill="#39313a"/><circle cx={141} cy={25} r={6} fill="#39313a"/></g>
        <ellipse cx={100} cy={91} rx={49} ry={45} fill={bee ? c.body : "#40333c"} {...O}/>
        {!bee ? <ellipse cx={100} cy={98} rx={37} ry={30} fill="#f3c5a6"/> : null}
        {face}
      </g>
    </g>;
  }

  if (r.rig === 'whale') {
    const body='M25 132C41 94 77 77 108 86C150 96 157 146 178 181Q188 191 200 187L202 198Q164 220 103 216C53 215 21 195 20 159Q9 153 14 141Q17 134 25 132Z';
    const expression=facialParameters(emotion,performance);
    const smile=160+expression.curve;
    const open=mouthShape==='rest'||mouthShape==='closed'?0:Math.max(0,Math.min(1,mouth+(mouthShape?0:expression.open*.35)));
    return <g data-species-torso={r.name} transform={torsoTilt}>
      <defs>
        <clipPath id={`${uid}-whale`}><path d={body}/></clipPath>
        <linearGradient id={`${uid}-water`} x2=".7" y2="1"><stop stopColor="#bdeaf7"/><stop offset="1" stopColor="#72bfdf"/></linearGradient>
      </defs>
      <g transform={`rotate(${p.tail*.55} 178 193)`}>
        <path d="M165 178Q186 191 199 183C208 171 227 180 229 187Q220 191 210 190C222 191 230 199 222 205Q205 210 190 198L170 203Z" fill={c.body} {...O}/>
      </g>
      <path d={body} fill={c.body}/>
      <g clipPath={`url(#${uid}-whale)`}>
        <path d={`M20 158Q48 ${smile} 79 158C97 195 145 211 202 192Q164 220 103 216C57 217 23 198 20 158Z`} fill={c.belly}/>
        <g fill="none" stroke="#9ac6da" strokeWidth="1.3">
          <path d="M27 164Q29 198 69 211M43 168Q48 201 90 215M60 168Q70 205 112 216"/>
          <path d="M77 164Q94 201 142 211"/>
        </g>
        {open>.03?<path d={`M20 158Q48 ${smile} 79 158Q60 ${176+open*23} 27 ${166+open*7}Z`} fill="#635174"/>:null}
        {open>.15?<path d={`M39 ${169+open*5}Q49 ${166+open*8} 62 ${173+open*5}Q49 ${181+open*8} 39 ${169+open*5}Z`} fill="#df9fbc"/>:null}
      </g>
      {/* Leave the tail joint open; its overlapping root supplies the contour. */}
      <path d="M200 187Q188 191 178 181C157 146 150 96 108 86C77 77 41 94 25 132Q17 134 14 141Q9 153 20 159C21 195 53 215 103 216Q164 220 202 198" fill="none" {...O}/>
      <path d={`M20 158Q48 ${smile} 79 158`} fill="none" stroke="#507d9d" strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M78 156l2 3" fill="none" stroke="#507d9d" strokeWidth="1.6" strokeLinecap="round"/>
      {glint('M35 125Q49 102 74 98')}
      <g transform={`rotate(${(action==='wave'||action==='point'?p.armR:p.armL)*.23} 112 185)`}>
        <path d="M105 181Q104 213 127 227Q154 244 143 215Q134 191 122 185Z" fill={c.body}/>
        <path d="M105 181Q104 213 127 227Q154 244 143 215Q134 191 122 185" fill="none" {...O}/>
      </g>
      <g transform={`translate(${-16+p.head.dx*.18} ${46+p.head.dy*.15})`}>{face}</g>
      <path d="M91 88q6 5 12 0" fill="none" stroke="#507d9d" strokeWidth="2" strokeLinecap="round"/>
      <g fill={`url(#${uid}-water)`}>
        <path d="M98 76C100 60 89 48 92 38C94 25 108 29 108 39C108 49 101 61 98 76ZM94 79C85 62 68 62 70 53C72 41 87 49 91 59ZM102 79C111 55 114 42 125 47C141 57 118 60 102 79Z"/>
        <path d="M96 36q2 -4 5 -1M74 51q3 -1 5 1M120 49q3 -1 4 2" fill="none" stroke="#e5f8ff" strokeWidth="1.8" strokeLinecap="round"/>
      </g>
    </g>;
  }

  if (r.rig === "fish") {
    return <g data-species-torso={r.name} transform={torsoTilt}>
      <g transform={`rotate(${p.tail} 169 151)`}>
        <path d="M 163 150 Q 189 119 210 115 Q 222 129 204 149 Q 222 171 211 190 Q 189 184 163 162 Z" fill={c.limb} {...O}/>
        <path d="M 174 151 L 207 124 M 175 155 L 205 150 M 174 160 L 208 180" fill="none" stroke={c.belly} strokeWidth={2}/>
      </g>
      <path d="M 73 107 Q 85 72 108 79 Q 125 86 129 112 M 89 191 Q 98 215 117 213 L 127 187" fill={c.limb} {...O}/>
      <path d="M176 151C153 118 124 94 85 99Q41 99 23 137Q10 148 23 160C37 194 87 207 124 188Q153 174 176 151Z" fill={c.body} {...O}/>
      {glint('M39 137Q55 113 82 116')}
      <path d="M 28 164 Q 78 193 145 171 Q 96 213 45 183 Z" fill={c.belly}/>
      <g fill="#ffe2b1" stroke="none"><path d="M76 103Q109 143 76 194L92 197Q128 149 95 100Z M125 110Q150 149 126 187L141 178Q159 149 144 123Z"/></g>
      <g transform={`rotate(${(action==='wave'||action==='point'?p.armR:p.armL)*.4} 104 172)`}><path d="M 98 151 Q 128 152 115 176 Q 97 187 94 168 Z" fill={c.limb} {...O}/></g>
      <g transform={`translate(${-40+p.head.dx*.25} ${37+p.head.dy*.2}) rotate(${p.head.tilt*.2} 60 132)`}>{face}</g>
    </g>;
  }

  if (r.rig === "star") {
    const left=Math.max(-22,Math.min(25,(p.armL-8)*.18));
    const right=Math.max(-22,Math.min(25,(p.armR-8)*.18));
    return <g data-species-torso={r.name} transform={torsoTilt}>
      <path d={`M89 78Q100 55 111 78L129 119L175 ${124-right}Q194 ${127-right} 181 ${142-right}L147 174L153 ${220+p.legR}Q155 ${240+p.legR} 137 ${231+p.legR}L100 208L63 ${231+p.legL}Q45 ${240+p.legL} 47 ${220+p.legL}L53 174L19 ${142-left}Q6 ${127-left} 25 ${124-left}L71 119Z`} fill={c.body} {...O}/>
      {glint('M95 85L82 120M33 133L67 132')}
      <g transform={`translate(${p.head.dx*.25} ${51+p.head.dy*.25})`}>{face}</g>
      <path d="M72 195l3 3m48 -1l3 -3" stroke={c.accent} strokeWidth="2" opacity=".45"/>
    </g>;
  }

  if (r.rig === "snowman") return <g data-species-torso={r.name} transform={torsoTilt}>
    <g fill="none" stroke="#77503a" strokeWidth={7} strokeLinecap="round">
      {[-1,1].map(s=><g key={s} transform={`rotate(${s*(s<0?p.armL:p.armR)*.6} ${100+s*44} 173)`}><path d={`M ${100+s*44} 180 L ${100+s*72} 159 L ${100+s*79} 135 M ${100+s*72} 159 L ${100+s*93} 155 M ${100+s*72} 159 L ${100+s*94} 141`}/></g>)}
    </g>
    <ellipse cx={100} cy={191} rx={64} ry={59} fill="#f7fbff" {...O}/>
    {glint('M53 201Q54 178 76 168')}
    <path d="M 59 218 Q 100 250 143 218" fill="none" stroke="#d8e5ef" strokeWidth={5}/>
    {[192,222].map(y=><circle key={y} cx={100} cy={y} r={6} fill="#493b3b"/>)}
    {/* The snowballs overlap at the neck. The collar shares the head's neck
        pivot; only the free scarf end gets cloth follow-through. */}
    <g data-snowman-neck transform={`translate(${p.head.dx*.35+yaw*2} ${p.head.dy*.25}) rotate(${p.head.tilt*.7} 100 155)`}>
      <ellipse cx="100" cy="150" rx="45" ry="14" fill="#b94f62" {...O}/>
      <circle cx={100} cy={105} r={56} fill="#f7fbff" {...O}/>
      <g transform="translate(0 6)">{face}
        <g data-carrot-nose transform={`translate(${yaw*11.52} 0) translate(100 0) scale(${1-Math.abs(yaw)*.09} 1) translate(-100 0)`}>
          <defs><radialGradient id={`${uid}-carrot`} cx=".3" cy=".25" r=".8"><stop stopColor="#ffd27b"/><stop offset=".55" stopColor="#f4a341"/><stop offset="1" stopColor="#e78b35"/></radialGradient></defs>
          <path d="M93 106C92 101 97 98 102 99C109 100 113 107 109 112L105 118Q103 121 100 117C97 114 94 109 93 106Z" fill={`url(#${uid}-carrot)`} stroke="#cb863f" strokeWidth="1.1" strokeLinejoin="round"/>
          <path d="M100 104l4 3m-5 3l4 3" fill="none" stroke="#d18a37" strokeWidth=".8" strokeLinecap="round"/>
          <path d="M96 103q1 -2 4 -1" fill="none" stroke="#ffe4a2" strokeWidth="1.8" strokeLinecap="round"/>
        </g>
      </g>
      <g data-scarf-end transform={`rotate(${p.secondary?.cloth??0} 128 160)`}>
        <path d="M117 155L138 154L143 199Q134 204 121 203Z" fill="#cd626d" {...O}/>
        <path d="M122 174l17 -2m-16 14l17 -2m-16 13l17 -2m-17 8v5m7 -5v5m7 -7v5" fill="none" stroke="#ebaaa2" strokeWidth="1.5"/>
      </g>
      <path d="M59 143Q100 167 141 143Q148 148 141 160Q100 182 59 160Q52 149 59 143Z" fill="#cd626d" {...O}/>
      <path d="M63 149l-1 12m14 -7v13m15 -9v13m15 -13v13m14 -15v12m13 -17v11" fill="none" stroke="#ebaaa2" strokeWidth="1.5"/>
    </g>
  </g>;

  if (r.rig === "frog") return <g data-species-torso={r.name} transform={torsoTilt}>
    {[-1,1].map(s=><g key={s} transform={`${plantedFeet} translate(${s<0?p.legXL:p.legXR} ${s<0?p.legL:p.legR})`}>
      <ellipse cx={100+s*51} cy={212} rx={27} ry={32} transform={`rotate(${s*35} ${100+s*51} 212)`} fill={c.body} {...O}/>
      <path d="M-10 -4Q6 -9 22 -5Q36 -12 39 -4Q40 0 28 5Q45 4 42 12Q41 17 25 14Q37 22 29 24Q22 26 9 15Q0 19 -10 13Z" transform={`translate(${100+s*46} 230) scale(${s} 1)`} fill={c.body} {...O}/>
    </g>)}
    <ellipse cx={100} cy={192} rx={45} ry={48} fill={c.body} {...O}/><ellipse cx={100} cy={196} rx={31} ry={37} fill={c.belly}/>
    {[-1,1].map(s=><g key={s} transform={`translate(${100+s*31} 181) rotate(${-s*(s<0?p.armL:p.armR)*.55}) scale(${s} 1)`}><path d="M-7 -3Q-12 18 -9 48L-19 61Q-21 69 -13 68L-4 60L-3 69Q3 76 8 69L8 61L17 68Q26 69 23 61L13 49Q16 22 10 -4Q1 -12 -7 -3Z" fill={c.body} {...O}/></g>)}
    <g transform={headMotion}>
      <path d="M 39 105 C 28 75 56 56 76 72 Q 100 82 124 72 C 144 56 172 75 161 105 Q 183 151 100 159 Q 17 151 39 105 Z" fill={c.body} {...O}/>
      <ellipse cx={100} cy={129} rx={58} ry={24} fill={c.belly} opacity={.5}/>
      {glint('M45 93Q44 79 56 77')}
      {face}<circle cx={90} cy={116} r={2} fill={OUTLINE}/><circle cx={110} cy={116} r={2} fill={OUTLINE}/>
      <g fill={c.accent}><circle cx={45} cy={120} r={4}/><circle cx={53} cy={111} r={3}/><circle cx={153} cy={122} r={4}/></g>
    </g>
  </g>;

  // Reptiles: broad jaws, strong hind legs, tapering tails, and bat wings for the dragon.
  const dragon = r.name === "dragon";
  return <g data-species-torso={r.name} transform={torsoTilt}>
    <g transform={`rotate(${p.tail*.6} 139 207)`}>
      <path d="M 127 188 Q 183 220 204 145 Q 222 203 183 222 Q 154 237 127 220 Z" fill={c.body} {...O}/>
      <path d="M 179 201 L 191 184 L 195 200 M 194 181 L 203 162 L 206 182" fill={c.accent} {...O} strokeWidth={2}/>
    </g>
    {dragon ? [-1,1].map(s=><g key={s} transform={`translate(100 0) scale(${s} 1) rotate(${(s<0?p.armL:p.armR)*(action==='fly'?.35:.1)} 48 149)`}>
      <path d="M43 159Q52 111 103 105L87 144Q66 133 63 165Q52 149 43 176Z" fill="#f2be78" {...O}/>
      <path d="M 43 166 L 103 105 M 63 165 L 103 105" fill="none" stroke="#64894d" strokeWidth={3}/>
    </g>) : null}
    <ellipse cx={101} cy={192} rx={49} ry={48} fill={c.body} {...O}/>
    <ellipse cx={102} cy={195} rx={30} ry={37} fill={c.belly}/>
    {[-1,1].map(s=><g key={s} transform={`${plantedFeet} translate(${s<0?p.legXL:p.legXR} ${s<0?p.legL:p.legR}) rotate(${s<0?p.legSwL:p.legSwR} ${100+s*30} 220)`}>
      <path d={`M ${100+s*24} 205 Q ${100+s*50} 207 ${100+s*49} 240 Q ${100+s*50} 252 ${100+s*19} 248 L ${100+s*13} 237 Z`} fill={c.body} {...O}/>
      {[22,32,42].map(x=><path key={x} d={`M ${100+s*x} 246 l ${s*2} -7 l ${s*5} 8 Z`} fill="#f5e6b7" stroke={OUTLINE} strokeWidth={1}/>) }
    </g>)}
    <g transform={headMotion}>
      {dragon?[-1,1].map(s=><g key={s} transform={`translate(100 0) scale(${s} 1) rotate(${lag*.5} 49 84)`}><path d="M46 69L72 54L69 73L80 83L65 89L68 106L45 101Z" fill={c.body} {...O}/><path d="M51 75l13 -8l-3 14l11 4l-13 4l2 10l-11 -5Z" fill={c.belly}/></g>):null}
      {dragon ? <g fill="#eee0b8" {...O}><path d="M 52 67 Q 40 48 49 24 Q 50 47 68 52 Z M 132 53 Q 153 45 151 24 Q 166 48 150 67 Z"/></g> : <path d="M 81 63 L 88 37 L 102 56 L 112 34 L 126 57 L 139 43 L 144 72" fill={c.accent} {...O}/>}
      <path d={dragon ? "M 100 49 C 142 49 156 71 155 104 Q 167 147 100 155 Q 33 147 45 104 C 44 71 58 49 100 49 Z" : "M 91 55 C 130 44 155 65 151 99 Q 155 135 120 145 L 54 142 Q 24 140 24 116 Q 22 91 52 89 L 59 73 Q 69 57 91 55 Z"} fill={c.body} {...O}/>
      {dragon?<><path d="M93 57Q82 46 99 25Q99 45 109 52Q113 65 101 70Z" fill={c.accent} {...O}/><ellipse cx="101" cy="79" rx="7" ry="5" fill={c.accent}/></>:null}
      {glint(dragon?'M57 86Q58 65 79 62':'M66 84Q68 66 89 64')}
      <path d={dragon ? "M 57 115 Q 100 95 143 115 Q 151 147 100 147 Q 49 147 57 115 Z" : "M 31 117 Q 74 127 139 113 Q 140 143 97 143 L 53 139 Q 29 135 31 117 Z"} fill={dragon?c.body:c.belly}/>
      {face}
      <circle cx={dragon?87:40} cy={dragon?115:108} r={2.5} fill={OUTLINE}/><circle cx={dragon?113:55} cy={dragon?115:106} r={2.5} fill={OUTLINE}/>
      <g fill={c.accent} opacity={.7}><circle cx={137} cy={109} r={4}/><circle cx={142} cy={98} r={3}/><circle cx={126} cy={68} r={3}/></g>
    </g>
    {[-1,1].map(s=><g key={s} transform={`rotate(${s*(s<0?p.armL:p.armR)} ${100+s*38} 172)`}><path d={`M ${100+s*38} 166 Q ${100+s*57} 178 ${100+s*41} 197 L ${100+s*27} 190 Q ${100+s*32} 179 ${100+s*28} 174 Z`} fill={c.body} {...O}/><path d={`M ${100+s*30} 187 l ${s*4} 5 M ${100+s*36} 190 l ${s*3} 5`} stroke={OUTLINE} strokeWidth={1.5}/></g>)}
  </g>;
};
