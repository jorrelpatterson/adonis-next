// src/design/__tests__/haptics.test.js
//
// haptics.js branches entirely on Capacitor.isNativePlatform() (dynamic
// import of @capacitor/core, cached at module scope) — same shape as
// platform/storage.js and platform/status-bar.js, so this mirrors their
// per-scenario vi.resetModules() + vi.doMock() + re-import('../haptics.js')
// pattern rather than a single top-level vi.mock (dynamic imports need a
// fresh module instance per scenario to pick up a different mock).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

function mockHapticsPlugin(overrides = {}) {
  return {
    Haptics: {
      impact: vi.fn().mockResolvedValue(undefined),
      notification: vi.fn().mockResolvedValue(undefined),
      selectionStart: vi.fn().mockResolvedValue(undefined),
      selectionChanged: vi.fn().mockResolvedValue(undefined),
      selectionEnd: vi.fn().mockResolvedValue(undefined),
      ...overrides,
    },
    // Real string values from @capacitor/haptics' definitions.ts — kept
    // identical so a style/type typo in haptics.js would show up as a
    // mismatched call arg rather than an accidentally-matching mock.
    ImpactStyle: { Heavy: 'HEAVY', Medium: 'MEDIUM', Light: 'LIGHT' },
    NotificationType: { Success: 'SUCCESS', Warning: 'WARNING', Error: 'ERROR' },
  };
}

function stubMatchMedia(matches) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches, addEventListener() {}, removeEventListener() {} }))
  );
}

describe('design/haptics', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.doUnmock('@capacitor/core');
    vi.doUnmock('@capacitor/haptics');
    vi.unstubAllGlobals();
  });

  describe('web (isNativePlatform: false)', () => {
    beforeEach(() => {
      stubMatchMedia(false);
      vi.doMock('@capacitor/core', () => ({
        Capacitor: { isNativePlatform: () => false },
      }));
      vi.doMock('@capacitor/haptics', () => mockHapticsPlugin());
    });

    it.each([
      ['light', 8],
      ['medium', 15],
      ['heavy', [20, 10, 20]],
      ['success', [10, 30, 10]],
      ['warning', [20, 40, 20]],
      ['error', [40, 30, 40, 30, 40]],
      ['selection', 5],
    ])('%s calls navigator.vibrate with its web pattern and never touches the native plugin', async (method, pattern) => {
      const spy = vi.fn();
      vi.stubGlobal('navigator', { vibrate: spy });
      const { haptics } = await import('../haptics.js');
      const { Haptics } = await import('@capacitor/haptics');

      haptics[method]();

      await vi.waitFor(() => {
        expect(spy).toHaveBeenCalledWith(pattern);
      });
      expect(Haptics.impact).not.toHaveBeenCalled();
      expect(Haptics.notification).not.toHaveBeenCalled();
      expect(Haptics.selectionStart).not.toHaveBeenCalled();
      expect(Haptics.selectionChanged).not.toHaveBeenCalled();
      expect(Haptics.selectionEnd).not.toHaveBeenCalled();
    });
  });

  describe('native (isNativePlatform: true)', () => {
    beforeEach(() => {
      stubMatchMedia(false);
      vi.doMock('@capacitor/core', () => ({
        Capacitor: { isNativePlatform: () => true },
      }));
      vi.doMock('@capacitor/haptics', () => mockHapticsPlugin());
    });

    it.each([
      ['light', 'Light'],
      ['medium', 'Medium'],
      ['heavy', 'Heavy'],
    ])('%s() calls Haptics.impact({ style: ImpactStyle.%s }) and never touches navigator.vibrate', async (method, styleKey) => {
      const spy = vi.fn();
      vi.stubGlobal('navigator', { vibrate: spy });
      const { haptics } = await import('../haptics.js');
      const { Haptics, ImpactStyle } = await import('@capacitor/haptics');

      haptics[method]();

      await vi.waitFor(() => {
        expect(Haptics.impact).toHaveBeenCalledWith({ style: ImpactStyle[styleKey] });
      });
      expect(spy).not.toHaveBeenCalled();
    });

    it.each([
      ['success', 'Success'],
      ['warning', 'Warning'],
      ['error', 'Error'],
    ])('%s() calls Haptics.notification({ type: NotificationType.%s }) and never touches navigator.vibrate', async (method, typeKey) => {
      const spy = vi.fn();
      vi.stubGlobal('navigator', { vibrate: spy });
      const { haptics } = await import('../haptics.js');
      const { Haptics, NotificationType } = await import('@capacitor/haptics');

      haptics[method]();

      await vi.waitFor(() => {
        expect(Haptics.notification).toHaveBeenCalledWith({ type: NotificationType[typeKey] });
      });
      expect(spy).not.toHaveBeenCalled();
    });

    // This is the regression test for the file header's documented finding:
    // a bare selectionChanged() is a no-op on both the native iOS plugin
    // (Haptics.swift) and its web fallback (web.ts) unless selectionStart()
    // primed it first. If haptics.js ever "simplified" selection() down to
    // just Haptics.selectionChanged(), this test would still pass (the mock
    // doesn't encode the real no-op behavior) — the ORDER assertions below
    // are what actually pins the start-before-changed-before-end contract.
    it('selection() fires selectionStart -> selectionChanged -> selectionEnd, in that order', async () => {
      const { haptics } = await import('../haptics.js');
      const { Haptics } = await import('@capacitor/haptics');

      haptics.selection();

      await vi.waitFor(() => {
        expect(Haptics.selectionEnd).toHaveBeenCalledTimes(1);
      });
      expect(Haptics.selectionStart).toHaveBeenCalledTimes(1);
      expect(Haptics.selectionChanged).toHaveBeenCalledTimes(1);

      const startOrder = Haptics.selectionStart.mock.invocationCallOrder[0];
      const changedOrder = Haptics.selectionChanged.mock.invocationCallOrder[0];
      const endOrder = Haptics.selectionEnd.mock.invocationCallOrder[0];
      expect(startOrder).toBeLessThan(changedOrder);
      expect(changedOrder).toBeLessThan(endOrder);
    });

    it('selection() never touches navigator.vibrate when native', async () => {
      const spy = vi.fn();
      vi.stubGlobal('navigator', { vibrate: spy });
      const { haptics } = await import('../haptics.js');
      const { Haptics } = await import('@capacitor/haptics');

      haptics.selection();

      // Wait for the real completion signal (selectionEnd, the last call in
      // the triplet) rather than asserting on something that was never
      // going to happen anyway — see the previous test for why the triplet
      // is the only reliable "it actually ran" signal.
      await vi.waitFor(() => {
        expect(Haptics.selectionEnd).toHaveBeenCalledTimes(1);
      });
      expect(spy).not.toHaveBeenCalled();
    });

    it('never throws even if the native calls reject', async () => {
      vi.doMock('@capacitor/haptics', () =>
        mockHapticsPlugin({
          impact: vi.fn().mockRejectedValue(new Error('not supported')),
          selectionStart: vi.fn().mockRejectedValue(new Error('not supported')),
        })
      );
      vi.resetModules();
      const { haptics } = await import('../haptics.js');

      expect(() => haptics.light()).not.toThrow();
      expect(() => haptics.selection()).not.toThrow();
      // let the rejected promise chains settle inside fire()'s own .catch()
      await new Promise((r) => setTimeout(r, 10));
    });
  });

  describe('reducedMotion() → true (neither web nor native fires, regardless of platform)', () => {
    describe('on a web platform', () => {
      beforeEach(() => {
        stubMatchMedia(true);
        vi.doMock('@capacitor/core', () => ({
          Capacitor: { isNativePlatform: () => false },
        }));
        vi.doMock('@capacitor/haptics', () => mockHapticsPlugin());
      });

      it('haptics.light() and haptics.selection() fire nothing', async () => {
        const spy = vi.fn();
        vi.stubGlobal('navigator', { vibrate: spy });
        const { haptics } = await import('../haptics.js');
        const { Haptics } = await import('@capacitor/haptics');

        haptics.light();
        haptics.selection();
        await new Promise((r) => setTimeout(r, 10));

        expect(spy).not.toHaveBeenCalled();
        expect(Haptics.impact).not.toHaveBeenCalled();
        expect(Haptics.selectionStart).not.toHaveBeenCalled();
      });
    });

    describe('on a native platform', () => {
      beforeEach(() => {
        stubMatchMedia(true);
        vi.doMock('@capacitor/core', () => ({
          Capacitor: { isNativePlatform: () => true },
        }));
        vi.doMock('@capacitor/haptics', () => mockHapticsPlugin());
      });

      it('haptics.light() and haptics.selection() fire nothing', async () => {
        const spy = vi.fn();
        vi.stubGlobal('navigator', { vibrate: spy });
        const { haptics } = await import('../haptics.js');
        const { Haptics } = await import('@capacitor/haptics');

        haptics.light();
        haptics.selection();
        await new Promise((r) => setTimeout(r, 10));

        expect(spy).not.toHaveBeenCalled();
        expect(Haptics.impact).not.toHaveBeenCalled();
        expect(Haptics.selectionStart).not.toHaveBeenCalled();
      });
    });
  });
});
