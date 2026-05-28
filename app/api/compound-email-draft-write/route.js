import { NextResponse } from 'next/server';
import { requireRole } from '../../../lib/requireAdmin';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const EDITABLE_FIELDS = [
  'hook', 'tagline', 'layman_lead', 'layman_bridge',
  'bullet_1', 'bullet_2', 'bullet_3', 'citations_short',
  'category_label', 'show_stock_stamp', 'scheduled_at', 'notes', 'status',
];

function headers() {
  return { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' };
}

export async function POST(request) {
  const unauth = requireRole(request, 'admin', 'va');
  if (unauth) return unauth;

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const { action, id, fields, compound_slug } = body || {};

  if (action === 'create') {
    if (!compound_slug) return NextResponse.json({ error: 'compound_slug required' }, { status: 400 });
    const cmRes = await fetch(`${SUPABASE_URL}/rest/v1/compound_marketing?compound_slug=eq.${encodeURIComponent(compound_slug)}&select=*&limit=1`, { headers: headers(), cache: 'no-store' });
    const [cm] = cmRes.ok ? await cmRes.json() : [];
    if (!cm) return NextResponse.json({ error: 'compound not found in compound_marketing' }, { status: 404 });

    const insert = {
      compound_slug: cm.compound_slug,
      compound_name: cm.compound_name,
      product_url: cm.product_url || `https://www.advncelabs.com/advnce-product.html?sku=${encodeURIComponent(cm.sku || '')}`,
      category_label: cm.category ? cm.category.toUpperCase() : null,
      hook: cm.hook || null,
      citations_short: cm.citation_primary ? cm.citation_primary.toUpperCase() : null,
      show_stock_stamp: true,
      trigger: 'manual',
      status: 'draft',
      created_by: request.cookies.get('adonis_admin_email')?.value || 'admin',
    };
    const r = await fetch(`${SUPABASE_URL}/rest/v1/compound_email_drafts`, {
      method: 'POST', headers: { ...headers(), Prefer: 'return=representation' },
      body: JSON.stringify(insert),
    });
    if (!r.ok) return NextResponse.json({ error: 'Create failed', detail: await r.text() }, { status: 500 });
    const [row] = await r.json();
    return NextResponse.json({ success: true, draft: row });
  }

  if (!UUID_RE.test(String(id || ''))) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  if (action === 'delete') {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/compound_email_drafts?id=eq.${id}`, {
      method: 'DELETE', headers: headers(),
    });
    if (!r.ok) return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === 'update') {
    if (!fields || typeof fields !== 'object') return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    const patch = {};
    for (const k of EDITABLE_FIELDS) if (fields[k] !== undefined) patch[k] = fields[k];
    if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'No valid fields' }, { status: 400 });

    if (patch.status && !['draft','ready','failed'].includes(patch.status)) {
      return NextResponse.json({ error: 'Invalid status transition (only draft/ready/failed allowed via update)' }, { status: 400 });
    }

    const r = await fetch(`${SUPABASE_URL}/rest/v1/compound_email_drafts?id=eq.${id}`, {
      method: 'PATCH', headers: { ...headers(), Prefer: 'return=minimal' },
      body: JSON.stringify(patch),
    });
    if (!r.ok) return NextResponse.json({ error: 'Update failed', detail: await r.text() }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

export async function GET() {
  return NextResponse.json({ status: 'compound-email-draft-write route is live' });
}
