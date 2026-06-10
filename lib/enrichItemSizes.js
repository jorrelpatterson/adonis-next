// lib/enrichItemSizes.js
// Some storefront paths saved an order item's size as the literal "N/A"
// (e.g. advncelabs.com product page when no size button was read). The real
// strength lives in the products catalog keyed by SKU. These helpers fill it
// in server-side so emails and admin show the true mg (e.g. "10mg / 3ml").

const isMissingSize = (s) =>
  !s || String(s).trim() === '' || String(s).trim().toUpperCase() === 'N/A';

// One PostgREST lookup → { sku: size } for the given SKUs (only real sizes).
async function fetchSizeMap(skus) {
  const list = [...new Set((skus || []).filter(Boolean))];
  if (!list.length) return {};

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const KEY =
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !KEY) return {};

  try {
    const inList = list.map(encodeURIComponent).join(',');
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/products?sku=in.(${inList})&select=sku,size`,
      { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` }, cache: 'no-store' },
    );
    if (!r.ok) return {};
    const rows = await r.json();
    const map = {};
    for (const p of rows) if (p.sku && !isMissingSize(p.size)) map[p.sku] = p.size;
    return map;
  } catch {
    return {};
  }
}

// Apply a sku→size map to an items array (only fills missing/"N/A" sizes).
function applySizeMap(items, sizeBySku) {
  return (items || []).map((i) =>
    isMissingSize(i.size) && i.sku && sizeBySku[i.sku]
      ? { ...i, size: sizeBySku[i.sku] }
      : i,
  );
}

// Convenience for a single order's items (one lookup + apply).
async function enrichItemSizes(items) {
  if (!Array.isArray(items) || !items.length) return items;
  const need = items.filter((i) => isMissingSize(i.size) && i.sku).map((i) => i.sku);
  if (!need.length) return items;
  const map = await fetchSizeMap(need);
  return applySizeMap(items, map);
}

export { isMissingSize, fetchSizeMap, applySizeMap, enrichItemSizes };
