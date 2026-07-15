// lib/push/due.js
//
// Pure targeting logic for the daily routine-reminder push (iOS P3 Task 4
// — the SEND half of Premium Contract item 8; src/platform/push.js is the
// receive half, shipped in Task 3). Given every registered push_tokens
// row + "now", returns the subset that should get a notification on THIS
// cron run (app/api/cron/routine-reminders).
//
// WHY THIS ISN'T "skip users who already did today's routine": the app's
// routine-completion state lives entirely in localStorage (see
// src/services/storage.js / store.jsx) — nothing about a user's daily
// progress is ever written to Supabase. The server genuinely cannot know
// who's already run their protocol today. Building "smart" targeting here
// would mean silently pretending this function knows something it
// doesn't. So the reminder is deliberately simple and honest: a single
// daily "time for your protocol" nudge to every still-registered token —
// not a personalized nudge that skips people who already checked in.
// Real per-user targeting needs server-side routine-completion state,
// which is its own, larger feature (roadmap post-MVP #3, state-sync) —
// not something to fake with a shortcut here.
//
// What this function DOES do, honestly:
//   - dedup (user_id, token) pairs — defense-in-depth against a caller
//     passing an already-duplicated list; the table's own
//     unique(user_id, token) constraint is the primary guard against that.
//   - platform filter: only rows with platform === 'ios' pass, since
//     lib/push/apns.js only ever speaks APNs. A row with any other (or
//     missing) platform is excluded rather than assumed-iOS — a future
//     Android sender would need its own explicit row + filter, not a
//     silent guess by this one.
//   - a duplicate-send guard via last_notified_at, so re-running the cron
//     (a manual trigger, or a retried invocation) within the same ~day
//     can't double-send. This is a TIMER-based guard, not
//     completion-awareness — it has no idea whether the user did
//     anything, only when they were last notified.

// The cron runs once per day at a fixed UTC hour (see vercel.json), so
// "at least N hours since last send" is used instead of a same-calendar-
// day comparison — a calendar-day check would misfire at the UTC
// midnight boundary (e.g. notified 23:59 UTC, re-checked 00:01 UTC is a
// different calendar date only two minutes later). 20h (not a full 24h)
// leaves headroom for the cron firing a little early/late without
// spuriously skipping a legitimate next-day send. A row is due once
// elapsed time is >= this threshold.
const MIN_INTERVAL_MS = 20 * 60 * 60 * 1000;

/**
 * @param {Array<{user_id?: string, token?: string, platform?: string, last_notified_at?: string|null}>} tokens
 * @param {Date} [now]
 * @returns {Array} the subset of `tokens` due for a notification right now
 */
export function selectDueTokens(tokens, now = new Date()) {
  const nowMs = now.getTime();
  const seen = new Set();
  const due = [];

  for (const row of tokens || []) {
    if (!row || !row.token || !row.user_id) continue;
    if (row.platform !== 'ios') continue;

    const key = `${row.user_id}:${row.token}`;
    if (seen.has(key)) continue;
    seen.add(key);

    if (row.last_notified_at) {
      const lastMs = new Date(row.last_notified_at).getTime();
      const elapsedIsValid = !Number.isNaN(lastMs);
      if (elapsedIsValid && nowMs - lastMs < MIN_INTERVAL_MS) continue;
    }

    due.push(row);
  }

  return due;
}
