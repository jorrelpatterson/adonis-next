// Auth service for Adonis v2 — wraps Supabase Auth.
//
// Adonis users are SEPARATE from advnce labs customers (per 2026-04-29
// product decision). Two distinct namespaces in the same Supabase project.
//
// Methods:
//   signUpWithEmail(email, password) — creates user + auth.users row;
//     trigger inserts default adonis_profiles row with tier='free'
//   signInWithEmail(email, password)
//   signInWithGoogle() — OAuth flow; redirects to Google then back to app
//   signOut() — clears local session
//   getSession() — current session (null if not logged in)
//   onAuthStateChange(callback) — subscribe to login/logout events

import { supabase } from './supabase.js';

export async function signUpWithEmail(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Disable email confirmation for MVP — toggle on later in Supabase dashboard
      emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
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

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
    },
  });
  if (error) return { error: error.message };
  return { data, error: null };
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

/**
 * Fetch the user's adonis_profiles row.
 * Returns { profile: { tier, stripe_customer_id, subscription_status, ... }, error }
 */
export async function fetchAdonisProfile(userId) {
  if (!userId) return { profile: null, error: 'No user id' };
  const { data, error } = await supabase
    .from('adonis_profiles')
    .select('id, tier, stripe_customer_id, subscription_status, subscription_id, current_period_end')
    .eq('id', userId)
    .single();
  if (error) return { profile: null, error: error.message };
  return { profile: data, error: null };
}
