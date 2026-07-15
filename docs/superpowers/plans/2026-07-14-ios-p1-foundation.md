# Adonis iOS P1 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development.
> Spec: `docs/superpowers/specs/2026-07-14-ios-premium-shell-design.md` — P1 covers Premium
> Contract items 1-4, 7, 11(a). Branch: continue on `ios-p0-spike` (rename at merge).

**Goal:** Kill every foundation-level webview tell: safe areas both edges, bundled fonts
(offline-proof first paint), zero boot flash (native splash + dark shell), keyboard discipline,
overscroll/tap-highlight/callout killers, durable storage (iOS eviction-proof), app icons.

**Architecture:** Adapters, not forks — one file knows the platform. Web build behavior may
IMPROVE (bundled fonts = faster first paint) but must never regress; web suite + a visual
check gate the merge. Storage uses the **mirror-and-restore** pattern so `loadState` stays
synchronous: localStorage remains the read path everywhere; on native, every debounced save
also mirrors to Capacitor Preferences (async, fire-and-forget), and boot restores from
Preferences into localStorage BEFORE React mounts iff localStorage is empty (eviction/fresh
install). Web path stays byte-identical at runtime.

## Global Constraints
- The web Vite config and web behavior stay untouched except: fonts move from Google-CDN
  `@import` (animations.css:12) to bundled `@font-face` — an improvement, verified visually.
- All Capacitor plugin usage goes through `src/platform/*` or the existing seam files
  (`haptics.js` pattern); React components never import @capacitor/* directly.
- Native plugin calls are dynamic-imported + guarded (`Capacitor.isNativePlatform()`), so
  the WEB bundle tree-shakes them and vitest needs no Capacitor mocks except in adapter tests.
- Suite green (1057 + new); `npm run build` (web chain) clean; `npm run build:ios` +
  `npx cap sync ios` + xcodebuild green; simulator boot screenshot per task that changes
  visible chrome. Commit per task + trailer.
- Fonts: Cormorant Garamond (300/400/500/600 + italics 300/400), Outfit (200-700), JetBrains
  Mono (400/500/700) — woff2 only, subset latin. All three are OFL-licensed (bundling is
  compliant; note licenses in the fonts dir).

### Task 1: Bundled fonts (Contract item 2)
**Files:** Create `src/static/fonts/*.woff2` + `src/static/fonts/OFL-licenses.txt` +
`src/design/fonts.css` (@font-face set, `font-display: swap` web / the files ARE local so
first paint is styled); Modify `src/design/animations.css` (DELETE the @import line),
`index.html` or `src/main.jsx` (import fonts.css before animations.css).
**Steps:** download latin-subset woff2 from Google Fonts CSS API (curl with a modern UA to
get woff2 URLs, then fetch each from gstatic; verify non-empty + `file` says WOFF2); write
@font-face with exact family names theme.js expects ('Cormorant Garamond', 'Outfit',
'JetBrains Mono'); build web + grep dist for zero `googleapis`; screenshot web home tab and
compare against phase-4 baseline by eye (identical type rendering); full suite.
**Verify:** `grep -r googleapis public/app src/` → only comments; offline-render argument:
fonts resolve from same-origin bundle. Commit `feat(ios-p1): bundle brand fonts (offline-proof first paint)`.

### Task 2: Storage adapter — mirror-and-restore (Contract item 11a)
**Files:** Create `src/platform/storage.js` + `__tests__/storage.test.js`; Modify
`src/state/store.jsx` (save effect also calls `mirrorSave(blob)`), `src/main.jsx`
(await `restoreIfEvicted()` before ReactDOM render — no-op resolves instantly on web);
`package.json` (+@capacitor/preferences).
**Interfaces:** `mirrorSave(serializedBlob)` (no-op on web; Preferences.set on native,
fire-and-forget), `restoreIfEvicted()` → Promise<void> (native only: if
`localStorage.getItem('adonis_v2')` null && Preferences has blob → write it back to
localStorage before mount). Both guarded by dynamic import + isNativePlatform.
**Tests:** web no-op paths; native paths with mocked @capacitor/preferences + stubbed
localStorage (repo's established stub pattern): evicted→restored, present→untouched,
save mirrors. Store tests stay green unchanged.
**Verify:** suite; `npm run build:app` (web bundle must NOT include @capacitor/preferences —
grep dist). Commit `feat(ios-p1): eviction-proof storage (localStorage mirrored to native Preferences)`.

### Task 3: Safe areas + status bar (Contract item 3)
**Files:** Modify `index.html` (ensure `viewport-fit=cover` — already present),
`src/design/animations.css` or new `src/design/safe-area.css` (`:root { --safe-top:
env(safe-area-inset-top, 0px); --safe-bottom: env(safe-area-inset-bottom, 0px); }`),
`src/app/App.jsx` shell header (padding-top uses var), `src/app/TabNav.jsx` (padding-bottom),
full-screen overlays: `PRCelebration`, `GoalCompleteScreen`, `StreakMilestone`, `WeeklyRecap`,
`CheckinModal` sheet, `TaskContextMenu` (bottom sheets respect --safe-bottom); Create
`src/platform/status-bar.js` (native-only: StatusBar.setStyle Dark-content-on-dark via
dynamic import at boot; +@capacitor/status-bar).
**Tests:** presence assertions (components render with the var in style) are weak — do them
cheaply, real gate is the simulator screenshot: header serif fully below the Dynamic Island,
TabNav labels clear of the home indicator (compare against the P0 spike screenshot).
**Verify:** web screenshots unchanged (env() = 0 on desktop); ios build + sim screenshot.
Commit `feat(ios-p1): safe-area insets + native status bar`.

### Task 4: Boot flash kill + native splash + icons (Contract items 1, 12-partial)
**Files:** Modify `capacitor.config.json` (`backgroundColor: "#0A0A0C"`, ios scheme config),
`index.html` (`<html style="background:#0A0A0C">` pre-CSS frame), `ios/App/App/Base.lproj/
LaunchScreen.storyboard` (solid #0A0A0C + centered gold-A image — add the image to Assets),
`ios/App/App/Assets.xcassets/AppIcon.appiconset` (generate from `public/icon.svg` via a
`scripts/ios-icons.mjs` using sharp — 1024 master + storyboard logo PNGs).
**Verify:** relaunch in sim: no white/blank frame between splash and app (record via two
rapid screenshots or simctl video if easy — else eyeball statement); icon visible on the
simulator home screen. Commit `feat(ios-p1): native splash, boot-flash kill, app icons`.

### Task 5: Keyboard + tell-killers (Contract items 4, 7)
**Files:** `capacitor.config.json` (Keyboard plugin config: `resize: "native"`, `style:
"DARK"`, `resizeOnFullScreen`), `package.json` (+@capacitor/keyboard), tell-killer CSS in
`safe-area.css` or `animations.css`: `-webkit-tap-highlight-color: transparent` global;
`-webkit-touch-callout: none` + `user-select: none` on chrome (buttons, nav, headers — NOT
on content text); `overscroll-behavior-y: none` on body (inner scrollers keep momentum);
`touch-action: manipulation` on interactive elements (kills double-tap zoom).
**Tests:** CSS presence; behavior gate = manual sim pass at close (type in onboarding name
field → input stays visible; scroll past top → no shell rubber-band).
**Verify:** web unaffected visually; suite. Commit `feat(ios-p1): keyboard discipline + webview tell-killers`.

### Task 6: P1 close
Suite + web build + `build:ios` + `cap sync` + xcodebuild all green; simulator screenshots
(boot, onboarding step 1, and — via temporarily pointing `server.url` at the dev server with
`?e2e=1&tab=home|profile` OR just onboarding if that's fiddly — enough to judge Contract 1-4/7)
saved to `docs/visual-baselines/ios-p1/`; eyeball vs spike screenshot: safe areas fixed,
fonts styled, no flash. Ledger + spec P1 checkboxes. Merge `ios-p0-spike` → main + push
(web-safe: verify prod-affecting deltas are fonts only, re-verify adonis.pro/app post-deploy
renders type correctly). Report to Jorrel incl. what P2 needs.

## Self-review notes
- Sync-boot constraint drove the mirror-and-restore storage design — no async loadState refactor.
- Fonts change is the ONLY web-visible delta; gated by visual compare + post-deploy check.
- Icons partial (Contract 12 finishes in P4 with store assets); splash logo reuses icon art.
