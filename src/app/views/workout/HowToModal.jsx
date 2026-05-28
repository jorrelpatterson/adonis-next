// src/app/views/workout/HowToModal.jsx
import React from 'react';
import { P, FN, FD } from '../../../design/theme';
import { s } from '../../../design/styles';
import { EXERCISE_DB, getVideoUrl } from '../../../protocols/body/workout/exercises';

const LEVEL_COLOR = { beginner: P.ok, intermediate: P.warn, advanced: P.err };

export default function HowToModal({ exerciseName, onClose }) {
  const data = EXERCISE_DB[exerciseName] || {};
  const levelColor = LEVEL_COLOR[data.level] || P.txM;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div onClick={e => e.stopPropagation()} style={{
        ...s.card, padding: 22, maxWidth: 520, width: '100%',
        maxHeight: '85vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ fontFamily: FD, fontSize: 22, fontWeight: 300, color: P.gW, fontStyle: 'italic' }}>
              {exerciseName}
            </div>
            {data.level && (
              <span style={{ ...s.tag, background: levelColor + '22', color: levelColor, marginTop: 6 }}>
                {data.level}
              </span>
            )}
          </div>
          <button aria-label="close" onClick={onClose} style={{
            background: 'transparent', border: 'none', color: P.txM, fontSize: 22,
            cursor: 'pointer', padding: 4, lineHeight: 1,
          }}>×</button>
        </div>

        {data.muscles && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ ...s.lab }}>Muscles</div>
            <div style={{ fontSize: 12, color: P.txS }}>{data.muscles}</div>
          </div>
        )}

        {data.form && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ ...s.lab }}>Form</div>
            <div style={{ fontSize: 12, color: P.txS, lineHeight: 1.55 }}>{data.form}</div>
          </div>
        )}

        {data.tips && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ ...s.lab }}>Pro Tips</div>
            <div style={{ fontSize: 12, color: P.txM, lineHeight: 1.55 }}>{data.tips}</div>
          </div>
        )}

        <a
          href={getVideoUrl(exerciseName)}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            ...s.btn, ...s.out, width: '100%', justifyContent: 'center',
            textDecoration: 'none', boxSizing: 'border-box',
          }}
        >
          ▶ Watch Form Video
        </a>
      </div>
    </div>
  );
}
