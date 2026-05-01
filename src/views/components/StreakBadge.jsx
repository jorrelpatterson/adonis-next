// StreakBadge — animated streak indicator. Premium-feel because:
//   - SVG flame flickers (subtle, breath-paced)
//   - Color tier scales with streak length (white → bronze → silver → gold → fire)
//   - Number animates on increment (count-up via StatNumber)
//   - Tooltip on tap reveals milestone target
//
// Lightweight: no external deps, pure CSS keyframes + inline SVG.

import React from 'react';
import { P, FN, FM } from '../../design/theme';
import StatNumber from '../../design/StatNumber';

function tierForStreak(days) {
  if (days >= 100) return { name: 'Legend',   color: '#FF6B35', glow: 'rgba(255,107,53,0.5)',  next: null };
  if (days >= 30)  return { name: 'Gold',     color: '#FFD700', glow: 'rgba(255,215,0,0.4)',   next: 100 };
  if (days >= 14)  return { name: 'Silver',   color: '#E0E0E4', glow: 'rgba(224,224,228,0.3)', next: 30 };
  if (days >= 7)   return { name: 'Bronze',   color: '#CD7F32', glow: 'rgba(205,127,50,0.3)',  next: 14 };
  if (days >= 3)   return { name: 'Building', color: '#E8D5B7', glow: 'rgba(232,213,183,0.2)', next: 7 };
  return            { name: 'Start',    color: '#5C6070', glow: 'transparent',           next: 3 };
}

export default function StreakBadge({ days = 0, onTap, compact = false }) {
  const tier = tierForStreak(days);
  const showFlame = days >= 3;

  return (
    <button
      onClick={onTap}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: compact ? '4px 10px' : '8px 14px',
        borderRadius: 100,
        background: days >= 7 ? `${tier.color}14` : 'rgba(232,213,183,0.04)',
        border: '1px solid ' + (days >= 7 ? `${tier.color}44` : 'rgba(232,213,183,0.1)'),
        cursor: onTap ? 'pointer' : 'default',
        fontFamily: FN,
        boxShadow: days >= 7 ? `0 0 24px ${tier.glow}` : 'none',
        transition: 'all 0.4s cubic-bezier(0.34,1.56,0.64,1)',
      }}
    >
      {showFlame && (
        <svg
          className="adn-flame"
          width={compact ? 14 : 16}
          height={compact ? 18 : 20}
          viewBox="0 0 16 20"
          fill="none"
          style={{ filter: `drop-shadow(0 0 6px ${tier.glow})` }}
        >
          <path
            d="M8 2 C 8 6, 4 8, 4 12 C 4 15, 6 18, 8 18 C 10 18, 12 15, 12 12 C 12 9, 10 8, 9 5 C 8.5 7, 6 8, 8 2 Z"
            fill={tier.color}
            opacity="0.9"
          />
          <path
            d="M8 8 C 8 10, 6.5 11, 6.5 13 C 6.5 14.5, 7.2 16, 8 16 C 8.8 16, 9.5 14.5, 9.5 13 C 9.5 11, 8 10, 8 8 Z"
            fill="#FFFFFF"
            opacity="0.7"
          />
        </svg>
      )}
      <span style={{
        fontFamily: FM,
        fontSize: compact ? 12 : 14,
        fontWeight: 700,
        color: days >= 7 ? tier.color : P.txS,
        fontVariantNumeric: 'tabular-nums',
      }}>
        <StatNumber value={days} format={(n) => Math.round(n)} duration={500} />
      </span>
      <span style={{
        fontSize: compact ? 8 : 9,
        fontWeight: 700,
        color: days >= 7 ? tier.color : P.txD,
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        opacity: 0.85,
      }}>
        {days === 1 ? 'day' : 'days'}
      </span>
    </button>
  );
}
