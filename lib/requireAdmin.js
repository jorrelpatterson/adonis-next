// lib/requireAdmin.js
// Role-aware guard for API routes. Use in route handlers:
//   const unauth = requireRole(request, 'admin');           // admin-only
//   const unauth = requireRole(request, 'admin', 'va');     // either role
//   if (unauth) return unauth;
//
// Returns null on success, or a NextResponse 401/403 on failure.

import { NextResponse } from 'next/server';
import { findUserByEmail } from './admin-users';

export function requireRole(request, ...allowedRoles) {
  const role = request.cookies.get('adonis_admin_role')?.value;
  const email = request.cookies.get('adonis_admin_email')?.value;

  if (!role || !email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Cross-check email is still in user list and role still matches.
  const user = findUserByEmail(email);
  if (!user || user.role !== role) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!allowedRoles.includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return null;
}

// Backwards-compatible alias for existing callers.
// Existing code calling requireAdmin(request) gets admin-only behavior.
export function requireAdmin(request) {
  return requireRole(request, 'admin');
}
