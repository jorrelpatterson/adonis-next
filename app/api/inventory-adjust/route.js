import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../lib/requireAdmin';

const ALLOWED_REASONS = [
  'broken', 'spilled', 'qa_test', 'returned_damaged',
  'expired', 'sample', 'count_correction', 'other',
];

export async function POST(request) {
  const unauth = requireAdmin(request); if (unauth) return unauth;

  const body = await request.json().catch(() => ({}));
  const { product_id, delta_vials, reason, note } = body;

  if (!product_id) return NextResponse.json({ error: 'product_id required' }, { status: 400 });
  const delta = parseInt(delta_vials, 10);
  if (!Number.isFinite(delta) || delta === 0) {
    return NextResponse.json({ error: 'delta_vials must be a non-zero integer' }, { status: 400 });
  }
  if (Math.abs(delta) > 1000) {
    return NextResponse.json({ error: 'delta_vials out of range (±1000 max)' }, { status: 400 });
  }
  if (!ALLOWED_REASONS.includes(reason)) {
    return NextResponse.json({ error: `reason must be one of: ${ALLOWED_REASONS.join(', ')}` }, { status: 400 });
  }
  if (note != null && typeof note !== 'string') {
    return NextResponse.json({ error: 'note must be a string' }, { status: 400 });
  }
  if (typeof note === 'string' && note.length > 500) {
    return NextResponse.json({ error: 'note too long (500 char max)' }, { status: 400 });
  }

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const headers = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' };

  const lookup = await fetch(
    `${SUPABASE_URL}/rest/v1/products?id=eq.${encodeURIComponent(product_id)}&select=id,sku,name,stock,cost&limit=1`,
    { headers, cache: 'no-store' },
  );
  if (!lookup.ok) return NextResponse.json({ error: await lookup.text() }, { status: 500 });
  const rows = await lookup.json();
  if (!rows.length) return NextResponse.json({ error: 'product not found' }, { status: 404 });
  const product = rows[0];

  const currentStock = Number(product.stock) || 0;
  const newStock = Math.max(0, currentStock + delta);

  // Determine cost-per-vial at time of adjustment.
  // Prefer paid cost from received PO items; fall back to products.cost (per-kit, 10 vials).
  let costPerVialCents = null;
  // Match the inventory page's cost-basis logic: most recent received unit_cost (per-kit, 10 vials).
  const poItemsRes = await fetch(
    `${SUPABASE_URL}/rest/v1/purchase_order_items?product_id=eq.${encodeURIComponent(product_id)}&qty_received=gt.0&select=unit_cost,received_at&order=received_at.desc.nullslast&limit=1`,
    { headers, cache: 'no-store' },
  );
  if (poItemsRes.ok) {
    const items = await poItemsRes.json();
    if (items.length && items[0].unit_cost != null) {
      costPerVialCents = Math.round(Number(items[0].unit_cost) * 100 / 10);
    }
  }
  if (costPerVialCents == null) {
    const kitCost = Number(product.cost) || 0;
    costPerVialCents = Math.round(kitCost * 100 / 10);
  }

  const stockUpdate = await fetch(
    `${SUPABASE_URL}/rest/v1/products?id=eq.${encodeURIComponent(product_id)}`,
    {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ stock: newStock, updated_at: new Date().toISOString() }),
    },
  );
  if (!stockUpdate.ok) return NextResponse.json({ error: 'stock update failed: ' + await stockUpdate.text() }, { status: 500 });

  const insertRes = await fetch(
    `${SUPABASE_URL}/rest/v1/inventory_adjustments`,
    {
      method: 'POST',
      headers: { ...headers, Prefer: 'return=representation' },
      body: JSON.stringify({
        product_id,
        sku: product.sku,
        delta_vials: delta,
        reason,
        note: note && note.trim() ? note.trim() : null,
        cost_per_vial_cents: costPerVialCents,
      }),
    },
  );
  if (!insertRes.ok) {
    // Best-effort rollback: re-set stock to original value.
    await fetch(
      `${SUPABASE_URL}/rest/v1/products?id=eq.${encodeURIComponent(product_id)}`,
      { method: 'PATCH', headers, body: JSON.stringify({ stock: currentStock }) },
    ).catch(() => {});
    return NextResponse.json({ error: 'log insert failed: ' + await insertRes.text() }, { status: 500 });
  }
  const inserted = await insertRes.json();

  return NextResponse.json({
    ok: true,
    adjustment: Array.isArray(inserted) ? inserted[0] : inserted,
    new_stock: newStock,
  });
}
