import { NextResponse } from 'next/server';

// Self-report endpoint polled by os.jorrel.io (/api/status/adonis-next, ~60s).
// Public by design (middleware only gates /admin/*). Reports a live health signal
// so the dashboard card stays current with no session/sync/deploy. Strategic state
// (next_action/blockers) stays in jorrel-os.json / the report API. Metrics
// (MRR/customers) can be added here later from the orders/Stripe data.

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  return NextResponse.json({ health: 'healthy' });
}
