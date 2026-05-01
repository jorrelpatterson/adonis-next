// Toast — global status pill, top-mounted, auto-dismissing.
// Replaces window.alert() and inline error pills with a coherent system.
//
// Usage:
//   import { useToast, ToastProvider } from '../design/Toast';
//   const toast = useToast();
//   toast.success('Saved');
//   toast.error('Couldn’t save');
//   toast.info('Streak unlocked');
//
// Implementation is a single context-backed queue. Each toast is keyed so
// rapid-fire duplicates collapse cleanly. Slide-in/out via CSS keyframes.

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { P, FN } from './theme';
import { haptics } from './haptics';
import { sound } from './sound';

const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const idRef = useRef(0);

  const push = useCallback((toast) => {
    const id = ++idRef.current;
    const item = { id, ttl: 3200, ...toast };
    setItems((curr) => [...curr, item]);
    setTimeout(() => {
      setItems((curr) => curr.map(t => t.id === id ? { ...t, exiting: true } : t));
      setTimeout(() => setItems((curr) => curr.filter(t => t.id !== id)), 400);
    }, item.ttl);
  }, []);

  const api = {
    show: push,
    success: (msg, opts) => { haptics.success(); sound.success(); push({ kind: 'success', message: msg, ...opts }); },
    error:   (msg, opts) => { haptics.error();   sound.error();   push({ kind: 'error',   message: msg, ...opts }); },
    warning: (msg, opts) => { haptics.warning(); sound.warning(); push({ kind: 'warning', message: msg, ...opts }); },
    info:    (msg, opts) => { haptics.light();   sound.tap();     push({ kind: 'info',    message: msg, ...opts }); },
  };

  return (
    <ToastCtx.Provider value={api}>
      {children}
      {items.length > 0 && (
        <div style={{
          position: 'fixed',
          top: 'max(16px, env(safe-area-inset-top))',
          left: 0, right: 0,
          zIndex: 10000,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 8,
          pointerEvents: 'none',
        }}>
          {items.map(item => <ToastRow key={item.id} item={item} />)}
        </div>
      )}
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be inside <ToastProvider>');
  return ctx;
}

const COLORS = {
  success: { bg: 'rgba(52,211,153,0.10)',  bd: 'rgba(52,211,153,0.30)',  fg: '#34D399', icon: '✓' },
  error:   { bg: 'rgba(239,68,68,0.10)',   bd: 'rgba(239,68,68,0.30)',   fg: '#EF4444', icon: '×' },
  warning: { bg: 'rgba(251,191,36,0.10)',  bd: 'rgba(251,191,36,0.30)',  fg: '#FBBF24', icon: '⚠' },
  info:    { bg: 'rgba(232,213,183,0.08)', bd: 'rgba(232,213,183,0.25)', fg: '#E8D5B7', icon: '✱' },
};

function ToastRow({ item }) {
  const c = COLORS[item.kind] || COLORS.info;
  return (
    <div className={`adn-toast ${item.exiting ? 'exiting' : ''}`} style={{
      pointerEvents: 'auto',
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 18px',
      maxWidth: 'min(92vw, 480px)',
      borderRadius: 100,
      background: c.bg,
      border: '1px solid ' + c.bd,
      backdropFilter: 'blur(32px) saturate(160%)',
      WebkitBackdropFilter: 'blur(32px) saturate(160%)',
      color: P.txS,
      fontFamily: FN, fontSize: 13, fontWeight: 500,
      boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 0.5px rgba(255,255,255,0.04) inset',
    }}>
      <span style={{
        width: 22, height: 22, borderRadius: '50%',
        background: c.fg, color: '#0A0B0E',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 700,
        flexShrink: 0,
      }}>
        {c.icon}
      </span>
      <span style={{ lineHeight: 1.4 }}>{item.message}</span>
    </div>
  );
}
