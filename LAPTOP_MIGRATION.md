# Adonis Protocol OS — Laptop Migration Guide

**Last updated:** 2026-05-06

You're reading this because you want to set up `adonis-next` on a new laptop. Follow this guide top to bottom — should take ~30 minutes.

---

## What this project is

- **Adonis Protocol OS** (v3.0.0) — fitness tracking + e-commerce platform
- Next.js 14 (App Router) + Supabase + Stripe + Resend
- Deployed on **Vercel**
- JavaScript/JSX only (no TypeScript), vanilla CSS, minimal dependencies by design
- Project root: `/Volumes/(626)806-4475/Ai Projects/adonis-next/`
- This repo also powers the **advnce labs** admin dashboard (the e-commerce side of the dual-brand setup; advnce labs is the storefront/sales arm and Adonis is the fitness app/SaaS arm)

### What's inside

- `app/` — Next.js App Router pages + API routes (`app/api/`)
- `app/admin/` — React admin dashboard (inventory, orders, pricing, ambassadors, distributors, marketing, support tickets)
- `public/app.html` — ~1.1 MB self-contained PWA (the v1 fitness tracking UI; this is the live app at adonis.pro)
- `lib/` — `supabase.js` client, constants (theme, peptides), helpers
- `src/` — v2 modular rewrite (built but DISCONNECTED — no auth/Stripe/Supabase wired yet; v1 stays live until v2 is verified)
- `data/` — static data files
- `exercises.js` — 112+ exercises with instructions
- `programs.js` — 16-week training program
- `middleware.js` — admin cookie auth + marketing URL redirects
- `sql/` — raw SQL migrations applied manually in Supabase SQL editor (dated `YYYY-MM-DD-*.sql`)
- `supabase/migrations/` — earlier batch of `.sql` migrations (Apr 17–23, 2026)
- `scripts/` — `render-social-posts.js` (Satori IG carousel), `smoke-ambassador-flow.js` (e2e test)
- `templates/social/` — HTML templates for IG post rendering
- `vercel.json` — 4 cron jobs (welcome emails, reorder reminders, news scrape, news curate)

---

## Two ways to get the project on your laptop

### Option A — Plug in the external drive (fastest)

The `(626)806-4475` drive is APFS, works on any Mac. Plug it in, project lives at:
```
/Volumes/(626)806-4475/Ai Projects/adonis-next/
```

Skip ahead to **"Copy the gitignored files"** below.

### Option B — Clone from GitHub

The git remote IS already set up:
```
origin → https://github.com/jorrelpatterson/adonis-next.git
```

On your laptop:
```bash
gh auth login   # if not already authenticated
gh repo clone jorrelpatterson/adonis-next
cd adonis-next
```

Then continue below. **Gitignored files (`.env.local`) are NOT in GitHub — copy them manually from the drive.**

---

## Prerequisites on the laptop

### 1. Install Node.js (version 20)

```bash
# If you have Homebrew:
brew install node@20

# Verify
node --version   # should show v20.x.x
npm --version
```

If no Homebrew, install from https://nodejs.org (pick LTS 20.x).

### 2. Install Git

```bash
git --version   # already installed on most Macs
# If missing: brew install git OR install Xcode Command Line Tools (xcode-select --install)
```

### 3. Install GitHub CLI

```bash
brew install gh
gh auth login   # follow prompts to authenticate
```

### 4. Install Vercel CLI (for deploys + env var sync)

```bash
npm install -g vercel
vercel login   # use jorrelpatterson@gmail.com
```

### 5. (Optional) Install Supabase CLI

You usually don't need this — SQL migrations get pasted into the Supabase SQL editor in the browser. But if you want to run `supabase db diff` or local Postgres:
```bash
brew install supabase/tap/supabase
supabase login
```

### 6. Install VS Code or Cursor

Either works. The project was built using VS Code's integrated terminal.

Download: https://code.visualstudio.com/ or https://www.cursor.com/

---

## Copy the gitignored files

These files are NOT in git for security reasons. **Required:** copy from the drive.

### File needed at the project root:

1. **`.env.local`** — All runtime secrets
   - Source: `/Volumes/(626)806-4475/Ai Projects/adonis-next/.env.local` on the original drive (if it exists there — see note below)
   - **AirDrop or copy via USB to the laptop**

   Expected env vars (per `CLAUDE.md`):
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   STRIPE_SECRET_KEY=sk_live_...
   ADMIN_PASSWORD=...
   RESEND_API_KEY=re_...

   # Likely also present (used by API routes):
   SUPABASE_SERVICE_ROLE_KEY=sb_secret_...   # service-role for admin reads bypassing RLS
   ANTHROPIC_API_KEY=sk-ant-...              # used by the news curator + chatbot
   ADMIN_EMAIL=jorrelpatterson@gmail.com     # strict, no fallback (per session 2026-04-23c)
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

> **Note:** if `.env.local` is missing from the drive, pull it from Vercel:
> ```bash
> cd "/path/to/adonis-next"
> vercel link            # link to the existing Vercel project
> vercel env pull .env.local
> ```
> This downloads every env var from Vercel into a local `.env.local`.

---

## Install dependencies

```bash
cd "/Volumes/(626)806-4475/Ai Projects/adonis-next"   # Option A
# OR
cd ~/path/to/cloned/adonis-next                        # Option B

npm install
```

Lockfile is `package-lock.json` → use **npm** (not pnpm or yarn). Takes ~2-3 minutes.

Dependencies are deliberately minimal: Next 14, React 18, `@supabase/supabase-js`, Stripe (`stripe` + `@stripe/stripe-js`), `@anthropic-ai/sdk` (chatbot + news curator), `archiver`, `rss-parser`, `sharp`. Plus eslint dev deps.

---

## Database / Supabase setup

You don't run a local Postgres. **All database work happens against the live Supabase project** (same one that powers production at adonis.pro and advncelabs.com).

### Run the dashboard against live Supabase

The `.env.local` you copied points at the production Supabase project. `npm run dev` reads/writes that database directly. Be careful with destructive admin actions in dev — they hit live data.

### Applying SQL migrations

When a new `.sql` file lands in `sql/` or `supabase/migrations/`, apply it via the Supabase dashboard:

1. Open https://supabase.com/dashboard → the Adonis/advnce project
2. SQL Editor → New query
3. Paste the contents of the `.sql` file
4. Run

Migrations are dated, e.g.:
- `sql/2026-05-06-inventory-adjustments.sql` (loss/spillage tracking, shipped 2026-05-06)
- `sql/2026-04-29-news-carousel.sql`
- `supabase/migrations/2026-04-23_ambassadors_commissions_rpc.sql`

There is no automated migration runner. Apply them in date order if you ever rebuild the schema from scratch.

### RLS gotcha (critical)

`orders` table blocks anon reads. Any admin code that reads orders **MUST** go through a service-role API route (uses `SUPABASE_SERVICE_ROLE_KEY`). If a new admin page shows empty orders, that's almost always why.

---

## Run the dev server

```bash
npm run dev
```

Open http://localhost:3000

### What you'll see at each route

- `/` → redirected to `/index.html` (storefront landing)
- `/app.html` → the v1 fitness app PWA
- `/admin` → admin dashboard (will redirect to `/admin/login`)
- `/admin/login` → password is `ADMIN_PASSWORD` from `.env.local`
- `/admin/inventory`, `/admin/orders`, `/admin/marketing`, `/admin/support-tickets`, etc.
- `/api/*` → API routes (Stripe, Resend, Supabase CRUD, ambassador comms, news scrape/curate, cron handlers)

### Other scripts

```bash
npm run build    # production build
npm run start    # production server (after build)
npm run lint     # eslint
```

There is **no test framework** configured. The closest thing is `node scripts/smoke-ambassador-flow.js` for the ambassador e2e flow.

---

## Deploying

The repo is connected to Vercel. Pushing to `main` auto-deploys to production.

```bash
git push origin main           # auto-deploy via Vercel git integration
# OR force a deploy from CLI:
vercel --prod
```

Cron jobs in `vercel.json` run on Vercel's scheduler — no setup needed on the laptop.

---

## Common gotchas

### `app.html` is a 1.1 MB minified monolith
This is the v1 fitness UI. Known issues from coding rules:
- **No `ss(...)` calls** — the minifier mangled `setState` references in some spots
- **Integer weights only** — the workout logger expects integers, not floats
- **No template literals in minified JSX** — they break the bundle

The v2 modular rewrite lives in `src/` but is not yet wired to auth/Stripe/Supabase. Don't deploy v2. Read `docs/codebase-audit-2026-04-29` (or whatever the current audit doc is named) before touching v2.

### `npm run dev` writes to live Supabase
There is no separate dev database. Every action in `npm run dev` hits the same Supabase project that powers adonis.pro and advncelabs.com. Test destructive admin actions on disposable rows or branches.

### Drive name has parentheses
Always quote shell paths:
```bash
cd "/Volumes/(626)806-4475/Ai Projects/adonis-next"
```

### `.env.local` not in git
If you skipped Option A and cloned from GitHub, the app will crash on first load with Supabase URL errors. Run `vercel env pull .env.local` (after `vercel link`) to pull every secret down from Vercel.

### Supabase API key format changed
Supabase migrated to `sb_secret_...` / `sb_publishable_...` keys (April 2026). If you see auth errors, the local `.env.local` may have stale `eyJ...` JWT-style keys. Pull fresh from Vercel.

### Branch `claude/interesting-stonebraker` exists locally
A worktree branch from a prior Claude session. `main` is the source of truth — ignore unless you remember why it's there.

### Don't blindly trust the desktop zip of advnce-site
There is a sibling repo `../advnce-site` (the advncelabs.com marketing site). It has its own clone workflow. Edit-push-Vercel-deploy. The Desktop zip of advnce-site is stale per memory.

### Permission denied on `/Volumes/`
If macOS Terminal can't read the drive, give it Full Disk Access:
- System Settings → Privacy & Security → Full Disk Access → add Terminal
- OR use VS Code's integrated terminal (inherits IDE permissions)

---

## Reference: Claude project memory

Claude AI memory files for this project are at:
```
~/.claude/projects/-Volumes-(626)806-4475-AI-Projects-adonis-next-ai-projects--volumes-(626)806-4475-ai-projects-adonis-next/memory/
```

These don't transfer between machines automatically. Copy that whole folder to the same path on the laptop to give the next Claude session the same context (50+ memory entries: codebase audit, RLS traps, vendor pricing, session logs, roadmaps, brand rules, etc.).

If you don't copy memory, Claude still works — it just has to relearn the codebase each session.

---

## Quick reference

| What | Where |
|---|---|
| Project root | `/Volumes/(626)806-4475/Ai Projects/adonis-next/` |
| GitHub repo | https://github.com/jorrelpatterson/adonis-next |
| Production (Adonis app) | https://adonis.pro |
| Production (advnce labs storefront) | https://advncelabs.com |
| Vercel dashboard | https://vercel.com/jorrelpatterson (find the `adonis-next` project) |
| Supabase dashboard | https://supabase.com/dashboard (Adonis/advnce project) |
| Admin login | `/admin/login` (password = `ADMIN_PASSWORD` env var) |
| v1 fitness app | `public/app.html` (served at `/app.html`) |
| v2 rewrite (disconnected) | `src/` |
| SQL migrations (recent) | `sql/` |
| SQL migrations (initial) | `supabase/migrations/` |
| Cron schedules | `vercel.json` |
| Roadmap | `docs/adonis-roadmap.md` (and `advncelabs-roadmap` in memory) |

---

## Required infrastructure accounts (already set up — don't recreate)

- **GitHub:** `jorrelpatterson/adonis-next`
- **Vercel:** project linked, env vars set, cron jobs running
- **Supabase:** single project powering both Adonis and advnce labs
- **Stripe:** live mode, webhook → `/api/stripe`
- **Resend:** transactional email (welcome drip, ambassador comms, news, support)
- **Anthropic:** API key for chatbot + news curator (Sonnet/Haiku)

Authenticate from the laptop with `gh auth login`, `vercel login`, and (optionally) `supabase login`. Don't recreate any accounts.

---

## When you're done setting up

- [ ] `node --version` shows v20.x.x
- [ ] `npm install` succeeded with no errors
- [ ] `.env.local` exists at project root (either copied from drive or pulled with `vercel env pull`)
- [ ] `npm run dev` boots cleanly on http://localhost:3000
- [ ] You can load `/app.html` in the browser (v1 fitness PWA)
- [ ] You can log in to `/admin/login` with the admin password
- [ ] `git remote -v` shows `origin` pointing at `github.com/jorrelpatterson/adonis-next.git`
- [ ] You can read this file from the laptop ✓

If everything checks, you're fully migrated. Push a no-op commit to confirm the Vercel auto-deploy still works:
```bash
git commit --allow-empty -m "chore: laptop migration smoke test"
git push origin main
```

If Vercel builds it green, you're done.
