---
phase: 59-multi-company-skeemamigraatio
plan: 04
subsystem: business-signup-deploy
tags: [supabase, route-handlers, vitest, multi-tenant, runbook]
dependency_graph:
  requires: ["59-01"]
  provides:
    - forward-going company creation on business signup (role='owner')
    - register route rollback-on-failure (orphaned companies row cleanup)
    - profiili anon-key companies(name) read under RLS
    - coupled SQL+app-code deploy runbook
  affects:
    - app/api/business/register/route.ts
    - app/business/profiili/page.tsx
key_files:
  created:
    - tests/api/register.test.ts
    - .planning/phases/59-multi-company-skeemamigraatio/59-DEPLOY-RUNBOOK.md
  modified:
    - app/api/business/register/route.ts
    - app/business/profiili/page.tsx
decisions:
  - "Runbook rewritten to reflect actual project state: the migration is already live (applied directly to the single Supabase project during Plan 01's checkpoint), so the immediate action is deploying Wave 2's app code promptly — not a hypothetical future staging-first sequence"
metrics:
  duration: "resumed after a mid-session usage-limit interruption; Tasks 1-2 were already committed, Tasks 3-4 were finished and committed on resume"
  completed: "2026-06-25"
status: in_progress
---

# Phase 59 Plan 04: Signup company-creation + runbook Summary

Added forward-going company-creation to business signup (every new account becomes owner of its own new company, matching Plan 01's backfilled shape), created the previously-missing test coverage for it, updated the one anon-key RLS-subject read site (`profiili`), and wrote the coupled SQL+app-code deploy runbook.

## What Was Built

### Task 1: register route company-creation + rollback (complete)

`app/api/business/register/route.ts` now does a two-step insert: `INSERT INTO companies(name) RETURNING id`, then `INSERT business_accounts({ user_id, company_id, role: 'owner', role_in_company })`. On business_accounts-insert failure, the new companies row is deleted (rollback) with a CRITICAL log if the rollback delete itself fails; the auth user is never deleted on failure, matching the existing convention. `company_name` is no longer written to business_accounts.

### Task 2: tests/api/register.test.ts (complete, new file)

5 tests covering: happy path (companies insert → business_accounts insert with `role: 'owner'` and the returned `company_id`), insert ordering, rollback-on-account-failure (asserts `companies.delete` is called), and the 401 auth guard. `npx vitest run tests/api/register.test.ts` → 5/5 passed.

### Task 3: profiili anon-key read (complete)

`app/business/profiili/page.tsx` changed from `.select('company_name, contact_phone')` to `.select('companies(name), contact_phone')`, with a defensive unwrap (`Array.isArray(account.companies) ? account.companies[0] : account.companies`) handling the Supabase JS client's array-typed embedded-relationship quirk for what is actually a to-one FK. `companyName={company?.name ?? ''}` passed to `BusinessProfiiliClient`. The `redirect('/business')` guard and `.maybeSingle()` are unchanged. `npx tsc --noEmit` clean.

### Task 4: Deploy runbook (complete, BLOCKING — awaiting operator review)

`.planning/phases/59-multi-company-skeemamigraatio/59-DEPLOY-RUNBOOK.md` created. Automated check passes (`PITR` and `current_company_id` both present). **This task's verify block also requires a human-check** ("Operator has reviewed the runbook and confirms the production migration is executed manually... never auto-pushed by CI") — that sign-off has not yet been obtained from the operator as of this commit. The runbook itself was adapted from the plan's general-case template to reflect the actual situation: the migration is already applied directly to the project's single Supabase instance (Plan 01's checkpoint), so the database is currently ahead of the app code, and the most urgent action is deploying Wave 2 promptly — not a future staging-first sequence. See the runbook's "Current state" / "Next action" sections.

## Deviations from Plan

1. The deploy runbook's content was adapted beyond the plan's literal template because the assumed staging→production split doesn't match this project's actual single-Supabase-project setup, and the migration was already applied (not pending). The required structural elements (PITR, current_company_id checks, D-13 login regression, Pitfall 4 both-directions framing) are all present; the narrative was made accurate to what actually happened instead of describing a hypothetical future process.
2. Task 3's defensive `Array.isArray` unwrap is a minor addition beyond the plan's literal `account.companies?.name ?? ''` instruction, addressing a real Supabase JS client typing quirk (embedded to-one relationships are typed as arrays without an explicit FK hint) — functionally equivalent, verified type-clean.
3. Execution was interrupted mid-Task-3 by a session usage-limit reset; resumed and finished from the already-committed Task 1-2 state plus the in-flight (uncommitted) Task 3 diff, then completed Task 4 fresh.

## Known Stubs

None.

## Threat Flags

None beyond the plan's own T-59-11/T-59-12/T-59-13/T-59-14 (all `mitigate`, addressed directly — see plan frontmatter).

## CHECKPOINT — Awaiting Operator Review

**Type:** human-action (blocking gate, `gate="blocking"` per plan frontmatter Task 4)
**Status:** Runbook written and automated checks pass; operator has not yet confirmed review.

The operator needs to read `.planning/phases/59-multi-company-skeemamigraatio/59-DEPLOY-RUNBOOK.md` and confirm they understand and accept: production migration execution stays manual (not CI-driven), and — given the migration is already live — Wave 2's app code should be deployed promptly to close the current `company_name`/`company_id` mismatch window if this app is reachable anywhere live.

## Self-Check: PASSED

- FOUND: app/api/business/register/route.ts (`role: 'owner'`, two-step insert, rollback present)
- FOUND: tests/api/register.test.ts (5 tests, all passing)
- FOUND: app/business/profiili/page.tsx (no `company_name`, reads `companies`)
- FOUND: .planning/phases/59-multi-company-skeemamigraatio/59-DEPLOY-RUNBOOK.md (contains `PITR` and `current_company_id`)
- FOUND commit 94824d5 (Task 1), 631488f (Task 2), 94b318c (Task 3), 12daec3 (Task 4)
- `npx vitest run tests/api/register.test.ts` → 5/5 passed
- `npx tsc --noEmit` → zero errors
