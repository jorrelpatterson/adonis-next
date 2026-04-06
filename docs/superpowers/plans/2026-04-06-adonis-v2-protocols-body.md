# Adonis v2 Body Protocol Migration (Plan 3a)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate Body domain protocols (workout, peptides, nutrition) from app.html into modular protocol modules that plug into the routine pipeline.

**Architecture:** Each protocol folder under src/protocols/body/ implements the protocol interface. Data extracted from public/app.html into standalone JS files.

**Tech Stack:** React 18, Vitest (happy-dom), existing protocol interface + registry + pipeline from Plans 1-2.

**Plan Sequence:** Plan 3a — Body domain only. Future plans cover remaining domains.

---

## Task 1: Extract Workout Programs Data
Create: src/protocols/body/workout/programs.js, src/protocols/body/workout/__tests__/workout-data.test.js
Extract WORKOUTS object (all programs + aliases) from public/app.html lines 705-954. Export WORKOUTS, GOAL_ALIASES, getProgram().

## Task 2: Workout Protocol Implementation
Create: src/protocols/body/workout/index.js, src/protocols/body/workout/__tests__/workout.test.js
Implements protocol interface. getTasks returns training task for the day based on goal + day of week.

## Task 3: Extract Peptide Catalog
Create: src/protocols/body/peptides/catalog.js, src/protocols/body/peptides/__tests__/catalog.test.js
Extract PEPTIDES array (115 items) and PEP_DB from public/app.html lines 22-530.

## Task 4: Peptide Protocol Implementation
Create: src/protocols/body/peptides/index.js, src/protocols/body/peptides/__tests__/peptides.test.js
Implements protocol interface. getTasks returns dose tasks for active peptides. getRecommendations suggests peptides for goals.

## Task 5: Nutrition Data + Protocol
Create: src/protocols/body/nutrition/meals.js, supplements.js, index.js, __tests__/nutrition.test.js
Extract MEALS + supplement stacks. Protocol generates meal plan + supplement tasks.

## Task 6: Protocol Registration + Final Verification
Create: src/protocols/register-all.js, modify src/main.jsx
Register all 3 protocols, verify full pipeline works end-to-end.
