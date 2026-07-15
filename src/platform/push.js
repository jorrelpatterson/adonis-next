// src/platform/push.js
//
// Push-notification adapter (Premium Contract item 8) — routine-reminder
// push. This module is the APP side only: permission + token registration +
// receive/tap handling. The SEND path (a server cron hitting APNs) is a
// separate, later task — this file never talks to APNs directly, it only
// wires the on-device half of the round trip.
//
// isNative() below is another copy of storage.js's cached
// Capacitor.isNativePlatform() promise — same self-contained-copy-per-file
// convention as camera.js/deep-link.js/status-bar.js (see camera.js's
// header for why this repo doesn't share one helper across bridges: each
// platform-bridge module stays independently readable/removable).
//
// On web this whole module is inert: @capacitor/core and
// @capacitor/push-notifications are only ever reached via a dynamic
// import() behind isNativePlatform(), so Vite splits the real plugin into a
// chunk a browser tab never fetches — getPushPermissionState() resolves
// 'denied' and requestAndRegister()/initPushListeners() no-op without
// importing anything.
//
// PREMIUM CONTRACT: this module never itself triggers the OS permission
// dialog on app boot or on a cold tap — requestAndRegister() (the only
// function that calls PushNotifications.requestPermissions(), which is what
// actually surfaces iOS's real, ONE-SHOT system prompt) is only ever called
// from PushPermissionExplainer.jsx's "Enable" button, after the user has
// already seen the value-prop card. iOS only lets an app ask once per
// install — a "denied" answer can only be reversed by the user in Settings
// — so cold-prompting with no context is how apps burn that one shot on a
// "no". See PushPermissionExplainer.jsx's header for the explainer-first
// contract this module depends on its caller upholding.
//
// SIMULATOR REALITY (flagged per this task's brief): requestPermissions()
// and the sim's own permission-prompt UI both work fine in the Simulator —
// what does NOT reliably work there is a real APNs token: `register()`
// kicks off the OS registration request (and resolves once that request is
// ACCEPTED, not once a token arrives), but the Simulator has no APNs
// connectivity, so the 'registration' event this module listens for may
// simply never fire there. That is expected, not a bug — this module never
// awaits a token, so "no token ever arrives" degrades silently rather than
// hanging or throwing. Real token acquisition needs a physical device with
// a provisioning profile that has the Push Notifications capability signed
// — a P4 (device-verify) item. The RECEIVE + tap path
// (initPushListeners/pushNotificationActionPerformed below) has nothing to
// do with tokens and IS fully Simulator-testable via `xcrun simctl push`.

let nativePromise = null;

function isNative() {
  if (!nativePromise) {
    nativePromise = import('@capacitor/core')
      .then(({ Capacitor }) => Capacitor.isNativePlatform())
      .catch(() => false);
  }
  return nativePromise;
}

// @capacitor/core's PermissionState is 'prompt' | 'prompt-with-rationale' |
// 'granted' | 'denied' (node_modules/@capacitor/core/types/definitions.d.ts)
// — this app's own contract only needs three buckets, so
// 'prompt-with-rationale' (iOS: asked before via a different flow, still
// eligible to ask again) folds into 'prompt' alongside "never asked",
// same as any other not-yet-decided value.
function normalizePermission(receive) {
  if (receive === 'granted') return 'granted';
  if (receive === 'denied') return 'denied';
  return 'prompt';
}

/**
 * Current push-permission state WITHOUT prompting — 'prompt' (never asked,
 * or still eligible to be asked) | 'granted' | 'denied'. Native only:
 * resolves 'denied' on web without importing the plugin, so a caller's
 * `state === 'prompt'` gate (this task's Home-tab "Turn on reminders" card)
 * can never fire there even without a separate isNativePlatform() check of
 * its own.
 */
export async function getPushPermissionState() {
  const native = await isNative();
  if (!native) return 'denied';

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const { receive } = await PushNotifications.checkPermissions();
    return normalizePermission(receive);
  } catch {
    // Best-effort, matching every other platform/*.js adapter's contract —
    // an unexpected plugin failure degrades to "denied" (the safe, inert
    // outcome for a caller's `=== 'prompt'` gate) rather than throwing.
    return 'denied';
  }
}

/**
 * Triggers the REAL iOS system permission prompt (PushNotifications.
 * requestPermissions()) and, if granted, kicks off native APNs
 * registration. Callers MUST show PushPermissionExplainer first — see this
 * file's header and that component's for why this repo never cold-prompts.
 * Resolves the post-request state ('granted' | 'denied' — requestPermissions
 * always settles one way or the other, never leaves it at 'prompt'). No-op
 * on web, resolving 'denied' without importing the plugin (mirrors
 * getPushPermissionState()'s web contract).
 *
 * `saveToken` is caller-injected — PushPermissionExplainer.jsx wires one
 * that POSTs to Task 4's `/api/push/register` with the signed-in user's
 * bearer token. It's invoked at most once, with the APNs token STRING
 * (`token.value` — see @capacitor/push-notifications' `Token` type), if and
 * when the native `registration` event ever fires; per this file's header,
 * that may never happen in the Simulator (no APNs there), which is fine —
 * nothing here awaits it. The listener is removed after its first fire so
 * it can't double-save. `saveToken` itself is called inside a try/catch so
 * a throwing/rejecting implementation (e.g. Task 4's endpoint 404ing until
 * it ships, or a plain network failure) can never surface as an unhandled
 * rejection off this native event callback.
 */
export async function requestAndRegister(saveToken) {
  const native = await isNative();
  if (!native) return 'denied';

  let PushNotifications;
  try {
    ({ PushNotifications } = await import('@capacitor/push-notifications'));
  } catch {
    return 'denied';
  }

  let state;
  try {
    const { receive } = await PushNotifications.requestPermissions();
    state = normalizePermission(receive);
  } catch {
    return 'denied';
  }
  if (state !== 'granted') return state;

  // Registration plumbing is best-effort and deliberately isolated from the
  // permission result above: permission is a device-level OS fact that's
  // already settled by this point, so a failure wiring up registration
  // below must not change the (accurate) 'granted' this function returns.
  try {
    let handle;
    const onRegistration = async (token) => {
      try {
        await handle?.remove();
      } catch {
        // Best-effort cleanup — a failed unlisten must never crash the
        // native event callback.
      }
      try {
        await saveToken?.(token?.value);
      } catch {
        // Best-effort — see this function's header re: saveToken.
      }
    };
    handle = await PushNotifications.addListener('registration', onRegistration);
    // Fire-and-forget from here on: register() resolves once the OS
    // ACCEPTS the registration request, not once a token arrives (that's
    // the separate, possibly-never-on-Simulator 'registration' event
    // handled above) — see this file's header.
    await PushNotifications.register();
  } catch {
    // Best-effort — see comment above this try block.
  }
  return state;
}

/**
 * Registers the native listeners for an ALREADY-decided push permission —
 * safe to call unconditionally at boot (see App.jsx), independent of
 * requestAndRegister/the explainer card. No-op on web. Best-effort on
 * native, same contract as platform/deep-link.js's initDeepLinks: a failed
 * listener registration must never crash boot.
 *
 * - `pushNotificationReceived` fires when a push arrives while the app is
 *   in the FOREGROUND. Registered (so a future in-app toast has a stable
 *   hook) but currently a no-op — the brief calls a foreground toast
 *   optional, not wired in this pass.
 * - `pushNotificationActionPerformed` fires when the user taps a
 *   notification (foreground, background, or cold-launch) — this is the
 *   Simulator-testable path (`xcrun simctl push`, then tap the banner).
 *   This task's reminder payload nests routing info top-level alongside
 *   `aps` (e.g. `{"aps": {...}, "tab": "routine"}`); Capacitor surfaces
 *   every non-`aps` userInfo key under `notification.data` (`any`, per the
 *   plugin's own `PushNotificationSchema` type), so `tab` lands at
 *   `event.notification.data.tab`. Hands it to `onTapRoute` (App.jsx wires
 *   its tab-setter) so the app can switch tabs. Silently does nothing if
 *   `tab` is absent — e.g. some future push type with no routing payload.
 */
export async function initPushListeners(onTapRoute) {
  const native = await isNative();
  if (!native) return;

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    PushNotifications.addListener('pushNotificationReceived', () => {
      // Optional foreground toast — not wired in this pass (see header).
    });
    PushNotifications.addListener('pushNotificationActionPerformed', (event) => {
      const tab = event?.notification?.data?.tab;
      if (tab) onTapRoute?.(tab);
    });
  } catch {
    // Best-effort — a failed listener registration must never crash boot.
  }
}
