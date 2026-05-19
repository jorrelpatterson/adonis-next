# Session Handoff — Project Overview (2026-05-19)

> **Read this together with `docs/SESSION-HANDOFF-2026-05-19-wholesale.md`.** That doc covers the active WIP (wholesale program). This doc covers the broader project state — branches, history, parallel work streams — so a new Claude session on a fresh machine has the full map.

**Repo:** `/Volumes/(626)806-4475/Ai Projects/adonis-next/` (external drive — same path on every machine that mounts the drive)
**GitHub:** https://github.com/jorrelpatterson/adonis-next
**Currently checked out:** `claude/wholesale-program`

---

## Branches — full landscape

| Branch | Location | Purpose | State |
|---|---|---|---|
| `main` | local + origin (synced) | Production deployment line. Auto-deploys to Vercel. | Up to date. Contains: Plan A career cron, full advnce labs admin, VA sub-admin role, all the prod-shipped work. |
| `claude/wholesale-program` | local + origin (synced) | Active WIP: wholesale program for advnce labs. | 25 commits ahead of main. Code complete, mergeable. See [wholesale handoff doc](SESSION-HANDOFF-2026-05-19-wholesale.md). |
| `claude/interesting-stonebraker` | local + origin (synced as of 2026-05-19) | Original "v2" PWA rebuild branch. | **Essentially absorbed into main.** 0 commits ahead of main, 1 behind. Push to origin was done today as a safety backup. Can be deleted or left as historical record. |
| `origin/v2-revival` | origin only (no local) | **Parallel v2 design polish branch** — 49 commits of premium motion / sound / haptics / animations / iOS-style ActionSheet / boot splash / progress rings / streak badges. | 49 commits ahead of main. Not merged. Source: separate Claude session(s) working on PWA polish. **Worth checking out and reading before any v2 visual work.** |

To pull v2-revival down on the new laptop:
```bash
git fetch origin
git checkout -b v2-revival origin/v2-revival
```

---

## Recent history (newest first, 2026-05-14 → 2026-05-19)

### Landed on main

- **VA sub-admin role implementation** — `requireRole('admin')` replaces `requireAdmin`, role-aware middleware, role-filtered nav, `/api/me` for client-side current-user, VA-restricted dashboards/forms. ~15 commits (commits `f2d92fc` → `bcbf318`).
- **Bug fix:** `a87f7ac admin: fix sidebar/dashboard blank flash for admin users` — small UX polish.

### In flight on branches

- **Wholesale program** on `claude/wholesale-program` — see the wholesale handoff doc.
- **v2 design polish** on `origin/v2-revival` — see commit `685f31a` and predecessors. Not been pulled locally yet.

### Already shipped earlier (background, prior sessions)

- **Plan A — money/career backend** (career feature for adonis.pro fitness PWA) — on main, daily cron at 14:00 UTC. Fetches jobs from Greenhouse/Lever/Ashby/Workable/Adzuna/JSearch, dedupes, pre-filters, upserts to `career_jobs`. Spec: `docs/superpowers/specs/2026-05-13-money-career-protocol-design.md`. Plan: `docs/superpowers/plans/2026-05-13-money-career-plan-a-backend-foundation.md`.
- **Plan 4 (v2 state expansion + data extractions)** — 9 of 12 tasks done. Remaining: wardrobe (partial), mind data, purpose data, environment data (these need `data.js` files written from app.html source). The work was done on `claude/interesting-stonebraker`, which is now absorbed into main, so the data files are on main.
- **News carousel engine, invoice maker, ambassador hardening, reorder reminders, presell OOS, inventory loss tracking** — all shipped to main in earlier sessions.

---

## Major work streams — where they live

1. **advnce labs (e-commerce + admin)** — primary product. Lives in `app/admin/`, `app/api/*`, `public/index.html` (storefront), and shipped feature plans under `docs/superpowers/plans/`.
2. **adonis.pro fitness PWA — v1** — `public/app.html` (1.1 MB self-contained monolith). Currently live at adonis.pro. Don't touch unless absolutely necessary; known minifier landmines.
3. **adonis.pro fitness PWA — v2 rebuild** — `src/` modular React + Vite. **Two parallel efforts:**
   - The protocol/routine engine + Plan 4 data extractions (on main, originally from `claude/interesting-stonebraker`)
   - The design polish (on `origin/v2-revival`, NOT yet pulled or merged) — motion, sound, haptics, premium UI primitives
   - These two efforts haven't been reconciled. The next person to touch v2 should: (a) pull `v2-revival`, (b) decide whether to merge it onto main alongside the protocol work, (c) check if the design polish references files that don't exist on the protocol side.
4. **Career feature** (jobs ingest cron) — `app/api/cron/career/ingest/`, `lib/career/*`, `config/career-*.json`. Plan B (onboarding pipeline + auth) and Plan C (v2 protocol shim) not yet built. See the original spec.

---

## What's running in production right now (after pushes to main auto-deploy on Vercel)

| Cron | Schedule UTC | Purpose | File |
|---|---|---|---|
| welcome-emails | `0 17 * * *` (10am PT) | Send delayed welcome email to new ambassador signups | `app/api/cron/welcome-emails/route.js` |
| reorder-reminders | `0 12 * * *` (5am PT) | Email customers nearing run-out date of peptides | `app/api/cron/reorder-reminders/route.js` |
| news-scrape | `0 11 * * *` (4am PT) | Pull peptide news from RSS + scraped sources | `app/api/cron/news-scrape/route.js` |
| news-curate | `0 4 * * 1` (8pm Sun PT) | Weekly: AI-curate news into Instagram carousel slides | `app/api/cron/news-curate/route.js` |
| career/ingest | `0 14 * * *` (6am PT) | Pull jobs from 6 sources, dedupe, upsert to `career_jobs` | `app/api/cron/career/ingest/route.js` |

---

## Sources of truth (read these if confused)

| Topic | File |
|---|---|
| **This file (project overview)** | `docs/SESSION-HANDOFF-2026-05-19-project-overview.md` |
| **Wholesale (active WIP)** | `docs/SESSION-HANDOFF-2026-05-19-wholesale.md` |
| **Wholesale pricing model** | `docs/wholesale-pricing-model.md` |
| **advnce labs brand identity** | `docs/brand/advncelabs-brand-identity.md` |
| **Career protocol spec** | `docs/superpowers/specs/2026-05-13-money-career-protocol-design.md` |
| **Career protocol Plan A** | `docs/superpowers/plans/2026-05-13-money-career-plan-a-backend-foundation.md` |
| **v2 protocol rebuild spec** | `docs/superpowers/specs/2026-04-06-adonis-v2-protocol-rebuild.md` (on `claude/interesting-stonebraker`, may also be on main now) |
| **v2 → adonis.pro/app + Capacitor design** | `docs/superpowers/specs/2026-05-19-v2-to-adonis-app-design.md` (NEW — on this branch, side-project spec from earlier today) |
| **Generic laptop migration** | `LAPTOP_MIGRATION.md` (untracked, exists in working tree) |
| **CLAUDE.md** | top-level (untracked, exists in working tree) — codebase conventions |
| **Old daily-vial content strategy** | `docs/daily-vial-content-strategy.md` |

---

## Critical local-only state that DOES NOT transfer with the external drive

These need explicit migration steps when you move to the new laptop:

1. **`~/.claude/projects/-Volumes--626-806-4475-Ai-Projects-adonis-next/memory/`** — Claude project memory files. **Lives in your user home directory, not on the drive.** Without these, the next Claude session starts with no project memory and has to relearn from this handoff doc. Copy this directory to the same path on the new laptop's home dir. The memory folder is currently ~10 KB; trivial to copy.

2. **`/tmp/adonis-alexandria-recovery/`** — was originally 7 MB of Alexandria-laptop worktree files (recoverable Plan 4 work + UI scaffolding drafts). **macOS cleaned /tmp** during the 5-day gap so this dir is now empty. The committed Plan 4 work survived because it was in `.git/objects/`. The uncommitted 93 files of UI scaffolding (Views, AuthProvider/LoginScreen, etc.) are **lost.** Recovery would require finding the original Alexandria drive (the old laptop's external) and re-extracting. **Don't bank on this material.** If v2 UI work resumes, treat from-scratch as the baseline.

3. **`.env.local`** — present on the drive but NOT in git. Already covered in `LAPTOP_MIGRATION.md` (use `vercel env pull --environment=production`). Will work on the new laptop after a one-time `vercel login + vercel link + vercel env pull`.

4. **`node_modules/`** — present on the drive but not portable across architectures (binaries differ between Intel/Apple Silicon Macs). Run `npm install` on the new laptop even if `node_modules/` carries over.

5. **`.next/`, `dist/`** — build artifacts. Safe to delete; will regenerate.

---

## The first 5 minutes on the new laptop

```bash
# 1. Plug in drive, confirm path
cd "/Volumes/(626)806-4475/Ai Projects/adonis-next"
git status

# 2. Confirm Node + npm available (LAPTOP_MIGRATION.md has install steps if not)
node --version   # need v20+
npm --version

# 3. Fresh install (architecture differences)
rm -rf node_modules
npm install

# 4. Re-pull env vars (if .env.local isn't there or has stale keys)
vercel env pull .env.local --environment=production --yes

# 5. Copy Claude memory from old laptop (if you have access to old laptop's home dir):
#    From old machine:
#      tar czf ~/Desktop/claude-memory.tgz -C ~/.claude/projects -Volumes--626-806-4475-Ai-Projects-adonis-next
#    To new machine:
#      tar xzf claude-memory.tgz -C ~/.claude/projects/

# 6. Confirm dev server boots
npm run dev    # adonis.pro v1 + advnce admin (Next.js, :3000)
npm run dev:app  # adonis.pro v2 (Vite, :5173) — only if working on the PWA rebuild
```

---

## When in doubt

- **Active WIP:** `docs/SESSION-HANDOFF-2026-05-19-wholesale.md`
- **What's where in the codebase:** `CLAUDE.md` (untracked) or `LAPTOP_MIGRATION.md` (untracked)
- **What we've planned but not yet built:** anything under `docs/superpowers/plans/` whose corresponding feature you can't find in the codebase

If you're a new Claude session reading this: ask the user "where do you want to pick up?" — they'll have a specific thread in mind. The branches and handoff docs are the menu; the user picks the dish.
