# ADVNCE Status Rewards Program Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatic lifetime-spend loyalty tiers (MOMENTUM/VELOCITY/APEX) with free-vial unlock gifts for advncelabs.com customers, per the approved spec at `docs/superpowers/specs/2026-06-09-advnce-rewards-design.md` (in adonis-next).

**Architecture:** A pure ESM module `api/_lib/loyalty.js` in **advnce-site** holds all tier math (config, spend summation, tier/discount/gift resolution) — same one-source-of-truth pattern as `api/_lib/presell.js`. The order handler `api/send-order-email.js` orchestrates: one extra Supabase query for the customer's prior orders (matched by email OR phone), better-of discount resolution, $0 gift line-item injection, and email blocks. Admin display lands in **adonis-next** (`app/admin/orders/page.jsx`) — its API already does `select=*`, so the two new columns flow through untouched.

**Tech Stack:** advnce-site: vanilla ESM Vercel functions, `node --test` (existing `test/*.test.js` + `npm test`), static HTML pages, Supabase PostgREST, Resend. adonis-next: Next.js 14 App Router, JSX, no test framework (display-only changes, manual verification).

**Repos:**
- `/Volumes/(626)806-4475/Ai Projects/advnce-site` — Tasks 2–8 (commit there)
- `/Volumes/(626)806-4475/Ai Projects/adonis-next` — Task 9 (commit there)
- Supabase SQL editor (manual, no CLI) — Task 1

---

### Task 1: Supabase DDL (manual — Jorrel runs in SQL editor)

**Files:** none (Supabase dashboard → SQL editor). Migrations are manual in this project — there is no linked CLI or Docker.

- [ ] **Step 1: Verify `discount_type` is plain text, not a PG enum**

Run in the Supabase SQL editor:

```sql
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'orders'
  AND column_name IN ('discount_type', 'total', 'tier_unlocked', 'loyalty_tier');
```

Expected: `discount_type` shows `data_type = text` (or `character varying`). If instead `udt_name` is a custom enum type, additionally run:
`ALTER TYPE <udt_name> ADD VALUE IF NOT EXISTS 'loyalty';`

- [ ] **Step 2: Add the two new nullable columns**

```sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tier_unlocked text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS loyalty_tier text;
```

- [ ] **Step 3: Verify columns exist via PostgREST**

```bash
cd "/Volumes/(626)806-4475/Ai Projects/adonis-next" && set -a && source .env.local && set +a && \
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/orders?select=order_id,tier_unlocked,loyalty_tier&limit=1" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

Expected: a JSON row with `tier_unlocked: null, loyalty_tier: null` (no "column does not exist" error).

---

### Task 2: Loyalty module — config, spend, tier (TDD)

**Files:**
- Create: `advnce-site/api/_lib/loyalty.js`
- Create: `advnce-site/test/loyalty.test.js`

- [ ] **Step 1: Write the failing tests**

Create `test/loyalty.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LOYALTY_TIERS, PAID_STATUSES,
  lifetimeSpend, tierForSpend, tierRank,
} from '../api/_lib/loyalty.js';

test('LOYALTY_TIERS config shape', () => {
  assert.equal(LOYALTY_TIERS.length, 3);
  assert.deepEqual(LOYALTY_TIERS.map(t => t.name), ['MOMENTUM', 'VELOCITY', 'APEX']);
  assert.deepEqual(LOYALTY_TIERS.map(t => t.threshold), [350, 1000, 2500]);
  assert.deepEqual(LOYALTY_TIERS.map(t => t.pct), [5, 10, 15]);
  assert.deepEqual(LOYALTY_TIERS.map(t => t.gift.sku), ['DS5', 'NA500', 'SS50']);
});

test('lifetimeSpend sums only paid-ish statuses', () => {
  const orders = [
    { total: 100, status: 'delivered' },
    { total: 50, status: 'paid' },
    { total: '25.50', status: 'shipped' },     // string totals from PostgREST
    { total: 10, status: 'confirmed' },
    { total: 10, status: 'processing' },
    { total: 999, status: 'pending_payment' }, // not paid — excluded
    { total: 999, status: 'sent' },            // excluded
    { total: 999, status: 'cancelled' },       // excluded
  ];
  assert.equal(lifetimeSpend(orders), 195.5);
});

test('lifetimeSpend handles empty / missing input', () => {
  assert.equal(lifetimeSpend([]), 0);
  assert.equal(lifetimeSpend(null), 0);
  assert.equal(lifetimeSpend([{ total: null, status: 'paid' }]), 0);
});

test('PAID_STATUSES matches spec', () => {
  assert.deepEqual(PAID_STATUSES, ['confirmed', 'paid', 'processing', 'shipped', 'delivered']);
});

test('tierForSpend boundaries', () => {
  assert.equal(tierForSpend(0), null);
  assert.equal(tierForSpend(349.99), null);
  assert.equal(tierForSpend(350).name, 'MOMENTUM');
  assert.equal(tierForSpend(999.99).name, 'MOMENTUM');
  assert.equal(tierForSpend(1000).name, 'VELOCITY');
  assert.equal(tierForSpend(2500).name, 'APEX');
  assert.equal(tierForSpend(99999).name, 'APEX');
});

test('tierRank', () => {
  assert.equal(tierRank('MOMENTUM'), 0);
  assert.equal(tierRank('VELOCITY'), 1);
  assert.equal(tierRank('APEX'), 2);
  assert.equal(tierRank('NOPE'), -1);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd "/Volumes/(626)806-4475/Ai Projects/advnce-site" && npm test`
Expected: FAIL — `Cannot find module '.../api/_lib/loyalty.js'` (the other 3 existing test files still pass).

- [ ] **Step 3: Write the implementation**

Create `api/_lib/loyalty.js`:

```js
// ADVNCE Status loyalty tiers: one source of truth used by checkout + emails.
// Spec: adonis-next repo, docs/superpowers/specs/2026-06-09-advnce-rewards-design.md
// Rules: tier discount (from PAST paid spend) applies to regular-priced items
// on the current order; the order that crosses a threshold gets a free gift
// vial as a $0 line item. Gift SKUs are swappable here as stock shifts.

export const PAID_STATUSES = ['confirmed', 'paid', 'processing', 'shipped', 'delivered'];

export const LOYALTY_TIERS = [
  { name: 'MOMENTUM', threshold: 350,  pct: 5,  gift: { sku: 'DS5',   name: 'DSIP',  size: '5mg / 3ml',   retail: 32 } },
  { name: 'VELOCITY', threshold: 1000, pct: 10, gift: { sku: 'NA500', name: 'NAD+',  size: '500mg / 3ml', retail: 60 } },
  { name: 'APEX',     threshold: 2500, pct: 15, gift: { sku: 'SS50',  name: 'SS-31', size: '50mg / 3ml',  retail: 225 } },
];

const round2 = n => Math.round(n * 100) / 100;

// Sum of totals the customer has actually paid (prior orders only).
export function lifetimeSpend(orders) {
  return round2((orders || [])
    .filter(o => PAID_STATUSES.includes(o.status))
    .reduce((s, o) => s + (parseFloat(o.total) || 0), 0));
}

// Highest tier earned at a given spend, or null below MOMENTUM.
export function tierForSpend(spend) {
  let earned = null;
  for (const t of LOYALTY_TIERS) if (spend >= t.threshold) earned = t;
  return earned;
}

export function tierRank(name) {
  return LOYALTY_TIERS.findIndex(t => t.name === name);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: all tests PASS (including the 3 pre-existing test files).

- [ ] **Step 5: Commit (in advnce-site)**

```bash
cd "/Volumes/(626)806-4475/Ai Projects/advnce-site"
git add api/_lib/loyalty.js test/loyalty.test.js
git commit -m "feat(loyalty): ADVNCE Status tier config, lifetime spend, tier resolution"
```

---

### Task 3: Loyalty module — discount amount (TDD)

**Files:**
- Modify: `advnce-site/api/_lib/loyalty.js`
- Modify: `advnce-site/test/loyalty.test.js`

- [ ] **Step 1: Add failing tests**

Append to `test/loyalty.test.js` (add `loyaltyDiscountAmount` to the existing import from `../api/_lib/loyalty.js`):

```js
test('loyaltyDiscountAmount: pct of regular-priced subtotal by past-spend tier', () => {
  assert.equal(loyaltyDiscountAmount(0, 100), 0);        // no tier yet
  assert.equal(loyaltyDiscountAmount(349.99, 100), 0);
  assert.equal(loyaltyDiscountAmount(350, 100), 5);      // MOMENTUM 5%
  assert.equal(loyaltyDiscountAmount(1000, 200), 20);    // VELOCITY 10%
  assert.equal(loyaltyDiscountAmount(2500, 100), 15);    // APEX 15%
  assert.equal(loyaltyDiscountAmount(350, 0), 0);        // all-pre-sell cart → no base
  assert.equal(loyaltyDiscountAmount(350, 33.33), 1.67); // rounds to cents
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npm test`
Expected: FAIL — `loyaltyDiscountAmount is not a function` (or undefined import).

- [ ] **Step 3: Implement**

Append to `api/_lib/loyalty.js`:

```js
// Dollar discount for the current checkout. Base = subtotal of
// regular-priced lines only (caller excludes pre-sell lines, which already
// carry the 25% pre-sell discount — spec §2.2/§2.4).
export function loyaltyDiscountAmount(spend, regularSubtotal) {
  const tier = tierForSpend(spend);
  if (!tier) return 0;
  return round2((Number(regularSubtotal) || 0) * tier.pct / 100);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/_lib/loyalty.js test/loyalty.test.js
git commit -m "feat(loyalty): tier discount amount on regular-priced subtotal"
```

---

### Task 4: Loyalty module — gift unlock + next-tier progress (TDD)

**Files:**
- Modify: `advnce-site/api/_lib/loyalty.js`
- Modify: `advnce-site/test/loyalty.test.js`

- [ ] **Step 1: Add failing tests**

Append to `test/loyalty.test.js` (extend the import with `highestUnlockedRank, giftsUnlocked, nextTier`):

```js
test('highestUnlockedRank ignores cancelled and null', () => {
  assert.equal(highestUnlockedRank([]), -1);
  assert.equal(highestUnlockedRank([{ status: 'delivered', tier_unlocked: null }]), -1);
  assert.equal(highestUnlockedRank([
    { status: 'delivered', tier_unlocked: 'MOMENTUM' },
    { status: 'pending_payment', tier_unlocked: 'VELOCITY' }, // pending still blocks re-grant
  ]), 1);
  // a cancelled crossing order never shipped its gift — does not block
  assert.equal(highestUnlockedRank([{ status: 'cancelled', tier_unlocked: 'APEX' }]), -1);
});

test('giftsUnlocked: simple crossing', () => {
  const got = giftsUnlocked(300, 100, -1); // 300 past + 100 now = 400
  assert.deepEqual(got.map(t => t.name), ['MOMENTUM']);
});

test('giftsUnlocked: multi-threshold jump grants all crossed', () => {
  const got = giftsUnlocked(0, 1100, -1);
  assert.deepEqual(got.map(t => t.name), ['MOMENTUM', 'VELOCITY']);
});

test('giftsUnlocked: grandfathers pre-program spend', () => {
  // $999 historical spend, never flagged → first qualifying order grants both
  const got = giftsUnlocked(999, 10, -1);
  assert.deepEqual(got.map(t => t.name), ['MOMENTUM', 'VELOCITY']);
});

test('giftsUnlocked: priorRank blocks re-grant', () => {
  assert.deepEqual(giftsUnlocked(999, 10, 1), []);              // both already granted
  assert.deepEqual(giftsUnlocked(999, 10, 0).map(t => t.name), ['VELOCITY']);
});

test('giftsUnlocked: below threshold grants nothing', () => {
  assert.deepEqual(giftsUnlocked(100, 100, -1), []);
});

test('nextTier progress', () => {
  assert.deepEqual(nextTier(0), { tier: LOYALTY_TIERS[0], remaining: 350 });
  assert.deepEqual(nextTier(480), { tier: LOYALTY_TIERS[1], remaining: 520 });
  assert.deepEqual(nextTier(2499.99), { tier: LOYALTY_TIERS[2], remaining: 0.01 });
  assert.equal(nextTier(2500), null); // APEX is the top
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npm test` — Expected: FAIL on the new tests.

- [ ] **Step 3: Implement**

Append to `api/_lib/loyalty.js`:

```js
// Highest tier already granted a gift on any non-cancelled prior order.
// Pending orders count: their gift will ship once paid, so don't re-grant.
// Cancelled orders don't: their gift never shipped (spec §6).
export function highestUnlockedRank(orders) {
  let rank = -1;
  for (const o of orders || []) {
    if (o.status === 'cancelled' || !o.tier_unlocked) continue;
    const r = tierRank(o.tier_unlocked);
    if (r > rank) rank = r;
  }
  return rank;
}

// Tiers whose gift is due on this order, ascending. A tier qualifies when
// it has never been granted (rank > priorRank) and projected spend
// (past paid + this order's final total) reaches its threshold. This both
// detects crossings and grandfathers pre-program spend (spec §2.3).
export function giftsUnlocked(pastSpend, currentFinalTotal, priorRank) {
  const after = pastSpend + currentFinalTotal;
  return LOYALTY_TIERS.filter((t, i) => i > priorRank && after >= t.threshold);
}

// Next tier above the given spend with dollars remaining; null at APEX.
export function nextTier(spend) {
  for (const t of LOYALTY_TIERS) {
    if (spend < t.threshold) return { tier: t, remaining: round2(t.threshold - spend) };
  }
  return null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/_lib/loyalty.js test/loyalty.test.js
git commit -m "feat(loyalty): gift unlock detection with grandfathering + next-tier progress"
```

---

### Task 5: Order handler integration

**Files:**
- Modify: `advnce-site/api/send-order-email.js` (imports at line 1; loyalty resolution after the attribution block ending ~line 156; gift injection after `finalTotal` ~line 160; order payload ~line 169; API response ~line 364)

No test harness exists for Vercel handlers in this repo (all logic was deliberately kept in the tested pure module). Verification is the end-to-end pass in Task 10.

- [ ] **Step 1: Add imports**

At line 1, alongside the presell import:

```js
import { isPresellEligible, applyPresellDiscount } from './_lib/presell.js';
import { LOYALTY_TIERS, lifetimeSpend, tierForSpend, tierRank, loyaltyDiscountAmount, highestUnlockedRank, giftsUnlocked, nextTier } from './_lib/loyalty.js';
```

- [ ] **Step 2: Loyalty lookup + better-of discount resolution**

Insert directly AFTER the attribution/code `try/catch` block (after the `} catch(err) { ... // Don't fail the order — proceed without discount }` at ~line 156) and BEFORE the `// Cap discount at order total` line:

```js
  // ── ADVNCE Status loyalty (lifetime-spend tiers; spec in adonis-next docs) ──
  // One query for the customer's prior orders, matched by email OR phone —
  // same identity model as ambassador attribution.
  let loyaltyTier = null;     // tier earned from PAST paid spend (drives this order's %)
  let pastOrders = [];
  let pastSpend = 0;
  try {
    const histRes = await fetch(`${SUPABASE_URL}/rest/v1/orders?or=(email.ilike.${encodeURIComponent(email)},attribution_phone.eq.${phoneNorm})&select=total,status,tier_unlocked`, {
      headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` }
    });
    const histData = await histRes.json();
    pastOrders = Array.isArray(histData) ? histData : [];
    pastSpend = lifetimeSpend(pastOrders);
    loyaltyTier = tierForSpend(pastSpend);

    // Discount base excludes pre-sell lines (they already carry 25% off).
    const regularSubtotal = parseFloat(items.filter(i => !i.pre_sell)
      .reduce((s, i) => s + i.price * i.qty, 0).toFixed(2));
    const loyaltyAmount = loyaltyDiscountAmount(pastSpend, regularSubtotal);

    // Better-of: loyalty replaces a smaller code discount, never stacks.
    // Ambassador attribution + commissions are independent of which side wins.
    // Promo used_count increment below keys off discountType === 'promo', so
    // a promo beaten by loyalty is correctly not counted as used.
    if (loyaltyAmount > discountAmount) {
      discountAmount = loyaltyAmount;
      discountCode = loyaltyTier.name;
      discountType = 'loyalty';
    }
  } catch(err) {
    console.error('Loyalty lookup error:', err);
    // Don't fail the order — proceed without loyalty benefits
  }
```

- [ ] **Step 3: Gift unlock + $0 line-item injection**

Insert AFTER `const finalTotal = parseFloat((serverTotal - discountAmount).toFixed(2));` (~line 160) and BEFORE the `// ── Save order ──` section:

```js
  // ── Loyalty gift unlock: free vial ships with the order that crosses a tier ──
  let tierUnlocked = null;
  let loyaltyGiftNames = [];
  let giftStockWarning = null;
  try {
    const crossed = giftsUnlocked(pastSpend, finalTotal, highestUnlockedRank(pastOrders));
    if (crossed.length) {
      tierUnlocked = crossed[crossed.length - 1].name; // highest tier reached
      const giftSkus = crossed.map(t => t.gift.sku).join(',');
      const giftRes = await fetch(`${SUPABASE_URL}/rest/v1/products?sku=in.(${giftSkus})&select=sku,name,size,stock,active,retail`, {
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` }
      });
      const giftRows = await giftRes.json();
      for (const t of crossed) {
        const row = (Array.isArray(giftRows) ? giftRows : []).find(r => r.sku === t.gift.sku);
        if (row && row.active !== false && Number(row.stock) > 0) {
          items.push({ sku: row.sku, name: row.name, size: row.size, qty: 1, price: 0, retail: parseFloat(row.retail), loyalty_gift: true });
          loyaltyGiftNames.push(`${row.name} ${row.size}`);
        } else {
          // Tier still unlocks (spec §2.3); admin substitutes a vial by hand.
          giftStockWarning = `${t.name} gift ${t.gift.sku} unavailable — substitute a comparable vial manually`;
        }
      }
    }
  } catch(err) {
    console.error('Loyalty gift error:', err);
  }
```

- [ ] **Step 4: Persist the two new fields on the order**

In `orderPayload` (~line 169), after the `discount_amount` line, add:

```js
      loyalty_tier: loyaltyTier ? loyaltyTier.name : null,
      tier_unlocked: tierUnlocked,
```

- [ ] **Step 5: Return loyalty data to the success screen**

Replace the success response (~line 364):

```js
    return res.status(200).json({ success: true, verifiedTotal, order_id, discountAmount, codeWarning });
```

with:

```js
    const unlockedTier = tierUnlocked ? LOYALTY_TIERS[tierRank(tierUnlocked)] : null;
    return res.status(200).json({
      success: true, verifiedTotal, order_id, discountAmount, codeWarning,
      loyaltyTier: loyaltyTier ? loyaltyTier.name : null,
      loyaltyPct: loyaltyTier ? loyaltyTier.pct : 0,
      tierUnlocked,
      tierUnlockedPct: unlockedTier ? unlockedTier.pct : 0,
      loyaltyGiftNames,
    });
```

(The early-return `emailWarning` path a few lines below stays as-is — the success screen treats missing loyalty fields as "nothing to show".)

- [ ] **Step 6: Sanity check + commit**

Run: `npm test` (still passes — module untouched) and `node --check api/send-order-email.js`
Expected: no syntax errors.

```bash
git add api/send-order-email.js
git commit -m "feat(loyalty): tier discount, gift injection, and loyalty fields in order flow"
```

---

### Task 6: Email blocks — customer status/celebration + admin flags

**Files:**
- Modify: `advnce-site/api/send-order-email.js` (email construction section, ~lines 241–354)

- [ ] **Step 1: Build the loyalty email block**

Insert AFTER the `discountRowBranded` definition (~line 268) and BEFORE `const customerHtml`:

```js
  // ── ADVNCE Status email block: celebration on a crossing order, progress
  //    footer otherwise. Projected spend = what their lifetime will read once
  //    this order is paid.
  const projectedSpend = parseFloat((pastSpend + finalTotal).toFixed(2));
  const projTier = tierForSpend(projectedSpend);
  const nxt = nextTier(projectedSpend);
  let loyaltyBlockHtml = '';
  if (tierUnlocked) {
    const unlocked = LOYALTY_TIERS[tierRank(tierUnlocked)];
    const giftLine = loyaltyGiftNames.length
      ? `A free <strong>${loyaltyGiftNames.map(esc).join('</strong> and <strong>')}</strong> is in your box. ` : '';
    loyaltyBlockHtml = `<div style="background:#FAFBFC;border:1px solid rgba(224,124,36,0.35);padding:20px 24px;margin:0 0 28px;border-radius:4px">
        <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#E07C24;letter-spacing:3px;text-transform:uppercase;margin-bottom:10px">ADVNCE Status unlocked</div>
        <p style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1A1C22;line-height:1.6;margin:0">You just hit <strong>${esc(tierUnlocked)}</strong>. ${giftLine}${unlocked.pct}% now applies to every future order — automatically. No codes, no signup.</p>
      </div>`;
  } else if (projTier || nxt) {
    loyaltyBlockHtml = `<p style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#7A7D88;letter-spacing:1.5px;text-transform:uppercase;margin:0 0 28px">ADVNCE Status — lifetime: $${projectedSpend.toFixed(2)}${projTier ? ` &middot; ${projTier.name} (${projTier.pct}% off)` : ''}${nxt ? ` &middot; $${nxt.remaining.toFixed(2)} to ${nxt.tier.name} (${nxt.tier.pct}% off)` : ''}</p>`;
  }
```

- [ ] **Step 2: Insert the block into the customer email**

In `customerHtml`, the pre-order conditional ends with `</div>` + backtick-`: ''}` (~line 307), immediately before the Zelle payment `<div style="background:#1A1C22;padding:28px;...`. Insert `${loyaltyBlockHtml}` between them, so the section reads:

```js
      ${items.some(i => i.pre_sell) ? `...pre-order note div...` : ''}

      ${loyaltyBlockHtml}

      <div style="background:#1A1C22;padding:28px;margin-bottom:28px;border-radius:3px">
```

- [ ] **Step 3: Mark gift lines as FREE in both item tables**

Replace the `brandedItemsHtml` map (~line 262) with:

```js
  const brandedItemsHtml = items.map(item =>
    `<tr><td style="padding:14px 0;border-bottom:1px solid #E4E7EC"><div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#1A1C22">${esc(item.name)}</div><div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#7A7D88;letter-spacing:1.5px;text-transform:uppercase;margin-top:3px">${esc(item.size)} &middot; QTY ${item.qty}${item.loyalty_gift ? ' &middot; <span style="color:#E07C24;font-weight:700">FREE GIFT</span>' : ''}</div></td><td style="padding:14px 0;border-bottom:1px solid #E4E7EC;text-align:right;font-family:'JetBrains Mono',monospace;font-size:15px;color:#1A1C22;vertical-align:top">${item.loyalty_gift ? '<span style="color:#E07C24">FREE</span>' : '$' + (item.price * item.qty).toFixed(2)}</td></tr>`
  ).join('');
```

And the plain `itemsHtml` map (~line 253, used in the admin email) with:

```js
  const itemsHtml = items.map(item =>
    `<tr><td style="padding:10px 0;border-bottom:1px solid #eee;font-family:monospace;font-size:13px">${esc(item.name)} — ${esc(item.size)} × ${item.qty}${item.loyalty_gift ? ' 🎁 FREE GIFT' : ''}</td><td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right;font-family:monospace;font-size:13px">${item.loyalty_gift ? 'FREE' : '$' + (item.price * item.qty).toFixed(2)}</td></tr>`
  ).join('');
```

- [ ] **Step 4: Admin flags**

Replace the `adminFlags` array (~line 346) with (changes: the repeat-customer flag now keys off `attributedAmbassadorCode` since `discount_type` may be overridden to `'loyalty'`; three new flags):

```js
  const adminFlags = [
    priceMismatch ? '⚠ PRICE MISMATCH' : null,
    discountType === 'ambassador_first' ? `🎉 FIRST SALE via ${attributedAmbassadorCode}` : null,
    attributedAmbassadorCode && discountType !== 'ambassador_first' ? `↻ Repeat customer (${attributedAmbassadorCode})` : null,
    discountType === 'promo' ? `🎫 Promo code ${discountCode}` : null,
    discountType === 'loyalty' ? `⭐ ${discountCode} loyalty −$${discountAmount.toFixed(2)}` : null,
    tierUnlocked ? `🎁 ${tierUnlocked} GIFT IN BOX` : null,
    giftStockWarning ? `⚠ ${giftStockWarning}` : null,
    codeWarning ? `⚠ ${codeWarning}` : null,
  ].filter(Boolean).join(' · ');
```

(Note: the old `discountType === 'ambassador_repeat'` flag is covered by the new `attributedAmbassadorCode && ...` line.)

- [ ] **Step 5: Sanity check + commit**

Run: `node --check api/send-order-email.js` — Expected: clean.

```bash
git add api/send-order-email.js
git commit -m "feat(loyalty): status footer / unlock celebration in customer email, admin gift flags"
```

---

### Task 7: Checkout success screen

**Files:**
- Modify: `advnce-site/advnce-checkout.html` (success screen markup ~line 301; success JS ~line 568)

- [ ] **Step 1: Add the hidden unlock box**

Insert AFTER the closing `</div>` of `payment-instructions` (~line 301) and BEFORE the `<a href="advnce-catalog.html" class="back-btn">`:

```html
    <div id="loyalty-box" style="display:none;margin:24px 0 0;padding:24px;background:var(--navy);text-align:center">
      <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#E07C24;letter-spacing:3px;text-transform:uppercase;margin-bottom:8px">ADVNCE Status Unlocked</div>
      <div id="loyalty-box-msg" style="font-size:24px;font-weight:900;text-transform:uppercase;color:white"></div>
      <div id="loyalty-box-sub" style="font-family:'JetBrains Mono',monospace;font-size:10px;color:rgba(255,255,255,0.55);letter-spacing:1px;line-height:1.8;margin-top:8px"></div>
    </div>
```

- [ ] **Step 2: Populate it from the API response**

After `document.getElementById('payment-order-id').textContent = orderId;` (~line 568), add:

```js
    if (apiData.tierUnlocked) {
      const msg = document.getElementById('loyalty-box-msg');
      msg.innerHTML = 'You hit <span style="color:#00A0A8"></span>';
      msg.querySelector('span').textContent = apiData.tierUnlocked + '.';
      const gifts = (apiData.loyaltyGiftNames || []).join(' + ');
      document.getElementById('loyalty-box-sub').textContent =
        (gifts ? 'Free ' + gifts + ' ships with this order. ' : '') +
        (apiData.tierUnlockedPct ? apiData.tierUnlockedPct + '% off every future order — automatic.' : '');
      document.getElementById('loyalty-box').style.display = 'block';
    }
```

- [ ] **Step 3: Verify + commit**

Open the file in a browser (`open advnce-checkout.html`), in DevTools console run:
`document.getElementById('loyalty-box').style.display='block'; document.getElementById('loyalty-box-msg').textContent='YOU HIT VELOCITY.'`
Expected: box renders styled correctly under the payment instructions.

```bash
git add advnce-checkout.html
git commit -m "feat(loyalty): tier-unlock celebration on checkout success screen"
```

---

### Task 8: Rewards program page + nav links

**Files:**
- Create: `advnce-site/advnce-rewards.html`
- Modify: `advnce-site/index.html`, `advnce-site/advnce-catalog.html`, `advnce-site/advnce-about.html` (nav link)

- [ ] **Step 1: Create the page**

Create `advnce-rewards.html`. The nav/footer/`:root` tokens copy the shell used by `advnce-about.html` (same fonts link, same nav markup with `Rewards` active). Full page:

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ADVNCE Status — advnce labs</title>
<meta name="description" content="ADVNCE Status: automatic lifetime rewards for advnce labs customers. No signup, no codes — your discount and free vials unlock as you go.">
<link rel="icon" href="favicon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;600;700;800;900&family=JetBrains+Mono:wght@300;400;500&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400;1,600&display=swap" rel="stylesheet">
<style>
:root{--bg:#F4F2EE;--bg2:#ECEAE4;--bg3:#E0DDD6;--cyan:#00A0A8;--amber:#E07C24;--ink:#1A1C22;--dim:#7A7D88;--rule:rgba(0,0,0,0.08);--navy:#1A1C22;--fn:'Barlow Condensed',sans-serif;--fm:'JetBrains Mono',monospace;--fd:'Cormorant Garamond',serif}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
html{background:var(--bg);scroll-behavior:smooth}
body{font-family:var(--fn);background:var(--bg);color:var(--ink);overflow-x:hidden;min-height:100vh}
a{color:inherit;text-decoration:none}
nav{position:sticky;top:0;z-index:100;background:rgba(244,242,238,0.95);backdrop-filter:blur(16px);border-bottom:1px solid var(--rule);padding:0 28px;height:60px;display:flex;align-items:center;justify-content:space-between}
.nav-logo{display:flex;align-items:center;gap:10px}
.nav-brand{font-size:15px;font-weight:900;letter-spacing:4px;text-transform:uppercase;color:var(--ink)}
.nav-brand span{font-weight:400;color:var(--dim)}
.nav-right{display:flex;align-items:center;gap:20px}
.nav-link{font-family:var(--fm);font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);transition:color .2s}
.nav-link:hover{color:var(--ink)}.nav-link.active{color:var(--cyan)}
.hero{max-width:1100px;margin:0 auto;padding:90px 40px 70px;border-bottom:1px solid var(--rule)}
.hero-label{font-family:var(--fm);font-size:9px;color:var(--cyan);letter-spacing:4px;text-transform:uppercase;margin-bottom:24px}
.hero h1{font-size:clamp(48px,8vw,84px);font-weight:900;text-transform:uppercase;letter-spacing:-2px;line-height:.95}
.hero h1 span{color:var(--cyan)}
.hero-sub{font-family:var(--fd);font-style:italic;font-size:22px;color:var(--dim);margin-top:20px;max-width:560px;line-height:1.5}
.how{max-width:1100px;margin:0 auto;padding:60px 40px;display:grid;grid-template-columns:repeat(3,1fr);gap:32px;border-bottom:1px solid var(--rule)}
.how-step .num{font-family:var(--fm);font-size:10px;color:var(--amber);letter-spacing:3px;margin-bottom:10px}
.how-step h3{font-size:22px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px}
.how-step p{font-family:var(--fd);font-size:16px;color:var(--dim);line-height:1.6}
.tiers{max-width:1100px;margin:0 auto;padding:60px 40px;display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
.tier-card{background:var(--bg2);border:1px solid var(--rule);padding:36px 28px;position:relative}
.tier-card.apex{background:var(--navy);color:#F4F2EE}
.tier-card .t-label{font-family:var(--fm);font-size:9px;letter-spacing:3px;text-transform:uppercase;color:var(--dim);margin-bottom:14px}
.tier-card h2{font-size:34px;font-weight:900;text-transform:uppercase;letter-spacing:1px}
.tier-card .t-threshold{font-family:var(--fm);font-size:11px;color:var(--cyan);letter-spacing:1px;margin:6px 0 22px}
.tier-card .t-pct{font-size:56px;font-weight:900;line-height:1}
.tier-card .t-pct small{font-size:18px;font-weight:700;letter-spacing:1px}
.tier-card ul{list-style:none;margin-top:22px}
.tier-card li{font-family:var(--fd);font-size:15px;line-height:1.6;padding:7px 0;border-top:1px solid var(--rule)}
.tier-card.apex li{border-top:1px solid rgba(255,255,255,0.12)}
.tier-card .t-gift{font-family:var(--fm);font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--amber);margin-top:18px}
.fine{max-width:1100px;margin:0 auto;padding:40px 40px 80px}
.fine p{font-family:var(--fm);font-size:10px;color:var(--dim);letter-spacing:1px;line-height:2;text-transform:uppercase}
.cta{text-align:center;padding:0 40px 90px}
.cta a{display:inline-block;background:var(--cyan);color:white;padding:16px 40px;font-size:16px;font-weight:900;text-transform:uppercase;letter-spacing:3px}
footer{text-align:center;padding:24px 40px;border-top:1px solid var(--rule);font-family:var(--fm);font-size:9px;color:var(--dim);letter-spacing:2px;text-transform:uppercase}
@media(max-width:860px){.how,.tiers{grid-template-columns:1fr}.hero{padding:60px 24px 50px}.how,.tiers,.fine{padding-left:24px;padding-right:24px}}
</style>
</head>
<body>

<nav>
  <a href="index.html" class="nav-logo">
    <svg viewBox="0 0 48 28" width="34" height="20" fill="none"><path d="M2 24L8 19L14 22L20 14L26 17L32 9L38 12L46 3" stroke="#00A0A8" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/><circle cx="32" cy="9" r="2" fill="#00A0A8"/><circle cx="38" cy="12" r="2" fill="#E07C24"/><circle cx="46" cy="3" r="2.5" fill="#E07C24"/></svg>
    <span class="nav-brand" style="font-weight:300;letter-spacing:2px;text-transform:lowercase">advnce <span style="font-weight:300">labs</span></span>
  </a>
  <div class="nav-right">
    <a href="index.html" class="nav-link">Home</a>
    <a href="advnce-catalog.html" class="nav-link">Catalog</a>
    <a href="advnce-protocols.html" class="nav-link">Protocols</a>
    <a href="advnce-rewards.html" class="nav-link active">Rewards</a>
    <a href="advnce-about.html" class="nav-link">About</a>
    <a href="advnce-legal.html" class="nav-link">Legal</a>
  </div>
</nav>

<section class="hero">
  <div class="hero-label">ADVNCE Status — Customer Rewards</div>
  <h1>The more you<br>research, the<br><span>further you go.</span></h1>
  <p class="hero-sub">Automatic rewards on every order. No signup, no points, no codes to remember — your status builds itself, and your benefits apply at checkout on their own.</p>
</section>

<section class="how">
  <div class="how-step">
    <div class="num">01 — ORDER</div>
    <h3>Just buy as usual</h3>
    <p>Every paid order counts toward your lifetime total. We recognize you by the email or phone you check out with — nothing to create, nothing to log into.</p>
  </div>
  <div class="how-step">
    <div class="num">02 — UNLOCK</div>
    <h3>Cross a threshold</h3>
    <p>The order that carries you into a new tier ships with a free research compound in the box — on us, automatically.</p>
  </div>
  <div class="how-step">
    <div class="num">03 — KEEP IT</div>
    <h3>Your discount is permanent</h3>
    <p>Once you reach a tier, its discount applies to every future order. Forever. It's already applied by the time you see your total.</p>
  </div>
</section>

<section class="tiers">
  <div class="tier-card">
    <div class="t-label">Tier 01</div>
    <h2>Momentum</h2>
    <div class="t-threshold">$350 LIFETIME</div>
    <div class="t-pct">5<small>% OFF</small></div>
    <ul>
      <li>5% off every order, automatically</li>
      <li>Status tracked in every order email</li>
    </ul>
    <div class="t-gift">🎁 Unlock gift: DSIP 5mg — free</div>
  </div>
  <div class="tier-card">
    <div class="t-label">Tier 02</div>
    <h2>Velocity</h2>
    <div class="t-threshold">$1,000 LIFETIME</div>
    <div class="t-pct">10<small>% OFF</small></div>
    <ul>
      <li>10% off every order, automatically</li>
      <li>Early access to restocks &amp; pre-sells</li>
    </ul>
    <div class="t-gift">🎁 Unlock gift: NAD+ 500mg — free</div>
  </div>
  <div class="tier-card apex">
    <div class="t-label" style="color:rgba(244,242,238,0.5)">Tier 03</div>
    <h2>Apex</h2>
    <div class="t-threshold">$2,500 LIFETIME</div>
    <div class="t-pct">15<small>% OFF</small></div>
    <ul>
      <li>15% off every order, automatically</li>
      <li>Priority fulfillment</li>
      <li>Surprise drop-ins in your shipments</li>
    </ul>
    <div class="t-gift">🎁 Unlock gift: SS-31 50mg — free</div>
  </div>
</section>

<div class="cta"><a href="advnce-catalog.html">Browse the Catalog →</a></div>

<section class="fine">
  <p>Lifetime totals count paid orders only. Tier discounts apply to regular-priced items and do not combine with promo codes — you automatically get whichever is better. Pre-sell items already carry their own 25% discount. Unlock gifts ship once per tier, with the order that reaches it; if a gift compound is out of stock we'll include a comparable one. Existing customers: your order history already counts.</p>
</section>

<footer>ALL PRODUCTS ARE FOR RESEARCH AND LABORATORY USE ONLY · NOT FOR HUMAN CONSUMPTION · NOT EVALUATED BY THE FDA</footer>

</body>
</html>
```

- [ ] **Step 2: Add the nav link on the three main pages**

In each of `index.html`, `advnce-catalog.html`, `advnce-about.html`: find the nav block containing `<a href="advnce-about.html" class="nav-link"` and insert this line immediately BEFORE the About link (match each file's existing indentation; in `advnce-about.html` the About link has `class="nav-link active"`):

```html
    <a href="advnce-rewards.html" class="nav-link">Rewards</a>
```

If a page's nav differs structurally (e.g., `index.html` may have its own hero nav), insert wherever the Catalog/Protocols/About links live — same pattern.

- [ ] **Step 3: Verify + commit**

Run: `open advnce-rewards.html` — Expected: page renders in the cream-luxe brand style, three tier cards (APEX dark), nav highlights Rewards. Click through nav links from index → rewards and back.

```bash
git add advnce-rewards.html index.html advnce-catalog.html advnce-about.html
git commit -m "feat(loyalty): ADVNCE Status program page + nav links"
```

---

### Task 9: Admin orders view — tier badges + gift flag (adonis-next repo)

**Files:**
- Modify: `adonis-next/app/admin/orders/page.jsx:153-156` (row-head badges) and `:170-175` (item lines)

Note: `app/admin/orders/page.jsx` has uncommitted changes on main — `git stash` is NOT needed; just edit on top and commit only this file's loyalty additions together with whatever is already staged there (ask Jorrel if the pre-existing modification should be committed separately — do not silently bundle unrelated work).

- [ ] **Step 1: Badges in the row head**

Replace lines 153–156 (the four discount badges) with:

```jsx
                    {order.discount_type === 'ambassador_first' && <span title="First sale to this customer — 15% off + 15% commission" style={{fontSize:10,background:'#FEF3C7',color:'#A16207',padding:'2px 8px',borderRadius:4,fontWeight:600}}>🎉 First Sale {order.discount_code}</span>}
                    {order.ref_code && order.discount_type !== 'ambassador_first' && <span title="Repeat customer — commission to original ambassador" style={{fontSize:10,background:'#EFF6FF',color:'#0072B5',padding:'2px 8px',borderRadius:4}}>↻ {order.ref_code}</span>}
                    {order.discount_type === 'promo' && <span style={{fontSize:10,background:'#F0FDF4',color:'#16A34A',padding:'2px 8px',borderRadius:4,fontWeight:600}}>🎫 {order.discount_code}</span>}
                    {order.discount_type === 'loyalty' && <span title="ADVNCE Status loyalty discount" style={{fontSize:10,background:'#FFF7ED',color:'#E07C24',padding:'2px 8px',borderRadius:4,fontWeight:600}}>⭐ {order.discount_code}</span>}
                    {order.tier_unlocked && <span title="Tier unlocked on this order — free gift vial must be included in the shipment" style={{fontSize:10,background:'#FEF3C7',color:'#A16207',padding:'2px 8px',borderRadius:4,fontWeight:700}}>🎁 {order.tier_unlocked} GIFT</span>}
```

(Changes: old `ambassador_repeat`-only and `!discount_type && ref_code` badges merge into one `ref_code`-driven badge, since a repeat ambassador customer's `discount_type` can now be `'loyalty'`; loyalty ⭐ and gift 🎁 badges are new.)

- [ ] **Step 2: FREE label on gift item lines**

Replace the item line rendering (lines 170–175) with:

```jsx
                        {items.map((item,i)=>(
                          <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid #F0F1F4',fontSize:13}}>
                            <span style={{color:'#4A4F5C'}}>{item.name} {item.size} × {item.qty}{item.loyalty_gift && <span style={{color:'#E07C24',fontWeight:700}}> · FREE GIFT</span>}</span>
                            <span style={{fontFamily:"'JetBrains Mono'",fontSize:12}}>{item.loyalty_gift ? 'FREE' : '$'+(item.price*item.qty).toFixed(2)}</span>
                          </div>
                        ))}
```

- [ ] **Step 3: Verify + commit**

Run: `cd "/Volumes/(626)806-4475/Ai Projects/adonis-next" && npm run lint`
Expected: no new lint errors in `app/admin/orders/page.jsx`.

Then `npm run dev`, open `http://localhost:3000/admin/orders`, log in, and confirm existing orders render unchanged (no loyalty data yet → no new badges, no crashes).

```bash
git add app/admin/orders/page.jsx
git commit -m "feat(admin/orders): ADVNCE Status loyalty badge + tier-unlock gift flag"
```

(Heed the note above about the file's pre-existing uncommitted changes.)

---

### Task 10: End-to-end verification + deploy

**Files:** none new. Requires Task 1 (DDL) completed first.

⚠ The advnce-site API talks to the **production** Supabase and Resend. The end-to-end test below creates a real order — use Jorrel's own email and **cancel the order in the admin afterward** so it never counts as spend.

- [ ] **Step 1: Full test suite**

Run: `cd "/Volumes/(626)806-4475/Ai Projects/advnce-site" && npm test`
Expected: all test files pass.

- [ ] **Step 2: Local handler smoke test**

Run `vercel dev` in advnce-site (it has the project's env pulled; if not, run `vercel env pull` first). Then place a test order that exercises loyalty (use an email with NO order history so spend = 0 and no gift triggers):

```bash
curl -s http://localhost:3000/api/send-order-email -H 'Content-Type: application/json' -d '{
  "orderData": {
    "order_id": "AVL-2026-TEST01",
    "first_name": "Test", "last_name": "Loyalty",
    "email": "jorrelpatterson+loyaltytest@gmail.com",
    "phone": "5550001234",
    "address": "1 Test St", "city": "LA", "state": "CA", "zip": "90001",
    "items": [{ "sku": "WA10", "name": "Bac Water", "size": "10ml / vial", "qty": 1, "price": 12 }],
    "code": ""
  }
}'
```

Expected response JSON: `success: true`, `loyaltyTier: null`, `loyaltyPct: 0`, `tierUnlocked: null`, `loyaltyGiftNames: []`. Check the order row in admin: `loyalty_tier` and `tier_unlocked` are null.

- [ ] **Step 3: Crossing-order test**

In the Supabase SQL editor, give the test identity a paid history just under MOMENTUM:

```sql
UPDATE orders SET status = 'delivered', total = 340
WHERE order_id = 'AVL-2026-TEST01';
```

Re-run the curl from Step 2 with `"order_id": "AVL-2026-TEST02"` and the same email/phone.
Expected response: `tierUnlocked: "MOMENTUM"`, `loyaltyGiftNames: ["DSIP 5mg / 3ml"]`, `loyaltyTier: null` (no tier from past spend yet → no discount this order, gift only). Verify in admin: order TEST02 shows the 🎁 MOMENTUM GIFT badge and a FREE DSIP line; customer email (Jorrel's inbox) shows the "ADVNCE Status unlocked" block; admin email subject carries `🎁 MOMENTUM GIFT IN BOX`.

- [ ] **Step 4: Discount-on-next-order test**

Re-run the curl once more as `AVL-2026-TEST03` with item price 12. Past spend is now $340 (TEST02 is still pending — excluded). Mark TEST02 delivered first:

```sql
UPDATE orders SET status = 'delivered' WHERE order_id = 'AVL-2026-TEST02';
```

Expected response for TEST03: `loyaltyTier: "MOMENTUM"`, `loyaltyPct: 5`, `discountAmount: 0.6` (5% of $12), `tierUnlocked: null` (MOMENTUM already granted on TEST02 — double-grant guard). Email shows the status footer with lifetime + "$ to VELOCITY".

- [ ] **Step 5: Clean up test orders**

```sql
DELETE FROM orders WHERE order_id IN ('AVL-2026-TEST01','AVL-2026-TEST02','AVL-2026-TEST03');
```

Verify in admin that the three test orders are gone.

- [ ] **Step 6: Deploy advnce-site**

```bash
cd "/Volumes/(626)806-4475/Ai Projects/advnce-site" && vercel deploy
```

Smoke-check the preview URL: rewards page renders, checkout loads. Then promote to production (`vercel deploy --prod` or via dashboard, per Jorrel's usual flow — confirm with him before prod). Deploy adonis-next per its usual flow (push to main → Vercel auto-deploy) after Task 9's commit is approved.

- [ ] **Step 7: Spec cross-check**

Re-read the spec (`adonis-next/docs/superpowers/specs/2026-06-09-advnce-rewards-design.md`) section by section and confirm each requirement maps to shipped behavior. Known intentional deferral: VELOCITY "early access" and APEX "priority fulfillment / drop-ins" are manual-ops perks (page copy only) — no code, per spec §3/§7.

---

## Self-review notes (already applied)

- Spec coverage: §2.1 → Task 2; §2.2 → Tasks 3+5; §2.3 → Tasks 4+5 (incl. grandfathering + multi-tier jump + out-of-stock path); §2.4 → Task 5 better-of (+ promo `used_count` not incremented when loyalty wins — falls out of `discountType === 'promo'` guard); §3.1 → Task 7; §3.2/3.3 → Task 6; §3.4 → Task 8; §3.5 → Task 9; §4 → Task 1; §6 double-grant → Task 4 `highestUnlockedRank` (pending blocks, cancelled doesn't) + Task 10 Step 4.
- Type consistency: module exports used in Tasks 5–6 match Task 2–4 definitions (`lifetimeSpend`, `tierForSpend`, `tierRank`, `loyaltyDiscountAmount`, `highestUnlockedRank`, `giftsUnlocked`, `nextTier`, `LOYALTY_TIERS`); gift line-item shape `{sku,name,size,qty,price,retail,loyalty_gift}` is identical in Task 5 (write), Task 6 (emails), Task 9 (admin).
- Known accepted risks: PostgREST `or=()` email matching assumes no commas/parens in emails (true for all real customers); loyalty lookup adds one query per checkout (trivial at current volume).
