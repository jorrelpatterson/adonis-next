import { NextResponse } from 'next/server';

// Accepts either the adonis_admin cookie (admin UI) or a CRON_SECRET Bearer
// token (Vercel Cron). Returns null when authorized, otherwise a 401 response.
export function requireAdminOrCron(request) {
  const auth = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && auth === `Bearer ${cronSecret}`) return null;

  const cookie = request.cookies.get('adonis_admin');
  if (cookie && cookie.value === 'authenticated') return null;

  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
