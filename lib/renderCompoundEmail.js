// Renders the compound-spotlight email template with field substitution.
// Reads the template file once at import time and caches.

import fs from 'fs';
import path from 'path';
import { signUnsubToken } from './unsubToken.js';

const TEMPLATE_PATH = path.join(process.cwd(), 'templates', 'email', 'compound-spotlight.html');
let TEMPLATE_CACHE = null;

function loadTemplate() {
  if (TEMPLATE_CACHE) return TEMPLATE_CACHE;
  TEMPLATE_CACHE = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  return TEMPLATE_CACHE;
}

const STOCK_STAMP_HTML = `
      <!-- STOCK STAMP -->
      <div style="background:#E07C24;padding:22px 28px;text-align:center;margin:36px 0 0">
        <div style="font:900 34px 'Barlow Condensed',sans-serif;color:#1A1C22;letter-spacing:5px;text-transform:uppercase;line-height:1">Now in stock</div>
      </div>`;

function escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// `draft` is a row from compound_email_drafts.
// `recipientEmail` is the address this render is for (drives the unsubscribe token).
// `baseUrl` is the origin to use for the unsubscribe link.
export function renderCompoundEmail(draft, recipientEmail, baseUrl) {
  const tpl = loadTemplate();
  const unsubUrl = `${baseUrl.replace(/\/$/, '')}/api/email-unsub?t=${encodeURIComponent(signUnsubToken(recipientEmail))}`;
  const fields = {
    HOOK: escapeHtml(draft.hook || ''),
    HOOK_PLAIN: (draft.hook || '').replace(/[<>&"]/g, ''),
    COMPOUND_NAME: escapeHtml(draft.compound_name || ''),
    COMPOUND_NAME_UPPER: escapeHtml((draft.compound_name || '').toUpperCase()),
    TAGLINE: escapeHtml(draft.tagline || ''),
    LAYMAN_LEAD: escapeHtml(draft.layman_lead || ''),
    LAYMAN_BRIDGE: escapeHtml(draft.layman_bridge || ''),
    BULLET_1: escapeHtml(draft.bullet_1 || ''),
    BULLET_2: escapeHtml(draft.bullet_2 || ''),
    BULLET_3: escapeHtml(draft.bullet_3 || ''),
    CITATIONS_SHORT: escapeHtml(draft.citations_short || ''),
    CATEGORY_LABEL: escapeHtml(draft.category_label || ''),
    DISPATCH_NO: String(draft.dispatch_no || ''),
    PRODUCT_URL: escapeHtml(draft.product_url || ''),
    STOCK_STAMP_BLOCK: draft.show_stock_stamp ? STOCK_STAMP_HTML : '',
    UNSUBSCRIBE_URL: escapeHtml(unsubUrl),
  };
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, key) => (key in fields ? fields[key] : ''));
}
