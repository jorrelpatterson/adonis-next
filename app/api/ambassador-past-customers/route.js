import { NextResponse } from 'next/server';

// Ambassador-scoped past-customer search.
// Only returns customers from orders where ref_code matches the ambassador's code,
// so each ambassador sees only their own past clients.

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const ambassadorCode = searchParams.get('ambassador_code');
  const q = (searchParams.get('q') || '').trim();

  if (!ambassadorCode) return NextResponse.json({ error: 'ambassador_code required' }, { status: 400 });
  if (q.length < 2) return NextResponse.json({ customers: [] });

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json({ error: 'supabase not configured' }, { status: 500 });
  }

  const codeClean = String(ambassadorCode).trim().toUpperCase();
  if (!/^[A-Z0-9_-]{2,40}$/.test(codeClean)) {
    return NextResponse.json({ error: 'invalid ambassador_code' }, { status: 400 });
  }
  const ar = await fetch(
    `${SUPABASE_URL}/rest/v1/ambassadors?code=eq.${encodeURIComponent(codeClean)}&select=code,status&limit=1`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }, cache: 'no-store' },
  );
  if (!ar.ok) return NextResponse.json({ error: 'ambassador lookup failed' }, { status: 500 });
  const arows = await ar.json();
  if (!arows.length) return NextResponse.json({ error: 'unknown ambassador code' }, { status: 401 });
  if (arows[0].status && arows[0].status !== 'active') {
    return NextResponse.json({ error: `ambassador is ${arows[0].status}` }, { status: 403 });
  }

  const esc = encodeURIComponent(q);
  const escLower = encodeURIComponent(q.toLowerCase());
  const url =
    `${SUPABASE_URL}/rest/v1/orders` +
    `?ref_code=eq.${encodeURIComponent(arows[0].code)}` +
    `&or=(first_name.ilike.*${esc}*,last_name.ilike.*${esc}*,email.ilike.*${escLower}*,phone.ilike.*${esc}*)` +
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
    const realEmail =
      row.email && !row.email.endsWith('@invoice.local')
        ? row.email.toLowerCase()
        : '';
    const key =
      realEmail ||
      (row.phone || '').replace(/\D/g, '') ||
      `${(row.first_name || '').toLowerCase()}|${(row.last_name || '').toLowerCase()}|${(row.address || '').toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(row);
    if (deduped.length >= 8) break;
  }

  return NextResponse.json({ customers: deduped });
}
