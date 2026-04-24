// Invoice PNG renderer — uses next/og (satori + resvg) so fonts render correctly
// on Vercel's serverless runtime. The prior sharp-based SVG path produced
// tofu-box text because librsvg couldn't resolve the font names.

import { ImageResponse } from 'next/og';
import React from 'react';

const h = React.createElement;

const INK   = '#1A1C22';
const CREAM = '#F4F2EE';
const CYAN  = '#00A0A8';
const AMBER = '#E07C24';
const DIM   = '#7A7D88';
const BG2   = '#ECEAE4';
const RULE  = 'rgba(0,0,0,0.08)';

const dollars = (cents) => '$' + (cents / 100).toFixed(2);

// --- Font loading ---------------------------------------------------------
// Fetch Google Fonts as TTF ArrayBuffers. Google returns different font
// formats based on User-Agent; the legacy UA string below gets TTF variants
// that satori can consume. Cached per-cold-start.

let fontPromise = null;
async function loadFonts() {
  if (fontPromise) return fontPromise;
  fontPromise = (async () => {
    async function fetchFont(family, weight, italic = false) {
      const css = await fetch(
        `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:ital,wght@${italic ? 1 : 0},${weight}&display=swap`,
        { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } },
      ).then((r) => r.text());
      const m = css.match(/src:\s*url\((https:[^)]+)\)/);
      if (!m) throw new Error(`font URL missing for ${family} ${weight}`);
      return await fetch(m[1]).then((r) => r.arrayBuffer());
    }
    const [bar400, bar900, mono400, serifItalic] = await Promise.all([
      fetchFont('Barlow Condensed', 400),
      fetchFont('Barlow Condensed', 900),
      fetchFont('JetBrains Mono', 400),
      fetchFont('Cormorant Garamond', 300, true),
    ]);
    return { bar400, bar900, mono400, serifItalic };
  })().catch((err) => {
    // Reset so next invocation retries
    fontPromise = null;
    throw err;
  });
  return fontPromise;
}

// --- Component tree (no JSX — plain React.createElement) ------------------

function Header({ invoiceId }) {
  return h(
    'div',
    {
      style: {
        display: 'flex', flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', background: INK, padding: '28px 64px', color: CREAM,
      },
    },
    h('div', { style: { display: 'flex', alignItems: 'baseline' } },
      h('div', {
        style: {
          fontFamily: 'Barlow Condensed', fontSize: 36, fontWeight: 900,
          letterSpacing: 5, textTransform: 'lowercase',
        },
      }, 'advnce'),
      h('div', {
        style: {
          fontFamily: 'Barlow Condensed', fontSize: 36, fontWeight: 400,
          letterSpacing: 5, textTransform: 'lowercase', color: DIM, marginLeft: 10,
        },
      }, 'labs'),
    ),
    h('div', {
      style: {
        fontFamily: 'JetBrains Mono', fontSize: 16, color: DIM,
        letterSpacing: 3, textTransform: 'uppercase',
      },
    }, `INVOICE · ${String(invoiceId).toUpperCase()}`),
  );
}

function Title({ issuedAt }) {
  return h(
    'div',
    { style: { display: 'flex', flexDirection: 'column', padding: '40px 64px 0' } },
    h('div', { style: { display: 'flex', alignItems: 'baseline' } },
      h('div', {
        style: {
          fontFamily: 'Cormorant Garamond', fontStyle: 'italic', fontWeight: 300,
          fontSize: 72, color: INK, lineHeight: 1,
        },
      }, 'Order'),
      h('div', {
        style: {
          fontFamily: 'Cormorant Garamond', fontStyle: 'italic', fontWeight: 300,
          fontSize: 72, color: CYAN, lineHeight: 1, marginLeft: 18,
        },
      }, 'Summary.'),
    ),
    h('div', {
      style: {
        fontFamily: 'JetBrains Mono', fontSize: 13, color: DIM,
        letterSpacing: 3, textTransform: 'uppercase', marginTop: 10, marginBottom: 28,
      },
    }, `ISSUED ${issuedAt} · DUE WITHIN 48 HOURS`),
  );
}

function BillTo({ customer }) {
  const colLabel = {
    fontFamily: 'JetBrains Mono', fontSize: 11, color: DIM,
    letterSpacing: 3, textTransform: 'uppercase', marginBottom: 6,
  };
  const colName = { fontSize: 20, fontWeight: 700, color: INK };
  const colLine = { fontSize: 16, color: INK, marginTop: 2 };
  return h(
    'div',
    { style: { display: 'flex', flexDirection: 'column', padding: '0 64px' } },
    h('div', { style: { borderTop: `1px solid ${RULE}`, marginBottom: 14, width: '100%', height: 1 } }),
    h('div',
      { style: { display: 'flex', flexDirection: 'row', justifyContent: 'space-between' } },
      h('div', { style: { display: 'flex', flexDirection: 'column' } },
        h('div', { style: colLabel }, 'BILL TO'),
        h('div', { style: colName }, customer.name),
        h('div', { style: colLine }, customer.address_line1),
        h('div', { style: colLine }, customer.address_line2),
      ),
      h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end' } },
        h('div', { style: colLabel }, 'FROM'),
        h('div', { style: colName }, 'advnce labs'),
        h('div', { style: colLine }, 'orders@advncelabs.com'),
        h('div', { style: colLine }, 'advncelabs.com'),
      ),
    ),
    h('div', { style: { borderTop: `1px solid ${RULE}`, marginTop: 22, width: '100%', height: 1 } }),
  );
}

function ItemsTable({ items }) {
  return h(
    'div',
    { style: { display: 'flex', flexDirection: 'column', padding: '0 64px', marginTop: 6 } },
    ...items.map((it, i) => h(
      'div',
      {
        key: i,
        style: {
          display: 'flex', flexDirection: 'row', justifyContent: 'space-between',
          alignItems: 'flex-start', padding: '14px 0',
          borderBottom: `1px solid rgba(0,0,0,0.06)`,
        },
      },
      h('div', { style: { display: 'flex', flexDirection: 'column' } },
        h('div', { style: { fontSize: 22, fontWeight: 700, color: INK } }, it.name),
        h('div', {
          style: {
            fontFamily: 'JetBrains Mono', fontSize: 13, color: DIM,
            letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 4,
          },
        }, `${(it.size || '').toUpperCase()} · ${String(it.sku).toUpperCase()} · QTY ${it.qty}`),
      ),
      h('div', {
        style: { fontFamily: 'JetBrains Mono', fontSize: 22, color: INK },
      }, '$' + (it.price * it.qty).toFixed(2)),
    )),
  );
}

function Totals({ subtotalCents, discountAppliedCents, totalCents, discountPct, discountFlatCents }) {
  const hasDiscount = discountAppliedCents > 0;
  const row = {
    display: 'flex', flexDirection: 'row', justifyContent: 'space-between', padding: '8px 0',
  };
  return h(
    'div',
    { style: { display: 'flex', flexDirection: 'column', padding: '18px 64px 0', borderTop: `2px solid ${INK}`, marginTop: 12 } },
    h('div', { style: row },
      h('div', { style: { fontSize: 20, color: INK } }, 'Subtotal'),
      h('div', { style: { fontFamily: 'JetBrains Mono', fontSize: 20, color: INK } }, dollars(subtotalCents)),
    ),
    hasDiscount && h('div', { style: row },
      h('div', { style: { fontSize: 20, color: AMBER } },
        discountPct ? `Discount · ${discountPct}% off` : `Discount · ${dollars(discountFlatCents)} off`),
      h('div', { style: { fontFamily: 'JetBrains Mono', fontSize: 20, color: AMBER } }, `−${dollars(discountAppliedCents)}`),
    ),
    h('div', { style: { borderTop: `1px solid ${RULE}`, marginTop: 4, marginBottom: 6, width: '100%', height: 1 } }),
    h('div', {
      style: { display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, paddingBottom: 8 },
    },
      h('div', { style: { fontSize: 26, fontWeight: 700, color: INK } }, 'Total'),
      h('div', { style: { fontFamily: 'JetBrains Mono', fontSize: 38, fontWeight: 700, color: CYAN } }, dollars(totalCents)),
    ),
  );
}

function ZelleBlock({ totalCents, invoiceId }) {
  const stepRow = { display: 'flex', flexDirection: 'row', alignItems: 'baseline', marginTop: 6 };
  return h(
    'div',
    {
      style: {
        display: 'flex', flexDirection: 'column', background: INK, padding: '32px 64px', marginTop: 32,
      },
    },
    h('div', {
      style: {
        fontFamily: 'JetBrains Mono', fontSize: 14, color: CYAN,
        letterSpacing: 4, textTransform: 'uppercase',
      },
    }, 'HOW TO PAY'),
    h('div', {
      style: {
        fontFamily: 'Barlow Condensed', fontSize: 38, fontWeight: 900, color: CREAM,
        letterSpacing: 2, textTransform: 'uppercase', marginTop: 10, marginBottom: 18,
      },
    }, 'SEND VIA ZELLE'),
    h('div', { style: { ...stepRow } },
      h('div', { style: { fontFamily: 'JetBrains Mono', fontSize: 18, color: CREAM, opacity: 0.85 } },
        '1. Open Zelle in your bank app'),
    ),
    h('div', { style: stepRow },
      h('div', { style: { fontFamily: 'JetBrains Mono', fontSize: 18, color: CREAM, opacity: 0.85 } }, '2. Send'),
      h('div', { style: { fontFamily: 'JetBrains Mono', fontSize: 18, color: CYAN, fontWeight: 700, marginLeft: 8 } }, dollars(totalCents)),
      h('div', { style: { fontFamily: 'JetBrains Mono', fontSize: 18, color: CREAM, opacity: 0.85, marginLeft: 8 } }, 'to'),
      h('div', { style: { fontFamily: 'JetBrains Mono', fontSize: 18, color: CREAM, fontWeight: 700, marginLeft: 8 } }, '6268064475'),
    ),
    h('div', { style: stepRow },
      h('div', { style: { fontFamily: 'JetBrains Mono', fontSize: 18, color: CREAM, opacity: 0.85 } }, '3. Memo:'),
      h('div', { style: { fontFamily: 'JetBrains Mono', fontSize: 18, color: CREAM, fontWeight: 700, marginLeft: 8 } }, invoiceId),
    ),
    h('div', { style: { marginTop: 14 } },
      h('div', { style: { fontFamily: 'JetBrains Mono', fontSize: 14, color: CREAM, opacity: 0.55 } },
        'Ships in 2–3 business days once payment confirms'),
    ),
  );
}

function LinkStrip({ uuidShort }) {
  return h(
    'div',
    {
      style: {
        display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
        background: BG2, padding: '16px 64px',
      },
    },
    h('div', {
      style: {
        fontFamily: 'JetBrains Mono', fontSize: 14, color: DIM,
        letterSpacing: 3, textTransform: 'uppercase',
      },
    }, 'VIEW FULL INVOICE'),
    h('div', {
      style: {
        fontFamily: 'JetBrains Mono', fontSize: 14, color: DIM,
        marginLeft: 10, marginRight: 10,
      },
    }, '·'),
    h('div', {
      style: {
        fontFamily: 'JetBrains Mono', fontSize: 14, color: CYAN,
      },
    }, `advncelabs.com/invoice/${uuidShort}`),
  );
}

function Footer() {
  return h(
    'div',
    {
      style: {
        display: 'flex', justifyContent: 'center', padding: '16px 64px',
      },
    },
    h('div', {
      style: {
        fontFamily: 'JetBrains Mono', fontSize: 12, color: DIM,
        letterSpacing: 2, opacity: 0.75, textAlign: 'center',
      },
    }, 'ALL PRODUCTS FOR RESEARCH USE ONLY · NOT FOR HUMAN CONSUMPTION · NOT EVALUATED BY THE FDA'),
  );
}

function Invoice(inv) {
  return h(
    'div',
    {
      style: {
        display: 'flex', flexDirection: 'column', width: 1200,
        background: CREAM, color: INK,
      },
    },
    Header({ invoiceId: inv.invoice_id }),
    Title({ issuedAt: inv.issued_at }),
    BillTo({ customer: inv.customer }),
    ItemsTable({ items: inv.items }),
    Totals({
      subtotalCents: inv.subtotal_cents,
      discountAppliedCents: inv.discount_applied_cents,
      totalCents: inv.total_cents,
      discountPct: inv.discount_pct,
      discountFlatCents: inv.discount_flat_cents,
    }),
    ZelleBlock({ totalCents: inv.total_cents, invoiceId: inv.invoice_id }),
    LinkStrip({ uuidShort: inv.uuid_short }),
    Footer(),
  );
}

export async function renderInvoicePng(inv) {
  const f = await loadFonts();
  const response = new ImageResponse(Invoice(inv), {
    width: 1200,
    fonts: [
      { name: 'Barlow Condensed', data: f.bar400,      weight: 400, style: 'normal' },
      { name: 'Barlow Condensed', data: f.bar900,      weight: 900, style: 'normal' },
      { name: 'JetBrains Mono',   data: f.mono400,     weight: 400, style: 'normal' },
      { name: 'Cormorant Garamond', data: f.serifItalic, weight: 300, style: 'italic' },
    ],
  });
  return Buffer.from(await response.arrayBuffer());
}
