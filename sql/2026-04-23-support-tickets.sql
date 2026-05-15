-- Support ticket queue for chatbot-sourced + direct escalations.
-- Replaces broken email inboxes (orders@/ambassadors@/research@) as the
-- primary customer-contact funnel from advncelabs.com.

create table if not exists support_tickets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  issue text not null,
  source text not null default 'chat',
  intent text,
  chat_transcript jsonb,
  page_url text,
  session_id text,
  status text not null default 'open',
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_tickets_status_created_idx
  on support_tickets (status, created_at desc);

create index if not exists support_tickets_session_idx
  on support_tickets (session_id);
