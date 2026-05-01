import React, { useState, useMemo } from 'react';
import { P, FN, FM } from '../../design/theme';
import { s } from '../../design/styles';
import { calcBMR, calcTDEE, calcMacros, calcCalorieTarget, sumDayMeals } from '../../protocols/body/nutrition/math';
import { computeAdaptive } from '../../protocols/body/nutrition/adaptive-calories';

// Re-exports for tests + backwards compat with existing imports.
export { calcBMR, calcTDEE, calcMacros, calcCalorieTarget, sumDayMeals };

// Looks at yesterday's logs.food vs target. Returns { over, under } cal deltas.
// over > 0 means yesterday exceeded target; under > 0 means undershot.
export function getYesterdayDelta(logs, profile, goal) {
  const food = (logs && logs.food) || {};
  const target = calcCalorieTarget(profile, goal);
  if (target <= 0) return { over: 0, under: 0 };
  const today = new Date();
  const y = new Date(today);
  y.setDate(today.getDate() - 1);
  const yKey = y.toISOString().slice(0, 10);
  const meals = food[yKey];
  if (!Array.isArray(meals) || !meals.length) return { over: 0, under: 0 };
  const totals = sumDayMeals(meals);
  const diff = totals.cal - target;
  if (diff > 0) return { over: diff, under: 0 };
  if (diff < 0) return { over: 0, under: -diff };
  return { over: 0, under: 0 };
}

// ─── Common Foods Database ─────────────────────────────────────────────────

const COMMON_FOODS = [
  { name: 'Chicken Breast',  serving: '6oz',     cal: 280, p: 53, c: 0,  f: 6  },
  { name: 'Eggs',            serving: '2 large', cal: 140, p: 12, c: 1,  f: 10 },
  { name: 'White Rice',      serving: '1 cup',   cal: 205, p: 4,  c: 45, f: 0  },
  { name: 'Salmon',          serving: '5oz',     cal: 350, p: 36, c: 0,  f: 22 },
  { name: 'Sweet Potato',    serving: '1 med',   cal: 103, p: 2,  c: 24, f: 0  },
  { name: 'Greek Yogurt',    serving: '1 cup',   cal: 130, p: 22, c: 8,  f: 0  },
  { name: 'Whey Shake',      serving: '1 scoop', cal: 120, p: 25, c: 3,  f: 1  },
  { name: 'Avocado',         serving: '1/2',     cal: 120, p: 1,  c: 6,  f: 11 },
  { name: 'Almonds',         serving: '1oz',     cal: 162, p: 6,  c: 6,  f: 14 },
  { name: 'Oatmeal',         serving: '1 cup',   cal: 150, p: 5,  c: 27, f: 3  },
  { name: 'Banana',          serving: '1 med',   cal: 105, p: 1,  c: 27, f: 0  },
  { name: 'Olive Oil',       serving: '1 tbsp',  cal: 120, p: 0,  c: 0,  f: 14 },
  { name: 'Broccoli',        serving: '1 cup',   cal: 55,  p: 4,  c: 11, f: 1  },
  { name: 'Ground Beef 85%', serving: '5oz',     cal: 310, p: 35, c: 0,  f: 20 },
];

// ─── Component ─────────────────────────────────────────────────────────────

const MACRO_COLORS = {
  p: P.gI,    // protein -> blue
  c: P.gW,    // carbs -> warm gold
  f: P.warn,  // fat -> orange/yellow
};

function MacroCell({ label, grams, pct, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: FM, fontSize: 18, fontWeight: 700, color }}>
        {grams}<span style={{ fontSize: 10, color: P.txD, marginLeft: 1 }}>g</span>
      </div>
      <div style={{ ...s.lab, marginBottom: 0, marginTop: 2 }}>
        {label} · {pct}%
      </div>
    </div>
  );
}

export default function FoodLogger({ profile, protocolStates, logs, log }) {
  const goal = profile?.primary || protocolStates?.workout?.primary || 'Wellness';
  const todayKey = new Date().toISOString().slice(0, 10);

  // Adaptive target — adjusts based on actual weight progress vs deadline
  const adaptive = useMemo(
    () => computeAdaptive(profile, logs?.weight, todayKey, goal),
    [profile, logs?.weight, todayKey, goal]
  );

  const target = adaptive.adaptedTarget;
  const macros = useMemo(() => calcMacros(target, goal), [target, goal]);

  const food = (logs && logs.food) || {};
  const todaysMeals = Array.isArray(food[todayKey]) ? food[todayKey] : [];
  const totals = useMemo(() => sumDayMeals(todaysMeals), [todaysMeals]);

  const yDelta = useMemo(() => getYesterdayDelta(logs, profile, goal), [logs, profile, goal]);
  const paceMsg = (() => {
    if (yDelta.over > 0)  return `Yesterday +${yDelta.over} over → today -${Math.min(yDelta.over, 200)}`;
    if (yDelta.under > 200) return `Yesterday -${yDelta.under} under → eat your full target today`;
    return null;
  })();

  // Macro %s for grid display
  const totalMacroCal = (macros.protein * 4) + (macros.carbs * 4) + (macros.fat * 9);
  const pctP = totalMacroCal > 0 ? Math.round((macros.protein * 4 / totalMacroCal) * 100) : 0;
  const pctC = totalMacroCal > 0 ? Math.round((macros.carbs   * 4 / totalMacroCal) * 100) : 0;
  const pctF = totalMacroCal > 0 ? Math.round((macros.fat     * 9 / totalMacroCal) * 100) : 0;

  // Progress bar
  const progPct = target > 0 ? Math.min(100, Math.round((totals.cal / target) * 100)) : 0;
  const progColor = (() => {
    if (target <= 0) return P.txD;
    const ratio = totals.cal / target;
    if (ratio > 1.05)  return P.err;
    if (ratio > 0.85)  return P.warn;
    return P.ok;
  })();

  const burnGap = target > 0 && totals.cal > target ? totals.cal - target : 0;

  // Quick add state
  const [search, setSearch] = useState('');
  const [custom, setCustom] = useState({ name: '', cal: '', p: '', c: '', f: '' });

  const filteredFoods = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return COMMON_FOODS;
    return COMMON_FOODS.filter(f => f.name.toLowerCase().includes(q));
  }, [search]);

  const addMeal = (meal) => {
    if (!log) return;
    const time = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const next = [...todaysMeals, { ...meal, time }];
    log('food', { ...food, [todayKey]: next });
  };

  const removeMeal = (idx) => {
    if (!log) return;
    const next = todaysMeals.filter((_, i) => i !== idx);
    log('food', { ...food, [todayKey]: next });
  };

  const handleAddCustom = () => {
    const name = custom.name.trim();
    const cal = Number(custom.cal);
    if (!name || !Number.isFinite(cal) || cal <= 0) return;
    addMeal({
      name,
      cal,
      p: Number(custom.p) || 0,
      c: Number(custom.c) || 0,
      f: Number(custom.f) || 0,
    });
    setCustom({ name: '', cal: '', p: '', c: '', f: '' });
  };

  const noProfileTarget = target <= 0;

  return (
    <div>
      {/* ─── Today's calorie target ─── */}
      <div style={{ ...s.card, padding: 14, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div>
            <div style={{ ...s.lab, marginBottom: 4 }}>Today's Fuel</div>
            <div style={{ fontSize: 10, color: P.txD }}>
              {goal} · {profile?.activity || 'moderate'}
            </div>
          </div>
          <span style={{ fontSize: 22 }}>{'\u{1F37D}️'}</span>
        </div>

        {noProfileTarget ? (
          <div style={{
            padding: '10px 12px', borderRadius: 8,
            background: 'rgba(232,213,183,0.04)',
            fontSize: 11, color: P.txD, lineHeight: 1.5,
          }}>
            Add weight, height, age, and activity in your profile to see your calorie target.
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
              <div style={{ fontFamily: FM, fontSize: 32, fontWeight: 700, color: P.gW, lineHeight: 1 }}>
                {totals.cal}
              </div>
              <div style={{ fontFamily: FM, fontSize: 14, color: P.txD }}>
                / {target} cal
              </div>
            </div>

            {/* Progress bar */}
            <div style={{
              height: 6, borderRadius: 3,
              background: 'rgba(232,213,183,0.06)',
              overflow: 'hidden', marginBottom: 12,
            }}>
              <div style={{
                height: '100%', width: progPct + '%',
                background: progColor,
                transition: 'width 0.3s ease, background 0.3s ease',
              }} />
            </div>

            {/* Macro grid */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 8, padding: '10px 0',
              borderTop: '1px solid ' + P.bd,
            }}>
              <MacroCell label="Protein" grams={macros.protein} pct={pctP} color={MACRO_COLORS.p} />
              <MacroCell label="Carbs"   grams={macros.carbs}   pct={pctC} color={MACRO_COLORS.c} />
              <MacroCell label="Fat"     grams={macros.fat}     pct={pctF} color={MACRO_COLORS.f} />
            </div>

            {paceMsg && (
              <div style={{
                marginTop: 8, padding: '8px 10px', borderRadius: 8,
                background: 'rgba(251,191,36,0.06)',
                border: '1px solid ' + P.warn + '22',
                fontSize: 11, color: P.warn,
              }}>
                {paceMsg}
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── Today's meals ─── */}
      <div style={{ ...s.card, padding: 14, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ ...s.lab, marginBottom: 0 }}>Today's Meals</div>
          {todaysMeals.length > 0 && (
            <div style={{ fontFamily: FM, fontSize: 10, color: P.txD }}>
              {todaysMeals.length} logged
            </div>
          )}
        </div>

        {todaysMeals.length === 0 ? (
          <div style={{
            padding: '14px 0', textAlign: 'center',
            fontSize: 12, color: P.txD,
          }}>
            Tap below to log your first meal of the day
          </div>
        ) : (
          todaysMeals.map((m, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 0',
              borderTop: i === 0 ? 'none' : '1px solid ' + P.bd,
            }}>
              <div style={{ fontFamily: FM, fontSize: 10, color: P.txD, width: 64, flexShrink: 0 }}>
                {m.time || '—'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: P.txS }}>
                  {m.name}
                </div>
                <div style={{ fontFamily: FM, fontSize: 10, color: P.txD, marginTop: 2 }}>
                  <span style={{ color: MACRO_COLORS.p }}>{m.p || 0}P</span>
                  {' · '}
                  <span style={{ color: MACRO_COLORS.c }}>{m.c || 0}C</span>
                  {' · '}
                  <span style={{ color: MACRO_COLORS.f }}>{m.f || 0}F</span>
                </div>
              </div>
              <div style={{ fontFamily: FM, fontSize: 13, fontWeight: 700, color: P.gW, flexShrink: 0 }}>
                {m.cal || 0}
              </div>
              <button
                type="button"
                onClick={() => removeMeal(i)}
                aria-label={'Remove ' + m.name}
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
          ))
        )}
      </div>

      {/* ─── Burn gap nudge ─── */}
      {burnGap > 0 && (
        <div style={{
          ...s.card, padding: 14, marginBottom: 12,
          border: '1px solid ' + P.warn + '44',
          background: 'rgba(251,191,36,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 16 }}>{'⚡'}</span>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: P.warn }}>
              Active Burn Needed
            </div>
          </div>
          <div style={{ fontSize: 13, color: P.txS }}>
            <span style={{ fontFamily: FM, fontWeight: 700, color: P.warn }}>{burnGap} cal</span>
            {' over target — try a 30-min walk + 10 min HIIT'}
          </div>
        </div>
      )}

      {/* ─── Quick add ─── */}
      <div style={{ ...s.card, padding: 14, marginBottom: 12 }}>
        <div style={{ ...s.lab }}>Quick Add</div>

        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search foods…"
          style={{
            ...s.inp, padding: '10px 14px', fontSize: 12,
            minHeight: 36, marginBottom: 10,
          }}
        />

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 6, marginBottom: 14,
        }}>
          {filteredFoods.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', fontSize: 11, color: P.txD, padding: '8px 0', textAlign: 'center' }}>
              No matches — use custom entry below.
            </div>
          ) : (
            filteredFoods.map((f, i) => (
              <button
                key={i}
                type="button"
                onClick={() => addMeal({ name: f.name + ' (' + f.serving + ')', cal: f.cal, p: f.p, c: f.c, f: f.f })}
                style={{
                  ...s.btn, ...s.out,
                  justifyContent: 'space-between', textAlign: 'left',
                  padding: '8px 10px', minHeight: 40,
                  fontSize: 11, fontWeight: 600,
                  width: '100%',
                }}
              >
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: P.txS }}>
                  {f.name}
                </span>
                <span style={{ fontFamily: FM, fontSize: 10, color: P.gW, flexShrink: 0 }}>
                  {f.cal}
                </span>
              </button>
            ))
          )}
        </div>

        {/* Custom entry */}
        <div style={{
          paddingTop: 10, borderTop: '1px solid ' + P.bd,
        }}>
          <div style={{ ...s.lab, marginBottom: 6 }}>Custom Entry</div>
          <input
            type="text"
            value={custom.name}
            onChange={e => setCustom(c => ({ ...c, name: e.target.value }))}
            placeholder="Meal name"
            style={{ ...s.inp, padding: '10px 14px', fontSize: 12, minHeight: 36, marginBottom: 6 }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 8 }}>
            <input
              type="number"
              value={custom.cal}
              onChange={e => setCustom(c => ({ ...c, cal: e.target.value }))}
              placeholder="cal"
              style={{ ...s.inp, padding: '8px 8px', fontSize: 11, minHeight: 36, fontFamily: FM, textAlign: 'center' }}
            />
            <input
              type="number"
              value={custom.p}
              onChange={e => setCustom(c => ({ ...c, p: e.target.value }))}
              placeholder="P"
              style={{ ...s.inp, padding: '8px 8px', fontSize: 11, minHeight: 36, fontFamily: FM, textAlign: 'center' }}
            />
            <input
              type="number"
              value={custom.c}
              onChange={e => setCustom(c => ({ ...c, c: e.target.value }))}
              placeholder="C"
              style={{ ...s.inp, padding: '8px 8px', fontSize: 11, minHeight: 36, fontFamily: FM, textAlign: 'center' }}
            />
            <input
              type="number"
              value={custom.f}
              onChange={e => setCustom(c => ({ ...c, f: e.target.value }))}
              placeholder="F"
              style={{ ...s.inp, padding: '8px 8px', fontSize: 11, minHeight: 36, fontFamily: FM, textAlign: 'center' }}
            />
          </div>
          <button
            type="button"
            onClick={handleAddCustom}
            disabled={!custom.name.trim() || !Number(custom.cal)}
            style={{
              ...s.btn, ...s.pri,
              width: '100%', padding: '10px 16px', fontSize: 12,
              minHeight: 40, justifyContent: 'center',
              opacity: (!custom.name.trim() || !Number(custom.cal)) ? 0.4 : 1,
            }}
          >
            Add Meal
          </button>
        </div>
      </div>
    </div>
  );
}
