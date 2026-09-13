import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { CameraKind, TransitionKind } from "../lib/types";
import { easeInOutSine, easeOutCubic } from "../lib/anim";

/** Animates a scene in over its first `frames` frames (it is stacked on top of the previous scene). */
export const SceneTransition: React.FC<{ kind: TransitionKind; frames: number; children: React.ReactNode }> = ({ kind, frames, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const k = Math.min(1, frame / frames);
  let style: React.CSSProperties = {};
  switch (kind) {
    case "pop": {
      const s = spring({ frame, fps, config: { damping: 11, stiffness: 120 } });
      style = { transform: `scale(${0.7 + 0.3 * s})`, opacity: Math.min(1, k * 2.5), transformOrigin: "50% 60%" };
      break;
    }
    case "slide":
      style = { transform: `translateX(${(1 - easeOutCubic(k)) * 1920}px)` };
      break;
    case "iris":
      style = { clipPath: `circle(${easeInOutSine(k) * 130}% at 45% 65%)` };
      break;
    case "wipe":
      style = { clipPath: `inset(0 ${(1 - easeInOutSine(k)) * 100}% 0 0 round 0 ${(1 - k) * 200}px ${(1 - k) * 200}px 0)` };
      break;
    case "fade":
    default:
      style = { opacity: k };
  }
  return <AbsoluteFill style={style}>{children}</AbsoluteFill>;
};

/**
 * Slow camera moves over the whole scene + impact shake, plus a "shot" layer:
 * a zoom towards a point (the speaker's head) that changes from line to line, so a
 * long scene feels cut into several shots without re-rendering anything.
 */
export const Camera: React.FC<{
  kind: CameraKind;
  duration: number;
  frameOffset?: number;
  shake?: number;
  punch?: number;
  /** extra zoom (1 = none) around `origin` (px) */
  zoom?: number;
  origin?: { x: number; y: number };
  children: React.ReactNode;
}> = ({ kind, duration, frameOffset = 0, shake = 0, punch = 0, zoom = 1, origin = { x: 960, y: 620 }, children }) => {
  const frame = Math.max(0,useCurrentFrame()+frameOffset);
  const k = Math.min(1, frame / Math.max(1, duration));
  let scale = 1;
  let tx = 0;
  switch (kind) {
    case "zoom-in":
      scale = 1 + 0.07 * easeInOutSine(k);
      break;
    case "zoom-out":
      scale = 1.07 - 0.07 * easeInOutSine(k);
      break;
    case "pan":
      scale = 1.06;
      tx = interpolate(easeInOutSine(k), [0, 1], [30, -30]);
      break;
    default:
      scale = 1;
  }
  scale += punch;
  const sx = shake * Math.sin(frame * 2.9);
  const sy = shake * Math.cos(frame * 3.7);
  // keep the zoomed shot inside the frame: clamp the origin so no edge pulls away from the border
  const ox = Math.max(0, Math.min(1920, origin.x));
  const oy = Math.max(0, Math.min(1080, origin.y));
  return (
    <AbsoluteFill style={{ transform: `translate(${tx + sx}px, ${sy}px) scale(${scale})`, transformOrigin: "50% 62%" }}>
      <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: `${ox}px ${oy}px` }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};
