// src/app/__tests__/App.test.jsx
// Shell smoke test — guards the AmbientBackdrop wiring (Task 10) and the shell
// against crash-on-render regressions as App.jsx becomes the Phase 2+ churn hotspot.
//
// Task 11 added an auth-gated funnel in front of the shell (see funnel.test.jsx
// for gate-branch coverage), so this suite now mocks useAuth as signed-in and
// seeds a complete profile — otherwise every render here would land on
// OnboardingFlow/AuthScreen instead of the shell this file is meant to guard.
// Profile is seeded via the store's replaceState action (not localStorage —
// localStorage isn't wired up in this test environment; store.jsx's
// loadState() only survives because it's try/catch-wrapped internally).
import { describe, it, expect, vi, afterEach } from 'vitest';
import React, { useEffect } from 'react';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { StateProvider, useAppState } from '../../state/store';
import { CHECKIN_FIELDS } from '../../state/checkin.js';
import App from '../App';

vi.mock('../../services/useAuth.js', () => ({
  useAuth: () => ({ user: { id: 'u1' }, tier: 'free', loading: false, signOut: vi.fn() }),
}));

const COMPLETE_PROFILE = {
  name: 'Jordan', age: 30, gender: 'male', weight: 180,
  hFt: 5, hIn: 10, activity: 'moderate', domains: ['body'], tier: 'free',
};

function Seed() {
  const { replaceState } = useAppState();
  useEffect(() => {
    replaceState({ profile: COMPLETE_PROFILE });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

// Exposes the live store state to the test via a mutable box — used by the
// Task 13 check-in test below to assert on logs.checkins after a save.
function StateSpy({ box }) {
  const { state } = useAppState();
  useEffect(() => {
    box.current = state;
  });
  return null;
}

describe('App shell', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders inside StateProvider without throwing', () => {
    const { container } = render(
      <StateProvider>
        <Seed />
        <App />
      </StateProvider>
    );
    expect(container.querySelector('.adn-noise')).toBeTruthy();
  });

  it('mounts the ambient backdrop (z:0 layers) behind the content wrapper (z:2)', () => {
    const { container } = render(
      <StateProvider>
        <Seed />
        <App />
      </StateProvider>
    );
    const kids = [...container.querySelector('.adn-noise').children];
    // AmbientBackdrop renders a fragment of pointer-events:none layers at zIndex 0;
    // the content wrapper carries zIndex 2 so taps/scroll land on content, not the field.
    const firstBackdropIdx = kids.findIndex((el) => el.style.zIndex === '0');
    const contentIdx = kids.findIndex((el) => el.style.zIndex === '2');
    expect(firstBackdropIdx).toBe(0);           // backdrop is the first thing rendered
    expect(contentIdx).toBeGreaterThan(firstBackdropIdx); // content sits above it
  });
});

describe('Task 13: home tab + daily check-in', () => {
  afterEach(() => {
    cleanup();
  });

  it('lands on the home tab (HomeDashboard) by default', () => {
    const { container } = render(
      <StateProvider>
        <Seed />
        <App />
      </StateProvider>
    );
    expect(container.querySelector('[data-testid="home-dashboard"]')).toBeTruthy();
  });

  it('tapping the check-in card, rating all fields, and saving writes logs.checkins[today]', () => {
    const box = { current: null };
    const { container, getByText } = render(
      <StateProvider>
        <Seed />
        <StateSpy box={box} />
        <App />
      </StateProvider>
    );

    // Open the modal from the Home dashboard's check-in card.
    fireEvent.click(container.querySelector('[data-testid="checkin-card"]'));

    // Rate every field's first (lowest) option so allRated flips true.
    for (const field of CHECKIN_FIELDS) {
      fireEvent.click(container.querySelector(`[aria-label="${field.label} rating 1"]`));
    }

    fireEvent.click(getByText('Save'));

    const today = new Date().toISOString().slice(0, 10);
    const saved = box.current.logs.checkins[today];
    expect(saved).toBeTruthy();
    for (const field of CHECKIN_FIELDS) {
      expect(saved[field.id]).toBe(1);
    }
  });
});
