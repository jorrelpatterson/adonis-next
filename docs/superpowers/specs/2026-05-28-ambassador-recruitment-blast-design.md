# Ambassador Recruitment Blast — Design Spec

**Date:** 2026-05-28
**Owner:** Jorrel Patterson
**Status:** Approved (brainstorm complete; implementation plan next)

---

## 1. Purpose

Recruit solar-industry sales reps into the existing advnce labs ambassador program via a 5-touch email drip targeting ~1,500 opt-in contacts imported from a CSV. The drip leads with the math ($100k/year achievable), follows up with a concrete first-week playbook, a brand-voice compound primer (Retatrutide, BPC-157, KLOW, Semax), a static scarcity nudge, and a soft-goodbye closer.

A new public `/ambassadors/apply` page captures applications. Admin reviews approve flows through the existing ambassador onboarding (which already triggers the `ambassador-welcome` email and generates a referral code).

---

## 2. Scope

**In scope**

- New Supabase tables for recruitment recipients, per-touch send records, and incoming applications.
- CSV import script that loads ~1,500 contacts into the recipients table.
- Five email templates with parameterized HTML.
- A drip orchestrator script run on cron that advances each recipient through the 5 touches with pause/skip logic.
- A public `/ambassadors/apply` page (cream + cyan brand, simple form).
- A new `/api/ambassador-apply` POST endpoint and click-tracking redirect.
- An admin queue at `/admin/marketing/recruitment` for monitoring drip progression and reviewing applications.
- Reuse of the existing `compound_email_unsubscribes` suppression table (one opt-out covers both compound spotlight and recruitment drips).
- Reuse of the existing HMAC unsubscribe token helper and footer pattern.

**Out of scope (deferred)**

- Open tracking via Resend webhooks (pause logic uses click + apply + unsubscribe only).
- A/B subject-line testing.
- Automatic dynamic state-level scarcity ("{state}: {n} spots left") — fallback is static.
- Auto-approval. All applications go to a manual review queue.
- Reactivating recipients who completed the drip without applying. They drop off the list.

---

## 3. Decisions made during brainstorm

| # | Decision |
|---|---|
| List source | CSV file (~1,500 solar-rep contacts, opt-in) with columns: name, email, phone, company, city, state, volume |
| Audience framing | Solar reps — closer-mindset, commission-trained, networked into male 25–45 demographic |
| Voice | Brand "team voice" (first-person plural). All sign-offs: *"— The advnce labs team."* No personal sign-off from Jorrel. |
| Apply flow | Form submission → admin manual approval (not auto-create) → existing `ambassador-welcome` triggers code + link |
| Headline (touch 1) | **$100K. NO NEW DOORS.** / *Same network. Different product.* |
| Math anchor | $100k/year reverse-engineered: $220 avg × 20% × 12/yr × ~190 customers = ~$10,560/customer/year×190 → $100k. Translated to ~4 referrals/week ramp. |
| Cross-sell | Wholesale program block at the bottom of touch 1 (cyan-bordered card, "DIFFERENT TRACK" eyebrow) |
| Drip cadence | 5 touches over 21 days: Day 0, 3, 7, 14, 21 |
| Touch 2 angle | Playbook — concrete Day 1/2/3/7 sequence |
| Touch 3 angle | Compound primer — Retatrutide, BPC-157, KLOW, Semax |
| Touch 4 angle | Static scarcity ("first wave filling") |
| Touch 5 angle | Soft goodbye ("we'll stop bugging you") |
| Pause logic | Stop drip on: applied, unsubscribed. Pause 14 days on: clicked the apply CTA without submitting (warm but distracted). |
| Suppression | Reuse `compound_email_unsubscribes` table for cross-campaign opt-out |
| Open tracking | NOT in v1 (no Resend webhook setup). Revisit if drip needs tuning. |

---

## 4. Email designs

All five share the same shell: cream `#F4F2EE` body, brand-font header (Barlow Condensed + Cormorant Garamond + JetBrains Mono), cyan eyebrow "AMBASSADOR PROGRAM · BY INVITATION", dark navy footer with HMAC unsubscribe link.

See `email-v5.html` and `drip-timeline-v3.html` in `.superpowers/brainstorm/` for the full visual lock-in.

### 4.1 Touch 1 — The Pitch (Day 0)

- **Subject:** `$100k, no new doors.`
- **Preheader:** `{first_name} — saw you're with {company}. 60-second read.`
- **Headline:** `$100K. NO NEW DOORS.` + italic cyan tag `Same network. Different product.`
- **Body:** 3 paragraphs setting up the solar-rep-to-peptide-rep pivot (door-to-door skill, peptides easier ticket, your network already buys this).
- **The offer block:** 4 tiered rows (10%/15%/20% commissions + 5% L2).
- **The math block:** Dark navy stamp with $100,000/year target → 4 numbered steps reverse-engineering to ~190 customers → amber-bordered callout "16 new referrals/month, 4 a week, then the book pays you forever."
- **"Why this isn't smoke" block:** COA + HPLC + Zelle/Venmo payouts.
- **CTA:** Big amber `I'm in — apply in 30 seconds →` linking to `{apply_url}`.
- **Wholesale cross-sell block:** Cyan-bordered card, "DIFFERENT TRACK" eyebrow, links to `{wholesale_url}`.
- **Soft-out:** "If neither's a fit, no hard feelings — one-click unsubscribe below."
- **Sign-off:** `— The advnce labs team`
- **P.S.:** "First wave capped at 50 reps per state. Most decide in under a minute."

### 4.2 Touch 2 — Playbook (Day 3)

- **Subject:** `Here's exactly what week 1 looks like.`
- **Headline:** `WEEK ONE.` + tag `No mystery. Step by step.`
- **Body:** Numbered day-by-day:
  - **Day 1** — Apply via the link below. We approve same-day. Your referral link + first-share-template land in your inbox.
  - **Day 2** — Pick 5 people from your contacts. Anyone 25-45 who lifts, recovers slow, or asks about Ozempic counts.
  - **Day 3** — Send our templated message. We give you the wording.
  - **Day 7** — Your first commission has likely already landed.
- **CTA:** Same amber apply button.
- **Sign-off:** `— The advnce labs team`

### 4.3 Touch 3 — Compound Primer (Day 7)

- **Subject:** `The 4 peptides your network is already asking about.`
- **Headline:** `FOUR PEPTIDES.` + tag `The compounds the research actually backs.`
- **Body:** Four short editorial cards, each with compound name (Barlow Condensed 900), 1-line research framing (Cormorant italic tagline), 2-sentence layman explanation:
  - **RETATRUTIDE** — triple-agonist GLP-1/GIP/glucagon research. The "next-gen Ozempic" conversation.
  - **BPC-157** — tissue repair and tendon research. Recovery framing.
  - **KLOW** — multi-compound recovery + performance blend. The all-in-one stack.
  - **SEMAX** — attention and dopaminergic research. The "brain fog" peptide.
- Each card has a `→ Read the research` link. URLs are looked up at render time from `compound_marketing.product_url` by compound_slug (`retatrutide`, `bpc-157`, `klow`, `semax`). If a slug is missing a URL, the link falls back to the catalog page.
- **Closer:** *"You don't need to memorize this. You just need to know it exists when your buddy asks."*
- **CTA:** Same amber apply button.
- **Sign-off:** `— The advnce labs team`

### 4.4 Touch 4 — Scarcity (Day 14)

- **Subject:** `First wave is filling.`
- **Headline:** `FIRST WAVE FILLING.` + tag `Cap is 50 per state. We're past halfway in most.`
- **Body:** 1-2 paragraphs. Short.
- **CTA:** Amber apply button, sized large.
- **Sign-off:** `— The advnce labs team`

### 4.5 Touch 5 — Soft Goodbye (Day 21)

- **Subject:** `We'll stop bugging you.`
- **Body:** 2 sentences. *"We'll stop reaching out — wanted to make sure this didn't get lost in your inbox. If it's a fit later, the link's still live: {apply_url}. — The advnce labs team."*
- **Footer + unsubscribe.**

### 4.6 Shared template placeholders

```
{first_name}, {company}, {state}     — recipient personalization
{apply_url}                          — /ambassadors/apply?r={tracking_token}
{wholesale_url}                      — wholesale info page (touch 1 only)
{unsubscribe_url}                    — HMAC-signed, reuses unsubToken helper
```

---

## 5. Data model

Three new tables. No changes to existing tables.

### 5.1 `ambassador_recruitment_recipients`

One row per imported contact. Tracks the drip state machine for that recipient.

```
id                      uuid pk
email                   text not null   -- lowercased
first_name              text
last_name               text
name                    text            -- full name from CSV
phone                   text
company                 text
city                    text
state                   text            -- US state abbreviation if available
volume                  text            -- whatever value the CSV's volume column had
csv_batch_id            text            -- groups recipients by import batch
created_at              timestamptz default now()

-- Drip state machine
drip_status             text not null default 'queued'
                              check (drip_status in ('queued','in_progress','paused','completed','applied','unsubscribed'))
next_touch_num          int not null default 1   -- 1..5, the next touch to send
next_send_at            timestamptz             -- when to send next_touch_num
paused_until            timestamptz             -- if drip_status='paused', when to resume
applied_at              timestamptz
unsubscribed_at         timestamptz

-- Click attribution
last_apply_clicked_at   timestamptz
last_any_clicked_at     timestamptz
```

Indexes: `(drip_status, next_send_at)` for the cron query; `(email)` unique for upsert.

### 5.2 `ambassador_recruitment_sends`

One row per email actually sent (audit + resend ID + failure log).

```
id            uuid pk
recipient_id  uuid not null references ambassador_recruitment_recipients(id) on delete cascade
touch_num     int not null check (touch_num between 1 and 5)
sent_at       timestamptz not null default now()
resend_id     text
status        text not null default 'sent'
                     check (status in ('sent','failed','skipped'))
error         text
```

Indexes: `(recipient_id, touch_num)`.

### 5.3 `ambassador_applications`

Incoming from the public apply page.

```
id              uuid pk
email           text not null
first_name      text
last_name       text
phone           text
company         text
city            text
state           text
volume          text
why_interested  text                       -- 1-line free-form from the form
source          text default 'recruitment_drip'  -- 'recruitment_drip' | 'organic' | 'manual'
source_touch    int                        -- which touch they clicked from, 1..5
recipient_id    uuid references ambassador_recruitment_recipients(id) on delete set null

status          text not null default 'pending'
                     check (status in ('pending','approved','rejected'))
reviewed_at     timestamptz
reviewed_by     text
notes           text                       -- internal admin notes
ambassador_id   uuid                       -- set on approval, links to ambassadors row
created_at      timestamptz default now()
```

### 5.4 Reuse `compound_email_unsubscribes`

The existing suppression table is shared across both compound spotlight and recruitment drips. One opt-out covers both. No schema change required.

---

## 6. CSV import

New script `scripts/import-recruitment-csv.js`:

```
node scripts/import-recruitment-csv.js path/to/leads.csv [--batch-id=2026-05-28-solar-wave-1]
```

**Behavior:**

1. Read CSV with columns mapped: `name|first_name+last_name`, `email`, `phone`, `company`, `city`, `state`, `volume`.
2. Normalize email to lowercase, trim phone.
3. Derive `first_name` from full name when not present (split on first space).
4. Skip rows where `email` is blank or doesn't match a basic email regex.
5. Skip rows where `email` already exists in `compound_email_unsubscribes` (cross-campaign opt-out).
6. Upsert into `ambassador_recruitment_recipients` keyed by `email`:
   - `drip_status='queued'`
   - `next_touch_num=1`
   - `next_send_at=` (controller-decided launch time; default = `now() + 5 minutes` so cron picks them up on next run)
   - `csv_batch_id` from the flag, defaulting to `now()` ISO date
7. Print summary: total parsed, skipped (no email / invalid), skipped (suppressed), upserted (new vs. updated).

**Cleanup:** the import script does not delete prior rows. Re-running the same CSV is a no-op for already-imported recipients (drip state preserved).

---

## 7. Drip orchestrator

New script `scripts/send-recruitment-drip.js` run via Vercel Cron hourly:

**Each invocation:**

1. Find candidates: `drip_status in ('queued','in_progress','paused')` AND (`paused_until is null OR paused_until <= now()`) AND `next_send_at <= now()`.
2. For each candidate, in batches of 50 with a 200ms throttle:
   - Re-check suppression: if `email` is now in `compound_email_unsubscribes`, mark `drip_status='unsubscribed'` and skip.
   - Render the template for `next_touch_num` using `lib/renderRecruitmentEmail.js` (new helper modeled after `renderCompoundEmail.js`).
   - POST to Resend `/emails` from `advnce labs <ambassadors@advncelabs.com>`.
   - Insert a row into `ambassador_recruitment_sends` with the result.
   - On success:
     - If `next_touch_num < 5`: advance `next_touch_num += 1`, set `next_send_at = now() + (touch_gap_days[next_touch_num])` where gaps are `[null, 3, 4, 7, 7]` days between touches (Day 0 → 3 → 7 → 14 → 21).
     - If `next_touch_num == 5`: set `drip_status='completed'`, `next_send_at=null`.
     - Set `drip_status='in_progress'` if it was `queued`.
   - On failure: log to the send row, do NOT advance `next_touch_num` — cron will retry on next run.
3. Print summary: candidates checked, sent, skipped (suppressed mid-flight), failed.

**Vercel Cron entry** in `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/recruitment-drip", "schedule": "0 * * * *" }
  ]
}
```

Route at `app/api/cron/recruitment-drip/route.js` calls the orchestrator. Cron auth via the existing `requireAdminOrCron` pattern.

---

## 8. Click tracking & pause-on-click logic

### Click attribution endpoint

`app/api/recruitment-click/route.js`:

```
GET /api/recruitment-click?r={recipient_id}&t={touch_num}&dest={apply|wholesale}
```

1. Validate `r` is a UUID and matches a recipient.
2. Validate `t` is 1..5.
3. Validate `dest` is `apply` or `wholesale`.
4. Update recipient:
   - `last_any_clicked_at = now()`
   - If `dest='apply'`: `last_apply_clicked_at = now()`.
   - If `drip_status='in_progress'` AND `dest='apply'`: set `drip_status='paused'`, `paused_until = now() + interval '14 days'`. (They're warm. Don't re-pitch immediately.)
5. 302 redirect to either `/ambassadors/apply?r={recipient_id}` (apply) or the wholesale info URL.

Email templates wrap their CTAs through this endpoint:

```html
<a href="{base_url}/api/recruitment-click?r={recipient_id}&t={touch_num}&dest=apply">I'm in — apply in 30 seconds →</a>
```

### Apply page

`app/ambassadors/apply/page.jsx` — public, no auth. Cream brand. Pre-fills `first_name`, `last_name`, `phone`, `company`, `state` if `?r=` matches a recipient row. Posts to `/api/ambassador-apply`.

### Apply API

`app/api/ambassador-apply/route.js` POST:

1. Validate required fields: `email`, `name`, `phone`, `why_interested`.
2. Look up recipient by `email` or `r` query param to set `recipient_id` + `source_touch`.
3. Insert into `ambassador_applications` with `status='pending'`.
4. If `recipient_id` found: update that recipient `drip_status='applied'`, `applied_at=now()` (drip stops permanently).
5. Return 200 with a "we'll review and get back to you within 24 hours" message.

### Admin approval triggers existing flow

Admin reviews application at `/admin/marketing/recruitment` → clicks Approve. That action:
1. Updates `ambassador_applications.status='approved'`, sets `reviewed_at`, `reviewed_by`, optional `notes`.
2. Calls the existing ambassador-creation logic in `/admin/marketing/ambassadors` (or its underlying write API) to create an ambassador with a generated code.
3. Triggers the existing `/api/ambassador-welcome` email.

---

## 9. Templates

Five new HTML files, all use the brand shell:

```
templates/email/recruitment-1-pitch.html
templates/email/recruitment-2-playbook.html
templates/email/recruitment-3-compounds.html
templates/email/recruitment-4-scarcity.html
templates/email/recruitment-5-goodbye.html
```

**Renderer:** `lib/renderRecruitmentEmail.js` — same pattern as `renderCompoundEmail.js`. Reads the right template file based on touch number, substitutes placeholders, signs the unsubscribe link with `signUnsubToken(email)`.

**Placeholders:** `{first_name}`, `{company}`, `{state}`, `{apply_url}`, `{wholesale_url}` (touch 1 only), `{unsubscribe_url}`, plus per-touch values like `{compound_link_X}` in touch 3.

---

## 10. Admin queue — `/admin/marketing/recruitment`

Server component mirroring `/admin/marketing/email-campaigns/page.jsx`.

**Sections:**

1. **Drip overview** — KPIs at the top:
   - Total recipients
   - By drip_status: queued, in_progress, paused, completed, applied, unsubscribed
   - Sent counts by touch_num (1-5)
2. **Pending applications** — DraftCard-style review cards. Each shows applicant info, source touch, why_interested. Buttons: Approve / Reject / View source recipient row.
3. **CSV batches** — list of `csv_batch_id` values with counts and import dates.
4. **Recent unsubscribes** — last 20 from this drip (helps catch deliverability issues).

---

## 11. Compliance & brand guardrails

- All five emails carry the RUO disclaimer in the footer: *"Research-grade compounds for in-vitro laboratory use only. Not for human consumption."*
- Touch 3 (compound primer) follows the brand voice doc strictly — research framing only, never therapeutic. No outcome words ("treats", "fixes", "heals").
- KLOW description must be approved by Jorrel before send (formulation language is sensitive).
- The wholesale cross-sell uses the term "wholesale program" — not "MLM" or "distributor network" — to stay clean.
- Every email has an HMAC-signed unsubscribe link. One click suppresses the email across BOTH compound and recruitment campaigns.
- Sign-off is always *"— The advnce labs team."* No personal name.

---

## 12. Open questions (resolved before implementation)

- **Wholesale URL** — needs to exist before touch 1 ships. Either build the page or use a placeholder URL the controller can swap later. Decision: ship with a placeholder; the wholesale page is a separate spec.
- **KLOW one-liner** — Jorrel needs to write or approve the framing line before touch 3 ships.
- **Initial `next_send_at` for the launch** — decided at run-time by the operator (probably during business hours, midweek).

---

## 13. Implementation order (preview)

1. Schema migration: three new tables.
2. CSV import script.
3. Unsubscribe + recipient suppression check helper (small extension of existing).
4. Five email template files.
5. Recruitment email renderer (`lib/renderRecruitmentEmail.js`).
6. Click-tracking redirect route.
7. Public apply page + apply API.
8. Drip orchestrator script + Vercel cron route.
9. Admin queue page (`/admin/marketing/recruitment`) + DraftCard-style review.
10. Admin approval flow that hands off to existing ambassador creation + welcome email.
11. Smoke test script covering CSV import → drip advance → apply → approve → ambassador created.
12. Manual launch: import CSV, monitor first 24 hours, then let the cron run.
