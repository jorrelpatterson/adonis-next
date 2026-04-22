import { NextResponse } from 'next/server';

const ALLOWED_ACTIONS = new Set(['create', 'update', 'delete']);
const ALLOWED_TYPES = new Set(['percent', 'fixed']);

export async function POST(request) {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) return NextResponse.json({ error: 'Server config missing' }, { status: 500 });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { action, code, fields, id } = body || {};
  if (!ALLOWED_ACTIONS.has(action)) return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  const headers = {
    'apikey': SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  };

  if (action === 'create') {
    const codeNorm = String(code || '').trim().toUpperCase();
    if (!/^[A-Z0-9]{2,20}$/.test(codeNorm)) return NextResponse.json({ error: 'Code must be 2-20 chars, A-Z and 0-9 only' }, { status: 400 });
    if (!fields || !ALLOWED_TYPES.has(fields.type)) return NextResponse.json({ error: 'Invalid type (must be percent or fixed)' }, { status: 400 });
    const amount = parseFloat(fields.amount);
    if (!(amount > 0)) return NextResponse.json({ error: 'Amount must be > 0' }, { status: 400 });

    const payload = {
      code: codeNorm,
      type: fields.type,
      amount,
      active: fields.active !== false,
      expires_at: fields.expires_at || null,
      usage_limit: fields.usage_limit ? parseInt(fields.usage_limit, 10) : null,
      min_order: fields.min_order ? parseFloat(fields.min_order) : null,
      max_discount: fields.max_discount ? parseFloat(fields.max_discount) : null,
      notes: fields.notes || null,
    };

    const r = await fetch(`${SUPABASE_URL}/rest/v1/discount_codes`, { method: 'POST', headers, body: JSON.stringify(payload) });
    if (!r.ok) {
      const err = await r.text();
      if (err.includes('duplicate') || r.status === 409) return NextResponse.json({ error: 'Code already exists' }, { status: 409 });
      return NextResponse.json({ error: err || 'Insert failed' }, { status: 500 });
    }
    const [row] = await r.json();
    return NextResponse.json({ row });
  }

  if (action === 'update') {
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    if (!fields || typeof fields !== 'object') return NextResponse.json({ error: 'fields required' }, { status: 400 });

    // Allow toggling specific fields
    const patch = {};
    if (typeof fields.active === 'boolean') patch.active = fields.active;
    if (fields.amount != null) patch.amount = parseFloat(fields.amount);
    if (fields.type && ALLOWED_TYPES.has(fields.type)) patch.type = fields.type;
    if ('expires_at' in fields) patch.expires_at = fields.expires_at || null;
    if ('usage_limit' in fields) patch.usage_limit = fields.usage_limit ? parseInt(fields.usage_limit, 10) : null;
    if ('min_order' in fields) patch.min_order = fields.min_order ? parseFloat(fields.min_order) : null;
    if ('max_discount' in fields) patch.max_discount = fields.max_discount ? parseFloat(fields.max_discount) : null;
    if ('notes' in fields) patch.notes = fields.notes || null;

    if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });

    const r = await fetch(`${SUPABASE_URL}/rest/v1/discount_codes?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers, body: JSON.stringify(patch) });
    if (!r.ok) return NextResponse.json({ error: await r.text() || 'Update failed' }, { status: 500 });
    const rows = await r.json();
    return NextResponse.json({ row: rows[0] || null });
  }

  if (action === 'delete') {
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const r = await fetch(`${SUPABASE_URL}/rest/v1/discount_codes?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers });
    if (!r.ok) return NextResponse.json({ error: await r.text() || 'Delete failed' }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

export async function GET() {
  return NextResponse.json({ status: 'discount-code-write route is live' });
}
