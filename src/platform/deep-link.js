// src/platform/deep-link.js
//
// Deep-link auth handler (Premium Contract item 10) — the other half of
// services/auth.js's appRedirectUrl(): on native, Supabase's email
// confirmation link points at `adonis://auth-callback` instead of the web
// origin, because WKWebView hands a plain http(s) redirect off to Safari
// instead of back into this app. iOS instead routes a URL in a scheme this
// app registers (ios/App/App/Info.plist's CFBundleURLTypes) back to the
// running app via Capacitor's App plugin. This module listens for that and
// completes the Supabase session from it.
//
// isNative() below is a copy of storage.js's cached
// Capacitor.isNativePlatform() promise — same self-contained-copy-per-file
// convention as camera.js/status-bar.js/haptics.js (see camera.js's header
// comment for why this repo doesn't share one helper across bridges: each
// platform-bridge module stays independently readable/removable).
//
// On web this whole module is inert: @capacitor/app is only ever reached
// via a dynamic import() behind isNativePlatform(), so Vite splits it into
// a chunk a browser tab never fetches, and initDeepLinks() itself resolves
// without ever registering a listener there.
//
// URL shapes handled — Supabase can hand back either, depending on the
// auth flow configured on the project, so both are checked defensively,
// code first:
//   - PKCE / "code" flow:    adonis://auth-callback?code=XXXX
//       -> supabase.auth.exchangeCodeForSession(code)
//   - implicit / token flow: adonis://auth-callback#access_token=XXXX&refresh_token=YYYY&...
//       -> supabase.auth.setSession({ access_token, refresh_token })
// Any other URL (no code, no token pair — e.g. some other appUrlOpen firing
// for a reason unrelated to auth) is ignored: neither supabase method is
// called, matching web's behavior of never reaching this module at all.
//
// Completing the session via exchangeCodeForSession/setSession fires
// Supabase's own onAuthStateChange event — services/useAuth.js already
// subscribes to that (via services/auth.js's onAuthStateChange wrapper) and
// updates its user/tier state whenever it fires. So the onAuthComplete
// callback passed in from main.jsx doesn't need to refresh anything itself;
// the app's existing auth subscription reacts on its own the moment the
// session completes. onAuthComplete is still invoked (only on a genuine
// success — a resolved-with-error or thrown exchange calls neither
// supabase method's follow-up nor this) so a caller COULD hook something
// UI-specific to it later without this module's contract changing.
//
// Universal Links (no scheme visible in the URL, needs the Apple Developer
// account + an AASA file on adonis.pro) are the prettier P4 upgrade — this
// custom scheme ships now and needs no account, testable via
// `xcrun simctl openurl <UDID> "adonis://auth-callback?code=..."`.

import { supabase } from '../services/supabase.js';

let nativePromise = null;

function isNative() {
  if (!nativePromise) {
    nativePromise = import('@capacitor/core')
      .then(({ Capacitor }) => Capacitor.isNativePlatform())
      .catch(() => false);
  }
  return nativePromise;
}

async function handleUrl(url, onAuthComplete) {
  try {
    const parsed = new URL(url);
    const code = parsed.searchParams.get('code');

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) onAuthComplete?.();
      return;
    }

    const hashParams = new URLSearchParams(parsed.hash.replace(/^#/, ''));
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    if (accessToken && refreshToken) {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (!error) onAuthComplete?.();
    }
    // Neither shape matched — not an auth callback, nothing to do.
  } catch {
    // Best-effort, matching every other platform/*.js adapter's contract:
    // a malformed URL or a rejected/thrown Supabase call must never crash
    // the app — the user simply lands back in whatever signed-out/in state
    // they were already in.
  }
}

/**
 * Registers the native `appUrlOpen` listener that completes a Supabase auth
 * session when the OS hands the app a `adonis://auth-callback...` URL (see
 * this file's header for the two shapes handled). No-op on web — never
 * imports @capacitor/app there. Call once at boot (see main.jsx); the
 * listener lives for the app's lifetime, same as this repo's other
 * fire-and-forget boot-time native registrations (platform/status-bar.js's
 * initStatusBar).
 */
export async function initDeepLinks(onAuthComplete) {
  const native = await isNative();
  if (!native) return;

  try {
    const { App } = await import('@capacitor/app');
    App.addListener('appUrlOpen', ({ url }) => handleUrl(url, onAuthComplete));
  } catch {
    // Best-effort — a failed listener registration must never crash boot.
  }
}
