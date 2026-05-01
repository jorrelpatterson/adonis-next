// ResetConfirmModal — typed-confirmation gate for soft reset.
// User must type RESET to confirm, then re-runs onboarding without
// touching logs (weight, food, exercise, routine, PRs).

import React, { useState } from 'react';
import { P, FN, FD } from '../../design/theme';
import { s } from '../../design/styles';

export default function ResetConfirmModal({ onConfirm, onClose }) {
  const [typed, setTyped] = useState('');
  const ready = typed.trim().toUpperCase() === 'RESET';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(8,10,16,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: FN, padding: 16,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        ...s.card,
        width: '100%', maxWidth: 480,
        padding: 22,
        borderRadius: 16,
      }}>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontFamily: FD, fontSize: 22, fontWeight: 600, color: P.txS, marginBottom: 6 }}>
            Re-run setup?
          </div>
          <div style={{ fontSize: 12, color: P.txM, lineHeight: 1.6 }}>
            This drops you back into onboarding so you can re-answer the questions.
            Your <strong style={{ color: P.txS }}>weight history, food logs, workout PRs, and goals stay</strong> — only your profile answers get overwritten as you go.
          </div>
        </div>

        <div style={{
          padding: 12, borderRadius: 8,
          background: 'rgba(245,158,11,0.04)',
          border: '1px solid rgba(245,158,11,0.15)',
          fontSize: 11, color: P.txM, lineHeight: 1.5,
          marginBottom: 14,
        }}>
          To confirm, type <strong style={{ color: P.warn || '#F59E0B' }}>RESET</strong> below.
        </div>

        <input
          value={typed}
          onChange={e => setTyped(e.target.value)}
          placeholder="Type RESET"
          style={{ ...s.inp, width: '100%', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 2 }}
          autoFocus
        />

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{ ...s.btn, ...s.out, flex: 1, justifyContent: 'center' }}>
            Cancel
          </button>
          <button
            onClick={() => { if (ready) { onConfirm(); onClose(); } }}
            disabled={!ready}
            style={{
              ...s.btn, flex: 1, justifyContent: 'center',
              background: ready ? (P.warn || '#F59E0B') : 'rgba(245,158,11,0.2)',
              color: ready ? '#1a1612' : P.txD,
              border: 'none', cursor: ready ? 'pointer' : 'not-allowed',
              fontWeight: 700,
            }}
          >
            Re-run Setup
          </button>
        </div>
      </div>
    </div>
  );
}
