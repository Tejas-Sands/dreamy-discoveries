import React from "react";
import type { Action } from "../../lib/types";
import { easeInOutSine } from "../../lib/anim";

export type HandGesture = "relaxed" | "open" | "point" | "cup";

/** Gesture intent comes from the action, rather than the shoulder angle. A reach
 * can then curl either hand without turning a carrying paw into a pointer. */
export function handGesture(action: Action, side: "L" | "R"): HandGesture {
  if (action === "point" && side === "R") return "point";
  if (action === "wave") return side === "R" ? "open" : "relaxed";
  if (["clap", "cheer", "dance", "jump", "fly"].includes(action)) return "open";
  if (action === "hug" || ((action === "think" || action === "eat") && side === "R")) return "cup";
  return "relaxed";
}

interface Digit {
  x: number;
  y: number;
  tipX: number;
  tipY: number;
  radius: number;
}

const PAW: Record<HandGesture, Digit[]> = {
  relaxed: [
    {x:-13,y:4,tipX:-14,tipY:18,radius:7},
    {x:0,y:6,tipX:0,tipY:22,radius:7.5},
    {x:13,y:3,tipX:15,tipY:17,radius:6.5},
  ],
  open: [
    {x:-13,y:3,tipX:-20,tipY:28,radius:6.5},
    {x:0,y:5,tipX:-1,tipY:34,radius:7},
    {x:13,y:2,tipX:20,tipY:26,radius:6.5},
  ],
  point: [
    {x:-12,y:2,tipX:-13,tipY:43,radius:7},
    {x:1,y:5,tipX:2,tipY:13,radius:8},
    {x:14,y:1,tipX:17,tipY:9,radius:7},
  ],
  cup: [
    {x:-14,y:-2,tipX:-17,tipY:9,radius:7},
    {x:-1,y:3,tipX:1,tipY:14,radius:7.5},
    {x:12,y:0,tipX:19,tipY:8,radius:7},
  ],
};

const WING: Record<HandGesture, Digit[]> = {
  relaxed: [
    {x:-16,y:-10,tipX:-17,tipY:9,radius:10},
    {x:-1,y:-7,tipX:0,tipY:15,radius:10},
    {x:13,y:-10,tipX:17,tipY:5,radius:9},
  ],
  open: [
    {x:-16,y:-9,tipX:-25,tipY:20,radius:9},
    {x:-1,y:-6,tipX:-3,tipY:29,radius:9},
    {x:13,y:-10,tipX:23,tipY:15,radius:8},
  ],
  point: [
    {x:-14,y:-9,tipX:-16,tipY:39,radius:9},
    {x:0,y:-7,tipX:3,tipY:5,radius:10},
    {x:13,y:-11,tipX:20,tipY:0,radius:8},
  ],
  cup: [
    {x:-15,y:-11,tipX:-18,tipY:2,radius:10},
    {x:-1,y:-7,tipX:1,tipY:9,radius:10},
    {x:13,y:-12,tipX:19,tipY:0,radius:9},
  ],
};

const THUMB: Record<HandGesture, Digit> = {
  relaxed:{x:14,y:-6,tipX:25,tipY:4,radius:7},
  open:{x:14,y:-6,tipX:31,tipY:5,radius:7},
  point:{x:14,y:-6,tipX:24,tipY:3,radius:7.5},
  cup:{x:14,y:-7,tipX:21,tipY:0,radius:8},
};

const morphDigit = (from: Digit, to: Digit, amount: number): Digit => ({
  x:from.x+(to.x-from.x)*amount,
  y:from.y+(to.y-from.y)*amount,
  tipX:from.tipX+(to.tipX-from.tipX)*amount,
  tipY:from.tipY+(to.tipY-from.tipY)*amount,
  radius:from.radius+(to.radius-from.radius)*amount,
});

/** Rounded curved tips have real gaps in the outer silhouette. Feather tips
 * taper; paw digits stay plush. Every gesture shares one morphable topology. */
const digitPath = ({x,y,tipX,tipY,radius:r}: Digit, taper: number) => {
  const tipRadius=r*taper, middleY=y+(tipY-y)*.5;
  return `M${x-r} ${y}C${x-r} ${middleY} ${tipX-tipRadius} ${tipY-tipRadius} ${tipX-tipRadius} ${tipY}Q${tipX} ${tipY+tipRadius*1.25} ${tipX+tipRadius} ${tipY}C${tipX+tipRadius} ${tipY-tipRadius} ${x+r} ${middleY} ${x+r} ${y}Q${x} ${y-r*.7} ${x-r} ${y}Z`;
};

export interface StorybookHandProps {
  kind: string;
  side: "L" | "R";
  gesture: HandGesture;
  previousGesture?: HandGesture;
  blend?: number;
  /** The actual reach amount, including its release ramp; never remembered. */
  gripAmount?: number;
  fill: string;
  padFill: string;
}

/** Drawn around the existing contact origin, in StorybookBody's 500px space.
 * Shaft extension happens outside this group, so fingers keep their shape. */
export const StorybookHand: React.FC<StorybookHandProps> = ({kind,side,gesture,previousGesture,blend=1,gripAmount=0,fill,padFill}) => {
  const wing=kind==="duck"||kind==="owl", flipper=kind==="turtle";
  const amount=Math.max(0,Math.min(1,gripAmount));
  const grip=amount*amount*(3-2*amount);
  const family=wing?WING:PAW;
  const previous=previousGesture??gesture, transition=easeInOutSine(blend);
  const digits=family[gesture].map((digit,i)=>{
    const actionDigit=morphDigit(family[previous][i],digit,transition);
    const shaped=morphDigit(actionDigit,family.cup[i],grip);
    return flipper?{...shaped,x:shaped.x*1.08,tipX:shaped.tipX*1.08,tipY:shaped.y+(shaped.tipY-shaped.y)*.72,radius:shaped.radius*1.14}:shaped;
  });
  const thumb=morphDigit(morphDigit(THUMB[previous],THUMB[gesture],transition),THUMB.cup,grip);
  const anatomy=wing?"wing":flipper?"flipper":"paw";
  const displayGesture=transition<.5?previous:gesture;
  const palmBottom=15-grip*3;
  return <g data-storybook-hand={side} data-hand-anatomy={anatomy} data-hand-gesture={amount>0?"cup":displayGesture}>
    {/* The palm covers the digit roots, leaving only gently curved separations. */}
    {digits.map((digit,i)=><path key={i} data-hand-part={wing?"feather":"digit"} data-leading-digit={displayGesture==="point"&&i===0&&amount===0?"true":undefined} d={digitPath(digit,wing?.58:flipper?.82:1)} fill={fill} strokeWidth={wing?3:3.2}/>)}
    <path data-hand-part={wing?"alula":"thumb"} d={digitPath(thumb,wing?.7:1)} fill={fill} strokeWidth="3.2"/>
    <path data-hand-part="palm" d={`M-18 -10Q-13 -20 1 -18Q17 -18 22 -6Q25 7 16 ${palmBottom}Q0 ${palmBottom+7} -17 ${palmBottom-3}Q-25 3 -18 -10Z`} fill={fill} strokeWidth="3.2"/>
    {flipper?<path d={`M-18 9Q-15 17 -9 15Q-1 20 6 17Q15 17 19 9`} fill="none" strokeWidth="2" opacity=".32"/>:null}
    {kind==="bear"?<>
      <path d="M-8 -4Q-12 5 -4 10Q4 15 11 8Q16 1 8 -4Q0 -9 -8 -4Z" fill={padFill} stroke="none" opacity=".85"/>
      {digits.map((digit,i)=><ellipse key={i} cx={digit.tipX} cy={digit.tipY-2} rx="3.8" ry="3" fill={padFill} stroke="none" opacity=".65"/>)}
    </>:null}
    <path d="M-14 -5Q-16 1 -13 5" fill="none" stroke="#fff8e7" strokeWidth="3" opacity={wing?.25:.45}/>
    {grip>0?<path d={`M8 5Q15 ${9-grip*4} 18 -1`} fill="none" strokeWidth="2" opacity={grip*.36}/>:null}
  </g>;
};
