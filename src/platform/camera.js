// src/platform/camera.js
//
// Native camera adapter for PhotoJournal (Premium Contract item 9) — lets
// progress-photo capture use the real iOS camera/photo-library picker
// (@capacitor/camera) instead of a bare `<input type="file">` when running
// inside the native shell.
//
// isNative() below is a fourth copy of storage.js's cached
// Capacitor.isNativePlatform() promise (status-bar.js and haptics.js each
// already copied it once — see haptics.js's header comment). This repo's
// established convention for platform-bridge modules is a self-contained
// copy per file, not a shared helper, so each bridge stays independently
// readable/removable without touching the others. Kept identical on
// purpose.
//
// On web this whole module is inert: @capacitor/core and @capacitor/camera
// are only ever reached via dynamic import() behind isNativePlatform(), so
// Vite splits @capacitor/camera into a chunk a browser tab never fetches
// (PhotoJournal's web path never even calls pickProgressPhoto() — see that
// component for why).

let nativePromise = null;

function isNative() {
  if (!nativePromise) {
    nativePromise = import('@capacitor/core')
      .then(({ Capacitor }) => Capacitor.isNativePlatform())
      .catch(() => false);
  }
  return nativePromise;
}

// Exported so PhotoJournal can decide UP FRONT (before the user taps "Add")
// whether to route through the native picker or the web `<input>` — it
// resolves this once on mount into state so the tap handler itself stays
// synchronous. That matters: WebKit requires `<input type="file">.click()`
// to fire synchronously inside a real user-gesture handler, so the web
// branch must never `await` this check before calling `.click()`.
export const isNativePlatform = isNative;

/**
 * Opens the native camera/photo-library prompt and resolves with a dataUrl
 * of the chosen photo. Resolves `null` — never throws — when: running on
 * web (PhotoJournal's own `<input capture>` path handles that case, this
 * function is simply never reached there), the user cancels the picker, or
 * the native call fails for any other reason (permission denied, etc.) —
 * all three are treated identically by the caller as "nothing selected."
 */
export async function pickProgressPhoto() {
  const native = await isNative();
  if (!native) return null;

  try {
    const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
    const photo = await Camera.getPhoto({
      source: CameraSource.Prompt, // lets the user choose camera vs. library
      resultType: CameraResultType.DataUrl,
      quality: 80,
    });
    return photo.dataUrl ?? null;
  } catch {
    // Camera.getPhoto REJECTS on user-cancel (not a resolved falsy value) —
    // this catch is the normal/expected path when someone backs out of the
    // picker, not just an error case.
    return null;
  }
}
