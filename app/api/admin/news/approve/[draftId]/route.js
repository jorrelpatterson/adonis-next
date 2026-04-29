// app/api/admin/news/approve/[draftId]/route.js
// Returns a zip of the 4 slide PNGs. Marks draft as posted.

import { requireAdmin } from '../../../../../../lib/requireAdmin';
import archiver from 'archiver';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

async function sb(path, init = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...init,
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`,
               'Content-Type': 'application/json', ...(init.headers || {}) },
  });
}

export const maxDuration = 60;

export async function POST(request, { params }) {
  const guard = requireAdmin(request);
  if (guard) return guard;

  const dRes = await sb(`/post_drafts?id=eq.${params.draftId}&select=*`);
  const drafts = await dRes.json();
  if (!Array.isArray(drafts) || drafts.length === 0) {
    return new Response('not found', { status: 404 });
  }
  const d = drafts[0];
  if (!Array.isArray(d.image_urls) || d.image_urls.length !== 4) {
    return new Response('draft has no rendered images', { status: 400 });
  }

  // Fetch all 4 PNGs in parallel
  const buffers = await Promise.all(d.image_urls.map(async (u, i) => {
    const r = await fetch(u);
    if (!r.ok) throw new Error(`failed to fetch slide ${i+1}: ${r.status}`);
    return { name: `slide-${i+1}.png`, data: Buffer.from(await r.arrayBuffer()) };
  }));

  // Build zip in memory
  const archive = archiver('zip', { zlib: { level: 9 } });
  const chunks = [];
  archive.on('data', (c) => chunks.push(c));
  for (const f of buffers) archive.append(f.data, { name: f.name });
  await archive.finalize();
  const zipBuffer = Buffer.concat(chunks);

  // Mark posted
  await sb(`/post_drafts?id=eq.${params.draftId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'posted', approved_at: new Date().toISOString(),
                           posted_at: new Date().toISOString() }),
  });

  return new Response(zipBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="news-${params.draftId}.zip"`,
    },
  });
}
