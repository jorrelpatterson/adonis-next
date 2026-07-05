# WorkoutView (Train Tab) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Train tab UI — `WorkoutView.jsx` — that renders the user's current weekly program from `programs.js`, lets them log sets with PR tracking, suggests progression, opens How-To and Swap modals backed by `exercises.js`, runs a rest timer with vibration, and surfaces a deload alert.

**Architecture:** A composed view, not a monolith. Two pure helper modules (`keys.js`, `progression.js`) hold all logic that doesn't touch React. Eight small JSX components live under `src/app/views/workout/`. `WorkoutView.jsx` is the shell — it reads `protocolState.workout` + the current goal's program, picks a day, and renders a `<DaySelector>`, `<WeekSelector>`, optional `<DeloadBanner>`, and one `<ExerciseCard>` per exercise. State writes route through `useAppState().setProtocolState('workout', …)`.

**Tech Stack:** React 18, Vite, Vitest + happy-dom + @testing-library/react. Styles via inline `s.*` from `src/design/styles.js` and `P/FN/FD` from `src/design/theme.js`. No TypeScript. No new dependencies.

---

## File Structure

**New files (helpers — pure JS, no React):**
- `src/protocols/body/workout/keys.js` — `logKey(goal, week, dayIdx, exName, setIdx)`, `prKey(goal, exName)`, `swapKey(goal, week, dayIdx, exName)`.
- `src/protocols/body/workout/progression.js` — `isCompound(name)`, `parseRepTarget(reps)`, `parseRestSeconds(rest)`, `getProgressionSuggestion(opts)`, `needsDeload(wkWeek)`, `getPhase(wkWeek)`, `getDayCompletion(wkLogs, goal, week, dayIdx, dayWorkout)`.

**New files (components — under `src/app/views/workout/`):**
- `RestTimer.jsx` — floating countdown bar with skip + vibration.
- `DaySelector.jsx` — S M T W T F S strip with completion dots.
- `WeekSelector.jsx` — `< Week N >` with phase label.
- `HowToModal.jsx` — exercise form / muscles / tips / level / YouTube link.
- `SwapModal.jsx` — list `EXERCISE_ALTS[name]`, tap to swap.
- `SetGrid.jsx` — set rows with weight/reps/complete + PR badge.
- `ExerciseCard.jsx` — wraps SetGrid, opens HowTo / Swap, starts RestTimer.
- `DeloadBanner.jsx` — banner shown when `needsDeload(wkWeek)`.

**New main view:**
- `src/app/views/WorkoutView.jsx` — composes the above.

**Modified file:**
- `src/state/defaults.js` — add `wkSwaps: {}` to `protocolState.workout`.
- `src/app/App.jsx` — render `<WorkoutView />` inside the `body` domain tab.

**New test files (one per source file):**
- `src/protocols/body/workout/__tests__/keys.test.js`
- `src/protocols/body/workout/__tests__/progression.test.js`
- `src/app/views/workout/__tests__/RestTimer.test.jsx`
- `src/app/views/workout/__tests__/DaySelector.test.jsx`
- `src/app/views/workout/__tests__/WeekSelector.test.jsx`
- `src/app/views/workout/__tests__/HowToModal.test.jsx`
- `src/app/views/workout/__tests__/SwapModal.test.jsx`
- `src/app/views/workout/__tests__/SetGrid.test.jsx`
- `src/app/views/workout/__tests__/ExerciseCard.test.jsx`
- `src/app/views/workout/__tests__/DeloadBanner.test.jsx`
- `src/app/views/__tests__/WorkoutView.test.jsx`

---

### Data contracts (read carefully — these flow through every task)

**`wkLogs` key:** `"goal|week|dayIdx|exName|setIdx"` → `{ wt: number|'', r: number|'', c: boolean }`
- `wt` = weight (lbs), `r` = reps actually done, `c` = whether the set was marked complete.

**`wkPRs` key:** `"goal|exName"` → `number` (highest weight ever marked complete on this exercise for this goal).

**`wkSwaps` key:** `"goal|week|dayIdx|exName"` → `string` (swapped-in exercise name from `EXERCISE_ALTS`).

**`dayIdx`:** `date.getUTCDay()` — Sun=0…Sat=6. Matches what `workout/index.js` already does so completion lines up.

---

## Task 1: Pure helpers — `keys.js`

**Files:**
- Create: `src/protocols/body/workout/keys.js`
- Test:   `src/protocols/body/workout/__tests__/keys.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/protocols/body/workout/__tests__/keys.test.js
import { describe, it, expect } from 'vitest';
import { logKey, prKey, swapKey } from '../keys';

describe('workout keys', () => {
  it('logKey joins goal, week, day, exercise, set with |', () => {
    expect(logKey('Muscle Gain', 3, 1, 'Back Squats', 0)).toBe('Muscle Gain|3|1|Back Squats|0');
  });

  it('prKey joins goal and exercise with |', () => {
    expect(prKey('Muscle Gain', 'Back Squats')).toBe('Muscle Gain|Back Squats');
  });

  it('swapKey joins goal, week, day, exercise with |', () => {
    expect(swapKey('Fat Loss', 5, 2, 'Burpees')).toBe('Fat Loss|5|2|Burpees');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/protocols/body/workout/__tests__/keys.test.js`
Expected: FAIL — `Failed to resolve import "../keys"`.

- [ ] **Step 3: Write the implementation**

```js
// src/protocols/body/workout/keys.js
export const logKey = (goal, week, dayIdx, exName, setIdx) =>
  `${goal}|${week}|${dayIdx}|${exName}|${setIdx}`;

export const prKey = (goal, exName) => `${goal}|${exName}`;

export const swapKey = (goal, week, dayIdx, exName) =>
  `${goal}|${week}|${dayIdx}|${exName}`;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/protocols/body/workout/__tests__/keys.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/protocols/body/workout/keys.js src/protocols/body/workout/__tests__/keys.test.js
git commit -m "workout: add keys helper for wkLogs/wkPRs/wkSwaps lookup"
```

---

## Task 2: Pure helpers — `progression.js`

This module owns every non-React decision: which day is which phase, how many seconds to rest, whether to suggest +5 or +2.5, and whether the user owes themselves a deload.

**Files:**
- Create: `src/protocols/body/workout/progression.js`
- Test:   `src/protocols/body/workout/__tests__/progression.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/protocols/body/workout/__tests__/progression.test.js
import { describe, it, expect } from 'vitest';
import {
  isCompound, parseRepTarget, parseRestSeconds,
  getProgressionSuggestion, needsDeload, getPhase, getDayCompletion,
} from '../progression';
import { logKey } from '../keys';

describe('isCompound', () => {
  it('flags squats, deadlifts, rows, presses, pull-ups, dips as compound', () => {
    ['Back Squats', 'Conventional Deadlifts', 'Barbell Rows', 'Flat Barbell Bench Press',
     'Standing OHP', 'Weighted Pull-ups', 'Weighted Dips', 'Push Press', 'Thrusters']
      .forEach(n => expect(isCompound(n)).toBe(true));
  });
  it('flags isolation moves as not compound', () => {
    ['Lateral Raises', 'Hammer Curls', 'Tricep Pushdowns', 'Leg Extensions',
     'Cable Crunches', 'Pallof Press', 'Face Pulls']
      .forEach(n => expect(isCompound(n)).toBe(false));
  });
});

describe('parseRepTarget', () => {
  it('parses "8" -> 8', () => { expect(parseRepTarget('8')).toBe(8); });
  it('parses "6-8" -> min 6', () => { expect(parseRepTarget('6-8')).toBe(6); });
  it('parses "12/leg" -> 12', () => { expect(parseRepTarget('12/leg')).toBe(12); });
  it('parses "45s" -> 0 (time-based)', () => { expect(parseRepTarget('45s')).toBe(0); });
  it('parses garbage -> 0', () => { expect(parseRepTarget('')).toBe(0); });
});

describe('parseRestSeconds', () => {
  it('parses "60s" -> 60', () => { expect(parseRestSeconds('60s')).toBe(60); });
  it('parses "120s" -> 120', () => { expect(parseRestSeconds('120s')).toBe(120); });
  it('parses "30s on/30s off" -> 30 (first number)', () => { expect(parseRestSeconds('30s on/30s off')).toBe(30); });
  it('parses dash -> 0', () => { expect(parseRestSeconds('—')).toBe(0); });
  it('parses empty -> 0', () => { expect(parseRestSeconds('')).toBe(0); });
});

describe('getPhase', () => {
  it('weeks 1-4 -> Foundation', () => {
    [1, 2, 3, 4].forEach(w => expect(getPhase(w)).toBe('Foundation'));
  });
  it('weeks 5-8 -> Hypertrophy', () => {
    expect(getPhase(5)).toBe('Hypertrophy');
    expect(getPhase(8)).toBe('Hypertrophy');
  });
  it('weeks 9-12 -> Strength', () => {
    expect(getPhase(9)).toBe('Strength');
    expect(getPhase(12)).toBe('Strength');
  });
  it('weeks 13-16 -> Deload/Peak', () => {
    expect(getPhase(13)).toBe('Deload/Peak');
    expect(getPhase(16)).toBe('Deload/Peak');
  });
});

describe('needsDeload', () => {
  it('true on every 4th week', () => {
    expect(needsDeload(4)).toBe(true);
    expect(needsDeload(8)).toBe(true);
    expect(needsDeload(12)).toBe(true);
    expect(needsDeload(16)).toBe(true);
  });
  it('false otherwise', () => {
    [1, 2, 3, 5, 7, 9, 11, 13, 15].forEach(w => expect(needsDeload(w)).toBe(false));
  });
});

describe('getProgressionSuggestion', () => {
  const goal = 'Muscle Gain', week = 2, dayIdx = 1;
  const exercise = { name: 'Back Squats', sets: 3, reps: '5' };

  it('returns null when no prior data exists', () => {
    const out = getProgressionSuggestion({ wkLogs: {}, goal, week, dayIdx, exercise });
    expect(out).toBeNull();
  });

  it('suggests +5 lbs when all prior compound sets hit target reps', () => {
    const wkLogs = {
      [logKey(goal, 1, dayIdx, 'Back Squats', 0)]: { wt: 225, r: 5, c: true },
      [logKey(goal, 1, dayIdx, 'Back Squats', 1)]: { wt: 225, r: 5, c: true },
      [logKey(goal, 1, dayIdx, 'Back Squats', 2)]: { wt: 225, r: 5, c: true },
    };
    const out = getProgressionSuggestion({ wkLogs, goal, week, dayIdx, exercise });
    expect(out).toEqual({ lastWeight: 225, nextWeight: 230, delta: 5, unlockDelta: 5, hitTarget: true });
  });

  it('suggests +2.5 lbs when prior isolation sets all hit target', () => {
    const ex = { name: 'Lateral Raises', sets: 3, reps: '15' };
    const wkLogs = {
      [logKey(goal, 1, dayIdx, 'Lateral Raises', 0)]: { wt: 20, r: 15, c: true },
      [logKey(goal, 1, dayIdx, 'Lateral Raises', 1)]: { wt: 20, r: 15, c: true },
      [logKey(goal, 1, dayIdx, 'Lateral Raises', 2)]: { wt: 20, r: 15, c: true },
    };
    const out = getProgressionSuggestion({ wkLogs, goal, week, dayIdx, exercise: ex });
    expect(out).toEqual({ lastWeight: 20, nextWeight: 22.5, delta: 2.5, unlockDelta: 2.5, hitTarget: true });
  });

  it('flags hitTarget=false when any set missed target reps, but still reports the would-unlock delta', () => {
    const wkLogs = {
      [logKey(goal, 1, dayIdx, 'Back Squats', 0)]: { wt: 225, r: 5, c: true },
      [logKey(goal, 1, dayIdx, 'Back Squats', 1)]: { wt: 225, r: 4, c: true },
      [logKey(goal, 1, dayIdx, 'Back Squats', 2)]: { wt: 225, r: 3, c: true },
    };
    const out = getProgressionSuggestion({ wkLogs, goal, week, dayIdx, exercise });
    expect(out).toEqual({ lastWeight: 225, nextWeight: 225, delta: 0, unlockDelta: 5, hitTarget: false });
  });
});

describe('getDayCompletion', () => {
  const goal = 'Muscle Gain', week = 1, dayIdx = 1;
  const dayWorkout = {
    d: 'Back & Biceps', dur: 60,
    exercises: [
      { name: 'Deadlifts', sets: 3, reps: '5', rest: '120s' },
      { name: 'Rows', sets: 3, reps: '8', rest: '90s' },
    ],
  };

  it('returns { status: "rest", total: 0 } when day has no exercises', () => {
    expect(getDayCompletion({}, goal, week, dayIdx, { d: 'Rest', dur: 0, exercises: [] }))
      .toEqual({ completed: 0, total: 0, status: 'rest' });
  });

  it('returns { status: "empty" } when no sets are complete', () => {
    expect(getDayCompletion({}, goal, week, dayIdx, dayWorkout))
      .toEqual({ completed: 0, total: 6, status: 'empty' });
  });

  it('returns { status: "partial" } when some but not all sets are complete', () => {
    const wkLogs = {
      [logKey(goal, week, dayIdx, 'Deadlifts', 0)]: { wt: 0, r: 5, c: true },
      [logKey(goal, week, dayIdx, 'Deadlifts', 1)]: { wt: 0, r: 5, c: true },
    };
    expect(getDayCompletion(wkLogs, goal, week, dayIdx, dayWorkout))
      .toEqual({ completed: 2, total: 6, status: 'partial' });
  });

  it('returns { status: "complete" } when all sets complete', () => {
    const wkLogs = {};
    dayWorkout.exercises.forEach(ex => {
      for (let i = 0; i < ex.sets; i++) {
        wkLogs[logKey(goal, week, dayIdx, ex.name, i)] = { wt: 0, r: 5, c: true };
      }
    });
    expect(getDayCompletion(wkLogs, goal, week, dayIdx, dayWorkout))
      .toEqual({ completed: 6, total: 6, status: 'complete' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/protocols/body/workout/__tests__/progression.test.js`
Expected: FAIL — `Failed to resolve import "../progression"`.

- [ ] **Step 3: Write the implementation**

```js
// src/protocols/body/workout/progression.js
import { logKey } from './keys';

const COMPOUND_PATTERNS = [
  /squat/i, /deadlift/i, /bench press/i, /\brows?\b/i,
  /\bohp\b/i, /overhead press/i, /push press/i,
  /pull-?ups?/i, /\bdips?\b/i, /thrusters?/i, /clean/i,
];

export function isCompound(name) {
  if (!name) return false;
  return COMPOUND_PATTERNS.some(p => p.test(name));
}

export function parseRepTarget(reps) {
  if (!reps || typeof reps !== 'string') return 0;
  if (/^\d+\s*s\b/i.test(reps)) return 0; // time-based, e.g. "45s"
  const match = reps.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

export function parseRestSeconds(rest) {
  if (!rest || typeof rest !== 'string') return 0;
  const match = rest.match(/(\d+)\s*s/i);
  return match ? parseInt(match[1], 10) : 0;
}

export function getPhase(wkWeek) {
  if (wkWeek <= 4) return 'Foundation';
  if (wkWeek <= 8) return 'Hypertrophy';
  if (wkWeek <= 12) return 'Strength';
  return 'Deload/Peak';
}

export function needsDeload(wkWeek) {
  return wkWeek > 0 && wkWeek % 4 === 0;
}

export function getProgressionSuggestion({ wkLogs, goal, week, dayIdx, exercise }) {
  if (!exercise || week <= 1) return null;
  const prevWeek = week - 1;
  const target = parseRepTarget(exercise.reps);
  const setCount = exercise.sets || 0;
  if (setCount === 0) return null;

  let lastWeight = null;
  let hitTarget = true;
  for (let i = 0; i < setCount; i++) {
    const entry = wkLogs[logKey(goal, prevWeek, dayIdx, exercise.name, i)];
    if (!entry || !entry.c) return null; // no prior data — no suggestion
    const wt = parseFloat(entry.wt) || 0;
    if (lastWeight === null || wt > lastWeight) lastWeight = wt;
    const reps = parseFloat(entry.r) || 0;
    if (target > 0 && reps < target) hitTarget = false;
  }
  if (lastWeight === null) return null;

  const unlockDelta = isCompound(exercise.name) ? 5 : 2.5;
  const delta = hitTarget ? unlockDelta : 0;
  return { lastWeight, nextWeight: lastWeight + delta, delta, unlockDelta, hitTarget };
}

export function getDayCompletion(wkLogs, goal, week, dayIdx, dayWorkout) {
  if (!dayWorkout || !dayWorkout.exercises || dayWorkout.exercises.length === 0) {
    return { completed: 0, total: 0, status: 'rest' };
  }
  let total = 0;
  let completed = 0;
  for (const ex of dayWorkout.exercises) {
    const sets = ex.sets || 0;
    total += sets;
    for (let i = 0; i < sets; i++) {
      const entry = wkLogs[logKey(goal, week, dayIdx, ex.name, i)];
      if (entry && entry.c) completed++;
    }
  }
  let status = 'empty';
  if (total === 0) status = 'rest';
  else if (completed >= total) status = 'complete';
  else if (completed > 0) status = 'partial';
  return { completed, total, status };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/protocols/body/workout/__tests__/progression.test.js`
Expected: PASS (all describes green).

- [ ] **Step 5: Commit**

```bash
git add src/protocols/body/workout/progression.js src/protocols/body/workout/__tests__/progression.test.js
git commit -m "workout: add progression/phase/deload/completion helpers"
```

---

## Task 3: `RestTimer.jsx`

A floating bar at the bottom of the viewport. Receives `seconds` (initial) and `onDone` / `onSkip`. Vibrates 200ms on natural completion. Cleans up its interval on unmount.

**Files:**
- Create: `src/app/views/workout/RestTimer.jsx`
- Test:   `src/app/views/workout/__tests__/RestTimer.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// src/app/views/workout/__tests__/RestTimer.test.jsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import RestTimer from '../RestTimer';

describe('RestTimer', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('renders exercise name and starting seconds', () => {
    const { container } = render(
      <RestTimer exerciseName="Back Squats" seconds={60} onDone={() => {}} onSkip={() => {}} />
    );
    expect(container.textContent).toContain('Back Squats');
    expect(container.textContent).toContain('60');
  });

  it('counts down each second', () => {
    const { container } = render(
      <RestTimer exerciseName="Rows" seconds={3} onDone={() => {}} onSkip={() => {}} />
    );
    expect(container.textContent).toContain('3');
    act(() => { vi.advanceTimersByTime(1000); });
    expect(container.textContent).toContain('2');
    act(() => { vi.advanceTimersByTime(1000); });
    expect(container.textContent).toContain('1');
  });

  it('calls onDone and vibrates when countdown hits 0', () => {
    const onDone = vi.fn();
    const vibrate = vi.fn();
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
    render(<RestTimer exerciseName="Rows" seconds={1} onDone={onDone} onSkip={() => {}} />);
    act(() => { vi.advanceTimersByTime(1100); });
    expect(onDone).toHaveBeenCalled();
    expect(vibrate).toHaveBeenCalledWith(200);
  });

  it('calls onSkip when skip button clicked', () => {
    const onSkip = vi.fn();
    const { getByText } = render(
      <RestTimer exerciseName="Rows" seconds={60} onDone={() => {}} onSkip={onSkip} />
    );
    fireEvent.click(getByText(/skip/i));
    expect(onSkip).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/views/workout/__tests__/RestTimer.test.jsx`
Expected: FAIL — `Failed to resolve import "../RestTimer"`.

- [ ] **Step 3: Write the implementation**

```jsx
// src/app/views/workout/RestTimer.jsx
import React, { useEffect, useState } from 'react';
import { P, FN, FM } from '../../../design/theme';

export default function RestTimer({ exerciseName, seconds, onDone, onSkip }) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => { setRemaining(seconds); }, [seconds]);

  useEffect(() => {
    if (remaining <= 0) {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(200); } catch (e) { /* ignore */ }
      }
      onDone && onDone();
      return;
    }
    const id = setInterval(() => setRemaining(r => r - 1), 1000);
    return () => clearInterval(id);
  }, [remaining, onDone]);

  return (
    <div style={{
      position: 'fixed', bottom: 72, left: 0, right: 0,
      display: 'flex', justifyContent: 'center', zIndex: 200,
      pointerEvents: 'none',
    }}>
      <div style={{
        pointerEvents: 'auto',
        background: 'rgba(14,16,22,0.92)', backdropFilter: 'blur(20px)',
        border: '1px solid ' + P.bd, borderRadius: 16,
        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14,
        fontFamily: FN, color: P.tx, minWidth: 280, maxWidth: 480,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: P.txD, textTransform: 'uppercase', letterSpacing: 1.5 }}>Rest</div>
          <div style={{ fontSize: 13, color: P.txS, marginTop: 2 }}>{exerciseName}</div>
        </div>
        <div style={{ fontFamily: FM, fontSize: 22, fontWeight: 700, color: P.gW, minWidth: 56, textAlign: 'right' }}>
          {Math.max(0, remaining)}s
        </div>
        <button onClick={onSkip} style={{
          background: 'transparent', color: P.txM, border: '1px solid ' + P.bd,
          borderRadius: 10, padding: '6px 12px', fontSize: 11, cursor: 'pointer', fontFamily: FN,
        }}>Skip</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/views/workout/__tests__/RestTimer.test.jsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/views/workout/RestTimer.jsx src/app/views/workout/__tests__/RestTimer.test.jsx
git commit -m "workout: add RestTimer with vibration on completion"
```

---

## Task 4: `DaySelector.jsx`

S M T W T F S row. Each button shows the day letter and a colored dot derived from `getDayCompletion`. Tapping selects the day. Sun=0 anchors the strip.

**Files:**
- Create: `src/app/views/workout/DaySelector.jsx`
- Test:   `src/app/views/workout/__tests__/DaySelector.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// src/app/views/workout/__tests__/DaySelector.test.jsx
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import DaySelector from '../DaySelector';

const program = [
  { d: 'Rest', dur: 0, exercises: [] },              // Sun
  { d: 'Push', dur: 60, exercises: [{ name: 'X', sets: 3, reps: '8' }] }, // Mon
  { d: 'Pull', dur: 60, exercises: [{ name: 'Y', sets: 3, reps: '8' }] }, // Tue
  { d: 'Legs', dur: 60, exercises: [{ name: 'Z', sets: 3, reps: '8' }] }, // Wed
  { d: 'Rest', dur: 0, exercises: [] },              // Thu
  { d: 'Pump', dur: 45, exercises: [{ name: 'W', sets: 3, reps: '10' }] },// Fri
  { d: 'Rest', dur: 0, exercises: [] },              // Sat
];

describe('DaySelector', () => {
  it('renders 7 day buttons labeled S M T W T F S', () => {
    const { container } = render(
      <DaySelector goal="Muscle Gain" week={1} dayIdx={1} program={program} wkLogs={{}} onSelect={() => {}} />
    );
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBe(7);
    const labels = Array.from(buttons).map(b => b.textContent || '');
    ['S','M','T','W','T','F','S'].forEach((letter, i) => {
      expect(labels[i].startsWith(letter)).toBe(true);
    });
  });

  it('calls onSelect with the clicked dayIdx', () => {
    const onSelect = vi.fn();
    const { container } = render(
      <DaySelector goal="Muscle Gain" week={1} dayIdx={1} program={program} wkLogs={{}} onSelect={onSelect} />
    );
    const buttons = container.querySelectorAll('button');
    fireEvent.click(buttons[3]); // Wednesday
    expect(onSelect).toHaveBeenCalledWith(3);
  });

  it('marks the active day visually (data-active attr)', () => {
    const { container } = render(
      <DaySelector goal="Muscle Gain" week={1} dayIdx={2} program={program} wkLogs={{}} onSelect={() => {}} />
    );
    const buttons = container.querySelectorAll('button');
    expect(buttons[2].getAttribute('data-active')).toBe('true');
    expect(buttons[1].getAttribute('data-active')).toBe('false');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/views/workout/__tests__/DaySelector.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```jsx
// src/app/views/workout/DaySelector.jsx
import React from 'react';
import { P, FN } from '../../../design/theme';
import { getDayCompletion } from '../../../protocols/body/workout/progression';

const LETTERS = ['S','M','T','W','T','F','S'];

const DOT_COLOR = { complete: P.ok, partial: P.warn, empty: 'transparent', rest: P.txD };

export default function DaySelector({ goal, week, dayIdx, program, wkLogs, onSelect }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 14 }}>
      {LETTERS.map((letter, i) => {
        const { status } = getDayCompletion(wkLogs || {}, goal, week, i, program[i]);
        const active = i === dayIdx;
        return (
          <button
            key={i}
            data-active={active ? 'true' : 'false'}
            onClick={() => onSelect(i)}
            style={{
              fontFamily: FN, cursor: 'pointer',
              background: active ? 'rgba(232,213,183,0.08)' : 'transparent',
              border: '1px solid ' + (active ? P.gW + '44' : P.bd),
              borderRadius: 10, padding: '8px 0',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              color: active ? P.gW : P.txM,
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}>{letter}</span>
            <span style={{
              width: 6, height: 6, borderRadius: 3,
              background: DOT_COLOR[status],
              border: status === 'empty' ? '1px solid ' + P.bd : 'none',
            }} />
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/views/workout/__tests__/DaySelector.test.jsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/views/workout/DaySelector.jsx src/app/views/workout/__tests__/DaySelector.test.jsx
git commit -m "workout: add DaySelector strip with completion dots"
```

---

## Task 5: `WeekSelector.jsx`

`< Week N >` with the phase label underneath. Clamps to [1, 16].

**Files:**
- Create: `src/app/views/workout/WeekSelector.jsx`
- Test:   `src/app/views/workout/__tests__/WeekSelector.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// src/app/views/workout/__tests__/WeekSelector.test.jsx
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import WeekSelector from '../WeekSelector';

describe('WeekSelector', () => {
  it('renders current week and phase label', () => {
    const { container } = render(<WeekSelector week={6} onChange={() => {}} />);
    expect(container.textContent).toContain('Week 6');
    expect(container.textContent).toContain('Hypertrophy');
  });

  it('increments on > click, clamped at 16', () => {
    const onChange = vi.fn();
    const { getByLabelText, rerender } = render(<WeekSelector week={15} onChange={onChange} />);
    fireEvent.click(getByLabelText('next week'));
    expect(onChange).toHaveBeenCalledWith(16);
    rerender(<WeekSelector week={16} onChange={onChange} />);
    fireEvent.click(getByLabelText('next week'));
    expect(onChange).toHaveBeenLastCalledWith(16);
  });

  it('decrements on < click, clamped at 1', () => {
    const onChange = vi.fn();
    const { getByLabelText, rerender } = render(<WeekSelector week={2} onChange={onChange} />);
    fireEvent.click(getByLabelText('previous week'));
    expect(onChange).toHaveBeenCalledWith(1);
    rerender(<WeekSelector week={1} onChange={onChange} />);
    fireEvent.click(getByLabelText('previous week'));
    expect(onChange).toHaveBeenLastCalledWith(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/views/workout/__tests__/WeekSelector.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```jsx
// src/app/views/workout/WeekSelector.jsx
import React from 'react';
import { P, FN, FD } from '../../../design/theme';
import { getPhase } from '../../../protocols/body/workout/progression';

export default function WeekSelector({ week, onChange }) {
  const phase = getPhase(week);
  const set = (n) => onChange(Math.max(1, Math.min(16, n)));
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
      marginBottom: 14, padding: '8px 0',
    }}>
      <button aria-label="previous week" onClick={() => set(week - 1)} style={{
        background: 'transparent', border: '1px solid ' + P.bd, color: P.txS,
        borderRadius: 10, width: 36, height: 36, fontSize: 16, cursor: 'pointer', fontFamily: FN,
      }}>&lt;</button>

      <div style={{ textAlign: 'center', minWidth: 120 }}>
        <div style={{ fontFamily: FD, fontStyle: 'italic', fontSize: 18, fontWeight: 300, color: P.gW }}>
          Week {week}
        </div>
        <div style={{ fontSize: 9, color: P.txD, textTransform: 'uppercase', letterSpacing: 2, marginTop: 2 }}>
          {phase}
        </div>
      </div>

      <button aria-label="next week" onClick={() => set(week + 1)} style={{
        background: 'transparent', border: '1px solid ' + P.bd, color: P.txS,
        borderRadius: 10, width: 36, height: 36, fontSize: 16, cursor: 'pointer', fontFamily: FN,
      }}>&gt;</button>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/views/workout/__tests__/WeekSelector.test.jsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/views/workout/WeekSelector.jsx src/app/views/workout/__tests__/WeekSelector.test.jsx
git commit -m "workout: add WeekSelector with phase label and 1-16 clamp"
```

---

## Task 6: `HowToModal.jsx`

Reads `EXERCISE_DB[name]` and shows muscles, form instructions, tips, level badge, plus a "Watch Form Video" link that opens `getVideoUrl(name)` in a new tab.

**Files:**
- Create: `src/app/views/workout/HowToModal.jsx`
- Test:   `src/app/views/workout/__tests__/HowToModal.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// src/app/views/workout/__tests__/HowToModal.test.jsx
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import HowToModal from '../HowToModal';

describe('HowToModal', () => {
  it('renders muscles, form, tips, and level for a known exercise', () => {
    const { container } = render(
      <HowToModal exerciseName="Back Squats" onClose={() => {}} />
    );
    expect(container.textContent).toContain('Quads');
    expect(container.textContent).toContain('high bar');
    expect(container.textContent).toMatch(/chest up/i);
    expect(container.textContent.toLowerCase()).toContain('advanced');
  });

  it('renders a YouTube link to the form video', () => {
    const { container } = render(
      <HowToModal exerciseName="Back Squats" onClose={() => {}} />
    );
    const link = container.querySelector('a[href*="youtube.com"]');
    expect(link).not.toBeNull();
    expect(link.getAttribute('href')).toContain('Back%20Squats');
  });

  it('calls onClose when backdrop or close button clicked', () => {
    const onClose = vi.fn();
    const { getByLabelText } = render(
      <HowToModal exerciseName="Back Squats" onClose={onClose} />
    );
    fireEvent.click(getByLabelText('close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('falls back gracefully for an unknown exercise', () => {
    const { container } = render(
      <HowToModal exerciseName="Mystery Move" onClose={() => {}} />
    );
    expect(container.textContent).toContain('Mystery Move');
    // Should still render a YouTube link
    expect(container.querySelector('a[href*="youtube.com"]')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/views/workout/__tests__/HowToModal.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```jsx
// src/app/views/workout/HowToModal.jsx
import React from 'react';
import { P, FN, FD } from '../../../design/theme';
import { s } from '../../../design/styles';
import { EXERCISE_DB, getVideoUrl } from '../../../protocols/body/workout/exercises';

const LEVEL_COLOR = { beginner: P.ok, intermediate: P.warn, advanced: P.err };

export default function HowToModal({ exerciseName, onClose }) {
  const data = EXERCISE_DB[exerciseName] || {};
  const levelColor = LEVEL_COLOR[data.level] || P.txM;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div onClick={e => e.stopPropagation()} style={{
        ...s.card, padding: 22, maxWidth: 520, width: '100%',
        maxHeight: '85vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ fontFamily: FD, fontSize: 22, fontWeight: 300, color: P.gW, fontStyle: 'italic' }}>
              {exerciseName}
            </div>
            {data.level && (
              <span style={{ ...s.tag, background: levelColor + '22', color: levelColor, marginTop: 6 }}>
                {data.level}
              </span>
            )}
          </div>
          <button aria-label="close" onClick={onClose} style={{
            background: 'transparent', border: 'none', color: P.txM, fontSize: 22,
            cursor: 'pointer', padding: 4, lineHeight: 1,
          }}>×</button>
        </div>

        {data.muscles && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ ...s.lab }}>Muscles</div>
            <div style={{ fontSize: 12, color: P.txS }}>{data.muscles}</div>
          </div>
        )}

        {data.form && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ ...s.lab }}>Form</div>
            <div style={{ fontSize: 12, color: P.txS, lineHeight: 1.55 }}>{data.form}</div>
          </div>
        )}

        {data.tips && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ ...s.lab }}>Pro Tips</div>
            <div style={{ fontSize: 12, color: P.txM, lineHeight: 1.55 }}>{data.tips}</div>
          </div>
        )}

        <a
          href={getVideoUrl(exerciseName)}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            ...s.btn, ...s.out, width: '100%', justifyContent: 'center',
            textDecoration: 'none', boxSizing: 'border-box',
          }}
        >
          ▶ Watch Form Video
        </a>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/views/workout/__tests__/HowToModal.test.jsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/views/workout/HowToModal.jsx src/app/views/workout/__tests__/HowToModal.test.jsx
git commit -m "workout: add HowToModal with muscles/form/tips/video link"
```

---

## Task 7: `SwapModal.jsx` + `wkSwaps` state

Lists `EXERCISE_ALTS[name]`. Tapping an alternative calls `onPick(altName)`. Also adds `wkSwaps: {}` to defaults so the view can persist swaps.

**Files:**
- Modify: `src/state/defaults.js` (add `wkSwaps: {}` field)
- Create: `src/app/views/workout/SwapModal.jsx`
- Test:   `src/app/views/workout/__tests__/SwapModal.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// src/app/views/workout/__tests__/SwapModal.test.jsx
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import SwapModal from '../SwapModal';

describe('SwapModal', () => {
  it('lists every alternative for the given exercise', () => {
    const { container } = render(
      <SwapModal exerciseName="Back Squats" onPick={() => {}} onClose={() => {}} />
    );
    // From EXERCISE_ALTS["Back Squats"]
    expect(container.textContent).toContain('Goblet Squats');
    expect(container.textContent).toContain('Leg Press');
    expect(container.textContent).toContain('Front Squats');
    expect(container.textContent).toContain('Hack Squat');
  });

  it('shows a "no alternatives" message when the exercise has none', () => {
    const { container } = render(
      <SwapModal exerciseName="Yoga Flow" onPick={() => {}} onClose={() => {}} />
    );
    expect(container.textContent.toLowerCase()).toContain('no alternatives');
  });

  it('calls onPick with the alt name when an alt is tapped', () => {
    const onPick = vi.fn();
    const { getByText } = render(
      <SwapModal exerciseName="Back Squats" onPick={onPick} onClose={() => {}} />
    );
    fireEvent.click(getByText('Leg Press'));
    expect(onPick).toHaveBeenCalledWith('Leg Press');
  });

  it('offers a "revert to original" action that calls onPick(null)', () => {
    const onPick = vi.fn();
    const { getByText } = render(
      <SwapModal exerciseName="Back Squats" current="Leg Press" onPick={onPick} onClose={() => {}} />
    );
    fireEvent.click(getByText(/revert/i));
    expect(onPick).toHaveBeenCalledWith(null);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/views/workout/__tests__/SwapModal.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Add `wkSwaps` to defaults**

Edit `src/state/defaults.js`, change the workout line:

```js
    workout: { wkWeek: 1, wkViewDay: null, wkLogs: {}, wkPRs: {}, wkSwaps: {} },
```

- [ ] **Step 4: Write the SwapModal implementation**

```jsx
// src/app/views/workout/SwapModal.jsx
import React from 'react';
import { P, FN, FD } from '../../../design/theme';
import { s } from '../../../design/styles';
import { EXERCISE_ALTS } from '../../../protocols/body/workout/exercises';

export default function SwapModal({ exerciseName, current, onPick, onClose }) {
  const alts = EXERCISE_ALTS[exerciseName] || [];

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div onClick={e => e.stopPropagation()} style={{
        ...s.card, padding: 22, maxWidth: 460, width: '100%',
        maxHeight: '80vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <div style={{ fontFamily: FD, fontSize: 20, fontWeight: 300, color: P.gW, fontStyle: 'italic' }}>
            Swap exercise
          </div>
          <button aria-label="close" onClick={onClose} style={{
            background: 'transparent', border: 'none', color: P.txM, fontSize: 22,
            cursor: 'pointer', padding: 4, lineHeight: 1,
          }}>×</button>
        </div>
        <div style={{ fontSize: 11, color: P.txD, marginBottom: 14 }}>
          For this session only — swaps don't change your program.
        </div>

        {alts.length === 0 ? (
          <div style={{ fontSize: 12, color: P.txM, padding: '20px 0', textAlign: 'center' }}>
            No alternatives mapped for {exerciseName}.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {alts.map(alt => (
              <button
                key={alt}
                onClick={() => onPick(alt)}
                style={{
                  ...s.btn, ...s.out, justifyContent: 'flex-start',
                  background: alt === current ? 'rgba(232,213,183,0.08)' : s.out.background,
                }}
              >
                {alt}
              </button>
            ))}
          </div>
        )}

        {current && (
          <button
            onClick={() => onPick(null)}
            style={{
              ...s.btn, ...s.out, width: '100%', marginTop: 14, justifyContent: 'center',
              color: P.txM, fontSize: 11,
            }}
          >
            Revert to {exerciseName}
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/app/views/workout/__tests__/SwapModal.test.jsx`
Expected: PASS (4 tests).

Also run full suite to confirm `defaults.js` change didn't break anything:

Run: `npx vitest run`
Expected: PASS (all previously-passing tests still pass).

- [ ] **Step 6: Commit**

```bash
git add src/state/defaults.js src/app/views/workout/SwapModal.jsx src/app/views/workout/__tests__/SwapModal.test.jsx
git commit -m "workout: add SwapModal + wkSwaps state for per-session swaps"
```

---

## Task 8: `SetGrid.jsx`

Per-exercise grid of set rows. Each row has weight input, reps input, complete checkbox. PR badge when the entered weight exceeds `wkPRs[goal|exName]`. Inputs pre-fill the placeholder with the previous week's logged weight as ghost text.

**Files:**
- Create: `src/app/views/workout/SetGrid.jsx`
- Test:   `src/app/views/workout/__tests__/SetGrid.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// src/app/views/workout/__tests__/SetGrid.test.jsx
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import SetGrid from '../SetGrid';
import { logKey, prKey } from '../../../../protocols/body/workout/keys';

const goal = 'Muscle Gain', week = 2, dayIdx = 1;
const exercise = { name: 'Back Squats', sets: 3, reps: '5', rest: '120s' };

describe('SetGrid', () => {
  it('renders one row per set', () => {
    const { container } = render(
      <SetGrid goal={goal} week={week} dayIdx={dayIdx} exercise={exercise}
        wkLogs={{}} wkPRs={{}} onSet={() => {}} />
    );
    const weightInputs = container.querySelectorAll('input[type="number"]');
    // 3 sets × 2 numeric inputs (weight + reps) = 6
    expect(weightInputs.length).toBe(6);
  });

  it('uses prior-week weight as placeholder ghost text', () => {
    const wkLogs = {
      [logKey(goal, 1, dayIdx, 'Back Squats', 0)]: { wt: 225, r: 5, c: true },
    };
    const { container } = render(
      <SetGrid goal={goal} week={week} dayIdx={dayIdx} exercise={exercise}
        wkLogs={wkLogs} wkPRs={{}} onSet={() => {}} />
    );
    const firstWeightInput = container.querySelectorAll('input[type="number"]')[0];
    expect(firstWeightInput.getAttribute('placeholder')).toBe('225');
  });

  it('calls onSet with updated entry when weight changes', () => {
    const onSet = vi.fn();
    const { container } = render(
      <SetGrid goal={goal} week={week} dayIdx={dayIdx} exercise={exercise}
        wkLogs={{}} wkPRs={{}} onSet={onSet} />
    );
    const inputs = container.querySelectorAll('input[type="number"]');
    fireEvent.change(inputs[0], { target: { value: '230' } });
    expect(onSet).toHaveBeenCalledWith(0, expect.objectContaining({ wt: 230 }));
  });

  it('calls onSet with c=true when checkbox toggled on', () => {
    const onSet = vi.fn();
    const { container } = render(
      <SetGrid goal={goal} week={week} dayIdx={dayIdx} exercise={exercise}
        wkLogs={{}} wkPRs={{}} onSet={onSet} />
    );
    const checkbox = container.querySelector('input[type="checkbox"]');
    fireEvent.click(checkbox);
    expect(onSet).toHaveBeenCalledWith(0, expect.objectContaining({ c: true }));
  });

  it('shows a PR badge when current set weight exceeds wkPRs', () => {
    const wkLogs = {
      [logKey(goal, week, dayIdx, 'Back Squats', 0)]: { wt: 240, r: 5, c: true },
    };
    const wkPRs = { [prKey(goal, 'Back Squats')]: 225 };
    const { container } = render(
      <SetGrid goal={goal} week={week} dayIdx={dayIdx} exercise={exercise}
        wkLogs={wkLogs} wkPRs={wkPRs} onSet={() => {}} />
    );
    expect(container.textContent).toContain('PR');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/views/workout/__tests__/SetGrid.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```jsx
// src/app/views/workout/SetGrid.jsx
import React from 'react';
import { P, FN, FM } from '../../../design/theme';
import { s } from '../../../design/styles';
import { logKey, prKey } from '../../../protocols/body/workout/keys';

export default function SetGrid({ goal, week, dayIdx, exercise, wkLogs, wkPRs, onSet }) {
  const setCount = exercise.sets || 0;
  const rows = [];
  const pr = wkPRs[prKey(goal, exercise.name)] || 0;

  for (let i = 0; i < setCount; i++) {
    const cur = wkLogs[logKey(goal, week, dayIdx, exercise.name, i)] || {};
    const prev = wkLogs[logKey(goal, week - 1, dayIdx, exercise.name, i)] || {};
    const ghostWt = prev.wt ? String(prev.wt) : '';
    const ghostR = prev.r ? String(prev.r) : (exercise.reps || '');
    const curWt = parseFloat(cur.wt) || 0;
    const isPR = curWt > 0 && curWt > pr;

    const update = (patch) => onSet(i, { wt: cur.wt || '', r: cur.r || '', c: !!cur.c, ...patch });

    rows.push(
      <div key={i} style={{
        display: 'grid', gridTemplateColumns: '24px 1fr 1fr 32px', gap: 8,
        alignItems: 'center', padding: '6px 0',
        borderBottom: i < setCount - 1 ? '1px solid ' + P.bd : 'none',
      }}>
        <div style={{ fontFamily: FM, fontSize: 11, color: P.txD, textAlign: 'center' }}>{i + 1}</div>

        <div style={{ position: 'relative' }}>
          <input
            type="number"
            inputMode="decimal"
            value={cur.wt ?? ''}
            placeholder={ghostWt}
            onChange={e => update({ wt: e.target.value === '' ? '' : Number(e.target.value) })}
            style={{ ...s.inp, padding: '8px 10px', fontSize: 12, minHeight: 36 }}
          />
          {isPR && (
            <span style={{
              position: 'absolute', top: -6, right: -4,
              fontSize: 8, fontWeight: 700, letterSpacing: 1,
              padding: '2px 6px', borderRadius: 4,
              background: P.gW, color: '#0A0B0E',
            }}>PR</span>
          )}
        </div>

        <input
          type="number"
          inputMode="numeric"
          value={cur.r ?? ''}
          placeholder={ghostR}
          onChange={e => update({ r: e.target.value === '' ? '' : Number(e.target.value) })}
          style={{ ...s.inp, padding: '8px 10px', fontSize: 12, minHeight: 36 }}
        />

        <input
          type="checkbox"
          checked={!!cur.c}
          onChange={e => update({ c: e.target.checked })}
          style={{ width: 20, height: 20, cursor: 'pointer', accentColor: P.ok, margin: '0 auto' }}
        />
      </div>
    );
  }

  return (
    <div>
      <div style={{
        display: 'grid', gridTemplateColumns: '24px 1fr 1fr 32px', gap: 8,
        fontSize: 8, fontWeight: 700, color: P.txD, letterSpacing: 1.5,
        textTransform: 'uppercase', padding: '0 0 6px', borderBottom: '1px solid ' + P.bd,
      }}>
        <div>#</div><div>Weight</div><div>Reps</div><div style={{ textAlign: 'center' }}>✓</div>
      </div>
      {rows}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/views/workout/__tests__/SetGrid.test.jsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/views/workout/SetGrid.jsx src/app/views/workout/__tests__/SetGrid.test.jsx
git commit -m "workout: add SetGrid with PR badge and prior-week ghost placeholders"
```

---

## Task 9: `ExerciseCard.jsx`

Wraps `SetGrid`. Shows exercise name, sets × reps, progression suggestion line, "How-To" + "Swap" + "Start Xs Rest" buttons. Triggers the rest timer in the parent via `onStartRest(seconds)`. Opens HowToModal / SwapModal internally.

**Files:**
- Create: `src/app/views/workout/ExerciseCard.jsx`
- Test:   `src/app/views/workout/__tests__/ExerciseCard.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// src/app/views/workout/__tests__/ExerciseCard.test.jsx
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import ExerciseCard from '../ExerciseCard';
import { logKey } from '../../../../protocols/body/workout/keys';

const baseProps = {
  goal: 'Muscle Gain', week: 2, dayIdx: 1,
  exercise: { name: 'Back Squats', sets: 3, reps: '5', rest: '120s' },
  wkLogs: {}, wkPRs: {}, wkSwaps: {},
  onSet: () => {}, onSwap: () => {}, onStartRest: () => {},
};

describe('ExerciseCard', () => {
  it('renders exercise name, sets × reps target, rest interval', () => {
    const { container } = render(<ExerciseCard {...baseProps} />);
    expect(container.textContent).toContain('Back Squats');
    expect(container.textContent).toContain('3');
    expect(container.textContent).toContain('5');
    expect(container.textContent).toContain('120s');
  });

  it('shows progression suggestion when prior-week data exists', () => {
    const wkLogs = {
      [logKey('Muscle Gain', 1, 1, 'Back Squats', 0)]: { wt: 225, r: 5, c: true },
      [logKey('Muscle Gain', 1, 1, 'Back Squats', 1)]: { wt: 225, r: 5, c: true },
      [logKey('Muscle Gain', 1, 1, 'Back Squats', 2)]: { wt: 225, r: 5, c: true },
    };
    const { container } = render(<ExerciseCard {...baseProps} wkLogs={wkLogs} />);
    expect(container.textContent).toContain('225');
    expect(container.textContent).toContain('230');
  });

  it('opens HowToModal when How-To button clicked', () => {
    const { container, getByText } = render(<ExerciseCard {...baseProps} />);
    fireEvent.click(getByText(/how-to/i));
    expect(container.textContent.toLowerCase()).toContain('form');
  });

  it('opens SwapModal when Swap button clicked', () => {
    const { container, getByText } = render(<ExerciseCard {...baseProps} />);
    fireEvent.click(getByText(/swap/i));
    expect(container.textContent.toLowerCase()).toContain('swap exercise');
  });

  it('calls onSwap(altName) when picking an alternative', () => {
    const onSwap = vi.fn();
    const { getByText } = render(<ExerciseCard {...baseProps} onSwap={onSwap} />);
    fireEvent.click(getByText(/swap/i));
    fireEvent.click(getByText('Leg Press'));
    expect(onSwap).toHaveBeenCalledWith('Leg Press');
  });

  it('calls onStartRest with parsed seconds when rest button clicked', () => {
    const onStartRest = vi.fn();
    const { getByText } = render(<ExerciseCard {...baseProps} onStartRest={onStartRest} />);
    fireEvent.click(getByText(/start.*rest/i));
    expect(onStartRest).toHaveBeenCalledWith(120, 'Back Squats');
  });

  it('renders the swapped-in exercise name when wkSwaps has an entry', () => {
    const { container } = render(
      <ExerciseCard {...baseProps} wkSwaps={{ 'Muscle Gain|2|1|Back Squats': 'Leg Press' }} />
    );
    expect(container.textContent).toContain('Leg Press');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/views/workout/__tests__/ExerciseCard.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```jsx
// src/app/views/workout/ExerciseCard.jsx
import React, { useState } from 'react';
import { P, FN, FD } from '../../../design/theme';
import { s } from '../../../design/styles';
import { swapKey } from '../../../protocols/body/workout/keys';
import {
  getProgressionSuggestion, parseRestSeconds,
} from '../../../protocols/body/workout/progression';
import SetGrid from './SetGrid';
import HowToModal from './HowToModal';
import SwapModal from './SwapModal';

export default function ExerciseCard({
  goal, week, dayIdx, exercise, wkLogs, wkPRs, wkSwaps,
  onSet, onSwap, onStartRest,
}) {
  const [showHowTo, setShowHowTo] = useState(false);
  const [showSwap, setShowSwap] = useState(false);

  const swappedTo = wkSwaps[swapKey(goal, week, dayIdx, exercise.name)] || null;
  const activeName = swappedTo || exercise.name;
  const activeExercise = { ...exercise, name: activeName };

  const suggestion = getProgressionSuggestion({ wkLogs, goal, week, dayIdx, exercise: activeExercise });
  const restSeconds = parseRestSeconds(exercise.rest);

  return (
    <div style={{ ...s.card, padding: 16, marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div>
          <div style={{ fontFamily: FD, fontSize: 17, fontWeight: 300, color: P.gW, fontStyle: 'italic' }}>
            {activeName}{swappedTo && (
              <span style={{ fontSize: 9, color: P.txD, marginLeft: 8, fontStyle: 'normal' }}>
                (swapped from {exercise.name})
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: P.txM, marginTop: 2 }}>
            {exercise.sets} × {exercise.reps} · Rest {exercise.rest}
          </div>
          {exercise.note && (
            <div style={{ fontSize: 10, color: P.txD, marginTop: 4, fontStyle: 'italic' }}>{exercise.note}</div>
          )}
        </div>
      </div>

      {suggestion && (
        <div style={{
          background: 'rgba(232,213,183,0.04)', border: '1px solid ' + P.bd,
          borderRadius: 10, padding: '8px 12px', margin: '10px 0',
          fontSize: 11, color: P.txS,
        }}>
          {suggestion.hitTarget ? (
            <>Last: <b>{suggestion.lastWeight}</b> lbs → Today: <b style={{ color: P.ok }}>{suggestion.nextWeight}</b> lbs (+{suggestion.delta})</>
          ) : (
            <>Hit all reps at <b>{suggestion.lastWeight}</b> lbs to unlock +{suggestion.unlockDelta}.</>
          )}
        </div>
      )}

      <SetGrid
        goal={goal} week={week} dayIdx={dayIdx} exercise={activeExercise}
        wkLogs={wkLogs} wkPRs={wkPRs} onSet={onSet}
      />

      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <button onClick={() => setShowHowTo(true)} style={{ ...s.btn, ...s.out, padding: '8px 14px', fontSize: 11 }}>
          How-To
        </button>
        <button onClick={() => setShowSwap(true)} style={{ ...s.btn, ...s.out, padding: '8px 14px', fontSize: 11 }}>
          Swap
        </button>
        {restSeconds > 0 && (
          <button
            onClick={() => onStartRest(restSeconds, activeName)}
            style={{ ...s.btn, ...s.pri, padding: '8px 14px', fontSize: 11, marginLeft: 'auto' }}
          >
            Start {restSeconds}s Rest
          </button>
        )}
      </div>

      {showHowTo && (
        <HowToModal exerciseName={activeName} onClose={() => setShowHowTo(false)} />
      )}
      {showSwap && (
        <SwapModal
          exerciseName={exercise.name}
          current={swappedTo}
          onPick={(alt) => { onSwap(alt); setShowSwap(false); }}
          onClose={() => setShowSwap(false)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/views/workout/__tests__/ExerciseCard.test.jsx`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/views/workout/ExerciseCard.jsx src/app/views/workout/__tests__/ExerciseCard.test.jsx
git commit -m "workout: add ExerciseCard composing SetGrid, modals, rest button"
```

---

## Task 10: `DeloadBanner.jsx`

Banner shown when `needsDeload(week)` is true. Pure presentation.

**Files:**
- Create: `src/app/views/workout/DeloadBanner.jsx`
- Test:   `src/app/views/workout/__tests__/DeloadBanner.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// src/app/views/workout/__tests__/DeloadBanner.test.jsx
import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import DeloadBanner from '../DeloadBanner';

describe('DeloadBanner', () => {
  it('renders the cut-volume guidance', () => {
    const { container } = render(<DeloadBanner />);
    expect(container.textContent.toLowerCase()).toContain('deload');
    expect(container.textContent).toContain('40');
    expect(container.textContent.toLowerCase()).toContain('volume');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/views/workout/__tests__/DeloadBanner.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```jsx
// src/app/views/workout/DeloadBanner.jsx
import React from 'react';
import { P, FN } from '../../../design/theme';

export default function DeloadBanner() {
  return (
    <div style={{
      background: 'rgba(251,191,36,0.08)',
      border: '1px solid rgba(251,191,36,0.25)',
      borderRadius: 12, padding: '12px 14px', marginBottom: 14,
      display: 'flex', alignItems: 'flex-start', gap: 10, fontFamily: FN,
    }}>
      <div style={{ fontSize: 16 }}>⚠</div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: P.warn, marginBottom: 2 }}>
          Deload week
        </div>
        <div style={{ fontSize: 11, color: P.txS, lineHeight: 1.5 }}>
          Cut volume 40–50% this week. Reduce all sets by half or drop weight 40%.
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/views/workout/__tests__/DeloadBanner.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/views/workout/DeloadBanner.jsx src/app/views/workout/__tests__/DeloadBanner.test.jsx
git commit -m "workout: add DeloadBanner for every-4th-week recovery alert"
```

---

## Task 11: `WorkoutView.jsx`

The composed view. Reads `profile.primary` → program, reads `protocolState.workout` for week/swaps/logs/PRs, picks a day (defaults to today's UTC day), and renders the strip + week selector + (optional) deload banner + workout header + one `<ExerciseCard>` per exercise. Manages the rest timer at the view level.

**Files:**
- Create: `src/app/views/WorkoutView.jsx`
- Test:   `src/app/views/__tests__/WorkoutView.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// src/app/views/__tests__/WorkoutView.test.jsx
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import WorkoutView from '../WorkoutView';
import { StateProvider, useAppState } from '../../../state/store';
import { logKey, prKey } from '../../../protocols/body/workout/keys';

function withState(ui, initialAction) {
  function Bootstrap() {
    const ctx = useAppState();
    React.useEffect(() => { initialAction && initialAction(ctx); }, []);
    return ui;
  }
  return <StateProvider><Bootstrap /></StateProvider>;
}

describe('WorkoutView', () => {
  beforeEach(() => { localStorage.clear(); });

  it('renders the Muscle Gain Monday workout header and at least one exercise', () => {
    const { container } = render(withState(
      <WorkoutView fixedDayIdx={1} />,
      (ctx) => ctx.setProfile({ primary: 'Muscle Gain' }),
    ));
    expect(container.textContent).toContain('Back & Biceps');
    expect(container.textContent).toContain('Conventional Deadlifts');
  });

  it('renders DeloadBanner on week 4', () => {
    const { container } = render(withState(
      <WorkoutView fixedDayIdx={1} />,
      (ctx) => {
        ctx.setProfile({ primary: 'Muscle Gain' });
        ctx.setProtocolState('workout', { wkWeek: 4 });
      },
    ));
    expect(container.textContent.toLowerCase()).toContain('deload week');
  });

  it('renders nothing-to-do state on a rest day', () => {
    const { container } = render(withState(
      <WorkoutView fixedDayIdx={6} />,           // Saturday = Rest for Muscle Gain
      (ctx) => ctx.setProfile({ primary: 'Muscle Gain' }),
    ));
    expect(container.textContent.toLowerCase()).toContain('rest');
  });

  it('persists a logged set into protocolState.workout.wkLogs', () => {
    let snap;
    function Spy() { snap = useAppState().state; return null; }
    const { container } = render(
      <StateProvider>
        <Spy />
        <BootstrapAndView />
      </StateProvider>
    );
    function BootstrapAndView() {
      const ctx = useAppState();
      React.useEffect(() => { ctx.setProfile({ primary: 'Muscle Gain' }); }, []);
      return <WorkoutView fixedDayIdx={1} />;
    }
    // First weight input on the page
    const weightInput = container.querySelector('input[type="number"]');
    fireEvent.change(weightInput, { target: { value: '315' } });
    // Allow store debounce + render
    expect(weightInput.value).toBe('315');
    const goal = 'Muscle Gain';
    // Find any wkLogs entry for week 1 / Conventional Deadlifts / set 0
    const expectedKey = logKey(goal, 1, 1, 'Conventional Deadlifts', 0);
    expect(snap.protocolState.workout.wkLogs[expectedKey]?.wt).toBe(315);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/views/__tests__/WorkoutView.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```jsx
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

export default function WorkoutView({ fixedDayIdx }) {
  const { state, setProtocolState } = useAppState();
  const { profile, protocolState } = state;
  const wk = protocolState.workout || { wkWeek: 1, wkLogs: {}, wkPRs: {}, wkSwaps: {} };
  const goal = profile.primary || 'Wellness';
  const resolvedGoal = GOAL_ALIASES[goal] || goal;
  const program = getProgram(goal);

  const todayIdx = new Date().getUTCDay();
  const initialDay = fixedDayIdx != null ? fixedDayIdx : (wk.wkViewDay ?? todayIdx);
  const [dayIdx, setDayIdx] = useState(initialDay);
  const [rest, setRest] = useState(null); // { seconds, name }

  const dayWorkout = program[dayIdx];
  const week = wk.wkWeek || 1;

  const setLog = useCallback((exName, setIdx, entry) => {
    const k = logKey(resolvedGoal, week, dayIdx, exName, setIdx);
    const nextLogs = { ...wk.wkLogs, [k]: entry };
    // PR update on complete: if marked complete and weight > recorded PR
    let nextPRs = wk.wkPRs;
    if (entry.c && entry.wt) {
      const pk = prKey(resolvedGoal, exName);
      const cur = nextPRs[pk] || 0;
      const w = Number(entry.wt) || 0;
      if (w > cur) nextPRs = { ...nextPRs, [pk]: w };
    }
    setProtocolState('workout', { wkLogs: nextLogs, wkPRs: nextPRs });
  }, [resolvedGoal, week, dayIdx, wk.wkLogs, wk.wkPRs, setProtocolState]);

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
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/views/__tests__/WorkoutView.test.jsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Run full suite to confirm nothing regressed**

Run: `npm test`
Expected: PASS — full suite green.

- [ ] **Step 6: Commit**

```bash
git add src/app/views/WorkoutView.jsx src/app/views/__tests__/WorkoutView.test.jsx
git commit -m "workout: add WorkoutView composing day/week/exercises/rest"
```

---

## Task 12: Wire `WorkoutView` into the `body` tab

Today the `body` tab in `App.jsx` renders a generic "domain view" with goals + tasks. Replace that with `<WorkoutView />` for body. (Future BodyView sub-tabs — Peptides / Food / Tools — are out of scope here; this task just gets the Train tab on screen.)

**Files:**
- Modify: `src/app/App.jsx`

- [ ] **Step 1: Import WorkoutView at the top of App.jsx**

```jsx
import WorkoutView from './views/WorkoutView';
```

(Add after the existing `import RoutineView from '../routine/RoutineView';` line.)

- [ ] **Step 2: Render WorkoutView inside the body branch**

Replace the existing body-branch JSX. Find the block that begins with `/* Domain tab view */` and the IIFE that follows. At the very top of the IIFE return — before the generic "Domain Goals / Today's tasks / Domain description" cards — add a branch that returns `<WorkoutView />` when `activeTab === 'body'`. Concretely, change:

```jsx
        ) : (
          /* Domain tab view */
          (() => {
            const domain = DOMAINS.find(d => d.id === activeTab);
            const domainGoals = activeGoals.filter(g => g.domain === activeTab);
            const domainTasks = routine.scheduled.filter(t => {
              const proto = protocolMap[t.protocolId];
              return proto && proto.domain === activeTab;
            });
            return (
              <div>
                <H t={(domain?.icon || '') + ' ' + (domain?.name || activeTab)}
                  sub={domain?.sub || ''} />
```

to:

```jsx
        ) : (
          /* Domain tab view */
          (() => {
            const domain = DOMAINS.find(d => d.id === activeTab);
            if (activeTab === 'body') {
              return (
                <div>
                  <H t={(domain?.icon || '') + ' ' + (domain?.name || activeTab)}
                    sub={domain?.sub || ''} />
                  <WorkoutView />
                </div>
              );
            }
            const domainGoals = activeGoals.filter(g => g.domain === activeTab);
            const domainTasks = routine.scheduled.filter(t => {
              const proto = protocolMap[t.protocolId];
              return proto && proto.domain === activeTab;
            });
            return (
              <div>
                <H t={(domain?.icon || '') + ' ' + (domain?.name || activeTab)}
                  sub={domain?.sub || ''} />
```

(Keep the rest of the IIFE unchanged.)

- [ ] **Step 3: Manually verify in dev**

Run: `npm run dev:app` (Vite, port 5173)

In another terminal, leave the server running. Open `http://localhost:5173/`. Steps to verify:
1. On the Profile tab, set Name and add a body goal (e.g., "Muscle Gain") via Add Goal so `profile.primary` is `Muscle Gain`.
2. Tap the Body tab. Expect: Goal label, Week 1 with phase "Foundation", day strip S M T W T F S with Saturday shown as rest dot color.
3. Tap each weekday letter — the workout header should change (Chest & Triceps, Back & Biceps, etc.).
4. On a non-rest day, enter `225` in a weight cell and toggle the checkbox. Reload the page; the value persists.
5. Re-enter `230` and complete it — a PR badge should appear because `230 > 225`.
6. Tap "How-To" on any exercise — modal renders with muscles/form/tips and a Watch Form Video link to YouTube.
7. Tap "Swap" — see EXERCISE_ALTS for that exercise (e.g., for Back Squats: Goblet Squats, Leg Press, Front Squats, Hack Squat).
8. Tap "Start Xs Rest" — floating bar counts down; on mobile, vibration triggers at 0.
9. Tap the `>` arrow until week 4 — DeloadBanner appears.

Stop the dev server when done. Run the full test suite once more.

Run: `npm test`
Expected: PASS — all tests green.

- [ ] **Step 4: Commit**

```bash
git add src/app/App.jsx
git commit -m "workout: render WorkoutView under the body tab"
```

---

## Self-Review Notes (for the engineer)

- **Persistence:** The `useAppState` store debounces a `localStorage.setItem` 500ms after any change. Tests that read state immediately after dispatch see the new state synchronously (debounce only delays the write to disk).
- **Day index:** Always use `date.getUTCDay()` for day arithmetic. The protocol layer (`workout/index.js`) uses UTC; mixing local-day here would break completion alignment.
- **PR weights:** Updated only when `c=true` is sent with a numeric `wt`. Wiping a checkbox doesn't reverse a PR — that's intentional; a logged PR is historical.
- **Swap scope:** Stored keyed by week + day + original exercise name. Swapping does not migrate prior logs — a swap is a per-day override that re-uses the original's set/rep targets. Progression suggestions look at the *swapped* name's history, so a fresh swap shows no suggestion (correct behavior).
- **Rest timer:** Lives at the view level so navigating exercises doesn't unmount it mid-countdown. Only one timer at a time — starting a new one replaces the active one.
- **Tests vs UI:** Component tests use `@testing-library/react` + `happy-dom`. `fireEvent.change` synchronously triggers `onChange`. `vi.useFakeTimers()` + `act` for timer assertions.
