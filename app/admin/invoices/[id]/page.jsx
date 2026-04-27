'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const cs = {
  wrap: { flex: 1, maxWidth: 1100 },
  h1: { fontSize: 28, fontWeight: 700, color: '#0F1928', fontFamily: "'Barlow Condensed',sans-serif", marginBottom: 2 },
  sub: { fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#7A7D88', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 20 },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 },
  section: { background: '#fff', border: '1px solid #E4E7EC', borderRadius: 8, padding: 20, marginBottom: 16 },
  label: { fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: '#7A7D88', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 },
  btn: { padding: '10px 18px', border: 'none', borderRadius: 4, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 1, textTransform: 'uppercase' },
  btnPrimary: { background: '#00A0A8', color: '#fff' },
  btnSecondary: { background: '#fff', color: '#0F1928', border: '1px solid #E4E7EC' },
  btnDanger: { background: '#DC2626', color: '#fff' },
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

export default function InvoiceDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [inv, setInv] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [payModal, setPayModal] = useState(null); // { paidAmount: string }

  useEffect(() => { load(); }, [id]);

  async function load() {
    setLoading(true);
    const r = await fetch(`/api/invoice-get?id=${id}`, { credentials: 'include' });
    if (r.ok) {
      const { invoice } = await r.json();
      setInv(invoice);
    }
    setLoading(false);
  }

  async function checkStockForPaid() {
    // Look up current stock for each SKU in the invoice and return any that would go below zero
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const warnings = [];
    for (const it of (inv?.items || [])) {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/products?sku=eq.${encodeURIComponent(it.sku)}&select=stock`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
      );
      const rows = r.ok ? await r.json() : [];
      const stock = Number(rows[0]?.stock ?? 0);
      if (stock < it.qty) warnings.push({ sku: it.sku, name: it.name, qty: it.qty, stock });
    }
    return warnings;
  }

  async function transition(newStatus, extra = {}) {
    // 'paid' has its own modal-driven flow (openPayModal) — never call transition('paid') directly.
    if (newStatus !== 'paid') {
      if (!confirm(`Transition this invoice to "${newStatus}"?`)) return;
    }
    setActing(true);
    const r = await fetch('/api/invoice-transition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id, status: newStatus, ...extra }),
    });
    const body = await r.json().catch(() => ({}));
    setActing(false);
    if (r.ok) load();
    else alert('Error: ' + (body.error || r.status));
  }

  async function openPayModal() {
    const warnings = await checkStockForPaid();
    if (warnings.length) {
      const lines = warnings.map((w) => `  ${w.sku} (${w.name}): need ${w.qty}, have ${w.stock}`).join('\n');
      if (!confirm(
        `Marking paid will decrement stock. Some items don't have enough:\n\n${lines}\n\n` +
        `Stock will floor at 0 — the remainder is effectively pre-ordered.\nProceed anyway?`,
      )) return;
    }
    setPayModal({ paidAmount: (Number(inv.total) || 0).toFixed(2) });
  }

  async function confirmPaid() {
    const n = Number(payModal.paidAmount);
    if (!Number.isFinite(n) || n <= 0) {
      alert('Enter a positive amount.');
      return;
    }
    setActing(true);
    const r = await fetch('/api/invoice-transition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id, status: 'paid', paid_amount: n }),
    });
    const body = await r.json().catch(() => ({}));
    setActing(false);
    setPayModal(null);
    if (r.ok) load();
    else alert('Error: ' + (body.error || r.status));
  }

  const hasRealEmail = inv?.email && !inv.email.endsWith('@invoice.local');

  async function markShipped() {
    const tn = prompt('Tracking number (leave blank for "shipped without tracking"):');
    if (tn === null) return;
    const carrier = tn
      ? (prompt('Carrier? usps / ups / fedex / dhl', 'usps') || 'usps').toLowerCase()
      : null;
    // Only ask about emailing if we actually have a real email on file
    const notify_email = hasRealEmail && confirm(
      `Auto-email ${inv.email} with the tracking info?\n\n` +
      `OK = send the shipping email.\n` +
      `Cancel = don't email (you'll text them the update).`,
    );
    transition('shipped', { tracking_number: tn || null, tracking_carrier: carrier, notify_email });
  }

  async function cancelInvoice() {
    if (!confirm('Cancel this invoice? If already paid, stock will be restored.')) return;
    const notify_email = hasRealEmail && confirm(
      `Auto-email ${inv.email} the apology + refund-vs-credit prompt?\n\n` +
      `OK = send the apology email.\n` +
      `Cancel = don't email (you'll text them the update).`,
    );
    transition('cancelled', { notify_email });
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => alert('Copied.'));
  }

  if (loading) return <div style={cs.wrap}>Loading…</div>;
  if (!inv) return <div style={cs.wrap}>Invoice not found.</div>;

  const sc = statusColor(inv.status);
  const canMarkPaid = inv.status === 'sent';
  const canMarkShipped = inv.status === 'paid';
  const canMarkDelivered = inv.status === 'shipped';
  const canCancel = !['delivered', 'cancelled'].includes(inv.status);
  const hasDiscount = (inv.invoice_discount_pct && inv.invoice_discount_pct > 0) || (inv.invoice_discount_flat_cents && inv.invoice_discount_flat_cents > 0);
  const subtotal = (inv.items || []).reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0);

  return (
    <div style={cs.wrap}>
      <Link href="/admin/invoices" style={{ fontSize: 11, color: '#7A7D88', textDecoration: 'none', fontFamily: 'monospace', letterSpacing: 1 }}>← BACK</Link>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 12, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 className="admin-page-h1" style={cs.h1}>{inv.invoice_id}</h1>
          <div className="admin-page-sub" style={cs.sub}>Created {new Date(inv.created_at).toLocaleString()}</div>
        </div>
        <span style={{ ...cs.pill, background: sc.bg, color: sc.fg }}>{inv.status}</span>
      </div>

      <div className="admin-split" style={cs.twoCol}>
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
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
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
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
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
                <div style={{ fontFamily: 'monospace' }}>${(it.price * it.qty).toFixed(2)}</div>
              </div>
            ))}
            {hasDiscount && (
              <div style={{ ...cs.itemRow, color: '#E07C24' }}>
                <div>{inv.invoice_discount_pct ? `Discount · ${inv.invoice_discount_pct}% off` : `Discount · $${((inv.invoice_discount_flat_cents || 0) / 100).toFixed(2)} off`}</div>
                <div style={{ fontFamily: 'monospace' }}>−${(subtotal - inv.total).toFixed(2)}</div>
              </div>
            )}
            <div style={{ borderTop: '2px solid #0F1928', marginTop: 10, paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontFamily: 'monospace', fontSize: 18 }}>
              <div>Total</div>
              <div style={{ color: '#00A0A8' }}>${inv.total?.toFixed?.(2) || inv.total}</div>
            </div>
          </div>

          {inv.tracking_number && (
            <div style={cs.section}>
              <div style={cs.label}>Tracking</div>
              <div style={{ marginTop: 6, fontFamily: 'monospace' }}>{(inv.tracking_carrier || '').toUpperCase()}: {inv.tracking_number}</div>
            </div>
          )}

          <div style={cs.section}>
            <div style={cs.label}>Actions</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              {canMarkPaid && <button style={{ ...cs.btn, ...cs.btnPrimary }} disabled={acting} onClick={openPayModal}>Mark paid</button>}
              {canMarkShipped && <button style={{ ...cs.btn, ...cs.btnPrimary }} disabled={acting} onClick={markShipped}>Mark shipped</button>}
              {canMarkDelivered && <button style={{ ...cs.btn, ...cs.btnPrimary }} disabled={acting} onClick={() => transition('delivered')}>Mark delivered</button>}
              {canCancel && <button style={{ ...cs.btn, ...cs.btnDanger }} disabled={acting} onClick={cancelInvoice}>Cancel invoice</button>}
            </div>
          </div>
        </div>
      </div>

      {payModal && (
        <div
          onClick={() => setPayModal(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15,25,40,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 8, padding: 24, width: 360, maxWidth: '92vw',
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ ...cs.label, marginBottom: 12 }}>Mark {inv.invoice_id} paid</div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'monospace', fontSize: 14, marginBottom: 14 }}>
              <span style={{ color: '#7A7D88' }}>Invoiced</span>
              <span>${(Number(inv.total) || 0).toFixed(2)}</span>
            </div>

            <label style={{ ...cs.label, display: 'block', marginBottom: 6 }}>Amount received</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 10, top: 9, color: '#7A7D88', fontFamily: 'monospace' }}>$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                autoFocus
                value={payModal.paidAmount}
                onChange={(e) => setPayModal({ paidAmount: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') confirmPaid(); }}
                style={{ width: '100%', padding: '8px 12px 8px 22px', border: '1px solid #E4E7EC', borderRadius: 4, fontSize: 14, fontFamily: 'monospace', boxSizing: 'border-box' }}
              />
            </div>

            {(() => {
              const total = Number(inv.total) || 0;
              const paid = Number(payModal.paidAmount);
              if (!Number.isFinite(paid)) return null;
              const v = paid - total;
              const color = v < 0 ? '#DC2626' : v > 0 ? '#16A34A' : '#7A7D88';
              const tag = v < 0 ? ' (short)' : v > 0 ? ' (tip)' : '';
              const sign = v < 0 ? '−' : v > 0 ? '+' : '';
              return (
                <div style={{ marginTop: 12, fontFamily: 'monospace', fontSize: 13, color, display: 'flex', justifyContent: 'space-between' }}>
                  <span>Variance</span>
                  <span>{sign}${Math.abs(v).toFixed(2)}{tag}</span>
                </div>
              );
            })()}

            <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
              <button style={{ ...cs.btn, ...cs.btnSecondary }} onClick={() => setPayModal(null)} disabled={acting}>Cancel</button>
              <button style={{ ...cs.btn, ...cs.btnPrimary }} onClick={confirmPaid} disabled={acting}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
