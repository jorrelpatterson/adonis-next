# Adonis iOS P2 — Sensory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development.
> Spec: `docs/superpowers/specs/2026-07-14-ios-premium-shell-design.md` — P2 covers Premium
> Contract items 5 (haptic vocabulary) + 6 (60fps/ProMotion animation). Branch: ios-p2-sensory (from main).

**Goal:** Real Taptic Engine feedback fired with intent across the app (not on every tap — on
the moments that matter), and every animation composited so it's glass-smooth at 60/120Hz.

**Architecture:** `src/design/haptics.js` is the ONLY file that branches on platform (the seam
its author pre-marked). Bridge it to @capacitor/haptics via the established dynamic-import +
isNativePlatform pattern (storage.js/status-bar.js). Web keeps navigator.vibrate. Components
keep calling `haptics.light()` etc. — they never learn about Capacitor.

**Reality gate:** the iOS Simulator has NO Taptic Engine — haptics are silent no-ops there.
So P2 verifies (a) bridge correctness by unit test, (b) the app runs wired without error in the
sim, (c) vocabulary completeness by code audit, (d) animation smoothness by code audit +
visual. The actual FEEL is a P4 TestFlight-on-device item (same gate the spec sets for haptics).

## Global Constraints
- All @capacitor/haptics access dynamic-imported behind isNativePlatform inside haptics.js
  only; web bundle must not eagerly include it (grep dist, same as P1 storage).
- Haptics stay ADDITIVE — never the sole feedback for an action (existing rule in haptics.js header).
- `reducedMotion()` currently gates haptics too. iOS "Reduce Motion" ≠ "no haptics" — but keep
  the existing gate for now (conservative; note it). Animation reduced-motion handling unchanged.
- Suite green (1071 + new); web + iOS builds clean; xcodebuild SUCCEEDED; commit per task + trailer.

### Task 1: Haptics native bridge + selection tick
**Files:** Modify `src/design/haptics.js`; Create `src/design/__tests__/haptics.test.js`;
`package.json` (+@capacitor/haptics); `npx cap sync ios`.
**Design:** rewrite the internal `vibrate`/dispatch so each semantic method routes to the
native plugin on iOS and navigator.vibrate on web. Map: `light/medium/heavy` →
`Haptics.impact({ style: ImpactStyle.Light/Medium/Heavy })`; `success/warning/error` →
`Haptics.notification({ type: NotificationType.Success/Warning/Error })`; NEW `selection()` →
`Haptics.selectionStart()`+`selectionChanged()` (or just `Haptics.selectionChanged()` — read
the plugin API and pick the one-shot tick form) for discrete slider/stepper ticks. Native calls
dynamic-import the plugin, guarded by a cached isNativePlatform() promise (copy storage.js's
`isNative()`). Keep `reducedMotion()` gate. Web path: keep the current navigator.vibrate patterns.
Export the same `haptics` object shape + the new `haptics.selection`.
**Tests:** vi.mock @capacitor/core + @capacitor/haptics; native: `haptics.light()` calls
`Haptics.impact({style: ImpactStyle.Light})`, success→notification Success, selection→the chosen
selection call; web (isNativePlatform false): navigator.vibrate called, plugin NOT called;
reducedMotion true → neither fires. Use fake navigator.vibrate spy.
**Verify:** `npx vitest run src/design` green; full suite; `npm run build:app` + grep dist —
@capacitor/haptics only in a lazy chunk, not the 760K main; `npm run build:ios && npx cap sync
ios` clean; xcodebuild SUCCEEDED (`cd ios/App && xcodebuild -project App.xcodeproj -scheme App
-destination 'platform=iOS Simulator,id=00528FD2-AFAC-4F3A-92DC-BD268221BDCF' -derivedDataPath
/tmp/adonis-ios-dd build 2>&1 | grep -E "BUILD SUCCEEDED|error:"`).
Commit `feat(ios-p2): haptics bridge to Taptic Engine + selection tick`.

### Task 2: Haptic vocabulary — audit + fill the gaps
**Files:** audit ALL current call sites (grep `haptics\.` in src, excluding tests/haptics.js);
Modify wherever a Contract-item-5 touchpoint is missing or wrong. Known gaps found in recon:
- **Tab switch → light**: `src/app/TabNav.jsx` does NOT call haptics today — add `haptics.light()`
  on tab change (read the onTabChange/onClick handler).
- **Check-in slider steps → selection ticks**: `src/protocols/_system/checkin/CheckinModal.jsx`
  isn't a call site — the 8 mood/energy/etc. sliders should fire `haptics.selection()` on each
  discrete value change (read how the slider steps; fire on step change, NOT on every pixel).
- **Task complete → light**: verify `src/routine/RoutineView.jsx` (a call site) fires light on
  check-off (not just on other interactions); the Home routine checkbox path too if separate.
- **Save/confirm → medium**: audit save actions (onboarding "Build my protocol", food/weight
  log saves, goal creation) — confirm medium fires; add where missing.
- **Celebrations → success**: PRCelebration/GoalCompleteScreen/StreakMilestone already call
  haptics — verify they use `success` (the burst), not `light`.
**Rule:** additive only; don't add haptics to scroll, typing, or passive events. Document the
final vocabulary map in the haptics.js header comment (what fires where) so it's the single
source of the vocabulary.
**Tests:** where a component newly fires haptics, a focused test asserting the call on the right
event (mock haptics, fire the event, assert). Keep existing green.
**Verify:** suite; the vocabulary map comment is complete; sim run (app boots, interactions
work, no errors — haptics silent in sim). Commit `feat(ios-p2): complete haptic vocabulary (tab/slider/task/save/celebrate)`.

### Task 3: Animation compositing audit (Contract item 6)
**Files:** audit `src/design/animations.css` (~454 lines of keyframes) + any inline
`@keyframes`/`transition` in components; Modify offenders.
**Method:** find keyframes/transitions animating NON-composited properties (width, height, top,
left, right, bottom, margin, padding — these trigger layout/paint and jank). The composited set
is transform + opacity (+ filter, carefully). For each offender: rewrite to transform (translate/
scale) or opacity where the visual is equivalent; where a layout animation is genuinely needed
(e.g. a height accordion), note it as an accepted exception (rare). Add `will-change`
sparingly only where a heavy repeating animation benefits (AmbientBackdrop orbs?). Confirm the
existing `.adn-reduced-motion` kill-switch still covers everything.
**Tests:** CSS isn't unit-testable meaningfully; the gate is the audit writeup (list every
keyframe, its animated properties, verdict) + visual smoothness. Keep suite green (no JS change
likely).
**Verify:** `npm run build:app` clean; web home/routine screenshots unchanged; document the
audit table in the report. Commit `perf(ios-p2): composite all animations (transform/opacity) for 60/120Hz`.

### Task 4: Sound + silent-switch policy + P2 close
**Files:** `src/design/sound.js` audit; possibly `capacitor.config.json` or a native audio
session note; report.
**Policy (spec ⚖️ default = respect the switch):** the SFX (sound.js) should honor BOTH the
app's own mute setting AND the iOS hardware silent switch. Determine current behavior: WKWebView
HTML5/WebAudio defaults to the `ambient`/`soloAmbient` session category which IS silenced by the
hardware switch — verify that's the effective behavior (SFX go silent with the switch flipped)
and that the app's mute toggle (AppSettings, `adonis_sound_muted`) still works independently.
If it doesn't respect the switch by default, document the native fix (audio session category)
but only implement if trivial — else record as a P4 device-verify item (the switch, like
haptics, isn't testable in sim).
**P2 close:** full suite + web build + build:ios + cap sync + xcodebuild all green; sim boot
screenshot (app runs wired); merge ios-p2-sensory → main + push (web-safe: haptics no-op web via
navigator.vibrate unchanged for web users; animation fixes are pure improvements — verify web
screenshots unchanged + post-deploy /app healthy). Spec P2 checkboxes; memory + report to Jorrel
incl. what's now a P4-device item (haptic feel, silent switch).
Commit `feat(ios-p2): sound/silent-switch policy + P2 close`.

## Self-review notes
- The seam discipline (haptics.js only) means Task 1 is the whole native surface; Tasks 2-4 are
  pure app-level vocabulary/polish that also benefit web (Android vibrate, smoother animations).
- Haptic FEEL + silent switch are honestly un-verifiable in sim → explicitly P4 device-pass,
  same as P1's keyboard/gesture items. Don't claim device-verified what only ran in sim.
