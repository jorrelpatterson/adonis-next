// src/views/PurposeView.jsx
//
// Purpose domain dashboard. Centerpiece is the interactive Life Wheel
// (7 sliders, 1-10) with a color-coded summary readout. Below it: 20
// core values (pick 5), an 8-category bucket-list preview, yearly
// goals with progress bars, and the standard goals + tasks rails.
//
// Life Wheel scores and Core Values selection are persisted to
// state.protocolState.purpose via setProtocolState (lifeWheelScores +
// coreValuesSelected). Bucket list and yearly goals are placeholders.
// Onboarding focus areas come in via protocolStates.purpose.lifeAreas.
import React, { useMemo } from 'react';
import { P, FN, FD } from '../design/theme';
import { s } from '../design/styles';
import { H } from '../design/components';

// ─── Static data ──────────────────────────────────────────────────
const LIFE_AREAS = [
  { id: 'health',        emoji: '\u{1F4AA}', label: 'Health' },
  { id: 'wealth',        emoji: '\u{1F4B0}', label: 'Wealth' },
  { id: 'mind',          emoji: '\u{1F9E0}', label: 'Mind' },
  { id: 'relationships', emoji: '\u{2764}\u{FE0F}',  label: 'Relationships' },
  { id: 'adventure',     emoji: '\u{1F30D}', label: 'Adventure' },
  { id: 'environment',   emoji: '\u{1F3E0}', label: 'Environment' },
  { id: 'inner_peace',   emoji: '\u{1F54A}\u{FE0F}', label: 'Inner Peace' },
];

const CORE_VALUES = [
  'Freedom', 'Growth', 'Family', 'Adventure', 'Health',
  'Wealth', 'Wisdom', 'Service', 'Excellence', 'Authenticity',
  'Creativity', 'Faith', 'Justice', 'Compassion', 'Discipline',
  'Curiosity', 'Loyalty', 'Honesty', 'Independence', 'Legacy',
];

const BUCKET_CATEGORIES = [
  { id: 'travel',     emoji: '\u{1F30D}', label: 'Travel',      count: 3 },
  { id: 'adventure',  emoji: '\u{1F3A2}', label: 'Adventure',   count: 2 },
  { id: 'skills',     emoji: '\u{1F3AF}', label: 'Skills',      count: 4 },
  { id: 'experience', emoji: '\u{2B50}',  label: 'Experiences', count: 1 },
  { id: 'financial',  emoji: '\u{1F4B0}', label: 'Financial',   count: 5 },
  { id: 'creative',   emoji: '\u{1F3A8}', label: 'Creative',    count: 0 },
  { id: 'giving',     emoji: '\u{1F91D}', label: 'Giving Back', count: 2 },
  { id: 'personal',   emoji: '\u{1F331}', label: 'Personal',    count: 3 },
];

const YEARLY_GOALS = [
  { id: 'books',    title: 'Read 24 books',  detail: '8/24',           pct: 33 },
  { id: 'marathon', title: 'Run a marathon', detail: 'training begun', pct: 60 },
  { id: 'italy',    title: 'Visit Italy',    detail: 'planning',       pct:  0 },
];

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

      {/* ─── Bucket List Preview ────────────────────────────── */}
      <div style={{ ...s.card, marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <div style={{ ...s.lab, marginBottom: 4 }}>Bucket List</div>
            <div style={{ fontFamily: FD, fontSize: 16, fontWeight: 300, color: P.txS }}>
              Things to do before...
            </div>
          </div>
          <span style={{ fontSize: 22 }}>{'\u{1F3AF}'}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {BUCKET_CATEGORIES.map(c => (
            <a
              key={c.id}
              href="#"
              onClick={e => e.preventDefault()}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid ' + P.bd,
                background: 'rgba(232,213,183,0.02)',
                textDecoration: 'none',
                color: P.txS,
                fontFamily: FN,
                transition: 'all 0.25s ease',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14 }}>{c.emoji}</span>
                <span style={{ fontSize: 12, fontWeight: 500 }}>{c.label}</span>
              </span>
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                color: c.count > 0 ? P.gW : P.txD,
                fontFamily: FN,
              }}>
                {c.count}
              </span>
            </a>
          ))}
        </div>

        <div style={{
          marginTop: 12, paddingTop: 12, borderTop: '1px solid ' + P.bd,
          fontSize: 10, color: P.txD, textAlign: 'center', letterSpacing: 0.4,
        }}>
          20 total bucket list items <span style={{ opacity: 0.6 }}>·</span> 5 completed
        </div>
      </div>

      {/* ─── Yearly Goals ───────────────────────────────────── */}
      <div style={{ ...s.card, marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <div style={{ ...s.lab, marginBottom: 4 }}>Yearly Goals</div>
            <div style={{ fontFamily: FD, fontSize: 16, fontWeight: 300, color: P.txS }}>
              {new Date().getFullYear()}
            </div>
          </div>
          <span style={{ fontSize: 22 }}>{'\u{1F4C5}'}</span>
        </div>

        {YEARLY_GOALS.map((g, i) => (
          <div key={g.id}
            style={{
              padding: '10px 0',
              borderBottom: i < YEARLY_GOALS.length - 1 ? '1px solid ' + P.bd : 'none',
            }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: P.txS }}>
                {g.title}
              </div>
              <div style={{ fontSize: 11, color: P.gW, fontFamily: FN, fontWeight: 700 }}>
                {g.pct}%
              </div>
            </div>
            <div style={{ height: 4, background: 'rgba(232,213,183,0.06)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: g.pct + '%',
                background: 'linear-gradient(90deg, ' + P.gW + ', ' + P.ok + ')',
                borderRadius: 2,
                transition: 'width 0.4s ease',
              }} />
            </div>
            <div style={{ fontSize: 10, color: P.txD, marginTop: 4 }}>{g.detail}</div>
          </div>
        ))}
      </div>

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
            <div key={g.id} style={{ padding: '8px 0', borderBottom: '1px solid ' + P.bd }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: P.txS }}>{g.title}</div>
                <div style={{ fontSize: 11, color: P.gW }}>{g.progress?.percent || 0}%</div>
              </div>
              <div style={{ marginTop: 4, height: 3, borderRadius: 2, background: 'rgba(232,213,183,0.08)' }}>
                <div style={{
                  height: '100%', borderRadius: 2,
                  background: 'linear-gradient(90deg, ' + P.gW + ', ' + P.ok + ')',
                  width: (g.progress?.percent || 0) + '%',
                }} />
              </div>
              <div style={{ fontSize: 10, color: P.txD, marginTop: 3 }}>
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
