import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../lib/requireAdmin';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request) {
  const unauth = requireAdmin(request); if (unauth) return unauth;
  try {
    const { ambassador } = await request.json();
    if (!ambassador) return NextResponse.json({ error:'Missing data' }, { status:400 });
    const { id: ambassadorId, name, email, code, period, l1_amount, l2_amount, l3_amount } = ambassador;
    if (!ambassadorId || !UUID_RE.test(ambassadorId)) {
      return NextResponse.json({ error:'Missing or invalid ambassador.id' }, { status:400 });
    }
    if (!period || typeof period !== 'string') {
      return NextResponse.json({ error:'Missing period' }, { status:400 });
    }
    const RESEND = process.env.RESEND_API_KEY;
    const fn = (name || '').split(' ')[0];
    const l1 = parseFloat(l1_amount||0), l2 = parseFloat(l2_amount||0), l3 = parseFloat(l3_amount||0);
    const total = (l1+l2+l3).toFixed(2);

    const logo = '<svg viewBox="0 0 48 28" width="36" height="21" fill="none" style="vertical-align:middle;display:inline-block"><path d="M2 24L8 19L14 22L20 14L26 17L32 9L38 12L46 3" stroke="#00A0A8" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/><circle cx="32" cy="9" r="2" fill="#00A0A8"/><circle cx="38" cy="12" r="2" fill="#E07C24"/><circle cx="46" cy="3" r="2.5" fill="#E07C24"/></svg>';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;700;900&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
  <title>Money is moving.</title>
</head>
<body style="margin:0;padding:0;background:#E8E6E2;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px">

    <div style="background:#F4F2EE;border-bottom:1px solid #E4E7EC;padding:20px 32px;border-radius:6px 6px 0 0;display:flex;align-items:center;gap:10px">
      ${logo}
      <span style="font-family:'Barlow Condensed',Arial,sans-serif;font-size:15px;font-weight:300;letter-spacing:3px;color:#1A1C22;text-transform:lowercase">advnce <span style="color:#7A7D88;font-weight:300">labs</span></span>
    </div>

    <div style="background:#F4F2EE;padding:48px 40px">

      <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#7A7D88;letter-spacing:4px;text-transform:uppercase;margin-bottom:12px">Monthly payout</div>
      <h1 style="font-family:'Barlow Condensed',Arial,sans-serif;font-size:40px;font-weight:900;color:#1A1C22;line-height:1.02;letter-spacing:-0.5px;text-transform:uppercase;margin:0 0 24px">Money<br><span style="color:#00A0A8">is moving.</span></h1>

      <p style="font-family:'Cormorant Garamond',Georgia,serif;font-size:18px;font-weight:300;color:#1A1C22;line-height:1.75;margin:0 0 32px">${fn} &mdash; ${period} is settled and your commission is on the way via Zelle. <strong style="font-weight:400">Keep stacking.</strong></p>

      <div style="border:1px solid #E4E7EC;background:#F4F2EE;border-radius:4px;padding:32px 24px;margin-bottom:12px;text-align:center">
        <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#7A7D88;letter-spacing:4px;text-transform:uppercase;margin-bottom:10px">Total payout</div>
        <div style="font-family:'Barlow Condensed',Arial,sans-serif;font-size:48px;font-weight:900;color:#00A0A8;letter-spacing:-1px;line-height:1;margin:4px 0">$${total}</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#7A7D88;letter-spacing:2px;margin-top:10px">${period} &middot; SENT VIA ZELLE</div>
      </div>

      <div style="height:1px;background:#E4E7EC;margin:32px 0"></div>

      <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#7A7D88;letter-spacing:3px;text-transform:uppercase;margin-bottom:16px">Breakdown</div>
      <table style="width:100%;border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;font-size:13px;margin-bottom:24px">
        <tr><td style="padding:12px 0;border-bottom:1px solid #E4E7EC;color:#1A1C22">Direct sales (L1)</td><td style="padding:12px 0;border-bottom:1px solid #E4E7EC;text-align:right;font-family:'JetBrains Mono',monospace;color:#00A0A8;font-weight:700">$${l1.toFixed(2)}</td></tr>
        <tr><td style="padding:12px 0;border-bottom:1px solid #E4E7EC;color:#1A1C22">Recruit sales override (L2)</td><td style="padding:12px 0;border-bottom:1px solid #E4E7EC;text-align:right;font-family:'JetBrains Mono',monospace;color:#7A7D88">$${l2.toFixed(2)}</td></tr>
        <tr><td style="padding:12px 0;color:#1A1C22">L3 overrides</td><td style="padding:12px 0;text-align:right;font-family:'JetBrains Mono',monospace;color:#7A7D88">$${l3.toFixed(2)}</td></tr>
      </table>

      <div style="border-left:3px solid #00A0A8;padding:14px 18px;background:#FAFBFC;margin:24px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1A1C22;line-height:1.7">Your network is earning for you even when you're not posting. That L2 and L3 coming in is the compound effect in real time.</div>

      <p style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1A1C22;line-height:1.7;margin:22px 0">Track your full earnings history, upcoming commissions, and referral stats from your dashboard. Next month is already in motion.</p>

      <a href="https://advncelabs.com/advnce-dashboard.html?code=${code}" style="display:inline-block;background:#00A0A8;color:#F4F2EE;font-family:'Barlow Condensed',Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:3px;text-transform:uppercase;text-decoration:none;padding:14px 28px;border-radius:3px;margin:8px 0 20px">View dashboard &rarr;</a>

      <div style="height:1px;background:#E4E7EC;margin:30px 0"></div>

      <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#7A7D88;line-height:1.8;margin:0">Appreciate you grinding, ${fn}. See you at the top.<br><br>&mdash; advnce labs</p>

    </div>

    <div style="background:#1A1C22;padding:20px 32px;border-radius:0 0 6px 6px;text-align:center">
      <p style="font-family:'JetBrains Mono',monospace;font-size:9px;color:rgba(244,242,238,0.35);letter-spacing:1.5px;line-height:2.2;margin:0;text-transform:uppercase">advncelabs.com &middot; orders@advncelabs.com<br>All products for research use only &middot; Not for human consumption &middot; Not evaluated by the FDA</p>
    </div>

  </div>
</body>
</html>`;

    const res = await fetch('https://api.resend.com/emails', { method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+RESEND}, body: JSON.stringify({ from:'advnce labs <orders@advncelabs.com>', to:email, subject:'Your advnce labs payout for '+period+' — $'+total+'!', html }) });
    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error:'Resend error', detail:data }, { status:500 });

    // Audit log insert (non-fatal — email has already sent)
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
    let warning = null;
    try {
      const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/ambassador_payouts`, {
        method:'POST',
        headers:{
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Content-Type':'application/json',
          'Prefer':'return=minimal',
        },
        body: JSON.stringify({
          ambassador_id: ambassadorId,
          period,
          l1_amount: l1,
          l2_amount: l2,
          l3_amount: l3,
          total: parseFloat(total),
        }),
      });
      if (insertRes.status === 409) warning = `Payout already recorded for ${period}`;
      else if (!insertRes.ok) warning = `Audit log insert failed: ${insertRes.status}`;
    } catch(e) {
      warning = `Audit log error: ${e.message}`;
    }

    return NextResponse.json({ success:true, warning });
  } catch(err) {
    return NextResponse.json({ error:err.message }, { status:500 });
  }
}

export async function GET() {
  return NextResponse.json({ status:'ambassador-payout route is live' });
}
