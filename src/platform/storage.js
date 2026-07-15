// src/platform/storage.js
//
// Eviction-proof storage adapter (Premium Contract item 11a).
//
// iOS can evict WKWebView's localStorage under memory/disk pressure — a
// premium app that has been logging workouts for months can't lose that
// data to an OS-level cache sweep. This module mirrors every localStorage
// write into Capacitor's native Preferences store (backed by UserDefaults,
// which iOS does NOT evict the way it evicts WebView storage) and restores
// from that mirror on boot if localStorage comes back empty.
//
// Reads MUST stay synchronous via localStorage everywhere else in the app —
// store.jsx's `loadState` (the useReducer initializer) must never become
// async. This module only ever WRITES to the mirror (mirrorSave, fire-and-
// forget) and READS it once, at boot, before React mounts (restoreIfEvicted,
// called from main.jsx).
//
// On web this whole module is inert: @capacitor/core and @capacitor/preferences
// are only ever reached via dynamic import() behind an isNativePlatform()
// check, so Vite splits them into a chunk a browser tab never fetches.

const STORAGE_KEY = 'adonis_v2';

// Cached across calls so every debounced save doesn't re-import
// @capacitor/core — resolved once per app session.
let nativePromise = null;

function isNative() {
  if (!nativePromise) {
    nativePromise = import('@capacitor/core')
      .then(({ Capacitor }) => Capacitor.isNativePlatform())
      .catch(() => false);
  }
  return nativePromise;
}

/**
 * Fire-and-forget mirror of a localStorage write into native Preferences.
 * No-op on web. Never throws, never blocks the caller — this must ride
 * alongside the synchronous localStorage.setItem, not gate it.
 */
export function mirrorSave(serialized) {
  isNative()
    .then((native) => {
      if (!native) return;
      return import('@capacitor/preferences').then(({ Preferences }) =>
        Preferences.set({ key: STORAGE_KEY, value: serialized })
      );
    })
    .catch(() => {
      // Mirroring is best-effort — a failed write here must never surface
      // to the caller or block the UI.
    });
}

/**
 * Restores localStorage from the native Preferences mirror if iOS evicted
 * it while the app was suspended/killed. Must be awaited BEFORE React
 * mounts (see main.jsx's boot sequence: restore → migration → render).
 * No-op (resolves immediately) on web.
 */
export async function restoreIfEvicted() {
  const native = await isNative();
  if (!native) return;
  if (localStorage.getItem(STORAGE_KEY) !== null) return;

  try {
    const { Preferences } = await import('@capacitor/preferences');
    const { value } = await Preferences.get({ key: STORAGE_KEY });
    if (value) {
      localStorage.setItem(STORAGE_KEY, value);
    }
  } catch {
    // Restore is best-effort — if it fails, the app boots with
    // DEFAULT_STATE, same as any fresh install.
  }
}
