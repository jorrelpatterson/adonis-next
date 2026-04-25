'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const cs = {
  h1:    { fontSize: 28, fontWeight: 700, color: '#0F1928', fontFamily: "'Barlow Condensed',sans-serif", marginBottom: 20 },
  section: { background: '#fff', border: '1px solid #E4E7EC', borderRadius: 8, padding: 20, marginBottom: 16 },
  label: { fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: '#7A7D88', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6, display: 'block' },
  input: { width: '100%', padding: '9px 12px', border: '1px solid #E4E7EC', borderRadius: 4, fontSize: 13, background: '#FAFBFC', outline: 'none', fontFamily: 'inherit' },
  row:   { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, marginBottom: 12 },
  btn:   { padding: '10px 18px', border: 'none', borderRadius: 4, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 1, textTransform: 'uppercase' },
  btnPrimary: { background: '#00A0A8', color: '#fff' },
  btnSecondary: { background: '#fff', color: '#0F1928', border: '1px solid #E4E7EC' },
  itemRow: { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 70px 90px 90px 26px', gap: 8, alignItems: 'center', padding: '8px 0', borderTop: '1px solid #F3F4F6' },
  removeBtn: { background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontSize: 18, lineHeight: 1 },
  search: { position: 'relative' },
  results: { position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', border: '1px solid #E4E7EC', borderRadius: 4, maxHeight: 280, overflow: 'auto', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' },
  resultRow: { padding: '9px 12px', cursor: 'pointer', fontSize: 13, borderTop: '1px solid #F3F4F6' },
};

export default function NewInvoicePage() {
  const router = useRouter();
  const [customer, setCustomer] = useState({ name: '', phone: '', email: '', address: '', city: '', state: '', zip: '' });
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [discountPct, setDiscountPct] = useState('');
  const [discountFlat, setDiscountFlat] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const q = query.trim();
    if (!q) { setResults([]); return; }
    const t = setTimeout(async () => {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/products?active=is.true&or=(name.ilike.*${encodeURIComponent(q)}*,sku.ilike.*${encodeURIComponent(q)}*)&select=sku,name,size,retail,stock&limit=8`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
      );
      setResults(r.ok ? await r.json() : []);
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  function addItem(p) {
    setItems([...items, { sku: p.sku, name: p.name, size: p.size, qty: 1, price: p.retail, stock: p.stock }]);
    setQuery(''); setResults([]);
  }

  function updateItem(idx, field, val) {
    const next = [...items];
    if (field === 'qty') next[idx] = { ...next[idx], qty: parseInt(val, 10) || 1 };
    else if (field === 'price') next[idx] = { ...next[idx], price: parseFloat(val) || 0 };
    else next[idx] = { ...next[idx], [field]: val };
    setItems(next);
  }

  function removeItem(idx) {
    setItems(items.filter((_, i) => i !== idx));
  }

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const pctNum = parseFloat(discountPct) || 0;
  const flatNum = parseFloat(discountFlat) || 0;
  const discountApplied = Math.min(subtotal, (subtotal * pctNum / 100) + flatNum);
  const total = subtotal - discountApplied;
  const overStockItems = items.filter((it) => Number(it.qty) > Number(it.stock ?? 0));

  async function submit() {
    setError(null);
    if (!customer.name || !customer.address || !customer.city || !customer.state || !customer.zip) {
      setError('Customer name + full address are required'); return;
    }
    if (items.length === 0) { setError('Add at least one item'); return; }
    setSaving(true);
    const r = await fetch('/api/invoice-write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        customer,
        items: items.map((i) => ({ sku: i.sku, qty: i.qty, price: i.price })),
        discount_pct: pctNum > 0 ? pctNum : null,
        discount_flat_cents: flatNum > 0 ? Math.round(flatNum * 100) : null,
        notes: notes || null,
      }),
    });
    const body = await r.json().catch(() => ({}));
    setSaving(false);
    if (r.ok) router.push(`/admin/invoices/${body.invoice.id}`);
    else setError(body.error || 'create failed');
  }

  async function lookupPastCustomer() {
    const q = prompt('Look up past customer by phone or email:');
    if (!q) return;
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?or=(phone.eq.${encodeURIComponent(q)},email.eq.${encodeURIComponent(q.toLowerCase())})&select=first_name,last_name,email,phone,address,city,state,zip&order=created_at.desc&limit=1`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
    );
    const data = r.ok ? await r.json() : [];
    if (data.length) {
      const d = data[0];
      setCustomer({
        name: `${d.first_name || ''} ${d.last_name || ''}`.trim(),
        phone: d.phone || '',
        email: d.email || '',
        address: d.address || '',
        city: d.city || '',
        state: d.state || '',
        zip: d.zip || '',
      });
    } else {
      alert('No past customer found');
    }
  }

  return (
    <div className="admin-form-grid" style={{ flex: 1, maxWidth: 900, display: 'block' }}>
      <h1 className="admin-page-h1" style={cs.h1}>New Invoice</h1>

      <div style={cs.section}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12, gap: 12, flexWrap: 'wrap' }}>
          <div style={cs.label}>Customer</div>
          <button
            style={{ ...cs.btn, ...cs.btnSecondary, padding: '5px 12px', fontSize: 10 }}
            onClick={lookupPastCustomer}
          >
            Pick past customer
          </button>
        </div>
        <div className="admin-form-grid admin-form-grid-4" style={cs.row}>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={cs.label}>Name</label>
            <input style={cs.input} value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} />
          </div>
          <div>
            <label style={cs.label}>Phone</label>
            <input style={cs.input} value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} />
          </div>
          <div>
            <label style={cs.label}>Email</label>
            <input style={cs.input} value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} />
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={cs.label}>Address</label>
          <input style={cs.input} value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} />
        </div>
        <div className="admin-form-grid admin-form-grid-4" style={cs.row}>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={cs.label}>City</label>
            <input style={cs.input} value={customer.city} onChange={(e) => setCustomer({ ...customer, city: e.target.value })} />
          </div>
          <div>
            <label style={cs.label}>State</label>
            <input style={cs.input} value={customer.state} onChange={(e) => setCustomer({ ...customer, state: e.target.value })} />
          </div>
          <div>
            <label style={cs.label}>ZIP</label>
            <input style={cs.input} value={customer.zip} onChange={(e) => setCustomer({ ...customer, zip: e.target.value })} />
          </div>
        </div>
      </div>

      <div style={cs.section}>
        <div style={cs.label}>Items</div>
        <div style={cs.search}>
          <input style={cs.input} placeholder="Search product by name or SKU…" value={query} onChange={(e) => setQuery(e.target.value)} />
          {results.length > 0 && (
            <div style={cs.results}>
              {results.map((p) => {
                const stockColor = p.stock === 0 ? '#DC2626' : p.stock < 5 ? '#E07C24' : '#10B981';
                const stockLabel = p.stock === 0 ? 'OOS' : `${p.stock} in stock`;
                return (
                  <div key={p.sku} style={cs.resultRow} onClick={() => addItem(p)}>
                    <strong>{p.name}</strong>{' '}
                    <span style={{ color: '#7A7D88', fontFamily: 'monospace', fontSize: 11 }}>
                      {p.sku} · {p.size} · ${p.retail}
                    </span>
                    <span style={{ color: stockColor, fontFamily: 'monospace', fontSize: 11, marginLeft: 8, fontWeight: 700 }}>
                      · {stockLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div style={{ ...cs.itemRow, borderTop: 'none', fontFamily: 'monospace', fontSize: 9, color: '#7A7D88', letterSpacing: 2, textTransform: 'uppercase', paddingBottom: 6 }}>
              <div>Item</div><div>Qty</div><div>Unit $</div><div style={{ textAlign: 'right' }}>Line</div><div></div>
            </div>
            {items.map((it, i) => {
              const stock = Number(it.stock ?? 0);
              const qty = Number(it.qty ?? 0);
              const overBy = Math.max(0, qty - stock);
              const stockColor = stock === 0 ? '#DC2626' : stock < 5 ? '#E07C24' : '#10B981';
              const stockLabel = stock === 0 ? 'OOS' : `${stock} in stock`;
              return (
                <div key={i} style={cs.itemRow}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{it.name}</div>
                    <div style={{ fontSize: 11, color: '#7A7D88', fontFamily: 'monospace' }}>
                      {it.sku} · {it.size} · <span style={{ color: stockColor, fontWeight: 700 }}>{stockLabel}</span>
                      {overBy > 0 && (
                        <span style={{ color: '#E07C24', fontWeight: 700, marginLeft: 6 }}>
                          · {overBy} needs to be pre-ordered
                        </span>
                      )}
                    </div>
                  </div>
                  <input style={cs.input} type="number" min="1" value={it.qty} onChange={(e) => updateItem(i, 'qty', e.target.value)} />
                  <input style={cs.input} type="number" step="0.01" value={it.price} onChange={(e) => updateItem(i, 'price', e.target.value)} />
                  <div style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>${(it.price * it.qty).toFixed(2)}</div>
                  <button style={cs.removeBtn} onClick={() => removeItem(i)}>×</button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={cs.section}>
        <div style={cs.label}>Discount (optional)</div>
        <div className="admin-form-grid admin-form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={cs.label}>% off</label>
            <input style={cs.input} type="number" min="0" max="100" placeholder="e.g. 10" value={discountPct} onChange={(e) => setDiscountPct(e.target.value)} />
          </div>
          <div>
            <label style={cs.label}>$ off (flat)</label>
            <input style={cs.input} type="number" min="0" step="0.01" placeholder="e.g. 5.00" value={discountFlat} onChange={(e) => setDiscountFlat(e.target.value)} />
          </div>
        </div>
      </div>

      <div style={cs.section}>
        <label style={cs.label}>Notes (optional)</label>
        <textarea
          style={{ ...cs.input, minHeight: 60, fontFamily: 'inherit' }}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {overStockItems.length > 0 && (
        <div style={{ ...cs.section, background: '#FEF3C7', borderColor: '#F59E0B' }}>
          <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#92400E', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
            Stock warning
          </div>
          <div style={{ fontSize: 13, color: '#92400E', lineHeight: 1.5 }}>
            {overStockItems.length === 1 ? 'This item has' : 'These items have'} less in stock than you're invoicing.
            That's OK — the customer will get their order in two shipments (in-stock portion ships in 2–3 days,
            remainder pre-orders in 2–3 weeks). Just confirming you know.
            <ul style={{ marginTop: 6, paddingLeft: 18 }}>
              {overStockItems.map((it) => (
                <li key={it.sku} style={{ fontFamily: 'monospace', fontSize: 12 }}>
                  {it.sku} — need {it.qty}, have {it.stock ?? 0}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div style={{ ...cs.section, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 13, color: '#7A7D88' }}>Subtotal: ${subtotal.toFixed(2)}</div>
          {discountApplied > 0 && <div style={{ fontSize: 13, color: '#E07C24' }}>Discount: −${discountApplied.toFixed(2)}</div>}
          <div style={{ fontSize: 22, fontWeight: 700, color: '#00A0A8', fontFamily: 'monospace' }}>${total.toFixed(2)}</div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button style={{ ...cs.btn, ...cs.btnSecondary }} onClick={() => router.push('/admin/invoices')}>Cancel</button>
          <button style={{ ...cs.btn, ...cs.btnPrimary }} onClick={submit} disabled={saving}>
            {saving ? 'Creating…' : 'Create invoice'}
          </button>
        </div>
      </div>

      {error && <div style={{ color: '#DC2626', marginTop: 12, fontSize: 13 }}>{error}</div>}
    </div>
  );
}
