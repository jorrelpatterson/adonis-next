// src/views/__tests__/MindView.test.jsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react';
import MindView from '../MindView';
import { StateProvider, useAppState } from '../../state/store';
import { BREATHWORK_PATTERNS, NOOTROPICS } from '../../protocols/mind/data';

// happy-dom's localStorage may not implement .clear() — mirrors store.test.jsx's fallback.
function clearLocalStorage() {
  if (typeof localStorage.clear === 'function') {
    localStorage.clear();
    return;
  }
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i));
  keys.forEach((k) => localStorage.removeItem(k));
}

// MindView is store-backed per task-9-brief, same 9-ish prop contract as
// MoneyView/TravelView (see MoneyView.test.jsx). The harness seeds
// protocolState.mind and profile via a mount effect so we can assert the
// view renders from the *store*, not a component-local default.
function MindViewHarness({ mindSeed, profileSeed }) {
  const { state, setProtocolState, setProfile } = useAppState();
  React.useEffect(() => {
    if (mindSeed) setProtocolState('mind', mindSeed);
    if (profileSeed) setProfile(profileSeed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <MindView
      profile={state.profile}
      protocolStates={state.protocolState}
      setProtocolState={setProtocolState}
      domainGoals={state.goals.filter((g) => g.domain === 'mind')}
      domainTasks={[]}
      completedTasks={[]}
      onCheckTask={() => {}}
      onAddGoal={() => {}}
    />
  );
}

function renderMindView(mindSeed, profileSeed) {
  return render(
    <StateProvider>
      <MindViewHarness mindSeed={mindSeed} profileSeed={profileSeed} />
    </StateProvider>
  );
}

describe('MindView', () => {
  beforeEach(() => {
    clearLocalStorage();
  });

  it('renders the Mind hero header', () => {
    const { container } = renderMindView();
    expect(container.querySelector('h2')).toBeTruthy();
    expect(container.textContent).toContain('Mind');
  });

  it('breathwork card lists the pattern count from the data module (5)', () => {
    expect(BREATHWORK_PATTERNS.length).toBe(5);
    const { container } = renderMindView();
    expect(container.textContent).toContain('5 patterns. Pick by intent.');
    for (const pat of BREATHWORK_PATTERNS) {
      expect(container.textContent).toContain(pat.name);
    }
  });

  it('selecting a pattern opens the modal via a real click', () => {
    const { container, getAllByText } = renderMindView();
    const tryButtons = getAllByText('Try it →');
    expect(tryButtons.length).toBe(BREATHWORK_PATTERNS.length);

    fireEvent.click(tryButtons[0]);

    // Modal renders the pattern's cycle counter chrome, not present pre-click.
    expect(container.textContent).toContain('Cycle');
    expect(container.textContent).toContain('Next cycle');
  });

  it('nootropics card is locked chrome for tier: free', () => {
    const { container } = renderMindView(
      { nootropicsOpen: true },
      { tier: 'free' }
    );
    expect(container.textContent).toContain('Nootropic Stack');
    expect(container.textContent).toContain('Locked — Pro feature');
    // No interactive Active/Inactive toggles for the locked tier.
    expect(container.textContent).not.toContain('Inactive');
    expect(container.textContent).not.toContain(NOOTROPICS[0].dose);
  });

  it('nootropics card renders full unlocked content for tier: pro', () => {
    const { container } = renderMindView(
      { nootropicsOpen: true },
      { tier: 'pro' }
    );
    expect(container.textContent).toContain('Nootropic Stack');
    expect(container.textContent).not.toContain('Locked — Pro feature');
    for (const n of NOOTROPICS) {
      expect(container.textContent).toContain(n.name);
    }
  });

  describe('meditation completion', () => {
    // Advancing 600s of fake timers also fires the store's debounced
    // localStorage-save setTimeout (DEBOUNCE_MS=500 in src/state/store.jsx).
    // Under vi.useFakeTimers() happy-dom's localStorage accessor breaks
    // ("localStorage.setItem is not a function") — reproducible even with a
    // bare `localStorage.setItem(...)` call right after activating fake
    // timers, unrelated to this component. Swap in an in-memory stub for the
    // duration of these tests so the store's save effect has something real
    // to call, and restore the original afterward.
    let originalLocalStorage;
    beforeEach(() => {
      originalLocalStorage = globalThis.localStorage;
      const memory = new Map();
      const stub = {
        getItem: (k) => (memory.has(k) ? memory.get(k) : null),
        setItem: (k, v) => { memory.set(k, String(v)); },
        removeItem: (k) => { memory.delete(k); },
        clear: () => { memory.clear(); },
        key: (i) => Array.from(memory.keys())[i] ?? null,
        get length() { return memory.size; },
      };
      Object.defineProperty(globalThis, 'localStorage', { value: stub, configurable: true, writable: true });
      vi.useFakeTimers({ shouldAdvanceTime: true });
    });
    afterEach(() => {
      vi.useRealTimers();
      Object.defineProperty(globalThis, 'localStorage', { value: originalLocalStorage, configurable: true, writable: true });
    });

    it('writes protocolState.mind.lastMeditation when the 10-minute timer completes naturally', async () => {
      function Probe() {
        const { state, setProtocolState } = useAppState();
        return (
          <div>
            <MindView
              profile={state.profile}
              protocolStates={state.protocolState}
              setProtocolState={setProtocolState}
              domainGoals={[]}
              domainTasks={[]}
              completedTasks={[]}
              onCheckTask={() => {}}
              onAddGoal={() => {}}
            />
            <div data-testid="last-meditation">{state.protocolState.mind?.lastMeditation || ''}</div>
          </div>
        );
      }

      const { getByText, getByTestId } = render(
        <StateProvider>
          <Probe />
        </StateProvider>
      );

      expect(getByTestId('last-meditation').textContent).toBe('');

      fireEvent.click(getByText('Start'));

      // Drive the archive's 10-minute (600s) countdown to completion.
      act(() => { vi.advanceTimersByTime(600000); });

      expect(getByTestId('last-meditation').textContent).not.toBe('');
      expect(() => new Date(getByTestId('last-meditation').textContent).toISOString()).not.toThrow();
    });
  });

  it('gratitude entry persists via setProtocolState', async () => {
    function Probe() {
      const { state, setProtocolState } = useAppState();
      return (
        <MindView
          profile={state.profile}
          protocolStates={state.protocolState}
          setProtocolState={setProtocolState}
          domainGoals={[]}
          domainTasks={[]}
          completedTasks={[]}
          onCheckTask={() => {}}
          onAddGoal={() => {}}
        />
      );
    }

    const { container, getAllByPlaceholderText, getByText } = render(
      <StateProvider>
        <Probe />
      </StateProvider>
    );

    const inputs = getAllByPlaceholderText('I’m grateful for…');
    fireEvent.change(inputs[0], { target: { value: 'Health' } });
    fireEvent.change(inputs[1], { target: { value: 'Family' } });
    fireEvent.change(inputs[2], { target: { value: 'Coffee' } });
    fireEvent.click(getByText('Save'));

    await waitFor(() => {
      expect(container.textContent).toContain('Saved earlier today');
    });
    expect(container.textContent).toContain('Health');
    expect(container.textContent).toContain('Family');
    expect(container.textContent).toContain('Coffee');
  });

  it('never renders a dead href="#" link', () => {
    const { container } = renderMindView({ nootropicsOpen: true }, { tier: 'pro' });
    expect(container.querySelectorAll('a[href="#"]').length).toBe(0);
  });
});
