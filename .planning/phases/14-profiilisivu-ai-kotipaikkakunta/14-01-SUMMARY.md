---
phase: "14"
plan: "01"
subsystem: "database + lib"
tags: [migration, rls, supabase, tdd, vitest, ai-prompt]
dependency_graph:
  requires: []
  provides:
    - profiles table DDL + RLS policies (supabase/migrations/20260528083110_profiles.sql)
    - buildReissuKonteksti helper (lib/buildReissuKonteksti.ts)
  affects:
    - lib/saasuositus.test.ts (new test file)
tech_stack:
  added: []
  patterns:
    - Supabase RLS migration (SELECT/INSERT/UPDATE policies, user_id PK pattern)
    - TDD RED/GREEN cycle (vitest)
    - Pure function helper extraction for testability
key_files:
  created:
    - supabase/migrations/20260528083110_profiles.sql
    - lib/buildReissuKonteksti.ts
    - lib/saasuositus.test.ts
  modified: []
decisions:
  - user_id is PRIMARY KEY (no separate bigserial id) — profiles has at most 1 row per user
  - UPDATE policy required in profiles RLS (upsert second save hits UPDATE path)
  - buildReissuKonteksti returns empty string for same-city case (case-insensitive, trimmed)
  - Leading space on return value — callee appends directly to prompt string
metrics:
  duration: "1 minute"
  completed: "2026-05-28T09:03:35Z"
  tasks_completed: 2
  files_created: 3
  files_modified: 0
  tests_added: 5
  tests_passing: 48
---

# Phase 14 Plan 01: Profiles Migration and buildReissuKonteksti Summary

**One-liner:** Supabase profiles table (user_id PK + RLS) and unit-tested pure helper that appends travel context to AI prompts when user's home city differs from current city.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create profiles table migration | 6240f2c | supabase/migrations/20260528083110_profiles.sql |
| 2 (RED) | Add failing tests for buildReissuKonteksti | a4a32e1 | lib/saasuositus.test.ts |
| 2 (GREEN) | Implement buildReissuKonteksti helper | bf44246 | lib/buildReissuKonteksti.ts |

## Verification Results

- `grep -c "FOR SELECT" supabase/migrations/20260528083110_profiles.sql` → 1 ✓
- `grep -c "FOR INSERT" supabase/migrations/20260528083110_profiles.sql` → 1 ✓
- `grep -c "FOR UPDATE" supabase/migrations/20260528083110_profiles.sql` → 1 ✓
- `npx vitest run` → 6 test files, 48 tests, all pass ✓
- No DELETE policy in migration ✓
- No bigserial column in migration ✓

## TDD Gate Compliance

- RED gate: `test(14-01)` commit `a4a32e1` — tests fail (module not found) ✓
- GREEN gate: `feat(14-01)` commit `bf44246` — 5/5 tests pass, full suite green ✓
- REFACTOR gate: skipped (function is simple, no duplication) ✓

## Deviations from Plan

None — plan executed exactly as written.

The behavior block specified 4 test cases; 5 were implemented (included the reverse-case test `buildReissuKonteksti('Tampere', 'tampere') returns ''` explicitly listed in the `<behavior>` block). This matches the plan's acceptance criteria which also lists this 5th case.

## Known Stubs

None — migration SQL and pure helper function have no stubs or placeholder values.

## Threat Surface Scan

No new network endpoints, auth paths, or file access patterns introduced. Migration RLS policies implement T-14-01 (cross-user write tampering) and T-14-02 (cross-user read disclosure) as specified in the threat model. T-14-03 (prompt injection via kotikaupunki) is intentionally deferred to Plan 04 where the sanitization in route.ts is implemented.

## Self-Check

- [x] supabase/migrations/20260528083110_profiles.sql exists
- [x] lib/buildReissuKonteksti.ts exists
- [x] lib/saasuositus.test.ts exists
- [x] Commit 6240f2c exists (Task 1)
- [x] Commit a4a32e1 exists (Task 2 RED)
- [x] Commit bf44246 exists (Task 2 GREEN)
