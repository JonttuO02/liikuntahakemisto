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
    - supabase/migrations/20260625000001_fix_column_privilege_escalation.sql
  modified: []
decisions:
  - "D-08/D-09/D-11/D-12/D-14 from 59-CONTEXT.md implemented verbatim in the migration"
  - "Task 3 verification performed directly against the project's single Supabase instance via the Management API (project has no separate staging environment, and the app has no real users yet -- operator explicitly accepted this risk rather than standing up a local Docker/Supabase CLI sandbox)"
  - "Verification uncovered a real bug: REVOKE UPDATE (col) ON table FROM authenticated does not override a pre-existing table-wide UPDATE grant in Postgres. This affected this migration's role/company_id lockdown AND four pre-existing column REVOKEs from 20260605000003_fix_column_privileges.sql (profiles.is_admin, liikuntapaikat.business_managed, business_paikka_links.claim_status, business_accounts.approval_status). Fixed in 20260625000001_fix_column_privilege_escalation.sql by revoking the table-wide grant and re-granting UPDATE on an explicit column allow-list. Operator approved fixing all five in this session."
metrics:
  duration: "~25 minutes (Tasks 1-2) + checkpoint resolution (Management API verification + privilege-escalation fix)"
  completed: "2026-06-25"
status: complete
---

# Phase 59 Plan 01: Multi-company schema migration Summary

Authored the companies/role/RLS schema migration (ACCESS-01/ACCESS-02) and its read-only backfill-verification audit script, following the codebase's established constraint-swap and SECURITY DEFINER precedents. Task 3 (apply + verify the backfill) was performed directly against the project's single Supabase instance via the Management API, with the operator's explicit sign-off given the app has no real users yet. Verification surfaced and the operator approved fixing a genuine pre-existing privilege-escalation bug (see below).

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

### Task 3: Migration apply + backfill verification (complete)

The execution worktree had no Supabase CLI and no staging environment existed to target (`command -v supabase` not found; project has a single Supabase instance, no separate staging project). The operator clarified the app has no real users yet, so the data-loss risk the staging-first gate exists to prevent does not apply, and provided a Supabase Management API personal access token scoped for this session.

Applied directly via `POST https://api.supabase.com/v1/projects/{ref}/database/query`:

1. Pre-migration checks (Section 1-2 of the audit script): confirmed `business_paikka_links_paikka_id_key` (UNIQUE constraint) and `business_paikka_links_paikka_id_unique` (named index) both exist as the migration's `DROP ... IF EXISTS` statements assume. Empty/blank `company_name` count: 0.
2. Applied `20260625000000_companies_role_rls.sql` in full — HTTP 201, no errors.
3. Post-migration verification (Section 3): `business_accounts_count = companies_count = 4` (equal); zero rows from the orphan/duplicate-mapping query; every row `role = 'owner'` across both `approval_status` values present (`approved`, `pending`). `current_company_id()` exists as `SECURITY DEFINER`. New composite constraint `business_paikka_links_account_paikka_unique` present; old `business_paikka_links_paikka_id_key`/`_unique` gone.
4. **Bug found during verification:** `has_column_privilege('authenticated', 'business_accounts', 'role', 'UPDATE')` and the same for `company_id` both returned `true` — meaning the migration's Task 7 `REVOKE UPDATE (role, company_id) ... FROM authenticated` did **not** actually block the columns. Root cause: Postgres column-level `REVOKE` only removes a column-specific grant; it does not narrow a pre-existing table-wide `UPDATE` grant, which Supabase sets by default. Checked the same pattern against `20260605000003_fix_column_privileges.sql` (Phase 31) and found all four of its REVOKEs were equally ineffective: `profiles.is_admin`, `liikuntapaikat.business_managed`, `business_paikka_links.claim_status`, `business_accounts.approval_status` were all still updatable by `authenticated` despite being "revoked." `is_admin` self-elevation was the most severe (full admin privilege escalation via a direct PostgREST PATCH).
5. Operator approved fixing all five in this session. Wrote and applied `20260625000001_fix_column_privilege_escalation.sql`: `REVOKE UPDATE ON <table> FROM authenticated` (whole-table) followed by `GRANT UPDATE (<explicit allow-list>) ON <table> TO authenticated` for `business_accounts`, `profiles`, `liikuntapaikat`, `business_paikka_links` — allow-list is every previously-grantable column minus the specific column each fix (this one + the four Phase 31 ones) intended to block.
6. Re-verified: all five `has_column_privilege(...)` checks now return `false`; spot-checked four legitimate columns (`business_accounts.contact_phone`, `profiles.kotikaupunki`, `liikuntapaikat.kuvaus`, `business_paikka_links.rejection_reason`) still return `true` — no regression on existing write paths.

**Not fixed (separate, larger finding, intentionally out of scope):** `liikuntapaikat` has row-level RLS policies (`"Kirjautunut voi kirjoittaa"`, `authenticated_update`, `authenticated_delete`) with `USING (true)` / `WITH CHECK (true)` — any authenticated user can write or delete **any** venue row, not just clear `business_managed`. This is a distinct, much larger access-control gap than the column-privilege bug fixed here. Flagged to the operator; not bundled into this corrective migration.

## Deviations from Plan

Task 3 was executed against the project's single live Supabase instance via the Management API rather than a local/staging target, per explicit operator approval (no staging environment exists; no real user data is at risk yet). The plan's own gate language ("never production... before it ever touches production") was written assuming a staging environment would be available — the operator's risk tolerance for this specific project state (pre-launch, no real users) is the reason for this deviation, not a shortcut around the gate's intent. A second migration (`20260625000001`) was added beyond the plan's original `files_modified` to fix a real bug the verification gate caught — exactly the kind of finding D-02 exists to surface.

## Known Stubs

None. No application code was touched in this plan (pure SQL migration + audit script), so there is no UI/data-wiring surface to evaluate for stubs.

## Threat Flags

None beyond what the plan's own `<threat_model>` already enumerates (T-59-01 through T-59-06, T-59-SC) — all six STRIDE entries are addressed directly by the migration's structure (backfill join safety, EXECUTE grant, companies RLS, column-privilege REVOKE, search_path pinning, full policy enumeration). No new surface was introduced beyond what RESEARCH.md and CONTEXT.md already anticipated.

## Checkpoint Resolution

**Type:** human-verify (blocking gate, `gate="blocking"` per plan frontmatter Task 3) — RESOLVED
**Plan:** 59-01
**Progress:** 3/3 tasks complete

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Confirm exact existing constraint names + scan for empty company_name | `33762b3` | `supabase/migrations/_audit/59-backfill-verification.sql` |
| 2 | Author the companies + role + RLS migration as a single transaction | `30d87ab` | `supabase/migrations/20260625000000_companies_role_rls.sql` |
| docs | Plan summary + checkpoint record (initial) | `02bdb8a` | `59-01-SUMMARY.md` |
| 3 | Apply migration + verify backfill (via Management API) + fix privilege-escalation bug | *(this commit)* | `supabase/migrations/20260625000001_fix_column_privilege_escalation.sql`, `59-01-SUMMARY.md` |

Operator approved proceeding without a staging environment (none exists; no real user data at risk pre-launch) and supplied a Management API token for direct verification. All Task 3 success criteria met; see "Task 3" section above for the full transcript and the privilege-escalation finding/fix.

**Follow-up flagged to operator, not part of this plan:** `liikuntapaikat` row-level RLS (`USING (true)` on write policies) allows any authenticated user to write/delete any venue row — separate from the column-privilege bug fixed here.

## Self-Check: PASSED

- FOUND: supabase/migrations/_audit/59-backfill-verification.sql
- FOUND: supabase/migrations/20260625000000_companies_role_rls.sql
- FOUND: supabase/migrations/20260625000001_fix_column_privilege_escalation.sql
- FOUND commit 33762b3 (Task 1)
- FOUND commit 30d87ab (Task 2)
- Verified live: migration applied, backfill correct, privilege-escalation columns locked, no regression on legitimate columns
