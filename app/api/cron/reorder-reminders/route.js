import { NextResponse } from 'next/server';
import { requireAdminOrCron } from '../../../../lib/requireAdminOrCron';
import { daysSupply } from '../../../../lib/reorderDuration';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_KEY = process.env.RESEND_API_KEY;

async function sb(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    cache: 'no-store',
  });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
  return r.json();
}

async function sbInsert(path, body) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal,resolution=ignore-duplicates',
    },
    body: JSON.stringify(body),
  });
  return r.ok || r.status === 409;
}

function identityKey(order) {
  const email = (order.email || '').toLowerCase().trim();
  if (email && !email.endsWith('@invoice.local')) return `e:${email}`;
  const phone = (order.phone || '').replace(/\D/g, '');
  if (phone) return `p:${phone}`;
  return null;
}

function indexByIdentity(orders) {
  const idx = {};
  for (const o of orders) {
    const key = identityKey(o);
    if (!key) continue;
    const skuSet = new Set((o.items || []).map(i => i.sku));
    (idx[key] ||= []).push({ delivered_at: o.delivered_at, skuSet });
  }
  return idx;
}

function hasNewerOrderFor(identityIdx, identity, sku, ownDeliveredAt) {
  const list = identityIdx[identity] || [];
  for (const entry of list) {
    if (entry.delivered_at > ownDeliveredAt && entry.skuSet.has(sku)) return true;
  }
  return false;
}

function reminderTypeFor(daysUntilRunout) {
  if (daysUntilRunout >= 12 && daysUntilRunout <= 15) return '14d';
  if (daysUntilRunout >= 1 && daysUntilRunout <= 4) return '3d';
  return null;
}

function daysBetween(later, earlier) {
  return Math.floor((new Date(later).getTime() - new Date(earlier).getTime()) / 86400000);
}

export async function POST(request) {
  const unauth = requireAdminOrCron(request);
  if (unauth) return unauth;

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json({ error: 'Server config missing' }, { status: 500 });
  }
  if (!RESEND_KEY) {
    return NextResponse.json({ error: 'RESEND_API_KEY missing' }, { status: 500 });
  }

  const horizon = new Date(Date.now() - 365 * 86400000).toISOString();

  const [orders, products, sentRows] = await Promise.all([
    sb(`/orders?status=eq.delivered&delivered_at=gte.${encodeURIComponent(horizon)}&select=id,invoice_id,first_name,email,phone,items,delivered_at,is_invoice`),
    sb(`/products?select=sku,name,typical_days_supply,active`),
    sb(`/reorder_reminders_sent?select=order_id,sku,reminder_type`),
  ]);

  const productsBySku = {};
  for (const p of products) productsBySku[p.sku] = p;

  const sentSet = new Set();
  for (const s of sentRows) sentSet.add(`${s.order_id}|${s.sku}|${s.reminder_type}`);

  const identityIdx = indexByIdentity(orders);
  const today = new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z';

  const plan = [];

  for (const order of orders) {
    const identity = identityKey(order);
    if (!identity) continue;

    const buckets = { '14d': [], '3d': [] };
    for (const item of (order.items || [])) {
      const product = productsBySku[item.sku];
      if (!product) continue;
      const days = daysSupply(item.sku, product, item.qty || 1);
      if (days == null) continue;

      const runout = new Date(new Date(order.delivered_at).getTime() + days * 86400000).toISOString();
      const daysUntil = daysBetween(runout, today);
      const type = reminderTypeFor(daysUntil);
      if (!type) continue;

      if (sentSet.has(`${order.id}|${item.sku}|${type}`)) continue;

      if (hasNewerOrderFor(identityIdx, identity, item.sku, order.delivered_at)) continue;

      buckets[type].push({ sku: item.sku, name: product.name });
    }

    for (const type of ['14d', '3d']) {
      if (buckets[type].length > 0) {
        plan.push({ order, type, items: buckets[type] });
      }
    }
  }

  return NextResponse.json({
    ran_at: new Date().toISOString(),
    loaded: {
      orders: orders.length,
      products: products.length,
      sent_rows: sentRows.length,
    },
    planned_sends: plan.map(p => ({
      order_id: p.order.id,
      invoice_id: p.order.invoice_id,
      to: p.order.email,
      type: p.type,
      items: p.items,
    })),
  });
}

export async function GET(request) { return POST(request); }
