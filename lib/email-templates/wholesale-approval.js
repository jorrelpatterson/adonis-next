// lib/email-templates/wholesale-approval.js
// Cream-luxe email matching ambassador-welcome's visual identity.

export function wholesaleApprovalHtml({ business_name, contact_name, login_code }) {
  const firstName = (contact_name || '').split(' ')[0] || 'there';
  const logo =
    '<svg viewBox="0 0 48 28" width="36" height="21" fill="none" style="vertical-align:middle;display:inline-block"><path d="M2 24L8 19L14 22L20 14L26 17L32 9L38 12L46 3" stroke="#00A0A8" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/><circle cx="32" cy="9" r="2" fill="#00A0A8"/><circle cx="38" cy="12" r="2" fill="#E07C24"/><circle cx="46" cy="3" r="2.5" fill="#E07C24"/></svg>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;500;700;900&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <title>Welcome to advnce labs Wholesale</title>
</head>
<body style="margin:0;padding:0;background:#E8E6E2;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px">

    <div style="background:#F4F2EE;border-bottom:1px solid #E4E7EC;padding:20px 32px;border-radius:6px 6px 0 0;display:flex;align-items:center;gap:10px">
      ${logo}
      <span style="font-family:'Barlow Condensed',Arial,sans-serif;font-size:15px;font-weight:300;letter-spacing:3px;color:#1A1C22;text-transform:lowercase">advnce <span style="color:#7A7D88;font-weight:300">labs</span></span>
    </div>

    <div style="background:#F4F2EE;padding:44px 40px">

      <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#7A7D88;letter-spacing:4px;text-transform:uppercase;margin-bottom:12px">Wholesale program</div>
      <h1 style="font-family:'Barlow Condensed',Arial,sans-serif;font-size:40px;font-weight:900;color:#1A1C22;line-height:1.02;letter-spacing:-0.5px;text-transform:uppercase;margin:0 0 20px">You're approved.<br><span style="color:#00A0A8">Let's build.</span></h1>

      <p style="font-family:'Cormorant Garamond',Georgia,serif;font-size:18px;font-weight:300;color:#1A1C22;line-height:1.65;margin:0 0 26px">${escapeHtml(firstName)} &mdash; welcome to advnce labs wholesale. Your current pricing sheet is attached to this email. Reference it any time you're placing an order &mdash; pricing is per-SKU based on quantity ordered.</p>

      <div style="border:1px solid #E4E7EC;background:#FAFBFC;border-radius:4px;padding:16px 20px;margin-bottom:10px">
        <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#7A7D88;letter-spacing:4px;text-transform:uppercase;margin-bottom:8px">Your wholesale login code</div>
        <div style="font-family:'Barlow Condensed',Arial,sans-serif;font-size:28px;font-weight:900;color:#00A0A8;letter-spacing:4px;line-height:1">${escapeHtml(login_code || '—')}</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#7A7D88;letter-spacing:1px;margin-top:8px">Save this. You'll use it when the wholesale portal launches.</div>
      </div>

      <div style="height:1px;background:#E4E7EC;margin:30px 0"></div>

      <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#7A7D88;letter-spacing:3px;text-transform:uppercase;margin-bottom:14px">How to order today</div>
      <table style="width:100%;border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1A1C22;line-height:1.55">
        <tr><td style="padding:2px 12px 10px 0;vertical-align:top;font-family:'JetBrains Mono',monospace;font-size:10px;color:#00A0A8;letter-spacing:2px;width:32px">01</td><td style="padding:2px 0 10px">Pick what you need + quantities from the attached sheet.</td></tr>
        <tr><td style="padding:2px 12px 10px 0;vertical-align:top;font-family:'JetBrains Mono',monospace;font-size:10px;color:#00A0A8;letter-spacing:2px">02</td><td style="padding:2px 0 10px">Reply to this email with your order &mdash; we'll send an invoice for payment.</td></tr>
        <tr><td style="padding:2px 12px 0 0;vertical-align:top;font-family:'JetBrains Mono',monospace;font-size:10px;color:#00A0A8;letter-spacing:2px">03</td><td style="padding:2px 0">Once paid, your order ships in <strong style="color:#00A0A8">7&ndash;14 business days</strong>.</td></tr>
      </table>

      <div style="height:1px;background:#E4E7EC;margin:30px 0"></div>

      <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#7A7D88;letter-spacing:3px;text-transform:uppercase;margin-bottom:14px">House rules</div>
      <ul style="margin:0;padding-left:18px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1A1C22;line-height:1.8">
        <li>Minimum order: 10 units per SKU. No exceptions.</li>
        <li>All products for research / professional use only. Not for human consumption.</li>
        <li>Pricing on the attached sheet supersedes any prior pricing.</li>
      </ul>

      <div style="height:1px;background:#E4E7EC;margin:30px 0"></div>

      <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#7A7D88;line-height:1.8;margin:18px 0 0">Questions? Reply to this email or hit <a href="mailto:wholesale@advncelabs.com" style="color:#00A0A8">wholesale@advncelabs.com</a>.<br><br>&mdash; Jorrel<br>advnce labs</p>

    </div>

    <div style="background:#1A1C22;padding:20px 32px;border-radius:0 0 6px 6px;text-align:center">
      <p style="font-family:'JetBrains Mono',monospace;font-size:9px;color:rgba(244,242,238,0.35);letter-spacing:1.5px;line-height:2.2;margin:0;text-transform:uppercase">advncelabs.com &middot; wholesale@advncelabs.com<br>All products for research use only &middot; Not for human consumption &middot; Not evaluated by the FDA</p>
    </div>

  </div>
</body>
</html>`;
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
