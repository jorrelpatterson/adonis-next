-- Inventory adjustment ledger: tracks every non-sale stock movement
-- (broken, spilled, QA test, returned-damaged, expired, sample, count correction, other).
-- One row per adjustment. delta_vials is signed: negative = loss, positive = found-on-count.
-- cost_per_vial_cents is captured AT TIME OF adjustment (snapshot, not a live ref).

create table if not exists inventory_adjustments (
  id uuid primary key default gen_random_uuid(),
  product_id integer references products(id) on delete set null,
  sku text not null,
  delta_vials int not null,
  reason text not null check (reason in (
    'broken', 'spilled', 'qa_test', 'returned_damaged',
    'expired', 'sample', 'count_correction', 'other'
  )),
  note text,
  cost_per_vial_cents int,
  created_by text not null default 'admin',
  created_at timestamptz not null default now()
);

create index if not exists inventory_adjustments_sku_idx on inventory_adjustments(sku);
create index if not exists inventory_adjustments_created_at_idx on inventory_adjustments(created_at desc);
create index if not exists inventory_adjustments_reason_idx on inventory_adjustments(reason);

-- RLS off; all access goes through service-role API routes.
alter table inventory_adjustments enable row level security;
