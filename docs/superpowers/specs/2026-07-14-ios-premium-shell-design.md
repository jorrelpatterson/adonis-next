# Adonis iOS — Premium Native Shell (Design)

> Written 2026-07-14. Jorrel's bar, verbatim: **"i want this to feel like a premium ios app."**
> This spec turns that bar into enforceable, device-testable requirements. Build runs the
> standard machinery (SDD plan → per-task review → gates) when green-lit.
> ⚖️ = Jorrel decision. Grounding facts audited 2026-07-14 against the live repo.

## Grounding facts (audited)

- Xcode IS installed on the build machine (`/Applications/Xcode.app`) — spike runnable today.
- `src/design/haptics.js` was DESIGNED for this: its header comment marks the exact seam
  ("When Capacitor-wrapped: dynamic import @capacitor/haptics here… keep this file the only
  place that knows"). API: `haptics.light/medium/heavy/success/warning/error/selection`.
- Fonts load via CSS `@import` of Google Fonts (`animations.css:12` — Cormorant Garamond,
  Outfit, JetBrains Mono). Render-blocking, network-dependent: an offline native cold boot
  falls back to system fonts. MUST be bundled for iOS (also improves web).
- v2 registers NO service worker (killer only) — clean for a bundled native shell.
- State persists to `localStorage` (`store.jsx`) — **WKWebView localStorage is evictable
  under iOS storage pressure.** A premium app cannot lose a user's logs. Storage adapter
  required (below).
- PhotoJournal already uses camera capture + base64 (30-photo cap) — native Camera plugin
  upgrade path is clean; Supabase Storage migration (Body roadmap item) pairs well.
- Tab-based nav (no push/pop stacks) — sidesteps the hardest native tell (edge-swipe-back).
- Auth email confirmation redirects to `origin+pathname` (`auth.js:27`) — must become a
  Universal Link / custom scheme so confirmation returns INTO the app.

## Architecture

- **Capacitor** (@capacitor/core + ios). One repo, one codebase; `ios/` project checked in.
- **Second Vite target**: `vite.config.ios.js` (or mode flag) — `base: './'`, same outDir
  discipline; `npm run build:ios` → `npx cap sync`. Web build (`base:'/app/'`) untouched.
- **Adapters, not forks** (the rule: one file knows the platform, everything else doesn't):
  - `src/platform/storage.js` — localStorage on web; Capacitor Preferences/Filesystem on iOS
    (survives eviction). `store.jsx` reads/writes through it. Migration: first native boot
    imports any existing localStorage blob.
  - `src/design/haptics.js` — the seam its author left: dynamic-import @capacitor/haptics,
    map light/medium/heavy→ImpactStyle, success/warning/error→NotificationType,
    selection→selectionChanged. Web behavior unchanged.
  - `src/platform/camera.js` — PhotoJournal shells out to Camera plugin on iOS.
- **Fonts bundled** (`src/static/fonts/` woff2 + local @font-face, `font-display: optional`
  on iOS build): kills the CDN @import chain. Web keeps CDN or also bundles (prefer bundle).
- **Push**: APNs via @capacitor/push-notifications; server send from existing Vercel cron
  infra (routine reminder + streak-protection notifications; token table in Supabase w/ RLS).
- **Deep links**: Universal Links (apple-app-site-association served from adonis.pro) for
  Supabase auth redirects; fallback custom scheme `adonis://`.

## THE PREMIUM CONTRACT (acceptance criteria — every item verified ON DEVICE before ship)

**Boot & shell**
1. Native splash (#0A0A0C + gold A monogram) → app interactive with ZERO white/blank flash,
   cold boot < 1.5s on a mid-range iPhone, fully offline (airplane mode boots identically).
2. Brand fonts render on first paint offline (bundled — no FOUT to system fonts, ever).
3. Status bar: light content over app bg; content respects notch + home indicator on every
   screen (safe-area insets on header, TabNav, modals, full-screen celebrations).
4. No webview tells: no rubber-band revealing the shell behind the app, no tap-highlight
   flashes, no long-press text-selection/callout on chrome, no pinch/double-tap zoom, no
   magnifier on non-text UI. (Content areas keep text selection where it serves the user.)

**Touch & motion**
5. Haptic vocabulary live on Taptic Engine: tab switch = light; task complete = light;
   check-in slider steps = selection ticks; save/confirm = medium; PR celebration,
   goal-complete, streak milestone = success burst (paired with existing sound design,
   respecting the mute setting + iOS silent switch policy ⚖️ below).
6. All animations transform/opacity-composited (audit animations.css) — no jank at 60fps,
   ProMotion-smooth where the device offers 120Hz.
7. Keyboard: inputs never hidden behind the keyboard; dark keyboard appearance; no viewport
   jump on focus; accessory bar off (Capacitor Keyboard, resize mode chosen in spike).

**Native reach (the "not a website" proof — also the 4.2 review defense)**
8. Push notifications: routine reminder (user-set time) + streak-protection nudge, with a
   pre-permission explainer screen (never cold-prompt). Deliverable even when app is closed.
9. PhotoJournal opens the native camera; photos persist through the storage adapter.
10. Auth email confirmation opens THE APP (Universal Link), never Safari.
11. Data durability: logs/goals survive iOS storage pressure + app restarts (adapter), and
    the 30-photo journal cap lifts via Supabase Storage (pairs with Body roadmap item).

**Identity**
12. Proper iOS icon set (gold A monogram, full sizes), matching splash, App Store screenshots
    shot from the real device set (reuse the shooter pipeline against the Simulator).

## Phases

- **P0 — Spike (½–1 day):** cap init/add ios, ios Vite target, boots in Simulator, walk the
  app end-to-end in the shell. Output: findings list against the Premium Contract.
- **P1 — Foundation:** storage adapter (+localStorage import migration), bundled fonts,
  safe areas, keyboard, overscroll/tell-killers, splash/status bar, icons. Contract items 1-4, 7, 11(a).
- **P2 — Sensory:** haptics bridge + vocabulary pass across the app, animation audit,
  sound/silent-switch policy. Items 5-6.
- **P3 — Native reach:** push (APNs + token table + cron send), camera, Universal Links.
  Items 8-10.
- **P4 — Store prep [GATED]:** Apple Developer enrollment ⚖️, TestFlight to Jorrel's phone,
  device pass of the FULL contract, listing assets, submit. Blocked by the two ⚖️ decisions.

## ⚖️ Held decisions (block P4 submission, NOT P0-P3 build)

1. **IAP vs Stripe for Elite** — Apple requires IAP for digital subscriptions sold in-app.
   Access-code-only unlock (today's model) likely passes review; the moment Wave 1 sells
   Elite via Stripe, iOS needs an IAP path (or US external-link entitlement, ~27%).
   **Wave 1's Stripe spec must be written iOS-aware.** Options at spec time: (a) iOS sells
   Elite via IAP alongside Stripe on web; (b) iOS stays access-code/reader-style; (c) external
   link entitlement.
2. **Peptide surface on iOS** — commerce links to research-use injectables carry real review
   risk. Options: full app / soften (education, no buy links) / hide pane on iOS build flag.
3. Silent-switch policy for sound design (respect switch = default recommendation).
4. Apple Developer Program enrollment ($99/yr — Jorrel action, needed by P4; TestFlight needs it too).

## Risks

| Risk | Mitigation |
|---|---|
| App Review 4.2 "just a website" | Contract items 8-10 are the defense; ship push in v1 |
| Peptide content rejection | ⚖️ #2 decided before submission; build flag ready either way |
| WKWebView storage eviction | Storage adapter in P1, not later |
| Simulator ≠ device (haptics/ProMotion/silent switch don't simulate) | TestFlight device pass is the gate, same as Phase 5's real-device rule |
| Capacitor/iOS churn | Pin versions; `ios/` checked in, upgrades deliberate |

## Bonus
Same Capacitor project yields Android with ~10% extra work (P5, unscoped). The bundled-fonts
and storage-adapter work improves the WEB app too (faster first paint, sturdier persistence).
