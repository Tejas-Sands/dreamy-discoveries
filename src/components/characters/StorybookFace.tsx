import React from "react";
import type { Emotion } from "../../lib/types";
import type { Pose } from "./pose";
import { facialParameters } from "./Face";
import type { ActorPerformance } from "../../lib/acting";
import type { MouthShape } from "../../lib/speech";
import type { CharacterRecipe } from './recipe';
import { softMix } from './StorybookPaint';

interface FaceLayout {
  eyeY?: number; gap?: number; eyeSize?: number; mouthY?: number;
  mouthDx?: number; singleEye?: boolean; nose?: boolean;
  mouthScale?: number; nativeMouth?: boolean;
  turnShift?: number; turnCompression?: number;
}

/** The existing emotion vocabulary, drawn with the limb chart's glossy eyes. */
export const StorybookFace: React.FC<{
  kind: string; emotion: Emotion; mouth: number; blink: number;
  eyes: Pose["eyes"]; uid: string; outline: string;
  performance?: ActorPerformance; mouthShape?: MouthShape; turn?: number;
  layout?: FaceLayout;
}> = ({ kind, emotion, mouth, blink, eyes, uid, outline, performance, mouthShape, turn = 0, layout }) => {
  const f = facialParameters(emotion,performance);
  const duo = kind === 'bear' || kind === 'duck';
  const yaw=Math.max(-1,Math.min(1,turn)),angle=Math.abs(yaw);
  const farOpacity=1-Math.max(0,Math.min(1,(angle-.42)/.48));
  const featureTransform=`translate(${yaw*(layout?.turnShift??126)+(layout?.mouthDx??0)} 0) translate(250 0) scale(${1-angle*(layout?.turnCompression??.3)} 1) translate(-250 0)`;
  const mouthWidth=mouthShape==='round'?(kind==='duck'?.88:.64):mouthShape==='wide'?(kind==='duck'?1.06:1.2):1;
  const owl = kind === "owl", turtle = kind === "turtle";
  const beak = owl || ['bird','chick','penguin'].includes(kind);
  const eyeY = layout?.eyeY ?? (owl ? 233 : 240);
  const rx = (owl ? 34 : turtle ? 26 : 29) * f.eyeScale * (layout?.eyeSize??1);
  const ry = (owl ? 40 : turtle ? 30 : 36) * f.eyeScale * (layout?.eyeSize??1);
  const gap = layout?.gap ?? (owl ? 60 : 55);
  const open = mouthShape === "rest" || mouthShape === "closed" ? 0 : mouthShape ? Math.min(1,Math.max(0,mouth)) : Math.min(1, Math.max(0, mouth) + f.open * .35);
  const eyeX = ((f.lookX ?? 0) + eyes.dx) * 1.1;
  const lookY = ((f.lookY ?? 0) + eyes.dy) * 1.1;
  const closed = eyes.mode !== "open" || blink > .85;
  const happyClosed = eyes.mode === "happy" && blink < .85;
  const mouthY = layout?.mouthY ?? (kind === "duck" ? 299 : beak ? 294 : ['cow','pig','hippo','koala'].includes(kind) ? 330 : 306);
  const width = f.mouthW * 1.35 * mouthWidth * (layout?.mouthScale??1);
  const broadMuzzle=['cow','pig','hippo','koala'].includes(kind);
  const bottom = mouthY + (kind==='bear'?4:8) + open * (kind==='bear'?26:broadMuzzle?20:39);
  const mouthPath = `M${250-width/2} ${mouthY}Q250 ${mouthY-open*(kind==='bear'?3:10)} ${250+width/2} ${mouthY}Q250 ${bottom} ${250-width/2} ${mouthY}Z`;
  return <g aria-label={`${emotion} face`} strokeLinecap="round" strokeLinejoin="round">
    <defs>
      <radialGradient id={`${uid}-eyes`} cx=".35" cy=".2"><stop stopColor="#685693"/><stop offset=".45" stopColor="#362653"/><stop offset="1" stopColor="#17182f"/></radialGradient>
      <radialGradient id={`${uid}-blush`}><stop stopColor="#ec9ca4" stopOpacity=".72"/><stop offset="1" stopColor="#efb39c" stopOpacity="0"/></radialGradient>
      <clipPath id={`${uid}-mouth`}><path d={mouthPath}/></clipPath>
    </defs>
    {(layout?.singleEye ? [250] : [250-gap,250+gap]).map((originalX,i) => {
      const far=yaw>0?i===1:yaw<0?i===0:false;
      const x=250+(originalX-250)*(1-angle*.45)+yaw*(layout?.turnShift??64);
      return <g key={i} data-face-eye={far?'far':'near'} opacity={far?farOpacity:1} transform={`translate(${x} 0) scale(${far?1-angle*.45:1-angle*.08} 1) translate(${-x} 0)`}>
      <ellipse cx={x+(kind==='whale'?12:i ? 40 : -40)} cy={eyeY+43} rx="33" ry="24" fill={`url(#${uid}-blush)`} opacity={f.blush} stroke="none"/>
      {kind!=='whale'||f.browShow?<path d={`M${x-20} ${eyeY-46}Q${x} ${eyeY-57} ${x+18} ${eyeY-46}`} fill="none" stroke={outline} strokeWidth={turtle ? 4.5 : 3.7} opacity=".8"
        transform={`translate(0 ${f.browDy}) rotate(${f.browAngle * (i ? 1 : -1)} ${x} ${eyeY-46})`}/>:null}
      {closed ? <path d={`M${x-rx} ${eyeY}Q${x} ${eyeY+(happyClosed ? -21 : 17)} ${x+rx} ${eyeY}`} fill="none" stroke="#715b71" strokeWidth="4.5"/> : <g transform={`translate(${x} ${eyeY}) scale(1 ${1-blink*.94})`}>
        <defs><clipPath id={`${uid}-eye-${i}`}><ellipse rx={rx} ry={ry}/></clipPath></defs>
        <ellipse rx={rx} ry={ry} fill="#fffcf1" stroke={outline} strokeWidth="2.5"/>
        <g clipPath={`url(#${uid}-eye-${i})`}>
          {f.heartEyes ? <path d="M0 18C-40 -5 -16 -36 0 -16C16 -36 40 -5 0 18Z" fill="#d575a0" stroke="none"/> : <>
            <ellipse cx={eyeX+(i ? -3 : 3)} cy={lookY+1} rx={rx*.79*f.pupil} ry={ry*.84*f.pupil} fill={`url(#${uid}-eyes)`} stroke="none"/>
            <ellipse cx={eyeX+(kind==='whale'?-rx*.18:i ? -10 : -4)} cy={lookY-(kind==='whale'?ry*.34:12)} rx={kind==='whale'?rx*.28:8} ry={kind==='whale'?ry*.3:11} fill="#fff" stroke="none"/>
            <circle cx={eyeX+(kind==='whale'?rx*.3:i ? 5 : 11)} cy={lookY+(kind==='whale'?ry*.35:12)} r={kind==='whale'?rx*.15:4} fill="#fce9e6" stroke="none"/>
            {f.sparkle ? <path d="M9 -25L12 -17L20 -14L12 -11L9 -3L6 -11L-2 -14L6 -17Z" fill="#fff4cf" stroke="none" opacity={f.sparkleOpacity}/> : null}
          </>}
          {f.lid > 0 ? <path d={`M${-rx-2} ${-ry-2}H${rx+2}V${-ry+2*ry*f.lid}Q0 ${-ry+2*ry*f.lid+5} ${-rx-2} ${-ry+2*ry*f.lid}Z`} fill={`url(#${uid}-body)`} stroke={outline} strokeWidth="2"/> : null}
        </g>
      </g>}
    </g>;})}
    {!layout?.nativeMouth?<g data-face-muzzle={kind} transform={featureTransform}>
    {kind === "duck" ? <g transform={`translate(250 0) scale(${mouthWidth} 1) translate(-250 0)`}>
      <path d={`M219 299Q250 291 283 299C286 ${309+open*8} 276 ${315+open*24} 250 ${318+open*24}C224 ${315+open*24} 215 ${309+open*8} 219 299Z`} fill="#744235" stroke={outline} strokeWidth="3"/>
      {open>.12 ? <ellipse cx="250" cy={311+open*19} rx={12+open*4} ry={open*5} fill="#e9a0a0"/> : null}
      <path d={`M219 ${304+open*25}Q250 ${317+open*24} 281 ${304+open*25}Q277 ${324+open*24} 250 ${325+open*24}Q222 ${323+open*24} 219 ${304+open*25}Z`} fill={`url(#${uid}-bill)`} stroke={outline} strokeWidth="2.5"/>
      <path d="M219 288Q250 266 283 288Q296 298 282 304Q250 312 219 304Q205 298 219 288Z" fill={`url(#${uid}-bill)`} stroke={outline} strokeWidth="3"/>
      {open<.08 ? <path d="M219 288Q250 266 283 288Q301 299 282 308Q252 319 220 308Q201 301 219 288Z" fill={`url(#${uid}-bill)`} stroke={outline} strokeWidth="3"/> : null}
      <path d="M223 285Q250 270 278 286" fill="none" stroke="#fff3bf" strokeWidth="3" opacity=".8"/>
      <ellipse cx="238" cy="288" rx="4" ry="2" fill="#b28b6b" stroke="none"/><ellipse cx="263" cy="288" rx="4" ry="2" fill="#b28b6b" stroke="none"/>
    </g> : beak ? <g transform={`translate(250 0) scale(${mouthWidth} 1) translate(-250 0)`}>
      <path d={`M227 290Q250 278 273 290L250 ${320+open*24}Z`} fill="#8d5c67" stroke={outline} strokeWidth="3"/>
      <path d="M226 282Q250 267 274 282Q267 304 250 310Q232 301 226 282Z" fill={`url(#${uid}-bill)`} stroke={outline} strokeWidth="3"/>
      {open>.08?<path d={`M239 ${313+open*21}Q250 ${325+open*19} 261 ${313+open*21}`} fill="none" stroke="#e1ac71" strokeWidth="4"/>:null}
    </g> : <>
      {open < .08 ? <path d={f.wavy ? `M228 ${mouthY}q11 -9 22 0t22 0` : kind === 'bear' && f.curve > 0 ? `M230 ${mouthY}Q240 ${mouthY+13} 250 ${mouthY+3}Q260 ${mouthY+13} 270 ${mouthY}` : `M${250-width/2} ${mouthY}Q250 ${mouthY+f.curve*(turtle?1.6:1.05)} ${250+width/2} ${mouthY}`} fill="none" stroke={turtle?'#527b4f':duo?'#684839':'#826274'} strokeWidth={turtle?6:'3.5'}/> : <g>
        <path d={mouthPath} fill="#765066" stroke="#826274" strokeWidth="3"/>
        <g clipPath={`url(#${uid}-mouth)`}>
          <ellipse cx="250" cy={bottom-6} rx={width*.3} ry={open*16+5} fill="#e9a0af" stroke="none"/>
          {kind === "bunny" || kind==='squirrel' ? <path d={`M237 ${mouthY-4}h26v14q-13 5 -26 0Z`} fill="#fffdf4" stroke="#d2bbb9" strokeWidth="1.5"/> : null}
        </g>
      </g>}
      {layout?.nose===false ? null : ['bunny','fox','bear','cat','dog','panda','mouse','monkey','raccoon','hedgehog','sheep','squirrel','lion','tiger'].includes(kind) ? <>
        <path d="M237 281Q250 274 263 281Q267 287 250 298Q233 287 237 281Z" fill={['bunny','mouse'].includes(kind) ? "#d596ac" : "#594658"} stroke={kind === "bunny" ? "#b77c95" : "#6b5666"} strokeWidth="2"/>
        <path d="M243 281Q250 278 256 281" fill="none" stroke="#ffe9de" strokeWidth="2" opacity=".6"/>
        <path d="M250 297v6" stroke="#826274" strokeWidth="2.5"/>
      </> : kind==='turtle' || kind==='monkey' ? <g fill={kind==='turtle'?'#65905c':'#88644f'} stroke="none"><ellipse cx="239" cy={mouthY-23} rx="3" ry="3.5"/><ellipse cx="261" cy={mouthY-23} rx="3" ry="3.5"/></g> : null}
    </>}
    </g>:null}
    {f.tear ? <path transform={`translate(0 ${eyeY-240})`} d="M339 274Q326 294 338 296Q349 295 339 274Z" fill="#a7d8e7" opacity={f.tearOpacity} stroke="#82afc7" strokeWidth="1.5"/> : null}
    {f.sweat ? <path transform={`translate(0 ${eyeY-240})`} d="M352 197Q337 220 351 223Q365 220 352 197Z" fill="#b2dce8" opacity={f.sweatOpacity} stroke="#82afc7" strokeWidth="1.5"/> : null}
  </g>;
};

/** Specialist rigs keep their own jaw/eye placement, including the naturally
 * side-on fish and horse, while sharing the chart's eyes and existing speech. */
export const SpeciesStorybookFace: React.FC<Omit<React.ComponentProps<typeof StorybookFace>,'layout'|'kind'|'outline'> & {recipe: CharacterRecipe}> = ({recipe, turn=0, ...props}) => {
  const f = recipe.face ?? {};
  const single = f.eyeGap===0;
  return <g transform="scale(.4)">
    <defs><radialGradient id={`${props.uid}-body`} cx=".3" cy=".22" r=".86"><stop stopColor={softMix(recipe.colors.body,'#fff7e5',.4)}/><stop offset="1" stopColor={recipe.colors.body}/></radialGradient></defs>
    <StorybookFace {...props} kind={recipe.name} turn={single?0:turn*.45}
      outline={softMix(recipe.colors.body,'#67516c',.58)}
      layout={{eyeY:(f.eyeY??92)*2.5,gap:(f.eyeGap??48)*1.25,
        eyeSize:(f.eyeSize??1)*1.05,mouthY:(f.mouthY??128)*2.5,
        mouthDx:(f.mouthDx??0)*2.5,singleEye:single,nose:recipe.name==='turtle',mouthScale:recipe.name==='turtle'?1.7:1,nativeMouth:recipe.name==='whale',turnShift:64,turnCompression:.2}}/>
  </g>;
};
