// src/views/__tests__/TravelView.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import TravelView from '../TravelView';
import { StateProvider, useAppState } from '../../state/store';
import { DEFAULT_TRAVEL_DOCS, PASSPORT_POWER } from '../../protocols/travel/citizenship/data';

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

function TravelViewHarness({ seed }) {
  const { state, setProtocolState, log } = useAppState();
  React.useEffect(() => {
    if (seed) setProtocolState('citizenship', seed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <TravelView
      profile={state.profile}
      protocolStates={state.protocolState}
      setProtocolState={setProtocolState}
      logs={state.logs}
      log={log}
      domainGoals={state.goals.filter((g) => g.domain === 'travel')}
      domainTasks={[]}
      completedTasks={[]}
      onCheckTask={() => {}}
      onAddGoal={() => {}}
    />
  );
}

function renderTravelView(seed) {
  return render(
    <StateProvider>
      <TravelViewHarness seed={seed} />
    </StateProvider>
  );
}

describe('TravelView', () => {
  beforeEach(() => {
    clearLocalStorage();
  });

  it('renders the hero with PASSPORT_POWER (no hardcoded 186)', () => {
    const { container } = renderTravelView();
    expect(container.querySelector('h2')).toBeTruthy();
    expect(container.textContent).toContain('Travel');
    expect(container.textContent).toContain(String(PASSPORT_POWER));
  });

  it('doc toggle round-trips through setProtocolState (mock) with the flipped status', () => {
    const setProtocolState = vi.fn();
    const { getByLabelText } = render(
      <TravelView
        profile={{}}
        protocolStates={{}}
        setProtocolState={setProtocolState}
        logs={{}}
        log={() => {}}
        domainGoals={[]}
        domainTasks={[]}
        completedTasks={[]}
        onCheckTask={() => {}}
        onAddGoal={() => {}}
      />
    );

    // US Passport defaults to Active in DEFAULT_TRAVEL_DOCS — toggling flips it Inactive.
    fireEvent.click(getByLabelText('Toggle US Passport'));

    expect(setProtocolState).toHaveBeenCalledWith('citizenship', {
      travelDocs: expect.arrayContaining([
        expect.objectContaining({ id: 'us_passport', status: 'Inactive' }),
      ]),
    });
  });

  it('persists doc display from seeded protocolStates.citizenship.travelDocs', () => {
    const seededDocs = DEFAULT_TRAVEL_DOCS.map((d) =>
      d.id === 'us_passport' ? { ...d, status: 'Inactive' } : d
    );
    const { getByLabelText } = renderTravelView({ travelDocs: seededDocs });

    const toggle = getByLabelText('Toggle US Passport');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
  });

  it('never renders a dead href="#" link', () => {
    const { container } = renderTravelView();
    expect(container.querySelectorAll('a[href="#"]').length).toBe(0);
  });
});
