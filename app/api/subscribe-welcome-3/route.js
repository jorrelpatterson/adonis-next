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
  <title>Three compounds. Three protocols. One standard.</title>
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
      <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#7A7D88;letter-spacing:4px;text-transform:uppercase;margin-bottom:12px">VOLUME 03 &middot; COMPOUND PRIMER</div>

      <!-- Headline -->
      <h1 style="font-family:'Cormorant Garamond',Georgia,serif;font-size:40px;font-weight:300;font-style:italic;color:#1A1C22;line-height:1.1;margin:0 0 20px">Where to start.</h1>

      <!-- Lead -->
      <p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1A1C22;line-height:1.75;margin:0 0 36px">Three compounds for three different goals. Each well-researched. Each ships from advnce labs with COA on request.</p>

      <!-- Divider -->
      <div style="height:1px;background:#E4E7EC;margin:0 0 32px"></div>

      <!-- Compound Card: BPC-157 -->
      <div style="border:1px solid #E4E7EC;border-radius:4px;padding:28px;margin-bottom:16px;background:#FDFCFA">
        <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#7A7D88;letter-spacing:3px;text-transform:uppercase;margin-bottom:10px">Recovery &middot; Tissue Repair</div>
        <div style="font-family:'Barlow Condensed',Arial,sans-serif;font-size:26px;font-weight:900;color:#1A1C22;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:12px">BPC-157</div>
        <p style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1A1C22;line-height:1.7;margin:0 0 16px">Research has investigated BPC-157&rsquo;s role in accelerating tendon-to-bone healing, reducing inflammation markers, and supporting gastrointestinal tissue repair in animal models.</p>
        <a href="https://www.advncelabs.com/advnce-product.html?sku=BP10" style="font-family:'Barlow Condensed',Arial,sans-serif;font-size:12px;font-weight:700;color:#00A0A8;letter-spacing:2px;text-transform:uppercase;text-decoration:none">Read the full breakdown &rarr;</a>
      </div>

      <!-- Compound Card: Tirzepatide -->
      <div style="border:1px solid #E4E7EC;border-radius:4px;padding:28px;margin-bottom:16px;background:#FDFCFA">
        <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#7A7D88;letter-spacing:3px;text-transform:uppercase;margin-bottom:10px">Metabolic &middot; Weight Research</div>
        <div style="font-family:'Barlow Condensed',Arial,sans-serif;font-size:26px;font-weight:900;color:#1A1C22;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:12px">Tirzepatide</div>
        <p style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1A1C22;line-height:1.7;margin:0 0 16px">As a dual GIP/GLP-1 receptor agonist, tirzepatide has been extensively studied for its effects on insulin sensitivity, appetite regulation, and body composition in clinical trial subjects.</p>
        <a href="https://www.advncelabs.com/advnce-product.html?sku=TZ10" style="font-family:'Barlow Condensed',Arial,sans-serif;font-size:12px;font-weight:700;color:#00A0A8;letter-spacing:2px;text-transform:uppercase;text-decoration:none">Read the full breakdown &rarr;</a>
      </div>

      <!-- Compound Card: NAD+ -->
      <div style="border:1px solid #E4E7EC;border-radius:4px;padding:28px;margin-bottom:36px;background:#FDFCFA">
        <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#7A7D88;letter-spacing:3px;text-transform:uppercase;margin-bottom:10px">Longevity &middot; Cellular Energy</div>
        <div style="font-family:'Barlow Condensed',Arial,sans-serif;font-size:26px;font-weight:900;color:#1A1C22;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:12px">NAD+</div>
        <p style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1A1C22;line-height:1.7;margin:0 0 16px">Studies show NAD+ precursor supplementation supports mitochondrial function, DNA repair pathways, and sirtuin activation — mechanisms central to cellular aging research.</p>
        <a href="https://www.advncelabs.com/advnce-product.html?sku=NA500" style="font-family:'Barlow Condensed',Arial,sans-serif;font-size:12px;font-weight:700;color:#00A0A8;letter-spacing:2px;text-transform:uppercase;text-decoration:none">Read the full breakdown &rarr;</a>
      </div>

      <!-- Divider -->
      <div style="height:1px;background:#E4E7EC;margin:0 0 32px"></div>

      <!-- CTA -->
      <p style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1A1C22;line-height:1.7;margin:0 0 24px">These three are a starting point. The full catalog covers 102 compounds — each with the same documentation standard.</p>
      <a href="https://www.advncelabs.com/advnce-catalog.html" style="display:inline-block;background:#00A0A8;color:#F4F2EE;font-family:'Barlow Condensed',Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:3px;text-transform:uppercase;text-decoration:none;padding:14px 28px;border-radius:3px">Explore all 102 compounds &rarr;</a>

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
        subject: 'Three compounds. Three protocols. One standard.',
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
  return NextResponse.json({ status: 'subscribe-welcome-3 route is live' });
}
