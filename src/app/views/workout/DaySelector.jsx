// src/app/views/workout/DaySelector.jsx
import React from 'react';
import { P, FN } from '../../../design/theme';
import { getDayCompletion } from '../../../protocols/body/workout/progression';

const LETTERS = ['S','M','T','W','T','F','S'];

const DOT_COLOR = { complete: P.ok, partial: P.warn, empty: 'transparent', rest: P.txD };

export default function DaySelector({ goal, week, dayIdx, program, wkLogs, onSelect }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 14 }}>
      {LETTERS.map((letter, i) => {
        const { status } = getDayCompletion(wkLogs || {}, goal, week, i, program[i]);
        const active = i === dayIdx;
        return (
          <button
            key={i}
            data-active={active ? 'true' : 'false'}
            onClick={() => onSelect(i)}
            style={{
              fontFamily: FN, cursor: 'pointer',
              background: active ? 'rgba(232,213,183,0.08)' : 'transparent',
              border: '1px solid ' + (active ? P.gW + '44' : P.bd),
              borderRadius: 10, padding: '8px 0',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              color: active ? P.gW : P.txM,
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}>{letter}</span>
            <span style={{
              width: 6, height: 6, borderRadius: 3,
              background: DOT_COLOR[status],
              border: status === 'empty' ? '1px solid ' + P.bd : 'none',
            }} />
          </button>
        );
      })}
    </div>
  );
}
