-- Push notification device tokens (iOS P3 Task 4 — Premium Contract item 8,
-- the SEND half; src/platform/push.js — Task 3 — is the receive half).
-- One row per (user, device install) token. The daily routine-reminder
-- cron (app/api/cron/routine-reminders) reads all rows via the service
-- key and calls lib/push/apns.js's sendPush() for each one lib/push/due.js
-- says is due.
--
-- last_notified_at backs lib/push/due.js's duplicate-send guard (a row is
-- due again once >=20h have passed since its last stamp) — see that
-- file's header for why the reminder itself is a single honest daily
-- nudge, not a "skip if already done" smart reminder: routine-completion
-- state lives only in the app's localStorage, so the server has no way to
-- know who already checked in today.
--
-- Run in: https://supabase.com/dashboard -> SQL Editor. MANUAL APPLY —
-- this repo has no linked Supabase CLI/Docker (see project memory:
-- Supabase migrations are manual). This is a JORREL MANUAL STEP.

create extension if not exists "pgcrypto";

create table if not exists push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null,
  platform text not null default 'ios',
  last_notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, token)
);

create index if not exists push_tokens_user_idx on push_tokens(user_id);

-- ----------------------------------------------------------------
-- RLS: authenticated users manage their own rows. The send cron and the
-- /api/push/register route both use the service key, which bypasses RLS
-- entirely (Supabase's standard service-role behavior — no separate
-- policy needed for either of them).
-- ----------------------------------------------------------------
alter table push_tokens enable row level security;

drop policy if exists push_tokens_user_manage on push_tokens;
create policy push_tokens_user_manage on push_tokens
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ----------------------------------------------------------------
-- updated_at trigger — same convention as sql/2026-05-13-career-protocol.sql
-- ----------------------------------------------------------------
create or replace function set_push_tokens_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists push_tokens_updated_at on push_tokens;
create trigger push_tokens_updated_at
  before update on push_tokens
  for each row execute function set_push_tokens_updated_at();

-- ----------------------------------------------------------------
-- Read-back verify (run manually after applying, or via the curl in
-- task-4-report.md):
--   select id, user_id, platform, created_at from push_tokens limit 1;
-- Expect 0 rows back (an empty result, not an error) — that's enough to
-- prove the table exists. Via PostgREST: GET .../rest/v1/push_tokens
-- ?select=id&limit=1 should flip from 404 (table not found) to 200 (an
-- empty `[]`, since RLS hides all rows from the anon key) once applied.
-- ----------------------------------------------------------------
