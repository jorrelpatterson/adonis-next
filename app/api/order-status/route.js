import { NextResponse } from 'next/server';
import { requireRole } from '../../../lib/requireAdmin';

const VALID = ['pending_payment', 'sent', 'confirmed', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'];

// POST /api/order-status — admin updates an order's status via the
// service-role key (orders RLS blocks anon writes). Body: { orderId, status }.
export async function POST(request) {
  const unauth = requireRole(request, 'admin');
  if (unauth) return unauth;

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const { orderId, status } = await request.json().catch(() => ({}));
  if (!orderId || !status) {
    return NextResponse.json({ error: 'orderId and status required' }, { status: 400 });
  }
  if (!VALID.includes(status)) {
    return NextResponse.json({ error: `Invalid status. Use: ${VALID.join(', ')}` }, { status: 400 });
  }

  const r = await fetch(`${SUPABASE_URL}/rest/v1/orders?order_id=eq.${encodeURIComponent(orderId)}`, {
    method: 'PATCH',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ status }),
  });
  if (!r.ok) {
    return NextResponse.json({ error: await r.text() }, { status: 500 });
  }
  return NextResponse.json({ success: true, orderId, status });
}
