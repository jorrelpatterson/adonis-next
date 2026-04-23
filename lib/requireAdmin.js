import { NextResponse } from 'next/server';

export function requireAdmin(request) {
  const cookie = request.cookies.get('adonis_admin');
  if (!cookie || cookie.value !== 'authenticated') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}
