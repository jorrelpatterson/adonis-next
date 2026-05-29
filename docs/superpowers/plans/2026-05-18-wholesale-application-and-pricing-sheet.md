# Wholesale Application & Pricing Sheet — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a public `/wholesale` application page (no pricing shown) plus the admin tooling to approve applicants and email them a branded PDF pricing sheet.

**Architecture:** New public Next.js App Router page + form-submission API + approval-email API (fixes the existing broken endpoint) + admin UI tweaks for sheet upload. Pricing sheet itself is a static designed PDF stored in Supabase Storage, manually maintained. Anti-spam via Cloudflare Turnstile with honeypot fallback.

**Tech Stack:** Next.js 14 App Router (JS/JSX, no TS), React 18, Supabase (Postgres + Storage), Resend, Cloudflare Turnstile. Vanilla CSS + inline styles. No test framework configured — all verification is manual (dev server + curl + Supabase dashboard).

**Spec:** [docs/superpowers/specs/2026-05-18-wholesale-application-and-pricing-sheet-design.md](../specs/2026-05-18-wholesale-application-and-pricing-sheet-design.md)

---

## File Structure

**Create:**
- `app/wholesale/page.jsx` — server component shell for the application page
- `app/wholesale/WholesaleForm.jsx` — client component (form state, submit, Turnstile)
- `app/wholesale-terms/page.jsx` — placeholder terms page
- `app/api/wholesale-apply/route.js` — submission API
- `app/api/distributor-approval/route.js` — approval email API (currently missing, called by admin UI)
- `lib/constants/countries.js` — country list constant
- `lib/email-templates/wholesale-approval.js` — HTML composer for approval email
- `lib/email-templates/wholesale-notify.js` — HTML composer for admin-notify email

**Modify:**
- `app/admin/distributors/page.jsx` — add "Current Pricing Sheet" tile, wire send-sheet button to fixed API, add tier-tag disclaimer
- `public/index.html` — add "Wholesale Inquiries" footer link

**Schema (Supabase dashboard, manual SQL):**
- `distributors` table — add `country`, `submitted_at`, `internal_notes` columns
- New storage bucket: `wholesale-sheets` (private)

**Env vars (`.env.local`):**
- `TURNSTILE_SITE_KEY` (public, used in form)
- `TURNSTILE_SECRET_KEY` (server-only)
- `WHOLESALE_NOTIFY_EMAIL` (optional; defaults to `ADMIN_EMAIL` then `jorrelpatterson@gmail.com`)

---

## Conventions

- **No tests** (no framework configured). Verification is manual: dev server + browser + curl + Supabase dashboard. Each task has a `Verify` step.
- **Commits:** small + frequent, lowercase prefix `wholesale:` or `admin:` matching repo style (`a87f7ac admin: fix sidebar/dashboard blank flash...`). Include `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`.
- **Existing patterns to follow:**
  - Resend: see [app/api/ambassador-welcome/route.js](../../../app/api/ambassador-welcome/route.js) — direct fetch to `https://api.resend.com/emails`, `from:'advnce labs <orders@advncelabs.com>'`
  - Admin auth: `requireAdmin(request)` from [lib/requireAdmin.js](../../../lib/requireAdmin.js)
  - Admin Supabase reads/writes: direct REST with anon key (see [app/admin/distributors/page.jsx:8-23](../../../app/admin/distributors/page.jsx#L8-L23))
- **Brand palettes (do not mix):**
  - **Website (and `/wholesale` page):** dark luxe — bg `#050507`, text `#E8E4E0`, muted `#5A5856`, gold `#E8D5B7`, gold2 `#C0B8A0`. Fonts: Outfit (body), Cormorant Garamond (display), JetBrains Mono (mono).
  - **Emails:** cream luxe — bg `#F4F2EE`, dark `#1A1C22`, muted `#7A7D88`, teal `#00A0A8`, orange `#E07C24`. Fonts: Barlow Condensed (display), Cormorant Garamond (body serif), JetBrains Mono (labels), Arial/Helvetica fallback.

---

## Task 1: Schema migration (Supabase dashboard)

**Files:** none code — Supabase dashboard SQL editor

- [ ] **Step 1: Open Supabase SQL editor** at the project dashboard for `NEXT_PUBLIC_SUPABASE_URL`.

- [ ] **Step 2: Verify current `distributors` columns**

Run in SQL editor:

```sql
select column_name, data_type
from information_schema.columns
where table_name = 'distributors'
order by ordinal_position;
```

Note which of `country`, `submitted_at`, `internal_notes` already exist (skip the ALTER for any that do).

- [ ] **Step 3: Add missing columns**

```sql
alter table distributors
  add column if not exists country text,
  add column if not exists submitted_at timestamptz default now(),
  add column if not exists internal_notes text;
```

Expected: `Success. No rows returned.`

- [ ] **Step 4: Create the storage bucket**

In Supabase dashboard → Storage → New bucket:
- Name: `wholesale-sheets`
- Public: **off**
- File size limit: 10 MB (PDFs are small)
- Allowed MIME types: `application/pdf`

- [ ] **Step 5: Verify bucket via SQL**

```sql
select id, name, public from storage.buckets where name = 'wholesale-sheets';
```

Expected: one row, `public = false`.

- [ ] **Step 6: Set bucket RLS (service role only)**

The default policy on a private bucket already requires authenticated access. Confirm via Storage UI → Policies tab: no public-read policy exists.

No commit (this is database-side work).

---

## Task 2: Country constants

**Files:**
- Create: `lib/constants/countries.js`

- [ ] **Step 1: Verify file doesn't exist**

```bash
test -f lib/constants/countries.js && echo "EXISTS — abort" || echo "OK to create"
```

Expected: `OK to create`.

- [ ] **Step 2: Create the country list**

```javascript
// lib/constants/countries.js
// ISO 3166-1 most likely shipping destinations for advnce labs wholesale.
// Covers the US + top 60 international markets. Anything else: buyer picks
// "Other" and free-texts the state/region field.

export const COUNTRIES = [
  'United States',
  'Canada',
  'Mexico',
  'United Kingdom',
  'Ireland',
  'Germany',
  'France',
  'Spain',
  'Portugal',
  'Italy',
  'Netherlands',
  'Belgium',
  'Switzerland',
  'Austria',
  'Sweden',
  'Norway',
  'Denmark',
  'Finland',
  'Iceland',
  'Poland',
  'Czech Republic',
  'Hungary',
  'Romania',
  'Greece',
  'Cyprus',
  'Malta',
  'Bulgaria',
  'Croatia',
  'Slovenia',
  'Slovakia',
  'Estonia',
  'Latvia',
  'Lithuania',
  'Luxembourg',
  'Turkey',
  'Israel',
  'United Arab Emirates',
  'Saudi Arabia',
  'Qatar',
  'Kuwait',
  'Bahrain',
  'Oman',
  'South Africa',
  'Egypt',
  'Morocco',
  'Nigeria',
  'Kenya',
  'India',
  'Pakistan',
  'Singapore',
  'Malaysia',
  'Thailand',
  'Indonesia',
  'Philippines',
  'Vietnam',
  'Hong Kong',
  'Taiwan',
  'South Korea',
  'Japan',
  'Australia',
  'New Zealand',
  'Brazil',
  'Argentina',
  'Chile',
  'Colombia',
  'Peru',
  'Uruguay',
  'Costa Rica',
  'Panama',
  'Dominican Republic',
  'Other',
];
```

- [ ] **Step 3: Verify import path works**

```bash
node -e "const {COUNTRIES} = require('./lib/constants/countries.js'); console.log(COUNTRIES.length, COUNTRIES[0], COUNTRIES.at(-1));"
```

Expected: `70 United States Other` (or similar count). If you get an ESM error, the file is fine — the existing repo uses native ESM via Next.js; the runtime test is the dev server check in later tasks.

- [ ] **Step 4: Commit**

```bash
git add lib/constants/countries.js
git commit -m "$(cat <<'EOF'
wholesale: add country list constant for application form

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Wholesale terms placeholder page

**Files:**
- Create: `app/wholesale-terms/page.jsx`

- [ ] **Step 1: Verify URL currently 404s**

```bash
npm run dev &
sleep 6
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/wholesale-terms
```

Expected: `404`. Leave dev server running.

- [ ] **Step 2: Create the page**

```jsx
// app/wholesale-terms/page.jsx
export const metadata = {
  title: 'Wholesale Terms — advnce labs',
};

export default function WholesaleTerms() {
  return (
    <>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=JetBrains+Mono:wght@400;500&display=swap"
      />
      <div
        style={{
          minHeight: '100vh',
          background: '#050507',
          color: '#E8E4E0',
          fontFamily: "'Outfit', sans-serif",
          padding: '80px 24px',
        }}
      >
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <div
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontStyle: 'italic',
              fontWeight: 300,
              fontSize: 28,
              color: '#E8D5B7',
              letterSpacing: '0.1em',
              marginBottom: 8,
            }}
          >
            advnce labs
          </div>
          <div
            style={{
              fontSize: 10,
              letterSpacing: 3,
              textTransform: 'uppercase',
              color: '#5A5856',
              marginBottom: 48,
            }}
          >
            Wholesale Terms
          </div>

          <p style={{ fontSize: 14, lineHeight: 1.8, color: '#E8E4E0', marginBottom: 24 }}>
            Wholesale terms are being finalized. For current terms please email{' '}
            <a href="mailto:wholesale@advncelabs.com" style={{ color: '#E8D5B7' }}>
              wholesale@advncelabs.com
            </a>
            .
          </p>

          <p style={{ fontSize: 12, lineHeight: 1.7, color: '#5A5856', marginTop: 48 }}>
            By submitting a wholesale application, you confirm all products purchased are for
            research or professional use only and will not be administered without appropriate
            licensure. Lead time on wholesale orders is 7–14 business days from confirmed order.
            Minimum order is 10 units per SKU.
          </p>

          <div style={{ marginTop: 64 }}>
            <a
              href="/wholesale"
              style={{
                color: '#E8D5B7',
                fontSize: 11,
                letterSpacing: 2,
                textTransform: 'uppercase',
                textDecoration: 'none',
                borderBottom: '1px solid rgba(232,213,183,0.3)',
                paddingBottom: 2,
              }}
            >
              ← Back to application
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 3: Verify the page renders**

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/wholesale-terms
```

Expected: `200`. Open `http://localhost:3000/wholesale-terms` in a browser — confirm: near-black background, gold italic "advnce labs" wordmark, placeholder copy visible, "← Back to application" link at bottom.

- [ ] **Step 4: Commit**

```bash
git add app/wholesale-terms/page.jsx
git commit -m "$(cat <<'EOF'
wholesale: add /wholesale-terms placeholder page

Linked from the application checkbox. Real terms pending legal review.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Wholesale application page UI (no submission yet)

**Files:**
- Create: `app/wholesale/page.jsx` (server shell)
- Create: `app/wholesale/WholesaleForm.jsx` (client component)

- [ ] **Step 1: Verify URL currently 404s**

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/wholesale
```

Expected: `404`.

- [ ] **Step 2: Create the server shell**

```jsx
// app/wholesale/page.jsx
import WholesaleForm from './WholesaleForm';

export const metadata = {
  title: 'Wholesale — advnce labs',
  description: 'Wholesale inquiry for advnce labs.',
};

export default function WholesalePage() {
  return (
    <>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=JetBrains+Mono:wght@400;500&display=swap"
      />
      <div
        style={{
          minHeight: '100vh',
          background: '#050507',
          color: '#E8E4E0',
          fontFamily: "'Outfit', sans-serif",
          padding: '64px 24px',
        }}
      >
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <header style={{ marginBottom: 40, textAlign: 'center' }}>
            <div
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontStyle: 'italic',
                fontWeight: 300,
                fontSize: 28,
                color: '#E8D5B7',
                letterSpacing: '0.1em',
                marginBottom: 8,
              }}
            >
              advnce labs
            </div>
            <div
              style={{
                fontSize: 10,
                letterSpacing: 3,
                textTransform: 'uppercase',
                color: '#5A5856',
              }}
            >
              Wholesale Inquiry
            </div>
          </header>

          <p
            style={{
              fontSize: 13,
              lineHeight: 1.8,
              color: '#9C9A94',
              marginBottom: 40,
              textAlign: 'center',
            }}
          >
            Tell us about your business. We review applications within 1–2 business days. If
            approved, you'll receive your login code and current pricing sheet by email.
          </p>

          <WholesaleForm
            turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''}
          />

          <footer
            style={{
              marginTop: 48,
              paddingTop: 24,
              borderTop: '1px solid rgba(232,213,183,0.1)',
              fontSize: 10,
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: '#5A5856',
              textAlign: 'center',
              lineHeight: 2,
            }}
          >
            Lead time 7–14 business days · Minimum order 10 units per SKU
          </footer>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 3: Create the client form component**

```jsx
// app/wholesale/WholesaleForm.jsx
'use client';
import { useState } from 'react';
import { COUNTRIES } from '../../lib/constants/countries';

const VOLUMES = ['10–99', '100–499', '500–999', '1000+'];

const labelStyle = {
  fontSize: 10,
  letterSpacing: 2,
  textTransform: 'uppercase',
  color: '#9C9A94',
  marginBottom: 6,
  display: 'block',
};

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  background: '#0F1117',
  border: '1px solid rgba(232,213,183,0.15)',
  borderRadius: 4,
  color: '#E8E4E0',
  fontSize: 13,
  fontFamily: "'Outfit', sans-serif",
  outline: 'none',
};

export default function WholesaleForm({ turnstileSiteKey }) {
  const [form, setForm] = useState({
    business_name: '',
    contact_name: '',
    phone: '',
    email: '',
    country: 'United States',
    state: '',
    expected_volume: '',
    research_use_only: false,
    agree_terms: false,
    // honeypot — bots fill it, humans don't see it
    website_url_hp: '',
  });

  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        // Wired up in Task 7 — for now this is UI-only.
      }}
      style={{ display: 'grid', gap: 18 }}
    >
      {/* honeypot: visually hidden but present in DOM */}
      <input
        type="text"
        name="website_url_hp"
        value={form.website_url_hp}
        onChange={(e) => update('website_url_hp', e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        style={{
          position: 'absolute',
          left: -9999,
          width: 1,
          height: 1,
          opacity: 0,
        }}
        aria-hidden="true"
      />

      <div>
        <label style={labelStyle}>
          <span style={{ color: '#E07C24' }}>* </span>Business name
        </label>
        <input
          type="text"
          required
          value={form.business_name}
          onChange={(e) => update('business_name', e.target.value)}
          style={inputStyle}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle}>
            <span style={{ color: '#E07C24' }}>* </span>Contact name
          </label>
          <input
            type="text"
            required
            value={form.contact_name}
            onChange={(e) => update('contact_name', e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>
            <span style={{ color: '#E07C24' }}>* </span>Phone
          </label>
          <input
            type="tel"
            required
            value={form.phone}
            onChange={(e) => update('phone', e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>

      <div>
        <label style={labelStyle}>
          <span style={{ color: '#E07C24' }}>* </span>Email
        </label>
        <input
          type="email"
          required
          value={form.email}
          onChange={(e) => update('email', e.target.value)}
          style={inputStyle}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle}>
            <span style={{ color: '#E07C24' }}>* </span>Country
          </label>
          <select
            required
            value={form.country}
            onChange={(e) => update('country', e.target.value)}
            style={inputStyle}
          >
            {COUNTRIES.map((c) => (
              <option key={c} value={c} style={{ background: '#0F1117' }}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>
            <span style={{ color: '#E07C24' }}>* </span>State / Province
          </label>
          <input
            type="text"
            required
            value={form.state}
            onChange={(e) => update('state', e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>

      <div>
        <label style={labelStyle}>
          <span style={{ color: '#E07C24' }}>* </span>Expected monthly volume (vials)
        </label>
        <div style={{ display: 'flex', gap: 6 }}>
          {VOLUMES.map((v) => {
            const selected = form.expected_volume === v;
            return (
              <button
                key={v}
                type="button"
                onClick={() => update('expected_volume', v)}
                style={{
                  flex: 1,
                  padding: '10px 6px',
                  background: selected ? 'rgba(232,213,183,0.08)' : '#0F1117',
                  border: selected
                    ? '1px solid #E8D5B7'
                    : '1px solid rgba(232,213,183,0.15)',
                  borderRadius: 4,
                  color: selected ? '#E8D5B7' : '#9C9A94',
                  fontSize: 11,
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: 1,
                  cursor: 'pointer',
                }}
              >
                {v}
              </button>
            );
          })}
        </div>
      </div>

      <label
        style={{
          display: 'flex',
          gap: 12,
          padding: '12px 14px',
          background: 'rgba(224,124,36,0.04)',
          border: '1px solid rgba(224,124,36,0.15)',
          borderRadius: 4,
          fontSize: 12,
          lineHeight: 1.55,
          color: '#E8E4E0',
          cursor: 'pointer',
        }}
      >
        <input
          type="checkbox"
          required
          checked={form.research_use_only}
          onChange={(e) => update('research_use_only', e.target.checked)}
          style={{ marginTop: 2, accentColor: '#E07C24' }}
        />
        <span>
          <span style={{ color: '#E07C24' }}>* </span>I confirm products purchased are for
          research or professional use only.
        </span>
      </label>

      <label
        style={{
          display: 'flex',
          gap: 12,
          padding: '12px 14px',
          background: 'rgba(232,213,183,0.04)',
          border: '1px solid rgba(232,213,183,0.15)',
          borderRadius: 4,
          fontSize: 12,
          lineHeight: 1.55,
          color: '#E8E4E0',
          cursor: 'pointer',
        }}
      >
        <input
          type="checkbox"
          required
          checked={form.agree_terms}
          onChange={(e) => update('agree_terms', e.target.checked)}
          style={{ marginTop: 2, accentColor: '#E8D5B7' }}
        />
        <span>
          <span style={{ color: '#E07C24' }}>* </span>I agree to advnce labs'{' '}
          <a href="/wholesale-terms" style={{ color: '#E8D5B7' }}>
            wholesale terms
          </a>
          .
        </span>
      </label>

      {/* Turnstile placeholder — Task 6 fills this */}
      {turnstileSiteKey ? (
        <div data-turnstile-placeholder style={{ minHeight: 65 }} />
      ) : null}

      <button
        type="submit"
        style={{
          marginTop: 12,
          padding: '14px 24px',
          background: '#E8D5B7',
          color: '#050507',
          border: 'none',
          borderRadius: 4,
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: 2,
          textTransform: 'uppercase',
          fontFamily: "'Outfit', sans-serif",
          cursor: 'pointer',
        }}
      >
        Submit Application
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Verify the page renders**

Hard-refresh `http://localhost:3000/wholesale` in a browser. Confirm:
- Near-black background, gold italic "advnce labs" wordmark
- Form fields with labels in uppercase tiny caps
- Country dropdown contains "United States" first and "Other" last
- Volume row shows 4 buttons: `10–99 · 100–499 · 500–999 · 1000+`
- Two checkboxes (one orange-tinted, one gold-tinted)
- Footer text: "Lead time 7–14 business days · Minimum order 10 units per SKU"
- Submit button is gold

- [ ] **Step 5: Confirm submission does nothing yet**

Click "Submit Application" with the form filled in — page should not navigate, no network request (we'll wire it in Task 7).

- [ ] **Step 6: Commit**

```bash
git add app/wholesale/page.jsx app/wholesale/WholesaleForm.jsx
git commit -m "$(cat <<'EOF'
wholesale: add public /wholesale application page UI

Dark luxe identity matching advncelabs.com. 7 fields + 2 checkboxes,
honeypot for spam. Submit handler is a no-op for now — wired in a
later commit.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Submission API (no Turnstile yet)

**Files:**
- Create: `app/api/wholesale-apply/route.js`
- Create: `lib/email-templates/wholesale-notify.js`

- [ ] **Step 1: Create the admin-notification email composer**

```javascript
// lib/email-templates/wholesale-notify.js
// Plain admin notification — simple HTML, no fancy branding needed.
// (Public-facing emails get the cream-luxe template; admin only needs facts.)

export function wholesaleNotifyHtml(application) {
  const rows = [
    ['Business', application.business_name],
    ['Contact', application.contact_name],
    ['Phone', application.phone],
    ['Email', application.email],
    ['Country', application.country],
    ['State / Province', application.state],
    ['Expected monthly volume', application.expected_volume],
    ['Submitted at', new Date().toISOString()],
  ];

  const rowsHtml = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 14px 6px 0;color:#7A7D88;font-size:12px;letter-spacing:1px;text-transform:uppercase;vertical-align:top;white-space:nowrap">${k}</td><td style="padding:6px 0;color:#1A1C22;font-size:14px">${escapeHtml(v || '—')}</td></tr>`
    )
    .join('');

  return `<html><body style="margin:0;padding:24px;background:#F4F2EE;font-family:Arial,Helvetica,sans-serif;color:#1A1C22">
  <div style="max-width:560px;margin:0 auto">
    <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#7A7D88;letter-spacing:3px;text-transform:uppercase;margin-bottom:8px">New wholesale inquiry</div>
    <h1 style="margin:0 0 24px;font-size:22px;font-weight:700;color:#1A1C22">${escapeHtml(application.business_name)}</h1>
    <table style="border-collapse:collapse;width:100%">${rowsHtml}</table>
    <p style="margin-top:32px;font-size:12px;color:#7A7D88">Review in the admin: <a href="https://advncelabs.com/admin/distributors" style="color:#00A0A8">/admin/distributors</a></p>
  </div>
</body></html>`;
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
```

- [ ] **Step 2: Create the submission API route**

```javascript
// app/api/wholesale-apply/route.js
import { NextResponse } from 'next/server';
import { wholesaleNotifyHtml } from '../../../lib/email-templates/wholesale-notify';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const RESEND = process.env.RESEND_API_KEY;
const NOTIFY =
  process.env.WHOLESALE_NOTIFY_EMAIL ||
  process.env.ADMIN_EMAIL ||
  'jorrelpatterson@gmail.com';

const VALID_VOLUMES = new Set(['10–99', '100–499', '500–999', '1000+']);

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Honeypot — if filled, silently succeed (don't tell the bot).
  if (body.website_url_hp && body.website_url_hp.length > 0) {
    return NextResponse.json({ success: true });
  }

  // Required field validation
  const required = ['business_name', 'contact_name', 'phone', 'email', 'country', 'state', 'expected_volume'];
  for (const f of required) {
    if (!body[f] || String(body[f]).trim() === '') {
      return NextResponse.json({ error: `Missing field: ${f}` }, { status: 400 });
    }
  }

  if (!VALID_VOLUMES.has(body.expected_volume)) {
    return NextResponse.json({ error: 'Invalid expected_volume' }, { status: 400 });
  }

  if (!body.research_use_only || !body.agree_terms) {
    return NextResponse.json({ error: 'Must accept both checkboxes' }, { status: 400 });
  }

  // Basic email shape
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }

  // Turnstile verification — wired in Task 6. For now: skip if no secret.
  // (The check stays here so Task 6 only adds the verification call.)

  const row = {
    business_name: body.business_name.trim(),
    contact_name: body.contact_name.trim(),
    phone: body.phone.trim(),
    email: body.email.trim().toLowerCase(),
    country: body.country.trim(),
    market: body.state.trim(), // existing column reused for region/state
    expected_volume: body.expected_volume,
    status: 'pending',
    submitted_at: new Date().toISOString(),
  };

  // Insert into Supabase
  const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/distributors`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(row),
  });

  if (!insertRes.ok) {
    const err = await insertRes.text();
    console.error('wholesale-apply insert failed:', err);
    return NextResponse.json({ error: 'Could not save application' }, { status: 500 });
  }

  // Notify admin (best-effort — don't block success on email failure)
  if (RESEND) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${RESEND}`,
        },
        body: JSON.stringify({
          from: 'advnce labs <orders@advncelabs.com>',
          to: NOTIFY,
          subject: `New wholesale inquiry — ${row.business_name}`,
          html: wholesaleNotifyHtml(row),
        }),
      });
    } catch (e) {
      console.error('wholesale-apply notify failed:', e);
    }
  }

  return NextResponse.json({ success: true });
}

export async function GET() {
  return NextResponse.json({ status: 'wholesale-apply route is live' });
}
```

- [ ] **Step 3: Verify the route is alive**

```bash
curl -s http://localhost:3000/api/wholesale-apply
```

Expected: `{"status":"wholesale-apply route is live"}`

- [ ] **Step 4: Test a valid submission via curl**

```bash
curl -sX POST http://localhost:3000/api/wholesale-apply \
  -H "Content-Type: application/json" \
  -d '{"business_name":"Test Wholesale Co","contact_name":"Test Person","phone":"5551234567","email":"test+wholesale@example.com","country":"United States","state":"CA","expected_volume":"100–499","research_use_only":true,"agree_terms":true}'
```

Expected: `{"success":true}`

- [ ] **Step 5: Verify row exists in Supabase**

In Supabase dashboard → Table Editor → `distributors`. Find the row where `email = 'test+wholesale@example.com'`. Confirm:
- `status = 'pending'`
- `country = 'United States'`
- `expected_volume = '100–499'`
- `market = 'CA'`
- `submitted_at` is set

- [ ] **Step 6: Test missing-field rejection**

```bash
curl -sX POST http://localhost:3000/api/wholesale-apply \
  -H "Content-Type: application/json" \
  -d '{"business_name":"Bad","email":"x@y.z"}' \
  -w "\nHTTP %{http_code}\n"
```

Expected: `{"error":"Missing field: contact_name"}` and HTTP 400.

- [ ] **Step 7: Test honeypot silent-success**

```bash
curl -sX POST http://localhost:3000/api/wholesale-apply \
  -H "Content-Type: application/json" \
  -d '{"website_url_hp":"spam","business_name":"Spam","email":"spam@spam.com"}'
```

Expected: `{"success":true}` AND no new row in Supabase (verify dashboard).

- [ ] **Step 8: Clean up test rows**

In Supabase SQL editor:

```sql
delete from distributors where email = 'test+wholesale@example.com';
```

- [ ] **Step 9: Commit**

```bash
git add app/api/wholesale-apply/route.js lib/email-templates/wholesale-notify.js
git commit -m "$(cat <<'EOF'
wholesale: add /api/wholesale-apply submission route + admin notify

Inserts pending application into distributors, sends admin a Resend
notification. Honeypot blocks bots silently. Turnstile verification
wired in a follow-up commit.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Cloudflare Turnstile integration

**Files:**
- Modify: `app/wholesale/WholesaleForm.jsx`
- Modify: `app/api/wholesale-apply/route.js`

- [ ] **Step 1: Add Turnstile env vars to `.env.local`**

If keys haven't been provisioned yet, get them from https://dash.cloudflare.com/?to=/:account/turnstile (free tier). Add to `.env.local`:

```
NEXT_PUBLIC_TURNSTILE_SITE_KEY=<site key>
TURNSTILE_SECRET_KEY=<secret key>
```

If you want to defer Turnstile setup, leave both env vars unset — the code in steps 2-3 falls back to honeypot-only and the form still works.

Restart dev server: kill the existing process, then `npm run dev`.

- [ ] **Step 2: Add Turnstile widget to the client form**

In `app/wholesale/WholesaleForm.jsx`, replace the placeholder block:

```jsx
      {/* Turnstile placeholder — Task 6 fills this */}
      {turnstileSiteKey ? (
        <div data-turnstile-placeholder style={{ minHeight: 65 }} />
      ) : null}
```

with:

```jsx
      {turnstileSiteKey ? (
        <div
          ref={(el) => {
            if (!el || el.dataset.rendered) return;
            el.dataset.rendered = '1';
            const script = document.createElement('script');
            script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
            script.async = true;
            script.defer = true;
            script.onload = () => {
              window.turnstile?.render(el, {
                sitekey: turnstileSiteKey,
                callback: (token) => setTurnstileToken(token),
                'expired-callback': () => setTurnstileToken(''),
                'error-callback': () => setTurnstileToken(''),
              });
            };
            document.head.appendChild(script);
          }}
          style={{ minHeight: 65, display: 'flex', justifyContent: 'center' }}
        />
      ) : null}
```

Add `turnstileToken` state near the top of the component, just below the existing `useState`:

```jsx
  const [turnstileToken, setTurnstileToken] = useState('');
```

(Form state and submit-wiring stay on the no-op handler until Task 7.)

- [ ] **Step 3: Add server-side Turnstile verification**

In `app/api/wholesale-apply/route.js`, find the comment `// Turnstile verification — wired in Task 6.` and replace its block with:

```javascript
  // Turnstile verification (only if secret configured)
  const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY;
  if (TURNSTILE_SECRET) {
    if (!body.turnstile_token) {
      return NextResponse.json({ error: 'Missing Turnstile token' }, { status: 400 });
    }
    const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: TURNSTILE_SECRET,
        response: body.turnstile_token,
      }),
    });
    const result = await verify.json();
    if (!result.success) {
      return NextResponse.json({ error: 'Turnstile verification failed' }, { status: 400 });
    }
  }
```

- [ ] **Step 4: Verify the form still loads in a browser**

Refresh `http://localhost:3000/wholesale`. If `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is set, you should see the Turnstile widget appear under the checkboxes. If not, no widget — form is unchanged.

- [ ] **Step 5: Verify the API still works without Turnstile (no secret set)**

If you skipped Step 1's env setup:

```bash
curl -sX POST http://localhost:3000/api/wholesale-apply \
  -H "Content-Type: application/json" \
  -d '{"business_name":"Test 2","contact_name":"T P","phone":"5550000000","email":"test2@example.com","country":"United States","state":"CA","expected_volume":"10–99","research_use_only":true,"agree_terms":true}'
```

Expected: `{"success":true}`. Then clean up: `delete from distributors where email = 'test2@example.com';`

- [ ] **Step 6: Verify the API rejects missing token when Turnstile IS set**

Only if `TURNSTILE_SECRET_KEY` is set in env:

```bash
curl -sX POST http://localhost:3000/api/wholesale-apply \
  -H "Content-Type: application/json" \
  -d '{"business_name":"Test 3","contact_name":"T P","phone":"5550000000","email":"test3@example.com","country":"United States","state":"CA","expected_volume":"10–99","research_use_only":true,"agree_terms":true}' \
  -w "\nHTTP %{http_code}\n"
```

Expected: `{"error":"Missing Turnstile token"}` and HTTP 400.

- [ ] **Step 7: Commit**

```bash
git add app/wholesale/WholesaleForm.jsx app/api/wholesale-apply/route.js
git commit -m "$(cat <<'EOF'
wholesale: add Cloudflare Turnstile anti-spam

Optional — falls back to honeypot-only if env vars unset.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Wire form to API + confirmation screen

**Files:**
- Modify: `app/wholesale/WholesaleForm.jsx`

- [ ] **Step 1: Replace the no-op submit with a real handler**

In `app/wholesale/WholesaleForm.jsx`, near the top of the component (after the existing `useState` for `form` and `turnstileToken`), add:

```jsx
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
```

Replace the `onSubmit` handler:

```jsx
      onSubmit={(e) => {
        e.preventDefault();
        // Wired up in Task 7 — for now this is UI-only.
      }}
```

with:

```jsx
      onSubmit={async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
          const res = await fetch('/api/wholesale-apply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form, turnstile_token: turnstileToken }),
          });
          const data = await res.json();
          if (!res.ok) {
            setError(data.error || 'Submission failed. Please try again.');
            setSubmitting(false);
            return;
          }
          setSubmitted(true);
        } catch (err) {
          setError('Network error. Please try again.');
          setSubmitting(false);
        }
      }}
```

- [ ] **Step 2: Render the success screen when `submitted === true`**

At the top of the `return` block (immediately inside the component's return), wrap the existing form with a conditional. Replace:

```jsx
  return (
    <form
```

with:

```jsx
  if (submitted) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '40px 20px',
          background: 'rgba(232,213,183,0.04)',
          border: '1px solid rgba(232,213,183,0.15)',
          borderRadius: 4,
        }}
      >
        <div
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontStyle: 'italic',
            fontSize: 32,
            color: '#E8D5B7',
            marginBottom: 16,
          }}
        >
          Thank you.
        </div>
        <p style={{ fontSize: 13, lineHeight: 1.8, color: '#9C9A94', maxWidth: 420, margin: '0 auto' }}>
          Your application is in. We review wholesale inquiries within 1–2 business days. If
          approved, you'll receive your login code and current pricing sheet by email.
        </p>
      </div>
    );
  }

  return (
    <form
```

- [ ] **Step 3: Show error message above the submit button**

Find the existing submit button (`<button type="submit">Submit Application</button>`) and immediately before it, add:

```jsx
      {error ? (
        <div
          style={{
            padding: '10px 14px',
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 4,
            color: '#EF4444',
            fontSize: 12,
            lineHeight: 1.5,
          }}
        >
          {error}
        </div>
      ) : null}
```

And update the submit button to show progress + disable while submitting. Replace:

```jsx
      <button
        type="submit"
        style={{
          marginTop: 12,
```

with:

```jsx
      <button
        type="submit"
        disabled={submitting}
        style={{
          marginTop: 12,
          opacity: submitting ? 0.5 : 1,
```

And in the button text replace `Submit Application` with `{submitting ? 'Submitting...' : 'Submit Application'}`.

- [ ] **Step 4: Verify end-to-end submission from the browser**

In the browser:
1. Refresh `http://localhost:3000/wholesale`
2. Fill all fields with valid test data (use `e2e-test@example.com` as the email)
3. Click both checkboxes
4. If Turnstile is configured, complete it
5. Click **Submit Application**
6. Confirm:
   - Button text changes to "Submitting..."
   - Page replaces the form with "Thank you." confirmation
7. In Supabase dashboard, verify a row exists with `email = 'e2e-test@example.com'` and `status = 'pending'`.
8. In your inbox (or check Resend logs), verify the admin-notify email arrived if `RESEND_API_KEY` is configured.

- [ ] **Step 5: Verify error path**

Stop the dev server (Ctrl+C), then submit from the still-open form. Confirm:
- Error message appears in red: "Network error. Please try again."
- Button re-enables.

Restart dev server: `npm run dev`.

- [ ] **Step 6: Clean up test row**

```sql
delete from distributors where email = 'e2e-test@example.com';
```

- [ ] **Step 7: Commit**

```bash
git add app/wholesale/WholesaleForm.jsx
git commit -m "$(cat <<'EOF'
wholesale: wire application form to submission API

Adds submitting/error state, confirmation screen on success.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Approval email API (fixes existing broken endpoint)

**Files:**
- Create: `app/api/distributor-approval/route.js`
- Create: `lib/email-templates/wholesale-approval.js`

- [ ] **Step 1: Confirm the endpoint is currently 404 / 405**

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/distributor-approval
```

Expected: `404` (or 405 if a stub exists). Either way, the admin's "Resend Approval Email" button is broken until we create this route.

- [ ] **Step 2: Create the approval-email HTML composer**

```javascript
// lib/email-templates/wholesale-approval.js
// Cream-luxe email matching ambassador-welcome's visual identity.

export function wholesaleApprovalHtml({ business_name, contact_name, login_code }) {
  const firstName = (contact_name || '').split(' ')[0] || 'there';
  const logo =
    '<svg viewBox="0 0 48 28" width="36" height="21" fill="none" style="vertical-align:middle;display:inline-block"><path d="M2 24L8 19L14 22L20 14L26 17L32 9L38 12L46 3" stroke="#00A0A8" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/><circle cx="32" cy="9" r="2" fill="#00A0A8"/><circle cx="38" cy="12" r="2" fill="#E07C24"/><circle cx="46" cy="3" r="2.5" fill="#E07C24"/></svg>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;500;700;900&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <title>Welcome to advnce labs Wholesale</title>
</head>
<body style="margin:0;padding:0;background:#E8E6E2;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px">

    <div style="background:#F4F2EE;border-bottom:1px solid #E4E7EC;padding:20px 32px;border-radius:6px 6px 0 0;display:flex;align-items:center;gap:10px">
      ${logo}
      <span style="font-family:'Barlow Condensed',Arial,sans-serif;font-size:15px;font-weight:300;letter-spacing:3px;color:#1A1C22;text-transform:lowercase">advnce <span style="color:#7A7D88;font-weight:300">labs</span></span>
    </div>

    <div style="background:#F4F2EE;padding:44px 40px">

      <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#7A7D88;letter-spacing:4px;text-transform:uppercase;margin-bottom:12px">Wholesale program</div>
      <h1 style="font-family:'Barlow Condensed',Arial,sans-serif;font-size:40px;font-weight:900;color:#1A1C22;line-height:1.02;letter-spacing:-0.5px;text-transform:uppercase;margin:0 0 20px">You're approved.<br><span style="color:#00A0A8">Let's build.</span></h1>

      <p style="font-family:'Cormorant Garamond',Georgia,serif;font-size:18px;font-weight:300;color:#1A1C22;line-height:1.65;margin:0 0 26px">${escapeHtml(firstName)} &mdash; welcome to advnce labs wholesale. Your current pricing sheet is attached to this email. Reference it any time you're placing an order &mdash; pricing is per-SKU based on quantity ordered.</p>

      <div style="border:1px solid #E4E7EC;background:#FAFBFC;border-radius:4px;padding:16px 20px;margin-bottom:10px">
        <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#7A7D88;letter-spacing:4px;text-transform:uppercase;margin-bottom:8px">Your wholesale login code</div>
        <div style="font-family:'Barlow Condensed',Arial,sans-serif;font-size:28px;font-weight:900;color:#00A0A8;letter-spacing:4px;line-height:1">${escapeHtml(login_code || '—')}</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#7A7D88;letter-spacing:1px;margin-top:8px">Save this. You'll use it when the wholesale portal launches.</div>
      </div>

      <div style="height:1px;background:#E4E7EC;margin:30px 0"></div>

      <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#7A7D88;letter-spacing:3px;text-transform:uppercase;margin-bottom:14px">How to order today</div>
      <table style="width:100%;border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1A1C22;line-height:1.55">
        <tr><td style="padding:2px 12px 10px 0;vertical-align:top;font-family:'JetBrains Mono',monospace;font-size:10px;color:#00A0A8;letter-spacing:2px;width:32px">01</td><td style="padding:2px 0 10px">Pick what you need + quantities from the attached sheet.</td></tr>
        <tr><td style="padding:2px 12px 10px 0;vertical-align:top;font-family:'JetBrains Mono',monospace;font-size:10px;color:#00A0A8;letter-spacing:2px">02</td><td style="padding:2px 0 10px">Reply to this email with your order &mdash; we'll send an invoice for payment.</td></tr>
        <tr><td style="padding:2px 12px 0 0;vertical-align:top;font-family:'JetBrains Mono',monospace;font-size:10px;color:#00A0A8;letter-spacing:2px">03</td><td style="padding:2px 0">Once paid, your order ships in <strong style="color:#00A0A8">7&ndash;14 business days</strong>.</td></tr>
      </table>

      <div style="height:1px;background:#E4E7EC;margin:30px 0"></div>

      <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#7A7D88;letter-spacing:3px;text-transform:uppercase;margin-bottom:14px">House rules</div>
      <ul style="margin:0;padding-left:18px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1A1C22;line-height:1.8">
        <li>Minimum order: 10 units per SKU. No exceptions.</li>
        <li>All products for research / professional use only. Not for human consumption.</li>
        <li>Pricing on the attached sheet supersedes any prior pricing.</li>
      </ul>

      <div style="height:1px;background:#E4E7EC;margin:30px 0"></div>

      <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#7A7D88;line-height:1.8;margin:18px 0 0">Questions? Reply to this email or hit <a href="mailto:wholesale@advncelabs.com" style="color:#00A0A8">wholesale@advncelabs.com</a>.<br><br>&mdash; Jorrel<br>advnce labs</p>

    </div>

    <div style="background:#1A1C22;padding:20px 32px;border-radius:0 0 6px 6px;text-align:center">
      <p style="font-family:'JetBrains Mono',monospace;font-size:9px;color:rgba(244,242,238,0.35);letter-spacing:1.5px;line-height:2.2;margin:0;text-transform:uppercase">advncelabs.com &middot; wholesale@advncelabs.com<br>All products for research use only &middot; Not for human consumption &middot; Not evaluated by the FDA</p>
    </div>

  </div>
</body>
</html>`;
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
```

- [ ] **Step 3: Create the approval API route**

```javascript
// app/api/distributor-approval/route.js
import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../lib/requireAdmin';
import { wholesaleApprovalHtml } from '../../../lib/email-templates/wholesale-approval';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const RESEND = process.env.RESEND_API_KEY;
const SHEET_FILENAME = 'advncelabs-wholesale-current.pdf';

export async function POST(request) {
  const unauth = requireAdmin(request);
  if (unauth) return unauth;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Accept either { distributor: {...} } (existing admin payload)
  // or { distributor_id } (cleaner contract).
  let dist = body.distributor;
  if (!dist && body.distributor_id) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/distributors?id=eq.${encodeURIComponent(body.distributor_id)}&select=*`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
    );
    const rows = await res.json();
    dist = Array.isArray(rows) ? rows[0] : null;
  }

  if (!dist || !dist.email) {
    return NextResponse.json({ error: 'Distributor not found or missing email' }, { status: 400 });
  }

  if (!RESEND) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
  }

  // Download the current pricing sheet from Supabase Storage
  const sheetRes = await fetch(
    `${SUPABASE_URL}/storage/v1/object/wholesale-sheets/current.pdf`,
    { headers: { Authorization: `Bearer ${SERVICE_KEY}` } }
  );

  if (!sheetRes.ok) {
    return NextResponse.json(
      { error: 'No active pricing sheet uploaded. Upload one in the admin.' },
      { status: 400 }
    );
  }

  const sheetBuf = Buffer.from(await sheetRes.arrayBuffer());
  const sheetBase64 = sheetBuf.toString('base64');

  const html = wholesaleApprovalHtml({
    business_name: dist.business_name,
    contact_name: dist.contact_name,
    login_code: dist.login_code,
  });

  const sendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND}`,
    },
    body: JSON.stringify({
      from: 'advnce labs <orders@advncelabs.com>',
      to: dist.email,
      subject: 'Welcome to advnce labs Wholesale — your pricing sheet inside',
      html,
      attachments: [
        {
          filename: SHEET_FILENAME,
          content: sheetBase64,
        },
      ],
    }),
  });

  if (!sendRes.ok) {
    const err = await sendRes.json().catch(() => ({}));
    console.error('distributor-approval Resend error:', err);
    return NextResponse.json({ error: 'Email send failed', detail: err }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function GET() {
  return NextResponse.json({ status: 'distributor-approval route is live' });
}
```

- [ ] **Step 4: Verify the route is alive**

```bash
curl -s http://localhost:3000/api/distributor-approval
```

Expected: `{"status":"distributor-approval route is live"}`

- [ ] **Step 5: Verify unauthenticated POST is 401**

```bash
curl -sX POST http://localhost:3000/api/distributor-approval \
  -H "Content-Type: application/json" \
  -d '{}' \
  -w "\nHTTP %{http_code}\n"
```

Expected: `{"error":"Unauthorized"}` and HTTP 401.

(End-to-end verification requires an uploaded pricing sheet — happens in Task 9.)

- [ ] **Step 6: Commit**

```bash
git add app/api/distributor-approval/route.js lib/email-templates/wholesale-approval.js
git commit -m "$(cat <<'EOF'
wholesale: implement /api/distributor-approval to send sheet

Fixes the existing admin button that was calling a missing endpoint.
Requires admin auth. Looks up current sheet from Supabase Storage and
attaches to a branded Resend email.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Admin pricing-sheet upload tile

**Files:**
- Modify: `app/admin/distributors/page.jsx`

This adds a tile at the top of the admin distributors page showing the current sheet and providing an upload button. Uses Supabase Storage REST directly (matches the rest of the admin's pattern).

- [ ] **Step 1: Add sheet state + load on mount**

In `app/admin/distributors/page.jsx`, find the existing `useState` block at the top of `DistributorsPage`. Add right after `const [sendingApproval, setSendingApproval] = useState({});`:

```jsx
  const [sheet, setSheet] = useState(null); // { exists, updated_at, size }
  const [sheetUploading, setSheetUploading] = useState(false);
```

Inside the existing `useEffect(() => { async function load() { ... } load(); }, [])`, add a third fetch to the `Promise.all`. Change:

```jsx
        const [dists, orders] = await Promise.all([
          sbFetch('distributors', 'select=*&order=created_at.desc'),
          sbFetch('distributor_orders', 'select=*&order=created_at.desc'),
        ]);
        setDistributors(dists);
        setDistOrders(orders);
```

to:

```jsx
        const [dists, orders, sheetInfo] = await Promise.all([
          sbFetch('distributors', 'select=*&order=created_at.desc'),
          sbFetch('distributor_orders', 'select=*&order=created_at.desc'),
          fetch(`${SUPABASE_URL}/storage/v1/object/info/wholesale-sheets/current.pdf`, {
            headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
          }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        ]);
        setDistributors(dists);
        setDistOrders(orders);
        setSheet(sheetInfo);
```

- [ ] **Step 2: Add the upload handler**

Below the existing handler functions (after `updateStatus`), add:

```jsx
  const uploadSheet = async (file) => {
    if (!file) return;
    if (file.type !== 'application/pdf') {
      alert('PDF only');
      return;
    }
    setSheetUploading(true);
    try {
      // Archive existing if present
      if (sheet) {
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        await fetch(`${SUPABASE_URL}/storage/v1/object/copy`, {
          method: 'POST',
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            bucketId: 'wholesale-sheets',
            sourceKey: 'current.pdf',
            destinationKey: `archive/${stamp}.pdf`,
          }),
        });
      }
      const up = await fetch(
        `${SUPABASE_URL}/storage/v1/object/wholesale-sheets/current.pdf`,
        {
          method: 'POST',
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/pdf',
            'x-upsert': 'true',
          },
          body: file,
        }
      );
      if (!up.ok) {
        const err = await up.text();
        alert('Upload failed: ' + err);
        setSheetUploading(false);
        return;
      }
      // refresh info
      const infoRes = await fetch(
        `${SUPABASE_URL}/storage/v1/object/info/wholesale-sheets/current.pdf`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
      );
      setSheet(infoRes.ok ? await infoRes.json() : { updated_at: new Date().toISOString() });
      alert('Pricing sheet updated.');
    } catch (e) {
      alert('Upload error: ' + e.message);
    } finally {
      setSheetUploading(false);
    }
  };
```

- [ ] **Step 3: Add the sheet tile to the KPI row**

Find the existing tile row inside the return:

```jsx
      <div className="admin-tile-row" style={{marginBottom:24}}>
        {[
          {l:'Total Applications',v:distributors.length,c:'#0F1928'},
          {l:'Approved',v:approved,c:'#22C55E'},
          {l:'Pending Review',v:pending,c:'#F59E0B'},
          {l:'Dist. Revenue',v:'$'+totalSpent.toFixed(2),c:'#0072B5'},
        ].map((x,i)=>(
```

Immediately above that block (after the existing `<p>` line that says `{distributors.length} applications · ...`), add:

```jsx
      <div style={{
        ...cs.card,
        padding:16,
        marginBottom:16,
        display:'flex',
        justifyContent:'space-between',
        alignItems:'center',
        gap:16,
        flexWrap:'wrap',
      }}>
        <div>
          <div style={{fontSize:10,fontWeight:600,color:'#8C919E',textTransform:'uppercase',letterSpacing:1,marginBottom:4}}>Current Pricing Sheet</div>
          {sheet ? (
            <div style={{fontSize:13,color:'#0F1928'}}>
              <span style={{fontFamily:"'JetBrains Mono'",color:'#0072B5'}}>current.pdf</span>
              <span style={{color:'#8C919E',marginLeft:8,fontSize:11}}>
                Updated {new Date(sheet.updated_at || sheet.created_at || Date.now()).toLocaleString()}
              </span>
            </div>
          ) : (
            <div style={{fontSize:13,color:'#F59E0B'}}>
              No sheet uploaded — applicants can't be sent pricing yet.
            </div>
          )}
        </div>
        <label style={{...cs.btn, background:'#0072B5', color:'#fff', opacity:sheetUploading?0.5:1, cursor:'pointer'}}>
          {sheetUploading ? 'Uploading...' : (sheet ? 'Replace Sheet' : 'Upload Sheet')}
          <input
            type="file"
            accept="application/pdf"
            disabled={sheetUploading}
            onChange={(e) => uploadSheet(e.target.files?.[0])}
            style={{display:'none'}}
          />
        </label>
      </div>
```

- [ ] **Step 4: Update `sendApprovalEmail` to send the distributor_id, not the inline object**

Find the existing `sendApprovalEmail` function:

```jsx
  const sendApprovalEmail = async (dist) => {
    setSendingApproval(prev => ({ ...prev, [dist.id]: true }));
    try {
      const res = await fetch('/api/distributor-approval', {
        method: 'POST', headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ distributor: { business_name:dist.business_name, contact_name:dist.contact_name, email:dist.email, login_code:dist.login_code, tier:dist.tier||'entry' }})
      });
```

Change the body to send the inline object (so the API can read freshest values from the row passed by the admin) — the API already accepts this format from Task 8. No edit needed; verify the line matches what the API expects.

Actually, replace the body line for cleaner contract:

```jsx
        body: JSON.stringify({ distributor_id: dist.id })
```

The API reads the row from Supabase, so the email always reflects what's in the DB.

- [ ] **Step 5: Verify in browser**

1. Refresh `http://localhost:3000/admin/distributors` (log in if needed).
2. Confirm the new "Current Pricing Sheet" tile shows above the 4 KPI tiles.
3. Status message says either "No sheet uploaded..." (if Supabase Storage bucket is empty) or the upload date if a previous file exists.
4. Click "Upload Sheet" → pick any test PDF → confirm the tile updates with "Updated ..." timestamp.
5. In Supabase dashboard → Storage → `wholesale-sheets` → verify `current.pdf` exists (and, after a re-upload, `archive/<timestamp>.pdf`).

- [ ] **Step 6: End-to-end test: approve + send pricing sheet**

In the admin:
1. Find any approved distributor (or use the test-row sequence below to create one):

```sql
insert into distributors (business_name, contact_name, email, phone, country, market, expected_volume, status, login_code, approved_at)
values ('Test E2E Wholesale', 'Test E2E', 'youremail+e2e@yourdomain.com', '5550000000', 'United States', 'CA', '10–99', 'approved', 'TEST2026', now());
```

(Use a real email you can check, not `example.com`.)

2. In `/admin/distributors`, find the test row, expand it.
3. Click "✉ Resend Approval Email".
4. Confirm: button shows "Sending..." then alert "Approval email sent to ...".
5. Check the inbox — verify the cream-luxe email arrived with the PDF attached.

Then clean up:

```sql
delete from distributors where email = 'youremail+e2e@yourdomain.com';
```

- [ ] **Step 7: Commit**

```bash
git add app/admin/distributors/page.jsx
git commit -m "$(cat <<'EOF'
admin: add pricing-sheet upload tile to distributors page

Upload + archive previous version to Supabase Storage. Resend Approval
Email button now sends the actual sheet PDF (matches the new API
contract — distributor_id, not inline object).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Admin tier-as-tag disclaimer

**Files:**
- Modify: `app/admin/distributors/page.jsx`

The existing tier dropdown (Entry/Standard/Volume/Wholesale with 50–65% discount labels) no longer drives pricing — pricing is per-SKU on the sheet. Add a small disclaimer so a future admin doesn't get confused.

- [ ] **Step 1: Find the "Change Tier" section**

In `app/admin/distributors/page.jsx`, locate this block (around line 220-230):

```jsx
                          <div style={{marginTop:16}}>
                            <div style={{fontSize:10,fontWeight:600,color:'#8C919E',textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>Change Tier</div>
                            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                              {Object.entries(TIER_DISC).map(([k,v])=>(
                                <button key={k} onClick={async()=>{await sbPatch('distributors',{id:dist.id},{tier:k});setDistributors(prev=>prev.map(d=>d.id===dist.id?{...d,tier:k}:d));}} style={{...cs.btn,padding:'6px 12px',fontSize:11,background:dist.tier===k?'#0072B5':'#F7F8FA',color:dist.tier===k?'#fff':'#6B7A94',border:'1px solid '+(dist.tier===k?'#0072B5':'#E4E7EC')}}>{k.charAt(0).toUpperCase()+k.slice(1)} ({v})</button>
                              ))}
                            </div>
                          </div>
```

- [ ] **Step 2: Add an italic note above the tier buttons**

Replace the block above with:

```jsx
                          <div style={{marginTop:16}}>
                            <div style={{fontSize:10,fontWeight:600,color:'#8C919E',textTransform:'uppercase',letterSpacing:1,marginBottom:4}}>Tier (informational tag)</div>
                            <div style={{fontSize:11,color:'#8C919E',fontStyle:'italic',marginBottom:8,lineHeight:1.5}}>
                              Wholesale pricing is per-SKU on the published sheet. This tier label is a relationship tag only.
                            </div>
                            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                              {Object.entries(TIER_DISC).map(([k,v])=>(
                                <button key={k} onClick={async()=>{await sbPatch('distributors',{id:dist.id},{tier:k});setDistributors(prev=>prev.map(d=>d.id===dist.id?{...d,tier:k}:d));}} style={{...cs.btn,padding:'6px 12px',fontSize:11,background:dist.tier===k?'#0072B5':'#F7F8FA',color:dist.tier===k?'#fff':'#6B7A94',border:'1px solid '+(dist.tier===k?'#0072B5':'#E4E7EC')}}>{k.charAt(0).toUpperCase()+k.slice(1)} ({v})</button>
                              ))}
                            </div>
                          </div>
```

- [ ] **Step 3: Verify in browser**

Refresh `/admin/distributors`, expand any approved distributor. Confirm:
- Section header now reads "Tier (informational tag)"
- Italic note appears above the tier buttons explaining pricing is on the sheet.

- [ ] **Step 4: Commit**

```bash
git add app/admin/distributors/page.jsx
git commit -m "$(cat <<'EOF'
admin: clarify tier is a relationship tag, not a pricing driver

Per the wholesale program spec, pricing is per-SKU on the published
sheet. The tier dropdown stays for backwards-compat but is now labeled
as informational only.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Marketing footer link

**Files:**
- Modify: `public/index.html`

- [ ] **Step 1: Find the existing footer in `public/index.html`**

```bash
grep -n -E "footer|<\/body>|©|copyright" public/index.html | tail -20
```

Identify the footer block. (Exact line numbers vary; the file is ~880 lines.)

- [ ] **Step 2: Add the wholesale link**

Inside the footer block, add a link styled to match existing footer typography. The existing footer uses tiny uppercase letterspaced text — match it. Add the following block near other footer links (or create a new line if footer has none):

```html
<a href="/wholesale" style="font-size:9px;font-weight:500;letter-spacing:2px;text-transform:uppercase;color:var(--txd);text-decoration:none;margin:0 12px">Wholesale Inquiries</a>
```

If the footer is bare and has no other links, place this near the closing footer tag and ensure it inherits surrounding styling. Use existing CSS variables (`--txd` for muted text).

- [ ] **Step 3: Verify in browser**

Open `http://localhost:3000/` (which redirects to `index.html`). Scroll to the footer. Confirm "Wholesale Inquiries" link appears in the footer styling and clicks through to `/wholesale`.

- [ ] **Step 4: Commit**

```bash
git add public/index.html
git commit -m "$(cat <<'EOF'
wholesale: add discreet footer link from marketing site

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: Initial pricing-sheet PDF (non-code deliverable)

**Files:** none in this repo. Track as an issue / TODO outside the repo.

The application page and admin tooling are now functional, but the program cannot launch until a real pricing sheet exists. This task is a non-code deliverable handed off to Jorrel.

- [ ] **Step 1: Design the sheet to spec**

Using Canva, Figma, or Illustrator, design a multi-page PDF matching:

- Background `#050507`
- Type `#E8E4E0`, muted `#5A5856`, gold `#E8D5B7`
- Display: Cormorant Garamond italic
- Body: Outfit
- Mono: JetBrains Mono
- Header: "advnce labs" wordmark + "WHOLESALE PRICING · 2026 QX" version stamp
- Table columns per product: **Product | 10–99 | 100–499 | 500–999 | 1000+**
- Source product list: [lib/constants/peptides.js](../../../lib/constants/peptides.js) (130+ peptides)
- Group products by category (Weight Management / Recovery / Longevity / Growth Hormone / etc.)
- Footer on every page: lead time, min order, research-use disclaimer, contact email

Set per-tier prices manually. Sanity check: the lowest tier (1000+) should still be margin-positive after vendor cost.

- [ ] **Step 2: Export to PDF + name it**

Export as `advncelabs-wholesale-2026-Q2.pdf` (replace quarter as appropriate).

- [ ] **Step 3: Upload via admin UI**

- Go to `/admin/distributors`
- Use the "Upload Sheet" button on the Current Pricing Sheet tile
- Verify the file size, updated date appear
- Verify Supabase Storage now has `wholesale-sheets/current.pdf`

- [ ] **Step 4: Send a test approval email to self**

- Create a test distributor row via the form at `/wholesale` (use a real email)
- Approve it in the admin (assign a login code + tier tag)
- Click "Resend Approval Email"
- Confirm: branded email arrives with the actual PDF attached
- Clean up the test row when satisfied.

No commit (no code changes).

---

## Self-Review Notes

Re-checking against the spec sections after writing the plan:

- **Spec §4.1 Public application page** → Tasks 4, 6, 7 ✓
- **Spec §4.2 Terms page** → Task 3 ✓
- **Spec §4.3 Submission API** → Tasks 5, 6 ✓
- **Spec §4.4 Approval-email API** → Task 8 ✓
- **Spec §4.5 Admin updates** → Tasks 9, 10 ✓
- **Spec §4.6 PDF artifact** → Task 12 (handoff, not code) ✓
- **Spec §5 Schema** → Task 1 ✓
- **Spec §6 Env vars** → Task 6 (Turnstile), Task 1 (storage), inline references everywhere ✓
- **Spec §7 Email templates** → `lib/email-templates/wholesale-notify.js` (Task 5), `lib/email-templates/wholesale-approval.js` (Task 8) ✓
- **Spec §8 Navigation** → Task 11 ✓

No gaps. No placeholders. No `function() {}` stubs without bodies. Type/property names consistent across tasks.
