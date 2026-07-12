// src/app/views/__tests__/BodyView.test.jsx
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import BodyView from '../BodyView';
import { StateProvider, useAppState } from '../../../state/store';
import { PROTO_STACKS } from '../../../protocols/body/peptides/proto-stacks';

// WorkoutView's content varies by real weekday (training vs rest day), and on
// training days SetGrid renders a "Weight" column header that collides with
// the Weight sub-tab label under getByText. Pin the clock to a fixed training
// day and target the sub-tabs by their button role so the suite is
// deterministic on every weekday.
beforeAll(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date('2026-07-09T12:00:00Z')); // Thursday
});
afterAll(() => {
  vi.useRealTimers();
});

// BodyView is a pass-through seam per task-15-brief: App hands it
// profile/protocolStates/logs/log straight from useAppState(). WorkoutView
// (the Train sub-tab) reads useAppState() internally, so it still needs a
// StateProvider ancestor even though BodyView itself takes props.
// task-7: BodyView also needs setProtocolState (peptide stack persistence),
// which the harness now threads through from useAppState() too.
function BodyViewHarness() {
  const { state, log, setProtocolState } = useAppState();
  const { profile, protocolState: protocolStates, logs } = state;
  return (
    <BodyView
      profile={profile}
      protocolStates={protocolStates}
      setProtocolState={setProtocolState}
      logs={logs}
      log={log}
    />
  );
}

function renderBodyView() {
  return render(
    <StateProvider>
      <BodyViewHarness />
    </StateProvider>
  );
}

describe('BodyView', () => {
  it('renders the four sub-tabs: Peptides, Train, Food, Tools', () => {
    const { getByRole } = renderBodyView();
    expect(getByRole('button', { name: /peptides/i })).toBeTruthy();
    expect(getByRole('button', { name: /train/i })).toBeTruthy();
    expect(getByRole('button', { name: /food/i })).toBeTruthy();
    expect(getByRole('button', { name: /tools/i })).toBeTruthy();
  });

  it('defaults to the Peptides sub-tab, showing the stack empty state', () => {
    const { container } = renderBodyView();
    expect(container.textContent).toContain('Build your stack');
  });

  it('switching to Train renders WorkoutView content', () => {
    const { getByRole, container } = renderBodyView();
    fireEvent.click(getByRole('button', { name: /train/i }));
    expect(container.textContent).toContain('Week 1');
  });

  it('switching to Food renders FoodLogger content', () => {
    const { getByRole, container } = renderBodyView();
    fireEvent.click(getByRole('button', { name: /food/i }));
    expect(container.textContent).toContain("Today's Fuel");
  });

  it('switching to Tools renders WeightLogger + PhotoJournal content', () => {
    const { getByRole, container } = renderBodyView();
    fireEvent.click(getByRole('button', { name: /tools/i }));
    expect(container.textContent).toContain('Weight Check-in');
    expect(container.textContent).toContain('Photo Timeline');
  });

  it('Peptides pane Stacks browser lists a card per PROTO_STACKS entry', () => {
    const { getByRole, getAllByRole } = renderBodyView();
    fireEvent.click(getByRole('button', { name: /^stacks$/i }));
    const stackButtons = getAllByRole('button').filter(b => /compound/i.test(b.textContent));
    expect(stackButtons).toHaveLength(PROTO_STACKS.length);
  });

  it('order CTA links point at advncelabs.com and never at Stripe', async () => {
    const { getByRole, getAllByRole, container } = renderBodyView();
    fireEvent.click(getByRole('button', { name: /^stacks$/i }));

    const shred = PROTO_STACKS.find(st => st.id === 'shred');
    // Expand the SHRED stack row, then switch to it.
    fireEvent.click(getAllByRole('button', { name: new RegExp(shred.name) })[0]);
    fireEvent.click(getByRole('button', { name: new RegExp(`Switch to ${shred.name}`) }));
    // ActionSheet confirm sheet.
    fireEvent.click(await waitFor(() => getByRole('button', { name: /switch stack/i })));

    await waitFor(() => expect(container.textContent).toContain(shred.name));

    const links = Array.from(container.querySelectorAll('a[href]'));
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link.getAttribute('href')).toContain('advncelabs.com');
    }
    expect(container.innerHTML).not.toContain('buy.stripe.com');
  });

  it('selecting a stack persists via protocolState.peptides.selectedStackId (survives a tab round-trip)', async () => {
    const { getByRole, getAllByRole, container } = renderBodyView();
    fireEvent.click(getByRole('button', { name: /^stacks$/i }));

    const sculpt = PROTO_STACKS.find(st => st.id === 'sculpt');
    fireEvent.click(getAllByRole('button', { name: new RegExp(sculpt.name) })[0]);
    fireEvent.click(getByRole('button', { name: new RegExp(`Switch to ${sculpt.name}`) }));
    fireEvent.click(await waitFor(() => getByRole('button', { name: /switch stack/i })));

    await waitFor(() => expect(container.textContent).toContain(sculpt.name));

    // Round-trip through another tab — Peptides pane fully remounts, so
    // seeing SCULPT again proves persistence lives in protocolState (the
    // store), not local component state.
    fireEvent.click(getByRole('button', { name: /train/i }));
    fireEvent.click(getByRole('button', { name: /peptides/i }));

    expect(container.textContent).toContain(sculpt.name);

    // The Stacks browser should also mark SCULPT as the active stack.
    fireEvent.click(getByRole('button', { name: /^stacks$/i }));
    const sculptRow = getAllByRole('button', { name: new RegExp(sculpt.name) })[0];
    expect(sculptRow.textContent).toContain('Active');
  });
});
