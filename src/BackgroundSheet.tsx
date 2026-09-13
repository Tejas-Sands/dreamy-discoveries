import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Fredoka";
import { Background } from "./components/backgrounds/Background";
import { BACKGROUND_NAMES } from "./generated/registry";
import { getPalette } from "./lib/palettes";
import type { BakedMap } from "./lib/baked";
import {Character, characterBox} from "./components/characters/Character";
import cast from "../library/cast.json";

const { fontFamily } = loadFont();

/** Full-size review of one setting, or a two-second tour stop per recipe. */
export const BackgroundPreview: React.FC<{kind?:string; baked?:BakedMap}> = ({kind,baked}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const index = Math.floor(frame/(2*fps)) % BACKGROUND_NAMES.length;
  const name = kind || BACKGROUND_NAMES[index];
  return <AbsoluteFill>
    <Background kind={name} palette={getPalette(name)} baked={baked}/>
    <div style={{position:"absolute",...characterBox(720,970,350)}}>
      <Character kind={cast.members[index % cast.members.length].kind} action="wave" width={350}/>
    </div>
    <div style={{position:"absolute",left:48,top:38,padding:"10px 24px",borderRadius:24,background:"#fff7efeb",color:"#6b5879",fontFamily,fontSize:32}}>{name[0].toUpperCase()+name.slice(1)}</div>
  </AbsoluteFill>;
};

/** Dev-only: every background recipe on one screen. */
export const BackgroundSheet: React.FC<{ baked?: BakedMap }> = ({ baked }) => {
  const cols = 5;
  const w = 1920 / cols;
  const h = w * (1080 / 1920);
  return (
    <AbsoluteFill style={{ background: "#222", fontFamily }}>
      {BACKGROUND_NAMES.map((name, i) => (
        <div key={name} style={{ position: "absolute", left: (i % cols) * w, top: Math.floor(i / cols) * h, width: w, height: h, overflow: "hidden" }}>
          <div style={{ width: 1920, height: 1080, transform: `scale(${w / 1920})`, transformOrigin: "0 0" }}>
            <Background kind={name} palette={getPalette(name)} frameOffset={40} baked={baked} />
          </div>
          <div style={{ position: "absolute", left: 8, bottom: 6, fontSize: 22, fontWeight: 700, color: "#fff", textShadow: "0 2px 4px #000" }}>{name}</div>
        </div>
      ))}
    </AbsoluteFill>
  );
};
