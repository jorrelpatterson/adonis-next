// WeeklyRecap — auto-generated, screenshottable summary surfaced on Sundays.
//
// Aggregates the past 7 days into a tall, story-format card that the user
// can save or screenshot. Stats include: routine completion %, workouts
// logged, calorie days on target, weight delta, current streak, PR count.
//
// Mirrors the Spotify Wrapped / Strava Year in Sport vibe — a moment that
// produces shareable content while reinforcing engagement.

import React, { useMemo } from 'react';
import { P, FN, FD, FM } from '../../design/theme';
import { s } from '../../design/styles';
import { GradText } from '../../design/components';
import { computeRoutineStreak } from '../../routine/streak';
import StreakBadge from './StreakBadge';

function ymd(date) {
  const d = date instanceof Date ? date : new Date(date);
  return d.toISOString().slice(0, 10);
}

function shiftDay(iso, deltaDays) {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

/**
 * Returns true when today is Sunday — used by the parent to decide whether
 * to surface the recap. Hosted here so callers don't need to know the rule.
 */
export function isRecapDay(date = new Date()) {
  return date.getUTCDay() === 0;
}

/**
 * Compute aggregated week stats from logs.
 */
export function buildWeekStats({ logs, profile, today = ymd(new Date()) }) {
  const start = shiftDay(today, -6);
  const week = Array.from({ length: 7 }, (_, i) => shiftDay(start, i));

  // Routine completion
  const routineByDay = (logs?.routine) || {};
  const tasksLogged = week.reduce((sum, d) => sum + (routineByDay[d]?.length || 0), 0);
  const daysWithTasks = week.filter(d => (routineByDay[d]?.length || 0) > 0).length;

  // Workouts (exercise logs)
  const exercise = Array.isArray(logs?.exercise) ? logs.exercise : [];
  const workoutDays = new Set();
  let prCount = 0;
  for (const e of exercise) {
    if (e?.date && e.date >= start && e.date <= today) {
      workoutDays.add(e.date);
      if (e.isPR) prCount += 1;
    }
  }

  // Calorie days on target (rough — within 10% of target)
  const food = (logs?.food) || {};
  const caloriesByDay = week.map(d => {
    const meals = food[d] || [];
    return meals.reduce((sum, m) => sum + (Number(m.cals) || 0), 0);
  });
  const targetCals = Number(profile?.targetCal || 0);
  const calsOnTarget = targetCals
    ? caloriesByDay.filter(c => c > 0 && Math.abs(c - targetCals) <= targetCals * 0.1).length
    : 0;

  // Weight delta
  const weightLog = Array.isArray(logs?.weight) ? logs.weight : [];
  const weekWeights = weightLog.filter(e => e?.date && e.date >= start && e.date <= today);
  const startWeight = weekWeights[0]?.weight;
  const endWeight   = weekWeights[weekWeights.length - 1]?.weight;
  const weightDelta = (startWeight != null && endWeight != null)
    ? Math.round((Number(endWeight) - Number(startWeight)) * 10) / 10
    : null;

  // Streak (today)
  const streakDays = computeRoutineStreak(routineByDay, today);

  return {
    tasksLogged, daysWithTasks,
    workoutCount: workoutDays.size, prCount,
    calsOnTarget, weightDelta,
    streakDays,
    weekRange: { start, end: today },
  };
}

export default function WeeklyRecap({ stats, onClose }) {
  const ratio = Math.round((stats.daysWithTasks / 7) * 100);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10001,
      background: 'rgba(8,10,16,0.65)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: FN, padding: 16,
      animation: 'vt-fade-in 0.4s cubic-bezier(0.16,1,0.3,1) both',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        ...s.card,
        width: '100%', maxWidth: 420,
        padding: 28,
        borderRadius: 24,
        background: 'linear-gradient(165deg, rgba(20,22,30,0.95), rgba(14,16,22,0.95))',
        animation: 'springScale 0.55s cubic-bezier(0.34,1.56,0.64,1) both',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            fontSize: 9, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase',
            color: P.gW, marginBottom: 8, opacity: 0.8,
          }}>
            Your Week
          </div>
          <h2 style={{
            fontFamily: FD,
            fontSize: 'clamp(28px, 8vw, 36px)',
            fontWeight: 300, fontStyle: 'italic',
            margin: 0, letterSpacing: -0.4, lineHeight: 1.1,
          }}>
            <GradText>Sunday Recap</GradText>
          </h2>
        </div>

        {/* Big stat — routine completion */}
        <div style={{
          padding: 20, borderRadius: 16,
          background: 'rgba(232,213,183,0.04)',
          border: '1px solid rgba(232,213,183,0.1)',
          marginBottom: 14, textAlign: 'center',
        }}>
          <div style={{ fontFamily: FM, fontSize: 56, fontWeight: 700, color: P.gW, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
            {ratio}<span style={{ fontSize: 32, color: P.txM }}>%</span>
          </div>
          <div style={{ fontSize: 11, color: P.txD, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 6 }}>
            Routine Adherence
          </div>
          <div style={{ fontSize: 11, color: P.txM, marginTop: 6 }}>
            {stats.daysWithTasks} of 7 days · {stats.tasksLogged} tasks
          </div>
        </div>

        {/* Stat grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <StatTile label="Workouts" value={stats.workoutCount} sub="this week" />
          <StatTile label="PRs"      value={stats.prCount}      sub={stats.prCount === 1 ? 'set' : 'set'} />
          <StatTile label="Cals on target" value={stats.calsOnTarget} sub={`of ${7} days`} />
          <StatTile
            label="Weight"
            value={stats.weightDelta == null ? '—' : (stats.weightDelta > 0 ? '+' : '') + stats.weightDelta}
            sub={stats.weightDelta == null ? 'no data' : 'lbs'}
          />
        </div>

        {/* Streak */}
        {stats.streakDays > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
            <StreakBadge days={stats.streakDays} />
          </div>
        )}

        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '14px 24px', borderRadius: 100,
            background: 'linear-gradient(135deg,#E8D5B7,#C9B89A,#B8C4D0)',
            color: '#0A0B0E', fontFamily: FN, fontSize: 13, fontWeight: 700,
            letterSpacing: 0.5, border: 'none', cursor: 'pointer',
            boxShadow: '0 6px 24px rgba(232,213,183,0.2), 0 1px 0 0 rgba(255,255,255,0.3) inset',
          }}
        >
          Continue the Week
        </button>
      </div>
    </div>
  );
}

function StatTile({ label, value, sub }) {
  return (
    <div style={{
      padding: 14, borderRadius: 12,
      background: 'rgba(232,213,183,0.025)',
      border: '1px solid rgba(232,213,183,0.06)',
      textAlign: 'center',
    }}>
      <div style={{ fontFamily: FM, fontSize: 22, fontWeight: 700, color: P.txS, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 9, color: P.gW, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 6 }}>
        {label}
      </div>
      {sub && (
        <div style={{ fontSize: 10, color: P.txD, marginTop: 2 }}>{sub}</div>
      )}
    </div>
  );
}
