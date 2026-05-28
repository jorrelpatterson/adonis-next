import { NextResponse } from 'next/server';
import { requireRole } from '../../../lib/requireAdmin';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

async function sb(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    cache: 'no-store',
  });
  if (!r.ok) return [];
  return r.json();
}

export async function GET(request) {
  const unauth = requireRole(request, 'admin', 'va');
  if (unauth) return unauth;

  const [draftAndReady, sentRecent] = await Promise.all([
    sb('/compound_email_drafts?status=in.(draft,ready,sending,failed)&order=created_at.desc'),
    sb('/compound_email_drafts?status=eq.sent&order=sent_at.desc&limit=30'),
  ]);

  // Bucket the active drafts.
  const needsCopy = [];
  const readyToSend = [];
  const inProgress = [];
  for (const d of draftAndReady) {
    const blank = !d.layman_lead || !d.bullet_1 || !d.bullet_2 || !d.bullet_3 || !d.tagline;
    if (d.status === 'sending' || d.status === 'failed' || (d.recipient_count_sent < d.recipient_count && d.status !== 'draft' && d.status !== 'ready')) {
      inProgress.push(d);
    } else if (blank || d.status === 'draft') {
      needsCopy.push(d);
    } else if (d.status === 'ready') {
      readyToSend.push(d);
    }
  }

  return NextResponse.json({ needsCopy, readyToSend, inProgress, sentRecent });
}
