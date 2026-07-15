# Adonis — App Privacy answers (App Store Connect → App Privacy)

> The exact answers for Apple's privacy questionnaire. These must match reality — a mismatch is a
> rejection and a legal exposure. Adonis is **local-first**, which keeps this short and honest.
> Written 2026-07-15. Re-check before each submission if data flows change.

## What actually leaves the device (the basis for every answer below)
The app is local-first: workouts, weight, check-ins, food logs, goals, and progress photos live
in on-device storage and are NOT sent to a server (cloud state sync is post-MVP). What the server
receives:
1. **Email + first name** → on signup, upserted to the `subscribers` table (drives the account +
   the welcome-email sequence). Auth email/identity via Supabase.
2. **Push device token** → after the user opts in, sent to `push_tokens` for the daily reminder.
Nothing else. No analytics SDK, no crash reporter, no ad SDK, no third-party tracking.

## Tracking
**"Do you or your third-party partners use data for tracking?" → NO.**
There is no cross-app/website tracking, no advertising identifiers, no data brokers. Result label:
**"Data Not Used to Track You."**

## Data collected (declare EXACTLY these, nothing more)

### Contact Info → Email Address
- Collected: **Yes** · Linked to identity: **Yes** · Used for tracking: **No**
- Purposes: **App Functionality** (account/auth) and **Developer's Marketing or Advertising**
  (the welcome-email sequence — declare it, it's real).

### Contact Info → Name
- Collected: **Yes** (first name from onboarding → subscribers) · Linked: **Yes** · Tracking: **No**
- Purpose: **App Functionality** (personalization/account).

### Identifiers → Device ID (push token)
- Collected: **Yes** (only after the user enables notifications) · Linked: **Yes** (to the user) ·
  Tracking: **No**
- Purpose: **App Functionality** (delivering the routine reminder).

## Data NOT collected (be able to defend each as on-device-only)
- **Health & Fitness** (workouts, weight, check-ins, macros): NOT collected — stays on device.
  ⚠️ The app is *about* fitness, but the data does not reach the developer, so it is correctly
  "Not Collected." This is the honest answer TODAY. **When PhotoJournal or state moves to Supabase
  (post-MVP), this and Photos below MUST be re-declared as Collected.**
- **User Content → Photos**: NOT collected — progress photos are watermarked and stored on-device
  only; the camera/photo permission (Info.plist) is a device-access permission, not data collection.
- **Usage Data / Diagnostics**: NOT collected — no analytics or crash SDK in the app.
- **Financial / Location / Contacts / Browsing**: NOT collected.

## Permissions the app requests (Info.plist purpose strings — already in ios/App/App/Info.plist)
- Camera — "Adonis uses your camera to capture progress photos."
- Photo Library — "Adonis accesses your photo library to add progress photos."
- Notifications — requested in-app with an explainer before the system prompt (no plist string needed).

## [JORREL] Before submitting
- Confirm the above still matches the shipped build (especially: did anything add analytics? did
  PhotoJournal migrate to Supabase Storage? if so, update Health & Fitness + Photos to Collected).
- The **Privacy Policy URL** (see listing.md) must state the same three collected items + "no
  tracking." Apple cross-checks the labels against the policy.
