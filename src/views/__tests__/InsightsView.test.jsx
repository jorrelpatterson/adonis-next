// src/views/__tests__/InsightsView.test.jsx
import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import InsightsView from '../InsightsView';

// Build { 'YYYY-MM-DD': values } maps the same way the golden insights test
// does (tests/golden/insights.golden.test.js) — insertion order is what
// generateInsights's slice(-7) recency window operates on.
const days = (n, values) =>
  Object.fromEntries(
    Array.from({ length: n }, (_, i) => [
      `2026-07-${String(i + 1).padStart(2, '0')}`,
      typeof values === 'function' ? values(i) : { ...values },
    ])
  );

// Matches tests/golden/insights.golden.test.js's ROUGH fixture — triggers
// every generateInsights warning branch (energy/sleep/mood/stress/focus) plus
// the info-level appetite branch, per tests/golden/fixtures/insights.json.
const ROUGH = { mood: 2, energy: 2, sleep: 2, stress: 4, appetite: 5, skin: 2, focus: 2, soreness: 2 };

describe('InsightsView', () => {
  it('renders the Insights hero header', () => {
    const { container } = render(<InsightsView profile={{}} logs={{}} />);
    expect(container.textContent).toContain('Insights');
  });

  it('renders the 90-day consistency heatmap (90 day cells)', () => {
    const { container } = render(<InsightsView profile={{}} logs={{}} />);
    expect(container.textContent).toContain('90-Day Consistency');
    const cells = container.querySelectorAll('[title*="signals"]');
    expect(cells.length).toBe(90);
  });

  it('heatmap cells reflect logged activity for seeded logs', () => {
    const today = new Date().toISOString().slice(0, 10);
    const logs = {
      routine: { [today]: ['t1'] },
      food: { [today]: [{ name: 'Chicken', cal: 280, p: 53, c: 0, f: 6 }] },
      weight: [{ date: today, weight: 200 }],
      checkins: { [today]: { mood: 4, energy: 4, sleep: 4, stress: 4 } },
    };
    const { container } = render(<InsightsView profile={{}} logs={logs} />);
    // Today's cell should report all 4 signals.
    // ' · ' separator disambiguates the heatmap cell's title from the 7-day
    // trend grid's same-date cells (title format: 'date: value/5').
    const todayCell = container.querySelector(`[title^="${today} ·"]`);
    expect(todayCell).toBeTruthy();
    expect(todayCell.getAttribute('title')).toContain('4/4 signals');
  });

  it('renders a Correlations section', () => {
    const { container } = render(<InsightsView profile={{}} logs={{}} />);
    expect(container.textContent).toContain('Correlations');
  });

  it('Correlations section renders the engine early-return prompt for empty logs', () => {
    const { container } = render(<InsightsView profile={{}} logs={{}} />);
    expect(container.textContent).toContain('Log at least 3 days of check-ins to unlock personalized insights.');
  });

  it('Correlations section renders generateInsights warning rows for a triggering (ROUGH) checkin shape', () => {
    const logs = { checkins: days(4, ROUGH), food: {} };
    const { container } = render(<InsightsView profile={{}} logs={logs} />);
    // Exact text from tests/golden/fixtures/insights.json's "rough week" case.
    expect(container.textContent).toContain(
      'Energy trending down. Consider CJC-1295/Ipamorelin or review caloric intake.'
    );
    expect(container.textContent).toContain('Sleep below baseline. DSIP or MK-677 before bed may help.');
    expect(container.textContent).toContain('Mood below baseline. Selank may help. Check protein and omega-3 intake.');
    expect(container.textContent).toContain('Stress elevated. Selank and magnesium glycinate recommended.');
  });

  it('Correlations section renders the "dialed in" success row for a strong-week shape', () => {
    const CHICKEN = { name: 'Chicken Breast (6oz)', cal: 280, p: 53, c: 0, f: 6 };
    const RICE = { name: 'White Rice (1 cup cooked)', cal: 205, p: 4, c: 45, f: 0 };
    const APPLE = { name: 'Apple (1 medium)', cal: 95, p: 0, c: 25, f: 0 };
    const GREAT = { mood: 5, energy: 5, sleep: 4, stress: 2, appetite: 3, skin: 4, focus: 4, soreness: 4 };
    const logs = {
      food: days(4, () => [CHICKEN, CHICKEN, CHICKEN, RICE, RICE, APPLE]),
      checkins: days(7, GREAT),
    };
    const { container } = render(<InsightsView profile={{}} logs={logs} />);
    expect(container.textContent).toContain('Energy and mood are excellent — your protocol is dialed in.');
  });

  it('renders the 7-day trend grid', () => {
    const { container } = render(<InsightsView profile={{}} logs={{}} />);
    expect(container.textContent).toContain('7-Day Trends');
    expect(container.textContent).toContain('Mood');
    expect(container.textContent).toContain('Sleep Quality');
  });

  it('renders the Analysis section empty-state prompt with no check-ins', () => {
    const { container } = render(<InsightsView profile={{}} logs={{}} />);
    expect(container.textContent).toContain('Analysis');
  });

  it('renders the weight-trend empty state with fewer than 2 weight entries', () => {
    const { container } = render(<InsightsView profile={{}} logs={{ weight: [{ date: '2026-07-01', weight: 200 }] }} />);
    expect(container.textContent).toContain('Log a few days of weight on the Body → Tools tab to see your trend.');
  });

  it('renders weight trend bars for 2+ weight entries', () => {
    const logs = {
      weight: [
        { date: '2026-07-01', weight: 200 },
        { date: '2026-07-02', weight: 198 },
      ],
    };
    const { container } = render(<InsightsView profile={{}} logs={logs} />);
    expect(container.textContent).not.toContain('Log a few days of weight on the Body → Tools tab to see your trend.');
    expect(container.textContent).toContain('198');
  });
});
