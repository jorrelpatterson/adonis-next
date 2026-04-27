-- 2026-04-27: reorder reminders — add typical_days_supply override + sent log
-- Run in Supabase SQL editor (project: efuxqrvdkrievbpljlaf)

alter table products
  add column if not exists typical_days_supply integer;

create table if not exists reorder_reminders_sent (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  sku text not null,
  reminder_type text not null check (reminder_type in ('14d', '3d')),
  sent_at timestamptz not null default now(),
  email_to text not null,
  unique (order_id, sku, reminder_type)
);

create index if not exists reorder_reminders_sent_lookup
  on reorder_reminders_sent(order_id, sku);

-- Verify:
-- select column_name from information_schema.columns
-- where table_name='products' and column_name='typical_days_supply';
-- select count(*) from reorder_reminders_sent;
