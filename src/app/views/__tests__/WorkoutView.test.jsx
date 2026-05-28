// src/app/views/__tests__/WorkoutView.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import WorkoutView from '../WorkoutView';
import { StateProvider, useAppState } from '../../../state/store';
import { logKey, prKey } from '../../../protocols/body/workout/keys';

function withState(ui, initialAction) {
  function Bootstrap() {
    const ctx = useAppState();
    React.useEffect(() => { initialAction && initialAction(ctx); }, []);
    return ui;
  }
  return <StateProvider><Bootstrap /></StateProvider>;
}

describe('WorkoutView', () => {
  beforeEach(() => {
    if (typeof localStorage.clear === 'function') {
      localStorage.clear();
    } else {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i));
      keys.forEach((k) => localStorage.removeItem(k));
    }
  });

  it('renders the Muscle Gain Monday workout header and at least one exercise', () => {
    const { container } = render(withState(
      <WorkoutView fixedDayIdx={1} />,
      (ctx) => ctx.setProfile({ primary: 'Muscle Gain' }),
    ));
    expect(container.textContent).toContain('Back & Biceps');
    expect(container.textContent).toContain('Conventional Deadlifts');
  });

  it('renders DeloadBanner on week 4', () => {
    const { container } = render(withState(
      <WorkoutView fixedDayIdx={1} />,
      (ctx) => {
        ctx.setProfile({ primary: 'Muscle Gain' });
        ctx.setProtocolState('workout', { wkWeek: 4 });
      },
    ));
    expect(container.textContent.toLowerCase()).toContain('deload week');
  });

  it('renders nothing-to-do state on a rest day', () => {
    const { container } = render(withState(
      <WorkoutView fixedDayIdx={6} />,
      (ctx) => ctx.setProfile({ primary: 'Muscle Gain' }),
    ));
    expect(container.textContent.toLowerCase()).toContain('rest');
  });

  it('persists a logged set into protocolState.workout.wkLogs', () => {
    let snap;
    function Spy() { snap = useAppState().state; return null; }
    function BootstrapAndView() {
      const ctx = useAppState();
      React.useEffect(() => { ctx.setProfile({ primary: 'Muscle Gain' }); }, []);
      return <WorkoutView fixedDayIdx={1} />;
    }
    const { container } = render(
      <StateProvider>
        <Spy />
        <BootstrapAndView />
      </StateProvider>
    );
    const weightInput = container.querySelector('input[type="number"]');
    fireEvent.change(weightInput, { target: { value: '315' } });
    expect(weightInput.value).toBe('315');
    const goal = 'Muscle Gain';
    const expectedKey = logKey(goal, 1, 1, 'Conventional Deadlifts', 0);
    expect(snap.protocolState.workout.wkLogs[expectedKey]?.wt).toBe(315);
  });
});
