import React from 'react';
import { P, FN, FD } from '../design/theme';
import { s } from '../design/styles';
import { GradText } from '../design/components';
import { CAT_COLORS, CAT_ICONS, DS } from '../design/constants';

export default function RoutineView({ routine, onCheckTask, completedTasks = [], day, goals = [], onDayChange }) {
  const dayIdx = day.getDay();
  const completed = new Set(Array.isArray(completedTasks) ? completedTasks : []);

  return (
    <div>
      {/* Day Selector */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 16 }}>
        {DS.map((label, i) => {
          const isSelected = i === dayIdx;
          const d = new Date(day);
          d.setDate(d.getDate() + (i - dayIdx));
          return (
            <button key={i} onClick={() => onDayChange && onDayChange(d)}
              style={{
                width: 36, height: 36, borderRadius: 18,
                border: isSelected ? '1.5px solid ' + P.gW : '1px solid ' + P.bd,
                background: isSelected ? 'rgba(232,213,183,0.08)' : 'transparent',
                color: isSelected ? P.gW : P.txD,
                fontSize: 12, fontWeight: isSelected ? 700 : 500,
                cursor: 'pointer', fontFamily: FN,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
              {label}
            </button>
          );
        })}
      </div>

      {/* Goal Progress Summary */}
      {goals.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, overflowX: 'auto', padding: '4px 0' }}>
          {goals.map(g => (
            <div key={g.id} style={{
              minWidth: 120, padding: '8px 12px', borderRadius: 10,
              background: 'rgba(232,213,183,0.03)', border: '1px solid ' + P.bd,
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: P.txS, whiteSpace: 'nowrap' }}>{g.title}</div>
              <div style={{ marginTop: 4, height: 3, borderRadius: 2, background: 'rgba(232,213,183,0.08)' }}>
                <div style={{
                  height: '100%', borderRadius: 2,
                  background: 'linear-gradient(90deg, ' + P.gW + ', ' + P.ok + ')',
                  width: (g.progress?.percent || 0) + '%',
                  transition: 'width 0.3s ease',
                }} />
              </div>
              <div style={{ fontSize: 9, color: P.txD, marginTop: 3 }}>
                {g.progress?.percent || 0}% {'\u00B7'} {g.progress?.trend || 'on_track'}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Routine Items */}
      {routine.scheduled.length === 0 ? (
        <div style={{ ...s.card, padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>{'\u{1F3AF}'}</div>
          <div style={{ fontSize: 13, color: P.txM }}>No tasks yet</div>
          <div style={{ fontSize: 11, color: P.txD, marginTop: 4 }}>Add a goal to activate your routine</div>
        </div>
      ) : (
        <div style={{ ...s.card, padding: 0, overflow: 'hidden' }}>
          {routine.scheduled.map((task, i) => {
            const isDone = completed.has(task.id);
            const catColor = CAT_COLORS[task.category] || P.txD;
            const catIcon = CAT_ICONS[task.category] || '';
            const isRec = task.type === 'recommendation';
            const isAuto = task.type === 'automated';

            return (
              <div key={task.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '10px 14px',
                borderBottom: i < routine.scheduled.length - 1 ? '1px solid ' + P.bd : 'none',
                opacity: isDone ? 0.5 : isRec ? 0.7 : 1,
                background: isDone ? 'rgba(52,211,153,0.02)' : 'transparent',
              }}>
                {/* Checkbox */}
                <button onClick={() => !isAuto && onCheckTask && onCheckTask(task.id)}
                  style={{
                    width: 20, height: 20, borderRadius: 10, flexShrink: 0, marginTop: 1,
                    border: isDone ? 'none' : ('1.5px solid ' + (isAuto ? P.ok : catColor + '44')),
                    background: isDone ? P.ok : isAuto ? P.ok + '22' : 'transparent',
                    cursor: isAuto ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, color: '#fff', fontFamily: FN,
                  }}>
                  {(isDone || isAuto) ? '\u2713' : ''}
                </button>

                {/* Content */}
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
                  </div>
                  {task.subtitle && (
                    <div style={{ fontSize: 10, color: P.txD, marginTop: 2, lineHeight: 1.4 }}>
                      {task.subtitle}
                    </div>
                  )}
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
                      }}>
                        automated
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
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
    </div>
  );
}
