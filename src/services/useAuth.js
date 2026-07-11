// React hook for auth state. Provides current user + tier (from metadata).
//
// Usage:
//   const { user, tier, loading, signOut } = useAuth();
//   if (loading) return <Loading />;
//   if (!user) return <AuthScreen />;

import { useEffect, useState, useCallback } from 'react';
import { getSession, onAuthStateChange, signOut as authSignOut, tierFromUser } from './auth.js';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getSession().then(({ session }) => {
      if (!mounted) return;
      setUser(session?.user || null);
      setLoading(false);
    });
    const unsubscribe = onAuthStateChange(({ session }) => {
      if (!mounted) return;
      setUser(session?.user || null);
      setLoading(false);
    });
    return () => { mounted = false; unsubscribe(); };
  }, []);

  const signOut = useCallback(async () => {
    await authSignOut();
    localStorage.removeItem('adonis_v2');
    window.location.reload();
  }, []);

  return { user, tier: tierFromUser(user), loading, signOut };
}
