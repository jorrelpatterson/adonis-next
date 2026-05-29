# money/career protocol — design spec

**Date:** 2026-05-13
**Status:** Draft
**Scope:** New sub-protocol `money/career/` for the adonis.pro v2 app. Backend-first multi-tenant build that lifts the jorrel-os patterns (daily ingest, Claude-scored opportunity feed, on-demand tailored resume) and adapts them into adonis's routine engine for end users.
**Source context:** Lifts patterns documented in `/Volumes/(626)806-4475/Ai Projects/Docs/jorrel-os-2026-05-build-handoff.md`.

---

## Overview

A new sub-protocol inside the v2 money domain. End users of adonis.pro complete a one-time onboarding (resume upload + 4-screen wizard + 1 Claude chat round) to generate a master career profile. From that point forward, a daily cron pulls fresh job postings from six external sources, scores each against the user's profile (gated by hard filters pulled from the rest of their adonis state), and surfaces the top matches as **routine tasks** ("Apply to [Sales Director @ Sunrun] — 87/100"). Tapping an apply task lazily generates a tailored resume (Claude Sonnet, designed + ATS renders, cached). Submission triggers a follow-up routine task five days later. The loop is `apply → wait → follow up` — no separate dashboard, no scoring slider; everything flows through the existing routine engine.

The differentiator vs. a generic multi-tenant job board: the **hard filter is operator-stack-aware** — it reads geo, training schedule, sleep protocol, and comp floor from the user's other adonis state, eliminating jobs that violate the user's lifestyle constraints before they ever reach the scorer. The score is career-fit. The eligibility is whole-operator-fit.

## Goals

- A routine-native feature that puts daily "apply to X" and "follow up on Y" tasks in front of an adonis user without requiring them to open a separate UI.
- Reuse the jorrel-os patterns verbatim where possible (six sources, Haiku scoring, Sonnet tailoring, two-render artifact, cache-by-id, concurrency-bounded fan-out).
- One-time onboarding that produces a master career profile rich enough to drive useful scoring and tailoring, without forcing the user to hand-write a 400-line markdown file.
- Decouple this feature's ship date from the v2 branch's revival timeline by building it backend-first; v2 client integration becomes a thin protocol shim added later.

## Non-goals

- A separate career dashboard with browse / search / filter UI. Dashboard-like surfaces (past applications, profile management) are minor View additions, not the primary surface.
- A cover-letter or LinkedIn-outreach artifact. Resume only for v1 (designed + ATS). Cover letters and multi-channel kits are deferred.
- Per-user company watchlists. The v1 watchlist is global, curated for the operator persona. Per-user personalization is a v2 feature.
- Auto-application / browser automation. The user copies the tailored output and submits the application themselves.
- Tier gating. The feature is free for all tiers in v1; paywall layered later when usage and unit economics are real.
- Replacing or merging with the existing `money/income/` protocol. Both coexist under `money/`.

## Audience & persona

The feature targets the adonis user — framed in this spec as the "operator-stack" persona: 25–45, money-motivated, treats career + body as one optimization stack. Roles that score well are sales-leadership, founder-adjacent, GM, strategic finance, RevOps leadership, commercial — the lanes where comp upside, leadership scope, and performance-orientation matter. The pre-filter excludes IC engineering, design, marketing-comms, recruiting, and SDR titles. The hard filter further excludes roles whose schedule/geo/comp violate the user's already-stated adonis lifestyle protocols.

## Architecture — two layers

### Layer 1 — Backend service (Vercel Functions + Supabase, multi-tenant)

All heavy/expensive logic lives behind a REST API:

- Daily cron pipeline (ingest, dedup, pre-filter, per-user filter, score)
- Onboarding pipeline (resume parse, wizard save, AI interview chat round, profile generation)
- Lazy tailoring pipeline (Sonnet tool-call, render, cache, return)
- Application lifecycle (submit, follow-up scheduling)

Auth: Supabase Auth (email magic link, scoped to this feature for v1; not a full v2 auth retrofit).

### Layer 2 — Thin v2 protocol (`src/protocols/money/career/`)

Lives on the v2 branch. Implements the existing v2 protocol contract (`canServe`, `getState`, `getTasks`, `getRecommendations`, `getUpsells`). `getState()` fetches `/api/career/state`. `getTasks()` emits routine tasks from that state. A small View component handles the onboarding wizard, the chat round UI, and a past-applications/profile management surface.

No heavy logic on the client. The protocol is a shell over the API.

### Cost split

| Path | Where | Model | Frequency | Cost order |
|---|---|---|---|---|
| Score | Backend cron | Haiku | Daily, per (user × new job that survives filters) | ~$0.001/call |
| Tailor | Backend | Sonnet | Per accept (lazy) | ~$1/call |
| Onboarding | Backend | Sonnet | One-time per user | ~$0.30–$0.60 |
| Hard filter | Backend code | n/a | Per (user × new job) | free |
| Client logic | v2 protocol | n/a | n/a | free |

## Data model — six Supabase tables

```
career_profiles
  id uuid pk, user_id fk → auth.users (unique),
  resume_text text, resume_file_url text,
  wizard_fields jsonb,        -- locked facts (geo, comp, role level, archetype)
  interview_transcript jsonb, -- chat round messages
  profile_md text,            -- full annotated master profile
  profile_summary_md text,    -- 60-line condensed version for scoring
  profile_status text,        -- 'pending' | 'resume_uploaded' | 'wizard_done' | 'interview_done' | 'ready'
  created_at, updated_at

career_target_companies
  id uuid pk,
  source text,                -- 'greenhouse' | 'lever' | 'ashby' | 'workable'
  slug text, name text, active bool,
  created_at
  -- Global watchlist (not per-user in v1).

career_jobs
  id uuid pk,
  source text, external_id text,
  title text, company text, location text,
  remote_type text,           -- 'remote' | 'hybrid' | 'onsite' | null
  comp_min int, comp_max int,
  description text, apply_url text,
  posted_at timestamptz,
  dedup_hash text unique,
  created_at

career_user_jobs
  id uuid pk,
  user_id fk, job_id fk → career_jobs,
  score int,                  -- 0-100, null if filter_passed = false
  score_reasoning text, recommendation text,
  filter_passed bool, filter_reason text,
  status text,                -- 'feed' | 'starred' | 'submitted' | 'archived' | 'dismissed'
  created_at, updated_at,
  unique(user_id, job_id)

career_tailored_resumes
  id uuid pk,
  user_id fk, job_id fk → career_jobs,
  vars_json jsonb,            -- Sonnet tool-call output
  html_designed text,         -- rendered pretty HTML
  markdown_ats text,          -- rendered flat markdown
  model_used text,
  created_at, updated_at,
  unique(user_id, job_id)

career_applications
  id uuid pk,
  user_id fk, job_id fk,
  submitted_at timestamptz,
  follow_up_at timestamptz,   -- submitted_at + 5 days
  follow_up_completed_at timestamptz,
  outcome text,               -- 'no_response' | 'rejected' | 'screen' | 'interview' | 'offer' | 'declined' | 'accepted'
  notes text,
  created_at, updated_at
```

RLS: every table scoped to `auth.uid() = user_id` except `career_target_companies` (read-everyone) and `career_jobs` (read-everyone — jobs are global).

## API surface

### Onboarding (one-time per user)
- `POST /api/career/onboarding/resume` — multipart file or `{text}`. Parses PDF/DOCX/text, saves to `career_profiles`, returns extracted structure.
- `POST /api/career/onboarding/wizard` — `{geo, comp_floor, role_level, archetype, remote_pref, schedule_constraints}`. Upserts `wizard_fields`. `schedule_constraints` is a flexible jsonb so the hard-filter logic can evolve (initial fields: `earliest_start_local`, `latest_end_local`, `on_call_ok`).
- `POST /api/career/onboarding/interview/start` — kicks off Claude chat session, returns `{session_id, question_1}`.
- `POST /api/career/onboarding/interview/reply` — `{session_id, reply}`, returns `{next_question}` or `{done: true}`.
- `POST /api/career/onboarding/finalize` — final Sonnet call → builds `profile_md` + `profile_summary_md`. Sets `profile_status = 'ready'`.

### Daily routine (called by the v2 protocol)
- `GET /api/career/state` — returns `{profile_status, feed: top-N scored jobs in 'feed' status, applications: pending follow-ups}`. Cached briefly per-user. All API routes authenticate via Supabase Auth session cookie; `user_id` is derived from `auth.uid()` on the server, never trusted from the client.
- `PATCH /api/career/user-jobs/:id` — `{status}`. Updates star/archive/dismiss.

### Apply flow
- `POST /api/career/user-jobs/:id/tailor` — `{force?: bool}`. Returns cached or generates fresh tailored resume.
- `POST /api/career/user-jobs/:id/submit` — marks `status = 'submitted'`, writes `career_applications` row with `follow_up_at = now + 5d`.
- `POST /api/career/applications/:id/follow-up-complete` — sets `follow_up_completed_at`.

### Cron (internal, bearer `CRON_SECRET`)
- `GET /api/cron/career/ingest` — daily 6am PT (`0 14 * * *` UTC). `maxDuration: 600`.

## v2 protocol contract

```js
// src/protocols/money/career/index.js
const careerProtocol = {
  id: 'career',
  domain: 'money',
  name: 'Career',
  icon: '\u{1F4BC}',

  canServe: (goal) => goal?.domain === 'money',

  async getState(profile) {
    return fetch('/api/career/state').then(r => r.json());
  },

  getTasks(state, profile, day) {
    // Onboarding gate — only task surfaced is the onboarding nudge
    if (state.profile_status !== 'ready') {
      return [{
        id: 'career-onboarding', title: 'Set up your career engine',
        type: 'guided', category: 'career', priority: 1, skippable: false,
        data: { step: state.profile_status }
      }];
    }

    // Apply tasks — top-N from feed (MAX_APPLY_PER_DAY default = 3; tunable via routine prioritizer capacity)
    const applyTasks = state.feed.slice(0, MAX_APPLY_PER_DAY).map(j => ({
      id: `career-apply-${j.id}`,
      title: `Apply to ${j.title} @ ${j.company}`,
      sub: `${j.score}/100 — ${j.score_reasoning}`,
      type: 'action', category: 'career', priority: 2, skippable: true,
      data: { userJobId: j.id, applyUrl: j.apply_url }
    }));

    // Follow-up tasks — applications past follow_up_at
    const now = Date.now();
    const followups = (state.applications || [])
      .filter(a => !a.follow_up_completed_at && new Date(a.follow_up_at).getTime() <= now)
      .map(a => ({
        id: `career-followup-${a.id}`,
        title: `Follow up with ${a.company}`,
        sub: `${daysAgo(a.submitted_at)} days since you applied`,
        type: 'action', category: 'career', priority: 2, skippable: false,
        data: { applicationId: a.id }
      }));

    return [...applyTasks, ...followups];
  },

  getRecommendations: (state) => [/* e.g. "refresh your profile" at 90d */],
  getUpsells: (state, profile) => [/* tier-gated later */],
};
```

## Pipelines — detail

### A. Onboarding pipeline (one-time per user)

1. **Trigger.** User taps the "Set up your career engine" task in their routine. Task carries `data.step` = current `profile_status`, so the client knows which screen to render.
2. **Resume upload.** UI accepts PDF / DOCX / pasted text. Backend parses (`pdf-parse` for PDF, `mammoth` for DOCX, passthrough for text). Saves raw text + original file in Supabase Storage. Returns extracted structured fields (companies, roles, dates, education) for wizard prefill. `profile_status → 'resume_uploaded'`.
3. **Wizard — 4 screens.**
   - Screen 1: confirm/edit parsed roles, dates, titles, companies.
   - Screen 2: geo + remote pref (current city, max commute miles, remote/hybrid/onsite tolerance).
   - Screen 3: comp floor + role level (current TC, minimum acceptable, role level: IC / manager / director / VP / founder).
   - Screen 4: operator archetype (sales leader / founder / GM / strategic finance / ops leader / commercial / other).
   These fields become the *locked facts* that the tailoring prompt later forbids Claude from altering. `profile_status → 'wizard_done'`.
4. **AI interview — Claude chat round.** Single Sonnet conversation, ≤5 questions, ~5 min user time. System prompt directs Claude to ask only about gaps in the resume + wizard data, focusing on (1) what was broken at the user's last 1–2 companies when they arrived, (2) operating principles they've coined (voice), (3) industry depth markers, (4) no-go zones, (5) what they're optimizing for in the next 24 months. Skips questions where the answer is already clear. Ends round when sufficient. Transcript saved. `profile_status → 'interview_done'`.
5. **Finalize.** A single Sonnet call takes (parsed resume, wizard fields, transcript) and emits two artifacts: `profile_md` (full annotated profile, ~300–500 lines, jorrel-os's `profile-master.md` analog) + `profile_summary_md` (~60-line condensed for scoring). Save both. `profile_status → 'ready'`. Onboarding task drops out of the routine; apply tasks start surfacing on the next cron tick.

### B. Daily ingest + score pipeline (cron 6am PT)

1. Load active rows from `career_target_companies`. For each, call the matching ATS API (Greenhouse / Lever / Ashby / Workable). In parallel.
2. Call Adzuna + JSearch with broad operator-track queries — configurable in `config/career-sources.json` (e.g., "Sales Director", "VP Sales", "GM", "Head of Revenue", "Founding AE", "RevOps Lead", "Director of Sales").
3. Dedup by `SHA256(normalize(company|title|state))`.
4. Pre-filter in code: drop titles matching `exclude_title_keywords` (Engineer, Designer, Recruiter, Marketing Manager, etc.). Tuned for the operator persona.
5. Upsert into `career_jobs` (ignore-duplicates on `dedup_hash`).
6. For each user with `profile_status = 'ready'`:
   - For each new job not yet in `career_user_jobs` for this user:
     - **Hard filter** (in code, no LLM): check geo (job location vs user city/commute), remote_type (user's remote pref), comp_min (user's comp floor), and schedule constraints (e.g., user has morning training → reject jobs with required 6am-EST starts if user is in PST).
     - If filter fails: insert `{score: null, filter_passed: false, filter_reason: '...'}`. Don't score.
     - If filter passes: queue for scoring.
   - Score queued jobs via Haiku with concurrency=10 (jorrel-os pattern). Returns `{score, reasoning, recommendation}`. Insert as `career_user_jobs` row with `status = 'feed'`.
7. `maxDuration: 600`. Bearer `CRON_SECRET` OR Vercel cron user-agent.

### C. On-accept tailoring pipeline

1. Client calls `POST /api/career/user-jobs/:id/tailor`.
2. Backend reads `career_user_jobs` → `career_jobs` → user's `career_profiles.profile_md`.
3. Cache check on `career_tailored_resumes(user_id, job_id)`. If hit and `force !== true`, return it.
4. Best-effort fetch of company website (jorrel-os pattern; ignore on failure).
5. Sonnet tool-call with strict `TailoredVars` schema (lifted from jorrel-os, re-tuned for adonis voice). System prompt enforces:
   - No fabrication: every claim traces to the profile.
   - Historical fact lock: dates, locations, titles, on-site/remote status are immutable.
   - Voice consistency: action-verb, impersonal, no first/third-person pronouns (per jorrel-os doc pattern #3).
6. Pass `vars_json` through both renderers:
   - `lib/templates/career-resume-pretty.ts` → designed two-page HTML (adonis dark theme + serif headlines + holographic accent — re-skin of jorrel-os's pretty template).
   - `lib/templates/career-resume-ats.ts` → flat markdown (lift-from-jorrel-os, minor voice retune).
7. Upsert `career_tailored_resumes`. Return both renders.
8. Client displays the artifact + a Submit button. On Submit: `POST /api/career/user-jobs/:id/submit` → backend writes `career_applications` row, `follow_up_at = now + 5d`, sets `career_user_jobs.status = 'submitted'`.

## Adonis-specific touches

These are the design decisions that make this *adonis* and not just multi-tenant jorrel-os:

- **Routine-native surface.** No separate dashboard. Tasks compete in the existing routine prioritizer alongside body/peptide/training tasks.
- **Operator-stack hard filter.** Geo / hours / comp / schedule pulled from adonis state, not asked again in the interview.
- **Persona-tuned watchlist** (curated 30–50 companies in the operator lane, not generic).
- **Persona-tuned pre-filter keywords** (drop SDR, recruiter, designer, IC eng).
- **Persona-tuned scoring rubric** (favor comp upside, leadership scope, founder-adjacency, commission-track).
- **Voice consistency** in the tailoring prompt matched to adonis brand (terse, action-verb, performance-oriented).
- **Interview voiced** as adonis, not generic career-services chatbot.

## Open items deferred to implementation

These are details that don't need to be settled in this spec — the implementation plan picks them up:

- The 30–50 companies in the v1 watchlist (operator-persona curated).
- The exact `exclude_title_keywords` list.
- The exact `profile_md` template structure (sections, headers, target length).
- The exact `TailoredVars` schema field list (~25 fields based on jorrel-os, re-tuned).
- The exact 5 interview question prompts (Claude picks dynamically; system prompt sets the rubric).
- Designed resume CSS (re-skin of jorrel-os in adonis dark + serif).
- Whether to gate by tier (recommendation: free for v1, paywall layered later).
- Onboarding nudge cadence if a user doesn't finish onboarding within 3 days (not in v1).

## Cost model

| User profile | Monthly cost (rough) |
|---|---|
| Onboarded but inactive | ~$1.50–$6 (just scoring) |
| Light user (~2 apps/wk) | ~$10–$15 |
| Power user (~10 apps/wk) | ~$45–$60 |

Onboarding is a one-time ~$0.30–$0.60 hit per user. Infrastructure (Vercel + Supabase) is free at small scale.

The unit economics justify a paid tier once we have meaningful daily-active users; that decision is out of scope for this spec.

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Resume parser flakes on two-column / image PDFs | Always show parsed fields in wizard for user correction; accept text paste as fallback |
| N × M scoring fan-out at scale | Aggressive global pre-filter, then per-user hard filter, then score; viable at ~100 users; cluster-and-rerank if we cross 10K |
| Hard filter false-negatives → empty feed → "broken" perception | Log `filter_reason`; surface a "Why am I not seeing more jobs?" panel in the View component |
| Vercel gateway disconnect at ~340s | Start with small watchlist + monitor execution time; insert-first-score-later architecture as backlog mitigation (jorrel-os doc #9) |
| Empty env var `??` fallback bug (jorrel-os doc) | Use `process.env.X?.trim() || "default"`; lint or assert at boot |
| Auth scope creep | Adopt Supabase Auth scoped to this feature only in v1; don't retrofit the rest of v2 yet |
| AI interview drifts off-voice | Tight system prompt; review transcripts during early users; quick re-tune cycle |

## What ships in v1

A working backend (cron, ingest, scoring, profile generation, tailoring, application tracking) behind Supabase Auth, plus a thin v2 protocol shim + onboarding View component that exercises the full loop end-to-end for a single user account. No tier gating. No cover letter. No per-user watchlist. No dashboard. Done = a user can onboard, see apply tasks in their routine the next morning, tap one, get a tailored resume, submit, and see a follow-up task appear five days later.
