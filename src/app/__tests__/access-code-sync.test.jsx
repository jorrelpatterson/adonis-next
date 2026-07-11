// src/app/__tests__/access-code-sync.test.jsx
// Task 13 — access code redemption stamps tier into Supabase user metadata
// (via updateUserTier) so unlocks survive reinstall, and on any sign-in where
// metadata tier outranks the local profile tier, the local profile is
// upgraded to match (restore-on-login). Mirrors funnel.test.jsx's mocking +
// store-seeding patterns (Seed component driving the store's replaceState).
import { describe, it, expect, vi, afterEach } from 'vitest';
import React, { useEffect } from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { StateProvider, useAppState } from '../../state/store';
import App from '../App';
import { useAuth } from '../../services/useAuth.js';
import { updateUserTier } from '../../services/auth.js';

vi.mock('../../services/useAuth.js', () => ({
  useAuth: vi.fn(),
}));

// Partial mock: keep every other export (signUpWithEmail, signInWithEmail,
// tierFromUser, etc.) working as-is for useAuth's real internals / other
// consumers — only updateUserTier is replaced with a spy.
vi.mock('../../services/auth.js', async () => {
  const actual = await vi.importActual('../../services/auth.js');
  return { ...actual, updateUserTier: vi.fn() };
});

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

describe('access code -> user metadata sync', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('redeeming a code stamps tier + code into user metadata and updates the tier badge', () => {
    useAuth.mockReturnValue({ user: { id: 'u1' }, tier: 'free', loading: false, signOut: vi.fn() });
    updateUserTier.mockResolvedValue({ user: { id: 'u1' }, error: null });

    const { getByText, getByPlaceholderText, getAllByText } = renderApp(COMPLETE_PROFILE);

    // Navigate to the profile tab (bottom nav "Profile" label; click bubbles
    // from the label span up to the tab button's onClick handler).
    fireEvent.click(getByText('Profile'));

    const input = getByPlaceholderText('Enter code');
    fireEvent.change(input, { target: { value: 'FOUNDER' } });
    fireEvent.click(getByText('Apply'));

    expect(updateUserTier).toHaveBeenCalledWith('elite', 'FOUNDER');
    expect(getAllByText('Elite').length).toBeGreaterThan(0);
  });

  it('restores local profile tier from metadata on sign-in when metadata outranks local (never downgrades)', () => {
    // authTier 'pro' from metadata; local profile seeded fresh at 'free' —
    // restore effect should upgrade local to 'pro'.
    useAuth.mockReturnValue({ user: { id: 'u1', user_metadata: { tier: 'pro' } }, tier: 'pro', loading: false, signOut: vi.fn() });

    const { getByText, getAllByText } = renderApp({ ...COMPLETE_PROFILE, tier: 'free' });

    fireEvent.click(getByText('Profile'));

    expect(getAllByText('Pro').length).toBeGreaterThan(0);
  });
});
