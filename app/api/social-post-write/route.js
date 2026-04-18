import { NextResponse } from 'next/server';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_FIELDS = ['caption','scheduled_date','status','posted_at','image_path','source_compound'];

export async function POST(request) {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) return NextResponse.json({ error: 'Server config missing' }, { status: 500 });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { action, id, fields } = body || {};
  if (!['create','update','delete'].includes(action)) return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  const headers = {
    'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json', 'Prefer': 'return=minimal',
  };

  if (action === 'create') {
    if (!fields?.scheduled_date || !fields?.post_type || !fields?.image_path || !fields?.caption) {
      return NextResponse.json({ error: 'scheduled_date, post_type, image_path, caption required' }, { status: 400 });
    }
    const r = await fetch(`${SUPABASE_URL}/rest/v1/social_posts`, { method:'POST', headers, body: JSON.stringify(fields) });
    if (!r.ok) return NextResponse.json({ error: 'Create failed', detail: await r.text() }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (!UUID_RE.test(String(id || ''))) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  const url = `${SUPABASE_URL}/rest/v1/social_posts?id=eq.${id}`;

  if (action === 'delete') {
    const r = await fetch(url, { method:'DELETE', headers });
    if (!r.ok) return NextResponse.json({ error: 'Delete failed', detail: await r.text() }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (!fields || typeof fields !== 'object') return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  const patch = { updated_at: new Date().toISOString() };
  for (const k of ALLOWED_FIELDS) if (fields[k] !== undefined) patch[k] = fields[k];
  if (Object.keys(patch).length === 1) return NextResponse.json({ error: 'No valid fields' }, { status: 400 });

  const r = await fetch(url, { method:'PATCH', headers, body: JSON.stringify(patch) });
  if (!r.ok) return NextResponse.json({ error: 'Update failed', detail: await r.text() }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function GET() {
  return NextResponse.json({ status: 'social-post-write route is live' });
}
