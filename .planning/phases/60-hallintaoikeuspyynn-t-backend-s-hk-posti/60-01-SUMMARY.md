---
phase: 60-hallintaoikeuspyynn-t-backend-s-hk-posti
plan: "01"
subsystem: database
tags: [migration, rls, schema, business_access_requests]
status: checkpoint
requirements: [ACCESS-03, ACCESS-06]

dependency_graph:
  requires:
    - 20260625000000_companies_role_rls.sql (current_company_id() helper, company_id NOT NULL that this migration relaxes)
    - 20260625000001_fix_column_privilege_escalation.sql (table-wide REVOKE pattern reference)
    - 20260625000002_tighten_business_accounts_grant.sql (grant-tightening reference)
  provides:
    - business_access_requests table (Phase 60 Route Handlers — plans 02, 03, 04)
    - company_id nullable business_accounts (D-09a invite-link signup path)
  affects:
    - business_accounts.company_id (now nullable)

tech_stack:
  added: []
  patterns:
    - Partial UNIQUE index (WHERE status='pending') — first use in this codebase
    - RLS SELECT + INSERT only (no UPDATE) — deliberate omission for status-column lockdown

key_files:
  created:
    - supabase/migrations/20260626000000_business_access_requests.sql
  modified: []

decisions:
  - "D-09a: company_id relaxed to nullable so invite-link signups can arrive without a company until approval sets it"
  - "No UPDATE RLS policy on business_access_requests — status transitions exclusively via supabaseAdmin (D-05/T-60-02)"
  - "Partial UNIQUE on (requester_id, paikka_id) WHERE status='pending' for D-08 idempotent duplicate-submission handling"

metrics:
  duration: "~8 minutes"
  completed_date: "2026-06-26"
  tasks_completed: 1
  tasks_total: 2
  files_created: 1
  files_modified: 0
---

# Phase 60 Plan 01: business_access_requests migration — Summary

**One-liner:** `business_access_requests` table with partial UNIQUE index, 3 RLS policies (2 SELECT + 1 INSERT, no UPDATE), and `business_accounts.company_id` relaxed to nullable for the invite-link signup path (D-09a).

## Tasks Completed

| Task | Name | Status | Commit | Files |
|------|------|--------|--------|-------|
| 1 | Create business_access_requests migration | complete | 06b8375 | supabase/migrations/20260626000000_business_access_requests.sql |
| 2 | Push schema to live Supabase instance | **CHECKPOINT — awaiting human** | — | — |

## Artifacts Produced

- **`supabase/migrations/20260626000000_business_access_requests.sql`** (180 lines)
  - `ALTER TABLE business_accounts ALTER COLUMN company_id DROP NOT NULL` (D-09a)
  - `CREATE TABLE IF NOT EXISTS business_access_requests` with 7 columns and `status IN ('pending','approved','rejected')` CHECK
  - `CREATE UNIQUE INDEX business_access_requests_pending_unique ... WHERE (status = 'pending')` (D-08)
  - `ALTER TABLE business_access_requests ENABLE ROW LEVEL SECURITY`
  - `"Requester reads own access requests"` SELECT policy (`auth.uid() = requester_id`)
  - `"Owner reads requests for owned venues"` SELECT policy (EXISTS via `business_paikka_links` + `current_company_id()` + `role='owner'` + `claim_status='approved'`)
  - `"Requester inserts own access request"` INSERT policy WITH CHECK
  - No UPDATE RLS policy (deliberate — D-05/T-60-02)
  - Wrapped in `BEGIN; ... COMMIT;`

## Acceptance Criteria — All Passed

| Criterion | Result |
|-----------|--------|
| `CREATE TABLE IF NOT EXISTS business_access_requests` with all 7 columns + status CHECK | PASS |
| Partial UNIQUE index `business_access_requests_pending_unique ... WHERE (status = 'pending')` | PASS |
| `ALTER COLUMN company_id DROP NOT NULL` on business_accounts | PASS |
| Exactly 2 SELECT policies + 1 INSERT policy | PASS (3 total: 2 SELECT + 1 INSERT) |
| NO `CREATE POLICY ... FOR UPDATE` | PASS (0 matches) |
| NO executable `GRANT UPDATE` on business_access_requests | PASS (2 comment-only matches, 0 SQL statements) |
| Owner-read policy references `current_company_id()` + `ba.role = 'owner'` + `bpl.claim_status = 'approved'` | PASS |
| Whole migration in `BEGIN; / COMMIT;` | PASS |

## Deviations from Plan

None — plan executed exactly as written. The RESEARCH.md DDL spec was used as the authoritative template with only formatting adjustments (section comment headers matching the Phase 59 migration style).

## Security Notes

- **T-60-01 mitigated:** `ENABLE ROW LEVEL SECURITY` with no default-allow gap — all three policies are explicit, deny-by-default.
- **T-60-02 mitigated:** No UPDATE policy + no `authenticated` UPDATE grant — the `status`/`rejection_reason` self-write path is structurally impossible for any `authenticated` client, closing the self-approval class of vulnerability (same issue fixed by `20260625000001` for `claim_status` on `business_paikka_links`).
- **T-60-04 mitigated:** Requester SELECT is self-scoped to `auth.uid() = requester_id`; owner SELECT is scoped through `current_company_id()` to only venues the owner manages.

## Checkpoint — Task 2 Pending

**Task 2 requires human action:** Push the migration to the live Supabase instance with `supabase db push`, then verify in the Supabase dashboard.

See checkpoint details in the return message.

## Self-Check

- [x] Migration file exists: `supabase/migrations/20260626000000_business_access_requests.sql`
- [x] Commit 06b8375 exists in git log
- [x] All grep acceptance checks pass (verified above)
