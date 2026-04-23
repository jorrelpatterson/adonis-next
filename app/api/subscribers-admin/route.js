import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../lib/requireAdmin';

// Admin-only read/write for the /admin/marketing/subscribers page.
// Service-key wrapped because subscribers table contains customer PII.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

async function sbFetch(path, init = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
}

export async function GET(request) {
  const unauth = requireAdmin(request);
  if (unauth) return unauth;
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json({ error: 'Server config missing' }, { status: 500 });
  }

  const r = await sbFetch('/subscribers?select=id,email,first_name,source,subscribed_at,welcome_2_sent_at,welcome_3_sent_at&order=subscribed_at.desc&limit=500');
  if (!r.ok) {
    const detail = await r.text().catch(() => '');
    return NextResponse.json({ error: 'Query failed', status: r.status, detail }, { status: 500 });
  }
  const subs = await r.json();

  const stats = {
    total: subs.length,
    welcome_1_only: subs.filter(s => !s.welcome_2_sent_at && !s.welcome_3_sent_at).length,
    welcome_2_sent: subs.filter(s => s.welcome_2_sent_at && !s.welcome_3_sent_at).length,
    welcome_3_sent: subs.filter(s => s.welcome_3_sent_at).length,
  };

  return NextResponse.json({ subscribers: subs, stats });
}

export async function POST(request) {
  const unauth = requireAdmin(request);
  if (unauth) return unauth;

  const body = await request.json().catch(() => ({}));
  const { action } = body;

  if (action === 'send') {
    const { id, template } = body;
    if (!id || ![2, 3].includes(template)) {
      return NextResponse.json({ error: 'Missing id or invalid template' }, { status: 400 });
    }

    const getRes = await sbFetch(`/subscribers?id=eq.${id}&select=email,first_name`);
    if (!getRes.ok) return NextResponse.json({ error: 'Lookup failed' }, { status: 500 });
    const [sub] = await getRes.json();
    if (!sub) return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 });

    const origin = new URL(request.url).origin;
    const sendRes = await fetch(`${origin}/api/subscribe-welcome-${template}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: request.headers.get('cookie') || '',
      },
      body: JSON.stringify({ email: sub.email, first_name: sub.first_name || '' }),
    });
    if (!sendRes.ok) {
      const detail = await sendRes.text().catch(() => '');
      return NextResponse.json({ error: 'Send failed', detail }, { status: 500 });
    }

    const column = `welcome_${template}_sent_at`;
    await sbFetch(`/subscribers?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ [column]: new Date().toISOString() }),
    });

    return NextResponse.json({ success: true });
  }

  if (action === 'run-cron') {
    const origin = new URL(request.url).origin;
    const r = await fetch(`${origin}/api/cron/welcome-emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: request.headers.get('cookie') || '',
      },
    });
    const data = await r.json();
    return NextResponse.json(data, { status: r.status });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
