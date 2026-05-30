# Session Handoff — Ambassador Recruitment Drip

> ## ⏸️ CURRENT STATE — 2026-05-30: LOADED & PARKED, NOT LAUNCHED
>
> The campaign is fully built, deployed, verified, and **parked**. Operator will launch later.
>
> - **823 solar-dealer recipients** imported into `ambassador_recruitment_recipients`, `csv_batch_id='2026-05-30-solar-prod'`, all `drip_status='queued'`, `next_touch_num=1`, **`next_send_at=NULL`** (inert → cron finds 0 due → sends nothing). Source: `~/Desktop/prod_leads.csv` (final). Excluded opted_out/test/invalid_email/healthcare-urgent; included construction + role accts + business_name_looks_personal.
> - **TO LAUNCH (one action, confirm with operator first):** `PATCH ambassador_recruitment_recipients?csv_batch_id=eq.2026-05-30-solar-prod` → `{"next_send_at":"<now ISO>"}`. Next hourly cron tick sends touch 1 (~200/run); Day 0/3/7/14/21 cadence is automatic.
> - **Corrections applied since the original handoff below:**
>   - `ADVNCE_ORIGIN=https://join.advncelabs.com` (NEW subdomain → `adonis-next` Vercel project; GoDaddy CNAME `join`→`cname.vercel-dns.com`). The handoff's `advncelabs.com` apex was WRONG (separate storefront, 404s the app routes). `www.adonis.pro` also serves the app.
>   - Cron was bundling-broken on Vercel → fixed with `experimental.outputFileTracingIncludes` in `next.config.js` (without it the scheduled cron throws "Cannot find module renderRecruitmentEmail.js").
>   - CAN-SPAM postal address added to all 5 footers; wholesale cross-sell block removed from touch 1 (page 404'd); KLOW touch-3 line approved.
>   - Re-running the CSV import RESETS drip state (merge-duplicates) — import once.
> - **Verified:** real production send via cron, join.advncelabs.com links, postal address, unsubscribe + suppression (0 overlap with `subscribers`). Deploy HEAD at park: `e9c2364`.
>
> ---

**Date:** 2026-05-28
**Owner:** Jorrel Patterson
**HEAD at handoff:** `6cac700` (commit range `dea3cd5` → `6cac700`, 15 commits, all pushed to `origin/main`)
**Feature:** 5-touch ambassador recruitment email drip targeting ~1,500 opt-in solar-rep contacts.

Read alongside:
- Plan: `docs/superpowers/plans/2026-05-28-ambassador-recruitment-blast.md`
- Spec: `docs/superpowers/specs/2026-05-28-ambassador-recruitment-blast-design.md`

---

## Status

**DONE and committed/pushed (`dea3cd5`→`6cac700`, deployed to Vercel):**
- All code shipped. 7/7 smoke checks green. `git push origin main` confirmed (`375df49..6cac700`). Vercel build kicked off at end of session.
- Supabase schema **already applied** — the operator ran the migration SQL in Supabase Studio mid-session; all 3 tables returned HTTP 200 on verification.

**REMAINS (manual, not code):** the live launch — "Task 16" below. Nothing in the codebase is blocking; the only outstanding work is operating the system: import the real CSV, do a single-recipient dry run, then let the hourly cron run. See **REMAINING WORK** and the **launch-blocking gotchas** in Gotchas.

---

## What was built

| Component | Path |
|---|---|
| Schema (3 tables + indexes + `updated_at` trigger; RLS enabled, accessed via service-role) | `sql/2026-05-28-ambassador-recruitment-blast.sql` |
| Touch 1 template — `$100K. NO NEW DOORS.` pitch + math + wholesale cross-sell | `templates/email/recruitment-1-pitch.html` |
| Touch 2 template — Week 1 playbook | `templates/email/recruitment-2-playbook.html` |
| Touch 3 template — 4-compound primer (compound URLs injected at render time) | `templates/email/recruitment-3-compounds.html` |
| Touch 4 template — static "first wave filling" scarcity | `templates/email/recruitment-4-scarcity.html` |
| Touch 5 template — soft goodbye | `templates/email/recruitment-5-goodbye.html` |
| Renderer — 5-way template switch, HMAC unsub link, per-touch click-wrapped CTAs, touch-3 compound-URL lookup | `lib/renderRecruitmentEmail.js` |
| CSV import — idempotent upsert by email, suppression skip, batch tagging | `scripts/import-recruitment-csv.js` |
| Click-tracking redirect — 302 + pause-on-warm-click | `app/api/recruitment-click/route.js` |
| Public apply page (server, prefills from `?r=`) | `app/ambassadors/apply/page.jsx` |
| Apply form (client) | `app/ambassadors/apply/ApplyForm.jsx` |
| Apply page layout shell | `app/ambassadors/layout.jsx` |
| Public apply API — inserts application, flips recipient to `applied` | `app/api/ambassador-apply/route.js` |
| Admin approve/reject — creates ambassador + fires welcome email | `app/api/recruitment-application-write/route.js` |
| Drip orchestrator — state machine, throttle, retry-on-failure | `scripts/send-recruitment-drip.js` |
| Hourly cron entry point (shells out to the orchestrator) | `app/api/cron/recruitment-drip/route.js` |
| Cron schedule entry `0 * * * *` | `vercel.json` |
| Admin queue page — drip KPIs + pending/reviewed application cards | `app/admin/marketing/recruitment/page.jsx` |
| Application card (client approve/reject) | `app/admin/marketing/recruitment/ApplicationCard.jsx` |
| Marketing-hub tile linking to the queue | `app/admin/marketing/page.jsx` |
| End-to-end smoke test | `scripts/smoke-recruitment-drip.js` |

**Drip state machine** (`ambassador_recruitment_recipients.drip_status`): `queued` → `in_progress` (after touch 1 sends) → `completed` (after touch 5). Side branches: `paused` (warm apply-click), `applied` (submitted form — terminal), `unsubscribed` (terminal). Touch spacing in `send-recruitment-drip.js`: `GAP_DAYS_AFTER_TOUCH = {1:3, 2:4, 3:7, 4:7, 5:0}` → cumulative Day 0 / 3 / 7 / 14 / 21.

---

## Key decisions & rationale (the "why")

- **Audience = solar reps specifically.** Closer-mindset, commission-trained, networked into the male 25–45 demographic that buys peptides. The pitch leans on "you already close — add this to your bag, no new doors."
- **Apply flow = form → manual admin approval (not auto-create).** Chosen over auto-approval so a bad/accidental click doesn't flood the ambassador roster; the form collects the same info you'd ask anyway. Approval hands off to the **existing** ambassador-welcome flow (generates code + welcome email).
- **5 touches over Day 0/3/7/14/21.** Operator picked this cadence over shorter (3/10d) or longer (7/30d). Front-loaded (0→3→7) to catch momentum, then spaced out (→14→21) to avoid fatigue.
- **Touch 2 is a "playbook," not testimonials.** Original plan was social-proof with real first-check numbers — dropped because there are no pilot ambassadors with numbers yet. Swapped to a concrete Day 1/2/3/7 sequence to kill the "how would I even start?" objection.
- **Touch 3 compounds = Retatrutide, BPC-157, KLOW, Semax.** Four-corner coverage of solar-rep-network curiosity: metabolic/GLP-1 (the "next-gen Ozempic" convo), recovery ("knees hurt by 35"), the all-in-one stack, cognitive/brain-fog. Operator explicitly rejected talking about **legality** in this touch — research framing only, never therapeutic. Compound product URLs are looked up at render time from `compound_marketing.product_url` by slug, falling back to the catalog page.
- **Touch 4 scarcity is STATIC, not dynamic.** Dynamic "{state}: {n} spots left" was designed but cut as "too complex" (would need a live per-state count query at send time). Static "50 per state, past halfway in most."
- **Team voice, no personal sign-off.** Operator removed his name everywhere; all 5 emails sign `— The advnce labs team` and body voice is first-person plural ("We're reaching out…"), matching the brand-identity doc.
- **Headline = `$100K. NO NEW DOORS.` / *Same network. Different product.*** (Option A of 3). Math-anchored — puts the target in the headline; "no new doors" is the actual benefit (no more knocking houses).
- **Math reverse-engineered to $100k/yr.** $220 avg order × 20% top-tier commission × 12 reorders/yr ≈ $528/customer/yr → ~190 active referred customers → framed as ~16 referrals/month ≈ 4/week at ramp, "then the book pays you whether you work or not."
- **Wholesale cross-sell block in touch 1.** Operator asked for an "already selling peptides? see our wholesaler program" section so reps with their own brand self-select into wholesale instead of churning out. Uses the term "wholesale program" (never "MLM"/"distributor network").
- **Pause-on-warm-click (14 days).** If a recipient clicks the apply CTA but doesn't submit, they're warm-but-distracted — re-pitching the same thing burns goodwill, so the drip pauses 14 days (`recruitment-click/route.js`, only when `drip_status === 'in_progress'`). On the next successful send `paused_until` is cleared.
- **250ms throttle, batches of 200.** Deliverability pacing for the ~1,500-row send (spec said 50/200ms; code shipped `limit=200` candidates with `THROTTLE_MS = 250`).
- **Idempotent upsert by email.** Import is `on_conflict=email` so re-running the same CSV is a no-op and preserves existing drip state. Suppression list loaded once before the loop.
- **Shared suppression.** One opt-out covers both compound-spotlight and recruitment drips via the existing `compound_email_unsubscribes` table. The orchestrator re-checks suppression mid-flight and marks `unsubscribed` if a recipient opted out between touches.
- **HMAC-signed unsub links.** Reuses the existing `lib/unsubToken.js` `signUnsubToken(email)` helper; unsub link points at the existing `/api/email-unsub` route (NOT a new route — see discrepancies).
- **No open tracking.** Resend webhooks deferred; pause logic relies on click + apply + unsubscribe only (open-only was judged too noisy).

---

## Gotchas / things to watch

**LAUNCH-BLOCKING — read before sending:**

- **`ADVNCE_ORIGIN` must be set to `https://www.advncelabs.com` (or wherever the apply page is served).** In `scripts/send-recruitment-drip.js`, `BASE` defaults to **`https://www.adonis.pro`**. `BASE` is what builds the apply-link and unsubscribe-link hostnames embedded in every email (via `renderRecruitmentEmail`). If `ADVNCE_ORIGIN` is not set in the cron/orchestrator environment, recipients will get links pointing at `adonis.pro` instead of `advncelabs.com`. Verify this env var on Vercel before the first send.
- **`EMAIL_UNSUB_SECRET` must be present (32+ chars).** `signUnsubToken` throws if it's missing/short, which would fail rendering for every recipient. It was set up during the compound-email feature; confirm it's still in the orchestrator env.
- **Wholesale URL is a placeholder.** Touch 1's wholesale CTA and the click redirect both point to `https://www.advncelabs.com/advnce-wholesale.html`, hardcoded in `lib/renderRecruitmentEmail.js` and `app/api/recruitment-click/route.js`. That page may not exist yet — swap when the wholesale page ships, or accept a 404 on that secondary CTA.
- **KLOW one-liner needs owner sign-off before touch 3.** Spec flagged the framing "multi-compound recovery + performance blend" as sensitive formulation language requiring Jorrel's approval before the first touch-3 send (touch 3 fires ~Day 7).

**Operational:**
- **Cron auth.** `/api/cron/recruitment-drip` uses `requireAdminOrCron` — accepts either a `Bearer ${CRON_SECRET}` header (Vercel Cron sends this) or a logged-in admin session cookie. Manual curl from a terminal needs an admin cookie jar (`-b /tmp/admin-cookies.txt`) or the `CRON_SECRET` bearer.
- **Cron route shells out** via `exec("node scripts/send-recruitment-drip.js")` with `maxDuration = 300` / 270s timeout. The orchestrator loads `/tmp/advnce.env` if present locally; on Vercel it relies on `process.env` passed through. Confirm `RESEND_API_KEY`, `SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_URL`, and `SUPABASE_SERVICE_KEY`/`SUPABASE_SERVICE_ROLE_KEY` are all live in the Vercel env.
- **Benign warning (left as-is):** `lib/renderRecruitmentEmail.js` is ESM but `package.json` has no `"type": "module"`, so Node emits a re-parse performance note. No functional impact; not fixed because adding `"type":"module"` would affect all the CommonJS `require()` scripts in the repo.
- **Approval triggers a REAL welcome email.** The smoke test deliberately skips the approve step to avoid sending a real Resend email; it only verifies the route is live. So the full approve→ambassador-create→welcome-email path was not exercised end-to-end automatically — that's exactly what step 2 of the dry run covers manually.
- **Send-failure behavior:** on Resend failure the orchestrator logs a `failed` row, does NOT advance `next_touch_num`, and pushes `next_send_at` out 1 hour so the next cron tick retries instead of hammering.

---

## REMAINING WORK — "Task 16" live launch (manual)

**1. Import the real ~1,500-row CSV.** Drop the file outside the repo (e.g. `data/solar-reps-wave-1.csv`), then:
```bash
node scripts/import-recruitment-csv.js path/to/your-1500-row-csv.csv --batch-id=2026-05-28-solar-wave-1
```
- Columns are auto-mapped (case/spacing-insensitive): `email` (required), `name` or `first_name`/`last_name`, `phone`, `company`, `city`, `state`, `volume`.
- Verify the printed upsert count matches the CSV. It reports skips: no-email / invalid-regex / already-suppressed.
- Each imported row lands as `drip_status='queued'`, `next_touch_num=1`, `next_send_at = now() + 5 min` (so the next cron tick picks it up). Re-running the same CSV is a safe no-op.

**2. Single-recipient dry run BEFORE opening the floodgates:**
- Insert just your own email into `ambassador_recruitment_recipients` with `next_send_at = now()` (and `drip_status='queued'`, `next_touch_num=1`). Easiest is a one-row CSV through the import script, then PATCH `next_send_at` to now.
- Fire the cron once:
  ```bash
  curl -sS https://adonis.pro/api/cron/recruitment-drip -b /tmp/admin-cookies.txt
  ```
  (Use the real production origin and an admin cookie jar, or send the `Authorization: Bearer $CRON_SECRET` header.)
- Confirm touch-1 email arrives → click the apply CTA → confirm it 302-redirects to `/ambassadors/apply?r=…` → submit the form → confirm an application appears in the admin queue at `/admin/marketing/recruitment` → Approve it → confirm the welcome email fires and an ambassador row + code is created.

**3. Open the floodgates.** Nothing further to do — cron is already scheduled hourly (`0 * * * *` in `vercel.json`). Recipients with `next_send_at <= now()` get touch 1 on the next tick; subsequent touches fire on the Day 3/7/14/21 schedule automatically.

---

## Environment variables the launch depends on

| Var | Used by | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_URL` | all routes + scripts | Supabase REST base |
| `SUPABASE_SERVICE_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | all routes + scripts | service-role (RLS bypass) |
| `RESEND_API_KEY` | orchestrator + ambassador-welcome | sends from `advnce labs <ambassadors@advncelabs.com>` |
| `EMAIL_UNSUB_SECRET` | `lib/unsubToken.js` | 32+ chars or rendering throws |
| `ADVNCE_ORIGIN` | `send-recruitment-drip.js` | **set to `https://www.advncelabs.com`** — defaults to `https://www.adonis.pro` |
| `CRON_SECRET` | `requireAdminOrCron` | Vercel Cron bearer auth |

---

## How to resume

1. Read this doc, then the plan (`docs/superpowers/plans/2026-05-28-ambassador-recruitment-blast.md`) and the spec (`docs/superpowers/specs/2026-05-28-ambassador-recruitment-blast-design.md`).
2. The admin queue / monitoring UI lives at **`/admin/marketing/recruitment`** (reachable from the Marketing hub tile "Recruitment Drip"). It shows drip-status KPIs, per-touch send counts, pending applications, and recent reviews.
3. If verifying behavior end-to-end, run `node scripts/smoke-recruitment-drip.js` (needs `EMAIL_UNSUB_SECRET` + Supabase env; expects a dev server at `ADVNCE_ORIGIN` or `http://localhost:3000`). It cleans up after itself and skips the real-send approve step.

---

## Discrepancies found (transcript/plan vs. committed code — CODE wins)

1. **Unsubscribe route.** Plan/spec describe a generic HMAC unsub. The shipped renderer points the unsub link at the **existing** `/api/email-unsub` route (reused from the compound-email feature), not a new recruitment-specific one. `email-unsub` upserts into `compound_email_unsubscribes` (or stamps `subscribers.compound_email_unsubscribed_at`). Correct and intentional — shared suppression — just not a new file.
2. **Touch-spacing constant lives in code, not as `[null,3,4,7,7]`.** Plan wrote the gap array as `touch_gap_days[next_touch_num]`; code uses `GAP_DAYS_AFTER_TOUCH = {1:3,2:4,3:7,4:7,5:0}` (gap *after* touch N). Same resulting cadence (0/3/7/14/21).
3. **Throttle/batch numbers.** Spec said batches of 50 with 200ms throttle. Code ships `limit=200` candidates per run with `THROTTLE_MS = 250`.
4. **`source` derivation.** Spec implied `source='recruitment_drip'` default. Code sets `source = recipientId ? 'recruitment_drip' : 'organic'` in the apply API — organic (no tracking token) applicants are tagged `organic`.
5. **`BASE`/origin default mismatch (important).** Orchestrator defaults `BASE` to `https://www.adonis.pro`, but the brand/email domain is `advncelabs.com`. Links will be wrong unless `ADVNCE_ORIGIN` is set. Flagged above as launch-blocking.
6. **`volume` not captured on applications.** The recipients table and import script handle `volume`, and the `ambassador_applications` table has a `volume` column, but the apply API does not write `volume`. Minor — volume is preserved on the recipient row, just not copied onto the application.
7. **Co-author trailer.** Commits are attributed to "Claude Opus 4.7 (1M context)" (the model used during the build), not 4.8.
8. **Plan said the subagent should leave the SQL unapplied (`DONE_WITH_CONCERNS`).** In practice the operator applied the migration in Supabase Studio mid-session and all 3 tables verified HTTP 200 — schema is live.
