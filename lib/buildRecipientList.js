// Builds the deduplicated recipient list for a compound spotlight send.
// Audience: subscribers (where compound_email_unsubscribed_at IS NULL) ∪ ambassadors
// ∪ past_customers (distinct customer emails from orders). Then drop emails in
// compound_email_unsubscribes. Dedupe by lower(email), preferring source priority
// subscriber > ambassador > customer.
//
// NOTE: orders table uses `email`, `first_name`, `last_name` (not customer_email/customer_name).

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const PRIORITY = { subscriber: 0, ambassador: 1, customer: 2 };

async function sbFetch(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Supabase fetch failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function buildRecipientList() {
  // Pull all three sources in parallel.
  // orders: uses `email`, `first_name`, `last_name` (not customer_email/customer_name)
  const [subs, ambs, orders, suppressed] = await Promise.all([
    sbFetch('/subscribers?compound_email_unsubscribed_at=is.null&select=email'),
    sbFetch('/ambassadors?email=not.is.null&select=email,name'),
    sbFetch('/orders?email=not.is.null&select=email,first_name,last_name'),
    sbFetch('/compound_email_unsubscribes?select=email'),
  ]);

  const suppressedSet = new Set(suppressed.map(r => String(r.email || '').toLowerCase()));

  // Build candidate map keyed by lowercase email.
  const byEmail = new Map();
  function add(row, source) {
    if (!row.email) return;
    const email = String(row.email).trim().toLowerCase();
    if (!email || suppressedSet.has(email)) return;
    const existing = byEmail.get(email);
    if (!existing || PRIORITY[source] < PRIORITY[existing.source]) {
      byEmail.set(email, { email, name: row.name || row.first_name || '', source });
    }
  }

  subs.forEach(r => add({ email: r.email, name: '' }, 'subscriber'));
  ambs.forEach(r => add({ email: r.email, name: r.name }, 'ambassador'));
  // Compose a display name from first_name + last_name for order rows
  orders.forEach(r => add({
    email: r.email,
    name: [r.first_name, r.last_name].filter(Boolean).join(' ').trim(),
  }, 'customer'));

  return Array.from(byEmail.values());
}
