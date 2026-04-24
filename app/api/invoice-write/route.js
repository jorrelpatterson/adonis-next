import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../lib/requireAdmin';
import { nextInvoiceId } from '../../../lib/invoiceId';
import { renderInvoicePng } from '../../../lib/invoiceImage';
import { randomUUID } from 'node:crypto';

export async function POST(request) {
  const unauth = requireAdmin(request); if (unauth) return unauth;

  const body = await request.json().catch(() => ({}));
  const { customer, items, discount_pct, discount_flat_cents, notes } = body;

  if (!customer || !customer.name || !customer.address || !customer.city || !customer.state || !customer.zip) {
    return NextResponse.json({ error: 'customer name + full address are required' }, { status: 400 });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'at least one item required' }, { status: 400 });
  }
  if (items.length > 20) {
    return NextResponse.json({ error: 'max 20 items per invoice' }, { status: 400 });
  }
  const pct = discount_pct == null || discount_pct === '' ? null : Number(discount_pct);
  const flat = discount_flat_cents == null || discount_flat_cents === '' ? null : Math.round(Number(discount_flat_cents));
  if (pct != null && (isNaN(pct) || pct < 0 || pct > 100)) {
    return NextResponse.json({ error: 'discount_pct must be 0-100' }, { status: 400 });
  }
  if (flat != null && (isNaN(flat) || flat < 0)) {
    return NextResponse.json({ error: 'discount_flat_cents must be non-negative' }, { status: 400 });
  }

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const headers = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' };

  const normalizedItems = [];
  let subtotalCents = 0;
  for (const it of items) {
    const qty = parseInt(it.qty, 10);
    if (!qty || qty < 1 || qty > 50) {
      return NextResponse.json({ error: `bad qty for ${it.sku}` }, { status: 400 });
    }
    if (!it.sku || typeof it.sku !== 'string') {
      return NextResponse.json({ error: 'missing sku' }, { status: 400 });
    }
    const pr = await fetch(
      `${SUPABASE_URL}/rest/v1/products?sku=eq.${encodeURIComponent(it.sku)}&select=name,size,retail,stock`,
      { headers, cache: 'no-store' },
    );
    if (!pr.ok) return NextResponse.json({ error: 'product lookup failed' }, { status: 500 });
    const pdata = await pr.json();
    if (!pdata.length) return NextResponse.json({ error: `unknown sku: ${it.sku}` }, { status: 400 });
    const unitCents = Math.round((it.price != null ? Number(it.price) : Number(pdata[0].retail)) * 100);
    if (isNaN(unitCents) || unitCents < 0) {
      return NextResponse.json({ error: `bad price for ${it.sku}` }, { status: 400 });
    }
    normalizedItems.push({
      sku: it.sku,
      name: pdata[0].name,
      size: pdata[0].size,
      qty,
      price: unitCents / 100,
    });
    subtotalCents += unitCents * qty;
  }

  let discountAppliedCents = 0;
  if (pct != null) discountAppliedCents += Math.round(subtotalCents * pct / 100);
  if (flat != null) discountAppliedCents += flat;
  if (discountAppliedCents > subtotalCents) discountAppliedCents = subtotalCents;
  const totalCents = subtotalCents - discountAppliedCents;

  const invoiceId = await nextInvoiceId(SUPABASE_URL, SERVICE_KEY);
  const uuid = randomUUID();
  const orderId = `AVL-${new Date().getUTCFullYear()}-${invoiceId.split('-').pop()}`;
  const issuedAt = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // URL tail = <seq>-<uuid-short>. Parses the trailing sequence number from
  // invoice_id ("AVL-INV-0001" → "0001") and suffixes 8 chars of the UUID.
  // Readable on the customer's end ("invoice 0001") + unguessable.
  const seq = invoiceId.split('-').pop();
  const urlTail = `${seq}-${uuid.slice(0, 8)}`;

  const png = await renderInvoicePng({
    invoice_id: invoiceId,
    url_tail: urlTail,
    issued_at: issuedAt,
    customer: {
      name: customer.name,
      address_line1: customer.address,
      address_line2: `${customer.city}, ${customer.state} ${customer.zip}`,
    },
    items: normalizedItems,
    subtotal_cents: subtotalCents,
    discount_pct: pct,
    discount_flat_cents: flat,
    discount_applied_cents: discountAppliedCents,
    total_cents: totalCents,
  });

  const objectPath = `${invoiceId}.png`;
  const upRes = await fetch(
    `${SUPABASE_URL}/storage/v1/object/invoices/${encodeURIComponent(objectPath)}`,
    {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'image/png', 'x-upsert': 'true' },
      body: png,
    },
  );
  if (!upRes.ok) {
    return NextResponse.json({ error: 'image upload failed: ' + (await upRes.text()) }, { status: 500 });
  }

  // email is NOT NULL in orders table (storefront requires it). For invoices
  // where admin only has a phone, substitute a placeholder that clearly isn't
  // a real mailbox. Outbound email helpers skip sending when they see this pattern.
  const emailFilled = customer.email && customer.email.trim()
    ? customer.email.trim()
    : `no-email+${invoiceId}@invoice.local`;

  const orderPayload = {
    id: uuid,
    order_id: orderId,
    first_name: customer.name.split(' ')[0] || customer.name,
    last_name: customer.name.split(' ').slice(1).join(' ') || '',
    email: emailFilled,
    phone: customer.phone || null,
    address: customer.address,
    city: customer.city,
    state: customer.state,
    zip: customer.zip,
    notes: notes || null,
    items: normalizedItems,
    total: totalCents / 100,
    status: 'sent',
    is_invoice: true,
    invoice_id: invoiceId,
    invoice_image_path: objectPath,
    invoice_discount_pct: pct,
    invoice_discount_flat_cents: flat,
    created_by: 'admin',
    created_at: new Date().toISOString(),
  };

  const insRes = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=representation' },
    body: JSON.stringify(orderPayload),
  });
  if (!insRes.ok) {
    return NextResponse.json({ error: 'order insert failed: ' + (await insRes.text()) }, { status: 500 });
  }
  const inserted = await insRes.json();
  return NextResponse.json({ invoice: inserted[0] });
}
