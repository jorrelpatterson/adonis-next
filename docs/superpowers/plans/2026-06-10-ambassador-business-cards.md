# Ambassador Business Card Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A `/admin/cards` page that renders a print-ready, personalized business card (Specimen v3 design) for any ambassador, plus a `?ref=` capture fix on the advnce-site homepage/catalog so the card's QR attributes sales.

**Architecture:** Pure sizing/URL helpers in `lib/businessCard.js` (unit-tested). A presentational `BusinessCard.jsx` (front + back, dimensions in physical in/pt units so print output is exact). A client page `app/admin/cards/page.jsx` that fetches ambassadors from Supabase REST (same pattern as the marketing admin pages), generates a QR as inline SVG via the `qrcode` package, and prints via `window.print()` with `@page { size: 3.625in 2.125in }` (3.5×2″ trim + 0.0625″ bleed/edge). advnce-site gets a 7-line IIFE copied from checkout's existing ref-capture.

**Tech Stack:** Next.js 14 App Router (JS/JSX, inline styles per repo convention), Supabase REST with `NEXT_PUBLIC_*` keys, `qrcode` npm package, vitest (already configured: `npm test` → `vitest run`).

**Spec:** `docs/superpowers/specs/2026-06-10-ambassador-business-cards-design.md`. The approved visual mockup is preserved at `.superpowers/brainstorm/76250-1781153612/content/specimen-v3.html` — consult it for layout intent.

**Repos:** Tasks 1–5 in `adonis-next` (this repo). Task 6 in the sibling repo `../advnce-site` (separate git history — commit there separately).

**Brand constants (used throughout — do not improvise):** cream `#F4F2EE`, ink `#1A1C22`, cyan `#00A0A8`, amber `#E07C24`, dim `#7A7D88`, hairline `#E4E7EC`. Fonts: Barlow Condensed (display), JetBrains Mono (labels/code). Wordmark is always lowercase `advnce labs`.

---

### Task 1: Pure helpers — `shortId`, `refUrl`, `codeStyle`

Ambassador ids are UUIDs (e.g., `02c8c313-29c0-47ec-9aec-9309a185d76f`); the card shows a 4-char decorative ID. Codes range 2–20 chars in live data (`SHANTEL`, `EZEKIELPHOTOGRAPHY`) and the code text must shrink to fit ~2.1in next to the QR without wrapping.

**Files:**
- Create: `lib/businessCard.js`
- Test: `lib/businessCard.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// lib/businessCard.test.mjs
import { test, expect } from 'vitest';
import { shortId, refUrl, codeStyle } from './businessCard.js';

test('shortId takes first 4 hex chars of the UUID, uppercased', () => {
  expect(shortId('02c8c313-29c0-47ec-9aec-9309a185d76f')).toBe('02C8');
});

test('shortId tolerates missing input', () => {
  expect(shortId(null)).toBe('');
});

test('refUrl builds the advncelabs ref link, normalized uppercase', () => {
  expect(refUrl('kayla10')).toBe('https://advncelabs.com/?ref=KAYLA10');
});

test('short codes get the max font size (11pt cap)', () => {
  expect(codeStyle('SHANTEL').fontSize).toBe('11.00pt');
});

test('long codes shrink below the cap but stay readable', () => {
  const f = parseFloat(codeStyle('EZEKIELPHOTOGRAPHY').fontSize); // 18 chars
  expect(f).toBeLessThan(11);
  expect(f).toBeGreaterThan(9);
});

test('20-char codes (schema max) still >= 9pt', () => {
  expect(parseFloat(codeStyle('A'.repeat(20)).fontSize)).toBeGreaterThanOrEqual(9);
});

test('letter-spacing scales with font size', () => {
  const s = codeStyle('SHANTEL');
  expect(s.letterSpacing).toBe('2.09pt'); // 11 * 0.19
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/businessCard.test.mjs`
Expected: FAIL — `Cannot find module './businessCard.js'` (or equivalent resolve error).

- [ ] **Step 3: Write the implementation**

```js
// lib/businessCard.js
// Pure helpers for the ambassador business-card generator (/admin/cards).

// First 4 hex chars of the ambassador UUID, uppercased — decorative card ID.
export function shortId(uuid) {
  return String(uuid || '').replace(/-/g, '').slice(0, 4).toUpperCase();
}

// QR payload. Short URL keeps the QR module count low so it scans at ~0.6in.
export function refUrl(code) {
  return `https://advncelabs.com/?ref=${encodeURIComponent(String(code || '').trim().toUpperCase())}`;
}

// Code text sizing. JetBrains Mono glyphs are ~0.6em wide; with letter-spacing
// at 19% of font size, each char occupies ~0.79em. Codes must fit ~2.1in
// (151pt) beside the QR. Cap at 11pt for short codes.
const MAX_PT = 11;
const MAX_WIDTH_PT = 151;
export function codeStyle(code) {
  const len = Math.max(1, String(code || '').length);
  const fontSizePt = Math.min(MAX_PT, MAX_WIDTH_PT / (0.79 * len));
  return {
    fontSize: `${fontSizePt.toFixed(2)}pt`,
    letterSpacing: `${(fontSizePt * 0.19).toFixed(2)}pt`,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/businessCard.test.mjs`
Expected: PASS — 7 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/businessCard.js lib/businessCard.test.mjs
git commit -m "feat(admin/cards): card sizing + ref-url helpers"
```

---

### Task 2: Install the `qrcode` dependency

**Files:**
- Modify: `package.json`, `package-lock.json` (via npm)

- [ ] **Step 1: Install**

Run: `npm install qrcode`
Expected: adds `"qrcode": "^1.x"` to dependencies, no errors.

- [ ] **Step 2: Smoke-test SVG output**

Run: `node -e "require('qrcode').toString('https://advncelabs.com/?ref=TEST',{type:'svg',errorCorrectionLevel:'M',margin:4,color:{dark:'#1A1C22',light:'#FFFFFF'}}).then(s=>console.log(s.slice(0,80)))"`
Expected: prints the start of an `<svg ...` string.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add qrcode for ambassador card QR generation"
```

---

### Task 3: `BusinessCard.jsx` — front + back components

Pure presentational components. All dimensions in physical units (`in`/`pt`) so the printed card is exact; on screen they render at CSS-inch size (~348px wide), which doubles as the preview. Layout mirrors the approved Specimen v3 mockup.

**Files:**
- Create: `app/admin/cards/BusinessCard.jsx`

- [ ] **Step 1: Write the component file**

```jsx
// app/admin/cards/BusinessCard.jsx
// Specimen v3 ambassador card (spec: docs/superpowers/specs/2026-06-10-ambassador-business-cards-design.md).
// Dimensions are physical (in/pt): trim 3.5x2in + 0.0625in bleed -> 3.625x2.125in.
import { shortId, codeStyle } from '../../../lib/businessCard';

const C = {
  cream: '#F4F2EE', ink: '#1A1C22', cyan: '#00A0A8',
  amber: '#E07C24', dim: '#7A7D88', hairline: '#E4E7EC',
};
const MONO = "'JetBrains Mono',monospace";
const BARLOW = "'Barlow Condensed',sans-serif";

const st = {
  card: { width: '3.625in', height: '2.125in', background: C.cream, position: 'relative', overflow: 'hidden' },
  // 0.0625in bleed + 0.1in inset from trim
  frame: { position: 'absolute', inset: '0.1625in', border: `1px solid ${C.ink}` },
  headerLabel: { fontFamily: MONO, fontSize: '5pt', letterSpacing: '1.5pt', color: C.ink },
  microLabel: { fontFamily: MONO, fontSize: '4.5pt', letterSpacing: '1pt', color: C.dim },
};

function Mark({ size }) {
  // Canonical brand mark (advnce-site/brand-kit/logo.svg, background rect omitted)
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" style={{ flexShrink: 0 }}>
      <path d="M8 48L18 38L28 43L38 28L46 33L54 18" fill="none" stroke={C.cyan} strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx="46" cy="33" r="4" fill={C.cyan} />
      <circle cx="54" cy="18" r="4.5" fill={C.amber} />
      <circle cx="54" cy="18" r="7.5" fill="none" stroke={C.amber} strokeWidth="1.5" />
    </svg>
  );
}

export function CardFront() {
  return (
    <div style={st.card}>
      <div style={st.frame}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', padding: '0.07in 0.1in', borderBottom: `1px solid ${C.ink}` }}>
          <span style={st.headerLabel}>EST. 2025</span>
          <span style={st.headerLabel}>USA</span>
        </div>
        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, transform: 'translateY(-50%)', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.1in' }}>
            <Mark size="0.32in" />
            <span style={{ fontFamily: BARLOW, fontWeight: 400, fontSize: '17pt', letterSpacing: '1pt', color: C.ink, lineHeight: 1 }}>
              advnce <span style={{ color: C.dim }}>labs</span>
            </span>
          </div>
          <div style={{ fontFamily: MONO, fontSize: '5pt', letterSpacing: '2pt', color: C.cyan, marginTop: '0.07in' }}>
            RESEARCH-GRADE PEPTIDES
          </div>
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, textAlign: 'center', padding: '0.065in', borderTop: `1px solid ${C.ink}`, fontFamily: MONO, fontSize: '5pt', letterSpacing: '1.5pt', color: C.dim }}>
          PRECISION · PURITY · PROTOCOL
        </div>
      </div>
    </div>
  );
}

export function CardBack({ name, code, ambassadorId, qrSvg }) {
  const codeSizing = codeStyle(code);
  return (
    <div style={st.card}>
      <div style={{ ...st.frame, padding: '0.1in 0.117in' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${C.hairline}`, paddingBottom: '0.055in' }}>
          <span style={{ fontFamily: MONO, fontSize: '5pt', letterSpacing: '1.5pt', color: C.amber }}>AMBASSADOR</span>
          <span style={{ fontFamily: MONO, fontSize: '5pt', letterSpacing: '1.5pt', color: C.dim }}>ID · {shortId(ambassadorId)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '0.08in' }}>
          <div style={{ minWidth: 0 }}>
            <div style={st.microLabel}>NAME</div>
            <div style={{ fontFamily: BARLOW, fontWeight: 700, fontSize: '12.5pt', color: C.ink, lineHeight: 1.15 }}>
              {String(name || '').toUpperCase()}
            </div>
            <div style={{ ...st.microLabel, marginTop: '0.08in' }}>ACCESS CODE</div>
            <div style={{ fontFamily: MONO, fontWeight: 700, color: C.cyan, lineHeight: 1.3, whiteSpace: 'nowrap', ...codeSizing }}>
              {code}
            </div>
          </div>
          <div className="qr-box" style={{ width: '0.6in', height: '0.6in', background: '#fff', flexShrink: 0 }}
            dangerouslySetInnerHTML={{ __html: qrSvg || '' }} />
        </div>
        <div style={{ position: 'absolute', bottom: '0.07in', left: '0.117in', right: '0.117in', display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: '4.5pt', letterSpacing: '1pt', color: C.dim }}>
          <span>ADVNCELABS.COM</span>
          <span>FOR RESEARCH USE ONLY</span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run lint`
Expected: no new errors in `app/admin/cards/BusinessCard.jsx` (pre-existing warnings elsewhere are fine).

- [ ] **Step 3: Commit**

```bash
git add app/admin/cards/BusinessCard.jsx
git commit -m "feat(admin/cards): Specimen v3 card front/back components"
```

---

### Task 4: `/admin/cards` page — picker, QR, preview, print

Client page following the repo's admin conventions (`'use client'`, `force-dynamic`, Supabase REST with `NEXT_PUBLIC_*` keys, inline styles). Cookie auth via `middleware.js` covers `/admin/cards` automatically — no auth code needed.

The print path uses the visibility pattern (hide everything, reveal only `#print-cards`) because admin pages render inside layout chrome we don't control. Two pages: front, then back.

**Files:**
- Create: `app/admin/cards/page.jsx`

- [ ] **Step 1: Write the page**

```jsx
// app/admin/cards/page.jsx
'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { refUrl } from '../../../lib/businessCard';
import { CardFront, CardBack } from './BusinessCard';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const s = {
  h1: { fontSize: 28, fontWeight: 700, color: '#0F1928', fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 1 },
  sub: { color: '#8C919E', marginBottom: 24, fontSize: 14 },
  select: { padding: '8px 12px', border: '1px solid #E4E7EC', borderRadius: 4, fontSize: 13, outline: 'none', background: '#FAFBFC', minWidth: 280 },
  btn: { padding: '8px 16px', border: 'none', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: '#00A0A8', color: '#fff' },
};

export default function CardsPage() {
  const [ambassadors, setAmbassadors] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [qrSvg, setQrSvg] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    fetch(`${SUPABASE_URL}/rest/v1/ambassadors?select=id,name,code,status&order=name.asc`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    })
      .then(r => { if (!r.ok) throw new Error(`ambassadors fetch ${r.status}`); return r.json(); })
      .then(d => setAmbassadors(Array.isArray(d) ? d : []))
      .catch(e => { console.error(e); setLoadError(true); })
      .finally(() => setLoading(false));
  }, []);

  const amb = ambassadors.find(a => a.id === selectedId) || null;
  const ambCode = amb?.code || '';

  useEffect(() => {
    if (!ambCode) { setQrSvg(''); return; }
    let stale = false;
    QRCode.toString(refUrl(ambCode), {
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: 4,
      color: { dark: '#1A1C22', light: '#FFFFFF' },
    }).then(svg => { if (!stale) setQrSvg(svg); }).catch(console.error);
    return () => { stale = true; };
  }, [ambCode]);

  const printCards = async () => {
    await document.fonts.ready; // avoid printing with fallback fonts
    window.print();
  };

  return (
    <div>
      {/* Card fonts: ensure the exact weights exist regardless of layout-level fonts */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;700&family=JetBrains+Mono:wght@400;700&display=swap" />
      <style>{`
        #print-cards .qr-box svg { width: 100%; height: 100%; display: block; }
        @media screen {
          #print-cards { display: flex; gap: 24px; flex-wrap: wrap; margin-top: 24px; }
          #print-cards > div { box-shadow: 0 2px 14px rgba(0,0,0,0.18); }
        }
        @page { size: 3.625in 2.125in; margin: 0; }
        @media print {
          html, body { background: #fff; }
          .no-print { display: none !important; }
          body * { visibility: hidden; }
          #print-cards, #print-cards * { visibility: visible; }
          #print-cards { position: absolute; left: 0; top: 0; margin: 0; }
          #print-cards > div { page-break-after: always; box-shadow: none; }
          #print-cards > div:last-child { page-break-after: auto; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="no-print">
        <h1 className="admin-page-h1" style={s.h1}>Business Cards</h1>
        <p style={s.sub}>Print-ready ambassador cards · 3.5″ × 2″ + bleed · Print → “Save as PDF” for the print shop</p>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <select style={s.select} value={selectedId} onChange={e => setSelectedId(e.target.value)}>
            <option value="">{loading ? 'Loading ambassadors…' : 'Select an ambassador…'}</option>
            {ambassadors.map(a => (
              <option key={a.id} value={a.id}>{a.name} — {a.code}{a.status && a.status !== 'active' ? ` (${a.status})` : ''}</option>
            ))}
          </select>
          {amb && amb.code && <button style={{ ...s.btn, opacity: qrSvg ? 1 : 0.5 }} onClick={printCards} disabled={!qrSvg}>Print / Save PDF</button>}
          {amb && !amb.code && <span style={{ color: '#DC2626', fontSize: 13 }}>This ambassador has no code — set one on the Ambassadors page first.</span>}
          {loadError && <span style={{ color: '#DC2626', fontSize: 13 }}>Could not load ambassadors — refresh to retry.</span>}
        </div>
      </div>

      {amb && amb.code && (
        <div id="print-cards">
          <CardFront />
          <CardBack name={amb.name} code={amb.code} ambassadorId={amb.id} qrSvg={qrSvg} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify in the browser**

Run: `npm run dev`, log in at `/admin/login`, open `http://localhost:3000/admin/cards`.
Expected: dropdown lists real ambassadors (name — CODE); selecting one shows the cream front card and the back with name, code, `ID · XXXX`, and a rendered QR. Check the longest code (`EZEKIELPHOTOGRAPHY`) renders on one line without touching the QR.

- [ ] **Step 3: Verify print output**

Click "Print / Save PDF" → destination "Save as PDF".
Expected: exactly 2 pages, each 3.625×2.125in (check the print-preview paper size), cream background visible (not white), fonts condensed/mono (not Times), QR crisp. No admin chrome on the pages.

- [ ] **Step 4: Verify auth still gates the page**

Open `/admin/cards` in a private window (not logged in).
Expected: redirect to `/admin/login`.

- [ ] **Step 5: Commit**

```bash
git add app/admin/cards/page.jsx
git commit -m "feat(admin/cards): ambassador business card generator page"
```

---

### Task 5: Marketing hub tile + VA access

Make the generator discoverable from the marketing hub where the rest of the ambassador tooling lives. The hub is visible to the VA role, which manages ambassadors — so `/admin/cards` must be added to the VA path allowlist or the tile would bounce VAs to the dashboard.

**Files:**
- Modify: `app/admin/marketing/page.jsx` (the `cards` array, after the `Ambassadors` entry at ~line 69-78)
- Modify: `lib/admin-roles.js` (`ROLE_ALLOWED_PATHS.va`)

- [ ] **Step 1: Add the tile**

In `app/admin/marketing/page.jsx`, insert into the `cards` array directly after the `Ambassadors` object:

```js
    {
      href:'/admin/cards',
      icon:'🪪',
      color:'#00A0A8',
      label:'Business Cards',
      desc:'Print-ready ambassador cards with QR codes',
      stat:'→',
      statLabel:'generate',
      tag:null,
    },
```

- [ ] **Step 2: Allow the VA role to reach the page**

In `lib/admin-roles.js`, add to `ROLE_ALLOWED_PATHS.va` (after the `/admin/discount-codes` entry):

```js
    '/admin/cards',              // print ambassador business cards (read-only page)
```

(No API allowlist change needed — the page reads Supabase directly with the anon key, same as the marketing hub.)

- [ ] **Step 3: Verify**

Open `http://localhost:3000/admin/marketing`.
Expected: a "Business Cards" tile appears next to Ambassadors and navigates to `/admin/cards`.

- [ ] **Step 4: Commit**

```bash
git add app/admin/marketing/page.jsx lib/admin-roles.js
git commit -m "feat(admin/marketing): business-cards tile + VA access"
```

---

### Task 6: Ref-capture on advnce-site homepage + catalog (sibling repo)

`advnce-checkout.html:337` already stores `?ref=` (key `advnce_ref`, 30-day expiry) and applies it at checkout — but the QR lands on the homepage, which doesn't capture it. Copy a minimal IIFE (no top-level consts → zero collision risk with each page's existing script) into both entry pages. Checkout already handles expiry purging.

**Files (in `../advnce-site`):**
- Modify: `index.html` (opening `<script>` tag at line 1016)
- Modify: `advnce-catalog.html` (opening `<script>` tag at line 317)

- [ ] **Step 1: Add the snippet to both files**

Immediately after the opening `<script>` tag in each file (line numbers above), insert:

```js
// ── REF CAPTURE — store ?ref= (QR / ambassador cards) for checkout attribution ──
(function(){
  var r = new URLSearchParams(window.location.search).get('ref');
  if (r) {
    localStorage.setItem('advnce_ref', r);
    localStorage.setItem('advnce_ref_exp', String(Date.now() + 30*24*60*60*1000));
  }
})();
```

- [ ] **Step 2: Verify locally**

Run from `../advnce-site`: `npx serve .` (or any static server), open `http://localhost:3000/index.html?ref=TESTCODE`, then in DevTools console: `localStorage.getItem('advnce_ref')`.
Expected: `"TESTCODE"`. Repeat for `advnce-catalog.html?ref=TESTCODE`.

- [ ] **Step 3: Commit (in advnce-site)**

```bash
cd ../advnce-site
git add index.html advnce-catalog.html
git commit -m "feat: capture ?ref= on homepage and catalog for QR/card attribution"
```

---

### Task 7: End-to-end verification (spec's test list)

- [ ] **Step 1: Auth** — `/admin/cards` logged out → redirects to `/admin/login`.
- [ ] **Step 2: Data** — pick 2–3 ambassadors incl. the longest code; preview shows real name/code/ID each time.
- [ ] **Step 3: QR scan** — scan the on-screen QR with a phone → lands on `advncelabs.com/?ref=<CODE>`; confirm `localStorage.advnce_ref` is set on the homepage (after Task 6 deploys, or test against localhost). Proceed to checkout and confirm the ref attributes.
- [ ] **Step 4: PDF** — Save as PDF; verify page size 3.625×2.125in in a PDF inspector (e.g., Preview → Tools → Show Inspector), cream background, correct fonts, vector QR (zoom in — no pixelation).
- [ ] **Step 5: Physical proof** — print one card at 100% scale on paper and scan the QR off paper before any bulk order. (User does this; not blocking the code work.)
- [ ] **Step 6: Full test suite** — `npm test` passes; `npm run build` succeeds.
