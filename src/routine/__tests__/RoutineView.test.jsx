import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, cleanup, fireEvent, act } from '@testing-library/react';

// useLongPress.js (the long-press-to-open-context-menu gesture) also fires
// haptics.medium() — must be stubbed too or the I4 propagation tests below
// (which drive a real long press) throw "haptics.medium is not a function".
vi.mock('../../design/haptics', () => ({
  haptics: { light: vi.fn(), medium: vi.fn(), selection: vi.fn() },
}));

import RoutineView from '../RoutineView';
import { haptics } from '../../design/haptics';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('RoutineView', () => {
  it('renders empty state when no tasks', () => {
    const routine = { scheduled: [], deferred: [], upsells: [], retention: [] };
    const { container } = render(<RoutineView routine={routine} day={new Date('2026-04-06')} />);
    expect(container.textContent).toContain('No tasks yet');
  });

  it('renders scheduled tasks', () => {
    const routine = {
      scheduled: [
        { id: 't1', title: 'Push Day', type: 'guided', category: 'training', time: '06:00' },
        { id: 't2', title: 'Tirzepatide', type: 'guided', category: 'peptide', time: '07:30', goalTitle: 'Lose 30lbs' },
      ],
      deferred: [], upsells: [], retention: [],
    };
    const { container } = render(<RoutineView routine={routine} day={new Date('2026-04-06')} />);
    expect(container.textContent).toContain('Push Day');
    expect(container.textContent).toContain('Tirzepatide');
    expect(container.textContent).toContain('Lose 30lbs');
  });

  it('renders day selector with 7 days', () => {
    const routine = { scheduled: [], deferred: [], upsells: [], retention: [] };
    const { container } = render(<RoutineView routine={routine} day={new Date('2026-04-06')} />);
    // S M T W T F S = 7 buttons
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThanOrEqual(7);
  });

  it('preserves data-testid day-chip hooks (App.test.jsx day-navigation regression)', () => {
    const routine = { scheduled: [], deferred: [], upsells: [], retention: [] };
    const { container } = render(<RoutineView routine={routine} day={new Date('2026-04-06')} />);
    for (let i = 0; i < 7; i++) {
      expect(container.querySelector(`[data-testid="day-chip-${i}"]`)).toBeTruthy();
    }
  });

  it('shows deferred count', () => {
    const routine = {
      scheduled: [], upsells: [], retention: [],
      deferred: [{ id: 'd1' }, { id: 'd2' }, { id: 'd3' }],
    };
    const { container } = render(<RoutineView routine={routine} day={new Date('2026-04-06')} />);
    expect(container.textContent).toContain('3 tasks deferred');
  });

  it('renders goal progress summary', () => {
    const routine = { scheduled: [], deferred: [], upsells: [], retention: [] };
    const goals = [{ id: 'g1', title: 'Lose 30lbs', progress: { percent: 33, trend: 'on_track' } }];
    const { container } = render(<RoutineView routine={routine} day={new Date('2026-04-06')} goals={goals} />);
    expect(container.textContent).toContain('Lose 30lbs');
    expect(container.textContent).toContain('33%');
  });
});

// ─── Task 14: time-block calendar ──────────────────────────────────────────
describe('RoutineView — time-block calendar (Task 14)', () => {
  it('groups tasks under time-block headers spanning morning and evening', () => {
    const routine = {
      scheduled: [
        { id: 'm1', title: 'Creatine', type: 'guided', category: 'supplement', time: '06:00' },
        { id: 'e1', title: 'Wind Down', type: 'guided', category: 'evening', time: '20:00' },
      ],
      deferred: [], upsells: [], retention: [],
    };
    const { container } = render(<RoutineView routine={routine} day={new Date('2026-04-06')} />);
    expect(container.textContent).toContain('Morning');
    expect(container.textContent).toContain('Evening');
    expect(container.textContent).toContain('Creatine');
    expect(container.textContent).toContain('Wind Down');
  });

  it('collapses 2+ training tasks into a group row, while a peptide task stays top-level (ungrouped)', () => {
    const routine = {
      scheduled: [
        // Group summary picks the task with `duration > 0` as its "main"
        // title (see group-by-time.js's buildGroupSummary) — give it one so
        // the summary subtitle reads "Full Body Workout · 45 min" and never
        // collides with the per-exercise task title we assert is hidden.
        { id: 'tr1', title: 'Full Body Workout', type: 'guided', category: 'training', time: '07:00', duration: 45 },
        { id: 'tr2', title: 'Squat 3x10', type: 'guided', category: 'training', time: '07:10' },
        { id: 'pep1', title: 'Tirzepatide', type: 'guided', category: 'peptide', time: '07:30' },
      ],
      deferred: [], upsells: [], retention: [],
    };
    const { container } = render(<RoutineView routine={routine} day={new Date('2026-04-06')} />);

    // Peptide task is never grouped — its title is visible immediately.
    expect(container.textContent).toContain('Tirzepatide');

    // Training tasks (2+) collapse into a summary group row instead of
    // rendering each individual task title directly.
    expect(container.textContent).toContain('Training');
    expect(container.textContent).not.toContain('Squat 3x10');

    // Expanding the group reveals the individual task titles.
    const groupButton = Array.from(container.querySelectorAll('button'))
      .find(b => b.textContent.includes('Training'));
    expect(groupButton).toBeTruthy();
    fireEvent.click(groupButton);
    expect(container.textContent).toContain('Full Body Workout');
    expect(container.textContent).toContain('Squat 3x10');
  });
});

// ─── Task 14: adaptive pace banner ─────────────────────────────────────────
describe('RoutineView — adaptive pace banner (Task 14)', () => {
  it('shows "Off Pace" copy when adaptive.pace === "off_pace" (wrong-direction weight progress)', () => {
    const today = '2026-01-01';
    const targetDate = '2026-02-19'; // 49 days => 7 weeks
    const profile = {
      weight: 200, hFt: 5, hIn: 2, age: 30, gender: 'female', activity: 'active',
      goalW: 182.5, targetDate,
    };
    const logs = {
      weight: [
        { date: '2025-12-20', weight: 198 },
        { date: '2025-12-27', weight: 199 },
        { date: '2026-01-01', weight: 200 }, // gaining trend while goal is losing
      ],
    };
    const routine = { scheduled: [], deferred: [], upsells: [], retention: [] };
    const { container } = render(
      <RoutineView
        routine={routine}
        day={new Date(today)}
        today={today}
        profile={profile}
        logs={logs}
      />
    );
    expect(container.textContent).toContain('Off Pace');
  });
});

// ─── I4: context menu does not bubble into onTaskTap ───────────────────────
describe('RoutineView — TaskContextMenu propagation (I4)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  // The context menu is rendered INSIDE the tappable check-in row. Long-press
  // opens it; a click on any menu surface must NOT bubble back up into the
  // row's onClick (onTaskTap) — which would pop a surprise CheckinModal.
  function openMenu(container) {
    const row = container.querySelector('div[style*="user-select"]');
    fireEvent.mouseDown(row);
    act(() => { vi.advanceTimersByTime(500); }); // long-press delay (480ms)
    fireEvent.mouseUp(row);
    // Consume the long-press "fired" latch the way the real release-click does,
    // so the subsequent menu-item click reaches its target.
    fireEvent.click(row);
    return row;
  }

  const checkinRoutine = {
    scheduled: [{ id: 'ci', title: 'Daily Check-in', type: 'check-in', category: 'checkin', time: '08:00' }],
    deferred: [], upsells: [], retention: [],
  };

  it('clicking "Mark complete" in the menu checks the task without firing onTaskTap', () => {
    const onTaskTap = vi.fn();
    const onCheckTask = vi.fn();
    const { container, getByText } = render(
      <RoutineView routine={checkinRoutine} day={new Date('2026-04-06')} today="2026-04-06"
        onTaskTap={onTaskTap} onCheckTask={onCheckTask} completedTasks={[]} />
    );
    openMenu(container);
    expect(container.textContent).toContain('Mark complete'); // menu is open

    fireEvent.click(getByText('Mark complete'));
    expect(onCheckTask).toHaveBeenCalledWith('ci');
    expect(onTaskTap).not.toHaveBeenCalled();
  });

  it('clicking the backdrop dismisses the menu without firing onTaskTap', () => {
    const onTaskTap = vi.fn();
    const { container } = render(
      <RoutineView routine={checkinRoutine} day={new Date('2026-04-06')} today="2026-04-06"
        onTaskTap={onTaskTap} onCheckTask={vi.fn()} completedTasks={[]} />
    );
    openMenu(container);
    const backdrop = container.querySelector('div[style*="z-index: 11000"]');
    expect(backdrop).toBeTruthy();

    fireEvent.click(backdrop);
    expect(container.textContent).not.toContain('Mark complete'); // menu closed
    expect(onTaskTap).not.toHaveBeenCalled();
  });
});

// ─── I5: exercise sub-tasks render as ExerciseDetail, parent stays checkable ─
describe('RoutineView — exercise sub-tasks as ExerciseDetail (I5)', () => {
  // Shape mirrors workout getTasks: parent session task (duration + data.
  // exercises, no data.exercise) + per-exercise sub-tasks (data.exercise).
  // All time:null so they land in the same time block and collapse into one
  // training group, exactly as in production.
  const routine = {
    scheduled: [
      { id: 'workout-1', title: 'Push Day', type: 'guided', category: 'training', time: null, duration: 45, data: { exercises: [{}, {}] } },
      { id: 'exercise-1-0', title: 'Bench Press', type: 'guided', category: 'training', time: null, data: { exercise: { name: 'Bench Press', sets: 4, reps: 8, rest: '90s' } } },
      { id: 'exercise-1-1', title: 'Overhead Press', type: 'guided', category: 'training', time: null, data: { exercise: { name: 'Overhead Press', sets: 3, reps: 10, rest: '90s' } } },
    ],
    deferred: [], upsells: [], retention: [],
  };

  function expandGroup(container) {
    const groupBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent.includes('Training'));
    fireEvent.click(groupBtn);
  }

  it('renders each exercise sub-task as an expandable ExerciseDetail form-guide row', () => {
    const { container } = render(<RoutineView routine={routine} day={new Date('2026-04-06')} onCheckTask={vi.fn()} completedTasks={[]} />);
    expandGroup(container);
    // Expand the Bench Press row — the "Watch … Video/YouTube" form-guide link
    // is emitted ONLY by ExerciseDetail, never by a plain checkbox TaskRow.
    const exBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent.includes('Bench Press'));
    fireEvent.click(exBtn);
    expect(container.textContent).toMatch(/Watch/);
  });

  it('group checkmark reflects only completable tasks — detail-only exercise rows are excluded from the denominator', () => {
    // workout-1 is the only completable task in this group; the two
    // exercise-detail sub-tasks are informational and checkbox-less. Marking
    // just workout-1 done must flip the group to "all done" (✓), not get
    // stuck at 1/3 forever because the detail rows can never be completed.
    const { container } = render(
      <RoutineView routine={routine} day={new Date('2026-04-06')} onCheckTask={vi.fn()} completedTasks={['workout-1']} />
    );
    const groupButton = Array.from(container.querySelectorAll('button')).find(b => b.textContent.includes('Training'));
    expect(groupButton.textContent).toContain('✓');
  });

  it('keeps the parent workout row checkable (its checkbox checks workout-1, not an exercise)', () => {
    const onCheckTask = vi.fn();
    const { container } = render(<RoutineView routine={routine} day={new Date('2026-04-06')} onCheckTask={onCheckTask} completedTasks={[]} />);
    expandGroup(container);
    // The only empty-text button in the expanded group is the parent's round
    // checkbox — exercise rows are ExerciseDetail headers that carry text.
    const emptyBtns = Array.from(container.querySelectorAll('button')).filter(b => b.textContent.trim() === '');
    expect(emptyBtns.length).toBe(1);
    fireEvent.click(emptyBtns[0]);
    expect(onCheckTask).toHaveBeenCalledWith('workout-1');
  });
});

// ─── I6: recap must not fire on a browsed Sunday ────────────────────────────
describe('RoutineView — Sunday recap gated on viewing real today (I6)', () => {
  it('browsing a future Sunday chip on a non-Sunday today does NOT surface the recap', () => {
    const WED = '2026-01-07'; // Wednesday (real today)
    const FUTURE_SUNDAY = new Date('2026-01-11T12:00:00Z'); // Sunday, but not today
    const routine = { scheduled: [], deferred: [], upsells: [], retention: [] };
    const logs = { routine: { [WED]: ['t1'] } };
    const { container } = render(
      <RoutineView routine={routine} day={FUTURE_SUNDAY} today={WED} logs={logs} profile={{}} />
    );
    expect(container.textContent).not.toContain('Sunday Recap');
  });
});

// ─── Task 14: Sunday recap + dismissal ─────────────────────────────────────
describe('RoutineView — Sunday WeeklyRecap (Task 14)', () => {
  const SUNDAY = '2026-01-11'; // Sunday (UTC) — matches WeeklyRecap.test.jsx fixture

  // The sandboxed test env's ambient `localStorage` global is a non-functional
  // stub (no working setItem/getItem persistence) — same pattern as
  // src/views/components/__tests__/streak-ui.test.jsx and
  // src/services/__tests__/useAuth.test.jsx.
  let store;
  let fakeLocalStorage;

  beforeEach(() => {
    store = new Map();
    fakeLocalStorage = {
      getItem: vi.fn((k) => (store.has(k) ? store.get(k) : null)),
      setItem: vi.fn((k, v) => store.set(k, String(v))),
      removeItem: vi.fn((k) => store.delete(k)),
      clear: vi.fn(() => store.clear()),
    };
    vi.stubGlobal('localStorage', fakeLocalStorage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the recap card on a Sunday when there is routine/exercise data', () => {
    const routine = { scheduled: [], deferred: [], upsells: [], retention: [] };
    const logs = { routine: { [SUNDAY]: ['t1'] } };
    const { container } = render(
      <RoutineView
        routine={routine}
        day={new Date(`${SUNDAY}T12:00:00Z`)}
        today={SUNDAY}
        logs={logs}
        profile={{}}
      />
    );
    expect(container.textContent).toContain('Sunday Recap');
  });

  it('dismissing the recap hides it and persists the caller-owned dismissal key', () => {
    const routine = { scheduled: [], deferred: [], upsells: [], retention: [] };
    const logs = { routine: { [SUNDAY]: ['t1'] } };
    const { container } = render(
      <RoutineView
        routine={routine}
        day={new Date(`${SUNDAY}T12:00:00Z`)}
        today={SUNDAY}
        logs={logs}
        profile={{}}
      />
    );
    expect(container.textContent).toContain('Sunday Recap');

    const closeButton = Array.from(container.querySelectorAll('button'))
      .find(b => b.textContent.includes('Continue the Week'));
    expect(closeButton).toBeTruthy();
    fireEvent.click(closeButton);

    expect(container.textContent).not.toContain('Sunday Recap');
    expect(fakeLocalStorage.getItem(`adonis_recap_dismissed_${SUNDAY}`)).toBe('1');
  });
});

// ─── iOS P2 Task 2b: task check-off calls onCheckTask ──────────────────────
// The check-off haptic used to fire LOCALLY here (asserted via haptics.light
// below); Task 2b centralized it into App.jsx's handleCheckTask so the 7
// domain views' task cards get the same tick, not just Routine (see
// App.test.jsx's "handleCheckTask fires the check-off haptic centrally"
// suite for that coverage now). RoutineView-in-isolation (onCheckTask
// mocked, as here) no longer fires any haptic itself — these two tests now
// assert RoutineView's real responsibility instead: it calls onCheckTask on
// both the completing AND the unchecking edge (the caller — App, in
// production — decides which edge gets the haptic).
describe('RoutineView — task check-off calls onCheckTask', () => {
  const routine = {
    scheduled: [{ id: 't1', title: 'Push Day', type: 'guided', category: 'training', time: '06:00' }],
    deferred: [], upsells: [], retention: [],
  };

  it('calls onCheckTask when checking off an incomplete task', () => {
    const onCheckTask = vi.fn();
    const { container } = render(
      <RoutineView routine={routine} day={new Date('2026-04-06')} onCheckTask={onCheckTask} completedTasks={[]} />
    );
    // The lone checkbox for an unchecked, non-auto, non-browse task renders
    // with no glyph — same lookup the existing "keeps the parent workout
    // row checkable" test (I5) uses for an empty-text checkbox button.
    const checkboxBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent.trim() === '');
    expect(checkboxBtn).toBeTruthy();

    fireEvent.click(checkboxBtn);
    expect(onCheckTask).toHaveBeenCalledTimes(1);
    expect(onCheckTask).toHaveBeenCalledWith('t1');
    expect(haptics.light).not.toHaveBeenCalled();
  });

  it('calls onCheckTask when unchecking an already-completed task', () => {
    const onCheckTask = vi.fn();
    const { container } = render(
      <RoutineView routine={routine} day={new Date('2026-04-06')} onCheckTask={onCheckTask} completedTasks={['t1']} />
    );
    const checkboxBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent.trim() === '✓');
    expect(checkboxBtn).toBeTruthy();

    fireEvent.click(checkboxBtn);
    expect(onCheckTask).toHaveBeenCalledTimes(1);
    expect(onCheckTask).toHaveBeenCalledWith('t1');
    expect(haptics.light).not.toHaveBeenCalled();
  });
});
