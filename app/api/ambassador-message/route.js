import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { ambassador, subject, message } = await request.json();
    if (!ambassador || !subject || !message) return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    const { name, email, code } = ambassador;
    const RESEND = process.env.RESEND_API_KEY;
    const fn = (name || '').split(' ')[0];
    const msgHtml = message.replace(/\n/g, '<br>');

    const html = `<!DOCTYPE html><html><body style="font-family:Arial;padding:40px;max-width:600px;margin:0 auto;background:#f4f4f4">
<div style="background:white;padding:40px;border-radius:8px">
<div style="background:#0A0D14;padding:20px;border-radius:6px;margin-bottom:24px">
  <p style="color:white;font-size:18px;font-weight:900;letter-spacing:2px;margin:0">ADVNCE LABS</p>
</div>
<p style="color:#777;font-size:15px;margin-bottom:20px">Hey ${fn},</p>
<div style="color:#333;font-size:15px;line-height:1.8">${msgHtml}</div>
<hr style="border:none;border-top:1px solid #eee;margin:32px 0">
<p style="color:#aaa;font-size:12px">Questions? Reply to this email. — Jorrel, advnce labs</p>
<div style="background:#f4f4f4;padding:12px 16px;border-radius:4px;margin-top:16px">
  <p style="font-family:monospace;font-size:10px;color:#999;margin:0">Your referral link: advncelabs.com?ref=${code}</p>
</div>
</div></body></html>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + RESEND },
      body: JSON.stringify({ from: 'advnce labs <orders@advncelabs.com>', to: email, subject, html })
    });
    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: 'Resend error', detail: data }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ambassador-message route is live' });
}
