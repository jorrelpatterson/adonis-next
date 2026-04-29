// lib/news/sources.js
// Roster of news sources. Data only — easy to amend without touching logic.

export const RSS_SOURCES = [
  // ---- Tier A: Research ----
  // Nature's subject feeds are cookie-walled; Google News site-query is the
  // working substitute for Nature peptide coverage.
  { name: 'Nature Peptides', tier: 'A', kind: 'rss',
    url: 'https://news.google.com/rss/search?q=site:nature.com+peptide&hl=en-US&gl=US&ceid=US:en',
    topic_tags: ['research'] },
  { name: 'Journal of Peptide Science', tier: 'A', kind: 'rss',
    url: 'https://onlinelibrary.wiley.com/feed/10991387/most-recent',
    topic_tags: ['research'] },

  // ---- Tier A: Regulatory ----
  { name: 'FDA Press Releases', tier: 'A', kind: 'rss',
    url: 'https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/press-releases/rss.xml',
    topic_tags: ['regulatory'] },
  // FDA's dedicated Drug Safety Communications feed no longer exists; the
  // Recalls/Safety Alerts feed is the closest official equivalent.
  { name: 'FDA Recalls + Safety Alerts', tier: 'A', kind: 'rss',
    url: 'https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/recalls/rss.xml',
    topic_tags: ['regulatory','safety'] },
  // DEA blocks all non-browser UAs site-wide; Google News is the fallback.
  { name: 'DEA News (via Google News)', tier: 'A', kind: 'rss',
    url: 'https://news.google.com/rss/search?q=DEA+peptide+OR+DEA+scheduling&hl=en-US&gl=US&ceid=US:en',
    topic_tags: ['regulatory','scheduling'] },

  // ---- Tier B: Industry ----
  { name: 'Endpoints News', tier: 'B', kind: 'rss',
    url: 'https://endpts.com/feed/',
    topic_tags: ['industry'] },
  { name: 'FierceBiotech', tier: 'B', kind: 'rss',
    url: 'https://www.fiercebiotech.com/rss/xml',
    topic_tags: ['industry'] },
  { name: 'STAT News', tier: 'B', kind: 'rss',
    url: 'https://www.statnews.com/feed/',
    topic_tags: ['industry'] },

  // ---- Tier C: Mainstream pulse ----
  { name: 'Google News — peptide therapy', tier: 'C', kind: 'rss',
    url: 'https://news.google.com/rss/search?q=peptide+therapy&hl=en-US&gl=US&ceid=US:en',
    topic_tags: ['pulse'] },
  { name: 'Google News — GLP-1', tier: 'C', kind: 'rss',
    url: 'https://news.google.com/rss/search?q=GLP-1&hl=en-US&gl=US&ceid=US:en',
    topic_tags: ['pulse'] },
];

// PubMed E-utils config — Tier A research, queried separately via API.
export const PUBMED_QUERY = {
  name: 'PubMed',
  tier: 'A',
  // E-utils term: peptide-relevant compounds OR peptide-research keywords
  term: '(peptide therapy[Title/Abstract]) OR (BPC-157) OR (semaglutide) OR (tirzepatide) OR (retatrutide) OR (cagrilintide) OR (thymosin) OR (ipamorelin) OR (CJC-1295) OR (sermorelin) OR (GHK-Cu) OR (melanotan) OR (epitalon)',
  reldate: 7, // past 7 days
  retmax: 50,
  topic_tags: ['research','pubmed'],
};

// Compound keywords that trigger needs_legal_review on draft creation.
// Sourced from the EVE_AAS_catalog_hidden memory: Schedule III anabolics + HRT + lipo blends.
export const FLAGGED_COMPOUNDS = [
  'testosterone','trenbolone','oxandrolone','anavar','nandrolone','deca',
  'methandrostenolone','dianabol','oxymetholone','anadrol','drostanolone',
  'masteron','boldenone','equipoise','methenolone','primobolan','stanozolol',
  'winstrol','anastrozole','exemestane','clomiphene','clomid','tamoxifen',
  'mesterolone','proviron','mgf','mechano growth factor',
  'igf-1 lr3','lipo blend','lipotropic',
];
