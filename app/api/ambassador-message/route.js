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

    const css = `body{margin:0;padding:0;background:#f0f0f0;font-family:Arial,sans-serif}.wrap{max-width:600px;margin:0 auto}.header{background:#0A0D14;padding:20px 32px;display:flex;align-items:center;gap:12px;border-radius:6px 6px 0 0}.brand{color:white;font-size:13px;font-weight:300;letter-spacing:3px}.brand span{color:#7A7D88}.body{background:white;padding:40px 32px}.hero-label{font-family:monospace;font-size:10px;color:#7A7D88;letter-spacing:4px;text-transform:uppercase;margin-bottom:8px}.greeting{font-size:15px;color:#777;margin-bottom:20px}.msg{font-size:15px;color:#333;line-height:1.85}.div{height:1px;background:#eee;margin:24px 0}.ref-label{font-family:monospace;font-size:9px;color:#aaa;letter-spacing:3px;text-transform:uppercase;margin-bottom:8px}.ref-link{font-family:monospace;font-size:13px;color:#00A0A8}.sig{font-size:13px;color:#888;line-height:1.8}.footer{background:#0A0D14;padding:20px 32px;text-align:center;border-radius:0 0 6px 6px}.footer p{font-family:monospace;font-size:9px;color:rgba(255,255,255,0.2);letter-spacing:1px;line-height:2}`;

    const logo = '<svg viewBox="0 0 48 28" width="32" height="18" fill="none" style="vertical-align:middle"><path d="M2 24L8 19L14 22L20 14L26 17L32 9L38 12L46 3" stroke="#00A0A8" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/><circle cx="46" cy="3" r="3" fill="#E07C24"/></svg>';

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${css}</style></head><body>
<div class="wrap">
  <div class="header">${logo}<span class="brand">advnce <span>labs</span></span></div>
  <div class="body">
    <div class="hero-label">From advnce labs</div>
    <p class="greeting">Hey ${fn},</p>
    <div class="msg">${msgHtml}</div>
    <div class="div"></div>
    <div class="ref-label">Your referral link</div>
    <p class="ref-link">advncelabs.com?ref=${safeCode}</p>
    <div class="div"></div>
    <p class="sig">— Jorrel<br>advnce labs</p>
  </div>
  <div class="footer"><p>advncelabs.com · orders@advncelabs.com<br>ALL PRODUCTS FOR RESEARCH USE ONLY · NOT FOR HUMAN CONSUMPTION · NOT EVALUATED BY THE FDA</p></div>
</div></body></html>`;

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
