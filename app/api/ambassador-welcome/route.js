import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../lib/requireAdmin';

export async function POST(request) {
  const unauth = requireAdmin(request); if (unauth) return unauth;
  try {
    const { ambassador } = await request.json();
    if (!ambassador) return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    const { name, email, code } = ambassador;
    const RESEND = process.env.RESEND_API_KEY;
    const fn = (name || '').split(' ')[0];

    const logo = '<svg viewBox="0 0 48 28" width="36" height="21" fill="none" style="vertical-align:middle;display:inline-block"><path d="M2 24L8 19L14 22L20 14L26 17L32 9L38 12L46 3" stroke="#00A0A8" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/><circle cx="32" cy="9" r="2" fill="#00A0A8"/><circle cx="38" cy="12" r="2" fill="#E07C24"/><circle cx="46" cy="3" r="2.5" fill="#E07C24"/></svg>';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;700;900&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
  <title>You're in, let's get it.</title>
</head>
<body style="margin:0;padding:0;background:#E8E6E2;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px">

    <div style="background:#F4F2EE;border-bottom:1px solid #E4E7EC;padding:20px 32px;border-radius:6px 6px 0 0;display:flex;align-items:center;gap:10px">
      ${logo}
      <span style="font-family:'Barlow Condensed',Arial,sans-serif;font-size:15px;font-weight:300;letter-spacing:3px;color:#1A1C22;text-transform:lowercase">advnce <span style="color:#7A7D88;font-weight:300">labs</span></span>
    </div>

    <div style="background:#F4F2EE;padding:48px 40px">

      <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#7A7D88;letter-spacing:4px;text-transform:uppercase;margin-bottom:12px">Ambassador program</div>
      <h1 style="font-family:'Barlow Condensed',Arial,sans-serif;font-size:40px;font-weight:900;color:#1A1C22;line-height:1.02;letter-spacing:-0.5px;text-transform:uppercase;margin:0 0 24px">You're in,<br><span style="color:#00A0A8">let's get it.</span></h1>

      <p style="font-family:'Cormorant Garamond',Georgia,serif;font-size:18px;font-weight:300;color:#1A1C22;line-height:1.75;margin:0 0 32px">${fn} &mdash; you just joined one of the most exclusive ambassador programs in the peptide space. Your link is live, your code is active, and every order through you puts real money in your pocket. <strong style="font-weight:400">This is your moment to own it.</strong></p>

      <div style="border:1px solid #E4E7EC;background:#FAFBFC;border-radius:4px;padding:20px 24px;margin-bottom:12px">
        <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#7A7D88;letter-spacing:4px;text-transform:uppercase;margin-bottom:8px">Your referral link</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:14px;color:#00A0A8;letter-spacing:0.5px;word-break:break-all">advncelabs.com?ref=${code}</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#7A7D88;letter-spacing:1px;margin-top:8px">Drop this everywhere. Every order = commission in your pocket.</div>
      </div>

      <div style="border:1px solid #E4E7EC;background:#F4F2EE;border-radius:4px;padding:24px;margin-bottom:12px;text-align:center">
        <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#7A7D88;letter-spacing:4px;text-transform:uppercase;margin-bottom:10px">Your ambassador code</div>
        <div style="font-family:'Barlow Condensed',Arial,sans-serif;font-size:36px;font-weight:900;color:#00A0A8;letter-spacing:4px;line-height:1;margin-bottom:10px">${code}</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#7A7D88;letter-spacing:1px">Use this to log into your dashboard and track everything.</div>
      </div>

      <div style="height:1px;background:#E4E7EC;margin:32px 0"></div>

      <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#7A7D88;letter-spacing:3px;text-transform:uppercase;margin-bottom:16px">How you get paid</div>
      <table style="width:100%;border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;font-size:13px;margin-bottom:24px">
        <tr><td style="padding:12px 0;border-bottom:1px solid #E4E7EC;color:#1A1C22">Starter &nbsp;<span style="display:inline-block;background:#1A1C22;color:#F4F2EE;font-family:'JetBrains Mono',monospace;font-size:10px;padding:3px 8px;border-radius:3px;letter-spacing:1px">0&ndash;20 orders/mo</span></td><td style="padding:12px 0;border-bottom:1px solid #E4E7EC;text-align:right;font-family:'JetBrains Mono',monospace;color:#00A0A8;font-weight:700">10% of gross</td></tr>
        <tr><td style="padding:12px 0;border-bottom:1px solid #E4E7EC;color:#1A1C22">Builder &nbsp;<span style="display:inline-block;background:#1A1C22;color:#F4F2EE;font-family:'JetBrains Mono',monospace;font-size:10px;padding:3px 8px;border-radius:3px;letter-spacing:1px">21&ndash;60 orders/mo</span></td><td style="padding:12px 0;border-bottom:1px solid #E4E7EC;text-align:right;font-family:'JetBrains Mono',monospace;color:#00A0A8;font-weight:700">15% of gross</td></tr>
        <tr><td style="padding:12px 0;border-bottom:1px solid #E4E7EC;color:#1A1C22">Elite &nbsp;<span style="display:inline-block;background:#1A1C22;color:#F4F2EE;font-family:'JetBrains Mono',monospace;font-size:10px;padding:3px 8px;border-radius:3px;letter-spacing:1px">100+ orders/mo</span></td><td style="padding:12px 0;border-bottom:1px solid #E4E7EC;text-align:right;font-family:'JetBrains Mono',monospace;color:#00A0A8;font-weight:700">20% of gross</td></tr>
        <tr><td style="padding:12px 0;border-bottom:1px solid #E4E7EC;color:#1A1C22">Your recruits' sales (L2)</td><td style="padding:12px 0;border-bottom:1px solid #E4E7EC;text-align:right;font-family:'JetBrains Mono',monospace;color:#7A7D88">5%</td></tr>
        <tr><td style="padding:12px 0;color:#1A1C22">Their recruits' sales (L3)</td><td style="padding:12px 0;text-align:right;font-family:'JetBrains Mono',monospace;color:#7A7D88">2.5%</td></tr>
      </table>

      <div style="border-left:3px solid #00A0A8;padding:14px 18px;background:#FAFBFC;margin:24px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1A1C22;line-height:1.7">The more you grow your network, the more it compounds. Elite ambassadors earning 20% on every order they drive &mdash; that's serious passive income.</div>

      <p style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1A1C22;line-height:1.7;margin:22px 0">Payouts hit on the <strong>1st of every month</strong> via Zelle. No delays, no minimums. Check your live earnings anytime from your dashboard.</p>

      <a href="https://advncelabs.com/advnce-dashboard.html?code=${code}" style="display:inline-block;background:#00A0A8;color:#F4F2EE;font-family:'Barlow Condensed',Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:3px;text-transform:uppercase;text-decoration:none;padding:14px 28px;border-radius:3px;margin:8px 0 20px">View your dashboard &rarr;</a>

      <div style="height:1px;background:#E4E7EC;margin:30px 0"></div>

      <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#7A7D88;line-height:1.8;margin:0">Hyped to have you on the team. Let's build something real together.<br><br>&mdash; Jorrel<br>advnce labs</p>

    </div>

    <div style="background:#1A1C22;padding:20px 32px;border-radius:0 0 6px 6px;text-align:center">
      <p style="font-family:'JetBrains Mono',monospace;font-size:9px;color:rgba(244,242,238,0.35);letter-spacing:1.5px;line-height:2.2;margin:0;text-transform:uppercase">advncelabs.com &middot; orders@advncelabs.com<br>All products for research use only &middot; Not for human consumption &middot; Not evaluated by the FDA</p>
    </div>

  </div>
</body>
</html>`;

    const adminHtml = `<html><body style="font-family:monospace;padding:40px;background:#1A1C22;color:white"><h2 style="color:#00A0A8">New Ambassador: ${name}</h2><p>Email: ${email}</p><p>Code: <span style="color:#00A0A8;font-size:20px">${code}</span></p><p>Link: advncelabs.com?ref=${code}</p></body></html>`;

    const [a, b] = await Promise.all([
      fetch('https://api.resend.com/emails', { method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+RESEND}, body: JSON.stringify({ from:'advnce labs <orders@advncelabs.com>', to: process.env.ADMIN_EMAIL || 'jorrelpatterson@gmail.com', subject:'New Ambassador: '+name+' ('+code+')!', html:adminHtml }) }),
      fetch('https://api.resend.com/emails', { method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+RESEND}, body: JSON.stringify({ from:'advnce labs <orders@advncelabs.com>', to:email, subject:'Your advnce labs ambassador link is live!', html }) })
    ]);
    const ad = await a.json(), bd = await b.json();
    if (!a.ok || !b.ok) return NextResponse.json({ error:'Resend error', admin:ad, welcome:bd }, { status:500 });
    return NextResponse.json({ success:true });
  } catch(err) {
    return NextResponse.json({ error:err.message }, { status:500 });
  }
}

export async function GET() {
  return NextResponse.json({ status:'ambassador-welcome route is live' });
}
