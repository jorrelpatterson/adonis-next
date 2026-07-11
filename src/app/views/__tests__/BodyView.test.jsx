// src/app/views/__tests__/BodyView.test.jsx
import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import BodyView from '../BodyView';
import { StateProvider, useAppState } from '../../../state/store';

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
    const { getByText } = renderBodyView();
    expect(getByText('Train')).toBeTruthy();
    expect(getByText('Food')).toBeTruthy();
    expect(getByText('Weight')).toBeTruthy();
  });

  it('defaults to the Train sub-tab, showing WorkoutView content', () => {
    const { container } = renderBodyView();
    expect(container.textContent).toContain('Week 1');
  });

  it('switching to Food renders FoodLogger content', () => {
    const { getByText, container } = renderBodyView();
    fireEvent.click(getByText('Food'));
    expect(container.textContent).toContain("Today's Fuel");
  });

  it('switching to Weight renders WeightLogger content', () => {
    const { getByText, container } = renderBodyView();
    fireEvent.click(getByText('Weight'));
    expect(container.textContent).toContain('Weight Check-in');
  });
});
