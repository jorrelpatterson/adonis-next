# Adonis — App Store Connect Listing (submission-ready copy)

> Paste-ready metadata for App Store Connect. Character limits noted; all copy is within them.
> Written 2026-07-15. Pairs with `privacy-labels.md` and `screenshots/`. Items marked **[JORREL]**
> need a decision or an asset only you can provide.

## Identity
- **App Name** (30 char): `Adonis — Protocol OS` (20)
- **Subtitle** (30 char): `Run your life like a system` (27)
- **Bundle ID**: `com.adonis.app`
- **Primary category**: Health & Fitness
- **Secondary category**: Lifestyle
- **[JORREL] Age rating**: answer the questionnaire honestly → likely **17+**. The peptide/
  supplement education content = "Medical/Treatment Information" (frequent). Don't understate it;
  a mismatch is a rejection. If the iOS build hides/softens peptides (recommended — see review
  notes), this can drop to 12+.

## Promotional text (170 char — editable anytime without review)
`Your body, mind, money, and purpose — one operating system. A daily protocol that adapts to you, tracks every domain, and turns big goals into a plan you actually run.`  (160)

## Description (4000 char max)
```
Most apps track one thing. Adonis runs your whole operating system.

Adonis is a personal protocol OS — a single daily system for the domains that actually
compound: your body, your mind, your money, your environment, and your purpose. You set the
goals; Adonis builds the daily routine, adapts it to how you're actually doing, and keeps the
whole thing moving.

THE DAILY LOOP
• A time-blocked routine that merges every domain into one day — wake to lights out.
• A 30-second daily check-in (mood, energy, sleep, stress, focus and more) that tunes what
  the app asks of you.
• A protocol score, streaks, and a 90-day consistency map so you can see the compounding.

BODY, DONE PROPERLY
• Adaptive calorie and macro targets that shift with your goal, your pace, and your recovery.
• Training with real set logging, PR detection, and a proper progression engine.
• Weight and progress-photo tracking with trends that mean something.

BEYOND FITNESS
• Money: credit-card strategy, a spend optimizer, and a wallet that works for you.
• Mind: guided breathwork, a meditation timer, and a focus stack.
• Travel, Image, Environment, Community, and Insights — each a real surface, not a stub.

BUILT TO GO BIG (Elite)
• The Bucket List turns an open-ended goal — "run a marathon," "buy a house," "see Egypt" —
  into a cross-domain strategy with a target date: money funds it, body preps you, travel
  handles the logistics. Each piece becomes a goal your daily routine already serves.

PRIVATE BY DESIGN
Your data is yours. Adonis is local-first; you sign in only to secure your account.

Adonis is invite-based today. Membership tiers unlock with an access code from your invite.

Adonis provides educational and organizational tools for health, fitness, and lifestyle. It is
not medical advice and does not diagnose, treat, or prescribe. Always consult a qualified
professional before starting any health, supplement, or training protocol.
```

## Keywords (100 char, comma-separated, no spaces after commas)
`protocol,habit,routine,fitness,macros,workout,streak,goals,discipline,wellness,productivity,self`  (99)

## URLs
- **Support URL** [JORREL]: `https://adonis.pro/support` — confirm this page exists (or use a
  mailto/contact page; Apple requires a reachable support URL).
- **Marketing URL**: `https://adonis.pro`
- **[JORREL] Privacy Policy URL — REQUIRED, blocking**: Apple will not accept a submission without
  a reachable privacy policy. `https://adonis.pro/privacy` must exist and cover: email (auth),
  camera/photos (progress photos, stored on-device), push tokens, and "no third-party tracking."
  If it doesn't exist yet, it must be created before submission. (This is the one hard blocker in
  this doc that isn't the Apple account.)

## App Review Information (the notes to Apple's reviewer — HIGH LEVERAGE)
This is where a peptide-adjacent health app is won or lost. Paste into "Notes":
```
REVIEW ACCESS
Adonis is invite-based. To review every tier:
- Complete onboarding, then sign up with any email (email confirmation is on).
- In Profile → "Access code", enter FOUNDER to unlock Elite (all features), or ADONIS2026 for Pro.
- There are NO in-app purchases. Tiers unlock only via these invite codes — no digital goods are
  sold in the app, so no IAP is involved.

ABOUT THE "PEPTIDES" CONTENT
The Peptides area is EDUCATIONAL and ORGANIZATIONAL. Adonis does not sell, ship, prescribe, or
facilitate the purchase of any substance inside the app. It presents research/education on
compounds and lets a user organize a personal protocol. Every relevant screen states that these
require a valid prescription and a provider consultation. Any "order" link opens an external
website in Safari (physical goods, sold and fulfilled entirely outside the app), consistent with
how retail apps link out. [JORREL: if you chose to hide the peptide pane on the iOS build via the
planned build flag, replace this paragraph with: "The peptide feature is disabled in the iOS build."]

NOTIFICATIONS & CAMERA
- Notifications (optional): a single daily reminder to run your routine. The app asks with an
  in-app explainer BEFORE the system prompt; it never cold-prompts.
- Camera/Photos (optional): progress photos, watermarked and stored ON-DEVICE only.

CONTACT: [JORREL@email] for anything during review.
```

## What's New (version 1.0)
`First release. Your body, mind, money, and purpose in one daily protocol.`

## Version / build
- Marketing version `1.0.0`, build `1`. (Set in Xcode target → General.)
```
