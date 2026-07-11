// src/app/views/__tests__/WorkoutView.test.jsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

  describe('PR celebration + session log', () => {
    // countUpTo (design/motion.js) honors prefers-reduced-motion by resolving
    // onUpdate(to) synchronously instead of animating via rAF — force that
    // branch so PRCelebration's count-up settles immediately (same pattern
    // as src/views/components/__tests__/PRCelebration.test.jsx).
    beforeEach(() => {
      vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query) => ({
        matches: true,
        media: query,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })));
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('shows PRCelebration and appends an isPR entry to logs.exercise when a set beats the seeded PR, then returns to the grid on close', () => {
      let snap;
      function Spy() { snap = useAppState().state; return null; }
      const { container, getByText, queryByText } = render(withState(
        <>
          <Spy />
          <WorkoutView fixedDayIdx={1} />
        </>,
        (ctx) => {
          ctx.setProfile({ primary: 'Muscle Gain' });
          ctx.setProtocolState('workout', {
            wkPRs: { [prKey('Muscle Gain', 'Conventional Deadlifts')]: 300 },
          });
        },
      ));

      const weightInput = container.querySelector('input[type="number"]');
      const repsInput = container.querySelectorAll('input[type="number"]')[1];
      const checkbox = container.querySelector('input[type="checkbox"]');

      fireEvent.change(weightInput, { target: { value: '315' } });
      fireEvent.change(repsInput, { target: { value: '5' } });
      fireEvent.click(checkbox);

      expect(getByText('Personal Record')).toBeTruthy();
      expect(snap.logs.exercise.length).toBe(1);
      expect(snap.logs.exercise[0].isPR).toBe(true);
      expect(snap.logs.exercise[0].exercise).toBe('Conventional Deadlifts');
      expect(snap.logs.exercise[0].sets).toEqual([{ wt: 315, r: 5, c: true }]);
      expect(snap.logs.exercise[0].date).toBe(new Date().toISOString().slice(0, 10));

      fireEvent.click(getByText('Continue'));
      expect(queryByText('Personal Record')).toBeFalsy();

      // Second set, below the (now-updated) PR — no celebration, no append.
      const secondCheckbox = container.querySelectorAll('input[type="checkbox"]')[1];
      const secondWeightInput = container.querySelectorAll('input[type="number"]')[2];
      const secondRepsInput = container.querySelectorAll('input[type="number"]')[3];
      fireEvent.change(secondWeightInput, { target: { value: '200' } });
      fireEvent.change(secondRepsInput, { target: { value: '8' } });
      fireEvent.click(secondCheckbox);

      expect(queryByText('Personal Record')).toBeFalsy();
      expect(snap.logs.exercise.length).toBe(1);
    });

    it('does not celebrate when the box is checked before weight is typed, even across multiple keystrokes (transition-gated trade-off)', () => {
      let snap;
      function Spy() { snap = useAppState().state; return null; }
      const { container, queryByText } = render(withState(
        <>
          <Spy />
          <WorkoutView fixedDayIdx={1} />
        </>,
        (ctx) => ctx.setProfile({ primary: 'Muscle Gain' }),
      ));

      const weightInput = container.querySelector('input[type="number"]');
      const checkbox = container.querySelector('input[type="checkbox"]');

      // Check the box first, with no weight entered yet.
      fireEvent.click(checkbox);

      // Now type the weight in steps, as a real keyboard would produce
      // incremental onChange events: "3", then "315".
      fireEvent.input(weightInput, { target: { value: '3' } });
      fireEvent.change(weightInput, { target: { value: '315' } });

      // The checkbox->weight ordering means every keystroke sees prev.c === true,
      // so the false->true transition never happens — zero celebrations, zero
      // isPR log appends. (wkPRs itself may still have been bumped, per the
      // unchanged pre-existing badge behavior — that's not asserted here.)
      expect(queryByText('Personal Record')).toBeFalsy();
      expect(snap.logs.exercise.length).toBe(0);
    });

    it('does not re-celebrate when weight is raised further while the box remains checked', () => {
      let snap;
      function Spy() { snap = useAppState().state; return null; }
      const { container, getByText, queryByText } = render(withState(
        <>
          <Spy />
          <WorkoutView fixedDayIdx={1} />
        </>,
        (ctx) => ctx.setProfile({ primary: 'Muscle Gain' }),
      ));

      const weightInput = container.querySelector('input[type="number"]');
      const checkbox = container.querySelector('input[type="checkbox"]');

      // Type weight, then check — the false->true transition fires exactly once.
      fireEvent.change(weightInput, { target: { value: '300' } });
      fireEvent.click(checkbox);

      expect(getByText('Personal Record')).toBeTruthy();
      expect(snap.logs.exercise.length).toBe(1);

      // Close the celebration.
      fireEvent.click(getByText('Continue'));
      expect(queryByText('Personal Record')).toBeFalsy();

      // Raise the weight further while the box is still checked (a correction).
      // prev.c is already true, so this must NOT fire a second celebration/append.
      fireEvent.change(weightInput, { target: { value: '350' } });

      expect(queryByText('Personal Record')).toBeFalsy();
      expect(snap.logs.exercise.length).toBe(1);
    });
  });
});
