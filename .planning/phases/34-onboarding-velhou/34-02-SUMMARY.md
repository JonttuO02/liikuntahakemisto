---
phase: 34-onboarding-velhou
plan: 02
subsystem: database
tags: [supabase, postgres, migration, rls, onboarding]

requires:
  - phase: 34-01
    provides: lib/onboardingUtils.ts utility functions (buildDraftAsPaikka, hinnastaToHintaKuvaus) used by downstream wizard plans

provides:
  - supabase/migrations/20260606000000_onboarding.sql — onboarding_draft table + onboarding_completed column + RLS policies
  - business_accounts.onboarding_completed BOOLEAN NOT NULL DEFAULT false — wizard completion gate
  - onboarding_draft table — draft isolation staging for wizard steps 1–6

affects:
  - 34-03 (OnboardingWizardInner — reads onboarding_completed, loads onboarding_draft)
  - 34-07 (save-step Route Handler — UPSERT into onboarding_draft)
  - 34-09 (submit Route Handler — atomic copy draft → liikuntapaikat, set onboarding_completed)
  - 34-04 (StepEsikatselu — reads onboarding_draft via buildDraftAsPaikka)

tech-stack:
  added: []
  patterns:
    - ALTER TABLE ADD COLUMN IF NOT EXISTS pattern for safe column additions
    - onboarding_draft as staging/isolation table — no live data touched until Step 6 atomic commit
    - RLS four-policy pattern (SELECT/INSERT/UPDATE/DELETE) all scoped to auth.uid() = business_account_id

key-files:
  created:
    - supabase/migrations/20260606000000_onboarding.sql
  modified: []

key-decisions:
  - "onboarding_draft is a staging table — live liikuntapaikat rows are not modified until Step 6 atomic commit (D-05)"
  - "onboarding_completed DEFAULT false — existing business accounts unaffected until wizard submission (D-03)"
  - "UNIQUE(business_account_id, paikka_id) constraint enables safe UPSERT keyed on both columns (D-07)"
  - "DELETE RLS policy added in addition to SELECT/INSERT/UPDATE — allows submit Route Handler draft cleanup via supabaseAdmin after successful atomic copy"

requirements-completed: [ONBOARD-01, ONBOARD-03, ONBOARD-04, ONBOARD-05, ONBOARD-06, ONBOARD-07]

duration: ~5min
completed: 2026-06-06
---

# Phase 34 Plan 02: Onboarding DB Migration — Summary

`onboarding_draft` staging table with 9 columns + RLS four-policy pattern, plus `business_accounts.onboarding_completed` boolean gate column — enabling draft isolation (D-05) and wizard completion gating (D-03).

## Performance

- **Duration:** ~5 min
- **Started:** 2026-06-06T00:00:00Z
- **Completed:** 2026-06-06T00:05:00Z
- **Tasks:** 1
- **Files modified:** 1 created, 5 fetched from master into worktree

## Accomplishments

- `business_accounts.onboarding_completed BOOLEAN NOT NULL DEFAULT false` added (D-03) — `/business` page will check this to redirect to wizard or management panel
- `onboarding_draft` table created with all 9 required columns: `id`, `business_account_id`, `paikka_id`, `media_urls`, `hinnasto`, `aukioloajat`, `yhteystiedot`, `current_step`, `updated_at`
- UNIQUE constraint `onboarding_draft_unique_business_paikka(business_account_id, paikka_id)` enables safe UPSERT keyed on both columns
- RLS enabled with four policies (SELECT + INSERT + UPDATE + DELETE) all scoped to `auth.uid() = business_account_id` — satisfies T-34-02-01 threat mitigation

## Task Commits

1. **Task 1: Create supabase/migrations/20260606000000_onboarding.sql** — `c3a9cd0` (feat)

## Files Created/Modified

- `supabase/migrations/20260606000000_onboarding.sql` — Full DDL: ALTER business_accounts + CREATE TABLE onboarding_draft + RLS policies

## Decisions Made

- No deviations from plan. Migration follows the exact structure specified in PLAN.md.
- Worktree did not have Phase 33 migration files (worktree branched from older commit); fetched them from master via `git checkout master -- supabase/migrations/...` before creating the new file. These files are in master, so the commit adds them to this branch for consistency.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

Worktree had branched from an older commit (d8ebb4e) that predated Phase 33 migrations. The `business_accounts` table referenced by `onboarding_draft` FK was not visible in the worktree migration directory. Resolved by checking out Phase 33 migration files from master before creating the new migration — no schema impact.

## User Setup Required

**Schema push required (Plan 34-04).** This migration file must be applied to the live Supabase database. The schema push is a blocking checkpoint in Plan 34-04 to allow human review before execution.

## Next Phase Readiness

- Migration file is ready for Plan 34-04's `supabase db push` checkpoint
- `onboarding_draft` table schema is the foundation for Plans 34-07 (save-step Route Handler) and 34-09 (submit Route Handler)
- `onboarding_completed` column is the foundation for Plan 34-03's wizard gate check in `app/business/page.tsx`

---
*Phase: 34-onboarding-velhou*
*Completed: 2026-06-06*
