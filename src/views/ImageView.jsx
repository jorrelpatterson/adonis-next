// src/views/ImageView.jsx
import React from 'react';
import { P, FN, FD } from '../design/theme';
import { s } from '../design/styles';
import { H } from '../design/components';
import ProgressBar from '../design/ProgressBar';
import {
  SKIN_AM,
  SKIN_PM,
  SKIN_AM_BASE,
  SKIN_PM_BASE,
} from '../protocols/image/skincare/data.js';

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Quick abbreviations for the 7-day rotation strip
function abbreviate(active) {
  if (!active) return '—';
  if (active.includes('Vitamin C')) return 'Vit C';
  if (active.includes('Niacinamide')) return 'Niac';
  if (active.includes('Retinol')) return 'Retin';
  if (active.includes('Antioxidant')) return 'Antiox';
  if (active.includes('Exfoliating')) return 'Exfol';
  if (active.includes('Hydrating Mask')) return 'Mask';
  if (active.includes('Hydrating Serum')) return 'Hydr';
  return active.slice(0, 5);
}

const GROOMING_SEED = [
  { id: 'haircut',   name: 'Haircut',          icon: '✂️',  cadence: 21 },
  { id: 'beard',     name: 'Beard trim',       icon: '\u{1F9D4}',     cadence: 7  },
  { id: 'nails',     name: 'Nails',            icon: '\u{1F485}',     cadence: 10 },
  { id: 'brows',     name: 'Eyebrow shape',    icon: '\u{1F441}️', cadence: 14 },
  { id: 'body',      name: 'Body hair',        icon: '\u{1FA92}',     cadence: 14 },
  { id: 'teeth',     name: 'Teeth whitening',  icon: '\u{1F9B7}',     cadence: 30 },
];

// Days between two ISO date strings (YYYY-MM-DD). Returns null if `from` is falsy.
function daysSince(fromISO, todayISO) {
  if (!fromISO) return null;
  const a = new Date(fromISO + 'T00:00:00');
  const b = new Date(todayISO + 'T00:00:00');
  const diff = Math.round((b - a) / (1000 * 60 * 60 * 24));
  return diff < 0 ? 0 : diff;
}

const WARDROBE = [
  { id: 'shirts',     name: 'Shirts',      have: 8, target: 8 },
  { id: 'pants',      name: 'Pants',       have: 5, target: 5 },
  { id: 'outerwear',  name: 'Outerwear',   have: 3, target: 4 },
  { id: 'shoes',      name: 'Shoes',       have: 4, target: 5 },
  { id: 'accessories',name: 'Accessories', have: 2, target: 5 },
  { id: 'layers',     name: 'Layers',      have: 1, target: 3 },
];

function ProductRow({ label, isToday, checked, onToggle }) {
  return (
    <div
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 4px', borderBottom: '1px solid ' + P.bd,
        cursor: 'pointer', opacity: checked ? 0.45 : 1,
        transition: 'opacity 0.25s ease',
      }}>
      <div style={{
        width: 18, height: 18, borderRadius: 9, flexShrink: 0,
        border: checked ? 'none' : '1.5px solid ' + P.gW + '55',
        background: checked ? P.ok : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, color: '#0A0B0E', fontWeight: 800,
      }}>
        {checked ? '✓' : ''}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12.5, color: checked ? P.txD : P.txS, fontWeight: 500,
          textDecoration: checked ? 'line-through' : 'none',
        }}>
          {label}
        </div>
      </div>
      {isToday && (
        <span style={{
          fontSize: 8, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase',
          color: P.gW, padding: '3px 8px', borderRadius: 100,
          border: '1px solid ' + P.gW + '44', background: 'rgba(232,213,183,0.06)',
          flexShrink: 0,
        }}>
          {'✨ Today'}
        </span>
      )}
    </div>
  );
}

export default function ImageView({
  profile,
  protocolStates,
  setProtocolState,
  domainGoals = [],
  domainTasks = [],
  completedTasks = [],
  onCheckTask,
  onAddGoal,
}) {
  const today = new Date();
  const dayIdx = today.getDay();
  const todayISO = today.toISOString().slice(0, 10);

  const skin = protocolStates?.skincare || {};
  const hasSkinProfile = !!(skin.skinType || (skin.concerns && skin.concerns.length));

  // Persisted: per-item ISO date when last marked done, e.g. { haircut: '2026-04-25' }
  const groomingLastDone = skin.groomingLastDone || {};

  // Persisted: array of date-keyed skincare check keys, e.g. ['2026-04-29:am:0', '2026-04-29:pm:1']
  const skincareDoneDates = skin.skincareDoneDates || [];

  const isSkincareDone = (period, idx) =>
    skincareDoneDates.includes(todayISO + ':' + period + ':' + idx);

  const toggleSkincare = (period, idx) => {
    if (!setProtocolState) return;
    const key = todayISO + ':' + period + ':' + idx;
    const next = skincareDoneDates.includes(key)
      ? skincareDoneDates.filter((k) => k !== key)
      : [...skincareDoneDates, key];
    setProtocolState('skincare', { skincareDoneDates: next });
  };

  const markGroomingDone = (id) => {
    if (!setProtocolState) return;
    setProtocolState('skincare', {
      groomingLastDone: { ...groomingLastDone, [id]: todayISO },
    });
  };

  const amActive = SKIN_AM[dayIdx];
  const pmActive = SKIN_PM[dayIdx];

  const wardrobeHave = WARDROBE.reduce((sum, w) => sum + w.have, 0);
  const wardrobeTotal = WARDROBE.reduce((sum, w) => sum + w.target, 0);

  return (
    <div>
      <H t={'✨ Image'} sub={'Skincare, grooming, wardrobe, presence'} />

      {/* === 1. Today's Skincare Routine === */}
      <div style={{ ...s.card, padding: 16, marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <div style={{ ...s.lab, marginBottom: 2 }}>Today's Skincare</div>
            <div style={{ fontFamily: FD, fontSize: 18, fontWeight: 300, color: P.tx }}>
              {DAY_NAMES[dayIdx]}
            </div>
          </div>
          <span style={{ fontSize: 22 }}>{'✨'}</span>
        </div>

        {/* AM */}
        <div style={{
          padding: 14, borderRadius: 12, marginBottom: 10,
          background: 'rgba(232,213,183,0.04)',
          border: '1px solid ' + P.bd,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 14 }}>{'☀️'}</span>
            <div style={{
              fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase',
              color: P.gW,
            }}>
              AM Routine
            </div>
          </div>
          {SKIN_AM_BASE.map((step, i) => {
            const id = 'am-base-' + i;
            return (
              <ProductRow
                key={id}
                label={step}
                isToday={false}
                checked={isSkincareDone('am', i)}
                onToggle={() => toggleSkincare('am', i)}
              />
            );
          })}
          {amActive && (
            <ProductRow
              key="am-active"
              label={amActive}
              isToday
              checked={isSkincareDone('am', SKIN_AM_BASE.length)}
              onToggle={() => toggleSkincare('am', SKIN_AM_BASE.length)}
            />
          )}
          {!amActive && (
            <div style={{ fontSize: 10, color: P.txD, fontStyle: 'italic', marginTop: 8, padding: '4px 4px' }}>
              Rest day — no AM active
            </div>
          )}
        </div>

        {/* PM */}
        <div style={{
          padding: 14, borderRadius: 12,
          background: 'rgba(168,188,208,0.04)',
          border: '1px solid ' + P.bd,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 14 }}>{'\u{1F319}'}</span>
            <div style={{
              fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase',
              color: P.gI,
            }}>
              PM Routine
            </div>
          </div>
          {SKIN_PM_BASE.map((step, i) => {
            const id = 'pm-base-' + i;
            return (
              <ProductRow
                key={id}
                label={step}
                isToday={false}
                checked={isSkincareDone('pm', i)}
                onToggle={() => toggleSkincare('pm', i)}
              />
            );
          })}
          {pmActive && (
            <ProductRow
              key="pm-active"
              label={pmActive}
              isToday
              checked={isSkincareDone('pm', SKIN_PM_BASE.length)}
              onToggle={() => toggleSkincare('pm', SKIN_PM_BASE.length)}
            />
          )}
        </div>
      </div>

      {/* === 2. 7-Day Rotation Calendar === */}
      <div style={{ ...s.card, padding: 16, marginBottom: 12 }}>
        <div style={{ ...s.lab, marginBottom: 12 }}>7-Day AM Rotation</div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 6, textAlign: 'center',
        }}>
          {DAY_LETTERS.map((letter, i) => {
            const isToday = i === dayIdx;
            const active = SKIN_AM[i];
            return (
              <div key={i} style={{
                padding: '10px 4px',
                borderRadius: 10,
                background: isToday
                  ? 'linear-gradient(180deg, rgba(232,213,183,0.18), rgba(232,213,183,0.04))'
                  : 'rgba(232,213,183,0.02)',
                border: isToday ? '1px solid ' + P.gW + '66' : '1px solid ' + P.bd,
                boxShadow: isToday ? '0 0 18px rgba(232,213,183,0.2)' : 'none',
                transition: 'all 0.3s ease',
              }}>
                <div style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: 1,
                  color: isToday ? P.gW : P.txD,
                  marginBottom: 6,
                }}>
                  {letter}
                </div>
                <div style={{
                  width: 6, height: 6, borderRadius: 3, margin: '0 auto 6px',
                  background: active ? P.gW : P.txD + '40',
                  boxShadow: active && isToday ? '0 0 8px ' + P.gW : 'none',
                }} />
                <div style={{
                  fontSize: 9, fontWeight: 600,
                  color: isToday ? P.tx : P.txM,
                  letterSpacing: 0.3,
                }}>
                  {abbreviate(active)}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{
          marginTop: 10, fontSize: 10, color: P.txD, lineHeight: 1.5,
          paddingTop: 10, borderTop: '1px solid ' + P.bd,
        }}>
          Vit C alternates with niacinamide. Retinol nights spaced 48 hrs. Sunday rests AM.
        </div>
      </div>

      {/* === 3. Skin Profile === */}
      <div style={{ ...s.card, padding: 16, marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ ...s.lab, marginBottom: 0 }}>Skin Profile</div>
          <span style={{ fontSize: 16 }}>{'\u{1F9F4}'}</span>
        </div>
        {hasSkinProfile ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid ' + P.bd }}>
              <div style={{ fontSize: 12, color: P.txM }}>Skin type</div>
              <div style={{ fontSize: 12, color: P.txS, fontWeight: 600, textTransform: 'capitalize' }}>
                {skin.skinType || '—'}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', gap: 16 }}>
              <div style={{ fontSize: 12, color: P.txM, flexShrink: 0 }}>Concerns</div>
              <div style={{ fontSize: 12, color: P.txS, fontWeight: 500, textAlign: 'right' }}>
                {(skin.concerns && skin.concerns.length)
                  ? skin.concerns.map((c) => String(c).replace(/_/g, ' ')).join(', ')
                  : '—'}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: P.txM, lineHeight: 1.6 }}>
            Take the Image quiz to set your skin profile.
          </div>
        )}
      </div>

      {/* === 4. Grooming === */}
      <div style={{ ...s.card, padding: 16, marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ ...s.lab, marginBottom: 0 }}>Grooming</div>
          <span style={{ fontSize: 16 }}>{'\u{1F485}'}</span>
        </div>
        {GROOMING_SEED.map((item, i) => {
          const lastISO = groomingLastDone[item.id];
          const days = daysSince(lastISO, todayISO);
          const ratio = days === null ? 1 : Math.min(1, days / item.cadence);
          let barColor = P.ok;
          if (ratio > 0.8) barColor = P.err;
          else if (ratio > 0.5) barColor = P.warn;
          let lastLabel;
          if (days === null) lastLabel = 'never';
          else if (days === 0) lastLabel = 'today';
          else if (days === 1) lastLabel = '1 day ago';
          else lastLabel = days + ' days ago';
          return (
            <div key={item.id} style={{
              padding: '10px 0', borderBottom: i < GROOMING_SEED.length - 1 ? '1px solid ' + P.bd : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 16 }}>{item.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: P.txS, fontWeight: 600 }}>{item.name}</div>
                    <div style={{ fontSize: 10, color: P.txD, marginTop: 2 }}>
                      Every {item.cadence} days {'·'} Last: {lastLabel}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => markGroomingDone(item.id)}
                  style={{
                    fontFamily: FN, fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
                    color: P.gW, background: 'rgba(232,213,183,0.04)',
                    border: '1px solid ' + P.gW + '33', borderRadius: 8,
                    padding: '6px 10px', cursor: 'pointer', flexShrink: 0,
                  }}>
                  Mark done
                </button>
              </div>
              <div style={{ marginTop: 8, height: 3, borderRadius: 2, background: 'rgba(232,213,183,0.06)' }}>
                <div style={{
                  height: '100%', borderRadius: 2,
                  width: (ratio * 100) + '%',
                  background: barColor,
                  transition: 'width 0.3s ease, background 0.3s ease',
                }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* === 5. Wardrobe Capsule === */}
      <div style={{ ...s.card, padding: 16, marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <div style={{ ...s.lab, marginBottom: 2 }}>Wardrobe Capsule</div>
            <div style={{ fontSize: 11, color: P.txM }}>
              {wardrobeHave}/{wardrobeTotal} essentials covered
            </div>
          </div>
          <span style={{ fontSize: 16 }}>{'\u{1F455}'}</span>
        </div>

        {/* Overall progress */}
        <div style={{ height: 4, borderRadius: 2, background: 'rgba(232,213,183,0.08)', marginBottom: 14 }}>
          <div style={{
            height: '100%', borderRadius: 2,
            width: ((wardrobeHave / wardrobeTotal) * 100) + '%',
            background: 'linear-gradient(90deg, ' + P.gW + ', ' + P.ok + ')',
          }} />
        </div>

        {WARDROBE.map((cat, i) => {
          const complete = cat.have >= cat.target;
          return (
            <div key={cat.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 0',
              borderBottom: i < WARDROBE.length - 1 ? '1px solid ' + P.bd : 'none',
            }}>
              <div style={{ fontSize: 12.5, color: P.txS, fontWeight: 500 }}>{cat.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  fontFamily: FN, fontSize: 12, fontWeight: 700,
                  color: complete ? P.ok : P.gW,
                }}>
                  {cat.have}/{cat.target}
                </span>
                {complete && (
                  <span style={{ fontSize: 11, color: P.ok }}>{'✓'}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* === 6. Goals === */}
      {domainGoals.length > 0 ? (
        <div style={{ ...s.card, padding: 14, marginBottom: 12 }}>
          <div style={{ ...s.lab }}>Goals</div>
          {domainGoals.map((g) => (
            <div key={g.id} style={{ padding: '10px 0', borderBottom: '1px solid ' + P.bd }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: P.txS }}>{g.title}</div>
                <div style={{ fontSize: 11, color: P.gW, fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{g.progress?.percent || 0}%</div>
              </div>
              <div style={{ marginTop: 8 }}>
                <ProgressBar
                  value={g.progress?.percent || 0}
                  max={100}
                  color={(g.progress?.percent || 0) >= 75 ? P.ok : P.gW}
                  height={4}
                />
              </div>
              <div style={{ fontSize: 10, color: P.txD, marginTop: 6 }}>
                {g.activeProtocols?.length || 0} protocols active
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ ...s.card, padding: 20, textAlign: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: P.txM }}>No Image goals yet</div>
          {onAddGoal && (
            <button
              onClick={() => onAddGoal('image')}
              style={{ ...s.btn, ...s.pri, marginTop: 10, padding: '8px 20px', fontSize: 12 }}>
              + Add Image Goal
            </button>
          )}
        </div>
      )}

      {/* === 7. Today's Tasks === */}
      {domainTasks.length > 0 && (
        <div style={{ ...s.card, padding: 14, marginBottom: 12 }}>
          <div style={{ ...s.lab }}>Today's Tasks</div>
          {domainTasks.map((task) => {
            const isDone = completedTasks.includes(task.id);
            return (
              <div
                key={task.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 0', borderBottom: '1px solid ' + P.bd,
                  opacity: isDone ? 0.5 : 1,
                }}>
                <button
                  onClick={() => onCheckTask && onCheckTask(task.id)}
                  style={{
                    width: 20, height: 20, borderRadius: 10,
                    border: isDone ? 'none' : '1.5px solid ' + P.gW + '44',
                    background: isDone ? P.ok : 'transparent',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, color: '#0A0B0E', fontFamily: FN, flexShrink: 0, fontWeight: 800,
                  }}>
                  {isDone ? '✓' : ''}
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, color: isDone ? P.txD : P.txS,
                    textDecoration: isDone ? 'line-through' : 'none',
                  }}>
                    {task.title}
                  </div>
                  {task.subtitle && (
                    <div style={{ fontSize: 10, color: P.txD }}>{task.subtitle}</div>
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
