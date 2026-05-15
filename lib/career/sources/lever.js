// lib/career/sources/lever.js
//
// Pull from Lever public postings.
// Endpoint: https://api.lever.co/v0/postings/{slug}?mode=json
// No auth required.

import { getCareerSupabaseAdmin } from '../supabase.js';
import fallbackTargets from '../../../config/career-target-companies.json' with { type: 'json' };

function stripHtml(s) {
  return (s ?? '').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
}

async function loadTargets() {
  try {
    const sb = getCareerSupabaseAdmin();
    const { data, error } = await sb
      .from('career_target_companies')
      .select('slug, name')
      .eq('source', 'lever')
      .eq('active', true);
    if (error) throw error;
    if (data?.length) return data;
  } catch (err) {
    console.warn('[lever] DB targets unavailable, using config fallback:', err.message);
  }
  return (fallbackTargets.lever || []).map(t => ({ slug: t.slug, name: t.name }));
}

/**
 * @returns {Promise<import('../types.js').RawJob[]>}
 */
export async function fetchLever() {
  const targets = await loadTargets();
  const out = [];

  for (const t of targets) {
    const url = `https://api.lever.co/v0/postings/${encodeURIComponent(t.slug)}?mode=json`;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`[lever] ${res.status} for slug "${t.slug}"`);
        continue;
      }
      const data = await res.json();
      if (!Array.isArray(data) || !data.length) continue;

      const companyName = t.name ?? t.slug;
      for (const p of data) {
        const loc = p.categories?.location ?? null;
        out.push({
          source: 'lever',
          source_id: p.id,
          url: p.hostedUrl || p.applyUrl,
          title: p.text?.trim(),
          company: companyName,
          location: loc,
          remote: /remote/i.test(loc ?? '') || /remote/i.test(p.text ?? ''),
          description: stripHtml(p.descriptionPlain ?? p.description ?? ''),
          posted_at: p.createdAt ? new Date(p.createdAt).toISOString() : null,
          raw: p,
        });
      }
    } catch (err) {
      console.error(`[lever] fetch failed for "${t.slug}":`, err.message);
    }
  }

  console.log(`[lever] fetched ${out.length} listings across ${targets.length} boards`);
  return out;
}
