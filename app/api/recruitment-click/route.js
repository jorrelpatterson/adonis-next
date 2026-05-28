import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const WHOLESALE_URL = 'https://www.advncelabs.com/advnce-wholesale.html';

function headers() { return { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' }; }

export async function GET(request) {
  const url = new URL(request.url);
  const r = url.searchParams.get('r');
  const t = parseInt(url.searchParams.get('t') || '0', 10);
  const dest = url.searchParams.get('dest') || 'apply';

  if (!UUID_RE.test(String(r || '')) || !(t >= 1 && t <= 5) || !['apply','wholesale'].includes(dest)) {
    // Silent fallback: still redirect somewhere reasonable. Don't expose internals.
    return NextResponse.redirect(`${url.origin}/ambassadors/apply`, { status: 302 });
  }

  const now = new Date().toISOString();
  // Lookup current state once
  const lookup = await fetch(`${SUPABASE_URL}/rest/v1/ambassador_recruitment_recipients?id=eq.${r}&select=drip_status&limit=1`, { headers: headers(), cache: 'no-store' });
  const [rec] = lookup.ok ? await lookup.json() : [];

  const patch = { last_any_clicked_at: now };
  if (dest === 'apply') patch.last_apply_clicked_at = now;
  // Pause-on-warm-click: only if drip is mid-flight and they clicked apply
  if (dest === 'apply' && rec && rec.drip_status === 'in_progress') {
    patch.drip_status = 'paused';
    patch.paused_until = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  }

  // Best-effort update; don't block the redirect on it
  await fetch(`${SUPABASE_URL}/rest/v1/ambassador_recruitment_recipients?id=eq.${r}`, {
    method: 'PATCH', headers: headers(), body: JSON.stringify(patch),
  }).catch(() => {});

  const target = dest === 'wholesale' ? WHOLESALE_URL : `${url.origin}/ambassadors/apply?r=${r}&t=${t}`;
  return NextResponse.redirect(target, 302);
}
