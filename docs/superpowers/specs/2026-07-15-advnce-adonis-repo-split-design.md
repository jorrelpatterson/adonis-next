# ADVNCE / Adonis Repo Split — Design

**Date:** 2026-07-15
**Status:** Draft — awaiting Jorrel's review
**Decision:** Two repos, one per business, three Vercel projects. Full separation in one focused push (~4 sessions), zero data loss.

## Context / Problem

Adonis (fitness product, adonis.pro) organically grew the ADVNCE Labs peptide business inside its repo. Today `adonis-next` is ~70% peptide company by weight:

- `app/admin/` — 15 sections of ADVNCE back office, served at adonis.pro/admin
- ~50 of its 60+ API routes are ADVNCE business ops (inventory, invoices, POs, vendors, pre-sell, compound emails, ambassadors, recruitment, rewards)
- 5 of 7 crons are ADVNCE
- `docs/` is mostly ADVNCE business docs (vendors, pricing, clients, marketing, brand)
- join.advncelabs.com (recruitment drip) points at the *adonis* Vercel project
- Two ADVNCE-facing page trees beyond /admin: `app/ambassador/` (invoice portal), `app/ambassadors/` (apply form)

Meanwhile the ADVNCE storefront lives in a separate repo (`advnce-site` → advncelabs.com), with duplicated ambassador routes in both repos (`ambassador-message`, `ambassador-payout`) — evidence of active drift. CLAUDE.md/AGENTS.md describe a v1 architecture that no longer exists. `jorrel-os.json` tracks both businesses under one card (~20 mixed blockers).

Result: every work session on one business wades through the other. Jorrel's goal: **"easily work on advnce and the app cleanly and separately."**

## Goals

1. One repo per business; a work session touches exactly one business's context
2. Peptide company fully off the adonis.pro domain (admin.advncelabs.com)
3. Sets the pattern for future brands (ASCND, Cleanist): one repo per company, brand-prefixed repo names
4. **Zero data loss anywhere — hard constraint** (see Data-Safety Rules)

## Non-Goals (explicitly out of scope)

- **Supabase split** — both businesses keep sharing the one Supabase project. No schema changes, no data migration, ever, in this project.
- Storefront rewrite/merge into Next.js — storefront code is untouched
- Admin cookie signing fix — fast-follow after the move (already on blocker list; don't touch auth mid-migration)
- Flattening `/admin/*` URL paths in the new app — cosmetic follow-up
- Reorganizing the `Ai Projects/` root folders — repos only, no folder moves (new naming convention going forward: brand-prefixed repos)
- Adonis→ADVNCE product integration (app pushing users to buy peptides) — future work, unblocked by this split

## Decision Summary

**Chosen:** Evolve `advnce-site` repo into `advncelabs` (rename, preserves history), add the back office as `admin/` (new Next.js app extracted from adonis-next). Two Vercel projects deploy from the one repo via Root Directory settings — storefront project untouched, new `advnce-admin` project for the back office. `adonis-next` slims to the fitness product only.

```
adonis-next  ──► Vercel "adonis"       ──► adonis.pro           fitness product only

advncelabs   ──┬► Vercel advnce-site   ──► advncelabs.com       storefront (code untouched)
  (site files) │
  admin/       └► Vercel advnce-admin  ──► admin.advncelabs.com back office + ambassador portal
  docs/, sql/                              join.advncelabs.com  recruitment drip
```

**Alternatives rejected:**
- *Three repos (separate advnce-admin repo):* identical deployment topology, but splits one business across two repos — perpetuates the doc/code drift already observed
- *Merge admin into the storefront's runtime:* requires converting the live revenue-generating static site + 19 bare Vercel functions to Next.js conventions — biggest migration, risk concentrated on the money site, for no separation gain
- *Domain remap only (code stays):* an afternoon of work but the repo tangle remains; fails the primary goal

## Data-Safety Rules (non-negotiable)

1. **Supabase untouched** — code/deployment split only
2. **Copy → verify → delete, never move** — nothing removed from adonis-next until the new admin is verified live; deletions are git commits (reversible; history persists forever)
3. **Pre-flight snapshot** — all repos committed + pushed to GitHub before surgery, plus local zip of both folders
4. **Secrets copied, not moved** — old Vercel project keeps env vars until the end
5. **Old admin stays deployed through cutover** — rollback = point domains back

## Inventory

### Moves adonis-next → advncelabs/admin/ (copied, then stripped in Phase 4)

| Category | Contents |
|---|---|
| Admin UI | `app/admin/**` (15 sections: inventory, invoices, orders, purchases, vendors, pre-sell, pricing, marketing, distributors, cards, support-tickets, visitors, discount-codes, login + layout, admin-mobile.css) |
| Ambassador pages | `app/ambassador/**` (invoice portal), `app/ambassadors/**` (apply form) |
| API routes (~50) | admin, admin-auth, ambassador-apply/-content-digest/-images/-message/-past-customers/-payout/-welcome/-write, compound-email-draft-list/-draft-write/-generate/-preview/-resume/-send, discount-code-write, email-unsub, inventory, inventory-adjust/-adjustments/-loss-stats, invoice-get/-list/-stats/-transition/-write, notify, notify-customer, order-customer-update, order-status, orders, orders-list, past-customers, payment-reminder, place-order, presell-cancel/-po-placed/-queue, product-write, purchase-receive/-write, recruitment-application-write, recruitment-click, rewards-announce, shipping-confirm, social-image-proxy, social-post-write, subscribe-welcome-2/-3, subscribers-admin, support-tickets, vendor-prices-write, vendor-write, jorrel-os/status (business metrics) |
| Crons (5) | welcome-emails, reorder-reminders, news-scrape, news-curate, recruitment-drip (from `vercel.json` + `app/api/cron/`) |
| Business lib/ | admin-roles, admin-users, buildRecipientList, businessCard (+test), enrichItemSizes, get-current-admin, invoiceId, invoiceImage, news/** (peptide-research content engine), onStockRise, po-email-template, renderCompoundEmail, renderRecruitmentEmail, reorderDuration (+test), requireAdmin, requireAdminOrCron, revenue, rewardsAnnounce, unsubToken |
| Templates & scripts | `templates/email/**` (recruitment-*.html etc.), `scripts/send-recruitment-drip.js` + any other business scripts (full sweep in Phase 1) |
| Business docs/ | ambassadors/, brand/, clients/, marketing/, pricing/, vendors/, daily-vial-content-strategy.md, SESSION-HANDOFF-recruitment-drip.md |
| Auth | `middleware.js` (admin cookie auth + marketing-move redirects) |
| Config carry-over | `next.config.js` `outputFileTracingIncludes` for recruitment-drip; business `redirects()` entries; `public/social-images/` (ADVNCE social content — moves); `public/preview/` (classify in Phase 1 sweep) |

### Stays in adonis-next

`src/**` (v2 PWA + vitest suite), `ios/**` + Capacitor + vite configs, `public/app/`, `public/index.html` + manifest/icons, `app/page.jsx` + layout + globals.css, API: app-signup, me, push, cron/routine-reminders, cron/career, lib: appSignup, push/, career/**, supabase.js, constants (exercises, programs, peptides.js, theme.js), docs: superpowers/specs, ios-p4 checklist, v1 inventory/parity ledgers, visual-baselines.

### Copied to both (shared by nature, allowed to diverge)

`lib/supabase.js` client, `lib/constants/theme.js` (admin UI uses the design tokens), `lib/constants/peptides.js` if the admin references it. Repo boundary > cross-business DRY.

### Ambiguous — resolve during Phase 1 caller-check

`api/me`, `api/env-check` (likely: trim per repo), `lib/constants/peptides.js` usage map. **Every moved route gets a caller check** (admin UI / storefront / emails / crons / app) before cutover — nothing orphaned or double-homed.

### Dependency split (package.json)

- `advncelabs/admin`: next, react, @supabase/supabase-js, stripe, @anthropic-ai/sdk (compound emails + news curator), sharp, archiver, qrcode, rss-parser (Resend is called via raw fetch — no SDK package to carry)
- `adonis-next` prunes to: next, react, @supabase/supabase-js, @capacitor/*, @stripe/stripe-js (verify — likely removable), vite/vitest toolchain. Prune only what the build + full test suite prove unused.

## Cutover Plan (5 phases, ~4 sessions)

### Phase 0 — Pre-flight (data safety)
- adonis-next: commit AGENTS.md; push (with approval per MASTER-BRIEFING)
- advnce-site: commit uncommitted swag-store work to a `swag-store` branch, push (offsite backup, no deploy); push `main` (deploys ref-capture a551277 — already approved on the next-action list)
- Local zip snapshot of both repo folders
- Export/record env-var inventory of the adonis Vercel project (`vercel env ls`); map each var to moved vs staying routes

### Phase 1 — Build the admin app (copy, don't move)
- GitHub: rename `advnce-site` → `advncelabs` (old URLs auto-redirect); rename local folder; migrate Claude per-project memory dir to the new path
- Scaffold `admin/` Next.js app; copy full inventory from adonis-next (adonis-next untouched)
- Fix imports/paths; sweep `scripts/`, `templates/`, `public/` for missed business assets
- Caller-check every moved route; resolve ambiguous items
- Local smoke test (`npm run dev` in admin/) — **read-mostly: local dev hits the live shared Supabase**

### Phase 2 — Parallel-run on Vercel
- Create Vercel project `advnce-admin`, repo `advncelabs`, Root Directory `admin/`
- Copy env vars; set `BASE_URL=https://admin.advncelabs.com` (293 call sites derive links from it; only one hardcoded adonis.pro URL exists — fix it in the copy)
- Deploy with **no crons, no custom domains** → verify on preview URL: login, all 15 admin sections render live data, ambassador portal + apply form, one low-stakes write (e.g., support-ticket note)
- Old admin at adonis.pro/admin remains primary; avoid concurrent mutations during verification

### Phase 3 — Cutover (target: one sitting)
- Add domain admin.advncelabs.com to advnce-admin; move join.advncelabs.com from adonis project → advnce-admin
- **Crons: remove from adonis-next `vercel.json` + deploy first, then enable in admin + deploy.** Ordering rationale: <1h gap in reminders/drip is invisible; double-fire of recruitment-drip = duplicate emails to prospects
- Repoint any Stripe webhook endpoints and Resend webhook/links targeting adonis.pro (audit dashboards in this phase)
- Jorrel + VA log in at admin.advncelabs.com (cookie is domain-scoped; one-time re-login + re-bookmark)

### Phase 4 — Strip adonis-next + permanent redirects
- Delete moved trees; single revertable commit
- `next.config.js` permanent redirects (kept forever — they cover every link in every email ever sent):
  - `/admin/:path*` → `https://admin.advncelabs.com/admin/:path*`
  - `/ambassador/:path*`, `/ambassadors/:path*` → same-path on admin domain
  - each moved `/api/:route*` → same-path on admin domain (308 preserves method/body for POST links)
- Update the 4 storefront references (advnce-ambassador/dist-portal/etc. → new URLs)
- Prune adonis-next deps; `npm run build` + full vitest suite green; verify iOS app unaffected (it calls only app-signup/push, which stayed)

### Phase 5 — Context layer + optional tidy
- Rewrite CLAUDE.md + AGENTS.md in **both** repos: accurate, current, single-business (fixes v1-era staleness in adonis-next docs)
- `jorrel-os.json`: adonis-next card keeps only Adonis items; new `advncelabs` card gets the ADVNCE blockers/next-actions (register project_id on os.jorrel.io side — small jorrel-os repo task)
- Claude memory split: move ADVNCE memories (wholesale model, restock mapping, rewards, recruitment, etc.) to the advncelabs project memory; keep Adonis memories in adonis-next
- Optional final tidy (separate, reversible, only after all-verified): storefront files → `site/`, flip storefront project Root Directory to `site/`

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Missed env var → feature 500s | Phase 0 env inventory mapped to routes; Phase 2 full-section verification before any cutover |
| Cron double-fire (duplicate drip emails) | Remove-old-first-then-enable-new ordering; drip gap <1h is harmless |
| Links in already-sent emails break | Permanent 301/308 redirects in adonis-next, kept forever; new sends fixed via BASE_URL |
| Storefront regression | Zero storefront code changes except 4 link hrefs; `site/` folder move deferred + optional |
| Verification writes pollute live DB | Read-mostly discipline; single designated low-stakes write test |
| Stripe/Resend webhooks pointing at old domain | Explicit dashboard audit in Phase 3 |
| Lost work during repo surgery | Data-Safety Rules 2, 3, 5; GitHub rename auto-redirects; git history immutable |
| iOS app breakage | App calls only app-signup/push (verified by grep) — both stay; no App Store release needed |

## Verification Checklist (gates between phases)

- [ ] P0: both repos pushed; zip snapshot exists; env inventory recorded
- [ ] P1: admin/ builds locally; every route caller-checked
- [ ] P2: all 15 admin sections + ambassador pages verified on preview against live data
- [ ] P3: domains resolve; crons fire once each in new home (check logs next day); webhooks repointed; VA logged in
- [ ] P4: adonis-next build + full test suite green; every redirect spot-checked (admin page, ambassador page, one API/email link); storefront links updated
- [ ] P5: fresh Claude session in each repo sees only that business's context

## Open Items (tracked for the implementation plan)

1. os.jorrel.io project registration mechanics for the new `advncelabs` card
2. Full `scripts/` + `public/` sweep results (Phase 1)
3. Stripe/Resend dashboard webhook audit results (Phase 3)
4. Fast-follows after the split: signed admin cookies, VA path-allowlist hole (`lib/admin-roles.js` prefix-match), flatten `/admin/*` paths, `site/` tidy
