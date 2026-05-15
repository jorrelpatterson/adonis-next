// lib/admin-roles.js
// Single source of truth for role → access. Used by middleware and API guards.

export const ROLE_ALLOWED_PATHS = {
  admin: ['*'], // unrestricted
  va: [
    '/admin',                    // dashboard landing (content varies by role)
    '/admin/marketing',          // hub + all 6 sub-modules (content, news, post-builder, campaigns, ambassadors, subscribers)
    '/admin/support-tickets',
    '/admin/discount-codes',     // create promo codes for campaigns
  ],
};

// Documentation reference — the per-route guards in app/api/* are the
// authoritative enforcement. This list mirrors what's allowed there so we have
// one place to audit "what can VA hit?" If you add a new VA-allowed API route,
// also add it here. (Not used by middleware in v1.)
export const ROLE_ALLOWED_APIS = {
  admin: ['*'],
  va: [
    '/api/admin-auth',
    '/api/me',
    '/api/ambassador-write',          // gated further inside the route (status + code only)
    '/api/ambassador-message',
    '/api/ambassador-images',         // covers /api/ambassador-images/personalize
    '/api/ambassador-content-digest',
    '/api/social-post-write',
    '/api/admin/news',                // covers all 8 nested news routes
    '/api/discount-code-write',
    '/api/subscribers-admin',
    '/api/subscribe-welcome-2',
    '/api/subscribe-welcome-3',
    '/api/support-tickets',
  ],
};

// Prefix-match a path against an allowed list.
// '*' = wildcard, allow everything.
// Otherwise an entry matches if the request path equals it or starts with it + '/'.
export function isPathAllowed(role, pathname) {
  const allowed = ROLE_ALLOWED_PATHS[role];
  if (!allowed || !pathname) return false;
  if (allowed.includes('*')) return true;
  return allowed.some(prefix => pathname === prefix || pathname.startsWith(prefix + '/'));
}
