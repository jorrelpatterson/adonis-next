# Adonis v2 Phase 2 — Onboarding, Auth, Tiers, Decomposition-Ready Goals

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A stranger completes onboarding → is required to sign up (Supabase Auth email) → receives auto-created initial goals → lands in the app; tiers unlock only by access code; the goal model becomes parent→child decomposition-ready.

**Architecture:** Port the onboarding/auth funnel from the `v2-revival-archive` git tag file-by-file (main is canonical; archive files are extracted with `git show`, adapted only where this plan says). Protocol onboarding questions are GRAFTED into main's protocol files (main's internals are newer — never overwrite them). Funnel order per spec decision 4: OnboardingFlow → AuthScreen (signup gate) → CalculatingScreen → GamePlanScreen → app. Tier lives in `profile.tier` locally AND is stamped into Supabase user metadata so unlocks survive reinstall.

**Tech Stack:** React 18 + Vite (`npm run dev:app`), vitest + @testing-library/react (happy-dom), Supabase JS SDK (`src/services/supabase.js`), Next.js API route for the subscribers upsert (service key).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-05-adonis-v2-mvp-completion-design.md` (Phase 2 + Verification addendum 2026-07-09). Parity ledger: `docs/v1-feature-parity-ledger.md`.
- **Signup required before protocol delivery** (spec decision 4). Anonymous use is a deliberate drop (ledger).
- **Google OAuth is deferred** (ledger) — email+password only in the UI. Service functions may exist but no Google button renders.
- **Stripe stays dark** (spec decision 5): `redirectToCheckout` must be gated OFF; no live `buy.stripe.com` navigation reachable from UI.
- **Access codes are the only unlock**: `src/state/access-codes.js` (FOUNDER→elite, ADONIS2026→pro) — already in main; extend, don't replace.
- **Goal model**: `parentId` (default `null`) + shared deadline become first-class (spec decision 7).
- **Archive extraction command pattern**: `git show v2-revival-archive:<path> > <path>` — verbatim unless a task states an adaptation. NEVER copy `src/state/defaults.js` wholesale (main is ahead: keep `wkSwaps`; add only `fitnessPillars: []`).
- **No `/v2/` URLs** ride in (April-era assumption — auth redirects must use `window.location.origin + window.location.pathname`).
- **Design contract per new screen** (Verification addendum): `H` header, theme tokens from `src/design/theme.js`/`styles.js` only, `animations.css` classes (`.adn-reveal`, `.adn-press`), `Skeleton` for loading, `EmptyState` for zero-data, `Toast` for confirmations.
- Tests: co-located `__tests__/` dirs, `.test.jsx` for components / `.test.js` for logic, vitest + happy-dom. Run `npx vitest run <path>`. Full suite must stay green (`npm test` — 64 files / 439 tests at plan time).
- Commit after every task (message prefix `feat(phase2):` / `test(phase2):`). End every commit message with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- **Manual step (Jorrel, not the executor):** Supabase dashboard → Authentication: enable Email provider + confirmations; add Site URL `https://adonis.pro` and redirect URLs `https://adonis.pro/app`, `http://localhost:5173`, `http://localhost:4321`. Flagged again in Task 15.

---

### Task 1: Auth service (`services/auth.js`)

**Files:**
- Create: `src/services/auth.js`
- Test: `src/services/__tests__/auth.test.js`

**Interfaces:**
- Consumes: `supabase` client from `src/services/supabase.js` (exists).
- Produces: `signUpWithEmail(email, password) → {user, error}`, `signInWithEmail(email, password) → {user, error}`, `signOut() → {error}`, `getSession() → {session, error}`, `onAuthStateChange(cb) → unsubscribeFn`, `updateUserTier(tier, code) → {user, error}`, `tierFromUser(user) → 'free'|'pro'|'elite'`. (Tasks 2, 4, 13 rely on these exact names.)

- [ ] **Step 1: Extract the archive files**

```bash
cd "/Volumes/(626)806-4475/Ai Projects/adonis-next"
git show v2-revival-archive:src/services/auth.js > src/services/auth.js
mkdir -p src/services/__tests__
git show v2-revival-archive:src/services/__tests__/auth.test.js > src/services/__tests__/auth.test.js
```

- [ ] **Step 2: Adapt `src/services/auth.js` — three changes**

(a) Replace the `v2RedirectUrl()` helper (hardcodes `'/v2/'`) with:

```js
const appRedirectUrl = () =>
  window.location.origin + window.location.pathname;
```

and update its two call sites (`emailRedirectTo` in signUp, `redirectTo` in the OAuth options) to `appRedirectUrl()`.

(b) DELETE `fetchAdonisProfile` entirely (it reads an `adonis_profiles` table we are not creating — spec says tier lives in **user metadata**). Also delete `signInWithGoogle` (deferred per ledger; keeps the dark surface minimal).

(c) APPEND the metadata-tier functions:

```js
// Tier + redeemed code live in auth user metadata so unlocks survive reinstall (spec §Auth & state).
export async function updateUserTier(tier, code) {
  const { data, error } = await supabase.auth.updateUser({
    data: { tier, access_code: code || null },
  });
  return { user: data?.user || null, error };
}

export function tierFromUser(user) {
  const t = user?.user_metadata?.tier;
  return t === 'pro' || t === 'elite' ? t : 'free';
}
```

- [ ] **Step 3: Adapt the test file to match** — remove the `fetchAdonisProfile` and `signInWithGoogle` describe blocks; add:

```js
describe('updateUserTier / tierFromUser', () => {
  it('stamps tier and code into user metadata', async () => {
    supabase.auth.updateUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    const { user, error } = await updateUserTier('pro', 'ADONIS2026');
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ data: { tier: 'pro', access_code: 'ADONIS2026' } });
    expect(user).toEqual({ id: 'u1' });
    expect(error).toBeNull();
  });
  it('tierFromUser reads metadata and defaults to free', () => {
    expect(tierFromUser({ user_metadata: { tier: 'elite' } })).toBe('elite');
    expect(tierFromUser({ user_metadata: { tier: 'hacker' } })).toBe('free');
    expect(tierFromUser(null)).toBe('free');
  });
});
```

(The archive test already mocks `../supabase.js` with `vi.mock` — extend that mock's `auth` object with `updateUser: vi.fn()`.)

- [ ] **Step 4: Run** `npx vitest run src/services/__tests__/auth.test.js` — Expected: PASS. Also grep-verify no `/v2/` remains: `grep -n "'/v2/'" src/services/auth.js` → no output.

- [ ] **Step 5: Commit** `feat(phase2): port auth service from revival archive (metadata tiers, no /v2/, Google deferred)`

---

### Task 2: `useAuth` hook

**Files:**
- Create: `src/services/useAuth.js`
- Test: `src/services/__tests__/useAuth.test.jsx`

**Interfaces:**
- Consumes: Task 1's `getSession`, `onAuthStateChange`, `signOut`, `tierFromUser`.
- Produces: `useAuth() → { user, tier, loading, signOut }` — Task 11's App gate keys on `loading` and `user`; Task 13 keys on `tier`.

- [ ] **Step 1: Extract** `git show v2-revival-archive:src/services/useAuth.js > src/services/useAuth.js`

- [ ] **Step 2: Adapt** — the archive version fetches `adonis_profiles` into a `profile` field. Replace that with metadata: delete the `fetchAdonisProfile`/`refreshProfile` logic and expose `tier` instead:

```js
import { useEffect, useState, useCallback } from 'react';
import { getSession, onAuthStateChange, signOut as authSignOut, tierFromUser } from './auth.js';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getSession().then(({ session }) => {
      if (!mounted) return;
      setUser(session?.user || null);
      setLoading(false);
    });
    const unsubscribe = onAuthStateChange(({ session }) => {
      if (!mounted) return;
      setUser(session?.user || null);
      setLoading(false);
    });
    return () => { mounted = false; unsubscribe(); };
  }, []);

  const signOut = useCallback(async () => {
    await authSignOut();
    localStorage.removeItem('adonis_v2');
    window.location.reload();
  }, []);

  return { user, tier: tierFromUser(user), loading, signOut };
}
```

(Keep the archive's `localStorage.removeItem('adonis_v2')`-on-signOut behavior — shown above.)

- [ ] **Step 3: Write the test** (`vi.mock('../auth.js')`; assert: loading true → false after `getSession` resolves; user set from session; `onAuthStateChange` callback updates user; `tier` reflects `user_metadata.tier`; unsubscribe called on unmount). Use `renderHook` + `act` from `@testing-library/react`.

- [ ] **Step 4: Run** `npx vitest run src/services/__tests__/useAuth.test.jsx` — Expected: PASS.

- [ ] **Step 5: Commit** `feat(phase2): useAuth hook (session + metadata tier)`

---

### Task 3: Dark Stripe module (`services/upgrade.js`)

**Files:**
- Create: `src/services/upgrade.js`
- Test: `src/services/__tests__/upgrade.test.js`

**Interfaces:**
- Produces: `PAYMENTS_ENABLED` (const `false`), `STRIPE_LINKS`, `redirectToCheckout(tier, user)` which **throws** `'Payments are not enabled'` while dark. Task 11's profile UI must NOT call it; it exists so post-MVP #1 relights it.

- [ ] **Step 1: Extract both files** (`git show v2-revival-archive:src/services/upgrade.js > src/services/upgrade.js`, same for the test into `src/services/__tests__/`).

- [ ] **Step 2: Adapt module** — add at top and guard first line of `redirectToCheckout`:

```js
// DARK per spec decision 5 — access codes are the only unlock until post-MVP #1 (Bucket List + Stripe).
export const PAYMENTS_ENABLED = false;
```
```js
export function redirectToCheckout(tier, user) {
  if (!PAYMENTS_ENABLED) throw new Error('Payments are not enabled');
  // ...archive body unchanged...
}
```

- [ ] **Step 3: Adapt test** — keep the archive's link-shape assertions but wrap: first test asserts `redirectToCheckout('pro', {id:'x', email:'y'})` throws `'Payments are not enabled'`; the navigation assertions move into a test that temporarily can't run while dark — DELETE them and instead assert `STRIPE_LINKS.pro` and `.elite` still match `https://buy.stripe.com/...` (string prefix), so the links survive for relight without live-path tests.

- [ ] **Step 4: Run** `npx vitest run src/services/__tests__/upgrade.test.js` — Expected: PASS.

- [ ] **Step 5: Commit** `feat(phase2): port upgrade.js DARK (throws while payments disabled)`

---

### Task 4: AuthScreen + `isProfileIncomplete`

**Files:**
- Create: `src/auth/AuthScreen.jsx`, `src/auth/ProfileSetup.jsx`
- Test: `src/auth/__tests__/ProfileSetup.test.js`, `src/auth/__tests__/AuthScreen.test.jsx`

**Interfaces:**
- Consumes: Task 1's `signUpWithEmail`, `signInWithEmail`.
- Produces: `AuthScreen({ heading, subheading })` default export (renders email/password sign-in/sign-up; session change is observed by `useAuth`, no success callback needed); `isProfileIncomplete(profile)` named export from `ProfileSetup.jsx`. Task 11 imports both.

- [ ] **Step 1: Extract** all three archive files (`src/auth/AuthScreen.jsx`, `src/auth/ProfileSetup.jsx`, `src/auth/__tests__/ProfileSetup.test.js`) via `git show`.

- [ ] **Step 2: Adapt AuthScreen** — (a) DELETE the Google button, its divider, and the `signInWithGoogle` import (deferred per ledger — leave a one-line comment `// Google OAuth deferred — see parity ledger 2026-07-09`). (b) Accept optional `{ heading = 'Adonis', subheading = 'Sign up to unlock your protocol' }` props and render them through the design system's `H` component (design contract). (c) Verify it uses `s.inp`/`s.pri` styles and `.adn-reveal` on the card container; add if missing.

- [ ] **Step 3: Write AuthScreen test** — render; assert email + password inputs and a submit button exist; no text matches `/google/i`; toggling mode swaps button label between `/sign in/i` and `/sign up/i`; submitting with `signUpWithEmail` mocked to `{user:null, error:{message:'boom'}}` renders `boom`. `vi.mock('../../services/auth.js')`.

- [ ] **Step 4: Run** `npx vitest run src/auth/` — Expected: PASS (ProfileSetup test rides verbatim).

- [ ] **Step 5: Commit** `feat(phase2): AuthScreen (email-only) + isProfileIncomplete`

---

### Task 5: Onboarding question primitives

**Files:**
- Create: `src/onboarding/question-types.js`, `src/onboarding/QuestionField.jsx`
- Test: `src/onboarding/__tests__/question-types.test.js`

**Interfaces:**
- Produces: `validateAnswer(question, value)`, `shouldShowQuestion(question, profile, protocolStates)` (named exports); `QuestionField({ question, value, onChange })` default export handling types `text|number|date|toggle|select|multi`. Tasks 6-7 rely on the question schema `{id,type,label,subtitle,required,min,max,options,dependsOn}`.

- [ ] **Step 1: Extract both** via `git show v2-revival-archive:src/onboarding/<file>` (create `src/onboarding/` first). Verbatim — no adaptations.

- [ ] **Step 2: Write the test** (the archive shipped none): `validateAnswer` — required text empty → error string; number below `min` → error; valid → null. `shouldShowQuestion` — no `dependsOn` → true; `dependsOn` matching/unmatching a `protocolStates` answer → true/false.

- [ ] **Step 3: Run** `npx vitest run src/onboarding/__tests__/question-types.test.js` — Expected: PASS.

- [ ] **Step 4: Commit** `feat(phase2): onboarding question primitives`

---

### Task 6: Protocol onboarding layer (collectors + 11 grafts)

**Files:**
- Modify: `src/protocols/protocol-interface.js` (append collectors), and each of: `src/protocols/body/workout/index.js`, `body/nutrition/index.js`, `body/peptides/index.js`, `money/credit/index.js`, `money/income/index.js`, `travel/citizenship/index.js`, `image/skincare/index.js`, `mind/index.js`, `purpose/index.js`, `environment/index.js`, `community/index.js`
- Test: `src/protocols/__tests__/onboarding-questions.test.js`

**Interfaces:**
- Produces: `collectOnboardingQuestions(protocols, profile) → [{protocol, questions}]` and `collectOnboardingSummaries(protocols, profile, protocolStates) → [...]` (named exports from `protocol-interface.js`); every registered protocol gains `getOnboardingQuestions()` and `getOnboardingSummary(state, profile)` methods. Task 7's OnboardingFlow and Task 8's GamePlanScreen consume these.

**⚠ GRAFT, don't copy:** main's protocol `index.js` files are NEWER than the archive's (workout has progression/keys modules; credit has cards-db/cards-logic). For each protocol: `git show v2-revival-archive:src/protocols/<p>/index.js`, locate ONLY the `getOnboardingQuestions` and `getOnboardingSummary` methods (and any constants they alone reference), and add them to main's protocol object. Zero other lines change — verify with `git diff` per file that only additions appear.

- [ ] **Step 1: Write the failing test first:**

```js
import { describe, it, expect } from 'vitest';
import '../register-all.js';
import { getAllProtocols } from '../registry.js';
import { collectOnboardingQuestions, collectOnboardingSummaries } from '../protocol-interface.js';

describe('protocol onboarding layer', () => {
  it('every registered protocol exposes onboarding methods', () => {
    const all = getAllProtocols();
    expect(all.length).toBeGreaterThanOrEqual(11);
    for (const p of all) {
      expect(typeof p.getOnboardingQuestions, `${p.id} missing getOnboardingQuestions`).toBe('function');
      expect(typeof p.getOnboardingSummary, `${p.id} missing getOnboardingSummary`).toBe('function');
      const qs = p.getOnboardingQuestions();
      expect(Array.isArray(qs)).toBe(true);
      for (const q of qs) { expect(q.id).toBeTruthy(); expect(q.type).toBeTruthy(); }
    }
  });
  it('collectors group by protocol and respect profile domains', () => {
    const all = getAllProtocols();
    const sections = collectOnboardingQuestions(all, { domains: ['body'] });
    expect(sections.length).toBeGreaterThan(0);
    for (const s of sections) expect(s.protocol.domain).toBe('body');
    const summaries = collectOnboardingSummaries(all, { domains: ['body'] }, {});
    expect(Array.isArray(summaries)).toBe(true);
  });
});
```

(Adjust the two collector assertions to the archive's ACTUAL return shape after reading `git show v2-revival-archive:src/protocols/protocol-interface.js` — the shape above is the expected contract; if the archive differs, the archive wins and this test documents it.)

- [ ] **Step 2: Run it** — Expected: FAIL (`collectOnboardingQuestions` not exported).
- [ ] **Step 3: Append the collector functions** from the archive's `protocol-interface.js` (the 60-line block) verbatim to main's file.
- [ ] **Step 4: Graft the two methods into all 11 protocol files** per the ⚠ procedure above.
- [ ] **Step 5: Run** `npx vitest run src/protocols/` — Expected: ALL PASS (existing protocol tests must stay green — proves the grafts didn't disturb main's logic).
- [ ] **Step 6: Commit** `feat(phase2): graft protocol onboarding questions/summaries from archive`

---

### Task 7: OnboardingFlow

**Files:**
- Create: `src/onboarding/OnboardingFlow.jsx`
- Test: `src/onboarding/__tests__/OnboardingFlow.test.jsx`

**Interfaces:**
- Consumes: Task 5's QuestionField/question-types, Task 6's collectors, `getAllProtocols`, design system (`GradText`, `Select`, theme, `DOMAINS`).
- Produces: default export `OnboardingFlow({ initialProfile, onComplete })`; `onComplete(finalProfile, protocolAnswers)` where `finalProfile` includes coerced numerics + `workMode/workStart/workEnd/restDay`, and `protocolAnswers` maps `protocolId → {questionId: answer}`. Task 11 wires it.

- [ ] **Step 1: Extract verbatim** `git show v2-revival-archive:src/onboarding/OnboardingFlow.jsx > src/onboarding/OnboardingFlow.jsx`. No adaptations (its 🔒 Pro badges and body-locked domain logic are spec-correct).
- [ ] **Step 2: Write the test** — render with `initialProfile: {}`; step 0 shows basics inputs (name/age/weight); fill them, advance; step 1 shows domain grid with Body pre-selected and un-toggleable (click it, assert still selected); advance through the body protocol sections answering required questions via `QuestionField` inputs; schedule step; final advance calls `onComplete` — assert the profile arg has numeric `age`/`weight` and the schedule fields, and `protocolAnswers.workout` exists. (This is the heaviest component test in the phase; drive it with `fireEvent`/`userEvent` and query by labels from the protocol question definitions.)
- [ ] **Step 3: Run** `npx vitest run src/onboarding/__tests__/OnboardingFlow.test.jsx` — Expected: PASS.
- [ ] **Step 4: Commit** `feat(phase2): port OnboardingFlow`

---

### Task 8: CalculatingScreen + GamePlanScreen

**Files:**
- Create: `src/onboarding/CalculatingScreen.jsx`, `src/onboarding/GamePlanScreen.jsx`
- Test: `src/onboarding/__tests__/screens.test.jsx`

**Interfaces:**
- Produces: `CalculatingScreen({ profile, onComplete })` (auto-calls `onComplete` after its ~3.5s animation) and `GamePlanScreen({ profile, protocolStates, onStart })` (renders per-protocol summary cards + Free-tier upsell; Start button → `onStart()`). Task 11 wires both.

- [ ] **Step 1: Extract both verbatim** via `git show`.
- [ ] **Step 2: Write smoke tests** — CalculatingScreen: `vi.useFakeTimers()`, render with `profile:{domains:['body']}`, advance timers past 5s inside `act`, assert `onComplete` called once. GamePlanScreen: render with `profile:{domains:['body'],tier:'free'}` + `protocolStates:{}`, assert a Start button and that clicking calls `onStart`; assert the Free upsell card does NOT navigate anywhere (no `redirectToCheckout` import — grep in Step 3).
- [ ] **Step 3: Guard the dark-Stripe constraint:** `grep -n "redirectToCheckout\|buy.stripe.com" src/onboarding/GamePlanScreen.jsx` → if the archive version wires an upgrade button to checkout, replace that handler with a no-op pointing at access codes: button text `Have an access code? Redeem in Profile` (plain, `s.out` style). Document as adaptation.
- [ ] **Step 4: Run** `npx vitest run src/onboarding/__tests__/screens.test.jsx` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(phase2): calculating + game-plan screens (Stripe dark)`

---

### Task 9: Initial goals from onboarding answers

**Files:**
- Create: `src/onboarding/initial-goals.js`
- Test: `src/onboarding/__tests__/initial-goals.test.js`

**Interfaces:**
- Consumes: `GOAL_TEMPLATES`/`getTemplatesForDomain`, `createGoalFromTemplate`, `createGoalFromInput` (all exist in main).
- Produces: `buildInitialGoals(profile, protocolStates) → goal[]`. Task 11 calls it once at onboarding completion.

- [ ] **Step 1: Extract verbatim** `git show v2-revival-archive:src/onboarding/initial-goals.js > src/onboarding/initial-goals.js`.
- [ ] **Step 2: Write the test** (archive shipped none): body-only profile with `workout.primary:'Fat Loss'`, `nutrition:{goalWeight:180, targetDate:'2026-12-01'}` → one goal, `templateId:'lose-weight'`, `deadline:'2026-12-01'`; `primary:'Muscle Gain'` → `build-muscle`; money domain with `credit:{primaryFocus:'Card stacking'}` → `cc-stacking` goal; multi-domain profile → one goal per selected domain; empty protocolStates → still returns ≥1 body goal without throwing.
- [ ] **Step 3: Run** `npx vitest run src/onboarding/__tests__/initial-goals.test.js` — Expected: PASS (fix the test's expectations against actual archive behavior if a mapping differs — the archive is the source of truth for THIS task; goal-shape changes come in Task 10).
- [ ] **Step 4: Commit** `feat(phase2): initial goals from onboarding answers`

---

### Task 10: Decomposition-ready goal model

**Files:**
- Modify: `src/goals/goal-engine.js`, `src/state/store.jsx:32-42` (ADD_GOAL reducer)
- Test: `src/goals/__tests__/goal-engine.test.js` (extend), `src/state/__tests__/store.test.jsx` (extend)

**Interfaces:**
- Produces: every goal object gains `parentId: null`; `createGoalFromTemplate(template, answers, opts?)` and `createGoalFromInput(input, opts?)` accept `opts.parentId`; new `createChildGoal(parentGoal, input) → goal` (inherits `parentId: parent.id` and `deadline: input.deadline || parent.deadline`); `progress`/`revenue` are ALWAYS objects (`{percent, current, trend, projectedCompletion}` / `{total, items}`). Bucket List (post-MVP) builds on exactly this.

**Background — the shape bug this fixes:** the reducer initializes `progress` as an object but goal-engine emits scalar `0`, and the payload spread wins — so template goals persist scalar `progress`, breaking `g.progress?.percent` readers in `App.jsx:272,318`.

- [ ] **Step 1: Write failing tests** in `goal-engine.test.js`:

```js
it('goals carry parentId (null by default, settable via opts)', () => {
  const g = createGoalFromInput({ title: 'x', domain: 'body' });
  expect(g.parentId).toBeNull();
  const c = createGoalFromInput({ title: 'y', domain: 'money' }, { parentId: g.id });
  expect(c.parentId).toBe(g.id);
});
it('createChildGoal inherits parent deadline when input has none', () => {
  const parent = createGoalFromInput({ title: 'Egypt', domain: 'purpose', deadline: '2027-06-01' });
  const child = createChildGoal(parent, { title: 'Save $3k', domain: 'money' });
  expect(child.parentId).toBe(parent.id);
  expect(child.deadline).toBe('2027-06-01');
  const child2 = createChildGoal(parent, { title: 'Visa', domain: 'travel', deadline: '2027-03-01' });
  expect(child2.deadline).toBe('2027-03-01');
});
it('progress and revenue are always objects', () => {
  const g = createGoalFromInput({ title: 'x', domain: 'body' });
  expect(g.progress).toEqual({ percent: 0, current: null, trend: 'on_track', projectedCompletion: null });
  expect(g.revenue).toEqual({ total: 0, items: [] });
});
```

- [ ] **Step 2: Run** — Expected: FAIL (parentId undefined, progress is 0).
- [ ] **Step 3: Implement** in `goal-engine.js`: add `opts = {}` param to both creators; emit `parentId: opts.parentId || null`, object-form `progress`/`revenue` (shapes above); add `createChildGoal` (creates via `createGoalFromInput` then sets `parentId`, deadline-inheritance rule above); update `updateGoalProgress` to return the full object shape `{percent, current, trend, projectedCompletion}` (compute `current` from its `currentValue` arg; keep trend logic unchanged). Update `initial-goals.js` call sites ONLY if signatures force it (they shouldn't — opts is optional).
- [ ] **Step 4: Run the whole goals + state + app suites** `npx vitest run src/goals src/state src/app` — Expected: PASS, including pre-existing tests (if a pre-existing test asserted scalar `progress: 0`, update it — that test was encoding the bug).
- [ ] **Step 5: Commit** `feat(phase2): decomposition-ready goals — parentId, createChildGoal, object progress`

---

### Task 11: App funnel wiring (the gate)

**Files:**
- Modify: `src/main.jsx` (mount `ToastProvider`), `src/app/App.jsx` (funnel state machine before the tab shell)
- Test: `src/app/__tests__/App.test.jsx` (extend), `src/app/__tests__/funnel.test.jsx` (new)

**Interfaces:**
- Consumes: Tasks 2 (useAuth), 4 (AuthScreen, isProfileIncomplete), 7-9 (OnboardingFlow, CalculatingScreen, GamePlanScreen, buildInitialGoals), existing `useAppState`.
- Produces: funnel order **onboarding → signup → calculating → gameplan → app** (spec decision 4: signup before protocol delivery). Boot splash while session resolves.

- [ ] **Step 1: Mount ToastProvider** in `src/main.jsx` around `<App/>` (inside StateProvider): `import { ToastProvider } from '../design/components/Toast.jsx'` — check the actual export path/names in `src/design/components/` first and use those.

- [ ] **Step 2: Write failing funnel tests** (`funnel.test.jsx`; mock `../../services/useAuth.js` and stub the three onboarding screens' timers where needed):
  - fresh state (empty profile) + no user → OnboardingFlow renders (assert its step-0 heading), NOT the tab shell;
  - complete profile + no user → AuthScreen renders;
  - complete profile + user → tab shell renders (Routine tab);
  - `loading: true` → splash renders (query by `data-testid="boot-splash"`), no AuthScreen flash.

- [ ] **Step 3: Implement in App.jsx.** Sketch (adapt to the file's existing structure — `state`, `setProfile`, `setProtocolState`, `addGoal` already come from `useAppState()` at L18):

```jsx
import { useAuth } from '../services/useAuth.js';
import { isProfileIncomplete } from '../auth/ProfileSetup.jsx';
import AuthScreen from '../auth/AuthScreen.jsx';
import OnboardingFlow from '../onboarding/OnboardingFlow.jsx';
import CalculatingScreen from '../onboarding/CalculatingScreen.jsx';
import GamePlanScreen from '../onboarding/GamePlanScreen.jsx';
import { buildInitialGoals } from '../onboarding/initial-goals.js';

// inside App():
const { user, tier: authTier, loading: authLoading } = useAuth();
const [funnel, setFunnel] = useState(null); // null = derive; 'calculating' | 'gameplan' are transient

const handleOnboardingComplete = (profileUpdates, protocolAnswers) => {
  const primary = protocolAnswers?.workout?.primary;
  if (primary) profileUpdates.fitnessPillars = [primary];
  setProfile(profileUpdates);
  Object.entries(protocolAnswers || {}).forEach(([pid, answers]) => setProtocolState(pid, answers));
  buildInitialGoals({ ...profile, ...profileUpdates }, protocolAnswers).forEach(addGoal);
  setFunnel('signup'); // signup gate BEFORE protocol delivery (spec decision 4)
};

if (authLoading) return <BootSplash />;                     // data-testid="boot-splash"
if (funnel === 'signup' && !user) return <AuthScreen subheading="Create your account to unlock your game plan" />;
if (funnel === 'signup' && user) { setFunnel('calculating'); return <BootSplash />; }
if (funnel === 'calculating') return <CalculatingScreen profile={profile} onComplete={() => setFunnel('gameplan')} />;
if (funnel === 'gameplan') return <GamePlanScreen profile={profile} protocolStates={protocolState} onStart={() => setFunnel(null)} />;
if (isProfileIncomplete(profile)) return <OnboardingFlow initialProfile={profile} onComplete={handleOnboardingComplete} />;
if (!user) return <AuthScreen />;                            // returning device, signed out
// ...existing tab shell unchanged below...
```

`BootSplash` = minimal centered `GradText` "Adonis" on `P.bg` with `.adn-reveal` (design contract; this is the Phase-1-deferred boot splash landing here).

- [ ] **Step 4: Run** `npx vitest run src/app` — Expected: PASS including the pre-existing App shell smoke test (update its setup to mock `useAuth` as signed-in with complete profile so it still reaches the shell).
- [ ] **Step 5: Manual smoke:** `npm run dev:app -- --port 4321 --strictPort`, open clean-profile browser → onboarding appears; complete it → AuthScreen; sign up with a throwaway email → calculating → game plan → app. (Supabase email-confirm may block full signup until the manual dashboard step — sign-IN with an existing account is the fallback check.)
- [ ] **Step 6: Commit** `feat(phase2): auth-gated onboarding funnel (onboard → signup → calculating → gameplan → app)`

---

### Task 12: Subscribers upsert (lead capture)

**Files:**
- Create: `app/api/app-signup/route.js`, `lib/appSignup.js`
- Modify: `src/app/App.jsx` (fire-and-forget POST when funnel passes signup)
- Test: `lib/appSignup.test.mjs` → NO — repo convention: vitest files; use `lib/__tests__/appSignup.test.js`

**Interfaces:**
- Produces: `buildSubscriberRow(email, firstName) → {email, first_name, source:'adonis-app', subscribed_at}` (throws on invalid email) in `lib/appSignup.js`; `POST /api/app-signup {email, firstName}` upserting into `subscribers` with `Prefer: resolution=ignore-duplicates` (existing subscribers keep their welcome-drip timestamps). DoD: "signups upsert into the subscribers table so the existing welcome-email cron picks them up."

- [ ] **Step 1: Failing test** for `buildSubscriberRow`: valid email → row with lowercased/trimmed email, `source:'adonis-app'`, ISO `subscribed_at`; `firstName` optional → `first_name: null`; garbage email → throws.
- [ ] **Step 2: Implement `lib/appSignup.js`:**

```js
export function buildSubscriberRow(email, firstName) {
  const e = String(email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) throw new Error('valid email required');
  return { email: e, first_name: (firstName || '').trim() || null, source: 'adonis-app', subscribed_at: new Date().toISOString() };
}
```

- [ ] **Step 3: Implement the route** (mirrors the repo's service-key REST pattern, e.g. `app/api/cron/welcome-emails/route.js:16-17`):

```js
import { NextResponse } from 'next/server';
import { buildSubscriberRow } from '../../../lib/appSignup.js';

export async function POST(request) {
  let row;
  try { const b = await request.json(); row = buildSubscriberRow(b.email, b.firstName); }
  catch { return NextResponse.json({ error: 'valid email required' }, { status: 400 }); }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const res = await fetch(`${url}/rest/v1/subscribers?on_conflict=email`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates' },
    body: JSON.stringify([row]),
  });
  if (!res.ok) return NextResponse.json({ error: 'subscriber upsert failed' }, { status: 502 });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Wire the client call** in App.jsx inside the `funnel === 'signup' && user` transition (before `setFunnel('calculating')`):

```js
fetch('/api/app-signup', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: user.email, firstName: profile.name }),
}).catch(() => {}); // lead capture must never block the funnel; relative URL resolves in prod (app served under the Next domain) and no-ops in vite dev
```

- [ ] **Step 5: Run** `npx vitest run lib/__tests__/appSignup.test.js && npm run build` (next build must stay clean) — Expected: PASS / clean.
- [ ] **Step 6: Commit** `feat(phase2): app-signup subscribers upsert (welcome-drip lead capture)`

---

### Task 13: Access code → user metadata

**Files:**
- Modify: `src/app/App.jsx` (`handleAccessCode`, ~L73), `src/services/useAuth.js` consumers
- Test: `src/app/__tests__/access-code-sync.test.jsx`

**Interfaces:**
- Consumes: Task 1's `updateUserTier`; existing `validateAccessCode`.
- Produces: redeeming a code sets local `profile.tier` AND stamps `{tier, access_code}` into Supabase user metadata; on any sign-in where metadata tier > local tier, local profile is upgraded (unlocks survive reinstall).

- [ ] **Step 1: Failing tests** — (a) mock `updateUserTier`; render app signed-in, redeem `FOUNDER` in the profile tab's code input → assert `updateUserTier('elite', 'FOUNDER')` called and tier badge shows Elite; (b) mock `useAuth` returning user with `user_metadata: {tier: 'pro'}` and fresh local profile (`tier:'free'`) → assert profile tab shows Pro (restore-on-login effect).
- [ ] **Step 2: Implement** — in `handleAccessCode`: after `setProfile({ tier: result.tier })`, if `user` exists call `updateUserTier(result.tier, code).catch(() => {})`. Add restore effect:

```js
const TIER_RANK = { free: 0, pro: 1, elite: 2 };
useEffect(() => {
  if (user && TIER_RANK[authTier] > TIER_RANK[profile.tier || 'free']) setProfile({ tier: authTier });
}, [user, authTier]);
```

- [ ] **Step 3: Run** `npx vitest run src/app` — Expected: PASS.
- [ ] **Step 4: Commit** `feat(phase2): access-code tier stamped to user metadata + restore on login`

---

### Task 14: Dev/E2E bypass + screenshot routes

**Files:**
- Modify: `src/app/App.jsx` (dev-only bypass), `scripts/screenshot-baseline.sh` (ROUTES)
- Test: `src/app/__tests__/e2e-bypass.test.jsx`

**Interfaces:**
- Produces (dev builds only, `import.meta.env.DEV`): URL params `?e2e=1` (seeded complete profile, skip auth+onboarding, straight to app), `&tab=routine|body|profile` (initial tab), `?screen=onboarding|auth` (force those screens unauthenticated). This is the Verification-addendum requirement so the screenshot shooter can reach inner screens; it must be dead code in production builds.

- [ ] **Step 1: Failing tests** — with `import.meta.env.DEV` true (vitest default): render App with `window.location.search='?e2e=1&tab=profile'` (use `window.history.replaceState`) and `useAuth` mocked signed-out → tab shell renders on profile tab (assert profile heading), no AuthScreen; `?screen=auth` → AuthScreen renders despite empty profile.
- [ ] **Step 2: Implement** at the TOP of the funnel logic in App.jsx:

```js
const params = import.meta.env.DEV ? new URLSearchParams(window.location.search) : null;
const e2e = params?.get('e2e') === '1';
const forcedScreen = params?.get('screen');
useEffect(() => {
  if (e2e && isProfileIncomplete(profile)) {
    setProfile({ name: 'E2E', age: 30, gender: 'male', weight: 185, goalW: 175, hFt: 5, hIn: 11, activity: 'moderate', domains: ['body'], tier: 'elite' });
  }
}, [e2e]);
useEffect(() => { if (e2e && params?.get('tab')) setActiveTab(params.get('tab')); }, [e2e]);
// in the gate chain, FIRST lines:
if (forcedScreen === 'auth') return <AuthScreen />;
if (forcedScreen === 'onboarding') return <OnboardingFlow initialProfile={{}} onComplete={handleOnboardingComplete} />;
if (!e2e) { /* ...normal authLoading/funnel/gate chain from Task 11... */ }
```

(Structure it however reads cleanest in the real file — the contract is the params table above.)

- [ ] **Step 3: Update `scripts/screenshot-baseline.sh` ROUTES:**

```bash
ROUTES=(
  "/?screen=onboarding|onboarding-step0"
  "/?screen=auth|auth"
  "/?e2e=1&tab=routine|routine"
  "/?e2e=1&tab=body|body"
  "/?e2e=1&tab=profile|profile"
)
```

- [ ] **Step 4: Run** the tests, then `npm run build:app` and `grep -c "e2e" dist/assets/*.js || true` — spot-check the bypass didn't bloat prod (DEV-gated code is tree-shaken; a few residual matches in vendored code are fine, the seeded-profile literal `'E2E'` must NOT appear: `grep -c "'E2E'" dist/assets/*.js` → 0).
- [ ] **Step 5: Commit** `feat(phase2): dev e2e bypass + screenshot routes (verification addendum)`

---

### Task 15: Phase close — the gates

**Files:**
- Modify: `docs/v1-feature-parity-ledger.md` (check off Phase 2 rows), `docs/visual-baselines/phase-2/` (new)

- [ ] **Step 1: Full suite** `npm test` — Expected: green (all pre-existing + new).
- [ ] **Step 2: Builds** `npm run build:app && npm run build` — Expected: both clean.
- [ ] **Step 3: Archive diff gate** (spec Verification): `git diff v2-revival-archive main -- src/onboarding src/auth src/services` — review every hunk; each difference must be one of this plan's documented adaptations (no /v2/, no Google UI, dark Stripe, metadata tiers, defaults.js guard). Anything else = polish that must be folded in or consciously rejected in a dated ledger note.
- [ ] **Step 4: Screenshot baseline** — dev server on 4321, then `BASE_URL=http://localhost:4321 scripts/screenshot-baseline.sh phase-2`; eyeball all 5 shots (design contract: H headers, backdrop, no unstyled screens); compare `routine` against `docs/visual-baselines/phase-1/auth-gate.png`-era shell for regressions.
- [ ] **Step 5: Ledger** — check off Phase 2 rows in `docs/v1-feature-parity-ledger.md` (Onboarding & Auth section: wizard adapt ✓, anonymous drop ✓, email+password port ✓, Google defer ✓ noted, cloud sync defer ✓; Tiers: gating adapt ✓, Stripe defer ✓) with a dated note.
- [ ] **Step 6: Commit** `docs(phase2): phase-close gates — ledger, baseline phase-2`
- [ ] **Step 7: FLAG THE MANUAL STEP to Jorrel** (do not attempt it): Supabase dashboard → Authentication → enable Email provider, email confirmations, Site URL `https://adonis.pro`, redirect URLs `https://adonis.pro/app` + `http://localhost:4321`. Until done, real signups can't confirm email; dev testing works via sign-in of pre-confirmed accounts or Supabase's auto-confirm toggle.

---

## Self-review notes

- **Spec coverage:** decision 4 (signup before delivery) → Task 11 funnel order; decision 5 (codes only, Stripe dark) → Tasks 3, 8, 13; decision 7 (decomposition-ready) → Task 10; "subscribers upsert" DoD line → Task 12; "tier/code → user metadata" → Tasks 1, 13; Phase-1-deferred boot splash → Task 11; Verification addendum dev-bypass → Task 14; ledger/baseline/archive-diff gates → Task 15. Supabase dashboard config = flagged manual (Tasks 11, 15).
- **Known judgment call encoded:** `adonis_profiles` table + `fetchAdonisProfile` from the archive are NOT ported — spec's "user metadata" line supersedes the April-era table design (no Stripe columns needed while payments are dark). If post-MVP Stripe needs the table, it returns with post-MVP #1.
- **Type consistency:** `useAuth` returns `{user, tier, loading, signOut}` (Tasks 2/11/13 all use this); goal creators' `opts.parentId` (Tasks 10) doesn't disturb Task 9's calls (opts optional); `buildSubscriberRow` name used in both Task 12 steps.
