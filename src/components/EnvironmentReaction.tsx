import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {sampleEnvironment, type EnvironmentEvent} from '../lib/environment';
import {W, H} from '../lib/layout';

export const EnvironmentReaction: React.FC<{background: string; events: readonly EnvironmentEvent[]; quiet: boolean; frameOffset?: number}> = ({background, events, quiet, frameOffset = 0}) => {
  const frame = useCurrentFrame() + frameOffset;
  const {fps} = useVideoConfig();
  const samples = sampleEnvironment(background, events, frame, fps, quiet);
  if (!samples.length) return null;
  return <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', left: 0, top: 0, pointerEvents: 'none'}}>
    {samples.map((event, index) => <g key={`${event.kind}-${event.from}-${index}`} opacity={event.opacity} transform={`translate(${event.x} ${event.y}) rotate(${event.rotation})`}>
      {event.kind === 'ripple' ? <>
        <ellipse rx={event.radius} ry={event.radius * .2} stroke="#e5f6f2" strokeWidth={3} fill="none" />
        <ellipse rx={event.radius * .66} ry={event.radius * .12} stroke="#c1e4dc" strokeWidth={2} fill="none" />
      </> : event.kind === 'leaf' ? <>
        <path d="M-14 0 Q-7-13 14 0 Q7 13-14 0Z" fill="#d9b86c" stroke="#998698" strokeWidth={1.5} />
        <path d="M-12 0H12" stroke="#998698" strokeWidth={1.5} />
      </> : <path d={`M${-event.radius} 0H${event.radius} M0 ${-event.radius}V${event.radius} M${-event.radius * .45} ${-event.radius * .45}L${event.radius * .45} ${event.radius * .45} M${event.radius * .45} ${-event.radius * .45}L${-event.radius * .45} ${event.radius * .45}`} stroke="#f4db8b" strokeWidth={3} strokeLinecap="round" />}
    </g>)}
  </svg>;
};
