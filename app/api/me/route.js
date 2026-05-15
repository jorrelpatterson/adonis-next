// app/api/me/route.js
// Returns the current admin user (or null if not logged in).
// Used by client components that need to render conditionally on role.

import { NextResponse } from 'next/server';
import { getCurrentAdmin } from '../../../lib/get-current-admin';

export async function GET() {
  const user = getCurrentAdmin();
  return NextResponse.json({ user });
}
