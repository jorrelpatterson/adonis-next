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
// OnboardingFlow (driven in the C1 test) reads getAllProtocols() from the
// shared registry — populate it exactly like the real app boot does.
import '../../protocols/register-all.js';
import { computeAdaptive } from '../../protocols/body/nutrition/adaptive-calories';
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

// Seeds an arbitrary profile (the shared Seed above is hardwired to
// COMPLETE_PROFILE) — used by the I2 viewDay-leak test.
function SeedProfile({ profile }) {
  const { replaceState } = useAppState();
  useEffect(() => {
    replaceState({ profile });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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

describe('Task 11: Insights tab', () => {
  afterEach(() => cleanup());

  it('clicking the Insights tab renders InsightsView', () => {
    const { container } = render(
      <StateProvider>
        <Seed />
        <App />
      </StateProvider>
    );
    fireEvent.click(container.querySelector('[data-testid="tab-insights"]'));
    expect(container.textContent).toContain('90-Day Consistency');
    expect(container.textContent).toContain('Correlations');
  });
});

describe('C1: onboarding goal answers reach the profile (adaptive layer live)', () => {
  afterEach(() => {
    cleanup();
    delete global.fetch;
  });

  it('completing onboarding writes goalW + targetDate to the profile, activating computeAdaptive', () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: true })); // funnel-resume lead-capture
    const box = { current: null };
    const { getByText, getByPlaceholderText, container } = render(
      <StateProvider>
        <StateSpy box={box} />
        <App />
      </StateProvider>
    );

    // Drive the full wizard (labels verbatim from the protocol question defs,
    // mirroring src/onboarding/__tests__/OnboardingFlow.test.jsx).
    // basics
    fireEvent.change(getByPlaceholderText('Your name'), { target: { value: 'Test User' } });
    fireEvent.change(getByPlaceholderText('32'), { target: { value: '32' } });
    fireEvent.click(getByText('Select…')); fireEvent.click(getByText('Male'));
    fireEvent.change(getByPlaceholderText('180'), { target: { value: '190' } });
    fireEvent.change(getByPlaceholderText('5'), { target: { value: '5' } });
    fireEvent.change(getByPlaceholderText('11'), { target: { value: '11' } });
    fireEvent.click(getByText('Moderately active'));
    fireEvent.click(getByText('Continue'));
    // domains — Body locked on
    fireEvent.click(getByText('Continue'));
    // workout
    fireEvent.click(getByText('Lose fat'));
    fireEvent.click(getByText('Morning'));
    fireEvent.click(getByText('Full gym'));
    fireEvent.click(getByText('Continue'));
    // peptides
    fireEvent.click(getByText('\u{1F525} Drop body fat'));
    fireEvent.click(getByText('Never — I\'m new to this'));
    fireEvent.click(getByText('No'));
    fireEvent.click(getByText('Under $150/mo'));
    fireEvent.click(getByText('Fine with daily SubQ'));
    fireEvent.click(getByText('Continue'));
    // nutrition — goalWeight + targetDate are the answers C1 hoists onto profile
    fireEvent.change(getByPlaceholderText('180'), { target: { value: '165' } });
    fireEvent.change(container.querySelector('input[type="date"]'), { target: { value: '2026-12-31' } });
    fireEvent.click(getByText('Continue'));
    // schedule
    fireEvent.click(getByText('Employee'));
    fireEvent.click(getByText('Build my protocol'));

    const profile = box.current.profile;
    expect(profile.goalW).toBe(165);
    expect(typeof profile.goalW).toBe('number');
    expect(profile.targetDate).toBe('2026-12-31');

    // The whole point: the adaptive engine now leaves its no_goal early-return.
    const today = new Date().toISOString().slice(0, 10);
    expect(computeAdaptive(profile, [], today, 'Fat Loss').pace).not.toBe('no_goal');
  });
});

describe('I2: viewDay does not leak into the Home tab', () => {
  afterEach(() => cleanup());

  it('browsing Routine to another day, then returning Home, snaps the dashboard back to real today', () => {
    const todayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];
    // goalW + targetDate activate the adaptive pace line, which renders the
    // dashboard's day-name label ("{weekday} · {paceLabel}") we assert on.
    const profile = { ...COMPLETE_PROFILE, goalW: 170, targetDate: '2026-12-31' };
    const { container } = render(
      <StateProvider>
        <SeedProfile profile={profile} />
        <App />
      </StateProvider>
    );

    // Routine → move viewDay off today via a different day chip.
    fireEvent.click(container.querySelector('[data-testid="tab-routine"]'));
    const todayDow = new Date().getDay();
    const otherIdx = (todayDow + 3) % 7; // guaranteed != todayDow
    fireEvent.click(container.querySelector(`[data-testid="day-chip-${otherIdx}"]`));

    // Back to Home — the dashboard must reflect TODAY, not the browsed day.
    fireEvent.click(container.querySelector('[data-testid="tab-home"]'));
    const dash = container.querySelector('[data-testid="home-dashboard"]');
    expect(dash).toBeTruthy();
    expect(dash.textContent).toContain(todayName);
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

  it('regression: a check-in saved from Home after browsing Routine to another day still writes to REAL today, not the Routine view-day', () => {
    const box = { current: null };
    const { container, getByText } = render(
      <StateProvider>
        <Seed />
        <StateSpy box={box} />
        <App />
      </StateProvider>
    );

    // Navigate to Routine (TabNav tab, data-testid="tab-routine" — "Routine"
    // text alone is ambiguous, HomeDashboard also has a "Routine" stat tile)
    // and move viewDay off today by clicking a different day chip
    // (RoutineView renders 7 chips as data-testid="day-chip-<i>", one per
    // weekday index; pick any index other than today's).
    fireEvent.click(container.querySelector('[data-testid="tab-routine"]'));
    const todayDow = new Date().getDay();
    const otherIdx = (todayDow + 3) % 7; // guaranteed != todayDow
    fireEvent.click(container.querySelector(`[data-testid="day-chip-${otherIdx}"]`));

    // Back to Home — the check-in card lives there — and save a check-in.
    fireEvent.click(container.querySelector('[data-testid="tab-home"]'));
    fireEvent.click(container.querySelector('[data-testid="checkin-card"]'));
    for (const field of CHECKIN_FIELDS) {
      fireEvent.click(container.querySelector(`[aria-label="${field.label} rating 1"]`));
    }
    fireEvent.click(getByText('Save'));

    const today = new Date().toISOString().slice(0, 10);
    const checkins = box.current.logs.checkins;
    expect(checkins[today]).toBeTruthy();
    for (const field of CHECKIN_FIELDS) {
      expect(checkins[today][field.id]).toBe(1);
    }
    // No other date key should have been written by this save.
    expect(Object.keys(checkins)).toEqual([today]);
  });
});
