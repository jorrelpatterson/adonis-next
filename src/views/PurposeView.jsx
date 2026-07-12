// src/views/PurposeView.jsx
//
// Purpose domain dashboard. Centerpiece is the interactive Life Wheel
// (7 sliders, 1-10) with a color-coded summary readout, plus a Core Values
// picker (pick 5). Life Wheel scores and Core Values selection persist to
// state.protocolState.purpose via setProtocolState (lifeWheelScores +
// coreValuesSelected). Onboarding focus areas come in via
// protocolStates.purpose.lifeAreas.
//
// Ported from v2-revival-archive:src/views/PurposeView.jsx (Phase 4 Task 10).
// Sanctioned adaptations:
//   1. The archive embedded its own LIFE_AREAS / CORE_VALUES consts inline.
//      Both are deleted here and imported from the single-sourced
//      src/protocols/purpose/data.js (landed in Task 1) — byte-identical
//      content, pure import swap.
//   2. The archive's "Yearly Goals" section (YEARLY_GOALS — 3 hardcoded
//      goals with fake progress percentages) is deleted entirely, not
//      ported. It was placeholder content with no backing state, and the
//      view's real "Goals" rail below already shows the user's actual
//      Purpose goals with real progress.
//   3. The archive's "Bucket List Preview" section (8 hardcoded categories
//      with fake item counts, plus a fake "20 total - 5 completed" footer)
//      is replaced with <BucketListTeaser tier={profile.tier} /> — an
//      Elite-gated locked surface that states the Bucket List promise
//      (spec decision 7) without building any of it. See
//      src/views/components/BucketListTeaser.jsx for the full rationale.
import React, { useMemo } from 'react';
import { P, FN, FD } from '../design/theme';
import { s } from '../design/styles';
import { H } from '../design/components';
import { LIFE_AREAS, CORE_VALUES } from '../protocols/purpose/data';
import BucketListTeaser from './components/BucketListTeaser';

// ─── Helpers ──────────────────────────────────────────────────────
function scoreColor(score) {
  if (score >= 8) return P.ok;
  if (score >= 6) return P.gW;
  if (score >= 4) return '#F59E0B';
  return P.err || '#EF4444';
}

function defaultWheel() {
  return LIFE_AREAS.reduce((acc, a) => { acc[a.id] = 5; return acc; }, {});
}

// ─── Component ────────────────────────────────────────────────────
export default function PurposeView({
  profile,
  protocolStates,
  setProtocolState,
  domainGoals = [],
  domainTasks = [],
  completedTasks = [],
  onCheckTask,
  onAddGoal,
}) {
  const purposeState = protocolStates?.purpose || {};
  const wheel = purposeState.lifeWheelScores || defaultWheel();
  const selectedValues = purposeState.coreValuesSelected || [];

  const avg = useMemo(() => {
    const vals = LIFE_AREAS.map(a => wheel[a.id] || 0);
    const sum = vals.reduce((a, b) => a + b, 0);
    return (sum / vals.length).toFixed(1);
  }, [wheel]);

  const focusAreaIds = purposeState.lifeAreas || [];
  const focusAreas = LIFE_AREAS.filter(a => focusAreaIds.includes(a.id));

  const updateLifeWheel = (areaId, score) => {
    if (!setProtocolState) return;
    setProtocolState('purpose', { lifeWheelScores: { ...wheel, [areaId]: score } });
  };

  const toggleValue = (v) => {
    if (!setProtocolState) return;
    const next = selectedValues.includes(v)
      ? selectedValues.filter(x => x !== v)
      : (selectedValues.length >= 5 ? selectedValues : [...selectedValues, v]);
    setProtocolState('purpose', { coreValuesSelected: next });
  };

  return (
    <div>
      <H t={'\u{1F9ED} Purpose'} sub="Meaning, growth, experiences" />

      {/* ─── Life Wheel ──────────────────────────────────────── */}
      <div style={{ ...s.card, marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
          <div>
            <div style={{ ...s.lab, marginBottom: 4 }}>Your Wheel</div>
            <div style={{ fontFamily: FD, fontSize: 22, fontWeight: 300, color: P.txS, letterSpacing: 0.4 }}>
              Avg <span style={{ color: scoreColor(parseFloat(avg)) }}>{avg}</span>
              <span style={{ color: P.txD, fontSize: 14, marginLeft: 4 }}>/10</span>
            </div>
          </div>
          <div style={{ fontSize: 28 }}>{'\u{1F3AF}'}</div>
        </div>

        {/* Sliders */}
        <div style={{ marginBottom: 18 }}>
          {LIFE_AREAS.map(area => {
            const score = wheel[area.id];
            return (
              <div key={area.id}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid ' + P.bd }}>
                <span style={{ fontSize: 18, width: 24, flexShrink: 0, textAlign: 'center' }}>{area.emoji}</span>
                <span style={{ fontSize: 12, color: P.txS, fontWeight: 500, width: 110, flexShrink: 0 }}>
                  {area.label}
                </span>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={score}
                  onChange={e => updateLifeWheel(area.id, parseInt(e.target.value, 10))}
                  style={{
                    flex: 1,
                    height: 4,
                    WebkitAppearance: 'none',
                    background: 'linear-gradient(90deg, ' + scoreColor(score) + ' 0%, ' + scoreColor(score) + ' ' + (score * 10) + '%, rgba(232,213,183,0.08) ' + (score * 10) + '%, rgba(232,213,183,0.08) 100%)',
                    borderRadius: 2,
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                />
                <span style={{
                  fontFamily: FN,
                  fontSize: 13,
                  fontWeight: 700,
                  color: scoreColor(score),
                  width: 28,
                  textAlign: 'right',
                  flexShrink: 0,
                }}>
                  {score}
                </span>
              </div>
            );
          })}
        </div>

        {/* Visual summary bars */}
        <div style={{ paddingTop: 14, borderTop: '1px solid ' + P.bd }}>
          <div style={{ ...s.lab, marginBottom: 10 }}>Snapshot</div>
          {LIFE_AREAS.map(area => {
            const score = wheel[area.id];
            const color = scoreColor(score);
            return (
              <div key={area.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: P.txM, width: 110, flexShrink: 0 }}>
                  <span style={{ marginRight: 6 }}>{area.emoji}</span>{area.label}
                </span>
                <div style={{ flex: 1, height: 8, background: 'rgba(232,213,183,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: (score * 10) + '%',
                    background: color,
                    borderRadius: 4,
                    transition: 'width 0.3s ease, background 0.3s ease',
                  }} />
                </div>
                <span style={{ fontSize: 10, color: color, fontWeight: 700, width: 24, textAlign: 'right', flexShrink: 0 }}>
                  {score}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Core Values ────────────────────────────────────── */}
      <div style={{ ...s.card, marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <div style={{ ...s.lab, marginBottom: 4 }}>Core Values</div>
            <div style={{ fontFamily: FD, fontSize: 16, fontWeight: 300, color: P.txS }}>
              Pick your top 5
            </div>
          </div>
          <div style={{ fontSize: 11, color: P.txD, fontFamily: FN }}>
            <span style={{ color: selectedValues.length === 5 ? P.ok : P.gW, fontWeight: 700 }}>
              {selectedValues.length}
            </span>
            <span> / 5</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {CORE_VALUES.map(v => {
            const isSelected = selectedValues.includes(v);
            const atCap = selectedValues.length >= 5 && !isSelected;
            return (
              <button
                key={v}
                onClick={() => toggleValue(v)}
                disabled={atCap}
                style={{
                  fontFamily: FN,
                  fontSize: 11,
                  fontWeight: isSelected ? 700 : 500,
                  letterSpacing: 0.4,
                  padding: '7px 12px',
                  borderRadius: 100,
                  border: isSelected ? '1px solid ' + P.gW : '1px solid ' + P.bd,
                  background: isSelected ? P.gW : 'transparent',
                  color: isSelected ? '#0A0B0E' : (atCap ? P.txD : P.txS),
                  cursor: atCap ? 'not-allowed' : 'pointer',
                  opacity: atCap ? 0.4 : 1,
                  transition: 'all 0.25s ease',
                }}
              >
                {v}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Bucket List (Elite teaser — post-MVP #1, builds nothing) ── */}
      <BucketListTeaser tier={profile?.tier} />

      {/* ─── Focus Areas (from onboarding) ───────────────────── */}
      {focusAreas.length > 0 && (
        <div style={{ ...s.card, padding: 14, marginBottom: 12 }}>
          <div style={{ ...s.lab, marginBottom: 10 }}>Your Focus Areas</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {focusAreas.map(area => (
              <span key={area.id}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '6px 12px',
                  borderRadius: 100,
                  background: 'rgba(232,213,183,0.06)',
                  border: '1px solid ' + P.gW + '33',
                  color: P.gW,
                  fontFamily: FN,
                  letterSpacing: 0.3,
                }}>
                <span style={{ marginRight: 5 }}>{area.emoji}</span>{area.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ─── Goals (standard rail) ──────────────────────────── */}
      {domainGoals.length > 0 ? (
        <div style={{ ...s.card, padding: 14, marginBottom: 12 }}>
          <div style={{ ...s.lab }}>Goals</div>
          {domainGoals.map(g => (
            <div key={g.id} style={{ padding: '10px 0', borderBottom: '1px solid ' + P.bd }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: P.txS }}>{g.title}</div>
                <div style={{ fontSize: 11, color: P.gW, fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{g.progress?.percent || 0}%</div>
              </div>
              <div style={{ marginTop: 8, height: 4, background: 'rgba(232,213,183,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: (g.progress?.percent || 0) + '%',
                  background: (g.progress?.percent || 0) >= 75 ? P.ok : P.gW,
                  borderRadius: 2,
                  transition: 'width 0.3s ease',
                }} />
              </div>
              <div style={{ fontSize: 10, color: P.txD, marginTop: 6 }}>
                {g.activeProtocols?.length || 0} protocols active
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ ...s.card, padding: 20, textAlign: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: P.txM }}>No Purpose goals yet</div>
          {onAddGoal && (
            <button
              onClick={() => onAddGoal('purpose')}
              style={{ ...s.btn, ...s.pri, marginTop: 10, padding: '8px 20px', fontSize: 12 }}>
              + Add Purpose Goal
            </button>
          )}
        </div>
      )}

      {/* ─── Today's Tasks ──────────────────────────────────── */}
      {domainTasks.length > 0 && (
        <div style={{ ...s.card, padding: 14, marginBottom: 12 }}>
          <div style={{ ...s.lab }}>Today's Tasks</div>
          {domainTasks.map(task => {
            const isDone = completedTasks.includes(task.id);
            return (
              <div key={task.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 0', borderBottom: '1px solid ' + P.bd,
                opacity: isDone ? 0.5 : 1,
              }}>
                <button
                  onClick={() => onCheckTask && onCheckTask(task.id)}
                  style={{
                    width: 20, height: 20, borderRadius: 10,
                    border: isDone ? 'none' : '1.5px solid ' + P.gW + '44',
                    background: isDone ? P.ok : 'transparent',
                    cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, color: '#fff', fontFamily: FN, flexShrink: 0,
                  }}>
                  {isDone ? '✓' : ''}
                </button>
                <div>
                  <div style={{
                    fontSize: 13,
                    color: isDone ? P.txD : P.txS,
                    textDecoration: isDone ? 'line-through' : 'none',
                  }}>
                    {task.title}
                  </div>
                  {task.subtitle && (
                    <div style={{ fontSize: 10, color: P.txD }}>{task.subtitle}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
