import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../lib/requireAdmin';

export async function GET(request) {
  const unauth = requireAdmin(request); if (unauth) return unauth;

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();
  if (q.length < 2) return NextResponse.json({ customers: [] });

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json({ error: 'supabase not configured' }, { status: 500 });
  }

  const esc = encodeURIComponent(q);
  const escLower = encodeURIComponent(q.toLowerCase());
  const url =
    `${SUPABASE_URL}/rest/v1/orders` +
    `?or=(first_name.ilike.*${esc}*,last_name.ilike.*${esc}*,email.ilike.*${escLower}*,phone.ilike.*${esc}*)` +
    `&select=first_name,last_name,email,phone,address,city,state,zip,created_at` +
    `&order=created_at.desc&limit=30`;

  const r = await fetch(url, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    cache: 'no-store',
  });
  if (!r.ok) return NextResponse.json({ error: await r.text() }, { status: 500 });
  const rows = await r.json();

  const seen = new Set();
  const deduped = [];
  for (const row of rows) {
    const key =
      (row.email || '').toLowerCase() ||
      (row.phone || '') ||
      `${row.first_name}|${row.last_name}|${row.address}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(row);
    if (deduped.length >= 8) break;
  }

  return NextResponse.json({ customers: deduped });
}
