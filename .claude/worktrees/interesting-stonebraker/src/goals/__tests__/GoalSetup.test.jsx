import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import GoalSetup from '../GoalSetup';

describe('GoalSetup', () => {
  it('renders domain picker on step 1', () => {
    const { container } = render(<GoalSetup onCreateGoal={() => {}} profile={{}} />);
    // Should show domain cards
    expect(container.textContent).toContain('Body');
    expect(container.textContent).toContain('Money');
    expect(container.textContent).toContain('Travel');
  });
});
