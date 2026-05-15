-- Vendor pricing + purchase orders + receiving (spec 2026-04-17)

CREATE TABLE IF NOT EXISTS vendors (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL UNIQUE,
  contact_email text,
  contact_phone text,
  notes         text,
  active        boolean DEFAULT true,
  created_at    timestamptz DEFAULT now()
);
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS vendor_prices (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id    uuid REFERENCES vendors(id) ON DELETE CASCADE,
  product_id   integer REFERENCES products(id) ON DELETE CASCADE,
  cost_per_kit numeric NOT NULL,
  last_updated timestamptz DEFAULT now(),
  UNIQUE(vendor_id, product_id)
);
ALTER TABLE vendor_prices ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS purchase_orders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number       text UNIQUE NOT NULL,
  vendor_id       uuid REFERENCES vendors(id),
  status          text NOT NULL DEFAULT 'draft',
  total_cost      numeric,
  notes           text,
  submitted_at    timestamptz,
  received_at     timestamptz,
  closed_at       timestamptz,
  last_emailed_at timestamptz,
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id        uuid REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id   integer REFERENCES products(id),
  qty_ordered  integer NOT NULL CHECK (qty_ordered > 0),
  unit_cost    numeric NOT NULL,
  qty_received integer DEFAULT 0,
  received_at  timestamptz
);
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_vendor_prices_vendor ON vendor_prices(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_prices_product ON vendor_prices(product_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_vendor ON purchase_orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po ON purchase_order_items(po_id);

-- Anon SELECT policies (admin pages read directly via anon key; writes go through API routes with SERVICE_KEY)
DROP POLICY IF EXISTS "anon read vendors" ON vendors;
CREATE POLICY "anon read vendors" ON vendors FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "anon read vendor_prices" ON vendor_prices;
CREATE POLICY "anon read vendor_prices" ON vendor_prices FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "anon read purchase_orders" ON purchase_orders;
CREATE POLICY "anon read purchase_orders" ON purchase_orders FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "anon read purchase_order_items" ON purchase_order_items;
CREATE POLICY "anon read purchase_order_items" ON purchase_order_items FOR SELECT TO anon USING (true);

-- One-time data seed (idempotent via ON CONFLICT)
INSERT INTO vendors (name) SELECT DISTINCT vendor FROM products WHERE vendor IS NOT NULL AND vendor != '' ON CONFLICT (name) DO NOTHING;
INSERT INTO vendor_prices (vendor_id, product_id, cost_per_kit)
  SELECT v.id, p.id, p.cost FROM products p JOIN vendors v ON v.name = p.vendor WHERE p.cost IS NOT NULL
  ON CONFLICT (vendor_id, product_id) DO NOTHING;
