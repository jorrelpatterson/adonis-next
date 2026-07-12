// src/app/__tests__/profile-rebuild.test.jsx
// Task 13 — profile rebuild: ProfileHeader/FitnessPillarsModal/AppSettings/
// ResetConfirmModal ported from v2-revival-archive into src/app/components/,
// wired into App.jsx's profile branch (sign-out, tier-info-without-Stripe,
// pillar-save protocol sync, soft reset via forceOnboarding). Mirrors
// access-code-sync.test.jsx / domain-gating.test.jsx's mock + store-seeding
// pattern (Seed component driving the store's replaceState action).
import { describe, it, expect, vi, afterEach } from 'vitest';
import React, { useEffect } from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { StateProvider, useAppState } from '../../state/store';
// OnboardingFlow (driven in the soft-reset test below) reads getAllProtocols()
// from the shared registry — populate it exactly like App.test.jsx's C1 test
// and the real app boot do.
import '../../protocols/register-all.js';
import App from '../App';
import { useAuth } from '../../services/useAuth.js';

vi.mock('../../services/useAuth.js', () => ({
  useAuth: vi.fn(),
}));

const COMPLETE_PROFILE = {
  name: 'Jordan', age: 30, gender: 'male', weight: 180,
  hFt: 5, hIn: 10, activity: 'moderate', domains: ['body'], tier: 'free',
};

const SEEDED_GOALS = [
  { id: 'g1', title: 'Lose Weight', domain: 'body', status: 'active', templateId: 'lose-weight', activeProtocols: [], progress: { percent: 10 } },
  { id: 'g2', title: 'Build Credit', domain: 'money', status: 'active', templateId: 'build-credit', activeProtocols: [], progress: { percent: 5 } },
];

function Seed({ profile, goals, protocolState }) {
  const { replaceState } = useAppState();
  useEffect(() => {
    replaceState({ profile, ...(goals && { goals }), ...(protocolState && { protocolState }) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

function StateSpy({ box }) {
  const { state } = useAppState();
  useEffect(() => {
    box.current = state;
  });
  return null;
}

function renderApp({ profile = COMPLETE_PROFILE, goals, protocolState, box } = {}) {
  return render(
    <StateProvider>
      <Seed profile={profile} goals={goals} protocolState={protocolState} />
      {box && <StateSpy box={box} />}
      <App />
    </StateProvider>
  );
}

function goToProfile(container, getByText) {
  fireEvent.click(container.querySelector('[data-testid="tab-profile"]'));
}

describe('Task 13: ProfileHeader on the Profile tab', () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it('renders name, pillar, and stat grid from profile + protocolStates', () => {
    useAuth.mockReturnValue({ user: { id: 'u1', email: 'jordan@example.com' }, tier: 'free', loading: false, signOut: vi.fn() });
    const { container, getByText } = renderApp({
      protocolState: { workout: { primary: 'Fat Loss' } },
    });

    goToProfile(container);

    const header = container.querySelector('[data-testid="profile-header"]');
    expect(header).toBeTruthy();
    expect(header.textContent).toContain('Jordan');
    expect(getByText('FAT LOSS')).toBeTruthy(); // pillar pill, derived from protocolStates.workout.primary fallback
    expect(header.textContent).toContain('Age');
    expect(header.textContent).toContain('Weight');
  });
});

describe('Task 13: sign-out', () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it('shows "Log Out" + synced badge with the user email, and calls signOut on click', () => {
    const signOut = vi.fn();
    useAuth.mockReturnValue({ user: { id: 'u1', email: 'jordan@example.com' }, tier: 'free', loading: false, signOut });
    const { container, getByText } = renderApp();

    goToProfile(container);

    expect(getByText('jordan@example.com')).toBeTruthy();
    expect(getByText('Synced')).toBeTruthy();
    fireEvent.click(getByText('Log Out'));
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('hides the Account card (Log Out + synced badge) when there is no user', () => {
    // A signed-out user with a complete profile never actually reaches the
    // tab shell (funnel gate below shows AuthScreen) — this exercises the
    // guard's `{user && ...}` branch directly via the dev/E2E bypass (same
    // ?e2e=1&tab=profile param e2e-bypass.test.jsx uses), which seeds a
    // complete profile and jumps straight to the profile tab without an
    // authenticated user.
    useAuth.mockReturnValue({ user: null, tier: 'free', loading: false, signOut: vi.fn() });
    const originalSearch = window.location.search;
    const url = new URL(window.location.href);
    url.search = '?e2e=1&tab=profile';
    window.history.replaceState(null, '', url);

    const { queryByText } = render(
      <StateProvider>
        <App />
      </StateProvider>
    );

    expect(queryByText('Log Out')).toBeFalsy();
    expect(queryByText('Synced')).toBeFalsy();

    const restoreUrl = new URL(window.location.href);
    restoreUrl.search = originalSearch;
    window.history.replaceState(null, '', restoreUrl);
  });
});

describe('Task 13: FitnessPillarsModal save syncs both protocol states', () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it('promoting Muscle Gain to primary writes workout.primary AND peptides.optimizeFor', () => {
    useAuth.mockReturnValue({ user: { id: 'u1', email: 'jordan@example.com' }, tier: 'free', loading: false, signOut: vi.fn() });
    const box = { current: null };
    const { container, getByText } = renderApp({
      protocolState: { workout: { primary: 'Fat Loss' } },
      box,
    });

    goToProfile(container);
    fireEvent.click(getByText('+ EDIT'));

    // "Muscle Gain" row: first click adds it (inactive -> active), second
    // click promotes the now-active pillar to primary (component's own
    // isActive ? promoteToPrimary : togglePillar branch).
    fireEvent.click(getByText('Muscle Gain'));
    fireEvent.click(getByText('Muscle Gain'));
    fireEvent.click(getByText('Save'));

    expect(box.current.protocolState.workout.primary).toBe('Muscle Gain');
    expect(box.current.protocolState.peptides.optimizeFor).toEqual(['muscle']);
  });
});

describe('Task 13: AppSettings toggles persist', () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  // AppSettings.jsx wraps every localStorage call in try/catch (component
  // must never crash if storage is unavailable — private browsing, this
  // sandbox's own localStorage, etc.), so this test mirrors that defensively:
  // it always asserts the DOM-class side effect (independent of storage),
  // and asserts the localStorage value too whenever this environment's
  // localStorage is actually functional.
  const storageWorks = (() => {
    try { localStorage.setItem('__probe__', '1'); localStorage.removeItem('__probe__'); return true; }
    catch { return false; }
  })();

  it('reduced-motion toggle toggles the <html> class (and persists to localStorage where available)', () => {
    useAuth.mockReturnValue({ user: { id: 'u1', email: 'jordan@example.com' }, tier: 'free', loading: false, signOut: vi.fn() });
    if (storageWorks) localStorage.removeItem('adonis_reduced_motion');
    document.documentElement.classList.remove('adn-reduced-motion');

    const { container } = renderApp();
    goToProfile(container);

    const switches = container.querySelectorAll('[role="switch"]');
    expect(switches.length).toBe(2); // Sound effects, Reduced motion (in that order)
    const reducedMotionSwitch = switches[1];

    expect(reducedMotionSwitch.getAttribute('aria-checked')).toBe('false');
    fireEvent.click(reducedMotionSwitch);
    expect(reducedMotionSwitch.getAttribute('aria-checked')).toBe('true');
    expect(document.documentElement.classList.contains('adn-reduced-motion')).toBe(true);
    if (storageWorks) expect(localStorage.getItem('adonis_reduced_motion')).toBe('1');

    fireEvent.click(reducedMotionSwitch);
    expect(reducedMotionSwitch.getAttribute('aria-checked')).toBe('false');
    expect(document.documentElement.classList.contains('adn-reduced-motion')).toBe(false);
    if (storageWorks) expect(localStorage.getItem('adonis_reduced_motion')).toBe('0');
  });

  it('sound toggle flips aria-checked on click', () => {
    useAuth.mockReturnValue({ user: { id: 'u1', email: 'jordan@example.com' }, tier: 'free', loading: false, signOut: vi.fn() });
    const { container } = renderApp();
    goToProfile(container);

    const soundSwitch = container.querySelectorAll('[role="switch"]')[0];
    const before = soundSwitch.getAttribute('aria-checked');
    fireEvent.click(soundSwitch);
    expect(soundSwitch.getAttribute('aria-checked')).toBe(before === 'true' ? 'false' : 'true');
  });
});

describe('Task 13: soft reset (forceOnboarding)', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    delete global.fetch;
  });

  it('typing RESET re-enters onboarding; completing it leaves goals untouched and never shows the signup screen', () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: true })); // in case a funnel-resume effect fires
    useAuth.mockReturnValue({ user: { id: 'u1', email: 'jordan@example.com' }, tier: 'free', loading: false, signOut: vi.fn() });
    const box = { current: null };
    const { container, getByText, getByPlaceholderText, queryByText } = renderApp({
      goals: SEEDED_GOALS,
      box,
    });

    goToProfile(container);
    expect(box.current.goals.length).toBe(2);

    fireEvent.click(getByText('Reset & Start Over'));
    fireEvent.change(getByPlaceholderText('Type RESET'), { target: { value: 'RESET' } });
    fireEvent.click(getByText('Re-run Setup'));

    // OnboardingFlow renders even though the profile was already complete —
    // never the returning-device AuthScreen ("Welcome back") or a blank form.
    expect(getByText('Tell us about you')).toBeTruthy();
    expect(queryByText('Welcome back')).toBeFalsy();

    // Basics + domains are pre-filled from initialProfile={profile} (soft
    // reset carries the existing answers forward) — just advance.
    fireEvent.click(getByText('Continue')); // basics
    fireEvent.click(getByText('Continue')); // domains (Body locked on)
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
    // nutrition
    fireEvent.change(getByPlaceholderText('180'), { target: { value: '165' } });
    fireEvent.change(container.querySelector('input[type="date"]'), { target: { value: '2026-12-31' } });
    fireEvent.click(getByText('Continue'));
    // schedule
    fireEvent.click(getByText('Employee'));
    fireEvent.click(getByText('Build my protocol'));

    // Never the signup gate's AuthScreen ("Create your account") — instead
    // the calculating replay, which the brief calls out as fine.
    expect(queryByText('Create your account')).toBeFalsy();
    expect(getByText(/Analyzing your profile/)).toBeTruthy();

    // Goals array is exactly what it was before — no re-seed, no dupes.
    expect(box.current.goals.length).toBe(2);
    expect(box.current.goals.map(g => g.id).sort()).toEqual(['g1', 'g2']);
  });
});
