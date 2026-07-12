// src/views/__tests__/MoneyView.test.jsx
import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import MoneyView from '../MoneyView';
import { StateProvider, useAppState } from '../../state/store';
import { CC_DB } from '../../protocols/money/credit/cards-db';
import { SCORE_MAP } from '../../protocols/money/credit/data';

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

// MoneyView is a store-backed pass-through per task-8-brief: it takes the
// same 9-ish prop contract as BodyView (see BodyView.test.jsx) even though it
// only reads protocolStates directly. The harness seeds protocolState via a
// mount effect so we can assert the view renders from the *store*, not a
// component-local default.
function MoneyViewHarness({ seed }) {
  const { state, setProtocolState, log } = useAppState();
  React.useEffect(() => {
    if (seed) setProtocolState('credit-repair', seed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <MoneyView
      profile={state.profile}
      protocolStates={state.protocolState}
      setProtocolState={setProtocolState}
      logs={state.logs}
      log={log}
      domainGoals={state.goals.filter((g) => g.domain === 'money')}
      domainTasks={[]}
      completedTasks={[]}
      onCheckTask={() => {}}
      onAddGoal={() => {}}
    />
  );
}

function renderMoneyView(seed) {
  return render(
    <StateProvider>
      <MoneyViewHarness seed={seed} />
    </StateProvider>
  );
}

describe('MoneyView', () => {
  beforeEach(() => {
    clearLocalStorage();
  });

  it('renders the Money hero header', () => {
    const { container } = renderMoneyView();
    expect(container.querySelector('h2')).toBeTruthy();
    expect(container.textContent).toContain('Money');
  });

  it('resolves a seeded ccWallet id against CC_DB and shows the SCORE_MAP score', async () => {
    const card = CC_DB.find((c) => c.id === 'csp');
    expect(card).toBeTruthy();
    const { container } = renderMoneyView({ ccWallet: [card.id], creditScoreRange: '700_800' });

    await waitFor(() => {
      expect(container.textContent).toContain(card.name);
    });
    expect(container.textContent).toContain(String(SCORE_MAP['700_800']));
  });

  it('never renders a dead href="#" link', async () => {
    const card = CC_DB.find((c) => c.id === 'csp');
    const { container } = renderMoneyView({ ccWallet: [card.id], creditScoreRange: '700_800' });
    await waitFor(() => expect(container.textContent).toContain(card.name));
    expect(container.querySelectorAll('a[href="#"]').length).toBe(0);
  });
});
