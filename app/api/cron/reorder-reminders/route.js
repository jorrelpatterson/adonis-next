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

  return NextResponse.json({
    ran_at: new Date().toISOString(),
    loaded: {
      orders: orders.length,
      products: products.length,
      sent_rows: sentRows.length,
    },
  });
}

export async function GET(request) { return POST(request); }
