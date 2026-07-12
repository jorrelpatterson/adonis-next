// src/views/__tests__/ImageView.test.jsx
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import ImageView from '../ImageView';
import { StateProvider, useAppState } from '../../state/store';
import { GROOMING_ITEMS, WARDROBE } from '../../protocols/image/skincare/data.js';

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

// Pin the clock so day-of-week-dependent rendering (AM/PM active step, 7-day
// rotation highlight) is deterministic, matching BodyView.test.jsx's precedent.
beforeAll(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date('2026-07-09T12:00:00Z')); // Thursday
});
afterAll(() => {
  vi.useRealTimers();
});

function ImageViewHarness() {
  const { state, setProtocolState, log } = useAppState();
  return (
    <ImageView
      profile={state.profile}
      protocolStates={state.protocolState}
      setProtocolState={setProtocolState}
      logs={state.logs}
      log={log}
      domainGoals={state.goals.filter((g) => g.domain === 'image')}
      domainTasks={[]}
      completedTasks={[]}
      onCheckTask={() => {}}
      onAddGoal={() => {}}
    />
  );
}

function renderImageView() {
  return render(
    <StateProvider>
      <ImageViewHarness />
    </StateProvider>
  );
}

describe('ImageView', () => {
  beforeEach(() => {
    clearLocalStorage();
  });

  it('renders the Image hero header', () => {
    const { container } = renderImageView();
    expect(container.querySelector('h2')).toBeTruthy();
    expect(container.textContent).toContain('Image');
  });

  it("renders main's canonical grooming item names (GROOMING_ITEMS, not the archive's GROOMING_SEED)", () => {
    const { container } = renderImageView();
    for (const item of GROOMING_ITEMS) {
      expect(container.textContent).toContain(item.name);
    }
    // Archive-only items must NOT ride in.
    expect(container.textContent).not.toContain('Teeth whitening');
    expect(container.textContent).not.toContain('Body hair');
  });

  it('renders wardrobe categories with 0 counts by default', () => {
    const { container } = renderImageView();
    for (const cat of WARDROBE) {
      expect(cat.have).toBe(0);
      expect(container.textContent).toContain(`${cat.have}/${cat.target}`);
    }
  });

  it('marking a grooming item done persists via setProtocolState(skincare, groomingLastDone)', () => {
    const { getAllByText, container } = renderImageView();
    const btn = getAllByText('Mark done')[0];
    fireEvent.click(btn);
    expect(container.textContent).toContain('Last: today');
  });

  it('incrementing a wardrobe category persists via setProtocolState(skincare, wardrobe)', () => {
    const { getByLabelText, container } = renderImageView();
    fireEvent.click(getByLabelText('Increase Shirts'));
    expect(container.textContent).toContain('1/8');
  });

  it('never renders a dead href="#" link', () => {
    const { container } = renderImageView();
    expect(container.querySelectorAll('a[href="#"]').length).toBe(0);
  });
});
