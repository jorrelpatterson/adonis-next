// app/api/admin/visitors/route.js
// Read-only data feed for the /admin/visitors dashboard.
// The visitor-recovery tables (visitors, visitor_events, recovery_sends,
// email_optout) have RLS enabled, so the browser's anon client can't read
// them. This route reads server-side with the service key, gated by the
// admin cookie.

import { NextResponse } from 'next/server';
import { requireRole } from '../../../../lib/requireAdmin';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

function headers(extra = {}) {
  return {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

async function rows(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: headers(), cache: 'no-store' });
  return r.ok ? r.json() : [];
}

async function count(path) {
  const sep = path.includes('?') ? '&' : '?';
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}${sep}limit=1`, {
    headers: headers({ Prefer: 'count=exact' }),
    cache: 'no-store',
  });
  const range = r.headers.get('content-range') || '/0';
  return parseInt(range.split('/')[1], 10) || 0;
}

export async function GET(request) {
  const guard = requireRole(request, 'admin');
  if (guard) return guard;

  const since24 = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

  const [visitors, identified, events24, candidates, optouts, events, identifiedList, sends] =
    await Promise.all([
      count('visitors?select=vid'),
      count('visitors?select=vid&identified_email=not.is.null'),
      count(`visitor_events?select=id&created_at=gte.${since24}`),
      count('recovery_sends?select=id'),
      count('email_optout?select=email'),
      rows('visitor_events?select=created_at,type,email,product,url&order=created_at.desc&limit=40'),
      rows('visitors?select=identified_email,first_seen,last_seen&identified_email=not.is.null&order=last_seen.desc&limit=50'),
      rows('recovery_sends?select=sent_at,status,trigger_type,email&order=sent_at.desc&limit=40'),
    ]);

  return NextResponse.json({
    stats: { visitors, identified, events24, candidates, optouts },
    events,
    identified: identifiedList,
    sends,
  });
}
