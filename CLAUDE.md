# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

**Adonis** — the fitness product only (v2, live at adonis.pro; /app is the front door).
The ADVNCE Labs peptide company lives in the sibling `advncelabs` repo (storefront +
back office). If a task is about inventory, invoices, orders, purchases, vendors,
pre-sell, ambassadors, recruitment, compound/marketing emails, or the admin portal —
wrong repo: go to `../advncelabs` (admin.advncelabs.com).

The two businesses split repos on 2026-07-15 (spec + plan + worklog in
`docs/superpowers/`). They still share one Supabase project by design.

## Build & Dev Commands

- `npm run dev` — Next.js dev server (marketing page + API, port 3000)
- `npm run dev:app` — Vite dev server for the PWA (`src/`)
- `npm run build` — vite build (PWA → `public/app/`) + next build
- `npm run build:ios` — iOS bundle (Capacitor, `vite.config.ios.js`)
- `npm test` — vitest suite (~1189 tests; first run on this volume is slow — cold I/O
  can look like import errors; re-run before believing failures)
- `npm run lint` — ESLint

## Architecture

- `src/` — the Adonis v2 PWA (vite + vitest, happy-dom). Built into `public/app/`,
  served at adonis.pro/app via vercel.json + next.config rewrites.
- `ios/` + Capacitor — native wrapper (camera, push, deep links `adonis://`).
  Signed archive builds; TestFlight upload pending ASC API key (see jorrel-os.json).
- `app/` — Next.js App Router: marketing page + API routes:
  `app-signup`, `push`, `env-check`, `cron/routine-reminders`, `cron/career`
  (career engine — Elite income model, Wave 2).
- `lib/` — appSignup, push/, career/, supabase client, constants
  (exercises, programs, theme, workouts-raw), and the shared auth guards
  `requireAdmin` / `requireAdminOrCron` / `admin-users` (copies also exist in
  advncelabs/admin — keep auth changes in sync or diverge deliberately).
- **Supabase is SHARED with ADVNCE Labs** (one project). Migrations are manual
  (SQL editor; no linked CLI). Never run DDL casually.
- `next.config.js` holds **permanent 308 redirects** for every path that moved to
  admin.advncelabs.com in the split. Links in already-sent emails depend on them.
  **NEVER remove them.**

## Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `VA_PASSWORD` — shared auth guard users
- `CRON_SECRET` — a **Sensitive** Vercel var: reads back blank via API/`env pull`
  but is REAL at runtime, so routine-reminders + career crons authenticate and run
  on schedule (do not mistake the blank read for "empty/manual")
- `APNS_*` — push send path (dormant until ASC key)
- `ADZUNA_APP_ID/KEY`, `RAPIDAPI_KEY` — career ingest sources

## Key Conventions

- JavaScript/JSX only (no TypeScript)
- Vanilla CSS + inline styles — no Tailwind or component library
- React hooks for state; minimal dependencies by design
- Canonical host is `www.adonis.pro` (apex 307s to www)


## os.jorrel.io — approved dev requests

When os.jorrel.io approves engineering work for this project, it lands in this project's
`jorrel-os.json` under `current.dev_requests[]` (written by the local `scripts/dev-requests.ts`
bridge in the jorrel-os repo). Treat any entries there as approved, ready-to-build intake —
each carries a brief and the originating discussion thread. After acting on one, you may clear
it from `current.dev_requests[]` (merge-only).


## "Save everything" — end-of-session

"Save everything" is Jorrel's phrase to wrap a session. It does NOT change your normal
rules — it just makes sure the work is saved and the os.jorrel.io dashboard reflects it.
Three things:

1. **Save your work the normal way.** If a MASTER-BRIEFING.md exists at the "Ai Projects/"
   root, follow it exactly — it governs commits (show diffs, get Jorrel's approval; do NOT
   auto-commit) and says `jorrel-os.json` is MERGE-ONLY. This note never overrides that.
2. **Update this project's `jorrel-os.json` — MERGE-ONLY.** Touch ONLY these keys:
   `current.next_action`, `current.blockers`, `current.completed_today`,
   `current.last_session` (today's date YYYY-MM-DD). Leave every other key exactly as-is —
   this file may have extra keys (`phases`, `setup`, `urls`, etc.); do not touch them, do not
   reshape the file. This file is the durable record.
3. **Refresh the live dashboard card** — this is separate from the file; one call, instant,
   no deploy:

```
curl -X POST https://os.jorrel.io/api/report \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"project_id":"adonis-next","next_action":"<next concrete step>","blockers":["..."],"completed":["what shipped this session"]}'
```

`$CRON_SECRET` is in the jorrel-os repo's `.env.local` (a sibling folder under "Ai Projects/").
Send only the fields that changed. `project_id` MUST be `adonis-next`.

Why both step 2 and step 3: step 2 (the file) is the permanent record; step 3 (the curl) is
what makes the live card update instantly without a deploy. They are not redundant — do both.
