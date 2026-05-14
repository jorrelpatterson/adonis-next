// lib/career/supabase.js
//
// Server-only Supabase client using the service-role key. Bypasses RLS.
// NEVER import this from a client component or anything that ends up in the browser bundle.

import { createClient } from '@supabase/supabase-js';

let _admin = null;

export function getCareerSupabaseAdmin() {
  if (_admin) return _admin;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      '[career] Supabase env not configured. Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY.'
    );
  }

  _admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _admin;
}
