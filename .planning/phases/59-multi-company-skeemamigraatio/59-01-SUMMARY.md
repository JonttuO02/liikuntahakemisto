---
phase: 59-multi-company-skeemamigraatio
plan: 01
subsystem: database
tags: [supabase, postgres, rls, migration, multi-tenant]
dependency_graph:
  requires: []
  provides:
    - companies table
    - business_accounts.company_id
    - business_accounts.role
    - current_company_id() SECURITY DEFINER function
    - business_paikka_links_account_paikka_unique composite UNIQUE constraint
  affects:
    - business_accounts RLS (column-privilege REVOKE)
    - business_paikka_links RLS (SELECT policy rewrite)
tech_stack:
  added: []
  patterns:
    - ROW_NUMBER() CTE backfill join for 1:1 row-correspondence safety
    - SECURITY DEFINER + SET search_path = public RLS helper function
    - REVOKE UPDATE (column) ON table FROM authenticated column-privilege lockdown
key_files:
  created:
    - supabase/migrations/_audit/59-backfill-verification.sql
    - supabase/migrations/20260625000000_companies_role_rls.sql
  modified: []
decisions:
  - "D-08/D-09/D-11/D-12/D-14 from 59-CONTEXT.md implemented verbatim in the migration"
  - "Task 3 (staging apply + backfill verification) requires Supabase CLI / staging DB access not available in this execution environment -- left as a human-verify checkpoint, not executed"
metrics:
  duration: "~25 minutes (Tasks 1-2 only; Task 3 not executed)"
  completed: "2026-06-25"
status: in_progress
---

# Phase 59 Plan 01: Multi-company schema migration Summary

Authored the companies/role/RLS schema migration (ACCESS-01/ACCESS-02) and its read-only backfill-verification audit script, following the codebase's established constraint-swap and SECURITY DEFINER precedents. Task 3 (apply to staging + run the backfill verification gates) is a blocking checkpoint requiring Supabase CLI or staging dashboard access that is not available in this worktree execution environment, and is therefore NOT executed.

## What Was Built

### Task 1: Backfill + constraint-name audit script (complete)

`supabase/migrations/_audit/59-backfill-verification.sql` — a read-only, SELECT-only script mirroring the `_audit/53-row-count-audit.sql` convention (never auto-applied by the Supabase migration runner; intended to be pasted into the SQL Editor or run via psql by the operator). It contains:

- **Section 1** (run before migration): `pg_constraint`/`pg_indexes` queries against `business_paikka_links` to confirm the exact auto-generated constraint name (research assumed `business_paikka_links_paikka_id_key`, flagged Medium risk — must be confirmed, not assumed) and the explicit named index `business_paikka_links_paikka_id_unique`.
- **Section 2** (run before migration): empty/blank `company_name` scan resolving D-10's deferred research question.
- **Section 3** (run after migration): the Pitfall 1 load-bearing check — row-count equality between `business_accounts` and `companies`, a zero-rows-expected query detecting NULL `company_id` or duplicate company mappings (the exact ROW_NUMBER()-join-collapse failure mode), and a role-backfill check (every row must be `role = 'owner'` per D-09, regardless of `approval_status`).

### Task 2: The migration file (complete)

`supabase/migrations/20260625000000_companies_role_rls.sql` — single explicit `BEGIN`/`COMMIT` transaction, 199 lines, implementing:

1. `CREATE TABLE IF NOT EXISTS companies (id BIGSERIAL PK, name TEXT NOT NULL, created_at TIMESTAMPTZ)` + `ENABLE ROW LEVEL SECURITY`
2. `business_accounts.company_id` (BIGINT FK → companies) and `role` (TEXT CHECK IN owner/member) added nullable
3. Backfill via the ROW_NUMBER() CTE pattern from RESEARCH.md Pitfall 1 — one new `companies` row per existing `business_accounts` row, joined back by matching `ROW_NUMBER() OVER (ORDER BY user_id)` on both sides (not by `name`, which would collapse duplicate-named accounts onto one company)
4. `SET NOT NULL` on both new columns after backfill
5. `DROP COLUMN company_name` — last `business_accounts` mutation (D-05), since the production app-code deploy must land in the same release window (Pitfall 4, documented but not actioned here — that's Plan 04's runbook)
6. `REVOKE UPDATE (role, company_id) ON business_accounts FROM authenticated` — prevents a member self-promoting to owner via the existing own-row UPDATE policy (Pattern 3 / T-59-04)
7. Constraint swap on `business_paikka_links`: drop the old index + inline UNIQUE constraint, add `business_paikka_links_account_paikka_unique UNIQUE(business_account_id, paikka_id)` (ACCESS-02)
8. `current_company_id()` — `LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public`, returns NULL for non-business users (D-11/D-12), with explicit `GRANT EXECUTE ... TO authenticated` (Pitfall 2)
9. `companies` SELECT-only RLS policy `USING (id = current_company_id())` — no INSERT/UPDATE policy
10. `business_paikka_links_select_own` SELECT policy rewritten but kept **self-scoped** (`business_account_id = auth.uid()`) per D-14 — explicitly NOT widened to company-wide visibility; that widening is deferred to Phase 60/64

Every existing RLS policy on both touched tables (`business_accounts`, `business_paikka_links`) is enumerated in the migration's header comment block, each marked "keep as-is" or "rewritten" — satisfying the T-59-06 mitigation (no policy left changed by omission).

### Task 3: Staging apply + backfill verification — NOT EXECUTED (blocking checkpoint)

This task requires applying the migration to a local/staging Supabase target (`supabase db push` or pasting into the SQL Editor) and then running the three audit-script verification gates. **Neither the Supabase CLI nor staging database credentials are available in this worktree's execution environment** (`command -v supabase` returned not found; no `SUPABASE_ACCESS_TOKEN` or reachable staging project configured for this agent run). The plan's own frontmatter marks `autonomous: false` specifically for this step and instructs: "If the push cannot complete non-interactively, STOP and surface it for manual intervention... do NOT skip the push."

Per the parallel-execution instructions, this is treated as a `checkpoint:human-verify` gate, not as a failure to auto-fix. See "Checkpoint Reached" below.

## Deviations from Plan

None — Tasks 1 and 2 executed exactly as written. Task 3 is intentionally not executed (see above); this is the plan's own designed gate, not a deviation.

## Known Stubs

None. No application code was touched in this plan (pure SQL migration + audit script), so there is no UI/data-wiring surface to evaluate for stubs.

## Threat Flags

None beyond what the plan's own `<threat_model>` already enumerates (T-59-01 through T-59-06, T-59-SC) — all six STRIDE entries are addressed directly by the migration's structure (backfill join safety, EXECUTE grant, companies RLS, column-privilege REVOKE, search_path pinning, full policy enumeration). No new surface was introduced beyond what RESEARCH.md and CONTEXT.md already anticipated.

## CHECKPOINT REACHED

**Type:** human-verify (blocking gate, `gate="blocking"` per plan frontmatter Task 3)
**Plan:** 59-01
**Progress:** 2/3 tasks complete

### Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Confirm exact existing constraint names + scan for empty company_name | `33762b3` | `supabase/migrations/_audit/59-backfill-verification.sql` |
| 2 | Author the companies + role + RLS migration as a single transaction | `30d87ab` | `supabase/migrations/20260625000000_companies_role_rls.sql` |

### Current Task

**Task 3 [BLOCKING]: Apply migration to local/staging Supabase and run backfill verification (D-02 gate)**
**Status:** blocked — no Supabase CLI / staging credentials available in this execution environment
**Blocked by:** This worktree has no `supabase` CLI installed and no `SUPABASE_ACCESS_TOKEN` / reachable staging project configured. The task explicitly requires a live database apply, which cannot be faked or skipped (per the plan: "a build/type check alone will pass without it, creating a false-positive verification state").

### Checkpoint Details

The operator needs to, against a **local or staging Supabase project only — never production**:

1. Confirm a local/staging Supabase project exists and is reachable (`supabase start` for local, or a dedicated staging project).
2. Run `supabase db push` (or paste `supabase/migrations/20260625000000_companies_role_rls.sql` into the Supabase SQL Editor) against that target.
3. Run Section 1-2 of `supabase/migrations/_audit/59-backfill-verification.sql` BEFORE the push, if not already done, to confirm the constraint names the migration's `DROP CONSTRAINT IF EXISTS business_paikka_links_paikka_id_key` assumes.
4. After a clean push, run Section 3 of the same audit script. It must show:
   - Equal row counts between `business_accounts` and `companies`
   - Zero rows from the mismatch-detection query (no NULL `company_id`, no two accounts sharing one `company_id`)
   - Every row's `role = 'owner'`
5. Confirm `current_company_id()` is callable (no `permission denied for function current_company_id` in the SQL Editor).
6. Confirm the composite UNIQUE behaves: insert two `business_paikka_links` rows with different `business_account_id` but the same `paikka_id` (must succeed), then attempt a duplicate `(business_account_id, paikka_id)` pair (must fail with a unique-violation).

### Awaiting

Operator to run the above against a local/staging Supabase target and report back the results (row counts, mismatch-query output, GRANT/permission confirmation, constraint-behavior confirmation) so Task 3 can be marked complete and this plan's SUMMARY updated to `status: complete`. Production execution remains a separate manual runbook step (Plan 04) regardless of this checkpoint's outcome.

## Self-Check: PASSED

- FOUND: supabase/migrations/_audit/59-backfill-verification.sql
- FOUND: supabase/migrations/20260625000000_companies_role_rls.sql
- FOUND commit 33762b3 (Task 1)
- FOUND commit 30d87ab (Task 2)
