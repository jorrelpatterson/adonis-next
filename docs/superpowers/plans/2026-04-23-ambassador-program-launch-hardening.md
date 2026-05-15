# Ambassador Program Launch Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close nine launch-blocking defects in the ambassador program so public signups and ambassador-coded orders can be accepted today, and add an end-to-end smoke test that proves the order-to-commission chain actually works.

**Architecture:** Two Next.js projects share one Supabase backend. adonis-next owns admin tooling; advnce-site owns the public storefront and order path. Work is mostly small edits to existing API routes and one React admin page, plus one new helper (`lib/requireAdmin.js`), one new migration, and one integration test script. Test framework is not being added (per spec §Testing) — each task specifies an ad-hoc verification command (curl against a local dev server, SQL query against prod, or a scripted Node check) that plays the role of the failing-then-passing test. The final smoke test (Task 12) is the full integration test.

**Tech Stack:** Next.js 14 App Router (adonis-next) + Next.js Pages Router (advnce-site), Supabase (PostgreSQL), PostgREST via REST API, Resend (email), plain JS/JSX.

---

## File Structure

**Files to create:**
- `lib/requireAdmin.js` — admin cookie auth helper (adonis-next)
- `supabase/migrations/2026-04-23_ambassadors_commissions_rpc.sql` — schema capture (adonis-next)
- `scripts/smoke-ambassador-flow.js` — end-to-end integration test (adonis-next)

**Files to modify (adonis-next):**
- `app/api/ambassador-welcome/route.js` — auth + ADMIN_EMAIL
- `app/api/ambassador-message/route.js` — auth + HTML escape
- `app/api/ambassador-payout/route.js` — auth + ambassador.id payload + audit log insert
- `app/api/ambassador-write/route.js` — auth + status field + validation
- `app/api/ambassador-content-digest/route.js` — auth + active→status bug fix
- `app/api/discount-code-write/route.js` — auth + soft delete
- `app/admin/ambassadors/page.jsx` — status badge + Pause/Resume button + last payout column + dead code removal + payout confirm dialog + send `ambassador.id`

**Files to modify (advnce-site):**
- `api/send-order-email.js` — ADMIN_EMAIL env var
- `api/ambassador-notify.js` — ADMIN_EMAIL env var

**Note on paths:** Throughout this plan, paths prefixed `/tmp/adonis-next/` or `/tmp/advnce-site/` are symlinks to the real repos on the external drive. Use these exact paths — the underlying `/Volumes/Alexandria/` shell resolution is unreliable due to a duplicate-mount issue.

---

## Task 1: Verify current production schema exactly (read-only, no commit)

**Files:** none — verification-only probe before writing migration.

**Why first:** Task 2 writes a migration capturing the prod schema. If any column type or constraint differs from assumption, the migration file drifts from reality. This task locks the ground truth.

- [ ] **Step 1: Probe the four tables' columns**

Run:
```bash
python3 << 'PYEOF'
import os, urllib.request, urllib.parse, json
for line in open('/tmp/advnce.env'):
    if '=' in line:
        k, v = line.strip().split('=', 1); os.environ[k] = v
URL = os.environ['SUPABASE_URL']; KEY = os.environ['SUPABASE_SERVICE_KEY']

def q(sql):
    body = json.dumps({'query': sql}).encode()
    r = urllib.request.Request(f'{URL}/rest/v1/rpc/query', data=body, method='POST',
        headers={'apikey': KEY, 'Authorization': f'Bearer {KEY}', 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(r, timeout=15) as resp:
            return resp.read().decode()
    except Exception as e:
        # The `query` RPC likely isn't exposed; fall back to fetching one row per table and inspecting keys
        return None

# Fallback: fetch a row per table and print keys + types inferred from values
import json
tables = ['ambassadors', 'referral_commissions', 'customer_attribution', 'discount_codes']
for t in tables:
    r = urllib.request.Request(f'{URL}/rest/v1/{t}?select=*&limit=1',
        headers={'apikey': KEY, 'Authorization': f'Bearer {KEY}'})
    with urllib.request.urlopen(r, timeout=15) as resp:
        rows = json.loads(resp.read().decode())
    print(f'\n{t}:')
    if rows:
        for k, v in rows[0].items():
            print(f'  {k}: {type(v).__name__} (sample={v!r})')
    else:
        print('  (empty — cannot infer from data)')
PYEOF
```

Expected: for `ambassadors`, keys include `id, name, email, code, phone, referred_by, tier, status, total_orders, total_earned, created_at`. For empty tables, this fallback can't infer; that's fine — spec §7 already captured them from code reading.

- [ ] **Step 2: Confirm the RPC signature**

Run:
```bash
python3 << 'PYEOF'
import os, urllib.request, json
for line in open('/tmp/advnce.env'):
    if '=' in line: k, v = line.strip().split('=', 1); os.environ[k] = v
URL = os.environ['SUPABASE_URL']; KEY = os.environ['SUPABASE_SERVICE_KEY']

# Call with bogus id — success = exists with right signature
body = json.dumps({'amb_id': '00000000-0000-0000-0000-000000000000', 'order_increment': 0, 'earned_increment': 0}).encode()
r = urllib.request.Request(f'{URL}/rest/v1/rpc/increment_ambassador_stats', data=body, method='POST',
    headers={'apikey': KEY, 'Authorization': f'Bearer {KEY}', 'Content-Type': 'application/json'})
try:
    with urllib.request.urlopen(r, timeout=15) as resp:
        print(f'status={resp.status}')
except urllib.error.HTTPError as e:
    print(f'status={e.code} body={e.read().decode()[:300]}')
PYEOF
```

Expected: `status=204` (empty success — RPC exists and accepts the three-parameter signature).

- [ ] **Step 3: Record findings**

Create `/tmp/adonis-next/docs/superpowers/plans/ambassador-schema-snapshot.md` with whatever the probe revealed about column names/types. This file will be deleted at the end of Task 2 — it's a scratch pad.

No commit for Task 1.

---

## Task 2: Write the schema-capture migration

**Files:**
- Create: `/tmp/adonis-next/supabase/migrations/2026-04-23_ambassadors_commissions_rpc.sql`

- [ ] **Step 1: Write the migration file**

Write this exact content to `/tmp/adonis-next/supabase/migrations/2026-04-23_ambassadors_commissions_rpc.sql`:

```sql
-- Capture ambassadors / referral_commissions / increment_ambassador_stats
-- from production so the schema is reproducible from migrations alone.
-- Uses IF NOT EXISTS + OR REPLACE so applying to existing prod is a no-op.
-- Also introduces ambassador_payouts (new in 2026-04-23 launch hardening spec).

CREATE TABLE IF NOT EXISTS ambassadors (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  email         text NOT NULL,
  code          text UNIQUE NOT NULL,
  phone         text,
  referred_by   uuid REFERENCES ambassadors(id) ON DELETE SET NULL,
  tier          text NOT NULL DEFAULT 'starter' CHECK (tier IN ('starter','builder','elite')),
  status        text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','banned')),
  total_orders  integer NOT NULL DEFAULT 0,
  total_earned  numeric NOT NULL DEFAULT 0,
  created_at    timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS referral_commissions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          text NOT NULL,
  order_total       numeric NOT NULL,
  l1_ambassador_id  uuid REFERENCES ambassadors(id) ON DELETE SET NULL,
  l2_ambassador_id  uuid REFERENCES ambassadors(id) ON DELETE SET NULL,
  l3_ambassador_id  uuid REFERENCES ambassadors(id) ON DELETE SET NULL,
  l1_amount         numeric NOT NULL DEFAULT 0,
  l2_amount         numeric NOT NULL DEFAULT 0,
  l3_amount         numeric NOT NULL DEFAULT 0,
  created_at        timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ambassador_payouts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ambassador_id uuid NOT NULL REFERENCES ambassadors(id) ON DELETE CASCADE,
  period        text NOT NULL,
  l1_amount     numeric NOT NULL DEFAULT 0,
  l2_amount     numeric NOT NULL DEFAULT 0,
  l3_amount     numeric NOT NULL DEFAULT 0,
  total         numeric NOT NULL,
  sent_at       timestamptz NOT NULL DEFAULT now(),
  sent_by       text,
  UNIQUE (ambassador_id, period)
);

CREATE OR REPLACE FUNCTION increment_ambassador_stats(
  amb_id uuid, order_increment integer, earned_increment numeric
) RETURNS void LANGUAGE sql AS $$
  UPDATE ambassadors
     SET total_orders = COALESCE(total_orders, 0) + order_increment,
         total_earned = COALESCE(total_earned, 0) + earned_increment
   WHERE id = amb_id;
$$;
```

- [ ] **Step 2: Apply the migration to production to create the `ambassador_payouts` table**

Apply the full SQL file via Supabase dashboard → SQL Editor → paste → Run. Alternatively, use `psql` if the user has direct DB credentials.

The existing tables and RPC are no-ops (IF NOT EXISTS / OR REPLACE). The one new object is `ambassador_payouts`.

- [ ] **Step 3: Verify `ambassador_payouts` exists**

Run:
```bash
python3 << 'PYEOF'
import os, urllib.request
for line in open('/tmp/advnce.env'):
    if '=' in line: k, v = line.strip().split('=', 1); os.environ[k] = v
URL = os.environ['SUPABASE_URL']; KEY = os.environ['SUPABASE_SERVICE_KEY']
r = urllib.request.Request(f'{URL}/rest/v1/ambassador_payouts?select=count',
    headers={'apikey': KEY, 'Authorization': f'Bearer {KEY}', 'Prefer': 'count=exact', 'Range': '0-0'})
with urllib.request.urlopen(r, timeout=15) as resp:
    print(f'status={resp.status} body={resp.read().decode()}')
PYEOF
```

Expected: `status=200 body=[{"count":0}]` — table exists, empty.

- [ ] **Step 4: Delete the scratch schema snapshot**

```bash
rm -f /tmp/adonis-next/docs/superpowers/plans/ambassador-schema-snapshot.md
```

- [ ] **Step 5: Commit**

```bash
cd /tmp/adonis-next
git add supabase/migrations/2026-04-23_ambassadors_commissions_rpc.sql
git commit -m "$(cat <<'EOF'
supabase: capture ambassadors + referral_commissions + RPC schema; add ambassador_payouts

Captures existing prod objects with CREATE IF NOT EXISTS / CREATE OR REPLACE so the schema can be rebuilt from migrations alone. Adds ambassador_payouts audit log with UNIQUE(ambassador_id, period) to prevent duplicate payouts.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Create `requireAdmin` helper

**Files:**
- Create: `/tmp/adonis-next/lib/requireAdmin.js`

- [ ] **Step 1: Write the helper**

Write to `/tmp/adonis-next/lib/requireAdmin.js`:

```js
import { NextResponse } from 'next/server';

// Gate for admin-only API routes. Mirrors the cookie check in middleware.js.
// Returns null if the caller is an authenticated admin, or a 401 NextResponse
// if not. Use at the top of POST/PATCH handlers:
//
//   const unauth = requireAdmin(request);
//   if (unauth) return unauth;
export function requireAdmin(request) {
  const cookie = request.cookies.get('adonis_admin');
  if (!cookie || cookie.value !== 'authenticated') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}
```

- [ ] **Step 2: Verify the file parses (syntax only)**

```bash
node --check /tmp/adonis-next/lib/requireAdmin.js
```

Expected: no output (success). Any SyntaxError must be fixed before continuing.

- [ ] **Step 3: Commit**

```bash
cd /tmp/adonis-next
git add lib/requireAdmin.js
git commit -m "$(cat <<'EOF'
lib: add requireAdmin helper for admin-only API route auth

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Gate ambassador-welcome + fix ADMIN_EMAIL

**Files:**
- Modify: `/tmp/adonis-next/app/api/ambassador-welcome/route.js`

- [ ] **Step 1: Read the current file**

Use Read on `/tmp/adonis-next/app/api/ambassador-welcome/route.js` so the exact surrounding context is in memory.

- [ ] **Step 2: Add the import and the guard; replace the hardcoded email**

At the top of the file, after the existing imports, add:

```js
import { requireAdmin } from '../../../lib/requireAdmin';
```

At the start of the `POST` handler (or named export `POST`), insert as the first line of the function body:

```js
  const unauth = requireAdmin(request); if (unauth) return unauth;
```

Find the literal string `'jorrelpatterson@gmail.com'` in the admin notification email's `to:` field and replace with:

```js
process.env.ADMIN_EMAIL || 'jorrelpatterson@gmail.com'
```

- [ ] **Step 3: Verify the file parses**

```bash
node --check /tmp/adonis-next/app/api/ambassador-welcome/route.js
```

Expected: no output.

- [ ] **Step 4: Verify the guard with a local curl smoke (run in a separate terminal)**

Start the dev server: `cd /tmp/adonis-next && npm run dev` (port 3000).

In another shell:

```bash
# Without cookie → expect 401
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/ambassador-welcome \
  -H 'Content-Type: application/json' \
  -d '{"ambassador":{"name":"Test","email":"test@example.com","code":"TEST"}}'
```

Expected: `401`.

```bash
# With cookie → expect 200 or 500 (Resend may refuse the fake address, but the guard let us through)
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/ambassador-welcome \
  -H 'Content-Type: application/json' \
  -H 'Cookie: adonis_admin=authenticated' \
  -d '{"ambassador":{"name":"SmokeTest","email":"invalid-address","code":"SMOKE"}}'
```

Expected: NOT `401`. A `200` or `5xx` is fine — it means the guard passed.

- [ ] **Step 5: Commit**

```bash
cd /tmp/adonis-next
git add app/api/ambassador-welcome/route.js
git commit -m "$(cat <<'EOF'
api/ambassador-welcome: require admin cookie; ADMIN_EMAIL env var

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Gate ambassador-message + HTML-escape the body

**Files:**
- Modify: `/tmp/adonis-next/app/api/ambassador-message/route.js`

- [ ] **Step 1: Read the current file**

Use Read on `/tmp/adonis-next/app/api/ambassador-message/route.js`.

- [ ] **Step 2: Add import, guard, and HTML-escape helper**

At the top, add:

```js
import { requireAdmin } from '../../../lib/requireAdmin';
```

As the first line of the `POST` handler body:

```js
  const unauth = requireAdmin(request); if (unauth) return unauth;
```

Add this helper near the top of the module (outside the handler):

```js
const esc = (s) => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
```

Replace the line that builds the HTML message body. Find the substitution that turns `\n` into `<br>` and change the source from the raw `message` variable to `esc(message)`. Also wrap `esc(...)` around `subject`, `ambassador.name`, and `ambassador.code` wherever they land in HTML output in this file. Code block (the exact line structure depends on existing code; apply the pattern):

```js
const safeMessage = esc(message).replace(/\n/g, '<br>');
const safeSubject = esc(subject);
const safeName = esc(ambassador.name);
const safeCode = esc(ambassador.code);
// then use safeMessage / safeSubject / safeName / safeCode in the HTML template literal
```

- [ ] **Step 3: Verify the file parses**

```bash
node --check /tmp/adonis-next/app/api/ambassador-message/route.js
```

- [ ] **Step 4: Verify escaping with a unit-style script**

Create a throwaway test file `/tmp/ambassador-message-escape-test.mjs`:

```js
const esc = (s) => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const cases = [
  ['<script>', '&lt;script&gt;'],
  ['a & b', 'a &amp; b'],
  ['"quoted"', '&quot;quoted&quot;'],
  ['plain', 'plain'],
  [null, ''],
];
let fail = 0;
for (const [input, expected] of cases) {
  const got = esc(input);
  if (got !== expected) { console.error('FAIL', JSON.stringify(input), '→', got, 'expected', expected); fail++; }
}
if (fail) process.exit(1); else console.log('all escaping cases pass');
```

Run:
```bash
node /tmp/ambassador-message-escape-test.mjs
```

Expected: `all escaping cases pass`.

Remove: `rm /tmp/ambassador-message-escape-test.mjs`.

- [ ] **Step 5: Verify the auth guard via curl**

With dev server running:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/ambassador-message \
  -H 'Content-Type: application/json' \
  -d '{"ambassador":{"name":"T","email":"t@example.com","code":"T"},"subject":"x","message":"y"}'
```

Expected: `401`.

- [ ] **Step 6: Commit**

```bash
cd /tmp/adonis-next
git add app/api/ambassador-message/route.js
git commit -m "$(cat <<'EOF'
api/ambassador-message: require admin cookie; HTML-escape message body

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Gate ambassador-payout + accept ambassador.id + insert payout audit row

**Files:**
- Modify: `/tmp/adonis-next/app/api/ambassador-payout/route.js`

- [ ] **Step 1: Read the current file**

Use Read on `/tmp/adonis-next/app/api/ambassador-payout/route.js`.

- [ ] **Step 2: Add import, guard, and payout audit insert**

At the top, add:

```js
import { requireAdmin } from '../../../lib/requireAdmin';
```

As the first line of the `POST` handler body:

```js
  const unauth = requireAdmin(request); if (unauth) return unauth;
```

Just after the existing destructure of `ambassador` from the request body, add a UUID validation and an `id` extraction:

```js
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const { id: ambassadorId, name, email, code, period, l1_amount, l2_amount, l3_amount } = ambassador || {};
  if (!ambassadorId || !UUID_RE.test(ambassadorId)) {
    return NextResponse.json({ error: 'Missing or invalid ambassador.id' }, { status: 400 });
  }
```

After the Resend send succeeds (but before the final `return`), add the audit insert. Put the block inside a `try/catch` so a unique-constraint failure becomes a warning, not a 500:

```js
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  let payoutWarning = null;
  try {
    const total = parseFloat(l1_amount || 0) + parseFloat(l2_amount || 0) + parseFloat(l3_amount || 0);
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/ambassador_payouts`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        ambassador_id: ambassadorId,
        period: period || '',
        l1_amount: parseFloat(l1_amount || 0),
        l2_amount: parseFloat(l2_amount || 0),
        l3_amount: parseFloat(l3_amount || 0),
        total: parseFloat(total.toFixed(2)),
      }),
    });
    if (insertRes.status === 409) {
      payoutWarning = `Payout already recorded for ${period}`;
    } else if (!insertRes.ok) {
      payoutWarning = `Audit log insert failed: ${insertRes.status}`;
    }
  } catch (err) {
    payoutWarning = `Audit log error: ${err.message}`;
  }
```

Change the final success response to include the warning if present:

```js
  return NextResponse.json({ success: true, warning: payoutWarning });
```

Replace `jorrelpatterson@gmail.com` (if referenced in this file — search once) with `process.env.ADMIN_EMAIL || 'jorrelpatterson@gmail.com'`.

- [ ] **Step 3: Verify the file parses**

```bash
node --check /tmp/adonis-next/app/api/ambassador-payout/route.js
```

- [ ] **Step 4: Verify 401 guard and 400 UUID validation via curl**

With dev server running:

```bash
# No cookie → 401
curl -s -o /dev/null -w "no-cookie: %{http_code}\n" -X POST http://localhost:3000/api/ambassador-payout \
  -H 'Content-Type: application/json' \
  -d '{"ambassador":{"id":"bad","period":"2026-04"}}'

# Cookie but bad UUID → 400
curl -s -o /dev/null -w "bad-uuid: %{http_code}\n" -X POST http://localhost:3000/api/ambassador-payout \
  -H 'Content-Type: application/json' \
  -H 'Cookie: adonis_admin=authenticated' \
  -d '{"ambassador":{"id":"bad","period":"2026-04"}}'
```

Expected: `no-cookie: 401`, `bad-uuid: 400`.

- [ ] **Step 5: Commit**

```bash
cd /tmp/adonis-next
git add app/api/ambassador-payout/route.js
git commit -m "$(cat <<'EOF'
api/ambassador-payout: require admin cookie; require ambassador.id; audit log to ambassador_payouts

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Gate ambassador-write + add status field + validate email/phone/name

**Files:**
- Modify: `/tmp/adonis-next/app/api/ambassador-write/route.js`

- [ ] **Step 1: Read the current file**

Use Read on `/tmp/adonis-next/app/api/ambassador-write/route.js`.

- [ ] **Step 2: Apply the changes**

At the top, add:

```js
import { requireAdmin } from '../../../lib/requireAdmin';
```

As the first line of the `POST` handler body:

```js
  const unauth = requireAdmin(request); if (unauth) return unauth;
```

Extend the `ALLOWED_FIELDS` array (exact name may be `ALLOWED` — match what's in the file) to include `status`:

```js
const ALLOWED_FIELDS = ['name', 'email', 'phone', 'code', 'tier', 'status'];
```

Add a `STATUS_VALUES` constant near the existing `TIER_VALUES` (or equivalent — match naming):

```js
const STATUS_VALUES = ['active', 'paused', 'banned'];
```

Add validation. Find where tier is validated and add next to it:

```js
if ('status' in fields && !STATUS_VALUES.includes(fields.status)) {
  return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
}
```

Add email validation (place near the top of the field validation block):

```js
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if ('email' in fields && !EMAIL_RE.test(String(fields.email))) {
  return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
}
```

Add name length validation:

```js
if ('name' in fields) {
  const n = String(fields.name ?? '').trim();
  if (!n || n.length > 120) {
    return NextResponse.json({ error: 'Name required (1–120 chars)' }, { status: 400 });
  }
  fields.name = n;
}
```

Add phone normalization:

```js
if ('phone' in fields && fields.phone) {
  let digits = String(fields.phone).replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1);
  if (digits.length !== 10) {
    return NextResponse.json({ error: 'Phone must be 10 digits' }, { status: 400 });
  }
  fields.phone = digits;
} else if ('phone' in fields) {
  fields.phone = null;
}
```

- [ ] **Step 3: Verify the file parses**

```bash
node --check /tmp/adonis-next/app/api/ambassador-write/route.js
```

- [ ] **Step 4: Verify validation via curl**

With dev server running:

```bash
BASE="http://localhost:3000/api/ambassador-write"
HDR='-H Content-Type:application/json -H Cookie:adonis_admin=authenticated'

# 401 without cookie
curl -s -o /dev/null -w "no-cookie: %{http_code}\n" -X POST $BASE \
  -H 'Content-Type: application/json' \
  -d '{"action":"update","id":"00000000-0000-0000-0000-000000000000","fields":{"status":"active"}}'

# 400 on invalid status
curl -s -o /dev/null -w "bad-status: %{http_code}\n" -X POST $BASE $HDR \
  -d '{"action":"update","id":"00000000-0000-0000-0000-000000000000","fields":{"status":"pending"}}'

# 400 on invalid email
curl -s -o /dev/null -w "bad-email: %{http_code}\n" -X POST $BASE $HDR \
  -d '{"action":"update","id":"00000000-0000-0000-0000-000000000000","fields":{"email":"not-an-email"}}'

# 400 on phone too short
curl -s -o /dev/null -w "bad-phone: %{http_code}\n" -X POST $BASE $HDR \
  -d '{"action":"update","id":"00000000-0000-0000-0000-000000000000","fields":{"phone":"555"}}'

# 400 on empty name
curl -s -o /dev/null -w "empty-name: %{http_code}\n" -X POST $BASE $HDR \
  -d '{"action":"update","id":"00000000-0000-0000-0000-000000000000","fields":{"name":"  "}}'
```

Expected: `no-cookie: 401`, `bad-status: 400`, `bad-email: 400`, `bad-phone: 400`, `empty-name: 400`.

- [ ] **Step 5: Commit**

```bash
cd /tmp/adonis-next
git add app/api/ambassador-write/route.js
git commit -m "$(cat <<'EOF'
api/ambassador-write: require admin cookie; allow status field; validate email/phone/name

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Gate ambassador-content-digest + fix active→status bug

**Files:**
- Modify: `/tmp/adonis-next/app/api/ambassador-content-digest/route.js`

- [ ] **Step 1: Read the current file**

Use Read on `/tmp/adonis-next/app/api/ambassador-content-digest/route.js`.

- [ ] **Step 2: Add import, guard, fix the query**

Add import at top:

```js
import { requireAdmin } from '../../../lib/requireAdmin';
```

First line of POST handler:

```js
  const unauth = requireAdmin(request); if (unauth) return unauth;
```

Find the line containing `active=is.true` (around line 66) and change to:

```js
&status=eq.active
```

(Full URL query string becomes `select=name,email,code&status=eq.active`.)

- [ ] **Step 3: Verify the file parses**

```bash
node --check /tmp/adonis-next/app/api/ambassador-content-digest/route.js
```

- [ ] **Step 4: Verify guard + that the query now returns the seed ambassador**

With dev server running:

```bash
# 401 without cookie
curl -s -o /dev/null -w "no-cookie: %{http_code}\n" -X POST http://localhost:3000/api/ambassador-content-digest \
  -H 'Content-Type: application/json' -d '{}'

# With cookie → the route body should NOT include the "No active ambassadors" error since we have 1 seed
curl -s -X POST http://localhost:3000/api/ambassador-content-digest \
  -H 'Content-Type: application/json' \
  -H 'Cookie: adonis_admin=authenticated' \
  -d '{}' | head -c 500
```

Expected: first returns `401`. Second response should NOT contain the string `"No active ambassadors"` (if it does, the query fix didn't take).

- [ ] **Step 5: Commit**

```bash
cd /tmp/adonis-next
git add app/api/ambassador-content-digest/route.js
git commit -m "$(cat <<'EOF'
api/ambassador-content-digest: require admin cookie; fix active filter to status=eq.active

The ambassadors table uses a `status` text column, not an `active` bool. The old filter returned zero rows on every call, so the digest never sent.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Gate discount-code-write + soft delete

**Files:**
- Modify: `/tmp/adonis-next/app/api/discount-code-write/route.js`

- [ ] **Step 1: Read the current file**

Use Read on `/tmp/adonis-next/app/api/discount-code-write/route.js`.

- [ ] **Step 2: Add guard and change delete action**

Add import at top:

```js
import { requireAdmin } from '../../../lib/requireAdmin';
```

First line of POST handler:

```js
  const unauth = requireAdmin(request); if (unauth) return unauth;
```

Find the branch that handles `action === 'delete'`. Replace its body (which currently issues a `DELETE` to PostgREST) with a PATCH that sets `active=false`:

```js
    if (action === 'delete') {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/discount_codes?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { ...headers, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ active: false }),
      });
      if (!res.ok) {
        const errText = await res.text();
        return NextResponse.json({ error: 'Soft-delete failed', detail: errText }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }
```

- [ ] **Step 3: Verify the file parses**

```bash
node --check /tmp/adonis-next/app/api/discount-code-write/route.js
```

- [ ] **Step 4: Verify guard via curl**

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/discount-code-write \
  -H 'Content-Type: application/json' \
  -d '{"action":"create","code":"X","type":"percent","amount":10}'
```

Expected: `401`.

- [ ] **Step 5: Verify soft-delete against prod (create-then-delete round trip)**

```bash
COOKIE="Cookie: adonis_admin=authenticated"
# Create a test code
curl -s -X POST http://localhost:3000/api/discount-code-write \
  -H 'Content-Type: application/json' -H "$COOKIE" \
  -d '{"action":"create","code":"SOFTDELTEST","type":"percent","amount":5}' > /tmp/created.json

# Read back its id
ID=$(python3 -c "import json; print(json.load(open('/tmp/created.json'))['row']['id'])")
echo "created id=$ID"

# Delete it
curl -s -X POST http://localhost:3000/api/discount-code-write \
  -H 'Content-Type: application/json' -H "$COOKIE" \
  -d "{\"action\":\"delete\",\"id\":\"$ID\"}"
echo ""

# Verify the row still exists with active=false (not hard-deleted)
python3 << PYEOF
import os, urllib.request, json, urllib.parse
for line in open('/tmp/advnce.env'):
    if '=' in line: k, v = line.strip().split('=', 1); os.environ[k] = v
URL = os.environ['SUPABASE_URL']; KEY = os.environ['SUPABASE_SERVICE_KEY']
r = urllib.request.Request(f"{URL}/rest/v1/discount_codes?id=eq.$ID&select=id,code,active",
    headers={'apikey': KEY, 'Authorization': f'Bearer {KEY}'})
with urllib.request.urlopen(r, timeout=15) as resp:
    print(resp.read().decode())
PYEOF

# Cleanup: real-delete the row directly (test residue)
python3 << PYEOF
import os, urllib.request
for line in open('/tmp/advnce.env'):
    if '=' in line: k, v = line.strip().split('=', 1); os.environ[k] = v
URL = os.environ['SUPABASE_URL']; KEY = os.environ['SUPABASE_SERVICE_KEY']
r = urllib.request.Request(f"{URL}/rest/v1/discount_codes?id=eq.$ID",
    method='DELETE',
    headers={'apikey': KEY, 'Authorization': f'Bearer {KEY}', 'Prefer':'return=minimal'})
urllib.request.urlopen(r, timeout=15)
print("cleanup ok")
PYEOF

rm /tmp/created.json
```

Expected: the verification step prints a JSON array with one object where `"active": false`.

- [ ] **Step 6: Commit**

```bash
cd /tmp/adonis-next
git add app/api/discount-code-write/route.js
git commit -m "$(cat <<'EOF'
api/discount-code-write: require admin cookie; switch delete to soft delete (active=false)

Preserves the row so orders referencing the code retain their audit trail.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Admin UI — status badge, Pause/Resume, last payout, dead code, payout confirm, send ambassador.id

**Files:**
- Modify: `/tmp/adonis-next/app/admin/ambassadors/page.jsx`

- [ ] **Step 1: Read the current file**

Use Read on `/tmp/adonis-next/app/admin/ambassadors/page.jsx`.

- [ ] **Step 2: Remove dead IIFE on line 37**

Find and delete the `(amb=>amb)({code:''}).code||''` pattern. The variable it computes should be replaced with a direct reference to `amb.code || ''` (or whatever the intent was — see the surrounding context). Check the git blame to confirm intent if unclear.

- [ ] **Step 3: Add a second data fetch for payout history**

In the existing `useEffect` or `loadData` function that issues `sbFetch('ambassadors', ...)` and `sbFetch('referral_commissions', ...)`, add a third fetch:

```js
sbFetch('ambassador_payouts', 'select=ambassador_id,period,total,sent_at&order=sent_at.desc')
```

Store the result in a new state `ambassadorPayouts` (useState array). Build a derived map `lastPayoutByAmb` — for each ambassador_id, the most recent row.

- [ ] **Step 4: Add the status badge, Pause/Resume button, and Last Payout column to the ambassador list row**

In the ambassador list row JSX, after the existing columns (tier / earned / orders), add:

```jsx
<span style={{
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: 12,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 1,
  textTransform: 'uppercase',
  color:
    amb.status === 'active' ? '#065F46' :
    amb.status === 'paused' ? '#92400E' :
    '#991B1B',
  background:
    amb.status === 'active' ? '#D1FAE5' :
    amb.status === 'paused' ? '#FEF3C7' :
    '#FEE2E2',
}}>
  {amb.status || 'active'}
</span>

{amb.status !== 'banned' && (
  <button
    onClick={() => handleToggleStatus(amb)}
    style={{ marginLeft: 8, fontSize: 11, padding: '2px 10px', cursor: 'pointer' }}
  >
    {amb.status === 'paused' ? 'Resume' : 'Pause'}
  </button>
)}

{(() => {
  const lp = lastPayoutByAmb[amb.id];
  if (!lp) return <span style={{fontSize:11,color:'#8C919E'}}>Never paid</span>;
  return (
    <span style={{fontSize:11,color:'#8C919E'}}>
      Last: ${parseFloat(lp.total).toFixed(2)} · {lp.period}
    </span>
  );
})()}
```

Add the `handleToggleStatus` function in the component body:

```js
const handleToggleStatus = async (amb) => {
  const newStatus = amb.status === 'paused' ? 'active' : 'paused';
  const res = await fetch('/api/ambassador-write', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'update', id: amb.id, fields: { status: newStatus } }),
  });
  if (!res.ok) {
    const err = await res.json();
    alert(`Failed: ${err.error || res.status}`);
    return;
  }
  // Refresh list
  loadData();
};
```

- [ ] **Step 5: Update the payout send handler to include ambassador.id and show confirm dialog**

Find the existing `handleSendPayout` (or inline payout submit). Add:

1. Before the fetch, check `lastPayoutByAmb[ambassador.id]`. If the row's `period === submittedPeriod`, prompt with `confirm(...)`; abort if user cancels.

2. Include `id: ambassador.id` in the body's `ambassador` object.

Example:

```js
const handleSendPayout = async (ambassador, period, l1, l2, l3) => {
  const lp = lastPayoutByAmb[ambassador.id];
  if (lp && lp.period === period) {
    const ok = confirm(
      `You already sent a payout for ${period} on ${new Date(lp.sent_at).toLocaleDateString()} totaling $${parseFloat(lp.total).toFixed(2)}. Send again?`
    );
    if (!ok) return;
  }
  const res = await fetch('/api/ambassador-payout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ambassador: {
        id: ambassador.id,
        name: ambassador.name,
        email: ambassador.email,
        code: ambassador.code,
        period,
        l1_amount: l1,
        l2_amount: l2,
        l3_amount: l3,
      },
    }),
  });
  const result = await res.json();
  if (!res.ok) {
    alert(`Failed: ${result.error || res.status}`);
    return;
  }
  if (result.warning) alert(`Sent, but: ${result.warning}`);
  else alert('Payout sent');
  loadData();
};
```

- [ ] **Step 6: Verify the page renders**

With dev server running, log into `/admin/login` (password from `ADMIN_PASSWORD` env), then navigate to `/admin/ambassadors` in a browser. Verify:

- Status badge renders (green "ACTIVE" for the seed ambassador)
- Pause button is visible
- "Never paid" shows (since `ambassador_payouts` is empty)
- Clicking Pause prompts no error; badge updates to amber "PAUSED"
- Clicking Resume returns to green "ACTIVE"

- [ ] **Step 7: Commit**

```bash
cd /tmp/adonis-next
git add app/admin/ambassadors/page.jsx
git commit -m "$(cat <<'EOF'
admin/ambassadors: status badge, Pause/Resume, last-payout column, remove dead IIFE; payout confirm + send ambassador.id

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: advnce-site — ADMIN_EMAIL env var

**Files:**
- Modify: `/tmp/advnce-site/api/send-order-email.js`
- Modify: `/tmp/advnce-site/api/ambassador-notify.js`

- [ ] **Step 1: Read both files**

Use Read on both.

- [ ] **Step 2: Replace each hardcoded admin email**

In each file, find `'jorrelpatterson@gmail.com'` and replace with `(process.env.ADMIN_EMAIL || 'jorrelpatterson@gmail.com')`. There should be exactly one occurrence in each file (in the Resend `to:` field of the admin notification).

- [ ] **Step 3: Verify both files parse**

```bash
node --check /tmp/advnce-site/api/send-order-email.js
node --check /tmp/advnce-site/api/ambassador-notify.js
```

- [ ] **Step 4: Commit (in advnce-site)**

```bash
cd /tmp/advnce-site
git add api/send-order-email.js api/ambassador-notify.js
git commit -m "$(cat <<'EOF'
api: ADMIN_EMAIL env var for order + ambassador-signup admin notifications

Default falls back to jorrelpatterson@gmail.com so current deployments continue working unchanged. Flip the env var on Vercel to route to info@advncelabs.com once forwarding is set up.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: End-to-end smoke test script

**Files:**
- Create: `/tmp/adonis-next/scripts/smoke-ambassador-flow.js`

- [ ] **Step 1: Write the smoke test script**

Write to `/tmp/adonis-next/scripts/smoke-ambassador-flow.js`:

```js
#!/usr/bin/env node
// End-to-end smoke test for ambassador order flow.
// Requires: SUPABASE_URL and SUPABASE_SERVICE_KEY in env (or /tmp/advnce.env).
// Also requires: ADVNCE_ORIGIN (e.g. http://localhost:3001 or https://www.advncelabs.com)
// to POST to the advnce-site send-order-email endpoint.
//
// Run: node scripts/smoke-ambassador-flow.js
//
// Exit codes:
//   0 - all tests pass
//   1 - assertion failure or runtime error

const fs = require('fs');

// Load env from /tmp/advnce.env if present
if (fs.existsSync('/tmp/advnce.env')) {
  for (const line of fs.readFileSync('/tmp/advnce.env', 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.+)$/);
    if (m) process.env[m[1]] = m[2];
  }
}

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;
const ORIGIN = process.env.ADVNCE_ORIGIN || 'https://www.advncelabs.com';

if (!URL || !KEY) { console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY'); process.exit(1); }

const dbHeaders = {
  'apikey': KEY, 'Authorization': `Bearer ${KEY}`,
  'Content-Type': 'application/json',
};

async function db(path, method = 'GET', body) {
  const r = await fetch(`${URL}${path}`, {
    method, headers: dbHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  return { status: r.status, text, json: text ? (() => { try { return JSON.parse(text); } catch { return null; } })() : null };
}

function assert(cond, msg) {
  if (!cond) {
    console.error(`  FAIL: ${msg}`);
    failures++;
  } else {
    console.log(`  ok: ${msg}`);
  }
}

let failures = 0;
const TEST_PHONE_1 = '5555550100';
const TEST_PHONE_2 = '5555550101';
const SEED_CODE = 'EZEKIELPHOTOGRAPHY';
const TEST_PROMO = 'SMOKE10';

// Test product — pick any active, low-cost product
async function pickTestProduct() {
  const r = await db(`/rest/v1/products?active=eq.true&select=sku,name,retail&limit=1&order=retail.asc`);
  if (!r.json || !r.json.length) throw new Error('No active products available for smoke test');
  return r.json[0];
}

async function seedAmbassadorReset() {
  // Reset seed ambassador totals to 0 and status to active
  await db(`/rest/v1/ambassadors?code=eq.${SEED_CODE}`, 'PATCH', {
    total_orders: 0, total_earned: 0, status: 'active',
  });
  // Also fetch the id for later assertions
  const r = await db(`/rest/v1/ambassadors?code=eq.${SEED_CODE}&select=id,tier,referred_by`);
  return r.json?.[0];
}

async function cleanupOrder(orderId) {
  await db(`/rest/v1/referral_commissions?order_id=eq.${orderId}`, 'DELETE');
  await db(`/rest/v1/orders?order_id=eq.${orderId}`, 'DELETE');
}

async function cleanupAttribution(phone) {
  await db(`/rest/v1/customer_attribution?phone=eq.${phone}`, 'DELETE');
}

async function placeOrder({ phone, code, product }) {
  const orderId = `SMOKE-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const payload = {
    orderData: {
      order_id: orderId,
      first_name: 'Smoke',
      last_name: 'Test',
      email: 'smoke@test.invalid',
      phone,
      address: '1 Test St',
      city: 'Testville',
      state: 'CA',
      zip: '90001',
      items: [{ sku: product.sku, name: product.name, size: '10mg', qty: 1, price: product.retail }],
      code,
    },
  };
  const r = await fetch(`${ORIGIN}/api/send-order-email`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await r.json().catch(() => ({}));
  return { status: r.status, body, orderId };
}

async function test1_firstAmbassadorConversion() {
  console.log('\n=== Test 1: First-time ambassador conversion ===');
  const seedAmb = await seedAmbassadorReset();
  await cleanupAttribution(TEST_PHONE_1);
  const product = await pickTestProduct();

  const { status, body, orderId } = await placeOrder({
    phone: TEST_PHONE_1, code: SEED_CODE, product,
  });
  assert(status === 200, `place order returns 200 (got ${status}: ${JSON.stringify(body).slice(0,200)})`);

  // Poll briefly — side effects are async-after-response in send-order-email
  await new Promise(r => setTimeout(r, 1500));

  const ord = await db(`/rest/v1/orders?order_id=eq.${orderId}&select=*`);
  const o = ord.json?.[0];
  assert(!!o, 'order row exists');
  if (o) {
    assert(o.discount_type === 'ambassador_first', `discount_type=ambassador_first (got ${o.discount_type})`);
    assert(o.is_first_attributed === true, 'is_first_attributed=true');
    assert(o.attribution_phone === TEST_PHONE_1, `attribution_phone=${TEST_PHONE_1}`);
    assert(parseFloat(o.discount_amount || 0) > 0, `discount_amount > 0 (got ${o.discount_amount})`);
  }

  const att = await db(`/rest/v1/customer_attribution?phone=eq.${TEST_PHONE_1}`);
  assert(att.json?.length === 1, 'customer_attribution row exists');
  if (att.json?.length) {
    assert(att.json[0].ambassador_code === SEED_CODE, `attribution ambassador_code=${SEED_CODE}`);
  }

  const comm = await db(`/rest/v1/referral_commissions?order_id=eq.${orderId}`);
  assert(comm.json?.length === 1, 'referral_commissions row exists');
  if (comm.json?.length) {
    const c = comm.json[0];
    assert(parseFloat(c.l1_amount) > 0, `l1_amount > 0 (got ${c.l1_amount})`);
    // 15% of order_total on first sale
    const expected = parseFloat((parseFloat(c.order_total) * 0.15).toFixed(2));
    assert(Math.abs(parseFloat(c.l1_amount) - expected) < 0.02, `l1_amount ≈ 15% of ${c.order_total} (got ${c.l1_amount}, expected ${expected})`);
  }

  const amb = await db(`/rest/v1/ambassadors?code=eq.${SEED_CODE}&select=total_orders,total_earned`);
  const a = amb.json?.[0];
  assert(a?.total_orders >= 1, `ambassador.total_orders >= 1 (got ${a?.total_orders})`);
  assert(parseFloat(a?.total_earned || 0) > 0, `ambassador.total_earned > 0 (got ${a?.total_earned})`);

  // Cleanup
  await cleanupOrder(orderId);
  await cleanupAttribution(TEST_PHONE_1);
  await db(`/rest/v1/ambassadors?code=eq.${SEED_CODE}`, 'PATCH', { total_orders: 0, total_earned: 0 });
}

async function test2_repeatCustomer() {
  console.log('\n=== Test 2: Repeat customer (lifetime attribution) ===');
  const seedAmb = await seedAmbassadorReset();
  await cleanupAttribution(TEST_PHONE_2);

  // Pre-seed attribution so this order is treated as a repeat
  await db(`/rest/v1/customer_attribution`, 'POST', {
    phone: TEST_PHONE_2, ambassador_id: seedAmb.id, ambassador_code: SEED_CODE,
    first_order_id: 'PRE-SEED-FAKE',
  });

  const product = await pickTestProduct();
  const { status, body, orderId } = await placeOrder({
    phone: TEST_PHONE_2, code: 'IGNORED_SHOULD_NOT_APPLY', product,
  });
  assert(status === 200, `place order returns 200 (got ${status})`);

  await new Promise(r => setTimeout(r, 1500));

  const ord = await db(`/rest/v1/orders?order_id=eq.${orderId}&select=*`);
  const o = ord.json?.[0];
  assert(!!o, 'order row exists');
  if (o) {
    assert(o.discount_type === 'ambassador_repeat', `discount_type=ambassador_repeat (got ${o.discount_type})`);
    assert(o.is_first_attributed === false, 'is_first_attributed=false');
    assert(!o.discount_amount || parseFloat(o.discount_amount) === 0, `discount_amount=0 on repeat (got ${o.discount_amount})`);
  }

  const comm = await db(`/rest/v1/referral_commissions?order_id=eq.${orderId}`);
  assert(comm.json?.length === 1, 'referral_commissions row exists for repeat');
  if (comm.json?.length) {
    const c = comm.json[0];
    const tierRate = seedAmb.tier === 'elite' ? 0.20 : seedAmb.tier === 'builder' ? 0.15 : 0.10;
    const expected = parseFloat((parseFloat(c.order_total) * tierRate).toFixed(2));
    assert(Math.abs(parseFloat(c.l1_amount) - expected) < 0.02, `l1_amount at tier rate ${tierRate} (got ${c.l1_amount}, expected ${expected})`);
  }

  // Cleanup
  await cleanupOrder(orderId);
  await cleanupAttribution(TEST_PHONE_2);
  await db(`/rest/v1/ambassadors?code=eq.${SEED_CODE}`, 'PATCH', { total_orders: 0, total_earned: 0 });
}

async function test3_promoCode() {
  console.log('\n=== Test 3: Promo code (no ambassador) ===');
  // Clean up any prior SMOKE10 code
  await db(`/rest/v1/discount_codes?code=eq.${TEST_PROMO}`, 'DELETE');
  const TEST_PHONE_3 = '5555550102';
  await cleanupAttribution(TEST_PHONE_3);

  // Create the promo code directly (bypass auth since this is our test script)
  await db(`/rest/v1/discount_codes`, 'POST', {
    code: TEST_PROMO, type: 'percent', amount: 10, active: true,
  });

  const product = await pickTestProduct();
  const { status, orderId } = await placeOrder({
    phone: TEST_PHONE_3, code: TEST_PROMO, product,
  });
  assert(status === 200, `place order returns 200 (got ${status})`);

  await new Promise(r => setTimeout(r, 1500));

  const ord = await db(`/rest/v1/orders?order_id=eq.${orderId}&select=*`);
  const o = ord.json?.[0];
  assert(!!o, 'order row exists');
  if (o) {
    assert(o.discount_type === 'promo', `discount_type=promo (got ${o.discount_type})`);
    assert(parseFloat(o.discount_amount || 0) > 0, 'discount_amount > 0');
  }

  const code = await db(`/rest/v1/discount_codes?code=eq.${TEST_PROMO}&select=used_count`);
  assert(code.json?.[0]?.used_count === 1, `used_count=1 (got ${code.json?.[0]?.used_count})`);

  const att = await db(`/rest/v1/customer_attribution?phone=eq.${TEST_PHONE_3}`);
  assert(att.json?.length === 0, 'no customer_attribution for promo-only order');

  const comm = await db(`/rest/v1/referral_commissions?order_id=eq.${orderId}`);
  assert(comm.json?.length === 0, 'no referral_commissions for promo-only order');

  // Cleanup
  await cleanupOrder(orderId);
  await cleanupAttribution(TEST_PHONE_3);
  await db(`/rest/v1/discount_codes?code=eq.${TEST_PROMO}`, 'DELETE');
}

(async () => {
  try {
    await test1_firstAmbassadorConversion();
    await test2_repeatCustomer();
    await test3_promoCode();
  } catch (err) {
    console.error('\nRUNTIME ERROR:', err);
    process.exit(1);
  }
  console.log(`\n${failures === 0 ? '✓ ALL TESTS PASS' : `✗ ${failures} FAILURE(S)`}`);
  process.exit(failures === 0 ? 0 : 1);
})();
```

- [ ] **Step 2: Verify the script parses**

```bash
node --check /tmp/adonis-next/scripts/smoke-ambassador-flow.js
```

- [ ] **Step 3: Run the smoke test against production**

```bash
cd /tmp/adonis-next
ADVNCE_ORIGIN=https://www.advncelabs.com node scripts/smoke-ambassador-flow.js
```

Expected: `✓ ALL TESTS PASS` on the final line, exit code 0.

If any test fails, read the failure message, diagnose (usually one of: RPC returning wrong value, missing column, wrong discount calculation), fix in the appropriate route file, and re-run.

- [ ] **Step 4: Commit**

```bash
cd /tmp/adonis-next
git add scripts/smoke-ambassador-flow.js
git commit -m "$(cat <<'EOF'
scripts: end-to-end smoke test for ambassador order → commission flow

Runs three scenarios against production Supabase (first ambassador conversion, repeat customer with lifetime attribution, promo code only) and asserts every downstream row lands as expected. Use as regression test before future launches.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: Final manual verification (no commit)

- [ ] **Step 1: Run the smoke test once more clean**

```bash
cd /tmp/adonis-next
ADVNCE_ORIGIN=https://www.advncelabs.com node scripts/smoke-ambassador-flow.js
```

Must pass green.

- [ ] **Step 2: Manual click-through of admin UI**

With `npm run dev` running in adonis-next:

1. Log into `/admin/login` with the `ADMIN_PASSWORD` value.
2. Go to `/admin/ambassadors`. Verify:
   - Status badge renders on each row.
   - "Never paid" shows next to the seed ambassador (payout table still empty after smoke test cleanup).
   - Pause button toggles status to paused; Resume toggles back.
3. Go to `/admin/discount-codes`. Create a code `LAUNCH10` (percent, 10%). Deactivate it (confirm the row still exists via the probe script). Reactivate.

- [ ] **Step 3: Verify the one existing seed ambassador looks right**

```bash
python3 << 'PYEOF'
import os, urllib.request, json
for line in open('/tmp/advnce.env'):
    if '=' in line: k, v = line.strip().split('=', 1); os.environ[k] = v
URL = os.environ['SUPABASE_URL']; KEY = os.environ['SUPABASE_SERVICE_KEY']
r = urllib.request.Request(f'{URL}/rest/v1/ambassadors?select=*',
    headers={'apikey': KEY, 'Authorization': f'Bearer {KEY}'})
rows = json.loads(urllib.request.urlopen(r, timeout=15).read().decode())
for a in rows:
    a['email'] = '[REDACTED]'; a['phone'] = '[REDACTED]'; a['name'] = '[REDACTED]'
    print(json.dumps(a, indent=2))
PYEOF
```

Expected: seed ambassador has `status: "active"`, `total_orders: 0`, `total_earned: 0` (reset after smoke test cleanup).

- [ ] **Step 4: Launch checklist (human tasks, no code action)**

- Confirm ADMIN_PASSWORD is set on Vercel for adonis-next production.
- Confirm SUPABASE_SERVICE_KEY is set on Vercel for both adonis-next and advnce-site.
- Confirm RESEND_API_KEY is set on both.
- Decide whether to flip ADMIN_EMAIL to info@advncelabs.com now (requires forwarding set up) or after forwarding is ready.
- Delete `/tmp/advnce.env` after launch work is complete: `rm /tmp/advnce.env`.

No commit for Task 13.

---

## Notes for the implementer

- **Each route file has a specific default export shape** — don't assume. Use `Read` to see the current structure before editing. Look specifically at whether the handler is `export async function POST(request)` (App Router) or `export default async function handler(req, res)` (Pages Router). The adonis-next `/api/*` routes are all App Router; advnce-site is all Pages Router.
- **`request.cookies.get(...)` vs `req.cookies[...]`** — App Router (adonis-next) uses the former. The `requireAdmin` helper is App Router only. Advnce-site routes don't need the helper (no admin routes on that project; customer-facing only).
- **If a curl test 401s when you expect it to pass**, check that the cookie is being sent: `-H 'Cookie: adonis_admin=authenticated'` (exact value — the middleware checks for the literal string `authenticated`).
- **Supabase writes via service key bypass RLS.** The smoke test inserts test products / attributions directly for this reason. Clean up after yourself.
- **Dev server port:** `npm run dev` defaults to 3000. If another process owns 3000, pass `--port 3001` and adjust the curl URLs.
