// ExerciseDetail — collapsible expansion for a single exercise showing
// muscles, form guide, pro tip, level badge, and "Watch Form Video" link.
// Ported from v1's app.html:6749 inline form-guide block.

import React, { useState } from 'react';
import { P, FN, FM } from '../../design/theme';
import { s } from '../../design/styles';
import { EXERCISE_DB, getVideoUrl } from '../../protocols/body/workout/exercise-db';

const LEVEL_COLORS = {
  beginner:     { bg: 'rgba(52,211,153,0.08)',  fg: '#34D399' },
  intermediate: { bg: 'rgba(245,158,11,0.08)',  fg: '#F59E0B' },
  advanced:     { bg: 'rgba(239,68,68,0.08)',   fg: '#EF4444' },
};

/**
 * Renders an exercise row with sets×reps × rest as the summary line, plus
 * a "How" toggle that expands to reveal muscles + form + tips + level +
 * Watch Form Video. Catalog miss falls back to the basic summary.
 *
 * Props:
 *   - exercise: { name, sets, reps, rest, note? } from program.exercises[i]
 *   - children: optional set-logging UI rendered when expanded (after the form guide)
 */
export default function ExerciseDetail({ exercise, children }) {
  const [open, setOpen] = useState(false);
  if (!exercise) return null;
  const info = EXERCISE_DB[exercise.name];
  const level = info?.level;
  const levelStyle = LEVEL_COLORS[level] || null;

  return (
    <div style={{
      ...s.card,
      padding: 0,
      marginBottom: 8,
      overflow: 'hidden',
    }}>
      {/* Header / summary row */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          width: '100%', padding: '12px 14px', textAlign: 'left',
          fontFamily: FN, color: P.txS,
          display: 'flex', alignItems: 'center', gap: 12,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: P.txS }}>
            {exercise.name}
          </div>
          <div style={{ fontSize: 10, color: P.txD, marginTop: 2, fontFamily: FM }}>
            {exercise.sets}×{exercise.reps}
            {exercise.rest && <span> · Rest {exercise.rest}</span>}
            {info?.muscles && <span style={{ color: '#60A5FA', marginLeft: 6 }}> · {info.muscles}</span>}
          </div>
        </div>
        {levelStyle && (
          <span style={{
            fontSize: 8, padding: '2px 6px', borderRadius: 4,
            background: levelStyle.bg, color: levelStyle.fg,
            fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
          }}>
            {level}
          </span>
        )}
        <span style={{
          fontSize: 14, color: P.txD, flexShrink: 0,
          transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s',
        }}>
          ›
        </span>
      </button>

      {/* Expanded form guide */}
      {open && (
        <div style={{ padding: '0 14px 14px' }}>
          {info ? (
            <div style={{
              padding: 12, borderRadius: 10,
              background: 'rgba(12,14,20,0.6)',
              border: '1px solid rgba(96,165,250,0.15)',
            }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#60A5FA', marginBottom: 8 }}>
                Form Guide
              </div>
              <div style={{ fontSize: 10, color: '#60A5FA', fontWeight: 600, marginBottom: 4 }}>
                Targets: {info.muscles}
              </div>
              <div style={{ fontSize: 11, color: P.txM, lineHeight: 1.7, marginBottom: 8 }}>
                {info.form}
              </div>
              <div style={{ fontSize: 9, fontWeight: 700, color: P.gW, marginBottom: 4, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                Pro Tip
              </div>
              <div style={{ fontSize: 11, color: P.txD, lineHeight: 1.6, fontStyle: 'italic', marginBottom: 10 }}>
                {info.tips}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <a
                  href={getVideoUrl(exercise.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    padding: '6px 10px', borderRadius: 6,
                    background: 'rgba(239,68,68,0.06)',
                    border: '1px solid rgba(239,68,68,0.18)',
                    cursor: 'pointer', fontSize: 9, fontWeight: 700,
                    color: '#EF4444', textDecoration: 'none',
                    letterSpacing: 1, textTransform: 'uppercase',
                  }}
                >
                  ▶ Watch Form Video
                </a>
              </div>
            </div>
          ) : (
            <div style={{
              padding: 12, borderRadius: 10,
              background: 'rgba(12,14,20,0.6)',
              border: '1px dashed ' + P.bd,
              fontSize: 11, color: P.txD, lineHeight: 1.5,
            }}>
              No form guide for this exercise yet.{' '}
              <a
                href={getVideoUrl(exercise.name)}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#EF4444', fontWeight: 700, textDecoration: 'none' }}
              >
                Watch on YouTube →
              </a>
            </div>
          )}

          {/* Optional set-logging slot */}
          {children && <div style={{ marginTop: 12 }}>{children}</div>}
        </div>
      )}
    </div>
  );
}
