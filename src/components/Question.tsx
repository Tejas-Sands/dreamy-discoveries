import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Question as QuestionSpec } from "../lib/types";
import type { Palette } from "../lib/palettes";
import { Confetti } from "./Particles";
import {fitAnswerText} from '../lib/answerLayout';
import {fontFamily} from '../lib/fonts';

const OUT = "#2f2438";

/** Thought bubble with bouncing dots and a draining timer ring — "your turn to answer!" */
const ThinkBubble: React.FC<{ x: number; y: number; progress: number; scale: number }> = ({ x, y, progress, scale }) => {
  const frame = useCurrentFrame();
  const r = 44;
  const circ = 2 * Math.PI * r;
  return (
    <div style={{ position: "absolute", left: x - 190, top: y - 250, width: 380, height: 260, transform: `scale(${scale})`, transformOrigin: "40% 100%" }}>
      <svg width={380} height={260} viewBox="0 0 380 260">
        <circle cx={70} cy={238} r={14} fill="#fff" stroke={OUT} strokeWidth={4} />
        <circle cx={100} cy={206} r={22} fill="#fff" stroke={OUT} strokeWidth={4} />
        <ellipse cx={200} cy={110} rx={170} ry={95} fill="#fff" stroke={OUT} strokeWidth={5} />
        <g transform="translate(120 110)">
          {[0, 1, 2].map((i) => (
            <circle key={i} cx={i * 46} cy={-Math.abs(Math.sin((frame / 6) + i * 0.9)) * 22 + 10} r={14} fill={["#ff5d9e", "#ffd23f", "#5db9ff"][i]} stroke={OUT} strokeWidth={3} />
          ))}
        </g>
        <g transform="translate(290 108)">
          <circle r={r + 8} fill="#fff" stroke={OUT} strokeWidth={4} />
          <circle r={r} fill="none" stroke="#e8e8f0" strokeWidth={12} />
          <circle r={r} fill="none" stroke="#7ed957" strokeWidth={12} strokeDasharray={circ} strokeDashoffset={circ * progress} strokeLinecap="round" transform="rotate(-90)" />
          <text y={14} textAnchor="middle" fontSize={40} fontWeight={700} fill={OUT}>?</text>
        </g>
      </svg>
    </div>
  );
};

/**
 * The interactive beat: after the question is asked the character thinks (hold),
 * then the answer pops with confetti, then the praise line plays.
 * Frames here are relative to the scene.
 */
export const QuestionOverlay: React.FC<{
  spec: QuestionSpec;
  palette: Palette;
  holdFrom: number;
  holdDuration: number;
  revealFrom: number;
  revealDuration: number;
  bubbleX: number;
  bubbleY: number;
  /** a friend stands on the right: show the answer smaller, between the two heads */
  compact?: boolean;
}> = ({ spec, palette, holdFrom, holdDuration, revealFrom, revealDuration, bubbleX, bubbleY, compact = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inHold = frame >= holdFrom && frame < revealFrom;
  const inReveal = frame >= revealFrom;
  const bubbleIn = spring({ frame: frame - holdFrom, fps, config: { damping: 10, stiffness: 140 } });
  const bubbleOut = interpolate(frame, [revealFrom, revealFrom + 5], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const progress = holdDuration > 0 ? Math.min(1, Math.max(0, (frame - holdFrom) / holdDuration)) : 1;
  const revealSpring = spring({ frame: frame - revealFrom, fps, config: { damping: 8, stiffness: 120 } });
  const answerLife = (frame - revealFrom) / fps;
  const a = spec.answer;
  const bg = a.color ?? palette.accent;
  const layout = React.useMemo(() => {
    const context = typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d');
    return fitAnswerText(a.text, {hasEmoji: !!a.emoji, ...(context ? {measure: (text: string, size: number) => {
      context.font = `700 ${size}px ${fontFamily}`; return context.measureText(text).width;
    }} : {})});
  }, [a.text, a.emoji]);
  const asNumber = /^\d+$/.test(a.text) ? Number(a.text) : 0;
  const countRow = a.emoji && asNumber >= 2 && asNumber <= 10 ? asNumber : 0;

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {inHold || (inReveal && bubbleOut > 0) ? <ThinkBubble x={bubbleX} y={bubbleY} progress={progress} scale={Math.min(bubbleIn, 1) * bubbleOut} /> : null}
      {inReveal ? (
        <>
          <Confetti from={revealFrom} x={compact ? 980 : 1400} y={compact ? 260 : 430} />
          <div
            style={{
              position: "absolute",
              left: compact ? 570 : 1080,
              top: compact ? 30 : 200,
              width: 780,
              height: 520,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: compact ? "flex-start" : "center",
              transform: `scale(${revealSpring * (compact ? 0.72 : 1)}) rotate(${-4 + Math.sin(answerLife * 4) * 3}deg)`,
              transformOrigin: compact ? "50% 15%" : "50% 60%",
            }}
          >
            {countRow ? (
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", width: Math.min(countRow, 5) * 124, gap: 8 }}>
                {Array.from({ length: countRow }).map((_, i) => (
                  <div key={i} style={{ fontSize: 100, lineHeight: 1.1, transform: `scale(${spring({ frame: frame - revealFrom - i * 3, fps, config: { damping: 8, stiffness: 160 } })}) rotate(${Math.sin(answerLife * 5 + i) * 10}deg)` }}>{a.emoji}</div>
                ))}
              </div>
            ) : a.emoji ? (
              <div style={{ fontSize: layout.emojiSize, lineHeight: 1, transform: `scale(${1 + 0.05 * Math.sin(answerLife * 6)})` }}>{a.emoji}</div>
            ) : null}
            <div style={{ marginTop: a.emoji ? 12 : 0, background: bg, border: "10px solid #fff", borderRadius: 48, padding: "16px 24px", width: layout.width, maxWidth: 720, boxSizing: 'border-box', boxShadow: "0 14px 0 rgba(0,0,0,0.18)" }}>
              <div style={{ fontFamily, fontSize: layout.fontSize, fontWeight: 700, color: "#fff", WebkitTextStroke: `${Math.min(9, Math.max(3, layout.fontSize * .06))}px ${OUT}`, paintOrder: "stroke fill", lineHeight: 1.05, textAlign: 'center' }}>
                {layout.lines.map((line, i) => <div key={i} style={{whiteSpace: 'nowrap'}}>{line}</div>)}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};
