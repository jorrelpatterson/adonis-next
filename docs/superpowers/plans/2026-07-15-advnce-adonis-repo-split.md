# ADVNCE / Adonis Repo Split — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the ADVNCE Labs back office out of `adonis-next` into a renamed `advncelabs` repo (as `admin/`, its own Vercel project at admin.advncelabs.com), leaving `adonis-next` as the fitness product only — zero data loss.

**Architecture:** Copy-verify-delete migration in 5 phases. The storefront repo `advnce-site` is renamed to `advncelabs` (history preserved) and gains an `admin/` Next.js app copied file-for-file from adonis-next. A second Vercel project (`advnce-admin`, Root Directory `admin/`) deploys from the same repo. Only after full verification are the copied trees stripped from adonis-next and replaced with permanent redirects.

**Tech Stack:** Next.js 14 App Router (JS only, no TS), Supabase (shared, untouched), Vercel (3 projects), Resend via fetch, Stripe SDK, @anthropic-ai/sdk.

**Spec:** `docs/superpowers/specs/2026-07-15-advnce-adonis-repo-split-design.md`

## Global Constraints

- **Zero data loss (hard):** copy → verify → delete, never move; nothing deleted until its copy is verified in production; Supabase never touched (no DDL, no data migration).
- **MASTER-BRIEFING commit gate:** every `git commit`/`git push` and every production-affecting dashboard action marked **⛔ STOP** requires Jorrel's explicit approval first. Show diffs before committing. Never auto-push.
- **`jorrel-os.json` is MERGE-ONLY** — touch only allowed keys; never reshape.
- **Cron ordering rule:** crons are removed from the old project and confirmed gone **before** being enabled in the new one (a <1h gap is harmless; a double-fire sends duplicate business emails).
- **Live-DB discipline:** local/preview admin runs hit the LIVE shared Supabase. Verification is read-mostly; the only sanctioned write test is one support-ticket note (Task 13).
- **JS/JSX only** — no TypeScript anywhere.
- **Worktree note:** this plan operates on the real working trees of two repos plus external systems (GitHub, Vercel, DNS) — worktree isolation does not apply. Safety comes from the copy-verify-delete discipline and Phase 0 snapshots.
- Paths: `SRC` = `/Volumes/(626)806-4475/Ai Projects/adonis-next`, `ADV` = `/Volumes/(626)806-4475/Ai Projects/advncelabs` (post-rename; pre-rename it is `.../advnce-site`).

---

# Phase 0 — Pre-flight (data safety) · Session 1

### Task 1: Snapshot + push adonis-next

**Files:** none created in-repo (zip lands outside the repos)

- [ ] **Step 1: Confirm working tree state**

Run: `cd "/Volumes/(626)806-4475/Ai Projects/adonis-next" && git status --short && git log --oneline -3`
Expected: only `?? AGENTS.md` untracked (plan/spec committed earlier); recent commits visible.

- [ ] **Step 2: Commit AGENTS.md** ⛔ STOP — show Jorrel, get approval

```bash
git add AGENTS.md && git commit -m "docs: add AGENTS.md (Codex mirror of CLAUDE.md)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 3: Push main** ⛔ STOP — pushing deploys adonis.pro via Vercel

Run: `git push origin main`
Expected: `main -> main` accepted. Then verify deploy: `curl -s -o /dev/null -w "%{http_code}" https://adonis.pro` → `200`, and `https://adonis.pro/admin/login` → `200`.

- [ ] **Step 4: Zip snapshot (outside the repo)**

```bash
cd "/Volumes/(626)806-4475/Ai Projects" && zip -rq "adonis-next-pre-split-2026-07-15.zip" adonis-next -x "adonis-next/node_modules/*" "adonis-next/.next/*"
```
Run: `ls -lh adonis-next-pre-split-2026-07-15.zip`
Expected: zip exists, > 1 MB.

### Task 2: Snapshot + push advnce-site (incl. uncommitted swag store)

- [ ] **Step 1: Inventory uncommitted work**

Run: `cd "/Volumes/(626)806-4475/Ai Projects/advnce-site" && git status --short && git log origin/main..main --oneline`
Expected: swag-store-related untracked/modified files; commit `a551277` (ref-capture) unpushed.

- [ ] **Step 2: Park swag work on a branch (offsite backup WITHOUT deploying)** ⛔ STOP — show file list, get approval

```bash
git checkout -b swag-store
git add -A && git commit -m "wip: swag store (POD/Printful) — parked pending Printful+Stripe manual setup

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
git push -u origin swag-store
git checkout main
```
Expected: `main` is clean afterward (`git status --short` → empty); swag work safe on `origin/swag-store`.

- [ ] **Step 3: Push main (deploys ref-capture a551277 — already on the approved next-action list)** ⛔ STOP

Run: `git push origin main`
Verify: `curl -s -o /dev/null -w "%{http_code}" https://advncelabs.com` → `200`. Spot-check homepage in browser: loads normally.
Note: this also closes the standing blocker "ref-capture committed but not deployed."

- [ ] **Step 4: Zip snapshot**

```bash
cd "/Volumes/(626)806-4475/Ai Projects" && zip -rq "advnce-site-pre-split-2026-07-15.zip" advnce-site -x "advnce-site/node_modules/*"
```
Expected: zip exists.

### Task 3: Env-var inventory of the adonis Vercel project

**Files:** Create: `docs/superpowers/plans/2026-07-15-split-worklog.md` (decision log; committed at phase end)

- [ ] **Step 1: List env vars**

Run: `cd "/Volumes/(626)806-4475/Ai Projects/adonis-next" && vercel env ls`
Expected: table of vars incl. (from code usage): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `STRIPE_SECRET_KEY`, `ADMIN_PASSWORD`, `RESEND_API_KEY`, `CRON_SECRET`, `BASE_URL`, `ANTHROPIC_API_KEY`, plus service-role/APNs-era keys. (If CLI isn't authed: `vercel login` first, or read from Vercel dashboard → adonis project → Settings → Environment Variables.)

- [ ] **Step 2: Record the mapping in the worklog**

Create the worklog with a table: `VAR | used by moved routes? | used by staying routes? | copy to advnce-admin?`. Classify with:
```bash
for V in $(vercel env ls 2>/dev/null | awk 'NR>2 {print $1}' | sort -u); do echo "== $V"; grep -rl "$V" app lib src scripts 2>/dev/null | head -5; done
```
Rule: any var referenced by a moved file → copy to advnce-admin. APNs/push vars → adonis-only. `BASE_URL` → both (different values).

### Task 4: Caller-check the ambiguous items

**Files:** Modify: `docs/superpowers/plans/2026-07-15-split-worklog.md` (record verdicts)

- [ ] **Step 1: Who calls `/api/me` and `/api/env-check`?**

```bash
cd "/Volumes/(626)806-4475/Ai Projects/adonis-next"
grep -rn "api/me" src app public/app lib ios 2>/dev/null | grep -v "app/api/me/"
grep -rn "env-check" src app lib 2>/dev/null | grep -v "app/api/env-check/"
```
Decision rules (record verdict in worklog): callers only in `src/`/`public/app` → **stays**; callers only in `app/admin`/moved routes → **moves**; callers in both → **copy to admin AND keep in adonis** (dedupe as fast-follow).

- [ ] **Step 2: Who imports `lib/constants/peptides.js` and `lib/constants/theme.js`?**

```bash
grep -rln "constants/peptides" src app lib | sort
grep -rln "constants/theme" src app lib | sort
```
Rule: imported by any moved file → include in Task 8's copy (theme.js is already in the copy list; add peptides.js only if a moved file imports it).

- [ ] **Step 3: Sweep for missed business assets**

```bash
ls "$PWD" ; ls scripts/ templates/ public/ lib/__tests__/ 2>/dev/null
grep -rln "invoice\|vendor\|presell\|recruitment\|compound\|ambassador" scripts/ lib/__tests__/ 2>/dev/null
```
Record in worklog: any root-level `sql/`, extra business scripts, or business tests found → append them to Task 8's copy list and Task 19's strip list.

- [ ] **Step 4: Commit worklog** ⛔ STOP — approval

```bash
git add docs/superpowers/plans/2026-07-15-split-worklog.md && git commit -m "docs(split): phase 0 worklog — env map + caller-check verdicts

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

**Phase 0 gate:** both zips exist · both repos pushed · env map + verdicts recorded. Do not proceed until all true.

---

# Phase 1 — Build the admin app (copy, don't move) · Sessions 1–2

### Task 5: Rename repo advnce-site → advncelabs

- [ ] **Step 1: GitHub rename** ⛔ STOP — approval

Run: `gh repo rename advncelabs --repo jorrelpatterson/advnce-site --yes`
Expected: `✓ Renamed repository jorrelpatterson/advncelabs`. (GitHub auto-redirects the old URL, so the existing Vercel connection and local remotes keep working.)

- [ ] **Step 2: Local folder rename + remote URL tidy**

```bash
cd "/Volumes/(626)806-4475/Ai Projects"
mv advnce-site advncelabs
cd advncelabs && git remote set-url origin https://github.com/jorrelpatterson/advncelabs.git && git fetch origin
```
Expected: `git fetch` succeeds.

- [ ] **Step 3: Migrate Claude Code per-project memory to the new path**

```bash
cd /Users/jorrelpatterson/.claude/projects
cp -R -- "-Volumes--626-806-4475-Ai-Projects-advnce-site" "-Volumes--626-806-4475-Ai-Projects-advncelabs" 2>/dev/null || echo "no existing memory dir — nothing to migrate"
```
Expected: copy succeeds or the no-op message. (Copy not move — old dir left as backup.)

- [ ] **Step 4: Verify Vercel link still deploys**

Run: `cd "/Volumes/(626)806-4475/Ai Projects/advncelabs" && vercel ls 2>/dev/null | head -5` (or check dashboard: advnce-site project → latest deployment still green).
Expected: project still linked (link is by project ID, not folder name).

### Task 6: Scaffold `admin/` app shell

**Files:**
- Create: `admin/package.json`, `admin/next.config.js`, `admin/.gitignore`, `admin/app/layout.jsx`, `admin/app/page.jsx`
- (No `admin/vercel.json` yet — crons are deliberately absent until Phase 3.)

**Interfaces:** Produces the app shell Task 8's copied trees plug into: root layout renders `{children}`; `/` redirects to `/admin`.

- [ ] **Step 1: Write `admin/package.json`**

```json
{
  "name": "advnce-admin",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3100",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.91.1",
    "@supabase/supabase-js": "^2.101.1",
    "archiver": "^7.0.1",
    "next": "^14.2.0",
    "qrcode": "^1.5.4",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "rss-parser": "^3.13.0",
    "sharp": "^0.34.5",
    "stripe": "^14.25.0"
  },
  "devDependencies": {
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 2: Write `admin/next.config.js`** (carries the tracing includes the recruitment cron needs)

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // The recruitment-drip cron shells out to scripts/send-recruitment-drip.js,
    // which dynamically imports the renderer + reads HTML templates via fs.
    // Force-bundle them or the cron fails with "Cannot find module".
    outputFileTracingIncludes: {
      '/api/cron/recruitment-drip': [
        './scripts/send-recruitment-drip.js',
        './lib/renderRecruitmentEmail.js',
        './lib/unsubToken.js',
        './templates/email/recruitment-*.html',
      ],
    },
  },
};

module.exports = nextConfig;
```

- [ ] **Step 3: Write `admin/.gitignore`**

```
node_modules/
.next/
.env*.local
.vercel
```

- [ ] **Step 4: Write `admin/app/layout.jsx`**

```jsx
import './globals.css';

export const metadata = {
  title: 'ADVNCE Labs — Admin',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```
(`globals.css` arrives in Task 8. `robots: noindex` — this is a back office.)

- [ ] **Step 5: Write `admin/app/page.jsx`**

```jsx
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/admin');
}
```

- [ ] **Step 6: Commit scaffold** ⛔ STOP — approval

```bash
cd "/Volumes/(626)806-4475/Ai Projects/advncelabs"
git add admin/ && git commit -m "feat(admin): scaffold back-office app shell (extraction from adonis-next)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

### Task 7: Record the canonical MOVED lists (single source of truth for Tasks 8/19/20)

**Files:** Modify: `docs/superpowers/plans/2026-07-15-split-worklog.md`

**Interfaces:** Produces `MOVED_API_ROUTES` (55 names) and `MOVED_CRONS` (5 names) used verbatim by Tasks 8, 19, 20.

- [ ] **Step 1: Verify the list against reality** — from adonis-next:

```bash
cd "/Volumes/(626)806-4475/Ai Projects/adonis-next" && ls app/api/
```
Expected: exactly these 60 entries; the 56 MOVED = all EXCEPT `app-signup`, `cron`, `env-check`, `push` (Task 4 verdicts applied: `me` MOVES — admin whoami; `env-check` stays AND is copied to admin as a cutover diagnostic):

```
MOVED_API_ROUTES: admin admin-auth ambassador-apply ambassador-content-digest
ambassador-images ambassador-message ambassador-past-customers ambassador-payout
ambassador-welcome ambassador-write compound-email-draft-list compound-email-draft-write
compound-email-generate compound-email-preview compound-email-resume compound-email-send
discount-code-write email-unsub inventory inventory-adjust inventory-adjustments
inventory-loss-stats invoice-get invoice-list invoice-stats invoice-transition
invoice-write jorrel-os me notify notify-customer order-customer-update order-status
orders orders-list past-customers payment-reminder place-order presell-cancel
presell-po-placed presell-queue product-write purchase-receive purchase-write
recruitment-application-write recruitment-click rewards-announce shipping-confirm
social-image-proxy social-post-write subscribe-welcome-2 subscribe-welcome-3
subscribers-admin support-tickets vendor-prices-write vendor-write

MOVED_CRONS: welcome-emails reorder-reminders news-scrape news-curate recruitment-drip
(STAYING crons: routine-reminders, career)
```

- [ ] **Step 2: Paste the verified lists into the worklog** (with any Task 4 adjustments noted).

### Task 8: Copy everything into `advncelabs`

**Files:** Create: `admin/app/**`, `admin/lib/**`, `admin/middleware.js`, `admin/templates/**`, `admin/scripts/**`, `admin/public/**`, and repo-level `docs/**` (business docs live at repo root, not inside admin/)

- [ ] **Step 1: Copy page trees, middleware, globals**

```bash
SRC="/Volumes/(626)806-4475/Ai Projects/adonis-next"
ADV="/Volumes/(626)806-4475/Ai Projects/advncelabs"
DST="$ADV/admin"
mkdir -p "$DST/app/api/cron" "$DST/lib/constants" "$DST/public" "$DST/templates" "$DST/scripts"

cp -R "$SRC/app/admin"       "$DST/app/admin"
cp -R "$SRC/app/ambassador"  "$DST/app/ambassador"
cp -R "$SRC/app/ambassadors" "$DST/app/ambassadors"
cp    "$SRC/app/globals.css" "$DST/app/globals.css"
cp    "$SRC/middleware.js"   "$DST/middleware.js"
```

- [ ] **Step 2: Copy the 55 API routes + 5 crons**

```bash
ROUTES=(admin admin-auth ambassador-apply ambassador-content-digest ambassador-images ambassador-message ambassador-past-customers ambassador-payout ambassador-welcome ambassador-write compound-email-draft-list compound-email-draft-write compound-email-generate compound-email-preview compound-email-resume compound-email-send discount-code-write email-unsub inventory inventory-adjust inventory-adjustments inventory-loss-stats invoice-get invoice-list invoice-stats invoice-transition invoice-write jorrel-os me notify notify-customer order-customer-update order-status orders orders-list past-customers payment-reminder place-order presell-cancel presell-po-placed presell-queue product-write purchase-receive purchase-write recruitment-application-write recruitment-click rewards-announce shipping-confirm social-image-proxy social-post-write subscribe-welcome-2 subscribe-welcome-3 subscribers-admin support-tickets vendor-prices-write vendor-write)
for r in "${ROUTES[@]}"; do cp -R "$SRC/app/api/$r" "$DST/app/api/$r"; done
cp -R "$SRC/app/api/env-check" "$DST/app/api/env-check"   # copy-to-both (cutover diagnostic; NOT stripped from adonis)

for c in welcome-emails reorder-reminders news-scrape news-curate recruitment-drip; do
  cp -R "$SRC/app/api/cron/$c" "$DST/app/api/cron/$c"
done
```
Verify: `ls "$DST/app/api" | wc -l` → `58` (56 routes + env-check copy + cron dir); `ls "$DST/app/api/cron" | wc -l` → `5`.

- [ ] **Step 3: Copy business lib/, templates, scripts, assets**

```bash
LIBS=(admin-roles.js admin-users.js buildRecipientList.js businessCard.js businessCard.test.mjs enrichItemSizes.js get-current-admin.js invoiceId.js invoiceImage.js news onStockRise.js po-email-template.js renderCompoundEmail.js renderRecruitmentEmail.js reorderDuration.js reorderDuration.test.mjs requireAdmin.js requireAdminOrCron.js revenue.js rewardsAnnounce.js supabase.js unsubToken.js)
for l in "${LIBS[@]}"; do cp -R "$SRC/lib/$l" "$DST/lib/$l"; done
cp "$SRC/lib/constants/peptides.js" "$DST/lib/constants/peptides.js"  # reorderDuration imports it (Task 4 verdict)
# theme.js NOT copied — zero importers anywhere (dead v1 code; Task 4 verdict)

cp -R "$SRC/templates/email"        "$DST/templates/email"
cp -R "$SRC/templates/social"       "$DST/templates/social"
for s in import-recruitment-csv.js migrate-content-calendar-2026-05-29.js render-social-posts.js send-recruitment-drip.js smoke-ambassador-flow.js smoke-compound-email.js smoke-recruitment-drip.js sync-compound-marketing.js; do
  cp "$SRC/scripts/$s" "$DST/scripts/"
done
cp -R "$SRC/public/social-images"   "$DST/public/social-images"
mkdir -p "$ADV/sql"
for q in 2026-04-23-invoice-columns 2026-04-23-support-tickets 2026-04-27-invoice-paid-amount 2026-04-27-reorder-reminders 2026-04-29-news-candidate-flag 2026-04-29-news-carousel 2026-05-06-inventory-adjustments 2026-05-28-ambassador-recruitment-blast 2026-05-28-compound-email-campaigns; do
  cp "$SRC/sql/$q.sql" "$ADV/sql/"
done
```

- [ ] **Step 4: Copy business docs to repo level**

```bash
mkdir -p "$ADV/docs"
for d in ambassadors brand clients marketing pricing vendors; do cp -R "$SRC/docs/$d" "$ADV/docs/$d"; done
cp "$SRC/docs/daily-vial-content-strategy.md" "$SRC/docs/SESSION-HANDOFF-recruitment-drip.md" "$ADV/docs/"
```

- [ ] **Step 5: Fix the one hardcoded adonis.pro URL in the copy**

```bash
grep -rn "adonis.pro/admin/orders" "$DST"
```
Edit that file (expected: one email-template/lib hit): replace `https://adonis.pro/admin/orders` with `https://admin.advncelabs.com/admin/orders` (no BASE_URL env var exists — see worklog correction). Re-run the grep → no matches in `$DST`.

- [ ] **Step 6: Commit the copy** ⛔ STOP — approval

```bash
cd "$ADV" && git add -A admin/ docs/ && git commit -m "feat(admin): copy ADVNCE back office from adonis-next (55 routes, 5 crons, lib, docs)

Copy phase of the repo split — adonis-next untouched until verified.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

### Task 9: Local build + read-mostly smoke test

- [ ] **Step 1: Install + build**

```bash
cd "/Volumes/(626)806-4475/Ai Projects/advncelabs/admin" && npm install && npm run build
```
Expected: build succeeds. If "Cannot resolve module": a lib file was missed — find it (`grep -rn "from.*lib/<name>"`), add to copy list + worklog, re-run.

- [ ] **Step 2: Run unit tests**

Run: `npm test`
Expected: businessCard + reorderDuration tests pass.

- [ ] **Step 3: Env for local dev** — create `admin/.env.local` (gitignored) by copying from adonis-next's `.env.local` every var the worklog table marks YES: the Supabase five (URL/ANON + SERVICE_KEY/SERVICE_ROLE_KEY/SUPABASE_URL), `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `VA_PASSWORD`, `RESEND_API_KEY`, `STRIPE_SECRET_KEY`, `ANTHROPIC_API_KEY`, `CRON_SECRET`, `SHIPPING_ADDRESS`, `EMAIL_UNSUB_SECRET`, `ADVNCE_ORIGIN`.

- [ ] **Step 4: Read-mostly smoke (LIVE DB — look, don't touch)**

Run: `npm run dev` → open `http://localhost:3100` (expect redirect to `/admin` → login). Log in, then load each section and confirm real data renders, **no writes**: `/admin/inventory`, `/admin/invoices`, `/admin/orders`, `/admin/purchases`, `/admin/vendors`, `/admin/pre-sell`, `/admin/pricing`, `/admin/marketing`, `/admin/marketing/ambassadors`, `/admin/distributors`, `/admin/cards`, `/admin/support-tickets`, `/admin/visitors`, `/admin/discount-codes`, plus `/ambassadors/apply` and `/ambassador/invoices`.
Expected: every page renders with live data; console free of module errors. Record per-page ✓ in worklog.

**Phase 1 gate:** admin builds, tests pass, all 16 surfaces render locally.

---

# Phase 2 — Parallel-run on Vercel · Session 2

### Task 10: Create the `advnce-admin` Vercel project

- [ ] **Step 1: Create project** ⛔ STOP — approval. Vercel dashboard → Add New → Project → import `jorrelpatterson/advncelabs` → **Project Name:** `advnce-admin` → **Root Directory:** `admin` → Framework: Next.js → do NOT add domains yet → Deploy.

- [ ] **Step 2: Add env vars** (dashboard → advnce-admin → Settings → Environment Variables, Production+Preview): every var the worklog table marks YES (no BASE_URL var — worklog correction). Cross-check names against the adonis project's dashboard list while there.

- [ ] **Step 3: Redeploy** (so env vars apply): Deployments → ⋯ → Redeploy.
Expected: green build; note the `advnce-admin-*.vercel.app` URL in the worklog.

### Task 11: Verify the deployed admin (read-mostly)

- [ ] **Step 1: Auth works**: open `https://advnce-admin-<hash>.vercel.app` → redirects to `/admin` → login page; log in with `ADMIN_PASSWORD`.
- [ ] **Step 2: Repeat the 16-surface checklist from Task 9 Step 4** on the deployment. Record ✓ per page in worklog.
- [ ] **Step 3: One sanctioned write test**: open `/admin/support-tickets`, add one note/ticket marked "migration test", confirm it appears (and shows in the OLD admin at adonis.pro/admin/support-tickets too — same DB, proving parity). Delete it from either UI.
- [ ] **Step 4: Cron endpoints refuse unauthenticated calls**: `curl -s -o /dev/null -w "%{http_code}" https://advnce-admin-<hash>.vercel.app/api/cron/reorder-reminders` → `401` or `403` (requireAdminOrCron). Crons are NOT scheduled yet — this just proves the handlers deployed.

**Phase 2 gate:** all 16 surfaces verified on Vercel + write test round-tripped. The old admin is still primary.

---

# Phase 3 — Cutover · Session 3 (one sitting)

### Task 12: Crons OFF in adonis-next (remove-old-first)

**Files:** Modify: `vercel.json` (adonis-next)

- [ ] **Step 1: Rewrite `vercel.json` to exactly** (note: news-scrape/news-curate power the ADVNCE vial-content engine — they MOVE; only the two Adonis crons remain):

```json
{
  "rewrites": [
    { "source": "/", "destination": "/index.html" },
    { "source": "/app", "destination": "/app/index.html" }
  ],
  "crons": [
    { "path": "/api/cron/career/ingest", "schedule": "0 14 * * *" },
    { "path": "/api/cron/routine-reminders", "schedule": "0 16 * * *" }
  ]
}
```

- [ ] **Step 2: Commit + push** ⛔ STOP — approval (deploys adonis.pro)

```bash
cd "/Volumes/(626)806-4475/Ai Projects/adonis-next"
git add vercel.json && git commit -m "chore(split): remove ADVNCE crons ahead of admin cutover (double-fire guard)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>" && git push origin main
```

- [ ] **Step 3: Confirm gone**: Vercel dashboard → adonis project → Settings → Cron Jobs → only `career/ingest` + `routine-reminders` listed.

### Task 13: Crons ON in advnce-admin

**Files:** Create: `admin/vercel.json` (advncelabs repo)

- [ ] **Step 1: Write `admin/vercel.json`:**

```json
{
  "crons": [
    { "path": "/api/cron/welcome-emails", "schedule": "0 17 * * *" },
    { "path": "/api/cron/reorder-reminders", "schedule": "0 12 * * *" },
    { "path": "/api/cron/news-scrape", "schedule": "0 11 * * *" },
    { "path": "/api/cron/news-curate", "schedule": "0 4 * * 1" },
    { "path": "/api/cron/recruitment-drip", "schedule": "0 * * * *" }
  ]
}
```

- [ ] **Step 2: Commit + push** ⛔ STOP — approval

```bash
cd "/Volumes/(626)806-4475/Ai Projects/advncelabs"
git add admin/vercel.json && git commit -m "feat(admin): enable the 5 ADVNCE crons (cutover — removed from adonis first)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>" && git push origin main
```

- [ ] **Step 3: Confirm registered**: dashboard → advnce-admin → Settings → Cron Jobs → the 5 listed. Next day: each fired once (Logs), and adonis logs show NO firings of the moved five.

### Task 14: Domains

- [ ] **Step 1: admin.advncelabs.com** ⛔ STOP — approval. Dashboard → advnce-admin → Settings → Domains → add `admin.advncelabs.com` (DNS is Vercel-managed via the advncelabs.com apex — auto-configures).
Verify: `curl -s -o /dev/null -w "%{http_code}" https://admin.advncelabs.com/admin/login` → `200`.

- [ ] **Step 2: Move join.advncelabs.com** ⛔ STOP — approval. Dashboard → adonis project → Settings → Domains → remove `join.advncelabs.com`; then advnce-admin → Domains → add it.
Verify: `curl -s -o /dev/null -w "%{http_code}" https://join.advncelabs.com` → `200`; recruitment landing renders. Send one test click on a recruitment tracking link (from the drip's sent-mail archive) → resolves.

### Task 15: Webhook + integration audit

- [ ] **Step 1: Stripe** — dashboard.stripe.com → Developers → Webhooks. Expected: no endpoint targets adonis.pro (the old `/api/stripe` route no longer exists). If one exists → update URL to the admin domain equivalent; record in worklog.
- [ ] **Step 2: Resend** — resend.com dashboard → Webhooks/Domains. Sending domain (advncelabs.com) is key-based — unaffected. Any webhook pointing at adonis.pro → repoint; record.
- [ ] **Step 3: Team cutover** — Jorrel + VA log in at `https://admin.advncelabs.com/admin/login`, re-bookmark. Confirm VA can reach her sections.

**Phase 3 gate:** domains resolve · 5 crons fired once each in new home (next-day check) · zero firings in old · webhooks audited · both humans logged in.

---

# Phase 4 — Strip adonis-next + permanent redirects · Session 4

### Task 16: Strip the moved trees (single revertable commit)

- [ ] **Step 1: Remove (uses the same canonical lists as Task 8):**

```bash
cd "/Volumes/(626)806-4475/Ai Projects/adonis-next"
git rm -r app/admin app/ambassador app/ambassadors
ROUTES=(admin admin-auth ambassador-apply ambassador-content-digest ambassador-images ambassador-message ambassador-past-customers ambassador-payout ambassador-welcome ambassador-write compound-email-draft-list compound-email-draft-write compound-email-generate compound-email-preview compound-email-resume compound-email-send discount-code-write email-unsub inventory inventory-adjust inventory-adjustments inventory-loss-stats invoice-get invoice-list invoice-stats invoice-transition invoice-write jorrel-os me notify notify-customer order-customer-update order-status orders orders-list past-customers payment-reminder place-order presell-cancel presell-po-placed presell-queue product-write purchase-receive purchase-write recruitment-application-write recruitment-click rewards-announce shipping-confirm social-image-proxy social-post-write subscribe-welcome-2 subscribe-welcome-3 subscribers-admin support-tickets vendor-prices-write vendor-write)
for r in "${ROUTES[@]}"; do git rm -r "app/api/$r"; done
for c in welcome-emails reorder-reminders news-scrape news-curate recruitment-drip; do git rm -r "app/api/cron/$c"; done
git rm middleware.js
git rm -r lib/admin-roles.js lib/admin-users.js lib/buildRecipientList.js lib/businessCard.js lib/businessCard.test.mjs lib/enrichItemSizes.js lib/get-current-admin.js lib/invoiceId.js lib/invoiceImage.js lib/news lib/onStockRise.js lib/po-email-template.js lib/renderCompoundEmail.js lib/renderRecruitmentEmail.js lib/reorderDuration.js lib/reorderDuration.test.mjs lib/requireAdmin.js lib/requireAdminOrCron.js lib/revenue.js lib/rewardsAnnounce.js lib/unsubToken.js
git rm -r templates public/social-images lib/constants/peptides.js
for s in import-recruitment-csv.js migrate-content-calendar-2026-05-29.js render-social-posts.js send-recruitment-drip.js smoke-ambassador-flow.js smoke-compound-email.js smoke-recruitment-drip.js sync-compound-marketing.js; do git rm "scripts/$s"; done
for q in 2026-04-23-invoice-columns 2026-04-23-support-tickets 2026-04-27-invoice-paid-amount 2026-04-27-reorder-reminders 2026-04-29-news-candidate-flag 2026-04-29-news-carousel 2026-05-06-inventory-adjustments 2026-05-28-ambassador-recruitment-blast 2026-05-28-compound-email-campaigns; do git rm "sql/$q.sql"; done
for d in ambassadors brand clients marketing pricing vendors; do git rm -r "docs/$d"; done
git rm docs/daily-vial-content-strategy.md docs/SESSION-HANDOFF-recruitment-drip.md
# plus any Task 4 Step 3 additions (from worklog)
```
Note: `lib/supabase.js`, `lib/constants/*` stay (still used by the app). `middleware.js` goes entirely — admin auth was its only job (marketing-move redirects die with the admin).

- [ ] **Step 2: Do NOT commit yet** — Task 17 (redirects) and Task 18 (deps) join this same commit so adonis.pro never deploys stripped-without-redirects.

### Task 17: Permanent redirects in adonis-next

**Files:** Modify: `next.config.js` (adonis-next)

- [ ] **Step 1: Remove the `outputFileTracingIncludes` block** (recruitment-drip is gone) and **append to the existing `redirects()` return array** (keep all current entries):

```js
const ADMIN_HOST = 'https://admin.advncelabs.com';

const MOVED_PAGE_TREES = ['/admin', '/ambassador', '/ambassadors'];

const MOVED_API_ROUTES = [
  'admin', 'admin-auth', 'ambassador-apply', 'ambassador-content-digest',
  'ambassador-images', 'ambassador-message', 'ambassador-past-customers',
  'ambassador-payout', 'ambassador-welcome', 'ambassador-write',
  'compound-email-draft-list', 'compound-email-draft-write', 'compound-email-generate',
  'compound-email-preview', 'compound-email-resume', 'compound-email-send',
  'discount-code-write', 'email-unsub', 'inventory', 'inventory-adjust',
  'inventory-adjustments', 'inventory-loss-stats', 'invoice-get', 'invoice-list',
  'invoice-stats', 'invoice-transition', 'invoice-write', 'jorrel-os', 'me',
  'notify', 'notify-customer', 'order-customer-update', 'order-status',
  'orders', 'orders-list', 'past-customers', 'payment-reminder', 'place-order',
  'presell-cancel', 'presell-po-placed', 'presell-queue', 'product-write',
  'purchase-receive', 'purchase-write', 'recruitment-application-write',
  'recruitment-click', 'rewards-announce', 'shipping-confirm',
  'social-image-proxy', 'social-post-write', 'subscribe-welcome-2',
  'subscribe-welcome-3', 'subscribers-admin', 'support-tickets',
  'vendor-prices-write', 'vendor-write',
];

const MOVED_CRONS = ['welcome-emails', 'reorder-reminders', 'news-scrape', 'news-curate', 'recruitment-drip'];

// inside async redirects(), spread AFTER the existing entries:
...MOVED_PAGE_TREES.flatMap((p) => [
  { source: p, destination: `${ADMIN_HOST}${p}`, permanent: true },
  { source: `${p}/:path*`, destination: `${ADMIN_HOST}${p}/:path*`, permanent: true },
]),
...MOVED_API_ROUTES.flatMap((r) => [
  { source: `/api/${r}`, destination: `${ADMIN_HOST}/api/${r}`, permanent: true },
  { source: `/api/${r}/:path*`, destination: `${ADMIN_HOST}/api/${r}/:path*`, permanent: true },
]),
...MOVED_CRONS.map((c) => (
  { source: `/api/cron/${c}`, destination: `${ADMIN_HOST}/api/cron/${c}`, permanent: true }
)),
```
(`permanent: true` → 308: method + body preserved, so POSTing links in old emails still work. These redirects stay forever.)

### Task 18: Prune deps, verify, ship the strip

- [ ] **Step 1: Prove each dep is now unused, then remove**

```bash
cd "/Volumes/(626)806-4475/Ai Projects/adonis-next"
for p in "@anthropic-ai/sdk" archiver qrcode rss-parser sharp "stripe" "@stripe/stripe-js"; do
  echo "== $p"; grep -rln "$p" app lib src scripts middleware.js 2>/dev/null | grep -v node_modules;
done
```
Expected: no hits for each (if a hit → that dep STAYS; record in worklog). Then: `npm uninstall @anthropic-ai/sdk archiver qrcode rss-parser sharp stripe @stripe/stripe-js` (minus any keepers).

- [ ] **Step 2: Full verification**

```bash
npm run build && npm test
```
Expected: vite + next build green; full vitest suite passes (~1000 tests).

- [ ] **Step 3: Commit + push** ⛔ STOP — show full `git status`/diffstat, get approval (this is THE strip commit; deploys adonis.pro)

```bash
git add -A && git commit -m "feat(split)!: extract ADVNCE back office to advncelabs repo

Removes admin UI, 56 business API routes, 5 crons, business lib/scripts/sql/docs.
Permanent 308 redirects cover every moved path (old bookmarks + all
links in previously-sent emails keep working). Fitness product only now.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>" && git push origin main
```

- [ ] **Step 4: Spot-check redirects + product**

```bash
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" https://adonis.pro/admin/inventory
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" https://adonis.pro/ambassador/invoices/new
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" https://adonis.pro/api/email-unsub?token=test
curl -s -o /dev/null -w "%{http_code}\n" https://adonis.pro/app
```
Expected: first three → `308 https://admin.advncelabs.com/...` (same path+query); `/app` → `200`. Open the PWA and confirm signup/push still fine (they call only `app-signup`/`push`, which stayed — iOS build unaffected, no App Store release needed).

### Task 19: Update the 4 storefront links

**Files:** Modify: the advncelabs storefront HTML files containing adonis.pro links

- [ ] **Step 1: Locate**: `cd "/Volumes/(626)806-4475/Ai Projects/advncelabs" && grep -rln "adonis.pro" --include="*.html" --include="*.js" . | grep -v node_modules | grep -v "^./admin"`
- [ ] **Step 2: Apply this exact mapping in each hit:**

| old | new |
|---|---|
| `https://adonis.pro/ambassador/invoices/new` | `https://admin.advncelabs.com/ambassador/invoices/new` |
| `https://adonis.pro/admin/support-tickets` | `https://admin.advncelabs.com/admin/support-tickets` |
| `https://adonis.pro/admin/marketing/ambassadors` | `https://admin.advncelabs.com/admin/marketing/ambassadors` |
| `https://adonis.pro/admin/distributors` | `https://admin.advncelabs.com/admin/distributors` |
| any bare `adonis.pro` remaining | judge: product mention of the fitness app → keep; back-office link → admin domain |

- [ ] **Step 3: Commit + push** ⛔ STOP — approval (deploys storefront). Verify each changed page renders and links resolve.

**Phase 4 gate:** adonis-next build+tests green · redirects spot-checked · storefront links updated · PWA/iOS unaffected.

---

# Phase 5 — Context layer · Session 4

### Task 20: Rewrite adonis-next CLAUDE.md + AGENTS.md

**Files:** Modify: `CLAUDE.md`, `AGENTS.md` (adonis-next)

- [ ] **Step 1: Replace CLAUDE.md's stale architecture sections** with (keep the os.jorrel.io dev-requests + "Save everything" blocks verbatim at the bottom):

```markdown
# CLAUDE.md

Guidance for Claude Code in this repository.

## What this repo is

**Adonis** — the fitness product only (v2). The ADVNCE Labs peptide business
lives in the sibling `advncelabs` repo (storefront + back office). If a task
is about inventory, invoices, orders, vendors, ambassadors, recruitment,
compound emails, or the admin portal — wrong repo, go to `../advncelabs`.

## Build & Dev

- `npm run dev` — Next.js dev server (marketing page + API, port 3000)
- `npm run dev:app` — Vite dev server for the PWA (`src/`)
- `npm run build` — vite build (PWA → `public/app/`) + next build
- `npm run build:ios` — iOS bundle (Capacitor)
- `npm test` — vitest suite

## Architecture

- `src/` — the Adonis v2 PWA (vite + vitest). Built into `public/app/`,
  served at adonis.pro/app via vercel.json rewrites.
- `ios/` + Capacitor — native wrapper (camera, push, deep links).
- `app/` — Next.js: marketing page + API routes: `app-signup`, `me`, `push`,
  `cron/routine-reminders`, `cron/career` (career engine), `env-check`.
- `lib/` — appSignup, push/, career/, supabase client, constants
  (exercises, programs, peptides, theme).
- Supabase is SHARED with the ADVNCE business (one project) — migrations
  are manual (SQL editor), never run DDL casually.
- `next.config.js` holds permanent 308 redirects for every path that moved
  to admin.advncelabs.com in the 2026-07 repo split. NEVER remove them —
  links in sent emails depend on them.

## Conventions

- JavaScript/JSX only (no TypeScript); vanilla CSS; React hooks; minimal deps.
```

- [ ] **Step 2: Regenerate AGENTS.md as the same content** (s/Claude Code/Codex/ in the header line).
- [ ] **Step 3: Commit** ⛔ STOP — approval.

### Task 21: Write advncelabs CLAUDE.md + AGENTS.md

**Files:** Create: `CLAUDE.md`, `AGENTS.md` (advncelabs repo root)

- [ ] **Step 1: Write CLAUDE.md:**

```markdown
# CLAUDE.md

Guidance for Claude Code in this repository.

## What this repo is

**ADVNCE Labs** — the peptide company. One repo, two deployables:

- **Storefront** (repo root: `advnce-*.html`, `api/`, `kb/`, `chatbot/`) —
  static HTML + bare Vercel functions → Vercel project `advnce-site` →
  advncelabs.com. Visitor-recovery engine, ADVNCE Rewards, chatbot live here.
- **Back office** (`admin/` — Next.js 14 App Router) → Vercel project
  `advnce-admin`, Root Directory `admin/` → admin.advncelabs.com +
  join.advncelabs.com. Inventory, invoices, orders, POs, vendors, pre-sell,
  pricing, ambassadors, recruitment drip, compound emails, support tickets.
  The 5 business crons live in `admin/vercel.json`.
- `docs/` — business docs (vendors, pricing, clients, marketing, brand).

The Adonis fitness app is a SEPARATE product in `../adonis-next` (adonis.pro).
adonis.pro permanently 308-redirects all legacy /admin, /ambassador(s), and
moved /api paths here — never rely on those old URLs in new code.

## Build & Dev

- Storefront: static — open the HTML, or `vercel dev` at repo root.
- Back office: `cd admin && npm run dev` (port 3100); `npm run build`; `npm test`.

## Data & Auth

- Supabase is SHARED with adonis-next (one project). Migrations are manual
  (SQL editor); data via PostgREST + service key.
- Admin auth: cookie-based (`adonis_admin_*` cookies, `ADMIN_PASSWORD`) via
  `admin/middleware.js`. KNOWN GAPS (fast-follow): cookies unsigned; VA role
  path-allowlist prefix hole in `admin/lib/admin-roles.js`.
- Emails: Resend via raw fetch. Link hosts: hardcoded advncelabs.com
  (storefront pages) + `ADVNCE_ORIGIN` for recruitment (join.advncelabs.com).

## Conventions

- Back office: JavaScript/JSX only, vanilla CSS, React hooks, minimal deps.
- Storefront: hand-maintained static pages; loyalty config in `api/_lib/loyalty.js`.
```

- [ ] **Step 2: AGENTS.md** = same content, Codex header. Add the "Save everything" block pointing at `project_id: advncelabs` once Task 22 registers it.
- [ ] **Step 3: Commit + push** ⛔ STOP — approval.

### Task 22: Split the jorrel-os cards

**Files:** Modify: `jorrel-os.json` (adonis-next, MERGE-ONLY keys); Create: `jorrel-os.json` (advncelabs)

- [ ] **Step 1: Create `advncelabs/jorrel-os.json`**: copy adonis-next's file as the template, then set `id`/`name` to `advncelabs` / "ADVNCE Labs", keep `type`/`owner`/`status`, set `urls` to the three advnce domains, and under `current` keep ONLY the ADVNCE items: every blocker EXCEPT the two prefixed "Adonis v2:", the back-office half of `next_action`, ADVNCE-relevant `roadmap_ideas`/`setup` entries. Set `current.last_session` to the execution date.
- [ ] **Step 2: Trim adonis-next's `jorrel-os.json`** (MERGE-ONLY keys): `current.blockers` → keep only the two "Adonis v2:" items; `current.next_action` → keep only the Adonis v2 sentence; leave every other key untouched.
- [ ] **Step 3: Register the new card on os.jorrel.io**: check `../jorrel-os` repo for the project-registration procedure (projects likely enumerate from a config or the report API auto-creates). Then:

```bash
curl -X POST https://os.jorrel.io/api/report -H "Authorization: Bearer $CRON_SECRET" -H "Content-Type: application/json" \
  -d '{"project_id":"advncelabs","next_action":"post-split: fix unsigned admin cookies + VA allowlist hole","blockers":[],"completed":["ADVNCE back office extracted to advncelabs repo + admin.advncelabs.com"]}'
```
(`$CRON_SECRET` from `../jorrel-os/.env.local`.) Expected: 200; card visible on os.jorrel.io. If the API rejects unknown project_id → add the project in the jorrel-os repo first (follow its README), then re-run.
- [ ] **Step 4: Commit both files** ⛔ STOP — approval (one commit per repo).

### Task 23: Split Claude Code project memory

**Files:** memory dirs under `/Users/jorrelpatterson/.claude/projects/`: `-Volumes--626-806-4475-Ai-Projects-adonis-next/memory/` and `-Volumes--626-806-4475-Ai-Projects-advncelabs/memory/`

- [ ] **Step 1: Move these memory files** (copy to advncelabs memory, then delete from adonis-next memory, updating each MEMORY.md index): `wholesale_program_model.md`, `recruitment_advnce_origin.md`, `recruitment_launch_parked.md`, `compound_email_restock_mapping.md`, `advnce_rewards_program.md`, `visitor_recovery_portable_prompt.md`, `swag_store_build.md`, `ambassador_business_cards.md`, `advnce_labs_brand_palettes.md`, `meridian_peptides_client_build.md`, `advnce_site_repo.md` (rewrite: repo is now `advncelabs`, site at root + `admin/`).
- [ ] **Step 2: Keep in adonis-next memory**: `adonis_v2_rebuild_state.md`, `session_handoff_workflow.md` (copy to both), `supabase_migrations_manual.md` (copy to both — shared DB), `dual_brand_split.md` (rewrite: split is now physical; adonis.pro = this repo, everything ADVNCE = ../advncelabs).
- [ ] **Step 3: Verify**: fresh `claude` session in each repo → MEMORY.md shows only that business (+ the two shared facts).

**Phase 5 gate / DONE:** fresh session in each repo sees a single business · os.jorrel.io shows two accurate cards · plan checkboxes all ticked.

---

## Appendix — OPTIONAL final tidy (separate approval, any time later)

Storefront files → `advncelabs/site/`: `git mv` the storefront files (all `advnce-*.html`, `index.html`, `api/`, `kb/`, `chatbot/`, `brand-kit/`, `social-images/`, `sql/`, `scripts/`, `test/`, `mobile.css`, `track.js`, `favicon.svg`, `og-image.jpg`, `vercel.json`, storefront `package.json`, misc HTML) into `site/`, commit, then dashboard → advnce-site project → Settings → Root Directory → `site` → redeploy → verify advncelabs.com `200` + spot-check pages. Instantly reversible (revert commit + clear Root Directory). Do NOT batch this with anything else.

## Rollback map

- Phase 1–2: delete `admin/` dir / Vercel project — prod never touched.
- Phase 3: re-add crons to adonis vercel.json + push; re-point domains back (minutes).
- Phase 4: `git revert` the strip commit + push; redirects vanish with it.
- Phase 5: docs/memory only — git revert / restore from the pre-split zips.
