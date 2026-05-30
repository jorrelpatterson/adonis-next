import { NextResponse } from 'next/server';
import { verifyUnsubToken } from '../../../lib/unsubToken';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

function renderPage(message, sub) {
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Unsubscribed · advnce labs</title><link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;700;900&family=Cormorant+Garamond:ital,wght@0,300;1,300&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet"></head><body style="margin:0;padding:0;background:#F4F2EE;color:#1A1C22;font-family:Arial,Helvetica,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center"><div style="max-width:520px;padding:48px 32px;text-align:center"><div style="font:400 10px 'JetBrains Mono',monospace;color:#7A7D88;letter-spacing:4px;text-transform:uppercase;margin-bottom:16px">advnce labs &middot; preferences</div><h1 style="font:300 italic 42px 'Cormorant Garamond',serif;color:#1A1C22;margin:0 0 16px;line-height:1.15">${message}</h1><p style="font:400 14px Arial,sans-serif;color:#1A1C22;line-height:1.7;margin:0 0 8px">${sub}</p><p style="font:400 12px 'JetBrains Mono',monospace;color:#7A7D88;letter-spacing:2px;text-transform:uppercase;margin:36px 0 0">advncelabs.com</p></div></body></html>`;
  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

export async function GET(request) {
  const token = new URL(request.url).searchParams.get('t');
  const email = verifyUnsubToken(token);
  if (!email) return renderPage('Invalid link.', 'This unsubscribe link is not valid or has been tampered with.');

  const headers = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' };
  const encodedEmail = encodeURIComponent(email);
  const now = new Date().toISOString();

  // ALWAYS record in the shared suppression list. This table is the single source of
  // truth that BOTH the compound-spotlight sender and the recruitment drip check for
  // opt-out, so every unsubscribe must land here — including subscribers (previously a
  // subscriber's opt-out only stamped the subscribers row and the drip never saw it).
  const upsertRes = await fetch(`${SUPABASE_URL}/rest/v1/compound_email_unsubscribes?on_conflict=email`, {
    method: 'POST', headers: { ...headers, Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({ email, unsubscribed_at: now }),
  });
  if (!upsertRes.ok) console.error('email-unsub: suppression upsert failed', upsertRes.status, await upsertRes.text());

  // If they're also a newsletter subscriber, stamp that row too (keeps subscriber views consistent).
  const subRes = await fetch(`${SUPABASE_URL}/rest/v1/subscribers?email=ilike.${encodedEmail}&select=id`, { headers, cache: 'no-store' });
  const subRows = subRes.ok ? await subRes.json() : [];
  if (subRows.length) {
    const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/subscribers?email=ilike.${encodedEmail}`, {
      method: 'PATCH', headers,
      body: JSON.stringify({ compound_email_unsubscribed_at: now }),
    });
    if (!patchRes.ok) console.error('email-unsub: subscriber PATCH failed', patchRes.status, await patchRes.text());
  }

  return renderPage("You're unsubscribed.", 'Compound spotlight emails are off for this address. Transactional emails (order confirmations, ambassador comms) are unaffected.');
}
