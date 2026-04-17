import { NextResponse } from 'next/server';

// Server-side proxy for ambassador UPDATE/DELETE — uses SUPABASE_SERVICE_KEY
// to bypass RLS, which only allows anon INSERT + SELECT on ambassadors.

const ALLOWED_FIELDS = ['name', 'email', 'phone', 'code', 'tier'];
const ALLOWED_TIERS = ['starter', 'builder', 'elite'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request) {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json({ error: 'Server config missing' }, { status: 500 });
  }

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { action, id, fields } = body || {};
  if (!UUID_RE.test(String(id || ''))) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  if (action !== 'update' && action !== 'delete') return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  const headers = {
    'apikey': SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal',
  };
  const url = `${SUPABASE_URL}/rest/v1/ambassadors?id=eq.${id}`;

  if (action === 'delete') {
    const r = await fetch(url, { method: 'DELETE', headers });
    if (!r.ok) return NextResponse.json({ error: 'Delete failed', detail: await r.text() }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (!fields || typeof fields !== 'object') return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  const patch = {};
  for (const k of ALLOWED_FIELDS) {
    if (fields[k] === undefined) continue;
    let v = fields[k];
    if (typeof v === 'string') v = v.trim();
    if (k === 'code' && typeof v === 'string') v = v.toUpperCase();
    if (k === 'tier' && !ALLOWED_TIERS.includes(v)) return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    if (k === 'phone' && v === '') v = null;
    patch[k] = v;
  }
  if (!Object.keys(patch).length) return NextResponse.json({ error: 'No valid fields' }, { status: 400 });

  const r = await fetch(url, { method: 'PATCH', headers, body: JSON.stringify(patch) });
  if (!r.ok) return NextResponse.json({ error: 'Update failed', detail: await r.text() }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function GET() {
  return NextResponse.json({ status: 'ambassador-write route is live' });
}
