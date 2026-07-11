// StreakMilestone — full-screen takeover when the user crosses a streak tier.
// Tiers: 7 (Bronze), 14 (Silver), 30 (Gold), 100 (Legend).
//
// Mounted from RoutineView, watches computeRoutineStreak() against a stored
// "last shown" key. When streak >= next tier AND we haven't shown that tier
// yet, fires the screen, then sets the key so it doesn't re-show.
//
// Design: large flame SVG (color = tier), serif headline, tier name, day
// count count-up, particle accent, sound + haptic on entry.

import React, { useEffect } from 'react';
import { P, FN, FD, FM } from '../../design/theme';
import { GradText } from '../../design/components';
import { sound } from '../../design/sound';
import { haptics } from '../../design/haptics';
import StatNumber from '../../design/StatNumber';

export const STREAK_TIERS = [
  { days: 7,   name: 'Bronze',   color: '#CD7F32', glow: 'rgba(205,127,50,0.4)',  copy: 'A full week. The system has rhythm now.' },
  { days: 14,  name: 'Silver',   color: '#E0E0E4', glow: 'rgba(224,224,228,0.4)', copy: 'Two weeks unbroken. This is who you are now.' },
  { days: 30,  name: 'Gold',     color: '#FFD700', glow: 'rgba(255,215,0,0.5)',   copy: 'Thirty days. Most people quit by day three.' },
  { days: 100, name: 'Legend',   color: '#FF6B35', glow: 'rgba(255,107,53,0.6)',  copy: 'One hundred days. The protocol is alive.' },
];

const STORAGE_KEY = 'adonis_streak_milestone_shown';

export function getLastShownMilestone() {
  if (typeof window === 'undefined') return 0;
  try { return Number(localStorage.getItem(STORAGE_KEY)) || 0; } catch { return 0; }
}

export function setLastShownMilestone(days) {
  try { localStorage.setItem(STORAGE_KEY, String(days)); } catch { /* noop */ }
}

/**
 * Returns the tier object that should be celebrated, or null. Pass the
 * current streak; we cross-reference against the stored "last shown" value.
 */
export function getPendingMilestone(currentStreak) {
  const lastShown = getLastShownMilestone();
  // Find the highest tier the user has now reached but hasn't been shown yet.
  for (let i = STREAK_TIERS.length - 1; i >= 0; i--) {
    const tier = STREAK_TIERS[i];
    if (currentStreak >= tier.days && lastShown < tier.days) return tier;
  }
  return null;
}

export default function StreakMilestone({ tier, days, onClose }) {
  useEffect(() => {
    sound.pr();
    haptics.success();
  }, []);

  if (!tier) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10001,
      background: `radial-gradient(ellipse at center, ${tier.color}22 0%, rgba(6,7,9,0.99) 70%)`,
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: FN, padding: 32, textAlign: 'center',
      animation: 'vt-fade-in 0.5s cubic-bezier(0.16,1,0.3,1) both',
    }}>
      {/* Halo */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 360, height: 360, borderRadius: '50%',
        background: `radial-gradient(circle, ${tier.glow} 0%, ${tier.color}22 30%, transparent 65%)`,
        animation: 'pulseGlow 2.5s ease-in-out infinite',
        pointerEvents: 'none',
      }} />

      {/* Big flame */}
      <svg
        width={140} height={170} viewBox="0 0 140 170"
        style={{
          marginBottom: 24,
          animation: 'springScale 0.7s cubic-bezier(0.34,1.56,0.64,1) both',
          filter: `drop-shadow(0 8px 32px ${tier.glow})`,
        }}
      >
        <defs>
          <linearGradient id={`g-flame-${tier.name}`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor={tier.color} stopOpacity="1" />
            <stop offset="0.6" stopColor={tier.color} stopOpacity="0.85" />
            <stop offset="1" stopColor="#FFFFFF" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id={`g-flame-inner-${tier.name}`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.3" />
            <stop offset="1" stopColor="#FFFFFF" stopOpacity="0.9" />
          </linearGradient>
        </defs>
        <g className="adn-flame">
          <path
            d="M70 10 C 70 50, 30 70, 30 110 C 30 140, 50 165, 70 165 C 90 165, 110 140, 110 110 C 110 80, 90 70, 80 35 C 75 55, 50 65, 70 10 Z"
            fill={`url(#g-flame-${tier.name})`}
          />
          <path
            d="M70 60 C 70 80, 55 90, 55 115 C 55 130, 62 150, 70 150 C 78 150, 85 130, 85 115 C 85 95, 70 85, 70 60 Z"
            fill={`url(#g-flame-inner-${tier.name})`}
          />
        </g>
      </svg>

      {/* Tier label */}
      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: 4,
        textTransform: 'uppercase', color: tier.color,
        marginBottom: 12, opacity: 0.95,
        animation: 'springScale 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.3s both',
      }}>
        {tier.name} Streak Unlocked
      </div>

      {/* Days */}
      <div style={{
        fontFamily: FM,
        fontSize: 'clamp(72px, 24vw, 144px)',
        fontWeight: 700, letterSpacing: -2,
        color: P.tx, lineHeight: 1,
        fontVariantNumeric: 'tabular-nums',
        textShadow: `0 4px 32px ${tier.glow}, 0 0 80px ${tier.color}44`,
        animation: 'springScale 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.4s both',
      }}>
        <StatNumber value={days} initial={0} format={(n) => Math.round(n)} duration={1200} />
        <span style={{ fontSize: '0.32em', color: tier.color, marginLeft: 8, fontWeight: 500 }}>
          days
        </span>
      </div>

      {/* Headline */}
      <h2 style={{
        fontFamily: FD,
        fontSize: 'clamp(20px, 6vw, 24px)',
        fontWeight: 300, fontStyle: 'italic',
        margin: '20px 0 0',
        maxWidth: 420,
        lineHeight: 1.3,
        animation: 'springScale 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.6s both',
      }}>
        <GradText>{tier.copy}</GradText>
      </h2>

      <button
        onClick={onClose}
        style={{
          marginTop: 36,
          padding: '14px 40px', borderRadius: 100,
          background: `linear-gradient(135deg, ${tier.color}, ${tier.color}dd)`,
          color: '#0A0B0E', fontFamily: FN, fontSize: 13, fontWeight: 700,
          letterSpacing: 0.5, border: 'none', cursor: 'pointer',
          boxShadow: `0 6px 24px ${tier.glow}, 0 1px 0 0 rgba(255,255,255,0.3) inset`,
          animation: 'springScale 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.8s both',
        }}
      >
        Keep Going
      </button>
    </div>
  );
}
