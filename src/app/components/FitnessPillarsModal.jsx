// FitnessPillarsModal — multi-select editor for profile.fitnessPillars.
// First selected pillar is treated as primary (drives workout split + macros
// + peptide stack). Reordering happens via tap-to-promote.

import React, { useState } from 'react';
import { P, FN, FD } from '../../design/theme';
import { s } from '../../design/styles';
import { GradText } from '../../design/components';

const PILLAR_OPTIONS = [
  { id: 'Fat Loss',      icon: '\u{1F525}', label: 'Fat Loss',       sub: 'Cut, lean down' },
  { id: 'Muscle Gain',   icon: '\u{1F4AA}', label: 'Muscle Gain',    sub: 'Build mass' },
  { id: 'Recomposition', icon: '⚡',    label: 'Recomposition',  sub: 'Lose fat + gain muscle' },
  { id: 'Aesthetics',    icon: '✨',    label: 'Aesthetics',     sub: 'Stage / event ready' },
  { id: 'Anti-Aging',    icon: '\u{1F9EC}', label: 'Anti-Aging',     sub: 'Healthspan focus' },
  { id: 'Wellness',      icon: '\u{1F33F}', label: 'Wellness',       sub: 'General health' },
];

export default function FitnessPillarsModal({ initial, onSave, onClose }) {
  const [pillars, setPillars] = useState(() => Array.isArray(initial) ? [...initial] : []);

  const togglePillar = (id) => {
    setPillars(curr => {
      if (curr.includes(id)) return curr.filter(p => p !== id);
      return [...curr, id];
    });
  };

  const promoteToPrimary = (id) => {
    setPillars(curr => {
      if (!curr.includes(id) || curr[0] === id) return curr;
      return [id, ...curr.filter(p => p !== id)];
    });
  };

  const handleSave = () => {
    if (pillars.length === 0) return;
    onSave(pillars);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(8,10,16,0.65)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      fontFamily: FN,
      animation: 'vt-fade-in 0.3s cubic-bezier(0.16,1,0.3,1) both',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        ...s.card,
        width: '100%', maxWidth: 640,
        padding: '20px 16px 24px',
        borderRadius: '20px 20px 0 0',
        maxHeight: '92vh', overflowY: 'auto',
        animation: 'springIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both',
      }}>
        <div style={{ marginBottom: 18, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: P.txD, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>
            Fitness Focus
          </div>
          <div style={{ fontFamily: FD, fontSize: 22, fontWeight: 300, fontStyle: 'italic', color: P.txS }}>
            <GradText>Pick your pillars</GradText>
          </div>
          <div style={{ fontSize: 11, color: P.txD, marginTop: 4, lineHeight: 1.5 }}>
            Tap to add. Tap an active pillar to make it primary — drives your workout split, macros, and peptide stack.
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          {PILLAR_OPTIONS.map(opt => {
            const idx = pillars.indexOf(opt.id);
            const isActive = idx >= 0;
            const isPrimary = idx === 0;
            return (
              <div
                key={opt.id}
                role="button"
                tabIndex={0}
                onClick={() => isActive ? promoteToPrimary(opt.id) : togglePillar(opt.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    isActive ? promoteToPrimary(opt.id) : togglePillar(opt.id);
                  }
                }}
                style={{
                  textAlign: 'left',
                  padding: '12px 14px', borderRadius: 10,
                  background: isPrimary ? 'rgba(232,213,183,0.08)' : isActive ? 'rgba(232,213,183,0.03)' : 'transparent',
                  border: '1px solid ' + (isPrimary ? P.gW : isActive ? 'rgba(232,213,183,0.2)' : P.bd),
                  cursor: 'pointer', fontFamily: FN,
                  display: 'flex', alignItems: 'center', gap: 12,
                  userSelect: 'none',
                }}
              >
                <span style={{ fontSize: 22 }}>{opt.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: isActive ? P.txS : P.txM }}>
                    {opt.label}
                  </div>
                  <div style={{ fontSize: 10, color: P.txD, marginTop: 1 }}>
                    {opt.sub}
                  </div>
                </div>
                {isPrimary && (
                  <span style={{
                    fontSize: 8, fontWeight: 700, letterSpacing: 1.5,
                    color: P.gW, padding: '4px 8px', borderRadius: 6,
                    background: 'rgba(232,213,183,0.1)',
                    border: '1px solid rgba(232,213,183,0.2)',
                  }}>
                    PRIMARY
                  </span>
                )}
                {isActive && !isPrimary && (
                  <span style={{ fontSize: 14, color: P.gW }}>{'✓'}</span>
                )}
                {isActive && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); togglePillar(opt.id); }}
                    style={{
                      background: 'transparent', border: 'none',
                      color: P.txD, cursor: 'pointer',
                      fontSize: 16, padding: '0 4px',
                    }}
                    aria-label={`Remove ${opt.label}`}
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{ ...s.btn, ...s.out, flex: 1, justifyContent: 'center' }}>
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={pillars.length === 0}
            style={{
              ...s.btn, ...s.pri, flex: 2, justifyContent: 'center',
              opacity: pillars.length === 0 ? 0.4 : 1,
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
