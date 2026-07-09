# Adonis v1 — Feature Inventory (the live app at adonis.pro)

> Written 2026-07-09 as reference input for the v2 rebuild (governing spec:
> `docs/superpowers/specs/2026-07-05-adonis-v2-mvp-completion-design.md`).
> Source of truth is the code itself — this is a map, not a contract.
> Line numbers refer to the files as of commit 3cf8214.

## 0. What these files actually are

- **`public/index.html` (878 lines)** — GSAP-animated marketing landing page ("Adonis — Life Protocol OS"). Pure static HTML/CSS + GSAP/ScrollTrigger (index.html:283-284). NOT the app; its only functional exit is a "Get Started" CTA linking to `./app.html` (index.html:275). `vercel.json` rewrites `/` → `/index.html`, so adonis.pro root shows this page and the real app lives at `/app.html`.
- **`public/app.html` (7,674 lines)** — the actual product: a single-file React 18 SPA. React/ReactDOM/Supabase from CDNs, JSX pre-compiled to `React.createElement` (no in-browser Babel). Pulls in `/lib/exercises.js` and `/lib/programs.js` (app.html:2).
- **Not just a fitness app** — it's a 10-domain "Life Protocol OS" (`DOMAINS`, app.html:176-185): Body, Money, Citizenship, Mind, Image, Community, Environment, Purpose (+ Income and Career in nav). Body/fitness is the free wedge; the rest are paywalled.
- The app **unregisters any service worker and deletes all caches on every load** (app.html:2) — installable PWA shell, deliberately no offline caching (forces fresh deploys).

## 1. Top-level navigation

Nav model: `PARENT_TABS` (app.html:7578-7591); bottom-nav + sub-tab bar (app.html:7601-7631); active-view ternary chain (app.html:7632).

App-level `view` state: `landing` / `onboard` / `app` (app.html:3119-3126) — in-app landing, multi-step onboarding wizard, then the tabbed app.

| Parent tab | Sub-tabs | View fn (line) |
|---|---|---|
| Home | (check-in) | `CheckinV` 5350 |
| Routine | — | `RoutineV` 6608 |
| Body | Peptides / Train / Food / Tools | `StackV` 5851, `WorkoutV` 6369, `FoodV` 5409, `ToolsV` 6324 |
| Money | Cards / Income | `CreditCardV` 5584, `IncomeV` 6869 |
| Mind | — | `MindV` 7043 |
| Purpose | — | `PurposeV` 6937 |
| Passport | — | `CitizenshipV` 7195 |
| Image | — | `ImageV` 7398 |
| Space | — | `EnvironmentV` 7448 |
| Community | — | `SocialV` 7309 |
| Insights | — | `InsightV` 5452 |
| Profile | — | `ProfV` 7478 |

Gating: `FREE_DOMAINS = ["body"]` (app.html:7600); `isLockedTab` (app.html:7606). Tabs hidden/locked unless the domain is in the user profile and user is premium.

## 2. Per-tab features

### Home / Check-in — `CheckinV` (5350)
- Domain-aware stat cards: calories-left, routine %, weight (sparkline), 5/24 credit count, monthly income (5375-5407).
- Daily check-in: 8 subjective sliders — mood/energy/sleep/stress/appetite/skin/focus/soreness (`CHECKIN_FIELDS`, app.html:195-202).
- Weight logging, daily notes, 7-day mood strip, bonus-deadline + low-supply alerts, menstrual-cycle phase banner (`getCycleInfo` — water-retention & BMR adjustments).
- Quick-action tiles deep-linking into Food, Peptides, Cards, Income, Tools.

### Routine — `RoutineV` (6608)
- Auto-generated daily protocol timeline (`buildRoutine`) merging peptide injections, workouts, meals, skincare, supplements, mind/work blocks — each with a checkbox; completion drives the "routine %". Category icons at app.html:1505.

### Nutrition / Food — `FoodV` (5409)
- Food logging from built-in `FOOD_DB` (app.html:204) + custom foods; per-day macro totals.
- Adaptive calorie/macro engine: TDEE (`calcTDEE`/`calcBMR`), macro targets (`calcMacros`), deadline-pace adjustment, yesterday-overshoot carryover, cycle-phase calorie bump, "burn gap", 7-day intake bar chart + protein compliance.
- Suggested auto-scaled meal plan per protocol.

### Peptides — `StackV` (5851) — also the e-commerce surface
- Protocol viewer: dosing, timing, cycle length, mechanism/research (`PEP_RESEARCH`, app.html:381), goal-matched stack recommendations (`buildStacks`, `GOAL_MAP` app.html:173).
- Shop + cart + checkout for ~120-131 peptides (`PEPTIDES`, app.html:22) with categories/filters. Cart state `pepCart` (3151), checkout modal (3152).
- Vendor/affiliate source routing (`SOURCE_ROUTES`, app.html:165 — elysian/vitalpeak/nova + affiliate clinics).

### Train — `WorkoutV` (6369)
- Program-driven workout player using `/lib/programs.js` (Adonis PPL, 16-week) and `/lib/exercises.js`. Goal→program map at app.html:3243.
- Set logging + PR tracking (`wkLogs`/`wkPRs`, app.html:3262-3263; "Personal Record" 5494), week/day navigation, rest timer (`RestTimer`, app.html:4151-4157).

### Tools — `ToolsV` (6324)
- Dosing calculators and supply/inventory tracking with low-supply reorder alerts (`toolTab` "supply").

### Money / Cards — `CreditCardV` (5584)
- Credit-card stacking engine: 5/24 tracking (`calcFiveTwentyFour`), best-card recommendation (`getBestCard`), signup-bonus/min-spend deadline tracking, wallet management.
- Credit-repair dispute engine: `generateDisputeLetter` / `generateLetterByType` — dispute letters by reason (collection/duplicate/outdated/bankruptcy, app.html:1238) and letter type (initial/followup/CFPB/goodwill, app.html:1270-1274); `getScoreAnalysis`; persisted `disputeQueue` (3162).

### Money / Income — `IncomeV` (6869)
- MLM/referral income tracker — 5-level compensation (`INCOME_REWARDS`, app.html:1506-1511, $250/direct down to $15/L5), lead pipeline (lead→installed→paying→completed).
- Referral verticals (`REFERRAL_VERTICALS`, app.html:1512+): solar etc., with avg payout, close rate, qualifying-question scripts. `buildIncomePlan`, `getIncomeActions`.

### Mind — `MindV` (7043)
- Breathing/meditation timers — 5 patterns (box, 4-7-8, Wim Hof, calm, energize) at app.html:4246-4252, animated guided timer (`startBreathing`, 4253); nootropic stacks, focus blocks.

### Passport / Citizenship — `CitizenshipV` (7195)
- Second-passport pathway scoring (`scoreCitizenshipPaths`), country options (Italy/Ireland/Poland/Germany, app.html:1767), budget/timeline filters, document checklists, passport-power scoring.

### Purpose (6937), Image (7398), Space/Environment (7448), Community/Social (7309)
- Lighter-weight domains (bucket list/travel/values; skincare/wardrobe/grooming; workspace/sleep-environment; accountability-partner matching). Several are more scaffold than deep feature.

### Insights — `InsightV` (5452)
- Cross-domain analytics/correlations from check-in + logs (`generateInsights`). "Deep AI insights" gated to Elite but the generator is local heuristics — no live LLM.

### Profile — `ProfV` (7478)
- Profile/goals/domains editor, subscription/tier management, promo redemption, order history, data reset.

## 3. Data & persistence

- **localStorage**: master blob under `adonis_v1` (`LS_KEY`, app.html:3098), read via `loadSaved`/`ls` (3109-3118), written per-key via `ss(...)`. Version gate (`adonis_version` = "2.1.0") wipes localStorage on version bump (app.html:3097-3108). Install-prompt dismissal: `adn_install_dismissed`.
- Persisted slices: `prof`, `checkins`, `foodLogs`, `weightLog`, `bodyMeasurements`, `notes`, `orderHistory`, `shippingInfo`, `disputeQueue`, `wkLogs`, `wkPRs`, `wkWeek`, `wkDay`, `wkProgramId`, etc. (app.html:3127-3260).
- **Supabase** (app.html:3005-3013, anon key hardcoded inline):
  - `user_data` — full app-state cloud sync (`cloudSave` upsert 3083, `cloudLoad` 3090).
  - `products` — live peptide pricing/stock/vendor/mechanism pulled at load, merged into `PEPTIDES` (app.html:3042).
  - Additional reads at 7356 and 7508 (Social/Profile).
- **`/api/*` fetches** (all in checkout path, app.html:4231-4237): `/api/place-order` (Supabase order insert), `/api/notify` (admin email via Resend), `/api/notify-customer` (customer email via Resend).

## 4. E-commerce

- Client-side cart (`pepCart`, 3151); floating cart bar (7632); checkout modal gathers `shippingInfo`.
- Submit flow (app.html:~4200-4244): order row → POST `/api/place-order` (Supabase `orders`, `status: "pending_payment"`) → `/api/notify` + `/api/notify-customer` emails → local `orderHistory` → payment screen.
- **Payment is manual P2P, not card processing**: `PAYMENT_HANDLE = "626-806-4475"` / `PAYMENT_NAME = "Jorrel Patterson"` (app.html:3007-3008). Tiered discount logic (`discountTier`) at checkout.
- **Stripe only for subscriptions**: `STRIPE_LINKS` for Pro/Elite payment links (app.html:672-675). Two different payment rails.

## 5. Auth

- Supabase Auth, optional/hybrid: email+password (with confirmation), Google OAuth, password reset (`authSignUp`/`authLogIn`/`authGoogle`/`authForgot`/`authLogOut`, app.html:3043-3079). Session restored on load (3031-3039).
- App fully usable anonymously from localStorage; signing in only adds cloud sync. **v2 flips this: signup required (spec decision).**

## 6. PWA

- Manifest linked + full `apple-mobile-web-app-*` meta, `theme-color #060709` (app.html:1); splash div `#splash`.
- Custom install prompt (`beforeinstallprompt`, standalone detection app.html:240-263).
- No service worker/offline by design — SW self-unregisters, caches cleared on every load (app.html:2), aggressive no-cache meta.

## 7. AI / email / notifications

- **No live LLM integration.** `API_KEYS` (app.html:3-19 — Anthropic, Plaid, SendGrid, Lob, USDA, OpenWeather) are all `"PLACEHOLDER_..."`. "AI insights" is an Elite flag (`aiInsights`, app.html:670); actual generation is local heuristics.
- Email: Resend via the three `/api/*` routes at checkout.
- Notifications: in-app only (deadline banners, low-supply alerts, `SFX.celebrate`). No push.

## 8. Monetization

`TIERS` (app.html:668-670):
- **Free** ($0): 2 domains max, body tracking, food/weight logging.
- **Pro** ($14.99): all domains, credit-repair + dispute engine, income protocol, citizenship, mind/nootropics, analytics.
- **Elite** ($29.99): + premium peptide protocols, AI insights, adaptive intensity, priority support.
- Promo codes (`PROMO_CODES`, app.html:676-681): ADONIS2026, ELITEACCESS, FOUNDER, BETA, LAUNCH50 — grant tiers, some with expiry. Redeemed in Profile (`redeemPromo`, app.html:7576).

## 9. Supporting data files

- **`public/lib/exercises.js`** (1,753 lines) — 112 exercises (65 with full instructions); global `EXERCISES` map keyed by slug.
- **`public/lib/programs.js`** (284 lines) — one 16-week program, "Adonis PPL" (`id: "adonis-ppl"`), phased (Foundation / Hypertrophy / Strength+ / Deload), Mon-Sat days referencing exercise IDs.

## 10. Flags for the v2 rebuild

1. Hardcoded secrets/handles in the client bundle: Supabase URL + anon key (app.html:3005-3006), personal payment handle/name/phone (app.html:3007-3008).
2. "Fitness app" is a misnomer — Money (credit stacking + repair + MLM income) and Citizenship are substantial standalone products inside the same file. v2 spec's Phase 4 domain views port from these.
3. Two payment rails: P2P handle for peptides, Stripe payment links for subscriptions. v2 defers payments entirely (spec decision).
4. Version gate wipes local data on `adonis_version` mismatch; constant is "2.1.0" despite this being "v1".
5. No offline/PWA caching by design — relevant when v2 Phase 5 does manifest/installability.
6. Only Supabase + the three Resend order routes are live integrations; everything else is a placeholder stub.
