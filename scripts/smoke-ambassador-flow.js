#!/usr/bin/env node
// End-to-end smoke test for ambassador order flow.
//
// Requires env:
//   SUPABASE_URL, SUPABASE_SERVICE_KEY (loaded from /tmp/advnce.env if present)
//   ADVNCE_ORIGIN defaults to https://www.advncelabs.com
//
// Run: node scripts/smoke-ambassador-flow.js
//
// Exit codes: 0 on all-pass, 1 on any assertion failure.

const fs = require('fs');

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
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  'Content-Type': 'application/json',
};

async function db(path, method = 'GET', body) {
  const r = await fetch(`${URL}${path}`, {
    method,
    headers: dbHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let json = null;
  if (text) { try { json = JSON.parse(text); } catch {} }
  return { status: r.status, text, json };
}

let failures = 0;
function assert(cond, msg) {
  if (!cond) { console.error(`  FAIL: ${msg}`); failures++; }
  else { console.log(`  ok: ${msg}`); }
}

const SEED_CODE = 'EZEKIELPHOTOGRAPHY';

async function pickTestProduct() {
  const r = await db('/rest/v1/products?active=eq.true&select=sku,name,retail&order=retail.asc&limit=1');
  if (!r.json || !r.json.length) throw new Error('No active products available');
  return r.json[0];
}

async function seedAmbassadorReset() {
  await db(`/rest/v1/ambassadors?code=eq.${SEED_CODE}`, 'PATCH', {
    total_orders: 0, total_earned: 0, status: 'active',
  });
  const r = await db(`/rest/v1/ambassadors?code=eq.${SEED_CODE}&select=id,tier,referred_by`);
  if (!r.json || !r.json.length) throw new Error(`Seed ambassador ${SEED_CODE} not found`);
  return r.json[0];
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
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await r.json().catch(() => ({}));
  return { status: r.status, body, orderId };
}

async function test1_firstAmbassadorConversion() {
  console.log('\n=== Test 1: First-time ambassador conversion ===');
  const TEST_PHONE = '5555550100';
  const seedAmb = await seedAmbassadorReset();
  await cleanupAttribution(TEST_PHONE);
  const product = await pickTestProduct();

  const { status, body, orderId } = await placeOrder({ phone: TEST_PHONE, code: SEED_CODE, product });
  assert(status === 200, `place order returns 200 (got ${status}: ${JSON.stringify(body).slice(0, 200)})`);

  await new Promise((r) => setTimeout(r, 2000));

  const ord = await db(`/rest/v1/orders?order_id=eq.${orderId}&select=*`);
  const o = ord.json?.[0];
  assert(!!o, 'order row exists');
  if (o) {
    assert(o.discount_type === 'ambassador_first', `discount_type=ambassador_first (got ${o.discount_type})`);
    assert(o.is_first_attributed === true, `is_first_attributed=true (got ${o.is_first_attributed})`);
    assert(o.attribution_phone === TEST_PHONE, `attribution_phone=${TEST_PHONE} (got ${o.attribution_phone})`);
    assert(parseFloat(o.discount_amount || 0) > 0, `discount_amount > 0 (got ${o.discount_amount})`);
  }

  const att = await db(`/rest/v1/customer_attribution?phone=eq.${TEST_PHONE}`);
  assert(att.json?.length === 1, `customer_attribution row exists (got ${att.json?.length || 0})`);
  if (att.json?.length) {
    assert(att.json[0].ambassador_code === SEED_CODE, `attribution code=${SEED_CODE} (got ${att.json[0].ambassador_code})`);
  }

  const comm = await db(`/rest/v1/referral_commissions?order_id=eq.${orderId}`);
  assert(comm.json?.length === 1, `referral_commissions row exists (got ${comm.json?.length || 0})`);
  if (comm.json?.length) {
    const c = comm.json[0];
    assert(parseFloat(c.l1_amount) > 0, `l1_amount > 0 (got ${c.l1_amount})`);
    const expected = parseFloat((parseFloat(c.order_total) * 0.15).toFixed(2));
    assert(Math.abs(parseFloat(c.l1_amount) - expected) < 0.02, `l1_amount ≈ 15% of ${c.order_total} (got ${c.l1_amount}, expected ${expected})`);
  }

  const amb = await db(`/rest/v1/ambassadors?code=eq.${SEED_CODE}&select=total_orders,total_earned`);
  const a = amb.json?.[0];
  assert((a?.total_orders || 0) >= 1, `ambassador.total_orders >= 1 (got ${a?.total_orders})`);
  assert(parseFloat(a?.total_earned || 0) > 0, `ambassador.total_earned > 0 (got ${a?.total_earned})`);

  await cleanupOrder(orderId);
  await cleanupAttribution(TEST_PHONE);
  await db(`/rest/v1/ambassadors?code=eq.${SEED_CODE}`, 'PATCH', { total_orders: 0, total_earned: 0 });
}

async function test2_repeatCustomer() {
  console.log('\n=== Test 2: Repeat customer (lifetime attribution) ===');
  const TEST_PHONE = '5555550101';
  const seedAmb = await seedAmbassadorReset();
  await cleanupAttribution(TEST_PHONE);

  // Pre-seed attribution to simulate prior conversion
  await db('/rest/v1/customer_attribution', 'POST', {
    phone: TEST_PHONE,
    ambassador_id: seedAmb.id,
    ambassador_code: SEED_CODE,
    first_order_id: 'PRE-SEED-FAKE',
  });

  const product = await pickTestProduct();
  const { status, orderId } = await placeOrder({ phone: TEST_PHONE, code: 'SHOULDNOTAPPLY', product });
  assert(status === 200, `place order returns 200 (got ${status})`);

  await new Promise((r) => setTimeout(r, 2000));

  const ord = await db(`/rest/v1/orders?order_id=eq.${orderId}&select=*`);
  const o = ord.json?.[0];
  assert(!!o, 'order row exists');
  if (o) {
    assert(o.discount_type === 'ambassador_repeat', `discount_type=ambassador_repeat (got ${o.discount_type})`);
    assert(o.is_first_attributed === false, `is_first_attributed=false (got ${o.is_first_attributed})`);
    assert(!o.discount_amount || parseFloat(o.discount_amount) === 0, `discount_amount=0 on repeat (got ${o.discount_amount})`);
  }

  const comm = await db(`/rest/v1/referral_commissions?order_id=eq.${orderId}`);
  assert(comm.json?.length === 1, `referral_commissions row exists (got ${comm.json?.length || 0})`);
  if (comm.json?.length) {
    const c = comm.json[0];
    const tierRate = seedAmb.tier === 'elite' ? 0.20 : seedAmb.tier === 'builder' ? 0.15 : 0.10;
    const expected = parseFloat((parseFloat(c.order_total) * tierRate).toFixed(2));
    assert(Math.abs(parseFloat(c.l1_amount) - expected) < 0.02, `l1_amount at tier rate ${tierRate} (got ${c.l1_amount}, expected ${expected})`);
  }

  await cleanupOrder(orderId);
  await cleanupAttribution(TEST_PHONE);
  await db(`/rest/v1/ambassadors?code=eq.${SEED_CODE}`, 'PATCH', { total_orders: 0, total_earned: 0 });
}

async function test3_promoCode() {
  console.log('\n=== Test 3: Promo code (no ambassador) ===');
  const TEST_PHONE = '5555550102';
  const TEST_PROMO = 'SMOKE10';
  await db(`/rest/v1/discount_codes?code=eq.${TEST_PROMO}`, 'DELETE');
  await cleanupAttribution(TEST_PHONE);

  await db('/rest/v1/discount_codes', 'POST', {
    code: TEST_PROMO, type: 'percent', amount: 10, active: true,
  });

  const product = await pickTestProduct();
  const { status, orderId } = await placeOrder({ phone: TEST_PHONE, code: TEST_PROMO, product });
  assert(status === 200, `place order returns 200 (got ${status})`);

  await new Promise((r) => setTimeout(r, 2000));

  const ord = await db(`/rest/v1/orders?order_id=eq.${orderId}&select=*`);
  const o = ord.json?.[0];
  assert(!!o, 'order row exists');
  if (o) {
    assert(o.discount_type === 'promo', `discount_type=promo (got ${o.discount_type})`);
    assert(parseFloat(o.discount_amount || 0) > 0, `discount_amount > 0 (got ${o.discount_amount})`);
  }

  const code = await db(`/rest/v1/discount_codes?code=eq.${TEST_PROMO}&select=used_count`);
  assert(code.json?.[0]?.used_count === 1, `used_count=1 (got ${code.json?.[0]?.used_count})`);

  const att = await db(`/rest/v1/customer_attribution?phone=eq.${TEST_PHONE}`);
  assert((att.json?.length || 0) === 0, 'no customer_attribution for promo-only order');

  const comm = await db(`/rest/v1/referral_commissions?order_id=eq.${orderId}`);
  assert((comm.json?.length || 0) === 0, 'no referral_commissions for promo-only order');

  await cleanupOrder(orderId);
  await cleanupAttribution(TEST_PHONE);
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
