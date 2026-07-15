// Auth service for Adonis v2 — wraps Supabase Auth.
//
// Adonis users are SEPARATE from advnce labs customers (per 2026-04-29
// product decision). Two distinct namespaces in the same Supabase project.
//
// Methods:
//   signUpWithEmail(email, password) — creates user + auth.users row;
//     tier lives in user metadata (see updateUserTier/tierFromUser below)
//   signInWithEmail(email, password)
//   signOut() — clears local session
//   getSession() — current session (null if not logged in)
//   onAuthStateChange(callback) — subscribe to login/logout events
//   setNativePlatform(isNative) — called once at boot, native builds only
//     (see main.jsx), so appRedirectUrl() below knows to target the app
//     instead of the web origin

import { supabase } from './supabase.js';

// appRedirectUrl() is called SYNCHRONOUSLY, inline, while building
// supabase.auth.signUp's options (see signUpWithEmail below) — it can't
// itself await Capacitor's async isNativePlatform() check (the
// dynamic-import-behind-a-cached-promise pattern every platform/*.js
// adapter uses — see platform/camera.js's header for why). Instead, the
// native/web decision is resolved ONCE at boot, before React mounts:
// main.jsx awaits the native check and calls `setNativePlatform(...)`
// BEFORE ReactDOM.render — so by the time any UI exists that could call
// signUpWithEmail, nativeFlag already holds the right value. Deterministic,
// no race: unlike resolving the check lazily on first use here, there's no
// window where a real tap could observe a stale default. Web builds never
// call setNativePlatform, so nativeFlag stays false and appRedirectUrl()'s
// web behavior is provably unchanged.
let nativeFlag = false;

export function setNativePlatform(isNative) {
  nativeFlag = isNative;
}

// Build a redirect URL Supabase's email-confirm link points back to.
// Web: the app's own current origin + pathname, so the link lands back on
// the same page instead of a hardcoded route (unchanged behavior). Native:
// WKWebView hands an http(s) redirect off to Safari instead of back into
// this app, so the target instead is a custom URL scheme iOS routes back
// to us — see platform/deep-link.js, which listens for that scheme and
// completes the Supabase session from it. (Universal Links — no scheme
// visible in the URL — are the nicer P4 upgrade, needing an Apple
// Developer account + an AASA file; this custom scheme ships now.)
export const appRedirectUrl = () =>
  nativeFlag ? 'adonis://auth-callback' : window.location.origin + window.location.pathname;

export async function signUpWithEmail(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: appRedirectUrl(),
    },
  });
  if (error) return { user: null, error: error.message };
  // With Supabase email confirmations ON (spec-mandated), signUp resolves
  // {user, session: null} and no error — the user must click the emailed
  // link before a session exists. Surface that so AuthScreen can show a
  // "check your email" state instead of silently sitting at the gate.
  return { user: data.user, needsConfirmation: !data?.session, error: null };
}

export async function signInWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { user: null, error: error.message };
  return { user: data.user, error: null };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) return { error: error.message };
  return { error: null };
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) return { session: null, error: error.message };
  return { session: data.session, error: null };
}

export function onAuthStateChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback({ event, session });
  });
  return () => data.subscription.unsubscribe();
}

// Tier + redeemed code live in auth user metadata so unlocks survive reinstall (spec §Auth & state).
export async function updateUserTier(tier, code) {
  const { data, error } = await supabase.auth.updateUser({
    data: { tier, access_code: code || null },
  });
  return { user: data?.user || null, error };
}

export function tierFromUser(user) {
  const t = user?.user_metadata?.tier;
  return t === 'pro' || t === 'elite' ? t : 'free';
}
