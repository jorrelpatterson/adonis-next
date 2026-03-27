import { NextResponse } from 'next/server';

export async function POST(request) {
  const { ambassador } = await request.json();
  if (!ambassador) return NextResponse.json({ error: 'Missing data' }, { status: 400 });

  const { name, email, code } = ambassador;
  const RESEND = process.env.RESEND_API_KEY;
  const fn = (name || '').split(' ')[0];

  const welcomeHtml = '<html><body style="font-family:Arial;padding:40px;max-width:600px;margin:0 auto">'
    + '<h2 style="color:#0A0D14">Welcome to advnce labs, ' + fn + '!</h2>'
    + '<p>Your ambassador account is live.</p>'
    + '<div style="background:#0A0D14;padding:20px;border-radius:6px;margin:20px 0">'
    + '<p style="color:#7A7D88;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 6px">Your referral link</p>'
    + '<p style="color:#00A0A8;font-family:monospace;font-size:14px;margin:0">advncelabs.com?ref=' + code + '</p>'
    + '</div>'
    + '<div style="background:#1A1C22;padding:20px;border-radius:6px;margin:20px 0">'
    + '<p style="color:#7A7D88;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 6px">Your ambassador code</p>'
    + '<p style="color:#00A0A8;font-family:monospace;font-size:20px;font-weight:700;margin:0">' + code + '</p>'
    + '</div>'
    + '<p><strong>Commission structure:</strong><br>Starter: 10% | Builder: 15% | Elite: 20%<br>L2 override: 5% | L3 override: 2.5%</p>'
    + '<p>Payouts on the 1st of every month via Zelle.</p>'
    + '<p><a href="https://advncelabs.com/advnce-dashboard.html?code=' + code + '" style="background:#0A0D14;color:white;padding:12px 24px;text-decoration:none;border-radius:4px;display:inline-block">View Dashboard</a></p>'
    + '</body></html>';

  const adminHtml = '<html><body style="font-family:monospace;padding:40px;background:#1A1C22;color:white">'
    + '<h2 style="color:#00A0A8">New Ambassador: ' + name + '</h2>'
    + '<p>Email: ' + email + '</p>'
    + '<p>Code: <span style="color:#00A0A8;font-size:18px">' + code + '</span></p>'
    + '<p>Link: advncelabs.com?ref=' + code + '</p>'
    + '</body></html>';

  try {
    await Promise.all([
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + RESEND },
        body: JSON.stringify({ from: 'advnce labs <orders@advncelabs.com>', to: 'jorrelpatterson@gmail.com', subject: 'New Ambassador: ' + name + ' (' + code + ')', html: adminHtml })
      }),
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + RESEND },
        body: JSON.stringify({ from: 'advnce labs <orders@advncelabs.com>', to: email, subject: 'Welcome to advnce labs, ' + fn + ' - your link is live', html: welcomeHtml })
      })
    ]);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
