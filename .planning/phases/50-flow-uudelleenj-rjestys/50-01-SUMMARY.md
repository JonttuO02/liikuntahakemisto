---
phase: 50-flow-uudelleenj-rjestys
plan: 01
subsystem: database
tags: [supabase, postgres, migration, nextjs, route-handler]

requires:
  - phase: 34
    provides: "onboarding_draft table schema (current_step INT NOT NULL DEFAULT 1)"
provides:
  - "One-time data migration decrementing in-flight onboarding_draft.current_step values by 1 for the Phase 50 step reorder"
  - "Tightened save-step bounds check accepting input step 0-5 (was 1-6), reconciling D-07's stored-range tightening with D-04's quick-accept step:0 pre-save"
affects: [50-02, 51-live-esikatselu]

tech-stack:
  added: []
  patterns:
    - "One-time data migrations use a plain UPDATE with a `--` comment header naming the decision ID; no DDL/CHECK constraint added unless explicitly required"

key-files:
  created:
    - supabase/migrations/20260617000000_renumber_onboarding_steps.sql
  modified:
    - app/api/business/onboarding/save-step/route.ts

key-decisions:
  - "Accepted input step range widened from 1-6 to 0-5 rather than literally 1-5, to admit handleConfirm's step:0 pre-save (D-04) without a silent 400 failure inside its non-blocking try/catch"
  - "current_step = step + 1 mapping left unchanged; the route's stored value stays in 1-5 for all wizard callers (0-4 input) and 1-6 only for the short-lived quick-accept case (D-05), which submit deletes on success"

requirements-completed: [FLOW-04]

duration: 12min
completed: 2026-06-17
---

# Phase 50 Plan 01: Onboarding step-renumber migration & bounds check Summary

**One-time SQL migration decrementing in-flight onboarding_draft.current_step values, plus a reconciled 0-5 input bounds check in save-step/route.ts. Schema pushed to the live database by the orchestrator after the executor hit a credentials gate.**

## Performance

- **Duration:** ~12 min
- **Tasks:** 3 of 3 completed (Task 3 completed by orchestrator post-checkpoint, using a user-supplied access token)
- **Files modified:** 2

## Accomplishments
- Created `supabase/migrations/20260617000000_renumber_onboarding_steps.sql`: a single `UPDATE onboarding_draft SET current_step = current_step - 1 WHERE current_step >= 2` statement with a D-06 comment header, no DDL
- Tightened `app/api/business/onboarding/save-step/route.ts`'s bounds check from accepted input `1-6` to `0-5`, reconciling D-07 (stored range 1-5) with D-04 (quick-accept pre-save sends `step: 0`)
- Verified `npx tsc --noEmit` reports zero errors in `save-step/route.ts`

## Task Commits

Each task was committed atomically:

1. **Task 1: Create one-time step-renumber data migration (D-06)** - `43cf131` (feat)
2. **Task 2: Tighten save-step bounds check to the new range (D-07 + D-04 reconciliation)** - `97e7acf` (fix)
3. **Task 3: Push schema to the live database** - completed by orchestrator via `supabase link` + `supabase db push` from this worktree, using a user-supplied `SUPABASE_ACCESS_TOKEN`. Verified via `supabase migration list` showing `20260617000000` applied remotely. No app-code commit (DB-only operation).

**Plan metadata:** committed alongside this SUMMARY (see final commit in this worktree)

## Files Created/Modified
- `supabase/migrations/20260617000000_renumber_onboarding_steps.sql` - One-time UPDATE decrementing `current_step` by 1 for drafts at `current_step >= 2` (D-06)
- `app/api/business/onboarding/save-step/route.ts` - Bounds check changed from `parsedStep < 1 || parsedStep > 6` to `parsedStep < 0 || parsedStep > 5`; error message and inline comment updated to "0-5"; `current_step: step + 1` (line 107) left unchanged

## Decisions Made
- Widened the accepted input range to 0-5 (not a literal 1-5) per the plan's explicit RESOLUTION instruction, so D-04's `step: 0` quick-accept pre-save in `handleConfirm` is accepted rather than silently rejected with HTTP 400 inside its non-blocking try/catch (which would re-introduce the CR-01 gallery-prefill-vanishing bug that 48-04 fixed)
- No CHECK constraint or other DDL added to the migration — D-06/D-07 both confirm the route's manual bounds check is the only ongoing guard

## Deviations from Plan

None — Tasks 1 and 2 executed exactly as written. Task 3 was attempted as written; it did not complete due to an authentication gate (see Issues Encountered), which is documented per the authentication-gates protocol rather than as a deviation.

## Issues Encountered

**Task 3 — Authentication gate, resolved:** `npx supabase db push` initially failed with `Cannot find project ref. Have you run supabase link?`. The worktree had no `supabase/config.toml` (project not linked) and no `SUPABASE_ACCESS_TOKEN` was present in the environment; direct read access to `.env.local` was denied by sandbox permissions. The orchestrator escalated to the user per the checkpoint protocol, received a `SUPABASE_ACCESS_TOKEN`, ran `supabase link --project-ref odkrnesnmrpuegccgovy` and `supabase db push` from this worktree (where the new migration file lives pre-merge), and confirmed via `supabase migration list` that `20260617000000_renumber_onboarding_steps` is applied remotely.

## Known Stubs

None.

## Threat Flags

None — both changes match the plan's `<threat_model>` exactly (T-50-01 mitigated by Task 2's bounds check; T-50-02/T-50-03 accepted dispositions, no change in posture).

## User Setup Required

None — the live Supabase database push (Task 3) was completed by the orchestrator with a user-supplied access token.

## Next Phase Readiness

- All three tasks complete: migration file + route bounds check (committed, type-check clean) and the live schema push (verified via `supabase migration list`).
- 50-02 (the app-code reorder) can proceed with no outstanding DB dependency.

---
*Phase: 50-flow-uudelleenj-rjestys*
*Completed: 2026-06-17*

## Self-Check: PASSED

- FOUND: supabase/migrations/20260617000000_renumber_onboarding_steps.sql
- FOUND: app/api/business/onboarding/save-step/route.ts
- FOUND: .planning/phases/50-flow-uudelleenj-rjestys/50-01-SUMMARY.md
- FOUND: commit 43cf131
- FOUND: commit 97e7acf
- FOUND: commit 8fa3e6f
