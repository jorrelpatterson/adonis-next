'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';

const cs = {
  h1:    { fontSize: 28, fontWeight: 700, color: '#0F1928', fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 1, marginBottom: 4 },
  sub:   { fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#7A7D88', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 24 },
  tile:  { background: '#fff', border: '1px solid #E4E7EC', borderRadius: 8, padding: '18px 22px' },
  tileLabel: { fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: '#7A7D88', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 },
  tileVal: { fontSize: 24, fontWeight: 700, color: '#0F1928' },
  table: { width: '100%', background: '#fff', border: '1px solid #E4E7EC', borderRadius: 8, borderCollapse: 'separate', borderSpacing: 0, overflow: 'hidden', marginTop: 20 },
  th:    { padding: '12px 16px', background: '#F8F9FB', textAlign: 'left', fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: '#7A7D88', letterSpacing: 2, textTransform: 'uppercase', borderBottom: '1px solid #E4E7EC' },
  td:    { padding: '14px 16px', borderTop: '1px solid #E4E7EC', fontSize: 13, verticalAlign: 'middle' },
  sku:   { fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#7A7D88', textTransform: 'uppercase', marginTop: 4 },
  btn:   { padding: '7px 12px', border: 'none', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 1, textTransform: 'uppercase' },
  btnCyan: { background: '#00A0A8', color: '#fff' },
  btnDanger: { background: '#DC2626', color: '#fff' },
  empty: { textAlign: 'center', padding: 80, color: '#7A7D88', fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' },
};

export default function PreSellPage() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/presell-queue', { credentials: 'include' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const { queue } = await r.json();
      setQueue(queue || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function markPo(sku, name) {
    if (!confirm(`Mark PO placed for all queued orders of ${name}?\n\nThis will email every customer telling them the vendor PO is in motion.`)) return;
    const r = await fetch('/api/presell-po-placed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ sku }),
    });
    const body = await r.json().catch(() => ({}));
    if (r.ok) {
      alert(`Updated ${body.updated} orders, emailed ${body.emails} customers.`);
      load();
    } else {
      alert('Error: ' + (body.error || r.status));
    }
  }

  async function cancelAll(sku, name) {
    const reason = prompt(
      `Cancel ALL pre-orders of ${name}?\n\n` +
      `This will:\n` +
      `  • Email every customer asking them to choose refund OR store credit + 10%\n` +
      `  • Mark their orders cancelled in the database\n` +
      `  • Disable pre-sell on this product so no new orders come in\n` +
      `  • NOT auto-refund — you handle Zelle refunds manually after they reply\n\n` +
      `Optional reason to include in the email (or blank):`
    );
    if (reason === null) return;
    if (!confirm(`FINAL CONFIRM: cancel all pre-orders of ${name}?`)) return;
    const r = await fetch('/api/presell-cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ sku, reason }),
    });
    const body = await r.json().catch(() => ({}));
    if (r.ok) {
      alert(`Cancelled ${body.cancelled} orders, emailed ${body.emails} customers. Pre-sell disabled on ${body.sku}.`);
      load();
    } else {
      alert('Error: ' + (body.error || r.status));
    }
  }

  const totalOrders = queue.reduce((s, g) => s + g.orders.length, 0);
  const totalUnits = queue.reduce((s, g) => s + g.total_units, 0);
  const totalRevenue = queue.reduce((s, g) => s + g.queued_revenue_cents, 0) / 100;

  return (
    <div style={{ flex: 1 }}>
      <h1 className="admin-page-h1" style={cs.h1}>Pre-sell Queue</h1>
      <div className="admin-page-sub" style={cs.sub}>OOS orders awaiting vendor PO</div>

      {loading && <div style={cs.empty}>Loading…</div>}
      {error && <div style={{ ...cs.empty, color: '#DC2626' }}>Error: {error}</div>}

      {!loading && !error && queue.length === 0 && (
        <div style={cs.empty}>No pre-orders in the queue yet.</div>
      )}

      {!loading && !error && queue.length > 0 && (
        <>
          <div className="admin-tile-row" style={{ marginBottom: 4 }}>
            <div style={cs.tile}>
              <div className="admin-tile-label" style={cs.tileLabel}>Open pre-orders</div>
              <div className="admin-tile-val" style={{ ...cs.tileVal, color: '#00A0A8' }}>{totalOrders}</div>
            </div>
            <div style={cs.tile}>
              <div className="admin-tile-label" style={cs.tileLabel}>Units queued</div>
              <div className="admin-tile-val" style={cs.tileVal}>{totalUnits}</div>
            </div>
            <div style={cs.tile}>
              <div className="admin-tile-label" style={cs.tileLabel}>Revenue queued</div>
              <div className="admin-tile-val" style={cs.tileVal}>${totalRevenue.toFixed(2)}</div>
            </div>
            <div style={cs.tile}>
              <div className="admin-tile-label" style={cs.tileLabel}>Unique SKUs</div>
              <div className="admin-tile-val" style={cs.tileVal}>{queue.length}</div>
            </div>
          </div>

          <div className="admin-table-scroll">
          <table style={cs.table}>
            <thead>
              <tr>
                <th style={cs.th}>Product</th>
                <th style={cs.th}>Orders</th>
                <th style={cs.th}>Queued $</th>
                <th style={cs.th}>Oldest</th>
                <th style={cs.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((g) => {
                const ageColor = g.oldest_days >= 14 ? '#DC2626' : g.oldest_days >= 7 ? '#E07C24' : '#0F1928';
                const hasQueued = g.status_counts.queued > 0;
                return (
                  <tr key={g.sku}>
                    <td style={cs.td}>
                      <div style={{ fontWeight: 700 }}>{g.name}</div>
                      <div style={cs.sku}>{g.sku}{g.size ? ' · ' + g.size : ''}</div>
                    </td>
                    <td style={cs.td}>
                      {g.total_units} unit{g.total_units !== 1 ? 's' : ''}
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: '#7A7D88', letterSpacing: 1, marginTop: 3 }}>
                        {g.status_counts.queued || 0} queued · {g.status_counts.po_placed || 0} on PO
                      </div>
                    </td>
                    <td style={cs.td}><strong>${(g.queued_revenue_cents / 100).toFixed(2)}</strong></td>
                    <td style={{ ...cs.td, color: ageColor, fontWeight: g.oldest_days >= 7 ? 700 : 400 }}>
                      {g.oldest_days} day{g.oldest_days !== 1 ? 's' : ''}
                    </td>
                    <td style={cs.td}>
                      {hasQueued && (
                        <button style={{ ...cs.btn, ...cs.btnCyan, marginRight: 6 }} onClick={() => markPo(g.sku, g.name)}>Mark PO placed</button>
                      )}
                      <button style={{ ...cs.btn, ...cs.btnDanger }} onClick={() => cancelAll(g.sku, g.name)}>Cancel all</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </>
      )}
    </div>
  );
}
