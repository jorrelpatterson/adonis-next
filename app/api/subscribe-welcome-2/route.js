import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { email, first_name } = await request.json();
    if (!email) return NextResponse.json({ error: 'Missing email' }, { status: 400 });
    const RESEND = process.env.RESEND_API_KEY;
    const fn = first_name ? first_name.split(' ')[0] : 'there';

    const logo = '<svg viewBox="0 0 48 28" width="36" height="21" fill="none" style="vertical-align:middle;display:inline-block"><path d="M2 24L8 19L14 22L20 14L26 17L32 9L38 12L46 3" stroke="#00A0A8" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/><circle cx="32" cy="9" r="2" fill="#00A0A8"/><circle cx="38" cy="12" r="2" fill="#E07C24"/><circle cx="46" cy="3" r="2.5" fill="#E07C24"/></svg>';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;700;900&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
  <title>What advnce labs is — and isn't.</title>
</head>
<body style="margin:0;padding:0;background:#E8E6E2;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px">

    <!-- Header -->
    <div style="background:#F4F2EE;border-bottom:1px solid #E4E7EC;padding:20px 32px;border-radius:6px 6px 0 0;display:flex;align-items:center;gap:10px">
      ${logo}
      <span style="font-family:'Barlow Condensed',Arial,sans-serif;font-size:15px;font-weight:300;letter-spacing:3px;color:#1A1C22;text-transform:lowercase">advnce <span style="color:#7A7D88;font-weight:300">labs</span></span>
    </div>

    <!-- Body -->
    <div style="background:#F4F2EE;padding:48px 40px">

      <!-- Eyebrow -->
      <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#7A7D88;letter-spacing:4px;text-transform:uppercase;margin-bottom:12px">VOLUME 02 &middot; BRAND ESSENCE</div>

      <!-- Headline -->
      <h1 style="font-family:'Barlow Condensed',Arial,sans-serif;font-size:38px;font-weight:900;color:#1A1C22;line-height:1.05;letter-spacing:-0.5px;text-transform:uppercase;margin:0 0 24px">advnce labs is a<br><span style="color:#00A0A8">chemical supplier.</span></h1>

      <!-- Lead -->
      <p style="font-family:'Cormorant Garamond',Georgia,serif;font-size:18px;font-weight:300;color:#1A1C22;line-height:1.75;margin:0 0 32px">We supply research-grade peptide compounds to qualified investigators for in-vitro laboratory research purposes. <strong style="font-weight:400">Full stop.</strong></p>

      <!-- Divider -->
      <div style="height:1px;background:#E4E7EC;margin:0 0 36px"></div>

      <!-- Principles label -->
      <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#7A7D88;letter-spacing:4px;text-transform:uppercase;margin-bottom:28px">Three principles</div>

      <!-- Principle 01 -->
      <div style="margin-bottom:28px">
        <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:8px">
          <span style="font-family:'Barlow Condensed',Arial,sans-serif;font-size:28px;font-weight:900;color:#00A0A8;line-height:1">01</span>
          <span style="font-family:'Barlow Condensed',Arial,sans-serif;font-size:18px;font-weight:700;color:#1A1C22;letter-spacing:0.5px;text-transform:uppercase">Documentation First</span>
        </div>
        <p style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1A1C22;line-height:1.7;margin:0;padding-left:44px">Every compound ships with a manufacturer Certificate of Analysis available on request. Lot numbers are traceable. Purity is stated, not assumed. If we can't document it, we don't sell it.</p>
      </div>

      <!-- Principle 02 -->
      <div style="margin-bottom:28px">
        <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:8px">
          <span style="font-family:'Barlow Condensed',Arial,sans-serif;font-size:28px;font-weight:900;color:#00A0A8;line-height:1">02</span>
          <span style="font-family:'Barlow Condensed',Arial,sans-serif;font-size:18px;font-weight:700;color:#1A1C22;letter-spacing:0.5px;text-transform:uppercase">Research Integrity</span>
        </div>
        <p style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1A1C22;line-height:1.7;margin:0;padding-left:44px">We don't make health claims. We don't imply therapeutic use. Every product description uses the language of research because that is the only honest framing for what we supply.</p>
      </div>

      <!-- Principle 03 -->
      <div style="margin-bottom:40px">
        <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:8px">
          <span style="font-family:'Barlow Condensed',Arial,sans-serif;font-size:28px;font-weight:900;color:#00A0A8;line-height:1">03</span>
          <span style="font-family:'Barlow Condensed',Arial,sans-serif;font-size:18px;font-weight:700;color:#1A1C22;letter-spacing:0.5px;text-transform:uppercase">Supplier Discipline</span>
        </div>
        <p style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1A1C22;line-height:1.7;margin:0;padding-left:44px">We source from a vetted set of manufacturers only. Not because we couldn't find more — because maintaining a short, auditable supply chain is more important than catalog breadth for its own sake.</p>
      </div>

      <!-- Divider -->
      <div style="height:1px;background:#E4E7EC;margin:0 0 36px"></div>

      <!-- CTA -->
      <p style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1A1C22;line-height:1.7;margin:0 0 24px">These are the standards every compound in the catalog is held to. Browse and see what that looks like in practice.</p>
      <a href="https://www.advncelabs.com/advnce-catalog.html" style="display:inline-block;background:#00A0A8;color:#F4F2EE;font-family:'Barlow Condensed',Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:3px;text-transform:uppercase;text-decoration:none;padding:14px 28px;border-radius:3px">Browse the catalog &rarr;</a>

    </div>

    <!-- Footer -->
    <div style="background:#1A1C22;padding:24px 32px;border-radius:0 0 6px 6px;text-align:center">
      <div style="margin-bottom:12px">${logo}</div>
      <p style="font-family:'JetBrains Mono',monospace;font-size:9px;color:rgba(244,242,238,0.35);letter-spacing:1.5px;line-height:2.2;margin:0;text-transform:uppercase">advncelabs.com &middot; orders@advncelabs.com<br>Research-grade compounds for in-vitro laboratory use only.</p>
    </div>

  </div>
</body>
</html>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + RESEND },
      body: JSON.stringify({
        from: 'advnce labs <orders@advncelabs.com>',
        to: email,
        subject: 'What advnce labs is \u2014 and isn\u2019t.',
        html
      })
    });
    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: 'Resend error', detail: data }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'subscribe-welcome-2 route is live' });
}
