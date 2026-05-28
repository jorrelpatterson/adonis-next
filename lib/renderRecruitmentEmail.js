// Renders one of the 5 recruitment templates with field substitution.
// Touch 3 also looks up compound product URLs at render time.

import fs from 'fs';
import path from 'path';
import { signUnsubToken } from './unsubToken.js';

const TEMPLATE_PATHS = {
  1: path.join(process.cwd(), 'templates', 'email', 'recruitment-1-pitch.html'),
  2: path.join(process.cwd(), 'templates', 'email', 'recruitment-2-playbook.html'),
  3: path.join(process.cwd(), 'templates', 'email', 'recruitment-3-compounds.html'),
  4: path.join(process.cwd(), 'templates', 'email', 'recruitment-4-scarcity.html'),
  5: path.join(process.cwd(), 'templates', 'email', 'recruitment-5-goodbye.html'),
};

const SUBJECTS = {
  1: '$100k, no new doors.',
  2: "Here's exactly what week 1 looks like.",
  3: 'The 4 peptides your network is already asking about.',
  4: 'First wave is filling.',
  5: "We'll stop bugging you.",
};

const WHOLESALE_URL = 'https://www.advncelabs.com/advnce-wholesale.html';
const CATALOG_URL = 'https://www.advncelabs.com/advnce-catalog.html';

const TPL_CACHE = {};
function loadTemplate(touch) {
  if (TPL_CACHE[touch]) return TPL_CACHE[touch];
  TPL_CACHE[touch] = fs.readFileSync(TEMPLATE_PATHS[touch], 'utf8');
  return TPL_CACHE[touch];
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

async function fetchCompoundUrls() {
  const slugs = ['retatrutide', 'bpc-157', 'klow', 'semax'];
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/compound_marketing?compound_slug=in.(${slugs.join(',')})&select=compound_slug,product_url`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }, cache: 'no-store' },
  );
  if (!r.ok) return {};
  const rows = await r.json();
  const map = {};
  for (const row of rows) map[row.compound_slug] = row.product_url || CATALOG_URL;
  return map;
}

// `recipient` is a row from ambassador_recruitment_recipients.
// `touch` is 1..5. `baseUrl` is the origin used for apply + unsubscribe links.
export async function renderRecruitmentEmail(touch, recipient, baseUrl) {
  const tpl = loadTemplate(touch);
  const unsubUrl = `${baseUrl.replace(/\/$/, '')}/api/email-unsub?t=${encodeURIComponent(signUnsubToken(recipient.email))}`;
  const applyUrl = `${baseUrl.replace(/\/$/, '')}/api/recruitment-click?r=${recipient.id}&t=${touch}&dest=apply`;

  const fields = {
    FIRST_NAME: escapeHtml(recipient.first_name || recipient.name?.split(' ')[0] || 'there'),
    COMPANY: escapeHtml(recipient.company || ''),
    STATE: escapeHtml(recipient.state || ''),
    APPLY_URL: applyUrl,
    UNSUBSCRIBE_URL: unsubUrl,
    WHOLESALE_URL: `${baseUrl.replace(/\/$/, '')}/api/recruitment-click?r=${recipient.id}&t=${touch}&dest=wholesale`,
  };

  if (touch === 3) {
    const urls = await fetchCompoundUrls();
    fields.URL_RETATRUTIDE = urls['retatrutide'] || CATALOG_URL;
    fields.URL_BPC_157 = urls['bpc-157'] || CATALOG_URL;
    fields.URL_KLOW = urls['klow'] || CATALOG_URL;
    fields.URL_SEMAX = urls['semax'] || CATALOG_URL;
  }

  const html = tpl.replace(/\{\{(\w+)\}\}/g, (_, key) => (key in fields ? fields[key] : ''));
  return { html, subject: SUBJECTS[touch] };
}
