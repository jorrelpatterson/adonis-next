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
