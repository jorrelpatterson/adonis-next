// src/app/__tests__/domain-gating.test.jsx
// Task 12 (DoD item 7) — "Hit Free-tier limits, see polished locked states,
// redeem an access code to unlock." Mirrors access-code-sync.test.jsx's
// mocking + store-seeding patterns (Seed component driving the store's
// replaceState action).
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

vi.mock('../../services/auth.js', async () => {
  const actual = await vi.importActual('../../services/auth.js');
  return { ...actual, updateUserTier: vi.fn() };
});

const BASE_PROFILE = {
  name: 'Jordan', age: 30, gender: 'male', weight: 180,
  hFt: 5, hIn: 10, activity: 'moderate', domains: ['body', 'money'], tier: 'free',
};

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

describe('free-tier locked domain states', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('free tier: Money tab renders the locked state, not the generic domain view', () => {
    useAuth.mockReturnValue({ user: { id: 'u1' }, tier: 'free', loading: false, signOut: vi.fn() });

    const { getByTestId, queryByText, getByText } = renderApp(BASE_PROFILE);

    fireEvent.click(getByTestId('tab-money'));

    expect(getByText(/Locked — Pro feature/)).toBeTruthy();
    expect(getByText('Redeem an access code')).toBeTruthy();
    // The generic (unlocked) domain view never mounted
    expect(queryByText('No Money goals yet')).toBeNull();
  });

  it('Body never locks, even on free tier', () => {
    useAuth.mockReturnValue({ user: { id: 'u1' }, tier: 'free', loading: false, signOut: vi.fn() });

    const { getByTestId, queryByText } = renderApp(BASE_PROFILE);

    fireEvent.click(getByTestId('tab-body'));

    expect(queryByText(/Locked — Pro feature/)).toBeNull();
  });

  it('Insights is never locked on free tier', () => {
    useAuth.mockReturnValue({ user: { id: 'u1' }, tier: 'free', loading: false, signOut: vi.fn() });

    const { getByTestId, queryByText } = renderApp(BASE_PROFILE);

    fireEvent.click(getByTestId('tab-insights'));

    expect(queryByText(/Locked — Pro feature/)).toBeNull();
  });

  it('pro tier: Money tab renders the generic (unlocked) domain view', () => {
    useAuth.mockReturnValue({ user: { id: 'u1' }, tier: 'pro', loading: false, signOut: vi.fn() });

    const { getByTestId, queryByText, getByText } = renderApp({ ...BASE_PROFILE, tier: 'pro' });

    fireEvent.click(getByTestId('tab-money'));

    expect(queryByText(/Locked — Pro feature/)).toBeNull();
    expect(getByText('No Money goals yet')).toBeTruthy();
  });

  it('CTA on the locked state switches to the Profile tab', () => {
    useAuth.mockReturnValue({ user: { id: 'u1' }, tier: 'free', loading: false, signOut: vi.fn() });

    const { getByTestId, getByText, getByPlaceholderText } = renderApp(BASE_PROFILE);

    fireEvent.click(getByTestId('tab-money'));
    fireEvent.click(getByText('Redeem an access code'));

    // Profile-tab-only content
    expect(getByPlaceholderText('Enter code')).toBeTruthy();
  });

  it('drives the full DoD loop: locked -> CTA -> redeem ADONIS2026 -> unlocked', () => {
    useAuth.mockReturnValue({ user: { id: 'u1' }, tier: 'free', loading: false, signOut: vi.fn() });
    updateUserTier.mockResolvedValue({ user: { id: 'u1' }, error: null });

    const { getByTestId, getByText, getByPlaceholderText, queryByText } = renderApp(BASE_PROFILE);

    // 1. Free tier: Money is locked.
    fireEvent.click(getByTestId('tab-money'));
    expect(getByText(/Locked — Pro feature/)).toBeTruthy();

    // 2. CTA switches to Profile.
    fireEvent.click(getByText('Redeem an access code'));
    const input = getByPlaceholderText('Enter code');

    // 3. Redeem the pro-tier access code (mirrors access-code-sync.test.jsx).
    fireEvent.change(input, { target: { value: 'ADONIS2026' } });
    fireEvent.click(getByText('Apply'));
    expect(updateUserTier).toHaveBeenCalledWith('pro', 'ADONIS2026');

    // 4. Back to Money — now unlocked.
    fireEvent.click(getByTestId('tab-money'));
    expect(queryByText(/Locked — Pro feature/)).toBeNull();
    expect(getByText('No Money goals yet')).toBeTruthy();
  });
});
