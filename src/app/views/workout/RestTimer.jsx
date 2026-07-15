// src/app/views/workout/RestTimer.jsx
import React, { useEffect, useState } from 'react';
import { P, FN, FM } from '../../../design/theme';

export default function RestTimer({ exerciseName, seconds, onDone, onSkip }) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => { setRemaining(seconds); }, [seconds]);

  useEffect(() => {
    if (remaining <= 0) {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(200); } catch (e) { /* ignore */ }
      }
      onDone && onDone();
      return;
    }
    const id = setInterval(() => setRemaining(r => r - 1), 1000);
    return () => clearInterval(id);
  }, [remaining, onDone]);

  return (
    <div style={{
      // bottom:72 was tuned to clear TabNav's old fixed height; TabNav's
      // padding now grows by --safe-bottom (see app/TabNav.jsx), so this
      // offset grows by the same amount or the pill would sit behind the
      // taller bar on notched devices. Unchanged 72px on web.
      position: 'fixed', bottom: 'calc(72px + var(--safe-bottom))', left: 0, right: 0,
      display: 'flex', justifyContent: 'center', zIndex: 200,
      pointerEvents: 'none',
    }}>
      <div style={{
        pointerEvents: 'auto',
        background: 'rgba(14,16,22,0.92)', backdropFilter: 'blur(20px)',
        border: '1px solid ' + P.bd, borderRadius: 16,
        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14,
        fontFamily: FN, color: P.tx, minWidth: 280, maxWidth: 480,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: P.txD, textTransform: 'uppercase', letterSpacing: 1.5 }}>Rest</div>
          <div style={{ fontSize: 13, color: P.txS, marginTop: 2 }}>{exerciseName}</div>
        </div>
        <div style={{ fontFamily: FM, fontSize: 22, fontWeight: 700, color: P.gW, minWidth: 56, textAlign: 'right' }}>
          {Math.max(0, remaining)}s
        </div>
        <button onClick={onSkip} style={{
          background: 'transparent', color: P.txM, border: '1px solid ' + P.bd,
          borderRadius: 10, padding: '6px 12px', fontSize: 11, cursor: 'pointer', fontFamily: FN,
        }}>Skip</button>
      </div>
    </div>
  );
}
