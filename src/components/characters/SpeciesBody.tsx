import React from "react";
import type { CharacterRecipe } from "./recipe";
import type { Pose } from "./pose";
import { OUTLINE } from "./Face";

const O = { stroke: OUTLINE, strokeWidth: 3, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

/** Species with anatomy that cannot be assembled from the upright mammal body. */
export const SPECIES_RIGS = new Set(["quadruped", "insect", "snowman", "frog", "fish", "whale", "star", "tRex", "longNeck"]);

export const SpeciesBody: React.FC<{
  recipe: CharacterRecipe; pose: Pose; face: React.ReactNode;
  headFront: React.ReactNode; clothes: React.ReactNode;
}> = ({ recipe: r, pose: p, face, headFront, clothes }) => {
  const c = r.colors;
  const headMotion = `translate(${p.head.dx} ${p.head.dy}) rotate(${p.head.tilt} 100 145)`;
  const hoof = (x: number, back: boolean, index: number) => {
    const lift = index % 2 ? p.legR : p.legL;
    const swing = (index % 2 ? p.legSwR : p.legSwL) + (!back && index === 0 ? Math.max(0, p.armR - 35) * .85 : 0);
    return <g key={x} transform={`translate(0 ${lift * 0.5}) rotate(${swing * 0.65} ${x} 186)`}>
      <path d={`M ${x - 8} 185 Q ${x - 13} 216 ${x - 9} 244 L ${x + 9} 244 L ${x + 8} 186 Z`} fill={back ? c.accent : c.body} {...O} />
      <path d={`M ${x - 9} 233 L ${x + 9} 233 L ${x + 10} 247 Q ${x} 251 ${x - 11} 247 Z`} fill={c.limb} {...O} />
    </g>;
  };

  if (r.rig === "quadruped") {
    const zebra = r.name === "zebra", unicorn = r.name === "unicorn";
    return <g>
      <g transform={`rotate(${p.tail * 0.7} 184 164)`}>
        <path d="M 181 160 C 222 151 208 188 217 212 Q 194 211 193 184 Q 195 174 181 178 Z" fill={c.accent} {...O} />
        <path d="M 193 168 Q 206 177 204 197" fill="none" stroke={unicorn ? "#eda6d3" : c.belly} strokeWidth={4} />
      </g>
      {hoof(105, true, 1)}{hoof(176, true, 0)}
      <ellipse cx={132} cy={174} rx={64} ry={40} fill={c.body} {...O} />
      <path d="M 73 181 C 46 157 61 125 53 109 L 82 84 Q 109 126 106 167 Z" fill={c.body} {...O} />
      {zebra ? <g fill={c.accent}>
        <path d="M 112 135 L 119 169 L 126 141 Z M 134 135 L 139 183 L 150 137 Z M 158 141 L 162 187 L 173 148 Z M 186 163 L 173 190 L 193 178 Z M 83 134 L 101 139 L 98 147 L 80 144 Z" />
      </g> : <path d="M 113 197 Q 150 211 179 187" fill="none" stroke={c.belly} strokeWidth={8} strokeLinecap="round" />}
      {hoof(84, false, 0)}{hoof(154, false, 1)}
      {!zebra ? <g>
        <path d="M 115 144 Q 140 153 168 145 L 170 179 Q 141 191 113 180 Z" fill={unicorn ? "#dc91c2" : "#428c7e"} {...O} />
        <path d="M 118 152 Q 140 160 164 152 L 164 174 Q 140 184 119 175 Z" fill="none" stroke="#f5d78f" strokeWidth={3} strokeDasharray="3 4" />
      </g> : null}
      <g transform={`translate(${p.head.dx * 0.5} ${p.head.dy * 0.5}) rotate(${p.head.tilt} 77 130)`}>
        <path d="M 77 66 Q 116 78 103 113 L 115 133 L 97 131 L 103 145 L 87 136 Q 93 101 77 66 Z" fill={c.accent} {...O} />
        <path d="M 49 77 Q 35 50 47 38 Q 64 48 65 73 M 74 69 Q 70 47 83 39 Q 92 61 84 77" fill={c.body} {...O} />
        <path d="M 48 50 L 55 68 M 82 50 L 79 67" stroke={unicorn ? "#e7a5c9" : c.belly} strokeWidth={5} strokeLinecap="round" />
        {unicorn ? <g><path d="M 55 68 L 61 16 L 72 66 Z" fill="#f4d184" {...O} /><path d="M 59 48 L 68 44 M 60 35 L 65 33" stroke="#ab8546" strokeWidth={2} /></g> : null}
        <path d="M 65 66 C 87 60 102 77 97 97 Q 96 112 79 121 L 60 136 Q 40 146 28 133 Q 20 122 36 107 L 43 86 Q 45 71 65 66 Z" fill={c.body} {...O} />
        <path d="M 37 108 Q 49 114 61 125 Q 56 146 32 135 Q 19 124 37 108 Z" fill={zebra ? "#5b5662" : c.belly} {...O} strokeWidth={2} />
        <path d="M 64 64 Q 86 57 94 79 Q 78 74 77 87 Q 64 81 64 64 Z" fill={c.accent} {...O} />
        {zebra ? <path d="M 49 88 L 57 96 L 43 98 M 85 91 L 80 106 L 93 100" fill={c.accent} /> : null}
        <g transform="translate(-32 0)">{face}</g>
        <circle cx={34} cy={122} r={2.5} fill={OUTLINE} />
      </g>
    </g>;
  }

  if (r.rig === "longNeck") return <g>
    <path d="M 148 197 Q 188 205 177 155" fill="none" stroke={OUTLINE} strokeWidth={6} />
    <path d="M 171 150 Q 183 135 185 154 Q 181 166 175 164 Z" fill={c.accent} {...O} />
    {[73, 95, 123, 145].map((x, i) => hoof(x, i % 2 === 1, i))}
    <ellipse cx={110} cy={183} rx={49} ry={36} fill={c.body} {...O} />
    <path d="M 77 181 L 81 73 Q 96 63 111 75 L 120 183 Z" fill={c.body} {...O} />
    <g fill={c.accent}>{[[92,99],[100,126],[93,154],[76,177],[124,174],[143,187],[110,199]].map(([x,y],i)=><path key={i} d={`M ${x-7} ${y-6} l 10 -2 l 6 8 l -6 9 l -10 -4 Z`} />)}</g>
    <g transform={`translate(${p.head.dx * 0.5} ${p.head.dy * 0.5}) rotate(${p.head.tilt} 100 81)`}>
      <path d="M 74 42 Q 43 18 48 45 Q 52 61 77 59 M 124 42 Q 151 18 152 43 Q 149 58 125 59" fill={c.body} {...O} />
      <path d="M 85 34 L 82 4 M 111 34 L 116 4" stroke={OUTLINE} strokeWidth={9} strokeLinecap="round" />
      <path d="M 85 34 L 82 4 M 111 34 L 116 4" stroke={c.body} strokeWidth={5} />
      <circle cx={82} cy={3} r={7} fill={c.accent} {...O}/><circle cx={116} cy={3} r={7} fill={c.accent} {...O}/>
      <ellipse cx={100} cy={59} rx={38} ry={40} fill={c.body} {...O}/>
      <ellipse cx={100} cy={81} rx={28} ry={18} fill={c.belly} {...O} strokeWidth={2}/>
      <g transform="translate(30 -15) scale(.7)">{face}</g>
      <circle cx={91} cy={78} r={2} fill={OUTLINE}/><circle cx={109} cy={78} r={2} fill={OUTLINE}/>
    </g>
    <path d="M 78 115 Q 96 126 114 115" fill="none" stroke="#bf6250" strokeWidth={5} strokeDasharray="3 4" />
  </g>;

  if (r.rig === "insect") {
    const bee = r.name === "bee";
    return <g>
      {bee ? <g fill="#e4f5fc" {...O} strokeWidth={2}>
        {[-1,1].map(s=><g key={s} transform={`rotate(${s * p.armL * .13} ${100+s*40} 140)`}>
          <ellipse cx={100+s*63} cy={115} rx={26} ry={45} transform={`rotate(${s*45} ${100+s*63} 115)`}/>
          <ellipse cx={100+s*59} cy={155} rx={28} ry={17} transform={`rotate(${s*16} ${100+s*59} 155)`}/>
          <path d={`M ${100+s*40} 148 L ${100+s*89} 91 M ${100+s*58} 126 L ${100+s*82} 126`} fill="none" stroke="#88b0bf" strokeWidth={1.5}/>
        </g>)}
      </g> : null}
      {[-1,1].map(s=><g key={s} fill="none" stroke="#39313a" strokeWidth={6} strokeLinecap="round">
        {[145,180,213].map((y,i)=><path key={y} d={`M ${100+s*43} ${y} L ${100+s*68} ${y+(i-1)*13} L ${100+s*76} ${y+(i-1)*25+(i===0 ? -p.armL*.15 : p.legL*.3)}`}/>)}
      </g>)}
      <ellipse cx={100} cy={177} rx={55} ry={66} fill={bee ? c.body : "#d84c46"} {...O}/>
      {bee ? <g fill="#39313a"><path d="M 48 156 Q 100 175 152 156 L 155 174 Q 100 194 45 174 Z M 47 195 Q 100 215 153 195 L 146 215 Q 100 232 54 215 Z"/><path d="M 87 237 L 100 250 L 113 237 Z"/></g>
        : <g fill="#342e37"><path d="M 100 126 L 100 243" stroke="#342e37" strokeWidth={4}/>{[[70,153,10],[128,154,10],[67,184,12],[132,187,11],[79,219,9],[122,219,9]].map(([x,y,size])=><circle key={x} cx={x} cy={y} r={size}/>)}</g>}
      <g transform={headMotion}>
        <path d="M 80 59 Q 79 25 59 25 M 120 59 Q 121 25 141 25" fill="none" stroke="#39313a" strokeWidth={4}/>
        <circle cx={59} cy={25} r={6} fill="#39313a"/><circle cx={141} cy={25} r={6} fill="#39313a"/>
        <ellipse cx={100} cy={91} rx={49} ry={45} fill={bee ? c.body : "#40333c"} {...O}/>
        {!bee ? <ellipse cx={100} cy={98} rx={37} ry={30} fill="#f3c5a6"/> : null}
        {face}
      </g>
    </g>;
  }

  if (r.rig === "fish" || r.rig === "whale") {
    const whale = r.rig === "whale";
    return <g>
      <g transform={`rotate(${p.tail} 169 151)`}>
        <path d={whale ? "M 164 150 Q 192 148 199 117 Q 218 107 212 131 Q 203 151 219 172 Q 204 190 184 164 L 164 169 Z" : "M 163 150 Q 189 119 210 115 Q 222 129 204 149 Q 222 171 211 190 Q 189 184 163 162 Z"} fill={c.limb} {...O}/>
        {!whale ? <path d="M 174 151 L 207 124 M 175 155 L 205 150 M 174 160 L 208 180" fill="none" stroke={c.belly} strokeWidth={2}/> : null}
      </g>
      {!whale ? <path d="M 73 107 Q 85 72 108 79 Q 125 86 129 112 M 89 191 Q 98 215 117 213 L 127 187" fill={c.limb} {...O}/> : null}
      <path d={whale ? "M 176 143 C 155 113 135 100 92 101 C 46 101 20 123 20 149 C 22 194 84 211 128 188 Q 153 173 178 167 Z" : "M 176 151 C 145 109 111 93 73 105 Q 32 114 21 146 Q 13 152 23 158 C 36 190 77 207 112 193 Q 150 180 176 151 Z"} fill={c.body} {...O}/>
      <path d={whale ? "M 26 161 Q 80 184 160 166 Q 104 221 47 185 Z" : "M 28 164 Q 78 193 145 171 Q 96 213 45 183 Z"} fill={c.belly}/>
      {whale ? <g fill="none" stroke="#6595ae" strokeWidth={2}><path d="M 36 168 Q 73 194 119 185 M 43 176 Q 73 198 98 192"/></g> : <g fill="none" stroke={c.limb} strokeWidth={2} opacity={.55}>{[91,109,127,145].map((x,i)=><path key={x} d={`M ${x} ${119+i*4} q 12 10 0 20 q 12 10 0 20`}/>)}</g>}
      <g transform={`rotate(${p.armL*.2} 104 172)`}><path d={whale ? "M 94 163 Q 112 163 135 196 Q 137 220 114 207 Q 97 192 94 163 Z" : "M 98 151 Q 128 152 115 176 Q 97 187 94 168 Z"} fill={c.limb} {...O}/></g>
      <g transform="translate(-40 37)">{face}</g>
      {whale ? <g stroke="#83c8e1" fill="none" strokeWidth={5} strokeLinecap="round"><path d="M 77 104 Q 73 77 59 72 M 77 103 Q 83 72 94 75"/><circle cx={56} cy={67} r={4}/><circle cx={96} cy={69} r={3}/></g> : null}
    </g>;
  }

  if (r.rig === "star") return <g>
    <path d="M 100 66 Q 104 61 108 71 L 126 120 L 180 123 Q 195 124 183 135 L 143 169 L 155 222 Q 158 237 145 229 L 100 201 L 55 229 Q 42 237 45 222 L 57 169 L 17 135 Q 5 124 20 123 L 74 120 L 92 71 Q 96 61 100 66 Z" fill={c.body} {...O}/>
    <path d="M 100 86 L 119 132 L 168 134 L 132 164 L 142 210 L 100 186 L 58 210 L 68 164 L 32 134 L 81 132 Z" fill="none" stroke={c.belly} strokeWidth={3} strokeDasharray="2 5"/>
    <g transform="translate(0 51)">{face}</g>
  </g>;

  if (r.rig === "snowman") return <g>
    <g fill="none" stroke="#77503a" strokeWidth={7} strokeLinecap="round">
      {[-1,1].map(s=><g key={s} transform={`rotate(${s*(s<0?p.armL:p.armR)*.6} ${100+s*44} 173)`}><path d={`M ${100+s*44} 180 L ${100+s*72} 159 L ${100+s*79} 135 M ${100+s*72} 159 L ${100+s*93} 155 M ${100+s*72} 159 L ${100+s*94} 141`}/></g>)}
    </g>
    <ellipse cx={100} cy={201} rx={59} ry={49} fill="#f7fbff" {...O}/>
    <path d="M 59 218 Q 100 250 143 218" fill="none" stroke="#d8e5ef" strokeWidth={5}/>
    {[187,207,226].map(y=><circle key={y} cx={100} cy={y} r={5} fill="#493b3b"/>)}
    <g transform={headMotion}><circle cx={100} cy={99} r={56} fill="#f7fbff" {...O}/>{headFront}</g>
    {clothes}
  </g>;

  if (r.rig === "frog") return <g>
    {[-1,1].map(s=><g key={s} transform={`translate(0 ${s<0?p.legL:p.legR})`}>
      <ellipse cx={100+s*51} cy={212} rx={27} ry={32} transform={`rotate(${s*35} ${100+s*51} 212)`} fill={c.body} {...O}/>
      <path d={`M ${100+s*38} 234 L ${100+s*79} 229 L ${100+s*67} 241 L ${100+s*83} 247 L ${100+s*55} 245 L ${100+s*45} 253 L ${100+s*28} 245 Z`} fill={c.belly} {...O}/>
    </g>)}
    <ellipse cx={100} cy={192} rx={45} ry={48} fill={c.body} {...O}/><ellipse cx={100} cy={196} rx={31} ry={37} fill={c.belly}/>
    {[-1,1].map(s=><g key={s} transform={`rotate(${s*(s<0?p.armL:p.armR)*.4} ${100+s*31} 181)`}><path d={`M ${100+s*34} 177 L ${100+s*28} 232 M ${100+s*28} 229 L ${100+s*18} 244 M ${100+s*28} 229 L ${100+s*29} 247 M ${100+s*28} 229 L ${100+s*40} 243`} fill="none" stroke={OUTLINE} strokeWidth={10} strokeLinecap="round"/><path d={`M ${100+s*34} 177 L ${100+s*28} 232 M ${100+s*28} 229 L ${100+s*18} 244 M ${100+s*28} 229 L ${100+s*29} 247 M ${100+s*28} 229 L ${100+s*40} 243`} fill="none" stroke={c.body} strokeWidth={6} strokeLinecap="round"/></g>)}
    <g transform={headMotion}>
      <path d="M 39 105 C 28 75 56 56 76 72 Q 100 82 124 72 C 144 56 172 75 161 105 Q 183 151 100 159 Q 17 151 39 105 Z" fill={c.body} {...O}/>
      <ellipse cx={100} cy={129} rx={58} ry={24} fill={c.belly} opacity={.5}/>
      {face}<circle cx={90} cy={116} r={2} fill={OUTLINE}/><circle cx={110} cy={116} r={2} fill={OUTLINE}/>
      <g fill={c.accent}><circle cx={45} cy={120} r={4}/><circle cx={53} cy={111} r={3}/><circle cx={153} cy={122} r={4}/></g>
    </g>
  </g>;

  // Reptiles: broad jaws, strong hind legs, tapering tails, and bat wings for the dragon.
  const dragon = r.name === "dragon";
  return <g>
    <g transform={`rotate(${p.tail*.6} 139 207)`}>
      <path d="M 127 188 Q 183 220 204 145 Q 222 203 183 222 Q 154 237 127 220 Z" fill={c.body} {...O}/>
      <path d="M 179 201 L 191 184 L 195 200 M 194 181 L 203 162 L 206 182" fill={c.accent} {...O} strokeWidth={2}/>
    </g>
    {dragon ? [-1,1].map(s=><g key={s} transform={`translate(100 0) scale(${s} 1) rotate(${p.armL*.1} 48 149)`}>
      <path d="M 43 159 Q 52 111 103 105 L 87 144 Q 66 133 63 165 Q 52 149 43 176 Z" fill="#e7ca77" {...O}/>
      <path d="M 43 166 L 103 105 M 63 165 L 103 105" fill="none" stroke="#64894d" strokeWidth={3}/>
    </g>) : null}
    <ellipse cx={101} cy={192} rx={49} ry={48} fill={c.body} {...O}/>
    <ellipse cx={102} cy={195} rx={30} ry={37} fill={c.belly}/>
    {dragon ? <path d="M 78 181 L 128 181 M 73 196 L 132 196 M 77 211 L 127 211" stroke="#ac985c" fill="none" strokeWidth={2}/> : null}
    {[-1,1].map(s=><g key={s} transform={`translate(0 ${s<0?p.legL:p.legR}) rotate(${s<0?p.legSwL:p.legSwR} ${100+s*30} 220)`}>
      <path d={`M ${100+s*24} 205 Q ${100+s*50} 207 ${100+s*49} 240 Q ${100+s*50} 252 ${100+s*19} 248 L ${100+s*13} 237 Z`} fill={c.body} {...O}/>
      {[22,32,42].map(x=><path key={x} d={`M ${100+s*x} 246 l ${s*2} -7 l ${s*5} 8 Z`} fill="#f5e6b7" stroke={OUTLINE} strokeWidth={1}/>) }
    </g>)}
    <g transform={headMotion}>
      {dragon ? <g fill="#eee0b8" {...O}><path d="M 52 67 Q 40 48 49 24 Q 50 47 68 52 Z M 132 53 Q 153 45 151 24 Q 166 48 150 67 Z"/></g> : <path d="M 81 63 L 88 37 L 102 56 L 112 34 L 126 57 L 139 43 L 144 72" fill={c.accent} {...O}/>}
      <path d={dragon ? "M 100 49 C 142 49 156 71 155 104 Q 167 147 100 155 Q 33 147 45 104 C 44 71 58 49 100 49 Z" : "M 91 55 C 130 44 155 65 151 99 Q 155 135 120 145 L 54 142 Q 24 140 24 116 Q 22 91 52 89 L 59 73 Q 69 57 91 55 Z"} fill={c.body} {...O}/>
      <path d={dragon ? "M 57 115 Q 100 95 143 115 Q 151 147 100 147 Q 49 147 57 115 Z" : "M 31 117 Q 74 127 139 113 Q 140 143 97 143 L 53 139 Q 29 135 31 117 Z"} fill={c.belly}/>
      {face}
      <circle cx={dragon?87:40} cy={dragon?115:108} r={2.5} fill={OUTLINE}/><circle cx={dragon?113:55} cy={dragon?115:106} r={2.5} fill={OUTLINE}/>
      <g fill={c.accent} opacity={.7}><circle cx={137} cy={109} r={4}/><circle cx={142} cy={98} r={3}/><circle cx={126} cy={68} r={3}/></g>
    </g>
    {[-1,1].map(s=><g key={s} transform={`rotate(${s*(s<0?p.armL:p.armR)} ${100+s*38} 172)`}><path d={`M ${100+s*38} 166 Q ${100+s*57} 178 ${100+s*41} 197 L ${100+s*27} 190 Q ${100+s*32} 179 ${100+s*28} 174 Z`} fill={c.body} {...O}/><path d={`M ${100+s*30} 187 l ${s*4} 5 M ${100+s*36} 190 l ${s*3} 5`} stroke={OUTLINE} strokeWidth={1.5}/></g>)}
  </g>;
};
