# iOS P4 Activation Checklist — going live on the App Store

> The iOS app is BUILT through P3 (native shell, foundation, sensory, native reach). Everything
> that doesn't require an Apple Developer account is done, sim-verified, and merged to main.
> This is the single handoff doc: the account-gated + manual steps to actually ship, in order.
> Nothing here is code — it's accounts, keys, dashboard config, and the two product decisions.

## 0. Apple Developer Program — the master gate ($99/yr)
Everything below needs it. Enroll at developer.apple.com (org enrollment ~1–2 days for verification).
Then in Xcode: sign the `App` target with the team; the `aps-environment` entitlement (already
declared in `ios/App/App/App.entitlements`) will sign, and the App ID gets Push capability.

## 1. Push notifications — go live (code is DONE + DORMANT)
The whole path exists and is tested; it sends NOTHING until these are set:
1. **APNs auth key**: developer.apple.com → Keys → create an APNs key (.p8). Note the Key ID + your Team ID.
2. **Vercel env vars** (Production) — no code change, no redeploy logic needed, the sender activates
   the moment they're present:
   - `APNS_KEY_P8` = the full .p8 file contents (BEGIN/END PRIVATE KEY block)
   - `APNS_KEY_ID` = the key's ID
   - `APNS_TEAM_ID` = your Apple Team ID
   - `APNS_BUNDLE_ID` = `pro.adonis.app`
3. **Supabase table**: apply `sql/2026-07-14-push-tokens.sql` in the Supabase SQL editor (no linked
   CLI — manual, per repo convention). Verify: `curl .../rest/v1/push_tokens?select=id&limit=1`
   flips from 404 to `[]`.
   - Sender: `lib/push/apns.js` (JWT/ES256, HTTP/2 to api.push.apple.com). Cron:
     `app/api/cron/routine-reminders/route.js` (daily, CRON_SECRET-guarded, already in vercel.json).
     Registration: `app/api/push/register/route.js` (app POSTs its APNs token here post-permission).
   - **Known limitation (by design):** routine completion is client-side (localStorage), so the
     server can't skip users who already ran their protocol. The cron sends a simple daily reminder
     to all registered tokens (20h dedup guard). Per-user "skip if done" needs server-side state
     sync (roadmap post-MVP #3).

## 2. Deep-link auth — email confirmation opens the app
- **Supabase dashboard** → Authentication → URL Configuration → Redirect URLs: add
  `adonis://auth-callback` (the custom scheme; the app already sends this as its native redirect).
- Ships now with the custom URL scheme (works, but iOS shows an "Open in Adonis?" sheet once).
- **Universal Links upgrade (optional, prettier):** serve an `apple-app-site-association` file at
  `https://adonis.pro/.well-known/apple-app-site-association`, add the Associated Domains capability
  + `applinks:adonis.pro` entitlement in Xcode. Then confirmation links open the app with no sheet.
  Deferred — custom scheme is fully functional for launch.

## 3. Camera — nothing to activate
`@capacitor/camera` + Info.plist usage strings are in; works on device once signed. No account step
beyond signing.

## 4. The two PRODUCT decisions (⚖️ — these gate submission, not the build)
1. **IAP vs Stripe for Elite.** Apple requires IAP for digital subscriptions sold in-app. Today's
   access-code-only unlock likely passes review as-is. The moment Wave 1 sells Elite via Stripe,
   the iOS build needs an IAP path (or the US external-link entitlement, ~27%). **Decide before
   Wave 1's Stripe spec is written** — it shapes the subscription architecture. Recommended for
   the first submission: keep iOS access-code/invite-only (no in-app purchase at all → no IAP
   requirement), add IAP when paid tiers launch.
2. **Peptide surface on iOS.** Links to research-use injectable purchases carry real review risk
   under Apple's health/regulated-substance guidelines. Decide: full app / soften (education, no
   buy links) / hide the peptide pane behind a build flag on iOS. Recommended: a build flag so the
   iOS binary can ship fitness-forward while the web keeps full commerce — lowest review risk.

## 5. App Store Connect — submission
- App icon: DONE (generated, on the springboard). Splash: DONE.
- Needed: per-device screenshots (reuse `scripts/screenshot-baseline.sh` against the sim/device),
  description, keywords, privacy nutrition labels (declare: camera, notifications; no tracking).
- **TestFlight first** — this is where the P0–P3 device-pass items finally get verified on your
  actual phone (they can't be tested in the Simulator): haptic FEEL, 60/120Hz smoothness, the
  silent switch, keyboard behavior, the live push delivery, the real email→confirm→app round-trip.
  Walk the full 12-item Premium Contract on-device (spec:
  `docs/superpowers/specs/2026-07-14-ios-premium-shell-design.md`).
- Then submit for review.

## Build & run commands (reference)
- `npm run build:ios && npx cap sync ios` — build the web bundle for iOS + sync into the native project.
- `npx cap open ios` — open in Xcode to run on a device / archive for TestFlight.
- The `ios/` project is committed; `dist-ios/` is gitignored build output.
