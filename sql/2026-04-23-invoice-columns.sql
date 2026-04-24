-- 2026-04-23: invoice maker feature — extend orders table
-- Run in Supabase SQL editor (project: efuxqrvdkrievbpljlaf)

alter table orders
  add column if not exists is_invoice boolean not null default false,
  add column if not exists invoice_id text,
  add column if not exists invoice_image_path text,
  add column if not exists invoice_discount_pct numeric(5,2),
  add column if not exists invoice_discount_flat_cents integer,
  add column if not exists tracking_number text,
  add column if not exists tracking_carrier text,
  add column if not exists shipped_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists created_by text;

create index if not exists orders_invoice_lookup_idx
  on orders(is_invoice, status, created_at desc)
  where is_invoice = true;

create unique index if not exists orders_invoice_id_uniq
  on orders(invoice_id) where invoice_id is not null;

-- Verify:
-- select column_name from information_schema.columns
-- where table_name='orders' and column_name like ANY (ARRAY['is_invoice','invoice_%','tracking_%','shipped_at','delivered_at','created_by']);

-- After running: in Supabase → Storage → New bucket:
--   Name: invoices
--   Public: yes
--   File size limit: 10 MB
