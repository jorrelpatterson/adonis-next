// lib/news/pubmed.js
// PubMed E-utils client. Two-step: esearch (PMIDs) → esummary (metadata).
// Free public API, no auth required. Rate limit: 3 req/sec without API key.

const ESEARCH = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';
const ESUMMARY = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi';

export function buildEsearchUrl({ term, reldate, retmax }) {
  const params = new URLSearchParams({
    db: 'pubmed',
    term,
    reldate: String(reldate),
    retmax: String(retmax),
    retmode: 'json',
    sort: 'pub_date',
  });
  return `${ESEARCH}?${params.toString()}`;
}

export function buildEsummaryUrl(pmids) {
  const params = new URLSearchParams({
    db: 'pubmed',
    id: pmids.join(','),
    retmode: 'json',
  });
  return `${ESUMMARY}?${params.toString()}`;
}

// Builds the publication-year string from a PubMed pubdate like "2024 Jun".
function pubYear(pubdate) {
  if (!pubdate) return '';
  const m = String(pubdate).match(/\b(19|20)\d{2}\b/);
  return m ? m[0] : '';
}

// Builds the canonical "Author et al" citation prefix from the authors array.
// PubMed returns up to ~10 author objects: [{ name: 'Smith J', authtype: 'Author' }, ...]
export function citationAuthors(authors) {
  if (!Array.isArray(authors) || authors.length === 0) return '[Authors unavailable]';
  const real = authors.filter((a) => a && a.authtype !== 'CollectiveName' && a.name);
  if (real.length === 0) return '[Authors unavailable]';
  if (real.length === 1) return real[0].name;
  return `${real[0].name} et al`;
}

export function parseEsummary(json) {
  const result = json && json.result;
  if (!result || !Array.isArray(result.uids)) return [];
  const items = [];
  for (const uid of result.uids) {
    const r = result[uid];
    if (!r || !r.title) continue;
    const year = pubYear(r.pubdate);
    const authorsStr = citationAuthors(r.authors);
    const journal = r.source || '';
    // Pre-formatted citation goes into raw_content so the curator can drop it
    // straight onto slide 3 without a separate efetch call.
    const citation = [authorsStr, journal, year, `PMID ${uid}`].filter(Boolean).join(' · ');
    items.push({
      source_url: `https://pubmed.ncbi.nlm.nih.gov/${uid}/`,
      source_name: 'PubMed',
      tier: 'A',
      topic_tags: ['research', 'pubmed'],
      title: r.title.replace(/\.$/, ''),
      raw_content: `${citation}\n\nJournal: ${journal} · ${r.pubdate || ''}`,
      published_at: parsePubDate(r.pubdate),
    });
  }
  return items;
}

function parsePubDate(s) {
  if (!s) return null;
  // PubMed pubdate examples: "2024 Jun", "2024 Jun 15", "2024"
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export async function fetchPubmed(query) {
  const esUrl = buildEsearchUrl(query);
  const esRes = await fetch(esUrl);
  if (!esRes.ok) throw new Error(`pubmed esearch ${esRes.status}`);
  const esJson = await esRes.json();
  const pmids = (esJson.esearchresult && esJson.esearchresult.idlist) || [];
  if (pmids.length === 0) return [];
  // Throttle: PubMed allows 3 req/sec
  await new Promise((r) => setTimeout(r, 350));
  const sumUrl = buildEsummaryUrl(pmids);
  const sumRes = await fetch(sumUrl);
  if (!sumRes.ok) throw new Error(`pubmed esummary ${sumRes.status}`);
  const sumJson = await sumRes.json();
  return parseEsummary(sumJson);
}
