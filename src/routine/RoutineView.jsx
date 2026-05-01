import React from 'react';
import { P, FN, FD, FM } from '../design/theme';
import { s } from '../design/styles';
import { GradText } from '../design/components';
import { CAT_COLORS, CAT_ICONS, DS } from '../design/constants';
import { useState, useMemo } from 'react';
import { buildYesterdayRecap, buildCheckinAlerts, buildWeightTrendAlert, buildDeloadAlert, computeWorkoutIntensity, getIntensityLabel } from './intelligence';
import { groupTasksByTimeBlock } from './group-by-time';
import { computeAdaptive } from '../protocols/body/nutrition/adaptive-calories';
import HomeDashboard from './HomeDashboard';
import EmptyState from '../design/EmptyState';
import { IllusTasksDone } from '../design/illustrations';
import WeeklyRecap, { isRecapDay, buildWeekStats } from '../views/components/WeeklyRecap';
import StreakMilestone, { getPendingMilestone, setLastShownMilestone } from '../views/components/StreakMilestone';
import { computeRoutineStreak } from './streak';
import ProgressBar from '../design/ProgressBar';
import { haptics } from '../design/haptics';
import { sound } from '../design/sound';
import ExerciseDetail from '../views/components/ExerciseDetail';

const TONE_STYLES = {
  warn: { border: 'rgba(245,158,11,0.18)', bg: 'rgba(245,158,11,0.05)', accent: '#F59E0B' },
  info: { border: 'rgba(168,188,208,0.18)', bg: 'rgba(168,188,208,0.05)', accent: '#A8BCD0' },
  good: { border: 'rgba(52,211,153,0.18)', bg: 'rgba(52,211,153,0.05)', accent: '#34D399' },
};

export default function RoutineView({
  routine, onCheckTask, onTaskTap, completedTasks = [],
  day, goals = [], onDayChange,
  logs = {}, profile = {}, today,
}) {
  const dayIdx = day.getDay();
  const completed = new Set(Array.isArray(completedTasks) ? completedTasks : []);
  const isToday = today && day.toISOString().slice(0, 10) === today;

  // Streak milestone detection — fires when user crosses a tier (7/14/30/100).
  const streakDays = isToday ? computeRoutineStreak(logs?.routine || {}, today) : 0;
  const pendingMilestone = useMemo(
    () => isToday ? getPendingMilestone(streakDays) : null,
    [isToday, streakDays]
  );
  const [milestoneDismissed, setMilestoneDismissed] = useState(0);
  const dismissMilestone = () => {
    if (pendingMilestone) setLastShownMilestone(pendingMilestone.days);
    setMilestoneDismissed((n) => n + 1);
  };
  const showMilestone = pendingMilestone != null && milestoneDismissed === 0;

  // Sunday Recap — surfaces once per week. Persisted dismiss key tied to
  // ISO week so it doesn't re-show after manual dismiss.
  const recapKey = today ? `adonis_recap_dismissed_${today}` : null;
  const [recapShown, setRecapShown] = useState(() => {
    if (typeof window === 'undefined' || !recapKey) return false;
    try { return localStorage.getItem(recapKey) === '1'; } catch { return false; }
  });
  const showRecap = !recapShown && day && isRecapDay(day) && (logs?.routine || logs?.exercise);
  const weekStats = useMemo(
    () => showRecap ? buildWeekStats({ logs, profile, today }) : null,
    [showRecap, logs, profile, today]
  );
  const dismissRecap = () => {
    try { if (recapKey) localStorage.setItem(recapKey, '1'); } catch { /* noop */ }
    setRecapShown(true);
  };

  // ─── Intelligence cards (only on today's view) ────────────────────────
  const recap = isToday ? buildYesterdayRecap(logs, today) : null;
  const checkinAlerts = isToday ? buildCheckinAlerts(logs) : [];
  const weightAlert = isToday ? buildWeightTrendAlert(logs, profile) : null;
  const deloadAlert = isToday ? buildDeloadAlert(logs, today) : null;
  const intensity = isToday ? computeWorkoutIntensity(profile, logs, today) : 'normal';
  const intensityLabel = getIntensityLabel(intensity);
  const adaptive = isToday ? computeAdaptive(profile, logs?.weight, today, profile?.primary) : null;

  return (
    <div>
      {/* Home Dashboard — greeting, protocol score, next-up, stat tiles, check-in dots, mood strip */}
      {isToday && (
        <HomeDashboard
          profile={profile}
          logs={logs}
          today={today}
          routine={routine}
          completedTasks={completedTasks}
          adaptive={adaptive}
          day={day}
          onCheckinTap={() => {
            const checkinTask = routine?.scheduled?.find(t => t.type === 'check-in');
            if (checkinTask && onTaskTap) onTaskTap(checkinTask);
          }}
        />
      )}

      {/* Day Selector — premium gradient pill on active day */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 16 }}>
        {DS.map((label, i) => {
          const isSelected = i === dayIdx;
          const d = new Date(day);
          d.setDate(d.getDate() + (i - dayIdx));
          const dateNum = d.getDate();
          return (
            <button key={i} onClick={() => {
              if (!isSelected) { haptics.light(); sound.tap(); }
              onDayChange && onDayChange(d);
            }}
              style={{
                width: 40, height: 52, borderRadius: 20,
                border: isSelected ? 'none' : '1px solid ' + P.bd,
                background: isSelected
                  ? 'linear-gradient(180deg, #E8D5B7, #C9B89A)'
                  : 'rgba(232,213,183,0.025)',
                backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                color: isSelected ? '#0A0B0E' : P.txD,
                fontSize: 11, fontWeight: isSelected ? 700 : 500,
                cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 1,
                boxShadow: isSelected
                  ? '0 6px 20px rgba(232,213,183,0.3), 0 1px 0 0 rgba(255,255,255,0.3) inset'
                  : '0 1px 0 0 rgba(255,255,255,0.02) inset',
                fontVariantNumeric: 'tabular-nums',
              }}>
              <span style={{ fontSize: 8, letterSpacing: 1, opacity: isSelected ? 0.7 : 0.6, fontWeight: 700 }}>
                {label}
              </span>
              <span style={{ fontSize: 14, fontWeight: 700 }}>
                {dateNum}
              </span>
            </button>
          );
        })}
      </div>

      {/* Adaptive pace banner — shows when goal + deadline set */}
      {adaptive && adaptive.pace !== 'no_goal' && (
        (() => {
          const isOff = adaptive.pace === 'off_pace' || adaptive.pace === 'unrealistic';
          const isAhead = adaptive.pace === 'ahead';
          const isBehind = adaptive.pace === 'behind';
          const accent = isOff ? '#EF4444' : isAhead ? P.ok : isBehind ? '#F59E0B' : P.gW;
          const dotIcon = isOff ? '\u{1F534}' : isAhead ? '\u{1F7E2}' : isBehind ? '\u{1F7E1}' : '\u{1F7E2}';
          return (
            <div style={{
              ...s.card, padding: 14, marginBottom: 12,
              border: '1px solid ' + accent + '33',
              background: 'linear-gradient(135deg,' + accent + '0A,' + accent + '02)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 11 }}>{dotIcon}</span>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: accent }}>
                  {adaptive.paceLabel}
                </span>
                {adaptive.daysRemaining != null && (
                  <span style={{ marginLeft: 'auto', fontSize: 10, color: P.txD, fontFamily: FM }}>
                    {adaptive.daysRemaining}d left
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontFamily: FM, fontSize: 18, fontWeight: 700, color: accent }}>
                    {Math.abs(adaptive.requiredWeeklyRate || 0).toFixed(1)}
                  </div>
                  <div style={{ fontSize: 8, color: P.txD, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                    lbs/wk needed
                  </div>
                </div>
                <div>
                  <div style={{ fontFamily: FM, fontSize: 18, fontWeight: 700, color: accent }}>
                    {adaptive.adaptedTarget}
                  </div>
                  <div style={{ fontSize: 8, color: P.txD, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                    Daily cal
                  </div>
                </div>
                {intensityLabel.label && (
                  <div>
                    <div style={{ fontFamily: FM, fontSize: 14, fontWeight: 700, color: intensityLabel.color, marginTop: 3 }}>
                      {intensityLabel.icon} {intensityLabel.label}
                    </div>
                    <div style={{ fontSize: 8, color: P.txD, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                      Workout mode
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()
      )}

      {/* Yesterday recap — only renders when there's data */}
      {recap && (
        <div style={{ ...s.card, padding: 12, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: P.gW }}>
              Yesterday
            </div>
            {recap.weightDelta != null && (
              <div style={{
                fontFamily: FM, fontSize: 11, fontWeight: 700,
                color: recap.weightDelta < 0 ? P.ok : (recap.weightDelta > 0 ? '#F59E0B' : P.txM),
              }}>
                {recap.weightDelta > 0 ? '+' : ''}{recap.weightDelta} lbs
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {recap.tasksDone > 0 && (
              <div>
                <div style={{ fontFamily: FM, fontSize: 16, fontWeight: 700, color: P.txS }}>
                  {recap.tasksDone}
                </div>
                <div style={{ fontSize: 8, color: P.txD, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                  Tasks done
                </div>
              </div>
            )}
            {recap.calorieTotal > 0 && (
              <div>
                <div style={{ fontFamily: FM, fontSize: 16, fontWeight: 700, color: P.txS }}>
                  {recap.calorieTotal}
                </div>
                <div style={{ fontSize: 8, color: P.txD, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                  Calories
                </div>
              </div>
            )}
            {recap.exerciseCount > 0 && (
              <div>
                <div style={{ fontFamily: FM, fontSize: 16, fontWeight: 700, color: P.txS }}>
                  {recap.exerciseCount}{recap.prCount > 0 && <span style={{ fontSize: 11, color: P.gW, marginLeft: 4 }}>({recap.prCount} PR)</span>}
                </div>
                <div style={{ fontSize: 8, color: P.txD, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                  Exercises
                </div>
              </div>
            )}
            {recap.checkin?.mood != null && (
              <div>
                <div style={{ fontFamily: FM, fontSize: 16, fontWeight: 700, color: P.txS }}>
                  {recap.checkin.mood}/5
                </div>
                <div style={{ fontSize: 8, color: P.txD, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                  Mood
                </div>
              </div>
            )}
            {recap.checkin?.energy != null && (
              <div>
                <div style={{ fontFamily: FM, fontSize: 16, fontWeight: 700, color: P.txS }}>
                  {recap.checkin.energy}/5
                </div>
                <div style={{ fontSize: 8, color: P.txD, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                  Energy
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Check-in alerts + weight trend */}
      {(checkinAlerts.length > 0 || weightAlert) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          {[weightAlert, deloadAlert, ...checkinAlerts].filter(Boolean).map((alert, i) => {
            const tone = TONE_STYLES[alert.tone] || TONE_STYLES.info;
            return (
              <div key={i} style={{
                padding: '10px 12px', borderRadius: 10,
                background: tone.bg, border: '1px solid ' + tone.border,
                display: 'flex', alignItems: 'flex-start', gap: 10,
              }}>
                <span style={{ fontSize: 16, lineHeight: 1, marginTop: 1 }}>{alert.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: tone.accent, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                    {alert.title}
                  </div>
                  <div style={{ fontSize: 11, color: P.txM, lineHeight: 1.5, marginTop: 2 }}>
                    {alert.body}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Goal Progress Summary */}
      {goals.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, overflowX: 'auto', padding: '4px 0' }}>
          {goals.map(g => (
            <div key={g.id} style={{
              minWidth: 140, padding: '10px 14px', borderRadius: 12,
              background: 'rgba(232,213,183,0.03)',
              border: '1px solid ' + P.bd,
              backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: P.txS, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{g.title}</div>
              <div style={{ marginTop: 8 }}>
                <ProgressBar
                  value={g.progress?.percent || 0}
                  max={100}
                  color={(g.progress?.percent || 0) >= 75 ? P.ok : P.gW}
                  height={4}
                />
              </div>
              <div style={{ fontSize: 9, color: P.txD, marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>
                {g.progress?.percent || 0}% {'\u00B7'} {g.progress?.trend || 'on_track'}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Routine Items — calendar view, grouped into time blocks */}
      {routine.scheduled.length === 0 ? (
        <div style={{ ...s.card, padding: 0, overflow: 'hidden' }}>
          <EmptyState
            illustration={<IllusTasksDone />}
            headline="No tasks yet"
            body="Add a goal and your daily routine will populate automatically — sequenced from wake to lights out."
          />
        </div>
      ) : (
        <div>
          {groupTasksByTimeBlock(routine.scheduled).map(({ block, label, icon, items }) => (
            <div key={block} style={{ marginBottom: 14 }}>
              {/* Time block header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 4px', marginBottom: 6 }}>
                <span style={{ fontSize: 12 }}>{icon}</span>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: P.gW }}>
                  {label}
                </span>
                <div style={{ flex: 1, height: 1, background: P.bd, marginLeft: 4 }} />
              </div>
              <div style={{ ...s.card, padding: 0, overflow: 'hidden' }}>
                {items.map((item, i) => {
                  const isLast = i === items.length - 1;
                  if (item.kind === 'group') {
                    return (
                      <CollapsibleGroup
                        key={'group-' + item.category}
                        item={item}
                        isLast={isLast}
                        completed={completed}
                        onCheckTask={onCheckTask}
                        intensityLabel={intensityLabel}
                      />
                    );
                  }
                  return (
                    <TaskRow
                      key={item.task.id}
                      task={item.task}
                      isLast={isLast}
                      completed={completed}
                      onCheckTask={onCheckTask}
                      onTaskTap={onTaskTap}
                      intensityLabel={intensityLabel}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Deferred */}
      {routine.deferred.length > 0 && (
        <div style={{ fontSize: 11, color: P.txD, textAlign: 'center', marginTop: 8, fontStyle: 'italic' }}>
          {'\u{1F4A4}'} {routine.deferred.length} tasks deferred to tomorrow
        </div>
      )}

      {/* Upsells */}
      {routine.upsells.length > 0 && (
        <div style={{ ...s.card, marginTop: 16, padding: 14, borderColor: 'rgba(232,213,183,0.12)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: P.gW, marginBottom: 8 }}>
            <GradText>Recommendations</GradText>
          </div>
          {routine.upsells.map((u, i) => (
            <div key={i} style={{ fontSize: 12, color: P.txM, padding: '4px 0', lineHeight: 1.5 }}>
              {u.message}
              {u.product && (
                <span style={{ color: P.gW, fontWeight: 600, marginLeft: 6 }}>
                  ${u.product.price} {'\u2192'}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Retention */}
      {routine.retention.length > 0 && (
        <div style={{ ...s.card, marginTop: 12, padding: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: P.info, marginBottom: 8 }}>
            Insights
          </div>
          {routine.retention.map((r, i) => (
            <div key={i} style={{ fontSize: 12, color: P.txM, padding: '4px 0', lineHeight: 1.5 }}>
              {r.response?.message || r.message}
            </div>
          ))}
        </div>
      )}

      {/* Sunday recap — auto-surfaced once/week */}
      {showRecap && weekStats && (
        <WeeklyRecap stats={weekStats} onClose={dismissRecap} />
      )}

      {/* Streak milestone — fires once per tier crossing (7/14/30/100) */}
      {showMilestone && (
        <StreakMilestone
          tier={pendingMilestone}
          days={streakDays}
          onClose={dismissMilestone}
        />
      )}
    </div>
  );
}

// ─── TaskRow ──────────────────────────────────────────────────────────────
// Renders a single task. Handles all task types: normal (checkbox),
// browse (Browse → button), check-in (taps to open modal), automated.
function TaskRow({ task, isLast, completed, onCheckTask, onTaskTap, intensityLabel, indent = false }) {
  // Training task with structured exercise data → render ExerciseDetail
  // (form guide + target muscles + level + Watch Form Video).
  if (task.category === 'training' && task.data?.exercise) {
    return (
      <div style={{ padding: indent ? '4px 14px 4px 28px' : '4px 14px' }}>
        <ExerciseDetail exercise={task.data.exercise} />
      </div>
    );
  }

  const isDone = completed.has(task.id);
  const catColor = CAT_COLORS[task.category] || P.txD;
  const catIcon = CAT_ICONS[task.category] || '';
  const isAuto = task.type === 'automated';
  const isBrowse = task.type === 'browse';
  const isTappable = task.type === 'check-in' && onTaskTap;

  return (
    <div
      onClick={isTappable ? () => onTaskTap(task) : undefined}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: indent ? '8px 14px 8px 28px' : '10px 14px',
        borderBottom: isLast ? 'none' : '1px solid ' + P.bd,
        opacity: isDone ? 0.5 : 1,
        background: isDone ? 'rgba(52,211,153,0.02)' : 'transparent',
        cursor: isTappable ? 'pointer' : 'default',
      }}
    >
      {isBrowse ? (
        <div style={{
          width: 20, height: 20, borderRadius: 10, flexShrink: 0, marginTop: 1,
          border: '1.5px dashed ' + P.gW + '66',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, color: P.gW,
        }}>
          {'→'}
        </div>
      ) : (
        <button
          onClick={(e) => {
            if (isAuto) return;
            if (isTappable) { e.stopPropagation(); onTaskTap(task); return; }
            onCheckTask && onCheckTask(task.id);
          }}
          style={{
            width: 20, height: 20, borderRadius: 10, flexShrink: 0, marginTop: 1,
            border: isDone ? 'none' : ('1.5px solid ' + (isAuto ? P.ok : catColor + '44')),
            background: isDone ? P.ok : isAuto ? P.ok + '22' : 'transparent',
            cursor: isAuto ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, color: '#fff', fontFamily: FN,
          }}
        >
          {(isDone || isAuto) ? '✓' : ''}
        </button>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {task.time && (
            <span style={{ fontSize: 10, color: P.txD, fontFamily: 'SF Mono, Monaco, monospace', minWidth: 52 }}>
              {task.time}
            </span>
          )}
          <span style={{
            fontSize: 13, fontWeight: 500,
            color: isDone ? P.txD : P.txS,
            textDecoration: isDone ? 'line-through' : 'none',
          }}>
            {catIcon ? catIcon + ' ' : ''}{task.title}
          </span>
          {task.category === 'training' && intensityLabel && intensityLabel.label && (
            <span style={{
              fontSize: 8, padding: '2px 6px', borderRadius: 4,
              background: intensityLabel.color + '22', color: intensityLabel.color,
              fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
              marginLeft: 4,
            }}>
              {intensityLabel.icon} {intensityLabel.label}
            </span>
          )}
        </div>
        {task.subtitle && (
          <div style={{ fontSize: 10, color: P.txD, marginTop: 2, lineHeight: 1.4 }}>
            {task.subtitle}
          </div>
        )}
        {(isAuto || isBrowse || task.goalTitle) && (
          <div style={{ display: 'flex', gap: 6, marginTop: 3 }}>
            {task.goalTitle && (
              <span style={{
                fontSize: 8, padding: '1px 6px', borderRadius: 4,
                background: catColor + '11', color: catColor, fontWeight: 600,
              }}>
                {task.goalTitle}
              </span>
            )}
            {isAuto && (
              <span style={{
                fontSize: 8, padding: '1px 6px', borderRadius: 4,
                background: P.ok + '15', color: P.ok, fontWeight: 600,
              }}>automated</span>
            )}
            {isBrowse && (
              <span style={{
                fontSize: 8, padding: '1px 6px', borderRadius: 4,
                background: P.gW + '18', color: P.gW, fontWeight: 600,
              }}>
                Suggested · ${task.data?.price || '—'}
              </span>
            )}
          </div>
        )}
      </div>
      {isBrowse && task.data?.url && (
        <a href={task.data.url} target="_blank" rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          style={{
            flexShrink: 0,
            fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
            color: P.gW, textDecoration: 'none',
            border: '1px solid ' + P.gW + '44',
            padding: '4px 10px', borderRadius: 6,
            alignSelf: 'center',
          }}>
          Browse →
        </a>
      )}
    </div>
  );
}

// ─── CollapsibleGroup ─────────────────────────────────────────────────────
// Renders a group header (e.g. "🔥 Training · Push Day · 60 min") that
// expands to reveal each task in the group as an indented TaskRow.
function CollapsibleGroup({ item, isLast, completed, onCheckTask, intensityLabel }) {
  const [expanded, setExpanded] = useState(false);
  const { summary, tasks, category } = item;
  const doneCount = tasks.filter(t => completed.has(t.id)).length;
  const allDone = doneCount === tasks.length && tasks.length > 0;

  return (
    <div style={{ borderBottom: isLast && !expanded ? 'none' : '1px solid ' + P.bd }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 14px',
          width: '100%', background: 'transparent',
          border: 'none', cursor: 'pointer', fontFamily: FN, textAlign: 'left',
        }}
      >
        <div style={{
          width: 20, height: 20, borderRadius: 10, flexShrink: 0,
          border: '1.5px solid ' + (allDone ? P.ok : P.gW + '44'),
          background: allDone ? P.ok : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, color: '#fff',
        }}>
          {allDone ? '✓' : (doneCount > 0 ? doneCount : '')}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 14 }}>{summary.icon}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: P.txS }}>
              {summary.title}
            </span>
            {category === 'training' && intensityLabel && intensityLabel.label && (
              <span style={{
                fontSize: 8, padding: '2px 6px', borderRadius: 4,
                background: intensityLabel.color + '22', color: intensityLabel.color,
                fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
                marginLeft: 4,
              }}>
                {intensityLabel.icon} {intensityLabel.label}
              </span>
            )}
            <span style={{
              fontSize: 8, padding: '1px 6px', borderRadius: 4,
              background: 'rgba(232,213,183,0.06)', color: P.txD, fontWeight: 600,
              marginLeft: 'auto', flexShrink: 0,
            }}>
              {summary.count}
            </span>
          </div>
          <div style={{ fontSize: 10, color: P.txD, marginTop: 2, lineHeight: 1.4 }}>
            {summary.subtitle}
          </div>
        </div>
        <span style={{
          fontSize: 14, color: P.txD, flexShrink: 0,
          transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s',
        }}>
          ›
        </span>
      </button>
      {expanded && (
        <div style={{ background: 'rgba(232,213,183,0.02)' }}>
          {tasks.map((t, i) => (
            <TaskRow
              key={t.id}
              task={t}
              isLast={i === tasks.length - 1}
              completed={completed}
              onCheckTask={onCheckTask}
              intensityLabel={intensityLabel}
              indent
            />
          ))}
        </div>
      )}
    </div>
  );
}
