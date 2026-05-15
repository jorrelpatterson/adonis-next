import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../lib/requireAdmin';

const esc = (s) => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

export async function POST(request) {
  const unauth = requireAdmin(request); if (unauth) return unauth;
  try {
    const { ambassador, subject, message } = await request.json();
    if (!ambassador || !subject || !message) return NextResponse.json({ error:'Missing data' }, { status:400 });
    const { name, email, code } = ambassador;
    const RESEND = process.env.RESEND_API_KEY;
    const fn = esc((name || '').split(' ')[0]);
    const safeCode = esc(code);
    const msgHtml = esc(message).replace(/\n/g, '<br>');

    const logo = '<svg viewBox="0 0 48 28" width="36" height="21" fill="none" style="vertical-align:middle;display:inline-block"><path d="M2 24L8 19L14 22L20 14L26 17L32 9L38 12L46 3" stroke="#00A0A8" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/><circle cx="32" cy="9" r="2" fill="#00A0A8"/><circle cx="38" cy="12" r="2" fill="#E07C24"/><circle cx="46" cy="3" r="2.5" fill="#E07C24"/></svg>';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;700;900&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
  <title>${esc(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#E8E6E2;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px">

    <div style="background:#F4F2EE;border-bottom:1px solid #E4E7EC;padding:20px 32px;border-radius:6px 6px 0 0;display:flex;align-items:center;gap:10px">
      ${logo}
      <span style="font-family:'Barlow Condensed',Arial,sans-serif;font-size:15px;font-weight:300;letter-spacing:3px;color:#1A1C22;text-transform:lowercase">advnce <span style="color:#7A7D88;font-weight:300">labs</span></span>
    </div>

    <div style="background:#F4F2EE;padding:44px 40px">
      <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#7A7D88;letter-spacing:4px;text-transform:uppercase;margin-bottom:14px">From advnce labs</div>
      <p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1A1C22;margin:0 0 22px">Hey ${fn},</p>
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1A1C22;line-height:1.85">${msgHtml}</div>

      <div style="height:1px;background:#E4E7EC;margin:30px 0"></div>

      <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#7A7D88;letter-spacing:3px;text-transform:uppercase;margin-bottom:8px">Your referral link</div>
      <p style="font-family:'JetBrains Mono',monospace;font-size:13px;color:#00A0A8;margin:0">advncelabs.com?ref=${safeCode}</p>

      <div style="height:1px;background:#E4E7EC;margin:28px 0"></div>

      <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#7A7D88;line-height:1.8;margin:0">&mdash; advnce labs</p>
    </div>

    <div style="background:#1A1C22;padding:20px 32px;border-radius:0 0 6px 6px;text-align:center">
      <p style="font-family:'JetBrains Mono',monospace;font-size:9px;color:rgba(244,242,238,0.35);letter-spacing:1.5px;line-height:2.2;margin:0;text-transform:uppercase">advncelabs.com &middot; orders@advncelabs.com<br>All products for research use only &middot; Not for human consumption &middot; Not evaluated by the FDA</p>
    </div>

  </div>
</body>
</html>`;

    const res = await fetch('https://api.resend.com/emails', { method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+RESEND}, body: JSON.stringify({ from:'advnce labs <orders@advncelabs.com>', to:email, subject, html }) });
    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error:'Resend error', detail:data }, { status:500 });
    return NextResponse.json({ success:true });
  } catch(err) {
    return NextResponse.json({ error:err.message }, { status:500 });
  }
}

export async function GET() {
  return NextResponse.json({ status:'ambassador-message route is live' });
}
