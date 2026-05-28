'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const cs = {
  h1: { fontSize: 28, fontWeight: 700, color: '#0F1928', fontFamily: "'Barlow Condensed',sans-serif", marginBottom: 2 },
  sub: { fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#7A7D88', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 20 },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 },
  section: { background: '#fff', border: '1px solid #E4E7EC', borderRadius: 8, padding: 20, marginBottom: 16 },
  label: { fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: '#7A7D88', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 },
  btn: { padding: '10px 18px', border: 'none', borderRadius: 4, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 1, textTransform: 'uppercase' },
  btnSecondary: { background: '#fff', color: '#0F1928', border: '1px solid #E4E7EC' },
  pill: { padding: '4px 12px', borderRadius: 999, fontSize: 11, fontFamily: 'monospace', letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700 },
  itemRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid #F3F4F6' },
};

const statusColor = (s) => ({
  sent:      { bg: '#FEF3C7', fg: '#92400E' },
  paid:      { bg: '#DBEAFE', fg: '#1E40AF' },
  shipped:   { bg: '#E0E7FF', fg: '#4338CA' },
  delivered: { bg: '#D1FAE5', fg: '#065F46' },
  cancelled: { bg: '#FEE2E2', fg: '#991B1B' },
}[s] || { bg: '#F3F4F6', fg: '#374151' });

export default function AmbassadorInvoiceDetail() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const code = (searchParams.get('code') || '').trim().toUpperCase();
  const [inv, setInv] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { load(); }, [id, code]);

  async function load() {
    setLoading(true);
    setError(null);
    if (!code) { setError('Missing ?code= in URL'); setLoading(false); return; }
    const r = await fetch(`/api/invoice-get?id=${id}&ambassador_code=${encodeURIComponent(code)}`, { cache: 'no-store' });
    const body = await r.json().catch(() => ({}));
    setLoading(false);
    if (r.ok) setInv(body.invoice);
    else setError(body.error || 'Could not load invoice');
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => alert('Copied.'));
  }

  if (loading) return <div style={{ color: '#7A7D88' }}>Loading…</div>;
  if (error) {
    return (
      <div style={cs.section}>
        <h1 style={cs.h1}>Invoice not available</h1>
        <p style={{ color: '#7A7D88', fontSize: 13 }}>{error}</p>
        <Link href={`/ambassador/invoices/new?code=${encodeURIComponent(code)}`}
          style={{ fontSize: 13, color: '#00A0A8', textDecoration: 'none' }}>← Create another invoice</Link>
      </div>
    );
  }
  if (!inv) return <div style={cs.section}><p style={{ color: '#7A7D88' }}>Invoice not found.</p></div>;

  const sc = statusColor(inv.status);
  const subtotal = (inv.items || []).reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0);

  return (
    <div>
      <Link href={`/ambassador/invoices/new?code=${encodeURIComponent(code)}`}
        style={{ fontSize: 11, color: '#7A7D88', textDecoration: 'none', fontFamily: 'monospace', letterSpacing: 1 }}>
        ← NEW INVOICE
      </Link>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 12, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={cs.h1}>{inv.invoice_id}</h1>
          <div style={cs.sub}>Created {new Date(inv.created_at).toLocaleString()}</div>
        </div>
        <span style={{ ...cs.pill, background: sc.bg, color: sc.fg }}>{inv.status}</span>
      </div>

      <div style={cs.twoCol}>
        <div>
          <div style={cs.section}>
            <div style={cs.label}>Invoice image</div>
            {inv.image_url && (
              <img
                src={inv.image_url}
                style={{ width: '100%', border: '1px solid #E4E7EC', borderRadius: 4, marginTop: 8 }}
                alt="invoice"
              />
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <a
                href={inv.image_url}
                download={`${inv.invoice_id}.png`}
                style={{ ...cs.btn, ...cs.btnSecondary, textDecoration: 'none' }}
              >
                Download PNG
              </a>
              <button style={{ ...cs.btn, ...cs.btnSecondary }} onClick={() => copyToClipboard(inv.image_url)}>Copy image URL</button>
            </div>
          </div>

          <div style={cs.section}>
            <div style={cs.label}>Shareable link</div>
            <div style={{ fontFamily: 'monospace', fontSize: 13, padding: 10, background: '#F8F9FB', borderRadius: 4, marginTop: 8, wordBreak: 'break-all' }}>
              {inv.public_url}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <button style={{ ...cs.btn, ...cs.btnSecondary }} onClick={() => copyToClipboard(inv.public_url)}>Copy link</button>
              <a href={inv.public_url} target="_blank" rel="noopener" style={{ ...cs.btn, ...cs.btnSecondary, textDecoration: 'none' }}>Open preview</a>
            </div>
          </div>
        </div>

        <div>
          <div style={cs.section}>
            <div style={cs.label}>Customer</div>
            <div style={{ marginTop: 6, fontWeight: 700 }}>{inv.first_name} {inv.last_name}</div>
            <div style={{ fontSize: 13 }}>{inv.email && !inv.email.endsWith('@invoice.local') ? inv.email : '— (no email on file)'}</div>
            <div style={{ fontSize: 13 }}>{inv.phone || '—'}</div>
            <div style={{ fontSize: 13, color: '#7A7D88', marginTop: 6 }}>{inv.address}<br />{inv.city}, {inv.state} {inv.zip}</div>
          </div>

          <div style={cs.section}>
            <div style={cs.label}>Items</div>
            {(inv.items || []).map((it, i) => (
              <div key={i} style={cs.itemRow}>
                <div>
                  <strong>{it.name}</strong>
                  <div style={{ fontSize: 11, color: '#7A7D88', fontFamily: 'monospace' }}>{it.sku} · {it.size} · qty {it.qty}</div>
                </div>
                <div style={{ fontFamily: 'monospace', fontWeight: 700 }}>${((it.price || 0) * (it.qty || 1)).toFixed(2)}</div>
              </div>
            ))}
            <div style={{ ...cs.itemRow, marginTop: 8, borderTop: '1px solid #E4E7EC', paddingTop: 12 }}>
              <strong>Total</strong>
              <strong style={{ fontFamily: 'monospace', color: '#00A0A8' }}>${(Number(inv.total) || subtotal).toFixed(2)}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
