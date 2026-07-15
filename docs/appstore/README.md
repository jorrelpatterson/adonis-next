# App Store submission kit

Everything App Store Connect needs that doesn't require the Apple Developer account, ready to
paste/upload when you enroll. The account-gated steps (signing, APNs, TestFlight, submit) live in
`../ios-p4-activation-checklist.md`.

## Contents
- **`listing.md`** — name, subtitle, description, keywords, URLs, and the App Review notes (the
  reviewer-facing explanation that de-risks the peptide content — high leverage, read it).
- **`privacy-labels.md`** — the exact App Privacy questionnaire answers (Adonis is local-first, so
  the honest answer set is small: email, name, push token; no tracking).
- **`screenshots/`** — 8 screenshots at **1290×2796** (the 6.7"/6.9" size Apple requires; Apple
  auto-scales it to smaller iPhones, so this one size satisfies the iPhone requirement). Regenerate
  with `scripts/appstore-screenshots.sh` (needs `npm run dev:app -- --port 4321 --strictPort`).

## Recommended screenshot ordering (first 3 matter most)
Lead with the premium "life protocol OS" story; keep the higher-review-risk surfaces later:
1. `01-onboarding` — the premium first impression
2. `02-home` — the daily protocol score + dashboard
3. `03-routine` — the time-blocked day (the core loop)
4. `07-insights` — 90-day consistency + trends (impressive, safe)
5. `06-bucket-list` — the aspirational Elite hook (Life Wheel)
6. `08-mind` — breathwork/meditation (wellness, very review-safe)
7. `05-money` — credit strategy (include mid-list)
8. `04-body-peptides` — real, but the highest review-risk screen: **feature it last, or hold it
   until after approval**, and see the peptide decision below.

Optional polish before upload (not required by Apple): composite these into device frames with a
one-line caption per screenshot ("Your whole day, one protocol", "Big goals become a plan", etc.).
Raw 1290×2796 content is fully acceptable as-is.

## Two things that BLOCK submission (not the build, not Apple's account)
1. **Privacy Policy URL** — Apple rejects any app without a reachable one. `adonis.pro/privacy`
   must exist and match `privacy-labels.md`. This is the one hard blocker here.
2. **The two product decisions** (in `../ios-p4-activation-checklist.md` §4):
   - **IAP vs Stripe for Elite** — recommend shipping v1 access-code-only (no in-app purchase →
     no IAP requirement); add IAP when paid tiers launch.
   - **Peptide surface on iOS** — recommend the planned build flag so the iOS binary ships
     fitness-forward (peptide pane hidden) while the web keeps full commerce. This is the single
     biggest lever on review outcome. If you hide it, update the peptide paragraph in the review
     notes and drop the age rating to 12+.

## The rest is the checklist
Enroll → sign → APNs key + env vars → apply the push SQL → Supabase redirect URL → upload these
screenshots + metadata → TestFlight (the on-device Premium-Contract pass) → submit. All in
`../ios-p4-activation-checklist.md`.
