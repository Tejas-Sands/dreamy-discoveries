import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Character, characterBox } from "./components/characters/Character";
import { PropArt } from "./components/StageProps";
import type { Action } from "./lib/types";
import cast from "../library/cast.json";

export const HAND_PREVIEW_SECONDS = 9;
export interface HandPreviewProps {
  /** Pin one section when exporting a review still; otherwise play all three. */
  section?: "wave" | "point" | "hold";
}

const smooth = (value: number) => {
  const k=Math.max(0,Math.min(1,value));
  return k*k*(3-2*k);
};

/** Dev-only: all six cast use the production rig and the same world-space
 * contact target as a staged story. The final beat shows a gentle release. */
export const HandPreview: React.FC<HandPreviewProps> = ({section}) => {
  const frame=useCurrentFrame(),{fps}=useVideoConfig();
  const t=(frame%(3*fps))/fps;
  const gesture=section??(["wave","point","hold"] as const)[Math.floor(frame/(3*fps))%3];
  const action:Action=gesture==="hold"?"point":gesture;
  const grip=gesture==="hold"?smooth((t-.2)/.65)*(1-smooth((t-2.2)/.65)):0;
  const width=390,center={x:270,y:425},target={x:397,y:291};
  return <AbsoluteFill style={{background:"linear-gradient(155deg, #e4f3ee, #f7e9f3 65%, #fff1d8)",fontFamily:"Fredoka, sans-serif",padding:"24px 38px",color:"#73566e"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",padding:"0 8px 14px"}}>
      <div style={{fontSize:42,fontWeight:600}}>Little hands, big stories</div>
      <div style={{fontSize:28}}>{gesture==="wave"?"A bright hello":gesture==="point"?"Look over here":grip>.9?"A gentle hold":t>2.2?"Let it go softly":"Reach for a little star"}</div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3, 1fr)",gridTemplateRows:"repeat(2, 1fr)",gap:18,flex:1}}>
      {cast.members.map((member,index)=><div key={member.id} style={{position:"relative",borderRadius:30,background:"linear-gradient(155deg, #fffdf5ef, #f6f0f8de)",border:"3px solid #fffaf0",overflow:"hidden"}}>
        <div style={{position:"absolute",left:24,top:18,fontSize:29,fontWeight:500}}>{member.name}</div>
        <div style={{position:"absolute",...characterBox(center.x,center.y,width)}}>
          <Character kind={member.id} action={action} actionT={t} clockT={frame/fps} width={width} flip={index%2===1} motionScale={.5} shadow={false}
            stageCenter={center} reach={gesture==="hold"?{target,amount:grip,crouch:0}:undefined}/>
        </div>
        {gesture==="hold"?<svg viewBox="-50 -50 100 100" style={{position:"absolute",left:target.x-13.5,top:target.y-13.5,width:27,height:27,overflow:"visible"}}>
          <PropArt kind="star"/>
        </svg>:null}
        <div style={{position:"absolute",right:22,bottom:14,fontSize:24,color:"#a17b8c"}}>{gesture==="wave"?"Open & friendly":gesture==="point"?"One clear tip":"Cup & release"}</div>
      </div>)}
    </div>
  </AbsoluteFill>;
};
