import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, cleanup, fireEvent } from '@testing-library/react';
import RoutineView from '../RoutineView';

afterEach(() => {
  cleanup();
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
