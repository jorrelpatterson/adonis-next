// src/app/__tests__/funnel.test.jsx
// Task 11 — the auth-gated funnel (spec decision 4: signup gate BEFORE
// protocol delivery). Funnel order: onboarding → signup → calculating →
// gameplan → app. This suite pins the *entry* branch the gate picks for a
// given (profile completeness, auth state) combination — it does not drive
// the transient calculating/gameplan hops (that's covered by
// src/onboarding/__tests__/screens.test.jsx and the manual smoke pass).
import { describe, it, expect, vi, afterEach } from 'vitest';
import React, { useEffect } from 'react';
import { render, cleanup } from '@testing-library/react';
import { StateProvider, useAppState } from '../../state/store';
import App from '../App';
import { useAuth } from '../../services/useAuth.js';

vi.mock('../../services/useAuth.js', () => ({
  useAuth: vi.fn(),
}));

const COMPLETE_PROFILE = {
  name: 'Jordan', age: 30, gender: 'male', weight: 180,
  hFt: 5, hIn: 10, activity: 'moderate', domains: ['body'], tier: 'free',
};

// localStorage isn't wired up in this test environment (store.jsx's loadState()
// only survives because it's try/catch-wrapped), so we seed profile state
// through the store's existing replaceState action rather than localStorage.
function Seed({ profile }) {
  const { replaceState } = useAppState();
  useEffect(() => {
    replaceState({ profile });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

function renderApp(profileOverrides) {
  return render(
    <StateProvider>
      {profileOverrides && <Seed profile={profileOverrides} />}
      <App />
    </StateProvider>
  );
}

describe('App funnel gate', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('fresh state (empty profile) + no user renders onboarding, not the tab shell', () => {
    useAuth.mockReturnValue({ user: null, tier: 'free', loading: false, signOut: vi.fn() });
    const { getByText, queryByText } = renderApp(); // no seed → DEFAULT_STATE profile (incomplete)

    expect(getByText('Tell us about you')).toBeTruthy();
    expect(queryByText('Routine')).toBeFalsy();
  });

  it('complete profile + no user renders AuthScreen', () => {
    useAuth.mockReturnValue({ user: null, tier: 'free', loading: false, signOut: vi.fn() });
    const { getByText, queryByText } = renderApp(COMPLETE_PROFILE);

    expect(getByText('Welcome back')).toBeTruthy();
    expect(queryByText('Tell us about you')).toBeFalsy();
    expect(queryByText('Routine')).toBeFalsy();
  });

  it('complete profile + signed-in user renders the tab shell (Routine tab)', () => {
    useAuth.mockReturnValue({ user: { id: 'u1' }, tier: 'free', loading: false, signOut: vi.fn() });
    const { getByText, queryByText } = renderApp(COMPLETE_PROFILE);

    expect(getByText('Routine')).toBeTruthy();
    expect(queryByText('Welcome back')).toBeFalsy();
    expect(queryByText('Tell us about you')).toBeFalsy();
  });

  it('loading renders the boot splash, with no AuthScreen flash', () => {
    useAuth.mockReturnValue({ user: null, tier: 'free', loading: true, signOut: vi.fn() });
    const { getByTestId, queryByText } = renderApp(COMPLETE_PROFILE);

    expect(getByTestId('boot-splash')).toBeTruthy();
    expect(queryByText('Welcome back')).toBeFalsy();
    expect(queryByText('Tell us about you')).toBeFalsy();
  });
});
