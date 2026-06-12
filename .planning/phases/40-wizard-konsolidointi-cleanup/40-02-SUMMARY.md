---
phase: 40-wizard-konsolidointi-cleanup
plan: "02"
subsystem: database
tags: [business, cleanup, migration, test-data, cascade]

requires:
  - phase: 40-wizard-konsolidointi-cleanup
    plan: "01"
    provides: "CLEAN-03/04/05 verified — pre-conditions confirmed"

provides:
  - "CLEAN-01 migration: supabase/migrations/20260612000000_cleanup_test_accounts.sql"
  - "Deletes all test business users from auth.users with full cascade"

affects:
  - supabase/migrations — new migration file added
  - 40-wizard-konsolidointi-cleanup (plan 03 proceeds with clean DB state)

tech-stack:
  added: []
  patterns:
    - "Cascade delete via auth.users → business_accounts → child tables"
    - "Idempotent migration: subquery returns empty set when already clean"

key-files:
  created:
    - supabase/migrations/20260612000000_cleanup_test_accounts.sql
  modified: []

key-decisions:
  - "Single DELETE FROM auth.users WHERE id IN (subquery) — cascade handles all child tables"
  - "No explicit child-table deletes needed — ON DELETE CASCADE FKs cover all three dependent tables"
  - "Migration is idempotent — safe to apply when business_accounts is already empty"
  - "onboarding_completed not mentioned — column was already dropped in 20260611000000"

duration: 8min
completed: "2026-06-12"
---

# Phase 40 Plan 02: Cleanup Migration (CLEAN-01) Summary

**SQL migration created: deletes all test business accounts from auth.users with automatic cascade to business_accounts, business_paikka_links, and onboarding_draft**

## Performance

- **Duration:** 8 min
- **Started:** 2026-06-12T05:10:00Z
- **Completed:** 2026-06-12T05:18:00Z
- **Tasks:** 2
- **Files created:** 1

## Accomplishments

- Task 1: Confirmed `20260611000002_approval_trigger_not_found.sql` is the latest existing migration. New filename `20260612000000_cleanup_test_accounts.sql` sorts correctly after all existing files.
- Task 2: Created `supabase/migrations/20260612000000_cleanup_test_accounts.sql` with the correct `DELETE FROM auth.users WHERE id IN (SELECT user_id FROM business_accounts)` statement, cascade documentation, idempotency note, and explicit mention that `onboarding_completed` must not be dropped again.

## Task Commits

| Task | Description | Commit |
|------|-------------|--------|
| Task 1 + 2 | Create test account cleanup migration (CLEAN-01) | 5628a66 |

## Files Created/Modified

| File | Action | Description |
|------|--------|-------------|
| supabase/migrations/20260612000000_cleanup_test_accounts.sql | Created | Deletes all test business accounts via auth.users cascade |

## Verification Evidence

```
- File exists: supabase/migrations/20260612000000_cleanup_test_accounts.sql ✓
- Contains: DELETE FROM auth.users WHERE id IN (SELECT user_id FROM business_accounts) ✓
- Contains no DROP COLUMN for onboarding_completed ✓
- Contains cascade chain explanation comments ✓
- Contains idempotency note ✓
- Sorts after 20260611000002 alphabetically ✓
```

## Decisions Made

- Used direct DELETE with subquery pattern (simpler and equally safe vs DO block)
- Migration comment explicitly notes this is one-time test data cleanup, not a production pattern
- Cascade chain documented in comments so future readers understand why only one DELETE is needed

## Deviations from Plan

None — plan executed exactly as written. The migration was created with all required elements.

## Issues Encountered

Note: the worktree does not contain `20260611000002_approval_trigger_not_found.sql` (the main repo has it as an untracked file, not yet committed to any branch). The new migration `20260612000000` correctly sorts after it alphabetically regardless — confirmed.

## User Setup Required

After this plan, the user must apply the migration to the Supabase project:

**Option A — Supabase Dashboard SQL Editor:**
```sql
DELETE FROM auth.users
WHERE id IN (SELECT user_id FROM business_accounts);
```

**Option B — Supabase CLI:**
```bash
supabase db push
```

After applying, verify in the Supabase Dashboard that:
- `business_accounts` table is empty
- The corresponding `auth.users` rows (business test users) are gone

## Next Phase Readiness

- CLEAN-01 migration created — ready for manual application via Supabase Dashboard
- Plan 40-03 (wizard merge CLEAN-02) has no blocking dependency on this migration

## Known Stubs

None.

## Threat Flags

None — the migration only touches test data rows via a scoped subquery (`WHERE id IN (SELECT user_id FROM business_accounts)`). Consumer `auth.users` accounts are not affected.

---
*Phase: 40-wizard-konsolidointi-cleanup*
*Completed: 2026-06-12*
