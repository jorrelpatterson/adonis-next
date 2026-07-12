import { describe, it, expect } from 'vitest';
import { enrichCatalog } from '../peptide-catalog.js';

const STATIC_PEPS = [
  { id: 1, name: 'Semaglutide 5mg', size: '5mg', vendorSku: 'SM5', price: 39, vendor: 'Eve', goals: ['Fat Loss'] },
  { id: 2, name: 'Tirzepatide 10mg', size: '10mg', vendorSku: 'TR10', price: 55, vendor: 'Eve', goals: ['Fat Loss'] },
  { id: 3, name: 'DSIP 5mg', size: '5mg', vendorSku: 'DS5', price: 35, vendor: 'Eve', goals: ['Sleep'] },
];

describe('enrichCatalog', () => {
  it('returns empty array if no static catalog', () => {
    expect(enrichCatalog([], [])).toEqual([]);
  });

  it('marks all peptides as offline (_live=false) when liveRows is empty', () => {
    const result = enrichCatalog(STATIC_PEPS, []);
    expect(result).toHaveLength(3);
    expect(result.every(p => p._live === false)).toBe(true);
    expect(result.every(p => p.inStock === false)).toBe(true);
  });

  it('merges price, stock, and vendor from live rows into matching peptides', () => {
    const liveRows = [
      { id: 100, sku: 'SM5', retail: 49, stock: 10, active: true, vendor: 'Weak' },
    ];
    const result = enrichCatalog(STATIC_PEPS, liveRows);
    const sm5 = result.find(p => p.vendorSku === 'SM5');
    expect(sm5.price).toBe(49);              // overlaid from Supabase
    expect(sm5.stock).toBe(10);
    expect(sm5.inStock).toBe(true);
    expect(sm5.vendor).toBe('Weak');         // vendor updated
    expect(sm5._live).toBe(true);
    expect(sm5._supabaseId).toBe(100);
    // Protocol fields preserved
    expect(sm5.goals).toEqual(['Fat Loss']);
  });

  it('hides peptides where Supabase says active=false', () => {
    const liveRows = [
      { id: 100, sku: 'SM5', retail: 49, stock: 10, active: true },
      { id: 101, sku: 'TR10', retail: 65, stock: 5, active: false },  // hidden
      { id: 102, sku: 'DS5', retail: 35, stock: 3, active: true },
    ];
    const result = enrichCatalog(STATIC_PEPS, liveRows);
    expect(result).toHaveLength(2);
    expect(result.find(p => p.vendorSku === 'TR10')).toBeUndefined();
    expect(result.find(p => p.vendorSku === 'SM5')).toBeDefined();
    expect(result.find(p => p.vendorSku === 'DS5')).toBeDefined();
  });

  it('keeps peptides not in Supabase but marks them as not-purchasable', () => {
    // Static catalog has Tirzepatide 10mg, but Supabase doesn't carry it
    const liveRows = [
      { id: 100, sku: 'SM5', retail: 49, stock: 10, active: true },
    ];
    const result = enrichCatalog(STATIC_PEPS, liveRows);
    const tirz = result.find(p => p.vendorSku === 'TR10');
    expect(tirz).toBeDefined();
    expect(tirz._live).toBe(false);
    expect(tirz.inStock).toBe(false);
    expect(tirz.price).toBe(55);  // falls back to static price
  });

  it('marks inStock=false when Supabase stock is 0', () => {
    const liveRows = [
      { id: 100, sku: 'SM5', retail: 49, stock: 0, active: true },
    ];
    const result = enrichCatalog(STATIC_PEPS, liveRows);
    const sm5 = result.find(p => p.vendorSku === 'SM5');
    expect(sm5._live).toBe(true);
    expect(sm5.stock).toBe(0);
    expect(sm5.inStock).toBe(false);
  });

  it('handles malformed live rows gracefully', () => {
    const liveRows = [
      null,
      undefined,
      {},                                       // no sku
      { sku: null },                            // null sku
      { sku: 'SM5', retail: 49, active: true },
    ];
    const result = enrichCatalog(STATIC_PEPS, liveRows);
    const sm5 = result.find(p => p.vendorSku === 'SM5');
    expect(sm5).toBeDefined();
    expect(sm5._live).toBe(true);
    expect(sm5.price).toBe(49);
  });

  it('coerces retail and stock to Number', () => {
    const liveRows = [
      { id: 100, sku: 'SM5', retail: '49.99', stock: '7', active: true },
    ];
    const result = enrichCatalog(STATIC_PEPS, liveRows);
    const sm5 = result.find(p => p.vendorSku === 'SM5');
    expect(sm5.price).toBe(49.99);
    expect(sm5.stock).toBe(7);
    expect(sm5.inStock).toBe(true);
  });
});
