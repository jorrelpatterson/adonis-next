import { NextResponse } from 'next/server';
import { requireRole } from '../../../lib/requireAdmin';

// GET /api/orders-list — admin list of orders via the service-role key.
// The orders table's RLS blocks the anon key, so the admin Orders page
// reads through this route instead of hitting PostgREST directly.
export async function GET(request) {
  const unauth = requireRole(request, 'admin', 'va');
  if (unauth) return unauth;

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const qs = 'select=*&order=created_at.desc&limit=1000';
  const r = await fetch(`${SUPABASE_URL}/rest/v1/orders?${qs}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    cache: 'no-store',
  });
  if (!r.ok) {
    return NextResponse.json({ error: await r.text() }, { status: 500 });
  }
  const orders = await r.json();
  return NextResponse.json({ orders });
}
