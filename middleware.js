import { NextResponse } from 'next/server';
import { findUserByEmail } from './lib/admin-users';
import { isPathAllowed } from './lib/admin-roles';

// Pages that moved under /admin/marketing/. Preserve deep paths + query.
const MARKETING_MOVES = [
  { from: '/admin/content',     to: '/admin/marketing/content' },
  { from: '/admin/ambassadors', to: '/admin/marketing/ambassadors' },
];

export function middleware(request) {
  const { pathname, search } = request.nextUrl;

  // 1. Rewrite moved marketing URLs (old → new) before auth check
  for (const m of MARKETING_MOVES) {
    if (pathname === m.from || pathname.startsWith(m.from + '/')) {
      const suffix = pathname.slice(m.from.length);
      const target = new URL(m.to + suffix + search, request.url);
      return NextResponse.redirect(target);
    }
  }

  // 2. Skip auth for the login page itself
  if (pathname === '/admin/login') return NextResponse.next();

  // 3. Read role + email cookies
  const role = request.cookies.get('adonis_admin_role')?.value;
  const email = request.cookies.get('adonis_admin_email')?.value;

  // No cookies → redirect to login
  if (!role || !email) {
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Cookies present but stale (user removed or role changed) → treat as logged out
  const user = findUserByEmail(email);
  if (!user || user.role !== role) {
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 4. Role-based path gating
  if (!isPathAllowed(role, pathname)) {
    // Authenticated but not authorized → bounce to dashboard, not login
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
