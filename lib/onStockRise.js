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

// Slugify a compound name the same way scripts/sync-compound-marketing.js does,
// so a product name maps to the matching compound_marketing.compound_slug.
function slugify(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
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

  // Resolve the product so we can map by name. The compound_marketing.sku column
  // is largely unpopulated, so SKU-only matching fails and drafts end up labeled
  // with the raw order code (e.g. PT-141's "PT10"). The product name maps reliably.
  const prodRes = await fetch(
    `${SUPABASE_URL}/rest/v1/products?sku=eq.${encodeURIComponent(sku)}&select=name,cat&limit=1`,
    { headers: headers(), cache: 'no-store' },
  );
  const [product] = prodRes.ok ? await prodRes.json() : [];
  const productName = product?.name || null;
  const nameSlug = slugify(productName);

  // Match compound_marketing in priority order: explicit SKU mapping (if any),
  // then slug derived from the product name, then name match (case-insensitive).
  const filters = [`sku=eq.${encodeURIComponent(sku)}`];
  if (nameSlug) filters.push(`compound_slug=eq.${encodeURIComponent(nameSlug)}`);
  if (productName) filters.push(`compound_name=ilike.${encodeURIComponent(productName)}`);

  let cm = null;
  for (const filter of filters) {
    const cmRes = await fetch(
      `${SUPABASE_URL}/rest/v1/compound_marketing?${filter}&select=*&limit=1`,
      { headers: headers(), cache: 'no-store' },
    );
    if (!cmRes.ok) return { fired: false, reason: 'lookup_failed' };
    const [row] = await cmRes.json();
    if (row) { cm = row; break; }
  }
  // No mapping found. Still create a sparse draft so admin sees it; UI shows "needs
  // copy". Label it with the product NAME (not the raw SKU) whenever we have one.

  const compoundSlug = cm?.compound_slug || nameSlug || `sku-${sku.toLowerCase()}`;
  const compoundName = cm?.compound_name || productName || sku;
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
