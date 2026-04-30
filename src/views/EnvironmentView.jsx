// src/views/EnvironmentView.jsx
// Environment domain tab — 36-item daily checklist (6 areas x 6 items),
// progress ring, living-situation summary, goals, today's tasks.
// Persists today's checks via protocolStates.environment.checklistByDate;
// auto-resets each morning since `today` is computed per render.
import React, { useMemo } from 'react';
import { P, FN, FM, grad } from '../design/theme';
import { s } from '../design/styles';
import { H } from '../design/components';

// 6 areas, 6 items each = 36 total. Order matches the spec.
// `priorityKey` aligns with onboarding priorityArea values
// (sleep, workspace, air, digital — light & cleanliness have no direct match).
const CHECKLIST = [
  {
    key: 'sleep',
    title: 'Sleep Environment',
    priorityKey: 'sleep',
    items: [
      'Bedroom under 67°F',
      'Blackout curtains drawn',
      'No screens 1 hour before bed',
      'White noise / silence',
      'Bed reserved for sleep',
      'Mattress under 8 years old',
    ],
  },
  {
    key: 'workspace',
    title: 'Workspace',
    priorityKey: 'workspace',
    items: [
      'Monitor at eye level',
      'Chair height correct (90° elbow)',
      'Standing desk used 1+ hr today',
      'Plant or natural element nearby',
      'Desk decluttered',
      'Wrist support neutral',
    ],
  },
  {
    key: 'air',
    title: 'Air Quality',
    priorityKey: 'air',
    items: [
      'HEPA air purifier on',
      'Plants in workspace',
      'Window opened 10+ min today',
      'No candles/incense indoors',
      'CO2 monitor checked',
      'Air filter <90 days old',
    ],
  },
  {
    key: 'light',
    title: 'Light Optimization',
    priorityKey: null,
    items: [
      'Sunlight exposure within 30 min of waking',
      'Bright light during work hours',
      'Warm light after sunset',
      'Blue blockers after 8pm',
      'Salt lamp / amber bulb evening',
      'Outdoor walk in afternoon',
    ],
  },
  {
    key: 'digital',
    title: 'Digital Environment',
    priorityKey: 'digital',
    items: [
      'Phone face-down during deep work',
      'Notifications silenced',
      'Social media app screen-time <60 min',
      'Inbox-zero attempted',
      'One-tab focus practiced',
      'Unsubscribed from at least one feed',
    ],
  },
  {
    key: 'cleanliness',
    title: 'Cleanliness',
    priorityKey: null,
    items: [
      'Bed made',
      'Dishes done',
      'Floors clear',
      'Surfaces wiped',
      'Trash emptied',
      'One thing decluttered',
    ],
  },
];

const TOTAL_ITEMS = CHECKLIST.reduce((acc, a) => acc + a.items.length, 0);

// Pretty labels for the living-situation card.
const LIVING_LABELS = {
  apartment: 'Apartment',
  house: 'House',
  condo: 'Condo',
  shared: 'Shared housing',
  other: 'Other',
};
const PRIORITY_LABELS = {
  sleep: 'Sleep environment',
  workspace: 'Workspace setup',
  air: 'Air quality',
  digital: 'Digital wellness',
  all: 'All areas',
};

const sectionGap = { marginBottom: 12 };
const labStyle = { ...s.lab };

// SVG progress ring — circumference math via stroke-dasharray.
function ProgressRing({ checked, total }) {
  const size = 96;
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = total === 0 ? 0 : checked / total;
  const offset = c * (1 - pct);
  const pctLabel = Math.round(pct * 100);

  return (
    <div style={{
      position: 'relative', width: size, height: size, flexShrink: 0,
    }}>
      <svg width={size} height={size} style={{ display: 'block' }}>
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke="rgba(232,213,183,0.08)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={P.gW}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.16,1,0.3,1)' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          fontFamily: FM, fontSize: 20, fontWeight: 700, color: P.gW, lineHeight: 1,
        }}>
          {pctLabel}%
        </div>
        <div style={{
          fontSize: 8, fontWeight: 700, color: P.txD,
          letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 4,
        }}>
          {checked}/{total}
        </div>
      </div>
    </div>
  );
}

// One row inside an area — toggle pill + item label.
function ChecklistRow({ id, label, checked, onToggle, last }) {
  return (
    <div
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '7px 0',
        borderBottom: last ? 'none' : '1px solid ' + P.bd,
        cursor: 'pointer',
      }}
    >
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        aria-pressed={checked}
        style={{
          width: 18, height: 18, borderRadius: 9,
          border: checked ? 'none' : '1.5px solid ' + P.gW + '44',
          background: checked ? P.ok : 'transparent',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9, color: '#fff', fontFamily: FN, flexShrink: 0,
          transition: 'all .25s cubic-bezier(0.34,1.56,0.64,1)',
        }}
      >
        {checked ? '✓' : ''}
      </button>
      <div style={{
        fontSize: 12,
        color: checked ? P.txD : P.txS,
        textDecoration: checked ? 'line-through' : 'none',
        lineHeight: 1.4,
        letterSpacing: 0.2,
        transition: 'color .2s',
      }}>
        {label}
      </div>
    </div>
  );
}

export default function EnvironmentView({
  profile,
  protocolStates = {},
  setProtocolState,
  domainGoals = [],
  domainTasks = [],
  completedTasks = [],
  onCheckTask,
  onAddGoal,
}) {
  const env = protocolStates.environment || {};
  const livingSituation = env.livingSituation;
  const priorityArea = env.priorityArea;
  const hasLiving = !!livingSituation;

  // Persisted checklist state. Keyed by ISO date so it auto-resets each morning.
  // Per-date map: `${areaKey}:${itemIdx}` -> true/false.
  const checklistByDate = env.checklistByDate || {};
  const today = new Date().toISOString().slice(0, 10);
  const checked = checklistByDate[today] || {};

  const toggle = (areaKey, idx) => {
    const k = `${areaKey}:${idx}`;
    const newToday = { ...checked, [k]: !checked[k] };

    // Trim to today + last 7 days to avoid storage bloat.
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    const trimmed = {};
    for (const [date, checks] of Object.entries(checklistByDate)) {
      if (date >= cutoffStr) trimmed[date] = checks;
    }
    trimmed[today] = newToday;

    if (setProtocolState) {
      setProtocolState('environment', { checklistByDate: trimmed });
    }
  };

  const checkedCount = useMemo(
    () => Object.values(checked).filter(Boolean).length,
    [checked]
  );

  // Reorder areas so the user's priority area sits at the top of the list.
  // `all` (or unset / no-direct-match) keeps default order.
  const orderedAreas = useMemo(() => {
    if (!priorityArea || priorityArea === 'all') return CHECKLIST;
    const idx = CHECKLIST.findIndex((a) => a.priorityKey === priorityArea);
    if (idx === -1) return CHECKLIST;
    return [CHECKLIST[idx], ...CHECKLIST.filter((_, i) => i !== idx)];
  }, [priorityArea]);

  return (
    <div>
      <H t={'\u{1F3E0} Environment'} sub="Space, ergonomics, digital life" />

      {/* Daily Checklist — centerpiece w/ progress ring */}
      <div style={{ ...s.card, padding: 18, ...sectionGap }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16,
          paddingBottom: 14, marginBottom: 10,
          borderBottom: '1px solid ' + P.bd,
        }}>
          <ProgressRing checked={checkedCount} total={TOTAL_ITEMS} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={labStyle}>Daily Checklist</div>
            <div style={{
              fontSize: 13, color: P.txS, lineHeight: 1.4, fontWeight: 500,
            }}>
              36 micro-habits across 6 areas.
            </div>
            <div style={{
              fontSize: 10, color: P.txD, marginTop: 4, letterSpacing: 0.4,
            }}>
              {checkedCount === TOTAL_ITEMS
                ? 'Perfect day. Environment locked in.'
                : checkedCount === 0
                  ? 'Tap a row to mark complete.'
                  : `${TOTAL_ITEMS - checkedCount} to go.`}
            </div>
          </div>
        </div>

        {orderedAreas.map((area) => {
          const isPriority =
            priorityArea && priorityArea !== 'all' &&
            area.priorityKey === priorityArea;
          const areaChecked = area.items.reduce(
            (acc, _, i) => acc + (checked[`${area.key}:${i}`] ? 1 : 0),
            0
          );
          return (
            <div
              key={area.key}
              style={{
                marginTop: 12,
                padding: isPriority ? '10px 12px' : 0,
                borderRadius: isPriority ? 10 : 0,
                border: isPriority ? '1px solid ' + P.gW + '33' : 'none',
                background: isPriority ? 'rgba(232,213,183,0.04)' : 'transparent',
              }}
            >
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 4,
              }}>
                <div style={labStyle}>
                  {area.title}
                  {isPriority && (
                    <span style={{
                      marginLeft: 8, fontSize: 8, fontWeight: 700,
                      color: P.gW, letterSpacing: 1.5,
                    }}>
                      {'★'} PRIORITY
                    </span>
                  )}
                </div>
                <span style={{
                  fontFamily: FM, fontSize: 9, fontWeight: 700,
                  color: areaChecked === area.items.length ? P.ok : P.txD,
                  letterSpacing: 1,
                }}>
                  {areaChecked}/{area.items.length}
                </span>
              </div>
              {area.items.map((item, i) => (
                <ChecklistRow
                  key={i}
                  id={`${area.key}:${i}`}
                  label={item}
                  checked={!!checked[`${area.key}:${i}`]}
                  onToggle={() => toggle(area.key, i)}
                  last={i === area.items.length - 1}
                />
              ))}
            </div>
          );
        })}
      </div>

      {/* Living Situation */}
      {hasLiving && (
        <div style={{ ...s.card, padding: 16, ...sectionGap }}>
          <div style={labStyle}>Living Situation</div>
          <div style={{
            display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{
                fontSize: 11, color: P.txD, letterSpacing: 0.4,
              }}>
                Setup
              </div>
              <div style={{
                fontSize: 16, fontWeight: 600, color: P.txS, marginTop: 2,
              }}>
                {LIVING_LABELS[livingSituation] || livingSituation}
              </div>
            </div>
            {priorityArea && (
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontSize: 11, color: P.txD, letterSpacing: 0.4,
                }}>
                  Focus
                </div>
                <div style={{
                  fontFamily: FM, fontSize: 13, fontWeight: 700,
                  color: P.gW, marginTop: 2, textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}>
                  {PRIORITY_LABELS[priorityArea] || priorityArea}
                </div>
              </div>
            )}
          </div>
          {priorityArea && priorityArea !== 'all' && (
            <div style={{
              fontSize: 10, color: P.txD, marginTop: 10, paddingTop: 8,
              borderTop: '1px solid ' + P.bd, letterSpacing: 0.4,
            }}>
              Priority area boosted to top of checklist.
            </div>
          )}
        </div>
      )}

      {/* Goals */}
      {domainGoals.length > 0 ? (
        <div style={{ ...s.card, padding: 14, ...sectionGap }}>
          <div style={labStyle}>Goals</div>
          {domainGoals.map((g) => (
            <div key={g.id} style={{ padding: '8px 0', borderBottom: '1px solid ' + P.bd }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: P.txS }}>{g.title}</div>
                <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: P.gW }}>
                  {g.progress?.percent || 0}%
                </div>
              </div>
              <div style={{ marginTop: 4, height: 3, borderRadius: 2, background: 'rgba(232,213,183,0.08)' }}>
                <div style={{
                  height: '100%', borderRadius: 2,
                  background: 'linear-gradient(90deg, ' + P.gW + ', ' + P.ok + ')',
                  width: (g.progress?.percent || 0) + '%',
                  transition: 'width .5s',
                }} />
              </div>
              <div style={{ fontSize: 10, color: P.txD, marginTop: 3 }}>
                {g.activeProtocols?.length || 0} protocols active
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ ...s.card, padding: 20, textAlign: 'center', ...sectionGap }}>
          <div style={{ fontSize: 13, color: P.txM }}>No environment goals yet</div>
          <button
            onClick={onAddGoal}
            style={{ ...s.btn, ...s.pri, marginTop: 10, padding: '8px 20px', fontSize: 12 }}
          >
            + Add Goal
          </button>
        </div>
      )}

      {/* Today's Tasks */}
      {domainTasks.length > 0 && (
        <div style={{ ...s.card, padding: 14, ...sectionGap }}>
          <div style={labStyle}>Today's Tasks</div>
          {domainTasks.map((task, idx) => {
            const isDone = completedTasks.includes(task.id);
            return (
              <div
                key={task.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 0',
                  borderBottom: idx < domainTasks.length - 1 ? '1px solid ' + P.bd : 'none',
                  opacity: isDone ? 0.5 : 1,
                }}
              >
                <button
                  onClick={() => onCheckTask && onCheckTask(task.id)}
                  style={{
                    width: 20, height: 20, borderRadius: 10,
                    border: isDone ? 'none' : '1.5px solid ' + P.gW + '44',
                    background: isDone ? P.ok : 'transparent',
                    cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, color: '#fff', fontFamily: FN, flexShrink: 0,
                  }}
                >
                  {isDone ? '✓' : ''}
                </button>
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontSize: 13,
                    color: isDone ? P.txD : P.txS,
                    textDecoration: isDone ? 'line-through' : 'none',
                  }}>
                    {task.title}
                  </div>
                  {(task.subtitle || task.sub) && (
                    <div style={{ fontSize: 10, color: P.txD, marginTop: 2 }}>
                      {task.subtitle || task.sub}
                    </div>
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
