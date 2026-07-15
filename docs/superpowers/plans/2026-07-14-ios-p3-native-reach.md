# Adonis iOS P3 — Native Reach Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development.
> Spec: `docs/superpowers/specs/2026-07-14-ios-premium-shell-design.md` — P3 covers Premium
> Contract items 8 (push), 9 (native camera), 10 (auth opens the app), 11b (Supabase Storage
> for photos — pulls in the Body-roadmap PhotoJournal item). Branch: ios-p3-native-reach (from main).

**Goal:** The app reaches into the OS — routine-reminder push notifications, the native camera,
and email-confirmation links that open the app instead of Safari. These native integrations are
also the review defense against Apple 4.2 ("just a website").

**Account-gate reality (audited 2026-07-14):** `xcrun simctl push`/`openurl` let us test
push-RECEIVE and deep-link HANDLING in the Simulator with NO Apple Developer account. What NEEDS
the account (deferred, staged): real APNs delivery from the server (needs a .p8 key + Push
capability signing), and Universal Links (needs associated-domains entitlement + an AASA file on
adonis.pro). We ship a **custom URL scheme `adonis://` now** (works without the account) and note
Universal Links as the P4 upgrade; the APNs sender is written but dormant until Jorrel provides
the key. This is the same "build everything, stage the account-gated flip" discipline as the cutover.

## Global Constraints
- Adapter/seam discipline: every Capacitor plugin behind `src/platform/*` or a component-local
  dynamic-import guarded by isNativePlatform (storage.js/haptics.js pattern); web bundle must not
  eagerly pull native plugins (grep dist per task).
- No account-gated step BLOCKS the build. Account-gated activation is isolated + documented in a
  single "iOS P4 activation checklist" section of the P3 close report.
- Info.plist usage strings + capability declarations are added in ios/ now (they don't need the
  account to exist in the project; only SIGNING with entitlements does).
- Suite green (1101 + new); web + iOS builds clean; xcodebuild SUCCEEDED; commit per task + trailer.
- Manual steps for Jorrel (collected in the close report, NOT done by the executor): Supabase
  dashboard redirect-URL additions; APNs .p8 key + env var; Apple Developer capabilities.

### Task 1: Native camera for PhotoJournal (Contract item 9)
**Files:** Create `src/platform/camera.js`; Modify `src/views/components/PhotoJournal.jsx`
(use the platform camera on native, keep the `<input capture>` on web); `package.json`
(+@capacitor/camera); `ios/App/App/Info.plist` (NSCameraUsageDescription + NSPhotoLibraryUsageDescription
copy — premium, honest: "Adonis uses your camera to capture progress photos" etc.); `npx cap sync ios`.
**Design:** `src/platform/camera.js` exports `pickProgressPhoto()` → Promise<{dataUrl}|null>:
web = the current file-input+FileReader path (refactor PhotoJournal's existing logic into it OR
keep PhotoJournal's web path and have camera.js only handle native); native = dynamic-import
@capacitor/camera `Camera.getPhoto({ source: Prompt (camera|library), resultType: DataUrl,
quality ~0.8 })`. PhotoJournal's existing watermark + 30-cap + `log('progressPhotos', ...)` logic
is UNCHANGED — it just receives a dataUrl from either source. Keep everything else.
**Tests:** camera.js web path (mock file input) + native path (mock @capacitor/camera returns a
dataUrl); PhotoJournal still watermarks + caps + saves given a dataUrl. Keep existing green.
**Verify:** suite; web build (camera plugin not in main chunk); build:ios + cap sync + xcodebuild
SUCCEEDED; sim: launch, open Body→Tools→PhotoJournal, tap Add — the native Camera prompt appears
(sim offers photo library) — screenshot it. Commit `feat(ios-p3): native camera for progress photos`.

### Task 2: Deep-link auth — email confirmation opens the app (Contract item 10)
**Files:** Create `src/platform/deep-link.js`; Modify `src/services/auth.js` (redirect target on
native = the app scheme), `src/main.jsx` or `App.jsx` (register the appUrlOpen listener at boot);
`capacitor.config.json` (+ `ios` scheme note); `ios/App/App/Info.plist` (CFBundleURLTypes →
`adonis` scheme); `package.json` (+@capacitor/app); `npx cap sync ios`.
**Design:** On native, `appRedirectUrl()` (auth.js:19) must resolve to `adonis://auth-callback`
instead of the web origin — so Supabase's confirmation link, when opened, deep-links into the app.
`src/platform/deep-link.js` exports `initDeepLinks(onAuth)`: native-only, dynamic-import
@capacitor/app, listen `App.addListener('appUrlOpen', ...)`, parse the Supabase tokens/code from
the URL, and drive the Supabase session (call `supabase.auth.exchangeCodeForSession` or
`setSession` per the URL shape — read what Supabase returns for email confirm: it's typically a
`#access_token=...&refresh_token=...` fragment or a `?code=...`; handle the actual shape). On web,
no-op. Wire `initDeepLinks` at boot (main.jsx, after restoreIfEvicted) passing a callback that
refreshes useAuth's session. **Universal Links are the P4 upgrade** (prettier, no scheme in the
URL, needs the account + AASA) — custom scheme ships now; note it.
**Tests:** deep-link.js web no-op; native parses a sample Supabase callback URL and calls the
right supabase.auth method (mock @capacitor/app + supabase). auth.js redirect resolves to the
scheme on native, web origin on web.
**Verify:** suite; build:ios + xcodebuild SUCCEEDED; sim: `xcrun simctl openurl <UDID>
"adonis://auth-callback#access_token=test..."` while the app runs → confirm the listener fires
(a console/toast or a state change; add a temporary observable or assert via a visible result).
Note: full email→confirm→app round-trip needs the Supabase redirect-URL manual step (Jorrel) +
a real signup — sim-verify the HANDLING, flag the round-trip as a device/manual item.
Commit `feat(ios-p3): deep-link auth — confirmation opens the app (custom scheme)`.

### Task 3: Push notifications — app side + receive (Contract item 8)
**Files:** Create `src/platform/push.js`, `src/app/PushPermissionExplainer.jsx` (or fold into an
existing settings/onboarding surface); Modify boot/onboarding wiring, `ios/App/App/App.entitlements`
(aps-environment — declared now, signs at P4), Info.plist if needed; `package.json`
(+@capacitor/push-notifications); `npx cap sync ios`.
**Design:** `src/platform/push.js`: native-only. `requestAndRegister()` → check/prompt permission
(PushNotifications.requestPermissions), on grant `PushNotifications.register()`, listen
`registration` → get the APNs token → POST it to the token-save endpoint (Task 4's
`/api/push/register` OR write directly to Supabase via the app's authed session — decide: a
service-key API route is cleaner for RLS). Listen `pushNotificationReceived` +
`pushNotificationActionPerformed` → on tap, route to the relevant tab (routine). **Pre-permission
explainer (premium — NEVER cold-prompt):** `PushPermissionExplainer` is a small screen/card shown
at the right moment (after GamePlanScreen, or a "Turn on reminders" card on Home/Routine) that
states the value ("A nudge when it's time to run your protocol") with Enable/Not now; only on
Enable do we call requestAndRegister(). Persist the choice (don't re-nag).
**Reality:** the RECEIVE + tap path is sim-testable via `simctl push`. `register()` → real APNs
token needs a device/account (sim may not yield a token) — guard so no-token doesn't break the UX;
flag token-acquisition as device-verified-at-P4.
**Tests:** push.js permission-grant flow (mock plugin: granted→register called→token POSTed;
denied→no register); explainer shows Enable/Not-now, Enable calls requestAndRegister, Not-now
persists + doesn't call; tap-handler routes to routine. Keep suite green.
**Verify:** suite; build:ios + xcodebuild SUCCEEDED; sim: launch, trigger the explainer, Enable
(sim permission prompt), then `xcrun simctl push <UDID> pro.adonis.app payload.json` with a routine
reminder payload → the notification appears in the sim → screenshot; tap → app routes to routine.
Commit `feat(ios-p3): push notifications — permission explainer + receive/tap (send staged for P4)`.

### Task 4: Push — server send path (Supabase table + cron + APNs sender)
**Files:** Apply Supabase DDL `sql/2026-07-14-push-tokens.sql` (create `push_tokens`: id, user_id
fk, token, platform, created_at, unique(user_id, token); RLS: users manage their own; service key
reads all for sending) — MANUAL apply per repo convention (memory: Supabase migrations are manual),
but WRITE the SQL + a read-back verify; Create `app/api/push/register/route.js` (service-key upsert
of a token for the authed user), `app/api/cron/routine-reminders/route.js` (find users due for a
reminder + send), `lib/push/apns.js` (APNs HTTP/2 sender: JWT signed with the .p8 key from env,
POST to api.push.apple.com), `lib/push/due.js` (pure: given users + their reminder settings + now,
who's due — unit-testable); Modify `vercel.json` (+cron for routine-reminders).
**Design:** `lib/push/due.js` is pure + unit-tested (the "who gets a nudge now" logic — e.g. a
user with a set reminder time who hasn't completed today's routine). `lib/push/apns.js` reads
`APNS_KEY_P8`, `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_BUNDLE_ID` from env (Jorrel provides at P4) —
if unset, the sender is a no-op that logs "APNs not configured" (dormant, never crashes the cron).
The cron endpoint is CRON_SECRET-guarded (repo pattern). Payload: routine reminder title/body +
a tab-route in the data.
**Tests:** `lib/push/__tests__/due.test.js` (due/not-due matrix); apns.js: JWT construction shape
+ the no-op-when-unconfigured path (don't hit real APNs). Route: 401 without secret; with an empty
token table → sends nothing, 200.
**Verify:** `npm test` green; `npm run build` (next chain) clean — the new API routes compile;
Supabase read-back shows `push_tokens` exists after manual apply (executor writes SQL + the verify
command; if the executor can apply via PostgREST/service-key it may, else flags manual). Live APNs
delivery is P4 (needs the key). Commit `feat(ios-p3): push send path — token table, reminder cron, APNs sender (dormant until key)`.

### Task 5: P3 close
Full suite + web build + next build + build:ios + cap sync + xcodebuild all green; sim end-to-end:
launch, camera prompt, deep-link openurl fires, simctl push displays + tap routes; screenshots to
`docs/visual-baselines/ios-p3/`. Merge ios-p3-native-reach → main + push (web-safe: all native
behind isNativePlatform, API routes are new + cron-guarded + dormant; verify prod /app healthy +
the new cron doesn't fire destructively — it no-ops with no tokens/no key). Spec P3 checkboxes;
**write the "iOS P4 Activation Checklist"** (Apple Dev enrollment; APNs .p8 key + 4 env vars;
Push + Associated-Domains capabilities; Supabase redirect URLs incl. adonis://; Universal Links
+ AASA upgrade; the ⚖️ IAP + peptide decisions) — this is the single handoff doc for going live.
Memory + report. Commit `docs(ios-p3): phase close + P4 activation checklist`.

## Self-review notes
- Account gate is isolated to live-delivery + entitlement SIGNING; every app-side behavior is
  built + sim-verified. Honest: token-acquisition, real APNs, Universal Links, and the full
  email round-trip are device/account items — don't claim sim-verified what isn't.
- PhotoJournal → Supabase Storage (Contract 11b) is NOT in P3 (keeps localStorage base64 for now);
  it's a Body-roadmap item — noted, not pulled in, to keep P3 scoped to native reach.
- The push send path ships DORMANT (no key) — it deploys to prod safely (no-op cron), then
  activates when Jorrel adds the key. Same staging pattern as the cutover.
