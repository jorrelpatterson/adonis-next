// Generates the HTML body for a purchase-order email.
// Input shape:
//   po: { po_number, total_cost, notes }
//   vendor: { name }
//   items: [{ sku, name, size, qty_ordered, unit_cost }]
//   shipping_address: multi-line string

const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

const LOGO_SVG = '<svg viewBox="0 0 48 28" width="32" height="18" fill="none" style="vertical-align:middle"><path d="M2 24L8 19L14 22L20 14L26 17L32 9L38 12L46 3" stroke="#00A0A8" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/><circle cx="46" cy="3" r="3" fill="#E07C24"/></svg>';

export function renderPoEmail({ po, vendor, items, shipping_address }) {
  const itemsHtml = items.map(i => {
    const lineTotal = (Number(i.qty_ordered) * Number(i.unit_cost)).toFixed(2);
    return `<tr>
      <td style="padding:8px;border-bottom:1px solid #eee;font-family:monospace;font-size:11px;color:#555">${esc(i.sku)}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;font-size:13px;color:#0F1928">${esc(i.name)}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;font-size:11px;color:#7A7D88">${esc(i.size)}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;font-family:monospace;font-size:13px">${i.qty_ordered}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;font-family:monospace;font-size:13px">$${Number(i.unit_cost).toFixed(2)}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;font-family:monospace;font-size:13px;color:#0F1928;font-weight:700">$${lineTotal}</td>
    </tr>`;
  }).join('');

  const shipLines = String(shipping_address || '').split('\n').map(esc).join('<br>');
  const notesBlock = po.notes
    ? `<div style="border-left:3px solid #00A0A8;padding:12px 16px;background:#f8fffe;margin:20px 0;font-size:13px;color:#333;line-height:1.7"><strong>Notes:</strong><br>${esc(po.notes)}</div>`
    : '';

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f0f0f0;font-family:Arial,sans-serif">
<div style="max-width:640px;margin:0 auto;background:white">
  <div style="background:#0A0D14;padding:20px 32px;display:flex;align-items:center;gap:12px">
    ${LOGO_SVG}<span style="color:white;font-size:13px;font-weight:300;letter-spacing:3px">advnce <span style="color:#7A7D88">labs</span></span>
  </div>
  <div style="padding:40px 32px">
    <p style="font-family:monospace;font-size:10px;color:#7A7D88;letter-spacing:4px;text-transform:uppercase;margin-bottom:8px">Purchase order</p>
    <h1 style="font-size:28px;font-weight:900;color:#0A0D14;text-transform:uppercase;letter-spacing:-1px;margin:0 0 24px">${esc(po.po_number)}</h1>
    <div style="background:#0A0D14;border-radius:6px;padding:20px 24px;margin-bottom:20px">
      <div style="font-family:monospace;font-size:9px;color:rgba(255,255,255,0.3);letter-spacing:4px;text-transform:uppercase;margin-bottom:6px">Vendor</div>
      <div style="font-size:18px;color:white;font-weight:700">${esc(vendor.name)}</div>
    </div>
    <div style="display:flex;gap:16px;margin-bottom:24px">
      <div style="flex:1;padding:16px;border:1px solid #eee;border-radius:6px">
        <div style="font-family:monospace;font-size:9px;color:#7A7D88;letter-spacing:3px;text-transform:uppercase;margin-bottom:8px">Ship to</div>
        <div style="font-family:monospace;font-size:12px;color:#0A0D14;line-height:1.7">${shipLines}</div>
      </div>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
      <thead><tr style="background:#f4f4f4">
        <th style="padding:8px;text-align:left;font-size:10px;color:#7A7D88;letter-spacing:1px;text-transform:uppercase;font-family:monospace">SKU</th>
        <th style="padding:8px;text-align:left;font-size:10px;color:#7A7D88;letter-spacing:1px;text-transform:uppercase;font-family:monospace">Product</th>
        <th style="padding:8px;text-align:left;font-size:10px;color:#7A7D88;letter-spacing:1px;text-transform:uppercase;font-family:monospace">Size</th>
        <th style="padding:8px;text-align:right;font-size:10px;color:#7A7D88;letter-spacing:1px;text-transform:uppercase;font-family:monospace">Qty (kits)</th>
        <th style="padding:8px;text-align:right;font-size:10px;color:#7A7D88;letter-spacing:1px;text-transform:uppercase;font-family:monospace">Unit cost</th>
        <th style="padding:8px;text-align:right;font-size:10px;color:#7A7D88;letter-spacing:1px;text-transform:uppercase;font-family:monospace">Line total</th>
      </tr></thead>
      <tbody>${itemsHtml}</tbody>
      <tfoot><tr><td colspan="5" style="padding:16px 8px 8px;text-align:right;font-weight:700;color:#0A0D14">Total</td><td style="padding:16px 8px 8px;text-align:right;font-family:monospace;font-size:18px;color:#00A0A8;font-weight:900">$${Number(po.total_cost || 0).toFixed(2)}</td></tr></tfoot>
    </table>
    ${notesBlock}
    <p style="font-size:13px;color:#7A7D88;margin-top:32px">Reply to this email or contact <a href="mailto:orders@advncelabs.com" style="color:#00A0A8">orders@advncelabs.com</a> with questions.</p>
  </div>
  <div style="background:#0A0D14;padding:20px 32px;text-align:center">
    <p style="font-family:monospace;font-size:9px;color:rgba(255,255,255,0.2);letter-spacing:1px;line-height:2">advncelabs.com · orders@advncelabs.com</p>
  </div>
</div></body></html>`;
}
