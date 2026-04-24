// Invoice PNG renderer — next/og (satori + resvg) for Vercel-safe font rendering.
// Every div explicitly sets `display: flex` since satori is strict about it
// when divs have multiple children.

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
    fontPromise = null;
    throw err;
  });
  return fontPromise;
}

// --- Style helpers --------------------------------------------------------

const col  = { display: 'flex', flexDirection: 'column' };
const row  = { display: 'flex', flexDirection: 'row' };
const rowSpread = { display: 'flex', flexDirection: 'row', justifyContent: 'space-between' };

// --- Invoice layout -------------------------------------------------------

function Invoice(inv) {
  const hasDiscount = inv.discount_applied_cents > 0;
  const discountLabel = inv.discount_pct
    ? `Discount · ${inv.discount_pct}% off`
    : `Discount · ${dollars(inv.discount_flat_cents)} off`;

  return h(
    'div',
    {
      style: {
        ...col,
        width: 1200,
        background: CREAM,
        color: INK,
      },
    },
    // ─ HEADER ──────────────────────────────────────────
    h(
      'div',
      {
        style: {
          ...rowSpread,
          alignItems: 'center',
          background: INK,
          padding: '28px 64px',
        },
      },
      h('div', {
        style: {
          display: 'flex',
          fontFamily: 'Barlow Condensed',
          fontSize: 36,
          fontWeight: 900,
          letterSpacing: 5,
          textTransform: 'lowercase',
          color: CREAM,
        },
      }, 'advnce labs'),
      h('div', {
        style: {
          display: 'flex',
          fontFamily: 'JetBrains Mono',
          fontSize: 16,
          color: DIM,
          letterSpacing: 3,
          textTransform: 'uppercase',
        },
      }, `INVOICE · ${String(inv.invoice_id).toUpperCase()}`),
    ),

    // ─ TITLE + META ────────────────────────────────────
    h(
      'div',
      { style: { ...col, padding: '40px 64px 22px' } },
      h('div', {
        style: {
          display: 'flex',
          fontFamily: 'Cormorant Garamond',
          fontStyle: 'italic',
          fontWeight: 300,
          fontSize: 72,
          lineHeight: 1,
        },
      }, 'Order Summary.'),
      h('div', {
        style: {
          display: 'flex',
          fontFamily: 'JetBrains Mono',
          fontSize: 13,
          color: DIM,
          letterSpacing: 3,
          textTransform: 'uppercase',
          marginTop: 14,
        },
      }, `ISSUED ${inv.issued_at}  ·  DUE WITHIN 48 HOURS`),
    ),

    // ─ BILL TO / FROM ──────────────────────────────────
    h(
      'div',
      {
        style: {
          ...rowSpread,
          padding: '18px 64px',
          borderTop: `1px solid ${RULE}`,
          borderBottom: `1px solid ${RULE}`,
        },
      },
      h(
        'div',
        { style: col },
        h('div', {
          style: {
            display: 'flex',
            fontFamily: 'JetBrains Mono',
            fontSize: 11,
            color: DIM,
            letterSpacing: 3,
            textTransform: 'uppercase',
            marginBottom: 8,
          },
        }, 'BILL TO'),
        h('div', {
          style: { display: 'flex', fontSize: 20, fontWeight: 700 },
        }, inv.customer.name),
        h('div', {
          style: { display: 'flex', fontSize: 16, marginTop: 4 },
        }, inv.customer.address_line1),
        h('div', {
          style: { display: 'flex', fontSize: 16, marginTop: 2 },
        }, inv.customer.address_line2),
      ),
      h(
        'div',
        { style: { ...col, alignItems: 'flex-end' } },
        h('div', {
          style: {
            display: 'flex',
            fontFamily: 'JetBrains Mono',
            fontSize: 11,
            color: DIM,
            letterSpacing: 3,
            textTransform: 'uppercase',
            marginBottom: 8,
          },
        }, 'FROM'),
        h('div', { style: { display: 'flex', fontSize: 20, fontWeight: 700 } }, 'advnce labs'),
        h('div', { style: { display: 'flex', fontSize: 16, marginTop: 4 } }, 'orders@advncelabs.com'),
        h('div', { style: { display: 'flex', fontSize: 16, marginTop: 2 } }, 'advncelabs.com'),
      ),
    ),

    // ─ ITEMS ───────────────────────────────────────────
    h(
      'div',
      { style: { ...col, padding: '10px 64px 0' } },
      ...inv.items.map((it, i) => h(
        'div',
        {
          key: i,
          style: {
            ...rowSpread,
            alignItems: 'flex-start',
            padding: '14px 0',
            borderBottom: `1px solid rgba(0,0,0,0.06)`,
          },
        },
        h(
          'div',
          { style: col },
          h('div', {
            style: { display: 'flex', fontSize: 22, fontWeight: 700 },
          }, it.name),
          h('div', {
            style: {
              display: 'flex',
              fontFamily: 'JetBrains Mono',
              fontSize: 13,
              color: DIM,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              marginTop: 4,
            },
          }, `${(it.size || '').toUpperCase()} · ${String(it.sku).toUpperCase()} · QTY ${it.qty}`),
        ),
        h('div', {
          style: {
            display: 'flex',
            fontFamily: 'JetBrains Mono',
            fontSize: 22,
          },
        }, '$' + (it.price * it.qty).toFixed(2)),
      )),
    ),

    // ─ TOTALS ──────────────────────────────────────────
    h(
      'div',
      {
        style: {
          ...col,
          padding: '14px 64px 0',
          borderTop: `2px solid ${INK}`,
          marginTop: 12,
        },
      },
      h(
        'div',
        { style: { ...rowSpread, padding: '6px 0' } },
        h('div', { style: { display: 'flex', fontSize: 20 } }, 'Subtotal'),
        h('div', {
          style: { display: 'flex', fontFamily: 'JetBrains Mono', fontSize: 20 },
        }, dollars(inv.subtotal_cents)),
      ),
      hasDiscount
        ? h(
            'div',
            { style: { ...rowSpread, padding: '6px 0' } },
            h('div', { style: { display: 'flex', fontSize: 20, color: AMBER } }, discountLabel),
            h('div', {
              style: { display: 'flex', fontFamily: 'JetBrains Mono', fontSize: 20, color: AMBER },
            }, `−${dollars(inv.discount_applied_cents)}`),
          )
        : null,
      h(
        'div',
        {
          style: {
            ...rowSpread,
            alignItems: 'center',
            borderTop: `1px solid ${RULE}`,
            marginTop: 4,
            paddingTop: 14,
            paddingBottom: 10,
          },
        },
        h('div', { style: { display: 'flex', fontSize: 26, fontWeight: 700 } }, 'Total'),
        h('div', {
          style: {
            display: 'flex',
            fontFamily: 'JetBrains Mono',
            fontSize: 38,
            fontWeight: 700,
            color: CYAN,
          },
        }, dollars(inv.total_cents)),
      ),
    ),

    // ─ ZELLE BLOCK ─────────────────────────────────────
    h(
      'div',
      {
        style: {
          ...col,
          background: INK,
          padding: '32px 64px',
          marginTop: 28,
        },
      },
      h('div', {
        style: {
          display: 'flex',
          fontFamily: 'JetBrains Mono',
          fontSize: 14,
          color: CYAN,
          letterSpacing: 4,
          textTransform: 'uppercase',
        },
      }, 'HOW TO PAY'),
      h('div', {
        style: {
          display: 'flex',
          fontFamily: 'Barlow Condensed',
          fontSize: 38,
          fontWeight: 900,
          color: CREAM,
          letterSpacing: 2,
          textTransform: 'uppercase',
          marginTop: 10,
          marginBottom: 18,
        },
      }, 'SEND VIA ZELLE'),
      h('div', {
        style: {
          display: 'flex',
          fontFamily: 'JetBrains Mono',
          fontSize: 18,
          color: CREAM,
          opacity: 0.85,
          marginTop: 4,
        },
      }, '1. Open Zelle in your bank app'),
      h('div', {
        style: {
          display: 'flex',
          fontFamily: 'JetBrains Mono',
          fontSize: 18,
          color: CREAM,
          opacity: 0.85,
          marginTop: 4,
        },
      }, `2. Send ${dollars(inv.total_cents)} to 6268064475`),
      h('div', {
        style: {
          display: 'flex',
          fontFamily: 'JetBrains Mono',
          fontSize: 18,
          color: CREAM,
          opacity: 0.85,
          marginTop: 4,
        },
      }, `3. Memo: ${inv.invoice_id}`),
      h('div', {
        style: {
          display: 'flex',
          fontFamily: 'JetBrains Mono',
          fontSize: 14,
          color: CREAM,
          opacity: 0.55,
          marginTop: 14,
        },
      }, 'Ships in 2–3 business days once payment confirms'),
    ),

    // ─ LINK STRIP ──────────────────────────────────────
    h(
      'div',
      {
        style: {
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: BG2,
          padding: '16px 64px',
        },
      },
      h('div', {
        style: {
          display: 'flex',
          fontFamily: 'JetBrains Mono',
          fontSize: 14,
          color: DIM,
          letterSpacing: 3,
          textTransform: 'uppercase',
        },
      }, `VIEW FULL INVOICE · advncelabs.com/invoice/${inv.url_tail}`),
    ),

    // ─ FOOTER ──────────────────────────────────────────
    h(
      'div',
      { style: { display: 'flex', justifyContent: 'center', padding: '16px 64px' } },
      h('div', {
        style: {
          display: 'flex',
          fontFamily: 'JetBrains Mono',
          fontSize: 12,
          color: DIM,
          letterSpacing: 2,
          opacity: 0.75,
          textAlign: 'center',
        },
      }, 'ALL PRODUCTS FOR RESEARCH USE ONLY · NOT FOR HUMAN CONSUMPTION · NOT EVALUATED BY THE FDA'),
    ),
  );
}

export async function renderInvoicePng(inv) {
  const f = await loadFonts();
  const response = new ImageResponse(Invoice(inv), {
    width: 1200,
    fonts: [
      { name: 'Barlow Condensed',   data: f.bar400,      weight: 400, style: 'normal' },
      { name: 'Barlow Condensed',   data: f.bar900,      weight: 900, style: 'normal' },
      { name: 'JetBrains Mono',     data: f.mono400,     weight: 400, style: 'normal' },
      { name: 'Cormorant Garamond', data: f.serifItalic, weight: 300, style: 'italic' },
    ],
  });
  return Buffer.from(await response.arrayBuffer());
}
