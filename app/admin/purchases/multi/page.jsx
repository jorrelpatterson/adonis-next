'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { explainFor, InfoIcon, PRODUCT_TYPES, typeFor } from '../../../../lib/constants/peptide-explanations';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const H = () => ({ 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` });

export default function MultiVendorOrderPage() {
  const router = useRouter();
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);
  const [prices, setPrices] = useState([]);
  const [pendingPOs, setPendingPOs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [qtys, setQtys] = useState({});
  const [vendorOverrides, setVendorOverrides] = useState({});
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState(null);

  useEffect(() => {
    async function load() {
      const [vRes, pRes, prRes, openItRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/vendors?select=*&active=is.true&order=name.asc`, { headers: H() }),
        fetch(`${SUPABASE_URL}/rest/v1/products?select=id,sku,name,size,stock,active,cat&order=name.asc`, { headers: H() }),
        fetch(`${SUPABASE_URL}/rest/v1/vendor_prices?select=*`, { headers: H() }),
        fetch(`${SUPABASE_URL}/rest/v1/purchase_order_items?select=po_id,product_id,qty_ordered,qty_received,po:purchase_orders(po_number,status)`, { headers: H() }),
      ]);
      setVendors(await vRes.json());
      setProducts(await pRes.json());
      setPrices(await prRes.json());
      const openItems = await openItRes.json();
      const pending = openItems
        .filter(i => i.po && ['submitted','partial'].includes(i.po.status) && (i.qty_ordered - (i.qty_received || 0)) > 0)
        .map(i => ({ product_id: i.product_id, po_number: i.po.po_number, kits_pending: i.qty_ordered - (i.qty_received || 0) }));
      setPendingPOs(pending);
      setLoading(false);
    }
    load();
  }, []);

  const vendorById = useMemo(() => vendors.reduce((m,v) => { m[v.id] = v; return m; }, {}), [vendors]);

  const optionsByPid = useMemo(() => {
    const out = {};
    prices.forEach(vp => {
      if (vp.cost_per_kit == null) return;
      const v = vendorById[vp.vendor_id];
      if (!v) return;
      if (!out[vp.product_id]) out[vp.product_id] = [];
      out[vp.product_id].push({ vendor_id: vp.vendor_id, vendor_name: v.name, cost: Number(vp.cost_per_kit) });
    });
    Object.values(out).forEach(arr => arr.sort((a,b) => a.cost - b.cost));
    return out;
  }, [prices, vendorById]);

  const cheapestByPid = useMemo(() => {
    const out = {};
    Object.entries(optionsByPid).forEach(([pid, opts]) => { if (opts.length) out[pid] = opts[0]; });
    return out;
  }, [optionsByPid]);

  const selectedFor = (pid) => {
    const opts = optionsByPid[pid] || [];
    const ov = vendorOverrides[pid];
    if (ov) {
      const match = opts.find(o => o.vendor_id === ov);
      if (match) return match;
    }
    return cheapestByPid[pid] || null;
  };

  const filtered = useMemo(() => {
    return products.filter(p => {
      if (search) {
        const s = search.toLowerCase();
        if (!p.name.toLowerCase().includes(s) && !p.sku.toLowerCase().includes(s)) return false;
      }
      const stock = p.stock || 0;
      const isPending = pendingPOs.some(x => x.product_id === p.id);
      if (stockFilter === 'in_stock' && stock <= 0) return false;
      if (stockFilter === 'out_of_stock' && stock > 0) return false;
      if (stockFilter === 'pending' && !isPending) return false;
      if (typeFilter !== 'all' && typeFor(p.cat) !== typeFilter) return false;
      return true;
    });
  }, [products, search, stockFilter, typeFilter, pendingPOs]);

  const setQty = (pid, val) => setQtys(prev => {
    const n = { ...prev };
    const v = parseInt(val, 10);
    if (!v || v <= 0) delete n[pid];
    else n[pid] = v;
    return n;
  });
  const setOverride = (pid, vendor_id) => setVendorOverrides(prev => {
    const n = { ...prev };
    if (!vendor_id) delete n[pid];
    else n[pid] = vendor_id;
    return n;
  });
  const resetToCheapest = () => setVendorOverrides({});

  const bulkOverride = (vendor_id) => {
    if (!vendor_id) return;
    const next = {};
    Object.keys(qtys).forEach(pid => {
      const opts = optionsByPid[pid] || [];
      if (opts.find(o => o.vendor_id === vendor_id)) next[pid] = vendor_id;
    });
    setVendorOverrides(prev => ({ ...prev, ...next }));
  };

  const groups = useMemo(() => {
    const g = {};
    Object.entries(qtys).forEach(([pid, qty]) => {
      const sel = selectedFor(pid);
      if (!sel) return;
      const p = products.find(x => x.id === parseInt(pid, 10));
      if (!p) return;
      if (!g[sel.vendor_id]) g[sel.vendor_id] = { vendor_name: sel.vendor_name, items: [] };
      g[sel.vendor_id].items.push({ product_id: parseInt(pid, 10), qty_ordered: qty, unit_cost: sel.cost, sku: p.sku, name: p.name });
    });
    return g;
  }, [qtys, vendorOverrides, optionsByPid, products]);

  const grandTotal = Object.values(groups).reduce((s, g) => s + g.items.reduce((ss, it) => ss + it.qty_ordered * it.unit_cost, 0), 0);
  const grandKits  = Object.values(groups).reduce((s, g) => s + g.items.reduce((ss, it) => ss + it.qty_ordered, 0), 0);
  const grandLines = Object.values(groups).reduce((s, g) => s + g.items.length, 0);

  const submit = async () => {
    const entries = Object.entries(groups);
    if (!entries.length) { alert('Set qty on at least one row'); return; }
    setSubmitting(true);
    setResults([]);
    const out = [];
    for (const [vendor_id, group] of entries) {
      const items = group.items.map(it => ({ product_id: it.product_id, qty_ordered: it.qty_ordered, unit_cost: it.unit_cost }));
      try {
        const r = await fetch('/api/purchase-write', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'create', vendor_id, items, notes }),
        });
        if (r.ok) {
          const { po } = await r.json();
          out.push({ vendor_name: group.vendor_name, vendor_id, po_id: po.id, po_number: po.po_number });
        } else {
          const e = await r.json().catch(() => ({}));
          out.push({ vendor_name: group.vendor_name, vendor_id, error: e.error || `HTTP ${r.status}` });
        }
      } catch (e) {
        out.push({ vendor_name: group.vendor_name, vendor_id, error: String(e?.message || e) });
      }
      setResults([...out]);
    }
    setSubmitting(false);
  };

  if (loading) return <div style={{ padding: 32 }}>Loading...</div>;

  const cardStyle = { background: '#fff', border: '1px solid #E4E7EC', borderRadius: 8 };
  const overridesActive = Object.keys(vendorOverrides).length > 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#0F1928', fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 1 }}>Multi-Vendor Order Sheet</h1>
          <p style={{ color: '#8C919E', fontSize: 13, marginTop: 4 }}>Set quantities — system auto-routes each line to the cheapest vendor and splits into separate POs on submit.</p>
        </div>
        <Link href="/admin/purchases" style={{ padding: '8px 16px', background: '#F7F8FA', color: '#6B7A94', border: '1px solid #E4E7EC', borderRadius: 6, fontSize: 13, textDecoration: 'none' }}>Cancel</Link>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search product or SKU..." style={{ padding: '8px 12px', border: '1px solid #E4E7EC', borderRadius: 4, fontSize: 13, minWidth: 240 }} />
        <div style={{ display: 'flex', gap: 4 }}>
          {[
            { k: 'all', l: 'All', c: '#0072B5' },
            { k: 'in_stock', l: 'In stock', c: '#16A34A' },
            { k: 'out_of_stock', l: 'Out of stock', c: '#DC2626' },
            { k: 'pending', l: 'Pending', c: '#A16207' },
          ].map(f => (
            <button key={f.k} onClick={() => setStockFilter(f.k)} style={{ padding: '6px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', borderRadius: 4, background: stockFilter === f.k ? f.c : '#F7F8FA', color: stockFilter === f.k ? '#fff' : '#6B7A94', border: '1px solid ' + (stockFilter === f.k ? f.c : '#E4E7EC') }}>{f.l}</button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#8C919E', textTransform: 'uppercase', letterSpacing: 1 }}>Bulk override:</span>
          <select onChange={e => { bulkOverride(e.target.value); e.target.value = ''; }} defaultValue="" style={{ padding: '6px 10px', border: '1px solid #E4E7EC', borderRadius: 4, fontSize: 12, background: '#FAFBFC' }}>
            <option value="">All to ...</option>
            {vendors.map(v => <option key={v.id} value={v.id}>All to {v.name}</option>)}
          </select>
          {overridesActive && (
            <button onClick={resetToCheapest} style={{ padding: '6px 10px', background: '#FEF3C7', color: '#A16207', border: '1px solid #FDE68A', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Reset to cheapest</button>
          )}
        </div>
      </div>

      {/* Type filter row */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: '#8C919E', textTransform: 'uppercase', letterSpacing: 1, marginRight: 6 }}>Type:</span>
        <button onClick={() => setTypeFilter('all')} style={{ padding: '5px 11px', fontSize: 11, fontWeight: 600, cursor: 'pointer', borderRadius: 4, background: typeFilter === 'all' ? '#0F1928' : '#F7F8FA', color: typeFilter === 'all' ? '#fff' : '#6B7A94', border: '1px solid ' + (typeFilter === 'all' ? '#0F1928' : '#E4E7EC') }}>All</button>
        {PRODUCT_TYPES.map(t => (
          <button key={t} onClick={() => setTypeFilter(t)} style={{ padding: '5px 11px', fontSize: 11, fontWeight: 600, cursor: 'pointer', borderRadius: 4, background: typeFilter === t ? '#0F1928' : '#F7F8FA', color: typeFilter === t ? '#fff' : '#6B7A94', border: '1px solid ' + (typeFilter === t ? '#0F1928' : '#E4E7EC') }}>{t}</button>
        ))}
      </div>

      <div style={{ ...cardStyle, overflowX: 'auto', marginBottom: 20 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900, fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#F7F8FA' }}>
              {['Product', 'Size', 'SKU', 'On hand', 'Vendor', 'Unit', 'Qty', 'Line'].map((h, i) => (
                <th key={i} style={{ padding: '8px 10px', textAlign: i >= 5 ? 'right' : 'left', fontSize: 10, fontWeight: 600, color: '#8C919E', letterSpacing: 1, textTransform: 'uppercase', borderBottom: '2px solid #E4E7EC' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const opts = optionsByPid[p.id] || [];
              const sel = selectedFor(p.id);
              const qty = qtys[p.id] || '';
              const lt = (Number(qty) || 0) * (sel?.cost || 0);
              const stock = p.stock || 0;
              const pend = pendingPOs.filter(x => x.product_id === p.id);
              const totalPending = pend.reduce((s, x) => s + x.kits_pending, 0);
              const noPriceData = !opts.length;
              const isOverride = vendorOverrides[p.id] && sel && sel.vendor_id !== cheapestByPid[p.id]?.vendor_id;
              return (
                <tr key={p.id} style={{ borderBottom: '1px solid #F0F1F4', background: Number(qty) > 0 ? '#F0FDF4' : 'transparent' }}>
                  <td style={{ padding: '6px 10px', fontWeight: 500 }}>
                    {p.name}
                    <InfoIcon text={explainFor(p.name)} />
                    {p.active === false && (
                      <span style={{ marginLeft: 6, padding: '1px 5px', background: '#FEE2E2', color: '#DC2626', fontSize: 9, fontWeight: 600, borderRadius: 3, letterSpacing: 1 }}>HIDDEN</span>
                    )}
                  </td>
                  <td style={{ padding: '6px 10px', color: '#7A7D88', fontSize: 11 }}>{p.size}</td>
                  <td style={{ padding: '6px 10px', fontFamily: "'JetBrains Mono'", fontSize: 11, color: '#0072B5' }}>{p.sku}</td>
                  <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-end' }}>
                      <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, fontWeight: 600, color: stock > 0 ? '#16A34A' : '#9CA3AF' }}>{stock}v</span>
                      {totalPending > 0 && (
                        <span title={'Pending: ' + [...new Set(pend.map(x => x.po_number))].join(', ')} style={{ fontFamily: "'JetBrains Mono'", fontSize: 9, fontWeight: 600, padding: '1px 5px', background: '#FEF3C7', color: '#A16207', borderRadius: 3 }}>PEND {totalPending * 10}v</span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '6px 10px' }}>
                    {noPriceData ? (
                      <span style={{ fontSize: 11, color: '#9CA3AF', fontStyle: 'italic' }}>(no vendor data)</span>
                    ) : (
                      <select value={sel?.vendor_id || ''} onChange={e => setOverride(p.id, e.target.value)} style={{ padding: '3px 6px', border: '1px solid ' + (isOverride ? '#A16207' : '#E4E7EC'), borderRadius: 3, fontSize: 11, fontWeight: 600, background: isOverride ? '#FEF3C7' : '#FAFBFC', cursor: 'pointer', maxWidth: 140 }}>
                        {opts.map(o => (
                          <option key={o.vendor_id} value={o.vendor_id}>{o.vendor_name} ${o.cost.toFixed(0)}</option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'monospace', fontSize: 12 }}>
                    {sel ? `$${sel.cost.toFixed(2)}` : '—'}
                  </td>
                  <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                    <input type="number" min="0" value={qty} disabled={noPriceData} onChange={e => setQty(p.id, e.target.value)} style={{ width: 60, padding: '4px 8px', border: '1px solid #E4E7EC', borderRadius: 4, fontFamily: 'monospace', fontSize: 12, textAlign: 'right', opacity: noPriceData ? 0.5 : 1 }} />
                  </td>
                  <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'monospace', color: Number(qty) > 0 ? '#16A34A' : '#9CA3AF', fontWeight: Number(qty) > 0 ? 600 : 400 }}>${lt.toFixed(2)}</td>
                </tr>
              );
            })}
            {!filtered.length && <tr><td colSpan="8" style={{ padding: 24, textAlign: 'center', color: '#9CA3AF' }}>No products match.</td></tr>}
          </tbody>
        </table>
      </div>

      <div style={{ ...cardStyle, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: '#8C919E', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Summary</div>
        {grandLines === 0 ? (
          <div style={{ color: '#9CA3AF', fontSize: 13 }}>No items selected. Set a qty on at least one row.</div>
        ) : (
          <>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Will create {Object.keys(groups).length} PO{Object.keys(groups).length === 1 ? '' : 's'}:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {Object.entries(groups).map(([vid, g]) => {
                const subtotal = g.items.reduce((s, it) => s + it.qty_ordered * it.unit_cost, 0);
                const kits = g.items.reduce((s, it) => s + it.qty_ordered, 0);
                return (
                  <div key={vid} style={{ borderLeft: '2px solid #00A0A8', paddingLeft: 12, marginBottom: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span>• <strong>{g.vendor_name}</strong> — {g.items.length} line{g.items.length === 1 ? '' : 's'}, {kits} kit{kits === 1 ? '' : 's'}</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>${subtotal.toFixed(2)}</span>
                    </div>
                    {g.items.map(it => (
                      <div key={it.product_id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6B7A94', paddingLeft: 12, paddingTop: 2 }}>
                        <span>{it.name} <span style={{ color: '#9CA3AF' }}>· {it.sku}</span> × {it.qty_ordered} kit{it.qty_ordered === 1 ? '' : 's'}</span>
                        <span style={{ fontFamily: 'monospace' }}>${(it.qty_ordered * it.unit_cost).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
            <div style={{ borderTop: '1px solid #E4E7EC', marginTop: 10, paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700 }}>
              <span>Total — {grandLines} lines, {grandKits} kits</span>
              <span style={{ fontFamily: 'monospace' }}>${grandTotal.toFixed(2)}</span>
            </div>
          </>
        )}
      </div>

      <div style={{ ...cardStyle, padding: 16 }}>
        <label style={{ fontSize: 11, color: '#8C919E', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Notes (applied to all POs)</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Optional notes added to each generated PO..." style={{ width: '100%', padding: '8px 12px', border: '1px solid #E4E7EC', borderRadius: 4, fontSize: 13, marginBottom: 12, fontFamily: 'inherit' }} />
        <button onClick={submit} disabled={submitting || grandLines === 0} style={{ padding: '12px 24px', background: submitting || grandLines === 0 ? '#9CA3AF' : '#00A0A8', color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: submitting || grandLines === 0 ? 'not-allowed' : 'pointer' }}>
          {submitting ? 'Submitting...' : `Submit Order — Create ${Object.keys(groups).length} PO${Object.keys(groups).length === 1 ? '' : 's'}`}
        </button>
      </div>

      {results && results.length > 0 && (
        <div style={{ ...cardStyle, padding: 16, marginTop: 16 }}>
          <div style={{ fontSize: 11, color: '#8C919E', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Results</div>
          {results.map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < results.length - 1 ? '1px solid #F0F1F4' : 'none' }}>
              <span style={{ fontSize: 13 }}>
                {r.error ? '❌' : '✅'} <strong>{r.vendor_name}</strong>
              </span>
              {r.po_number ? (
                <Link href={`/admin/purchases/${r.po_id}`} style={{ fontSize: 12, color: '#0072B5', textDecoration: 'underline' }}>{r.po_number} →</Link>
              ) : (
                <span style={{ fontSize: 12, color: '#DC2626' }}>{r.error}</span>
              )}
            </div>
          ))}
          {!submitting && results.every(r => r.po_number) && (
            <button onClick={() => router.push('/admin/purchases')} style={{ marginTop: 12, padding: '8px 16px', background: '#0072B5', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Back to all POs →</button>
          )}
        </div>
      )}
    </div>
  );
}
