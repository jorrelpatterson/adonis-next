// src/platform/__tests__/deep-link.test.js
//
// deep-link.js branches entirely on Capacitor.isNativePlatform() (dynamic
// import of @capacitor/core, cached at module scope) — same shape as
// camera.js/storage.js/status-bar.js, so this mirrors their per-scenario
// vi.resetModules() + vi.doMock() + re-import('../deep-link.js') pattern
// rather than a single top-level vi.mock.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('platform/deep-link', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.doUnmock('@capacitor/core');
    vi.doUnmock('@capacitor/app');
    vi.doUnmock('../../services/supabase.js');
  });

  describe('web (isNativePlatform: false)', () => {
    const addListenerSpy = vi.fn();
    const exchangeCodeForSession = vi.fn();
    const setSession = vi.fn();

    beforeEach(() => {
      addListenerSpy.mockClear();
      exchangeCodeForSession.mockClear();
      setSession.mockClear();
      vi.doMock('@capacitor/core', () => ({
        Capacitor: { isNativePlatform: () => false },
      }));
      // Mocked (with a spy) even though the web path should never reach
      // it — same idiom as camera.test.js's web scenario: assert the
      // native plugin's calls were never made, rather than just hoping a
      // stray import doesn't throw.
      vi.doMock('@capacitor/app', () => ({
        App: { addListener: addListenerSpy },
      }));
      vi.doMock('../../services/supabase.js', () => ({
        supabase: { auth: { exchangeCodeForSession, setSession } },
      }));
    });

    it('resolves without registering a listener or calling any supabase auth method', async () => {
      const { initDeepLinks } = await import('../deep-link.js');
      await initDeepLinks(vi.fn());

      expect(addListenerSpy).not.toHaveBeenCalled();
      expect(exchangeCodeForSession).not.toHaveBeenCalled();
      expect(setSession).not.toHaveBeenCalled();
    });
  });

  describe('native', () => {
    let capturedListener;
    const exchangeCodeForSession = vi.fn();
    const setSession = vi.fn();

    beforeEach(() => {
      capturedListener = null;
      exchangeCodeForSession.mockReset().mockResolvedValue({ data: {}, error: null });
      setSession.mockReset().mockResolvedValue({ data: {}, error: null });
      vi.doMock('@capacitor/core', () => ({
        Capacitor: { isNativePlatform: () => true },
      }));
      vi.doMock('@capacitor/app', () => ({
        App: {
          addListener: vi.fn((event, cb) => {
            if (event === 'appUrlOpen') capturedListener = cb;
          }),
        },
      }));
      vi.doMock('../../services/supabase.js', () => ({
        supabase: { auth: { exchangeCodeForSession, setSession } },
      }));
    });

    it('registers the appUrlOpen listener', async () => {
      const { initDeepLinks } = await import('../deep-link.js');
      await initDeepLinks(vi.fn());

      expect(capturedListener).toBeInstanceOf(Function);
    });

    it('a ?code= URL calls exchangeCodeForSession with the code, then onAuthComplete', async () => {
      const onAuthComplete = vi.fn();
      const { initDeepLinks } = await import('../deep-link.js');
      await initDeepLinks(onAuthComplete);

      await capturedListener({ url: 'adonis://auth-callback?code=abc' });

      expect(exchangeCodeForSession).toHaveBeenCalledWith('abc');
      expect(setSession).not.toHaveBeenCalled();
      expect(onAuthComplete).toHaveBeenCalledTimes(1);
    });

    it('a #access_token=&refresh_token= URL calls setSession with both tokens, then onAuthComplete', async () => {
      const onAuthComplete = vi.fn();
      const { initDeepLinks } = await import('../deep-link.js');
      await initDeepLinks(onAuthComplete);

      await capturedListener({
        url: 'adonis://auth-callback#access_token=x&refresh_token=y&expires_in=3600&token_type=bearer&type=signup',
      });

      expect(setSession).toHaveBeenCalledWith({ access_token: 'x', refresh_token: 'y' });
      expect(exchangeCodeForSession).not.toHaveBeenCalled();
      expect(onAuthComplete).toHaveBeenCalledTimes(1);
    });

    it('prefers ?code= over hash tokens when a URL somehow carries both', async () => {
      const onAuthComplete = vi.fn();
      const { initDeepLinks } = await import('../deep-link.js');
      await initDeepLinks(onAuthComplete);

      await capturedListener({
        url: 'adonis://auth-callback?code=abc#access_token=x&refresh_token=y',
      });

      expect(exchangeCodeForSession).toHaveBeenCalledWith('abc');
      expect(setSession).not.toHaveBeenCalled();
    });

    it('a non-auth URL (neither code nor token pair) calls neither supabase method nor onAuthComplete', async () => {
      const onAuthComplete = vi.fn();
      const { initDeepLinks } = await import('../deep-link.js');
      await initDeepLinks(onAuthComplete);

      await capturedListener({ url: 'adonis://auth-callback' });

      expect(exchangeCodeForSession).not.toHaveBeenCalled();
      expect(setSession).not.toHaveBeenCalled();
      expect(onAuthComplete).not.toHaveBeenCalled();
    });

    it('a resolved-with-error exchange (bad/expired code) does not call onAuthComplete, and never throws', async () => {
      exchangeCodeForSession.mockResolvedValueOnce({ data: {}, error: { message: 'invalid grant' } });
      const onAuthComplete = vi.fn();
      const { initDeepLinks } = await import('../deep-link.js');
      await initDeepLinks(onAuthComplete);

      await capturedListener({ url: 'adonis://auth-callback?code=badcode' });

      expect(exchangeCodeForSession).toHaveBeenCalledWith('badcode');
      expect(onAuthComplete).not.toHaveBeenCalled();
    });

    it('a rejected (thrown) exchange never crashes the listener', async () => {
      exchangeCodeForSession.mockRejectedValueOnce(new Error('network down'));
      const onAuthComplete = vi.fn();
      const { initDeepLinks } = await import('../deep-link.js');
      await initDeepLinks(onAuthComplete);

      await expect(capturedListener({ url: 'adonis://auth-callback?code=x' })).resolves.not.toThrow();
      expect(onAuthComplete).not.toHaveBeenCalled();
    });
  });
});
