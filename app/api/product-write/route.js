import { NextResponse } from 'next/server';

const ALLOWED_FIELDS = ['active','description','specs','research'];

export async function POST(request) {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) return NextResponse.json({ error: 'Server config missing' }, { status: 500 });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { action, id, fields } = body || {};
  if (action !== 'update') return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  if (!fields || typeof fields !== 'object') return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const patch = {};
  for (const k of ALLOWED_FIELDS) {
    if (fields[k] === undefined) continue;
    if (k === 'active' && typeof fields[k] !== 'boolean') return NextResponse.json({ error: 'active must be boolean' }, { status: 400 });
    if (k === 'description' && typeof fields[k] !== 'string') return NextResponse.json({ error: 'description must be string' }, { status: 400 });
    if ((k === 'specs' || k === 'research') && !Array.isArray(fields[k])) return NextResponse.json({ error: `${k} must be array` }, { status: 400 });
    patch[k] = fields[k];
  }
  if (!Object.keys(patch).length) return NextResponse.json({ error: 'No valid fields' }, { status: 400 });
  patch.updated_at = new Date().toISOString();

  const r = await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json', 'Prefer': 'return=minimal',
    },
    body: JSON.stringify(patch),
  });
  if (!r.ok) return NextResponse.json({ error: 'Update failed', detail: await r.text() }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function GET() {
  return NextResponse.json({ status: 'product-write route is live' });
}
