import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { ambassador } = await request.json();
    if (!ambassador) return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    const { name, email, code, period, l1_amount, l2_amount, l3_amount } = ambassador;
    const RESEND = process.env.RESEND_API_KEY;
    const fn = (name || '').split(' ')[0];
    const l1 = parseFloat(l1_amount || 0), l2 = parseFloat(l2_amount || 0), l3 = parseFloat(l3_amount || 0);
    const total = (l1 + l2 + l3).toFixed(2);

    const html = `<!DOCTYPE html><html><body style="font-family:Arial;padding:40px;max-width:600px;margin:0 auto;background:#f4f4f4">
<div style="background:white;padding:40px;border-radius:8px">
<div style="background:#0A0D14;padding:20px;border-radius:6px;margin-bottom:24px">
  <p style="color:white;font-size:18px;font-weight:900;letter-spacing:2px;margin:0">ADVNCE LABS</p>
</div>
<h2 style="color:#0A0D14">Payout Processed, ${fn}!</h2>
<p style="color:#555">Your ${period} commissions have been sent via Zelle.</p>
<div style="background:#0A0D14;padding:24px;border-radius:6px;margin:20px 0;text-align:center">
  <p style="color:#7A7D88;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin:0 0 8px">Total Payout</p>
  <p style="color:#00A0A8;font-family:monospace;font-size:36px;font-weight:900;margin:0">$${total}</p>
  <p style="color:#7A7D88;font-size:11px;margin:8px 0 0">${period} · Sent via Zelle</p>
</div>
<table style="width:100%;border-collapse:collapse;margin:20px 0">
  <tr style="border-bottom:1px solid #eee"><td style="padding:10px;color:#555">Direct sales (L1)</td><td style="padding:10px;color:#00A0A8;font-weight:700;text-align:right;font-family:monospace">$${l1.toFixed(2)}</td></tr>
  <tr style="border-bottom:1px solid #eee"><td style="padding:10px;color:#555">Recruit sales (L2)</td><td style="padding:10px;color:#555;text-align:right;font-family:monospace">$${l2.toFixed(2)}</td></tr>
  <tr><td style="padding:10px;color:#555">L3 overrides</td><td style="padding:10px;color:#555;text-align:right;font-family:monospace">$${l3.toFixed(2)}</td></tr>
</table>
<a href="https://advncelabs.com/advnce-dashboard.html?code=${code}" style="display:inline-block;background:#0A0D14;color:white;padding:14px 28px;text-decoration:none;border-radius:4px;font-weight:700">View Dashboard</a>
<p style="color:#aaa;font-size:12px;margin-top:32px">Thank you for being part of the network.</p>
</div></body></html>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + RESEND },
      body: JSON.stringify({ from: 'advnce labs <orders@advncelabs.com>', to: email, subject: 'Your advnce labs payout for ' + period + ' — $' + total, html })
    });
    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: 'Resend error', detail: data }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ambassador-payout route is live' });
}
