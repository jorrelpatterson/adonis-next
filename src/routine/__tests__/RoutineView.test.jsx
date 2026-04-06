import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import RoutineView from '../RoutineView';

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
