import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../lib/requireAdmin';

// Sends a digest email to all active ambassadors with their personalized asset kit URL +
// summary of latest social posts. Triggered manually from /admin/content for now.

const css = `body{margin:0;padding:0;background:#F4F2EE;font-family:'Helvetica Neue',sans-serif;color:#1A1C22}
.wrap{max-width:600px;margin:0 auto;background:#fff}
.header{padding:24px 32px;border-bottom:1px solid #E4E7EC;display:flex;align-items:center;gap:12px}
.brand{font-size:14px;font-weight:300;letter-spacing:3px;color:#1A1C22}
.brand span{color:#7A7D88}
.body{padding:36px 32px}
.eyebrow{font-family:'JetBrains Mono',monospace;font-size:10px;color:#00A0A8;letter-spacing:4px;text-transform:uppercase;margin-bottom:8px}
.headline{font-family:'Cormorant Garamond',serif;font-style:italic;font-weight:300;font-size:34px;color:#1A1C22;line-height:1.1;margin-bottom:18px}
.lead{font-size:14px;line-height:1.7;color:#1A1C22;margin-bottom:24px}
.cta{display:inline-block;background:#00A0A8;color:#fff;padding:14px 28px;font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:2px;text-transform:uppercase;font-size:13px;text-decoration:none;border-radius:4px}
.posts-list{margin:24px 0;padding:18px;background:#FAFBFC;border:1px solid #E4E7EC;border-radius:6px}
.posts-list-label{font-family:'JetBrains Mono',monospace;font-size:9px;color:#7A7D88;letter-spacing:3px;text-transform:uppercase;margin-bottom:10px}
.post-item{font-size:13px;color:#1A1C22;padding:6px 0;border-bottom:1px solid #F0F1F4}
.post-item:last-child{border-bottom:none}
.post-item strong{color:#00A0A8;font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:1px;font-size:11px;margin-right:8px}
.footer{padding:20px 32px;background:#F4F2EE;border-top:1px solid #E4E7EC;text-align:center;font-family:'JetBrains Mono',monospace;font-size:9px;color:#7A7D88;letter-spacing:1px;line-height:2}`;

const LOGO = '<svg viewBox="0 0 48 28" width="32" height="18" fill="none" style="vertical-align:middle"><path d="M2 24L8 19L14 22L20 14L26 17L32 9L38 12L46 3" stroke="#00A0A8" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/><circle cx="32" cy="9" r="2" fill="#00A0A8"/><circle cx="38" cy="12" r="2" fill="#E07C24"/><circle cx="46" cy="3" r="2.5" fill="#E07C24"/></svg>';

const TYPE_LABEL = { compound_card:'COMPOUND', mechanism_diagram:'MECHANISM', stack_carousel:'STACK', research_quote:'QUOTE', standards_statement:'STANDARDS' };

function fmtDate(s) {
  const d = new Date(s + 'T00:00:00');
  return d.toLocaleDateString('default', { month: 'short', day: 'numeric' });
}

function buildHtml(firstName, code, posts) {
  const kitUrl = `https://www.advncelabs.com/advnce-asset-kit.html?code=${encodeURIComponent(code)}`;
  const postRows = posts.slice(0, 8).map(p => {
    const cap = (p.caption || '').split('\n')[0].slice(0, 80);
    return `<div class="post-item"><strong>${TYPE_LABEL[p.post_type] || p.post_type}</strong> ${cap}${cap.length === 80 ? '…' : ''} <span style="color:#7A7D88;font-size:11px;">· ${fmtDate(p.scheduled_date)}</span></div>`;
  }).join('');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${css}</style></head><body>
<div class="wrap">
  <div class="header">${LOGO}<span class="brand">advnce <span>labs</span></span></div>
  <div class="body">
    <p class="eyebrow">Ambassador drop · ${posts.length} new posts</p>
    <h1 class="headline">${firstName ? firstName + ', new ' : 'New '}content for your <em>stories</em>.</h1>
    <p class="lead">Your share library has been refreshed. Every post comes with an image you can download and a caption with your referral code already plugged in. Open your kit, copy the caption, drop the image into a story.</p>
    <a class="cta" href="${kitUrl}">Open your asset kit →</a>
    <div class="posts-list">
      <div class="posts-list-label">In the library now</div>
      ${postRows}
    </div>
    <p style="font-size:12px;color:#7A7D88;line-height:1.6">Your code: <strong style="color:#00A0A8;font-family:'JetBrains Mono',monospace">${code}</strong> · 10% off for your audience, commissions for you.</p>
  </div>
  <div class="footer">advncelabs.com · orders@advncelabs.com</div>
</div></body></html>`;
}

export async function POST(request) {
  const unauth = requireAdmin(request); if (unauth) return unauth;

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const RESEND = process.env.RESEND_API_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY || !RESEND) return NextResponse.json({ error: 'Server config missing' }, { status: 500 });

  const headers = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };

  // Load active ambassadors
  const aRes = await fetch(`${SUPABASE_URL}/rest/v1/ambassadors?select=name,email,code&status=eq.active`, { headers });
  const ambs = await aRes.json();
  if (!Array.isArray(ambs) || ambs.length === 0) return NextResponse.json({ error: 'No active ambassadors' }, { status: 400 });

  // Load latest scheduled+posted social posts
  const pRes = await fetch(`${SUPABASE_URL}/rest/v1/social_posts?select=*&status=in.(scheduled,posted)&order=scheduled_date.desc&limit=10`, { headers });
  const posts = await pRes.json();

  let sent = 0; const failed = [];
  for (const a of ambs) {
    if (!a.email) { failed.push({ name: a.name, reason: 'no email' }); continue; }
    const firstName = (a.name || '').split(' ')[0];
    const html = buildHtml(firstName, a.code, posts);
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND}` },
        body: JSON.stringify({
          from: 'advnce labs <orders@advncelabs.com>',
          to: a.email,
          subject: `New content drop · ${posts.length} posts ready to share`,
          html,
        }),
      });
      if (r.ok) sent++;
      else failed.push({ name: a.name, reason: 'resend ' + r.status });
    } catch (e) { failed.push({ name: a.name, reason: e.message }); }
  }
  return NextResponse.json({ success: true, sent, failed, total: ambs.length });
}

export async function GET() {
  return NextResponse.json({ status: 'ambassador-content-digest route is live' });
}
