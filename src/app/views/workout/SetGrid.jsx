// src/app/views/workout/SetGrid.jsx
import React from 'react';
import { P, FN, FM } from '../../../design/theme';
import { s } from '../../../design/styles';
import { logKey, prKey } from '../../../protocols/body/workout/keys';

export default function SetGrid({ goal, week, dayIdx, exercise, wkLogs, wkPRs, onSet }) {
  const setCount = exercise.sets || 0;
  const rows = [];
  const pr = wkPRs[prKey(goal, exercise.name)] || 0;

  for (let i = 0; i < setCount; i++) {
    const cur = wkLogs[logKey(goal, week, dayIdx, exercise.name, i)] || {};
    const prev = wkLogs[logKey(goal, week - 1, dayIdx, exercise.name, i)] || {};
    const ghostWt = prev.wt ? String(prev.wt) : '';
    const ghostR = prev.r ? String(prev.r) : (exercise.reps || '');
    const curWt = parseFloat(cur.wt) || 0;
    const isPR = curWt > 0 && curWt > pr;

    const update = (patch) => onSet(i, { wt: cur.wt ?? '', r: cur.r ?? '', c: !!cur.c, ...patch });

    rows.push(
      <div key={i} style={{
        display: 'grid', gridTemplateColumns: '24px 1fr 1fr 32px', gap: 8,
        alignItems: 'center', padding: '6px 0',
        borderBottom: i < setCount - 1 ? '1px solid ' + P.bd : 'none',
      }}>
        <div style={{ fontFamily: FM, fontSize: 11, color: P.txD, textAlign: 'center' }}>{i + 1}</div>

        <div style={{ position: 'relative' }}>
          <input
            type="number"
            inputMode="decimal"
            value={cur.wt ?? ''}
            placeholder={ghostWt}
            onChange={e => update({ wt: e.target.value === '' ? '' : Number(e.target.value) })}
            style={{ ...s.inp, padding: '8px 10px', fontSize: 12, minHeight: 36 }}
          />
          {isPR && (
            <span style={{
              position: 'absolute', top: -6, right: -4,
              fontSize: 8, fontWeight: 700, letterSpacing: 1,
              padding: '2px 6px', borderRadius: 4,
              background: P.gW, color: '#0A0B0E',
            }}>PR</span>
          )}
        </div>

        <input
          type="number"
          inputMode="numeric"
          value={cur.r ?? ''}
          placeholder={ghostR}
          onChange={e => update({ r: e.target.value === '' ? '' : Number(e.target.value) })}
          style={{ ...s.inp, padding: '8px 10px', fontSize: 12, minHeight: 36 }}
        />

        <input
          type="checkbox"
          checked={!!cur.c}
          onChange={e => update({ c: e.target.checked })}
          style={{ width: 20, height: 20, cursor: 'pointer', accentColor: P.ok, margin: '0 auto' }}
        />
      </div>
    );
  }

  return (
    <div>
      <div style={{
        display: 'grid', gridTemplateColumns: '24px 1fr 1fr 32px', gap: 8,
        fontSize: 8, fontWeight: 700, color: P.txD, letterSpacing: 1.5,
        textTransform: 'uppercase', padding: '0 0 6px', borderBottom: '1px solid ' + P.bd,
      }}>
        <div>#</div><div>Weight</div><div>Reps</div><div style={{ textAlign: 'center' }}>✓</div>
      </div>
      {rows}
    </div>
  );
}
