import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { ambassador } = body;
    if (!ambassador) {
      return NextResponse.json({ error: 'Missing ambassador data' }, { status: 400 });
    }

    const { name, email, code } = ambassador;
    const RESEND = process.env.RESEND_API_KEY;

    if (!RESEND) {
      return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
    }

    const fn = (name || '').split(' ')[0];

    const welcomeHtml = `<!DOCTYPE html>
<html><body style="font-family:Arial;padding:40px;max-width:600px;margin:0 auto;background:#f4f4f4">
<div style="background:white;padding:40px;border-radius:8px">
<div style="background:#0A0D14;padding:20px;border-radius:6px;margin-bottom:24px">
  <p style="color:white;font-size:18px;font-weight:900;letter-spacing:2px;margin:0">ADVNCE LABS</p>
</div>
<h2 style="color:#0A0D14">Welcome, ${fn}!</h2>
<p style="color:#555">Your ambassador account is live. Here is everything you need.</p>
<div style="background:#0A0D14;padding:20px;border-radius:6px;margin:20px 0">
  <p style="color:#7A7D88;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin:0 0 6px">Your referral link</p>
  <p style="color:#00A0A8;font-family:monospace;font-size:14px;margin:0">advncelabs.com?ref=${code}</p>
</div>
<div style="background:#1A1C22;padding:20px;border-radius:6px;margin:20px 0">
  <p style="color:#7A7D88;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin:0 0 6px">Your ambassador code</p>
  <p style="color:#00A0A8;font-family:monospace;font-size:24px;font-weight:700;margin:0">${code}</p>
</div>
<h3 style="color:#0A0D14">Commission Structure</h3>
<table style="width:100%;border-collapse:collapse">
  <tr style="border-bottom:1px solid #eee"><td style="padding:8px;color:#555">Starter (0-20 orders/mo)</td><td style="padding:8px;color:#00A0A8;font-weight:700;text-align:right">10%</td></tr>
  <tr style="border-bottom:1px solid #eee"><td style="padding:8px;color:#555">Builder (21-60 orders/mo)</td><td style="padding:8px;color:#00A0A8;font-weight:700;text-align:right">15%</td></tr>
  <tr style="border-bottom:1px solid #eee"><td style="padding:8px;color:#555">Elite (100+ orders/mo)</td><td style="padding:8px;color:#00A0A8;font-weight:700;text-align:right">20%</td></tr>
  <tr style="border-bottom:1px solid #eee"><td style="padding:8px;color:#555">L2 override (your recruits)</td><td style="padding:8px;color:#555;text-align:right">5%</td></tr>
  <tr><td style="padding:8px;color:#555">L3 override (their recruits)</td><td style="padding:8px;color:#555;text-align:right">2.5%</td></tr>
</table>
<p style="color:#555;margin-top:20px">Payouts processed on the <strong>1st of every month</strong> via Zelle.</p>
<a href="https://advncelabs.com/advnce-dashboard.html?code=${code}" style="display:inline-block;background:#0A0D14;color:white;padding:14px 28px;text-decoration:none;border-radius:4px;margin-top:16px;font-weight:700">View Dashboard</a>
<p style="color:#aaa;font-size:12px;margin-top:32px">Questions? Reply to this email.</p>
</div>
</body></html>`;

    const adminHtml = `<html><body style="font-family:monospace;padding:40px;background:#1A1C22;color:white">
<h2 style="color:#00A0A8">New Ambassador: ${name}</h2>
<p>Email: ${email}</p>
<p>Code: <span style="color:#00A0A8;font-size:20px">${code}</span></p>
<p>Link: advncelabs.com?ref=${code}</p>
</body></html>`;

    const [adminRes, welcomeRes] = await Promise.all([
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + RESEND },
        body: JSON.stringify({
          from: 'advnce labs <orders@advncelabs.com>',
          to: 'jorrelpatterson@gmail.com',
          subject: 'New Ambassador: ' + name + ' (' + code + ')',
          html: adminHtml
        })
      }),
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + RESEND },
        body: JSON.stringify({
          from: 'advnce labs <orders@advncelabs.com>',
          to: email,
          subject: 'Welcome to advnce labs, ' + fn + ' - your link is live',
          html: welcomeHtml
        })
      })
    ]);

    const adminData = await adminRes.json();
    const welcomeData = await welcomeRes.json();

    if (!adminRes.ok || !welcomeRes.ok) {
      return NextResponse.json({ error: 'Resend error', admin: adminData, welcome: welcomeData }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('ambassador-welcome error:', err);
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ambassador-welcome route is live' });
}
