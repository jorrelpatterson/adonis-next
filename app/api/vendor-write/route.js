import { NextResponse } from 'next/server';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request) {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) return NextResponse.json({ error: 'Server config missing' }, { status: 500 });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { action, id, fields } = body || {};
  if (!['create','update','delete'].includes(action)) return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  const headers = {
    'apikey': SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  };

  if (action === 'create') {
    if (!fields?.name || typeof fields.name !== 'string') return NextResponse.json({ error: 'Name required' }, { status: 400 });
    const payload = {
      name: fields.name.trim(),
      contact_email: fields.contact_email?.trim() || null,
      contact_phone: fields.contact_phone?.trim() || null,
      notes: fields.notes?.trim() || null,
      active: fields.active !== false,
    };
    const r = await fetch(`${SUPABASE_URL}/rest/v1/vendors`, { method: 'POST', headers, body: JSON.stringify(payload) });
    if (!r.ok) return NextResponse.json({ error: 'Create failed', detail: await r.text() }, { status: 500 });
    const data = await r.json();
    return NextResponse.json({ success: true, vendor: data[0] });
  }

  if (!UUID_RE.test(String(id || ''))) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  const url = `${SUPABASE_URL}/rest/v1/vendors?id=eq.${id}`;

  if (action === 'delete') {
    const r = await fetch(url, { method: 'DELETE', headers });
    if (!r.ok) return NextResponse.json({ error: 'Delete failed', detail: await r.text() }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (!fields || typeof fields !== 'object') return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  const allowed = ['name','contact_email','contact_phone','notes','active'];
  const patch = {};
  for (const k of allowed) {
    if (fields[k] === undefined) continue;
    let v = fields[k];
    if (typeof v === 'string') v = v.trim();
    if (['contact_email','contact_phone','notes'].includes(k) && v === '') v = null;
    patch[k] = v;
  }
  if (!Object.keys(patch).length) return NextResponse.json({ error: 'No valid fields' }, { status: 400 });

  const r = await fetch(url, { method: 'PATCH', headers, body: JSON.stringify(patch) });
  if (!r.ok) return NextResponse.json({ error: 'Update failed', detail: await r.text() }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function GET() {
  return NextResponse.json({ status: 'vendor-write route is live' });
}
