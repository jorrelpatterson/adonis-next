// src/app/views/workout/WeekSelector.jsx
import React from 'react';
import { P, FN, FD } from '../../../design/theme';
import { getPhase } from '../../../protocols/body/workout/progression';

export default function WeekSelector({ week, onChange }) {
  const phase = getPhase(week);
  const set = (n) => onChange(Math.max(1, Math.min(16, n)));
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
      marginBottom: 14, padding: '8px 0',
    }}>
      <button aria-label="previous week" onClick={() => set(week - 1)} style={{
        background: 'transparent', border: '1px solid ' + P.bd, color: P.txS,
        borderRadius: 10, width: 36, height: 36, fontSize: 16, cursor: 'pointer', fontFamily: FN,
      }}>&lt;</button>

      <div style={{ textAlign: 'center', minWidth: 120 }}>
        <div style={{ fontFamily: FD, fontStyle: 'italic', fontSize: 18, fontWeight: 300, color: P.gW }}>
          Week {week}
        </div>
        <div style={{ fontSize: 9, color: P.txD, textTransform: 'uppercase', letterSpacing: 2, marginTop: 2 }}>
          {phase}
        </div>
      </div>

      <button aria-label="next week" onClick={() => set(week + 1)} style={{
        background: 'transparent', border: '1px solid ' + P.bd, color: P.txS,
        borderRadius: 10, width: 36, height: 36, fontSize: 16, cursor: 'pointer', fontFamily: FN,
      }}>&gt;</button>
    </div>
  );
}
