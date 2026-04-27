-- 2026-04-27: invoice paid-variance — capture actual amount received vs invoiced total
-- Run in Supabase SQL editor (project: efuxqrvdkrievbpljlaf)

alter table orders
  add column if not exists paid_amount numeric;

-- Verify:
-- select column_name, data_type, is_nullable
-- from information_schema.columns
-- where table_name='orders' and column_name='paid_amount';
-- Expected: paid_amount, numeric, YES
