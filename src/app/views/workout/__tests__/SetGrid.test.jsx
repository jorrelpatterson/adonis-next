// src/app/views/workout/__tests__/SetGrid.test.jsx
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import SetGrid from '../SetGrid';
import { logKey, prKey } from '../../../../protocols/body/workout/keys';

const goal = 'Muscle Gain', week = 2, dayIdx = 1;
const exercise = { name: 'Back Squats', sets: 3, reps: '5', rest: '120s' };

describe('SetGrid', () => {
  it('renders one row per set', () => {
    const { container } = render(
      <SetGrid goal={goal} week={week} dayIdx={dayIdx} exercise={exercise}
        wkLogs={{}} wkPRs={{}} onSet={() => {}} />
    );
    const weightInputs = container.querySelectorAll('input[type="number"]');
    expect(weightInputs.length).toBe(6);
  });

  it('uses prior-week weight as placeholder ghost text', () => {
    const wkLogs = {
      [logKey(goal, 1, dayIdx, 'Back Squats', 0)]: { wt: 225, r: 5, c: true },
    };
    const { container } = render(
      <SetGrid goal={goal} week={week} dayIdx={dayIdx} exercise={exercise}
        wkLogs={wkLogs} wkPRs={{}} onSet={() => {}} />
    );
    const firstWeightInput = container.querySelectorAll('input[type="number"]')[0];
    expect(firstWeightInput.getAttribute('placeholder')).toBe('225');
  });

  it('calls onSet with updated entry when weight changes', () => {
    const onSet = vi.fn();
    const { container } = render(
      <SetGrid goal={goal} week={week} dayIdx={dayIdx} exercise={exercise}
        wkLogs={{}} wkPRs={{}} onSet={onSet} />
    );
    const inputs = container.querySelectorAll('input[type="number"]');
    fireEvent.change(inputs[0], { target: { value: '230' } });
    expect(onSet).toHaveBeenCalledWith(0, expect.objectContaining({ wt: 230 }));
  });

  it('calls onSet with c=true when checkbox toggled on', () => {
    const onSet = vi.fn();
    const { container } = render(
      <SetGrid goal={goal} week={week} dayIdx={dayIdx} exercise={exercise}
        wkLogs={{}} wkPRs={{}} onSet={onSet} />
    );
    const checkbox = container.querySelector('input[type="checkbox"]');
    fireEvent.click(checkbox);
    expect(onSet).toHaveBeenCalledWith(0, expect.objectContaining({ c: true }));
  });

  it('shows a PR badge when current set weight exceeds wkPRs', () => {
    const wkLogs = {
      [logKey(goal, week, dayIdx, 'Back Squats', 0)]: { wt: 240, r: 5, c: true },
    };
    const wkPRs = { [prKey(goal, 'Back Squats')]: 225 };
    const { container } = render(
      <SetGrid goal={goal} week={week} dayIdx={dayIdx} exercise={exercise}
        wkLogs={wkLogs} wkPRs={wkPRs} onSet={() => {}} />
    );
    expect(container.textContent).toContain('PR');
  });
});
