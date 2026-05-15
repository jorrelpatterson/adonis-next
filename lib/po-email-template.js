// Generates the HTML body for a purchase-order email sent to vendors.
// Cream brand palette (see docs/brand/advncelabs-brand-identity.md).
// Input shape:
//   po: { po_number, total_cost, notes }
//   vendor: { name }
//   items: [{ sku, name, size, qty_ordered, unit_cost }]
//   shipping_address: multi-line string

const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

const LOGO_SVG = '<svg viewBox="0 0 48 28" width="36" height="21" fill="none" style="vertical-align:middle;display:inline-block"><path d="M2 24L8 19L14 22L20 14L26 17L32 9L38 12L46 3" stroke="#00A0A8" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/><circle cx="32" cy="9" r="2" fill="#00A0A8"/><circle cx="38" cy="12" r="2" fill="#E07C24"/><circle cx="46" cy="3" r="2.5" fill="#E07C24"/></svg>';

export function renderPoEmail({ po, vendor, items, shipping_address }) {
  const itemsHtml = items.map(i => {
    const lineTotal = (Number(i.qty_ordered) * Number(i.unit_cost)).toFixed(2);
    return `<tr>
      <td style="padding:10px;border-bottom:1px solid #E4E7EC;font-family:'JetBrains Mono',monospace;font-size:11px;color:#7A7D88">${esc(i.sku)}</td>
      <td style="padding:10px;border-bottom:1px solid #E4E7EC;font-size:13px;color:#1A1C22">${esc(i.name)}</td>
      <td style="padding:10px;border-bottom:1px solid #E4E7EC;font-size:11px;color:#7A7D88">${esc(i.size)}</td>
      <td style="padding:10px;border-bottom:1px solid #E4E7EC;text-align:right;font-family:'JetBrains Mono',monospace;font-size:13px;color:#1A1C22">${i.qty_ordered}</td>
      <td style="padding:10px;border-bottom:1px solid #E4E7EC;text-align:right;font-family:'JetBrains Mono',monospace;font-size:13px;color:#1A1C22">$${Number(i.unit_cost).toFixed(2)}</td>
      <td style="padding:10px;border-bottom:1px solid #E4E7EC;text-align:right;font-family:'JetBrains Mono',monospace;font-size:13px;color:#00A0A8;font-weight:700">$${lineTotal}</td>
    </tr>`;
  }).join('');

  const shipLines = String(shipping_address || '').split('\n').map(esc).join('<br>');
  const notesBlock = po.notes
    ? `<div style="border-left:3px solid #00A0A8;padding:14px 18px;background:#FAFBFC;margin:22px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1A1C22;line-height:1.7"><strong>Notes:</strong><br>${esc(po.notes)}</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;700;900&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
  <title>Purchase Order ${esc(po.po_number)}</title>
</head>
<body style="margin:0;padding:0;background:#E8E6E2;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:680px;margin:0 auto;padding:24px 16px">

  <div style="background:#F4F2EE;border-bottom:1px solid #E4E7EC;padding:20px 32px;border-radius:6px 6px 0 0;display:flex;align-items:center;gap:10px">
    ${LOGO_SVG}<span style="font-family:'Barlow Condensed',Arial,sans-serif;font-size:15px;font-weight:300;letter-spacing:3px;color:#1A1C22;text-transform:lowercase">advnce <span style="color:#7A7D88;font-weight:300">labs</span></span>
  </div>

  <div style="background:#F4F2EE;padding:40px 32px">
    <p style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#7A7D88;letter-spacing:4px;text-transform:uppercase;margin:0 0 10px">Purchase order</p>
    <h1 style="font-family:'Barlow Condensed',Arial,sans-serif;font-size:32px;font-weight:900;color:#1A1C22;text-transform:uppercase;letter-spacing:-0.5px;margin:0 0 24px">${esc(po.po_number)}</h1>

    <div style="border:1px solid #E4E7EC;background:#FAFBFC;border-radius:4px;padding:18px 22px;margin-bottom:22px">
      <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#7A7D88;letter-spacing:4px;text-transform:uppercase;margin-bottom:6px">Vendor</div>
      <div style="font-family:'Barlow Condensed',Arial,sans-serif;font-size:20px;color:#1A1C22;font-weight:700;letter-spacing:0.5px;text-transform:uppercase">${esc(vendor.name)}</div>
    </div>

    <div style="border:1px solid #E4E7EC;background:#FAFBFC;border-radius:4px;padding:18px 22px;margin-bottom:24px">
      <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#7A7D88;letter-spacing:3px;text-transform:uppercase;margin-bottom:8px">Ship to</div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#1A1C22;line-height:1.8">${shipLines}</div>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
      <thead><tr style="background:#FAFBFC">
        <th style="padding:10px;text-align:left;font-family:'JetBrains Mono',monospace;font-size:10px;color:#7A7D88;letter-spacing:1px;text-transform:uppercase;border-bottom:2px solid #E4E7EC">SKU</th>
        <th style="padding:10px;text-align:left;font-family:'JetBrains Mono',monospace;font-size:10px;color:#7A7D88;letter-spacing:1px;text-transform:uppercase;border-bottom:2px solid #E4E7EC">Product</th>
        <th style="padding:10px;text-align:left;font-family:'JetBrains Mono',monospace;font-size:10px;color:#7A7D88;letter-spacing:1px;text-transform:uppercase;border-bottom:2px solid #E4E7EC">Size</th>
        <th style="padding:10px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:10px;color:#7A7D88;letter-spacing:1px;text-transform:uppercase;border-bottom:2px solid #E4E7EC">Qty (kits)</th>
        <th style="padding:10px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:10px;color:#7A7D88;letter-spacing:1px;text-transform:uppercase;border-bottom:2px solid #E4E7EC">Unit cost</th>
        <th style="padding:10px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:10px;color:#7A7D88;letter-spacing:1px;text-transform:uppercase;border-bottom:2px solid #E4E7EC">Line total</th>
      </tr></thead>
      <tbody>${itemsHtml}</tbody>
      <tfoot><tr><td colspan="5" style="padding:18px 10px 10px;text-align:right;font-family:'Barlow Condensed',Arial,sans-serif;font-weight:700;color:#1A1C22;letter-spacing:1px;text-transform:uppercase">Total</td><td style="padding:18px 10px 10px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:20px;color:#00A0A8;font-weight:900">$${Number(po.total_cost || 0).toFixed(2)}</td></tr></tfoot>
    </table>
    ${notesBlock}
    <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#7A7D88;line-height:1.7;margin-top:32px">Reply to this email or contact <a href="mailto:orders@advncelabs.com" style="color:#00A0A8;text-decoration:none">orders@advncelabs.com</a> with questions.</p>
  </div>

  <div style="background:#1A1C22;padding:20px 32px;border-radius:0 0 6px 6px;text-align:center">
    <p style="font-family:'JetBrains Mono',monospace;font-size:9px;color:rgba(244,242,238,0.35);letter-spacing:1.5px;line-height:2.2;margin:0;text-transform:uppercase">advncelabs.com &middot; orders@advncelabs.com</p>
  </div>

</div>
</body>
</html>`;
}
