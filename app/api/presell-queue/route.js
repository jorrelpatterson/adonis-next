import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../lib/requireAdmin';

export async function GET(request) {
  const unauth = requireAdmin(request); if (unauth) return unauth;

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  const url = `${SUPABASE_URL}/rest/v1/orders?select=order_id,email,items,total,pre_sell_subtotal_cents,pre_sell_status,created_at&pre_sell_status=in.(queued,po_placed)&order=created_at.asc`;
  const r = await fetch(url, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    cache: 'no-store',
  });
  if (!r.ok) return NextResponse.json({ error: await r.text() }, { status: 500 });
  const orders = await r.json();

  const bySku = {};
  for (const o of orders) {
    const presellLines = (o.items || []).filter((it) => it.pre_sell);
    for (const line of presellLines) {
      const key = line.sku;
      if (!bySku[key]) {
        bySku[key] = {
          sku: line.sku,
          name: line.name,
          size: line.size || '',
          orders: [],
          total_units: 0,
          queued_revenue_cents: 0,
          oldest_days: 0,
          status_counts: { queued: 0, po_placed: 0 },
        };
      }
      const qty = line.qty || 1;
      bySku[key].total_units += qty;
      bySku[key].queued_revenue_cents += Math.round(line.price * qty * 100);
      bySku[key].status_counts[o.pre_sell_status] =
        (bySku[key].status_counts[o.pre_sell_status] || 0) + 1;
      bySku[key].orders.push({
        order_id: o.order_id,
        email: o.email,
        qty,
        price: line.price,
        pre_sell_status: o.pre_sell_status,
        created_at: o.created_at,
      });
      const ageDays = Math.floor((Date.now() - new Date(o.created_at).getTime()) / (24 * 60 * 60 * 1000));
      if (ageDays > bySku[key].oldest_days) bySku[key].oldest_days = ageDays;
    }
  }

  const queue = Object.values(bySku).sort((a, b) => b.oldest_days - a.oldest_days);
  return NextResponse.json({ queue });
}
