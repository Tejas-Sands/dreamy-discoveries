import React from "react";
import { AbsoluteFill, Audio, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Fredoka";
import { Character, characterBox } from "./components/characters/Character";
import { DreamLights } from "./components/BrandOutro";

const { fontFamily } = loadFont();

/** Only for baking the original static SVG artwork, never in an episode. */
export const BrandArt: React.FC<{ scene: string }> = ({ scene }) => <AbsoluteFill>
  <Img src={staticFile(`brand/${scene}.svg`)} style={{ width: "100%", height: "100%" }} />
</AbsoluteFill>;

/** The approved meadow study now uses Daisy's production rig. */
export const BrandPreview: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return <AbsoluteFill style={{ fontFamily }}>
    <Img src={staticFile("brand/sunny-meadow.png")} style={{ width: "100%", height: "100%" }} />
    <DreamLights count={18} />
    <div style={{ position: "absolute", top: 90, left: 0, right: 0, textAlign: "center", color: "#716085", fontSize: 34, letterSpacing: 5 }}>TODAY IN SUNNY MEADOW</div>
    <div style={{ position: "absolute", top: 148, left: 0, right: 0, textAlign: "center", color: "#685476", fontWeight: 600, fontSize: 100, textShadow: "0 4px 0 #fff3e5" }}>A little world of color</div>
    <div style={{ position: "absolute", ...characterBox(675, 955, 684) }}>
      <Character kind="duck" action="wave" emotion="happy" width={684} seed={1} actionT={frame/fps}/>
    </div>
    <div style={{ position: "absolute", left: 1030, top: 418, display: "flex", gap: 30 }}>
      {[['#ec5968', 'Red'], ['#f1cc55', 'Yellow'], ['#65acdc', 'Blue']].map(([color, label], i) => <div key={label} style={{ textAlign: "center", transform: `translateY(${Math.sin(frame / 34 + i) * 7}px)` }}>
        <div style={{ width: 148, height: 174, borderRadius: "48% 52% 46% 54%", background: `radial-gradient(circle at 30% 25%, #fff6df, ${color} 45%, ${color})`, boxShadow: "inset -10px -13px 20px #8b6da322, 0 12px 28px #7b6d8c22", border: "5px solid #fff2df" }} />
        <div style={{ fontSize: 39, color: "#70617f", marginTop: 18 }}>{label}</div>
      </div>)}
    </div>
    <Audio src={staticFile("sfx/dreamy-outro.wav")} volume={0.35} />
  </AbsoluteFill>;
};
