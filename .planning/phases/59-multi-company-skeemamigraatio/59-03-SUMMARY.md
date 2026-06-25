---
phase: 59-multi-company-skeemamigraatio
plan: 03
subsystem: admin-routes-ui
tags: [supabase, route-handlers, admin-ui, multi-tenant]
dependency_graph:
  requires: ["59-01"]
  provides:
    - admin approve/reject email read via companies(name)
    - admin applications list/detail embedded select via companies(name)
    - admin UI Application type + render sites on companies.name
  affects:
    - app/admin/page.tsx
    - app/admin/AdminApplicationList.tsx
    - app/admin/[id]/page.tsx
tech_stack:
  added: []
  patterns:
    - "Nested two-hop embedded select: business_accounts(role, role_in_company, user_id, companies(name))"
key_files:
  created: []
  modified:
    - app/api/admin/approve/route.ts
    - app/api/admin/reject/route.ts
    - app/api/admin/applications/route.ts
    - app/api/admin/applications/[id]/route.ts
    - app/admin/page.tsx
    - app/admin/AdminApplicationList.tsx
    - app/admin/[id]/page.tsx
decisions:
  - "role_in_company (free-text) kept fully distinct from the new role enum column in every embedded select and type, per the plan's explicit non-conflation requirement"
metrics:
  duration: "resumed after a mid-session usage-limit interruption; Tasks 1-2 were already committed, Task 3 (admin UI) was finished and committed on resume"
  completed: "2026-06-25"
status: complete
---

# Phase 59 Plan 03: Admin routes + UI Summary

Updated the four admin Route Handlers and three admin UI files that previously read `business_accounts.company_name` (dropped by Plan 01) to join through `company_id` → `companies.name`, while strictly preserving the unrelated `role_in_company` free-text field.

## What Was Built

### Task 1: approve + reject route emails (complete)

Both `app/api/admin/approve/route.ts` and `app/api/admin/reject/route.ts` now `.select('companies(name)')` and pass `companyName: biz.companies?.name` into their respective email senders. The `profiles.is_admin` authorization block is untouched.

### Task 2: applications list + detail embedded selects (complete)

Both `app/api/admin/applications/route.ts` and `app/api/admin/applications/[id]/route.ts` now embed `business_accounts(role, role_in_company, user_id, companies(name))` — a two-hop nested select reaching `companies` through the `company_id` FK. `role_in_company` is preserved verbatim; the new `role` enum column is also exposed but not otherwise used yet.

### Task 3: admin UI Application type + render sites (complete)

All three admin UI files (`app/admin/page.tsx`, `app/admin/AdminApplicationList.tsx`, `app/admin/[id]/page.tsx`) had their hand-duplicated `Application`/`LinkData` type's `business_accounts` member changed from `{ company_name: string; role_in_company: string | null; ... }` to `{ role_in_company: string | null; user_id: string; companies: { name: string } | null }`. The two render sites (`AdminApplicationList.tsx` line 79, `[id]/page.tsx` line 127) now read `…?.companies?.name ?? '—'`, preserving the existing fallback. `role_in_company` rendering untouched.

`npx tsc --noEmit` is clean (zero errors). `npm run build` type-checks the same code path successfully but then fails during Next's "Collecting page data" step with `Error: supabaseUrl is required` — this is an isolated-worktree artifact (no `.env.local` is present in a fresh git worktree, since it's untracked/gitignored), not a type or logic error; confirmed by the standalone `tsc` run.

## Deviations from Plan

The plan's verify command for Task 3 was `npm run build`, which fails at runtime page-data collection in this isolated worktree due to a missing `.env.local` (untracked file, not copied into new worktrees). Substituted `npx tsc --noEmit` to verify the actual acceptance criterion ("no type error from the changed Application shape") without the unrelated env-var crash. The orchestrator should re-run the full `npm run build` after merging to the main checkout (which has `.env.local`) to confirm end-to-end.

Execution was interrupted mid-Task-3 by a session usage-limit reset; resumed and finished from the already-committed Task 1-2 state plus the in-flight (uncommitted) Task 3 diff, which was verified against the plan's acceptance criteria before committing.

## Known Stubs

None.

## Threat Flags

None beyond the plan's own T-59-09 (role/role_in_company conflation — mitigated, see plan frontmatter) and T-59-10 (accept, no new exposure).

## Self-Check: PASSED

- FOUND: app/api/admin/approve/route.ts, app/api/admin/reject/route.ts (no `company_name`, both use `companies(name)`)
- FOUND: app/api/admin/applications/route.ts, app/api/admin/applications/[id]/route.ts (embedded select includes `companies(name)`, `role_in_company` preserved)
- FOUND: app/admin/page.tsx, app/admin/AdminApplicationList.tsx, app/admin/[id]/page.tsx (no `company_name`, render sites use `companies?.name`)
- FOUND commit b14e937 (Task 1), 46c683f (Task 2), 41f49eb (Task 3)
- `npx tsc --noEmit` → zero errors
