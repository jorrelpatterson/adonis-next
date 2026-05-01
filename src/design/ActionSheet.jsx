// ActionSheet — iOS-style confirmation sheet that slides up from the bottom.
// Premium replacement for window.confirm(). Glass material, spring entrance,
// destructive actions are red, primary actions gold-gradient.
//
// Singleton API exposed via ActionSheetProvider + useActionSheet hook so
// any component can prompt without importing/rendering the sheet itself.

import React, { createContext, useContext, useState, useCallback } from 'react';
import { P, FN, FD } from './theme';
import { GradText } from './components';
import { sound } from './sound';
import { haptics } from './haptics';

const ActionSheetCtx = createContext(null);

export function ActionSheetProvider({ children }) {
  const [pending, setPending] = useState(null);

  const confirm = useCallback((opts) => {
    return new Promise((resolve) => {
      setPending({
        title: opts.title || 'Are you sure?',
        message: opts.message,
        confirmText: opts.confirmText || 'Confirm',
        cancelText: opts.cancelText || 'Cancel',
        destructive: !!opts.destructive,
        resolve,
      });
    });
  }, []);

  const close = (result) => {
    if (pending) {
      pending.resolve(result);
      setPending(null);
    }
  };

  return (
    <ActionSheetCtx.Provider value={{ confirm }}>
      {children}
      {pending && (
        <div
          onClick={() => close(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 11000,
            background: 'rgba(8,10,16,0.65)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            fontFamily: FN, padding: 'env(safe-area-inset-bottom, 16px) 16px 16px',
            animation: 'vt-fade-in 0.3s cubic-bezier(0.16,1,0.3,1) both',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 480,
              borderRadius: 24,
              background: 'linear-gradient(165deg, rgba(20,22,30,0.95), rgba(14,16,22,0.95))',
              backdropFilter: 'blur(40px) saturate(160%)',
              WebkitBackdropFilter: 'blur(40px) saturate(160%)',
              border: '1px solid rgba(232,213,183,0.08)',
              boxShadow: '0 -16px 48px rgba(0,0,0,0.5), 0 1px 0 0 rgba(255,255,255,0.04) inset',
              padding: 24,
              animation: 'springIn 0.45s cubic-bezier(0.34,1.56,0.64,1) both',
            }}
          >
            {/* Drag handle */}
            <div style={{
              width: 36, height: 4, borderRadius: 2,
              background: 'rgba(232,213,183,0.2)',
              margin: '-8px auto 16px',
            }} />

            <div style={{ textAlign: 'center', marginBottom: 18 }}>
              <h3 style={{
                fontFamily: FD,
                fontSize: 22, fontWeight: 300, fontStyle: 'italic',
                margin: 0, color: P.tx, lineHeight: 1.2,
              }}>
                <GradText>{pending.title}</GradText>
              </h3>
              {pending.message && (
                <p style={{
                  fontSize: 12, color: P.txM, lineHeight: 1.55,
                  margin: '8px 0 0', maxWidth: 360, marginLeft: 'auto', marginRight: 'auto',
                }}>
                  {pending.message}
                </p>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                onClick={() => {
                  if (pending.destructive) { sound.warning(); haptics.warning(); }
                  else { sound.success(); haptics.success(); }
                  close(true);
                }}
                style={{
                  padding: '15px 24px', borderRadius: 14,
                  background: pending.destructive
                    ? 'linear-gradient(135deg, #EF4444, #DC2626)'
                    : 'linear-gradient(135deg, #E8D5B7, #C9B89A, #B8C4D0)',
                  color: pending.destructive ? '#fff' : '#0A0B0E',
                  fontFamily: FN, fontSize: 13, fontWeight: 700, letterSpacing: 0.5,
                  border: 'none', cursor: 'pointer',
                  boxShadow: pending.destructive
                    ? '0 4px 16px rgba(239,68,68,0.3), 0 1px 0 0 rgba(255,255,255,0.2) inset'
                    : '0 4px 16px rgba(232,213,183,0.18), 0 1px 0 0 rgba(255,255,255,0.3) inset',
                }}
              >
                {pending.confirmText}
              </button>
              <button
                onClick={() => { sound.tap(); close(false); }}
                style={{
                  padding: '15px 24px', borderRadius: 14,
                  background: 'rgba(232,213,183,0.04)',
                  color: P.txS,
                  fontFamily: FN, fontSize: 13, fontWeight: 600, letterSpacing: 0.3,
                  border: '1px solid rgba(232,213,183,0.1)',
                  cursor: 'pointer',
                }}
              >
                {pending.cancelText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ActionSheetCtx.Provider>
  );
}

export function useActionSheet() {
  const ctx = useContext(ActionSheetCtx);
  if (!ctx) throw new Error('useActionSheet must be inside <ActionSheetProvider>');
  return ctx;
}
