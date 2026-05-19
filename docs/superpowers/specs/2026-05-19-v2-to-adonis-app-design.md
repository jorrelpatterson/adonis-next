# v2 to adonis.pro/app + Capacitor iOS Wrapper — design

**Date:** 2026-05-19
**Status:** approved (brainstorm)
**Owner:** Jorrel
**Successor doc:** implementation plan (to be written next)

## Problem

The Adonis v2 rebuild lives in `src/` as a standalone Vite React app with the
protocol engine, state store, design system, routine pipeline, and a thin
shell (App.jsx + TabNav + RoutineView + GoalSetup). 39 vitest tests pass.

But v2 is not reachable by any URL. The fitness PWA at adonis.pro/ today
serves [public/index.html](../../../public/index.html) (a marketing landing,
878 lines) and [public/app.html](../../../public/app.html) (the v1 monolith,
7,662 lines) — both static HTML files served via vercel.json rewrites.

Two separate build systems (Next.js for admin/APIs, Vite for v2) coexist in
one repo. v2 has the engine but is missing all domain-specific view
components (NutritionView, PeptideView, WorkoutView, etc.). Drafts of these
views exist in `/tmp/adonis-alexandria-recovery/` from a previous laptop
migration, never committed to any tracked branch.

Goal: get a usable v2 to adonis.pro and prep an iOS app, but only for the
protocols Jorrel uses daily (body — workout, peptide, nutrition). Other
domains stay in v1 territory until needed — and since v1 will be retired in
this work, those domains simply pause.

## Goal

Ship a v2 React app at `https://www.adonis.pro/app` with Routine + Goal
Setup + 3 body domain views (Workout, Peptide, Nutrition) + CheckIn +
Onboarding, all running client-side with localStorage persistence. Wrap the
production web build in a Capacitor iOS shell so Jorrel can install it on
his phone via Xcode/TestFlight (deferred). Retire the v1 PWA monolith.

## Non-goals (v1)

- Cloud sync / auth / multi-device data — local-only, single device. Deferred
  to a later spec when Jorrel actually needs cross-device or backup.
- Non-body domain views (Mind, Purpose, Image, Credit, Income, Citizenship,
  Environment, Community). Goal Setup offers these as "Coming soon"
  disabled options; selecting them is blocked.
- Android support. iOS only. Capacitor makes adding Android later trivial.
- Offline mode / static export. Capacitor v1 uses `server.url` to load from
  the live production URL, requiring internet. A later spec adds static
  export + service worker for offline if needed.
- Push notifications, in-app purchases, biometric auth, App Store
  distribution, TestFlight setup. Those are post-launch concerns.
- Migrating the 39 vitest tests to jest or any other framework. Vitest stays.

## Locked product decisions

| # | Decision | Choice |
|---|----------|--------|
| 1 | Scope at launch | Body-first: Routine view, Goal Setup (body domains only), Workout/Peptide/Nutrition views, CheckIn, Onboarding. Non-body tabs hidden until corresponding goals exist. |
| 2 | iOS target | Capacitor wraps the live production web app via `server.url`. iOS only. No Android. |
| 3 | Data model | Local-only (localStorage on web, localStorage in Capacitor WebView on iOS). No auth, no login, no sync. v2's existing `src/state/store.jsx` + `lib/state-storage.js` handles this. |
| 4 | Landing page | `public/index.html` at `/` stays untouched. New v2 lives at `/app`. Admin at `/admin/*` untouched. |
| 5 | v1 retirement | `public/app.html` and its dependencies (`public/lib/exercises.js`, `public/lib/programs.js`) deleted at migration time. Body-first means body-only; Mind/Purpose/etc. tracking pauses until v2 lifts those views. |
| 6 | Route placement | `app/app/...` (Next.js App Router convention). Renders at `/app`. Layout file mounts the v2 state provider and tab nav. All pages `'use client'`. |
| 7 | Source organization | Keep `src/` as-is — engine modules import from `'../../../src/...'`. Reduces file churn vs moving everything into `app/app/_lib/`. |
| 8 | Views to lift | Cherry-pick 5 specific files (3 domain views + CheckIn + Onboarding) from `/tmp/adonis-alexandria-recovery/`. One commit per file. If any is broken, rebuild from `public/app.html` reference rather than ship broken. |
| 9 | Build unification | Drop `vite.config.js` and Vite-related npm scripts (`dev:app`, `build:app`, `preview`). Single build = `next build`. |
| 10 | Test framework | Vitest stays. 39 existing tests don't need to migrate. Vitest runs cleanly alongside Next.js. |
| 11 | Capacitor bundle ID | `pro.adonis.app`. App name: `Adonis`. |

## Architecture

### Web (Next.js)

**New routes:**

- `app/app/layout.jsx` — wraps `/app/*` only. Mounts `StateProvider` from
  `src/state/store.jsx`. Calls `runMigrationIfNeeded()` on mount. Registers
  all protocols (`import '../../src/protocols/register-all'`). Renders a
  layout shell that holds the children + the bottom TabNav. iOS-friendly
  viewport meta tags (safe area, no-zoom inputs).

- `app/app/page.jsx` — default route at `/app`. Renders the routine view
  (today's tasks) via the existing `RoutineView` component from
  `src/routine/`. Includes the access-code gate currently in `App.jsx`.

- `app/app/workout/page.jsx` — renders `<WorkoutView />` (lifted from
  recovery).

- `app/app/peptide/page.jsx` — renders `<PeptideView />` (lifted from
  recovery, includes its internal tab structure for injection/research/etc).

- `app/app/nutrition/page.jsx` — renders `<NutritionView />` (lifted from
  recovery).

- `app/app/goal-setup/page.jsx` — renders the existing `GoalSetup` flow.
  Non-body domains shown but disabled with "Coming soon" label.

- `app/app/onboarding/page.jsx` — renders `<Onboarding />` (lifted from
  recovery, 4 files).

The existing `src/app/App.jsx` orchestrator becomes obsolete — its tab
switching logic moves to Next.js route navigation. We delete `src/app/App.jsx`
and `src/app/TabNav.jsx` after porting the equivalent UI into Next.js
layout + a new client-side TabNav that uses `next/navigation`.

**Routing:**

- Tab nav rendered in `app/app/layout.jsx` uses `Link` from `next/link`.
  Active state from `usePathname()`.
- TabNav only shows tabs the user has goals in (Routine + active body
  domains + Profile). Identical logic to the existing `TabNav.jsx` `domains`
  prop, computed from state.

### Capacitor (iOS)

**Install:** `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios` as dev
dependencies. Run `npx cap init Adonis pro.adonis.app` once.

**Config (`capacitor.config.ts`):**
```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'pro.adonis.app',
  appName: 'Adonis',
  webDir: 'public', // placeholder; not used in server-url mode
  server: {
    url: 'https://www.adonis.pro/app',
    cleartext: false,
  },
};

export default config;
```

The `webDir` is required by Capacitor's config schema even when
`server.url` is set — Capacitor loads the live production app over HTTPS
and ignores `webDir` contents. Pointing it at `public` (which exists)
satisfies the validator without creating a misleading directory.

**iOS project:**
- `npx cap add ios` creates `ios/` directory (gitignored except the config).
- `npx cap open ios` opens Xcode. Jorrel sets signing team, bundle ID,
  app icon, splash screen there.
- Jorrel builds to his phone via Xcode for now. TestFlight is a later spec.

**Tradeoff acknowledged:** With `server.url`, the iOS app requires internet
to function. If Jorrel goes offline, the app shows a network error. This is
acceptable for v1 (single user, generally online). A future spec adds static
export + service worker for offline.

### Build & deploy

**Removed:**
- `vite.config.js`
- `src/main.jsx` (Vite entry, replaced by Next.js routes)
- npm scripts: `dev:app`, `build:app`, `preview`
- `public/app.html`, `public/lib/exercises.js`, `public/lib/programs.js`

**Kept:**
- `npm run dev` — Next.js dev server (port 3000). Visit `/app` for v2.
- `npm run build` — `next build` produces the full deployment.
- `npm run lint` — `next lint`.
- `npm run test` — `vitest run`. 39 tests still pass.

**Added:**
- `cap:sync` — `npm run build && npx cap sync ios`. Syncs config to Xcode.
- `cap:ios` — `npx cap open ios`. Opens Xcode.

**vercel.json:**
- Confirm the existing `{ "source": "/", "destination": "/index.html" }`
  rewrite still works after `public/app.html` removal. It should — that
  rewrite serves `public/index.html` (landing), which we're not touching.
- No new entries needed. Cron block unchanged.

**Manifest (`public/manifest.json`):**
- Read the file at implementation time. Update `start_url` to `/app` and
  `scope` to `/app`. Theme colors and icon paths stay as-is (existing
  `/icon.svg` + `/icon-maskable.svg` work for both v1 and v2).
- This update only matters for browser "Add to Home Screen" users. The
  Capacitor iOS app uses native icons/splash configured in Xcode, not
  the web manifest.

## Data flow

**First visit to `/app`:**
1. User visits `https://www.adonis.pro/app`
2. `app/app/layout.jsx` mounts → `StateProvider` initializes from
   localStorage. If empty, defaults from `src/state/defaults.js`.
3. `runMigrationIfNeeded()` runs (handles v1 → v2 schema, no-op on fresh
   install).
4. If `state.onboardingComplete === false`, redirect to `/app/onboarding`.
5. Otherwise, render `RoutineView` for today.

**Adding a goal:**
1. User taps a tab they don't have → "Set up this protocol" CTA
2. Routes to `/app/goal-setup?domain=<body>`
3. `GoalSetup` shows body domain options. Non-body options disabled with
   "Coming soon".
4. User completes setup → goal added to state → routes back to `/app`.
5. TabNav now shows the new domain tab.

**Daily routine:**
1. `/app` (default route) renders `RoutineView`
2. `buildDailyRoutine` from `src/routine/pipeline.js` computes today's tasks
   from goals + protocol state + logs
3. User taps a task → logs completion → state updated → localStorage
   persisted by `StateProvider`.

**Domain drill-in:**
1. User taps tab (e.g. Peptide) → routes to `/app/peptide`
2. `PeptideView` reads relevant state + protocol catalog
3. User logs injection / views research / etc.
4. State updated, persisted.

## Error handling

- **Capacitor loses internet:** native error screen from WebView. v1
  acceptable behavior. Spec for offline mode is separate.
- **localStorage quota exceeded:** state writes silently fail. Not addressed
  in v1; impact is minor (would need GBs of data).
- **Broken recovery view at lift time:** a view is "broken" if it imports
  modules that don't exist in v2, calls APIs that don't exist, has syntax
  errors, or relies on v1 globals (`window.React`, CDN-loaded supabase,
  etc.). In those cases, rebuild the view from the v1 reference in
  `public/app.html` instead of trying to fix the recovery draft.
- **State migration failure on first load:** `runMigrationIfNeeded` already
  has error handling — fallback to defaults. Existing v2 behavior preserved.

## Testing

39 vitest tests in `src/**/__tests__/*` continue to pass — they cover the
engine (protocols, routine pipeline, goal engine, state store, design
constants). No new automated tests required for the migration.

Manual verification checklist (post-implementation, Jorrel walks through):

1. `/admin/*` works (admin login + dashboard + sub-pages)
2. `/` shows the landing page exactly as before
3. `/app.html` returns 404 (v1 retired)
4. `/app` redirects to `/app/onboarding` on first visit, otherwise shows
   Routine
5. Goal setup adds a body goal → TabNav updates → drill-in works
6. Workout/Peptide/Nutrition views render and let you log data
7. Reload page → state persists from localStorage
8. Switch domains via TabNav → no full page reload, smooth nav
9. Mobile viewport behaves (safe area, no zoom on inputs, fixed bottom nav)
10. iOS Capacitor build opens the app, shows `/app` over HTTPS, basic
    interactions work

## Open questions

None. All decisions locked above.

## Implementation phases (informational — not part of this spec)

The implementation plan will likely split into 3 phases:

1. **Migration** — move `src/` mounting from Vite to Next.js, set up
   `app/app/` routes, port Layout + Routine + GoalSetup, delete Vite +
   v1 monolith. Result: v2 reachable at `/app` (minus domain views).

2. **Body view lifts** — cherry-pick Workout/Peptide/Nutrition/CheckIn/
   Onboarding from `/tmp/adonis-alexandria-recovery/`, wire each to its
   Next.js route, integration smoke test.

3. **Capacitor iOS** — install Capacitor, create iOS project, configure
   server.url, open in Xcode for Jorrel to handle signing/build/install.
