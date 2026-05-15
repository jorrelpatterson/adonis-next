import { NextResponse } from 'next/server';
import { findUserByEmail } from './admin-users';

// Accepts either a CRON_SECRET Bearer token (Vercel Cron) or a logged-in
// admin/va session. Returns null when authorized, otherwise a 401 response.
export function requireAdminOrCron(request) {
  const auth = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && auth === `Bearer ${cronSecret}`) return null;

  const role = request.cookies.get('adonis_admin_role')?.value;
  const email = request.cookies.get('adonis_admin_email')?.value;
  if (role && email) {
    const user = findUserByEmail(email);
    if (user && user.role === role) return null;
  }

  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
