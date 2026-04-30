# Adonis Protocol OS — Roadmap

_Last updated: 2026-04-29 (post full-codebase audit)_

Single source of truth for the Adonis fitness app. Update at every save-everything checkpoint. Sister doc: [advnce labs roadmap](../../../.claude/projects/-Volumes-Alexandria--AI-Projects-adonis-next/memory/advncelabs_roadmap.md) (in memory).

---

## Vision

Adonis Protocol OS is an **8-domain life-protocol app** sold as a SaaS subscription. Both genders. The bar per domain is **rival the best-in-class single-purpose app for that vertical** (Body should rival MyFitnessPal/Whoop, Money should rival Mint/CreditKarma, Travel should rival Nomad List, etc.) — but unified into one OS where domains feed each other.

**The 8 domains** — Body, Money, Travel, Mind, Image, Community/Relationships, Environment, Purpose.

**Tier model**
- **Free** — 2 domains (Body always free, user picks the 2nd)
- **Pro ($14.99/mo)** — all 8 domains, credit repair, income, citizenship, nootropics
- **Elite ($29.99/mo)** — Pro + adaptive intensity, AI insights, premium peptides, cross-domain synergy

**Product philosophy**
- **Routine card = the app.** 90%+ of daily UX is the routine card. Domain tabs are configs/dashboards, not destinations.
- Automate everything possible
- Monetize through the system itself (Pro/Elite gating)
- Onboarding = sales funnel (walks all 8 domains, teases value, gates behind Pro)

**Scope philosophy — "depth ramp"**
North Star = **actual displacement** of best-in-class single-purpose apps. MVP/v1 ships A-quality across all 8 (system feel + protocol depth). Each release climbs toward B-quality (real displacement). Don't over-build any single domain at MVP. See [scope_philosophy_depth_ramp memory](../../../.claude/projects/-Volumes-Alexandria--AI-Projects-adonis-next/memory/scope_philosophy_depth_ramp.md).

**The Adonis ↔ advnce labs legal firewall**
Compliance moat, not just product split:
- **Adonis** = research, education, peptide *suggestions* and protocol design. **Does not sell.**
- **advnce labs** = e-commerce fulfillment. **Does not suggest, recommend, or make medical claims.**
This split shields Adonis from regulatory risk. When the app surfaces a peptide stack, it links the user out to advncelabs.com — Adonis never owns the transaction. See [legal_firewall_adonis_advnce memory](../../../.claude/projects/-Volumes-Alexandria--AI-Projects-adonis-next/memory/legal_firewall_adonis_advnce.md).

**6-month target:** $10K MRR.

---

## Current state of the repo (full audit, 2026-04-29)

```
adonis-next/
├── app/admin/         ← advnce labs admin (25 pages, MATURE, LIVE on adonis.pro/admin)
├── app/api/           ← advnce labs APIs (75 routes, MATURE)
├── lib/               ← shared infra (Supabase client, Resend, news carousel pipeline)
├── public/            ← marketing site, social images, v1 app.html (LIVE on adonis.pro)
├── src/               ← v2 Adonis user-facing app (BUILT but DISCONNECTED — see below)
├── supabase/migrations/ ← 18 applied migrations
├── sql/               ← 6 PENDING migrations (not yet applied)
├── docs/              ← 46 files (plans, specs, vendor pricing, brand)
├── data/              ← social-posts catalog
├── scripts/           ← smoke tests, social post renderer
├── templates/social/  ← 10 IG carousel HTML templates
└── jorrel-os.json     ← OS config (16 active blockers tracked)
```

### What's MATURE (advnce labs side, deployed and running adonis.pro/admin)

The advnce labs business is fully wired — 6+ weeks of recent work:

| Layer | Status |
|---|---|
| Admin panel | 25 pages: inventory, vendors, POs, orders, invoices, pricing, distributors, marketing, ambassadors, support tickets, news carousel, pre-sell |
| API surface | 75 routes covering admin auth, Stripe checkout, ambassador comms, invoice generation, pre-sell flows, news pipeline, cron triggers |
| Supabase | 18 migrations applied (products, vendors, vendor_prices, purchase_orders, orders, invoices, ambassadors, distributors, social_posts, news_candidates, support_tickets, etc.) |
| Cron jobs | 4 running on Vercel: welcome emails (5pm), reorder reminders (noon), news scrape (11am), news curate (Mon 4am) |
| External integrations | Stripe (payments), Resend (email), Anthropic (chatbot + news curator) |
| Public storefront | advncelabs.com (separate repo, deploys independently) |

### What's BUILT but DISCONNECTED (v2 user-facing app, NOT deployed)

v2 lives in `src/` — 90 files, 286 tests passing, builds clean. **But nothing is real about it as a product yet:**

| Concern | Status | Impact |
|---|---|---|
| Auth | ❌ NONE. localStorage-only, no login, no signup, no concept of "user." | No accounts, no multi-device, no real users |
| Payments | ❌ NONE. Tier upgrades via hardcoded access codes (FOUNDER → elite, ADONIS2026 → pro). Zero Stripe integration. | No MRR possible |
| Supabase data | ❌ `src/services/supabase.js` exists but is **never called.** Peptide data hardcoded in `src/protocols/body/peptides/catalog.js`. | Admin panel can't drive Adonis app |
| Deployment | ❌ Builds locally only. Not on Vercel. adonis.pro currently serves v1 (`public/app.html`). | Not a live product |
| Onboarding | ⚠️ Skips initial profile capture (weight/age/gender) — drops user straight into goal setup. | Adaptive features can't compute calories etc. |
| Domain views | ⚠️ All 8 exist but shallow — generic goal-list + today's-tasks. No deep UIs (no peptide stack adjuster, no credit wallet, no workout logger, etc.). | Power-user features hidden behind goal CRUD |

### What's LIVE today on adonis.pro

- **adonis.pro** = serves `public/app.html` (the 7,662-line v1 monolith) via root redirect
- **adonis.pro/admin** = the advnce labs admin panel (mature)
- v1 has zero paying users. v1 stays as a placeholder until v2 is verified ready.

### Redundancies + housekeeping debt found in audit

- **Two copies of v1 monolith:** `app.html` at root (1.1 MB) AND `public/app.html` (7,662 lines). Need to verify which is canonical.
- **Three separate data catalogs:**
  - `exercises.js` at root (112 exercises, used by app.html)
  - `lib/constants/peptides.js` (50+ peptide records, used by admin)
  - `src/protocols/body/peptides/catalog.js` (separate v2 catalog)
- **6 unapplied SQL migrations** sitting in `sql/` (support tickets, invoice columns, paid-amount tracking, reorder reminders, news carousel — most actually deployed via direct admin work, but the SQL files are stranded)
- **PWA manifest exists** (`public/manifest.json`) but isn't wired into the v2 Vite build
- **`docs/superpowers/`** has 22 spec/plan markdowns documenting prior work — read these before changing anything substantial

---

## Already shipped in this session (record)

| Date | Item | Branch | Status |
|---|---|---|---|
| 2026-04-29 | Phase 0: Merged v2 modular rebuild into `v2-revival` branch (4 small conflicts resolved cleanly) | v2-revival | Pushed |
| 2026-04-29 | Phase 1.1: Built check-in system (8-metric daily screen, modal, system protocol, 16 tests) | v2-revival | Pushed |
| 2026-04-29 | Phase 1.2: Adaptive peptide recommendations (ports v1 getStackAdj, surfaces personalized recs based on 7-day check-in averages) | v2-revival | Pushed |

These are real and valuable, but they're polish on a foundation that has the gaps listed above. They'll work fine once the foundation is real.

---

## v2 → production cutover plan (REVISED)

**Constraint locked 2026-04-29:** v1 stays at adonis.pro until v2 is verified ready. v2 deploys to a staging URL during buildup.

### Phase 0 — Branch revival ✅ DONE (2026-04-29)
v2 modular code merged into `v2-revival` branch. 286 tests pass. Both Vite + Next builds clean.

### Phase 1 — Make v2 a real product (CRITICAL — in priority order)

These are the structural blockers. None of the polish features matter until these ship.

1. **Supabase peptide catalog wiring** — make Adonis read peptides from the same Supabase `products` table the storefront uses, instead of hardcoded JS. Implements the "one admin panel drives both apps" decision.
2. **Supabase Auth** — signup/login for Adonis users. Email + password initially, OAuth later.
3. **Stripe checkout for Pro/Elite** — replace hardcoded access codes with real subscriptions. Use existing Stripe integration patterns from advncelabs side.
4. **Profile capture in onboarding** — add a step before goal setup to collect weight, age, gender, height. Adaptive features can't fire without this.
5. **Apply 6 pending SQL migrations** — clean up `sql/` debt.
6. **Reconcile duplicate catalogs** — consolidate exercises + peptide data so admin panel is the single source.
7. **Wire PWA manifest to Vite build** — Adonis is a PWA per design.

### Phase 2 — Deploy v2 to STAGING (not production)

- Deploy v2 to a non-production URL (e.g. `v2.adonis.pro`, `app.adonis.pro`, or a Vercel preview URL).
- v1 STAYS at adonis.pro the entire time. Production untouched.
- Internal testing only — Jorrel + invited testers.

### Phase 3 — Soak + verify on staging

- Walk through every flow as a real user: signup → onboarding → daily routine → tier upgrade → peptide rec → checkout link → profile edit.
- Hit edge cases: free tier limits, tier downgrade, multi-device sync, etc.
- Fix bugs as they surface. No new features during soak.

### Phase 4 — Graduate v2 to adonis.pro

- Confident v2 is solid → flip the DNS / Vercel project so adonis.pro serves v2.
- Move v1 to a fallback URL (e.g. `legacy.adonis.pro`) for safety, NOT delete yet.
- Watch for issues 7-14 days.

### Phase 5 — Retire v1, resume polish

- Once v2 has been live and stable, delete `app.html` (both copies), `exercises.js`, `programs.js` at root, and any v1-only static assets.
- Resume the polish backlog:
  - Adaptive calorie + workout intensity engine (depends on profile capture from Phase 1)
  - Budget + needle filtering on peptide recs
  - Workout intensity modifiers
  - Legal disclaimers in peptide UI
  - Routine scheduling relative to wake time
  - Female cycle phase adjustments

### Phase 6 — Long-game (depth ramp toward Reading B)

- Cloud sync (multi-device)
- Push notifications
- API integrations: Plaid (financial), Lob (mailing dispute letters), USDA (nutrition DB), wearable integrations
- Cross-domain synergy engine (Elite tier promise)
- Per-domain depth (food DB to 1M items, exercise video library, etc.)

---

## Open items (other)

### 🔴 Customer-impacting
- _None — v1 stable on prod, v2 not yet shipped, advnce labs has its own roadmap_

### 🟡 Build when ready
- Equipment-aware exercise swap engine (designed but failed v1 injection — re-implement during v2 build)
- Equipment question in onboarding + Equipment selector in Profile
- Routine → Train deep link
- Secondary focus workout blending logic

### 💡 Ideas captured, not yet scoped
- Cross-domain synergy engine (Elite differentiator) — needs check-in data first
- Habit-stack chaining — link Body → Mind → Environment as one tap
- Voice check-in — speak the 8 metrics

---

## Cross-references

- [implementation_status memory](../../../.claude/projects/-Volumes-Alexandria--AI-Projects-adonis-next/memory/implementation_status.md) — older v1→v2 audit (2026-04-07, partially superseded by 2026-04-29 audit above)
- [feature_status memory](../../../.claude/projects/-Volumes-Alexandria--AI-Projects-adonis-next/memory/feature_status.md) — what's working / failed injection / planned
- [domains_and_protocols memory](../../../.claude/projects/-Volumes-Alexandria--AI-Projects-adonis-next/memory/domains_and_protocols.md) — full domain breakdown
- [legal_firewall memory](../../../.claude/projects/-Volumes-Alexandria--AI-Projects-adonis-next/memory/legal_firewall_adonis_advnce.md) — Adonis recommends, advnce sells
- [scope_philosophy memory](../../../.claude/projects/-Volumes-Alexandria--AI-Projects-adonis-next/memory/scope_philosophy_depth_ramp.md) — A-quality MVP, B-quality North Star
- [advncelabs_roadmap memory](../../../.claude/projects/-Volumes-Alexandria--AI-Projects-adonis-next/memory/advncelabs_roadmap.md) — sister roadmap for the e-commerce side
- [docs/superpowers/](./superpowers/) — 22 prior plans/specs documenting work done

---

## Update protocol

When something big ships or an open item gets closed:
1. Move the item from its phase to ✅ DONE row in "Already shipped" (or delete for resolved bugs)
2. Bump the date at the top of this doc
3. Touch related memory files if facts changed
4. If the v2 cutover happens, rewrite the **Current state** section
