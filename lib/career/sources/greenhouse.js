// lib/career/sources/greenhouse.js
//
// Pull from Greenhouse public job boards.
// Endpoint: https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true
// No auth required for public boards.

import { getCareerSupabaseAdmin } from '../supabase.js';
import fallbackTargets from '../../../config/career-target-companies.json' with { type: 'json' };

function stripHtml(s) {
  return (s ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function loadTargets() {
  try {
    const sb = getCareerSupabaseAdmin();
    const { data, error } = await sb
      .from('career_target_companies')
      .select('slug, name')
      .eq('source', 'greenhouse')
      .eq('active', true);
    if (error) throw error;
    if (data?.length) return data;
  } catch (err) {
    console.warn('[greenhouse] DB targets unavailable, using config fallback:', err.message);
  }
  return (fallbackTargets.greenhouse || []).map(t => ({ slug: t.slug, name: t.name }));
}

/**
 * @returns {Promise<import('../types.js').RawJob[]>}
 */
export async function fetchGreenhouse() {
  const targets = await loadTargets();
  const out = [];

  for (const t of targets) {
    const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(t.slug)}/jobs?content=true`;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`[greenhouse] ${res.status} for slug "${t.slug}"`);
        continue;
      }
      const data = await res.json();
      if (!data.jobs?.length) continue;

      const companyName = t.name ?? t.slug;
      for (const j of data.jobs) {
        out.push({
          source: 'greenhouse',
          source_id: String(j.id),
          url: j.absolute_url,
          title: j.title?.trim(),
          company: companyName,
          location: j.location?.name ?? null,
          remote: /remote/i.test(j.location?.name ?? ''),
          description: stripHtml(j.content),
          posted_at: j.updated_at,
          raw: j,
        });
      }
    } catch (err) {
      console.error(`[greenhouse] fetch failed for "${t.slug}":`, err.message);
    }
  }

  console.log(`[greenhouse] fetched ${out.length} listings across ${targets.length} boards`);
  return out;
}
