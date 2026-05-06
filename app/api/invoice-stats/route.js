import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../lib/requireAdmin';

export async function GET(request) {
  const unauth = requireAdmin(request); if (unauth) return unauth;

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/orders?is_invoice=eq.true&select=status,total,paid_amount&limit=10000`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }, cache: 'no-store' },
  );
  if (!r.ok) return NextResponse.json({ error: await r.text() }, { status: 500 });
  const rows = await r.json();

  let paidTotal = 0, paidCount = 0;
  let pendingTotal = 0, pendingCount = 0;
  for (const row of rows) {
    const total = Number(row.total) || 0;
    const paid = row.paid_amount == null ? null : Number(row.paid_amount);
    if (row.status === 'sent') {
      pendingTotal += total;
      pendingCount += 1;
    } else if (['paid', 'shipped', 'delivered'].includes(row.status)) {
      paidTotal += paid != null ? paid : total;
      paidCount += 1;
    }
  }

  return NextResponse.json({
    paid_total: paidTotal,
    paid_count: paidCount,
    pending_total: pendingTotal,
    pending_count: pendingCount,
  });
}
