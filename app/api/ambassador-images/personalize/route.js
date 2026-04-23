import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/requireAdmin';
import sharp from 'sharp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// Generate personalized share images for an ambassador. Stamps a
// discreet `?ref={CODE}` watermark in the bottom-right corner of each
// recent social post image and uploads the results to Supabase Storage
// at `ambassador-kits/{CODE}/{filename}`.
//
// Body: { code: 'EZEKIELPHOTOGRAPHY', limit?: 10 }
// Returns: { ok, uploaded, failed, images: [{ filename, url }] }

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'ambassador-kits';

async function sbRest(path, init = {}) {
  return fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      ...(init.headers || {}),
    },
  });
}

async function ensureBucket() {
  const list = await sbRest('/storage/v1/bucket');
  if (list.ok) {
    const buckets = await list.json();
    if (Array.isArray(buckets) && buckets.some(b => b.id === BUCKET || b.name === BUCKET)) return true;
  }
  const create = await sbRest('/storage/v1/bucket', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
  });
  return create.ok;
}

function buildOverlaySvg(code) {
  const text = `?ref=${code}`;
  const estWidth = Math.max(180, text.length * 12 + 40);
  const x = 1080 - estWidth - 30;
  const y = 1080 - 80;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080">
  <rect x="${x}" y="${y}" width="${estWidth}" height="50" rx="4" fill="rgba(10,13,20,0.72)"/>
  <text x="${x + estWidth / 2}" y="${y + 33}" font-family="'JetBrains Mono', 'Menlo', monospace" font-size="20" fill="#F4F2EE" text-anchor="middle">${text}</text>
</svg>`);
}

async function uploadImage(code, filename, buffer) {
  const path = `${code}/${filename}`;
  const r = await sbRest(`/storage/v1/object/${BUCKET}/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'image/png',
      'x-upsert': 'true',
    },
    body: buffer,
  });
  if (!r.ok) {
    const detail = await r.text().catch(() => '');
    throw new Error(`Upload ${filename} failed ${r.status}: ${detail}`);
  }
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${encodeURIComponent(code)}/${encodeURIComponent(filename)}`;
}

export async function POST(request) {
  const unauth = requireAdmin(request);
  if (unauth) return unauth;

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json({ error: 'Server config missing' }, { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  const code = String(body.code || '').trim().toUpperCase();
  const limit = Math.max(1, Math.min(50, parseInt(body.limit, 10) || 10));
  if (!/^[A-Z0-9]{2,32}$/.test(code)) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
  }

  const ambRes = await sbRest(`/rest/v1/ambassadors?code=eq.${code}&select=id,code,status`);
  if (!ambRes.ok) return NextResponse.json({ error: 'Ambassador lookup failed' }, { status: 500 });
  const [amb] = await ambRes.json();
  if (!amb) return NextResponse.json({ error: `No ambassador with code ${code}` }, { status: 404 });

  const bucketOk = await ensureBucket();
  if (!bucketOk) {
    return NextResponse.json({ error: `Bucket '${BUCKET}' could not be created — create it manually in Supabase Storage (public)` }, { status: 500 });
  }

  const postsRes = await sbRest(`/rest/v1/social_posts?select=image_path,scheduled_date&status=in.(scheduled,posted)&order=scheduled_date.desc&limit=${limit}`);
  if (!postsRes.ok) return NextResponse.json({ error: 'Posts query failed' }, { status: 500 });
  const posts = await postsRes.json();
  if (posts.length === 0) return NextResponse.json({ error: 'No posts to personalize' }, { status: 400 });

  const origin = new URL(request.url).origin;
  const overlay = buildOverlaySvg(code);

  const uploaded = [];
  const failed = [];
  const start = Date.now();

  for (const post of posts) {
    const filename = post.image_path.split('/').pop();
    try {
      const imgUrl = origin + post.image_path;
      const imgRes = await fetch(imgUrl);
      if (!imgRes.ok) throw new Error(`Fetch base ${imgRes.status}`);
      const base = Buffer.from(await imgRes.arrayBuffer());

      const stamped = await sharp(base)
        .composite([{ input: overlay, top: 0, left: 0 }])
        .png({ compressionLevel: 8 })
        .toBuffer();

      const url = await uploadImage(code, filename, stamped);
      uploaded.push({ filename, url });
    } catch (err) {
      failed.push({ filename, error: err.message });
    }
  }

  return NextResponse.json({
    ok: true,
    code,
    uploaded_count: uploaded.length,
    failed_count: failed.length,
    elapsed_ms: Date.now() - start,
    images: uploaded,
    failures: failed,
  });
}

export async function GET() {
  return NextResponse.json({ status: 'ambassador-images/personalize route is live' });
}
