// src/design/haptics.js
//
// Haptics — abstraction over native (Capacitor) and web vibration.
//
// On web: best-effort using navigator.vibrate (Android Chrome only; iOS
// Safari/WKWebView has never implemented the Vibration API — silently
// ignored, even inside this app's own native shell). Web haptics are weak —
// the point of a stable semantic API here is that it becomes properly
// tactile the moment the app runs inside Capacitor, without any call site
// changing.
//
// Premium apps fire haptics with intent: not on every tap, but on:
//   - discrete nav/state change (tab switch, task check-off)  → light
//   - successful save / confirm (the terminal tap of a form)  → medium
//   - celebration burst (PR / goal complete / streak tier)    → success
//   - error / destructive confirm                             → warning / error
//   - discrete slider/stepper/picker tick                     → selection
// All call sites should be additive — never the only feedback for an action.
// Never fire on scroll, typing, or other passive/continuous events.
//
// --- Native bridge -------------------------------------------------------
// When Capacitor-wrapped (isNative() below resolves true), each method
// fires the matching @capacitor/haptics call instead of navigator.vibrate,
// via a dynamic import — so a plain web bundle never pulls the native
// plugin in (Vite splits it into a chunk a browser tab never fetches; same
// contract as platform/storage.js and platform/status-bar.js). This file
// stays the ONLY place that branches on platform, per the seam contract
// this file was left with.
//
// isNative() below is a THIRD copy of storage.js's cached
// Capacitor.isNativePlatform() promise (status-bar.js already copied it
// once — see its header comment). This repo's established convention for
// platform-bridge modules is a self-contained copy per file, not a shared
// helper, so each bridge stays independently readable/removable without
// touching the others. Kept identical on purpose.
//
// --- Vocabulary map (semantic intent → web pattern → native call) --------
//   light     → vibrate(8)                    → Haptics.impact({ style: ImpactStyle.Light })
//   medium    → vibrate(15)                   → Haptics.impact({ style: ImpactStyle.Medium })
//   heavy     → vibrate([20, 10, 20])         → Haptics.impact({ style: ImpactStyle.Heavy })
//   success   → vibrate([10, 30, 10])         → Haptics.notification({ type: NotificationType.Success })
//   warning   → vibrate([20, 40, 20])         → Haptics.notification({ type: NotificationType.Warning })
//   error     → vibrate([40, 30, 40, 30, 40]) → Haptics.notification({ type: NotificationType.Error })
//   selection → vibrate(5)                    → selectionStart() -> selectionChanged() -> selectionEnd()
//
// selection() is NEW: a discrete one-shot tick for slider/stepper controls
// (check-in sliders, iOS P2 Task 2). @capacitor/haptics' selectionChanged()
// is NOT a standalone one-shot — verified against the plugin's own source
// (not just its doc prose), both the native implementation and its web
// fallback:
//
//   ios/Sources/HapticsPlugin/Haptics.swift:
//     func selectionChanged() {
//       if let generator = self.selectionFeedbackGenerator {
//         generator.selectionChanged(); generator.prepare()
//       }
//     }
//   src/web.ts (HapticsWeb):
//     async selectionChanged() {
//       if (this.selectionStarted) { this.vibrateWithPattern([70]); }
//     }
//
// Both are no-ops unless selectionStart() primed them first
// (selectionFeedbackGenerator / selectionStarted are only ever set there).
// A bare selectionChanged() call — with no prior selectionStart() — fires
// NOTHING, on either platform. So the crispest RELIABLE one-shot tick is
// the full triplet, fired back to back: selectionStart() (creates + primes
// a fresh UISelectionFeedbackGenerator), selectionChanged() (the actual
// tick), selectionEnd() (releases the generator so it doesn't linger
// between discrete taps). This file has no concept of a continuous drag
// gesture — a slider that wants one start/many-changed/one-end over a drag
// can call the native plugin directly; haptics.selection() only exposes
// the discrete one-shot form call sites need.
//
// --- Call-site inventory (WHERE each fires — iOS P2 Task 2 audit) --------
// Single source of truth for the vocabulary in practice. Additive only —
// none of these are the sole feedback for their action, and none fire on
// scroll/typing/passive events. Kept in sync by hand; re-grep
// `grep -rn "haptics\." src/ | grep -v "__tests__\|design/haptics.js"`
// whenever a call site is added, removed, or its trigger condition changes.
//
//   light
//     - app/TabNav.jsx              — tab switch (only when the active tab
//                                      actually changes, not re-tapping it)
//     - routine/RoutineView.jsx      — day-chip select (only on day change)
//     - routine/RoutineView.jsx      — task check-off (only completing;
//                                      unchecking stays silent)
//     - views/components/TaskContextMenu.jsx — any long-press menu action
//     - views/components/FoodLogger.jsx      — meal removed
//     - views/components/PhotoJournal.jsx    — photo deleted; lightbox open
//     - design/Toast.jsx             — info toast
//
//   medium
//     - onboarding/OnboardingFlow.jsx — "Build my protocol" (final save)
//     - goals/GoalSetup.jsx           — "Activate Goal"
//     - views/components/FoodLogger.jsx   — meal logged
//     - views/components/WeightLogger.jsx — weight logged/updated
//     - design/useLongPress.js        — long-press hold triggers
//     - design/PullToRefresh.jsx      — pull-to-refresh triggered
//
//   success (celebration burst)
//     - views/components/PRCelebration.jsx    — new PR logged
//     - views/components/GoalCompleteScreen.jsx — goal reaches 100%
//     - views/components/StreakMilestone.jsx  — streak tier crossed
//     - onboarding/CalculatingScreen.jsx  — "your protocol is ready" reveal
//     - views/components/PhotoJournal.jsx — photo uploaded
//     - design/Select.jsx              — bottom-sheet option picked (pre-
//                                        existing; a candidate for
//                                        `selection` in a future pass, since
//                                        it's a discrete picker choice, not
//                                        a celebration — left as-is here,
//                                        out of this task's named scope)
//     - design/Toast.jsx               — success toast
//     - design/ActionSheet.jsx         — non-destructive confirm
//
//   selection
//     - protocols/_system/checkin/CheckinModal.jsx — check-in rating pick
//       (8 mood/energy/... fields; button-row style, so each button pick
//       fires once — not a drag gesture, so no continuous tick stream)
//
//   warning / error
//     - design/Toast.jsx        — warning / error toast
//     - design/ActionSheet.jsx  — warning on destructive confirm
//
// NOT wired (found during the iOS P2 Task 2 audit, same "task complete"
// semantics as RoutineView's check-off, but out of this task's named
// scope — flagged for a follow-up, not fixed here): the per-domain browse
// views each have their own independent task checkbox that never routes
// through RoutineView — views/PurposeView.jsx, views/CommunityView.jsx,
// views/ImageView.jsx, views/EnvironmentView.jsx, views/TravelView.jsx,
// views/MoneyView.jsx, views/MindView.jsx.

const isClient = typeof window !== 'undefined';

const reducedMotion = () =>
  isClient && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Cached across calls so every haptic firing doesn't re-import
// @capacitor/core — resolved once per app session. Copy of the pattern in
// src/platform/storage.js / src/platform/status-bar.js (see header above).
let nativePromise = null;

function isNative() {
  if (!nativePromise) {
    nativePromise = import('@capacitor/core')
      .then(({ Capacitor }) => Capacitor.isNativePlatform())
      .catch(() => false);
  }
  return nativePromise;
}

function webVibrate(pattern) {
  if (navigator && typeof navigator.vibrate === 'function') {
    try { navigator.vibrate(pattern); } catch { /* noop */ }
  }
}

/**
 * Fires `webPattern` via navigator.vibrate when not running inside
 * Capacitor, or `nativeWork` (a `(hapticsModule) => Promise` callback)
 * against the real @capacitor/haptics plugin when it is — never both.
 * Gated by reducedMotion() and isClient. Fire-and-forget: never throws,
 * never returns a value a caller depends on. Every haptics.* call site
 * treats this as additive feedback, not the sole signal for an action.
 */
function fire(webPattern, nativeWork) {
  if (!isClient || reducedMotion()) return;
  isNative()
    .then((native) => {
      if (!native) {
        webVibrate(webPattern);
        return;
      }
      return import('@capacitor/haptics').then(nativeWork);
    })
    .catch(() => {
      // Best-effort — a failed platform check or native plugin call must
      // never surface to the caller (same contract as
      // storage.js's mirrorSave / status-bar.js's initStatusBar).
    });
}

export const haptics = {
  light: () =>
    fire(8, ({ Haptics, ImpactStyle }) => Haptics.impact({ style: ImpactStyle.Light })),
  medium: () =>
    fire(15, ({ Haptics, ImpactStyle }) => Haptics.impact({ style: ImpactStyle.Medium })),
  heavy: () =>
    fire([20, 10, 20], ({ Haptics, ImpactStyle }) => Haptics.impact({ style: ImpactStyle.Heavy })),
  success: () =>
    fire([10, 30, 10], ({ Haptics, NotificationType }) =>
      Haptics.notification({ type: NotificationType.Success })
    ),
  warning: () =>
    fire([20, 40, 20], ({ Haptics, NotificationType }) =>
      Haptics.notification({ type: NotificationType.Warning })
    ),
  error: () =>
    fire([40, 30, 40, 30, 40], ({ Haptics, NotificationType }) =>
      Haptics.notification({ type: NotificationType.Error })
    ),
  // Discrete one-shot tick — see file header for why all three calls are
  // required (a bare selectionChanged() is a documented no-op).
  selection: () =>
    fire(5, ({ Haptics }) =>
      Haptics.selectionStart()
        .then(() => Haptics.selectionChanged())
        .then(() => Haptics.selectionEnd())
    ),
};
