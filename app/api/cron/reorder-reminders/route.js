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

const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function reminderEmailHtml({ firstName, type, items, catalogUrl }) {
  const isUrgent = type === '3d';
  const headline = isUrgent
    ? 'Running low.'
    : 'Planning ahead.';
  const accent = isUrgent ? '#E07C24' : '#00A0A8';
  const lead = isUrgent
    ? `You're likely to run out in the next few days.`
    : `Based on typical use, your supply runs low in about two weeks.`;
  const greeting = firstName ? `Hi ${esc(firstName)},` : 'Hi —';
  const itemList = items.map((i) =>
    `<li style="margin-bottom:6px"><strong>${esc(i.name)}</strong></li>`,
  ).join('');
  const ctaLabel = isUrgent ? 'Order now →' : 'Reorder →';

  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#E8E6E2;margin:0;padding:24px">
<div style="max-width:600px;margin:0 auto;background:#F4F2EE;padding:40px 32px;border-radius:6px">
<div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#7A7D88;letter-spacing:4px;text-transform:uppercase;margin-bottom:16px">Heads up</div>
<h1 style="font-family:'Barlow Condensed',Arial,sans-serif;font-size:32px;font-weight:900;color:#1A1C22;text-transform:uppercase;letter-spacing:-0.5px;line-height:1;margin:0 0 20px">${headline.replace(/\.$/, '')}<span style="color:${accent}">.</span></h1>
<p style="font-size:15px;line-height:1.65;color:#1A1C22;margin:0 0 16px">${greeting}</p>
<p style="font-size:15px;line-height:1.65;color:#1A1C22;margin:0 0 16px">${lead}</p>
<ul style="font-size:15px;line-height:1.6;color:#1A1C22;margin:0 0 24px;padding-left:20px">${itemList}</ul>
<p style="margin:0 0 28px"><a href="${esc(catalogUrl)}" style="display:inline-block;padding:12px 24px;background:${accent};color:#fff;text-decoration:none;font-family:'Barlow Condensed',Arial,sans-serif;font-weight:700;letter-spacing:1px;text-transform:uppercase;border-radius:4px;font-size:13px">${ctaLabel}</a></p>
<div style="border-top:1px solid #E4E7EC;padding-top:20px">
<p style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#7A7D88;letter-spacing:2px;line-height:1.8;margin:0;text-transform:uppercase">advncelabs.com · all products are for research and laboratory use · not for human consumption · not evaluated by the fda</p>
</div>
</div></body></html>`;
}

async function sendReminderEmail(toEmail, firstName, type, items) {
  const catalogUrl = 'https://www.advncelabs.com/advnce-catalog.html';
  const productsLabel = items.length === 1
    ? items[0].name
    : `${items[0].name} + ${items.length - 1} more`;
  const subject = type === '3d'
    ? `Running low on ${productsLabel} — quick reorder?`
    : `Planning ahead — your ${productsLabel} runs low in about two weeks`;

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_KEY}` },
    body: JSON.stringify({
      from: 'advnce labs <orders@advncelabs.com>',
      to: toEmail,
      subject,
      html: reminderEmailHtml({ firstName, type, items, catalogUrl }),
    }),
  });
  return r.ok;
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

  let sent = 0, failed = 0, skipped_no_email = 0;
  const failures = [];

  for (const { order, type, items } of plan) {
    const toEmail = order.email;
    if (!toEmail || toEmail.endsWith('@invoice.local')) {
      skipped_no_email += 1;
      continue;
    }

    const ok = await sendReminderEmail(toEmail, order.first_name || '', type, items);
    if (!ok) {
      failed += 1;
      failures.push({ order_id: order.id, type, reason: 'resend send failed' });
      continue;
    }

    const stampRows = items.map((it) => ({
      order_id: order.id,
      sku: it.sku,
      reminder_type: type,
      email_to: toEmail,
    }));
    const stamped = await sbInsert('/reorder_reminders_sent', stampRows);
    if (!stamped) {
      failed += 1;
      failures.push({ order_id: order.id, type, reason: 'email sent but stamp failed' });
      continue;
    }

    sent += 1;
  }

  return NextResponse.json({
    ran_at: new Date().toISOString(),
    orders_scanned: orders.length,
    sent,
    failed,
    skipped_no_email,
    failures,
  });
}

export async function GET(request) { return POST(request); }
