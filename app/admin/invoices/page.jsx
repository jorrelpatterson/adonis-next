'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import Link from 'next/link';

const STATUSES = ['all', 'sent', 'paid', 'shipped', 'delivered', 'cancelled'];

const cs = {
  h1:    { fontSize: 28, fontWeight: 700, color: '#0F1928', fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 1, marginBottom: 4 },
  sub:   { fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#7A7D88', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 24 },
  bar:   { display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' },
  input: { padding: '8px 12px', border: '1px solid #E4E7EC', borderRadius: 4, fontSize: 13, background: '#FAFBFC', outline: 'none', fontFamily: 'inherit' },
  btn:   { padding: '9px 16px', border: 'none', borderRadius: 4, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 1, textTransform: 'uppercase', background: '#00A0A8', color: '#fff', textDecoration: 'none', display: 'inline-block' },
  chip:  { padding: '6px 12px', border: '1px solid #E4E7EC', borderRadius: 999, fontSize: 11, cursor: 'pointer', background: '#fff', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 1 },
  chipActive: { background: '#00A0A8', color: '#fff', borderColor: '#00A0A8' },
  table: { width: '100%', background: '#fff', border: '1px solid #E4E7EC', borderRadius: 8, borderCollapse: 'separate', borderSpacing: 0, overflow: 'hidden' },
  th:    { padding: '12px 14px', background: '#F8F9FB', textAlign: 'left', fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: '#7A7D88', letterSpacing: 2, textTransform: 'uppercase' },
  td:    { padding: '13px 14px', borderTop: '1px solid #E4E7EC', fontSize: 13, verticalAlign: 'middle' },
  pill:  { padding: '3px 9px', borderRadius: 999, fontSize: 10, fontFamily: 'monospace', letterSpacing: 1, textTransform: 'uppercase' },
};

const statusColor = (s) => ({
  sent:      { bg: '#FEF3C7', fg: '#92400E' },
  paid:      { bg: '#DBEAFE', fg: '#1E40AF' },
  shipped:   { bg: '#E0E7FF', fg: '#4338CA' },
  delivered: { bg: '#D1FAE5', fg: '#065F46' },
  cancelled: { bg: '#FEE2E2', fg: '#991B1B' },
}[s] || { bg: '#F3F4F6', fg: '#374151' });

export default function InvoicesList() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => { load(); }, [statusFilter, search]);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (search) params.set('q', search);
    const r = await fetch('/api/invoice-list?' + params.toString(), { credentials: 'include', cache: 'no-store' });
    if (r.ok) {
      const { invoices } = await r.json();
      setInvoices(invoices || []);
    }
    setLoading(false);
  }

  function ageDays(iso) {
    return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  }

  return (
    <div style={{ padding: 28, flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 6 }}>
        <div>
          <h1 style={cs.h1}>Invoices</h1>
          <div style={cs.sub}>admin-created orders</div>
        </div>
        <Link href="/admin/invoices/new" style={cs.btn}>+ New invoice</Link>
      </div>

      <div style={cs.bar}>
        {STATUSES.map((s) => (
          <button key={s} style={{ ...cs.chip, ...(statusFilter === s ? cs.chipActive : {}) }} onClick={() => setStatusFilter(s)}>
            {s}
          </button>
        ))}
        <input
          style={{ ...cs.input, marginLeft: 'auto', width: 260 }}
          placeholder="Search name, email, invoice id"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading && <div style={{ padding: 40, textAlign: 'center', color: '#7A7D88' }}>Loading…</div>}
      {!loading && invoices.length === 0 && (
        <div style={{ padding: 60, textAlign: 'center', color: '#7A7D88', fontFamily: 'monospace', letterSpacing: 2 }}>
          No invoices yet. Click + NEW INVOICE to create one.
        </div>
      )}
      {!loading && invoices.length > 0 && (
        <table style={cs.table}>
          <thead>
            <tr>
              <th style={cs.th}>Invoice</th>
              <th style={cs.th}>Customer</th>
              <th style={cs.th}>Items</th>
              <th style={cs.th}>Total</th>
              <th style={cs.th}>Status</th>
              <th style={cs.th}>Age</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => {
              const sc = statusColor(inv.status);
              const items = inv.items || [];
              const itemsSummary = items.slice(0, 2).map((i) => i.name).join(', ') + (items.length > 2 ? ` +${items.length - 2}` : '');
              return (
                <tr key={inv.id} style={{ cursor: 'pointer' }} onClick={() => (window.location.href = `/admin/invoices/${inv.id}`)}>
                  <td style={cs.td}>
                    <div style={{ fontFamily: 'monospace', fontWeight: 700 }}>{inv.invoice_id}</div>
                  </td>
                  <td style={cs.td}>
                    <div style={{ fontWeight: 700 }}>{inv.first_name} {inv.last_name}</div>
                    <div style={{ fontSize: 11, color: '#7A7D88' }}>{inv.email || inv.phone || ''}</div>
                  </td>
                  <td style={{ ...cs.td, fontSize: 12, color: '#374151' }}>{itemsSummary}</td>
                  <td style={cs.td}><strong>${inv.total?.toFixed?.(2) || inv.total}</strong></td>
                  <td style={cs.td}><span style={{ ...cs.pill, background: sc.bg, color: sc.fg }}>{inv.status}</span></td>
                  <td style={{ ...cs.td, color: '#7A7D88', fontFamily: 'monospace', fontSize: 11 }}>{ageDays(inv.created_at)}d</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
