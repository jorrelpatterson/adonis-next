// app/api/admin/news/approve-to-calendar/[draftId]/route.js
// Approve a news draft and drop it onto the Content Calendar.
// - Marks the draft `approved` (so it leaves the "Ready for review" list).
// - Creates a `news_card` social_posts row on the next open Tue/Thu/Sat slot.
// News posts fill the in-between days; compound posts own Mon/Wed/Fri.

import { NextResponse } from 'next/server';
import { requireRole } from '../../../../../../lib/requireAdmin';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

async function sb(path, init = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...init,
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`,
               'Content-Type': 'application/json', ...(init.headers || {}) },
  });
}

const NEWS_DAYS = new Set([2, 4, 6]); // Tue, Thu, Sat
function dateKey(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
}
function captionWithHashtags(d) {
  return [(d.caption || '').trim(), (d.hashtags || []).join(' ')].filter(Boolean).join('\n\n');
}

// First Tue/Thu/Sat on or after `from` that has no existing news_card.
function nextOpenNewsSlot(from, taken) {
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  for (let i = 0; i < 120; i++) {
    if (NEWS_DAYS.has(d.getUTCDay()) && !taken.has(dateKey(d))) return dateKey(d);
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return null;
}

export async function POST(request, { params }) {
  const guard = requireRole(request, 'admin', 'va');
  if (guard) return guard;
  if (!SUPABASE_URL || !SERVICE_KEY) return NextResponse.json({ error: 'Server config missing' }, { status: 500 });

  // Load the draft
  const dRes = await sb(`/post_drafts?id=eq.${params.draftId}&select=*`);
  const drafts = await dRes.json();
  if (!Array.isArray(drafts) || drafts.length === 0) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const d = drafts[0];
  if (!Array.isArray(d.image_urls) || d.image_urls.length !== 4) {
    return NextResponse.json({ error: 'draft has no rendered images' }, { status: 400 });
  }

  // Find the next open news slot (Tue/Thu/Sat with no existing news_card)
  const takenRes = await sb(`/social_posts?select=scheduled_date&post_type=eq.news_card&status=in.(draft,scheduled)`);
  const taken = new Set((await takenRes.json()).map(r => r.scheduled_date));
  const slot = nextOpenNewsSlot(new Date(), taken);
  if (!slot) return NextResponse.json({ error: 'no open news slot found' }, { status: 500 });

  // Create the calendar entry
  const createRes = await sb(`/social_posts`, {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      scheduled_date: slot,
      post_type: 'news_card',
      image_path: d.image_urls[0],
      caption: captionWithHashtags(d),
      status: 'scheduled',
    }),
  });
  if (!createRes.ok) return NextResponse.json({ error: 'calendar insert failed', detail: await createRes.text() }, { status: 500 });

  // Mark the draft approved so it drops out of the review queue
  await sb(`/post_drafts?id=eq.${params.draftId}`, {
    method: 'PATCH', headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ status: 'approved', approved_at: new Date().toISOString() }),
  });

  return NextResponse.json({ ok: true, scheduled_date: slot });
}
