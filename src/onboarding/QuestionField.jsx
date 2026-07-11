import React from 'react';
import { P, FN } from '../design/theme';
import { s } from '../design/styles';

// Renders one question of any type. Controlled component — value + onChange.
export default function QuestionField({ question, value, onChange }) {
  switch (question.type) {
    case 'text':
    case 'number':
      return (
        <input
          type={question.type === 'number' ? 'number' : 'text'}
          inputMode={question.type === 'number' ? 'decimal' : 'text'}
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          placeholder={question.placeholder || ''}
          style={{ ...s.inp }}
        />
      );

    case 'date':
      return (
        <input
          type="date"
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          style={{ ...s.inp, fontFamily: FN }}
        />
      );

    case 'toggle':
      return (
        <button
          type="button"
          onClick={() => onChange(!value)}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 14px',
            borderRadius: 12,
            background: value ? 'rgba(232,213,183,0.08)' : 'transparent',
            border: '1.5px solid ' + (value ? P.gW : P.bd),
            color: P.txS,
            cursor: 'pointer', fontFamily: FN,
            width: '100%', fontSize: 13, fontWeight: 500,
          }}
        >
          <span style={{
            width: 36, height: 20, borderRadius: 10, position: 'relative',
            background: value ? P.gW : 'rgba(232,213,183,0.1)',
            transition: 'all 0.2s',
            flexShrink: 0,
          }}>
            <span style={{
              position: 'absolute', top: 2, left: value ? 18 : 2,
              width: 16, height: 16, borderRadius: 8,
              background: value ? '#0A0B0E' : '#fff',
              transition: 'all 0.2s',
            }} />
          </span>
          {value ? 'Yes' : 'No'}
        </button>
      );

    case 'select':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(question.options || []).map(opt => {
            const isSelected = value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange(opt.value)}
                style={{
                  textAlign: 'left',
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: isSelected ? 'rgba(232,213,183,0.08)' : 'transparent',
                  border: '1.5px solid ' + (isSelected ? P.gW : P.bd),
                  color: isSelected ? P.txS : P.txM,
                  cursor: 'pointer', fontFamily: FN,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600 }}>{opt.label}</div>
                {opt.sub && <div style={{ fontSize: 10, color: P.txD, marginTop: 2 }}>{opt.sub}</div>}
              </button>
            );
          })}
        </div>
      );

    case 'multi': {
      const selected = Array.isArray(value) ? value : [];
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(question.options || []).map(opt => {
            const isSelected = selected.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  const next = isSelected
                    ? selected.filter(v => v !== opt.value)
                    : [...selected, opt.value];
                  onChange(next);
                }}
                style={{
                  textAlign: 'left',
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: isSelected ? 'rgba(232,213,183,0.08)' : 'transparent',
                  border: '1.5px solid ' + (isSelected ? P.gW : P.bd),
                  color: isSelected ? P.txS : P.txM,
                  cursor: 'pointer', fontFamily: FN,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{opt.label}</div>
                  {opt.sub && <div style={{ fontSize: 10, color: P.txD, marginTop: 2 }}>{opt.sub}</div>}
                </div>
                <div style={{
                  width: 18, height: 18, borderRadius: 4,
                  border: '1.5px solid ' + (isSelected ? P.gW : P.bd),
                  background: isSelected ? P.gW : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  color: '#0A0B0E', fontSize: 11, fontWeight: 700,
                }}>
                  {isSelected ? '✓' : ''}
                </div>
              </button>
            );
          })}
        </div>
      );
    }

    default:
      return <div style={{ fontSize: 11, color: P.txD }}>Unknown question type: {question.type}</div>;
  }
}
