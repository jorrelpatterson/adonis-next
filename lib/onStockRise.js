// Called from purchase-receive and inventory-adjust whenever a product's stock
// changes. If stock crossed 0 → positive and we have compound_marketing data
// for the SKU, insert a 'restock' draft into compound_email_drafts.

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL;
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

function headers() {
  return { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' };
}

// Compute next eligible send slot: max(now, latest sent draft's sent_at + 7 days,
// other 'ready'|'sending'|'sent' drafts' scheduled_at + 7 days).
async function computeScheduledAt() {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/compound_email_drafts?select=sent_at,scheduled_at&order=sent_at.desc.nullslast&limit=20`,
    { headers: headers(), cache: 'no-store' },
  );
  if (!r.ok) return new Date().toISOString();
  const rows = await r.json();
  const now = new Date();
  let earliest = now;
  for (const row of rows) {
    const anchor = row.sent_at || row.scheduled_at;
    if (!anchor) continue;
    const next = new Date(new Date(anchor).getTime() + 7 * 24 * 60 * 60 * 1000);
    if (next > earliest) earliest = next;
  }
  return earliest.toISOString();
}

export async function onStockRise({ sku, previousStock, newStock, source = 'unknown' }) {
  // Only fire when stock crosses 0 → positive.
  if (!(previousStock <= 0 && newStock > 0)) return { fired: false, reason: 'no_transition' };
  if (!sku) return { fired: false, reason: 'no_sku' };

  // Look up compound_marketing by SKU.
  const cmRes = await fetch(
    `${SUPABASE_URL}/rest/v1/compound_marketing?sku=eq.${encodeURIComponent(sku)}&select=*&limit=1`,
    { headers: headers(), cache: 'no-store' },
  );
  if (!cmRes.ok) return { fired: false, reason: 'lookup_failed' };
  const [cm] = await cmRes.json();
  if (!cm) {
    // No mapping. Still create a sparse draft so admin sees it; UI will show "needs copy".
  }

  const compoundSlug = cm?.compound_slug || `sku-${sku.toLowerCase()}`;
  const compoundName = cm?.compound_name || sku;
  const productUrl = cm?.product_url || `https://www.advncelabs.com/advnce-product.html?sku=${encodeURIComponent(sku)}`;

  // dispatch_no is auto-populated by the DB default (next_dispatch_no()) — no need to set explicitly.

  const scheduledAt = await computeScheduledAt();

  const categoryLabel = cm && cm.category
    ? (cm.subcategory ? `${cm.category.toUpperCase()} · ${cm.subcategory.toUpperCase()}` : cm.category.toUpperCase())
    : null;

  const insert = {
    compound_slug: compoundSlug,
    compound_name: compoundName,
    product_url: productUrl,
    category_label: categoryLabel,
    hook: cm?.hook || null,
    tagline: null,
    layman_lead: null,
    layman_bridge: null,
    bullet_1: null,
    bullet_2: null,
    bullet_3: null,
    citations_short: cm?.citation_primary ? cm.citation_primary.toUpperCase() : null,
    show_stock_stamp: true,
    trigger: 'restock',
    status: 'draft',
    scheduled_at: scheduledAt,
    created_by: `system:${source}`,
  };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/compound_email_drafts`, {
    method: 'POST',
    headers: { ...headers(), Prefer: 'return=representation' },
    body: JSON.stringify(insert),
  });
  if (!res.ok) {
    console.error('onStockRise insert failed:', res.status, await res.text());
    return { fired: false, reason: 'insert_failed' };
  }
  const [row] = await res.json();
  return { fired: true, draft_id: row.id, dispatch_no: row.dispatch_no, scheduled_at: row.scheduled_at };
}
