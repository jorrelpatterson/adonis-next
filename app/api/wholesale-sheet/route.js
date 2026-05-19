// app/api/wholesale-sheet/route.js
// Server-side proxy for wholesale-sheets Supabase Storage bucket.
// All access goes through this route so we never expose service-role
// credentials to the browser, and the bucket can keep strict RLS.
import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../lib/requireAdmin';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const BUCKET = 'wholesale-sheets';
const CURRENT = 'current.pdf';

function authHeaders() {
  return {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
  };
}

export async function GET(request) {
  const unauth = requireAdmin(request);
  if (unauth) return unauth;

  if (!SERVICE_KEY) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY not configured' },
      { status: 500 }
    );
  }

  const infoRes = await fetch(
    `${SUPABASE_URL}/storage/v1/object/info/${BUCKET}/${CURRENT}`,
    { headers: authHeaders() }
  );

  if (!infoRes.ok) {
    if (infoRes.status === 404 || infoRes.status === 400) {
      return NextResponse.json({ exists: false });
    }
    return NextResponse.json(
      { error: 'Storage info fetch failed', status: infoRes.status },
      { status: 500 }
    );
  }

  const info = await infoRes.json();
  return NextResponse.json({ exists: true, ...info });
}

export async function POST(request) {
  const unauth = requireAdmin(request);
  if (unauth) return unauth;

  if (!SERVICE_KEY) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY not configured' },
      { status: 500 }
    );
  }

  // Parse multipart form data
  let formData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 });
  }

  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Only PDFs are accepted' }, { status: 400 });
  }

  // 10 MB cap (matches bucket limit)
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 400 });
  }

  const fileBuf = Buffer.from(await file.arrayBuffer());

  // Archive existing current.pdf if present (best-effort)
  const existing = await fetch(
    `${SUPABASE_URL}/storage/v1/object/info/${BUCKET}/${CURRENT}`,
    { headers: authHeaders() }
  );
  if (existing.ok) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    await fetch(`${SUPABASE_URL}/storage/v1/object/copy`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bucketId: BUCKET,
        sourceKey: CURRENT,
        destinationKey: `archive/${stamp}.pdf`,
      }),
    });
  }

  // Upsert the new current.pdf
  const uploadRes = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${CURRENT}`,
    {
      method: 'POST',
      headers: {
        ...authHeaders(),
        'Content-Type': 'application/pdf',
        'x-upsert': 'true',
      },
      body: fileBuf,
    }
  );

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    return NextResponse.json(
      { error: 'Storage upload failed', detail: err.slice(0, 500) },
      { status: 500 }
    );
  }

  // Fetch the new info to return back to the client
  const infoRes = await fetch(
    `${SUPABASE_URL}/storage/v1/object/info/${BUCKET}/${CURRENT}`,
    { headers: authHeaders() }
  );
  const info = infoRes.ok ? await infoRes.json() : { updated_at: new Date().toISOString() };

  return NextResponse.json({ success: true, ...info });
}
