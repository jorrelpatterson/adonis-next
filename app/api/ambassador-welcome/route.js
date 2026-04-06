import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { ambassador } = await request.json();
    if (!ambassador) return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    const { name, email, code } = ambassador;
    const RESEND = process.env.RESEND_API_KEY;
    const fn = (name || '').split(' ')[0];

    const css = `body{margin:0;padding:0;background:#f0f0f0;font-family:Arial,sans-serif}.wrap{max-width:600px;margin:0 auto}.header{background:#0A0D14;padding:20px 32px;display:flex;align-items:center;gap:12px;border-radius:6px 6px 0 0}.brand{color:white;font-size:13px;font-weight:300;letter-spacing:3px}.brand span{color:#7A7D88}.body{background:white;padding:40px 32px}.hero-label{font-family:monospace;font-size:10px;color:#7A7D88;letter-spacing:4px;text-transform:uppercase;margin-bottom:8px}.hero-title{font-size:32px;font-weight:900;color:#0A0D14;line-height:1;text-transform:uppercase;letter-spacing:-1px;margin-bottom:20px}.hero-title span{color:#00A0A8}.subtitle{font-size:15px;color:#444;line-height:1.8;margin-bottom:28px}.ibox{background:#0A0D14;border-radius:6px;padding:20px 24px;margin-bottom:12px}.ibox-dark{background:#060810}.ibox-label{font-family:monospace;font-size:9px;color:rgba(255,255,255,0.3);letter-spacing:4px;text-transform:uppercase;margin-bottom:6px}.ibox-val{font-family:monospace;font-size:14px;color:#00A0A8;letter-spacing:1px;word-break:break-all}.ibox-val-lg{font-size:26px;font-weight:900;letter-spacing:2px}.ibox-sub{font-family:monospace;font-size:10px;color:rgba(255,255,255,0.25);letter-spacing:1px;margin-top:6px}.div{height:1px;background:#eee;margin:24px 0}.table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px}.table td{padding:10px 0;border-bottom:1px solid #f0f0f0;vertical-align:middle}.table .label{color:#555}.table .val{text-align:right;font-family:monospace;color:#00A0A8;font-weight:700}.table .muted-val{text-align:right;font-family:monospace;color:#aaa}.table tr:last-child td{border-bottom:none}.badge{display:inline-block;background:#0A0D14;color:#00A0A8;font-family:monospace;font-size:10px;padding:3px 8px;border-radius:4px;letter-spacing:1px}.cta{display:inline-block;background:#0A0D14;color:white;padding:14px 28px;font-size:13px;font-weight:900;text-transform:uppercase;letter-spacing:3px;text-decoration:none;border-radius:4px;margin:8px 0 20px}.highlight{border-left:3px solid #00A0A8;padding:12px 16px;background:#f8fffe;margin:20px 0;font-size:13px;color:#333;line-height:1.7}.sig{font-size:13px;color:#888;line-height:1.8}.footer{background:#0A0D14;padding:20px 32px;text-align:center;border-radius:0 0 6px 6px}.footer p{font-family:monospace;font-size:9px;color:rgba(255,255,255,0.2);letter-spacing:1px;line-height:2}.section-label{font-family:monospace;font-size:9px;color:#aaa;letter-spacing:3px;text-transform:uppercase;margin-bottom:14px}`;

    const logo = '<svg viewBox="0 0 48 28" width="32" height="18" fill="none" style="vertical-align:middle"><path d="M2 24L8 19L14 22L20 14L26 17L32 9L38 12L46 3" stroke="#00A0A8" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/><circle cx="46" cy="3" r="3" fill="#E07C24"/></svg>';

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${css}</style></head><body>
<div class="wrap">
  <div class="header">${logo}<span class="brand">advnce <span>labs</span></span></div>
  <div class="body">
    <div class="hero-label">Ambassador program</div>
    <div class="hero-title">You're in,<br><span>let's get it.</span></div>
    <p class="subtitle">${fn} — you just joined one of the most exclusive ambassador programs in the peptide space. Your link is live, your code is active, and every order through you puts real money in your pocket. This is your moment to own it.</p>
    <div class="ibox">
      <div class="ibox-label">Your referral link</div>
      <div class="ibox-val">advncelabs.com?ref=${code}</div>
      <div class="ibox-sub">Drop this everywhere. Every order = commission in your pocket.</div>
    </div>
    <div class="ibox ibox-dark">
      <div class="ibox-label">Your ambassador code</div>
      <div class="ibox-val ibox-val-lg">${code}</div>
      <div class="ibox-sub">Use this to log into your dashboard and track everything.</div>
    </div>
    <div class="div"></div>
    <div class="section-label">How you get paid</div>
    <table class="table">
      <tr><td class="label">Starter &nbsp;<span class="badge">0–20 orders/mo</span></td><td class="val">10% of gross</td></tr>
      <tr><td class="label">Builder &nbsp;<span class="badge">21–60 orders/mo</span></td><td class="val">15% of gross</td></tr>
      <tr><td class="label">Elite &nbsp;<span class="badge">100+ orders/mo</span></td><td class="val">20% of gross</td></tr>
      <tr><td class="label">Your recruits' sales (L2)</td><td class="muted-val">5%</td></tr>
      <tr><td class="label">Their recruits' sales (L3)</td><td class="muted-val">2.5%</td></tr>
    </table>
    <div class="highlight">The more you grow your network, the more it compounds. Elite ambassadors earning 20% on every order they drive — that's serious passive income.</div>
    <p style="font-size:14px;color:#555;line-height:1.7;margin:20px 0">Payouts hit on the <strong>1st of every month</strong> via Zelle. No delays, no minimums. Check your live earnings anytime from your dashboard.</p>
    <a class="cta" href="https://advncelabs.com/advnce-dashboard.html?code=${code}">View your dashboard →</a>
    <div class="div"></div>
    <p class="sig">Hyped to have you on the team. Let's build something real together.<br><br>— Jorrel<br>advnce labs</p>
  </div>
  <div class="footer"><p>advncelabs.com · orders@advncelabs.com<br>ALL PRODUCTS FOR RESEARCH USE ONLY · NOT FOR HUMAN CONSUMPTION · NOT EVALUATED BY THE FDA</p></div>
</div></body></html>`;

    const adminHtml = `<html><body style="font-family:monospace;padding:40px;background:#1A1C22;color:white"><h2 style="color:#00A0A8">New Ambassador: ${name}</h2><p>Email: ${email}</p><p>Code: <span style="color:#00A0A8;font-size:20px">${code}</span></p><p>Link: advncelabs.com?ref=${code}</p></body></html>`;

    const [a, b] = await Promise.all([
      fetch('https://api.resend.com/emails', { method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+RESEND}, body: JSON.stringify({ from:'advnce labs <orders@advncelabs.com>', to:'jorrelpatterson@gmail.com', subject:'New Ambassador: '+name+' ('+code+')!', html:adminHtml }) }),
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
