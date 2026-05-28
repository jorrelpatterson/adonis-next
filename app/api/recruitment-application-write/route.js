import { NextResponse } from 'next/server';
import { requireRole } from '../../../lib/requireAdmin';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function headers() { return { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' }; }

function generateCode(firstName, lastName) {
  const base = (firstName + (lastName || '')).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const suffix = Math.floor(100 + Math.random() * 900);
  return (base || 'AMBASSADOR').slice(0, 16) + suffix;
}

export async function POST(request) {
  const unauth = requireRole(request, 'admin'); if (unauth) return unauth;

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const { action, id, notes } = body || {};
  if (!UUID_RE.test(String(id || ''))) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  if (action === 'reject') {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/ambassador_applications?id=eq.${id}`, {
      method: 'PATCH', headers: headers(),
      body: JSON.stringify({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
        reviewed_by: request.cookies.get('adonis_admin_email')?.value || 'admin',
        notes: notes || null,
      }),
    });
    if (!r.ok) return NextResponse.json({ error: 'Reject failed' }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === 'approve') {
    const appRes = await fetch(`${SUPABASE_URL}/rest/v1/ambassador_applications?id=eq.${id}&select=*&limit=1`, { headers: headers(), cache: 'no-store' });
    const [app] = appRes.ok ? await appRes.json() : [];
    if (!app) return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    if (app.status !== 'pending') return NextResponse.json({ error: `Already ${app.status}` }, { status: 400 });

    const code = generateCode(app.first_name || '', app.last_name || '');
    const ambassador = {
      name: [app.first_name, app.last_name].filter(Boolean).join(' ') || app.email,
      email: app.email,
      phone: app.phone || null,
      code,
      tier: 'starter',
      status: 'active',
    };

    const ambRes = await fetch(`${SUPABASE_URL}/rest/v1/ambassadors`, {
      method: 'POST', headers: { ...headers(), Prefer: 'return=representation' },
      body: JSON.stringify(ambassador),
    });
    if (!ambRes.ok) return NextResponse.json({ error: 'Ambassador create failed', detail: await ambRes.text() }, { status: 500 });
    const [createdAmbassador] = await ambRes.json();

    await fetch(`${SUPABASE_URL}/rest/v1/ambassador_applications?id=eq.${id}`, {
      method: 'PATCH', headers: headers(),
      body: JSON.stringify({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: request.cookies.get('adonis_admin_email')?.value || 'admin',
        notes: notes || null,
        ambassador_id: createdAmbassador.id,
      }),
    });

    // Fire the existing ambassador welcome email
    const origin = new URL(request.url).origin;
    await fetch(`${origin}/api/ambassador-welcome`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: request.headers.get('cookie') || '' },
      body: JSON.stringify({ ambassador: { name: ambassador.name, email: ambassador.email, code: ambassador.code } }),
    }).catch(() => {});

    return NextResponse.json({ success: true, ambassador_id: createdAmbassador.id, code });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

export async function GET() {
  return NextResponse.json({ status: 'recruitment-application-write route is live' });
}
