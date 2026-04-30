# Adonis Protocol OS — Roadmap

_Last updated: 2026-04-29_

Single source of truth for the Adonis fitness app (v1 monolith → v2 modular rebuild). Update at every save-everything checkpoint. Mirror the format used by [advnce labs roadmap](../../../.claude/projects/-Volumes-Alexandria--AI-Projects-adonis-next/memory/advncelabs_roadmap.md) (in memory).

---

## Vision

Adonis Protocol OS is an **8-domain life-protocol app** sold as a SaaS subscription. Both genders. The bar per domain is **rival the best-in-class single-purpose app for that vertical** (Body should rival MyFitnessPal/Whoop, Money should rival Mint/CreditKarma, Travel should rival Nomad List, etc.) — but unified into one OS where domains feed each other.

**The 8 domains** — Body, Money, Travel, Mind, Image, Community/Relationships, Environment, Purpose. (See [domains_and_protocols memory](../../../.claude/projects/-Volumes-Alexandria--AI-Projects-adonis-next/memory/domains_and_protocols.md) for full breakdown.)

**Tier model**
- **Free** — 2 domains (Body always free, user picks the 2nd)
- **Pro ($14.99/mo)** — all 8 domains, credit repair, income, citizenship, nootropics
- **Elite ($29.99/mo)** — Pro + adaptive intensity, AI insights, premium peptides, cross-domain synergy

**Product philosophy**
- **Routine card = the app.** 90%+ of daily UX is the routine card. Domain tabs are configs/dashboards, not destinations.
- Automate everything possible
- Monetize through the system itself (Pro/Elite gating)
- Onboarding = sales funnel (walks all 8 domains, teases value, gates behind Pro)

**The Adonis ↔ advnce labs legal firewall**
The two-brand split is a **compliance moat**, not a product split:
- **Adonis** = research, education, peptide *suggestions* and protocol design. **Does not sell.**
- **advnce labs** = e-commerce fulfillment. **Does not suggest, recommend, or make medical claims.**
This split shields Adonis from regulatory risk on peptide content while keeping the storefront RUO-clean. When the app surfaces a peptide stack, it links the user out to advncelabs.com — Adonis never owns the transaction. Keep this firewall intact in every UX decision.

**6-month target:** $10K MRR.

**Scope philosophy — "depth ramp"**
The North Star is **actual displacement** of best-in-class single-purpose apps (a user uninstalls MyFitnessPal because Adonis Body is genuinely a substitute). MVP and v1 do **not** need to be there. Each release climbs the depth ramp:

| Stage | Body example | Money example |
|---|---|---|
| **MVP / Cutover** (now) | 78 exercises, set logging, PRs, adaptive calories — "feels as serious as Strong + MFP for what I need" | 13-card DB, 5/24, spend optimizer, dispute letter generator |
| **v1.x** | Apple Health import, photo-progress, deload phases, video form library | Plaid integration, real bank sync, automated dispute mailing via Lob |
| **v2.x** | 1M-food database, barcode scan, wearable sync, AI form-check | Real-time score pull (3 bureaus), portfolio tracking, tax optimization |
| **North Star** | Strong + MyFitnessPal + Whoop, displaced | Mint + CreditKarma + The Points Guy, displaced |

Don't over-build a domain at MVP. Ship A-quality across all 8, ramp to B over multiple versions. Hires probably required to actually hit North Star — that's fine, the codebase architecture should accommodate it.

---

## Current state of the codebase

| Layer | Where it lives | Status |
|---|---|---|
| **v1 fitness app** | `public/app.html` (7,662-line monolith) | LIVE on production. Single static HTML PWA. Will be deleted at Phase 2 cutover. |
| **v2 modular rebuild** | `v2-revival` branch (merged 2026-04-29) | Phase 0 complete. 256 tests passing, Next.js + Vite both build clean. Awaiting Phase 1 features before cutover. |
| **Admin panel** | `app/admin/` (Next.js, on main + v2-revival) | LIVE on adonis.pro/admin. ~21 pages. Drives the advnce labs business. The "one admin panel" — its peptide catalog data also feeds Adonis (Phase 1 wiring TBD). |
| **API routes** | `app/api/` (on main + v2-revival) | LIVE. Stripe checkout, webhooks, ambassador/distributor, email via Resend. |

---

## v2 → production cutover plan

### Phase 0 — Branch revival ✅ COMPLETE (2026-04-29)
Merged `origin/claude/interesting-stonebraker` into a new `v2-revival` branch off main. Real conflict surface was 4 small files (everything else flagged was exFAT fileMode drift). 256 tests pass, Next.js + Vite production builds both clean. Production untouched — main keeps deploying as before. Branch on GitHub: https://github.com/jorrelpatterson/adonis-next/tree/v2-revival

### Phase 1 — Close the HIGH-priority gaps (IN PROGRESS)
Five blockers before cutover. The first four are from the [implementation_status memory](../../../.claude/projects/-Volumes-Alexandria--AI-Projects-adonis-next/memory/implementation_status.md); the fifth surfaced 2026-04-29 from the "one admin panel" decision.

1. **Check-in system** — 8 daily metrics (mood, energy, sleep, stress, appetite, skin, clarity, soreness) with emoji indicators. Feeds the adaptive engine. Blocks #2. **← STARTING NEXT**
2. **Adaptive stack recommendations** — `getStackAdj(checkins, stack)` analyzes last 7 days, suggests adding/removing peptides (low sleep → DSIP, low energy → CJC/Ipa, low focus → Selank). Requires #1.
3. **Workout intensity modifiers** — pace-based set/rep adjustments. Extreme behind = +1 set compounds + HIIT finisher; ahead = -1 set; etc.
4. **Budget + needle filtering in peptide recommendations** — v1 filters by budget priority order (Reta → KLOW → CJC/Ipa → DSIP → MOTS-C → Semax → Selank → PT-141) and needle comfort (drops injectables → adds intranasal alts). v2 currently skips both.
5. **Wire Adonis peptide UI to live Supabase catalog** — today v2 has peptides hardcoded in `lib/constants/peptides.js` and `src/protocols/body/peptides/catalog.js`. Make Adonis read from the same Supabase `products` table that advncelabs.com uses, so the admin panel actually drives both apps. Implements the "one admin panel" decision.

These five together = the "adaptive" Pro/Elite differentiator + the live admin influence on the app. Without them, the new tier marketing is empty and the admin panel doesn't actually control Adonis.

### Phase 2 — Hard cutover
**Zero v1 users → no backwards-compat, no parallel run, no rollback artifact.**
- Replace what `public/app.html` serves with the v2 React SPA build
- Confirm Stripe + Supabase + auth flows work end-to-end on the new build
- Delete `app.html` from the repo once v2 is live (no fallback — there's no one to roll back for)
- Move fast; this is the easiest cutover we'll ever have

### Phase 3 — Post-cutover hardening (MED-priority gaps)
- Legal disclaimers in peptide UI ("Education only · Not medical advice" + "Research peptides · Not for human consumption")
- Workout program audit fixes (deadlift on wrong day in Muscle Gain; missing exercises in Fat Loss/Aesthetics/Recomp — see [workout_programs memory](../../../.claude/projects/-Volumes-Alexandria--AI-Projects-adonis-next/memory/workout_programs.md))
- Routine scheduling relative to `prof.wakeH` (v2 currently uses fixed times)
- Female cycle phase adjustments (calorie + intensity tuning by menstrual phase)
- 2 missing peptide research entries + 1 compatibility rule

### Phase 4 — Long-game (LOW-priority)
- **Supabase sync** — v2 is localStorage-only. Cloud sync unblocks multi-device, accountability partner matching at scale, server-side analytics.
- **Push notifications** — surfaced as "Planned" in feature_status. Needed for habit-loop reinforcement.
- **API integrations** — Plaid (financial), SendGrid (transactional email at scale), Lob (physical mail for credit dispute letters), USDA Food (nutrition DB expansion), OpenWeather.
- **Phase progression UI** — Foundation/Hypertrophy/Strength/Deload visualization
- **Dashboard view** — weekly stats, PR board, body measurements

---

## Open items (other)

### 🔴 Customer-impacting
- _None at present — v1 is stable on prod, v2 isn't shipped yet so nothing is breaking customers._

### 🟡 Build when ready
- **Equipment-aware exercise swap engine** — designed but failed injection into the minified `app.html`. Re-implement during v2 build (clean, no minified-file constraints).
- **Equipment question in onboarding + Equipment selector in Profile** — same story as swap engine.
- **Routine → Train deep link** — surfaced in feature_status as planned.
- **Secondary focus workout blending logic** — Profile tab already has the picker; blending logic isn't wired.

### 💡 Ideas captured, not yet scoped
- Cross-domain synergy engine (Elite tier promise) — surface "your low sleep last 5 days is dragging your workout pace AND your skin protocol" type insights. Needs check-in data first.
- Habit-stack chaining — link Body workouts to Mind breathwork to Environment workspace prep as a single "morning routine" with one tap.
- Voice check-in — speak the 8 metrics instead of tapping. Voice-to-text MVP.

---

## Cross-references

- [implementation_status memory](../../../.claude/projects/-Volumes-Alexandria--AI-Projects-adonis-next/memory/implementation_status.md) — v1→v2 audit (2026-04-07, 22 days stale; verify before relying on file:line claims)
- [feature_status memory](../../../.claude/projects/-Volumes-Alexandria--AI-Projects-adonis-next/memory/feature_status.md) — what's working / failed injection / planned
- [domains_and_protocols memory](../../../.claude/projects/-Volumes-Alexandria--AI-Projects-adonis-next/memory/domains_and_protocols.md) — full domain breakdown
- [protocol_audit_body memory](../../../.claude/projects/-Volumes-Alexandria--AI-Projects-adonis-next/memory/protocol_audit_body.md) — Body domain deep audit
- [protocol_audit_other_domains memory](../../../.claude/projects/-Volumes-Alexandria--AI-Projects-adonis-next/memory/protocol_audit_other_domains.md) — all other domains
- [product_philosophy memory](../../../.claude/projects/-Volumes-Alexandria--AI-Projects-adonis-next/memory/product_philosophy.md) — Routine is king, automate everything
- [onboarding_strategy memory](../../../.claude/projects/-Volumes-Alexandria--AI-Projects-adonis-next/memory/onboarding_strategy.md) — onboarding = sales funnel
- [workout_programs memory](../../../.claude/projects/-Volumes-Alexandria--AI-Projects-adonis-next/memory/workout_programs.md) — 4 audited programs
- [advncelabs_roadmap memory](../../../.claude/projects/-Volumes-Alexandria--AI-Projects-adonis-next/memory/advncelabs_roadmap.md) — sister roadmap for the e-commerce side

---

## Update protocol

When something big ships or an open item gets closed:
1. Move the item from its section to the appropriate **Phase X** "complete" line (or delete for resolved bugs)
2. Bump the date at the top of this doc
3. Touch the related memory file if facts changed
4. If the v2 cutover happens, update the **Current state** table top-to-bottom — that's the headline change
