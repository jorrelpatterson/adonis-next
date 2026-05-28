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
