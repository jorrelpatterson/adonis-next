// src/platform/status-bar.js
//
// Native status bar styling (Premium Contract item 3b) — on iOS the
// WKWebView draws full-bleed under the status bar / Dynamic Island
// (Capacitor's default `overlaysWebView: true`), which is exactly what
// lets env(safe-area-inset-*) resolve to real values for
// design/safe-area.css to consume. This module just makes the status
// bar's OWN content (clock/battery/carrier glyphs) legible against the
// app's near-black shell (#0A0A0C, design/theme.js's P.bg).
//
// @capacitor/status-bar's `Style` enum is INVERTED from the intuitive
// reading (verified against the plugin's own iOS source,
// node_modules/@capacitor/status-bar/ios/Sources/StatusBarPlugin/
// StatusBarPlugin.swift's `style(fromString:)`, and confirmed empirically
// via a simulator screenshot — a first pass using Style.Light rendered
// dark, near-invisible icons here):
//   Style.Dark  → native .lightContent → WHITE/light icons (what we want,
//                 for our dark shell)
//   Style.Light → native .darkContent  → BLACK/dark icons (for a light
//                 shell — the opposite of this app)
// So despite the name, Style.Dark is correct here.
//
// On web this whole module is inert — same dynamic-import-behind-
// isNativePlatform() pattern as storage.js's mirrorSave/restoreIfEvicted:
// @capacitor/status-bar is only ever reached via a check that resolves
// false in a browser tab, so Vite splits it into a chunk the web build
// never fetches.

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
 * Fire-and-forget: sets the status bar to light content (for our dark
 * shell) and confirms the webview draws full-bleed under it, so
 * env(safe-area-inset-top) keeps reporting the real inset instead of
 * collapsing to 0. No-op on web (resolves immediately, never imports the
 * native plugin). Never throws — best-effort, same contract as
 * storage.js's mirrorSave/restoreIfEvicted; must not block or fail boot.
 *
 * setBackgroundColor is deliberately not called here — it's Android-only
 * in @capacitor/status-bar, and this shell has no @capacitor/android
 * target (iOS only, per capacitor.config.json).
 */
export function initStatusBar() {
  isNative()
    .then((native) => {
      if (!native) return;
      return import('@capacitor/status-bar').then(({ StatusBar, Style }) =>
        Promise.all([
          // Style.Dark → native .lightContent → white icons (see file
          // header comment — the enum name is the inverse of what it sounds
          // like it should be).
          StatusBar.setStyle({ style: Style.Dark }),
          StatusBar.setOverlaysWebView({ overlay: true }),
        ])
      );
    })
    .catch(() => {
      // Best-effort — a failed status-bar call must never block boot or
      // surface to the caller (main.jsx calls this fire-and-forget).
    });
}
