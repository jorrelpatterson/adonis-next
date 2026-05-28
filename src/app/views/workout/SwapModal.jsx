// src/app/views/workout/SwapModal.jsx
import React from 'react';
import { P, FD } from '../../../design/theme';
import { s } from '../../../design/styles';
import { EXERCISE_ALTS } from '../../../protocols/body/workout/exercises';

export default function SwapModal({ exerciseName, current, onPick, onClose }) {
  const alts = EXERCISE_ALTS[exerciseName] || [];

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div onClick={e => e.stopPropagation()} style={{
        ...s.card, padding: 22, maxWidth: 460, width: '100%',
        maxHeight: '80vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <div style={{ fontFamily: FD, fontSize: 20, fontWeight: 300, color: P.gW, fontStyle: 'italic' }}>
            Swap exercise
          </div>
          <button aria-label="close" onClick={onClose} style={{
            background: 'transparent', border: 'none', color: P.txM, fontSize: 22,
            cursor: 'pointer', padding: 4, lineHeight: 1,
          }}>×</button>
        </div>
        <div style={{ fontSize: 11, color: P.txD, marginBottom: 14 }}>
          For this session only — swaps don't change your program.
        </div>

        {alts.length === 0 ? (
          <div style={{ fontSize: 12, color: P.txM, padding: '20px 0', textAlign: 'center' }}>
            No alternatives mapped for {exerciseName}.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {alts.map(alt => (
              <button
                key={alt}
                onClick={() => onPick(alt)}
                style={{
                  ...s.btn, ...s.out, justifyContent: 'flex-start',
                  background: alt === current ? 'rgba(232,213,183,0.08)' : s.out.background,
                }}
              >
                {alt}
              </button>
            ))}
          </div>
        )}

        {current && (
          <button
            onClick={() => onPick(null)}
            style={{
              ...s.btn, ...s.out, width: '100%', marginTop: 14, justifyContent: 'center',
              color: P.txM, fontSize: 11,
            }}
          >
            Revert to {exerciseName}
          </button>
        )}
      </div>
    </div>
  );
}
