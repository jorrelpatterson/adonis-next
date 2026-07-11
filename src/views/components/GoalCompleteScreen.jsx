// GoalCompleteScreen — full-screen ceremony when a goal hits 100%.
// Sister to PRCelebration, calibrated for the longer-arc moment of finishing
// a goal that took weeks/months. Less confetti chaos, more reverent.

import React, { useEffect } from 'react';
import { P, FN, FD, FM } from '../../design/theme';
import { GradText } from '../../design/components';
import { sound } from '../../design/sound';
import { haptics } from '../../design/haptics';

// Render a square share image (canvas → blob → Web Share API or download).
async function renderShareImage({ goal, days }) {
  const W = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = W;
  const ctx = canvas.getContext('2d');

  // Background — dark gradient with green halo
  const bg = ctx.createRadialGradient(W / 2, W * 0.45, 60, W / 2, W * 0.45, W);
  bg.addColorStop(0, 'rgba(16,30,24,1)');
  bg.addColorStop(0.5, 'rgba(8,12,10,1)');
  bg.addColorStop(1, 'rgba(6,7,9,1)');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, W);

  // Halo glow
  const halo = ctx.createRadialGradient(W / 2, W * 0.4, 50, W / 2, W * 0.4, 350);
  halo.addColorStop(0, 'rgba(52,211,153,0.4)');
  halo.addColorStop(1, 'rgba(52,211,153,0)');
  ctx.fillStyle = halo;
  ctx.beginPath(); ctx.arc(W / 2, W * 0.4, 350, 0, 2 * Math.PI); ctx.fill();

  // Big checkmark in a ring
  ctx.save();
  ctx.translate(W / 2, W * 0.4);
  ctx.strokeStyle = 'rgba(52,211,153,0.5)';
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(0, 0, 130, 0, 2 * Math.PI); ctx.stroke();
  ctx.fillStyle = 'rgba(52,211,153,0.06)';
  ctx.beginPath(); ctx.arc(0, 0, 105, 0, 2 * Math.PI); ctx.fill();
  // Check
  ctx.strokeStyle = '#34D399';
  ctx.lineWidth = 14;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(-46, 6); ctx.lineTo(-12, 40); ctx.lineTo(56, -32); ctx.stroke();
  ctx.restore();

  // Eyebrow
  ctx.fillStyle = '#34D399';
  ctx.textAlign = 'center';
  ctx.font = '700 22px "Outfit", sans-serif';
  const eyebrow = 'GOAL COMPLETE';
  ctx.fillText([...eyebrow].join(' '), W / 2, W * 0.62);

  // Title (serif italic)
  ctx.fillStyle = '#F5F5F7';
  ctx.font = '300 italic 56px "Cormorant Garamond", Georgia, serif';
  const title = goal?.title || 'You did it.';
  // word-wrap
  const maxW = W * 0.78;
  const words = title.split(/\s+/);
  let line = '';
  let y = W * 0.7;
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxW) {
      ctx.fillText(line, W / 2, y);
      y += 64;
      line = word;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, W / 2, y);

  // Days + 100%
  if (days != null) {
    ctx.font = '700 56px "JetBrains Mono", monospace';
    ctx.fillStyle = '#F5F5F7';
    ctx.fillText(String(days), W / 2 - 90, W * 0.86);
    ctx.fillStyle = '#34D399';
    ctx.fillText('100%', W / 2 + 110, W * 0.86);

    ctx.font = '700 16px "Outfit", sans-serif';
    ctx.fillStyle = '#9CA3AF';
    ctx.fillText('DAYS', W / 2 - 90, W * 0.89);
    ctx.fillText('COMPLETE', W / 2 + 110, W * 0.89);
  }

  // Brand monogram (bottom)
  ctx.fillStyle = '#E8D5B7';
  ctx.font = '300 italic 48px "Cormorant Garamond", Georgia, serif';
  ctx.fillText('Adonis', W / 2, W * 0.96);

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

async function shareOrDownload({ goal, days }) {
  const blob = await renderShareImage({ goal, days });
  if (!blob) return;
  const file = new File([blob], 'adonis-goal-complete.png', { type: 'image/png' });
  // Web Share API (preferred on mobile)
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Goal complete' });
      return;
    } catch { /* user dismissed; fall through to download */ }
  }
  // Fallback: download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'adonis-goal-complete.png';
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

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

  // Default share handler if parent doesn't provide one — render a square
  // image and trigger the native share sheet (or download fallback).
  const handleShare = onShare || (() => shareOrDownload({ goal, days }));

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
        <button
          onClick={handleShare}
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
