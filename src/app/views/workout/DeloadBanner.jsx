// src/app/views/workout/DeloadBanner.jsx
import React from 'react';
import { P, FN } from '../../../design/theme';

export default function DeloadBanner() {
  return (
    <div style={{
      background: 'rgba(251,191,36,0.08)',
      border: '1px solid rgba(251,191,36,0.25)',
      borderRadius: 12, padding: '12px 14px', marginBottom: 14,
      display: 'flex', alignItems: 'flex-start', gap: 10, fontFamily: FN,
    }}>
      <div style={{ fontSize: 16 }}>⚠</div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: P.warn, marginBottom: 2 }}>
          Deload week
        </div>
        <div style={{ fontSize: 11, color: P.txS, lineHeight: 1.5 }}>
          Cut volume 40–50% this week. Reduce all sets by half or drop weight 40%.
        </div>
      </div>
    </div>
  );
}
