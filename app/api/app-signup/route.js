import { NextResponse } from 'next/server';
import { buildSubscriberRow } from '../../../lib/appSignup.js';

export async function POST(request) {
  let row;
  try { const b = await request.json(); row = buildSubscriberRow(b.email, b.firstName); }
  catch { return NextResponse.json({ error: 'valid email required' }, { status: 400 }); }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const res = await fetch(`${url}/rest/v1/subscribers?on_conflict=email`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates' },
    body: JSON.stringify([row]),
  });
  if (!res.ok) return NextResponse.json({ error: 'subscriber upsert failed' }, { status: 502 });
  return NextResponse.json({ ok: true });
}
