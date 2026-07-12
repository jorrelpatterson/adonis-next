// src/views/__tests__/PurposeView.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import PurposeView from '../PurposeView';
import { StateProvider, useAppState } from '../../state/store';
import { LIFE_AREAS, CORE_VALUES } from '../../protocols/purpose/data';

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

// PurposeView is store-backed per task-10-brief, same 9-ish prop contract as
// MoneyView/TravelView/MindView (see MoneyView.test.jsx). The harness seeds
// protocolState.purpose and profile via a mount effect so we can assert the
// view renders from the *store*, not a component-local default.
function PurposeViewHarness({ purposeSeed, profileSeed }) {
  const { state, setProtocolState, setProfile } = useAppState();
  React.useEffect(() => {
    if (purposeSeed) setProtocolState('purpose', purposeSeed);
    if (profileSeed) setProfile(profileSeed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <PurposeView
      profile={state.profile}
      protocolStates={state.protocolState}
      setProtocolState={setProtocolState}
      domainGoals={state.goals.filter((g) => g.domain === 'purpose')}
      domainTasks={[]}
      completedTasks={[]}
      onCheckTask={() => {}}
      onAddGoal={() => {}}
    />
  );
}

function renderPurposeView(purposeSeed, profileSeed) {
  return render(
    <StateProvider>
      <PurposeViewHarness purposeSeed={purposeSeed} profileSeed={profileSeed} />
    </StateProvider>
  );
}

describe('PurposeView', () => {
  beforeEach(() => {
    clearLocalStorage();
  });

  it('renders the Purpose hero header', () => {
    const { container } = renderPurposeView();
    expect(container.querySelector('h2')).toBeTruthy();
    expect(container.textContent).toContain('Purpose');
  });

  it('renders all 7 Life Wheel sliders from the data module', () => {
    expect(LIFE_AREAS.length).toBe(7);
    const { container } = renderPurposeView();
    const sliders = container.querySelectorAll('input[type="range"]');
    expect(sliders.length).toBe(7);
    for (const area of LIFE_AREAS) {
      expect(container.textContent).toContain(area.label);
    }
  });

  it('life wheel slider write round-trips through setProtocolState (mock)', () => {
    const setProtocolState = vi.fn();
    const { container } = render(
      <PurposeView
        profile={{ tier: 'free' }}
        protocolStates={{}}
        setProtocolState={setProtocolState}
        domainGoals={[]}
        domainTasks={[]}
        completedTasks={[]}
        onCheckTask={() => {}}
        onAddGoal={() => {}}
      />
    );

    const sliders = container.querySelectorAll('input[type="range"]');
    fireEvent.change(sliders[0], { target: { value: '9' } });

    expect(setProtocolState).toHaveBeenCalledWith('purpose', {
      lifeWheelScores: expect.objectContaining({ [LIFE_AREAS[0].id]: 9 }),
    });
  });

  it('life wheel slider write round-trips through the real store', () => {
    const { container } = renderPurposeView();
    const sliders = container.querySelectorAll('input[type="range"]');
    fireEvent.change(sliders[1], { target: { value: '3' } });

    // The store round-trip re-renders the slider from state — its `value`
    // attribute should now reflect the write, not the default 5.
    expect(sliders[1].value).toBe('3');
  });

  it('core values pick persists selections up to the 5-cap, then blocks further picks', () => {
    const { container, getByRole } = renderPurposeView();

    for (let i = 0; i < 5; i++) {
      fireEvent.click(getByRole('button', { name: CORE_VALUES[i] }));
    }
    expect(container.textContent).toContain('5 / 5');

    // A 6th pick beyond the cap must not be selectable — button is disabled.
    const sixthButton = getByRole('button', { name: CORE_VALUES[5] });
    expect(sixthButton.disabled).toBe(true);
    fireEvent.click(sixthButton);
    expect(container.textContent).toContain('5 / 5');
  });

  it('core values toggle off round-trips through setProtocolState (mock)', () => {
    const setProtocolState = vi.fn();
    const { getByRole } = render(
      <PurposeView
        profile={{ tier: 'free' }}
        protocolStates={{ purpose: { coreValuesSelected: [CORE_VALUES[0]] } }}
        setProtocolState={setProtocolState}
        domainGoals={[]}
        domainTasks={[]}
        completedTasks={[]}
        onCheckTask={() => {}}
        onAddGoal={() => {}}
      />
    );

    fireEvent.click(getByRole('button', { name: CORE_VALUES[0] }));
    expect(setProtocolState).toHaveBeenCalledWith('purpose', { coreValuesSelected: [] });
  });

  it('never renders the archive\'s fake yearly-goals placeholder content', () => {
    const { container } = renderPurposeView();
    expect(container.textContent).not.toContain('Yearly Goals');
    expect(container.textContent).not.toContain('Read 24 books');
    expect(container.textContent).not.toContain('training begun');
    expect(container.textContent).not.toContain('Visit Italy');
    // "Run a marathon" legitimately reappears as a BucketListTeaser example
    // chip (per spec decision 7) — the fake version is distinguishable by
    // its fabricated progress detail, asserted above.
  });

  it('never renders the archive\'s fake bucket-count preview text', () => {
    const { container } = renderPurposeView();
    expect(container.textContent).not.toContain('20 total bucket list items');
    expect(container.textContent).not.toContain('5 completed');
  });

  it('renders the BucketListTeaser', () => {
    const { container } = renderPurposeView();
    expect(container.textContent).toContain('Bucket List');
    expect(container.textContent).toContain('cross-domain strategy');
  });
});
