import React from "react";
import type { Emotion } from "../../lib/types";

export const OUTLINE = "#2f2438";

interface FaceParams {
  eyeScale: number;
  pupil: number;
  /** fraction of the eye covered by a droopy upper lid */
  lid: number;
  browShow: boolean;
  browDy: number;
  /** degrees; positive tilts inner ends up (sad / worried), negative = one raised (thinking) */
  browAngle: number;
  mouthW: number;
  curve: number;
  open: number;
  blush: number;
  lookX?: number;
  lookY?: number;
  heartEyes?: boolean;
  sparkle?: boolean;
  tear?: boolean;
  sweat?: boolean;
  wavy?: boolean;
}

const FACES: Record<Emotion, FaceParams> = {
  happy: { eyeScale: 1, pupil: 1, lid: 0, browShow: false, browDy: 0, browAngle: 0, mouthW: 34, curve: 16, open: 0.05, blush: 1 },
  excited: { eyeScale: 1.1, pupil: 1.1, lid: 0, browShow: true, browDy: -7, browAngle: 0, mouthW: 38, curve: 18, open: 0.45, blush: 1.1, sparkle: true },
  sad: { eyeScale: 0.95, pupil: 1, lid: 0.28, browShow: true, browDy: -2, browAngle: 18, mouthW: 26, curve: -10, open: 0.02, blush: 0.4, tear: true },
  surprised: { eyeScale: 1.3, pupil: 0.7, lid: 0, browShow: true, browDy: -12, browAngle: 0, mouthW: 16, curve: 0, open: 0.75, blush: 0.6 },
  thinking: { eyeScale: 1, pupil: 0.95, lid: 0.1, browShow: true, browDy: -6, browAngle: -14, mouthW: 20, curve: 3, open: 0.02, blush: 0.2, lookX: 6, lookY: -6 },
  sleepy: { eyeScale: 1, pupil: 1, lid: 0.55, browShow: false, browDy: 2, browAngle: 0, mouthW: 22, curve: 8, open: 0.05, blush: 0.6 },
  love: { eyeScale: 1.05, pupil: 1, lid: 0, browShow: false, browDy: -5, browAngle: 0, mouthW: 36, curve: 18, open: 0.15, blush: 1.4, heartEyes: true },
  worried: { eyeScale: 1.1, pupil: 0.85, lid: 0, browShow: true, browDy: -6, browAngle: 20, mouthW: 24, curve: -5, open: 0.08, blush: 0.5, sweat: true, wavy: true },
  neutral: { eyeScale: 1, pupil: 1, lid: 0, browShow: false, browDy: 0, browAngle: 0, mouthW: 28, curve: 8, open: 0.02, blush: 0.7 },
};

export interface FaceProps {
  emotion: Emotion;
  /** 0..1 how open the mouth is right now (speech) — added on top of the emotion's base */
  mouth: number;
  /** 0..1 blink (1 = closed) */
  blink: number;
  eyeMode: "open" | "closed" | "happy";
  look: { dx: number; dy: number };
  skin: string;
  /** rig-specific tweaks */
  eyeY?: number;
  eyeGap?: number;
  mouthY?: number;
  mouthDx?: number;
  eyeSize?: number;
  /** ducks: draw a beak instead of a mouth */
  beak?: boolean;
  /** frogs: eyes sit on top of the head with sockets */
  sockets?: boolean;
  uid: string;
}

const Heart: React.FC<{ x: number; y: number; r: number }> = ({ x, y, r }) => (
  <path
    d={`M ${x} ${y + r * 0.9} C ${x - r * 1.4} ${y - r * 0.2}, ${x - r * 0.6} ${y - r * 1.2}, ${x} ${y - r * 0.4} C ${x + r * 0.6} ${y - r * 1.2}, ${x + r * 1.4} ${y - r * 0.2}, ${x} ${y + r * 0.9} Z`}
    fill="#ff4f8b"
  />
);

export const Face: React.FC<FaceProps> = ({
  emotion,
  mouth,
  blink,
  eyeMode,
  look,
  skin,
  eyeY = 92,
  eyeGap = 48,
  mouthY = 128,
  mouthDx = 0,
  eyeSize = 1,
  beak = false,
  sockets = false,
  uid,
}) => {
  const f = FACES[emotion] ?? FACES.happy;
  const rx = 14 * f.eyeScale * eyeSize;
  const ry = 16 * f.eyeScale * eyeSize;
  const pr = 9 * f.pupil * eyeSize;
  const lx = (f.lookX ?? 0) + look.dx;
  const ly = (f.lookY ?? 0) + look.dy;
  const cx = 100 + mouthDx;
  const open = Math.min(1, f.open + mouth * (1 - f.open * 0.5));
  const w = f.mouthW + open * 10;
  const curve = f.curve;

  const eye = (ex: number, side: -1 | 1) => {
    const closedLike = blink > 0.8 || eyeMode === "closed" || eyeMode === "happy";
    if (closedLike) {
      const arcUp = eyeMode === "happy" && blink < 0.8;
      const d = arcUp
        ? `M ${ex - rx} ${eyeY + 2} Q ${ex} ${eyeY - ry * 0.9} ${ex + rx} ${eyeY + 2}`
        : `M ${ex - rx} ${eyeY - 2} Q ${ex} ${eyeY + ry * 0.6} ${ex + rx} ${eyeY - 2}`;
      return <path d={d} stroke={OUTLINE} strokeWidth={4.5} strokeLinecap="round" fill="none" />;
    }
    const sy = 1 - blink * 0.9;
    const clipId = `${uid}-eye${side}`;
    return (
      <g transform={`translate(${ex} ${eyeY}) scale(1 ${sy}) translate(${-ex} ${-eyeY})`}>
        <defs>
          <clipPath id={clipId}>
            <ellipse cx={ex} cy={eyeY} rx={rx} ry={ry} />
          </clipPath>
        </defs>
        {sockets ? (
          // owl facial discs: a big pale plate per eye with a meaty dark ring around the iris
          <>
            <circle cx={ex} cy={eyeY} r={ry + 10} fill="#f6e7c2" stroke={OUTLINE} strokeWidth={4} />
            <circle cx={ex} cy={eyeY} r={ry + 4} fill="#fbf1d2" />
          </>
        ) : null}
        <ellipse cx={ex} cy={eyeY} rx={rx} ry={ry} fill="#ffffff" stroke={OUTLINE} strokeWidth={3.5} />
        <g clipPath={`url(#${clipId})`}>
          {f.heartEyes ? (
            <Heart x={ex + lx * 0.4} y={eyeY + ly * 0.4} r={pr * 1.05} />
          ) : (
            <>
              <circle cx={ex + lx * 0.5 + side * 0} cy={eyeY + 2 + ly * 0.5} r={pr} fill={OUTLINE} />
              <circle cx={ex + lx * 0.5 - pr * 0.35} cy={eyeY + 2 + ly * 0.5 - pr * 0.4} r={pr * 0.32} fill="#ffffff" />
              <circle cx={ex + lx * 0.5 + pr * 0.35} cy={eyeY + 2 + ly * 0.5 + pr * 0.4} r={pr * 0.14} fill="#ffffff" />
              {sockets ? <circle cx={ex + lx * 0.5} cy={eyeY + 2 + ly * 0.5} r={pr + 2} fill="none" stroke={OUTLINE} strokeWidth={4.5} /> : null}
            </>
          )}
          {f.lid > 0 ? (
            <rect x={ex - rx - 2} y={eyeY - ry - 2} width={rx * 2 + 4} height={ry * 2 * f.lid + 2} fill={skin} />
          ) : null}
        </g>
        {f.lid > 0 ? (
          <line x1={ex - rx} y1={eyeY - ry + ry * 2 * f.lid} x2={ex + rx} y2={eyeY - ry + ry * 2 * f.lid} stroke={OUTLINE} strokeWidth={3} strokeLinecap="round" />
        ) : null}
      </g>
    );
  };

  const brow = (ex: number, side: -1 | 1) => {
    if (!f.browShow) return null;
    const by = eyeY - ry - 8 + f.browDy;
    // sad/worried: inner ends up; thinking: only the right brow is raised
    const angle = f.browAngle < 0 ? (side === 1 ? -f.browAngle : 4) : f.browAngle * side;
    const extraDy = f.browAngle < 0 && side === 1 ? -5 : 0;
    return (
      <path
        d={`M ${ex - 11} ${by + 2} Q ${ex} ${by - 4} ${ex + 11} ${by + 2}`}
        stroke={OUTLINE}
        strokeWidth={4.5}
        strokeLinecap="round"
        fill="none"
        transform={`translate(0 ${extraDy}) rotate(${angle} ${ex} ${by})`}
      />
    );
  };

  const mouthEl = (() => {
    if (beak) {
      const gap = open * 14;
      // a wide cartoon bill with a smile line and two nostril dots
      return (
        <g>
          <path d={`M ${cx - 30} ${mouthY - 8} Q ${cx} ${mouthY - 24} ${cx + 30} ${mouthY - 8} Q ${cx} ${mouthY + 5} ${cx - 30} ${mouthY - 8} Z`} fill="#ff9f1a" stroke={OUTLINE} strokeWidth={3.5} strokeLinejoin="round" />
          <path d={`M ${cx - 25} ${mouthY - 6 + gap * 0.3} Q ${cx} ${mouthY + 6 + gap} ${cx + 25} ${mouthY - 6 + gap * 0.3} Q ${cx} ${mouthY + 2 + gap * 0.4} ${cx - 25} ${mouthY - 6 + gap * 0.3} Z`} fill="#f28500" stroke={OUTLINE} strokeWidth={3.5} strokeLinejoin="round" />
          {gap < 8 ? <path d={`M ${cx - 16} ${mouthY - 10} Q ${cx} ${mouthY - 6} ${cx + 16} ${mouthY - 10}`} stroke={OUTLINE} strokeWidth={2.5} fill="none" opacity={0.6} /> : null}
          <circle cx={cx - 10} cy={mouthY - 16} r={2} fill={OUTLINE} />
          <circle cx={cx + 10} cy={mouthY - 16} r={2} fill={OUTLINE} />
        </g>
      );
    }
    if (open < 0.08) {
      const d = f.wavy
        ? `M ${cx - w / 2} ${mouthY} Q ${cx - w / 4} ${mouthY - 5} ${cx} ${mouthY} Q ${cx + w / 4} ${mouthY + 5} ${cx + w / 2} ${mouthY}`
        : `M ${cx - w / 2} ${mouthY} Q ${cx} ${mouthY + curve} ${cx + w / 2} ${mouthY}`;
      return <path d={d} stroke={OUTLINE} strokeWidth={4.5} strokeLinecap="round" fill="none" />;
    }
    const top = mouthY - open * 5;
    const bottom = mouthY + Math.max(4, curve) * 0.6 + open * 26;
    const path = `M ${cx - w / 2} ${mouthY} Q ${cx} ${top} ${cx + w / 2} ${mouthY} Q ${cx} ${bottom} ${cx - w / 2} ${mouthY} Z`;
    const clipId = `${uid}-mouth`;
    return (
      <g>
        <defs>
          <clipPath id={clipId}>
            <path d={path} />
          </clipPath>
        </defs>
        <path d={path} fill="#5a2340" stroke={OUTLINE} strokeWidth={4} strokeLinejoin="round" />
        <ellipse cx={cx} cy={bottom - 2} rx={w * 0.32} ry={open * 11 + 3} fill="#ff7c9c" clipPath={`url(#${clipId})`} />
        {/* tiny rounded upper teeth — only when mouth is open enough and not for every emotion */}
        {open > 0.25 && emotion !== "surprised" ? (
          <>
            <rect x={cx - w * 0.22} y={top + 3} width={w * 0.16} height={6} rx={3} fill="#ffffff" />
            <rect x={cx + w * 0.06} y={top + 3} width={w * 0.16} height={6} rx={3} fill="#ffffff" />
          </>
        ) : null}
      </g>
    );
  })();

  const exL = 100 - eyeGap / 2;
  const exR = 100 + eyeGap / 2;
  return (
    <g>
      {/* blush */}
      {eyeGap !== 0 ? <ellipse cx={exL - 18} cy={mouthY - 10} rx={13} ry={8} fill="#ff8fa8" opacity={0.6 * f.blush} /> : null}
      <ellipse cx={exR + 18} cy={mouthY - 10} rx={13} ry={8} fill="#ff8fa8" opacity={0.6 * f.blush} />
      {eyeGap !== 0 ? eye(exL, -1) : null}
      {eye(exR, 1)}
      {eyeGap !== 0 ? brow(exL, -1) : null}
      {brow(exR, 1)}
      {mouthEl}
      {f.sparkle && eyeMode === "open" && blink < 0.5 ? (
        <>
          <circle cx={exL - 4} cy={eyeY - 6} r={2.2} fill="#fff" />
          <circle cx={exR - 4} cy={eyeY - 6} r={2.2} fill="#fff" />
        </>
      ) : null}
      {f.tear ? <ellipse cx={exR + 10} cy={eyeY + ry + 8} rx={4} ry={6} fill="#7fd0ff" stroke={OUTLINE} strokeWidth={2} /> : null}
      {f.sweat ? <ellipse cx={exR + rx + 12} cy={eyeY - 12} rx={4.5} ry={7} fill="#7fd0ff" stroke={OUTLINE} strokeWidth={2} /> : null}
    </g>
  );
};
