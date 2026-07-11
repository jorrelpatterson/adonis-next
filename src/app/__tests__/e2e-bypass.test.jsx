// src/app/__tests__/e2e-bypass.test.jsx
// Task 14 — dev/E2E URL-param bypass (Verification addendum): lets the
// headless screenshot shooter reach inner screens without driving the real
// auth+onboarding funnel. `import.meta.env.DEV` is true under vitest (same
// as `vite dev`), so this exercises the real gate — see App.jsx.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/react';
import { StateProvider } from '../../state/store';
import App from '../App';
import { useAuth } from '../../services/useAuth.js';

vi.mock('../../services/useAuth.js', () => ({
  useAuth: vi.fn(),
}));

const ORIGINAL_SEARCH = window.location.search;

function setSearch(search) {
  const url = new URL(window.location.href);
  url.search = search;
  window.history.replaceState(null, '', url);
}

function renderApp() {
  return render(
    <StateProvider>
      <App />
    </StateProvider>
  );
}

describe('App dev/E2E bypass', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    setSearch(ORIGINAL_SEARCH);
  });

  it('?e2e=1&tab=profile (signed-out) skips auth+onboarding, lands on the profile tab', async () => {
    useAuth.mockReturnValue({ user: null, tier: 'free', loading: false, signOut: vi.fn() });
    setSearch('?e2e=1&tab=profile');

    const { getByRole, queryByText } = renderApp();

    await waitFor(() => expect(getByRole('heading', { name: 'Profile' })).toBeTruthy());
    expect(queryByText('Welcome back')).toBeFalsy();
    expect(queryByText('Tell us about you')).toBeFalsy();
  });

  it('?e2e=1&tab=home (signed-out) skips auth+onboarding, lands on the home tab (Task 13 default)', async () => {
    useAuth.mockReturnValue({ user: null, tier: 'free', loading: false, signOut: vi.fn() });
    setSearch('?e2e=1&tab=home');

    const { container, queryByText } = renderApp();

    await waitFor(() => expect(container.querySelector('[data-testid="home-dashboard"]')).toBeTruthy());
    expect(queryByText('Welcome back')).toBeFalsy();
    expect(queryByText('Tell us about you')).toBeFalsy();
  });

  it('?screen=auth forces AuthScreen despite an empty (incomplete) profile', () => {
    useAuth.mockReturnValue({ user: null, tier: 'free', loading: false, signOut: vi.fn() });
    setSearch('?screen=auth');

    const { getByText, queryByText } = renderApp();

    expect(getByText('Welcome back')).toBeTruthy();
    expect(queryByText('Tell us about you')).toBeFalsy();
  });
});
