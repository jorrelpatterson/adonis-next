import React, { useState, useMemo } from 'react';
import { P, FN, FM } from '../../design/theme';
import { s } from '../../design/styles';
import { getProgram } from '../../protocols/body/workout/programs';

// ─── Helpers (exported for testing) ────────────────────────────────────────

// Returns today's workout entry from a 7-day program. Sunday=0..Saturday=6.
// Mirrors workoutProtocol.getTasks (uses UTC day to match routine engine).
export function getTodaysWorkout(program, date) {
  if (!program || !Array.isArray(program)) return null;
  const d = date instanceof Date ? date : new Date();
  const idx = d.getUTCDay();
  return program[idx] || null;
}

// Returns previous max weight lifted (any complete set) for an exercise.
// Returns 0 if no history.
export function getExercisePR(logs, exerciseName) {
  const entries = (logs && logs.exercise) || [];
  let max = 0;
  for (const e of entries) {
    if (e.exercise !== exerciseName) continue;
    for (const set of (e.sets || [])) {
      const w = Number(set.weight);
      if (set.complete && Number.isFinite(w) && w > max) max = w;
    }
  }
  return max;
}

// Returns the last logged session entry for an exercise, or null.
export function getLastSession(logs, exerciseName) {
  const entries = (logs && logs.exercise) || [];
  let last = null;
  for (const e of entries) {
    if (e.exercise !== exerciseName) continue;
    if (!last || (e.date || '') > (last.date || '')) last = e;
  }
  return last;
}

// True if any complete set's weight strictly exceeds previous PR.
export function isNewPR(sets, previousPR) {
  if (!Array.isArray(sets)) return false;
  const prev = Number(previousPR) || 0;
  for (const set of sets) {
    const w = Number(set.weight);
    if (set.complete && Number.isFinite(w) && w > prev) return true;
  }
  return false;
}

// Format last session as "185 × 8/8/7" or "First time".
function formatLastSession(last) {
  if (!last || !last.sets || !last.sets.length) return 'First time';
  const completeSets = last.sets.filter(s => s.complete);
  if (!completeSets.length) return 'First time';
  const topW = completeSets.reduce((m, s) => Math.max(m, Number(s.weight) || 0), 0);
  const reps = completeSets.map(s => s.reps || 0).join('/');
  return `${topW} × ${reps}`;
}

// ─── Component ─────────────────────────────────────────────────────────────

function ExerciseRow({ exercise, lastSession, previousPR, onSave }) {
  const setCount = Math.max(1, Number(exercise.sets) || 1);
  const [rows, setRows] = useState(() =>
    Array.from({ length: setCount }, () => ({ weight: '', reps: '', complete: false }))
  );
  const [saved, setSaved] = useState(false);

  const lastWeightPlaceholder = useMemo(() => {
    if (!lastSession || !lastSession.sets) return '';
    const top = lastSession.sets
      .filter(s => s.complete)
      .reduce((m, s) => Math.max(m, Number(s.weight) || 0), 0);
    return top > 0 ? String(top) : '';
  }, [lastSession]);

  const updateRow = (i, field, value) => {
    setSaved(false);
    setRows(rs => rs.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  };

  const handleSave = () => {
    const sets = rows.map(r => ({
      weight: r.weight === '' ? 0 : Number(r.weight),
      reps: r.reps === '' ? 0 : Number(r.reps),
      complete: !!r.complete,
    }));
    onSave(sets, isNewPR(sets, previousPR));
    setSaved(true);
  };

  const lastSummary = formatLastSession(lastSession);

  return (
    <div style={{
      padding: '12px 0',
      borderTop: '1px solid ' + P.bd,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: P.txS }}>{exercise.name}</div>
        <div style={{ fontFamily: FM, fontSize: 10, color: P.txD }}>
          {exercise.sets}×{exercise.reps} · {exercise.rest}
        </div>
      </div>

      {exercise.note && (
        <div style={{ fontSize: 10, color: P.gW, fontStyle: 'italic', marginBottom: 8 }}>
          {exercise.note}
        </div>
      )}

      {/* Set grid header */}
      <div style={{
        display: 'grid', gridTemplateColumns: '32px 1fr 1fr 32px',
        gap: 8, alignItems: 'center', marginBottom: 4,
      }}>
        <div style={{ ...s.lab, marginBottom: 0 }}>Set</div>
        <div style={{ ...s.lab, marginBottom: 0 }}>Weight</div>
        <div style={{ ...s.lab, marginBottom: 0 }}>Reps</div>
        <div style={{ ...s.lab, marginBottom: 0, textAlign: 'center' }}>{'✓'}</div>
      </div>

      {rows.map((row, i) => (
        <div key={i} style={{
          display: 'grid', gridTemplateColumns: '32px 1fr 1fr 32px',
          gap: 8, alignItems: 'center', marginBottom: 4, minHeight: 32,
        }}>
          <div style={{ fontFamily: FM, fontSize: 11, color: P.txD }}>#{i + 1}</div>
          <input
            type="number"
            value={row.weight}
            onChange={e => updateRow(i, 'weight', e.target.value)}
            placeholder={lastWeightPlaceholder}
            style={{
              ...s.inp, padding: '6px 10px', minHeight: 32, fontSize: 12,
              fontFamily: FM, borderRadius: 8,
            }}
          />
          <input
            type="number"
            value={row.reps}
            onChange={e => updateRow(i, 'reps', e.target.value)}
            placeholder={String(exercise.reps || '').replace(/[^0-9]/g, '') || ''}
            style={{
              ...s.inp, padding: '6px 10px', minHeight: 32, fontSize: 12,
              fontFamily: FM, borderRadius: 8,
            }}
          />
          <button
            type="button"
            onClick={() => updateRow(i, 'complete', !row.complete)}
            aria-label={'Set ' + (i + 1) + ' complete'}
            style={{
              width: 24, height: 24, borderRadius: 6,
              border: row.complete ? 'none' : '1.5px solid ' + P.gW + '44',
              background: row.complete ? P.ok : 'transparent',
              cursor: 'pointer', color: '#fff', fontSize: 12,
              fontFamily: FN, justifySelf: 'center',
            }}
          >
            {row.complete ? '✓' : ''}
          </button>
        </div>
      ))}

      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginTop: 8,
      }}>
        <div style={{ fontFamily: FM, fontSize: 10, color: P.txD }}>
          Last session: {lastSummary}
          {previousPR > 0 && (
            <span style={{ marginLeft: 8, color: P.gW }}>
              PR: {previousPR}lb
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleSave}
          style={{
            ...s.btn, ...(saved ? s.out : s.pri),
            padding: '6px 14px', fontSize: 11, minHeight: 32,
          }}
        >
          {saved ? 'Saved ✓' : 'Save Sets'}
        </button>
      </div>
    </div>
  );
}

export default function WorkoutLogger({ profile, protocolStates, logs, log }) {
  const goalName =
    profile?.primary ||
    protocolStates?.workout?.primary ||
    'Wellness';

  const program = useMemo(() => getProgram(goalName), [goalName]);
  const today = useMemo(() => new Date(), []);
  const todayKey = today.toISOString().slice(0, 10);
  const workout = useMemo(() => getTodaysWorkout(program, today), [program, today]);

  const exerciseLogs = (logs && logs.exercise) || [];

  // Today's PRs (logged today + isPR)
  const todaysPRs = useMemo(
    () => exerciseLogs.filter(e => e.date === todayKey && e.isPR),
    [exerciseLogs, todayKey],
  );

  const handleSaveExercise = (exerciseName, sets, isPR) => {
    if (!log) return;
    // Append a new log entry. Note: we always append; older entries for the
    // same exercise/day remain so history is preserved chronologically.
    const next = [
      ...exerciseLogs,
      { date: todayKey, exercise: exerciseName, sets, isPR: !!isPR },
    ];
    log('exercise', next);
  };

  const isRest = !workout || workout.dur === 0;

  return (
    <div>
      {/* Header card */}
      <div style={{ ...s.card, padding: 14, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ ...s.lab, marginBottom: 4 }}>Today's Training</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: P.txS }}>
              {isRest ? '\u{1F319} Rest Day' : workout.d}
            </div>
            <div style={{ fontSize: 10, color: P.txD, marginTop: 2 }}>
              {isRest
                ? 'Recovery focus'
                : `${workout.dur} min · ${(workout.exercises || []).length} exercises · ${goalName}`}
            </div>
          </div>
          <span style={{ fontSize: 22 }}>{isRest ? '\u{1F319}' : '\u{1F3CB}️'}</span>
        </div>
        {isRest && (
          <div style={{
            marginTop: 10, padding: '8px 10px', borderRadius: 8,
            background: 'rgba(232,213,183,0.04)',
            fontSize: 11, color: P.txD, lineHeight: 1.5,
          }}>
            Optional: 20-30 min walk, mobility flow, or light stretching. Sleep is the workout today.
          </div>
        )}
      </div>

      {/* Today's PRs banner */}
      {todaysPRs.length > 0 && (
        <div style={{
          ...s.card, padding: 14, marginBottom: 12,
          border: '1px solid ' + P.ok + '44',
          background: 'rgba(52,211,153,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 18 }}>{'\u{1F389}'}</span>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: P.ok }}>
              {todaysPRs.length === 1 ? 'New PR Today' : 'New PRs Today'}
            </div>
          </div>
          {todaysPRs.map((pr, i) => {
            const topSet = (pr.sets || [])
              .filter(s => s.complete)
              .reduce((best, s) => (Number(s.weight) > (best ? Number(best.weight) : 0) ? s : best), null);
            const topW = topSet ? Number(topSet.weight) : 0;
            const prCount = (pr.sets || []).filter(s => s.complete && Number(s.weight) === topW).length;
            return (
              <div key={i} style={{ fontSize: 13, color: P.txS, padding: '2px 0' }}>
                {pr.exercise}: <span style={{ fontFamily: FM, fontWeight: 700, color: P.ok }}>{topW}lb</span>
                <span style={{ color: P.txD, fontSize: 11 }}> · {prCount} set{prCount === 1 ? '' : 's'}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Exercise list (skip if rest day) */}
      {!isRest && (workout.exercises || []).length > 0 && (
        <div style={{ ...s.card, padding: 14, marginBottom: 12 }}>
          <div style={{ ...s.lab }}>Log Sets</div>
          {workout.exercises.map((ex, idx) => (
            <ExerciseRow
              key={idx}
              exercise={ex}
              lastSession={getLastSession(logs, ex.name)}
              previousPR={getExercisePR(logs, ex.name)}
              onSave={(sets, isPR) => handleSaveExercise(ex.name, sets, isPR)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
