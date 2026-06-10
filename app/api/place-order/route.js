import { NextResponse } from 'next/server';

// POST /api/place-order — public storefront checkout.
// Inserts a pending_payment order with the service-role key (orders RLS
// rejects the anon key). Called by public/app.html submitOrder.
const ALLOWED = [
  'order_id', 'user_id', 'first_name', 'last_name', 'email', 'phone',
  'address', 'city', 'state', 'zip', 'items', 'total',
  'discount_amount', 'discount_code', 'status', 'created_at',
];

export async function POST(request) {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Validate the essentials.
  if (!body.order_id || typeof body.order_id !== 'string') {
    return NextResponse.json({ error: 'order_id required' }, { status: 400 });
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: 'items required' }, { status: 400 });
  }
  if (typeof body.total !== 'number' || !Number.isFinite(body.total) || body.total < 0) {
    return NextResponse.json({ error: 'valid total required' }, { status: 400 });
  }
  if (!body.email) {
    return NextResponse.json({ error: 'email required' }, { status: 400 });
  }

  // Whitelist columns and force a safe status.
  const row = {};
  for (const k of ALLOWED) if (body[k] !== undefined) row[k] = body[k];
  row.status = 'pending_payment';

  const res = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(row),
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error('place-order insert failed:', detail);
    return NextResponse.json({ error: 'Could not save order' }, { status: 500 });
  }

  return NextResponse.json({ success: true, orderId: body.order_id });
}
