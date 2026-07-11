// src/app/views/WorkoutView.jsx
import React, { useState, useCallback } from 'react';
import { P, FN, FD } from '../../design/theme';
import { s } from '../../design/styles';
import { useAppState } from '../../state/store';
import { getProgram, GOAL_ALIASES } from '../../protocols/body/workout/programs';
import { logKey, prKey, swapKey } from '../../protocols/body/workout/keys';
import { needsDeload } from '../../protocols/body/workout/progression';
import DaySelector from './workout/DaySelector';
import WeekSelector from './workout/WeekSelector';
import DeloadBanner from './workout/DeloadBanner';
import ExerciseCard from './workout/ExerciseCard';
import RestTimer from './workout/RestTimer';
import PRCelebration from '../../views/components/PRCelebration';

export default function WorkoutView({ fixedDayIdx }) {
  const { state, setProtocolState, log } = useAppState();
  const { profile, protocolState, logs } = state;
  const wk = protocolState.workout || { wkWeek: 1, wkLogs: {}, wkPRs: {}, wkSwaps: {} };
  const goal = profile.primary || 'Wellness';
  const resolvedGoal = GOAL_ALIASES[goal] || goal;
  const program = getProgram(goal);

  const todayIdx = new Date().getUTCDay();
  const initialDay = fixedDayIdx != null ? fixedDayIdx : (wk.wkViewDay ?? todayIdx);
  const [dayIdx, setDayIdx] = useState(initialDay);
  const [rest, setRest] = useState(null);
  const [celebration, setCelebration] = useState(null);

  const dayWorkout = program[dayIdx];
  const week = wk.wkWeek || 1;

  const setLog = useCallback((exName, setIdx, entry) => {
    const k = logKey(resolvedGoal, week, dayIdx, exName, setIdx);
    const prev = wk.wkLogs?.[k];
    const nextLogs = { ...wk.wkLogs, [k]: entry };
    let nextPRs = wk.wkPRs;
    if (entry.c && entry.wt) {
      const pk = prKey(resolvedGoal, exName);
      const cur = nextPRs[pk] || 0;
      const w = Number(entry.wt) || 0;
      if (w > cur) {
        // wkPRs record fires on EVERY qualifying edit (every keystroke while checked) —
        // this is main's pre-existing PR-record behavior and SetGrid's badge depends on it.
        // Do not gate this part.
        nextPRs = { ...nextPRs, [pk]: w };
        // Celebration + log.exercise append, however, must fire only once per set
        // completion: on the checkbox false->true transition. setLog fires on every
        // field onChange, so gating on entry.c alone (checked) would re-fire on each
        // keystroke while typing weight after checking, corrupting WeeklyRecap's
        // prCount with duplicate isPR:true entries.
        // Trade-off: a set checked BEFORE its weight is typed gets a PR record + badge
        // but no celebration/log entry (prev is undefined/unchecked at check-time, so
        // the weight isn't known yet) — acceptable; the celebration-grade log stays clean.
        if (entry.c && !prev?.c) {
          setCelebration({ exercise: exName, weight: w, reps: entry.r });
          const todayISO = new Date().toISOString().slice(0, 10);
          log('exercise', [
            ...(logs.exercise || []),
            { date: todayISO, exercise: exName, sets: [entry], isPR: true },
          ]);
        }
      }
    }
    setProtocolState('workout', { wkLogs: nextLogs, wkPRs: nextPRs });
  }, [resolvedGoal, week, dayIdx, wk.wkLogs, wk.wkPRs, setProtocolState, logs.exercise, log]);

  const setSwap = useCallback((exName, altName) => {
    const k = swapKey(resolvedGoal, week, dayIdx, exName);
    const next = { ...(wk.wkSwaps || {}) };
    if (altName == null) delete next[k]; else next[k] = altName;
    setProtocolState('workout', { wkSwaps: next });
  }, [resolvedGoal, week, dayIdx, wk.wkSwaps, setProtocolState]);

  const setWeek = useCallback((w) => {
    setProtocolState('workout', { wkWeek: w });
  }, [setProtocolState]);

  return (
    <div>
      <div style={{ marginBottom: 6 }}>
        <div style={{ fontFamily: FD, fontStyle: 'italic', fontSize: 14, color: P.txM }}>
          {resolvedGoal}
        </div>
      </div>

      <WeekSelector week={week} onChange={setWeek} />
      <DaySelector
        goal={resolvedGoal} week={week} dayIdx={dayIdx}
        program={program} wkLogs={wk.wkLogs}
        onSelect={setDayIdx}
      />

      {needsDeload(week) && <DeloadBanner />}

      <div style={{ ...s.card, padding: 16, marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ fontFamily: FD, fontSize: 22, fontWeight: 300, color: P.gW, fontStyle: 'italic' }}>
            {dayWorkout.d || 'Rest'}
          </div>
          {dayWorkout.dur > 0 && (
            <div style={{ fontSize: 10, color: P.txD, letterSpacing: 1.5, textTransform: 'uppercase' }}>
              {dayWorkout.dur} min
            </div>
          )}
        </div>
        {dayWorkout.warmup && (
          <div style={{ fontSize: 11, color: P.txM, marginTop: 6 }}>
            <b style={{ color: P.txS }}>Warmup:</b> {dayWorkout.warmup}
          </div>
        )}
      </div>

      {(!dayWorkout.exercises || dayWorkout.exercises.length === 0) ? (
        <div style={{ ...s.card, padding: 22, textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: P.txM }}>Rest day — recover, hydrate, sleep.</div>
        </div>
      ) : (
        dayWorkout.exercises.map((ex, i) => (
          <ExerciseCard
            key={ex.name + '-' + i}
            goal={resolvedGoal} week={week} dayIdx={dayIdx}
            exercise={ex}
            wkLogs={wk.wkLogs} wkPRs={wk.wkPRs} wkSwaps={wk.wkSwaps || {}}
            onSet={(setIdx, entry) => setLog(ex.name, setIdx, entry)}
            onSwap={(altName) => setSwap(ex.name, altName)}
            onStartRest={(seconds, name) => setRest({ seconds, name })}
          />
        ))
      )}

      {dayWorkout.cooldown && (
        <div style={{ ...s.card, padding: 14, marginTop: 4 }}>
          <div style={{ fontSize: 11, color: P.txM }}>
            <b style={{ color: P.txS }}>Cooldown:</b> {dayWorkout.cooldown}
          </div>
        </div>
      )}

      {rest && (
        <RestTimer
          exerciseName={rest.name}
          seconds={rest.seconds}
          onDone={() => setRest(null)}
          onSkip={() => setRest(null)}
        />
      )}

      {celebration && (
        <PRCelebration
          exercise={celebration.exercise}
          weight={celebration.weight}
          reps={celebration.reps}
          onClose={() => setCelebration(null)}
        />
      )}
    </div>
  );
}
