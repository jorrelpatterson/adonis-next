// FoodLogger — quick-add food search + custom entry + adaptive calorie target.
//
// Shows today's calorie target (adjusted for actual weight progress via the
// adaptive engine), today's logged meals, a burn-gap nudge when over target,
// and a quick-add grid backed by the shared food catalog.
//
// source: v2-revival-archive:src/views/components/FoodLogger.jsx
//
// Sanctioned adaptations (per task-11 brief):
// (a) DELETED the embedded 14-item COMMON_FOODS. Now imports main's 51-food
//     catalog from ../../protocols/body/nutrition/food-db.js, which single-
//     sources against the same list the nutrition protocol's meal plans use.
//     Archive items were `{name, serving, cal, p, c, f}` (name and serving
//     split, joined into a display label at render time: `f.name + ' (' +
//     f.serving + ')'`). Main's items are `{n, cal, p, c, f}` — a single
//     pre-formatted display string, no separate serving field. The search
//     filter (`filteredFoods`) and the quick-add button (`addMeal({name: ...})`
//     label/lookup are adapted at their use sites below to read `f.n` instead
//     of `f.name`/`f.serving`.
// (b) Math/adaptive imports repointed from the archive's re-exporting
//     `./math` shim to main's split modules: `calcMacros`, `calcCalorieTarget`,
//     `sumDayMeals` now come from ../../protocols/body/nutrition/calorie-engine.js
//     and `computeAdaptive` from ../../protocols/body/nutrition/adaptive-calories.js.
//     `getYesterdayDelta` is still defined + exported here (per brief, Task
//     12(c) consumes it) but now sources its math from the main modules
//     rather than duplicating it. calcBMR/calcTDEE are no longer re-exported
//     here — WeeklyRecap.test.jsx and other main callers already import them
//     directly from calorie-engine.js.

import React, { useState, useMemo } from 'react';
import { P, FM } from '../../design/theme';
import { s } from '../../design/styles';
import { calcMacros, calcCalorieTarget, sumDayMeals } from '../../protocols/body/nutrition/calorie-engine';
import { computeAdaptive } from '../../protocols/body/nutrition/adaptive-calories';
import { COMMON_FOODS } from '../../protocols/body/nutrition/food-db';
import { sound } from '../../design/sound';
import { haptics } from '../../design/haptics';
import EmptyState from '../../design/EmptyState';
import { IllusFood } from '../../design/illustrations';

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

  // Adaptive target — adjusts based on actual weight progress vs deadline.
  // computeAdaptive guards internally (Number(...) || 0 on every profile
  // field), so it tolerates a sparse profile without NaN-propagating —
  // verified by reading adaptive-calories.js, not re-guarded here.
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

  // (a) main's food-db items are `{n, cal, p, c, f}` — filter on `f.n`
  // (archive filtered on the split `f.name` field, which main's shape lacks).
  const filteredFoods = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return COMMON_FOODS;
    return COMMON_FOODS.filter(f => f.n.toLowerCase().includes(q));
  }, [search]);

  const addMeal = (meal) => {
    if (!log) return;
    const time = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const next = [...todaysMeals, { ...meal, time }];
    log('food', { ...food, [todayKey]: next });
    sound.success();
    haptics.light();
  };

  const removeMeal = (idx) => {
    if (!log) return;
    const next = todaysMeals.filter((_, i) => i !== idx);
    log('food', { ...food, [todayKey]: next });
    sound.toggleOff();
    haptics.light();
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
          <EmptyState
            illustration={<IllusFood />}
            size={120}
            headline="No meals yet today"
            body="Log a meal to track macros and watch your calorie target adapt to your pace."
          />
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
            // (a) main's food-db items are `{n, cal, p, c, f}` — `n` is
            // already a fully-formatted display label (e.g. "Chicken Breast
            // (6oz)"), so it's used directly as both the button label and
            // the logged meal name, unlike the archive's `f.name + ' (' +
            // f.serving + ')'` concatenation.
            filteredFoods.map((f, i) => (
              <button
                key={i}
                type="button"
                onClick={() => addMeal({ name: f.n, cal: f.cal, p: f.p, c: f.c, f: f.f })}
                style={{
                  ...s.btn, ...s.out,
                  justifyContent: 'space-between', textAlign: 'left',
                  padding: '8px 10px', minHeight: 40,
                  fontSize: 11, fontWeight: 600,
                  width: '100%',
                }}
              >
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: P.txS }}>
                  {f.n}
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
