import React from "react";
import { AbsoluteFill, Audio, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { BRAND_OUTRO_SEC } from "../lib/timing";
import { rand } from "../lib/random";

// Original circular insignia and lettering, isolated by a deterministic SVG mask.
export const ChannelLogo: React.FC<{ width?: number }> = ({ width = 1100 }) => (
  <div style={{ width, height: width * 0.85, position: "relative", filter: "drop-shadow(0 14px 16px #54457b30)" }}>
    <div style={{ position: "absolute", width: 1080, height: 918, transform: `scale(${width / 1080})`, transformOrigin: "top left" }}>
      <Img src={staticFile("brand/dreamy-d-original.png")} style={{ position: "absolute", width: 2048, height: 1117.09, left: -490, top: -100, maskImage: `url(${staticFile("brand/logo-mask.svg")})`, maskSize: "100% 100%", maskRepeat: "no-repeat" }} />
    </div>
  </div>
);

/** Low-count, frame-addressed lights over baked artwork. */
export const DreamLights: React.FC<{ count?: number }> = ({ count = 34 }) => {
  const frame = useCurrentFrame();
  return <AbsoluteFill style={{ pointerEvents: "none" }}>
    {Array.from({ length: count }, (_, i) => {
      const x = rand(i + 810) * 1920;
      const y = rand(i + 219) * 1080;
      const pulse = 0.45 + 0.35 * Math.sin(frame / (23 + i % 11) + i * 2);
      const size = i % 5 === 0 ? 18 : 4 + rand(i + 70) * 5;
      return <div key={i} style={{ position: "absolute", left: x, top: y + Math.sin(frame / 65 + i) * 9, width: size, height: size, background: i % 3 ? "#fff5ce" : "#fff", opacity: pulse, borderRadius: i % 5 ? "50%" : 0, clipPath: i % 5 ? undefined : "polygon(50% 0, 61% 38%, 100% 50%, 61% 62%, 50% 100%, 39% 62%, 0 50%, 39% 38%)", boxShadow: "0 0 15px 5px #ffe6b988" }} />;
    })}
  </AbsoluteFill>;
};

/** Identical content and local frame clock in every episode. */
export const BrandOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 22, stiffness: 70 } });
  const fade = interpolate(frame, [0, 14, BRAND_OUTRO_SEC * fps - 16, BRAND_OUTRO_SEC * fps - 1], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ background: "#eee4f5" }}>
    <AbsoluteFill style={{ opacity: fade }}>
      <Img src={staticFile("brand/dream-sky.png")} style={{ width: "100%", height: "100%", transform: `scale(${1.035 - frame * 0.00012})` }} />
      <DreamLights />
      <div style={{ position: "absolute", left: 420, top: 20, transform: `translateY(${(1 - enter) * 32 + Math.sin(frame / 45) * 5}px) scale(${0.94 + enter * 0.06})` }}>
        <ChannelLogo width={1080} />
      </div>
    </AbsoluteFill>
    <Audio src={staticFile("sfx/dreamy-outro.wav")} volume={0.62} />
  </AbsoluteFill>;
};
