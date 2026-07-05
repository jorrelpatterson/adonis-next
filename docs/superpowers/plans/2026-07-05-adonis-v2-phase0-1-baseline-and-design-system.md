# Adonis v2 — Phase 0 (Baseline) + Phase 1 (Design System Port) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a trustworthy green baseline on `main` (Phase 0), then port v2-revival's premium design layer — sensory systems, primitives, ambient backdrop — onto main's canonical foundation (Phase 1).

**Architecture:** Port-forward per the spec (`docs/superpowers/specs/2026-07-05-adonis-v2-mvp-completion-design.md`): `main` is canonical; files are harvested **verbatim** from the `v2-revival-archive` tag via `git show`, then covered with new vitest tests. The design layer is fully self-contained (imports only within `src/design/` + React), so it ports bottom-up by dependency: sensory core → iconography → static primitives → interactive primitives → backdrop/shell wiring → 2-file reconciliation (`H.jsx`, `styles.js` — the only design-core files that still differ).

**Tech Stack:** Vite 8 + React 18 (the `src/` consumer app), vitest 4 + happy-dom + @testing-library/react (all already installed — this plan adds **zero** dependencies).

## Global Constraints

- JavaScript/JSX only — no TypeScript (CLAUDE.md)
- Vanilla CSS + inline styles — no Tailwind, no component libraries (CLAUDE.md)
- No new npm dependencies in these phases
- Port source of truth is the tag `v2-revival-archive` (created in Task 1); ported files are copied **verbatim** unless the task explicitly says otherwise
- Full vitest suite must pass at the end of every task: `npx vitest run`
- Commits are LOCAL ONLY — do not `git push` (MASTER-BRIEFING: Jorrel approves pushes at session end)
- Commit message style: lowercase `prefix: description` (`test:`, `chore:`, `feat:`, `design:`, `docs:`, `merge:`)

**Documented deviations from the spec's Phase 1 blurb:**
1. **Boot splash → Phase 2.** Revival implements the splash as the auth-session-resolving screen (`App.jsx:211` "AUTH GATE — show a brand-aware boot splash while session resolves"). It rides the auth port.
2. **TabNav icon upgrade → Phase 3+.** Domain icons in the tab bar are shell wiring beyond primitives; `icons.jsx` itself ports now (Task 6) so it's ready.
3. **`claude/workout-view` is merged in Phase 0** (discovery during planning): a complete, tested WorkoutView feature built on main's architecture (zero-conflict merge verified via `git merge-tree`). It becomes the base for Body workout UI; revival's WorkoutLogger/ExerciseDetail port **on top** in Phase 3. Task 3 records this in the spec's duplicate-pair table.

## File Structure

```
Phase 0 (modified):
  vite.config.js                      # test.exclude additions
  .gitignore                          # ignore .claude/
  docs/clients/nathan-roberts-protocol.html   # committed as-is
  docs/superpowers/specs/2026-07-05-adonis-v2-mvp-completion-design.md  # +1 table row
  (merge: claude/workout-view → src/app/views/workout/*, src/protocols/body/workout/{keys,progression}.js, App.jsx, state/defaults.js)

Phase 1 (created — all copied verbatim from v2-revival-archive):
  src/design/haptics.js               # vibration intents (light…error)
  src/design/sound.js                 # WebAudio cues (tap…error) + mute persistence
  src/design/motion.js                # EASE tokens, transitionView, countUpTo
  src/design/icons.jsx                # domain/UI icon set (svg components)
  src/design/illustrations.jsx        # empty-state illustrations (svg components)
  src/design/Skeleton.jsx             # SkelLine/SkelCircle/SkelCard/SkelRoutine
  src/design/ProgressBar.jsx          # rail progress bar
  src/design/StatNumber.jsx           # count-up stat (uses motion.countUpTo)
  src/design/EmptyState.jsx           # illustration + headline + CTA
  src/design/Toast.jsx                # ToastProvider + useToast
  src/design/Select.jsx               # bottom-sheet select
  src/design/useLongPress.js          # long-press gesture hook
  src/design/ActionSheet.jsx          # ActionSheetProvider + useActionSheet (confirm)
  src/design/PullToRefresh.jsx        # pull-to-refresh overlay
  src/design/AmbientBackdrop.jsx      # tab-tinted orbs/particles/parallax field

Phase 1 (replaced with archive version):
  src/design/animations.css           # 454-line premium keyframe library (main has 43-line stub)
  src/design/components/H.jsx         # + eyebrow prop, italic display type (backward compatible)
  src/design/styles.js                # premium shared styles (+62/−20)

Phase 1 (modified):
  src/app/App.jsx                     # render <AmbientBackdrop tab={activeTab} />

Phase 1 (tests created):
  src/design/__tests__/sensory.test.js
  src/design/__tests__/iconography.test.jsx
  src/design/__tests__/primitives.test.jsx
  src/design/__tests__/interactive.test.jsx
  src/design/__tests__/gesture-sheet.test.jsx
```

**Baseline numbers (verified 2026-07-05):** `npx vitest run` → `Test Files 8 failed | 90 passed (98)`, `Tests 735 passed`. The 8 failures are node-runner `.mjs` scripts vitest can't execute: `lib/reorderDuration.test.mjs`, `lib/news/{curator,pubmed,rss}.test.mjs` + the same 4 duplicated under `.claude/worktrees/workout-view/`.

> **Correction (discovered during Task 2 execution):** the "90 passed" figure double-counted ~50 duplicate test files vitest was crawling inside `.claude/worktrees/workout-view/`. After the Task 2 exclusions the true main-only baseline is **39 test files / 332 tests, all green** (verified: 44 tracked test files − 5 excluded `lib/**/*.test.mjs` = 39). Expected counts in Tasks 3–12 are corrected accordingly.

---

### Task 1: Tag the archive

**Files:** none (git tag only)

**Interfaces:**
- Produces: tag `v2-revival-archive` — every later port step reads file content via `git show v2-revival-archive:<path>`.

- [ ] **Step 1: Create the annotated tag**

```bash
cd "/Volumes/(626)806-4475/Ai Projects/adonis-next"
git tag -a v2-revival-archive origin/v2-revival -m "archive: v2-revival experience branch (52 commits, tip 2026-05-01) — harvest source for the port-forward per 2026-07-05 spec"
```

- [ ] **Step 2: Verify the tag resolves and serves file content**

Run: `git show v2-revival-archive:src/design/motion.js | head -1`
Expected: `// Motion helpers — primitives the app uses for premium transitions.`

Run: `git tag -l v2-revival-archive`
Expected: `v2-revival-archive`

(No commit — a tag is not a working-tree change. Do NOT push; the tag rides the session-end push.)

---

### Task 2: Green-gate the vitest config

**Files:**
- Modify: `vite.config.js`

**Interfaces:**
- Produces: `npx vitest run` fully green — the pass/fail signal every later task relies on.

- [ ] **Step 1: Confirm the current failure mode**

Run: `npx vitest run 2>&1 | tail -4`
Expected: `Test Files  8 failed | 90 passed (98)` and `Tests  735 passed (735)`

- [ ] **Step 2: Extend the exclude list**

Replace the `test` block in `vite.config.js` with:

```js
  test: {
    environment: 'happy-dom',
    globals: true,
    exclude: [
      '**/._*',
      '**/node_modules/**',
      '**/.claude/**',        // local worktrees/harness files — never part of the suite
      'lib/**/*.test.mjs',    // node-runner scripts (run via `node lib/news/rss.test.mjs`), not vitest
    ],
  },
```

- [ ] **Step 3: Verify the suite is green**

Run: `npx vitest run 2>&1 | tail -4`
Expected: `Test Files  39 passed (39)`, `Tests  332 passed (332)` (the old "90 passed" included worktree duplicates — see baseline correction above)

- [ ] **Step 4: Commit**

```bash
git add vite.config.js
git commit -m "test: exclude node-runner .mjs suites and .claude worktrees from vitest"
```

---

### Task 3: Merge the workout-view branch and retire its worktree

**Files:**
- Merge in: `src/app/views/WorkoutView.jsx`, `src/app/views/workout/*` (8 components + 8 tests), `src/protocols/body/workout/{keys,progression}.js` (+2 tests), modifies `src/app/App.jsx`, `src/state/defaults.js`, adds `docs/superpowers/plans/2026-05-27-workout-view-train-tab.md`
- Modify: `docs/superpowers/specs/2026-07-05-adonis-v2-mvp-completion-design.md` (one table row)

**Interfaces:**
- Produces: `WorkoutView` rendered under the Body tab (from the branch); `progression.js` / `keys.js` in the workout protocol. Phase 3 treats these as the **base** that revival's WorkoutLogger/PRCelebration port onto.

- [ ] **Step 1: Confirm the merge is conflict-free**

Run: `git merge-tree $(git merge-base main claude/workout-view) main claude/workout-view | grep -c "<<<<<<<"`
Expected: `0`

- [ ] **Step 2: Merge**

```bash
git merge --no-ff claude/workout-view -m "merge: workout-view — WorkoutView under Body tab (SetGrid+PR, swaps, deload, rest timer)"
```
Expected: `Merge made by the 'ort' strategy.` (no conflicts)

- [ ] **Step 3: Verify the suite absorbed the branch's tests**

Run: `npx vitest run 2>&1 | tail -4`
Expected: `Test Files  50 passed (50)` (39 + 11 new), `Tests` ≥ 332, 0 failed

- [ ] **Step 4: Record the new duplicate-pair in the spec**

In `docs/superpowers/specs/2026-07-05-adonis-v2-mvp-completion-design.md`, add this row to the bottom of the duplicate-pair rulings table:

```markdown
| Body workout UI | `workout-view` merge (WorkoutView/SetGrid/RestTimer — main architecture, 2026-05-27) | revival WorkoutLogger/PRCelebration/ExerciseDetail, adapted in Phase 3 |
```

- [ ] **Step 5: Commit the spec row**

```bash
git add docs/superpowers/specs/2026-07-05-adonis-v2-mvp-completion-design.md
git commit -m "docs: record workout-view merge as body-workout-UI base in duplicate-pair table"
```

- [ ] **Step 6: Remove the worktree and local branch**

```bash
git worktree remove .claude/worktrees/workout-view
git branch -d claude/workout-view
```
Expected: worktree removed; `Deleted branch claude/workout-view`. If the worktree refuses over ignored files, use `git worktree remove --force .claude/worktrees/workout-view`.
(Leave the REMOTE branch alone — deleting `origin/claude/workout-view` is outward-facing; Jorrel decides at session end.)

- [ ] **Step 7: Re-run the suite (worktree removal shrinks nothing — sanity only)**

Run: `npx vitest run 2>&1 | tail -3`
Expected: `Test Files  50 passed (50)`

---

### Task 4: Housekeeping — stray client doc + .claude ignore

**Files:**
- Commit as-is: `docs/clients/nathan-roberts-protocol.html`
- Modify: `.gitignore`

- [ ] **Step 1: Commit the client doc**

```bash
git add docs/clients/nathan-roberts-protocol.html
git commit -m "docs(clients): nathan roberts reconstitution & dosing reference"
```

- [ ] **Step 2: Ignore local harness files**

`.gitignore` line 10 currently reads `.claude/worktrees/`. Replace that line with:

```
.claude/
```

- [ ] **Step 3: Verify status is clean (jorrel-os.json aside)**

Run: `git status --short`
Expected: only ` M jorrel-os.json` (session-state file — rides the end-of-session ritual, never this plan)

- [ ] **Step 4: Commit**

```bash
git add .gitignore
git commit -m "chore: gitignore .claude/ (local harness + worktrees)"
```

---

### Task 5: Port the sensory core — haptics, sound, motion

**Files:**
- Create: `src/design/haptics.js`, `src/design/sound.js`, `src/design/motion.js` (verbatim from archive)
- Test: `src/design/__tests__/sensory.test.js`

**Interfaces:**
- Produces:
  - `haptics.{light|medium|heavy|success|warning|error}()` — safe no-ops without `navigator.vibrate`
  - `sound.{tap|toggleOn|toggleOff|success|pr|warning|error}()`, `setSoundMuted(bool)`, `isSoundMuted()` — safe no-ops without AudioContext
  - `EASE.{spring|soft|snap|stiff}` (CSS cubic-bezier strings); `transitionView(fn)` (View Transitions wrapper, sync fallback); `countUpTo({from,to,duration,onUpdate,easing}) → cancel()`
- Consumed by: Toast/Select/ActionSheet/PullToRefresh (Tasks 8–9), StatNumber (Task 7), and Phase 2+ shell work.

- [ ] **Step 1: Write the failing test**

Create `src/design/__tests__/sensory.test.js`:

```js
import { describe, it, expect, vi, afterEach } from 'vitest';
import { EASE, transitionView, countUpTo } from '../motion';
import { haptics } from '../haptics';
import { sound, setSoundMuted, isSoundMuted } from '../sound';

afterEach(() => vi.unstubAllGlobals());

describe('motion', () => {
  it('exposes the four easing tokens', () => {
    expect(Object.keys(EASE)).toEqual(['spring', 'soft', 'snap', 'stiff']);
  });

  it('transitionView falls back to a synchronous call without startViewTransition', () => {
    const fn = vi.fn();
    const result = transitionView(fn); // happy-dom has no document.startViewTransition
    expect(fn).toHaveBeenCalledTimes(1);
    expect(result).toBeNull();
  });

  it('countUpTo jumps straight to the target without requestAnimationFrame', () => {
    vi.stubGlobal('requestAnimationFrame', undefined);
    const seen = [];
    const cancel = countUpTo({ from: 0, to: 100, onUpdate: (v) => seen.push(v) });
    expect(seen).toEqual([100]);
    expect(typeof cancel).toBe('function');
  });
});

describe('haptics', () => {
  it('exposes the six intents and never throws without navigator.vibrate', () => {
    for (const k of ['light', 'medium', 'heavy', 'success', 'warning', 'error']) {
      expect(() => haptics[k](), k).not.toThrow();
    }
  });

  it('vibrates with the intent pattern when the platform supports it', () => {
    const spy = vi.fn();
    vi.stubGlobal('navigator', { vibrate: spy });
    haptics.heavy();
    expect(spy).toHaveBeenCalledWith([20, 10, 20]);
  });
});

describe('sound', () => {
  it('mute setting round-trips', () => {
    setSoundMuted(true);
    expect(isSoundMuted()).toBe(true);
    setSoundMuted(false);
    expect(isSoundMuted()).toBe(false);
  });

  it('exposes the seven cues and never throws without AudioContext', () => {
    for (const k of ['tap', 'toggleOn', 'toggleOff', 'success', 'pr', 'warning', 'error']) {
      expect(() => sound[k](), k).not.toThrow();
    }
  });
});
```

- [ ] **Step 2: Run it — must fail on missing modules**

Run: `npx vitest run src/design/__tests__/sensory.test.js`
Expected: FAIL — `Cannot find module '../motion'` (or `../haptics`)

- [ ] **Step 3: Port the three files verbatim**

```bash
git show v2-revival-archive:src/design/haptics.js > src/design/haptics.js
git show v2-revival-archive:src/design/sound.js   > src/design/sound.js
git show v2-revival-archive:src/design/motion.js  > src/design/motion.js
```

- [ ] **Step 4: Run the test — must pass**

Run: `npx vitest run src/design/__tests__/sensory.test.js`
Expected: PASS (7 tests)

- [ ] **Step 5: Full suite + commit**

Run: `npx vitest run 2>&1 | tail -3` → `Test Files  51 passed (51)`

```bash
git add src/design/haptics.js src/design/sound.js src/design/motion.js src/design/__tests__/sensory.test.js
git commit -m "design: port sensory core (haptics, sound, motion) from v2-revival-archive"
```

---

### Task 6: Port iconography — icons + illustrations

**Files:**
- Create: `src/design/icons.jsx`, `src/design/illustrations.jsx` (verbatim from archive)
- Test: `src/design/__tests__/iconography.test.jsx`

**Interfaces:**
- Produces: named svg components — `IconRoutine/IconBody/IconMoney/IconTravel/IconMind/IconImage/...({size, className, style})`; `IllusGoals/IllusTasksDone/IllusFood/IllusWorkout/IllusPeptides/...({size})`.
- Consumed by: EmptyState demos (Task 7), TabNav upgrade (Phase 3+), domain views (Phase 4).

- [ ] **Step 1: Write the failing test**

Create `src/design/__tests__/iconography.test.jsx`:

```jsx
import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import * as icons from '../icons';
import * as illustrations from '../illustrations';

describe('iconography', () => {
  it('every icon export renders an svg', () => {
    const entries = Object.entries(icons).filter(([, v]) => typeof v === 'function');
    expect(entries.length).toBeGreaterThan(0);
    for (const [name, Icon] of entries) {
      const { container, unmount } = render(<Icon size={20} />);
      expect(container.querySelector('svg'), name).toBeTruthy();
      unmount();
    }
  });

  it('every illustration export renders an svg', () => {
    const entries = Object.entries(illustrations).filter(([, v]) => typeof v === 'function');
    expect(entries.length).toBeGreaterThan(0);
    for (const [name, Illus] of entries) {
      const { container, unmount } = render(<Illus size={80} />);
      expect(container.querySelector('svg'), name).toBeTruthy();
      unmount();
    }
  });
});
```

- [ ] **Step 2: Run it — must fail** — `npx vitest run src/design/__tests__/iconography.test.jsx` → FAIL `Cannot find module '../icons'`

- [ ] **Step 3: Port verbatim**

```bash
git show v2-revival-archive:src/design/icons.jsx         > src/design/icons.jsx
git show v2-revival-archive:src/design/illustrations.jsx > src/design/illustrations.jsx
```

- [ ] **Step 4: Run the test — must pass** — expected PASS (2 tests)

- [ ] **Step 5: Full suite + commit**

Run: `npx vitest run 2>&1 | tail -3` → `Test Files  52 passed (52)`

```bash
git add src/design/icons.jsx src/design/illustrations.jsx src/design/__tests__/iconography.test.jsx
git commit -m "design: port icon + illustration sets from v2-revival-archive"
```

---

### Task 7: Port static primitives — Skeleton, ProgressBar, StatNumber, EmptyState

**Files:**
- Create: `src/design/Skeleton.jsx`, `src/design/ProgressBar.jsx`, `src/design/StatNumber.jsx`, `src/design/EmptyState.jsx` (verbatim from archive)
- Test: `src/design/__tests__/primitives.test.jsx`

**Interfaces:**
- Consumes: `countUpTo` from `../motion` (StatNumber); `GradText` from `./components` (EmptyState — already on main, identical to archive).
- Produces: `SkelLine({w,h,mt}) / SkelCircle({size,mt}) / SkelCard({height}) / SkelRoutine()`; `ProgressBar({value, max, color, background, height, showRail})` (default export); `StatNumber({value, format, duration, initial, className, style})` (default export); `EmptyState({illustration, headline, body, cta, onCta, size})` (default export).
- Consumed by: HomeDashboard + Insights (Phase 3/4), empty states across domain views.

- [ ] **Step 1: Write the failing test**

Create `src/design/__tests__/primitives.test.jsx`:

```jsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { SkelLine, SkelCircle, SkelCard, SkelRoutine } from '../Skeleton';
import ProgressBar from '../ProgressBar';
import StatNumber from '../StatNumber';
import EmptyState from '../EmptyState';

afterEach(() => vi.unstubAllGlobals());

describe('primitives', () => {
  it('skeleton pieces all render', () => {
    const { container } = render(
      <div data-testid="wrap"><SkelLine /><SkelCircle /><SkelCard /><SkelRoutine /></div>
    );
    expect(container.querySelector('[data-testid="wrap"]').childNodes.length).toBe(4);
  });

  it('ProgressBar renders at a given value', () => {
    const { container } = render(<ProgressBar value={50} max={100} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('StatNumber shows the formatted target (reduced-motion sync path)', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      matches: true, addEventListener() {}, removeEventListener() {},
    })));
    const { getByText } = render(<StatNumber value={1780} />);
    expect(getByText('1,780')).toBeTruthy();
  });

  it('EmptyState renders copy and fires its CTA', () => {
    const onCta = vi.fn();
    const { getByText } = render(
      <EmptyState headline="No goals yet" body="Set your first goal." cta="Add goal" onCta={onCta} />
    );
    expect(getByText('No goals yet')).toBeTruthy();
    fireEvent.click(getByText('Add goal'));
    expect(onCta).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run it — must fail** — `npx vitest run src/design/__tests__/primitives.test.jsx` → FAIL `Cannot find module '../Skeleton'`

- [ ] **Step 3: Port verbatim**

```bash
git show v2-revival-archive:src/design/Skeleton.jsx    > src/design/Skeleton.jsx
git show v2-revival-archive:src/design/ProgressBar.jsx > src/design/ProgressBar.jsx
git show v2-revival-archive:src/design/StatNumber.jsx  > src/design/StatNumber.jsx
git show v2-revival-archive:src/design/EmptyState.jsx  > src/design/EmptyState.jsx
```

- [ ] **Step 4: Run the test — must pass** — expected PASS (4 tests)

- [ ] **Step 5: Full suite + commit**

Run: `npx vitest run 2>&1 | tail -3` → `Test Files  53 passed (53)`

```bash
git add src/design/Skeleton.jsx src/design/ProgressBar.jsx src/design/StatNumber.jsx src/design/EmptyState.jsx src/design/__tests__/primitives.test.jsx
git commit -m "design: port static primitives (skeleton, progress, stat, empty state)"
```

---

### Task 8: Port interactive primitives — Toast + Select

**Files:**
- Create: `src/design/Toast.jsx`, `src/design/Select.jsx` (verbatim from archive)
- Test: `src/design/__tests__/interactive.test.jsx`

**Interfaces:**
- Consumes: `haptics`, `sound` (Task 5); `P, FN` from `./theme` (identical on main).
- Produces: `ToastProvider({children})` + `useToast() → {show, success, error, warning, info}` (each `(msg, opts?)`); `Select({value, onChange, options: [{value, label, sub?}], placeholder, label, style})` (default export) — opens a bottom sheet, calls `onChange(opt.value)`.
- Consumed by: Phase 2+ shell (ToastProvider wraps App); forms across views.

- [ ] **Step 1: Write the failing test**

Create `src/design/__tests__/interactive.test.jsx`:

```jsx
import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { ToastProvider, useToast } from '../Toast';
import Select from '../Select';

function ToastDemo() {
  const toast = useToast();
  return <button onClick={() => toast.success('Saved')}>fire</button>;
}

describe('Toast', () => {
  it('success() renders the message pill', () => {
    const { getByText } = render(<ToastProvider><ToastDemo /></ToastProvider>);
    fireEvent.click(getByText('fire'));
    expect(getByText('Saved')).toBeTruthy();
  });
});

describe('Select', () => {
  it('shows the selected option label', () => {
    const { getByText } = render(
      <Select value="b" onChange={() => {}} options={[
        { value: 'a', label: 'Alpha' },
        { value: 'b', label: 'Beta' },
      ]} />
    );
    expect(getByText('Beta')).toBeTruthy();
  });

  it('opens and selects an option', () => {
    let picked = null;
    const { getByText, getAllByText } = render(
      <Select value="a" onChange={(v) => { picked = v; }} options={[
        { value: 'a', label: 'Alpha' },
        { value: 'b', label: 'Beta' },
      ]} />
    );
    fireEvent.click(getByText('Alpha'));            // open the sheet (trigger shows current)
    fireEvent.click(getAllByText('Beta').pop());    // choose from the sheet list
    expect(picked).toBe('b');
  });
});
```

- [ ] **Step 2: Run it — must fail** — `npx vitest run src/design/__tests__/interactive.test.jsx` → FAIL `Cannot find module '../Toast'`

- [ ] **Step 3: Port verbatim**

```bash
git show v2-revival-archive:src/design/Toast.jsx  > src/design/Toast.jsx
git show v2-revival-archive:src/design/Select.jsx > src/design/Select.jsx
```

- [ ] **Step 4: Run the test — must pass** — expected PASS (3 tests)

- [ ] **Step 5: Full suite + commit**

Run: `npx vitest run 2>&1 | tail -3` → `Test Files  54 passed (54)`

```bash
git add src/design/Toast.jsx src/design/Select.jsx src/design/__tests__/interactive.test.jsx
git commit -m "design: port toast system and bottom-sheet select"
```

---

### Task 9: Port gesture + sheet primitives — useLongPress, ActionSheet, PullToRefresh

**Files:**
- Create: `src/design/useLongPress.js`, `src/design/ActionSheet.jsx`, `src/design/PullToRefresh.jsx` (verbatim from archive)
- Test: `src/design/__tests__/gesture-sheet.test.jsx`

**Interfaces:**
- Consumes: `haptics`, `sound` (Task 5); `GradText` from `./components`.
- Produces: `useLongPress(callback, {delay=500, threshold=8}) → {onTouchStart,onTouchMove,onTouchEnd,onTouchCancel,onMouseDown,onMouseMove,onMouseUp,onMouseLeave,onContextMenu,onClickCapture}`; `ActionSheetProvider({children})` + `useActionSheet() → {confirm(opts) → Promise<boolean>}` (opts: `{title, message, confirmText, cancelText, destructive}`); `PullToRefresh({onRefresh, scrollerSelector='.adn-noise'})` (default export).
- Consumed by: TaskContextMenu (Phase 3), destructive confirms replacing `window.confirm` (Phase 3+), routine refresh (Phase 3).

- [ ] **Step 1: Write the failing test**

Create `src/design/__tests__/gesture-sheet.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, renderHook, act, fireEvent, waitFor } from '@testing-library/react';
import { useLongPress } from '../useLongPress';
import { ActionSheetProvider, useActionSheet } from '../ActionSheet';
import PullToRefresh from '../PullToRefresh';

describe('useLongPress', () => {
  it('fires after the delay and not before', () => {
    vi.useFakeTimers();
    const cb = vi.fn();
    const { result } = renderHook(() => useLongPress(cb, { delay: 500 }));
    act(() => { result.current.onMouseDown({ clientX: 10, clientY: 10 }); });
    act(() => { vi.advanceTimersByTime(400); });
    expect(cb).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(200); });
    expect(cb).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('cancels when the pointer lifts early', () => {
    vi.useFakeTimers();
    const cb = vi.fn();
    const { result } = renderHook(() => useLongPress(cb, { delay: 500 }));
    act(() => { result.current.onMouseDown({ clientX: 0, clientY: 0 }); });
    act(() => { result.current.onMouseUp(); });
    act(() => { vi.advanceTimersByTime(1000); });
    expect(cb).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});

function SheetDemo({ onResult }) {
  const { confirm } = useActionSheet();
  return (
    <button onClick={async () => onResult(await confirm({ title: 'Delete goal?', confirmText: 'Delete', destructive: true }))}>
      open
    </button>
  );
}

describe('ActionSheet', () => {
  it('confirm resolves true when the confirm button is tapped', async () => {
    const onResult = vi.fn();
    const { getByText } = render(<ActionSheetProvider><SheetDemo onResult={onResult} /></ActionSheetProvider>);
    fireEvent.click(getByText('open'));
    expect(getByText('Delete goal?')).toBeTruthy();
    fireEvent.click(getByText('Delete'));
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(true));
  });
});

describe('PullToRefresh', () => {
  it('renders without a scroll container present', () => {
    expect(() => render(<PullToRefresh onRefresh={() => {}} />)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run it — must fail** — `npx vitest run src/design/__tests__/gesture-sheet.test.jsx` → FAIL `Cannot find module '../useLongPress'`

- [ ] **Step 3: Port verbatim**

```bash
git show v2-revival-archive:src/design/useLongPress.js   > src/design/useLongPress.js
git show v2-revival-archive:src/design/ActionSheet.jsx   > src/design/ActionSheet.jsx
git show v2-revival-archive:src/design/PullToRefresh.jsx > src/design/PullToRefresh.jsx
```

- [ ] **Step 4: Run the test — must pass** — expected PASS (4 tests)

- [ ] **Step 5: Full suite + commit**

Run: `npx vitest run 2>&1 | tail -3` → `Test Files  55 passed (55)`

```bash
git add src/design/useLongPress.js src/design/ActionSheet.jsx src/design/PullToRefresh.jsx src/design/__tests__/gesture-sheet.test.jsx
git commit -m "design: port long-press hook, action sheet, pull-to-refresh"
```

---

### Task 10: Premium animations + AmbientBackdrop, wired into the shell

**Files:**
- Replace: `src/design/animations.css` (archive version — 454-line keyframe library; main has a 43-line stub; already imported by `src/main.jsx`)
- Create: `src/design/AmbientBackdrop.jsx` (verbatim from archive)
- Modify: `src/app/App.jsx` (~lines 1–14 imports, ~lines 84–90 render root)

**Interfaces:**
- Consumes: `TAB_VIBES` from `./constants` (already on main at `src/design/constants.js:29` — identical to archive) and `P` from `./theme`.
- Produces: `<AmbientBackdrop tab={string} />` rendered behind all shell content; the full `adn-*` keyframe set available app-wide.

- [ ] **Step 1: Replace animations.css and port the backdrop**

```bash
git show v2-revival-archive:src/design/animations.css     > src/design/animations.css
git show v2-revival-archive:src/design/AmbientBackdrop.jsx > src/design/AmbientBackdrop.jsx
```

- [ ] **Step 2: Wire the backdrop into App.jsx**

Add the import after the existing design imports (`src/app/App.jsx`, near line 13):

```js
import AmbientBackdrop from '../design/AmbientBackdrop';
```

Then in the render root (currently lines 84–90), insert the backdrop as the first child and lift the content wrapper above it (the component's contract: content sits at `position:relative; zIndex:2`):

```jsx
  return (
    <div className="adn-noise" style={{
      fontFamily: FN, background: P.bg, color: P.tx,
      position: 'fixed', inset: 0, overflowY: 'auto',
      paddingBottom: 80,
    }}>
      <AmbientBackdrop tab={activeTab} />
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '16px 16px 0', position: 'relative', zIndex: 2 }}>
```

(The only changes: the new `<AmbientBackdrop … />` line, and `position: 'relative', zIndex: 2` appended to the inner wrapper's style. Everything else stays byte-identical.)

- [ ] **Step 3: Full suite — App tests must still pass**

Run: `npx vitest run 2>&1 | tail -3`
Expected: `Test Files  55 passed (55)` — no regressions (backdrop honors reduced-motion and renders inert layers in happy-dom)

- [ ] **Step 4: Visual smoke on the dev server**

Run: `npm run dev:app` and open the printed localhost URL.
Check: orbs + particles visible behind content; tint shifts when you switch tabs (Routine → a domain tab → Profile); content still scrolls and taps normally (backdrop is pointer-events:none).
Stop the server after checking.

- [ ] **Step 5: Commit**

```bash
git add src/design/animations.css src/design/AmbientBackdrop.jsx src/app/App.jsx
git commit -m "design: premium animation library + ambient backdrop behind the shell"
```

---

### Task 11: Reconcile the two divergent design-core files — H.jsx + styles.js

The design core (theme.js, constants.js, components/GradText.jsx, components/index.js, `__tests__/`) is **already identical** on both sides — May's recovery converged on revival's versions. Only these two files still differ, and per the spec's ruling, **revival's premium versions win**.

**Files:**
- Replace: `src/design/components/H.jsx` (archive adds optional `eyebrow` prop, italic clamp() display type — backward compatible: `t`/`sub` unchanged)
- Replace: `src/design/styles.js` (archive: +62/−20 premium shared styles)

**Interfaces:**
- Produces: `H({t, sub, eyebrow})`; `s.*` style tokens (superset of main's — existing consumers keep working).
- Consumed by: every view; the existing suite (incl. `components.test.jsx` and all view tests) is the compatibility gate.

- [ ] **Step 1: Inspect what's changing (context for the reviewer, no edits)**

Run: `git diff main v2-revival-archive -- src/design/components/H.jsx src/design/styles.js | head -80`
Expected: H gains `eyebrow` block + italic display styling; styles.js gains premium tokens. No removed export names.

- [ ] **Step 2: Apply the archive versions**

```bash
git show v2-revival-archive:src/design/components/H.jsx > src/design/components/H.jsx
git show v2-revival-archive:src/design/styles.js        > src/design/styles.js
```

- [ ] **Step 3: Full suite — this is the backward-compatibility gate**

Run: `npx vitest run 2>&1 | tail -4`
Expected: `Test Files  55 passed (55)`, 0 failed.
**If any test fails here, STOP:** the archive version broke a consumer. Do not adapt the consumer — revert (`git checkout main -- src/design/styles.js src/design/components/H.jsx`), diff the failing usage, and apply the archive change as a manual merge that keeps both consumers and premium styling. Then re-run.

- [ ] **Step 4: Visual spot-check**

Run: `npm run dev:app` — headers now render italic serif display with tighter leading; card/button styling subtly upgraded; nothing overlaps or clips on the Routine and Profile tabs. Stop the server.

- [ ] **Step 5: Commit**

```bash
git add src/design/components/H.jsx src/design/styles.js
git commit -m "design: adopt premium H header and shared styles from v2-revival-archive"
```

---

### Task 12: Phase gate — build, archive diff, wrap-up

**Files:** none created — verification only.

- [ ] **Step 1: Full suite, final numbers**

Run: `npx vitest run 2>&1 | tail -4`
Expected: `Test Files  55 passed (55)`, `Tests` ≥ 352 (332 baseline + workout-view's + 20 new design tests), 0 failed.

- [ ] **Step 2: Production build of the consumer app**

Run: `npm run build:app`
Expected: `✓ built in …s`, no errors. (Output lands in `dist/` — gitignored; do not commit it.)

- [ ] **Step 3: Next.js build unaffected (admin side untouched, sanity only)**

Run: `npm run build 2>&1 | tail -5`
Expected: build completes with no new errors.

- [ ] **Step 4: Close-of-phase archive diff (straggler-polish check from the spec)**

Run: `git diff v2-revival-archive main --stat -- src/design/`
Expected: differences ONLY in files this plan deliberately did not take from the archive (none in `src/design/` — every design file should now be byte-identical to the archive) plus main-only additions (the 5 new `__tests__` files). If any ported file shows a content diff, it was corrupted in transit — re-run its `git show … >` step.

- [ ] **Step 5: Log completion in the plan doc**

Tick every checkbox in this file, then:

```bash
git add docs/superpowers/plans/2026-07-05-adonis-v2-phase0-1-baseline-and-design-system.md
git commit -m "docs: phase 0+1 plan executed — baseline green, design system ported"
```

**Do NOT push.** Pushes and the `jorrel-os.json` / dashboard update happen in Jorrel's end-of-session "save everything" ritual.

---

## What Phase 2 picks up next (not this plan)

Onboarding funnel + Supabase Auth + tier/code redemption + decomposition-ready goal model — per the spec. The boot splash deferred from Phase 1 lands there, wrapped around the auth session resolution. ToastProvider/ActionSheetProvider get mounted around the app shell when their first consumers arrive.
