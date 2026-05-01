import React, { useState, useMemo } from 'react';
import { P, FN, FM, grad } from '../../design/theme';
import { s } from '../../design/styles';
import GoalCompleteScreen from './GoalCompleteScreen';
import { sound } from '../../design/sound';
import { haptics } from '../../design/haptics';

// ─── Helpers (exported for testing) ────────────────────────────────────────

// ISO-style YYYY-MM-DD for any Date.
function ymd(d) {
  return d.toISOString().slice(0, 10);
}

// Returns today's weight entry (or null).
export function getTodaysWeight(weightLog, today) {
  if (!Array.isArray(weightLog) || !weightLog.length) return null;
  const key = today instanceof Date ? ymd(today) : (today || ymd(new Date()));
  for (const entry of weightLog) {
    if (entry && entry.date === key) return entry;
  }
  return null;
}

// First chronological entry (by date).
export function getStartingWeight(weightLog) {
  if (!Array.isArray(weightLog) || !weightLog.length) return null;
  let first = null;
  for (const e of weightLog) {
    if (!e || !e.date || e.weight == null) continue;
    if (!first || e.date < first.date) first = e;
  }
  return first ? Number(first.weight) : null;
}

// Linear regression slope over the last 14 days; returned as lbs/week.
// Returns null if <5 readings.
export function computeWeeklyTrend(weightLog) {
  if (!Array.isArray(weightLog)) return null;
  const recent = [...weightLog]
    .filter(e => e && e.date && e.weight != null)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  if (recent.length < 5) return null;

  // Take last 14 days from most recent date.
  const last = recent[recent.length - 1];
  const lastDate = new Date(last.date + 'T00:00:00Z');
  const cutoff = new Date(lastDate);
  cutoff.setUTCDate(cutoff.getUTCDate() - 13);

  const window = recent.filter(e => {
    const d = new Date(e.date + 'T00:00:00Z');
    return d >= cutoff && d <= lastDate;
  });
  if (window.length < 5) return null;

  // Days-from-start as x, weight as y. Slope = lbs/day → *7 = lbs/week.
  const x0 = new Date(window[0].date + 'T00:00:00Z').getTime();
  const xs = window.map(e => (new Date(e.date + 'T00:00:00Z').getTime() - x0) / (24 * 3600 * 1000));
  const ys = window.map(e => Number(e.weight));
  const n = xs.length;
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((acc, x, i) => acc + x * ys[i], 0);
  const sumXX = xs.reduce((acc, x) => acc + x * x, 0);
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return 0;
  const slopePerDay = (n * sumXY - sumX * sumY) / denom;
  return Math.round(slopePerDay * 7 * 10) / 10;
}

// Returns 14-element array (oldest → newest) of { date, weight | null }.
export function getLast14Days(weightLog, today) {
  const refDate = today instanceof Date ? today : new Date((today || ymd(new Date())) + 'T00:00:00Z');
  const log = Array.isArray(weightLog) ? weightLog : [];
  const map = {};
  for (const e of log) {
    if (e && e.date && e.weight != null) map[e.date] = Number(e.weight);
  }
  const out = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(refDate);
    d.setUTCDate(d.getUTCDate() - i);
    const key = ymd(d);
    out.push({ date: key, weight: map[key] != null ? map[key] : null });
  }
  return out;
}

// True/false/null. Null when info is missing.
export function isMovingTowardGoal(currentW, startW, goalW) {
  if (currentW == null || currentW === '' || startW == null || startW === '' || goalW == null || goalW === '') return null;
  const c = Number(currentW);
  const s = Number(startW);
  const g = Number(goalW);
  if (!Number.isFinite(c) || !Number.isFinite(s) || !Number.isFinite(g)) return null;
  if (g === s) return null;
  // If goal is below start, "toward goal" means current < start.
  // If goal is above start, "toward goal" means current > start.
  if (g < s) return c < s;
  return c > s;
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function WeightLogger({ profile, logs, log }) {
  const weightLog = Array.isArray(logs?.weight) ? logs.weight : [];
  const measurementsLog = Array.isArray(logs?.bodyMeasurements) ? logs.bodyMeasurements : [];
  const today = new Date();
  const todayKey = ymd(today);

  const todaysEntry = useMemo(() => getTodaysWeight(weightLog, todayKey), [weightLog, todayKey]);
  const startW = useMemo(() => getStartingWeight(weightLog), [weightLog]);
  const goalW = profile?.goalW ? Number(profile.goalW) : null;

  // Find latest weight if today not logged.
  const latestEntry = useMemo(() => {
    if (todaysEntry) return todaysEntry;
    if (!weightLog.length) return null;
    return [...weightLog]
      .filter(e => e && e.date && e.weight != null)
      .sort((a, b) => (a.date < b.date ? 1 : -1))[0] || null;
  }, [weightLog, todaysEntry]);

  const currentW = latestEntry ? Number(latestEntry.weight) : null;
  const trend = useMemo(() => computeWeeklyTrend(weightLog), [weightLog]);
  const last14 = useMemo(() => getLast14Days(weightLog, todayKey), [weightLog, todayKey]);

  // Direction state for delta line.
  const goalDir = goalW != null && startW != null
    ? (goalW < startW ? 'lose' : goalW > startW ? 'gain' : null)
    : null;
  const movingRight = isMovingTowardGoal(currentW, startW, goalW);

  const deltaFromStart = (currentW != null && startW != null)
    ? Math.round((currentW - startW) * 10) / 10
    : null;

  const remainingToGoal = (currentW != null && goalW != null)
    ? Math.round(Math.abs(goalW - currentW) * 10) / 10
    : null;

  // ─── Quick log state ────────────────────────────────────────────────────
  const [draftWeight, setDraftWeight] = useState('');
  const [goalReached, setGoalReached] = useState(false);
  const placeholder = currentW != null ? String(currentW) : '';

  const handleLog = () => {
    const w = Number(draftWeight);
    if (!Number.isFinite(w) || w <= 0) return;
    if (!log) return;
    const filtered = weightLog.filter(e => e?.date !== todayKey);
    const next = [...filtered, { date: todayKey, weight: Math.round(w * 10) / 10 }]
      .sort((a, b) => (a.date < b.date ? -1 : 1));
    log('weight', next);
    setDraftWeight('');
    sound.success();
    haptics.success();

    // Goal completion detection — fire ceremony if this log crosses the goal.
    // Goal is "lose to X" when goalW < startW; "gain to X" when goalW > startW.
    if (goalW != null && startW != null && currentW != null) {
      const wasShort = goalDir === 'lose' ? currentW > goalW : currentW < goalW;
      const nowMet  = goalDir === 'lose' ? w <= goalW         : w >= goalW;
      if (wasShort && nowMet) {
        setGoalReached(true);
      }
    }
  };

  const handleDelete = (date) => {
    if (!log) return;
    const next = weightLog.filter(e => e?.date !== date);
    log('weight', next);
  };

  // ─── Recent table (last 7) ─────────────────────────────────────────────
  const [showAll, setShowAll] = useState(false);
  const sortedDesc = useMemo(() => (
    [...weightLog]
      .filter(e => e && e.date && e.weight != null)
      .sort((a, b) => (a.date < b.date ? 1 : -1))
  ), [weightLog]);
  const visibleEntries = showAll ? sortedDesc : sortedDesc.slice(0, 7);

  // ─── Measurements toggle ───────────────────────────────────────────────
  const [showMeasure, setShowMeasure] = useState(false);
  const [measure, setMeasure] = useState({ chest: '', waist: '', arms: '', thighs: '', hips: '' });
  const handleSaveMeasure = () => {
    if (!log) return;
    const clean = {
      date: todayKey,
      chest: Number(measure.chest) || 0,
      waist: Number(measure.waist) || 0,
      arms: Number(measure.arms) || 0,
      thighs: Number(measure.thighs) || 0,
      hips: Number(measure.hips) || 0,
    };
    if (!clean.chest && !clean.waist && !clean.arms && !clean.thighs && !clean.hips) return;
    const filtered = measurementsLog.filter(m => m?.date !== todayKey);
    log('bodyMeasurements', [...filtered, clean].sort((a, b) => (a.date < b.date ? -1 : 1)));
    setMeasure({ chest: '', waist: '', arms: '', thighs: '', hips: '' });
    setShowMeasure(false);
  };

  // ─── Trend chart geometry ──────────────────────────────────────────────
  const presentReadings = last14.filter(d => d.weight != null);
  const chartW = 320;
  const chartH = 70;
  const padX = 4;
  const barW = (chartW - padX * 2) / 14;
  let yMin = 0, yMax = 0;
  if (presentReadings.length) {
    const ys = presentReadings.map(d => d.weight);
    yMin = Math.min(...ys);
    yMax = Math.max(...ys);
    if (yMax - yMin < 1) {
      yMin -= 0.5;
      yMax += 0.5;
    }
  }
  const yToBar = (w) => {
    if (yMax === yMin) return chartH / 2;
    const norm = (w - yMin) / (yMax - yMin);
    return chartH - (norm * (chartH - 8) + 4);
  };

  const trendColor = (() => {
    if (trend == null || goalDir == null) return P.txD;
    if (Math.abs(trend) < 0.1) return P.txD;
    if (goalDir === 'lose') return trend < 0 ? P.ok : P.warn;
    return trend > 0 ? P.ok : P.warn;
  })();

  const deltaColor = (() => {
    if (deltaFromStart == null || goalDir == null) return P.txS;
    if (movingRight === true) return P.ok;
    if (movingRight === false) return P.warn;
    return P.txS;
  })();

  const deltaArrow = deltaFromStart == null ? '' : (deltaFromStart > 0 ? '↑' : deltaFromStart < 0 ? '↓' : '·');
  const deltaAbs = deltaFromStart == null ? null : Math.abs(deltaFromStart);

  return (
    <div>
      {/* ─── Today's weight card ─── */}
      <div style={{ ...s.card, padding: 14, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div>
            <div style={{ ...s.lab, marginBottom: 4 }}>Weight Check-in</div>
            <div style={{ fontSize: 10, color: P.txD }}>
              Today · {todayKey}
            </div>
          </div>
          <span style={{ fontSize: 22 }}>{'⚖️'}</span>
        </div>

        {/* Big number */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
          <div style={{
            fontFamily: FM, fontSize: 40, fontWeight: 700,
            color: todaysEntry ? P.gW : P.txD, lineHeight: 1,
          }}>
            {todaysEntry ? todaysEntry.weight : (currentW != null ? currentW : '—')}
          </div>
          <div style={{ fontFamily: FM, fontSize: 14, color: P.txD }}>lbs</div>
          {!todaysEntry && currentW != null && (
            <div style={{ fontSize: 9, color: P.warn, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
              · last logged
            </div>
          )}
        </div>

        {/* Delta from start */}
        {deltaFromStart != null && deltaAbs > 0 && (
          <div style={{ fontSize: 12, color: deltaColor, marginBottom: 4 }}>
            {deltaArrow} {deltaAbs} lbs from start
            {movingRight === false && goalDir != null && (
              <span style={{ color: P.warn, marginLeft: 6 }}>· trending wrong way</span>
            )}
          </div>
        )}

        {/* Goal indicator */}
        {goalW != null && currentW != null && remainingToGoal != null && (
          <div style={{ fontSize: 11, color: P.txD, marginBottom: 10 }}>
            Target: <span style={{ fontFamily: FM, color: P.txS }}>{goalW} lbs</span>
            {' · '}
            {remainingToGoal === 0
              ? <span style={{ color: P.ok, fontWeight: 600 }}>at goal</span>
              : <><span style={{ fontFamily: FM, color: P.txS }}>{remainingToGoal}</span> lbs to go</>
            }
          </div>
        )}

        {/* Quick-log row */}
        <div style={{
          display: 'flex', gap: 8, alignItems: 'stretch',
          paddingTop: 10, borderTop: '1px solid ' + P.bd,
        }}>
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            value={draftWeight}
            onChange={e => setDraftWeight(e.target.value)}
            placeholder={placeholder || 'Enter weight'}
            style={{
              ...s.inp, padding: '10px 14px', fontSize: 14,
              minHeight: 40, fontFamily: FM, flex: 1,
            }}
          />
          <button
            type="button"
            onClick={handleLog}
            disabled={!Number(draftWeight)}
            style={{
              ...s.btn, ...s.pri,
              padding: '10px 20px', fontSize: 12, minHeight: 40,
              opacity: !Number(draftWeight) ? 0.4 : 1,
            }}
          >
            {todaysEntry ? 'Update' : 'Log'}
          </button>
        </div>
      </div>

      {/* ─── Trend mini-chart ─── */}
      <div style={{ ...s.card, padding: 14, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ ...s.lab, marginBottom: 0 }}>14-Day Trend</div>
          {presentReadings.length >= 5 && trend != null && (
            <div style={{ fontFamily: FM, fontSize: 11, color: trendColor, fontWeight: 700 }}>
              {trend > 0 ? '+' : ''}{trend} lbs/wk
            </div>
          )}
        </div>

        {presentReadings.length < 5 ? (
          <div style={{
            padding: '14px 0', textAlign: 'center',
            fontSize: 11, color: P.txD,
          }}>
            Log a few more days for a trend line
          </div>
        ) : (
          <>
            <svg
              width="100%"
              viewBox={`0 0 ${chartW} ${chartH}`}
              preserveAspectRatio="none"
              style={{ display: 'block', marginBottom: 8 }}
            >
              <defs>
                <linearGradient id="weightTodayGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={P.gW} stopOpacity="1" />
                  <stop offset="100%" stopColor={P.gC} stopOpacity="0.6" />
                </linearGradient>
              </defs>
              {last14.map((d, i) => {
                const x = padX + i * barW;
                const isToday = d.date === todayKey;
                if (d.weight == null) {
                  // Empty placeholder.
                  return (
                    <rect
                      key={d.date}
                      x={x + 1}
                      y={chartH - 4}
                      width={barW - 2}
                      height={2}
                      rx={1}
                      fill={P.bd}
                    />
                  );
                }
                const top = yToBar(d.weight);
                const h = chartH - top;
                return (
                  <rect
                    key={d.date}
                    x={x + 1}
                    y={top}
                    width={barW - 2}
                    height={Math.max(h, 2)}
                    rx={2}
                    fill={isToday ? 'url(#weightTodayGrad)' : 'rgba(232,213,183,0.35)'}
                  />
                );
              })}
            </svg>
            <div style={{ fontSize: 10, color: P.txD, fontFamily: FM, display: 'flex', justifyContent: 'space-between' }}>
              <span>{last14[0]?.date.slice(5)}</span>
              <span>{last14[last14.length - 1]?.date.slice(5)}</span>
            </div>
            {trend != null && (
              <div style={{ marginTop: 8, fontSize: 11, color: P.txD }}>
                Weekly avg:{' '}
                <span style={{ fontFamily: FM, color: trendColor, fontWeight: 700 }}>
                  {trend > 0 ? '+' : ''}{trend} lbs/wk
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── Recent log table ─── */}
      {sortedDesc.length > 0 && (
        <div style={{ ...s.card, padding: 14, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ ...s.lab, marginBottom: 0 }}>Recent Entries</div>
            <div style={{ fontFamily: FM, fontSize: 10, color: P.txD }}>
              {sortedDesc.length} total
            </div>
          </div>
          {visibleEntries.map((e, i) => {
            const prev = sortedDesc[sortedDesc.indexOf(e) + 1];
            const diff = prev ? Math.round((Number(e.weight) - Number(prev.weight)) * 10) / 10 : null;
            const diffStr = diff == null ? '—' : (diff > 0 ? `+${diff}` : `${diff}`);
            const diffColor = diff == null
              ? P.txD
              : (goalDir === 'lose'
                  ? (diff < 0 ? P.ok : diff > 0 ? P.warn : P.txD)
                  : goalDir === 'gain'
                    ? (diff > 0 ? P.ok : diff < 0 ? P.warn : P.txD)
                    : P.txS);
            return (
              <div key={e.date} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 0',
                borderTop: i === 0 ? 'none' : '1px solid ' + P.bd,
              }}>
                <div style={{ fontFamily: FM, fontSize: 11, color: P.txD, width: 80, flexShrink: 0 }}>
                  {e.date}
                </div>
                <div style={{ fontFamily: FM, fontSize: 14, fontWeight: 700, color: P.txS, flex: 1 }}>
                  {e.weight}<span style={{ fontSize: 10, color: P.txD, marginLeft: 2 }}>lbs</span>
                </div>
                <div style={{ fontFamily: FM, fontSize: 11, color: diffColor, width: 60, textAlign: 'right' }}>
                  {diffStr}
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(e.date)}
                  aria-label={'Remove ' + e.date}
                  style={{
                    width: 28, height: 28, borderRadius: 6,
                    border: '1px solid ' + P.bd,
                    background: 'transparent', color: P.txD,
                    cursor: 'pointer', fontSize: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {'×'}
                </button>
              </div>
            );
          })}
          {sortedDesc.length > 7 && (
            <button
              type="button"
              onClick={() => setShowAll(v => !v)}
              style={{
                marginTop: 8, width: '100%',
                ...s.btn, ...s.out,
                padding: '8px 10px', fontSize: 11, minHeight: 36,
                justifyContent: 'center',
              }}
            >
              {showAll ? 'Show less' : `Show all ${sortedDesc.length}`}
            </button>
          )}
        </div>
      )}

      {/* ─── Body measurements quick-add ─── */}
      <div style={{ ...s.card, padding: 14, marginBottom: 12 }}>
        {!showMeasure ? (
          <button
            type="button"
            onClick={() => setShowMeasure(true)}
            style={{
              ...s.btn, ...s.out,
              width: '100%', padding: '10px 16px', fontSize: 12,
              minHeight: 40, justifyContent: 'center',
            }}
          >
            + Measurements
          </button>
        ) : (
          <>
            <div style={{ ...s.lab }}>Body Measurements (in)</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginBottom: 10 }}>
              {['chest', 'waist', 'arms', 'thighs', 'hips'].map(field => (
                <input
                  key={field}
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  value={measure[field]}
                  onChange={e => setMeasure(m => ({ ...m, [field]: e.target.value }))}
                  placeholder={field[0].toUpperCase() + field.slice(1)}
                  style={{
                    ...s.inp, padding: '8px 6px', fontSize: 11,
                    minHeight: 36, fontFamily: FM, textAlign: 'center',
                  }}
                />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                onClick={() => { setShowMeasure(false); setMeasure({ chest: '', waist: '', arms: '', thighs: '', hips: '' }); }}
                style={{
                  ...s.btn, ...s.out,
                  flex: 1, padding: '10px 12px', fontSize: 12,
                  minHeight: 40, justifyContent: 'center',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveMeasure}
                style={{
                  ...s.btn, ...s.pri,
                  flex: 2, padding: '10px 12px', fontSize: 12,
                  minHeight: 40, justifyContent: 'center',
                }}
              >
                Save
              </button>
            </div>
            {measurementsLog.length > 0 && (
              <div style={{ marginTop: 10, fontSize: 10, color: P.txD, fontFamily: FM }}>
                {measurementsLog.length} prior entr{measurementsLog.length === 1 ? 'y' : 'ies'} logged
              </div>
            )}
          </>
        )}
      </div>

      {goalReached && (
        <GoalCompleteScreen
          goal={{
            title: goalDir === 'lose'
              ? `Hit your goal weight: ${goalW} lbs`
              : `Reached your goal: ${goalW} lbs`,
            createdAt: weightLog[0]?.date || null,
          }}
          onClose={() => setGoalReached(false)}
        />
      )}
    </div>
  );
}
