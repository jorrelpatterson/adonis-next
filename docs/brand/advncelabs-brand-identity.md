# advnce labs — Brand Identity

**Last updated:** 2026-04-18
**Source of truth.** This document supersedes anything in `docs/daily-vial-content-strategy.md` (April 2026) which referenced the now-scrapped Elysian brand. Everything visual + verbal going forward — site, emails, Instagram, packaging, ambassador comms — must conform to this document.

---

## 1. Brand essence

### Name
**advnce labs** — always lowercase, no hyphen, "advnce" as one word with the missing 'a' (the typographic abbreviation reflects the brand: "an ideal worth pursuing").

### Wordmark in copy
- **Inline:** `advnce labs` (lowercase, single space)
- **Possessive:** `advnce labs'` (no apostrophe-s)
- **Never:** "ADVNCE LABS", "Advnce Labs", "Advance Labs", "@advnce", "advnclabs"

### Three-word manifesto
**Precision. Purity. Protocol.**

Used in hero, top-of-funnel marketing, IG bio. Three words, period after each, line breaks for emphasis when space allows.

### One-line positioning
> Research-grade peptides with holographic lot identification, manufacturer COAs, and the infrastructure to support serious research applications.

### What advnce labs IS
A chemical supplier. We supply research-grade peptide compounds to qualified investigators for in-vitro laboratory research purposes. Full stop.

### What advnce labs IS NOT
- Not a compounding pharmacy
- Not a supplement company
- Not a wellness brand
- Not a TRT clinic
- Not a longevity protocol

The compounds are research chemicals — a classification that carries legal weight and one we take seriously.

### Origin / "why the name"
The name advnce comes from a place of perfection — an ideal worth pursuing. In a space that often settles for good enough, we think the pursuit of that standard is the whole point.

---

## 2. Three Principles (used in marketing + about copy)

**01. Documentation First.** Every compound ships with a manufacturer Certificate of Analysis available on request. Lot numbers are traceable. Purity is stated, not assumed. If we can't document it, we don't sell it.

**02. Research Integrity.** We don't make health claims. We don't imply therapeutic use. Every product description uses the language of research because that is the only honest framing for what we supply.

**03. Supplier Discipline.** We source from a vetted set of manufacturers only. Not because we couldn't find more — because maintaining a short, auditable supply chain is more important than catalog breadth for its own sake.

These three are the brand's spine. Every piece of copy should resonate with at least one.

---

## 3. Voice & tone

### Voice (consistent always)
- **Editorial.** Reads like a high-end scientific publication, not a supplement store.
- **Confident, not boastful.** "Full stop." sentences. Declarative. Doesn't hedge.
- **Plain.** No jargon-for-jargon's-sake; explain technical terms when first used.
- **Principled.** Anchors arguments in standards (documentation, traceability, integrity) rather than emotion.
- **Restrained.** No exclamation marks. No "amazing"/"incredible"/"game-changer" superlatives.

### Tone (varies by context)

| Surface | Tone |
|---|---|
| Storefront homepage | Aspirational, editorial, confident |
| Product pages | Informational, research-cited, layman-accessible (per content authoring spec) |
| About / mission | Principled, declarative, slightly austere |
| Emails (transactional) | Direct, helpful, brand-warm |
| Instagram | Educational with personality — brand-warm, curious, opinionated where appropriate |
| Ambassador comms | Hyped + personal ("you're in, let's get it") — only context where energy goes UP |
| Legal / disclaimers | Maximally clear, never apologetic, never softened |

### Use these words
- "research-grade", "compound", "investigator", "in-vitro"
- "documented", "verified", "traceable", "HPLC-verified"
- "purity", "protocol", "stack" (in research contexts)
- "we" (first-person plural for the company)
- "Studies show…", "Research has investigated…", "Clinical trials demonstrated…"

### Never use these words
- "cures", "treats", "heals", "fixes", "fights"
- "miracle", "breakthrough" (overused), "secret"
- "you should", "you'll experience", "you'll feel"
- "anti-aging", "weight-loss product" (use "GLP-1 receptor agonist research" instead)
- "supplement"
- "natural" (we sell synthetic peptides; the word is misleading)
- Emojis in body copy (limited use OK in IG and email subject lines)

### Sentence patterns we love
- "Full stop." (closing a declarative statement)
- "Three [things]. No exceptions." (rule-of-three callouts)
- "We [do this]. We don't [do that]. That's the difference."
- Italics-for-emphasis using `<em>` not `<i>`, sparingly

---

## 4. Visual identity

### Color palette

```
PRIMARY
  Cream BG       #F4F2EE   --navy            (the page background of advncelabs.com)
  Ink (text)     #1A1C22   --white           (almost-black, body text)
  Cyan           #00A0A8   --cyan            (primary accent — links, CTAs, headlines highlights, logo line)
  Amber          #E07C24   --amber           (secondary accent — logo dot, urgent callouts, badges)

SUPPORTING
  Dim            #7A7D88   --dim             (subhead, secondary text, captions)
  Ghost          rgba(0,0,0,0.03)            (subtle hover/divider washes)
  Border         #E4E7EC                     (rule lines on cards)

DARK INVERSE (use sparingly — admin panels, contrast moments, social hero shots)
  Deep Navy      #0A0D14                     (only on dedicated dark sections; default is cream)
  Inverse Cyan   #00A0A8 (same)
```

**Rule:** The default canvas is **cream (#F4F2EE)**. Dark navy (#0A0D14) is the inverse used sparingly for emphasis. **Anything customer-facing should default to cream** unless there's a clear editorial reason to invert.

⚠ The transactional email templates (PO, ambassador welcome, order confirmation) currently use the deep-navy inverse — this is a holdover from Elysian and contradicts the storefront. They should be migrated to the cream-default palette as a separate task.

### Typography

| Token | Family | Weights used | Use case |
|---|---|---|---|
| `--fn` | **Barlow Condensed** | 300, 400, 700, 900 | Headlines, nav, CTAs. Often UPPERCASE with 1–3px letter-spacing. |
| `--fd` | **Cormorant Garamond** | 300, italic | Editorial body, hero subheads, mission copy. Italic is a brand signature. |
| `--fm` | **JetBrains Mono** | 400 | Data labels, SKUs, prices, citations, footers, technical specs. Often 9–11px UPPERCASE with 2–4px letter-spacing. |

**Rule:** Don't introduce a fourth typeface. Body running copy can use the system fallback (Helvetica/Arial) when Cormorant is too elegant for the context (e.g. dense product description text).

### Logo

The mark: an ascending data line (chart) with **cyan** stroke and **amber** dot at the apex.

**SVG source** (canonical):
```html
<svg viewBox="0 0 48 28" fill="none">
  <path d="M2 24L8 19L14 22L20 14L26 17L32 9L38 12L46 3"
        stroke="#00A0A8" stroke-width="1.8"
        stroke-linejoin="round" stroke-linecap="round"/>
  <circle cx="32" cy="9"  r="2"   fill="#00A0A8"/>
  <circle cx="38" cy="12" r="2"   fill="#E07C24"/>
  <circle cx="46" cy="3"  r="2.5" fill="#E07C24"/>
</svg>
```

**Logo lockup with wordmark:** mark + text `advnce labs` (Barlow Condensed, lowercase, dim color for "labs" subscript styling).

**Logo rules:**
- Min size: 16px tall (mark only); 24px tall (with wordmark)
- Always cyan/amber on cream OR cyan/amber on deep navy. Never alter colors.
- Surround with at least one mark-height of clear space.
- No drop shadows, glows, gradients, animations on the static mark. (Animation is allowed in interactive contexts only — see Holographic Motif below.)

### Holographic motif

Subtle animation pattern used on product vials in the storefront:
- Brand text + logo mark on vial labels has a `holoShimmer` keyframe animation (3.5s ease-in-out infinite, opacity oscillation)
- Used to evoke holographic security stamps on pharmaceutical products
- Should appear on: vial labels, lot identification badges, "verified" stamps
- Should NOT appear on: text body, primary CTAs, anything that needs to be readable
- Static reproductions for IG / print: keep the visual style without the animation

### Iconography
- Use Heroicons (outline, 24px stroke 1.5px) when icons are needed. Cyan stroke on cream, white stroke on deep navy.
- Avoid filled icons unless inside a pill/badge.
- Numeric labels (01, 02, 03) for principles — use Barlow Condensed 900, cyan, large.

### Imagery direction
- **Photography:** product macro shots on cream/marble surfaces, subtle shadow. Editorial product styling, NOT clinical lab photos.
- **Illustration:** mechanism diagrams in line-art only (cyan + amber stroke on cream bg). Reference: Field Manual, scientific journal cover style.
- **Avoid:** stock photos of muscly men flexing, syringes pointed at camera, lab coats, "before/after" splits.
- **Avoid:** photo overlays of text — let typography stand on its own white space.

---

## 5. Composition principles

- **Generous whitespace.** Type breathes. Avoid filling space.
- **Editorial grid.** 12-col on web; for IG, follow a 1080×1080 grid with 60–80px outer padding.
- **Italics + uppercase mono in same composition.** Cormorant italic next to JetBrains Mono uppercase = the signature visual rhythm.
- **One accent per piece.** Cyan-led OR amber-led, rarely both at full strength. Amber is the rarer color — reserve for callouts/urgency/the logo dot.
- **Dark-only when editorial purpose demands.** A single deep-navy section in an otherwise-cream layout creates emphasis. Don't go dark by default.

---

## 6. Application guidelines

### 6.1 Storefront (advncelabs.com)
- Status: **brand-aligned.** Index, catalog, product pages all use the cream/cyan/amber palette + three typefaces.
- Maintain: don't introduce new colors, typefaces, or dark mode without updating this doc first.

### 6.2 Email templates (PO, order confirmation, ambassador welcome, etc.)
- Status: **NOT brand-aligned.** Currently dark-navy from Elysian era.
- Action item: migrate all email templates to cream-default palette. Tracked separately.
- Until migrated: keep using the dark templates (better than inconsistency mid-flight). When time permits, redesign.

### 6.3 Instagram (@advncelabs)
- Profile photo: logo mark (cyan + amber dots on cream — round-cropped, mark slightly oversized in the circular crop)
- Bio:
  ```
  advnce labs
  Research-grade peptides.
  Documented. Verified. Traceable.
  Precision. Purity. Protocol.
  ↓ catalog
  ```
- Link: advncelabs.com (or advncelabs.com/advnce-welcome.html for new-visitor 10% off capture)
- Highlights structure (5 max — use brand-system covers, all cyan + amber on cream):
  1. **Compounds** — single-product explainers
  2. **Research** — citation cards, mechanism diagrams
  3. **Stacks** — multi-compound protocols
  4. **Standards** — "why advnce labs" / principles content
  5. **Press** — any external mentions, customer testimonials (research-only language)
- Post types in priority order:
  - **Carousels** — multi-slide compound deep-dives. Brand-strong, share-friendly. Drive most engagement.
  - **Single-image citation cards** — research highlights. Easy to produce.
  - **Reels** — short (15–45s) animated explainer. Higher production but reach is exponential.
  - **Stories** — daily presence, behind-scenes, polls. No need for high polish.
- Visual rules on every post:
  - Cream bg by default, deep-navy bg for emphasis posts only
  - Logo mark in corner (small, dim) on every static post
  - "advnce labs" wordmark or @advncelabs on every reel last frame
  - Disclaimer in caption (not on image): "Research-grade compounds for in-vitro laboratory use. Not for human consumption."

### 6.4 Packaging / vial labels (per print shop labels file)
- Already follows the brand: Barlow Condensed for product name, JetBrains Mono for lot/SKU, cyan/amber holographic accent
- Maintain consistency across all 30+ products on print labels list

### 6.5 Ambassador comms
- The one place where tone gets warmer / hyped (per voice section above)
- Visual: still cream + cyan + amber, still the same typefaces — only the LANGUAGE shifts toward energy
- Subject lines can use sparing emojis (🎉 ✓ ↑) — never on storefront or IG body copy

---

## 7. Don'ts (compiled — never violate)

- ❌ "Treats", "cures", "heals", "fixes", "for X condition" — outcome claims
- ❌ Dosage recommendations or "how to use" instructions
- ❌ Before/after imagery
- ❌ "Anti-aging" / "weight loss" / "performance enhancement" as standalone claims
- ❌ Stock fitness/lab photography (muscly men, white coats, syringes)
- ❌ Emojis in body copy of website or product descriptions
- ❌ Gradients on logo, animated logos in static contexts, drop shadows on the mark
- ❌ Capital "ADVNCE LABS" anywhere
- ❌ Adding a fourth typeface
- ❌ Saying "supplement"
- ❌ Comparison shopping ("better than X competitor") — we let the documentation speak for itself

---

## 8. Open items / not-yet-decided

- **Tagline beyond "Precision. Purity. Protocol."** — may want a longer brand statement for press / About-page header
- **Email template redesign to cream palette** — separate dev task
- **Photography style guide** — when we eventually shoot product photos, hire photographer aligned with editorial direction
- **Print collateral (business cards, COA letterheads)** — not yet designed
