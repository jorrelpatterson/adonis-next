# Ambassador Business Cards — Design Spec

**Date:** 2026-06-10
**Status:** Approved by Jorrel (brainstorm session, visual companion)
**Repos touched:** adonis-next (generator), advnce-site (ref-capture fix)

## Purpose

Give advnce labs ambassadors a physical, print-ready business card they can hand
out. Each card is personalized — the ambassador's name and personal access code,
plus a QR that attributes the visit to them. A repeatable generator in the admin
means new ambassadors get cards with zero rework.

## Decisions made (with Jorrel, 2026-06-10)

1. **Personalized per ambassador** — each card carries the ambassador's own code
   and a QR that pre-applies attribution. Not generic.
2. **Repeatable generator** — an admin page, not a one-off batch or hand-edited
   template.
3. **Brand-led front, code + QR back.** No discount promises anywhere on the
   card (explicitly removed — the code is framed as a "personal access code,"
   not a deal).
4. **Name + AMBASSADOR title + code** on the back. No IG handle / contact info.
5. **Generator lives in the adonis-next admin** (`/admin/cards`), behind the
   existing cookie auth.
6. **Visual direction: "Specimen" (v3)** — lab-label aesthetic; chosen over
   "Gallery" (centered minimal) and "Ascent" (cropped logo-line art) in the
   visual companion. Mockup preserved at
   `.superpowers/brainstorm/76250-1781153612/content/specimen-v3.html`.
7. **"NOT FOR HUMAN CONSUMPTION" removed from the card.** Footer keeps
   `FOR RESEARCH USE ONLY`. Rationale: the card is a handoff to the site, not a
   product label; full compliance language lives on product pages and the site
   footer. (Not legal advice; revisit if formal compliance review happens.)
8. **QR via `qrcode` npm package** rendering inline SVG (vector → print-sharp).
   Chosen over a vendored encoder and over external image APIs.

## Card design (Specimen v3)

Physical: **3.5″ × 2″** US standard, landscape, double-sided.
Palette and type per `docs/brand/advncelabs-brand-identity.md` (cream-luxe):
cream `#F4F2EE`, ink `#1A1C22`, cyan `#00A0A8`, amber `#E07C24`, dim `#7A7D88`,
border `#E4E7EC`. Fonts: Barlow Condensed, Cormorant Garamond (unused in final
Specimen face but loaded for tagline option), JetBrains Mono. Wordmark always
lowercase: `advnce labs` (never "ADVNCE LABS" as a wordmark; small mono labels
elsewhere on the card may be uppercase per brand convention).

**Front** (all inside a 1px ink hairline border inset from the trim edge):
- Header strip (bordered bottom): `EST. 2025` left, `USA` right — 9px-equivalent
  JetBrains Mono, 3px letter-spacing, ink.
- Center lockup: brand mark SVG (canonical, from `advnce-site/brand-kit/logo.svg`,
  background rect omitted) + `advnce labs` in Barlow Condensed 400 ("labs" in dim).
- Under lockup: `RESEARCH-GRADE PEPTIDES` — JetBrains Mono, 4px letter-spacing,
  cyan. (The brand guide's approved positioning phrase; says peptides without
  product claims.)
- Footer strip (bordered top): `PRECISION · PURITY · PROTOCOL` — mono, dim.

**Back** (same hairline border):
- Header row (hairline `#E4E7EC` underline): `AMBASSADOR` in amber mono left,
  `ID · XXXX` in dim mono right. Ambassador ids are UUIDs (verified against
  live data), so the display ID is the first 4 hex chars of the UUID,
  uppercased (e.g., `ID · 02C8`) — decorative, stable, unique enough on a card.
- Left column: `NAME` micro-label (dim mono) over the ambassador's full name in
  Barlow Condensed 700 ink; below, `ACCESS CODE` micro-label over the code in
  JetBrains Mono 700, 4px letter-spacing, cyan. **Codes vary 2–20 chars in live
  data (e.g., `EZEKIELPHOTOGRAPHY`)** — the code's font size and letter-spacing
  step down for long codes so it never wraps or collides with the QR (size
  scales with a CSS clamp or a length-based class; verified against the longest
  real code at print scale).
- Right: QR code, ink `#1A1C22` modules on white, ~0.65″ square, error
  correction level **M**, ≥4-module quiet zone.
- Footer row: `ADVNCELABS.COM` left, `FOR RESEARCH USE ONLY` right — 8px-equiv
  dim mono. **No "not for human consumption." No discount language.**

**QR payload:** `https://advncelabs.com/?ref=<CODE>` — short URL keeps module
count low so it scans at small print size.

## Generator page — `/admin/cards` (adonis-next)

- New route `app/admin/cards/page.js` (client component), automatically behind
  `middleware.js` cookie auth like all `/admin/*` routes.
- **Data:** fetch ambassadors (name, id, code) from the existing ambassadors
  data path (same Supabase access pattern the admin ambassadors page uses).
  Dropdown picker; selecting an ambassador renders the live card preview.
- **Preview:** front + back rendered side by side at screen scale, exactly the
  approved Specimen v3 markup.
- **QR:** `qrcode` package (new dependency), `QRCode.toString(url, {type:'svg',
  errorCorrectionLevel:'M', margin:4, color:{dark:'#1A1C22', light:'#FFFFFF'}})`,
  injected inline.
- **Print output:** a Print button triggers `window.print()`. Print CSS:
  - `@page { size: 3.625in 2.125in; margin: 0; }` — 0.0625in bleed per edge
    around the 3.5×2in trim; safe zone keeps content ≥0.125in inside the trim
    line.
  - Page 1 = front, page 2 = back; everything else (`.no-print`) hidden.
  - Cream background must print: `-webkit-print-color-adjust: exact;
    print-color-adjust: exact;`.
  - Card background bleeds to page edge; hairline border sits inside the safe
    zone.
  - Browser "Save as PDF" produces the two-page file print shops accept
    (Vistaprint/Moo custom-size upload, or any local shop).
- Fonts loaded via Google Fonts (Barlow Condensed 300/400/700/900, Cormorant
  Garamond 300 + italic, JetBrains Mono 400/700); wait for `document.fonts.ready`
  before print to avoid fallback-font output.

## Ref-capture fix (advnce-site)

`advnce-checkout.html:337` already stores `?ref=` in localStorage
(`advnce_ref`, 30-day expiry) — but `index.html` and `advnce-catalog.html` do
not, so a QR landing on the homepage loses attribution. Fix: copy the same
5-line snippet (store `advnce_ref` + `advnce_ref_exp` when `?ref=` present)
into `index.html` and `advnce-catalog.html`. No expiry-purge logic needed on
those pages (checkout already purges); storing on landing is sufficient.

## Out of scope

- No discount/offer text on cards.
- No per-ambassador photos or social handles.
- No automated batch PDF for the whole roster (generate per ambassador on
  demand; batch can be added later if needed).
- No changes to discount-code mechanics or ambassador onboarding.

## Testing / verification

1. Open `/admin/cards` while logged out → redirected to `/admin/login`.
2. Pick an ambassador → preview shows their real name, code, ID from Supabase.
3. Scan the previewed QR with a phone → lands on advncelabs.com with
   `?ref=<CODE>`; after the ref-capture fix, `localStorage.advnce_ref` is set on
   the homepage; proceed to checkout and confirm the code attributes/applies.
4. Print → Save as PDF → two pages at exactly 3.625×2.125in (verify in PDF
   inspector), cream background present, fonts correct (not fallback serif),
   QR crisp vector.
5. Print a physical proof at 100% scale and scan the QR off paper before any
   bulk order.
