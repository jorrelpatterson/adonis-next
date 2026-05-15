// lib/career/sources/jsearch.js
//
// Aggregator. Wraps Google for Jobs via JSearch (RapidAPI).
// Free tier: 200 requests/month. Use sparingly — 5 queries × 1 page = 5 calls/day = 150/month.

import searchParams from '../../../config/career-search-params.json' with { type: 'json' };

/**
 * @returns {Promise<import('../types.js').RawJob[]>}
 */
export async function fetchJSearch() {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) {
    console.warn('[jsearch] skipped — RAPIDAPI_KEY not set');
    return [];
  }

  const cfg = searchParams.jsearch;
  const out = [];

  for (const query of cfg.queries) {
    for (let page = 1; page <= cfg.max_pages_per_query; page++) {
      const url = new URL('https://jsearch.p.rapidapi.com/search');
      url.searchParams.set('query', query);
      url.searchParams.set('page', String(page));
      url.searchParams.set('num_pages', '1');
      url.searchParams.set('country', cfg.country);
      url.searchParams.set('date_posted', cfg.date_posted);
      url.searchParams.set('employment_types', cfg.employment_types);
      if (cfg.remote_only) url.searchParams.set('remote_jobs_only', 'true');

      try {
        const res = await fetch(url.toString(), {
          headers: {
            'X-RapidAPI-Key': key,
            'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
          },
        });
        if (!res.ok) {
          console.warn(`[jsearch] ${res.status} for "${query}"`);
          break;
        }
        const data = await res.json();
        if (!data.data?.length) break;

        for (const r of data.data) {
          const locParts = [r.job_city, r.job_state, r.job_country].filter(Boolean).join(', ');
          out.push({
            source: 'jsearch',
            source_id: r.job_id,
            url: r.job_apply_link,
            title: r.job_title?.trim(),
            company: r.employer_name?.trim() ?? 'Unknown',
            location: locParts || null,
            remote: !!r.job_is_remote,
            salary_min: r.job_min_salary ?? null,
            salary_max: r.job_max_salary ?? null,
            salary_currency: r.job_salary_currency ?? 'USD',
            description: r.job_description ?? null,
            posted_at: r.job_posted_at_timestamp
              ? new Date(r.job_posted_at_timestamp * 1000).toISOString()
              : null,
            raw: r,
          });
        }
      } catch (err) {
        console.error(`[jsearch] fetch failed for "${query}":`, err.message);
        break;
      }
    }
  }

  console.log(`[jsearch] fetched ${out.length} listings`);
  return out;
}
