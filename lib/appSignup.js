// lib/appSignup.js
// Task 12 — subscribers upsert (lead capture). Builds the row shape the
// `subscribers` table expects so the existing welcome-drip cron
// (app/api/cron/welcome-emails/route.js) picks new app signups up.
export function buildSubscriberRow(email, firstName) {
  const e = String(email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) throw new Error('valid email required');
  return { email: e, first_name: (firstName || '').trim() || null, source: 'adonis-app', subscribed_at: new Date().toISOString() };
}
