import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mock the auth service BEFORE importing useAuth.js
const mockUnsubscribe = vi.fn();
let authStateCallback = null;

const mockAuth = {
  getSession: vi.fn(),
  onAuthStateChange: vi.fn((cb) => {
    authStateCallback = cb;
    return mockUnsubscribe;
  }),
  signOut: vi.fn(),
  tierFromUser: vi.fn((user) => {
    const t = user?.user_metadata?.tier;
    return t === 'pro' || t === 'elite' ? t : 'free';
  }),
};

vi.mock('../auth.js', () => ({
  getSession: (...args) => mockAuth.getSession(...args),
  onAuthStateChange: (...args) => mockAuth.onAuthStateChange(...args),
  signOut: (...args) => mockAuth.signOut(...args),
  tierFromUser: (...args) => mockAuth.tierFromUser(...args),
}));

const { useAuth } = await import('../useAuth.js');

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authStateCallback = null;
    mockAuth.getSession.mockResolvedValue({ session: null, error: null });
    if (typeof window.localStorage.clear === 'function') {
      window.localStorage.clear();
    } else {
      // happy-dom / node's global localStorage may not implement clear()
      const keys = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        keys.push(window.localStorage.key(i));
      }
      keys.forEach((k) => window.localStorage.removeItem(k));
    }
  });

  it('starts loading and resolves to loading=false with no user when no session', async () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.user).toBeNull();
    expect(result.current.tier).toBe('free');
  });

  it('sets user from getSession() once resolved', async () => {
    const fakeUser = { id: 'user-1', user_metadata: { tier: 'pro' } };
    mockAuth.getSession.mockResolvedValue({ session: { user: fakeUser }, error: null });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.user).toEqual(fakeUser);
    expect(result.current.tier).toBe('pro');
  });

  it('updates user when onAuthStateChange fires a new session', async () => {
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const fakeUser = { id: 'user-2', user_metadata: { tier: 'elite' } };
    act(() => {
      authStateCallback({ event: 'SIGNED_IN', session: { user: fakeUser } });
    });

    expect(result.current.user).toEqual(fakeUser);
    expect(result.current.tier).toBe('elite');
  });

  it('clears user when onAuthStateChange fires a null session', async () => {
    const fakeUser = { id: 'user-3', user_metadata: { tier: 'pro' } };
    mockAuth.getSession.mockResolvedValue({ session: { user: fakeUser }, error: null });

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.user).toEqual(fakeUser));

    act(() => {
      authStateCallback({ event: 'SIGNED_OUT', session: null });
    });

    expect(result.current.user).toBeNull();
    expect(result.current.tier).toBe('free');
  });

  it('defaults tier to free when user has no metadata tier', async () => {
    const fakeUser = { id: 'user-4', user_metadata: {} };
    mockAuth.getSession.mockResolvedValue({ session: { user: fakeUser }, error: null });

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.tier).toBe('free');
  });

  it('signOut calls authSignOut, clears adonis_v2 from localStorage, and reloads', async () => {
    // The sandboxed test env's built-in `localStorage` global is a non-functional
    // stub (no setItem/removeItem), so stub a real in-memory implementation here
    // rather than relying on the ambient one.
    mockAuth.signOut.mockResolvedValue({ error: null });
    const store = new Map([['adonis_v2', JSON.stringify({ some: 'state' })]]);
    const fakeLocalStorage = {
      getItem: vi.fn((k) => (store.has(k) ? store.get(k) : null)),
      setItem: vi.fn((k, v) => store.set(k, v)),
      removeItem: vi.fn((k) => store.delete(k)),
      clear: vi.fn(() => store.clear()),
    };
    vi.stubGlobal('localStorage', fakeLocalStorage);

    const reloadSpy = vi.fn();
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, reload: reloadSpy },
    });

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.signOut();
    });

    expect(mockAuth.signOut).toHaveBeenCalled();
    expect(fakeLocalStorage.removeItem).toHaveBeenCalledWith('adonis_v2');
    expect(store.has('adonis_v2')).toBe(false);
    expect(reloadSpy).toHaveBeenCalled();

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
    vi.unstubAllGlobals();
  });

  it('returns exactly { user, tier, loading, signOut }', async () => {
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(Object.keys(result.current).sort()).toEqual(['loading', 'signOut', 'tier', 'user']);
  });

  it('calls unsubscribe on unmount', async () => {
    const { result, unmount } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockUnsubscribe).not.toHaveBeenCalled();
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
