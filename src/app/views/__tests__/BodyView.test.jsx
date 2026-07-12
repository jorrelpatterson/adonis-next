// src/app/views/__tests__/BodyView.test.jsx
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import BodyView from '../BodyView';
import { StateProvider, useAppState } from '../../../state/store';

// WorkoutView's content varies by real weekday (training vs rest day), and on
// training days SetGrid renders a "Weight" column header that collides with
// the Weight sub-tab label under getByText. Pin the clock to a fixed training
// day and target the sub-tabs by their button role so the suite is
// deterministic on every weekday.
beforeAll(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date('2026-07-09T12:00:00Z')); // Thursday
});
afterAll(() => {
  vi.useRealTimers();
});

// BodyView is a pass-through seam per task-15-brief: App hands it
// profile/protocolStates/logs/log straight from useAppState(). WorkoutView
// (the Train sub-tab) reads useAppState() internally, so it still needs a
// StateProvider ancestor even though BodyView itself takes props.
function BodyViewHarness() {
  const { state, log } = useAppState();
  const { profile, protocolState: protocolStates, logs } = state;
  return (
    <BodyView profile={profile} protocolStates={protocolStates} logs={logs} log={log} />
  );
}

function renderBodyView() {
  return render(
    <StateProvider>
      <BodyViewHarness />
    </StateProvider>
  );
}

describe('BodyView', () => {
  it('renders the three sub-tabs: Train, Food, Weight', () => {
    const { getByRole } = renderBodyView();
    expect(getByRole('button', { name: /train/i })).toBeTruthy();
    expect(getByRole('button', { name: /food/i })).toBeTruthy();
    expect(getByRole('button', { name: /weight/i })).toBeTruthy();
  });

  it('defaults to the Train sub-tab, showing WorkoutView content', () => {
    const { container } = renderBodyView();
    expect(container.textContent).toContain('Week 1');
  });

  it('switching to Food renders FoodLogger content', () => {
    const { getByRole, container } = renderBodyView();
    fireEvent.click(getByRole('button', { name: /food/i }));
    expect(container.textContent).toContain("Today's Fuel");
  });

  it('switching to Weight renders WeightLogger content', () => {
    const { getByRole, container } = renderBodyView();
    fireEvent.click(getByRole('button', { name: /weight/i }));
    expect(container.textContent).toContain('Weight Check-in');
  });
});
