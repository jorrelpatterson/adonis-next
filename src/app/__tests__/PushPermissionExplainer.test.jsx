// src/app/__tests__/PushPermissionExplainer.test.jsx
//
// This sandbox's happy-dom test environment does NOT provide a working
// localStorage — verified directly (`localStorage.setItem is not a
// function`; Node's built-in globalThis.localStorage stub is present but
// inert without a --localstorage-file, and happy-dom doesn't override it
// here). PushPermissionExplainer.jsx already defends against a THROWING
// localStorage (try/catch around every access, same convention as
// AppSettings.jsx — see profile-rebuild.test.jsx's "storageWorks" comment
// for the same underlying issue elsewhere in this suite), but that means
// this environment's real localStorage can't be used to drive test
// PRECONDITIONS or assertions either. Persistence IS the behavior under
// test in this file (unlike profile-rebuild.test.jsx's read-only
// "assert-only-if-it-happens-to-work" degrade), so this file stubs a small
// in-memory localStorage via vi.stubGlobal for deterministic,
// environment-independent coverage instead.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import PushPermissionExplainer, { PUSH_ASKED_KEY } from '../PushPermissionExplainer';
import { requestAndRegister } from '../../platform/push';
import { getSession } from '../../services/auth';

vi.mock('../../platform/push', () => ({
  requestAndRegister: vi.fn(),
}));
vi.mock('../../services/auth', () => ({
  getSession: vi.fn(),
}));

function makeFakeLocalStorage() {
  let store = {};
  return {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { store = {}; },
  };
}

describe('PushPermissionExplainer', () => {
  let fakeLocalStorage;

  beforeEach(() => {
    fakeLocalStorage = makeFakeLocalStorage();
    vi.stubGlobal('localStorage', fakeLocalStorage);
    requestAndRegister.mockReset().mockResolvedValue('granted');
    getSession.mockReset().mockResolvedValue({ session: null, error: null });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('renders the value copy and both buttons', () => {
    render(<PushPermissionExplainer />);

    expect(screen.getByTestId('push-permission-explainer')).toBeTruthy();
    expect(
      screen.getByText("A quiet nudge when it's time to run your protocol — nothing else.")
    ).toBeTruthy();
    expect(screen.getByText('Enable')).toBeTruthy();
    expect(screen.getByText('Not now')).toBeTruthy();
  });

  it('Enable calls requestAndRegister and persists adonis_push_asked', async () => {
    const onDismiss = vi.fn();
    render(<PushPermissionExplainer onDismiss={onDismiss} />);

    fireEvent.click(screen.getByText('Enable'));

    await waitFor(() => expect(requestAndRegister).toHaveBeenCalledTimes(1));
    expect(requestAndRegister).toHaveBeenCalledWith(expect.any(Function));
    await waitFor(() => expect(fakeLocalStorage.getItem(PUSH_ASKED_KEY)).toBe('1'));
    await waitFor(() => expect(onDismiss).toHaveBeenCalledTimes(1));
  });

  it('Not now persists adonis_push_asked and never calls requestAndRegister', () => {
    const onDismiss = vi.fn();
    render(<PushPermissionExplainer onDismiss={onDismiss} />);

    fireEvent.click(screen.getByText('Not now'));

    expect(requestAndRegister).not.toHaveBeenCalled();
    expect(fakeLocalStorage.getItem(PUSH_ASKED_KEY)).toBe('1');
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when adonis_push_asked is already set (self-gates, independent of any parent check)', () => {
    fakeLocalStorage.setItem(PUSH_ASKED_KEY, '1');

    const { container } = render(<PushPermissionExplainer />);

    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId('push-permission-explainer')).toBeNull();
  });

  it("Enable's injected saveToken POSTs the token to /api/push/register with the session's bearer token", async () => {
    getSession.mockResolvedValue({ session: { access_token: 'tok-123' }, error: null });
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchSpy);
    let capturedSaveToken;
    requestAndRegister.mockImplementation(async (saveTokenArg) => {
      capturedSaveToken = saveTokenArg;
      return 'granted';
    });

    render(<PushPermissionExplainer />);
    fireEvent.click(screen.getByText('Enable'));
    await waitFor(() => expect(requestAndRegister).toHaveBeenCalledTimes(1));

    await capturedSaveToken('apns-token-value');

    expect(fetchSpy).toHaveBeenCalledWith('/api/push/register', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        'Content-Type': 'application/json',
        Authorization: 'Bearer tok-123',
      }),
      body: JSON.stringify({ token: 'apns-token-value' }),
    }));
  });
});
