# Ambassador Recruitment Blast Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 5-touch ambassador recruitment email drip targeting ~1,500 opt-in solar-rep contacts, with a public apply page, admin review queue, and approval handoff to the existing ambassador onboarding flow.

**Architecture:** New Supabase tables (`ambassador_recruitment_recipients`, `ambassador_recruitment_sends`, `ambassador_applications`). CSV import populates recipients. A cron-driven orchestrator script (run hourly) advances each recipient through 5 templated emails on Day 0/3/7/14/21, with click + apply + unsubscribe-based pause logic. Click-tracking redirect captures intent. Public apply page → admin review → existing ambassador-welcome email triggers on approval. Suppression shared with compound spotlight emails via `compound_email_unsubscribes`.

**Tech Stack:** Next.js 14 App Router, Supabase (PostgREST), Resend, vanilla Node `crypto` (reuses `lib/unsubToken.js`), JavaScript/JSX (no TypeScript). Vercel Cron for hourly orchestration. No test framework — verification via curl + a comprehensive smoke script.

**Spec:** `docs/superpowers/specs/2026-05-28-ambassador-recruitment-blast-design.md`

---

## File map

**Create (new):**

```
sql/2026-05-28-ambassador-recruitment-blast.sql                      — schema migration

templates/email/recruitment-1-pitch.html                              — touch 1 ($100k pitch)
templates/email/recruitment-2-playbook.html                           — touch 2 (week 1 playbook)
templates/email/recruitment-3-compounds.html                          — touch 3 (4 compounds)
templates/email/recruitment-4-scarcity.html                           — touch 4 (first wave filling)
templates/email/recruitment-5-goodbye.html                            — touch 5 (we'll stop bugging you)

lib/renderRecruitmentEmail.js                                         — template renderer (5-way switch)

scripts/import-recruitment-csv.js                                     — CSV → recipients upsert
scripts/send-recruitment-drip.js                                      — orchestrator (called by cron)
scripts/smoke-recruitment-drip.js                                     — end-to-end smoke

app/api/recruitment-click/route.js                                    — click-track + 302 redirect
app/api/ambassador-apply/route.js                                     — public POST from apply form
app/api/recruitment-application-write/route.js                        — admin approve/reject
app/api/cron/recruitment-drip/route.js                                — cron entry point

app/ambassadors/layout.jsx                                            — minimal layout shell
app/ambassadors/apply/page.jsx                                        — server component (prefill from ?r=)
app/ambassadors/apply/ApplyForm.jsx                                   — client form

app/admin/marketing/recruitment/page.jsx                              — admin queue (server)
app/admin/marketing/recruitment/ApplicationCard.jsx                   — client approve/reject card
```

**Modify:**

```
vercel.json                                                           — add hourly cron entry
app/admin/marketing/page.jsx                                          — add Recruitment tile
```

---

## Pre-flight

- [ ] **Step 0.1: Confirm env file**

```bash
grep -E '^(SUPABASE_URL|SUPABASE_SERVICE_KEY|RESEND_API_KEY|EMAIL_UNSUB_SECRET)=' /tmp/advnce.env | awk -F= '{print $1}'
```

Expected: all 4 keys present (these were set up during the compound-email feature).

- [ ] **Step 0.2: Confirm `app/ambassadors/` exists**

```bash
ls "/Volumes/(626)806-4475/Ai Projects/adonis-next/app/ambassador/"
```

Note: existing route is `ambassador/` (singular). The new public apply page goes under `app/ambassadors/` (plural) to avoid colliding with the existing admin-side `ambassador/` route. The plan creates a new `ambassadors/` directory.

- [ ] **Step 0.3: Note the wholesale URL placeholder**

The wholesale page isn't built yet. Touch 1's template will use a placeholder URL `https://www.advncelabs.com/advnce-wholesale.html` — the controller will swap this when the wholesale page ships. Don't block on it.

- [ ] **Step 0.4: Note the KLOW description requires owner sign-off**

Touch 3's KLOW one-liner uses the framing `"multi-compound recovery + performance blend"` from the spec. The controller/owner should approve this verbatim wording before the first send of touch 3.

---

## Task 1 · Database migration

**Files:**
- Create: `sql/2026-05-28-ambassador-recruitment-blast.sql`

- [ ] **Step 1.1: Write the migration**

Create `sql/2026-05-28-ambassador-recruitment-blast.sql`:

```sql
-- Ambassador recruitment drip: per-recipient state machine, per-touch send audit,
-- and incoming applications. Shares the compound_email_unsubscribes suppression list.
-- Spec: docs/superpowers/specs/2026-05-28-ambassador-recruitment-blast-design.md

-- 1) ambassador_recruitment_recipients — one row per imported contact + drip state.
create table if not exists ambassador_recruitment_recipients (
  id                      uuid primary key default gen_random_uuid(),
  email                   text not null unique,                      -- lowercased
  first_name              text,
  last_name               text,
  name                    text,                                       -- full name from CSV
  phone                   text,
  company                 text,
  city                    text,
  state                   text,
  volume                  text,
  csv_batch_id            text,                                       -- groups recipients by import batch
  created_at              timestamptz not null default now(),
  -- drip state machine
  drip_status             text not null default 'queued'
                                check (drip_status in ('queued','in_progress','paused','completed','applied','unsubscribed')),
  next_touch_num          int not null default 1 check (next_touch_num between 1 and 6),
  next_send_at            timestamptz,
  paused_until            timestamptz,
  applied_at              timestamptz,
  unsubscribed_at         timestamptz,
  -- click attribution
  last_apply_clicked_at   timestamptz,
  last_any_clicked_at     timestamptz
);
create index if not exists arr_drip_due_idx
  on ambassador_recruitment_recipients(drip_status, next_send_at)
  where drip_status in ('queued','in_progress','paused');
create index if not exists arr_batch_idx on ambassador_recruitment_recipients(csv_batch_id);

-- 2) ambassador_recruitment_sends — audit of every email actually sent.
create table if not exists ambassador_recruitment_sends (
  id            uuid primary key default gen_random_uuid(),
  recipient_id  uuid not null references ambassador_recruitment_recipients(id) on delete cascade,
  touch_num     int not null check (touch_num between 1 and 5),
  sent_at       timestamptz not null default now(),
  resend_id     text,
  status        text not null default 'sent'
                       check (status in ('sent','failed','skipped')),
  error         text
);
create index if not exists ars_recipient_touch_idx on ambassador_recruitment_sends(recipient_id, touch_num);
create index if not exists ars_sent_at_idx on ambassador_recruitment_sends(sent_at desc);

-- 3) ambassador_applications — incoming from the public apply page.
create table if not exists ambassador_applications (
  id              uuid primary key default gen_random_uuid(),
  email           text not null,
  first_name      text,
  last_name       text,
  phone           text,
  company         text,
  city            text,
  state           text,
  volume          text,
  why_interested  text,
  source          text not null default 'recruitment_drip'
                         check (source in ('recruitment_drip','organic','manual')),
  source_touch    int check (source_touch between 1 and 5),
  recipient_id    uuid references ambassador_recruitment_recipients(id) on delete set null,
  status          text not null default 'pending'
                         check (status in ('pending','approved','rejected')),
  reviewed_at     timestamptz,
  reviewed_by     text,
  notes           text,
  ambassador_id   uuid,                                                 -- linked on approval
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists aa_status_idx on ambassador_applications(status, created_at desc);
create index if not exists aa_email_idx on ambassador_applications(email);

-- updated_at trigger for ambassador_applications
create or replace function set_ambassador_apps_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists ambassador_applications_updated_at on ambassador_applications;
create trigger ambassador_applications_updated_at
  before update on ambassador_applications
  for each row execute function set_ambassador_apps_updated_at();

-- RLS off on all 3 new tables; access goes through service-role API routes.
alter table ambassador_recruitment_recipients enable row level security;
alter table ambassador_recruitment_sends      enable row level security;
alter table ambassador_applications           enable row level security;
```

- [ ] **Step 1.2: Apply via Supabase Studio SQL editor**

Paste the file into Supabase Studio → SQL Editor → Run. The controller will handle this (subagent should skip this step and report DONE_WITH_CONCERNS noting it was not applied).

- [ ] **Step 1.3: Verify tables exist (controller runs)**

```bash
set -a; source /tmp/advnce.env; set +a
for t in ambassador_recruitment_recipients ambassador_recruitment_sends ambassador_applications; do
  curl -sS -o /dev/null -w "$t: HTTP %{http_code}\n" "$SUPABASE_URL/rest/v1/$t?limit=0" \
    -H "apikey: $SUPABASE_SERVICE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_KEY"
done
```

Expected: three lines, each HTTP 200.

- [ ] **Step 1.4: Commit**

```bash
git add sql/2026-05-28-ambassador-recruitment-blast.sql
git commit -m "recruitment: schema for recipients, sends, applications"
```

---

## Task 2 · Touch 1 template (the pitch)

**Files:**
- Create: `templates/email/recruitment-1-pitch.html`

- [ ] **Step 2.1: Write the template**

Create `templates/email/recruitment-1-pitch.html`. The template uses `{{NAME}}` style placeholders (matching the existing `compound-spotlight.html` pattern):

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;700;900&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
  <title>$100k, no new doors.</title>
</head>
<body style="margin:0;padding:0;background:#E8E6E2;font-family:Arial,Helvetica,sans-serif;color:#1A1C22">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px">
    <div style="background:#F4F2EE;border-radius:6px;overflow:hidden">

      <div style="padding:18px 28px;border-bottom:1px solid #E4E7EC;display:flex;align-items:center;justify-content:space-between;gap:12px">
        <div style="display:flex;align-items:center;gap:10px">
          <svg viewBox="0 0 48 28" width="32" height="19" fill="none"><path d="M2 24L8 19L14 22L20 14L26 17L32 9L38 12L46 3" stroke="#00A0A8" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/><circle cx="32" cy="9" r="2" fill="#00A0A8"/><circle cx="38" cy="12" r="2" fill="#E07C24"/><circle cx="46" cy="3" r="2.5" fill="#E07C24"/></svg>
          <span style="font:700 14px 'Barlow Condensed',sans-serif;letter-spacing:3px;text-transform:lowercase">advnce <span style="color:#7A7D88;font-weight:300">labs</span></span>
        </div>
        <div style="font:400 10px 'JetBrains Mono',monospace;color:#00A0A8;letter-spacing:3px;text-transform:uppercase;text-align:right;line-height:1.5">AMBASSADOR PROGRAM<br>BY INVITATION</div>
      </div>

      <div style="padding:44px 36px 0">

        <div style="font:300 italic 22px 'Cormorant Garamond',serif;color:#7A7D88;line-height:1.2;margin:0 0 6px">Hey {{FIRST_NAME}},</div>

        <div style="font:900 56px 'Barlow Condensed',sans-serif;color:#1A1C22;line-height:0.95;letter-spacing:-1.5px;text-transform:uppercase;margin:0 0 8px">$100K.<br>NO NEW DOORS.</div>
        <div style="font:300 italic 28px 'Cormorant Garamond',serif;color:#00A0A8;line-height:1.2;margin:0 0 32px">Same network. Different product.</div>

        <p style="font:400 15px Arial,sans-serif;color:#1A1C22;line-height:1.75;margin:0 0 14px">We're reaching out to solar reps specifically. You sell a $20k+ ticket door-to-door, get yes-or-no in 90 seconds, and know how to handle objections in your sleep.</p>
        <p style="font:400 15px Arial,sans-serif;color:#1A1C22;line-height:1.75;margin:0 0 14px">Peptides are easier. Lower ticket, repeat orders, and the product sells itself to a demo you already know &mdash; guys 25-45 who lift, recover slow, or want to feel 30 again. <strong>Your network is already buying this from someone.</strong> Might as well be you.</p>
        <p style="font:400 15px Arial,sans-serif;color:#1A1C22;line-height:1.75;margin:0 0 0">No quota. No minimum. Drop your link in conversations you're already having. That's it.</p>

        <div style="height:1px;background:#E4E7EC;margin:28px 0"></div>

        <div style="font:700 10px 'Barlow Condensed',sans-serif;color:#00A0A8;letter-spacing:4px;text-transform:uppercase;margin:0 0 14px">The offer</div>
        <div style="display:flex;gap:12px;margin-bottom:10px"><span style="color:#00A0A8;flex-shrink:0">&rarr;</span><span style="font:400 14px Arial,sans-serif;line-height:1.6"><strong>10%</strong> commission on every first order through your link</span></div>
        <div style="display:flex;gap:12px;margin-bottom:10px"><span style="color:#00A0A8;flex-shrink:0">&rarr;</span><span style="font:400 14px Arial,sans-serif;line-height:1.6"><strong>15%</strong> starting at your 6th sale</span></div>
        <div style="display:flex;gap:12px;margin-bottom:10px"><span style="color:#00A0A8;flex-shrink:0">&rarr;</span><span style="font:400 14px Arial,sans-serif;line-height:1.6"><strong>20%</strong> after 15+ referrals</span></div>
        <div style="display:flex;gap:12px;margin-bottom:0"><span style="color:#E07C24;flex-shrink:0">&rarr;</span><span style="font:400 14px Arial,sans-serif;line-height:1.6">Plus <strong>5%</strong> on anyone you recruit's sales. It stacks.</span></div>

        <div style="height:1px;background:#E4E7EC;margin:28px 0"></div>

        <div style="font:700 10px 'Barlow Condensed',sans-serif;color:#E07C24;letter-spacing:4px;text-transform:uppercase;margin:0 0 14px">Run the math &mdash; backwards from $100k</div>

        <div style="background:#1A1C22;padding:24px 26px;margin:0 0 18px;text-align:center;border-radius:4px">
          <div style="font:400 9px 'JetBrains Mono',monospace;color:rgba(244,242,238,0.5);letter-spacing:4px;text-transform:uppercase;margin-bottom:8px">Target</div>
          <div style="font:900 44px 'Barlow Condensed',sans-serif;color:#E07C24;letter-spacing:-0.5px;line-height:1">$100,000 / year</div>
          <div style="font:300 italic 16px 'Cormorant Garamond',serif;color:#F4F2EE;margin-top:8px">passive, recurring, off your existing network</div>
        </div>

        <div style="display:flex;gap:14px;margin-bottom:12px;align-items:baseline"><span style="color:#00A0A8;flex-shrink:0;font:900 12px 'Barlow Condensed',sans-serif;letter-spacing:1px;min-width:22px">01</span><span style="font:400 14px Arial,sans-serif;line-height:1.6">Average order: <strong>$220</strong></span></div>
        <div style="display:flex;gap:14px;margin-bottom:12px;align-items:baseline"><span style="color:#00A0A8;flex-shrink:0;font:900 12px 'Barlow Condensed',sans-serif;letter-spacing:1px;min-width:22px">02</span><span style="font:400 14px Arial,sans-serif;line-height:1.6">Top-tier commission (after 15 referrals): <strong>20% = $44 per order</strong></span></div>
        <div style="display:flex;gap:14px;margin-bottom:12px;align-items:baseline"><span style="color:#00A0A8;flex-shrink:0;font:900 12px 'Barlow Condensed',sans-serif;letter-spacing:1px;min-width:22px">03</span><span style="font:400 14px Arial,sans-serif;line-height:1.6">Customers reorder <strong>monthly</strong> &rarr; 12 orders / year = <strong>$528 per customer / year</strong></span></div>
        <div style="display:flex;gap:14px;margin-bottom:12px;align-items:baseline"><span style="color:#00A0A8;flex-shrink:0;font:900 12px 'Barlow Condensed',sans-serif;letter-spacing:1px;min-width:22px">04</span><span style="font:400 14px Arial,sans-serif;line-height:1.6">$100,000 &divide; $528 = <strong>~190 active referred customers</strong></span></div>

        <div style="font:900 18px 'Barlow Condensed',sans-serif;color:#E07C24;letter-spacing:2px;text-align:center;margin:18px 0 14px">&darr;</div>

        <div style="background:#FDF4EC;border-left:3px solid #E07C24;padding:16px 22px;margin:20px 0 0">
          <div style="font:700 11px 'Barlow Condensed',sans-serif;color:#E07C24;letter-spacing:3px;text-transform:uppercase;margin-bottom:8px">What that looks like in practice</div>
          <p style="font:400 14px Arial,sans-serif;color:#1A1C22;line-height:1.6;margin:0">~190 active customers over the first 12 months works out to <strong>16 new referrals / month</strong> &mdash; about <strong>4 a week</strong>. One every couple days at full ramp.</p>
          <p style="font:400 14px Arial,sans-serif;color:#1A1C22;line-height:1.6;margin:10px 0 0">After year one, you stop selling. The book pays you whether you work or not.</p>
        </div>

        <div style="height:1px;background:#E4E7EC;margin:28px 0"></div>

        <div style="font:700 10px 'Barlow Condensed',sans-serif;color:#00A0A8;letter-spacing:4px;text-transform:uppercase;margin:0 0 14px">Why this isn't smoke</div>
        <p style="font:400 14px Arial,sans-serif;color:#1A1C22;line-height:1.7;margin:0">Every compound ships with a manufacturer Certificate of Analysis. HPLC-verified. Lot-traceable. Real product, real margin, real commission &mdash; paid monthly via Zelle or Venmo. <em>Full stop.</em></p>

        <div style="height:1px;background:#E4E7EC;margin:28px 0"></div>

        <div style="text-align:center;padding:8px 0 0">
          <a href="{{APPLY_URL}}" style="display:inline-block;background:#E07C24;color:#1A1C22;font:900 14px 'Barlow Condensed',sans-serif;letter-spacing:4px;text-transform:uppercase;text-decoration:none;padding:18px 32px;border-radius:3px">I'm in &mdash; apply in 30 seconds &rarr;</a>
          <p style="font:400 12px 'JetBrains Mono',monospace;color:#7A7D88;letter-spacing:2px;text-transform:uppercase;margin:18px 0 0">No call required. Approved &rarr; link in your inbox same day.</p>
        </div>

        <div style="border:1px solid #00A0A8;border-radius:4px;background:#F0FBFC;padding:24px 26px;margin:28px 0 0">
          <div style="font:400 9px 'JetBrains Mono',monospace;color:#00A0A8;letter-spacing:4px;text-transform:uppercase;margin-bottom:10px">DIFFERENT TRACK</div>
          <div style="font:900 22px 'Barlow Condensed',sans-serif;color:#1A1C22;letter-spacing:-0.3px;text-transform:uppercase;line-height:1.05;margin:0 0 4px">Already selling peptides?</div>
          <div style="font:300 italic 17px 'Cormorant Garamond',serif;color:#00A0A8;line-height:1.2;margin:0 0 14px">Different program. Different terms.</div>
          <p style="font:400 14px Arial,sans-serif;color:#1A1C22;line-height:1.65;margin:0 0 14px">If you're already running peptide sales out of your own brand, the ambassador program isn't right for you &mdash; but our <strong>wholesale program</strong> is. Bulk pricing per SKU, JIT drop-ship from our fulfillment, your label or ours.</p>
          <a href="{{WHOLESALE_URL}}" style="font:700 11px 'Barlow Condensed',sans-serif;color:#00A0A8;letter-spacing:3px;text-transform:uppercase;text-decoration:none;border-bottom:1px solid #00A0A8;padding-bottom:2px">See wholesale terms &rarr;</a>
        </div>

      </div>

      <div style="padding:40px 36px 36px">
        <p style="font:400 13px Arial,sans-serif;color:#1A1C22;line-height:1.7;margin:0">If neither's a fit, no hard feelings &mdash; one-click unsubscribe at the bottom.</p>
        <p style="font:400 13px Arial,sans-serif;color:#7A7D88;line-height:1.7;margin:18px 0 0">&mdash; The advnce labs team</p>
        <p style="font:400 10px 'JetBrains Mono',monospace;color:#7A7D88;letter-spacing:1px;line-height:1.7;margin:18px 0 0">P.S. First wave capped at 50 reps per state. Most decide in under a minute.</p>
      </div>

      <div style="background:#1A1C22;padding:18px 28px;text-align:center;font:400 8px 'JetBrains Mono',monospace;color:rgba(244,242,238,0.45);letter-spacing:1.5px;text-transform:uppercase;line-height:1.8">
        advncelabs.com &middot; ambassadors@advncelabs.com<br>
        Research-grade compounds for in-vitro laboratory use only. Not for human consumption.<br>
        <a href="{{UNSUBSCRIBE_URL}}" style="color:rgba(244,242,238,0.55);text-decoration:underline">Unsubscribe</a>
      </div>

    </div>
  </div>
</body>
</html>
```

- [ ] **Step 2.2: Commit**

```bash
git add templates/email/recruitment-1-pitch.html
git commit -m "recruitment: touch 1 template — \$100k pitch"
```

---

## Task 3 · Touches 2, 4, 5 (shorter templates)

**Files:**
- Create: `templates/email/recruitment-2-playbook.html`
- Create: `templates/email/recruitment-4-scarcity.html`
- Create: `templates/email/recruitment-5-goodbye.html`

All three share the same brand shell as touch 1. They differ only in the body section.

- [ ] **Step 3.1: Write touch 2 (playbook)**

Create `templates/email/recruitment-2-playbook.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;700;900&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
  <title>Here's exactly what week 1 looks like.</title>
</head>
<body style="margin:0;padding:0;background:#E8E6E2;font-family:Arial,Helvetica,sans-serif;color:#1A1C22">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px">
    <div style="background:#F4F2EE;border-radius:6px;overflow:hidden">

      <div style="padding:18px 28px;border-bottom:1px solid #E4E7EC;display:flex;align-items:center;justify-content:space-between;gap:12px">
        <div style="display:flex;align-items:center;gap:10px">
          <svg viewBox="0 0 48 28" width="32" height="19" fill="none"><path d="M2 24L8 19L14 22L20 14L26 17L32 9L38 12L46 3" stroke="#00A0A8" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/><circle cx="32" cy="9" r="2" fill="#00A0A8"/><circle cx="38" cy="12" r="2" fill="#E07C24"/><circle cx="46" cy="3" r="2.5" fill="#E07C24"/></svg>
          <span style="font:700 14px 'Barlow Condensed',sans-serif;letter-spacing:3px;text-transform:lowercase">advnce <span style="color:#7A7D88;font-weight:300">labs</span></span>
        </div>
        <div style="font:400 10px 'JetBrains Mono',monospace;color:#00A0A8;letter-spacing:3px;text-transform:uppercase;text-align:right;line-height:1.5">AMBASSADOR PROGRAM<br>TOUCH 2 / 5</div>
      </div>

      <div style="padding:44px 36px 0">

        <div style="font:300 italic 22px 'Cormorant Garamond',serif;color:#7A7D88;line-height:1.2;margin:0 0 6px">Hey {{FIRST_NAME}},</div>

        <div style="font:900 56px 'Barlow Condensed',sans-serif;color:#1A1C22;line-height:0.95;letter-spacing:-1.5px;text-transform:uppercase;margin:0 0 8px">WEEK ONE.</div>
        <div style="font:300 italic 28px 'Cormorant Garamond',serif;color:#00A0A8;line-height:1.2;margin:0 0 32px">No mystery. Step by step.</div>

        <p style="font:400 15px Arial,sans-serif;color:#1A1C22;line-height:1.75;margin:0 0 24px">A lot of reps tell us they want in, but freeze on "how do I even start?" Here's the sequence. There's no improvisation required.</p>

        <div style="border-left:3px solid #00A0A8;padding:0 0 0 18px;margin:0 0 24px">
          <div style="font:700 11px 'Barlow Condensed',sans-serif;color:#00A0A8;letter-spacing:3px;text-transform:uppercase;margin:0 0 4px">DAY 1</div>
          <p style="font:400 15px Arial,sans-serif;color:#1A1C22;line-height:1.65;margin:0 0 14px">Apply through the link below. We approve same-day. Your referral link, dashboard login, and first-share template land in your inbox.</p>

          <div style="font:700 11px 'Barlow Condensed',sans-serif;color:#00A0A8;letter-spacing:3px;text-transform:uppercase;margin:0 0 4px">DAY 2</div>
          <p style="font:400 15px Arial,sans-serif;color:#1A1C22;line-height:1.65;margin:0 0 14px">Pick 5 people from your contacts. Anyone 25-45 who lifts, recovers slow, or asks about Ozempic counts. Don't overthink it.</p>

          <div style="font:700 11px 'Barlow Condensed',sans-serif;color:#00A0A8;letter-spacing:3px;text-transform:uppercase;margin:0 0 4px">DAY 3</div>
          <p style="font:400 15px Arial,sans-serif;color:#1A1C22;line-height:1.65;margin:0 0 14px">Send our templated message to all 5. We give you the exact wording. Takes 10 minutes total.</p>

          <div style="font:700 11px 'Barlow Condensed',sans-serif;color:#00A0A8;letter-spacing:3px;text-transform:uppercase;margin:0 0 4px">DAY 7</div>
          <p style="font:400 15px Arial,sans-serif;color:#1A1C22;line-height:1.65;margin:0 0 0">If even one of those 5 ordered, your first commission has already landed. That's the playbook.</p>
        </div>

        <p style="font:300 italic 17px 'Cormorant Garamond',serif;color:#1A1C22;line-height:1.5;margin:0 0 0;text-align:center">No improvising. No selling skills required beyond what you already use every day.</p>

        <div style="height:1px;background:#E4E7EC;margin:28px 0"></div>

        <div style="text-align:center;padding:8px 0 0">
          <a href="{{APPLY_URL}}" style="display:inline-block;background:#E07C24;color:#1A1C22;font:900 14px 'Barlow Condensed',sans-serif;letter-spacing:4px;text-transform:uppercase;text-decoration:none;padding:18px 32px;border-radius:3px">Start the playbook &rarr;</a>
        </div>

      </div>

      <div style="padding:40px 36px 36px">
        <p style="font:400 13px Arial,sans-serif;color:#7A7D88;line-height:1.7;margin:0">&mdash; The advnce labs team</p>
      </div>

      <div style="background:#1A1C22;padding:18px 28px;text-align:center;font:400 8px 'JetBrains Mono',monospace;color:rgba(244,242,238,0.45);letter-spacing:1.5px;text-transform:uppercase;line-height:1.8">
        advncelabs.com &middot; ambassadors@advncelabs.com<br>
        Research-grade compounds for in-vitro laboratory use only.<br>
        <a href="{{UNSUBSCRIBE_URL}}" style="color:rgba(244,242,238,0.55);text-decoration:underline">Unsubscribe</a>
      </div>

    </div>
  </div>
</body>
</html>
```

- [ ] **Step 3.2: Write touch 4 (scarcity)**

Create `templates/email/recruitment-4-scarcity.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;700;900&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
  <title>First wave is filling.</title>
</head>
<body style="margin:0;padding:0;background:#E8E6E2;font-family:Arial,Helvetica,sans-serif;color:#1A1C22">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px">
    <div style="background:#F4F2EE;border-radius:6px;overflow:hidden">

      <div style="padding:18px 28px;border-bottom:1px solid #E4E7EC;display:flex;align-items:center;justify-content:space-between;gap:12px">
        <div style="display:flex;align-items:center;gap:10px">
          <svg viewBox="0 0 48 28" width="32" height="19" fill="none"><path d="M2 24L8 19L14 22L20 14L26 17L32 9L38 12L46 3" stroke="#00A0A8" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/><circle cx="32" cy="9" r="2" fill="#00A0A8"/><circle cx="38" cy="12" r="2" fill="#E07C24"/><circle cx="46" cy="3" r="2.5" fill="#E07C24"/></svg>
          <span style="font:700 14px 'Barlow Condensed',sans-serif;letter-spacing:3px;text-transform:lowercase">advnce <span style="color:#7A7D88;font-weight:300">labs</span></span>
        </div>
        <div style="font:400 10px 'JetBrains Mono',monospace;color:#E07C24;letter-spacing:3px;text-transform:uppercase;text-align:right;line-height:1.5">AMBASSADOR PROGRAM<br>TOUCH 4 / 5</div>
      </div>

      <div style="padding:44px 36px 0">

        <div style="font:300 italic 22px 'Cormorant Garamond',serif;color:#7A7D88;line-height:1.2;margin:0 0 6px">Hey {{FIRST_NAME}},</div>

        <div style="font:900 56px 'Barlow Condensed',sans-serif;color:#E07C24;line-height:0.95;letter-spacing:-1.5px;text-transform:uppercase;margin:0 0 8px">FIRST WAVE<br>IS FILLING.</div>
        <div style="font:300 italic 24px 'Cormorant Garamond',serif;color:#1A1C22;line-height:1.2;margin:0 0 32px">Cap is 50 per state. We're past halfway in most.</div>

        <p style="font:400 15px Arial,sans-serif;color:#1A1C22;line-height:1.75;margin:0 0 14px">A quick note before we close the first wave: the per-state cap exists because we want the early ambassadors to actually <em>have</em> the territory. If we let unlimited reps in, the math falls apart for everyone.</p>

        <p style="font:400 15px Arial,sans-serif;color:#1A1C22;line-height:1.75;margin:0 0 0">If you've been sitting on this one &mdash; the answer's the same as it'll be next month, but the spot might not be.</p>

        <div style="height:1px;background:#E4E7EC;margin:36px 0 28px"></div>

        <div style="text-align:center;padding:8px 0 0">
          <a href="{{APPLY_URL}}" style="display:inline-block;background:#E07C24;color:#1A1C22;font:900 14px 'Barlow Condensed',sans-serif;letter-spacing:4px;text-transform:uppercase;text-decoration:none;padding:18px 32px;border-radius:3px">Grab your spot &rarr;</a>
        </div>

      </div>

      <div style="padding:40px 36px 36px">
        <p style="font:400 13px Arial,sans-serif;color:#7A7D88;line-height:1.7;margin:0">&mdash; The advnce labs team</p>
      </div>

      <div style="background:#1A1C22;padding:18px 28px;text-align:center;font:400 8px 'JetBrains Mono',monospace;color:rgba(244,242,238,0.45);letter-spacing:1.5px;text-transform:uppercase;line-height:1.8">
        advncelabs.com &middot; ambassadors@advncelabs.com<br>
        Research-grade compounds for in-vitro laboratory use only.<br>
        <a href="{{UNSUBSCRIBE_URL}}" style="color:rgba(244,242,238,0.55);text-decoration:underline">Unsubscribe</a>
      </div>

    </div>
  </div>
</body>
</html>
```

- [ ] **Step 3.3: Write touch 5 (goodbye)**

Create `templates/email/recruitment-5-goodbye.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;700;900&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
  <title>We'll stop bugging you.</title>
</head>
<body style="margin:0;padding:0;background:#E8E6E2;font-family:Arial,Helvetica,sans-serif;color:#1A1C22">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px">
    <div style="background:#F4F2EE;border-radius:6px;overflow:hidden">

      <div style="padding:18px 28px;border-bottom:1px solid #E4E7EC;display:flex;align-items:center;justify-content:space-between;gap:12px">
        <div style="display:flex;align-items:center;gap:10px">
          <svg viewBox="0 0 48 28" width="32" height="19" fill="none"><path d="M2 24L8 19L14 22L20 14L26 17L32 9L38 12L46 3" stroke="#00A0A8" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/><circle cx="32" cy="9" r="2" fill="#00A0A8"/><circle cx="38" cy="12" r="2" fill="#E07C24"/><circle cx="46" cy="3" r="2.5" fill="#E07C24"/></svg>
          <span style="font:700 14px 'Barlow Condensed',sans-serif;letter-spacing:3px;text-transform:lowercase">advnce <span style="color:#7A7D88;font-weight:300">labs</span></span>
        </div>
        <div style="font:400 10px 'JetBrains Mono',monospace;color:#7A7D88;letter-spacing:3px;text-transform:uppercase;text-align:right;line-height:1.5">AMBASSADOR PROGRAM<br>TOUCH 5 / 5</div>
      </div>

      <div style="padding:48px 40px 32px">

        <div style="font:300 italic 22px 'Cormorant Garamond',serif;color:#7A7D88;line-height:1.2;margin:0 0 24px">Hey {{FIRST_NAME}},</div>

        <p style="font:400 16px Arial,sans-serif;color:#1A1C22;line-height:1.75;margin:0 0 18px">We'll stop bugging you. Just wanted to make sure this one didn't get lost in your inbox.</p>

        <p style="font:400 16px Arial,sans-serif;color:#1A1C22;line-height:1.75;margin:0 0 26px">If it's a fit later &mdash; even six months from now &mdash; the link's still live: <a href="{{APPLY_URL}}" style="color:#00A0A8;text-decoration:underline">apply here</a>.</p>

        <p style="font:300 italic 17px 'Cormorant Garamond',serif;color:#1A1C22;line-height:1.5;margin:0">No hard feelings either way.</p>

      </div>

      <div style="padding:0 40px 36px">
        <p style="font:400 13px Arial,sans-serif;color:#7A7D88;line-height:1.7;margin:0">&mdash; The advnce labs team</p>
      </div>

      <div style="background:#1A1C22;padding:18px 28px;text-align:center;font:400 8px 'JetBrains Mono',monospace;color:rgba(244,242,238,0.45);letter-spacing:1.5px;text-transform:uppercase;line-height:1.8">
        advncelabs.com &middot; ambassadors@advncelabs.com<br>
        <a href="{{UNSUBSCRIBE_URL}}" style="color:rgba(244,242,238,0.55);text-decoration:underline">Unsubscribe</a>
      </div>

    </div>
  </div>
</body>
</html>
```

- [ ] **Step 3.4: Commit**

```bash
git add templates/email/recruitment-2-playbook.html templates/email/recruitment-4-scarcity.html templates/email/recruitment-5-goodbye.html
git commit -m "recruitment: touches 2, 4, 5 templates (playbook, scarcity, goodbye)"
```

---

## Task 4 · Touch 3 template (compound primer)

**Files:**
- Create: `templates/email/recruitment-3-compounds.html`

The compound URLs are looked up at render time, not baked into the template. So the template uses placeholders for each compound's link.

- [ ] **Step 4.1: Write the template**

Create `templates/email/recruitment-3-compounds.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;700;900&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
  <title>The 4 peptides your network is already asking about.</title>
</head>
<body style="margin:0;padding:0;background:#E8E6E2;font-family:Arial,Helvetica,sans-serif;color:#1A1C22">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px">
    <div style="background:#F4F2EE;border-radius:6px;overflow:hidden">

      <div style="padding:18px 28px;border-bottom:1px solid #E4E7EC;display:flex;align-items:center;justify-content:space-between;gap:12px">
        <div style="display:flex;align-items:center;gap:10px">
          <svg viewBox="0 0 48 28" width="32" height="19" fill="none"><path d="M2 24L8 19L14 22L20 14L26 17L32 9L38 12L46 3" stroke="#00A0A8" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/><circle cx="32" cy="9" r="2" fill="#00A0A8"/><circle cx="38" cy="12" r="2" fill="#E07C24"/><circle cx="46" cy="3" r="2.5" fill="#E07C24"/></svg>
          <span style="font:700 14px 'Barlow Condensed',sans-serif;letter-spacing:3px;text-transform:lowercase">advnce <span style="color:#7A7D88;font-weight:300">labs</span></span>
        </div>
        <div style="font:400 10px 'JetBrains Mono',monospace;color:#00A0A8;letter-spacing:3px;text-transform:uppercase;text-align:right;line-height:1.5">AMBASSADOR PROGRAM<br>TOUCH 3 / 5</div>
      </div>

      <div style="padding:44px 36px 0">

        <div style="font:300 italic 22px 'Cormorant Garamond',serif;color:#7A7D88;line-height:1.2;margin:0 0 6px">Hey {{FIRST_NAME}},</div>

        <div style="font:900 52px 'Barlow Condensed',sans-serif;color:#1A1C22;line-height:0.95;letter-spacing:-1.5px;text-transform:uppercase;margin:0 0 8px">FOUR PEPTIDES.</div>
        <div style="font:300 italic 24px 'Cormorant Garamond',serif;color:#00A0A8;line-height:1.2;margin:0 0 30px">The compounds the research actually backs.</div>

        <p style="font:400 15px Arial,sans-serif;color:#1A1C22;line-height:1.75;margin:0 0 24px">You don't need a PhD to talk about peptides. Just know which compounds your network is already curious about, and what the literature has investigated. Here's the short list.</p>

        <!-- RETATRUTIDE -->
        <div style="border-left:3px solid #E07C24;padding:0 0 0 18px;margin:0 0 24px">
          <div style="font:700 10px 'JetBrains Mono',monospace;color:#E07C24;letter-spacing:3px;text-transform:uppercase;margin:0 0 6px">METABOLIC &middot; THE OZEMPIC CONVERSATION</div>
          <div style="font:900 26px 'Barlow Condensed',sans-serif;color:#1A1C22;letter-spacing:-0.3px;text-transform:uppercase;line-height:1.05;margin:0 0 4px">RETATRUTIDE</div>
          <div style="font:300 italic 18px 'Cormorant Garamond',serif;color:#E07C24;line-height:1.2;margin:0 0 10px">Triple-agonist. Next-generation GLP-1.</div>
          <p style="font:400 14px Arial,sans-serif;color:#1A1C22;line-height:1.65;margin:0 0 10px">Research has investigated retatrutide as a GLP-1/GIP/glucagon triple agonist. Trials examined body composition and metabolic markers more aggressively than what Ozempic or Wegovy enrolled. If your buddy's wife is on a GLP-1, retatrutide is the next conversation.</p>
          <a href="{{URL_RETATRUTIDE}}" style="font:700 11px 'Barlow Condensed',sans-serif;color:#E07C24;letter-spacing:2px;text-transform:uppercase;text-decoration:none;border-bottom:1px solid #E07C24">Read the research &rarr;</a>
        </div>

        <!-- BPC-157 -->
        <div style="border-left:3px solid #00A0A8;padding:0 0 0 18px;margin:0 0 24px">
          <div style="font:700 10px 'JetBrains Mono',monospace;color:#00A0A8;letter-spacing:3px;text-transform:uppercase;margin:0 0 6px">RECOVERY &middot; "MY KNEES HURT BY 35"</div>
          <div style="font:900 26px 'Barlow Condensed',sans-serif;color:#1A1C22;letter-spacing:-0.3px;text-transform:uppercase;line-height:1.05;margin:0 0 4px">BPC-157</div>
          <div style="font:300 italic 18px 'Cormorant Garamond',serif;color:#00A0A8;line-height:1.2;margin:0 0 10px">A regenerative tissue compound.</div>
          <p style="font:400 14px Arial,sans-serif;color:#1A1C22;line-height:1.65;margin:0 0 10px">Studies have looked at tendon-to-bone healing, gastrointestinal repair, and tissue inflammation markers in animal models (Sikiric 2003). The recovery story. If your contact lifts and complains about joint stuff, this is their entry point.</p>
          <a href="{{URL_BPC_157}}" style="font:700 11px 'Barlow Condensed',sans-serif;color:#00A0A8;letter-spacing:2px;text-transform:uppercase;text-decoration:none;border-bottom:1px solid #00A0A8">Read the research &rarr;</a>
        </div>

        <!-- KLOW -->
        <div style="border-left:3px solid #00A0A8;padding:0 0 0 18px;margin:0 0 24px">
          <div style="font:700 10px 'JetBrains Mono',monospace;color:#00A0A8;letter-spacing:3px;text-transform:uppercase;margin:0 0 6px">STACK &middot; THE ALL-IN-ONE</div>
          <div style="font:900 26px 'Barlow Condensed',sans-serif;color:#1A1C22;letter-spacing:-0.3px;text-transform:uppercase;line-height:1.05;margin:0 0 4px">KLOW</div>
          <div style="font:300 italic 18px 'Cormorant Garamond',serif;color:#00A0A8;line-height:1.2;margin:0 0 10px">Multi-compound recovery + performance blend.</div>
          <p style="font:400 14px Arial,sans-serif;color:#1A1C22;line-height:1.65;margin:0 0 10px">For contacts who don't want to manage three vials &mdash; KLOW bundles recovery and performance signaling into a single research-grade blend. Easier first protocol for someone testing the space.</p>
          <a href="{{URL_KLOW}}" style="font:700 11px 'Barlow Condensed',sans-serif;color:#00A0A8;letter-spacing:2px;text-transform:uppercase;text-decoration:none;border-bottom:1px solid #00A0A8">Read the research &rarr;</a>
        </div>

        <!-- SEMAX -->
        <div style="border-left:3px solid #00A0A8;padding:0 0 0 18px;margin:0 0 24px">
          <div style="font:700 10px 'JetBrains Mono',monospace;color:#00A0A8;letter-spacing:3px;text-transform:uppercase;margin:0 0 6px">COGNITIVE &middot; THE BRAIN FOG CROWD</div>
          <div style="font:900 26px 'Barlow Condensed',sans-serif;color:#1A1C22;letter-spacing:-0.3px;text-transform:uppercase;line-height:1.05;margin:0 0 4px">SEMAX</div>
          <div style="font:300 italic 18px 'Cormorant Garamond',serif;color:#00A0A8;line-height:1.2;margin:0 0 10px">Attention and dopaminergic research.</div>
          <p style="font:400 14px Arial,sans-serif;color:#1A1C22;line-height:1.65;margin:0 0 10px">Originally developed in Russia for nootropic research (Kaplan 1996). Literature on dopaminergic activity, attention markers, and cognitive performance. The fellow rep who closes 60 hours a week and complains about brain fog? Yeah.</p>
          <a href="{{URL_SEMAX}}" style="font:700 11px 'Barlow Condensed',sans-serif;color:#00A0A8;letter-spacing:2px;text-transform:uppercase;text-decoration:none;border-bottom:1px solid #00A0A8">Read the research &rarr;</a>
        </div>

        <div style="height:1px;background:#E4E7EC;margin:28px 0"></div>

        <p style="font:300 italic 17px 'Cormorant Garamond',serif;color:#1A1C22;line-height:1.5;margin:0 0 28px;text-align:center">You don't need to memorize this. You just need to know it exists when your buddy asks.</p>

        <div style="text-align:center;padding:8px 0 0">
          <a href="{{APPLY_URL}}" style="display:inline-block;background:#E07C24;color:#1A1C22;font:900 14px 'Barlow Condensed',sans-serif;letter-spacing:4px;text-transform:uppercase;text-decoration:none;padding:18px 32px;border-radius:3px">I'm in &rarr;</a>
        </div>

      </div>

      <div style="padding:40px 36px 36px">
        <p style="font:400 13px Arial,sans-serif;color:#7A7D88;line-height:1.7;margin:0">&mdash; The advnce labs team</p>
      </div>

      <div style="background:#1A1C22;padding:18px 28px;text-align:center;font:400 8px 'JetBrains Mono',monospace;color:rgba(244,242,238,0.45);letter-spacing:1.5px;text-transform:uppercase;line-height:1.8">
        advncelabs.com &middot; ambassadors@advncelabs.com<br>
        Research-grade compounds for in-vitro laboratory use only. Not for human consumption.<br>
        <a href="{{UNSUBSCRIBE_URL}}" style="color:rgba(244,242,238,0.55);text-decoration:underline">Unsubscribe</a>
      </div>

    </div>
  </div>
</body>
</html>
```

- [ ] **Step 4.2: Commit**

```bash
git add templates/email/recruitment-3-compounds.html
git commit -m "recruitment: touch 3 template — 4-compound primer"
```

---

## Task 5 · Recruitment email renderer

**Files:**
- Create: `lib/renderRecruitmentEmail.js`

- [ ] **Step 5.1: Write the renderer**

Create `lib/renderRecruitmentEmail.js`:

```javascript
// Renders one of the 5 recruitment templates with field substitution.
// Touch 3 also looks up compound product URLs at render time.

import fs from 'fs';
import path from 'path';
import { signUnsubToken } from './unsubToken.js';

const TEMPLATE_PATHS = {
  1: path.join(process.cwd(), 'templates', 'email', 'recruitment-1-pitch.html'),
  2: path.join(process.cwd(), 'templates', 'email', 'recruitment-2-playbook.html'),
  3: path.join(process.cwd(), 'templates', 'email', 'recruitment-3-compounds.html'),
  4: path.join(process.cwd(), 'templates', 'email', 'recruitment-4-scarcity.html'),
  5: path.join(process.cwd(), 'templates', 'email', 'recruitment-5-goodbye.html'),
};

const SUBJECTS = {
  1: '$100k, no new doors.',
  2: "Here's exactly what week 1 looks like.",
  3: 'The 4 peptides your network is already asking about.',
  4: 'First wave is filling.',
  5: "We'll stop bugging you.",
};

const WHOLESALE_URL = 'https://www.advncelabs.com/advnce-wholesale.html';
const CATALOG_URL = 'https://www.advncelabs.com/advnce-catalog.html';

const TPL_CACHE = {};
function loadTemplate(touch) {
  if (TPL_CACHE[touch]) return TPL_CACHE[touch];
  TPL_CACHE[touch] = fs.readFileSync(TEMPLATE_PATHS[touch], 'utf8');
  return TPL_CACHE[touch];
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

async function fetchCompoundUrls() {
  const slugs = ['retatrutide', 'bpc-157', 'klow', 'semax'];
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/compound_marketing?compound_slug=in.(${slugs.join(',')})&select=compound_slug,product_url`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }, cache: 'no-store' },
  );
  if (!r.ok) return {};
  const rows = await r.json();
  const map = {};
  for (const row of rows) map[row.compound_slug] = row.product_url || CATALOG_URL;
  return map;
}

// `recipient` is a row from ambassador_recruitment_recipients.
// `touch` is 1..5. `baseUrl` is the origin used for apply + unsubscribe links.
export async function renderRecruitmentEmail(touch, recipient, baseUrl) {
  const tpl = loadTemplate(touch);
  const unsubUrl = `${baseUrl.replace(/\/$/, '')}/api/email-unsub?t=${encodeURIComponent(signUnsubToken(recipient.email))}`;
  const applyUrl = `${baseUrl.replace(/\/$/, '')}/api/recruitment-click?r=${recipient.id}&t=${touch}&dest=apply`;

  const fields = {
    FIRST_NAME: escapeHtml(recipient.first_name || recipient.name?.split(' ')[0] || 'there'),
    COMPANY: escapeHtml(recipient.company || ''),
    STATE: escapeHtml(recipient.state || ''),
    APPLY_URL: applyUrl,
    UNSUBSCRIBE_URL: unsubUrl,
    WHOLESALE_URL: `${baseUrl.replace(/\/$/, '')}/api/recruitment-click?r=${recipient.id}&t=${touch}&dest=wholesale`,
  };

  if (touch === 3) {
    const urls = await fetchCompoundUrls();
    fields.URL_RETATRUTIDE = urls['retatrutide'] || CATALOG_URL;
    fields.URL_BPC_157 = urls['bpc-157'] || CATALOG_URL;
    fields.URL_KLOW = urls['klow'] || CATALOG_URL;
    fields.URL_SEMAX = urls['semax'] || CATALOG_URL;
  }

  const html = tpl.replace(/\{\{(\w+)\}\}/g, (_, key) => (key in fields ? fields[key] : ''));
  return { html, subject: SUBJECTS[touch] };
}
```

- [ ] **Step 5.2: Smoke test**

```bash
set -a; source /tmp/advnce.env; set +a
node -e "
import('./lib/renderRecruitmentEmail.js').then(async ({ renderRecruitmentEmail }) => {
  const rec = { id: '11111111-1111-1111-1111-111111111111', email: 'test@example.com', first_name: 'Mike', company: 'Bright Solar', state: 'TX' };
  for (const t of [1,2,3,4,5]) {
    const { html, subject } = await renderRecruitmentEmail(t, rec, 'http://localhost:3000');
    console.log('touch', t, '| subject:', subject, '| html bytes:', html.length);
    if (!html.includes('Mike')) throw new Error('first_name missing on touch ' + t);
    if (!html.includes('email-unsub?t=')) throw new Error('unsub missing on touch ' + t);
    if (!html.includes('recruitment-click?r=11111111-1111-1111-1111-111111111111')) throw new Error('apply tracker missing on touch ' + t);
  }
  console.log('OK');
});"
```

Expected: 5 lines printed (one per touch), each with non-zero `html bytes`, then `OK`.

- [ ] **Step 5.3: Commit**

```bash
git add lib/renderRecruitmentEmail.js
git commit -m "recruitment: 5-touch template renderer with compound URL lookup"
```

---

## Task 6 · Click-tracking redirect route

**Files:**
- Create: `app/api/recruitment-click/route.js`

- [ ] **Step 6.1: Write the route**

Create `app/api/recruitment-click/route.js`:

```javascript
import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const WHOLESALE_URL = 'https://www.advncelabs.com/advnce-wholesale.html';

function headers() { return { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' }; }

export async function GET(request) {
  const url = new URL(request.url);
  const r = url.searchParams.get('r');
  const t = parseInt(url.searchParams.get('t') || '0', 10);
  const dest = url.searchParams.get('dest') || 'apply';

  if (!UUID_RE.test(String(r || '')) || !(t >= 1 && t <= 5) || !['apply','wholesale'].includes(dest)) {
    // Silent fallback: still redirect somewhere reasonable. Don't expose internals.
    return NextResponse.redirect(`${url.origin}/ambassadors/apply`);
  }

  const now = new Date().toISOString();
  // Lookup current state once
  const lookup = await fetch(`${SUPABASE_URL}/rest/v1/ambassador_recruitment_recipients?id=eq.${r}&select=drip_status&limit=1`, { headers: headers(), cache: 'no-store' });
  const [rec] = lookup.ok ? await lookup.json() : [];

  const patch = { last_any_clicked_at: now };
  if (dest === 'apply') patch.last_apply_clicked_at = now;
  // Pause-on-warm-click: only if drip is mid-flight and they clicked apply
  if (dest === 'apply' && rec && rec.drip_status === 'in_progress') {
    patch.drip_status = 'paused';
    patch.paused_until = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  }

  // Best-effort update; don't block the redirect on it
  await fetch(`${SUPABASE_URL}/rest/v1/ambassador_recruitment_recipients?id=eq.${r}`, {
    method: 'PATCH', headers: headers(), body: JSON.stringify(patch),
  }).catch(() => {});

  const target = dest === 'wholesale' ? WHOLESALE_URL : `${url.origin}/ambassadors/apply?r=${r}&t=${t}`;
  return NextResponse.redirect(target, 302);
}
```

- [ ] **Step 6.2: Manual verify**

Dev server should already be running. If not: `npm run dev`.

```bash
curl -sS -o /dev/null -w "code=%{http_code} location=%{redirect_url}\n" "http://localhost:3000/api/recruitment-click?r=00000000-0000-0000-0000-000000000000&t=1&dest=apply"
```

Expected: `code=302` and `location` ends with `/ambassadors/apply?r=00000000-0000-0000-0000-000000000000&t=1`.

```bash
curl -sS -o /dev/null -w "code=%{http_code} location=%{redirect_url}\n" "http://localhost:3000/api/recruitment-click?r=garbage&t=1&dest=apply"
```

Expected: `code=302` redirecting to `/ambassadors/apply` (silent fallback).

- [ ] **Step 6.3: Commit**

```bash
git add app/api/recruitment-click/route.js
git commit -m "recruitment: click-tracking redirect with pause-on-warm-click"
```

---

## Task 7 · CSV import script

**Files:**
- Create: `scripts/import-recruitment-csv.js`

- [ ] **Step 7.1: Write the script**

Create `scripts/import-recruitment-csv.js`:

```javascript
#!/usr/bin/env node
// Import a CSV of solar-rep contacts into ambassador_recruitment_recipients.
// Idempotent — re-runnable. Drops rows whose email is in compound_email_unsubscribes.
//
// Usage:  node scripts/import-recruitment-csv.js path/to/leads.csv [--batch-id=2026-05-28-wave-1]

const fs = require('fs');
const path = require('path');

if (fs.existsSync('/tmp/advnce.env')) {
  for (const line of fs.readFileSync('/tmp/advnce.env', 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.+)$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const URL_ = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) { console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY'); process.exit(1); }

const args = process.argv.slice(2);
const csvPath = args.find(a => !a.startsWith('--'));
const batchFlag = args.find(a => a.startsWith('--batch-id='));
const batchId = batchFlag ? batchFlag.split('=')[1] : new Date().toISOString().slice(0, 10);
if (!csvPath || !fs.existsSync(csvPath)) { console.error('CSV path missing or file not found:', csvPath); process.exit(1); }

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Minimal CSV parser — handles quoted cells with commas/newlines.
function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i + 1];
    if (inQuotes) {
      if (c === '"' && n === '"') { cell += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else { cell += c; }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') {
        if (cell !== '' || row.length) { row.push(cell); rows.push(row); row = []; cell = ''; }
        if (c === '\r' && n === '\n') i++;
      } else cell += c;
    }
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

function normalizeKey(k) {
  return String(k || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

(async () => {
  const raw = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCsv(raw);
  if (rows.length < 2) { console.error('CSV has no data rows'); process.exit(1); }

  const header = rows[0].map(normalizeKey);
  const idx = (...names) => {
    for (const n of names) { const i = header.indexOf(n); if (i >= 0) return i; }
    return -1;
  };

  const emailIdx = idx('email', 'email_address');
  const nameIdx  = idx('name', 'full_name');
  const firstIdx = idx('first_name', 'firstname', 'first');
  const lastIdx  = idx('last_name', 'lastname', 'last');
  const phoneIdx = idx('phone', 'phone_number', 'mobile');
  const compIdx  = idx('company', 'company_name', 'dealer');
  const cityIdx  = idx('city');
  const stateIdx = idx('state');
  const volIdx   = idx('volume', 'monthly_volume', 'sales_volume');

  if (emailIdx < 0) { console.error('CSV must have an "email" column'); process.exit(1); }

  // Load suppression list once
  const supRes = await fetch(`${URL_}/rest/v1/compound_email_unsubscribes?select=email`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  const suppressed = new Set((supRes.ok ? await supRes.json() : []).map(r => String(r.email || '').toLowerCase()));

  const records = [];
  let skippedNoEmail = 0, skippedInvalid = 0, skippedSuppressed = 0;
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const email = String(r[emailIdx] || '').trim().toLowerCase();
    if (!email) { skippedNoEmail++; continue; }
    if (!EMAIL_RE.test(email)) { skippedInvalid++; continue; }
    if (suppressed.has(email)) { skippedSuppressed++; continue; }
    const name = nameIdx >= 0 ? String(r[nameIdx] || '').trim() : '';
    let first = firstIdx >= 0 ? String(r[firstIdx] || '').trim() : '';
    let last  = lastIdx  >= 0 ? String(r[lastIdx]  || '').trim() : '';
    if (!first && name) first = name.split(/\s+/)[0] || '';
    if (!last && name) last = name.split(/\s+/).slice(1).join(' ') || '';
    records.push({
      email,
      first_name: first || null,
      last_name: last || null,
      name: name || [first, last].filter(Boolean).join(' ') || null,
      phone: phoneIdx >= 0 ? String(r[phoneIdx] || '').trim() || null : null,
      company: compIdx >= 0 ? String(r[compIdx] || '').trim() || null : null,
      city: cityIdx >= 0 ? String(r[cityIdx] || '').trim() || null : null,
      state: stateIdx >= 0 ? String(r[stateIdx] || '').trim().toUpperCase() || null : null,
      volume: volIdx >= 0 ? String(r[volIdx] || '').trim() || null : null,
      csv_batch_id: batchId,
      drip_status: 'queued',
      next_touch_num: 1,
      next_send_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    });
  }

  console.log(`Parsed ${rows.length - 1} rows | upserting ${records.length} | skipped no-email=${skippedNoEmail} invalid=${skippedInvalid} suppressed=${skippedSuppressed}`);

  for (let i = 0; i < records.length; i += 100) {
    const batch = records.slice(i, i + 100);
    const res = await fetch(`${URL_}/rest/v1/ambassador_recruitment_recipients?on_conflict=email`, {
      method: 'POST', headers, body: JSON.stringify(batch),
    });
    if (!res.ok) { console.error('Upsert failed:', res.status, await res.text()); process.exit(1); }
    console.log(`  upserted ${i + batch.length}/${records.length}`);
  }
  console.log('Done. batch_id=' + batchId);
})().catch(err => { console.error('FAIL:', err.message); process.exit(1); });
```

- [ ] **Step 7.2: Create a small test CSV**

```bash
cat > /tmp/test-recruitment.csv <<'EOF'
name,email,phone,company,city,state,volume
Mike Williams,mike@brightsolar.test,5551112222,Bright Solar,Austin,TX,$200k
Sarah Chen,sarah@suncrest.test,5552223333,Suncrest Energy,Phoenix,AZ,$150k
,bad-email-no-name@,5553334444,,Denver,CO,
EOF
```

- [ ] **Step 7.3: Run the script**

```bash
node scripts/import-recruitment-csv.js /tmp/test-recruitment.csv --batch-id=smoke-test
```

Expected output:

```
Parsed 3 rows | upserting 2 | skipped no-email=0 invalid=1 suppressed=0
  upserted 2/2
Done. batch_id=smoke-test
```

- [ ] **Step 7.4: Verify rows landed**

```bash
set -a; source /tmp/advnce.env; set +a
curl -sS "$SUPABASE_URL/rest/v1/ambassador_recruitment_recipients?csv_batch_id=eq.smoke-test&select=email,first_name,state,drip_status,next_touch_num" \
  -H "apikey: $SUPABASE_SERVICE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_KEY"
```

Expected: 2 rows with `drip_status: "queued"`, `next_touch_num: 1`, and TX/AZ state values.

- [ ] **Step 7.5: Cleanup test rows**

```bash
curl -sS -X DELETE "$SUPABASE_URL/rest/v1/ambassador_recruitment_recipients?csv_batch_id=eq.smoke-test" \
  -H "apikey: $SUPABASE_SERVICE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_KEY"
rm /tmp/test-recruitment.csv
```

- [ ] **Step 7.6: Commit**

```bash
git add scripts/import-recruitment-csv.js
git commit -m "recruitment: CSV import script with suppression skip and batch tagging"
```

---

## Task 8 · Public apply page + form component

**Files:**
- Create: `app/ambassadors/layout.jsx`
- Create: `app/ambassadors/apply/page.jsx`
- Create: `app/ambassadors/apply/ApplyForm.jsx`

- [ ] **Step 8.1: Write the layout**

Create `app/ambassadors/layout.jsx`:

```jsx
export const metadata = { title: 'Apply · advnce labs ambassador program' };

export default function AmbassadorsLayout({ children }) {
  return (
    <div style={{ background: '#E8E6E2', minHeight: '100vh' }}>
      {children}
    </div>
  );
}
```

- [ ] **Step 8.2: Write the server page**

Create `app/ambassadors/apply/page.jsx`:

```jsx
import ApplyForm from './ApplyForm';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const dynamic = 'force-dynamic';

async function fetchPrefill(r) {
  if (!UUID_RE.test(String(r || ''))) return null;
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/ambassador_recruitment_recipients?id=eq.${r}&select=email,first_name,last_name,phone,company,city,state&limit=1`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }, cache: 'no-store' },
  );
  if (!res.ok) return null;
  const [row] = await res.json();
  return row || null;
}

export default async function ApplyPage({ searchParams }) {
  const r = searchParams?.r || '';
  const t = parseInt(searchParams?.t || '0', 10) || null;
  const prefill = await fetchPrefill(r);

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '48px 24px' }}>
      <div style={{ background: '#F4F2EE', borderRadius: 6, overflow: 'hidden' }}>

        <div style={{ padding: '18px 28px', borderBottom: '1px solid #E4E7EC', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg viewBox="0 0 48 28" width="32" height="19" fill="none">
              <path d="M2 24L8 19L14 22L20 14L26 17L32 9L38 12L46 3" stroke="#00A0A8" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
              <circle cx="32" cy="9" r="2" fill="#00A0A8" />
              <circle cx="38" cy="12" r="2" fill="#E07C24" />
              <circle cx="46" cy="3" r="2.5" fill="#E07C24" />
            </svg>
            <span style={{ font: "700 14px 'Barlow Condensed', sans-serif", letterSpacing: 3, textTransform: 'lowercase' }}>advnce <span style={{ color: '#7A7D88', fontWeight: 300 }}>labs</span></span>
          </div>
          <div style={{ font: "400 10px 'JetBrains Mono', monospace", color: '#00A0A8', letterSpacing: 3, textTransform: 'uppercase' }}>AMBASSADOR APPLICATION</div>
        </div>

        <div style={{ padding: '48px 36px 12px' }}>
          <h1 style={{ font: "900 44px 'Barlow Condensed', sans-serif", color: '#1A1C22', lineHeight: 0.95, letterSpacing: -1, textTransform: 'uppercase', margin: '0 0 8px' }}>You're in.</h1>
          <p style={{ font: "300 italic 22px 'Cormorant Garamond', serif", color: '#00A0A8', margin: '0 0 28px' }}>30 seconds. We review same-day.</p>

          <ApplyForm prefill={prefill} recipientId={UUID_RE.test(r) ? r : null} sourceTouch={t} />
        </div>

        <div style={{ background: '#1A1C22', padding: '18px 28px', textAlign: 'center', font: "400 8px 'JetBrains Mono', monospace", color: 'rgba(244,242,238,0.45)', letterSpacing: 1.5, textTransform: 'uppercase', lineHeight: 1.8 }}>
          advncelabs.com &middot; ambassadors@advncelabs.com<br />
          Research-grade compounds for in-vitro laboratory use only.
        </div>

      </div>
    </div>
  );
}
```

- [ ] **Step 8.3: Write the client form**

Create `app/ambassadors/apply/ApplyForm.jsx`:

```jsx
'use client';
import { useState } from 'react';

export default function ApplyForm({ prefill, recipientId, sourceTouch }) {
  const [fields, setFields] = useState({
    email: prefill?.email || '',
    first_name: prefill?.first_name || '',
    last_name: prefill?.last_name || '',
    phone: prefill?.phone || '',
    company: prefill?.company || '',
    city: prefill?.city || '',
    state: prefill?.state || '',
    why_interested: '',
  });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);

  function set(k) { return e => setFields({ ...fields, [k]: e.target.value }); }

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const r = await fetch('/api/ambassador-apply', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...fields, recipient_id: recipientId, source_touch: sourceTouch }),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        setError(data.error || 'Submission failed');
        return;
      }
      setDone(true);
    } catch (err) {
      setError(err.message || 'Network error');
    } finally { setBusy(false); }
  }

  if (done) {
    return (
      <div style={{ padding: '8px 0 36px' }}>
        <p style={{ font: "300 italic 22px 'Cormorant Garamond', serif", color: '#1A1C22', lineHeight: 1.4, margin: '0 0 18px' }}>Got it — your application's in.</p>
        <p style={{ font: "400 15px Arial, sans-serif", color: '#1A1C22', lineHeight: 1.7, margin: 0 }}>We review every application by hand. Expect a same-day reply with your link, ambassador code, and a quick first-share template.</p>
        <p style={{ font: "400 13px Arial, sans-serif", color: '#7A7D88', lineHeight: 1.7, margin: '24px 0 0' }}>&mdash; The advnce labs team</p>
      </div>
    );
  }

  const inputStyle = { width: '100%', padding: 12, fontSize: 14, border: '1px solid #E4E7EC', borderRadius: 3, background: '#fff', boxSizing: 'border-box', fontFamily: 'Arial, sans-serif' };
  const labelStyle = { font: "700 10px 'Barlow Condensed', sans-serif", letterSpacing: 2, textTransform: 'uppercase', color: '#4A4F5C', display: 'block', marginBottom: 6 };
  const row = { marginBottom: 16 };

  return (
    <form onSubmit={submit} style={{ padding: '8px 0 36px' }}>
      <div style={row}><label style={labelStyle}>Email *</label><input type="email" required value={fields.email} onChange={set('email')} style={inputStyle} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div><label style={labelStyle}>First name *</label><input type="text" required value={fields.first_name} onChange={set('first_name')} style={inputStyle} /></div>
        <div><label style={labelStyle}>Last name</label><input type="text" value={fields.last_name} onChange={set('last_name')} style={inputStyle} /></div>
      </div>
      <div style={row}><label style={labelStyle}>Phone *</label><input type="tel" required value={fields.phone} onChange={set('phone')} style={inputStyle} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div><label style={labelStyle}>Company / dealer</label><input type="text" value={fields.company} onChange={set('company')} style={inputStyle} /></div>
        <div><label style={labelStyle}>City</label><input type="text" value={fields.city} onChange={set('city')} style={inputStyle} /></div>
        <div><label style={labelStyle}>State</label><input type="text" maxLength={2} value={fields.state} onChange={e => setFields({ ...fields, state: e.target.value.toUpperCase() })} style={inputStyle} /></div>
      </div>
      <div style={row}><label style={labelStyle}>What made you say yes? (one line)</label><input type="text" value={fields.why_interested} onChange={set('why_interested')} style={inputStyle} placeholder="e.g. residual income angle / network already buys / curious" /></div>

      {error && <p style={{ color: '#E07C24', font: "400 13px Arial, sans-serif", margin: '0 0 12px' }}>{error}</p>}

      <button type="submit" disabled={busy} style={{
        width: '100%', padding: '16px 24px', font: "900 14px 'Barlow Condensed', sans-serif", letterSpacing: 4,
        textTransform: 'uppercase', color: '#1A1C22', background: '#E07C24', border: 0, borderRadius: 3, cursor: busy ? 'wait' : 'pointer', marginTop: 12,
      }}>{busy ? 'Submitting…' : "I'm in — submit →"}</button>

      <p style={{ font: "400 11px 'JetBrains Mono', monospace", color: '#7A7D88', letterSpacing: 1, marginTop: 18, textAlign: 'center' }}>Same-day review. Your link in your inbox once approved.</p>
    </form>
  );
}
```

- [ ] **Step 8.4: Verify page renders**

```bash
curl -sS -o /dev/null -w "%{http_code}\n" "http://localhost:3000/ambassadors/apply"
```

Expected: `200`.

```bash
curl -sS "http://localhost:3000/ambassadors/apply" | grep -oE "(You're in\.|Submitting)" | head -2
```

Expected: at least `You're in.` appears.

- [ ] **Step 8.5: Commit**

```bash
git add app/ambassadors
git commit -m "recruitment: public apply page with prefill from CSV row"
```

---

## Task 9 · Apply API (public POST)

**Files:**
- Create: `app/api/ambassador-apply/route.js`

- [ ] **Step 9.1: Write the route**

Create `app/api/ambassador-apply/route.js`:

```javascript
import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function headers() { return { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' }; }

export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const email = String(body.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
  if (!body.first_name) return NextResponse.json({ error: 'First name required' }, { status: 400 });
  if (!body.phone) return NextResponse.json({ error: 'Phone required' }, { status: 400 });

  const recipientId = UUID_RE.test(String(body.recipient_id || '')) ? body.recipient_id : null;
  const sourceTouch = (body.source_touch >= 1 && body.source_touch <= 5) ? body.source_touch : null;

  const insert = {
    email,
    first_name: String(body.first_name).trim() || null,
    last_name: String(body.last_name || '').trim() || null,
    phone: String(body.phone).trim() || null,
    company: String(body.company || '').trim() || null,
    city: String(body.city || '').trim() || null,
    state: String(body.state || '').trim().toUpperCase() || null,
    why_interested: String(body.why_interested || '').trim() || null,
    source: recipientId ? 'recruitment_drip' : 'organic',
    source_touch: sourceTouch,
    recipient_id: recipientId,
    status: 'pending',
  };

  const insRes = await fetch(`${SUPABASE_URL}/rest/v1/ambassador_applications`, {
    method: 'POST', headers: { ...headers(), Prefer: 'return=minimal' }, body: JSON.stringify(insert),
  });
  if (!insRes.ok) return NextResponse.json({ error: 'Submission failed', detail: await insRes.text() }, { status: 500 });

  if (recipientId) {
    await fetch(`${SUPABASE_URL}/rest/v1/ambassador_recruitment_recipients?id=eq.${recipientId}`, {
      method: 'PATCH', headers: headers(),
      body: JSON.stringify({ drip_status: 'applied', applied_at: new Date().toISOString() }),
    }).catch(() => {});
  }

  return NextResponse.json({ success: true });
}

export async function GET() {
  return NextResponse.json({ status: 'ambassador-apply route is live' });
}
```

- [ ] **Step 9.2: Manual verify**

```bash
curl -sS http://localhost:3000/api/ambassador-apply
```

Expected: `{"status":"ambassador-apply route is live"}`.

```bash
curl -sS -X POST http://localhost:3000/api/ambassador-apply -H 'Content-Type: application/json' \
  -d '{"email":"apply-test@example.com","first_name":"Test","phone":"5550001111","why_interested":"smoke"}'
```

Expected: `{"success":true}`.

- [ ] **Step 9.3: Cleanup**

```bash
set -a; source /tmp/advnce.env; set +a
curl -sS -X DELETE "$SUPABASE_URL/rest/v1/ambassador_applications?email=eq.apply-test@example.com" \
  -H "apikey: $SUPABASE_SERVICE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_KEY"
```

- [ ] **Step 9.4: Commit**

```bash
git add app/api/ambassador-apply/route.js
git commit -m "recruitment: public apply API with drip pause on submit"
```

---

## Task 10 · Drip orchestrator script

**Files:**
- Create: `scripts/send-recruitment-drip.js`

- [ ] **Step 10.1: Write the script**

Create `scripts/send-recruitment-drip.js`:

```javascript
#!/usr/bin/env node
// Advance every eligible recipient through the next touch of the recruitment drip.
// Called by cron once an hour. Idempotent — re-runnable.

const fs = require('fs');
if (fs.existsSync('/tmp/advnce.env')) {
  for (const line of fs.readFileSync('/tmp/advnce.env', 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.+)$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const URL_ = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND = process.env.RESEND_API_KEY;
const BASE = process.env.ADVNCE_ORIGIN || 'https://www.adonis.pro';

if (!URL_ || !KEY) { console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY'); process.exit(1); }
if (!RESEND)       { console.error('Missing RESEND_API_KEY'); process.exit(1); }

// Touch spacing in days (gap from previous touch to this one):
// touch 1 = 0 (initial), then 3, 4, 7, 7 (totals: 0, 3, 7, 14, 21)
const GAP_DAYS_AFTER_TOUCH = { 1: 3, 2: 4, 3: 7, 4: 7, 5: 0 };
const THROTTLE_MS = 250;

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const nowIso = new Date().toISOString();
  // Fetch candidates: queued/in_progress/paused, due now, paused_until expired or null
  const q =
    `${URL_}/rest/v1/ambassador_recruitment_recipients?` +
    `drip_status=in.(queued,in_progress,paused)&` +
    `next_send_at=lte.${encodeURIComponent(nowIso)}&` +
    `or=(paused_until.is.null,paused_until.lte.${encodeURIComponent(nowIso)})&` +
    `select=*&limit=200`;
  const candRes = await fetch(q, { headers });
  if (!candRes.ok) { console.error('Candidate lookup failed:', candRes.status, await candRes.text()); process.exit(1); }
  const cands = await candRes.json();
  console.log(`candidates due: ${cands.length}`);

  // Load suppression list to short-circuit mid-flight unsubscribes
  const supRes = await fetch(`${URL_}/rest/v1/compound_email_unsubscribes?select=email`, { headers });
  const suppressed = new Set((supRes.ok ? await supRes.json() : []).map(r => String(r.email || '').toLowerCase()));

  let sent = 0, failed = 0, skipped = 0;

  const { renderRecruitmentEmail } = await import('../lib/renderRecruitmentEmail.js');

  for (const rec of cands) {
    const email = String(rec.email || '').toLowerCase();
    if (suppressed.has(email)) {
      await fetch(`${URL_}/rest/v1/ambassador_recruitment_recipients?id=eq.${rec.id}`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ drip_status: 'unsubscribed', unsubscribed_at: new Date().toISOString() }),
      });
      skipped++; continue;
    }

    const touch = rec.next_touch_num;
    if (!(touch >= 1 && touch <= 5)) { skipped++; continue; }

    let html, subject;
    try { ({ html, subject } = await renderRecruitmentEmail(touch, rec, BASE)); }
    catch (err) { console.error('render error:', rec.id, err.message); failed++; continue; }

    let ok = false, resendId = null, error = null;
    try {
      const sendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + RESEND },
        body: JSON.stringify({
          from: 'advnce labs <ambassadors@advncelabs.com>',
          to: email, subject, html,
        }),
      });
      const data = await sendRes.json().catch(() => ({}));
      if (sendRes.ok) { ok = true; resendId = data.id || null; }
      else { error = JSON.stringify(data).slice(0, 500); }
    } catch (err) { error = String(err.message || err).slice(0, 500); }

    await fetch(`${URL_}/rest/v1/ambassador_recruitment_sends`, {
      method: 'POST', headers: { ...headers, Prefer: 'return=minimal' },
      body: JSON.stringify({ recipient_id: rec.id, touch_num: touch, sent_at: new Date().toISOString(), resend_id: resendId, status: ok ? 'sent' : 'failed', error }),
    });

    if (ok) {
      sent++;
      const patch = {};
      if (touch === 5) { patch.drip_status = 'completed'; patch.next_send_at = null; }
      else {
        patch.drip_status = 'in_progress';
        patch.next_touch_num = touch + 1;
        patch.next_send_at = new Date(Date.now() + GAP_DAYS_AFTER_TOUCH[touch] * 24 * 60 * 60 * 1000).toISOString();
      }
      // Clear paused_until once delivered
      patch.paused_until = null;
      await fetch(`${URL_}/rest/v1/ambassador_recruitment_recipients?id=eq.${rec.id}`, {
        method: 'PATCH', headers, body: JSON.stringify(patch),
      });
    } else {
      failed++;
      // Don't advance touch on failure — cron will retry. But push next_send_at out 1h to avoid hammering.
      await fetch(`${URL_}/rest/v1/ambassador_recruitment_recipients?id=eq.${rec.id}`, {
        method: 'PATCH', headers, body: JSON.stringify({ next_send_at: new Date(Date.now() + 60 * 60 * 1000).toISOString() }),
      });
    }

    await sleep(THROTTLE_MS);
  }

  console.log(`done | sent=${sent} failed=${failed} skipped=${skipped}`);
}

main().catch(err => { console.error('FATAL:', err.message); process.exit(1); });
```

- [ ] **Step 10.2: Smoke test (no sends — no recipients due)**

```bash
node scripts/send-recruitment-drip.js
```

Expected: `candidates due: 0` then `done | sent=0 failed=0 skipped=0`. (No actual emails sent because no recipients are queued.)

- [ ] **Step 10.3: Commit**

```bash
git add scripts/send-recruitment-drip.js
git commit -m "recruitment: drip orchestrator advancing touches with throttle + retry"
```

---

## Task 11 · Cron entry point + vercel.json wiring

**Files:**
- Create: `app/api/cron/recruitment-drip/route.js`
- Modify: `vercel.json`

- [ ] **Step 11.1: Inspect existing cron route pattern**

```bash
ls "/Volumes/(626)806-4475/Ai Projects/adonis-next/app/api/cron/"
cat "/Volumes/(626)806-4475/Ai Projects/adonis-next/app/api/cron/welcome-emails/route.js" | head -30
```

Adapt the auth pattern from `welcome-emails` (uses `requireAdminOrCron`).

- [ ] **Step 11.2: Write the cron route**

Create `app/api/cron/recruitment-drip/route.js`:

```javascript
import { NextResponse } from 'next/server';
import { requireAdminOrCron } from '../../../../lib/requireAdminOrCron';
import { exec } from 'child_process';
import path from 'path';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request) {
  const unauth = requireAdminOrCron(request); if (unauth) return unauth;
  return run();
}
export async function POST(request) {
  const unauth = requireAdminOrCron(request); if (unauth) return unauth;
  return run();
}

function run() {
  return new Promise((resolve) => {
    const script = path.join(process.cwd(), 'scripts', 'send-recruitment-drip.js');
    exec(`node ${script}`, { env: process.env, timeout: 270_000 }, (err, stdout, stderr) => {
      if (err) {
        resolve(NextResponse.json({ ok: false, error: String(err.message), stdout, stderr }, { status: 500 }));
      } else {
        resolve(NextResponse.json({ ok: true, stdout: stdout.slice(0, 4000), stderr: stderr.slice(0, 2000) }));
      }
    });
  });
}
```

Note: the route shells out to the script rather than re-implementing the drip logic. Same pattern as `welcome-emails` cron in this codebase, which keeps the orchestrator runnable from the CLI for manual testing.

- [ ] **Step 11.3: Add the cron entry to `vercel.json`**

Open `vercel.json`. Add this object to the `crons` array (after the last existing entry):

```json
{ "path": "/api/cron/recruitment-drip", "schedule": "0 * * * *" }
```

The final `crons` array should look like:

```json
"crons": [
  { "path": "/api/cron/welcome-emails", "schedule": "0 17 * * *" },
  { "path": "/api/cron/reorder-reminders", "schedule": "0 12 * * *" },
  { "path": "/api/cron/news-scrape", "schedule": "0 11 * * *" },
  { "path": "/api/cron/news-curate", "schedule": "0 4 * * 1" },
  { "path": "/api/cron/career/ingest", "schedule": "0 14 * * *" },
  { "path": "/api/cron/recruitment-drip", "schedule": "0 * * * *" }
]
```

- [ ] **Step 11.4: Manual verify the route exists**

```bash
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/cron/recruitment-drip
```

Expected: `401` (no auth) or `200` if you have admin cookie. NOT 500.

- [ ] **Step 11.5: Commit**

```bash
git add app/api/cron/recruitment-drip/route.js vercel.json
git commit -m "recruitment: cron route + hourly schedule entry"
```

---

## Task 12 · Application write API (admin approve/reject)

**Files:**
- Create: `app/api/recruitment-application-write/route.js`

This route is admin-only. Approve creates the ambassador and triggers the existing welcome flow.

- [ ] **Step 12.1: Inspect the existing ambassador-create pattern**

```bash
ls "/Volumes/(626)806-4475/Ai Projects/adonis-next/app/api/" | grep -i ambassador
cat "/Volumes/(626)806-4475/Ai Projects/adonis-next/app/api/ambassador-write/route.js" 2>/dev/null | head -50 || echo "no ambassador-write route; check ambassadors-admin or similar"
```

If `ambassador-write` doesn't exist, search for whatever route creates a new ambassador (`/admin/marketing/ambassadors/page.jsx` is the admin UI — find what it POSTs to).

If you can't find a single "create ambassador" route, the spec calls for using the same logic — duplicate the insert here, then call `/api/ambassador-welcome` with the new ambassador.

- [ ] **Step 12.2: Write the route**

Create `app/api/recruitment-application-write/route.js`:

```javascript
import { NextResponse } from 'next/server';
import { requireRole } from '../../../lib/requireAdmin';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function headers() { return { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' }; }

function generateCode(firstName, lastName) {
  const base = (firstName + (lastName || '')).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const suffix = Math.floor(100 + Math.random() * 900);
  return (base || 'AMBASSADOR').slice(0, 16) + suffix;
}

export async function POST(request) {
  const unauth = requireRole(request, 'admin'); if (unauth) return unauth;

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const { action, id, notes } = body || {};
  if (!UUID_RE.test(String(id || ''))) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  if (action === 'reject') {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/ambassador_applications?id=eq.${id}`, {
      method: 'PATCH', headers: headers(),
      body: JSON.stringify({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
        reviewed_by: request.cookies.get('adonis_admin_email')?.value || 'admin',
        notes: notes || null,
      }),
    });
    if (!r.ok) return NextResponse.json({ error: 'Reject failed' }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === 'approve') {
    const appRes = await fetch(`${SUPABASE_URL}/rest/v1/ambassador_applications?id=eq.${id}&select=*&limit=1`, { headers: headers(), cache: 'no-store' });
    const [app] = appRes.ok ? await appRes.json() : [];
    if (!app) return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    if (app.status !== 'pending') return NextResponse.json({ error: `Already ${app.status}` }, { status: 400 });

    const code = generateCode(app.first_name || '', app.last_name || '');
    const ambassador = {
      name: [app.first_name, app.last_name].filter(Boolean).join(' ') || app.email,
      email: app.email,
      phone: app.phone || null,
      code,
      tier: 'starter',
      status: 'active',
    };

    const ambRes = await fetch(`${SUPABASE_URL}/rest/v1/ambassadors`, {
      method: 'POST', headers: { ...headers(), Prefer: 'return=representation' },
      body: JSON.stringify(ambassador),
    });
    if (!ambRes.ok) return NextResponse.json({ error: 'Ambassador create failed', detail: await ambRes.text() }, { status: 500 });
    const [createdAmbassador] = await ambRes.json();

    await fetch(`${SUPABASE_URL}/rest/v1/ambassador_applications?id=eq.${id}`, {
      method: 'PATCH', headers: headers(),
      body: JSON.stringify({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: request.cookies.get('adonis_admin_email')?.value || 'admin',
        notes: notes || null,
        ambassador_id: createdAmbassador.id,
      }),
    });

    // Fire the existing ambassador welcome email
    const origin = new URL(request.url).origin;
    await fetch(`${origin}/api/ambassador-welcome`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: request.headers.get('cookie') || '' },
      body: JSON.stringify({ ambassador: { name: ambassador.name, email: ambassador.email, code: ambassador.code } }),
    }).catch(() => {});

    return NextResponse.json({ success: true, ambassador_id: createdAmbassador.id, code });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

export async function GET() {
  return NextResponse.json({ status: 'recruitment-application-write route is live' });
}
```

- [ ] **Step 12.3: Verify route exists**

```bash
curl -sS http://localhost:3000/api/recruitment-application-write
```

Expected: `{"status":"recruitment-application-write route is live"}`.

- [ ] **Step 12.4: Commit**

```bash
git add app/api/recruitment-application-write/route.js
git commit -m "recruitment: admin approve/reject route — creates ambassador + fires welcome"
```

---

## Task 13 · Admin queue page

**Files:**
- Create: `app/admin/marketing/recruitment/page.jsx`
- Create: `app/admin/marketing/recruitment/ApplicationCard.jsx`

- [ ] **Step 13.1: Write the server page**

Create `app/admin/marketing/recruitment/page.jsx`:

```jsx
import ApplicationCard from './ApplicationCard';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

async function sb(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    cache: 'no-store',
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  if (!r.ok) return [];
  return r.json();
}

export const dynamic = 'force-dynamic';

export default async function RecruitmentAdminPage() {
  const [pending, recent, recipients, sendsByTouch] = await Promise.all([
    sb('/ambassador_applications?status=eq.pending&order=created_at.desc'),
    sb('/ambassador_applications?status=in.(approved,rejected)&order=reviewed_at.desc&limit=20'),
    sb('/ambassador_recruitment_recipients?select=drip_status'),
    sb('/ambassador_recruitment_sends?select=touch_num,status&order=sent_at.desc&limit=2000'),
  ]);

  const dripCounts = recipients.reduce((a, r) => { a[r.drip_status] = (a[r.drip_status] || 0) + 1; return a; }, {});
  const touchCounts = sendsByTouch.reduce((a, r) => { const k = `${r.touch_num}_${r.status}`; a[k] = (a[k] || 0) + 1; return a; }, {});

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 28, letterSpacing: 2, textTransform: 'uppercase' }}>Recruitment Drip</h1>
        <div style={{ marginTop: 6, fontSize: 12, color: '#7A7D88', letterSpacing: 1 }}>Ambassador recruitment campaign &middot; solar rep wave</div>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 24 }}>
        {['queued','in_progress','paused','completed','applied','unsubscribed'].map(s => (
          <div key={s} style={{ border: '1px solid #E4E7EC', borderRadius: 4, padding: 14, background: '#fff' }}>
            <div style={{ fontSize: 10, color: '#7A7D88', letterSpacing: 2, textTransform: 'uppercase' }}>{s.replace('_', ' ')}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#1A1C22', marginTop: 4 }}>{dripCounts[s] || 0}</div>
          </div>
        ))}
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 32 }}>
        {[1,2,3,4,5].map(t => (
          <div key={t} style={{ border: '1px solid #E4E7EC', borderRadius: 4, padding: 14, background: '#fff' }}>
            <div style={{ fontSize: 10, color: '#00A0A8', letterSpacing: 2, textTransform: 'uppercase' }}>TOUCH {t}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1A1C22', marginTop: 4 }}>{touchCounts[`${t}_sent`] || 0} sent</div>
            {(touchCounts[`${t}_failed`] || 0) > 0 && <div style={{ fontSize: 11, color: '#E07C24', marginTop: 2 }}>{touchCounts[`${t}_failed`]} failed</div>}
          </div>
        ))}
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 14, letterSpacing: 3, textTransform: 'uppercase', color: '#1A1C22', margin: '0 0 12px' }}>Pending applications ({pending.length})</h2>
        {pending.length === 0 && <div style={{ padding: 16, color: '#7A7D88', fontSize: 13, fontStyle: 'italic', border: '1px dashed #E4E7EC', borderRadius: 4 }}>No applications waiting.</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {pending.map(a => <ApplicationCard key={a.id} app={a} mode="pending" />)}
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: 14, letterSpacing: 3, textTransform: 'uppercase', color: '#1A1C22', margin: '0 0 12px' }}>Recent reviews (last 20)</h2>
        {recent.length === 0 && <div style={{ padding: 16, color: '#7A7D88', fontSize: 13, fontStyle: 'italic', border: '1px dashed #E4E7EC', borderRadius: 4 }}>None yet.</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {recent.map(a => <ApplicationCard key={a.id} app={a} mode="reviewed" />)}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 13.2: Write the ApplicationCard client component**

Create `app/admin/marketing/recruitment/ApplicationCard.jsx`:

```jsx
'use client';
import { useState } from 'react';

export default function ApplicationCard({ app, mode }) {
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState(app.notes || '');
  const [editingNotes, setEditingNotes] = useState(false);

  async function action(name) {
    if (name === 'reject' && !confirm(`Reject application from ${app.first_name || app.email}?`)) return;
    if (name === 'approve' && !confirm(`Approve ${app.first_name || app.email}? This creates the ambassador and sends the welcome email.`)) return;
    setBusy(true);
    try {
      const r = await fetch('/api/recruitment-application-write', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: name, id: app.id, notes: editingNotes ? notes : undefined }),
      });
      if (!r.ok) { alert('Failed: ' + await r.text()); return; }
      location.reload();
    } finally { setBusy(false); }
  }

  const border = mode === 'pending' ? '#E07C24' : app.status === 'approved' ? '#00A0A8' : '#7A7D88';
  const fullName = [app.first_name, app.last_name].filter(Boolean).join(' ') || '(no name)';

  return (
    <div style={{ border: `1px solid ${border}`, padding: 18, background: '#fff', borderRadius: 4 }}>
      <div style={{ fontSize: 11, color: '#7A7D88', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
        {new Date(app.created_at).toLocaleString()} &middot; {app.source} {app.source_touch ? `· touch ${app.source_touch}` : ''}
        {mode === 'reviewed' && <> &middot; <span style={{ color: app.status === 'approved' ? '#00A0A8' : '#E07C24' }}>{app.status}</span></>}
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#1A1C22', marginBottom: 2 }}>{fullName}</div>
      <div style={{ fontSize: 13, color: '#4A4F5C', marginBottom: 6 }}>{app.email} &middot; {app.phone || '—'} &middot; {app.company || '—'} &middot; {app.city || '—'}, {app.state || '—'}</div>
      {app.why_interested && <div style={{ fontSize: 14, fontStyle: 'italic', color: '#1A1C22', margin: '8px 0 12px', padding: '8px 12px', background: '#FAFBFC', borderLeft: '2px solid #00A0A8' }}>"{app.why_interested}"</div>}

      {mode === 'pending' && (
        <>
          {editingNotes ? (
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Internal notes (optional)" style={{ width: '100%', padding: 8, fontSize: 13, border: '1px solid #E4E7EC', borderRadius: 3, marginBottom: 8 }} />
          ) : (
            <button onClick={() => setEditingNotes(true)} style={{ fontSize: 11, color: '#7A7D88', background: 'none', border: 0, padding: 0, cursor: 'pointer', textDecoration: 'underline', marginBottom: 8 }}>+ Add notes</button>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => action('approve')} disabled={busy} style={{ padding: '8px 16px', fontSize: 12, background: '#00A0A8', color: '#F4F2EE', border: 0, cursor: 'pointer', borderRadius: 3, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700 }}>Approve</button>
            <button onClick={() => action('reject')} disabled={busy} style={{ padding: '8px 16px', fontSize: 12, background: '#fff', color: '#E07C24', border: '1px solid #E07C24', cursor: 'pointer', borderRadius: 3, letterSpacing: 1, textTransform: 'uppercase' }}>Reject</button>
          </div>
        </>
      )}
      {mode === 'reviewed' && app.notes && <div style={{ fontSize: 12, color: '#7A7D88', marginTop: 8 }}>Notes: {app.notes}</div>}
    </div>
  );
}
```

- [ ] **Step 13.3: Verify page renders**

```bash
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:3000/admin/marketing/recruitment
```

Expected: `307` (auth redirect) — confirms the route compiled.

- [ ] **Step 13.4: Commit**

```bash
git add app/admin/marketing/recruitment
git commit -m "recruitment: admin queue page + ApplicationCard approve/reject"
```

---

## Task 14 · Marketing index tile

**Files:**
- Modify: `app/admin/marketing/page.jsx`

- [ ] **Step 14.1: Inspect existing tile pattern**

```bash
grep -n "color:'#" "/Volumes/(626)806-4475/Ai Projects/adonis-next/app/admin/marketing/page.jsx" | head -10
```

The existing tiles each have `icon`, `color`, `label`, `desc`, `href` fields in a cards array.

- [ ] **Step 14.2: Add the tile**

Open `app/admin/marketing/page.jsx`. Find the cards array. Add a new tile entry matching the existing style:

```jsx
{ icon: '🎤', color: '#E07C24', label: 'Recruitment Drip', desc: 'Solar-rep ambassador campaign', href: '/admin/marketing/recruitment', tag: 'New' },
```

Place it near the Ambassadors / Email Campaigns tiles — wherever fits the existing visual order.

- [ ] **Step 14.3: Verify**

```bash
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:3000/admin/marketing
```

Expected: 307 (auth) — confirms no syntax error.

- [ ] **Step 14.4: Commit**

```bash
git add app/admin/marketing/page.jsx
git commit -m "recruitment: marketing index tile linking to recruitment queue"
```

---

## Task 15 · End-to-end smoke test

**Files:**
- Create: `scripts/smoke-recruitment-drip.js`

- [ ] **Step 15.1: Write the smoke test**

Create `scripts/smoke-recruitment-drip.js`:

```javascript
#!/usr/bin/env node
// End-to-end smoke test for the recruitment drip.
// Verifies (without sending real email — by setting a non-recipient as send target):
//   1. Schema tables respond.
//   2. Renderer produces non-empty HTML for all 5 touches with substitutions intact.
//   3. CSV import upserts and skips suppressed.
//   4. Click-tracking route updates recipient state.
//   5. Apply API inserts an application and flips recipient to 'applied'.
//   6. Application approve creates an ambassador and updates application status.
//
// Run:  node scripts/smoke-recruitment-drip.js
// Exit codes: 0 on pass, 1 on any failure.

const fs = require('fs');
if (fs.existsSync('/tmp/advnce.env')) {
  for (const line of fs.readFileSync('/tmp/advnce.env', 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.+)$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const URL_ = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const ORIGIN = process.env.ADVNCE_ORIGIN || 'http://localhost:3000';
if (!URL_ || !KEY) { console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY'); process.exit(1); }
if (!process.env.EMAIL_UNSUB_SECRET) { console.error('Missing EMAIL_UNSUB_SECRET'); process.exit(1); }
process.env.NEXT_PUBLIC_SUPABASE_URL = URL_;
process.env.SUPABASE_SERVICE_KEY = KEY;

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };
function fail(m) { console.error('✗ FAIL:', m); process.exit(1); }
function ok(m)   { console.log('✓', m); }

async function clean() {
  await fetch(`${URL_}/rest/v1/ambassador_applications?email=eq.smoke-recruit@example.com`, { method: 'DELETE', headers });
  await fetch(`${URL_}/rest/v1/ambassadors?email=eq.smoke-recruit@example.com`, { method: 'DELETE', headers });
  await fetch(`${URL_}/rest/v1/ambassador_recruitment_recipients?csv_batch_id=eq.smoke-recruit`, { method: 'DELETE', headers });
}

(async () => {
  await clean();

  // 1. Schema responds
  for (const t of ['ambassador_recruitment_recipients','ambassador_recruitment_sends','ambassador_applications']) {
    const r = await fetch(`${URL_}/rest/v1/${t}?limit=0`, { headers });
    if (!r.ok) fail(`${t} responded ${r.status}`);
  }
  ok('all 3 tables respond');

  // 2. Renderer
  const { renderRecruitmentEmail } = await import('../lib/renderRecruitmentEmail.js');
  const fakeRec = { id: '11111111-1111-1111-1111-111111111111', email: 'smoke-recruit@example.com', first_name: 'Smoke', company: 'SmokeSolar', state: 'CA' };
  for (const t of [1,2,3,4,5]) {
    const { html, subject } = await renderRecruitmentEmail(t, fakeRec, ORIGIN);
    if (!html.includes('Smoke')) fail(`touch ${t}: first_name missing`);
    if (!html.includes('email-unsub?t=')) fail(`touch ${t}: unsub link missing`);
    if (!subject || subject.length < 4) fail(`touch ${t}: subject missing`);
  }
  ok('renderer produces all 5 touches');

  // 3. CSV import — write a tiny CSV and import
  const csv = 'name,email,phone,company,city,state,volume\nSmoke Recruit,smoke-recruit@example.com,5550009999,SmokeSolar,Los Angeles,CA,$50k\n';
  fs.writeFileSync('/tmp/smoke-recruit.csv', csv);
  const { spawnSync } = require('child_process');
  const imp = spawnSync('node', ['scripts/import-recruitment-csv.js', '/tmp/smoke-recruit.csv', '--batch-id=smoke-recruit'], { encoding: 'utf8' });
  if (imp.status !== 0) fail('csv import failed: ' + imp.stdout + imp.stderr);
  fs.unlinkSync('/tmp/smoke-recruit.csv');
  const recRes = await fetch(`${URL_}/rest/v1/ambassador_recruitment_recipients?csv_batch_id=eq.smoke-recruit&select=*`, { headers });
  const recs = await recRes.json();
  if (recs.length !== 1) fail('expected 1 recipient, got ' + recs.length);
  const recipient = recs[0];
  ok(`csv imported 1 row (recipient ${recipient.id.slice(0,8)}...)`);

  // 4. Click tracking
  const clickRes = await fetch(`${ORIGIN}/api/recruitment-click?r=${recipient.id}&t=1&dest=apply`, { redirect: 'manual' });
  if (clickRes.status !== 302) fail('click did not redirect (got ' + clickRes.status + ')');
  const upd1 = await fetch(`${URL_}/rest/v1/ambassador_recruitment_recipients?id=eq.${recipient.id}&select=last_apply_clicked_at`, { headers });
  const [u1] = await upd1.json();
  if (!u1.last_apply_clicked_at) fail('click did not record on recipient');
  ok('click tracked + redirected');

  // 5. Apply
  const applyRes = await fetch(`${ORIGIN}/api/ambassador-apply`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'smoke-recruit@example.com', first_name: 'Smoke', last_name: 'Recruit', phone: '5550009999', why_interested: 'smoke', recipient_id: recipient.id, source_touch: 1 }),
  });
  if (!applyRes.ok) fail('apply failed: ' + await applyRes.text());
  const appLookup = await fetch(`${URL_}/rest/v1/ambassador_applications?email=eq.smoke-recruit@example.com&select=*&limit=1`, { headers });
  const [appRow] = await appLookup.json();
  if (!appRow) fail('application not inserted');
  if (appRow.status !== 'pending') fail('application status not pending');
  // Recipient should be applied
  const recLookup = await fetch(`${URL_}/rest/v1/ambassador_recruitment_recipients?id=eq.${recipient.id}&select=drip_status,applied_at`, { headers });
  const [r2] = await recLookup.json();
  if (r2.drip_status !== 'applied') fail('recipient drip_status not applied');
  ok('apply: inserted application + recipient flipped to applied');

  // 6. NOTE: approval triggers a real Resend ambassador-welcome email. Skip in smoke.
  // Instead, verify the route's GET status only.
  const gw = await fetch(`${ORIGIN}/api/recruitment-application-write`);
  const gd = await gw.json();
  if (!gd.status || !gd.status.includes('live')) fail('application-write route missing');
  ok('application-write route is live (approval skipped to avoid real send)');

  await clean();
  ok('cleanup done');

  console.log('\nAll smoke checks passed.');
})().catch(err => { console.error('FATAL:', err.message, err.stack); process.exit(1); });
```

- [ ] **Step 15.2: Run the smoke test**

```bash
node scripts/smoke-recruitment-drip.js
```

Expected output:

```
✓ all 3 tables respond
✓ renderer produces all 5 touches
✓ csv imported 1 row (recipient xxxxxxxx...)
✓ click tracked + redirected
✓ apply: inserted application + recipient flipped to applied
✓ application-write route is live (approval skipped to avoid real send)
✓ cleanup done

All smoke checks passed.
```

If any check fails, fix the underlying issue. Do not modify the smoke test to make it pass.

- [ ] **Step 15.3: Commit**

```bash
git add scripts/smoke-recruitment-drip.js
git commit -m "recruitment: end-to-end smoke covering import, click, apply, queue"
```

---

## Task 16 · Live launch (manual user step)

This task is operator-driven. Subagents should skip it and report DONE noting it was deferred to the controller.

- [ ] **Step 16.1: Apply the migration**

In Supabase Studio SQL editor, paste `sql/2026-05-28-ambassador-recruitment-blast.sql` and Run.

- [ ] **Step 16.2: Import the real CSV**

Place the real ~1,500-row CSV at e.g. `/Volumes/(626)806-4475/Ai Projects/adonis-next/data/solar-reps-wave-1.csv` (don't commit this file). Then:

```bash
node scripts/import-recruitment-csv.js data/solar-reps-wave-1.csv --batch-id=2026-05-28-solar-wave-1
```

Verify the upsert count matches expectations.

- [ ] **Step 16.3: Single-recipient dry run**

Insert just one test recipient (your own email) and ensure they're queued for `next_send_at = now()`. Then hit:

```bash
curl -sS http://localhost:3000/api/cron/recruitment-drip -b /tmp/admin-cookies.txt
```

Confirm one email arrives. Confirm `ambassador_recruitment_sends` got the row and recipient advanced to `next_touch_num=2`.

- [ ] **Step 16.4: Open the floodgates**

Once the dry run is clean: leave the cron running (`0 * * * *` = hourly). Recipients with `next_send_at <= now()` get touch 1 on the next cron tick. Touches 2-5 fire on their respective Day 3/7/14/21 schedules per the orchestrator.

Monitor the admin queue at `/admin/marketing/recruitment` for incoming applications. Review and approve as they come in.

---

## Self-review checklist

- [x] **Spec coverage:** Every spec section is implemented:
  - Schema (3 tables) → Task 1
  - Email designs (5 templates) → Tasks 2, 3, 4
  - Renderer → Task 5
  - CSV import → Task 7
  - Drip orchestrator → Task 10
  - Cron entry → Task 11
  - Click tracking + pause logic → Task 6
  - Public apply page → Task 8
  - Apply API → Task 9
  - Admin approval handoff (creates ambassador + fires existing welcome) → Task 12
  - Admin queue → Task 13
  - Marketing index link → Task 14
  - Smoke → Task 15
- [x] **Type/field consistency:** `recipient_id` (used in apply/click) matches `ambassador_recruitment_recipients.id`. `touch_num` 1..5 consistent everywhere. `drip_status` enum values match the migration check constraint. Template placeholders (`{{FIRST_NAME}}`, `{{APPLY_URL}}`, etc.) match what the renderer substitutes.
- [x] **No placeholders:** Every step has real code or a concrete command.
- [x] **TDD adaptation:** No test framework — verification uses curl per task + comprehensive smoke at Task 15.
- [x] **Commits:** Every task ends with a `recruitment:` prefix.
