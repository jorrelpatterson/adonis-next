# VA Sub-Admin Role Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** [docs/superpowers/specs/2026-05-15-va-subadmin-role-design.md](../specs/2026-05-15-va-subadmin-role-design.md)

**Goal:** Add a `va` role for Mika (`mika@ascnd.pro`) that gates her access to marketing, support tickets, and discount codes — explicitly excluding inventory, orders, invoices, vendors, purchases, pricing, pre-sell, distributors, and ambassador payouts.

**Architecture:** Tiny named-user list in `lib/admin-users.js` (Jorrel + Mika). Two httpOnly cookies (`adonis_admin_role` + `adonis_admin_email`) replace the legacy boolean cookie. Enforcement at two layers: middleware (route gating) and per-API guards (`requireRole`). Field-level sub-action authz on `/api/ambassador-write` blocks tier changes and deletes for VA.

**Tech Stack:** Next.js 14 App Router, JavaScript (no TypeScript), vanilla CSS. No test framework — verification is manual via `npm run dev` + browser/curl.

**Important rollout note:** Tasks 2-5 collectively change cookie format and auth flow. Don't deploy partway — execute through at least Task 5 before pushing to Vercel. Local dev requires clearing cookies and re-logging in once between Tasks 2 and 3.

---

## File Map

**Create:**
- `lib/admin-users.js` — named user list with email, password (from env), role, name
- `lib/admin-roles.js` — role → allowed paths/APIs maps + `isPathAllowed` helper
- `lib/get-current-admin.js` — server-side cookie reader returning `{role, email, name} | null`
- `app/api/me/route.js` — small endpoint returning current user (used by client components like ambassadors page)

**Modify:**
- `lib/requireAdmin.js` — replaced with role-aware `requireRole(request, ...allowedRoles)`. Old `requireAdmin` export kept as alias for `requireRole(request, 'admin')` so existing callers don't break during rollout.
- `middleware.js` — read `adonis_admin_role` cookie, gate by `ROLE_ALLOWED_PATHS`
- `app/api/admin-auth/route.js` — accept `{email, password}`, set new cookies
- `app/admin/login/page.jsx` — add email field above password
- `app/admin/layout.jsx` — filter nav by role, show "Logged in as {name}" badge
- `app/admin/page.jsx` — branch on role for VA dashboard variant
- `app/admin/marketing/ambassadors/page.jsx` — hide payout button + tier dropdown when role = va
- `app/api/ambassador-write/route.js` — sub-action authz for VA (status + code only, no delete)
- ~30 other API routes — call `requireRole(request, 'admin')` or `requireRole(request, 'admin', 'va')`

---

## Environment setup (one-time, before Task 2)

- [ ] **Add `VA_PASSWORD` to `.env.local`**

Edit `.env.local` and add a line:

```
VA_PASSWORD=<choose-a-strong-password-for-mika>
```

- [ ] **Add `VA_PASSWORD` to Vercel**

Run:

```bash
vercel env add VA_PASSWORD production
```

Paste the same password when prompted. Repeat for `preview` and `development` environments.

- [ ] **Confirm Jorrel's login email**

The plan uses `jorrelpatterson@gmail.com` as Jorrel's login email. If a different email is preferred (e.g., `jorrel@advncelabs.com`), substitute it everywhere it appears in Task 1.

---

## Task 1: Auth foundation libs

**Files:**
- Create: `lib/admin-users.js`
- Create: `lib/admin-roles.js`
- Create: `lib/get-current-admin.js`

No behavior change yet — these are pure additions.

- [ ] **Step 1: Create `lib/admin-users.js`**

```js
// lib/admin-users.js
// Named admin users. Adding a user = add a row + add an env var for their password.
// To rotate a password: change the env var on Vercel + .env.local, redeploy.

export const ADMIN_USERS = [
  {
    email: 'jorrelpatterson@gmail.com',
    password: process.env.ADMIN_PASSWORD,
    role: 'admin',
    name: 'Jorrel',
  },
  {
    email: 'mika@ascnd.pro',
    password: process.env.VA_PASSWORD,
    role: 'va',
    name: 'Mika',
  },
];

export function findUserByCredentials(email, password) {
  if (!email || !password) return null;
  const normalized = String(email).trim().toLowerCase();
  const user = ADMIN_USERS.find(u => u.email.toLowerCase() === normalized);
  if (!user) return null;
  if (!user.password) return null; // env var unset
  if (user.password !== password) return null;
  return { email: user.email, role: user.role, name: user.name };
}

export function findUserByEmail(email) {
  if (!email) return null;
  const normalized = String(email).trim().toLowerCase();
  const user = ADMIN_USERS.find(u => u.email.toLowerCase() === normalized);
  return user ? { email: user.email, role: user.role, name: user.name } : null;
}
```

- [ ] **Step 2: Create `lib/admin-roles.js`**

```js
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
```

- [ ] **Step 3: Create `lib/get-current-admin.js`**

```js
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
```

- [ ] **Step 4: Verify the files parse**

Run:

```bash
npm run lint
```

Expected: Lint passes (or surfaces only pre-existing warnings unrelated to the new files).

- [ ] **Step 5: Commit**

```bash
git add lib/admin-users.js lib/admin-roles.js lib/get-current-admin.js
git commit -m "auth: add admin-users + admin-roles + get-current-admin foundation"
```

---

## Task 2: Replace requireAdmin with requireRole

**Files:**
- Modify: `lib/requireAdmin.js` (replaced contents, both names exported)

This task changes the cookie that auth checks against. Existing logged-in admin sessions break locally — that's expected. Re-login happens in Task 3.

- [ ] **Step 1: Replace `lib/requireAdmin.js`**

```js
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
```

- [ ] **Step 2: Verify lint**

Run:

```bash
npm run lint
```

Expected: passes. (Behavior verification happens after Task 3 when admin can log in again.)

- [ ] **Step 3: Commit**

```bash
git add lib/requireAdmin.js
git commit -m "auth: requireAdmin → role-aware requireRole, keep requireAdmin alias"
```

---

## Task 3: Update admin-auth route + login UI

**Files:**
- Modify: `app/api/admin-auth/route.js`
- Modify: `app/admin/login/page.jsx`

- [ ] **Step 1: Replace `app/api/admin-auth/route.js`**

```js
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
```

- [ ] **Step 2: Update `app/admin/login/page.jsx` to add email field**

In `app/admin/login/page.jsx`, find the `LoginInner` component. Make these specific changes:

Add `email` state next to `password` state (around line 8):

```jsx
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
```

Update `handleLogin`'s fetch body to include email (around line 25):

```jsx
body: JSON.stringify({ email, password }),
```

Replace the password-only input block (around lines 70-84) with both fields:

```jsx
<input
  type="email"
  placeholder="Email"
  value={email}
  onChange={e => setEmail(e.target.value)}
  onKeyDown={e => e.key === 'Enter' && password && handleLogin(e)}
  autoFocus
  style={{
    width: '100%', padding: '14px 16px', border: '1.5px solid #E4E7EC',
    borderRadius: 8, fontSize: 15, outline: 'none', background: '#FAFBFC',
    transition: 'border-color 0.2s',
  }}
  onFocus={e => e.target.style.borderColor = '#0072B5'}
  onBlur={e => e.target.style.borderColor = '#E4E7EC'}
/>
<input
  type="password"
  placeholder="Password"
  value={password}
  onChange={e => setPassword(e.target.value)}
  onKeyDown={e => e.key === 'Enter' && email && handleLogin(e)}
  style={{
    width: '100%', padding: '14px 16px', border: '1.5px solid #E4E7EC',
    borderRadius: 8, fontSize: 15, outline: 'none', background: '#FAFBFC',
    transition: 'border-color 0.2s',
  }}
  onFocus={e => e.target.style.borderColor = '#0072B5'}
  onBlur={e => e.target.style.borderColor = '#E4E7EC'}
/>
```

Update the disabled / colored styling on the submit button (around line 95) to require both fields:

```jsx
disabled={!email || !password || loading}
...
background: email && password && !loading ? '#0072B5' : '#E4E7EC',
color: email && password && !loading ? '#fff' : '#8C919E',
```

Update the error message (around line 32) to be generic for the new flow:

```jsx
setError('Invalid credentials');
setPassword('');
```

Update the prompt text (around line 66) from "Enter your admin password to continue" to "Sign in to continue".

- [ ] **Step 3: Manually verify admin login flow**

In a terminal:

```bash
npm run dev
```

In a browser, clear cookies for `localhost:3000`, then visit `http://localhost:3000/admin/login`.

Enter `jorrelpatterson@gmail.com` + the value of `ADMIN_PASSWORD`. Submit.

Expected: redirect to `/admin`, dashboard renders normally, all admin pages work.

In browser devtools → Application → Cookies → `localhost:3000`, confirm:
- `adonis_admin_role` = `admin`
- `adonis_admin_email` = `jorrelpatterson@gmail.com`
- No `adonis_admin` cookie (or it's empty/expired)

- [ ] **Step 4: Manually verify VA login flow**

Click logout (top bar). Cookies cleared.

Re-login as `mika@ascnd.pro` + the value of `VA_PASSWORD`.

Expected: redirect to `/admin`. Dashboard renders. (Nav still shows all items — middleware not yet updated; that's Task 4.) Cookie `adonis_admin_role` = `va`.

If the form rejects valid credentials, double-check `.env.local` has `VA_PASSWORD` set and dev server was restarted after adding it.

- [ ] **Step 5: Commit**

```bash
git add app/api/admin-auth/route.js app/admin/login/page.jsx
git commit -m "auth: admin-auth accepts email+password, login page adds email field"
```

---

## Task 4: Update middleware to gate by role

**Files:**
- Modify: `middleware.js`

- [ ] **Step 1: Replace `middleware.js`**

```js
// middleware.js
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
```

- [ ] **Step 2: Manually verify admin still has full access**

With dev server running, log in as Jorrel.

Visit `/admin/inventory`, `/admin/orders`, `/admin/marketing`, `/admin/support-tickets`, `/admin/pricing` — all load.

- [ ] **Step 3: Manually verify VA route gating**

Logout, log in as Mika.

Try each URL:
- `/admin` → loads (dashboard variant comes in Task 7; for now just confirms no redirect)
- `/admin/marketing` → loads
- `/admin/marketing/ambassadors` → loads
- `/admin/marketing/content` → loads
- `/admin/marketing/news` → loads
- `/admin/support-tickets` → loads
- `/admin/discount-codes` → loads
- `/admin/inventory` → redirected to `/admin`
- `/admin/orders` → redirected to `/admin`
- `/admin/invoices` → redirected to `/admin`
- `/admin/pricing` → redirected to `/admin`
- `/admin/vendors` → redirected to `/admin`
- `/admin/purchases` → redirected to `/admin`
- `/admin/pre-sell` → redirected to `/admin`
- `/admin/distributors` → redirected to `/admin`

- [ ] **Step 4: Commit**

```bash
git add middleware.js
git commit -m "auth: middleware gates routes by role-allowed paths"
```

---

## Task 5: Create `/api/me` endpoint

**Files:**
- Create: `app/api/me/route.js`

Tiny endpoint that client components call to know who's logged in. Both `app/admin/layout.jsx` and `app/admin/page.jsx` are `'use client'` components, so they can't use `getCurrentAdmin()` directly — they fetch this endpoint instead.

- [ ] **Step 1: Create `app/api/me/route.js`**

```js
// app/api/me/route.js
// Returns the current admin user (or null if not logged in).
// Used by client components that need to render conditionally on role.

import { NextResponse } from 'next/server';
import { getCurrentAdmin } from '../../../lib/get-current-admin';

export async function GET() {
  const user = getCurrentAdmin();
  return NextResponse.json({ user });
}
```

- [ ] **Step 2: Manually verify**

```bash
curl -i -b "adonis_admin_role=va; adonis_admin_email=mika@ascnd.pro" http://localhost:3000/api/me
```

Expected: `200 OK`, body `{"user":{"email":"mika@ascnd.pro","role":"va","name":"Mika"}}`.

```bash
curl -i http://localhost:3000/api/me
```

Expected: `200 OK`, body `{"user":null}`.

- [ ] **Step 3: Commit**

```bash
git add app/api/me/route.js
git commit -m "api: add /api/me for client-side current-user lookup"
```

---

## Task 6: Layout — nav filter + user badge

**Files:**
- Modify: `app/admin/layout.jsx`

`app/admin/layout.jsx` is a `'use client'` component. We fetch `/api/me` on mount and filter the nav once the user is known.

- [ ] **Step 1: Read `app/admin/layout.jsx` to confirm structure**

Key spots (approximate line numbers from the current file):
- Line 7: `NAV` array (13 items)
- Line 23: `AdminLayout` component start (`'use client'`, exists as default export)
- Line 42: `if (pathname === '/admin/login') return children;` — login page bypasses the layout chrome, so badge / nav filter never affect it
- Line 96: `NAV.map(item => ...)` rendering nav links
- Line 115-125: Bottom-of-sidebar block with logout button — badge goes here

- [ ] **Step 2: Add the import**

At the top, alongside existing imports:

```jsx
import { isPathAllowed } from '../../lib/admin-roles';
```

- [ ] **Step 3: Add user state + fetch effect inside `AdminLayout`**

After the existing `useState` calls (around line 26), add:

```jsx
const [currentUser, setCurrentUser] = useState(null);
const [userLoaded, setUserLoaded] = useState(false);

useEffect(() => {
  fetch('/api/me')
    .then(r => r.json())
    .then(d => { setCurrentUser(d.user); setUserLoaded(true); })
    .catch(() => setUserLoaded(true));
}, []);
```

(`useEffect` is already imported.)

- [ ] **Step 4: Filter the nav**

Replace the `{NAV.map(item => { ... })}` block (around line 96) with:

```jsx
{NAV
  .filter(item => {
    if (!userLoaded || !currentUser) return false; // while loading, show nothing — avoids flashing admin items at VA users
    return isPathAllowed(currentUser.role, item.href);
  })
  .map(item => {
    const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
    return (
      <Link key={item.href} href={item.href} style={{
        display:'flex', alignItems:'center', gap:12,
        padding: collapsed ? '12px 18px' : '12px 20px',
        color:      active ? '#E8D5B7' : '#6B7A94',
        background: active ? 'rgba(232,213,183,0.06)' : 'transparent',
        borderLeft: active ? '3px solid #E8D5B7' : '3px solid transparent',
        textDecoration:'none', fontSize:13, fontWeight: active ? 600 : 400,
        transition:'all 0.15s',
      }}>
        <span style={{ fontSize:16 }}>{item.icon}</span>
        {!collapsed && item.label}
      </Link>
    );
  })}
```

- [ ] **Step 5: Add "Logged in as {name}" badge above the logout button**

In the bottom-of-sidebar block (the `{!collapsed && (...)}` around line 115), insert the badge just above the `<button onClick={handleLogout}>` line:

```jsx
{currentUser && (
  <div style={{
    fontSize: 11, color: '#9BA5BD', marginBottom: 4,
  }}>
    Signed in as <span style={{ color: '#E8D5B7', fontWeight: 600 }}>{currentUser.name}</span>
    <span style={{ color: '#6B7A94' }}> · {currentUser.role}</span>
  </div>
)}
```

(Color values match the dark sidebar palette already in the file: muted text `#6B7A94`, accent `#E8D5B7`.)

- [ ] **Step 5: Manually verify**

Restart dev server. Log in as admin (`jorrelpatterson@gmail.com`). After page load:
- Top bar shows "Jorrel · admin" badge next to logout button
- Nav has all 13 items

Logout, log in as Mika:
- Top bar shows "Mika · va"
- Nav shows only: Dashboard, Marketing, Support Tickets, Discount Codes

There may be a brief flash on first load while `/api/me` resolves. Acceptable for v1.

- [ ] **Step 6: Commit**

```bash
git add app/admin/layout.jsx
git commit -m "admin: filter nav by role, show 'Logged in as' badge"
```

---

## Task 7: VA dashboard variant

**Files:**
- Modify: `app/admin/page.jsx`

`app/admin/page.jsx` is a `'use client'` component that uses `useEffect` to load stats. We do the same for the VA variant.

- [ ] **Step 1: Add user-state branching at the top of the component**

Open `app/admin/page.jsx`. Inside the component (after existing `useState` calls), add:

```jsx
const [currentUser, setCurrentUser] = useState(null);
const [userLoaded, setUserLoaded] = useState(false);

useEffect(() => {
  fetch('/api/me')
    .then(r => r.json())
    .then(d => { setCurrentUser(d.user); setUserLoaded(true); })
    .catch(() => setUserLoaded(true));
}, []);
```

(Reuse the existing `useState` / `useEffect` imports.)

- [ ] **Step 2: Render VA dashboard when role === 'va'**

After the user-loading effect, branch:

```jsx
if (!userLoaded) return null;
if (currentUser?.role === 'va') return <VaDashboard />;

// ... existing admin dashboard JSX continues below, unchanged
```

- [ ] **Step 3: Add `VaDashboard` component in the same file**

Below the default export, add:

```jsx
function VaDashboard() {
  const [counts, setCounts] = useState({ tickets: 0, drafts: 0, posts: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const fourteenDaysOut = new Date();
        fourteenDaysOut.setDate(fourteenDaysOut.getDate() + 14);

        const [t, d, p] = await Promise.all([
          supabase.from('support_tickets').select('id', { count: 'exact', head: true }).in('status', ['open', 'in_progress']),
          supabase.from('post_drafts').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('social_posts').select('id', { count: 'exact', head: true }).eq('status', 'scheduled').lte('scheduled_date', fourteenDaysOut.toISOString()),
        ]);
        setCounts({
          tickets: t.count ?? 0,
          drafts: d.count ?? 0,
          posts: p.count ?? 0,
        });
      } catch (e) {
        // counts stay 0 on error
      }
      setLoading(false);
    }
    load();
  }, []);

  const tiles = [
    { label: 'Open support tickets', value: counts.tickets, color: '#E07C24', href: '/admin/support-tickets' },
    { label: 'News drafts to review', value: counts.drafts, color: '#0072B5', href: '/admin/marketing/news' },
    { label: 'Posts scheduled (next 14d)', value: counts.posts, color: '#00A0A8', href: '/admin/marketing/content' },
  ];

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0F1928', marginBottom: 24 }}>
        Marketing dashboard
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
        {tiles.map(t => (
          <a key={t.label} href={t.href} style={{
            display: 'block', padding: 20, background: '#fff', border: '1px solid #E4E7EC',
            borderRadius: 10, textDecoration: 'none', color: '#0F1928',
          }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: t.color, marginBottom: 4 }}>
              {loading ? '—' : t.value}
            </div>
            <div style={{ fontSize: 13, color: '#8C919E' }}>{t.label}</div>
          </a>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        <a href="/admin/marketing" style={{
          display: 'block', padding: 24, background: '#0F1928', color: '#fff',
          borderRadius: 10, textDecoration: 'none',
        }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Marketing hub →</div>
          <div style={{ fontSize: 13, color: '#B0B4BC' }}>Content, news, ambassadors, subscribers, campaigns</div>
        </a>
        <a href="/admin/support-tickets" style={{
          display: 'block', padding: 24, background: '#fff', border: '1px solid #E4E7EC',
          color: '#0F1928', borderRadius: 10, textDecoration: 'none',
        }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Support tickets →</div>
          <div style={{ fontSize: 13, color: '#8C919E' }}>Reply to customers, manage open issues</div>
        </a>
      </div>
    </div>
  );
}
```

(`supabase` is already imported at the top of the file from `'../../lib/supabase'`.)

- [ ] **Step 4: Manually verify**

Log in as Jorrel → original dashboard with revenue/inventory/PO tiles. Unchanged.

Log in as Mika → VaDashboard with three count tiles + two quick-action cards. No revenue numbers visible.

If counts show as 0/0/0 even though there's data: the browser anon-key supabase client may be RLS-blocked on those tables. Check the Network tab for 401/403 from Supabase. If RLS is in the way, the same issue would affect the admin dashboard's existing reads — investigate at that layer (out of scope for this plan).

- [ ] **Step 5: Commit**

```bash
git add app/admin/page.jsx
git commit -m "admin: VA dashboard variant — tickets, drafts, scheduled posts"
```

---

## Task 8: Lock down admin-only API routes

**Files (modify, each adds a `requireRole(request, 'admin')` guard):**

```
app/api/inventory/route.js
app/api/inventory-adjust/route.js                (already uses requireAdmin — no change needed)
app/api/inventory-adjustments/route.js           (already uses requireAdmin — no change needed)
app/api/inventory-loss-stats/route.js            (already uses requireAdmin — no change needed)
app/api/orders/route.js
app/api/order-customer-update/route.js           (already uses requireAdmin — no change needed)
app/api/past-customers/route.js                  (already uses requireAdmin — no change needed)
app/api/invoice-list/route.js                    (already uses requireAdmin — no change needed)
app/api/invoice-get/route.js                     (already uses requireAdmin — no change needed)
app/api/invoice-stats/route.js                   (already uses requireAdmin — no change needed)
app/api/invoice-write/route.js                   (already uses requireAdmin — no change needed)
app/api/invoice-transition/route.js              (already uses requireAdmin — no change needed)
app/api/vendor-write/route.js
app/api/vendor-prices-write/route.js
app/api/purchase-write/route.js
app/api/purchase-receive/route.js
app/api/product-write/route.js
app/api/presell-cancel/route.js                  (already uses requireAdmin — no change needed)
app/api/presell-po-placed/route.js               (already uses requireAdmin — no change needed)
app/api/presell-queue/route.js                   (already uses requireAdmin — no change needed)
app/api/ambassador-payout/route.js               (already uses requireAdmin — no change needed)
app/api/ambassador-welcome/route.js              (already uses requireAdmin — no change needed)
app/api/notify/route.js
app/api/env-check/route.js
```

Routes already using `requireAdmin(request)` work as-is because Task 2's alias preserves admin-only behavior. The list above is split into "needs the guard added" vs "already protected — verify only."

- [ ] **Step 1: Add guards to the unprotected routes**

For each of these files, add the import + guard at the top of the POST/GET/etc. handler:

- `app/api/inventory/route.js`
- `app/api/orders/route.js`
- `app/api/vendor-write/route.js`
- `app/api/vendor-prices-write/route.js`
- `app/api/purchase-write/route.js`
- `app/api/purchase-receive/route.js`
- `app/api/product-write/route.js`
- `app/api/notify/route.js`
- `app/api/env-check/route.js`

Pattern (adjust path depth `../../../` based on how nested the file is):

```js
import { requireRole } from '../../../lib/requireAdmin';

export async function POST(request) {
  const unauth = requireRole(request, 'admin');
  if (unauth) return unauth;

  // ...existing handler body
}
```

For routes with both GET and POST (like `env-check`), guard each verb separately.

`app/api/checkout/route.js` and `app/api/stripe/route.js` are **public** (customer checkout + Stripe webhook) — do NOT add a guard to these.

`app/api/cron/*` routes use `requireAdminOrCron` — do NOT touch these.

- [ ] **Step 2: Manually verify VA gets blocked**

With dev server running, logged in as Mika, in browser devtools console:

```js
fetch('/api/inventory', {method:'POST', headers:{'Content-Type':'application/json'}, body:'{}'}).then(r => console.log(r.status));
fetch('/api/orders', {method:'POST', headers:{'Content-Type':'application/json'}, body:'{}'}).then(r => console.log(r.status));
fetch('/api/vendor-write', {method:'POST', headers:{'Content-Type':'application/json'}, body:'{}'}).then(r => console.log(r.status));
fetch('/api/ambassador-payout', {method:'POST', headers:{'Content-Type':'application/json'}, body:'{}'}).then(r => console.log(r.status));
```

Expected: each prints `403`.

- [ ] **Step 3: Manually verify admin still has access**

Logout, log in as Jorrel. Visit `/admin/inventory` — page loads. Visit `/admin/orders` — loads. Visit `/admin/vendors` — loads. (Don't actually mutate anything; loading these pages exercises the API GETs.)

- [ ] **Step 4: Commit**

```bash
git add app/api/inventory/route.js app/api/orders/route.js app/api/vendor-write/route.js app/api/vendor-prices-write/route.js app/api/purchase-write/route.js app/api/purchase-receive/route.js app/api/product-write/route.js app/api/notify/route.js app/api/env-check/route.js
git commit -m "api: gate previously-unprotected admin routes with requireRole('admin')"
```

---

## Task 9: Open VA-allowed API routes

**Files (modify each to allow both roles):**

```
app/api/ambassador-message/route.js
app/api/ambassador-images/personalize/route.js
app/api/ambassador-content-digest/route.js
app/api/social-post-write/route.js
app/api/admin/news/approve/[draftId]/route.js
app/api/admin/news/skip/[draftId]/route.js
app/api/admin/news/regenerate/[draftId]/route.js
app/api/admin/news/render/[draftId]/route.js
app/api/admin/news/flip-color/[draftId]/route.js
app/api/admin/news/force-approve/[draftId]/route.js
app/api/admin/news/update-caption/[draftId]/route.js
app/api/admin/news/candidates/[id]/flag/route.js
app/api/discount-code-write/route.js
app/api/subscribers-admin/route.js
app/api/subscribe-welcome-2/route.js
app/api/subscribe-welcome-3/route.js
app/api/support-tickets/route.js
```

- [ ] **Step 1: For each route currently using `requireAdmin(request)`, change to `requireRole(request, 'admin', 'va')`**

Find this line in each file:

```js
import { requireAdmin } from '../../../lib/requireAdmin';
```

Change to:

```js
import { requireRole } from '../../../lib/requireAdmin';
```

(Adjust the relative path depth based on file nesting.)

Find the guard call:

```js
const unauth = requireAdmin(request); if (unauth) return unauth;
```

Change to:

```js
const unauth = requireRole(request, 'admin', 'va'); if (unauth) return unauth;
```

`/api/ambassador-write/route.js` — leave the guard call as `requireRole(request, 'admin', 'va')` here too. Sub-action authz is added in Task 10.

- [ ] **Step 2: For `/api/social-post-write/route.js` (currently unprotected), add the guard**

```js
import { requireRole } from '../../../lib/requireAdmin';

export async function POST(request) {
  const unauth = requireRole(request, 'admin', 'va');
  if (unauth) return unauth;

  // ...existing handler body
}
```

- [ ] **Step 3: Manually verify VA can hit these endpoints**

Logged in as Mika, in browser devtools console:

```js
fetch('/api/subscribers-admin').then(r => console.log('subscribers', r.status));
fetch('/api/support-tickets').then(r => console.log('support', r.status));
```

Expected: both `200`.

Visit `/admin/marketing/news` — page loads, news drafts appear, you can interact with them (approve/skip/regenerate buttons should work — try one if there's a draft).

Visit `/admin/marketing/content` — page loads.

Visit `/admin/marketing/ambassadors` — page loads (payout button still visible — Task 11 hides it).

- [ ] **Step 4: Manually verify admin still works**

Log in as Jorrel, exercise the same pages. Everything works.

- [ ] **Step 5: Commit**

```bash
git add app/api/ambassador-message/route.js app/api/ambassador-images/personalize/route.js app/api/ambassador-content-digest/route.js app/api/social-post-write/route.js app/api/admin/news/ app/api/discount-code-write/route.js app/api/subscribers-admin/route.js app/api/subscribe-welcome-2/route.js app/api/subscribe-welcome-3/route.js app/api/support-tickets/route.js
git commit -m "api: open VA-allowed routes (marketing, news, support, subscribers)"
```

---

## Task 10: Sub-action authz on ambassador-write

**Files:**
- Modify: `app/api/ambassador-write/route.js`

- [ ] **Step 1: Update the import at the top**

Change:

```js
import { requireAdmin } from '../../../lib/requireAdmin';
```

to:

```js
import { requireRole } from '../../../lib/requireAdmin';
import { findUserByEmail } from '../../../lib/admin-users';
```

- [ ] **Step 2: Define VA-restricted fields above the POST handler**

Add near the top of the file, alongside `ALLOWED_FIELDS`:

```js
const VA_ALLOWED_FIELDS = ['status', 'code']; // VA can change status (active/paused/banned) and the referral code
```

- [ ] **Step 3: Replace the guard line + add sub-action checks**

The current line is:

```js
const unauth = requireAdmin(request); if (unauth) return unauth;
```

Replace with:

```js
const unauth = requireRole(request, 'admin', 'va'); if (unauth) return unauth;

const role = request.cookies.get('adonis_admin_role')?.value;
const isVA = role === 'va';
```

Then, after parsing `body` and destructuring `{ action, id, fields }`, add:

```js
// VA sub-action restrictions
if (isVA && action === 'delete') {
  return NextResponse.json({ error: 'Forbidden: VA cannot delete ambassadors' }, { status: 403 });
}
if (isVA && fields && typeof fields === 'object') {
  const disallowed = Object.keys(fields).filter(k => !VA_ALLOWED_FIELDS.includes(k));
  if (disallowed.length) {
    return NextResponse.json({
      error: `Forbidden: VA cannot edit fields: ${disallowed.join(', ')}`,
    }, { status: 403 });
  }
}
```

Place this block *before* the existing `if (action === 'delete')` handler (so it short-circuits) and *before* the `for (const k of ALLOWED_FIELDS)` loop.

- [ ] **Step 4: Manually verify VA restrictions**

Logged in as Mika, in browser devtools console (replace `<some-uuid>` with a real ambassador ID — grab one from the network tab on `/admin/marketing/ambassadors`):

```js
// Should succeed: status change
fetch('/api/ambassador-write', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({ action: 'update', id: '<some-uuid>', fields: { status: 'paused' } })
}).then(r => r.json().then(j => console.log('status update:', r.status, j)));

// Should fail: tier change
fetch('/api/ambassador-write', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({ action: 'update', id: '<some-uuid>', fields: { tier: 'elite' } })
}).then(r => r.json().then(j => console.log('tier update:', r.status, j)));

// Should fail: delete
fetch('/api/ambassador-write', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({ action: 'delete', id: '<some-uuid>' })
}).then(r => r.json().then(j => console.log('delete:', r.status, j)));
```

Expected output:
- status update: `200 {success: true}`
- tier update: `403 {error: "Forbidden: VA cannot edit fields: tier"}`
- delete: `403 {error: "Forbidden: VA cannot delete ambassadors"}`

(Important: re-set status back to `active` after the test if you flipped a real ambassador.)

- [ ] **Step 5: Manually verify admin still has full access**

Log in as Jorrel. Same three calls — all should return 200/success (don't actually delete anyone; you can test by toggling status back and forth, and use a fake UUID for the delete test which will return a different error from Supabase, not 403).

- [ ] **Step 6: Commit**

```bash
git add app/api/ambassador-write/route.js
git commit -m "api: ambassador-write VA can update status+code only, no delete or tier"
```

---

## Task 11: Hide payout button + tier dropdown for VA on ambassadors page

**Files:**
- Modify: `app/admin/marketing/ambassadors/page.jsx`

- [ ] **Step 1: Open the file and identify**

Open `app/admin/marketing/ambassadors/page.jsx`. The file is ~500 lines. Search for these markers (they may be named slightly differently — adjust):

- A button labeled "Send payout" or similar (the action that triggers `/api/ambassador-payout`)
- A `<select>` or input bound to `tier` in the ambassador edit form
- Whether the file is `'use client'` (likely — it has interactive forms)

- [ ] **Step 2: Fetch current user role on mount**

Near the top of the component, alongside other `useState` calls, add:

```jsx
const [currentUser, setCurrentUser] = useState(null);

useEffect(() => {
  fetch('/api/me')
    .then(r => r.json())
    .then(d => setCurrentUser(d.user))
    .catch(() => {});
}, []);

const isVA = currentUser?.role === 'va';
```

(Make sure `useEffect` is imported alongside `useState` from `react`.)

- [ ] **Step 3: Wrap the payout button**

Find the payout button JSX. Wrap it in a conditional:

```jsx
{!isVA && (
  <button onClick={...}>Send payout</button>
)}
```

(If the payout flow has multiple buttons — e.g., "Mark paid" / "Trigger payout" / payout history actions — wrap each one.)

- [ ] **Step 4: Wrap the tier dropdown**

Find the tier `<select>` or input in the ambassador edit form. Wrap similarly:

```jsx
{!isVA && (
  <label>
    Tier
    <select value={...} onChange={...}>
      <option value="starter">starter</option>
      <option value="builder">builder</option>
      <option value="elite">elite</option>
    </select>
  </label>
)}
```

(For VA, the field simply doesn't appear in the form. Their submit will only include the fields that were rendered.)

- [ ] **Step 5: Manually verify**

Log in as Mika. Visit `/admin/marketing/ambassadors`. For each ambassador row:
- No "Send payout" button visible
- Edit form opens — no tier dropdown visible
- Status dropdown still works (active / paused / banned)
- Other fields (name, email, etc.) — these are still visible in the form. If you submit changes to them as VA, the API in Task 10 will return 403. (Acceptable: she gets an error message and learns not to edit those fields. If you want to be polite, make the same fields read-only in the UI too — out of scope for v1.)

Log in as Jorrel. Same page — payout button visible, tier dropdown visible. Everything works as before.

- [ ] **Step 6: Commit**

```bash
git add app/admin/marketing/ambassadors/page.jsx
git commit -m "admin: hide payout button + tier field on ambassadors page for VA role"
```

---

## Task 12: End-to-end manual verification

No code changes. Walk through the spec's verification checklist to catch anything that slipped through.

- [ ] **Step 1: Clear all browser cookies for `localhost:3000`**

In devtools → Application → Cookies → right-click → Clear.

- [ ] **Step 2: Verify admin flow**

1. Visit `/admin` → redirected to `/admin/login`
2. Sign in as `jorrelpatterson@gmail.com` + `ADMIN_PASSWORD`
3. Confirm: full dashboard with revenue/inventory tiles, all 13 nav items, "Jorrel · admin" badge in top bar
4. Click into `/admin/marketing/ambassadors` — confirm payout button + tier dropdown visible
5. Click into `/admin/inventory` — page loads
6. Logout → cookies cleared, redirected to login

- [ ] **Step 3: Verify VA flow**

1. Sign in as `mika@ascnd.pro` + `VA_PASSWORD`
2. Confirm: VA dashboard with 3 tiles (tickets, news drafts, scheduled posts), nav shows only Dashboard / Marketing / Support Tickets / Discount Codes, "Mika · va" badge
3. Visit `/admin/inventory` directly via URL → redirected back to `/admin`
4. Visit `/admin/orders` directly → redirected
5. Visit `/admin/marketing/ambassadors` → loads; no payout button; no tier dropdown in edit form
6. Visit `/admin/marketing/news` → loads, you can approve/regenerate drafts
7. Visit `/admin/marketing/content` → loads, can interact with social post calendar
8. Visit `/admin/support-tickets` → loads, can reply to a ticket
9. Visit `/admin/discount-codes` → loads, can create a discount code
10. Logout → cookies cleared

- [ ] **Step 4: Verify API enforcement (defense in depth)**

While logged out (no cookies):

```bash
curl -i http://localhost:3000/api/inventory -X POST -H 'Content-Type: application/json' -d '{}'
```

Expected: `401 {"error":"Unauthorized"}`.

Log in as Mika. From devtools console:

```js
fetch('/api/inventory-adjust', {method:'POST', headers:{'Content-Type':'application/json'}, body:'{}'}).then(r => console.log('adjust', r.status));
fetch('/api/orders', {method:'POST', headers:{'Content-Type':'application/json'}, body:'{}'}).then(r => console.log('orders', r.status));
fetch('/api/ambassador-payout', {method:'POST', headers:{'Content-Type':'application/json'}, body:'{}'}).then(r => console.log('payout', r.status));
fetch('/api/discount-code-write', {method:'POST', headers:{'Content-Type':'application/json'}, body:'{}'}).then(r => console.log('discount', r.status));
fetch('/api/support-tickets').then(r => console.log('tickets-get', r.status));
```

Expected: 403, 403, 403, 200-or-400 (depends on body validity), 200.

- [ ] **Step 5: Verify legacy cookie no longer works**

Logout. In devtools, manually set a cookie `adonis_admin=authenticated` (the old format), no `adonis_admin_role`. Visit `/admin`.

Expected: redirected to `/admin/login` (legacy cookie is ignored).

- [ ] **Step 6: Final commit (if any leftover changes)**

```bash
git status
# if anything modified during verification, decide whether to commit
```

---

## Deploy notes

Before deploying:

1. Confirm `VA_PASSWORD` exists in Vercel for **production**, **preview**, and **development** envs.
2. Tell Mika she will receive an email + password (out of band — Signal, 1Password, etc.).
3. Tell Jorrel he'll have to log in once after deploy (existing session cookie is invalidated).

After deploy:

1. Hard-refresh `https://<your-domain>/admin/login`, log in as Jorrel, confirm dashboard renders.
2. Have Mika log in. Confirm she lands on the VA dashboard. Walk through the marketing pages with her.

If something breaks for an existing admin user post-deploy: their old `adonis_admin=authenticated` cookie isn't being read (intentional). They just need to log in again.
