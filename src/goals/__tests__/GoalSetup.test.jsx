import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('../../design/haptics', () => ({
  haptics: { medium: vi.fn() },
}));

import GoalSetup from '../GoalSetup';
import { haptics } from '../../design/haptics';

afterEach(() => {
  vi.clearAllMocks();
});

describe('GoalSetup', () => {
  it('renders domain picker on step 1', () => {
    const { container } = render(<GoalSetup onCreateGoal={() => {}} profile={{}} />);
    // Should show domain cards
    expect(container.textContent).toContain('Body');
    expect(container.textContent).toContain('Money');
    expect(container.textContent).toContain('Travel');
  });
});

// ─── iOS P2 Task 2: goal-creation haptics ──────────────────────────────────
describe('GoalSetup — Activate Goal haptics', () => {
  it('fires haptics.medium when a goal is activated', () => {
    const onCreateGoal = vi.fn();
    const { getByText, getByPlaceholderText } = render(
      <GoalSetup onCreateGoal={onCreateGoal} profile={{}} />
    );

    fireEvent.click(getByText('Body'));
    fireEvent.click(getByText('Lose Weight'));
    fireEvent.change(getByPlaceholderText('Current weight (lbs)'), { target: { value: '200' } });
    fireEvent.change(getByPlaceholderText('Target weight (lbs)'), { target: { value: '180' } });
    fireEvent.click(getByText('Review Goal'));
    fireEvent.click(getByText('Activate Goal'));

    expect(haptics.medium).toHaveBeenCalledTimes(1);
    expect(onCreateGoal).toHaveBeenCalledTimes(1);
  });
});
