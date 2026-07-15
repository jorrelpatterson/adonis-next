// src/app/PushPermissionExplainer.jsx
//
// Premium pre-permission explainer (Premium Contract item 8) — the card
// shown BEFORE ever calling platform/push.js's requestAndRegister(), which
// is what actually triggers iOS's real, ONE-SHOT system permission dialog.
// iOS only lets an app ask once per install (a "denied" answer can only be
// reversed by the user in Settings, not re-prompted) — cold-prompting on
// first launch, with no context, is how apps burn that one shot on a "no".
// This card states the value first; requestAndRegister() is only ever
// called from the "Enable" tap below.
//
// Shown AT MOST ONCE per install: both "Enable" and "Not now" persist
// PUSH_ASKED_KEY in localStorage, and this component self-gates on it
// (renders null once set) — a "no" is a real answer this app respects, not
// something to re-nag past on the next Home visit. This self-gate is
// independent of (and in addition to) the async native/'prompt'-state
// check the caller (App.jsx) does before ever mounting this component —
// see App.jsx's wiring for that half; this file owns the "have we already
// asked" half so it stays correct even in isolation.
//
// Rendered inline as a small dismissible card (NOT a full-screen overlay)
// — per the brief's "simplest clean approach", App.jsx mounts this on the
// Home tab. Inline placement means it already inherits the shell's
// safe-area top padding (App.jsx's scroll container); it doesn't need its
// own safe-area insets the way a fixed/full-screen surface would.

import React, { useState } from 'react';
import { P, FN, FD } from '../design/theme';
import { s } from '../design/styles';
import { requestAndRegister } from '../platform/push';
import { getSession } from '../services/auth';

export const PUSH_ASKED_KEY = 'adonis_push_asked';

function hasAlreadyAsked() {
  try {
    return localStorage.getItem(PUSH_ASKED_KEY) === '1';
  } catch {
    // Storage unavailable (private mode, quota) — fail toward NOT re-asking
    // rather than risk showing the card on every render.
    return true;
  }
}

function persistAsked() {
  try {
    localStorage.setItem(PUSH_ASKED_KEY, '1');
  } catch {
    // Best-effort — see hasAlreadyAsked().
  }
}

// Injected into requestAndRegister() as `saveToken` — POSTs the APNs token
// to Task 4's /api/push/register with the signed-in user's bearer token.
// That endpoint doesn't exist yet as of THIS task (P3 Task 3 is app-side
// only; Task 4 builds the send path + endpoint) — a 404 (or any network
// failure) is caught and swallowed here, matching every other
// platform/*.js adapter's best-effort contract. The session is fetched
// fresh here rather than threaded in as a prop so a stale/expired token
// captured at mount time is never used.
async function saveToken(token) {
  try {
    const { session } = await getSession();
    await fetch('/api/push/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({ token }),
    });
  } catch {
    // Best-effort — Task 4's endpoint may 404 until it ships; a network
    // failure here must never surface to the user.
  }
}

export default function PushPermissionExplainer({ onDismiss }) {
  const [asked, setAsked] = useState(hasAlreadyAsked);
  const [busy, setBusy] = useState(false);

  if (asked) return null;

  const dismiss = () => {
    persistAsked();
    setAsked(true);
    onDismiss?.();
  };

  const handleEnable = async () => {
    setBusy(true);
    try {
      // Triggers the real iOS prompt — see this file's header for why this
      // is gated behind an explicit tap, never called on mount/boot.
      await requestAndRegister(saveToken);
    } finally {
      setBusy(false);
      dismiss();
    }
  };

  return (
    <div
      data-testid="push-permission-explainer"
      className="adn-reveal"
      style={{
        ...s.card, padding: 16, marginBottom: 14,
        display: 'flex', alignItems: 'flex-start', gap: 12,
      }}
    >
      <span style={{ fontSize: 22, lineHeight: 1 }}>{'\u{1F514}'}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: FD, fontSize: 16, fontWeight: 300, fontStyle: 'italic', color: P.txS, marginBottom: 4 }}>
          Turn on reminders
        </div>
        <div style={{ fontFamily: FN, fontSize: 11, color: P.txD, lineHeight: 1.5, marginBottom: 12 }}>
          A quiet nudge when it's time to run your protocol — nothing else.
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleEnable}
            disabled={busy}
            style={{
              ...s.btn, ...s.pri, flex: 1, justifyContent: 'center',
              fontSize: 12, padding: '10px 16px', minHeight: 38,
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? '…' : 'Enable'}
          </button>
          <button
            onClick={dismiss}
            disabled={busy}
            style={{
              ...s.btn, ...s.out, flex: 1, justifyContent: 'center',
              fontSize: 12, padding: '10px 16px', minHeight: 38,
              opacity: busy ? 0.6 : 1,
            }}
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
