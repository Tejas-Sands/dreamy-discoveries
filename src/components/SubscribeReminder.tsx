import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {fontFamily} from '../lib/fonts';

/** Pure frame-based artwork: seeking or rendering a muted chunk produces the same reminder. */
export const SubscribeReminder: React.FC<{
  placement: 'middle' | 'end';
  durationInFrames: number;
  bellEnabled?: boolean;
}> = ({placement, durationInFrames, bellEnabled = false}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const enter = Math.min(1, Math.max(0, t / 0.35));
  const exit = Math.min(1, Math.max(0, (durationInFrames - frame) / (fps * 0.3)));
  const click = Math.max(0, 1 - Math.abs(t - 1.5) / 0.16);
  const ring = bellEnabled && t > 2 ? Math.sin((t - 2) * 22) * Math.max(0, 1 - (t - 2) / 0.8) * 16 : 0;
  const compact = placement === 'end';
  return <div data-subscription-reminder={placement} style={{
    position: 'absolute', left: 64, top: compact ? 210 : 40, width: compact ? 490 : 990,
    boxSizing: 'border-box', padding: compact ? '18px 24px' : '18px 28px',
    display: 'flex', flexDirection: compact ? 'column' : 'row', alignItems: 'center', gap: compact ? 12 : 24,
    background: '#fff9eb', border: '4px solid #604274', borderRadius: 32,
    boxShadow: '0 8px 0 #35274130', color: '#3b2850', fontFamily,
    opacity: enter * exit, transform: `translateY(${(1 - enter) * -18}px)`, pointerEvents: 'none',
  }}>
    <div style={{flex: 1, fontSize: compact ? 30 : 36, fontWeight: 600, lineHeight: 1.15, textAlign: compact ? 'center' : 'left'}}>
      {bellEnabled ? 'Subscribe & tap the bell' : 'Parents, subscribe for more stories'}
    </div>
    <div style={{display: 'flex', gap: 14, alignItems: 'center'}}>
      <div style={{position: 'relative', display: 'flex', alignItems: 'center', gap: 14,
        padding: '12px 24px', borderRadius: 22, background: '#b52342', color: '#fff',
        boxShadow: `0 ${6 - click * 4}px 0 #78152c`, transform: `translateY(${click * 4}px)`,
        fontSize: compact ? 36 : 42, fontWeight: 700, lineHeight: 1.1}}>
        <svg aria-hidden="true" width="38" height="38" viewBox="0 0 40 40"><path d="M12 7 32 20 12 33Z" fill="currentColor" stroke="currentColor" strokeWidth="3" strokeLinejoin="round"/></svg>
        Subscribe
        <svg aria-hidden="true" width="42" height="48" viewBox="0 0 42 48" style={{position: 'absolute',right: 12,bottom: -25,opacity: t >= 1 && t <= 1.9 ? 1 : 0,transform: `translateY(${(1 - Math.min(1, Math.max(0, (t - 1) / 0.3))) * 18}px)`}}>
          <path d="M6 3 34 27 23 29 30 42 21 46 14 32 6 40Z" fill="#fff9eb" stroke="#3b2850" strokeWidth="3" strokeLinejoin="round"/>
        </svg>
      </div>
      {bellEnabled ? <svg data-subscription-bell="true" aria-hidden="true" width="58" height="58" viewBox="0 0 48 48" style={{transform: `rotate(${ring}deg)`,transformOrigin: '50% 20%'}}>
        <g fill="none" stroke="#3b2850" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 33h28l-4-7V18a10 10 0 0 0-20 0v8ZM20 39a4 4 0 0 0 8 0M24 5V3"/>
          {t >= 2 ? <path d="M5 13 2 10M43 13l3-3M5 23H1M43 23h4"/> : null}
        </g>
      </svg> : null}
    </div>
  </div>;
};
