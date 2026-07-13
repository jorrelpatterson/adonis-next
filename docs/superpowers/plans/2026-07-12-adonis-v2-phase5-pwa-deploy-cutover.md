# Adonis v2 Phase 5 — PWA, Deploy, Cutover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** v2 serves at `adonis.pro/app` (additive — v1 untouched), installable as a PWA, with the production cutover (CTA repoint, app.html redirect, public/lib deletion) STAGED on an unmerged branch awaiting Jorrel's real-device DoD walkthrough.

**Architecture:** Reuse revival commit `6e016c3`'s ride-along mechanism verbatim-in-spirit with `/app/` instead of `/v2/`: Vite builds into `public/app/` (gitignored) with `base: '/app/'` and `publicDir: 'src/static'` (critical — default public/ would recursively copy v1's 10MB into the build), `npm run build` chains `vite build && next build`, Vercel deploys both from one build. Cutover changes live ONLY on branch `phase5-cutover` until Jorrel approves.

## Global Constraints

- Spec Phase 5 + serving model ("app at adonis.pro/app; / remains the marketing funnel; build output gitignored"). Ledger rows 140-143 close across 5a/5b.
- **HARD GATE: the cutover flip (CTA repoint, app.html redirect, public/lib deletion) merges ONLY after Jorrel's phone walkthrough.** Everything else is additive and merges on standing authorization.
- v1 remains byte-untouched in 5a (public/app.html, public/index.html, public/lib unchanged on main).
- The Vite entry `index.html` at repo root currently says "Jorrel2.0" — rebrand to Adonis as part of the PWA task (title, apple-mobile-web-app-title, theme-color consistency with #0A0A0C).
- Suite green (1053); builds clean; commit per task with trailer.

### Task 1: Ride-along build pipeline (`/app`)

**Files:** Modify `vite.config.js` (base '/app/', publicDir 'src/static', outDir 'public/app' — keep the test block intact), `package.json` (build = `vite build && next build`; add `build:next-only`), `.gitignore` (+`public/app/`), `vercel.json` (rewrite `/app` → `/app/index.html` alongside the existing `/` rewrite); Create `src/static/.gitkeep` (or the icons land here in Task 2).
**Verify:** `npm run build` → `public/app/index.html` exists + assets under `public/app/assets/` with `/app/`-prefixed URLs (grep the built index.html for `src="/app/assets/`); `npx next start -p 3100 &` then `curl -sf localhost:3100/app` returns the v2 HTML (rewrite works) and `curl -sf localhost:3100/app.html | head -1` still returns v1 (untouched); suite still green (vitest config untouched by base/publicDir? — `base` affects builds not tests, but VERIFY the full suite after).
**Commit:** `feat(phase5): v2 rides the Next build — served at /app (additive)`

### Task 2: PWA manifest, icons, SW-killer, rebrand

**Files:** Create `src/static/manifest.json` (name "Adonis — Protocol OS", short_name "Adonis", start_url "/app/", display standalone, background/theme `#0A0A0C`, icons → `/app/icon.svg` + `/app/icon-maskable.svg`), copy `public/icon.svg`+`icon-maskable.svg` into `src/static/`; Modify root `index.html` (Vite entry): title/apple-title → Adonis, `<link rel="manifest" href="/app/manifest.json">`, icon hrefs → `/app/...`, and the v1-parity SW-killer snippet (unregister all serviceWorker registrations + caches.keys().delete — copy the semantics from `public/app.html` line 2's killer; ledger row 141: v2's killer must clean up v1's registrations at cutover).
**Verify:** `npm run build:app && ls public/app/manifest.json public/app/icon.svg`; built index.html contains manifest link + SW-killer; dev server still boots (`?e2e=1&tab=home` smoke via curl 200). Note: dev-mode manifest 404s at `/app/manifest.json` are EXPECTED (base differs in dev) — document, don't chase.
**Commit:** `feat(phase5): PWA manifest + icons + v1 SW cleanup; Adonis rebrand of the app shell`

### Task 3: Versioned storage gate (ledger row 142)

**Files:** Modify `src/state/store.jsx` — `STORAGE_VERSION = 1` stamped into the persisted blob (`_v`); `loadState` treats missing `_v` as current (existing users keep data — v2 has real testers' local state now) and FUTURE mismatches wipe-and-default (v1's adonis_version semantics under the new key). Tests: persisted blob without `_v` loads (back-compat); blob with `_v: 999` wipes to defaults; saves stamp `_v: 1`.
**Commit:** `feat(phase5): versioned adonis_v2 storage (wipe-on-future-bump, back-compat now)`

### Task 4: STAGED cutover branch (NOT merged — Jorrel's gate)

On branch `phase5-cutover` from main: `public/index.html` CTA `./app.html` → `/app`; `public/app.html` → tiny redirect document (meta refresh 0 + JS `location.replace('/app')` + fallback link; delete the 7,674-line monolith contents); `git rm -r public/lib`; ledger rows 140-143 + PWA section closed with dated notes; root `public/manifest.json` start_url → `/app/` (v1 installed-PWA users get routed into v2 on next launch — note for Jorrel). Full suite + build must pass ON THE BRANCH. Push the branch (unmerged) so it survives; present the diff summary + DoD walkthrough checklist to Jorrel.
**Commit (on branch):** `feat(phase5-CUTOVER): retire v1 — app.html redirects to /app, CTA repointed, public/lib removed [HOLD FOR JORREL]`

### Task 5: Phase close (5a only)

Suite + `npm run build` (full chain) clean; merge 5a to main; push; **verify production**: after Vercel deploy completes (~2-3 min), `curl -sf https://adonis.pro/app | grep -qi adonis` AND `curl -sf https://adonis.pro/app.html | head -c 200` still v1. Update parity ledger row 140 (manifest — DONE 5a) + 141 (SW-killer — DONE 5a) + 142 (storage version — DONE 5a); rows 143 + cutover stay open pending 5b. Memory + report with the 10-item DoD phone checklist.

## Self-review notes
- Additive-vs-cutover split is the load-bearing decision: everything merged in 5a leaves v1 byte-identical; 5b is one held branch.
- publicDir override is the known footgun (6e016c3 documented it) — Task 1 verifies build output size sanity (public/app < 5MB).
- v1's installed-PWA users: root manifest start_url change rides in 5b (cutover), listed in Jorrel's checklist.
