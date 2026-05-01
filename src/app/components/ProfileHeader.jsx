// ProfileHeader — v1-style summary card at the top of the Profile tab.
// Shows the user's identity at a glance: avatar, name, fitness pillar pills,
// and a stat grid (Age, Protocols, Height, Weight, Goal, Target Cal, Days Left).
//
// Pulls from profile + protocolStates. Read-only — editing happens in the
// cards below. Tapping a pill or the edit chip opens the pillar selector.

import React from 'react';
import { P, FN, FM, FD } from '../../design/theme';
import { s } from '../../design/styles';
import { GradText } from '../../design/components';
import { calcCalorieTarget } from '../../protocols/body/nutrition/math';
import StatNumber from '../../design/StatNumber';

const FITNESS_PILLAR_META = {
  'Fat Loss':       { icon: '\u{1F525}', label: 'FAT LOSS' },
  'Muscle Gain':    { icon: '\u{1F4AA}', label: 'MUSCLE GAIN' },
  'Recomposition':  { icon: '⚡',    label: 'RECOMPOSITION' },
  'Aesthetics':     { icon: '✨',    label: 'AESTHETICS' },
  'Anti-Aging':     { icon: '\u{1F9EC}', label: 'ANTI-AGING' },
  'Wellness':       { icon: '\u{1F33F}', label: 'WELLNESS' },
};

export function getFitnessPillars(profile, protocolStates) {
  const stored = profile?.fitnessPillars;
  if (Array.isArray(stored) && stored.length > 0) return stored;
  // Fallback: derive from primary goal (existing users pre-fitnessPillars)
  const primary = protocolStates?.workout?.primary || profile?.primary;
  return primary ? [primary] : [];
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  if (isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ms = target.getTime() - today.getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

function formatHeight(hFt, hIn) {
  if (!hFt) return '—';
  const ft = Number(hFt);
  const inches = Number(hIn) || 0;
  return `${ft}'${inches}"`;
}

export default function ProfileHeader({
  profile,
  protocolStates,
  goals,
  onViewProtocol,
  onEditPillars,
}) {
  const firstName = (profile?.name || '').split(' ')[0] || 'You';
  const initial = (profile?.name || '?').trim().charAt(0).toUpperCase() || '?';

  const pillars = getFitnessPillars(profile, protocolStates);
  const protocolCount = (profile?.domains || []).length;
  const goalCount = (goals || []).filter(g => !g.archived).length;

  const primaryGoal = pillars[0] || protocolStates?.workout?.primary || 'Wellness';
  const targetCal = calcCalorieTarget(profile, primaryGoal);
  const daysLeft = daysUntil(profile?.targetDate);

  // Stats with optional `numeric` for count-up animation.
  const stats = [
    { label: 'Age',        numeric: profile?.age, format: (n) => Math.round(n) },
    { label: 'Protocols',  numeric: protocolCount, format: (n) => Math.round(n) },
    { label: 'Height',     value: formatHeight(profile?.hFt, profile?.hIn) },
    { label: 'Weight',     numeric: profile?.weight, format: (n) => `${Math.round(n)} lbs` },
    { label: 'Goal',       numeric: profile?.goalW,  format: (n) => `${Math.round(n)} lbs` },
    { label: 'Target Cal', numeric: targetCal, format: (n) => Math.round(n).toLocaleString() },
  ];
  if (daysLeft != null) stats.push({ label: 'Days Left', numeric: daysLeft, format: (n) => Math.round(n) });

  return (
    <>
      {/* Summary card */}
      <div style={{ ...s.card, padding: 16, marginBottom: 12 }}>
        {/* Top row — avatar + name + counts */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: 'linear-gradient(135deg, #E8D5B7, #C9B89A)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 4px 16px rgba(232,213,183,0.15)',
          }}>
            <span style={{ fontFamily: FD, fontSize: 26, fontWeight: 600, color: '#1a1612' }}>
              {initial}
            </span>
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: P.txS, lineHeight: 1.1 }}>
              {firstName}
            </div>
            <div style={{ fontSize: 11, color: P.txD, marginTop: 4 }}>
              {protocolCount} protocol{protocolCount === 1 ? '' : 's'} · {goalCount} goal{goalCount === 1 ? '' : 's'}
            </div>
          </div>
        </div>

        {/* Pillar pills */}
        {pillars.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
            {pillars.map((pillar, i) => {
              const meta = FITNESS_PILLAR_META[pillar] || { icon: '✨', label: pillar.toUpperCase() };
              const isPrimary = i === 0;
              return (
                <button
                  key={pillar}
                  onClick={onEditPillars}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '6px 12px', borderRadius: 100,
                    background: isPrimary ? 'rgba(232,213,183,0.08)' : 'rgba(232,213,183,0.03)',
                    border: '1px solid ' + (isPrimary ? 'rgba(232,213,183,0.25)' : 'rgba(232,213,183,0.1)'),
                    fontFamily: FN, fontSize: 9, fontWeight: 700,
                    color: isPrimary ? P.gW : P.txM,
                    letterSpacing: 1.5, cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: 11 }}>{meta.icon}</span>
                  {meta.label}
                </button>
              );
            })}
            <button
              onClick={onEditPillars}
              style={{
                padding: '6px 10px', borderRadius: 100,
                background: 'transparent', border: '1px dashed ' + P.bd,
                fontFamily: FN, fontSize: 9, fontWeight: 700,
                color: P.txD, letterSpacing: 1.5, cursor: 'pointer',
              }}
            >
              + EDIT
            </button>
          </div>
        )}

        {/* Stat grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 16px',
          paddingTop: 14, borderTop: '1px solid ' + P.bd,
        }}>
          {stats.map(stat => {
            const isNumeric = stat.numeric != null && stat.numeric !== '' && Number.isFinite(Number(stat.numeric));
            return (
              <div key={stat.label}>
                <div style={{ fontSize: 9, color: P.txD, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                  {stat.label}
                </div>
                <div style={{ fontFamily: FM, fontSize: 18, fontWeight: 700, color: P.txS, marginTop: 2 }}>
                  {isNumeric
                    ? <StatNumber value={Number(stat.numeric)} initial={0} format={stat.format} duration={800} />
                    : (stat.value ?? '—')}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* View My Protocol CTA */}
      <button
        onClick={onViewProtocol}
        style={{
          width: '100%', marginBottom: 12,
          padding: '14px 18px', borderRadius: 12,
          background: 'linear-gradient(135deg, #E8D5B7 0%, #C9B89A 50%, #B8C4D0 100%)',
          border: 'none', cursor: 'pointer',
          fontFamily: FN, fontSize: 13, fontWeight: 700,
          color: '#1a1612', letterSpacing: 0.3,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: '0 4px 16px rgba(232,213,183,0.12)',
        }}
      >
        View My Protocol
        <span style={{ fontSize: 14 }}>{'›'}</span>
      </button>
    </>
  );
}
