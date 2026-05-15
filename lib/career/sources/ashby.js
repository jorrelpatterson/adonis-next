// lib/career/sources/ashby.js
//
// Pull from Ashby public job boards.
// Endpoint: https://api.ashbyhq.com/posting-api/job-board/{slug}
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
      .eq('source', 'ashby')
      .eq('active', true);
    if (error) throw error;
    if (data?.length) return data;
  } catch (err) {
    console.warn('[ashby] DB targets unavailable, using config fallback:', err.message);
  }
  return (fallbackTargets.ashby || []).map(t => ({ slug: t.slug, name: t.name }));
}

/**
 * @returns {Promise<import('../types.js').RawJob[]>}
 */
export async function fetchAshby() {
  const targets = await loadTargets();
  if (!targets.length) {
    console.log('[ashby] no targets configured, skipping');
    return [];
  }
  const out = [];

  for (const t of targets) {
    const url = `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(t.slug)}`;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`[ashby] ${res.status} for slug "${t.slug}"`);
        continue;
      }
      const data = await res.json();
      if (!data.jobs?.length) continue;

      const companyName = t.name ?? t.slug;
      for (const j of data.jobs) {
        out.push({
          source: 'ashby',
          source_id: j.id,
          url: j.jobUrl ?? j.applyUrl ?? `https://jobs.ashbyhq.com/${t.slug}/${j.id}`,
          title: j.title?.trim(),
          company: companyName,
          location: j.location ?? null,
          remote: !!j.isRemote || /remote/i.test(j.location ?? ''),
          description: stripHtml(j.descriptionPlain ?? j.descriptionHtml ?? ''),
          posted_at: j.publishedAt ?? null,
          raw: j,
        });
      }
    } catch (err) {
      console.error(`[ashby] fetch failed for "${t.slug}":`, err.message);
    }
  }

  console.log(`[ashby] fetched ${out.length} listings across ${targets.length} boards`);
  return out;
}
