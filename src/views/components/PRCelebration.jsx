// PRCelebration — full-screen takeover when a user logs a new personal record.
//
// Designed as the most memorable visual moment in the app — the kind of
// screen people screenshot. Choreography (timed milliseconds):
//
//   0    backdrop fades in, particle field begins, gold ring pulses
//   100  lift number from 0 to PR weight (count-up easeOutExpo)
//   200  serif "PR" label reveals
//   300  exercise + reps line slides up
//   500  share button fades in
//
// Confetti burst uses CSS keyframes (confettiBurst) with random end-points
// so each particle has unique trajectory. Sound + haptic fired by parent.

import React, { useEffect, useMemo, useState } from 'react';
import { P, FN, FD, FM } from '../../design/theme';
import { GradText } from '../../design/components';
import { sound } from '../../design/sound';
import { haptics } from '../../design/haptics';
import { countUpTo } from '../../design/motion';

const CONFETTI_COLORS = [
  '#E8D5B7', // gold
  '#C9B89A', // gold dim
  '#B8C4D0', // silver
  '#34D399', // ok green
  '#FBBF24', // warn amber
  '#A855F7', // purple
];

function makeConfetti(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    cx: (Math.random() - 0.5) * window.innerWidth * 1.2 + 'px',
    cy: -(Math.random() * window.innerHeight * 0.7 + 200) + 'px',
    cr: (Math.random() * 1440 - 720) + 'deg',
    delay: Math.random() * 0.2,
    leftPct: 50 + (Math.random() - 0.5) * 20,
    topPct: 60 + Math.random() * 10,
  }));
}

export default function PRCelebration({ exercise, weight, reps, onClose }) {
  const [display, setDisplay] = useState(0);
  const confetti = useMemo(() => (typeof window !== 'undefined' ? makeConfetti(60) : []), []);

  useEffect(() => {
    sound.pr();
    haptics.success();
    const cancel = countUpTo({
      from: 0, to: Number(weight) || 0,
      duration: 1000,
      easing: (t) => 1 - Math.pow(1 - t, 4),  // easeOutQuart
      onUpdate: setDisplay,
    });
    return cancel;
  }, [weight]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10001,
      background: 'radial-gradient(ellipse at center, rgba(20,16,8,0.96), rgba(6,7,9,0.99))',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: FN, padding: 24,
      animation: 'vt-fade-in 0.4s cubic-bezier(0.16,1,0.3,1) both',
    }}>
      {/* Confetti */}
      {confetti.map(c => (
        <span
          key={c.id}
          className="adn-confetti"
          style={{
            background: c.color,
            left: c.leftPct + '%',
            top: c.topPct + '%',
            animationDelay: c.delay + 's',
            '--cx': c.cx,
            '--cy': c.cy,
            '--cr': c.cr,
          }}
        />
      ))}

      {/* Gold ring halo behind number */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 320, height: 320, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(232,213,183,0.18) 0%, rgba(232,213,183,0.04) 40%, transparent 65%)',
        animation: 'pulseGlow 2s ease-in-out infinite',
        pointerEvents: 'none',
      }} />

      {/* Eyebrow */}
      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: 4,
        textTransform: 'uppercase', color: P.gW,
        marginBottom: 20, opacity: 0.85,
        animation: 'springScale 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.2s both',
      }}>
        New Personal Record
      </div>

      {/* The big number */}
      <div style={{
        fontFamily: FM,
        fontSize: 'clamp(72px, 22vw, 144px)',
        fontWeight: 700, letterSpacing: -2,
        color: P.tx,
        lineHeight: 1,
        fontVariantNumeric: 'tabular-nums',
        textShadow: '0 4px 32px rgba(232,213,183,0.4), 0 0 80px rgba(232,213,183,0.15)',
      }}>
        {Math.round(display)}
        <span style={{ fontSize: '0.34em', color: P.gW, marginLeft: 6, fontWeight: 500 }}>lb</span>
      </div>

      {/* Serif PR label */}
      <div style={{
        fontFamily: FD,
        fontSize: 'clamp(28px, 8vw, 40px)',
        fontWeight: 300, fontStyle: 'italic',
        marginTop: 6,
        animation: 'springScale 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.35s both',
      }}>
        <GradText>Personal Record</GradText>
      </div>

      {/* Exercise + reps */}
      <div style={{
        fontSize: 14, color: P.txM,
        marginTop: 14, textAlign: 'center',
        animation: 'springScale 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.5s both',
      }}>
        {exercise}
        {reps != null && <> · {reps} rep{reps === 1 ? '' : 's'}</>}
      </div>

      {/* Continue */}
      <button
        onClick={onClose}
        style={{
          marginTop: 36,
          padding: '14px 40px', borderRadius: 100,
          background: 'linear-gradient(135deg,#E8D5B7,#C9B89A,#B8C4D0)',
          color: '#0A0B0E', fontFamily: FN, fontSize: 13, fontWeight: 700,
          letterSpacing: 0.5, border: 'none', cursor: 'pointer',
          boxShadow: '0 6px 24px rgba(232,213,183,0.3), 0 1px 0 0 rgba(255,255,255,0.3) inset',
          animation: 'springScale 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.7s both',
        }}
      >
        Continue
      </button>
    </div>
  );
}
