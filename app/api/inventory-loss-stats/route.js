import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../lib/requireAdmin';

export async function GET(request) {
  const unauth = requireAdmin(request); if (unauth) return unauth;

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/inventory_adjustments?select=delta_vials,reason,cost_per_vial_cents,created_at&limit=10000`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }, cache: 'no-store' },
  );
  if (!r.ok) return NextResponse.json({ error: await r.text() }, { status: 500 });
  const rows = await r.json();

  const cutoff30 = Date.now() - 30 * 86400000;

  let lossVials = 0, lossCents = 0;
  let foundVials = 0, foundCents = 0;
  let lossVials30 = 0, lossCents30 = 0;
  const byReason = {};

  for (const row of rows) {
    const delta = Number(row.delta_vials) || 0;
    const cpv = Number(row.cost_per_vial_cents) || 0;
    const ts = row.created_at ? new Date(row.created_at).getTime() : 0;
    const within30 = ts >= cutoff30;

    if (delta < 0) {
      const v = Math.abs(delta);
      lossVials += v;
      lossCents += v * cpv;
      if (within30) {
        lossVials30 += v;
        lossCents30 += v * cpv;
      }
    } else if (delta > 0) {
      foundVials += delta;
      foundCents += delta * cpv;
    }

    if (!byReason[row.reason]) byReason[row.reason] = { vials: 0, cents: 0, count: 0 };
    byReason[row.reason].vials += Math.abs(delta);
    byReason[row.reason].cents += Math.abs(delta) * cpv;
    byReason[row.reason].count += 1;
  }

  return NextResponse.json({
    loss_vials: lossVials,
    loss_cents: lossCents,
    found_vials: foundVials,
    found_cents: foundCents,
    loss_vials_30d: lossVials30,
    loss_cents_30d: lossCents30,
    by_reason: byReason,
    total_adjustments: rows.length,
  });
}
