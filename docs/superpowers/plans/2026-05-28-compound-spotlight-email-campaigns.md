# Compound Spotlight Email Campaigns — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a branded, editorial compound-spotlight email campaign system for advncelabs.com that auto-drafts on restock and supports manual one-off sends, with a `/admin/marketing/email-campaigns` queue mirroring the existing news system.

**Architecture:** Three new Supabase tables (`compound_email_drafts`, `compound_email_recipients`, `compound_email_unsubscribes`) + one new column on `subscribers` + a `compound_marketing` table that mirrors `docs/marketing/peptide-for-that-campaign.md`. A `lib/onStockRise.js` helper is called from `purchase-receive` and `inventory-adjust` to insert drafts when stock crosses 0 → positive. Admin reviews/edits/sends from a queue; the chunked send route loops Resend `/emails` per recipient with HMAC-signed unsubscribe tokens.

**Tech Stack:** Next.js 14 App Router, Supabase (PostgREST via service key), Resend, vanilla Node `crypto` for HMAC unsub tokens (no new deps), JavaScript/JSX (no TypeScript per CLAUDE.md). No test framework exists — verification is via curl commands and one comprehensive smoke script (`scripts/smoke-compound-email.js`) following the existing `smoke-ambassador-flow.js` pattern.

**Spec:** `docs/superpowers/specs/2026-05-28-compound-spotlight-email-campaigns-design.md`

---

## File map

**Create (new):**

```
sql/2026-05-28-compound-email-campaigns.sql                           — schema migration
scripts/sync-compound-marketing.js                                    — one-shot .md → Supabase sync
scripts/smoke-compound-email.js                                       — end-to-end smoke test
templates/email/compound-spotlight.html                               — parameterized email HTML
lib/unsubToken.js                                                     — HMAC sign/verify
lib/renderCompoundEmail.js                                            — template renderer
lib/buildRecipientList.js                                             — subscribers ∪ ambassadors ∪ customers, deduped
lib/onStockRise.js                                                    — restock trigger
app/api/email-unsub/route.js                                          — public unsubscribe endpoint
app/api/compound-email-draft-list/route.js                            — GET draft queue
app/api/compound-email-draft-write/route.js                           — POST create/update/delete
app/api/compound-email-preview/route.js                               — GET rendered HTML
app/api/compound-email-send/route.js                                  — POST chunked send
app/api/compound-email-resume/route.js                                — POST resume failed
app/admin/marketing/email-campaigns/page.jsx                          — server component, queue
app/admin/marketing/email-campaigns/DraftCard.jsx                     — client component
app/admin/marketing/email-campaigns/NewDraftButton.jsx                — client component
app/admin/marketing/email-campaigns/SendButton.jsx                    — client component (chunk orchestrator)
```

**Modify:**

```
app/api/purchase-receive/route.js          — call onStockRise after stock update
app/api/inventory-adjust/route.js          — call onStockRise after stock update
app/admin/marketing/page.jsx               — add tile linking to email-campaigns
```

---

## Pre-flight

- [ ] **Step 0.1: Verify env file exists and has the keys needed**

```bash
cat /tmp/advnce.env | grep -E '^(SUPABASE_URL|SUPABASE_SERVICE_KEY|RESEND_API_KEY)='
```

Expected: three lines. If missing, ask the user before continuing.

- [ ] **Step 0.2: Add `EMAIL_UNSUB_SECRET` to local env**

```bash
node -e "console.log('EMAIL_UNSUB_SECRET=' + require('crypto').randomBytes(32).toString('hex'))" >> /tmp/advnce.env
```

Tell the user to also add this same value to Vercel (Preview + Production) via the Vercel dashboard or `vercel env add EMAIL_UNSUB_SECRET production`. Use the value just appended to `/tmp/advnce.env`.

---

## Task 1 · Database migration

**Files:**
- Create: `sql/2026-05-28-compound-email-campaigns.sql`

- [ ] **Step 1.1: Write the migration**

Create `sql/2026-05-28-compound-email-campaigns.sql`:

```sql
-- Compound spotlight email campaigns: drafts, per-recipient sends, suppression list,
-- and a mirror of the peptide-for-that hook library.
-- Spec: docs/superpowers/specs/2026-05-28-compound-spotlight-email-campaigns-design.md

-- 1) compound_marketing — mirror of docs/marketing/peptide-for-that-campaign.md.
create table if not exists compound_marketing (
  compound_slug    text primary key,
  compound_name    text not null,
  sku              text,
  category         text,
  subcategory      text,
  hook             text,
  research_angle   text,
  citation_primary text,
  mod_risk         text,
  ig_blocked       boolean not null default false,
  product_url      text,
  updated_at       timestamptz not null default now()
);
create index if not exists compound_marketing_sku_idx on compound_marketing(sku);

-- 2) compound_email_drafts — one row per planned send.
create table if not exists compound_email_drafts (
  id                     uuid primary key default gen_random_uuid(),
  dispatch_no            int unique,
  compound_slug          text not null,
  compound_name          text not null,
  product_url            text not null,
  category_label         text,
  hook                   text,
  tagline                text,
  layman_lead            text,
  layman_bridge          text,
  bullet_1               text,
  bullet_2               text,
  bullet_3               text,
  citations_short        text,
  show_stock_stamp       boolean not null default true,
  trigger                text not null check (trigger in ('restock','manual')),
  status                 text not null default 'draft'
                                check (status in ('draft','ready','sending','sent','failed')),
  created_at             timestamptz not null default now(),
  scheduled_at           timestamptz,
  sent_at                timestamptz,
  recipient_count        int not null default 0,
  recipient_count_sent   int not null default 0,
  recipient_count_failed int not null default 0,
  created_by             text,
  notes                  text
);
create index if not exists compound_email_drafts_status_idx on compound_email_drafts(status);
create index if not exists compound_email_drafts_created_at_idx on compound_email_drafts(created_at desc);

-- Sequence-style dispatch_no helper: monotonic across all drafts.
create or replace function next_dispatch_no() returns int as $$
  select coalesce(max(dispatch_no), 0) + 1 from compound_email_drafts;
$$ language sql;

-- 3) compound_email_recipients — one row per recipient per send.
create table if not exists compound_email_recipients (
  id         uuid primary key default gen_random_uuid(),
  draft_id   uuid not null references compound_email_drafts(id) on delete cascade,
  email      text not null,
  name       text,
  source     text not null check (source in ('subscriber','customer','ambassador')),
  sent_at    timestamptz,
  resend_id  text,
  status     text not null default 'pending'
                    check (status in ('pending','sent','failed','skipped')),
  error      text
);
create index if not exists compound_email_recipients_draft_status_idx
  on compound_email_recipients(draft_id, status);
create index if not exists compound_email_recipients_email_idx on compound_email_recipients(email);

-- 4) compound_email_unsubscribes — email-only suppression for non-subscribers.
create table if not exists compound_email_unsubscribes (
  id              uuid primary key default gen_random_uuid(),
  email           text not null unique,
  unsubscribed_at timestamptz not null default now(),
  source_draft_id uuid references compound_email_drafts(id) on delete set null
);

-- 5) subscribers gets a new column. Welcome emails still send unconditionally;
--    only compound-spotlight sends respect this column.
alter table subscribers
  add column if not exists compound_email_unsubscribed_at timestamptz;

-- RLS off on all four new tables; access goes through service-role API routes.
alter table compound_marketing            enable row level security;
alter table compound_email_drafts         enable row level security;
alter table compound_email_recipients     enable row level security;
alter table compound_email_unsubscribes   enable row level security;
```

- [ ] **Step 1.2: Apply the migration**

Apply via Supabase SQL editor (Adonis convention — `sql/` files are run by hand in the Supabase dashboard). Paste the file contents into the SQL editor and click Run.

- [ ] **Step 1.3: Verify the tables exist**

```bash
source /tmp/advnce.env
curl -sS "$SUPABASE_URL/rest/v1/compound_email_drafts?limit=0" \
  -H "apikey: $SUPABASE_SERVICE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" -w '\nHTTP %{http_code}\n'
```

Expected: HTTP 200, empty body `[]`. Repeat for `compound_email_recipients`, `compound_email_unsubscribes`, `compound_marketing`.

- [ ] **Step 1.4: Verify subscribers column added**

```bash
curl -sS "$SUPABASE_URL/rest/v1/subscribers?select=id,compound_email_unsubscribed_at&limit=1" \
  -H "apikey: $SUPABASE_SERVICE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_KEY"
```

Expected: HTTP 200, row contains `compound_email_unsubscribed_at: null`.

- [ ] **Step 1.5: Commit**

```bash
git add sql/2026-05-28-compound-email-campaigns.sql
git commit -m "compound-email: schema for drafts, recipients, suppression, marketing mirror"
```

---

## Task 2 · Sync `peptide-for-that` → `compound_marketing`

**Files:**
- Create: `scripts/sync-compound-marketing.js`

- [ ] **Step 2.1: Write the sync script**

Create `scripts/sync-compound-marketing.js`:

```javascript
#!/usr/bin/env node
// Mirror docs/marketing/peptide-for-that-campaign.md into the compound_marketing
// Supabase table. Idempotent — re-runnable. The .md remains the human-editable
// source of truth.
//
// Run: node scripts/sync-compound-marketing.js

const fs = require('fs');
const path = require('path');

if (fs.existsSync('/tmp/advnce.env')) {
  for (const line of fs.readFileSync('/tmp/advnce.env', 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.+)$/);
    if (m) process.env[m[1]] = m[2];
  }
}

const URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) { console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY'); process.exit(1); }

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' };

const md = fs.readFileSync(path.join(__dirname, '..', 'docs', 'marketing', 'peptide-for-that-campaign.md'), 'utf8');

// Parse category sections like "### Cognitive" and table rows beneath.
const rows = [];
const lines = md.split('\n');
let currentCategory = null;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const catMatch = line.match(/^### (.+?)(?: — IG-blocked.*)?$/);
  if (catMatch && !line.startsWith('### Compounds') && !line.startsWith('### Hook')) {
    currentCategory = catMatch[1].trim();
    continue;
  }
  // Table row: | Hook | Compound | Research angle | Citation | Mod risk |
  if (!currentCategory) continue;
  if (!line.startsWith('|') || line.startsWith('|---') || line.match(/\|\s*Hook\s*\|/)) continue;

  const cells = line.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
  if (cells.length < 2) continue;

  const hook = cells[0];
  const compoundName = cells[1];
  const researchAngle = cells[2] || '';
  const citationPrimary = cells[3] || '';
  const modRisk = cells[4] || '';

  if (!compoundName || compoundName === 'Compound') continue;

  // The weight-loss section uses a different table shape: | Hook | Compound | Channel |
  const isWeightLoss = currentCategory === 'Weight Loss';
  const igBlocked = isWeightLoss;

  // Slug: lowercase compound name, replace non-alphanumeric with -, collapse, trim.
  const slug = compoundName.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  rows.push({
    compound_slug: slug,
    compound_name: compoundName,
    sku: null,                              // populated manually later — no SKU info in the .md
    category: currentCategory,
    subcategory: null,                      // optional refinement
    hook,
    research_angle: researchAngle,
    citation_primary: citationPrimary,
    mod_risk: modRisk || null,
    ig_blocked: igBlocked,
    product_url: null,                      // populated manually later
    updated_at: new Date().toISOString(),
  });
}

console.log(`Parsed ${rows.length} compound rows from peptide-for-that-campaign.md`);

(async () => {
  // Upsert in batches of 50.
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50);
    const res = await fetch(`${URL}/rest/v1/compound_marketing?on_conflict=compound_slug`, {
      method: 'POST', headers, body: JSON.stringify(batch),
    });
    if (!res.ok) {
      console.error('Upsert failed:', res.status, await res.text());
      process.exit(1);
    }
    console.log(`  upserted ${i + batch.length}/${rows.length}`);
  }
  console.log('Done.');
})();
```

- [ ] **Step 2.2: Run the sync**

```bash
node scripts/sync-compound-marketing.js
```

Expected: prints `Parsed N compound rows…` (N around 50), then `upserted N/N`, then `Done.`

- [ ] **Step 2.3: Spot-check a row**

```bash
source /tmp/advnce.env
curl -sS "$SUPABASE_URL/rest/v1/compound_marketing?compound_slug=eq.oxytocin&select=*" \
  -H "apikey: $SUPABASE_SERVICE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_KEY"
```

Expected: one row, `hook` is `"Lost the connection?"`, `category` is `"Sexual Health"`, `citation_primary` includes `Carter 2014`.

- [ ] **Step 2.4: Populate SKU + product_url for the ~5 most-likely-to-restock compounds**

Manually populate via SQL editor (admin can do the rest as needed):

```sql
update compound_marketing set sku = 'OX10', product_url = 'https://www.advncelabs.com/advnce-product.html?sku=OX10' where compound_slug = 'oxytocin';
update compound_marketing set sku = 'BP10', product_url = 'https://www.advncelabs.com/advnce-product.html?sku=BP10' where compound_slug = 'bpc-157';
update compound_marketing set sku = 'TZ10', product_url = 'https://www.advncelabs.com/advnce-product.html?sku=TZ10' where compound_slug = 'tirzepatide';
update compound_marketing set sku = 'NA500', product_url = 'https://www.advncelabs.com/advnce-product.html?sku=NA500' where compound_slug = 'nad-';
update compound_marketing set sku = 'TB10', product_url = 'https://www.advncelabs.com/advnce-product.html?sku=tb-500' where compound_slug = 'tb-500';
```

If the SKU values above are wrong, ask the user — these are guessed from the existing welcome emails and may not match the live products table.

- [ ] **Step 2.5: Commit**

```bash
git add scripts/sync-compound-marketing.js
git commit -m "compound-email: sync script mirroring peptide-for-that.md into compound_marketing"
```

---

## Task 3 · Unsubscribe HMAC token helper

**Files:**
- Create: `lib/unsubToken.js`

- [ ] **Step 3.1: Write the helper**

Create `lib/unsubToken.js`:

```javascript
// HMAC-signed unsubscribe tokens. No expiry — unsubscribe is permanent.
// Token format: <emailB64Url>.<sigHex>
//
// Uses Node's crypto so no new dependency is added.

import crypto from 'crypto';

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlDecode(str) {
  return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

function secret() {
  const s = process.env.EMAIL_UNSUB_SECRET;
  if (!s || s.length < 32) throw new Error('EMAIL_UNSUB_SECRET missing or too short (need 32+ chars)');
  return s;
}

export function signUnsubToken(email) {
  const normalized = String(email).trim().toLowerCase();
  const payload = b64url(normalized);
  const sig = crypto.createHmac('sha256', secret()).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

export function verifyUnsubToken(token) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expectedSig = crypto.createHmac('sha256', secret()).update(payload).digest('hex');
  // Constant-time compare.
  const a = Buffer.from(sig, 'hex');
  const b = Buffer.from(expectedSig, 'hex');
  if (a.length !== b.length) return null;
  if (!crypto.timingSafeEqual(a, b)) return null;
  try { return b64urlDecode(payload); } catch { return null; }
}
```

- [ ] **Step 3.2: Smoke test the helper**

```bash
source /tmp/advnce.env
node -e "
process.env.EMAIL_UNSUB_SECRET = process.env.EMAIL_UNSUB_SECRET;
import('./lib/unsubToken.js').then(({ signUnsubToken, verifyUnsubToken }) => {
  const t = signUnsubToken('Test@Example.com');
  console.log('token:', t);
  const back = verifyUnsubToken(t);
  console.log('verified:', back);
  console.log('tampered:', verifyUnsubToken(t.slice(0, -2) + 'ff'));
});
"
```

Expected: `token:` something with a `.` in the middle, `verified: test@example.com`, `tampered: null`.

- [ ] **Step 3.3: Commit**

```bash
git add lib/unsubToken.js
git commit -m "compound-email: HMAC sign/verify for unsubscribe tokens"
```

---

## Task 4 · Unsubscribe public route

**Files:**
- Create: `app/api/email-unsub/route.js`

- [ ] **Step 4.1: Write the route**

Create `app/api/email-unsub/route.js`:

```javascript
import { NextResponse } from 'next/server';
import { verifyUnsubToken } from '../../../lib/unsubToken';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

function renderPage(message, sub) {
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Unsubscribed · advnce labs</title><link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;700;900&family=Cormorant+Garamond:ital,wght@0,300;1,300&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet"></head><body style="margin:0;padding:0;background:#F4F2EE;color:#1A1C22;font-family:Arial,Helvetica,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center"><div style="max-width:520px;padding:48px 32px;text-align:center"><div style="font:400 10px 'JetBrains Mono',monospace;color:#7A7D88;letter-spacing:4px;text-transform:uppercase;margin-bottom:16px">advnce labs &middot; preferences</div><h1 style="font:300 italic 42px 'Cormorant Garamond',serif;color:#1A1C22;margin:0 0 16px;line-height:1.15">${message}</h1><p style="font:400 14px Arial,sans-serif;color:#1A1C22;line-height:1.7;margin:0 0 8px">${sub}</p><p style="font:400 12px 'JetBrains Mono',monospace;color:#7A7D88;letter-spacing:2px;text-transform:uppercase;margin:36px 0 0">advncelabs.com</p></div></body></html>`;
  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

export async function GET(request) {
  const token = new URL(request.url).searchParams.get('t');
  const email = verifyUnsubToken(token || '');
  if (!email) return renderPage('Invalid link.', 'This unsubscribe link is not valid or has been tampered with.');

  const headers = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' };

  // Try subscribers first.
  const subRes = await fetch(`${SUPABASE_URL}/rest/v1/subscribers?email=ilike.${encodeURIComponent(email)}&select=id`, { headers, cache: 'no-store' });
  const subRows = subRes.ok ? await subRes.json() : [];

  if (subRows.length) {
    await fetch(`${SUPABASE_URL}/rest/v1/subscribers?email=ilike.${encodeURIComponent(email)}`, {
      method: 'PATCH', headers,
      body: JSON.stringify({ compound_email_unsubscribed_at: new Date().toISOString() }),
    });
  } else {
    await fetch(`${SUPABASE_URL}/rest/v1/compound_email_unsubscribes?on_conflict=email`, {
      method: 'POST', headers: { ...headers, Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({ email, unsubscribed_at: new Date().toISOString() }),
    });
  }

  return renderPage("You're unsubscribed.", 'Compound spotlight emails are off for this address. Transactional emails (order confirmations, ambassador comms) are unaffected.');
}
```

- [ ] **Step 4.2: Manual verify**

Start dev server in another terminal: `npm run dev`. Then:

```bash
source /tmp/advnce.env
TOKEN=$(node -e "
import('./lib/unsubToken.js').then(({ signUnsubToken }) => {
  console.log(signUnsubToken('unsubtest@example.com'));
});" | tail -1)
curl -sS "http://localhost:3000/api/email-unsub?t=$TOKEN" | head -20
```

Expected: HTML with `You're unsubscribed.` headline. Then check Supabase:

```bash
curl -sS "$SUPABASE_URL/rest/v1/compound_email_unsubscribes?email=eq.unsubtest@example.com" \
  -H "apikey: $SUPABASE_SERVICE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_KEY"
```

Expected: one row with `email: "unsubtest@example.com"`.

- [ ] **Step 4.3: Tampered token returns invalid page**

```bash
curl -sS "http://localhost:3000/api/email-unsub?t=garbage.0000" | head -5
```

Expected: HTML with `Invalid link.` headline.

- [ ] **Step 4.4: Commit**

```bash
git add app/api/email-unsub lib/unsubToken.js
git commit -m "compound-email: public unsubscribe endpoint with HMAC-signed tokens"
```

---

## Task 5 · Email template file

**Files:**
- Create: `templates/email/compound-spotlight.html`

- [ ] **Step 5.1: Write the template**

Create `templates/email/compound-spotlight.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;700;900&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
  <title>{{HOOK_PLAIN}}</title>
</head>
<body style="margin:0;padding:0;background:#E8E6E2;font-family:Arial,Helvetica,sans-serif;color:#1A1C22">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px">
    <div style="background:#F4F2EE;border-radius:6px;overflow:hidden">

      <!-- HEADER -->
      <div style="padding:18px 28px;border-bottom:1px solid #E4E7EC;display:flex;align-items:center;justify-content:space-between;gap:12px">
        <div style="display:flex;align-items:center;gap:10px">
          <svg viewBox="0 0 48 28" width="32" height="19" fill="none"><path d="M2 24L8 19L14 22L20 14L26 17L32 9L38 12L46 3" stroke="#00A0A8" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/><circle cx="32" cy="9" r="2" fill="#00A0A8"/><circle cx="38" cy="12" r="2" fill="#E07C24"/><circle cx="46" cy="3" r="2.5" fill="#E07C24"/></svg>
          <span style="font:700 14px 'Barlow Condensed',sans-serif;letter-spacing:3px;text-transform:lowercase">advnce <span style="color:#7A7D88;font-weight:300">labs</span></span>
        </div>
        <div style="font:400 10px 'JetBrains Mono',monospace;color:#00A0A8;letter-spacing:3px;text-transform:uppercase;text-align:right;line-height:1.5">DISPATCH NO. {{DISPATCH_NO}}<br>{{CATEGORY_LABEL}}</div>
      </div>

      <!-- BODY TOP -->
      <div style="padding:44px 36px 0">

        <!-- HOOK -->
        <div style="font:300 italic 36px 'Cormorant Garamond',serif;color:#1A1C22;line-height:1.2;margin:0 0 28px">&ldquo;{{HOOK}}&rdquo;</div>

        <!-- CAMPAIGN PAYOFF -->
        <div style="font:900 26px 'Barlow Condensed',sans-serif;color:#00A0A8;letter-spacing:4px;text-transform:uppercase;line-height:1.1;margin:0 0 40px;padding-bottom:28px;border-bottom:1px solid #E4E7EC">There's a peptide<br>for that.</div>

        <!-- COMPOUND REVEAL -->
        <div style="font:900 84px 'Barlow Condensed',sans-serif;color:#1A1C22;line-height:0.88;letter-spacing:-2px;text-transform:uppercase;margin:0 0 14px">{{COMPOUND_NAME_UPPER}}</div>
        <div style="font:300 italic 24px 'Cormorant Garamond',serif;color:#00A0A8;line-height:1.2;margin:0 0 32px">{{TAGLINE}}</div>

        <!-- LAYMAN LEAD -->
        <p style="font:400 15px Arial,sans-serif;color:#1A1C22;line-height:1.75;margin:0 0 12px">{{LAYMAN_LEAD}}</p>
        <p style="font:400 15px Arial,sans-serif;color:#1A1C22;line-height:1.75;margin:0 0 0">{{LAYMAN_BRIDGE}}</p>

        <div style="height:1px;background:#E4E7EC;margin:32px 0"></div>

        <!-- BULLETS -->
        <div style="font:700 10px 'Barlow Condensed',sans-serif;color:#00A0A8;letter-spacing:4px;text-transform:uppercase;margin:0 0 14px">What the research investigates</div>
        <div style="display:flex;gap:12px;margin-bottom:12px"><span style="color:#00A0A8;flex-shrink:0">&rarr;</span><span style="font:400 14px Arial,sans-serif;line-height:1.6">{{BULLET_1}}</span></div>
        <div style="display:flex;gap:12px;margin-bottom:12px"><span style="color:#00A0A8;flex-shrink:0">&rarr;</span><span style="font:400 14px Arial,sans-serif;line-height:1.6">{{BULLET_2}}</span></div>
        <div style="display:flex;gap:12px;margin-bottom:0"><span style="color:#00A0A8;flex-shrink:0">&rarr;</span><span style="font:400 14px Arial,sans-serif;line-height:1.6">{{BULLET_3}}</span></div>

      </div>

      {{STOCK_STAMP_BLOCK}}

      <!-- CTA -->
      <div style="padding:36px 36px 0;text-align:center">
        <a href="{{PRODUCT_URL}}" style="display:inline-block;background:#00A0A8;color:#F4F2EE;font:700 12px 'Barlow Condensed',sans-serif;letter-spacing:3px;text-transform:uppercase;text-decoration:none;padding:14px 28px;border-radius:3px">Order {{COMPOUND_NAME}} &rarr;</a>
      </div>

      <!-- CITATIONS + RUO -->
      <div style="padding:0 36px 40px">
        <p style="font:400 10px 'JetBrains Mono',monospace;color:#7A7D88;letter-spacing:2px;line-height:1.8;margin:36px 0 0;text-transform:uppercase;text-align:center">CITATIONS &middot; {{CITATIONS_SHORT}} &middot; RUO<br><span style="text-transform:none;letter-spacing:0.5px;font-family:Arial,sans-serif;font-size:10px">What you do with the research is up to you and your clinician.</span></p>
      </div>

      <!-- FOOTER -->
      <div style="background:#1A1C22;padding:18px 28px;text-align:center;font:400 8px 'JetBrains Mono',monospace;color:rgba(244,242,238,0.45);letter-spacing:1.5px;text-transform:uppercase;line-height:1.8">
        advncelabs.com &middot; orders@advncelabs.com<br>
        Research-grade compounds for in-vitro laboratory use only. Not for human consumption. Not evaluated by the FDA.<br>
        <a href="{{UNSUBSCRIBE_URL}}" style="color:rgba(244,242,238,0.55);text-decoration:underline">Unsubscribe from compound dispatches</a>
      </div>

    </div>
  </div>
</body>
</html>
```

- [ ] **Step 5.2: Commit**

```bash
git add templates/email/compound-spotlight.html
git commit -m "compound-email: parameterized HTML template (v5 layout locked)"
```

---

## Task 6 · Template renderer

**Files:**
- Create: `lib/renderCompoundEmail.js`

- [ ] **Step 6.1: Write the renderer**

Create `lib/renderCompoundEmail.js`:

```javascript
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
```

- [ ] **Step 6.2: Smoke test the renderer**

```bash
source /tmp/advnce.env
node -e "
import('./lib/renderCompoundEmail.js').then(({ renderCompoundEmail }) => {
  const html = renderCompoundEmail({
    hook: 'Lost the connection?', compound_name: 'Oxytocin',
    compound_name_upper: 'OXYTOCIN', tagline: 'The bonding nonapeptide.',
    layman_lead: 'In plain terms: oxytocin is the peptide your brain releases during physical touch.',
    layman_bridge: 'Researchers have been studying it for decades.',
    bullet_1: 'A nine-amino-acid peptide.', bullet_2: 'Pair-bonding research.',
    bullet_3: 'Anxiolytic markers.', citations_short: 'CARTER 2014',
    category_label: 'SOCIAL · BONDING', dispatch_no: 4,
    product_url: 'https://advncelabs.com/x', show_stock_stamp: true,
  }, 'test@example.com', 'http://localhost:3000');
  require('fs').writeFileSync('/tmp/test-email.html', html);
  console.log('Wrote /tmp/test-email.html (', html.length, 'chars)');
  // Quick assertions
  if (!html.includes('OXYTOCIN')) throw new Error('compound name missing');
  if (!html.includes('Now in stock')) throw new Error('stock stamp missing');
  if (!html.includes('email-unsub?t=')) throw new Error('unsub link missing');
  console.log('OK');
});
"
open /tmp/test-email.html
```

Expected: prints `Wrote /tmp/test-email.html (...) chars`, `OK`, and opens the browser to the rendered email matching v5.

- [ ] **Step 6.3: Verify stock stamp is omitted when show_stock_stamp=false**

```bash
node -e "
import('./lib/renderCompoundEmail.js').then(({ renderCompoundEmail }) => {
  const html = renderCompoundEmail({ compound_name: 'X', show_stock_stamp: false, dispatch_no: 1 }, 't@e.com', 'http://localhost:3000');
  if (html.includes('Now in stock')) { console.error('FAIL: stamp present'); process.exit(1); }
  console.log('OK: stamp omitted');
});"
```

Expected: `OK: stamp omitted`.

- [ ] **Step 6.4: Commit**

```bash
git add lib/renderCompoundEmail.js
git commit -m "compound-email: template renderer with HMAC-signed unsubscribe link"
```

---

## Task 7 · Recipient list builder

**Files:**
- Create: `lib/buildRecipientList.js`

- [ ] **Step 7.1: Write the builder**

Create `lib/buildRecipientList.js`:

```javascript
// Builds the deduplicated recipient list for a compound spotlight send.
// Audience: subscribers (where compound_email_unsubscribed_at IS NULL) ∪ ambassadors
// ∪ past_customers (distinct customer emails from orders). Then drop emails in
// compound_email_unsubscribes. Dedupe by lower(email), preferring source priority
// subscriber > ambassador > customer.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const PRIORITY = { subscriber: 0, ambassador: 1, customer: 2 };

async function sbFetch(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Supabase fetch failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function buildRecipientList() {
  // Pull all three sources in parallel.
  const [subs, ambs, orders, suppressed] = await Promise.all([
    sbFetch('/subscribers?compound_email_unsubscribed_at=is.null&select=email,first_name'),
    sbFetch('/ambassadors?email=not.is.null&select=email,name'),
    sbFetch('/orders?customer_email=not.is.null&select=customer_email,customer_name'),
    sbFetch('/compound_email_unsubscribes?select=email'),
  ]);

  const suppressedSet = new Set(suppressed.map(r => String(r.email || '').toLowerCase()));

  // Build candidate map keyed by lowercase email.
  const byEmail = new Map();
  function add(row, source) {
    if (!row.email) return;
    const email = String(row.email).trim().toLowerCase();
    if (!email || suppressedSet.has(email)) return;
    const existing = byEmail.get(email);
    if (!existing || PRIORITY[source] < PRIORITY[existing.source]) {
      byEmail.set(email, { email, name: row.name || row.first_name || '', source });
    }
  }

  subs.forEach(r => add({ email: r.email, name: r.first_name }, 'subscriber'));
  ambs.forEach(r => add({ email: r.email, name: r.name }, 'ambassador'));
  orders.forEach(r => add({ email: r.customer_email, name: r.customer_name }, 'customer'));

  return Array.from(byEmail.values());
}
```

- [ ] **Step 7.2: Smoke test the builder**

```bash
source /tmp/advnce.env
node -e "
import('./lib/buildRecipientList.js').then(async ({ buildRecipientList }) => {
  const list = await buildRecipientList();
  console.log('Total recipients:', list.length);
  console.log('By source:', list.reduce((a, r) => ({ ...a, [r.source]: (a[r.source]||0)+1 }), {}));
  console.log('First 3:', list.slice(0, 3));
});"
```

Expected: prints counts. By-source breakdown shows subscribers + ambassadors + customers. No duplicate emails.

- [ ] **Step 7.3: Commit**

```bash
git add lib/buildRecipientList.js
git commit -m "compound-email: deduped recipient list from subscribers, ambassadors, customers"
```

---

## Task 8 · Restock helper

**Files:**
- Create: `lib/onStockRise.js`

- [ ] **Step 8.1: Write the helper**

Create `lib/onStockRise.js`:

```javascript
// Called from purchase-receive and inventory-adjust whenever a product's stock
// changes. If stock crossed 0 → positive and we have compound_marketing data
// for the SKU, insert a 'restock' draft into compound_email_drafts.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

function headers() {
  return { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' };
}

// Compute next eligible send slot: max(now, latest sent draft's sent_at + 7 days,
// other 'ready'|'sending'|'sent' drafts' scheduled_at + 7 days).
async function computeScheduledAt() {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/compound_email_drafts?select=sent_at,scheduled_at&order=sent_at.desc.nullslast&limit=20`,
    { headers: headers(), cache: 'no-store' },
  );
  if (!r.ok) return new Date().toISOString();
  const rows = await r.json();
  const now = new Date();
  let earliest = now;
  for (const row of rows) {
    const anchor = row.sent_at || row.scheduled_at;
    if (!anchor) continue;
    const next = new Date(new Date(anchor).getTime() + 7 * 24 * 60 * 60 * 1000);
    if (next > earliest) earliest = next;
  }
  return earliest.toISOString();
}

export async function onStockRise({ sku, previousStock, newStock, source = 'unknown' }) {
  // Only fire when stock crosses 0 → positive.
  if (!(previousStock <= 0 && newStock > 0)) return { fired: false, reason: 'no_transition' };
  if (!sku) return { fired: false, reason: 'no_sku' };

  // Look up compound_marketing by SKU.
  const cmRes = await fetch(
    `${SUPABASE_URL}/rest/v1/compound_marketing?sku=eq.${encodeURIComponent(sku)}&select=*&limit=1`,
    { headers: headers(), cache: 'no-store' },
  );
  if (!cmRes.ok) return { fired: false, reason: 'lookup_failed' };
  const [cm] = await cmRes.json();
  if (!cm) {
    // No mapping. Still create a sparse draft so admin sees it; UI will show "needs copy".
  }

  const compoundSlug = cm?.compound_slug || `sku-${sku.toLowerCase()}`;
  const compoundName = cm?.compound_name || sku;
  const productUrl = cm?.product_url || `https://www.advncelabs.com/advnce-product.html?sku=${encodeURIComponent(sku)}`;

  // Dispatch_no = next monotonic value. Use the SQL helper.
  const noRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/next_dispatch_no`, {
    method: 'POST', headers: headers(), body: '{}',
  });
  const dispatchNo = noRes.ok ? await noRes.json() : null;

  const scheduledAt = await computeScheduledAt();

  const categoryLabel = cm && cm.category
    ? (cm.subcategory ? `${cm.category.toUpperCase()} · ${cm.subcategory.toUpperCase()}` : cm.category.toUpperCase())
    : null;

  const insert = {
    dispatch_no: dispatchNo,
    compound_slug: compoundSlug,
    compound_name: compoundName,
    product_url: productUrl,
    category_label: categoryLabel,
    hook: cm?.hook || null,
    tagline: null,
    layman_lead: null,
    layman_bridge: null,
    bullet_1: null,
    bullet_2: null,
    bullet_3: null,
    citations_short: cm?.citation_primary ? cm.citation_primary.toUpperCase() : null,
    show_stock_stamp: true,
    trigger: 'restock',
    status: 'draft',
    scheduled_at: scheduledAt,
    created_by: `system:${source}`,
  };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/compound_email_drafts`, {
    method: 'POST',
    headers: { ...headers(), Prefer: 'return=representation' },
    body: JSON.stringify(insert),
  });
  if (!res.ok) {
    console.error('onStockRise insert failed:', res.status, await res.text());
    return { fired: false, reason: 'insert_failed' };
  }
  const [row] = await res.json();
  return { fired: true, draft_id: row.id, dispatch_no: row.dispatch_no, scheduled_at: row.scheduled_at };
}
```

- [ ] **Step 8.2: Smoke test the helper**

```bash
source /tmp/advnce.env
node -e "
import('./lib/onStockRise.js').then(async ({ onStockRise }) => {
  // No-op case
  const a = await onStockRise({ sku: 'OX10', previousStock: 5, newStock: 10 });
  console.log('no-transition:', a);
  // Real fire (assuming OX10 in compound_marketing per Task 2.4)
  const b = await onStockRise({ sku: 'OX10', previousStock: 0, newStock: 100, source: 'smoke-test' });
  console.log('fire:', b);
});"
```

Expected: first call `{ fired: false, reason: 'no_transition' }`, second call `{ fired: true, draft_id: '<uuid>', dispatch_no: 1, scheduled_at: ... }`.

- [ ] **Step 8.3: Clean up the smoke-test draft**

```bash
curl -sS -X DELETE "$SUPABASE_URL/rest/v1/compound_email_drafts?created_by=eq.system:smoke-test" \
  -H "apikey: $SUPABASE_SERVICE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_KEY"
```

- [ ] **Step 8.4: Commit**

```bash
git add lib/onStockRise.js
git commit -m "compound-email: onStockRise helper inserts draft on 0 → positive transition"
```

---

## Task 9 · Hook `onStockRise` into existing inventory writers

**Files:**
- Modify: `app/api/purchase-receive/route.js`
- Modify: `app/api/inventory-adjust/route.js`

- [ ] **Step 9.1: Modify `purchase-receive`**

Open `app/api/purchase-receive/route.js`. After the product PATCH (currently lines 55-63 — the block that updates `products.stock`), capture the previous stock and call `onStockRise`. Replace the block:

```javascript
    const prodRes = await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${line.product_id}&select=stock`, { headers });
    const [prod] = await prodRes.json();
    if (!prod) continue;
    await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${line.product_id}`, {
      method: 'PATCH', headers,
      body: JSON.stringify({
        stock: (prod.stock || 0) + recvNow * KIT_VIALS,
        cost: unitCost,
        vendor: po.vendor.name,
        updated_at: new Date().toISOString(),
      }),
    });
```

…with:

```javascript
    const prodRes = await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${line.product_id}&select=stock,sku`, { headers });
    const [prod] = await prodRes.json();
    if (!prod) continue;
    const prevStock = prod.stock || 0;
    const nextStock = prevStock + recvNow * KIT_VIALS;
    await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${line.product_id}`, {
      method: 'PATCH', headers,
      body: JSON.stringify({
        stock: nextStock,
        cost: unitCost,
        vendor: po.vendor.name,
        updated_at: new Date().toISOString(),
      }),
    });
    if (prod.sku) {
      const { onStockRise } = await import('../../../lib/onStockRise');
      onStockRise({ sku: prod.sku, previousStock: prevStock, newStock: nextStock, source: 'purchase-receive' })
        .catch(err => console.error('onStockRise (purchase-receive) error:', err));
    }
```

Note: fire-and-forget — we don't block the PO receive flow on draft insert.

- [ ] **Step 9.2: Modify `inventory-adjust`**

Open `app/api/inventory-adjust/route.js`. Find the block that PATCHes products.stock (currently around lines 68-77 — the `stockUpdate` fetch). Capture previousStock = `currentStock` (already in scope as `currentStock`), newStock = `newStock` (already in scope), and after the successful `stockUpdate`, call `onStockRise`. Add after the `stockUpdate.ok` check (right after `if (!stockUpdate.ok) return ...`):

```javascript
  if (product.sku) {
    const { onStockRise } = await import('../../../lib/onStockRise');
    onStockRise({ sku: product.sku, previousStock: currentStock, newStock, source: 'inventory-adjust' })
      .catch(err => console.error('onStockRise (inventory-adjust) error:', err));
  }
```

- [ ] **Step 9.3: Verify dev server still starts**

```bash
npm run dev
```

In another shell, hit both routes' GET status endpoints:

```bash
curl -sS http://localhost:3000/api/purchase-receive
curl -sS http://localhost:3000/api/inventory-adjust
```

Expected: both return `{ "status": "..." }` or `{ "error": "Unauthorized" }` (depending on auth flow). NOT a 500 from a syntax error.

- [ ] **Step 9.4: Commit**

```bash
git add app/api/purchase-receive/route.js app/api/inventory-adjust/route.js
git commit -m "compound-email: call onStockRise from purchase-receive and inventory-adjust"
```

---

## Task 10 · Draft list API

**Files:**
- Create: `app/api/compound-email-draft-list/route.js`

- [ ] **Step 10.1: Write the route**

Create `app/api/compound-email-draft-list/route.js`:

```javascript
import { NextResponse } from 'next/server';
import { requireRole } from '../../../lib/requireAdmin';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

async function sb(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    cache: 'no-store',
  });
  if (!r.ok) return [];
  return r.json();
}

export async function GET(request) {
  const unauth = requireRole(request, 'admin', 'va');
  if (unauth) return unauth;

  const [draftAndReady, sentRecent] = await Promise.all([
    sb('/compound_email_drafts?status=in.(draft,ready,sending,failed)&order=created_at.desc'),
    sb('/compound_email_drafts?status=eq.sent&order=sent_at.desc&limit=30'),
  ]);

  // Bucket the active drafts.
  const needsCopy = [];
  const readyToSend = [];
  const inProgress = [];
  for (const d of draftAndReady) {
    const blank = !d.layman_lead || !d.bullet_1 || !d.bullet_2 || !d.bullet_3 || !d.tagline;
    if (d.status === 'sending' || d.status === 'failed' || (d.recipient_count_sent < d.recipient_count && d.status !== 'draft' && d.status !== 'ready')) {
      inProgress.push(d);
    } else if (blank || d.status === 'draft') {
      needsCopy.push(d);
    } else if (d.status === 'ready') {
      readyToSend.push(d);
    }
  }

  return NextResponse.json({ needsCopy, readyToSend, inProgress, sentRecent });
}
```

- [ ] **Step 10.2: Manual verify**

```bash
# With dev server running and admin cookie set in the browser, hit the route there.
# Or with curl using a saved cookie file:
curl -sS http://localhost:3000/api/compound-email-draft-list -b /tmp/admin-cookies.txt | head -c 500
```

Expected: `{ "needsCopy": [...], "readyToSend": [...], "inProgress": [...], "sentRecent": [...] }`.

- [ ] **Step 10.3: Commit**

```bash
git add app/api/compound-email-draft-list/route.js
git commit -m "compound-email: GET draft-list endpoint bucketed by status"
```

---

## Task 11 · Draft write API (create / update / delete)

**Files:**
- Create: `app/api/compound-email-draft-write/route.js`

- [ ] **Step 11.1: Write the route**

Create `app/api/compound-email-draft-write/route.js`:

```javascript
import { NextResponse } from 'next/server';
import { requireRole } from '../../../lib/requireAdmin';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const EDITABLE_FIELDS = [
  'hook', 'tagline', 'layman_lead', 'layman_bridge',
  'bullet_1', 'bullet_2', 'bullet_3', 'citations_short',
  'category_label', 'show_stock_stamp', 'scheduled_at', 'notes', 'status',
];

function headers() {
  return { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' };
}

export async function POST(request) {
  const unauth = requireRole(request, 'admin', 'va');
  if (unauth) return unauth;

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const { action, id, fields, compound_slug } = body || {};

  if (action === 'create') {
    if (!compound_slug) return NextResponse.json({ error: 'compound_slug required' }, { status: 400 });
    // Look up compound_marketing for pre-fill.
    const cmRes = await fetch(`${SUPABASE_URL}/rest/v1/compound_marketing?compound_slug=eq.${encodeURIComponent(compound_slug)}&select=*&limit=1`, { headers: headers(), cache: 'no-store' });
    const [cm] = cmRes.ok ? await cmRes.json() : [];
    if (!cm) return NextResponse.json({ error: 'compound not found in compound_marketing' }, { status: 404 });

    const noRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/next_dispatch_no`, { method: 'POST', headers: headers(), body: '{}' });
    const dispatchNo = noRes.ok ? await noRes.json() : null;

    const insert = {
      dispatch_no: dispatchNo,
      compound_slug: cm.compound_slug,
      compound_name: cm.compound_name,
      product_url: cm.product_url || `https://www.advncelabs.com/advnce-product.html?sku=${encodeURIComponent(cm.sku || '')}`,
      category_label: cm.category ? cm.category.toUpperCase() : null,
      hook: cm.hook || null,
      citations_short: cm.citation_primary ? cm.citation_primary.toUpperCase() : null,
      show_stock_stamp: false,
      trigger: 'manual',
      status: 'draft',
      created_by: request.cookies.get('adonis_admin_email')?.value || 'admin',
    };
    const r = await fetch(`${SUPABASE_URL}/rest/v1/compound_email_drafts`, {
      method: 'POST', headers: { ...headers(), Prefer: 'return=representation' },
      body: JSON.stringify(insert),
    });
    if (!r.ok) return NextResponse.json({ error: 'Create failed', detail: await r.text() }, { status: 500 });
    const [row] = await r.json();
    return NextResponse.json({ success: true, draft: row });
  }

  if (!UUID_RE.test(String(id || ''))) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  if (action === 'delete') {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/compound_email_drafts?id=eq.${id}`, {
      method: 'DELETE', headers: headers(),
    });
    if (!r.ok) return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === 'update') {
    if (!fields || typeof fields !== 'object') return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    const patch = {};
    for (const k of EDITABLE_FIELDS) if (fields[k] !== undefined) patch[k] = fields[k];
    if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'No valid fields' }, { status: 400 });

    // Block ready → ... → sending edits to copy fields.
    if (patch.status && !['draft','ready','failed'].includes(patch.status)) {
      return NextResponse.json({ error: 'Invalid status transition (only draft/ready/failed allowed via update)' }, { status: 400 });
    }

    const r = await fetch(`${SUPABASE_URL}/rest/v1/compound_email_drafts?id=eq.${id}`, {
      method: 'PATCH', headers: { ...headers(), Prefer: 'return=minimal' },
      body: JSON.stringify(patch),
    });
    if (!r.ok) return NextResponse.json({ error: 'Update failed', detail: await r.text() }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

export async function GET() {
  return NextResponse.json({ status: 'compound-email-draft-write route is live' });
}
```

- [ ] **Step 11.2: Manual verify create + update + delete**

```bash
# Create
RESP=$(curl -sS -X POST http://localhost:3000/api/compound-email-draft-write \
  -b /tmp/admin-cookies.txt -H 'Content-Type: application/json' \
  -d '{"action":"create","compound_slug":"oxytocin"}')
echo "$RESP"
ID=$(echo "$RESP" | python3 -c "import json,sys; print(json.load(sys.stdin)['draft']['id'])")
echo "Created draft: $ID"

# Update
curl -sS -X POST http://localhost:3000/api/compound-email-draft-write \
  -b /tmp/admin-cookies.txt -H 'Content-Type: application/json' \
  -d "{\"action\":\"update\",\"id\":\"$ID\",\"fields\":{\"layman_lead\":\"In plain terms.\",\"tagline\":\"The bonding nonapeptide.\"}}"

# Delete
curl -sS -X POST http://localhost:3000/api/compound-email-draft-write \
  -b /tmp/admin-cookies.txt -H 'Content-Type: application/json' \
  -d "{\"action\":\"delete\",\"id\":\"$ID\"}"
```

Expected: create returns `{ "success": true, "draft": { "id": "...", "compound_slug": "oxytocin", "hook": "Lost the connection?", ... } }`. Update returns `{ "success": true }`. Delete returns `{ "success": true }`.

- [ ] **Step 11.3: Commit**

```bash
git add app/api/compound-email-draft-write/route.js
git commit -m "compound-email: draft write endpoint (create/update/delete)"
```

---

## Task 12 · Preview API

**Files:**
- Create: `app/api/compound-email-preview/route.js`

- [ ] **Step 12.1: Write the route**

Create `app/api/compound-email-preview/route.js`:

```javascript
import { NextResponse } from 'next/server';
import { requireRole } from '../../../lib/requireAdmin';
import { renderCompoundEmail } from '../../../lib/renderCompoundEmail';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request) {
  const unauth = requireRole(request, 'admin', 'va');
  if (unauth) return unauth;
  const id = new URL(request.url).searchParams.get('id');
  if (!UUID_RE.test(String(id || ''))) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const r = await fetch(`${SUPABASE_URL}/rest/v1/compound_email_drafts?id=eq.${id}&select=*&limit=1`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }, cache: 'no-store',
  });
  if (!r.ok) return NextResponse.json({ error: 'Lookup failed' }, { status: 500 });
  const [draft] = await r.json();
  if (!draft) return NextResponse.json({ error: 'Draft not found' }, { status: 404 });

  const baseUrl = new URL(request.url).origin;
  const html = renderCompoundEmail(draft, 'preview@advncelabs.com', baseUrl);
  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
```

- [ ] **Step 12.2: Manual verify**

Create a draft (use the curl from Task 11.2), then open:

```bash
echo "Open in browser: http://localhost:3000/api/compound-email-preview?id=$ID"
```

Expected: rendered email matching v5 layout. Stock stamp absent (manual draft has show_stock_stamp=false by default). Unsubscribe link works (points to /api/email-unsub?t=...).

- [ ] **Step 12.3: Commit**

```bash
git add app/api/compound-email-preview/route.js
git commit -m "compound-email: GET preview endpoint renders draft via template"
```

---

## Task 13 · Send API (chunked)

**Files:**
- Create: `app/api/compound-email-send/route.js`

- [ ] **Step 13.1: Write the route**

Create `app/api/compound-email-send/route.js`:

```javascript
import { NextResponse } from 'next/server';
import { requireRole } from '../../../lib/requireAdmin';
import { buildRecipientList } from '../../../lib/buildRecipientList';
import { renderCompoundEmail } from '../../../lib/renderCompoundEmail';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND = process.env.RESEND_API_KEY;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEFAULT_CHUNK = 500;
const SEND_THROTTLE_MS = 200;

function sbHeaders() {
  return { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' };
}

async function sb(path, init = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1${path}`, { ...init, headers: { ...sbHeaders(), ...(init.headers || {}) } });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

export async function POST(request) {
  const unauth = requireRole(request, 'admin');
  if (unauth) return unauth;
  if (!RESEND) return NextResponse.json({ error: 'RESEND_API_KEY missing' }, { status: 500 });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const { draft_id, chunk_size } = body || {};
  if (!UUID_RE.test(String(draft_id || ''))) return NextResponse.json({ error: 'Invalid draft_id' }, { status: 400 });
  const CHUNK = Math.min(Math.max(parseInt(chunk_size, 10) || DEFAULT_CHUNK, 1), 1000);

  // Load draft.
  const dRes = await sb(`/compound_email_drafts?id=eq.${draft_id}&select=*&limit=1`, { cache: 'no-store' });
  if (!dRes.ok) return NextResponse.json({ error: 'Draft lookup failed' }, { status: 500 });
  const [draft] = await dRes.json();
  if (!draft) return NextResponse.json({ error: 'Draft not found' }, { status: 404 });

  // FIRST-CALL BRANCH: status=ready → transition + materialize recipients.
  if (draft.status === 'ready') {
    let recipients;
    try {
      recipients = await buildRecipientList();
    } catch (err) {
      return NextResponse.json({ error: 'Recipient build failed', detail: String(err.message || err) }, { status: 500 });
    }
    // Bulk insert; chunked into 500 to keep payloads small.
    for (let i = 0; i < recipients.length; i += 500) {
      const batch = recipients.slice(i, i + 500).map(r => ({
        draft_id, email: r.email, name: r.name, source: r.source, status: 'pending',
      }));
      const ins = await sb('/compound_email_recipients', { method: 'POST', body: JSON.stringify(batch) });
      if (!ins.ok) return NextResponse.json({ error: 'Recipient insert failed', detail: await ins.text() }, { status: 500 });
    }
    await sb(`/compound_email_drafts?id=eq.${draft_id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'sending', recipient_count: recipients.length }),
    });
    draft.status = 'sending';
    draft.recipient_count = recipients.length;
  }

  if (draft.status !== 'sending') {
    return NextResponse.json({ error: `Cannot send draft in status ${draft.status}` }, { status: 400 });
  }

  // Process next chunk of pending recipients.
  const pendRes = await sb(`/compound_email_recipients?draft_id=eq.${draft_id}&status=eq.pending&select=*&limit=${CHUNK}`, { cache: 'no-store' });
  if (!pendRes.ok) return NextResponse.json({ error: 'Pending lookup failed' }, { status: 500 });
  const pending = await pendRes.json();

  const baseUrl = new URL(request.url).origin.replace(/^http:\/\/localhost/, 'http://localhost'); // identity, but explicit
  let sentCount = 0, failedCount = 0;
  for (const r of pending) {
    const html = renderCompoundEmail(draft, r.email, baseUrl);
    const subject = draft.hook ? draft.hook.replace(/^"|"$/g, '') : draft.compound_name;
    let resendId = null, error = null, ok = false;
    try {
      const sendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + RESEND },
        body: JSON.stringify({
          from: 'advnce labs <orders@advncelabs.com>',
          to: r.email,
          subject,
          html,
        }),
      });
      const data = await sendRes.json().catch(() => ({}));
      if (sendRes.ok) { ok = true; resendId = data.id || null; }
      else { error = JSON.stringify(data).slice(0, 500); }
    } catch (err) {
      error = String(err.message || err).slice(0, 500);
    }

    await sb(`/compound_email_recipients?id=eq.${r.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: ok ? 'sent' : 'failed',
        sent_at: ok ? new Date().toISOString() : null,
        resend_id: resendId,
        error,
      }),
    });
    if (ok) sentCount++; else failedCount++;

    await sleep(SEND_THROTTLE_MS);
  }

  // Recount totals.
  const countRes = await sb(`/compound_email_recipients?draft_id=eq.${draft_id}&select=status`, { cache: 'no-store' });
  const all = countRes.ok ? await countRes.json() : [];
  const totals = all.reduce((a, x) => { a[x.status] = (a[x.status] || 0) + 1; return a; }, {});
  const sentTotal = totals.sent || 0;
  const failedTotal = totals.failed || 0;
  const remaining = totals.pending || 0;

  // If drain complete, mark draft sent.
  const patch = {
    recipient_count_sent: sentTotal,
    recipient_count_failed: failedTotal,
  };
  if (remaining === 0) {
    patch.status = 'sent';
    patch.sent_at = new Date().toISOString();
  }
  await sb(`/compound_email_drafts?id=eq.${draft_id}`, {
    method: 'PATCH', body: JSON.stringify(patch),
  });

  return NextResponse.json({
    draft_id,
    status: patch.status || 'sending',
    processed_this_call: pending.length,
    sent_total: sentTotal,
    failed_total: failedTotal,
    remaining,
  });
}

export async function GET() {
  return NextResponse.json({ status: 'compound-email-send route is live' });
}
```

- [ ] **Step 13.2: Manual single-recipient verify**

Before testing with the real list, temporarily restrict the subscribers query to your own email. Create a test draft, fill in copy via the update endpoint, set status to `ready`, then send:

```bash
# Mark draft ready (using $ID from Task 11.2):
curl -sS -X POST http://localhost:3000/api/compound-email-draft-write \
  -b /tmp/admin-cookies.txt -H 'Content-Type: application/json' \
  -d "{\"action\":\"update\",\"id\":\"$ID\",\"fields\":{\"status\":\"ready\",\"tagline\":\"Test tagline.\",\"layman_lead\":\"Test lead.\",\"layman_bridge\":\"Test bridge.\",\"bullet_1\":\"b1\",\"bullet_2\":\"b2\",\"bullet_3\":\"b3\"}}"

# Send a chunk:
curl -sS -X POST http://localhost:3000/api/compound-email-send \
  -b /tmp/admin-cookies.txt -H 'Content-Type: application/json' \
  -d "{\"draft_id\":\"$ID\",\"chunk_size\":5}"
```

Expected response: `{ "draft_id": "...", "status": "sending" or "sent", "processed_this_call": N, "sent_total": N, "failed_total": 0, "remaining": M }`. Check inbox of recipients (a single test address you control); email should look like v5 with the unsubscribe footer link.

**Important:** before opening sends to the full list, ensure your subscribers table doesn't contain test recipients you don't want pinged. Run `select count(*) from subscribers where compound_email_unsubscribed_at is null` first.

- [ ] **Step 13.3: Commit**

```bash
git add app/api/compound-email-send/route.js
git commit -m "compound-email: chunked send route — Resend loop with per-recipient tracking"
```

---

## Task 14 · Resume API

**Files:**
- Create: `app/api/compound-email-resume/route.js`

- [ ] **Step 14.1: Write the route**

Create `app/api/compound-email-resume/route.js`:

```javascript
import { NextResponse } from 'next/server';
import { requireRole } from '../../../lib/requireAdmin';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function headers() { return { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' }; }

export async function POST(request) {
  const unauth = requireRole(request, 'admin');
  if (unauth) return unauth;

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const { draft_id } = body || {};
  if (!UUID_RE.test(String(draft_id || ''))) return NextResponse.json({ error: 'Invalid draft_id' }, { status: 400 });

  // Re-queue failed rows back to pending.
  const r1 = await fetch(`${SUPABASE_URL}/rest/v1/compound_email_recipients?draft_id=eq.${draft_id}&status=eq.failed`, {
    method: 'PATCH', headers: headers(), body: JSON.stringify({ status: 'pending', error: null }),
  });
  if (!r1.ok) return NextResponse.json({ error: 'Re-queue failed' }, { status: 500 });

  // Force draft back to sending (if it was 'failed' or 'sent' with leftover failures).
  await fetch(`${SUPABASE_URL}/rest/v1/compound_email_drafts?id=eq.${draft_id}`, {
    method: 'PATCH', headers: headers(), body: JSON.stringify({ status: 'sending' }),
  });

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 14.2: Commit**

```bash
git add app/api/compound-email-resume/route.js
git commit -m "compound-email: resume endpoint re-queues failed recipients"
```

---

## Task 15 · Admin queue page (server component)

**Files:**
- Create: `app/admin/marketing/email-campaigns/page.jsx`

- [ ] **Step 15.1: Write the page**

Create `app/admin/marketing/email-campaigns/page.jsx`:

```jsx
// Server component: fetches drafts grouped by status, renders sections,
// passes per-draft data to <DraftCard /> client component.

import DraftCard from './DraftCard';
import NewDraftButton from './NewDraftButton';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

async function sb(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    cache: 'no-store',
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  if (!res.ok) return [];
  return res.json();
}

export const dynamic = 'force-dynamic';

export default async function EmailCampaignsPage() {
  const [drafts, compounds] = await Promise.all([
    sb('/compound_email_drafts?status=in.(draft,ready,sending,failed,sent)&order=created_at.desc&limit=50'),
    sb('/compound_marketing?select=compound_slug,compound_name,category&order=compound_name.asc'),
  ]);

  const needsCopy = drafts.filter(d =>
    d.status === 'draft' && (!d.layman_lead || !d.bullet_1 || !d.bullet_2 || !d.bullet_3 || !d.tagline)
  );
  const draftReady = drafts.filter(d => d.status === 'draft' && !needsCopy.includes(d));
  const readyToSend = drafts.filter(d => d.status === 'ready');
  const inProgress = drafts.filter(d => d.status === 'sending' || d.status === 'failed');
  const sentRecent = drafts.filter(d => d.status === 'sent').slice(0, 30);

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, letterSpacing: 2, textTransform: 'uppercase' }}>Email Campaigns</h1>
          <div style={{ marginTop: 6, fontSize: 12, color: '#7A7D88', letterSpacing: 1 }}>
            Compound spotlight dispatches &middot; "There's a peptide for that"
          </div>
        </div>
        <NewDraftButton compounds={compounds} />
      </header>

      <Section title={`Needs copy (${needsCopy.length})`} hint="Auto-drafted from restocks. Author the layman lead/bridge and bullets before sending.">
        {needsCopy.length === 0 && <Empty>None.</Empty>}
        {needsCopy.map(d => <DraftCard key={d.id} draft={d} mode="needsCopy" />)}
      </Section>

      <Section title={`Drafts (${draftReady.length})`}>
        {draftReady.length === 0 && <Empty>None.</Empty>}
        {draftReady.map(d => <DraftCard key={d.id} draft={d} mode="draft" />)}
      </Section>

      <Section title={`Ready to send (${readyToSend.length})`}>
        {readyToSend.length === 0 && <Empty>None.</Empty>}
        {readyToSend.map(d => <DraftCard key={d.id} draft={d} mode="ready" />)}
      </Section>

      <Section title={`In progress / failed (${inProgress.length})`}>
        {inProgress.length === 0 && <Empty>None.</Empty>}
        {inProgress.map(d => <DraftCard key={d.id} draft={d} mode="inProgress" />)}
      </Section>

      <Section title={`Sent (last 30)`}>
        {sentRecent.length === 0 && <Empty>None.</Empty>}
        {sentRecent.map(d => <DraftCard key={d.id} draft={d} mode="sent" />)}
      </Section>
    </div>
  );
}

function Section({ title, hint, children }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 14, letterSpacing: 3, textTransform: 'uppercase', color: '#1A1C22', margin: '0 0 6px' }}>{title}</h2>
      {hint && <div style={{ fontSize: 12, color: '#7A7D88', marginBottom: 12 }}>{hint}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
    </section>
  );
}

function Empty({ children }) {
  return <div style={{ padding: 16, color: '#7A7D88', fontSize: 13, fontStyle: 'italic', border: '1px dashed #E4E7EC', borderRadius: 4 }}>{children}</div>;
}
```

- [ ] **Step 15.2: Commit (incomplete UI — Tasks 16-18 finish it)**

```bash
mkdir -p app/admin/marketing/email-campaigns
git add app/admin/marketing/email-campaigns/page.jsx
git commit -m "compound-email: admin queue page (server component)"
```

---

## Task 16 · DraftCard client component

**Files:**
- Create: `app/admin/marketing/email-campaigns/DraftCard.jsx`

- [ ] **Step 16.1: Write the component**

Create `app/admin/marketing/email-campaigns/DraftCard.jsx`:

```jsx
'use client';
import { useState } from 'react';
import SendButton from './SendButton';

export default function DraftCard({ draft, mode }) {
  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState({
    hook: draft.hook || '',
    tagline: draft.tagline || '',
    layman_lead: draft.layman_lead || '',
    layman_bridge: draft.layman_bridge || '',
    bullet_1: draft.bullet_1 || '',
    bullet_2: draft.bullet_2 || '',
    bullet_3: draft.bullet_3 || '',
    citations_short: draft.citations_short || '',
    category_label: draft.category_label || '',
    show_stock_stamp: !!draft.show_stock_stamp,
    notes: draft.notes || '',
  });
  const [busy, setBusy] = useState(false);

  async function call(action, body) {
    setBusy(true);
    try {
      const r = await fetch('/api/compound-email-draft-write', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, id: draft.id, ...body }),
      });
      if (!r.ok) { alert('Failed: ' + await r.text()); return false; }
      return true;
    } finally { setBusy(false); }
  }

  async function save() {
    const ok = await call('update', { fields });
    if (ok) { setEditing(false); location.reload(); }
  }
  async function markReady() {
    const ok = await call('update', { fields: { ...fields, status: 'ready' } });
    if (ok) location.reload();
  }
  async function unmarkReady() {
    const ok = await call('update', { fields: { status: 'draft' } });
    if (ok) location.reload();
  }
  async function deleteDraft() {
    if (!confirm(`Delete draft for ${draft.compound_name}?`)) return;
    const ok = await call('delete');
    if (ok) location.reload();
  }
  async function resume() {
    if (!confirm('Resume sending failed recipients?')) return;
    const r = await fetch('/api/compound-email-resume', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ draft_id: draft.id }),
    });
    if (!r.ok) { alert('Resume failed'); return; }
    location.reload();
  }

  const cardStyle = {
    border: mode === 'needsCopy' ? '1px solid #E07C24' : '1px solid #E4E7EC',
    background: '#fff', padding: 18, borderRadius: 4,
  };

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8, fontSize: 11, color: '#7A7D88', letterSpacing: 2, textTransform: 'uppercase' }}>
        <span style={{ color: '#00A0A8', fontWeight: 700 }}>Dispatch No. {draft.dispatch_no}</span>
        <span>&middot;</span>
        <span>{draft.compound_name}</span>
        <span>&middot;</span>
        <span>{draft.trigger}</span>
        {draft.scheduled_at && mode !== 'sent' && (
          <>
            <span>&middot;</span>
            <span>scheduled {new Date(draft.scheduled_at).toLocaleDateString()}</span>
          </>
        )}
        {mode === 'sent' && (
          <>
            <span>&middot;</span>
            <span>sent {new Date(draft.sent_at).toLocaleDateString()}</span>
            <span>&middot;</span>
            <span>{draft.recipient_count_sent} / {draft.recipient_count} delivered</span>
            {draft.recipient_count_failed > 0 && <span style={{ color: '#E07C24' }}>· {draft.recipient_count_failed} failed</span>}
          </>
        )}
      </div>

      <div style={{ fontSize: 18, fontFamily: "'Cormorant Garamond',serif", fontStyle: 'italic', color: '#1A1C22', marginBottom: 4 }}>
        &ldquo;{draft.hook || '—'}&rdquo;
      </div>

      {!editing && (
        <div style={{ fontSize: 13, color: '#4A4F5C', lineHeight: 1.6, marginBottom: 12 }}>
          {draft.layman_lead || <span style={{ color: '#E07C24' }}>Needs layman lead copy.</span>}
        </div>
      )}

      {editing && (
        <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
          {[
            ['hook', 'Hook (italic Cormorant — e.g. "Lost the connection?")', false],
            ['tagline', 'Tagline (italic cyan — e.g. "The bonding nonapeptide.")', false],
            ['category_label', 'Category label (header eyebrow — e.g. "SOCIAL · BONDING")', false],
            ['layman_lead', 'Layman lead (plain-English para 1)', true],
            ['layman_bridge', 'Layman bridge (plain-English para 2)', true],
            ['bullet_1', 'Bullet 1', false],
            ['bullet_2', 'Bullet 2', false],
            ['bullet_3', 'Bullet 3', false],
            ['citations_short', 'Citations (short, uppercase — e.g. "CARTER 2014 · HEINRICHS 2003")', false],
            ['notes', 'Internal notes', true],
          ].map(([k, label, ta]) => (
            <label key={k} style={{ fontSize: 11, color: '#4A4F5C' }}>
              <span style={{ display: 'block', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>{label}</span>
              {ta
                ? <textarea value={fields[k]} onChange={e => setFields({ ...fields, [k]: e.target.value })} rows={2} style={{ width: '100%', fontSize: 13, padding: 8, border: '1px solid #E4E7EC', borderRadius: 3 }} />
                : <input value={fields[k]} onChange={e => setFields({ ...fields, [k]: e.target.value })} style={{ width: '100%', fontSize: 13, padding: 8, border: '1px solid #E4E7EC', borderRadius: 3 }} />}
            </label>
          ))}
          <label style={{ fontSize: 13, color: '#4A4F5C' }}>
            <input type="checkbox" checked={fields.show_stock_stamp} onChange={e => setFields({ ...fields, show_stock_stamp: e.target.checked })} />
            {' '}Show "Now in stock" stamp above the CTA
          </label>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {!editing && mode !== 'sent' && (
          <button onClick={() => setEditing(true)} disabled={busy} style={btn}>Edit</button>
        )}
        {editing && <button onClick={save} disabled={busy} style={btnPrimary}>Save</button>}
        {editing && <button onClick={() => setEditing(false)} disabled={busy} style={btn}>Cancel</button>}

        <a href={`/api/compound-email-preview?id=${draft.id}`} target="_blank" rel="noreferrer" style={btnLink}>Preview &rarr;</a>

        {(mode === 'draft' || mode === 'needsCopy') && (
          <button onClick={markReady} disabled={busy || editing} style={btnPrimary}>Mark ready</button>
        )}
        {mode === 'ready' && (
          <>
            <button onClick={unmarkReady} disabled={busy} style={btn}>Move back to draft</button>
            <SendButton draftId={draft.id} compoundName={draft.compound_name} />
          </>
        )}
        {mode === 'inProgress' && (
          <>
            <SendButton draftId={draft.id} compoundName={draft.compound_name} resume />
            <button onClick={resume} disabled={busy} style={btn}>Re-queue failed</button>
          </>
        )}
        {mode !== 'sent' && mode !== 'inProgress' && (
          <button onClick={deleteDraft} disabled={busy} style={btnDanger}>Delete</button>
        )}
      </div>
    </div>
  );
}

const btn = { padding: '6px 12px', fontSize: 12, border: '1px solid #1A1C22', background: '#fff', cursor: 'pointer', borderRadius: 3, letterSpacing: 1, textTransform: 'uppercase' };
const btnPrimary = { ...btn, background: '#00A0A8', color: '#F4F2EE', borderColor: '#00A0A8' };
const btnDanger = { ...btn, color: '#E07C24', borderColor: '#E07C24' };
const btnLink = { ...btn, textDecoration: 'none', color: '#1A1C22' };
```

- [ ] **Step 16.2: Commit**

```bash
git add app/admin/marketing/email-campaigns/DraftCard.jsx
git commit -m "compound-email: DraftCard client component (edit/preview/ready/send)"
```

---

## Task 17 · NewDraftButton client component

**Files:**
- Create: `app/admin/marketing/email-campaigns/NewDraftButton.jsx`

- [ ] **Step 17.1: Write the component**

Create `app/admin/marketing/email-campaigns/NewDraftButton.jsx`:

```jsx
'use client';
import { useState } from 'react';

export default function NewDraftButton({ compounds }) {
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState('');
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!slug) { alert('Choose a compound'); return; }
    setBusy(true);
    try {
      const r = await fetch('/api/compound-email-draft-write', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', compound_slug: slug }),
      });
      if (!r.ok) { alert('Create failed: ' + await r.text()); return; }
      location.reload();
    } finally { setBusy(false); }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} style={{
        padding: '10px 20px', fontSize: 12, background: '#00A0A8', color: '#F4F2EE',
        border: 0, cursor: 'pointer', borderRadius: 3, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700,
      }}>+ New draft</button>

      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#F4F2EE', padding: 32, borderRadius: 6, maxWidth: 480, width: '90%' }}>
            <h2 style={{ margin: 0, fontSize: 18, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>New compound dispatch</h2>
            <label style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: '#4A4F5C', display: 'block', marginBottom: 4 }}>Compound</label>
            <select value={slug} onChange={e => setSlug(e.target.value)} style={{ width: '100%', padding: 10, fontSize: 14, marginBottom: 16, border: '1px solid #E4E7EC', borderRadius: 3 }}>
              <option value="">— select —</option>
              {compounds.map(c => (
                <option key={c.compound_slug} value={c.compound_slug}>
                  {c.compound_name} {c.category ? `(${c.category})` : ''}
                </option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setOpen(false)} style={{ padding: '8px 16px', fontSize: 12, background: '#fff', border: '1px solid #1A1C22', cursor: 'pointer', borderRadius: 3, letterSpacing: 1, textTransform: 'uppercase' }}>Cancel</button>
              <button onClick={create} disabled={busy || !slug} style={{ padding: '8px 16px', fontSize: 12, background: '#00A0A8', color: '#F4F2EE', border: 0, cursor: 'pointer', borderRadius: 3, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700 }}>Create</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 17.2: Commit**

```bash
git add app/admin/marketing/email-campaigns/NewDraftButton.jsx
git commit -m "compound-email: NewDraftButton with compound picker modal"
```

---

## Task 18 · SendButton client component (chunk orchestrator)

**Files:**
- Create: `app/admin/marketing/email-campaigns/SendButton.jsx`

- [ ] **Step 18.1: Write the component**

Create `app/admin/marketing/email-campaigns/SendButton.jsx`:

```jsx
'use client';
import { useState } from 'react';

export default function SendButton({ draftId, compoundName, resume = false }) {
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(null);

  async function send() {
    const label = resume ? `Resume sending ${compoundName}?` : `Send ${compoundName} dispatch now? This blasts the full subscriber + ambassador + customer list.`;
    if (!confirm(label)) return;
    setSending(true);
    setProgress({ sent: 0, failed: 0, total: null, calls: 0 });
    try {
      let remaining = 1;
      while (remaining > 0) {
        const r = await fetch('/api/compound-email-send', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ draft_id: draftId, chunk_size: 500 }),
        });
        if (!r.ok) {
          alert('Send failed: ' + await r.text());
          break;
        }
        const data = await r.json();
        remaining = data.remaining;
        setProgress(p => ({
          sent: data.sent_total,
          failed: data.failed_total,
          total: data.sent_total + data.failed_total + data.remaining,
          calls: (p?.calls || 0) + 1,
        }));
        if (data.status === 'sent') break;
      }
      alert('Send complete.');
      location.reload();
    } finally {
      setSending(false);
    }
  }

  const label = resume ? 'Resume sending' : 'Send now';

  return (
    <>
      <button onClick={send} disabled={sending} style={{
        padding: '6px 12px', fontSize: 12, background: '#E07C24', color: '#F4F2EE',
        border: 0, cursor: 'pointer', borderRadius: 3, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700,
      }}>
        {sending ? 'Sending…' : label}
      </button>
      {sending && progress && (
        <span style={{ fontSize: 11, color: '#7A7D88', letterSpacing: 1 }}>
          {progress.sent} sent {progress.failed > 0 && `· ${progress.failed} failed`} / {progress.total ?? '?'} · call {progress.calls}
        </span>
      )}
    </>
  );
}
```

- [ ] **Step 18.2: Commit**

```bash
git add app/admin/marketing/email-campaigns/SendButton.jsx
git commit -m "compound-email: SendButton client orchestrator loops chunked send route"
```

---

## Task 19 · Add link from `/admin/marketing` index

**Files:**
- Modify: `app/admin/marketing/page.jsx`

- [ ] **Step 19.1: Inspect the existing marketing index**

```bash
head -80 "/Volumes/(626)806-4475/Ai Projects/adonis-next/app/admin/marketing/page.jsx"
```

Find the section where tiles/links to `ambassadors`, `campaigns`, `news`, `subscribers`, `post-builder`, `content` are rendered. The page uses inline tile components — match that style.

- [ ] **Step 19.2: Add the new tile**

Add an `Email Campaigns` tile alongside the existing ones. The tile href is `/admin/marketing/email-campaigns`, label `Email Campaigns`, sub-label `Compound spotlight dispatches`. Copy the inline style block of an existing tile (e.g. the News tile) and substitute the label/href.

- [ ] **Step 19.3: Verify the page renders**

Open `http://localhost:3000/admin/marketing` in a browser (logged in as admin). The new tile should appear. Click it — should land on `/admin/marketing/email-campaigns` with the sections from Task 15 rendered.

- [ ] **Step 19.4: Commit**

```bash
git add app/admin/marketing/page.jsx
git commit -m "compound-email: link from marketing index to email-campaigns"
```

---

## Task 20 · End-to-end smoke test

**Files:**
- Create: `scripts/smoke-compound-email.js`

- [ ] **Step 20.1: Write the smoke test**

Create `scripts/smoke-compound-email.js`:

```javascript
#!/usr/bin/env node
// End-to-end smoke test for compound spotlight email campaigns.
//
// Asserts (without actually sending real email — exits before invoking Resend):
//   1. compound_marketing has oxytocin row.
//   2. onStockRise fires on 0 → positive, creates a draft.
//   3. Draft can be updated with copy fields.
//   4. Preview renders and contains expected markers.
//   5. Recipient builder returns a deduped list.
//   6. Unsubscribe token roundtrip works.
//
// Run: node scripts/smoke-compound-email.js
// Exit codes: 0 on pass, 1 on any failure.

const fs = require('fs');

if (fs.existsSync('/tmp/advnce.env')) {
  for (const line of fs.readFileSync('/tmp/advnce.env', 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.+)$/);
    if (m) process.env[m[1]] = m[2];
  }
}

const URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) { console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY'); process.exit(1); }
if (!process.env.EMAIL_UNSUB_SECRET) { console.error('Missing EMAIL_UNSUB_SECRET'); process.exit(1); }
process.env.NEXT_PUBLIC_SUPABASE_URL = URL;
process.env.SUPABASE_SERVICE_KEY = KEY;

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

function fail(msg) { console.error('✗ FAIL:', msg); process.exit(1); }
function ok(msg)   { console.log('✓', msg); }

async function clean() {
  await fetch(`${URL}/rest/v1/compound_email_drafts?created_by=eq.system:smoke-test`, { method: 'DELETE', headers });
  await fetch(`${URL}/rest/v1/compound_email_drafts?created_by=eq.smoke-test`, { method: 'DELETE', headers });
}

(async () => {
  await clean();

  // 1. compound_marketing has oxytocin.
  const cmRes = await fetch(`${URL}/rest/v1/compound_marketing?compound_slug=eq.oxytocin&select=*`, { headers });
  const cmRows = await cmRes.json();
  if (!cmRows.length) fail('oxytocin missing from compound_marketing (run sync-compound-marketing.js + Task 2.4 SKU updates)');
  if (!cmRows[0].sku) fail('oxytocin row missing sku — apply Task 2.4 SKU updates');
  ok('compound_marketing has oxytocin with SKU');

  // 2. onStockRise fires.
  const { onStockRise } = await import('../lib/onStockRise.js');
  const result = await onStockRise({ sku: cmRows[0].sku, previousStock: 0, newStock: 50, source: 'smoke-test' });
  if (!result.fired) fail(`onStockRise did not fire: ${result.reason}`);
  ok(`onStockRise fired (draft_id ${result.draft_id})`);
  const draftId = result.draft_id;

  // No-op case
  const result2 = await onStockRise({ sku: cmRows[0].sku, previousStock: 10, newStock: 50 });
  if (result2.fired) fail('onStockRise fired when it should not have');
  ok('onStockRise no-op on non-transition');

  // 3. Update the draft.
  const patchRes = await fetch(`${URL}/rest/v1/compound_email_drafts?id=eq.${draftId}`, {
    method: 'PATCH', headers,
    body: JSON.stringify({
      tagline: 'The bonding nonapeptide.',
      layman_lead: 'In plain terms: oxytocin is the peptide your brain releases during physical touch.',
      layman_bridge: 'Researchers have been studying it for decades.',
      bullet_1: 'A nine-amino-acid peptide.',
      bullet_2: 'Pair-bonding research.',
      bullet_3: 'Anxiolytic markers.',
    }),
  });
  if (!patchRes.ok) fail(`patch failed: ${await patchRes.text()}`);
  ok('draft updated with copy fields');

  // 4. Render preview.
  const dRes = await fetch(`${URL}/rest/v1/compound_email_drafts?id=eq.${draftId}&select=*`, { headers });
  const [draft] = await dRes.json();
  const { renderCompoundEmail } = await import('../lib/renderCompoundEmail.js');
  const html = renderCompoundEmail(draft, 'smoke@example.com', 'http://localhost:3000');
  if (!html.includes('OXYTOCIN')) fail('rendered html missing compound name');
  if (!html.includes('Now in stock')) fail('rendered html missing stock stamp (draft was restock-triggered)');
  if (!html.includes('email-unsub?t=')) fail('rendered html missing unsubscribe link');
  if (!html.includes("There's a peptide")) fail("rendered html missing campaign payoff line");
  ok('renderCompoundEmail produces expected output');

  // 5. Recipient builder.
  const { buildRecipientList } = await import('../lib/buildRecipientList.js');
  const list = await buildRecipientList();
  if (!Array.isArray(list)) fail('buildRecipientList did not return array');
  const dupes = list.length - new Set(list.map(r => r.email)).size;
  if (dupes !== 0) fail(`recipient list has ${dupes} dupes`);
  ok(`recipient list: ${list.length} unique emails`);

  // 6. Token roundtrip.
  const { signUnsubToken, verifyUnsubToken } = await import('../lib/unsubToken.js');
  const t = signUnsubToken('TestUser@Example.com');
  const v = verifyUnsubToken(t);
  if (v !== 'testuser@example.com') fail(`unsub token roundtrip mismatch: got ${v}`);
  if (verifyUnsubToken(t.slice(0, -2) + 'ff') !== null) fail('tampered token did not return null');
  ok('unsub token sign/verify works');

  // Cleanup.
  await clean();
  ok('cleanup done');

  console.log('\nAll smoke checks passed.');
})().catch(err => fail(err.message || String(err)));
```

- [ ] **Step 20.2: Run the smoke test**

```bash
chmod +x scripts/smoke-compound-email.js
node scripts/smoke-compound-email.js
```

Expected output:

```
✓ compound_marketing has oxytocin with SKU
✓ onStockRise fired (draft_id ...)
✓ onStockRise no-op on non-transition
✓ draft updated with copy fields
✓ renderCompoundEmail produces expected output
✓ recipient list: N unique emails
✓ unsub token sign/verify works
✓ cleanup done

All smoke checks passed.
```

If anything fails, fix the underlying issue. Do not modify the smoke test to make it pass.

- [ ] **Step 20.3: Commit**

```bash
git add scripts/smoke-compound-email.js
git commit -m "compound-email: end-to-end smoke test covering trigger, render, recipients, token"
```

---

## Task 21 · Live test with one recipient

- [ ] **Step 21.1: Insert a single test recipient into subscribers**

In the Supabase SQL editor (use your own email):

```sql
insert into subscribers (email, first_name, source) values ('YOUR_EMAIL@example.com', 'Test', 'smoke') on conflict (email) do nothing;
```

- [ ] **Step 21.2: Temporarily suppress all other subscribers**

Mark all other subscribers as unsubscribed so the next send only hits the test address:

```sql
update subscribers set compound_email_unsubscribed_at = now() where email <> 'YOUR_EMAIL@example.com';
```

Also temporarily clear ambassadors and customer emails from the recipient pool (since they bypass the subscriber column). Easiest: insert all their emails into `compound_email_unsubscribes`:

```sql
insert into compound_email_unsubscribes (email)
  select lower(email) from ambassadors where email is not null and lower(email) <> 'your_email@example.com'
  on conflict (email) do nothing;
insert into compound_email_unsubscribes (email)
  select distinct lower(customer_email) from orders where customer_email is not null and lower(customer_email) <> 'your_email@example.com'
  on conflict (email) do nothing;
```

- [ ] **Step 21.3: Create and send a real draft via the admin UI**

- Open `http://localhost:3000/admin/marketing/email-campaigns`.
- Click `+ New draft`, pick **Oxytocin**.
- Click `Edit` on the draft. Fill in tagline, layman_lead, layman_bridge, bullets, citations.
- Click `Preview` → verify the rendered email matches v5.
- Click `Mark ready`.
- Click `Send now`. Confirm the modal.
- Watch the progress counter — should hit `1 sent / 1 / call 1`.

- [ ] **Step 21.4: Verify inbox**

Check your inbox. Email should arrive within 1 minute. Verify:

- Subject = hook text without quotes
- Layout matches v5 (cream bg, cyan accents, amber stock stamp)
- Unsubscribe link works (click it, see the branded confirmation page)
- After clicking unsubscribe, `subscribers.compound_email_unsubscribed_at` is populated for your email.

- [ ] **Step 21.5: Restore subscribers**

```sql
update subscribers set compound_email_unsubscribed_at = null where source = 'welcome-flow' or source is null;
delete from compound_email_unsubscribes where source_draft_id is null;
```

(Don't restore your own unsubscribed_at; that was a real unsubscribe action.)

- [ ] **Step 21.6: Final commit**

If any small fixes were made during the live test, commit them:

```bash
git add -u
git commit -m "compound-email: fixes from live single-recipient test"
```

If no fixes needed, skip.

---

## Self-review checklist

- [x] **Spec coverage:** Every section of `2026-05-28-compound-spotlight-email-campaigns-design.md` is implemented by at least one task (schema → Task 1; sync → 2; template → 5; restock helper → 8 + 9; recipient pipeline → 7; admin UI → 15-18; send pipeline → 13; resume → 14; unsubscribe → 4; smoke → 20).
- [x] **Type/field consistency:** Field names match across `compound_email_drafts`, the renderer placeholders, the admin form, and the smoke test. `compound_slug`, `compound_name`, `product_url`, `dispatch_no`, `category_label`, `hook`, `tagline`, `layman_lead`, `layman_bridge`, `bullet_1/2/3`, `citations_short`, `show_stock_stamp`, `trigger`, `status` all line up. The `next_dispatch_no()` SQL function is defined in Task 1 and called in Tasks 8 and 11.
- [x] **No placeholders:** Every step has either real code or a concrete command.
- [x] **TDD adaptation:** No test framework — verification uses curl commands per task and one comprehensive smoke script at the end.
- [x] **Commits:** Every task ends in a commit with a `compound-email:` prefix matching the repo's commit-message style.
