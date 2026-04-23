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

    const css = `body{margin:0;padding:0;background:#f0f0f0;font-family:Arial,sans-serif}.wrap{max-width:600px;margin:0 auto}.header{background:#0A0D14;padding:20px 32px;display:flex;align-items:center;gap:12px;border-radius:6px 6px 0 0}.brand{color:white;font-size:13px;font-weight:300;letter-spacing:3px}.brand span{color:#7A7D88}.body{background:white;padding:40px 32px}.hero-label{font-family:monospace;font-size:10px;color:#7A7D88;letter-spacing:4px;text-transform:uppercase;margin-bottom:8px}.hero-title{font-size:32px;font-weight:900;color:#0A0D14;line-height:1;text-transform:uppercase;letter-spacing:-1px;margin-bottom:20px}.hero-title span{color:#00A0A8}.subtitle{font-size:15px;color:#444;line-height:1.8;margin-bottom:28px}.ibox{background:#0A0D14;border-radius:6px;padding:28px 24px;margin-bottom:12px;text-align:center}.ibox-label{font-family:monospace;font-size:9px;color:rgba(255,255,255,0.3);letter-spacing:4px;text-transform:uppercase;margin-bottom:8px}.payout-total{font-family:monospace;font-size:40px;font-weight:900;color:#00A0A8;margin:4px 0}.payout-period{font-family:monospace;font-size:11px;color:rgba(255,255,255,0.3);letter-spacing:2px}.div{height:1px;background:#eee;margin:24px 0}.table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px}.table td{padding:10px 0;border-bottom:1px solid #f0f0f0;vertical-align:middle}.table .label{color:#555}.table .val{text-align:right;font-family:monospace;color:#00A0A8;font-weight:700}.table .muted-val{text-align:right;font-family:monospace;color:#aaa}.table tr:last-child td{border-bottom:none}.cta{display:inline-block;background:#0A0D14;color:white;padding:14px 28px;font-size:13px;font-weight:900;text-transform:uppercase;letter-spacing:3px;text-decoration:none;border-radius:4px;margin:8px 0 20px}.highlight{border-left:3px solid #00A0A8;padding:12px 16px;background:#f8fffe;margin:20px 0;font-size:13px;color:#333;line-height:1.7}.sig{font-size:13px;color:#888;line-height:1.8}.footer{background:#0A0D14;padding:20px 32px;text-align:center;border-radius:0 0 6px 6px}.footer p{font-family:monospace;font-size:9px;color:rgba(255,255,255,0.2);letter-spacing:1px;line-height:2}.section-label{font-family:monospace;font-size:9px;color:#aaa;letter-spacing:3px;text-transform:uppercase;margin-bottom:14px}`;

    const logo = '<svg viewBox="0 0 48 28" width="32" height="18" fill="none" style="vertical-align:middle"><path d="M2 24L8 19L14 22L20 14L26 17L32 9L38 12L46 3" stroke="#00A0A8" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/><circle cx="46" cy="3" r="3" fill="#E07C24"/></svg>';

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${css}</style></head><body>
<div class="wrap">
  <div class="header">${logo}<span class="brand">advnce <span>labs</span></span></div>
  <div class="body">
    <div class="hero-label">Monthly payout</div>
    <div class="hero-title">Money<br><span>is moving.</span></div>
    <p class="subtitle">${fn} — ${period} is settled and your commission is on the way via Zelle. This is what showing up looks like. Keep stacking.</p>
    <div class="ibox">
      <div class="ibox-label">Total payout</div>
      <div class="payout-total">$${total}</div>
      <div class="payout-period">${period} · Sent via Zelle</div>
    </div>
    <div class="div"></div>
    <div class="section-label">Breakdown</div>
    <table class="table">
      <tr><td class="label">Direct sales (L1)</td><td class="val">$${l1.toFixed(2)}</td></tr>
      <tr><td class="label">Recruit sales override (L2)</td><td class="muted-val">$${l2.toFixed(2)}</td></tr>
      <tr><td class="label">L3 overrides</td><td class="muted-val">$${l3.toFixed(2)}</td></tr>
    </table>
    <div class="highlight">Your network is earning for you even when you're not posting. That L2 and L3 coming in is the compound effect in real time.</div>
    <p style="font-size:14px;color:#555;line-height:1.7;margin:20px 0">Track your full earnings history, upcoming commissions, and referral stats from your dashboard. Next month is already in motion.</p>
    <a class="cta" href="https://advncelabs.com/advnce-dashboard.html?code=${code}">View dashboard →</a>
    <div class="div"></div>
    <p class="sig">Appreciate you grinding, ${fn}. See you at the top.<br><br>— Jorrel<br>advnce labs</p>
  </div>
  <div class="footer"><p>advncelabs.com · orders@advncelabs.com<br>ALL PRODUCTS FOR RESEARCH USE ONLY · NOT FOR HUMAN CONSUMPTION · NOT EVALUATED BY THE FDA</p></div>
</div></body></html>`;

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
