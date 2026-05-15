// Single source of truth for "what counts as collected revenue."
//
// Two order flows use different status enums:
//   Invoices (admin-created):    sent → paid → shipped → delivered (or cancelled)
//   Storefront (Stripe-checkout): pending_payment → confirmed → processing → shipped → delivered (or cancelled)
//
// "Settled" = post-payment. Pending/sent and cancelled don't count.
// Use paid_amount when present (admin-entered actual amount on invoices),
// fall back to total (always exact for Stripe storefront orders).
const SETTLED = new Set(['paid', 'confirmed', 'processing', 'shipped', 'delivered']);

export function collectedRevenue(order) {
  if (!order || !SETTLED.has(order.status)) return 0;
  const paid = order.paid_amount;
  if (paid != null && Number.isFinite(Number(paid))) return Number(paid);
  return Number(order.total) || 0;
}

export function totalCollectedRevenue(orders) {
  return (orders || []).reduce((s, o) => s + collectedRevenue(o), 0);
}
