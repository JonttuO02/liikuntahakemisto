---
phase: 47-skeema-monisivuinen-scraper-putki
plan: 01
subsystem: database
tags: [postgres, supabase, migrations, business_branding, schema]

# Dependency graph
requires:
  - phase: 46 (or earlier v2.1 scraper work)
    provides: business_branding table (20260615000001), logo_type CHECK fix (20260615000002), business_paikka_links (20260605000000), onboarding composite-key precedent (20260606000000)
provides:
  - business_branding.logo_candidates (jsonb), image_urls (jsonb), selected_background_color (text), selected_accent_color (text)
  - business_branding.paikka_id (bigint, NOT NULL, FK to liikuntapaikat ON DELETE CASCADE), deterministically backfilled from business_paikka_links
  - Re-keyed UNIQUE(business_account_id, paikka_id) constraint replacing the single-column UNIQUE(business_account_id)
  - Composite index idx_business_branding_account_paikka
  - Live-database verification evidence for BRDDB-03/04/05
affects: [phase-47-plan-05 (route/analyzer code consuming the new plural shape and composite UPSERT key)]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Additive migration with backfill-then-NOT-NULL sequencing (mirrors onboarding.sql composite-key precedent)", "supabase db query --linked for live verification evidence without a migration-assertion harness"]

key-files:
  created: [supabase/migrations/20260616100000_business_branding_plural_and_paikka_scoping.sql]
  modified: []

key-decisions:
  - "Orphan business_branding rows with no resolvable paikka_id were deleted (not retained) before the NOT NULL constraint was applied, per plan Task 1 step 4 and threat T-47-02 (accepted disposition)"
  - "BRDDB-04 verified, not re-migrated — the live CHECK constraint definition (Postgres's ANY(ARRAY[...]) normalization of IN (...)) is semantically identical to the plan's expected enum and was already shipped in 20260615000002"
  - "Task 2's blocking migration push was completed by the orchestrator outside this agent's isolated worktree session (no Supabase CLI credentials were available inside the worktree); this executor re-verified the push via `supabase migration list --linked` and three live SQL queries rather than re-running the push"

requirements-completed: [BRDDB-03, BRDDB-04, BRDDB-05]

# Metrics
duration: ~25min (including orchestrator-resolved checkpoint)
completed: 2026-06-16
---

# Phase 47 Plan 01: Schema migration for plural branding + per-venue scoping Summary

**Additive Postgres migration adding four plural-branding columns and a NOT-NULL `paikka_id` FK with deterministic backfill, re-keying `business_branding`'s UNIQUE constraint to `(business_account_id, paikka_id)`, pushed live and verified with three SQL evidence queries.**

## Performance

- **Duration:** ~25 min (Task 1 authored migration; Task 2 blocked on a human-action checkpoint for Supabase auth, resolved by the orchestrator; Task 3 verification completed in this continuation)
- **Tasks:** 3/3 complete
- **Files modified:** 1 (migration file) + 1 (this SUMMARY)

## Accomplishments
- Added `logo_candidates`, `image_urls`, `selected_background_color`, `selected_accent_color` to `business_branding` (BRDDB-03)
- Added `paikka_id BIGINT NOT NULL REFERENCES liikuntapaikat(id) ON DELETE CASCADE`, backfilled deterministically from `business_paikka_links` using `ORDER BY created_at ASC LIMIT 1` (BRDDB-05)
- Re-keyed the UNIQUE constraint from `UNIQUE(business_account_id)` to `UNIQUE(business_account_id, paikka_id)`, fixing the silent multi-venue branding overwrite bug
- Verified (did not re-implement) the already-shipped `logo_type` CHECK constraint fix (BRDDB-04)
- Pushed the migration to the live Supabase database and confirmed all three BRDDB requirements with live SQL query evidence

## Task Commits

1. **Task 1: Write the additive migration (BRDDB-03 columns + BRDDB-05 paikka_id backfill + composite UNIQUE)** - `daaaf77` (feat)
2. **Task 2: [BLOCKING] Push migration to live Supabase database** - no separate commit (infrastructure action, not a file change — see Issues Encountered below)
3. **Task 3: Verify BRDDB-03/04/05 against the live constraint and column set** - no separate commit (verification-only, evidence recorded below)

**Plan metadata:** (this commit) `docs(47-01): complete schema migration plan`

## Files Created/Modified
- `supabase/migrations/20260616100000_business_branding_plural_and_paikka_scoping.sql` - additive columns, paikka_id backfill, NOT NULL, composite UNIQUE re-key, composite index

## Decisions Made
- Orphan `business_branding` rows with no resolvable `paikka_id` were deleted before applying `NOT NULL`, accepting permanent loss of pre-Phase-47-conflated branding rows that could never be correctly re-scoped (threat T-47-02, disposition: accept).
- BRDDB-04 was verified rather than re-migrated: the live constraint already matches the analyzer's 4-value enum (shipped in `20260615000002`), confirmed via `pg_get_constraintdef`.
- Task 2 (the blocking migration push) was completed by the orchestrator using Supabase access outside this agent's isolated worktree session, since the worktree had no CLI/credentials configured. This continuation re-verified the push independently rather than trusting the orchestrator's report alone.

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written. Task 2's resolution path (orchestrator-mediated push instead of in-agent push) was anticipated by the plan's own non-TTY fallback note ("if the push still requires an interactive prompt that cannot be suppressed, stop and surface the exact command for the developer to run manually") and is not a deviation from the plan's logic, just a difference in which actor executed the documented fallback.

---

**Total deviations:** 0 auto-fixed.
**Impact on plan:** None — schema, constraints, and verification evidence match the plan's acceptance criteria exactly.

## Issues Encountered

**Task 2 checkpoint:** The isolated worktree had no Supabase CLI authentication configured, so `supabase db push` could not run inside this agent's session per the plan's documented non-TTY fallback ("stop and surface the exact command for the developer to run manually"). This was correctly surfaced as a `checkpoint:human-action`. The orchestrator resolved it by running `supabase link --project-ref odkrnesnmrpuegccgovy` and `supabase db push` with valid credentials, confirmed by the orchestrator's report: "Finished supabase db push" and `supabase migration list --linked` showing `20260616100000` on both Local and Remote columns.

This continuation agent independently re-confirmed the push (not just trusting the report) via:
1. `npx supabase migration list --linked` — `20260616100000` present in the output.
2. Three live SQL verification queries against the linked remote database (full evidence below) — all three BRDDB requirements confirmed live, not just "migration applied" at the metadata level.

## Verification Evidence (Task 3)

All queries run via `npx supabase db query --linked "<sql>"` against the linked remote project (`odkrnesnmrpuegccgovy`).

### 1. BRDDB-04 — `logo_type` CHECK constraint

Query:
```sql
SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'business_branding_logo_type_check';
```

Result:
```
pg_get_constraintdef
-----------------------------------------------------------------------------------------------------
CHECK ((logo_type = ANY (ARRAY['wordmark'::text, 'icon'::text, 'combination'::text, 'unknown'::text])))
```

**Verdict:** PASS. Postgres internally normalizes `CHECK (col IN (...))` to `CHECK (col = ANY (ARRAY[...]))` — this is semantically identical to the plan's expected `CHECK (logo_type IN ('wordmark', 'icon', 'combination', 'unknown'))`. The fix shipped in `20260615000002` was already live; no re-push was needed.

### 2. BRDDB-03 — new columns present with correct types

Query:
```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'business_branding'
  AND column_name IN ('logo_candidates','image_urls','selected_background_color','selected_accent_color','paikka_id')
ORDER BY column_name;
```

Result:
```
column_name                | data_type
----------------------------+-----------
image_urls                 | jsonb
logo_candidates             | jsonb
paikka_id                  | bigint
selected_accent_color      | text
selected_background_color  | text
```

**Verdict:** PASS. All five expected columns present with correct types (jsonb x2, text x2, bigint x1).

### 3. BRDDB-05 — UNIQUE constraint re-keyed

Query:
```sql
SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
WHERE conrelid = 'business_branding'::regclass AND contype = 'u';
```

Result:
```
conname                                  | pg_get_constraintdef
------------------------------------------+-------------------------------------------
business_branding_unique_account_paikka  | UNIQUE (business_account_id, paikka_id)
```

**Verdict:** PASS. Exactly one UNIQUE constraint exists on `business_branding`, and it is the composite `(business_account_id, paikka_id)`. The old single-column `business_branding_unique_account` no longer exists.

### Bonus checks (not in plan, run for extra confidence)

`paikka_id` is NOT NULL:
```
column_name | is_nullable
-------------+-------------
paikka_id   | NO
```

No orphan rows remain with NULL `paikka_id` (confirms the backfill + delete-orphans + NOT NULL sequence completed cleanly):
```
count
-------
0
```

## User Setup Required

None — no external service configuration required for this plan. (Note: the plan's frontmatter documents a separate Vercel Pro upgrade as a `user_setup` prerequisite for a *later* plan in this phase — D-03/D-04 homepage screenshot capture — not for this migration plan.)

## Next Phase Readiness

- `business_branding` schema is now live with all four plural-branding columns, a NOT NULL `paikka_id` FK, and the composite UNIQUE constraint that Plan 47-05's route/analyzer code depends on for `(business_account_id, paikka_id)` UPSERTs.
- No blockers for downstream plans in this phase. BRDDB-03, BRDDB-04, BRDDB-05 are all satisfied and verified live.

---
*Phase: 47-skeema-monisivuinen-scraper-putki*
*Completed: 2026-06-16*
