// Home dashboard — the v1-style top section of the routine view.
// Shows greeting, protocol score, next-up task, stat tiles, deadline
// banner, check-in progress dots, and 7-day mood strip.
//
// Inputs: profile, logs, today, routine, completedTasks, adaptive,
//         intensityLabel.

import React from 'react';
import { P, FN, FD, FM } from '../design/theme';
import { s } from '../design/styles';
import { GradText } from '../design/components';
import { calcCalorieTarget, sumDayMeals } from '../protocols/body/nutrition/math';
import { CHECKIN_FIELDS } from '../protocols/_system/checkin/fields';
import StatNumber from '../design/StatNumber';
import StreakBadge from '../views/components/StreakBadge';
import { computeRoutineStreak } from './streak';

function greeting() {
  const h = new Date().getHours();
  if (h < 5)  return { word: 'Late night', icon: '\u{1F319}' };
  if (h < 12) return { word: 'Good morning', icon: '☀️' };
  if (h < 17) return { word: 'Good afternoon', icon: '\u{1F31E}' };
  if (h < 22) return { word: 'Good evening', icon: '\u{1F319}' };
  return { word: 'Late night', icon: '\u{1F319}' };
}

function dayName(date) {
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()];
}

/**
 * Synthesizes a 0-100 protocol-adherence score from:
 *   40% routine completion %, 30% check-in 7-day streak, 30% weight pace
 */
function computeProtocolScore({ routine, completedTasks, logs, today, adaptive }) {
  // 40% — today's routine completion
  const routineDone = (completedTasks || []).length;
  const routineTotal = routine?.scheduled?.length || 0;
  const routineScore = routineTotal > 0 ? (routineDone / routineTotal) : 0;

  // 30% — check-in 7-day completion rate
  const checkins = logs?.checkins || {};
  let checkinHits = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const k = d.toISOString().slice(0, 10);
    if (checkins[k]) checkinHits++;
  }
  const checkinScore = checkinHits / 7;

  // 30% — pace adherence (1 if on track, 0.5 behind, 0 off pace)
  let paceScore = 0.5;
  if (adaptive) {
    if (adaptive.pace === 'on_track' || adaptive.pace === 'ahead') paceScore = 1.0;
    else if (adaptive.pace === 'behind') paceScore = 0.6;
    else if (adaptive.pace === 'off_pace' || adaptive.pace === 'unrealistic') paceScore = 0.2;
    else paceScore = 0.5;  // no_goal
  }

  return Math.round(100 * (routineScore * 0.4 + checkinScore * 0.3 + paceScore * 0.3));
}

/**
 * The next uncompleted scheduled task (by time).
 */
function findNextUpTask(routine, completedTasks) {
  const tasks = routine?.scheduled || [];
  const done = new Set(completedTasks || []);
  const pending = tasks.filter(t => !done.has(t.id) && t.type !== 'browse' && t.type !== 'recommendation');
  if (pending.length === 0) return null;
  // Sort by time if present, else keep order
  const withTime = pending.filter(t => t.time && /^\d{1,2}:/.test(t.time));
  if (withTime.length > 0) {
    withTime.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    return withTime[0];
  }
  return pending[0];
}

const StatTile = ({ label, value, sub, accent }) => (
  <div style={{
    flex: 1, minWidth: 0,
    ...s.card, padding: '12px 10px', textAlign: 'center',
  }}>
    <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: P.txD, marginBottom: 4 }}>
      {label}
    </div>
    <div style={{ fontFamily: FM, fontSize: 22, fontWeight: 700, color: accent || P.txS, lineHeight: 1 }}>
      {value}
    </div>
    {sub != null && (
      <div style={{ fontSize: 9, color: P.txD, marginTop: 4, fontFamily: FM }}>
        {sub}
      </div>
    )}
  </div>
);

function ProtocolScoreRing({ score }) {
  const radius = 38;
  const circ = 2 * Math.PI * radius;
  const dash = (score / 100) * circ;
  const accent = score >= 75 ? P.ok : score >= 50 ? P.gW : '#F59E0B';
  const glow = score >= 75 ? 'rgba(52,211,153,0.4)' : score >= 50 ? 'rgba(232,213,183,0.4)' : 'rgba(245,158,11,0.4)';
  return (
    <div style={{ position: 'relative', width: 96, height: 96 }}>
      <svg width="96" height="96" style={{ transform: 'rotate(-90deg)', filter: `drop-shadow(0 0 8px ${glow})` }}>
        <circle cx="48" cy="48" r={radius} fill="none" stroke="rgba(232,213,183,0.08)" strokeWidth="3" />
        <circle
          cx="48" cy="48" r={radius} fill="none"
          stroke={accent} strokeWidth="3" strokeLinecap="round"
          strokeDasharray={`${dash} ${circ - dash}`}
          style={{
            transition: 'stroke-dasharray 1.2s cubic-bezier(0.16,1,0.3,1), stroke 0.4s',
            // Begin from 0 dash on mount so the ring "draws" itself
            animation: 'ringDraw 1.2s cubic-bezier(0.16,1,0.3,1) both',
            '--ring-circumference': circ,
            '--ring-target': circ - dash,
          }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ fontFamily: FM, fontSize: 28, fontWeight: 700, color: accent, fontVariantNumeric: 'tabular-nums' }}>
          <StatNumber value={score} initial={0} format={(n) => Math.round(n)} duration={1100} />
        </div>
        <div style={{ fontSize: 8, color: P.txD, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 2 }}>
          Protocol
        </div>
      </div>
    </div>
  );
}

export default function HomeDashboard({
  profile, logs, today, routine, completedTasks = [], adaptive, day,
  onCheckinTap,
}) {
  const greet = greeting();
  const dn = day ? dayName(day) : '';
  const score = computeProtocolScore({ routine, completedTasks, logs, today, adaptive });
  const streakDays = computeRoutineStreak(logs?.routine || {}, today);
  const nextUp = findNextUpTask(routine, completedTasks);
  const firstName = (profile?.name || '').split(' ')[0];

  // Calorie + macro stats
  const goal = profile?.primary || 'Wellness';
  const target = adaptive?.adaptedTarget || calcCalorieTarget(profile, goal);
  const todaysMeals = (logs?.food && logs.food[today]) || [];
  const consumed = sumDayMeals(todaysMeals).cal;
  const calLeft = Math.max(0, target - consumed);

  // Routine completion
  const totalTasks = routine?.scheduled?.length || 0;
  const doneTasks = completedTasks.length;
  const routinePct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  // Weight + days left
  const weights = (logs?.weight || []).filter(w => w?.date && w?.weight != null);
  const lastWeight = weights.length > 0
    ? Number(weights.slice().sort((a, b) => a.date.localeCompare(b.date)).pop().weight)
    : Number(profile?.weight) || null;
  const daysLeft = adaptive?.daysRemaining;

  // Check-in 7-day dots — ordered oldest to newest
  const checkinDots = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const k = d.toISOString().slice(0, 10);
    checkinDots.push({ key: k, hit: !!(logs?.checkins?.[k]) });
  }
  const todayCheckin = logs?.checkins?.[today] || null;
  const checkinCount = todayCheckin ? Object.keys(todayCheckin).filter(k => CHECKIN_FIELDS.find(f => f.id === k) && todayCheckin[k] != null).length : 0;

  // Mood 7-day strip
  const moodColors = (CHECKIN_FIELDS.find(f => f.id === 'mood')?.colors) || [];
  const moodCells = checkinDots.map(({ key }) => {
    const m = logs?.checkins?.[key]?.mood;
    return { key, val: m, color: m ? moodColors[m - 1] : null };
  });

  return (
    <div style={{ marginBottom: 14 }}>
      {/* Greeting + protocol score */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: P.txD, letterSpacing: 1, textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11 }}>{greet.icon}</span>
            <span>{greet.word}</span>
          </div>
          <div style={{ fontFamily: FD, fontSize: 32, fontWeight: 300, fontStyle: 'italic', color: P.txS, marginTop: 2 }}>
            <GradText>{firstName || 'You'}</GradText>
          </div>
          {adaptive && adaptive.pace !== 'no_goal' && (
            <div style={{ fontSize: 11, color: P.txD, marginTop: 4 }}>
              {dn} · <span style={{ color: adaptive.pace === 'off_pace' || adaptive.pace === 'unrealistic' ? '#EF4444'
                : adaptive.pace === 'behind' ? '#F59E0B'
                : P.gW }}>{adaptive.paceLabel}</span>
            </div>
          )}
          {streakDays > 0 && (
            <div style={{ marginTop: 10 }}>
              <StreakBadge days={streakDays} compact />
            </div>
          )}
        </div>
        <ProtocolScoreRing score={score} />
      </div>

      {/* Next Up */}
      {nextUp && (
        <div style={{
          ...s.card, padding: 14, marginBottom: 14,
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'linear-gradient(135deg, rgba(232,213,183,0.05), rgba(232,213,183,0))',
          borderColor: 'rgba(232,213,183,0.12)',
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: P.gW }}>
              Next Up
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: P.txS, marginTop: 4 }}>
              {nextUp.time && <span style={{ fontFamily: FM, color: P.gW, marginRight: 8 }}>{nextUp.time}</span>}
              {nextUp.title}
            </div>
            {nextUp.subtitle && (
              <div style={{ fontSize: 10, color: P.txD, marginTop: 2 }}>{nextUp.subtitle}</div>
            )}
          </div>
        </div>
      )}

      {/* Stat tiles */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <StatTile
          label="Calories"
          value={calLeft.toLocaleString()}
          sub="left"
          accent={calLeft <= 0 ? '#F59E0B' : P.txS}
        />
        <StatTile
          label="Routine"
          value={routinePct + '%'}
          sub={doneTasks + '/' + totalTasks}
          accent={routinePct >= 75 ? P.ok : routinePct >= 50 ? P.gW : P.txS}
        />
        <StatTile
          label="Weight"
          value={lastWeight != null ? lastWeight : '—'}
          sub={daysLeft != null ? daysLeft + 'd left' : null}
          accent={P.txS}
        />
      </div>

      {/* Daily Check-in card with 7-day dots */}
      <div
        onClick={onCheckinTap}
        style={{
          ...s.card, padding: 14, marginBottom: 14,
          display: 'flex', alignItems: 'center', gap: 12,
          cursor: onCheckinTap ? 'pointer' : 'default',
        }}
      >
        <span style={{ fontSize: 22 }}>{'\u{1F4CB}'}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: P.txS }}>Daily Check-in</div>
          <div style={{ fontSize: 10, color: P.txD, marginTop: 2 }}>
            {todayCheckin ? `${checkinCount}/8 logged today` : `0/${CHECKIN_FIELDS.length} logged`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {checkinDots.map(({ key, hit }) => (
            <div key={key} style={{
              width: 8, height: 8, borderRadius: 4,
              background: hit ? P.gW : 'rgba(232,213,183,0.12)',
            }} />
          ))}
          <span style={{ fontSize: 10, color: P.txD, marginLeft: 4, alignSelf: 'center' }}>▶</span>
        </div>
      </div>

      {/* 7-day mood strip */}
      {moodCells.some(c => c.val) && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: P.txD }}>
              7-Day Mood
            </span>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {moodCells.map(({ key, val, color }) => (
              <div key={key} style={{
                flex: 1, height: 28, borderRadius: 6,
                background: color || 'rgba(232,213,183,0.05)',
                border: '1px solid ' + (color ? color : P.bd),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, color: color ? '#0A0B0E' : P.txD, fontWeight: 700, fontFamily: FM,
              }}>
                {val || ''}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
