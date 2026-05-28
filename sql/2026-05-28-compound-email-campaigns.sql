-- Compound spotlight email campaigns: drafts, per-recipient sends, suppression list,
-- and a mirror of the peptide-for-that hook library.
-- Spec: docs/superpowers/specs/2026-05-28-compound-spotlight-email-campaigns-design.md

-- 1) compound_marketing — mirror of docs/marketing/peptide-for-that-campaign.md.
create table if not exists compound_marketing (
  compound_slug    text primary key,
  compound_name    text not null,
  sku              text,
  category         text,
  subcategory      text,
  hook             text,
  research_angle   text,
  citation_primary text,
  mod_risk         text,
  ig_blocked       boolean not null default false,
  product_url      text,
  updated_at       timestamptz not null default now()
);
create index if not exists compound_marketing_sku_idx on compound_marketing(sku);

-- 2) compound_email_drafts — one row per planned send.
create table if not exists compound_email_drafts (
  id                     uuid primary key default gen_random_uuid(),
  dispatch_no            int unique,
  compound_slug          text not null,
  compound_name          text not null,
  product_url            text not null,
  category_label         text,
  hook                   text,
  tagline                text,
  layman_lead            text,
  layman_bridge          text,
  bullet_1               text,
  bullet_2               text,
  bullet_3               text,
  citations_short        text,
  show_stock_stamp       boolean not null default true,
  trigger                text not null check (trigger in ('restock','manual')),
  status                 text not null default 'draft'
                                check (status in ('draft','ready','sending','sent','failed')),
  created_at             timestamptz not null default now(),
  scheduled_at           timestamptz,
  sent_at                timestamptz,
  recipient_count        int not null default 0,
  recipient_count_sent   int not null default 0,
  recipient_count_failed int not null default 0,
  created_by             text,
  notes                  text
);
create index if not exists compound_email_drafts_status_idx on compound_email_drafts(status);
create index if not exists compound_email_drafts_created_at_idx on compound_email_drafts(created_at desc);

-- Sequence-style dispatch_no helper: monotonic across all drafts.
create or replace function next_dispatch_no() returns int as $$
  select coalesce(max(dispatch_no), 0) + 1 from compound_email_drafts;
$$ language sql;

-- 3) compound_email_recipients — one row per recipient per send.
create table if not exists compound_email_recipients (
  id         uuid primary key default gen_random_uuid(),
  draft_id   uuid not null references compound_email_drafts(id) on delete cascade,
  email      text not null,
  name       text,
  source     text not null check (source in ('subscriber','customer','ambassador')),
  sent_at    timestamptz,
  resend_id  text,
  status     text not null default 'pending'
                    check (status in ('pending','sent','failed','skipped')),
  error      text
);
create index if not exists compound_email_recipients_draft_status_idx
  on compound_email_recipients(draft_id, status);
create index if not exists compound_email_recipients_email_idx on compound_email_recipients(email);

-- 4) compound_email_unsubscribes — email-only suppression for non-subscribers.
create table if not exists compound_email_unsubscribes (
  id              uuid primary key default gen_random_uuid(),
  email           text not null unique,
  unsubscribed_at timestamptz not null default now(),
  source_draft_id uuid references compound_email_drafts(id) on delete set null
);

-- 5) subscribers gets a new column. Welcome emails still send unconditionally;
--    only compound-spotlight sends respect this column.
alter table subscribers
  add column if not exists compound_email_unsubscribed_at timestamptz;

-- RLS off on all four new tables; access goes through service-role API routes.
alter table compound_marketing            enable row level security;
alter table compound_email_drafts         enable row level security;
alter table compound_email_recipients     enable row level security;
alter table compound_email_unsubscribes   enable row level security;
