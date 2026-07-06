// ProgressBar — premium fill bar that animates to its target value.
// Used wherever we render a percentage or progress.
//
//   <ProgressBar value={68} max={100} color="#34D399" />
//   <ProgressBar value={1240} max={1780} label="kcal" />
//
// Visuals:
//   - Rounded full radius
//   - Gradient fill (color → color-light) with subtle inner highlight
//   - Soft glow shadow tinted to the fill color
//   - Animates from 0 → value on mount (1.2s spring-decel)
//   - Stays animated on value changes (0.6s)

import React from 'react';
import { P } from './theme';

export default function ProgressBar({
  value = 0,
  max = 100,
  color = '#E8D5B7',
  background = 'rgba(232,213,183,0.05)',
  height = 6,
  showRail = true,
  style,
}) {
  const pct = Math.max(0, Math.min(100, (Number(value) / Number(max)) * 100 || 0));
  const lightColor = color + 'cc';

  return (
    <div style={{
      width: '100%', height, borderRadius: height,
      background: showRail ? background : 'transparent',
      overflow: 'hidden',
      boxShadow: showRail ? 'inset 0 1px 2px rgba(0,0,0,0.2)' : 'none',
      position: 'relative',
      ...style,
    }}>
      <div style={{
        width: pct + '%',
        height: '100%',
        borderRadius: height,
        background: `linear-gradient(90deg, ${color} 0%, ${lightColor} 100%)`,
        boxShadow: `0 0 8px ${color}55, 0 1px 0 0 rgba(255,255,255,0.15) inset`,
        transition: 'width 1.2s cubic-bezier(0.16,1,0.3,1)',
      }} />
    </div>
  );
}
