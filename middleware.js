import { NextResponse } from 'next/server';

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

  // 2. Protect /admin routes (not /admin/login)
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const cookie = request.cookies.get('adonis_admin');
    if (!cookie || cookie.value !== 'authenticated') {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
