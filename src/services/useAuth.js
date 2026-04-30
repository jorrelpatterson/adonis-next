// React hook for auth state. Provides current user + adonis profile.
//
// Usage:
//   const { user, profile, loading, signOut } = useAuth();
//   if (loading) return <Loading />;
//   if (!user) return <AuthScreen />;

import { useState, useEffect, useCallback } from 'react';
import { getSession, onAuthStateChange, fetchAdonisProfile, signOut as authSignOut } from './auth.js';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sync profile from server when user changes
  const refreshProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      return;
    }
    const { profile: p } = await fetchAdonisProfile(userId);
    setProfile(p);
  }, []);

  // Initial session check + subscribe to auth changes
  useEffect(() => {
    let cancelled = false;

    getSession().then(({ session }) => {
      if (cancelled) return;
      const u = session?.user || null;
      setUser(u);
      if (u) refreshProfile(u.id);
      setLoading(false);
    });

    const unsubscribe = onAuthStateChange(({ session }) => {
      if (cancelled) return;
      const u = session?.user || null;
      setUser(u);
      if (u) {
        refreshProfile(u.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [refreshProfile]);

  const signOut = useCallback(async () => {
    await authSignOut();
    // Clear localStorage state on signout so next user starts fresh
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('adonis_v2');
    }
  }, []);

  return { user, profile, loading, signOut, refreshProfile };
}
