// Insights tab — 90-day consistency heatmap, 7-day check-in trends,
// personalized analysis, weight trend chart. Ports v1's Insights screen.

import React, { useMemo } from 'react';
import { P, FN, FD, FM } from '../design/theme';
import { s } from '../design/styles';
import { H } from '../design/components';
import { CHECKIN_FIELDS } from '../protocols/_system/checkin/fields';
import { getCheckinAverages } from '../protocols/_system/checkin/selectors';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const HEATMAP_DAYS = 90;
const CONSISTENCY_LEVELS = [
  'rgba(232,213,183,0.05)',  // none
  '#34D39922',
  '#34D39955',
  '#34D39988',
  '#34D399CC',
];

function ymdNDaysAgo(today, n) {
  const d = new Date(today);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

/**
 * For each of the last 90 days, score 0-4 based on activity:
 *   0 — nothing logged
 *   1 — 1 sign of life (any of: routine, food, weight, checkin)
 *   2 — 2 of those
 *   3 — 3 of those
 *   4 — all 4
 */
function consistencyScore(logs, today, daysBack) {
  const day = ymdNDaysAgo(today, daysBack);
  let signals = 0;
  if (logs?.checkins?.[day]) signals++;
  if (Array.isArray(logs?.routine?.[day]) && logs.routine[day].length > 0) signals++;
  if (Array.isArray(logs?.food?.[day]) && logs.food[day].length > 0) signals++;
  if (Array.isArray(logs?.weight) && logs.weight.some(w => w?.date === day)) signals++;
  return signals;
}

function rateColor(value, fieldId) {
  if (value == null) return 'rgba(232,213,183,0.05)';
  const field = CHECKIN_FIELDS.find(f => f.id === fieldId);
  if (!field) return 'rgba(232,213,183,0.2)';
  const idx = Math.max(0, Math.min(4, Math.round(value) - 1));
  return field.colors?.[idx] || 'rgba(232,213,183,0.2)';
}

export default function InsightsView({ profile, logs }) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // ─── 90-day consistency heatmap ────────────────────────────────────────
  const heatmap = useMemo(() => {
    const cells = [];
    for (let i = HEATMAP_DAYS - 1; i >= 0; i--) {
      const score = consistencyScore(logs, today, i);
      cells.push({ daysBack: i, date: ymdNDaysAgo(today, i), score });
    }
    return cells;
  }, [logs, today]);

  // ─── 7-day trend grid (5 metrics × 7 days) ─────────────────────────────
  const trendRows = useMemo(() => {
    const rows = [];
    const TREND_FIELDS = ['mood', 'energy', 'sleep', 'stress', 'focus'];
    for (const fid of TREND_FIELDS) {
      const field = CHECKIN_FIELDS.find(f => f.id === fid);
      const cells = [];
      for (let i = 6; i >= 0; i--) {
        const date = ymdNDaysAgo(today, i);
        const checkin = logs?.checkins?.[date];
        cells.push({
          date, value: checkin ? checkin[fid] : null,
          color: rateColor(checkin ? checkin[fid] : null, fid),
          dayLabel: DAY_LABELS[new Date(date).getDay()],
        });
      }
      rows.push({ id: fid, label: field?.label || fid, cells });
    }
    return rows;
  }, [logs, today]);

  // ─── Personalized analysis text ────────────────────────────────────────
  const analysis = useMemo(() => buildAnalysisInsights(logs, today), [logs, today]);

  // ─── Weight trend ─────────────────────────────────────────────────────
  const weights = useMemo(() => {
    const arr = (logs?.weight || []).filter(w => w?.date && w?.weight != null);
    return arr.slice().sort((a, b) => a.date.localeCompare(b.date));
  }, [logs?.weight]);

  return (
    <div>
      <H t="Insights" sub="Based on your check-ins, food logs, and progress" />

      {/* 90-day consistency heatmap */}
      <div style={{ ...s.card, padding: 14, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: P.txD }}>
            90-Day Consistency
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 8, color: P.txD }}>
            <span>Less</span>
            {CONSISTENCY_LEVELS.map((c, i) => (
              <div key={i} style={{ width: 8, height: 8, borderRadius: 2, background: c }} />
            ))}
            <span>More</span>
          </div>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(13, 1fr)',
          gap: 3, padding: '4px 0',
        }}>
          {heatmap.map(({ date, score }) => (
            <div key={date} title={date + ' · ' + score + '/4 signals'} style={{
              aspectRatio: '1', borderRadius: 2,
              background: CONSISTENCY_LEVELS[score],
              border: score === 0 ? '1px solid rgba(232,213,183,0.05)' : 'none',
            }} />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 9, color: P.txD, fontFamily: FM }}>
          <span>90d ago</span>
          <span>Today</span>
        </div>
      </div>

      {/* 7-day check-in trends */}
      <div style={{ ...s.card, padding: 14, marginBottom: 12 }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: P.txD, marginBottom: 12 }}>
          7-Day Trends
        </div>
        {trendRows.map(row => (
          <div key={row.id} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 0', borderBottom: '1px solid ' + P.bd,
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: P.txS }}>
              {row.label}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {row.cells.map((c, i) => (
                <div key={i} title={c.date + (c.value ? ': ' + c.value + '/5' : ': no data')} style={{
                  width: 26, height: 26, borderRadius: 6,
                  background: c.color,
                  border: c.value ? 'none' : '1px solid ' + P.bd,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 700, color: c.value ? '#0A0B0E' : P.txD, fontFamily: FM,
                }}>
                  {c.dayLabel}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Personalized analysis */}
      <div style={{ ...s.card, padding: 14, marginBottom: 12 }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: P.txD, marginBottom: 10 }}>
          Analysis
        </div>
        {analysis.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '4px 0' }}>
            <span style={{ fontSize: 16 }}>{'\u{1F4CA}'}</span>
            <div style={{ fontSize: 12, color: P.txM, lineHeight: 1.5 }}>
              Log at least 3 days of check-ins to unlock personalized insights.
            </div>
          </div>
        ) : (
          analysis.map((insight, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '8px 0',
              borderBottom: i < analysis.length - 1 ? '1px solid ' + P.bd : 'none',
            }}>
              <span style={{ fontSize: 16, lineHeight: 1, marginTop: 1 }}>{insight.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: insight.accent, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2 }}>
                  {insight.title}
                </div>
                <div style={{ fontSize: 12, color: P.txM, lineHeight: 1.5 }}>
                  {insight.body}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Weight trend */}
      <div style={{ ...s.card, padding: 14, marginBottom: 12 }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: P.txD, marginBottom: 10 }}>
          Weight Trend
        </div>
        {weights.length < 2 ? (
          <div style={{ fontSize: 11, color: P.txD, padding: '4px 0' }}>
            Log a few days of weight on the Body → Tools tab to see your trend.
          </div>
        ) : (
          <WeightTrendBars weights={weights} />
        )}
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function buildAnalysisInsights(logs, today) {
  const checkins = logs?.checkins || {};
  const dates = Object.keys(checkins).sort();
  if (dates.length < 3) return [];

  const out = [];
  const avg = getCheckinAverages(logs, 7, 3);
  if (!avg) return [];

  // Sleep
  if (avg.sleep != null && avg.sleep < 2.5) {
    out.push({
      icon: '\u{1F634}', accent: '#F59E0B',
      title: 'Sleep below baseline',
      body: `Your 7-day avg sleep score is ${avg.sleep.toFixed(1)}/5. DSIP can help. Pull screens earlier; cool the room <67°F.`,
    });
  } else if (avg.sleep != null && avg.sleep >= 4) {
    out.push({
      icon: '\u{1F319}', accent: '#34D399',
      title: 'Sleep on point',
      body: `${avg.sleep.toFixed(1)}/5 average. Recovery is doing its job — keep the bedtime routine.`,
    });
  }

  // Energy
  if (avg.energy != null && avg.energy < 2.5) {
    out.push({
      icon: '\u{1F50B}', accent: '#A8BCD0',
      title: 'Energy in the tank',
      body: `Avg ${avg.energy.toFixed(1)}/5. Lower training volume this week + check sleep. CJC/Ipa supports recovery if your stack allows.`,
    });
  }

  // Stress
  if (avg.stress != null && avg.stress < 2.5) {
    out.push({
      icon: '\u{1F62D}', accent: '#F59E0B',
      title: 'Stress trending high',
      body: `Avg ${avg.stress.toFixed(1)}/5 (lower = more stressed). Add 10 min breathwork or a walk before training. Skip HIIT this week.`,
    });
  }

  // Mood + energy + sleep all strong
  if (avg.mood >= 4 && avg.energy >= 4 && avg.sleep >= 4) {
    out.push({
      icon: '\u{1F525}', accent: '#34D399',
      title: 'Peak week',
      body: 'Mood, energy, sleep all strong. This is the week to push volume + intensity. Add a finisher to each session.',
    });
  }

  return out.slice(0, 4);
}

function WeightTrendBars({ weights }) {
  const window = weights.slice(-30);
  const min = Math.min(...window.map(w => Number(w.weight)));
  const max = Math.max(...window.map(w => Number(w.weight)));
  const range = Math.max(0.5, max - min);
  const first = Number(window[0].weight);
  const last = Number(window[window.length - 1].weight);
  const delta = last - first;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 6, fontFamily: FM }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: P.txS }}>{last}</div>
        <div style={{
          fontSize: 12, fontWeight: 700,
          color: delta < 0 ? '#34D399' : delta > 0 ? '#F59E0B' : P.txD,
        }}>
          {delta > 0 ? '+' : ''}{delta.toFixed(1)} lbs · {window.length}d
        </div>
      </div>
      <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 60, padding: '0 0 4px 0' }}>
        {window.map((w, i) => {
          const v = Number(w.weight);
          const h = ((v - min) / range) * 100;
          return (
            <div key={w.date + i} title={w.date + ': ' + v + ' lbs'} style={{
              flex: 1, height: Math.max(4, h) + '%',
              background: i === window.length - 1
                ? 'linear-gradient(to top, ' + P.gW + ', ' + P.gW + 'AA)'
                : 'rgba(232,213,183,0.18)',
              borderRadius: 2,
            }} />
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 9, color: P.txD, fontFamily: FM }}>
        <span>{min.toFixed(1)}</span>
        <span>{max.toFixed(1)}</span>
      </div>
    </div>
  );
}
