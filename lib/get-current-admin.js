// lib/get-current-admin.js
// Server-side helper: read auth cookies and return current user.
// Use in server components (layouts, pages) and API routes.

import { cookies } from 'next/headers';
import { findUserByEmail } from './admin-users';

export function getCurrentAdmin() {
  const c = cookies();
  const role = c.get('adonis_admin_role')?.value;
  const email = c.get('adonis_admin_email')?.value;
  if (!role || !email) return null;

  // Cross-check that email still maps to this role in ADMIN_USERS.
  // If user was removed or role changed, treat as logged out.
  const user = findUserByEmail(email);
  if (!user || user.role !== role) return null;

  return user; // { email, role, name }
}
