// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { StateProvider } from './state/store';
import { runMigrationIfNeeded } from './state/migration';
import { restoreIfEvicted } from './platform/storage';
import { ToastProvider } from './design/Toast';
import App from './app/App';
import './design/fonts.css';
import './design/animations.css';
import './protocols/register-all';

// Boot sequence: on iOS, restore localStorage from the native Preferences
// mirror BEFORE anything reads it (WebView storage may have been evicted while
// suspended), THEN run the v1→v2 migration, THEN mount. store.jsx's loadState
// runs synchronously inside the first render, so the restore must complete
// first. restoreIfEvicted() resolves instantly on web (no-op).
restoreIfEvicted().then(() => {
  runMigrationIfNeeded();

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
