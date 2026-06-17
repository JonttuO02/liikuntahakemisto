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

**One-time SQL migration decrementing in-flight onboarding_draft.current_step values, plus a reconciled 0-5 input bounds check in save-step/route.ts — schema push to the live database blocked on missing Supabase credentials.**

## Performance

- **Duration:** ~12 min
- **Tasks:** 2 of 3 completed (Task 3 blocked by authentication gate)
- **Files modified:** 2

## Accomplishments
- Created `supabase/migrations/20260617000000_renumber_onboarding_steps.sql`: a single `UPDATE onboarding_draft SET current_step = current_step - 1 WHERE current_step >= 2` statement with a D-06 comment header, no DDL
- Tightened `app/api/business/onboarding/save-step/route.ts`'s bounds check from accepted input `1-6` to `0-5`, reconciling D-07 (stored range 1-5) with D-04 (quick-accept pre-save sends `step: 0`)
- Verified `npx tsc --noEmit` reports zero errors in `save-step/route.ts`

## Task Commits

Each task was committed atomically:

1. **Task 1: Create one-time step-renumber data migration (D-06)** - `43cf131` (feat)
2. **Task 2: Tighten save-step bounds check to the new range (D-07 + D-04 reconciliation)** - `97e7acf` (fix)
3. **Task 3: [BLOCKING] Push schema to the live database** - NOT EXECUTED (authentication gate — see below)

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

**Task 3 — Authentication gate (not a bug):** `npx supabase db push` failed with `Cannot find project ref. Have you run supabase link?`. The worktree has no `supabase/config.toml` (project not linked) and no `SUPABASE_ACCESS_TOKEN` is present in the environment. Direct read access to `.env.local` / `.env.local.example` is denied by the sandbox's permission settings, so the access token could not be located or sourced from within this execution context.

Per the plan's Task 3 instructions, this is exactly the documented escalation path: *"If the push requires an interactive confirmation prompt that cannot be suppressed... stop and surface the exact command for the user to run manually rather than guessing at a flag."* The blocker here is upstream of that (no link/no token at all), so the same stop-and-surface action applies.

**Manual action required before Phase 50 can be considered fully shipped:**
1. From the repo root (not this worktree, which will be removed), set `SUPABASE_ACCESS_TOKEN` in the shell environment (obtain from the Supabase dashboard → Account → Access Tokens, or reuse the project's existing CI/deploy secret).
2. Run `supabase link --project-ref <project-ref>` if not already linked.
3. Run `supabase db push` from the repo root.
4. Verify with `supabase migration list` that `20260617000000_renumber_onboarding_steps` shows as applied to the remote database.

Until this push runs, in-flight `onboarding_draft` rows in the live database retain their pre-reorder `current_step` numbering. This does not block merging the code changes (Tasks 1-2), but the app-level renumber (50-02, when it ships) will not be fully correct for any in-flight drafts until the migration is applied live.

## Known Stubs

None.

## Threat Flags

None — both changes match the plan's `<threat_model>` exactly (T-50-01 mitigated by Task 2's bounds check; T-50-02/T-50-03 accepted dispositions, no change in posture).

## User Setup Required

**External service action required.** The live Supabase database push (Task 3) could not be completed from this execution environment. See "Issues Encountered" above for the exact manual steps (set `SUPABASE_ACCESS_TOKEN`, link project, `supabase db push`, verify with `supabase migration list`).

## Next Phase Readiness

- Tasks 1-2 (migration file + route bounds check) are complete, committed, and type-check clean — 50-02 (the app-code reorder) can proceed independently of the live DB push.
- Task 3 (live schema push) remains outstanding and requires a human with Supabase credentials to run `supabase db push` before in-flight production drafts are correctly renumbered. Flagging this clearly so it is not silently dropped when this worktree is removed.

---
*Phase: 50-flow-uudelleenj-rjestys*
*Completed: 2026-06-17*
