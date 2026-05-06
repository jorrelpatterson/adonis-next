'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import Link from 'next/link';

const REASON_LABEL = {
  broken: 'Broken',
  spilled: 'Spilled',
  qa_test: 'QA test',
  returned_damaged: 'Returned damaged',
  expired: 'Expired',
  sample: 'Sample',
  count_correction: 'Count correction',
  other: 'Other',
};
const REASON_COLOR = {
  broken: '#DC2626',
  spilled: '#F59E0B',
  qa_test: '#0072B5',
  returned_damaged: '#DC2626',
  expired: '#7A7D88',
  sample: '#22C55E',
  count_correction: '#0F1928',
  other: '#7A7D88',
};

const cs = {
  h1: { fontSize: 28, fontWeight: 700, color: '#0F1928', fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 1 },
  card: { background: '#fff', borderRadius: 8, border: '1px solid #E4E7EC', overflow: 'hidden' },
  th: { padding: '10px 12px', background: '#F8F9FB', textAlign: 'left', fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: '#7A7D88', letterSpacing: 2, textTransform: 'uppercase' },
  td: { padding: '11px 12px', borderTop: '1px solid #E4E7EC', fontSize: 13, verticalAlign: 'middle' },
  pill: { padding: '3px 8px', borderRadius: 999, fontSize: 10, fontFamily: 'monospace', letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600 },
  chip: { padding: '5px 10px', border: '1px solid #E4E7EC', borderRadius: 999, fontSize: 11, cursor: 'pointer', background: '#fff', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 1 },
  chipActive: { background: '#0F1928', color: '#fff', borderColor: '#0F1928' },
};

export default function AdjustmentsPage() {
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reasonFilter, setReasonFilter] = useState('all');

  useEffect(() => { load(); }, [reasonFilter]);
  useEffect(() => { loadStats(); }, []);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (reasonFilter !== 'all') params.set('reason', reasonFilter);
    params.set('limit', '500');
    const r = await fetch('/api/inventory-adjustments?' + params.toString(), { credentials: 'include', cache: 'no-store' });
    if (r.ok) {
      const { adjustments } = await r.json();
      setRows(adjustments || []);
    }
    setLoading(false);
  }

  async function loadStats() {
    const r = await fetch('/api/inventory-loss-stats', { credentials: 'include', cache: 'no-store' });
    if (r.ok) setStats(await r.json());
  }

  return (
    <div>
      <Link href="/admin/inventory" style={{ fontSize: 11, color: '#7A7D88', textDecoration: 'none', fontFamily: 'monospace', letterSpacing: 1 }}>← BACK TO INVENTORY</Link>
      <h1 className="admin-page-h1" style={{ ...cs.h1, marginTop: 8, marginBottom: 6 }}>Inventory adjustments</h1>
      <p style={{ color: '#7A7D88', fontSize: 13, marginBottom: 24 }}>Audit log of every non-sale stock movement.</p>

      {stats && (
        <div className="admin-tile-row" style={{ marginBottom: 24 }}>
          <div style={{ ...cs.card, padding: 16, borderLeft: '3px solid #DC2626' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#DC2626', fontFamily: "'Barlow Condensed'" }}>${Math.round(stats.loss_cents / 100).toLocaleString()}</div>
            <div style={{ fontSize: 10, color: '#8C919E', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>Loss · lifetime</div>
            <div style={{ fontSize: 10, color: '#A0A4AE', marginTop: 2 }}>{stats.loss_vials} vials</div>
          </div>
          <div style={{ ...cs.card, padding: 16, borderLeft: '3px solid #F59E0B' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#F59E0B', fontFamily: "'Barlow Condensed'" }}>${Math.round(stats.loss_cents_30d / 100).toLocaleString()}</div>
            <div style={{ fontSize: 10, color: '#8C919E', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>Loss · last 30 days</div>
            <div style={{ fontSize: 10, color: '#A0A4AE', marginTop: 2 }}>{stats.loss_vials_30d} vials</div>
          </div>
          <div style={{ ...cs.card, padding: 16, borderLeft: '3px solid #22C55E' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#22C55E', fontFamily: "'Barlow Condensed'" }}>+{stats.found_vials}</div>
            <div style={{ fontSize: 10, color: '#8C919E', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>Found · lifetime</div>
            <div style={{ fontSize: 10, color: '#A0A4AE', marginTop: 2 }}>${Math.round(stats.found_cents / 100).toLocaleString()} value</div>
          </div>
          <div style={{ ...cs.card, padding: 16, borderLeft: '3px solid #0F1928' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#0F1928', fontFamily: "'Barlow Condensed'" }}>{stats.total_adjustments}</div>
            <div style={{ fontSize: 10, color: '#8C919E', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>Total adjustments</div>
            <div style={{ fontSize: 10, color: '#A0A4AE', marginTop: 2 }}>all-time count</div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {['all', ...Object.keys(REASON_LABEL)].map((r) => (
          <button key={r} style={{ ...cs.chip, ...(reasonFilter === r ? cs.chipActive : {}) }} onClick={() => setReasonFilter(r)}>
            {r === 'all' ? 'All' : REASON_LABEL[r]}
          </button>
        ))}
      </div>

      {loading && <div style={{ padding: 40, textAlign: 'center', color: '#7A7D88' }}>Loading…</div>}
      {!loading && rows.length === 0 && (
        <div style={{ padding: 60, textAlign: 'center', color: '#7A7D88', fontFamily: 'monospace', letterSpacing: 2 }}>
          No adjustments yet.
        </div>
      )}
      {!loading && rows.length > 0 && (
        <div className="admin-table-scroll">
          <table style={{ width: '100%', background: '#fff', border: '1px solid #E4E7EC', borderRadius: 8, borderCollapse: 'separate', borderSpacing: 0, overflow: 'hidden' }}>
            <thead>
              <tr>
                <th style={cs.th}>When</th>
                <th style={cs.th}>Product</th>
                <th style={cs.th}>Δ vials</th>
                <th style={cs.th}>Reason</th>
                <th style={cs.th}>$ impact</th>
                <th style={cs.th}>Note</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const delta = Number(row.delta_vials) || 0;
                const cpv = Number(row.cost_per_vial_cents) || 0;
                const dollars = Math.abs(delta) * cpv / 100;
                const isLoss = delta < 0;
                const productName = row.product?.name || row.sku;
                const productSize = row.product?.size || '';
                return (
                  <tr key={row.id}>
                    <td style={{ ...cs.td, color: '#7A7D88', fontFamily: 'monospace', fontSize: 11, whiteSpace: 'nowrap' }}>
                      {new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td style={cs.td}>
                      <div style={{ fontWeight: 700 }}>{productName}</div>
                      <div style={{ fontSize: 11, color: '#7A7D88', fontFamily: 'monospace' }}>{row.sku}{productSize ? ` · ${productSize}` : ''}</div>
                    </td>
                    <td style={{ ...cs.td, fontFamily: 'monospace', fontWeight: 700, color: isLoss ? '#DC2626' : '#22C55E' }}>
                      {delta > 0 ? '+' : ''}{delta}
                    </td>
                    <td style={cs.td}>
                      <span style={{ ...cs.pill, background: '#F8F9FB', color: REASON_COLOR[row.reason] || '#7A7D88', border: `1px solid ${REASON_COLOR[row.reason] || '#E4E7EC'}33` }}>
                        {REASON_LABEL[row.reason] || row.reason}
                      </span>
                    </td>
                    <td style={{ ...cs.td, fontFamily: 'monospace', color: isLoss ? '#DC2626' : '#22C55E' }}>
                      {isLoss ? '−' : '+'}${dollars.toFixed(2)}
                    </td>
                    <td style={{ ...cs.td, fontSize: 12, color: '#374151', maxWidth: 320 }}>{row.note || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
