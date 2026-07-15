// src/platform/__tests__/storage.test.js
//
// storage.js branches entirely on Capacitor.isNativePlatform() (dynamic
// import of @capacitor/core, cached at module scope). Each describe block
// below needs a fresh module instance with a fresh mock, so we
// vi.resetModules() + vi.doMock() per scenario and re-`import('../storage.js')`
// rather than a single top-level `vi.mock`.
//
// localStorage stub: this environment's global `localStorage` is Node's own
// broken Web Storage stub (every method undefined) rather than happy-dom's
// real Storage — same workaround as src/state/__tests__/store.test.jsx.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const STORAGE_KEY = 'adonis_v2';

function installLocalStorageStub() {
  const memory = new Map();
  const stub = {
    getItem: (k) => (memory.has(k) ? memory.get(k) : null),
    setItem: (k, v) => { memory.set(k, String(v)); },
    removeItem: (k) => { memory.delete(k); },
    clear: () => { memory.clear(); },
    key: (i) => Array.from(memory.keys())[i] ?? null,
    get length() { return memory.size; },
  };
  Object.defineProperty(globalThis, 'localStorage', { value: stub, configurable: true, writable: true });
}

describe('platform/storage', () => {
  let originalLocalStorage;

  beforeEach(() => {
    originalLocalStorage = globalThis.localStorage;
    installLocalStorageStub();
    vi.resetModules();
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'localStorage', { value: originalLocalStorage, configurable: true, writable: true });
    vi.doUnmock('@capacitor/core');
    vi.doUnmock('@capacitor/preferences');
  });

  describe('web (isNativePlatform: false)', () => {
    beforeEach(() => {
      vi.doMock('@capacitor/core', () => ({
        Capacitor: { isNativePlatform: () => false },
      }));
      vi.doMock('@capacitor/preferences', () => ({
        Preferences: { set: vi.fn(), get: vi.fn() },
      }));
    });

    it('mirrorSave resolves without ever calling Preferences.set', async () => {
      const { mirrorSave } = await import('../storage.js');
      const { Preferences } = await import('@capacitor/preferences');
      mirrorSave(JSON.stringify({ foo: 'bar' }));
      // give the fire-and-forget promise chain a chance to run, then assert
      // it settled WITHOUT touching Preferences
      await new Promise((r) => setTimeout(r, 10));
      expect(Preferences.set).not.toHaveBeenCalled();
    });

    it('restoreIfEvicted resolves immediately and never touches localStorage', async () => {
      const { restoreIfEvicted } = await import('../storage.js');
      await restoreIfEvicted();
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });
  });

  describe('native — evicted (localStorage null, Preferences has the blob)', () => {
    beforeEach(() => {
      vi.doMock('@capacitor/core', () => ({
        Capacitor: { isNativePlatform: () => true },
      }));
      vi.doMock('@capacitor/preferences', () => ({
        Preferences: {
          set: vi.fn().mockResolvedValue(undefined),
          get: vi.fn().mockResolvedValue({ value: '{"restored":true}' }),
        },
      }));
    });

    it('writes the mirrored blob back into localStorage', async () => {
      const { restoreIfEvicted } = await import('../storage.js');
      const { Preferences } = await import('@capacitor/preferences');
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

      await restoreIfEvicted();

      expect(Preferences.get).toHaveBeenCalledWith({ key: STORAGE_KEY });
      expect(localStorage.getItem(STORAGE_KEY)).toBe('{"restored":true}');
    });
  });

  describe('native — not evicted (localStorage already present)', () => {
    beforeEach(() => {
      vi.doMock('@capacitor/core', () => ({
        Capacitor: { isNativePlatform: () => true },
      }));
      vi.doMock('@capacitor/preferences', () => ({
        Preferences: {
          set: vi.fn().mockResolvedValue(undefined),
          get: vi.fn().mockResolvedValue({ value: 'should-never-be-read' }),
        },
      }));
    });

    it('never reads or writes Preferences, and leaves localStorage untouched', async () => {
      localStorage.setItem(STORAGE_KEY, '{"already":"here"}');
      const { restoreIfEvicted } = await import('../storage.js');
      const { Preferences } = await import('@capacitor/preferences');

      await restoreIfEvicted();

      expect(Preferences.get).not.toHaveBeenCalled();
      expect(Preferences.set).not.toHaveBeenCalled();
      expect(localStorage.getItem(STORAGE_KEY)).toBe('{"already":"here"}');
    });
  });

  describe('native — mirrorSave', () => {
    beforeEach(() => {
      vi.doMock('@capacitor/core', () => ({
        Capacitor: { isNativePlatform: () => true },
      }));
      vi.doMock('@capacitor/preferences', () => ({
        Preferences: {
          set: vi.fn().mockResolvedValue(undefined),
          get: vi.fn().mockResolvedValue({ value: null }),
        },
      }));
    });

    it('mirrors the exact serialized string into Preferences.set', async () => {
      const { mirrorSave } = await import('../storage.js');
      const { Preferences } = await import('@capacitor/preferences');
      const blob = JSON.stringify({ hello: 'world', _v: 1 });

      mirrorSave(blob);

      await vi.waitFor(() => {
        expect(Preferences.set).toHaveBeenCalledWith({ key: STORAGE_KEY, value: blob });
      });
    });

    it('never throws even if Preferences.set rejects', async () => {
      vi.doMock('@capacitor/preferences', () => ({
        Preferences: {
          set: vi.fn().mockRejectedValue(new Error('disk full')),
          get: vi.fn(),
        },
      }));
      vi.resetModules();
      const { mirrorSave } = await import('../storage.js');

      expect(() => mirrorSave('{}')).not.toThrow();
      // let the rejected promise settle inside mirrorSave's own .catch()
      await new Promise((r) => setTimeout(r, 10));
    });
  });
});
