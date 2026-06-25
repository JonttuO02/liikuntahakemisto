---
phase: 59-multi-company-skeemamigraatio
plan: 02
subsystem: business-routes
tags: [supabase, route-handlers, vitest, multi-tenant]
dependency_graph:
  requires: ["59-01"]
  provides:
    - create-paikka company-name write/read via companies table
    - reapply/submit admin-notification email read via companies(name)
  affects:
    - tests/api/create-paikka.test.ts mocks
    - tests/api/submit.test.ts mocks
tech_stack:
  added: []
  patterns:
    - "Supabase embedded-resource select (`companies(name)`) replacing a flat dropped column"
key_files:
  created: []
  modified:
    - app/api/business/create-paikka/route.ts
    - app/api/business/reapply/route.ts
    - app/api/business/onboarding/submit/route.ts
    - tests/api/create-paikka.test.ts
    - tests/api/submit.test.ts
decisions:
  - "company_id lookup + companies.update for the name write is a two-step service-role operation, mirroring the plan's exact shape"
metrics:
  duration: "resumed after a mid-session usage-limit interruption; Tasks 1-2 were already committed, Task 3 (test mocks) was finished and committed on resume"
  completed: "2026-06-25"
status: complete
---

# Phase 59 Plan 02: Business routes + tests Summary

Updated the three business-side Route Handlers that previously read/wrote `business_accounts.company_name` (dropped by Plan 01) to go through `company_id` → `companies.name` instead, and updated the two existing Vitest mocks to the new nested join shape.

## What Was Built

### Task 1: create-paikka route (complete)

`app/api/business/create-paikka/route.ts` — the company-name UPDATE is now a two-step write: SELECT `company_id` from `business_accounts`, then `.from('companies').update({ name })` keyed by that id. The email-SELECT now reads `.select('companies(name)')` and the email argument reads `biz.companies?.name`. Non-critical log convention (`[create-paikka] ... (non-critical):`) preserved on both steps.

### Task 2: reapply + onboarding/submit routes (complete)

Both `app/api/business/reapply/route.ts` and `app/api/business/onboarding/submit/route.ts` admin-notification blocks now `.select('companies(name)')` and pass `companyName: biz.companies?.name`. Try/catch wrappers and log prefixes unchanged.

### Task 3: test mocks updated to companies(name) join shape (complete)

`tests/api/create-paikka.test.ts`: added `mockBizAccountsCompanyIdSingle` (for the new `company_id` lookup) and `mockCompaniesUpdateEq` (for the new `companies` table update), and changed the email-block mock (`mockBizAccountsSingle`) to return `{ companies: { name: 'Testi Oy' } }` instead of a flat `company_name`. The mocked `supabaseAdmin.from()` switch now routes `'companies'` to a dedicated `companiesBuilder`.

`tests/api/submit.test.ts`: `mockBizSingle` now resolves `{ data: { companies: { name: 'Test Oy' } }, error: null }`.

Both touched suites pass: `npx vitest run tests/api/create-paikka.test.ts tests/api/submit.test.ts` → 2 files, 11 tests, all passed.

## Deviations from Plan

None in scope/approach. Execution was interrupted mid-Task-3 by a session usage-limit reset; resumed and finished from the already-committed Task 1-2 state plus the in-flight (uncommitted) Task 3 diff, which was verified against the plan's acceptance criteria before committing rather than redone from scratch.

## Known Stubs

None.

## Threat Flags

None beyond the plan's own T-59-07/T-59-08 (both `accept`, no new surface — see plan frontmatter).

## Self-Check: PASSED

- FOUND: app/api/business/create-paikka/route.ts (no `company_name` references)
- FOUND: app/api/business/reapply/route.ts (no `company_name` references)
- FOUND: app/api/business/onboarding/submit/route.ts (no `company_name` references)
- FOUND commit 3e5080f (Task 1), 4811182 (Task 2), 068d170 (Task 3)
- `npx vitest run tests/api/create-paikka.test.ts tests/api/submit.test.ts` → 11/11 passed
