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
  <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;500;700;900&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <title>You're in, let's get it.</title>
</head>
<body style="margin:0;padding:0;background:#E8E6E2;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px">

    <div style="background:#F4F2EE;border-bottom:1px solid #E4E7EC;padding:20px 32px;border-radius:6px 6px 0 0;display:flex;align-items:center;gap:10px">
      ${logo}
      <span style="font-family:'Barlow Condensed',Arial,sans-serif;font-size:15px;font-weight:300;letter-spacing:3px;color:#1A1C22;text-transform:lowercase">advnce <span style="color:#7A7D88;font-weight:300">labs</span></span>
    </div>

    <div style="background:#F4F2EE;padding:44px 40px">

      <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#7A7D88;letter-spacing:4px;text-transform:uppercase;margin-bottom:12px">Ambassador program</div>
      <h1 style="font-family:'Barlow Condensed',Arial,sans-serif;font-size:40px;font-weight:900;color:#1A1C22;line-height:1.02;letter-spacing:-0.5px;text-transform:uppercase;margin:0 0 20px">You're in,<br><span style="color:#00A0A8">let's get it.</span></h1>

      <p style="font-family:'Cormorant Garamond',Georgia,serif;font-size:18px;font-weight:300;color:#1A1C22;line-height:1.65;margin:0 0 26px">${fn} &mdash; welcome to one of the most exclusive ambassador programs in the peptide space. Your link is live, your code is active, and every order through you puts real money in your pocket. <strong style="font-weight:400">This is your moment to own it.</strong></p>

      <div style="border:1px solid #E4E7EC;background:#FAFBFC;border-radius:4px;padding:16px 20px;margin-bottom:10px">
        <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#7A7D88;letter-spacing:4px;text-transform:uppercase;margin-bottom:8px">Your referral link</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:14px;color:#00A0A8;letter-spacing:0.5px;word-break:break-all">advncelabs.com?ref=${code}</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#7A7D88;letter-spacing:1px;margin-top:6px">Drop this anywhere. Every click → tracked to you.</div>
      </div>

      <div style="border:1px solid #E4E7EC;background:#F4F2EE;border-radius:4px;padding:20px;margin-bottom:10px;text-align:center">
        <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#7A7D88;letter-spacing:4px;text-transform:uppercase;margin-bottom:8px">Your ambassador code</div>
        <div style="font-family:'Barlow Condensed',Arial,sans-serif;font-size:32px;font-weight:900;color:#00A0A8;letter-spacing:4px;line-height:1;margin-bottom:6px">${code}</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#7A7D88;letter-spacing:1px">Use this to sign into your dashboard anytime.</div>
      </div>

      <div style="height:1px;background:#E4E7EC;margin:30px 0"></div>

      <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#7A7D88;letter-spacing:3px;text-transform:uppercase;margin-bottom:14px">What happens when someone uses your link</div>
      <div style="background:#FAFBFC;border:1px solid #E4E7EC;border-radius:4px;padding:18px 22px">
        <table style="width:100%;border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1A1C22;line-height:1.55">
          <tr><td style="padding:2px 12px 10px 0;vertical-align:top;font-family:'JetBrains Mono',monospace;font-size:10px;color:#00A0A8;letter-spacing:2px;width:32px">01</td><td style="padding:2px 0 10px">They click <strong style="color:#00A0A8">advncelabs.com?ref=${code}</strong> and land on the site.</td></tr>
          <tr><td style="padding:2px 12px 10px 0;vertical-align:top;font-family:'JetBrains Mono',monospace;font-size:10px;color:#00A0A8;letter-spacing:2px">02</td><td style="padding:2px 0 10px">First order at that link: customer gets <strong style="color:#00A0A8">15% off</strong>, you get <strong style="color:#00A0A8">15% commission</strong>.</td></tr>
          <tr><td style="padding:2px 12px 0 0;vertical-align:top;font-family:'JetBrains Mono',monospace;font-size:10px;color:#00A0A8;letter-spacing:2px">03</td><td style="padding:2px 0">Every repeat order from that customer: commission at your tier &mdash; forever.</td></tr>
        </table>
      </div>

      <div style="height:1px;background:#E4E7EC;margin:30px 0"></div>

      <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#7A7D88;letter-spacing:3px;text-transform:uppercase;margin-bottom:14px">How the program works</div>
      <table style="width:100%;border-collapse:separate;border-spacing:1px;background:#E4E7EC;border:1px solid #E4E7EC;margin-bottom:0">
        <tr>
          <td style="background:#F4F2EE;padding:14px 16px;width:50%;vertical-align:top">
            <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#00A0A8;letter-spacing:2px;margin-bottom:4px">01</div>
            <div style="font-family:'Barlow Condensed',Arial,sans-serif;font-size:16px;font-weight:700;color:#1A1C22;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Apply</div>
            <div style="font-family:Arial,sans-serif;font-size:13px;color:#1A1C22;line-height:1.5">Done. You're in. Your link + code are above.</div>
          </td>
          <td style="background:#F4F2EE;padding:14px 16px;width:50%;vertical-align:top">
            <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#00A0A8;letter-spacing:2px;margin-bottom:4px">02</div>
            <div style="font-family:'Barlow Condensed',Arial,sans-serif;font-size:16px;font-weight:700;color:#1A1C22;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Share</div>
            <div style="font-family:Arial,sans-serif;font-size:13px;color:#1A1C22;line-height:1.5">Social, DMs, group chats, content. Any click traces back to you.</div>
          </td>
        </tr>
        <tr>
          <td style="background:#F4F2EE;padding:14px 16px;vertical-align:top">
            <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#00A0A8;letter-spacing:2px;margin-bottom:4px">03</div>
            <div style="font-family:'Barlow Condensed',Arial,sans-serif;font-size:16px;font-weight:700;color:#1A1C22;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Earn</div>
            <div style="font-family:Arial,sans-serif;font-size:13px;color:#1A1C22;line-height:1.5">Commission logs the moment an order lands. Paid monthly via Zelle.</div>
          </td>
          <td style="background:#F4F2EE;padding:14px 16px;vertical-align:top">
            <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#00A0A8;letter-spacing:2px;margin-bottom:4px">04</div>
            <div style="font-family:'Barlow Condensed',Arial,sans-serif;font-size:16px;font-weight:700;color:#1A1C22;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Recruit</div>
            <div style="font-family:Arial,sans-serif;font-size:13px;color:#1A1C22;line-height:1.5">Anyone who joins with your code earns you on their sales too &mdash; 3 levels deep.</div>
          </td>
        </tr>
      </table>

      <div style="height:1px;background:#E4E7EC;margin:30px 0"></div>

      <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#7A7D88;letter-spacing:3px;text-transform:uppercase;margin-bottom:14px">Your commission tiers</div>
      <table style="width:100%;border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;font-size:13px">
        <tr><td style="padding:12px 0;border-bottom:1px solid #E4E7EC;color:#1A1C22">Starter &nbsp;<span style="display:inline-block;background:#1A1C22;color:#F4F2EE;font-family:'JetBrains Mono',monospace;font-size:10px;padding:3px 8px;border-radius:3px;letter-spacing:1px">0&ndash;20 orders/mo</span></td><td style="padding:12px 0;border-bottom:1px solid #E4E7EC;text-align:right;font-family:'JetBrains Mono',monospace;color:#00A0A8;font-weight:700">10% of gross</td></tr>
        <tr><td style="padding:12px 0;border-bottom:1px solid #E4E7EC;color:#1A1C22">Builder &nbsp;<span style="display:inline-block;background:#1A1C22;color:#F4F2EE;font-family:'JetBrains Mono',monospace;font-size:10px;padding:3px 8px;border-radius:3px;letter-spacing:1px">21&ndash;60 orders/mo</span></td><td style="padding:12px 0;border-bottom:1px solid #E4E7EC;text-align:right;font-family:'JetBrains Mono',monospace;color:#00A0A8;font-weight:700">15% of gross</td></tr>
        <tr><td style="padding:12px 0;border-bottom:1px solid #E4E7EC;color:#1A1C22">Elite &nbsp;<span style="display:inline-block;background:#1A1C22;color:#F4F2EE;font-family:'JetBrains Mono',monospace;font-size:10px;padding:3px 8px;border-radius:3px;letter-spacing:1px">100+ orders/mo</span></td><td style="padding:12px 0;border-bottom:1px solid #E4E7EC;text-align:right;font-family:'JetBrains Mono',monospace;color:#00A0A8;font-weight:700">20% of gross</td></tr>
      </table>
      <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#7A7D88;letter-spacing:1px;margin-top:8px;line-height:1.6">At $120 avg/order: Starter tops ~$240/mo &middot; Builder ~$1,080/mo &middot; Elite $2,400+/mo before recruits.</div>

      <div style="height:1px;background:#E4E7EC;margin:30px 0"></div>

      <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#7A7D88;letter-spacing:3px;text-transform:uppercase;margin-bottom:14px">Network income (the compounding part)</div>
      <div style="border-left:3px solid #00A0A8;padding:14px 18px;background:#FAFBFC;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1A1C22;line-height:1.65">
        <strong style="color:#00A0A8">Your recruits (L2):</strong> anyone who signs up with your code. You earn <strong style="color:#00A0A8">5%</strong> of every sale they make. Forever.<br><br>
        <strong style="color:#00A0A8">Their recruits (L3):</strong> anyone who signs up with your L2's code. You earn <strong style="color:#00A0A8">2.5%</strong> of their sales too.<br><br>
        Build a team of 5 active Builders and you're earning on 300+ orders/month without making any sales yourself.
      </div>

      <div style="height:1px;background:#E4E7EC;margin:30px 0"></div>

      <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#7A7D88;letter-spacing:3px;text-transform:uppercase;margin-bottom:14px">Where to drop your link</div>
      <table style="width:100%;border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1A1C22">
        <tr><td style="padding:8px 0;border-bottom:1px solid #E4E7EC"><span style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#7A7D88;letter-spacing:2px;text-transform:uppercase;margin-right:10px">IG / TikTok</span>Bio link &mdash; replace whatever's there.</td></tr>
        <tr><td style="padding:8px 0;border-bottom:1px solid #E4E7EC"><span style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#7A7D88;letter-spacing:2px;text-transform:uppercase;margin-right:10px">DMs</span>When anyone asks where you get your peptides, send the link.</td></tr>
        <tr><td style="padding:8px 0;border-bottom:1px solid #E4E7EC"><span style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#7A7D88;letter-spacing:2px;text-transform:uppercase;margin-right:10px">Group chats</span>Gym, research, biohacking groups you're already in.</td></tr>
        <tr><td style="padding:8px 0;border-bottom:1px solid #E4E7EC"><span style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#7A7D88;letter-spacing:2px;text-transform:uppercase;margin-right:10px">Content</span>Research notes, protocol breakdowns, before/afters.</td></tr>
        <tr><td style="padding:8px 0"><span style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#7A7D88;letter-spacing:2px;text-transform:uppercase;margin-right:10px">Stories</span>Every restock. Screenshot → link in story.</td></tr>
      </table>
      <a href="https://advncelabs.com/advnce-asset-kit.html" style="display:inline-block;color:#00A0A8;font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:1px;text-decoration:underline;margin-top:10px">Grab ready-made graphics from the asset kit &rarr;</a>

      <div style="height:1px;background:#E4E7EC;margin:30px 0"></div>

      <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#7A7D88;letter-spacing:3px;text-transform:uppercase;margin-bottom:14px">Rules (short list)</div>
      <ul style="margin:0;padding-left:18px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1A1C22;line-height:1.8">
        <li>Speak in research-use-only language. No medical claims, no "this cured my&hellip;", no "you should take&hellip;"</li>
        <li>No Google/Meta ads on the "advnce labs" brand name &mdash; it cannibalizes our own traffic.</li>
        <li>No spammy cold DMs to strangers. Trust is the whole business.</li>
      </ul>

      <div style="height:1px;background:#E4E7EC;margin:30px 0"></div>

      <a href="https://advncelabs.com/advnce-dashboard.html?code=${code}" style="display:inline-block;background:#00A0A8;color:#F4F2EE;font-family:'Barlow Condensed',Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:3px;text-transform:uppercase;text-decoration:none;padding:14px 28px;border-radius:3px;margin:0 0 12px">View your dashboard &rarr;</a>

      <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#7A7D88;line-height:1.8;margin:18px 0 0">Questions? Reply to this email or hit <a href="mailto:ambassadors@advncelabs.com" style="color:#00A0A8">ambassadors@advncelabs.com</a>.<br><br>&mdash; Jorrel<br>advnce labs</p>

    </div>

    <div style="background:#1A1C22;padding:20px 32px;border-radius:0 0 6px 6px;text-align:center">
      <p style="font-family:'JetBrains Mono',monospace;font-size:9px;color:rgba(244,242,238,0.35);letter-spacing:1.5px;line-height:2.2;margin:0;text-transform:uppercase">advncelabs.com &middot; ambassadors@advncelabs.com<br>All products for research use only &middot; Not for human consumption &middot; Not evaluated by the FDA</p>
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
