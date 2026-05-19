// app/api/distributor-approval/route.js
import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../lib/requireAdmin';
import { wholesaleApprovalHtml } from '../../../lib/email-templates/wholesale-approval';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const RESEND = process.env.RESEND_API_KEY;
const SHEET_FILENAME = 'advncelabs-wholesale-current.pdf';

export async function POST(request) {
  const unauth = requireAdmin(request);
  if (unauth) return unauth;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Accept either { distributor: {...} } (existing admin payload)
  // or { distributor_id } (cleaner contract).
  let dist = body.distributor;
  if (!dist && body.distributor_id) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/distributors?id=eq.${encodeURIComponent(body.distributor_id)}&select=*`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
    );
    const rows = await res.json();
    dist = Array.isArray(rows) ? rows[0] : null;
  }

  if (!dist || !dist.email) {
    return NextResponse.json({ error: 'Distributor not found or missing email' }, { status: 400 });
  }

  if (dist.status !== 'approved' || !dist.login_code) {
    return NextResponse.json(
      { error: 'Distributor must be approved with a login code before sending the pricing sheet' },
      { status: 400 }
    );
  }

  if (!RESEND) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
  }

  // Download the current pricing sheet from Supabase Storage
  const sheetRes = await fetch(
    `${SUPABASE_URL}/storage/v1/object/wholesale-sheets/current.pdf`,
    { headers: { Authorization: `Bearer ${SERVICE_KEY}` } }
  );

  if (!sheetRes.ok) {
    return NextResponse.json(
      { error: 'No active pricing sheet uploaded. Upload one in the admin.' },
      { status: 400 }
    );
  }

  const sheetBuf = Buffer.from(await sheetRes.arrayBuffer());
  const sheetBase64 = sheetBuf.toString('base64');

  const html = wholesaleApprovalHtml({
    business_name: dist.business_name,
    contact_name: dist.contact_name,
    login_code: dist.login_code,
  });

  const sendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND}`,
    },
    body: JSON.stringify({
      from: 'advnce labs <orders@advncelabs.com>',
      to: dist.email,
      subject: 'Welcome to advnce labs Wholesale — your pricing sheet inside',
      html,
      attachments: [
        {
          filename: SHEET_FILENAME,
          content: sheetBase64,
        },
      ],
    }),
  });

  if (!sendRes.ok) {
    const err = await sendRes.json().catch(() => ({}));
    console.error('distributor-approval Resend error:', err);
    return NextResponse.json({ error: 'Email send failed', detail: err }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function GET() {
  return NextResponse.json({ status: 'distributor-approval route is live' });
}
