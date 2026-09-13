import React from "react";
import type { Emotion } from "../../lib/types";
import type { Pose } from "./pose";
import { FACES } from "./Face";

/** The existing emotion vocabulary, drawn with the approved Daisy eye style. */
export const StorybookFace: React.FC<{
  kind: string; emotion: Emotion; mouth: number; blink: number;
  eyes: Pose["eyes"]; uid: string; outline: string;
}> = ({ kind, emotion, mouth, blink, eyes, uid, outline }) => {
  const f = FACES[emotion] ?? FACES.happy;
  const owl = kind === "owl", turtle = kind === "turtle";
  const eyeY = owl ? 233 : 240;
  const rx = (owl ? 34 : turtle ? 26 : 29) * f.eyeScale;
  const ry = (owl ? 40 : turtle ? 30 : 36) * f.eyeScale;
  const gap = owl ? 60 : 55;
  const open = Math.min(1, Math.max(0, mouth) + f.open * .35);
  const eyeX = ((f.lookX ?? 0) + eyes.dx) * 1.1;
  const lookY = ((f.lookY ?? 0) + eyes.dy) * 1.1;
  const closed = eyes.mode !== "open" || blink > .85;
  const happyClosed = eyes.mode === "happy" && blink < .85;
  const mouthY = kind === "duck" ? 299 : owl ? 294 : 306;
  const width = f.mouthW * 1.35;
  const bottom = mouthY + 8 + open * 39;
  const mouthPath = `M${250-width/2} ${mouthY}Q250 ${mouthY-open*10} ${250+width/2} ${mouthY}Q250 ${bottom} ${250-width/2} ${mouthY}Z`;
  return <g aria-label={`${emotion} face`} strokeLinecap="round" strokeLinejoin="round">
    <defs>
      <radialGradient id={`${uid}-eyes`} cx=".35" cy=".2"><stop stopColor="#867397"/><stop offset=".45" stopColor="#55445f"/><stop offset="1" stopColor="#342e49"/></radialGradient>
      <radialGradient id={`${uid}-blush`}><stop stopColor="#ec9ca4" stopOpacity=".72"/><stop offset="1" stopColor="#efb39c" stopOpacity="0"/></radialGradient>
      <clipPath id={`${uid}-mouth`}><path d={mouthPath}/></clipPath>
    </defs>
    {[250-gap,250+gap].map((x,i) => <g key={x}>
      <ellipse cx={x+(i ? 40 : -40)} cy="283" rx="33" ry="24" fill={`url(#${uid}-blush)`} opacity={f.blush} stroke="none"/>
      <path d={`M${x-20} ${eyeY-46}Q${x} ${eyeY-57} ${x+18} ${eyeY-46}`} fill="none" stroke={outline} strokeWidth={turtle ? 4.5 : 3.7} opacity=".8"
        transform={`translate(0 ${f.browDy}) rotate(${f.browAngle * (i ? 1 : -1)} ${x} ${eyeY-46})`}/>
      {closed ? <path d={`M${x-rx} ${eyeY}Q${x} ${eyeY+(happyClosed ? -21 : 17)} ${x+rx} ${eyeY}`} fill="none" stroke="#715b71" strokeWidth="4.5"/> : <g transform={`translate(${x} ${eyeY}) scale(1 ${1-blink*.94})`}>
        <defs><clipPath id={`${uid}-eye-${i}`}><ellipse rx={rx} ry={ry}/></clipPath></defs>
        <ellipse rx={rx} ry={ry} fill="#fffcf1" stroke={outline} strokeWidth="2.5"/>
        <g clipPath={`url(#${uid}-eye-${i})`}>
          {f.heartEyes ? <path d="M0 18C-40 -5 -16 -36 0 -16C16 -36 40 -5 0 18Z" fill="#d575a0" stroke="none"/> : <>
            <ellipse cx={eyeX+(i ? -3 : 3)} cy={lookY+1} rx={rx*.79*f.pupil} ry={ry*.84*f.pupil} fill={`url(#${uid}-eyes)`} stroke="none"/>
            <ellipse cx={eyeX+(i ? -10 : -4)} cy={lookY-12} rx="8" ry="11" fill="#fff" stroke="none"/>
            <circle cx={eyeX+(i ? 5 : 11)} cy={lookY+12} r="4" fill="#fce9e6" stroke="none"/>
            {f.sparkle ? <path d="M9 -25L12 -17L20 -14L12 -11L9 -3L6 -11L-2 -14L6 -17Z" fill="#fff4cf" stroke="none"/> : null}
          </>}
          {f.lid > 0 ? <path d={`M${-rx-2} ${-ry-2}H${rx+2}V${-ry+2*ry*f.lid}Q0 ${-ry+2*ry*f.lid+5} ${-rx-2} ${-ry+2*ry*f.lid}Z`} fill={`url(#${uid}-body)`} stroke={outline} strokeWidth="2"/> : null}
        </g>
      </g>}
    </g>)}
    {kind === "duck" ? <g>
      <path d={`M219 293Q250 280 283 293L283 ${307+open*20}Q250 ${326+open*22} 218 ${307+open*20}Z`} fill="#835665" stroke={outline} strokeWidth="3"/>
      <path d="M219 288Q250 266 283 288Q301 299 282 308Q252 319 220 308Q201 301 219 288Z" fill={`url(#${uid}-bill)`} stroke={outline} strokeWidth="3"/>
      <path d={`M218 ${307+open*20}Q250 ${320+open*25} 284 ${307+open*20}`} fill="none" stroke="#d99566" strokeWidth="5"/>
      <ellipse cx="238" cy="288" rx="4" ry="2" fill="#b28b6b" stroke="none"/><ellipse cx="263" cy="288" rx="4" ry="2" fill="#b28b6b" stroke="none"/>
    </g> : owl ? <g>
      <path d={`M227 290Q250 278 273 290L250 ${320+open*24}Z`} fill="#8d5c67" stroke={outline} strokeWidth="3"/>
      <path d="M226 282Q250 267 274 282Q267 304 250 310Q232 301 226 282Z" fill={`url(#${uid}-bill)`} stroke={outline} strokeWidth="3"/>
      <path d={`M239 ${313+open*21}Q250 ${325+open*19} 261 ${313+open*21}`} fill="none" stroke="#e1ac71" strokeWidth="4"/>
    </g> : <>
      {open < .08 ? <path d={f.wavy ? `M228 ${mouthY}q11 -9 22 0t22 0` : `M${250-width/2} ${mouthY}Q250 ${mouthY+f.curve*1.05} ${250+width/2} ${mouthY}`} fill="none" stroke="#826274" strokeWidth="3.5"/> : <g>
        <path d={mouthPath} fill="#765066" stroke="#826274" strokeWidth="3"/>
        <g clipPath={`url(#${uid}-mouth)`}>
          <ellipse cx="250" cy={bottom-6} rx={width*.3} ry={open*16+5} fill="#e9a0af" stroke="none"/>
          {kind === "bunny" ? <path d={`M237 ${mouthY-4}h26v14q-13 5 -26 0Z`} fill="#fffdf4" stroke="#d2bbb9" strokeWidth="1.5"/> : null}
        </g>
      </g>}
      {kind === "bunny" || kind === "fox" || kind === "bear" ? <>
        <path d="M237 281Q250 274 263 281Q267 287 250 298Q233 287 237 281Z" fill={kind === "bunny" ? "#d596ac" : "#796273"} stroke={kind === "bunny" ? "#b77c95" : "#6b5666"} strokeWidth="2"/>
        <path d="M243 281Q250 278 256 281" fill="none" stroke="#ffe9de" strokeWidth="2" opacity=".6"/>
        <path d="M250 297v6" stroke="#826274" strokeWidth="2.5"/>
      </> : <g fill="#87a185" stroke="none"><ellipse cx="239" cy="283" rx="3" ry="2"/><ellipse cx="261" cy="283" rx="3" ry="2"/></g>}
    </>}
    {f.tear ? <path d="M339 274Q326 294 338 296Q349 295 339 274Z" fill="#a7d8e7" stroke="#82afc7" strokeWidth="1.5"/> : null}
    {f.sweat ? <path d="M352 197Q337 220 351 223Q365 220 352 197Z" fill="#b2dce8" stroke="#82afc7" strokeWidth="1.5"/> : null}
  </g>;
};
