// Task 13 — HomeDashboard: protocol-score ring, stat tiles (incl. the
// adaptedTarget=0 sentinel gate — binding review handoff), check-in dots,
// mood strip, check-in tap, and the v2 cycle-phase banner.
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, cleanup } from '@testing-library/react';
import HomeDashboard from '../HomeDashboard';
import { CHECKIN_FIELDS } from '../../state/checkin.js';

const TODAY = '2026-07-10';

// Mirrors the component's own 7-day-window date math exactly (oldest -> newest).
function datesBack(today, n) {
  const arr = [];
  for (let i = n; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    arr.push(d.toISOString().slice(0, 10));
  }
  return arr;
}

// Routes a color string through the DOM's own CSS normalizer so the
// assertion doesn't have to guess happy-dom's serialized rgb()/hex format.
function normalizedColor(color) {
  const probe = document.createElement('div');
  probe.style.background = color;
  return probe.style.background;
}

const BASE_PROFILE = { name: 'Jordan Smith', weight: 195 };
const BASE_ROUTINE = { scheduled: [{ id: 't1' }, { id: 't2' }, { id: 't3' }, { id: 't4' }], deferred: [], upsells: [], retention: [] };

function renderHome(props) {
  return render(
    <HomeDashboard
      profile={BASE_PROFILE}
      logs={{}}
      today={TODAY}
      routine={BASE_ROUTINE}
      completedTasks={[]}
      adaptive={null}
      day={new Date(TODAY)}
      {...props}
    />
  );
}

describe('HomeDashboard', () => {
  afterEach(() => cleanup());

  it('renders the protocol-score ring', () => {
    const { container } = renderHome({});
    expect(container.querySelector('[data-testid="protocol-score-ring"]')).toBeTruthy();
  });

  describe('calories stat tile', () => {
    it('shows target minus sumDayMeals(logs.food[today]) when adaptedTarget > 0', () => {
      const adaptive = { adaptedTarget: 1850, pace: 'on_track', paceLabel: 'On Track', daysRemaining: 30 };
      const logs = { food: { [TODAY]: [{ cal: 400 }, { cal: 200 }] } }; // consumed = 600
      const { container } = renderHome({ adaptive, logs, completedTasks: ['t1', 't2', 't3'] });

      const tile = container.querySelector('[data-testid="calories-tile"]');
      expect(tile.textContent).toContain('1,250'); // 1850 - 600
      expect(tile.textContent).toContain('left');
    });

    it('gates on adaptedTarget > 0 — sentinel 0 shows an add-your-details state, never a fabricated number', () => {
      // adaptedTarget: 0 is the "no valid profile" sentinel (not nullish) —
      // per the binding review handoff, this must NOT fall back to
      // calcCalorieTarget or do target(0) - consumed math.
      const adaptive = { adaptedTarget: 0, pace: 'no_goal', paceLabel: 'Set a goal weight + date to activate adaptive mode', daysRemaining: null };
      const logs = { food: { [TODAY]: [{ cal: 500 }] } };
      const { container } = renderHome({ adaptive, logs });

      const tile = container.querySelector('[data-testid="calories-tile"]');
      expect(tile.textContent).toContain('—');
      expect(tile.textContent).toContain('add your details');
      expect(tile.textContent).not.toContain('-500'); // no fabricated 0-500 negative math leaking through
    });
  });

  it('routine + weight stat tiles reflect completedTasks/routine.scheduled and logs.weight', () => {
    const adaptive = { adaptedTarget: 1850, pace: 'on_track', paceLabel: 'On Track', daysRemaining: 30 };
    const logs = {
      weight: [{ date: '2026-07-01', weight: 200 }, { date: TODAY, weight: 195 }],
    };
    const { container } = renderHome({ adaptive, logs, completedTasks: ['t1', 't2', 't3'] });

    const routineTile = container.querySelector('[data-testid="routine-tile"]');
    expect(routineTile.textContent).toContain('75%');
    expect(routineTile.textContent).toContain('3/4');

    const weightTile = container.querySelector('[data-testid="weight-tile"]');
    expect(weightTile.textContent).toContain('195');
    expect(weightTile.textContent).toContain('30d left');
  });

  it('I3: an orphan completed id (completed but not in routine.scheduled) does not push the routine tile past 100%', () => {
    // 1 scheduled task, both a real completion (t1) and an orphan id present.
    const routine = { scheduled: [{ id: 't1' }], deferred: [], upsells: [], retention: [] };
    const { container } = renderHome({ routine, completedTasks: ['t1', 'orphan-checkin'] });

    const routineTile = container.querySelector('[data-testid="routine-tile"]');
    expect(routineTile.textContent).toContain('100%');   // not 200%
    expect(routineTile.textContent).toContain('1/1');
    expect(routineTile.textContent).not.toContain('200%');

    // The protocol-score ring shares the same intersection — its dash arc must
    // stay non-negative (a >100 score would render a negative second dash).
    const ringArc = container.querySelectorAll('[data-testid="protocol-score-ring"] circle')[1];
    const [, remainder] = ringArc.getAttribute('stroke-dasharray').split(' ').map(Number);
    expect(remainder).toBeGreaterThanOrEqual(0);
  });

  it('check-in dots reflect seeded logs.checkins across the 7-day window', () => {
    const dates = datesBack(TODAY, 6); // oldest -> newest, dates[6] === TODAY
    const logs = {
      checkins: {
        [dates[0]]: { mood: 2 },
        [dates[3]]: { mood: 4, energy: 3 },
        [dates[6]]: { mood: 5 },
      },
    };
    const { container } = renderHome({ logs });

    const dots = [...container.querySelectorAll('[data-testid="checkin-dot"]')];
    expect(dots).toHaveLength(7);
    const hits = dots.map(d => d.getAttribute('data-hit'));
    expect(hits).toEqual(['true', 'false', 'false', 'true', 'false', 'false', 'true']);
  });

  it('mood strip renders correctly colored cells from the mood field, only for days with a mood value', () => {
    const dates = datesBack(TODAY, 6);
    const logs = {
      checkins: {
        [dates[0]]: { mood: 2 },
        [dates[6]]: { mood: 5 },
      },
    };
    const { container } = renderHome({ logs });

    const cells = [...container.querySelectorAll('[data-testid="mood-cell"]')];
    expect(cells).toHaveLength(7);

    const moodColors = CHECKIN_FIELDS.find(f => f.id === 'mood').colors;
    expect(cells[0].getAttribute('data-value')).toBe('2');
    expect(cells[0].style.background).toBe(normalizedColor(moodColors[1])); // value 2 -> colors[1]
    expect(cells[6].getAttribute('data-value')).toBe('5');
    expect(cells[6].style.background).toBe(normalizedColor(moodColors[4])); // value 5 -> colors[4]

    // A day with no mood value falls back to the unfilled cell background.
    expect(cells[3].getAttribute('data-value')).toBe('');
  });

  it('does not render the mood strip when no check-in has a mood value', () => {
    const { container } = renderHome({ logs: {} });
    expect(container.querySelectorAll('[data-testid="mood-cell"]')).toHaveLength(0);
  });

  it('tapping the check-in card fires onCheckinTap', () => {
    const onCheckinTap = vi.fn();
    const { container } = renderHome({ onCheckinTap });
    container.querySelector('[data-testid="checkin-card"]').click();
    expect(onCheckinTap).toHaveBeenCalledTimes(1);
  });

  describe('cycle-phase banner (v2 addition)', () => {
    it('renders the phase name + waterRetention note when profile.cycleData resolves a phase', () => {
      // lastPeriod === today -> dayInCycle 1 -> Menstrual phase (deterministic, see cycle.js).
      const profile = { ...BASE_PROFILE, cycleData: { enabled: true, lastPeriod: TODAY } };
      const { container } = renderHome({ profile });

      const banner = container.querySelector('[data-testid="cycle-banner"]');
      expect(banner).toBeTruthy();
      expect(banner.textContent).toContain('Menstrual');
      expect(banner.textContent).toContain('Water retention');
    });

    it('does not render when profile.cycleData is absent', () => {
      const { container } = renderHome({ profile: BASE_PROFILE });
      expect(container.querySelector('[data-testid="cycle-banner"]')).toBeFalsy();
    });

    it('does not render when cycleData is present but disabled (getCycleInfo yields no phase)', () => {
      const profile = { ...BASE_PROFILE, cycleData: { enabled: false, lastPeriod: TODAY } };
      const { container } = renderHome({ profile });
      expect(container.querySelector('[data-testid="cycle-banner"]')).toBeFalsy();
    });
  });
});
