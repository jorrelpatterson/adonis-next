# VA Sub-Admin Role — design

**Date:** 2026-05-15
**Status:** approved (brainstorm)
**Owner:** Jorrel
**Successor doc:** implementation plan (to be written next)

## Problem

The advnce labs admin dashboard ([app/admin/](../../../app/admin/)) is gated
by a single shared `ADMIN_PASSWORD`. Anyone with that password sees and can
mutate everything: inventory, vendors, purchase orders, pricing, orders,
invoices, distributors, ambassador payouts, etc.

Jorrel wants to delegate marketing + customer-messaging work to a virtual
assistant (Mika, `mika@ascnd.pro`). She needs to:

- Post and schedule social media content
- Approve / regenerate / render news article drafts
- Build campaign series
- Message ambassadors (status changes, custom messages, content kits)
- Manage email subscribers (welcome drip stages)
- Reply to support tickets

She must **not** be able to access or mutate inventory, vendors, purchase
orders, pricing, orders, invoices, distributors, pre-sell, discount codes
(debatable — see locked decisions), Stripe, or trigger ambassador payouts.

## Goal

Add a `va` role that gates a subset of admin pages and APIs, named to a
specific user (Mika), so Jorrel can hand her the URL + her own credentials
and walk away.

## Non-goals (v1)

- Multi-user admin accounts beyond the two named users (Jorrel, Mika).
  Future growth beyond ~4 users graduates to a real Supabase users table.
- Per-action audit logging. (Out of scope; address when there are enough
  hands on the system to need accountability.)
- 2FA / IP allowlists / session revocation UI. (One password per user, 7-day
  cookie, same as today's admin auth — just two of them now.)
- Password reset / self-service. Jorrel rotates env vars manually.
- A separate "VA dashboard" route. The VA lands on `/admin` like everyone
  else; the dashboard content swaps based on role.
- Refactoring the existing monolithic admin pages (e.g., the 577-line
  inventory page or the 500-line ambassadors page). Touch only what the
  feature needs.

## Locked product decisions

| # | Decision | Choice |
|---|----------|--------|
| 1 | Scope of VA access | Marketing (all 6 sub-modules) + Support Tickets. Excludes: inventory, orders, invoices, purchases, vendors, pricing, pre-sell, discount-codes (see #6), distributors. |
| 2 | Ambassador money exposure | VA sees commission amounts and payout history (Jorrel trusts her with the numbers). Only the **trigger payout button** and the underlying `/api/ambassador-payout` endpoint are blocked for her role. |
| 3 | Auth model | Tiny user list in `lib/admin-users.js` (named users with email + password from env vars). Login takes email + password. Rejected: env-var-only ("VA_PASSWORD") because Jorrel provided a specific email and naming the user is barely more work. Rejected: Supabase users table (overkill for 2 users). |
| 4 | Session storage | Two httpOnly cookies — `adonis_admin_role` (`admin` \| `va`) and `adonis_admin_email`. Replaces the legacy `adonis_admin=authenticated` cookie. All current sessions invalidated on deploy (acceptable — it's just Jorrel today). |
| 5 | Enforcement layer | **Both** middleware (route gating) **and** per-API role checks. Middleware is the UX boundary; API checks are the security boundary. |
| 6 | `discount-codes` access for VA | **Yes** — VA gets full access to `/admin/discount-codes` and `/api/discount-code-write`. Useful for ambassador / campaign promo codes. (Discount-code data is operational, not financial — listing codes and usage counts is fine for her role.) |
| 9 | Field-level limits on `/api/ambassador-write` for VA | The route currently accepts `name, email, phone, code, tier, status` and supports `delete`. For VA: allow `update` action with `status` and `code` only; **deny** `tier` (commission lever), `name/email/phone` (account identity), and `delete` action. Admin retains full access. Enforced inside the route handler, not the role guard, since this is sub-action authz. |
| 7 | Dashboard landing page for VA | Custom variant of `/admin` for `role === 'va'` showing pending support tickets, drafts awaiting approval, and subscribers in welcome stages. No revenue / inventory / PO numbers. |
| 8 | Backwards compat | None. On deploy, everyone re-logs-in once. |

## Architecture

### New files

- **`lib/admin-users.js`** — single source of truth for who can log in.

  ```js
  export const ADMIN_USERS = [
    { email: '<jorrel-email>',  password: process.env.ADMIN_PASSWORD, role: 'admin', name: 'Jorrel' },
    { email: 'mika@ascnd.pro',  password: process.env.VA_PASSWORD,    role: 'va',    name: 'Mika' },
  ];
  ```

  Jorrel's email is filled in during implementation. `VA_PASSWORD` is a new
  env var added to Vercel + `.env.local`.

- **`lib/admin-roles.js`** — role → allowed-paths and role → allowed-APIs
  maps. Single source of truth used by both middleware and API guards.

  ```js
  export const ROLE_ALLOWED_PATHS = {
    admin: ['*'],
    va: [
      '/admin',                  // dashboard landing (content varies by role)
      '/admin/marketing',        // hub + all 6 sub-modules
      '/admin/support-tickets',
      '/admin/discount-codes',   // create/manage promo codes for campaigns
    ],
  };

  export const ROLE_ALLOWED_APIS = {
    admin: ['*'],
    va: [
      '/api/admin-auth',
      '/api/ambassador-write',
      '/api/ambassador-message',
      '/api/ambassador-images',
      '/api/ambassador-content-digest',
      '/api/social-post-write',
      '/api/admin/news',         // covers all 6 nested news routes
      '/api/discount-code-write',
      '/api/subscribers-admin',
      '/api/subscribe-welcome-2',
      '/api/subscribe-welcome-3',
      '/api/support-tickets',
    ],
  };

  // Helper: prefix-match a request path against the allowed list.
  export function isPathAllowed(role, pathname) { ... }
  ```

- **`lib/get-current-admin.js`** — server-side helper that reads cookies and
  returns `{ role, email, name } | null`. Used by `layout.jsx`, the dashboard
  page, and any API route that needs to know who's calling.

- **`lib/require-admin-role.js`** — API guard. Wraps a handler:
  `export const POST = requireRole('admin', handler)`. Returns 403 JSON if
  the caller's role isn't in the allowed list. Existing API routes that
  currently rely only on the cookie boolean get this guard added.

### Modified files

- **[middleware.js](../../../middleware.js)** — instead of checking
  `adonis_admin === 'authenticated'`, read `adonis_admin_role`, look up
  allowed paths via `lib/admin-roles.js`, redirect to `/admin/login` if no
  role cookie or to `/admin` if role exists but path isn't allowed.

- **[app/api/admin-auth/route.js](../../../app/api/admin-auth/route.js)** —
  `POST` accepts `{ email, password }`, matches against `ADMIN_USERS`, sets
  `adonis_admin_role` and `adonis_admin_email` cookies on success. `DELETE`
  clears both.

- **[app/admin/login/page.jsx](../../../app/admin/login/page.jsx)** — add an
  email field above the password field. Send both in the POST body.

- **[app/admin/layout.jsx](../../../app/admin/layout.jsx)** — call
  `getCurrentAdmin()` server-side. Filter the 13-item nav array by role
  (using `ROLE_ALLOWED_PATHS`). Render "Logged in as {name}" badge in the
  top bar.

- **[app/admin/page.jsx](../../../app/admin/page.jsx)** — branch on
  `role === 'va'`. Admin variant unchanged. VA variant shows: pending
  support tickets count, news + post drafts awaiting approval, subscribers
  in welcome stages, quick-action cards to Marketing hub + Support Tickets.

- **[app/admin/marketing/ambassadors/page.jsx](../../../app/admin/marketing/ambassadors/page.jsx)** —
  hide the "Send payout" button when `role === 'va'`. Page receives role as
  a prop from the server component, or fetches it via a small client-side
  call to a new `/api/me` endpoint. (Implementation plan picks one.)

- **API routes** — add `requireRole` guard to every route. Routes in the
  VA-allowed list permit both roles; all others permit `admin` only.
  Specifically `/api/ambassador-payout` permits `admin` only — this is the
  real enforcement of decision #2.

- **[app/api/ambassador-write/route.js](../../../app/api/ambassador-write/route.js)** —
  in addition to `requireRole('admin', 'va')`, add a sub-action check: if
  caller's role is `va`, restrict `action` to `update` only and intersect
  the `ALLOWED_FIELDS` list with `['status', 'code']` before applying the
  patch. Deny payload fields outside this set with 403 (don't silently drop
  — surface the restriction so the UI can hide controls accordingly).
  Implements decision #9.

## Data flow

**Login:**
```
Mika visits /admin → middleware sees no cookie → redirects to /admin/login
  → enters mika@ascnd.pro + password → POST /api/admin-auth
  → matches ADMIN_USERS → sets cookies adonis_admin_role=va, adonis_admin_email=mika@ascnd.pro
  → redirects to /admin
```

**Page request:**
```
Mika visits /admin/inventory → middleware reads role=va
  → isPathAllowed('va', '/admin/inventory') === false
  → redirect to /admin
```

**API request:**
```
Mika's browser somehow POSTs /api/inventory-adjust → handler wrapped in
  requireRole('admin') → reads role=va from cookie → returns 403
```

## Error handling

- Missing `VA_PASSWORD` env var: login attempt for Mika returns "Invalid
  password" (we don't leak that the env var is missing). Admin login still
  works.
- Missing `ADMIN_PASSWORD` env var: existing behavior preserved (returns 500
  with config error).
- Invalid email + password combo: returns 401 "Invalid credentials" (don't
  distinguish wrong-email from wrong-password — standard practice).
- Role cookie present but role unknown (e.g., we removed `va` from the user
  list but their cookie is still live): treat as logged out, redirect to
  login.

## Testing

No automated test framework in this repo. Manual verification checklist:

1. As admin: log in with email + password, see all 13 nav items, see
   payout button on ambassadors page, dashboard shows revenue/stock metrics.
2. As VA: log in with `mika@ascnd.pro` + VA password, see only Marketing
   + Support Tickets in nav, see ambassadors page without payout button,
   see VA dashboard variant with no revenue numbers.
3. As VA, manually navigate to `/admin/inventory` → redirected to `/admin`.
4. As VA, `curl -X POST /api/inventory-adjust` with the VA cookie → 403.
5. As VA, `curl -X POST /api/ambassador-payout` with the VA cookie → 403.
6. As VA, send an ambassador message → success.
7. As VA, on the ambassador edit form, change `status` from active to paused → success. Attempt to change `tier` → blocked (403 from API; ideally tier field is hidden in UI for VA role).
8. As VA, attempt `delete` action against `/api/ambassador-write` via curl → 403.
9. As VA, approve a news draft → success.
10. As VA, reply to a support ticket → success.
11. Logout from VA account → both cookies cleared, redirected to login.
12. Old `adonis_admin=authenticated` cookie present (simulating
    pre-deploy session) → treated as logged out, redirected to login.

## Open questions

None. All decisions locked above.
