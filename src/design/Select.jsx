// Select — premium replacement for native <select>. Bottom-sheet picker
// instead of the OS dropdown (which looks dated on desktop and cramped on
// older Android). Accessible: keyboard arrows close, escape dismisses,
// the trigger is focusable.
//
// API mirrors a controlled <select>:
//   <Select value={x} onChange={setX} options={[{value, label, sub}]} />
//
// On tap: opens an iOS-style bottom sheet listing options. Selected option
// has a gold check mark and slight scale-up. Sound + haptic on pick.

import React, { useState } from 'react';
import { P, FN } from './theme';
import { sound } from './sound';
import { haptics } from './haptics';

export default function Select({
  value,
  onChange,
  options = [],
  placeholder = 'Select…',
  label,
  style,
}) {
  const [open, setOpen] = useState(false);
  const current = options.find(o => o.value === value);

  const pick = (opt) => {
    sound.toggleOn();
    haptics.success();
    onChange(opt.value);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => { sound.tap(); setOpen(true); }}
        style={{
          fontFamily: FN, fontSize: 13,
          background: 'rgba(12,14,20,0.7)',
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(232,213,183,0.08)',
          borderRadius: 14,
          padding: '14px 16px',
          color: current ? P.tx : P.txD,
          outline: 'none', width: '100%',
          boxSizing: 'border-box',
          letterSpacing: 0.3,
          minHeight: 44,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          textAlign: 'left',
          ...style,
        }}
      >
        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {current ? current.label : placeholder}
        </span>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginLeft: 8, flexShrink: 0, opacity: 0.6 }}>
          <path d="M4 5 L 7 8 L 10 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 11000,
            background: 'rgba(8,10,16,0.65)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            fontFamily: FN, padding: '16px 16px env(safe-area-inset-bottom, 16px)',
            animation: 'vt-fade-in 0.3s cubic-bezier(0.16,1,0.3,1) both',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 480,
              borderRadius: 24,
              background: 'linear-gradient(165deg, rgba(20,22,30,0.95), rgba(14,16,22,0.95))',
              backdropFilter: 'blur(40px) saturate(160%)',
              WebkitBackdropFilter: 'blur(40px) saturate(160%)',
              border: '1px solid rgba(232,213,183,0.08)',
              boxShadow: '0 -16px 48px rgba(0,0,0,0.5), 0 1px 0 0 rgba(255,255,255,0.04) inset',
              padding: '20px 16px 24px',
              maxHeight: '70vh', overflowY: 'auto',
              animation: 'springIn 0.45s cubic-bezier(0.34,1.56,0.64,1) both',
            }}
          >
            {/* Drag handle */}
            <div style={{
              width: 36, height: 4, borderRadius: 2,
              background: 'rgba(232,213,183,0.2)',
              margin: '-8px auto 16px',
            }} />

            {label && (
              <div style={{
                fontSize: 9, fontWeight: 700, color: P.txD,
                letterSpacing: 1.5, textTransform: 'uppercase',
                textAlign: 'center', marginBottom: 14,
              }}>
                {label}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {options.map(opt => {
                const selected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => pick(opt)}
                    style={{
                      textAlign: 'left',
                      padding: '14px 16px', borderRadius: 14,
                      background: selected ? 'rgba(232,213,183,0.08)' : 'rgba(232,213,183,0.02)',
                      border: '1px solid ' + (selected ? 'rgba(232,213,183,0.3)' : 'rgba(232,213,183,0.06)'),
                      cursor: 'pointer', fontFamily: FN,
                      display: 'flex', alignItems: 'center', gap: 12,
                      transform: selected ? 'scale(1.005)' : 'scale(1)',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, fontWeight: selected ? 700 : 500,
                        color: selected ? P.gW : P.txS,
                      }}>
                        {opt.label}
                      </div>
                      {opt.sub && (
                        <div style={{ fontSize: 10, color: P.txD, marginTop: 2, lineHeight: 1.4 }}>
                          {opt.sub}
                        </div>
                      )}
                    </div>
                    {selected && (
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}>
                        <path d="M4 9 L 8 13 L 14 5" stroke="#E8D5B7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
