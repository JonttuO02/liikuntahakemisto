# Phase 59: Multi-company-skeemamigraatio - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-25
**Phase:** 59-Multi-company-skeemamigraatio
**Areas discussed:** Backup & rollback mechanism, Companies table shape & data ownership, Migration mechanics for existing accounts, current_company_id() RLS helper & regression verification

---

## Backup & rollback mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| pg_dump to local file | Operator runs pg_dump before migration | |
| CREATE TABLE ..._backup AS SELECT snapshot | Migration creates throwaway snapshot tables | |
| Rely on Supabase PITR | Trust platform point-in-time recovery | ✓ |

**User's choice:** Rely on Supabase PITR
**Notes:** —

| Option | Description | Selected |
|--------|-------------|----------|
| Row-count + spot-check before/after | Mirrors Phase 53's audit-script pattern but gates execution | |
| Manual operator sign-off only | Visual confirmation only | |
| Automated test against a migration-applied local/staging copy first | Run migration on staging, verify success criteria there | ✓ |

**User's choice:** Automated test against a migration-applied local/staging copy first
**Notes:** —

| Option | Description | Selected |
|--------|-------------|----------|
| Down-migration script restores old schema + re-imports backup | Paired rollback SQL, tested against staging | |
| Restore from backup snapshot only | Restore from pg_dump/snapshot if something breaks | |
| No formal rollback — fix forward | Patch issues with a follow-up migration | ✓ |

**User's choice:** No formal rollback — fix forward
**Notes:** This combination (PITR + staging test + fix-forward) conflicted with ROADMAP success criterion 2, which explicitly requires "backup taken + rollback mechanism verified" citing the Phase 53 data-loss incident. Claude flagged the conflict and asked a reconciliation question.

| Option | Description | Selected |
|--------|-------------|----------|
| PITR counts as the backup; staging-test is the verification | Documents that PITR + staging dry-run together satisfy the locked criterion, no extra tooling | ✓ |
| Add a lightweight manual snapshot too | Belt-and-suspenders pg_dump/snapshot in addition to PITR + staging test | |

**User's choice:** PITR counts as the backup; staging-test is the verification
**Notes:** Resolved as D-01–D-04 in CONTEXT.md. Researcher/planner should not introduce additional backup tooling — this was a deliberate, considered choice, not an oversight.

---

## Companies table shape & data ownership

| Option | Description | Selected |
|--------|-------------|----------|
| Moved to companies, business_accounts keeps no copy | companies.name is the only source of truth | ✓ |
| Moved to companies, business_accounts keeps a denormalized copy | Cached copy on business_accounts for compatibility | |
| You decide | Claude picks after researching read sites | |

**User's choice:** Moved to companies, business_accounts keeps no copy
**Notes:** —

| Option | Description | Selected |
|--------|-------------|----------|
| Just id + name + created_at | Minimal companies table for this phase | ✓ |
| Also move branding/contact fields off business_accounts | Bigger migration scope | |

**User's choice:** Just id + name + created_at
**Notes:** —

| Option | Description | Selected |
|--------|-------------|----------|
| Keep user_id PK, add company_id FK + role column | Matches ROADMAP wording exactly, lowest risk to existing FKs | ✓ |
| You decide | Claude picks based on FK safety during research | |

**User's choice:** Keep user_id PK, add company_id FK + role column
**Notes:** —

---

## Migration mechanics for existing accounts

| Option | Description | Selected |
|--------|-------------|----------|
| Copy from business_accounts.company_name verbatim | No normalization logic | ✓ |
| Normalize/trim names during migration | Adds migration complexity | |

**User's choice:** Copy from business_accounts.company_name verbatim
**Notes:** —

| Option | Description | Selected |
|--------|-------------|----------|
| Migrate all rows uniformly, including pending/rejected | No filtering logic | ✓ |
| Skip rejected accounts — no company created for them | Adds conditional branch | |

**User's choice:** Migrate all rows uniformly, including pending/rejected
**Notes:** —

| Option | Description | Selected |
|--------|-------------|----------|
| Don't worry about it — research step will check actual data | Data-quality question deferred to research | ✓ |
| Treat empty-string company_name as a problem to flag before migrating | Halt and ask if found | |

**User's choice:** Don't worry about it — research step will check actual data
**Notes:** —

---

## current_company_id() RLS helper & regression verification

| Option | Description | Selected |
|--------|-------------|----------|
| SECURITY DEFINER SQL function, single join | Mirrors today's simple auth.uid() checks | ✓ |
| You decide | Planner picks exact SQL implementation | |

**User's choice:** SECURITY DEFINER SQL function, single join
**Notes:** —

| Option | Description | Selected |
|--------|-------------|----------|
| NULL | RLS naturally denies access for non-business users | ✓ |
| Raise an exception | More defensive, riskier for speculative callers | |

**User's choice:** NULL
**Notes:** —

| Option | Description | Selected |
|--------|-------------|----------|
| Manual login as 2-3 real existing business accounts post-migration | Lightweight, matches project's existing manual-QA style | ✓ |
| Automated RLS policy test suite | More rigorous, leaves a regression suite behind | |

**User's choice:** Manual login as 2-3 real existing business accounts post-migration
**Notes:** —

---

## Claude's Discretion

- Exact SQL syntax/naming for `current_company_id()` beyond the SECURITY DEFINER + single-join shape.
- Exact migration filename/ordering and transaction structure (DDL + data migration in one transaction).

## Deferred Ideas

None — discussion stayed within phase scope. Member-invite UX, permission granularity beyond owner/member, and dashboard UI for managing roles belong to Phase 60/64 and were not discussed here.
