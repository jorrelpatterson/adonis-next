// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { StateProvider } from './state/store';
import { runMigrationIfNeeded } from './state/migration';
import { restoreIfEvicted } from './platform/storage';
import { initStatusBar } from './platform/status-bar';
import { initDeepLinks } from './platform/deep-link';
import { isNativePlatform } from './platform/camera';
import { setNativePlatform } from './services/auth';
import { ToastProvider } from './design/Toast';
import App from './app/App';
import './design/fonts.css';
import './design/safe-area.css';
import './design/animations.css';
import './design/native-shell.css';
import './protocols/register-all';

// Boot sequence: on iOS, restore localStorage from the native Preferences
// mirror BEFORE anything reads it (WebView storage may have been evicted while
// suspended), THEN run the v1→v2 migration, THEN mount. store.jsx's loadState
// runs synchronously inside the first render, so the restore must complete
// first. restoreIfEvicted() resolves instantly on web (no-op).
restoreIfEvicted().then(async () => {
  runMigrationIfNeeded();
  // Fire-and-forget, no-op on web (see platform/status-bar.js) — doesn't
  // gate mount, same as this boot sequence never gating on mirrorSave.
  initStatusBar();

  // services/auth.js's appRedirectUrl() needs to know native vs. web
  // SYNCHRONOUSLY (it's read inline while building supabase.auth.signUp's
  // options — see that file's header), but Capacitor's own native check is
  // async — so it's resolved ONCE here and cached into auth.js's
  // module-level flag. Unlike initStatusBar/initDeepLinks below, this IS
  // awaited before mount: it must be settled before App can render any UI
  // that could call signUpWithEmail (see auth.js's header for why this is
  // race-free).
  setNativePlatform(await isNativePlatform());

  // Fire-and-forget, no-op on web — completes a pending Supabase session if
  // this launch was triggered by tapping an email-confirmation adonis://
  // link (see platform/deep-link.js). Nothing else to do in the callback:
  // exchangeCodeForSession/setSession fire Supabase's own auth-state event,
  // which useAuth.js is already subscribed to (services/auth.js's
  // onAuthStateChange) — the app's user/tier state (and therefore the UI)
  // updates on its own once that fires.
  initDeepLinks(() => {});

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <StateProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </StateProvider>
    </React.StrictMode>
  );
});
