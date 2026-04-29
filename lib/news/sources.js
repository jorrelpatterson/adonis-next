// lib/news/sources.js
// Roster of news sources. Data only — easy to amend without touching logic.

export const RSS_SOURCES = [
  // ---- Tier A: Research ----
  { name: 'Nature Peptides', tier: 'A', kind: 'rss',
    url: 'https://www.nature.com/subjects/peptides.rss',
    topic_tags: ['research'] },
  { name: 'Journal of Peptide Science', tier: 'A', kind: 'rss',
    url: 'https://onlinelibrary.wiley.com/feed/10991387/most-recent',
    topic_tags: ['research'] },

  // ---- Tier A: Regulatory ----
  { name: 'FDA Press Releases', tier: 'A', kind: 'rss',
    url: 'https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/press-releases/rss.xml',
    topic_tags: ['regulatory'] },
  { name: 'FDA Drug Safety', tier: 'A', kind: 'rss',
    url: 'https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/drug-safety-podcasts/rss.xml',
    topic_tags: ['regulatory','safety'] },
  { name: 'DEA News', tier: 'A', kind: 'rss',
    url: 'https://www.dea.gov/rss/news-releases.xml',
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
