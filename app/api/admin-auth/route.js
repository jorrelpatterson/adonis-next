// app/api/admin-auth/route.js
import { NextResponse } from 'next/server';
import { findUserByCredentials } from '../../../lib/admin-users';

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 7, // 7 days
  path: '/',
};

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { email, password } = body || {};
  const user = findUserByCredentials(email, password);

  if (!user) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const response = NextResponse.json({ success: true, role: user.role, name: user.name });
  response.cookies.set('adonis_admin_role', user.role, COOKIE_OPTS);
  response.cookies.set('adonis_admin_email', user.email, COOKIE_OPTS);
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set('adonis_admin_role', '', { ...COOKIE_OPTS, maxAge: 0 });
  response.cookies.set('adonis_admin_email', '', { ...COOKIE_OPTS, maxAge: 0 });
  // Also clear the legacy cookie in case any browsers still hold it.
  response.cookies.set('adonis_admin', '', { ...COOKIE_OPTS, maxAge: 0 });
  return response;
}
