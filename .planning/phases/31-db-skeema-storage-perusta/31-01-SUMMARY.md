---
phase: 31-db-skeema-storage-perusta
plan: "01"
subsystem: database
tags: [sql, migration, rls, supabase, business-accounts]
dependency_graph:
  requires: []
  provides:
    - business_accounts table (UUID PK, RLS)
    - business_paikka_links table (BIGSERIAL PK, UNIQUE(paikka_id), RLS)
  affects:
    - All v1.7 phases (32, 33, 34, 35, 36) depend on these tables
tech_stack:
  added: []
  patterns:
    - UUID PRIMARY KEY FK to auth.users (profiles.sql analog)
    - BIGSERIAL PK + UNIQUE + RLS (suosikit.sql analog)
    - Inline CHECK constraints (reviews.sql analog)
    - SELECT/INSERT/UPDATE RLS triple per table
key_files:
  created:
    - supabase/migrations/20260605000000_business_accounts.sql
  modified: []
decisions:
  - "business_accounts uses UUID PK (same as profiles) — one Supabase Auth user = one business account"
  - "UNIQUE(paikka_id) on business_paikka_links — one business owns each venue at a time (D-05)"
  - "rejection_reason, published columns intentionally omitted — deferred to Phases 33 and 35"
  - "No admin-read policy in this migration — deferred to Phase 35"
metrics:
  duration: "2 minutes"
  completed_date: "2026-06-05"
  tasks_completed: 1
  tasks_total: 1
  files_created: 1
  files_modified: 0
---

# Phase 31 Plan 01: Business Tables Migration Summary

**One-liner:** Supabase migration creating business_accounts (UUID PK + approval_status CHECK) and business_paikka_links (BIGSERIAL PK + UNIQUE(paikka_id) + claim_status/link_type CHECKs) with full SELECT/INSERT/UPDATE RLS per table.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Write business_accounts and business_paikka_links migration | b7946ed | supabase/migrations/20260605000000_business_accounts.sql |

## What Was Built

A single SQL migration file that:

1. Creates `business_accounts` table with:
   - `user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE`
   - `company_name TEXT NOT NULL`
   - `approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected'))`
   - `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
   - RLS enabled with SELECT/INSERT/UPDATE policies gated on `auth.uid() = user_id`

2. Creates `business_paikka_links` table with:
   - `id BIGSERIAL PRIMARY KEY`
   - `business_account_id UUID NOT NULL REFERENCES business_accounts(user_id) ON DELETE CASCADE`
   - `paikka_id BIGINT NOT NULL REFERENCES liikuntapaikat(id) ON DELETE CASCADE`
   - `claim_status TEXT NOT NULL DEFAULT 'pending' CHECK (claim_status IN ('pending', 'approved', 'rejected'))`
   - `link_type TEXT NOT NULL CHECK (link_type IN ('claim', 'created'))`
   - `UNIQUE(paikka_id)` table-level constraint
   - RLS enabled with SELECT/INSERT/UPDATE policies gated on `auth.uid() = business_account_id`

## Verification Results

All plan-level grep checks passed:
- `grep -c "CREATE TABLE IF NOT EXISTS business_accounts"` → 1
- `grep -c "CREATE TABLE IF NOT EXISTS business_paikka_links"` → 1
- `grep -c "ENABLE ROW LEVEL SECURITY"` → 2
- `grep -c "CREATE POLICY"` → 6
- `grep -c "REFERENCES liikuntapaikat"` → 1 (not "paikat")
- `npx vitest run` → 7 test files, 64 tests — all passed, no regressions

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. This is a pure SQL migration file with no UI components or data stubs.

## Threat Flags

No new security surface beyond what is documented in the plan's threat model. All `mitigate` dispositions from the threat register are implemented:

| Threat | Mitigation | Status |
|--------|-----------|--------|
| T-31-01: business_accounts SELECT | RLS USING (auth.uid() = user_id) | Implemented |
| T-31-02: business_paikka_links SELECT | RLS USING (auth.uid() = business_account_id) | Implemented |
| T-31-03: business_paikka_links INSERT/UPDATE | WITH CHECK (auth.uid() = business_account_id) | Implemented |
| T-31-04: business_accounts UPDATE | WITH CHECK (auth.uid() = user_id) | Implemented (Phase 35 will add column-level restriction for approval_status) |

## Self-Check: PASSED

- [x] supabase/migrations/20260605000000_business_accounts.sql exists in worktree
- [x] Commit b7946ed exists: `git log --oneline | grep b7946ed`
- [x] All acceptance criteria verified via grep
- [x] vitest run: 64/64 tests pass
