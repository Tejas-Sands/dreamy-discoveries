import React from "react";
import {rand} from "../../lib/random";

/** Preserve each setting's hue while easing saturated colors toward paper tones. */
export const sceneryColor = (value: string): string => {
  if (!/^#[\da-f]{6}$/i.test(value)) return value;
  const n = parseInt(value.slice(1), 16);
  const channels = [n >> 16, (n >> 8) & 255, n & 255];
  const gray = channels[0] * .3 + channels[1] * .59 + channels[2] * .11;
  return "#" + channels.map((c,i) => Math.round((c * .76 + gray * .24) * .76 + [247,233,225][i] * .24).toString(16).padStart(2,"0")).join("");
};

const GREEN = new Set(["meadow","forest","farm","garden","park","jungle","pond","playground","castle","rainy","mountain"]);
const INDOORS = new Set(["bedroom","kitchen"]);

/** Painted distance sits behind the recipe's original scenery. */
export const StorybookDistance: React.FC<{kind:string}> = ({kind}) => {
  if (GREEN.has(kind) || kind === "autumn") return <g opacity=".48">
    <path d="M0 615Q260 438 535 602Q860 451 1170 610Q1530 420 1920 580V1080H0Z" fill={kind === "autumn" ? "#d9b8b6" : "#b9c9cf"}/>
    <path d="M0 679Q310 522 667 673Q1030 504 1390 670Q1710 557 1920 618V1080H0Z" fill={kind === "autumn" ? "#d8c3a7" : "#bfd2c2"}/>
    {Array.from({length:22},(_,i) => {
      const x = rand(i+12)*1920, y=570+rand(i+32)*90, h=35+rand(i+72)*70;
      return <g key={i} fill={kind === "autumn" ? "#c4aab1" : "#a3bcb9"}><path d={`M${x-3} ${y+65}v-${h}h6v${h}Z`}/><ellipse cx={x} cy={y-h*.4} rx={h*.4} ry={h*.58}/></g>;
    })}
  </g>;
  if (kind === "space" || kind === "night" || kind === "campfire") return <g>
    {Array.from({length:180},(_,i) => <circle key={i} cx={rand(i+700)*1920} cy={rand(i+900)*760} r={.7+rand(i+1000)*1.6} fill="#f7e8d8" opacity={.18+rand(i+1200)*.35}/>) }
    {kind === "space" ? <g fill="none" stroke="#d7c7e5" strokeWidth="1.5" opacity=".35"><path d="M90 350L160 430L260 385L305 520M1500 95L1610 150L1730 98L1840 200"/></g> : null}
  </g>;
  return null;
};

/** Fine static details stay at the edges and on the ground, clear of the actors.
 * This entire component is included in the cached transparent scenery PNG. */
export const StorybookDetails: React.FC<{kind:string}> = ({kind}) => {
  const grass = GREEN.has(kind) || kind === "autumn" || kind === "night" || kind === "campfire";
  const sand = kind === "beach" || kind === "desert" || kind === "underwater";
  return <g data-storybook-scenery={kind}>
    {grass ? <g>
      {Array.from({length:150},(_,i) => {
        const x = i%2 ? rand(i+45)*310 : 1610+rand(i+45)*310;
        const y = 940+rand(i+95)*140, h=5+rand(i+135)*21;
        return <path key={i} d={`M${x} ${y}q-8 -${h*.7} -4 -${h}m4 ${h}q9 -${h*.9} 12 -${h*.7}`} stroke={kind === "autumn" ? "#bf9d7e" : "#90af98"} strokeWidth={1+rand(i)*1.4} fill="none" opacity=".55"/>;
      })}
      {Array.from({length:36},(_,i) => {
        const x=i%2 ? 20+rand(i+45)*280 : 1640+rand(i+45)*260, y=975+rand(i+95)*110;
        return <g key={i} transform={`translate(${x} ${y}) scale(${.3+rand(i+3)*.5})`}>
          <path d="M0 0Q8 -18 0 -37" stroke="#8cab94" strokeWidth="3" fill="none"/>
          {[0,72,144,216,288].map(a => <ellipse key={a} cx="0" cy="-46" rx="7" ry="11" transform={`rotate(${a} 0 -36)`} fill={i%3 ? "#f1c9d5" : "#faf0d5"}/>)}
          <circle cy="-36" r="5" fill="#e7cc92"/>
        </g>;
      })}
    </g> : null}
    {sand || kind === "snow" ? <g fill="none" stroke={kind === "snow" ? "#becbdc" : "#cebb9e"} opacity=".4" strokeLinecap="round">
      {Array.from({length:45},(_,i) => {
        const x=rand(i+15)*1920, y=970+rand(i+75)*110, w=15+rand(i+125)*65;
        return <path key={i} d={`M${x} ${y}q${w*.5} -5 ${w} 0`} strokeWidth={1+rand(i+1)*2}/>;
      })}
    </g> : null}
    {INDOORS.has(kind) ? <g fill="none" stroke="#b6a4b3" opacity=".25">
      <path d="M24 30H1896V1048H24ZM38 44H1882" strokeWidth="2"/>
      {Array.from({length:16},(_,i) => <path key={i} d={`M${i*130} 1080l70 -165`} strokeWidth="1.5"/>)}
    </g> : null}
    {INDOORS.has(kind) ? <g>
      <path d="M0 52H1920M0 69H1920" stroke="#fff6ea" strokeWidth="6" opacity=".65"/>
      <path d="M130 383H545" stroke="#b69b91" strokeWidth="15" strokeLinecap="round"/>
      <path d="M145 375H534" stroke="#e5c8b1" strokeWidth="5"/>
      {[190,382].map((x,i) => <g key={x} transform={`translate(${x} 216)`}>
        <rect width="125" height="155" rx="13" fill="#e5cbb9" stroke="#bd9fa0" strokeWidth="2"/>
        <rect x="10" y="10" width="105" height="135" rx="8" fill={i ? "#d9dedb" : "#e5d9e9"}/>
        {kind === "bedroom" ? <g fill="#fff1c9"><path d="M62 38L70 62L94 65L75 81L79 106L62 93L42 106L46 81L29 65L53 62Z"/><circle cx="25" cy="28" r="3"/><circle cx="91" cy="121" r="3"/></g>
          : <g><path d="M62 127V52" stroke="#9eb49c" strokeWidth="3"/>{[0,1,2].map(j => <g key={j}><ellipse cx={j%2 ? 74 : 50} cy={60+j*23} rx="17" ry="8" fill="#a8c4a6" transform={`rotate(${j%2 ? -30 : 30} ${j%2 ? 74 : 50} ${60+j*23})`}/></g>)}</g>}
      </g>)}
    </g> : null}
    {kind === "underwater" ? <g fill="none" stroke="#e6d9e6" strokeWidth="5" strokeLinecap="round" opacity=".65">
      {[80,1800].map(x => <g key={x}><path d={`M${x} 1080v-125m0 85q-65 -5 -60 -80m60 54q60 -15 68 -95m-68 42q-31 -6 -32 -49`}/><path d={`M${x-55} 1019l-32 -35m138 -27l30 -30`} strokeWidth="3"/></g>)}
    </g> : null}
    {/* Sparse flecks suggest painted paper without an expensive noise filter. */}
    {Array.from({length:180},(_,i) => <ellipse key={i} cx={rand(i+1500)*1920} cy={970+rand(i+1900)*110} rx={.5+rand(i+100)*2.3} ry={.5+rand(i+200)*1.3} fill="#fff4dc" opacity=".24"/>)}
  </g>;
};
