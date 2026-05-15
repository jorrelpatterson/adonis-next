// lib/career/sources/adzuna.js
//
// Aggregator. Pulls broad operator-track queries from Adzuna's catch-all index.
// Docs: https://developer.adzuna.com/
// Free tier: 1,000 calls/month.

import searchParams from '../../../config/career-search-params.json' with { type: 'json' };

/**
 * @returns {Promise<import('../types.js').RawJob[]>}
 */
export async function fetchAdzuna() {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) {
    console.warn('[adzuna] skipped — ADZUNA_APP_ID / ADZUNA_APP_KEY not set');
    return [];
  }

  const cfg = searchParams.adzuna;
  const out = [];

  for (const query of cfg.queries) {
    for (let page = 1; page <= cfg.max_pages; page++) {
      const url = new URL(`https://api.adzuna.com/v1/api/jobs/${cfg.country}/search/${page}`);
      url.searchParams.set('app_id', appId);
      url.searchParams.set('app_key', appKey);
      url.searchParams.set('results_per_page', String(cfg.results_per_page));
      url.searchParams.set('what', query);
      url.searchParams.set('salary_min', String(cfg.salary_min));
      url.searchParams.set('max_days_old', String(cfg.max_days_old));
      url.searchParams.set('content-type', 'application/json');

      try {
        const res = await fetch(url.toString());
        if (!res.ok) {
          console.warn(`[adzuna] ${res.status} for "${query}" page ${page}`);
          break;
        }
        const data = await res.json();
        if (!data.results?.length) break;

        for (const r of data.results) {
          out.push({
            source: 'adzuna',
            source_id: r.id,
            url: r.redirect_url,
            title: r.title?.trim(),
            company: r.company?.display_name?.trim() ?? 'Unknown',
            location: r.location?.display_name ?? null,
            remote: /remote/i.test(r.location?.display_name ?? '') || /remote/i.test(r.title ?? ''),
            salary_min: r.salary_min ?? null,
            salary_max: r.salary_max ?? null,
            salary_currency: 'USD',
            description: r.description ?? null,
            posted_at: r.created ?? null,
            raw: r,
          });
        }
      } catch (err) {
        console.error(`[adzuna] fetch failed for "${query}":`, err.message);
        break;
      }
    }
  }

  console.log(`[adzuna] fetched ${out.length} listings`);
  return out;
}
