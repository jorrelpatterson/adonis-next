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

import { supabase } from './supabase.js';

// Build a redirect URL that points back to wherever the app is currently
// served from (origin + pathname), so email-confirm links land back on
// the same page instead of a hardcoded route.
const appRedirectUrl = () =>
  window.location.origin + window.location.pathname;

export async function signUpWithEmail(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: appRedirectUrl(),
    },
  });
  if (error) return { user: null, error: error.message };
  return { user: data.user, error: null };
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
