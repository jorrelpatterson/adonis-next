// app/api/admin/news/skip/[draftId]/route.js
// Mark draft skipped; put underlying candidate on 30-day cooldown.

import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../../lib/requireAdmin';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

async function sb(path, init = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...init,
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`,
               'Content-Type': 'application/json', ...(init.headers || {}) },
  });
}

export async function POST(request, { params }) {
  const guard = requireAdmin(request);
  if (guard) return guard;

  const dRes = await sb(`/post_drafts?id=eq.${params.draftId}&select=candidate_id`);
  const rows = await dRes.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  const candidateId = rows[0].candidate_id;

  await sb(`/post_drafts?id=eq.${params.draftId}`, {
    method: 'PATCH', body: JSON.stringify({ status: 'skipped' }),
  });

  if (candidateId) {
    const cooldownUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await sb(`/news_candidates?id=eq.${candidateId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'cooldown', cooldown_until: cooldownUntil }),
    });
  }

  return NextResponse.json({ ok: true });
}
