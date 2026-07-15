// src/platform/__tests__/status-bar.test.js
//
// status-bar.js branches entirely on Capacitor.isNativePlatform() (dynamic
// import of @capacitor/core, cached at module scope) — same shape as
// storage.js, so this mirrors storage.test.js's per-scenario
// vi.resetModules() + vi.doMock() + re-import('../status-bar.js') pattern
// rather than a single top-level vi.mock.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('platform/status-bar', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.doUnmock('@capacitor/core');
    vi.doUnmock('@capacitor/status-bar');
  });

  describe('web (isNativePlatform: false)', () => {
    beforeEach(() => {
      vi.doMock('@capacitor/core', () => ({
        Capacitor: { isNativePlatform: () => false },
      }));
      // Mocked (with spies) even though the web path should never reach
      // it — same idiom as storage.test.js's web scenario: assert the
      // native plugin's calls were never made, rather than just hoping a
      // stray import doesn't throw.
      vi.doMock('@capacitor/status-bar', () => ({
        StatusBar: { setStyle: vi.fn(), setOverlaysWebView: vi.fn() },
        Style: { Dark: 'DARK', Light: 'LIGHT', Default: 'DEFAULT' },
      }));
    });

    it('resolves without ever calling StatusBar.setStyle/setOverlaysWebView', async () => {
      const { initStatusBar } = await import('../status-bar.js');
      const { StatusBar } = await import('@capacitor/status-bar');
      initStatusBar();
      // give the fire-and-forget promise chain a chance to run, then
      // assert it settled WITHOUT touching the native plugin
      await new Promise((r) => setTimeout(r, 10));
      expect(StatusBar.setStyle).not.toHaveBeenCalled();
      expect(StatusBar.setOverlaysWebView).not.toHaveBeenCalled();
    });
  });

  describe('native', () => {
    beforeEach(() => {
      vi.doMock('@capacitor/core', () => ({
        Capacitor: { isNativePlatform: () => true },
      }));
      vi.doMock('@capacitor/status-bar', () => ({
        StatusBar: {
          setStyle: vi.fn().mockResolvedValue(undefined),
          setOverlaysWebView: vi.fn().mockResolvedValue(undefined),
        },
        Style: { Dark: 'DARK', Light: 'LIGHT', Default: 'DEFAULT' },
      }));
    });

    // Capacitor's Style enum is inverted from the intuitive reading — see
    // status-bar.js's file header comment (verified against the plugin's
    // own iOS source AND empirically via a simulator screenshot: a first
    // pass using Style.Light rendered dark, near-invisible icons). Style.Dark
    // is the one that actually produces light/white content, which is what
    // this dark shell needs.
    it('sets Style.Dark (native .lightContent → white icons, for our dark shell)', async () => {
      const { initStatusBar } = await import('../status-bar.js');
      const { StatusBar, Style } = await import('@capacitor/status-bar');

      initStatusBar();

      await vi.waitFor(() => {
        expect(StatusBar.setStyle).toHaveBeenCalledWith({ style: Style.Dark });
      });
      expect(Style.Dark).toBe('DARK');
    });

    it('sets the webview to overlay the status bar (full-bleed, so env(safe-area-inset-top) stays real)', async () => {
      const { initStatusBar } = await import('../status-bar.js');
      const { StatusBar } = await import('@capacitor/status-bar');

      initStatusBar();

      await vi.waitFor(() => {
        expect(StatusBar.setOverlaysWebView).toHaveBeenCalledWith({ overlay: true });
      });
    });

    it('never throws even if the native calls reject', async () => {
      vi.doMock('@capacitor/status-bar', () => ({
        StatusBar: {
          setStyle: vi.fn().mockRejectedValue(new Error('not supported')),
          setOverlaysWebView: vi.fn().mockRejectedValue(new Error('not supported')),
        },
        Style: { Dark: 'DARK', Light: 'LIGHT', Default: 'DEFAULT' },
      }));
      vi.resetModules();
      const { initStatusBar } = await import('../status-bar.js');

      expect(() => initStatusBar()).not.toThrow();
      // let the rejected promise settle inside initStatusBar's own .catch()
      await new Promise((r) => setTimeout(r, 10));
    });
  });
});
