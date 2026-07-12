// Live peptide catalog service — bridges Adonis app to advnce labs admin panel.
//
// Architecture: the v2 catalog (src/protocols/body/peptides/catalog.js) holds
// the *protocol metadata* — dose, timing, frequency, goals, description.
// These are research-grade dosing data that belongs with the app, not with
// the storefront (legal firewall: Adonis recommends, advnce sells).
//
// Supabase `products` table holds the *commerce data* — current retail price,
// stock level, active flag. These are the fields the admin panel mutates.
//
// loadLiveCatalog() merges them: keeps Adonis's protocol fields, overlays
// commerce fields from Supabase, hides peptides where active=false.
//
// Match key: v2 catalog's `vendorSku` ↔ Supabase `products.sku`.

import { supabase } from './supabase.js';
import { PEPTIDES } from '../protocols/body/peptides/catalog.js';

/**
 * Pure function — merge protocol metadata with live commerce data.
 * Hides peptides where Supabase says active=false.
 *
 * @param {Array} staticPeps - v2 PEPTIDES catalog (protocol metadata)
 * @param {Array} liveRows - rows from Supabase `products` table
 * @returns {Array} enriched peptide records, filtered to active=true
 */
export function enrichCatalog(staticPeps, liveRows) {
  const liveBySku = new Map();
  for (const row of liveRows || []) {
    if (row && row.sku) liveBySku.set(row.sku, row);
  }

  const enriched = [];
  for (const pep of staticPeps) {
    const live = liveBySku.get(pep.vendorSku);

    // No matching live product = peptide isn't carried by storefront.
    // We still keep it in the catalog (Adonis can recommend research compounds
    // that aren't sold) but mark as not-purchasable.
    if (!live) {
      enriched.push({ ...pep, _live: false, inStock: false });
      continue;
    }

    // Inactive in storefront → hide from Adonis catalog entirely
    if (live.active === false) continue;

    enriched.push({
      ...pep,
      // Overlay commerce data from Supabase
      price: live.retail != null ? Number(live.retail) : pep.price,
      stock: live.stock != null ? Number(live.stock) : null,
      inStock: live.stock != null && Number(live.stock) > 0,
      vendor: live.vendor || pep.vendor,
      _live: true,
      _supabaseId: live.id,
    });
  }

  return enriched;
}

/**
 * Fetch live products from Supabase. Returns raw rows.
 * Returns empty array on failure — caller should fall back to defaults.
 */
export async function fetchSupabaseProducts() {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('id, sku, name, size, cat, vendor, retail, stock, active')
      .eq('active', true);

    if (error) {
      console.warn('[peptide-catalog] Supabase fetch failed:', error.message);
      return [];
    }
    return data || [];
  } catch (e) {
    console.warn('[peptide-catalog] Supabase fetch threw:', e.message);
    return [];
  }
}

/**
 * High-level: fetch live commerce data and merge with v2 protocol metadata.
 * Returns the enriched catalog. On Supabase failure, returns the static
 * catalog with all entries marked _live=false (graceful degradation).
 */
export async function loadLiveCatalog() {
  const liveRows = await fetchSupabaseProducts();
  if (liveRows.length === 0) {
    // Graceful degradation — keep static catalog, mark as offline
    return PEPTIDES.map(p => ({ ...p, _live: false, inStock: false }));
  }
  return enrichCatalog(PEPTIDES, liveRows);
}
