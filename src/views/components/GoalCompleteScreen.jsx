// GoalCompleteScreen — full-screen ceremony when a goal hits 100%.
// Sister to PRCelebration, calibrated for the longer-arc moment of finishing
// a goal that took weeks/months. Less confetti chaos, more reverent.

import React, { useEffect } from 'react';
import { P, FN, FD, FM } from '../../design/theme';
import { GradText } from '../../design/components';
import { sound } from '../../design/sound';
import { haptics } from '../../design/haptics';

function daysBetween(startISO, endISO) {
  if (!startISO || !endISO) return null;
  const a = new Date(startISO);
  const b = new Date(endISO);
  if (isNaN(a) || isNaN(b)) return null;
  return Math.max(0, Math.round((b - a) / (1000 * 60 * 60 * 24)));
}

export default function GoalCompleteScreen({ goal, onClose, onShare }) {
  useEffect(() => {
    sound.pr();
    haptics.success();
  }, []);

  const days = daysBetween(goal?.createdAt, new Date().toISOString());

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10001,
      background: 'radial-gradient(ellipse at center, rgba(8,16,12,0.96), rgba(6,7,9,0.99))',
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
        background: 'radial-gradient(circle, rgba(52,211,153,0.16) 0%, rgba(52,211,153,0.04) 40%, transparent 65%)',
        animation: 'pulseGlow 3s ease-in-out infinite',
        pointerEvents: 'none',
      }} />

      {/* Big checkmark in a ring */}
      <svg
        width={120} height={120}
        viewBox="0 0 120 120"
        style={{
          marginBottom: 28,
          animation: 'springScale 0.7s cubic-bezier(0.34,1.56,0.64,1) both',
          filter: 'drop-shadow(0 4px 24px rgba(52,211,153,0.4))',
        }}
      >
        <circle cx={60} cy={60} r={54} fill="none" stroke="rgba(52,211,153,0.3)" strokeWidth={2} />
        <circle cx={60} cy={60} r={44} fill="rgba(52,211,153,0.06)" stroke="rgba(52,211,153,0.5)" strokeWidth={1.5} />
        <path
          d="M40 62 L 54 76 L 82 46"
          fill="none" stroke="#34D399" strokeWidth={4}
          strokeLinecap="round" strokeLinejoin="round"
          style={{
            strokeDasharray: 80,
            strokeDashoffset: 80,
            animation: 'checkDraw 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.3s forwards',
          }}
        />
      </svg>

      {/* Eyebrow */}
      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: 4,
        textTransform: 'uppercase', color: '#34D399',
        marginBottom: 16, opacity: 0.9,
        animation: 'springScale 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.5s both',
      }}>
        Goal Complete
      </div>

      <h2 style={{
        fontFamily: FD,
        fontSize: 'clamp(28px, 8vw, 38px)',
        fontWeight: 300, fontStyle: 'italic',
        margin: '0 0 24px',
        lineHeight: 1.15, letterSpacing: -0.4,
        maxWidth: 480,
        animation: 'springScale 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.6s both',
      }}>
        <GradText>{goal?.title || 'You did it.'}</GradText>
      </h2>

      {/* Stats row */}
      {days != null && (
        <div style={{
          display: 'flex', gap: 24, marginBottom: 36,
          animation: 'springScale 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.75s both',
        }}>
          <div>
            <div style={{ fontFamily: FM, fontSize: 36, fontWeight: 700, color: P.tx, fontVariantNumeric: 'tabular-nums' }}>
              {days}
            </div>
            <div style={{ fontSize: 9, fontWeight: 700, color: P.txD, letterSpacing: 1.5, textTransform: 'uppercase' }}>
              {days === 1 ? 'Day' : 'Days'}
            </div>
          </div>
          <div style={{ width: 1, background: P.bd }} />
          <div>
            <div style={{ fontFamily: FM, fontSize: 36, fontWeight: 700, color: '#34D399', fontVariantNumeric: 'tabular-nums' }}>
              100%
            </div>
            <div style={{ fontSize: 9, fontWeight: 700, color: P.txD, letterSpacing: 1.5, textTransform: 'uppercase' }}>
              Complete
            </div>
          </div>
        </div>
      )}

      {/* Action row */}
      <div style={{
        display: 'flex', gap: 12,
        animation: 'springScale 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.9s both',
      }}>
        {onShare && (
          <button
            onClick={onShare}
            style={{
              padding: '12px 24px', borderRadius: 100,
              background: 'rgba(232,213,183,0.05)',
              color: P.txS, fontFamily: FN, fontSize: 12, fontWeight: 600,
              border: '1px solid rgba(232,213,183,0.15)',
              cursor: 'pointer',
              backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            }}
          >
            Share
          </button>
        )}
        <button
          onClick={onClose}
          style={{
            padding: '14px 36px', borderRadius: 100,
            background: 'linear-gradient(135deg,#34D399,#10B981)',
            color: '#062619', fontFamily: FN, fontSize: 13, fontWeight: 700,
            letterSpacing: 0.5, border: 'none', cursor: 'pointer',
            boxShadow: '0 6px 24px rgba(52,211,153,0.3), 0 1px 0 0 rgba(255,255,255,0.3) inset',
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
