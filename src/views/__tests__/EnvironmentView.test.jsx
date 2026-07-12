// src/views/__tests__/EnvironmentView.test.jsx
import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import EnvironmentView from '../EnvironmentView';
import { StateProvider, useAppState } from '../../state/store';
import { CHECKLIST } from '../../protocols/environment/data';

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

const TOTAL_ITEMS = CHECKLIST.reduce((acc, a) => acc + a.items.length, 0);
const today = new Date().toISOString().slice(0, 10);

// EnvironmentView is store-backed per task-9-brief, same 9-ish prop contract
// as MoneyView/TravelView (see MoneyView.test.jsx). The harness seeds
// protocolState.environment via a mount effect so we can assert the view
// renders from the *store*, not a component-local default.
function EnvironmentViewHarness({ seed }) {
  const { state, setProtocolState } = useAppState();
  React.useEffect(() => {
    if (seed) setProtocolState('environment', seed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <EnvironmentView
      profile={state.profile}
      protocolStates={state.protocolState}
      setProtocolState={setProtocolState}
      domainGoals={state.goals.filter((g) => g.domain === 'environment')}
      domainTasks={[]}
      completedTasks={[]}
      onCheckTask={() => {}}
      onAddGoal={() => {}}
    />
  );
}

function renderEnvironmentView(seed) {
  return render(
    <StateProvider>
      <EnvironmentViewHarness seed={seed} />
    </StateProvider>
  );
}

describe('EnvironmentView', () => {
  beforeEach(() => {
    clearLocalStorage();
  });

  it('renders the Environment hero header', () => {
    const { container } = renderEnvironmentView();
    expect(container.querySelector('h2')).toBeTruthy();
    expect(container.textContent).toContain('Environment');
  });

  it('renders 6 areas with items from the data module (36 total)', () => {
    expect(CHECKLIST.length).toBe(6);
    const { container } = renderEnvironmentView();
    for (const area of CHECKLIST) {
      expect(container.textContent).toContain(area.title);
      for (const item of area.items) {
        expect(container.textContent).toContain(item);
      }
    }
    expect(container.textContent).toContain(`${TOTAL_ITEMS} micro-habits across ${CHECKLIST.length} areas.`);
  });

  it('checking an item writes checklistByDate[today] via setProtocolState', async () => {
    function Probe() {
      const { state, setProtocolState } = useAppState();
      return (
        <div>
          <EnvironmentView
            profile={state.profile}
            protocolStates={state.protocolState}
            setProtocolState={setProtocolState}
            domainGoals={[]}
            domainTasks={[]}
            completedTasks={[]}
            onCheckTask={() => {}}
            onAddGoal={() => {}}
          />
          <div data-testid="checked-today">
            {JSON.stringify(state.protocolState.environment?.checklistByDate?.[today] || {})}
          </div>
        </div>
      );
    }

    const { getByText, getByTestId } = render(
      <StateProvider>
        <Probe />
      </StateProvider>
    );

    expect(getByTestId('checked-today').textContent).toBe('{}');

    const firstItemLabel = CHECKLIST[0].items[0];
    fireEvent.click(getByText(firstItemLabel));

    await waitFor(() => {
      expect(getByTestId('checked-today').textContent).toContain(`"${CHECKLIST[0].key}:0":true`);
    });
  });

  it('progress ring reflects seeded completions', () => {
    // Seed 2 of the first area's items as checked for today.
    const seededChecked = {
      [`${CHECKLIST[0].key}:0`]: true,
      [`${CHECKLIST[0].key}:1`]: true,
    };
    const { container } = renderEnvironmentView({
      checklistByDate: { [today]: seededChecked },
    });

    expect(container.textContent).toContain(`2/${TOTAL_ITEMS}`);
    const pct = Math.round((2 / TOTAL_ITEMS) * 100);
    expect(container.textContent).toContain(`${pct}%`);
  });

  it('never renders a dead href="#" link', () => {
    const { container } = renderEnvironmentView();
    expect(container.querySelectorAll('a[href="#"]').length).toBe(0);
  });
});
