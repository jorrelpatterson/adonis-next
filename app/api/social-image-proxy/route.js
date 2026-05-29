// app/api/social-image-proxy/route.js
// Same-origin download proxy for remote social-post images (news-queue slides
// live on Supabase Storage). Cross-origin <a download> is ignored by browsers,
// so the calendar routes remote image downloads through here. Locked to the
// project's Supabase Storage host to avoid being an open proxy / SSRF vector.

import { NextResponse } from 'next/server';
import { requireRole } from '../../../lib/requireAdmin';

function allowedHost() {
  try { return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host; }
  catch { return null; }
}

export async function GET(request) {
  const unauth = requireRole(request, 'admin', 'va'); if (unauth) return unauth;

  const raw = new URL(request.url).searchParams.get('url');
  if (!raw) return NextResponse.json({ error: 'url required' }, { status: 400 });

  let target;
  try { target = new URL(raw); } catch { return NextResponse.json({ error: 'Invalid url' }, { status: 400 }); }

  const host = allowedHost();
  if (!host || target.protocol !== 'https:' || target.host !== host) {
    return NextResponse.json({ error: 'Host not allowed' }, { status: 403 });
  }

  const upstream = await fetch(target.toString());
  if (!upstream.ok) return NextResponse.json({ error: 'Upstream fetch failed', status: upstream.status }, { status: 502 });

  const filename = target.pathname.split('/').filter(Boolean).slice(-2).join('-') || 'image.png';
  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': upstream.headers.get('content-type') || 'image/png',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, max-age=0',
    },
  });
}
