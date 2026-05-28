import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function headers() { return { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' }; }

export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const email = String(body.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
  if (!body.first_name) return NextResponse.json({ error: 'First name required' }, { status: 400 });
  if (!body.phone) return NextResponse.json({ error: 'Phone required' }, { status: 400 });

  const recipientId = UUID_RE.test(String(body.recipient_id || '')) ? body.recipient_id : null;
  const sourceTouch = (body.source_touch >= 1 && body.source_touch <= 5) ? body.source_touch : null;

  const insert = {
    email,
    first_name: String(body.first_name).trim() || null,
    last_name: String(body.last_name || '').trim() || null,
    phone: String(body.phone).trim() || null,
    company: String(body.company || '').trim() || null,
    city: String(body.city || '').trim() || null,
    state: String(body.state || '').trim().toUpperCase() || null,
    why_interested: String(body.why_interested || '').trim() || null,
    source: recipientId ? 'recruitment_drip' : 'organic',
    source_touch: sourceTouch,
    recipient_id: recipientId,
    status: 'pending',
  };

  const insRes = await fetch(`${SUPABASE_URL}/rest/v1/ambassador_applications`, {
    method: 'POST', headers: { ...headers(), Prefer: 'return=minimal' }, body: JSON.stringify(insert),
  });
  if (!insRes.ok) return NextResponse.json({ error: 'Submission failed', detail: await insRes.text() }, { status: 500 });

  if (recipientId) {
    await fetch(`${SUPABASE_URL}/rest/v1/ambassador_recruitment_recipients?id=eq.${recipientId}`, {
      method: 'PATCH', headers: headers(),
      body: JSON.stringify({ drip_status: 'applied', applied_at: new Date().toISOString() }),
    }).catch(() => {});
  }

  return NextResponse.json({ success: true });
}

export async function GET() {
  return NextResponse.json({ status: 'ambassador-apply route is live' });
}
