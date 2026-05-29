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
