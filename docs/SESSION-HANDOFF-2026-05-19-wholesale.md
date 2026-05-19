# Session Handoff — Wholesale Program (2026-05-19)

> **If you (Claude) are reading this in a new session because the user just moved to a different machine: this is where we left off. Read this file plus the references at the bottom and you'll have the full picture.**

**Working branch:** `claude/wholesale-program` (NOT merged to main)
**Commits ahead of main:** 25
**Status:** Code complete. Branch is testable and mergeable. User has the first PDF in hand.

---

## What this session built

The end-to-end advnce labs **wholesale program** + the **first generated pricing sheet PDF**.

### Capability now live on this branch

1. **Public `/wholesale` page** — Dark-Luxe wait NO — re-skinned to cream-luxe per brand guide. 7 fields + 2 checkboxes, honeypot, optional Cloudflare Turnstile. Wired to API.
2. **Public `/wholesale-terms` page** — placeholder copy until counsel reviews.
3. **Footer link** "Wholesale Inquiries" added to `public/index.html` (Adonis PWA footer — that's intentional since this repo serves both brands; advncelabs.com proper is a separate site).
4. **`/api/wholesale-apply`** — validates + inserts to `distributors` table + sends admin notify email via Resend. Honeypot + optional Turnstile.
5. **`/api/distributor-approval`** — was a broken endpoint (admin UI called a missing route); now exists. Admin-auth-gated. Loads the current PDF from Supabase Storage, sends a cream-luxe Resend email with the PDF attached. Verifies `status='approved'` + `login_code` present.
6. **`/api/wholesale-sheet`** — server-side proxy for PDF upload (GET = info, POST = upsert+archive). Uses `SUPABASE_SERVICE_ROLE_KEY` server-side; bucket stays strict RLS. **Replaces** an earlier broken design where admin uploaded directly from browser with the anon key (security hole).
7. **`/admin/distributors` page changes** — "Current Pricing Sheet" upload tile at top, "Resend Approval Email" button rewired to send `{distributor_id}` instead of the inline object, tier dropdown now labeled "informational tag only" (the old 50-65% tier discount labels are vestigial — pricing is per-SKU per-order on the sheet, not per-account-tier).
8. **Live-data pricing sheet generator** at `scripts/generate-wholesale-sheet.mjs` — fetches live from Supabase `products`, generates branded HTML, ready to print.

---

## Pricing model — locked in

Full details: `docs/wholesale-pricing-model.md`. Critical points:

- **6 buckets** (A–F): 10–90 / 100–190 / 200–290 / 300–390 / 400–490 / 500+ vials per SKU
- **Discount ladder:** 50 / 60 / 65 / 75 / 80 / 90 % off retail (raw formulas)
- **Floor:** every tier ≥ per-vial cost + $4 (margin protection)
- **Cap:** every tier ≤ retail × 0.95
- **$2 gap rule:** no two adjacent tiers may have the same price; lower-volume tier bumps up
- **Viability filter:** if floor > cap, the product is hidden from the sheet (3 of 87 active products currently hidden)

### 🚨 CRITICAL UNIT GOTCHA

The `products.cost` column in Supabase is **per 10-pack**, not per vial. The generator divides by 10 to get per-vial cost. If someone (you, the user, a new product entry) asks about cost numbers, **always clarify per-vial vs per-pack first.** This is the bug that hid 57 products as non-viable before being fixed.

---

## What's on the user's plate (in priority order)

1. **🔒 Rotate the exposed Supabase service-role key.** The user pasted it in chat earlier this session. Conversation logs aren't public, but rotation is best practice. Supabase dashboard → Project Settings → API → reset `service_role` secret. After rotating, update `.env.local` AND the Vercel project env vars. (If they're using a new chat after migration, the key may or may not have been rotated — ask.)

2. **Upload the PDF.** Today's generated PDF lives at:
   - Repo root: `advncelabs-wholesale-2026-05-19.pdf` (335 KB)
   - User's Downloads folder: `~/Downloads/advncelabs-wholesale-2026-05-19.pdf`

   Upload via the new tile at `/admin/distributors` once `SUPABASE_SERVICE_ROLE_KEY` is set in `.env.local` (already is for current machine) and Vercel (TBD).

3. **Supabase Storage RLS** — `wholesale-sheets` bucket has default RLS. The new server-side route uses the service-role key which bypasses RLS, so no policy work needed UNLESS the user wants public read for something (don't — keep it locked).

4. **Decide whether to push + PR or merge straight to main.** Branch is 25 commits ahead of main and has never been pushed to GitHub remote. Reasonable options:
   - Push branch + open a PR for review-trail
   - Push + merge directly (user has been doing this with prior work; see recent commit history on main)
   - Squash-merge the 25 commits into one cohesive "wholesale: ship program v1" commit before merging

5. **Set wholesale prices manually if needed.** The current sheet uses the formula above. If the user wants to override specific products (e.g., hero SKUs with deeper discounts), there is no override mechanism yet. Would need a `wholesale_overrides` JSON or DB column. Mentioned as future work in `docs/wholesale-pricing-model.md`.

---

## How to resume

### From the laptop with the external drive plugged in

```bash
cd "/Volumes/(626)806-4475/Ai Projects/adonis-next"
git status                          # confirm branch = claude/wholesale-program, clean
node --version                       # need v20.x
ls .env.local                        # confirm secrets present
npm install                          # in case dependencies drift
npm run dev                          # boot dev server on :3000
```

Then to regenerate the pricing sheet:

```bash
node scripts/generate-wholesale-sheet.mjs
open wholesale-pricing-template.html

# Or to render a fresh PDF directly:
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless --disable-gpu --no-pdf-header-footer --virtual-time-budget=10000 \
  --print-to-pdf="advncelabs-wholesale-$(date +%Y-%m-%d).pdf" \
  "file://$PWD/wholesale-pricing-template.html"
```

### From a fresh clone (no drive)

```bash
gh repo clone jorrelpatterson/adonis-next && cd adonis-next
git fetch origin
git checkout claude/wholesale-program       # only works if pushed
vercel link && vercel env pull .env.local
npm install
npm run dev
```

If the branch hasn't been pushed yet (likely true at handoff time), check `LAPTOP_MIGRATION.md` for full re-setup steps.

---

## Reference files (source of truth)

| Topic | File |
|---|---|
| **Pricing model spec** | `docs/wholesale-pricing-model.md` |
| **Original wholesale spec** | `docs/superpowers/specs/2026-05-18-wholesale-application-and-pricing-sheet-design.md` |
| **Original wholesale plan** | `docs/superpowers/plans/2026-05-18-wholesale-application-and-pricing-sheet.md` |
| **Brand guide** (source of truth for all visual decisions) | `docs/brand/advncelabs-brand-identity.md` |
| **Sheet generator** | `scripts/generate-wholesale-sheet.mjs` |
| **Generic laptop migration** | `LAPTOP_MIGRATION.md` (untracked — see `git status`) |

---

## Quick context for the Claude session that picks this up

1. **You're picking up a near-shipped wholesale program** — most work is done, user is in test/upload phase.
2. **The brand is cream luxe**, NOT dark luxe. Easy mistake — `public/index.html` is the Adonis PWA (a different product in the same repo). Read `docs/brand/advncelabs-brand-identity.md` if anything visual is on the table.
3. **`cost` in Supabase `products` is per-10-pack**, not per-vial. Divide by 10 before any pricing math.
4. **The pricing sheet is regenerable** — `node scripts/generate-wholesale-sheet.mjs`. Don't try to hand-edit the HTML. If prices need changing, change the formula in the script or fix the underlying data in Supabase.
5. **Branch `claude/wholesale-program` is the working branch.** Main hasn't received the wholesale work yet.
6. **Memory files don't survive the machine migration** unless the user manually copies `~/.claude/projects/-Volumes--626-806-4475-Ai-Projects-adonis-next/memory/` to the same path on the new machine. This handoff doc is the persistent context.

---

## Recent commit history on this branch (newest first, 25 commits)

```
3dd54f5 wholesale: document the pricing model as docs/wholesale-pricing-model.md
fdc76b9 wholesale: enforce $2 gap between adjacent tier prices
95ce39b wholesale: raise per-vial floor from cost+$2 to cost+$4
3915deb wholesale: accelerate discount ladder (50/60/65/75/80/90% off retail)
78bde38 wholesale: fix cost unit — DB stores per-10-pack, not per-vial
2e6917d wholesale: switch A–E to % off retail ladder (A starts at 50% off)
e142c7c wholesale: re-skin sheet to advncelabs brand + 6 tiers
dd0ab69 wholesale: rewrite pricing cascade (cost-plus instead of % off retail)
ca4341e wholesale: add live pricing sheet generator script
5e7a141 wholesale: ignore one-shot pricing-sheet HTML template
3578032 wholesale: proxy sheet upload through admin-gated API
bd22626 wholesale: fix volume display + add approval-API status guard
b9a5f35 admin: add pricing-sheet upload tile to distributors page
a7e7742 wholesale: implement /api/distributor-approval to send sheet
7fec967 wholesale: wire application form to submission API
b26670b wholesale: add Cloudflare Turnstile anti-spam
07a1a76 wholesale: simplify expected_volume — store string directly after schema fix
be2fcec wholesale: add /api/wholesale-apply submission route + admin notify
61ab16d admin: clarify tier is a relationship tag, not a pricing driver
d833537 wholesale: add discreet footer link from marketing site
dc63e2a wholesale: add public /wholesale application page UI
5184624 wholesale: add /wholesale-terms placeholder page
f741480 wholesale: add country list constant for application form
```

Plus from a parallel side-project commit `7de0adc spec: v2 to adonis.pro/app + Capacitor iOS wrapper` (not wholesale-related, unrelated spec doc committed mid-stream).
