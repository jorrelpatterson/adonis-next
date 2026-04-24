// Sequential human-friendly invoice IDs: AVL-INV-0001, AVL-INV-0002, ...
// UNIQUE constraint on orders.invoice_id catches collisions; caller retries on 409.

export async function nextInvoiceId(supabaseUrl, serviceKey) {
  const r = await fetch(
    `${supabaseUrl}/rest/v1/orders?select=invoice_id&invoice_id=not.is.null&order=invoice_id.desc&limit=1`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }, cache: 'no-store' },
  );
  if (!r.ok) throw new Error('invoiceId lookup failed: ' + (await r.text()));
  const rows = await r.json();
  const lastSeq = rows[0]?.invoice_id
    ? parseInt(rows[0].invoice_id.split('-').pop(), 10)
    : 0;
  const next = (isNaN(lastSeq) ? 0 : lastSeq) + 1;
  return `AVL-INV-${String(next).padStart(4, '0')}`;
}
