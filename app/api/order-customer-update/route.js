import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../lib/requireAdmin';
import { renderInvoicePng } from '../../../lib/invoiceImage';

export async function PATCH(request) {
  const unauth = requireAdmin(request); if (unauth) return unauth;

  const body = await request.json().catch(() => ({}));
  const { id, name, email, phone, address, city, state, zip } = body;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json({ error: 'supabase not configured' }, { status: 500 });
  }

  const headers = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' };

  const lookup = await fetch(
    `${SUPABASE_URL}/rest/v1/orders?id=eq.${encodeURIComponent(id)}&select=*&limit=1`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }, cache: 'no-store' },
  );
  if (!lookup.ok) return NextResponse.json({ error: await lookup.text() }, { status: 500 });
  const rows = await lookup.json();
  if (!rows.length) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const existing = rows[0];

  const update = {};
  if (typeof name === 'string' && name.trim()) {
    update.first_name = name.trim().split(' ')[0] || name.trim();
    update.last_name = name.trim().split(' ').slice(1).join(' ') || '';
  }
  if (email !== undefined) {
    update.email = email && email.trim() ? email.trim() : `no-email+${existing.invoice_id || existing.order_id}@invoice.local`;
  }
  if (phone !== undefined) update.phone = phone || null;
  if (address !== undefined) update.address = address;
  if (city !== undefined) update.city = city;
  if (state !== undefined) update.state = state;
  if (zip !== undefined) update.zip = zip;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'nothing to update' }, { status: 400 });
  }

  const patchRes = await fetch(
    `${SUPABASE_URL}/rest/v1/orders?id=eq.${encodeURIComponent(id)}`,
    { method: 'PATCH', headers, body: JSON.stringify(update) },
  );
  if (!patchRes.ok) return NextResponse.json({ error: await patchRes.text() }, { status: 500 });

  // Re-render invoice PNG so the shareable image reflects the corrected customer info.
  if (existing.is_invoice && existing.invoice_image_path) {
    try {
      const merged = { ...existing, ...update };
      const fullName = `${merged.first_name || ''} ${merged.last_name || ''}`.trim();
      const seq = merged.invoice_id ? merged.invoice_id.split('-').pop() : merged.id.slice(0, 4);
      const uuidShort = (merged.id || '').slice(0, 8);
      const png = await renderInvoicePng({
        invoice_id: merged.invoice_id,
        url_tail: `${seq}-${uuidShort}`,
        issued_at: new Date(merged.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        customer: {
          name: fullName,
          address_line1: merged.address,
          address_line2: `${merged.city}, ${merged.state} ${merged.zip}`,
        },
        items: merged.items || [],
        subtotal_cents: Math.round(((merged.items || []).reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0)) * 100),
        discount_pct: merged.invoice_discount_pct,
        discount_flat_cents: merged.invoice_discount_flat_cents,
        discount_applied_cents: Math.max(0, Math.round((((merged.items || []).reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0)) - (merged.total || 0)) * 100)),
        total_cents: Math.round((merged.total || 0) * 100),
      });

      const objectUrl = `${SUPABASE_URL}/storage/v1/object/invoices/${encodeURIComponent(existing.invoice_image_path)}`;
      await fetch(objectUrl, {
        method: 'DELETE',
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
      }).catch(() => {});
      await fetch(objectUrl, {
        method: 'POST',
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'image/png', 'x-upsert': 'true' },
        body: png,
      });
    } catch (err) {
      console.error('invoice image re-render failed:', err);
      // Non-fatal — DB row is updated; image will lag.
    }
  }

  return NextResponse.json({ ok: true });
}
