// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { StateProvider } from './state/store';
import { runMigrationIfNeeded } from './state/migration';
import { ToastProvider } from './design/Toast';
import App from './app/App';
import './design/fonts.css';
import './design/animations.css';
import './protocols/register-all';

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
