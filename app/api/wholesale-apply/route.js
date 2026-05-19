// app/api/wholesale-apply/route.js
import { NextResponse } from 'next/server';
import { wholesaleNotifyHtml } from '../../../lib/email-templates/wholesale-notify';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const RESEND = process.env.RESEND_API_KEY;
const NOTIFY =
  process.env.WHOLESALE_NOTIFY_EMAIL ||
  process.env.ADMIN_EMAIL ||
  'jorrelpatterson@gmail.com';

const VALID_VOLUMES = new Set(['10–99', '100–499', '500–999', '1000+']);

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Honeypot — if filled, silently succeed (don't tell the bot).
  if (body.website_url_hp && body.website_url_hp.length > 0) {
    return NextResponse.json({ success: true });
  }

  // Required field validation
  const required = ['business_name', 'contact_name', 'phone', 'email', 'country', 'state', 'expected_volume'];
  for (const f of required) {
    if (!body[f] || String(body[f]).trim() === '') {
      return NextResponse.json({ error: `Missing field: ${f}` }, { status: 400 });
    }
  }

  if (!VALID_VOLUMES.has(body.expected_volume)) {
    return NextResponse.json({ error: 'Invalid expected_volume' }, { status: 400 });
  }

  if (!body.research_use_only || !body.agree_terms) {
    return NextResponse.json({ error: 'Must accept both checkboxes' }, { status: 400 });
  }

  // Basic email shape
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }

  // Turnstile verification (only if secret configured)
  const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY;
  if (TURNSTILE_SECRET) {
    if (!body.turnstile_token) {
      return NextResponse.json({ error: 'Missing Turnstile token' }, { status: 400 });
    }
    const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: TURNSTILE_SECRET,
        response: body.turnstile_token,
      }),
    });
    const result = await verify.json();
    if (!result.success) {
      return NextResponse.json({ error: 'Turnstile verification failed' }, { status: 400 });
    }
  }

  const row = {
    business_name: body.business_name.trim(),
    contact_name: body.contact_name.trim(),
    phone: body.phone.trim(),
    email: body.email.trim().toLowerCase(),
    country: body.country.trim(),
    market: body.state.trim(),
    expected_volume: body.expected_volume,
    status: 'pending',
    submitted_at: new Date().toISOString(),
  };

  // Insert into Supabase
  const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/distributors`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(row),
  });

  if (!insertRes.ok) {
    const err = await insertRes.text();
    console.error('wholesale-apply insert failed:', err);
    return NextResponse.json({ error: 'Could not save application' }, { status: 500 });
  }

  // Notify admin (best-effort — don't block success on email failure)
  if (RESEND) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${RESEND}`,
        },
        body: JSON.stringify({
          from: 'advnce labs <orders@advncelabs.com>',
          to: NOTIFY,
          subject: `New wholesale inquiry — ${row.business_name}`,
          html: wholesaleNotifyHtml({ ...row, state: body.state }),
        }),
      });
    } catch (e) {
      console.error('wholesale-apply notify failed:', e);
    }
  }

  return NextResponse.json({ success: true });
}

export async function GET() {
  return NextResponse.json({ status: 'wholesale-apply route is live' });
}
