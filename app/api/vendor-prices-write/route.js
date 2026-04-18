import { NextResponse } from 'next/server';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request) {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) return NextResponse.json({ error: 'Server config missing' }, { status: 500 });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { action, entries, vendor_id, product_id } = body || {};
  if (!['upsert','delete'].includes(action)) return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  const headers = {
    'apikey': SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal',
  };

  if (action === 'upsert') {
    if (!Array.isArray(entries) || !entries.length) return NextResponse.json({ error: 'entries array required' }, { status: 400 });
    if (entries.length > 200) return NextResponse.json({ error: 'Max 200 entries per request' }, { status: 400 });
    for (const e of entries) {
      if (!UUID_RE.test(String(e.vendor_id || ''))) return NextResponse.json({ error: 'Invalid vendor_id in entry' }, { status: 400 });
      if (!Number.isInteger(e.product_id)) return NextResponse.json({ error: 'Invalid product_id' }, { status: 400 });
      if (typeof e.cost_per_kit !== 'number' || e.cost_per_kit < 0) return NextResponse.json({ error: 'Invalid cost_per_kit' }, { status: 400 });
    }
    const payload = entries.map(e => ({
      vendor_id: e.vendor_id, product_id: e.product_id,
      cost_per_kit: e.cost_per_kit, last_updated: new Date().toISOString(),
    }));
    const r = await fetch(`${SUPABASE_URL}/rest/v1/vendor_prices?on_conflict=vendor_id,product_id`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(payload),
    });
    if (!r.ok) return NextResponse.json({ error: 'Upsert failed', detail: await r.text() }, { status: 500 });
    return NextResponse.json({ success: true, count: entries.length });
  }

  if (!UUID_RE.test(String(vendor_id || ''))) return NextResponse.json({ error: 'vendor_id required' }, { status: 400 });
  if (!Number.isInteger(product_id)) return NextResponse.json({ error: 'product_id required' }, { status: 400 });
  const url = `${SUPABASE_URL}/rest/v1/vendor_prices?vendor_id=eq.${vendor_id}&product_id=eq.${product_id}`;
  const r = await fetch(url, { method: 'DELETE', headers });
  if (!r.ok) return NextResponse.json({ error: 'Delete failed', detail: await r.text() }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function GET() {
  return NextResponse.json({ status: 'vendor-prices-write route is live' });
}
