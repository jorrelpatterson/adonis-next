# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Dev Commands

- `npm run dev` — Start Next.js dev server (port 3000)
- `npm run build` — Production build
- `npm run start` — Production server
- `npm run lint` — ESLint check

No test framework is configured.

## Architecture

**Adonis Protocol OS** (v3.0.0) — A fitness tracking + e-commerce platform built with Next.js 14 App Router, Supabase, Stripe, and Resend. Deployed on Vercel.

### Dual-Stack Frontend

- **React admin dashboard** (`app/admin/`) — Server/client components for inventory, orders, pricing, ambassadors, and distributors management. Protected by cookie-based auth via `middleware.js`.
- **Standalone SPA** (`public/app.html`, ~7600 lines) — The main fitness tracking UI served as a static HTML file. This is a self-contained PWA with its own JS, not a React component.

### API Routes (`app/api/`)

- `admin-auth/` — Cookie-based admin login/logout (password from `ADMIN_PASSWORD` env var)
- `checkout/` — Creates Stripe checkout sessions
- `stripe/` — Stripe webhook handler for payment processing
- `orders/` & `inventory/` — CRUD against Supabase
- `notify/` — Order notification emails via Resend
- `ambassador-welcome/`, `ambassador-message/`, `ambassador-payout/` — Ambassador email templates via Resend

### Data Layer

- **Supabase** — PostgreSQL backend. Client initialized in `lib/supabase.js`.
- **Static data files** — `exercises.js` (112+ exercises with instructions), `programs.js` (16-week training program), `lib/constants/peptides.js`
- **Design tokens** — `lib/constants/theme.js` (dark theme, gold/teal/orange accents, serif fonts)

### Auth Flow

Admin routes protected by `middleware.js` which checks `adonis_admin` cookie. Login at `/admin/login`, all other `/admin/*` routes redirect to login if unauthenticated.

### E-Commerce Flow

Cart in app.html → `/api/checkout` (Stripe session) → Stripe hosted checkout → `/api/stripe` webhook → order saved to Supabase → `/api/notify` sends email via Resend.

## Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase connection
- `STRIPE_SECRET_KEY` — Stripe payments
- `ADMIN_PASSWORD` — Admin panel authentication
- `RESEND_API_KEY` — Email notifications

## Key Conventions

- JavaScript/JSX only (no TypeScript)
- Styling via vanilla CSS (`app/globals.css`) and inline styles — no Tailwind or component library
- React hooks for state management (no external state library)
- Minimal dependencies by design


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
