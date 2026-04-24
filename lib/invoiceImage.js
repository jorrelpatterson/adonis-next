// Renders an invoice PNG matching the approved mockup.
// Uses sharp's SVG-to-PNG rasterization — no headless browser, no external service.

import sharp from 'sharp';

const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function dollars(cents) {
  return '$' + (cents / 100).toFixed(2);
}

// Build the invoice as an SVG document. Height adapts to line count.
function buildSvg(inv) {
  const W = 1200;
  const PAD = 72;
  const rowH = 68;

  const headerH = 110;
  const titleH = 196;
  const toH = 130;
  const itemsHeader = 20;
  const itemsH = inv.items.length * rowH + 20;
  const hasDiscount = inv.discount_applied_cents > 0;
  const totalsH = 210 + (hasDiscount ? 42 : 0);
  const zelleH = 250;
  const linkH = 64;
  const footH = 54;
  const H = headerH + titleH + toH + itemsHeader + itemsH + totalsH + zelleH + linkH + footH;

  const ink = '#1A1C22', cream = '#F4F2EE', cyan = '#00A0A8', amber = '#E07C24',
        dim = '#7A7D88', bg2 = '#ECEAE4', rule = 'rgba(0,0,0,0.08)';

  // Items
  let itemsSvg = '';
  let y = headerH + titleH + toH + itemsHeader + 30;
  for (const it of inv.items) {
    const priceLine = '$' + (it.price * it.qty).toFixed(2);
    const sub = `${(it.size || '').toUpperCase()} · ${String(it.sku).toUpperCase()} · QTY ${it.qty}`;
    itemsSvg += `
      <text x="${PAD}" y="${y}" font-family="sans-serif" font-size="24" font-weight="700" fill="${ink}">${esc(it.name)}</text>
      <text x="${PAD}" y="${y + 26}" font-family="monospace" font-size="15" fill="${dim}" letter-spacing="1.5">${esc(sub)}</text>
      <text x="${W - PAD}" y="${y + 10}" font-family="monospace" font-size="24" fill="${ink}" text-anchor="end">${priceLine}</text>
      <line x1="${PAD}" y1="${y + 42}" x2="${W - PAD}" y2="${y + 42}" stroke="${rule}" stroke-width="1"/>`;
    y += rowH;
  }

  // Totals
  const totalsStartY = headerH + titleH + toH + itemsHeader + itemsH + 44;
  let totalsSvg = `<line x1="${PAD}" y1="${totalsStartY - 18}" x2="${W - PAD}" y2="${totalsStartY - 18}" stroke="${ink}" stroke-width="2"/>`;
  let ty = totalsStartY + 14;
  totalsSvg += `
    <text x="${PAD}" y="${ty}" font-family="sans-serif" font-size="22" fill="${ink}">Subtotal</text>
    <text x="${W - PAD}" y="${ty}" font-family="monospace" font-size="22" fill="${ink}" text-anchor="end">${dollars(inv.subtotal_cents)}</text>`;
  ty += 40;
  if (hasDiscount) {
    const discLabel = inv.discount_pct
      ? `Discount · ${inv.discount_pct}% off`
      : `Discount · ${dollars(inv.discount_flat_cents)} off`;
    totalsSvg += `
      <text x="${PAD}" y="${ty}" font-family="sans-serif" font-size="22" fill="${amber}">${esc(discLabel)}</text>
      <text x="${W - PAD}" y="${ty}" font-family="monospace" font-size="22" fill="${amber}" text-anchor="end">−${dollars(inv.discount_applied_cents)}</text>`;
    ty += 40;
  }
  totalsSvg += `
    <line x1="${PAD}" y1="${ty - 10}" x2="${W - PAD}" y2="${ty - 10}" stroke="${rule}" stroke-width="1"/>
    <text x="${PAD}" y="${ty + 32}" font-family="sans-serif" font-size="30" font-weight="700" fill="${ink}">Total</text>
    <text x="${W - PAD}" y="${ty + 32}" font-family="monospace" font-size="40" font-weight="700" fill="${cyan}" text-anchor="end">${dollars(inv.total_cents)}</text>`;

  // Zelle block
  const zelleStartY = H - linkH - footH - zelleH;
  const zelleSvg = `
    <rect x="0" y="${zelleStartY}" width="${W}" height="${zelleH}" fill="${ink}"/>
    <text x="${PAD}" y="${zelleStartY + 50}" font-family="monospace" font-size="20" fill="${cyan}" letter-spacing="4">HOW TO PAY</text>
    <text x="${PAD}" y="${zelleStartY + 98}" font-family="sans-serif" font-size="40" font-weight="900" fill="${cream}" letter-spacing="2">SEND VIA ZELLE</text>
    <text x="${PAD}" y="${zelleStartY + 140}" font-family="monospace" font-size="22" fill="${cream}" opacity="0.85">1. Open Zelle in your bank app</text>
    <text x="${PAD}" y="${zelleStartY + 174}" font-family="monospace" font-size="22" fill="${cream}" opacity="0.85">2. Send <tspan fill="${cyan}" font-weight="700">${dollars(inv.total_cents)}</tspan> to <tspan font-weight="700">6268064475</tspan></text>
    <text x="${PAD}" y="${zelleStartY + 208}" font-family="monospace" font-size="22" fill="${cream}" opacity="0.85">3. Memo: <tspan font-weight="700">${esc(inv.invoice_id)}</tspan></text>
    <text x="${PAD}" y="${zelleStartY + 240}" font-family="monospace" font-size="17" fill="${cream}" opacity="0.55">Ships in 2–3 business days once payment confirms</text>`;

  // Link strip
  const linkY = zelleStartY + zelleH;
  const linkSvg = `
    <rect x="0" y="${linkY}" width="${W}" height="${linkH}" fill="${bg2}"/>
    <text x="${W/2}" y="${linkY + 40}" font-family="monospace" font-size="18" fill="${dim}" text-anchor="middle" letter-spacing="3">VIEW FULL INVOICE · <tspan fill="${cyan}">advncelabs.com/invoice/${esc(inv.uuid_short)}</tspan></text>`;

  // Footer
  const footY = linkY + linkH;
  const footSvg = `
    <text x="${W/2}" y="${footY + 34}" font-family="monospace" font-size="14" fill="${dim}" text-anchor="middle" letter-spacing="2" opacity="0.7">ALL PRODUCTS FOR RESEARCH USE ONLY · NOT FOR HUMAN CONSUMPTION · NOT EVALUATED BY THE FDA</text>`;

  // Header + title + bill-to + from
  const head = `
    <rect width="${W}" height="${H}" fill="${cream}"/>
    <rect x="0" y="0" width="${W}" height="${headerH}" fill="${ink}"/>
    <text x="${PAD}" y="${headerH/2 + 16}" font-family="sans-serif" font-size="36" font-weight="900" fill="${cream}" letter-spacing="5">advnce <tspan fill="${dim}" font-weight="300">labs</tspan></text>
    <text x="${W - PAD}" y="${headerH/2 + 12}" font-family="monospace" font-size="20" fill="${dim}" text-anchor="end" letter-spacing="4">INVOICE · ${esc(String(inv.invoice_id).toUpperCase())}</text>
    <text x="${PAD}" y="${headerH + 74}" font-family="serif" font-size="76" font-weight="300" fill="${ink}">Order <tspan fill="${cyan}" font-style="italic">Summary.</tspan></text>
    <text x="${PAD}" y="${headerH + 116}" font-family="monospace" font-size="17" fill="${dim}" letter-spacing="3">ISSUED ${esc(inv.issued_at)}  ·  DUE WITHIN 48 HOURS</text>
    <line x1="${PAD}" y1="${headerH + titleH - 42}" x2="${W - PAD}" y2="${headerH + titleH - 42}" stroke="${rule}" stroke-width="1"/>
    <text x="${PAD}" y="${headerH + titleH - 10}" font-family="monospace" font-size="14" fill="${dim}" letter-spacing="3">BILL TO</text>
    <text x="${W - PAD}" y="${headerH + titleH - 10}" font-family="monospace" font-size="14" fill="${dim}" text-anchor="end" letter-spacing="3">FROM</text>
    <text x="${PAD}" y="${headerH + titleH + 28}" font-family="sans-serif" font-size="24" font-weight="700" fill="${ink}">${esc(inv.customer.name)}</text>
    <text x="${PAD}" y="${headerH + titleH + 58}" font-family="sans-serif" font-size="19" fill="${ink}">${esc(inv.customer.address_line1)}</text>
    <text x="${PAD}" y="${headerH + titleH + 86}" font-family="sans-serif" font-size="19" fill="${ink}">${esc(inv.customer.address_line2)}</text>
    <text x="${W - PAD}" y="${headerH + titleH + 28}" font-family="sans-serif" font-size="24" font-weight="700" fill="${ink}" text-anchor="end">advnce labs</text>
    <text x="${W - PAD}" y="${headerH + titleH + 58}" font-family="sans-serif" font-size="19" fill="${ink}" text-anchor="end">orders@advncelabs.com</text>
    <text x="${W - PAD}" y="${headerH + titleH + 86}" font-family="sans-serif" font-size="19" fill="${ink}" text-anchor="end">advncelabs.com</text>
    <line x1="${PAD}" y1="${headerH + titleH + toH - 22}" x2="${W - PAD}" y2="${headerH + titleH + toH - 22}" stroke="${rule}" stroke-width="1"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${head}${itemsSvg}${totalsSvg}${zelleSvg}${linkSvg}${footSvg}</svg>`;
}

export async function renderInvoicePng(inv) {
  const svg = buildSvg(inv);
  return await sharp(Buffer.from(svg)).png().toBuffer();
}

export { buildSvg };
