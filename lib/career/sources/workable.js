// lib/career/sources/workable.js
//
// Pull from Workable public job boards.
// Endpoint: https://apply.workable.com/api/v3/accounts/{slug}/jobs
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
      .eq('source', 'workable')
      .eq('active', true);
    if (error) throw error;
    if (data?.length) return data;
  } catch (err) {
    console.warn('[workable] DB targets unavailable, using config fallback:', err.message);
  }
  return (fallbackTargets.workable || []).map(t => ({ slug: t.slug, name: t.name }));
}

/**
 * @returns {Promise<import('../types.js').RawJob[]>}
 */
export async function fetchWorkable() {
  const targets = await loadTargets();
  if (!targets.length) {
    console.log('[workable] no targets configured, skipping');
    return [];
  }
  const out = [];

  for (const t of targets) {
    const url = `https://apply.workable.com/api/v3/accounts/${encodeURIComponent(t.slug)}/jobs`;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`[workable] ${res.status} for slug "${t.slug}"`);
        continue;
      }
      const data = await res.json();
      if (!data.results?.length) continue;

      const companyName = t.name ?? t.slug;
      for (const j of data.results) {
        const locParts = [j.location?.city, j.location?.region, j.location?.country].filter(Boolean).join(', ');
        out.push({
          source: 'workable',
          source_id: j.shortcode ?? j.id,
          url: j.url ?? j.application_url ?? `https://apply.workable.com/${t.slug}/j/${j.shortcode}`,
          title: j.title?.trim(),
          company: companyName,
          location: locParts || null,
          remote: !!j.remote || /remote/i.test(locParts),
          description: stripHtml(j.description),
          posted_at: j.published_on ?? null,
          raw: j,
        });
      }
    } catch (err) {
      console.error(`[workable] fetch failed for "${t.slug}":`, err.message);
    }
  }

  console.log(`[workable] fetched ${out.length} listings across ${targets.length} boards`);
  return out;
}
