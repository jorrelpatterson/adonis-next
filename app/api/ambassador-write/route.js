import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../lib/requireAdmin';

// Server-side proxy for ambassador UPDATE/DELETE — uses SUPABASE_SERVICE_KEY
// to bypass RLS, which only allows anon INSERT + SELECT on ambassadors.

const ALLOWED_FIELDS = ['name', 'email', 'phone', 'code', 'tier', 'status'];
const ALLOWED_TIERS = ['starter', 'builder', 'elite'];
const ALLOWED_STATUSES = ['active', 'paused', 'banned'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request) {
  const unauth = requireAdmin(request); if (unauth) return unauth;

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
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
    if (k === 'status' && !ALLOWED_STATUSES.includes(v)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    if (k === 'email' && !EMAIL_RE.test(String(v))) return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    if (k === 'name') {
      if (!v || v.length > 120) return NextResponse.json({ error: 'Name required (1–120 chars)' }, { status: 400 });
    }
    if (k === 'phone') {
      if (v === '' || v == null) v = null;
      else {
        let digits = String(v).replace(/\D/g, '');
        if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1);
        if (digits.length !== 10) return NextResponse.json({ error: 'Phone must be 10 digits' }, { status: 400 });
        v = digits;
      }
    }
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
