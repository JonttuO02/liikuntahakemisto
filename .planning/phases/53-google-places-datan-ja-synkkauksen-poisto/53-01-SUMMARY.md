---
phase: 53-google-places-datan-ja-synkkauksen-poisto
plan: 01
subsystem: admin-api
tags: [sync-removal, decommission, admin-route, google-places]
status: complete
dependency_graph:
  requires: []
  provides:
    - "sync-paikat route fully removed from codebase"
  affects:
    - app/api/admin/
tech_stack:
  added: []
  patterns:
    - "Reference-isolation scan (grep before delete) as a pre-deletion safety gate"
key_files:
  created: []
  modified:
    - app/api/admin/sync-paikat/route.ts (DELETED)
    - app/api/admin/__tests__/sync-paikat-filter.test.ts (DELETED)
decisions:
  - "Deleted the obsolete filter test rather than adapting it — it validated the business_managed pre-filter, a predicate this milestone is explicitly replacing with provenance via business_paikka_links (Plan 02)"
metrics:
  duration: "~10min"
  completed: 2026-06-22
---

# Phase 53 Plan 01: Decommission sync-paikat route Summary

Deleted the `/api/admin/sync-paikat` Google Places sync route and its now-obsolete `business_managed`-filter unit test, satisfying DATA-11 — the route and its (non-existent) external schedule are now fully gone from the codebase.

## What Was Built

- **Deleted `app/api/admin/sync-paikat/route.ts`** — the `ADMIN_SECRET`-bearer-auth GET route that called Google Places Text Search + Place Details and upserted results into `liikuntapaikat`. This was the only consumer of `GOOGLE_PLACES_API_KEY` in the codebase.
- **Deleted `app/api/admin/__tests__/sync-paikat-filter.test.ts`** — the inline pure-function unit test for the route's `business_managed`-based pre-filter logic. Removed rather than adapted, since the filter predicate it tested (`business_managed` boolean) is the wrong provenance signal per CONTEXT.md D-02 and is being replaced by `business_paikka_links`-based provenance in Plan 02.

This is a purely subtractive plan — no new symbols, routes, env vars, or functions were introduced.

## Tasks Completed

1. **Task 1 — Reference-isolation scan + delete.** Ran `grep -rn "sync-paikat" app/ lib/` before deleting. The only hit was the test file's own self-referential doc comment (`* app/api/admin/sync-paikat/route.ts.`). No route, lib module, or component imported or referenced the route. Confirmed via reading `app/api/admin/approve/route.ts` that retained admin routes use JWT + `profiles.is_admin`, not the `ADMIN_SECRET` bearer pattern — so no shared auth helper was orphaned by this deletion. Deleted both files. Commit: `1a1eaa6`.

2. **Task 2 — Verify build/typecheck/test suite green.** Ran `npx vitest run`: 14 test files, 182 tests, all passing. Ran `npx tsc --noEmit`: zero errors. Confirmed `app/api/admin/sync-paikat/route.ts` does not exist (structural 404 — Next.js App Router has no route table to edit; an absent route segment serves the default 404). No code changes in this task — verification only.

## Verification Results

- `grep -rn "sync-paikat" app/ lib/ --include="*.ts" --include="*.tsx"` → no matches.
- `test ! -f app/api/admin/sync-paikat/route.ts && test ! -f app/api/admin/__tests__/sync-paikat-filter.test.ts` → both succeed.
- `npx vitest run` → 14 passed (14), 182 tests passed (182).
- `npx tsc --noEmit` → clean, no output.
- `git status --short` → only the deletions from Task 1 plus a pre-existing, unrelated `.claude/settings.local.json` modification that predates this plan's execution (out of scope per scope-boundary rules — left untouched).

## Deviations from Plan

None — plan executed exactly as written. The reference scan confirmed isolation as predicted by CONTEXT.md D-05; no unexpected consumers were found, so no STOP-and-report was triggered.

## Auth Gates

None encountered.

## Known Stubs

None — this plan is purely subtractive (file deletions), no new UI or data-rendering code was introduced.

## Threat Flags

None — this plan removes attack surface (deletes an `ADMIN_SECRET`-bearer-auth route) rather than introducing new surface. Per the plan's threat_model, T-53-01 (orphaned auth helper) was mitigated by the pre-deletion reference scan; T-53-02 and T-53-03 were accepted risks with no code action required in this plan.

## Self-Check: PASSED

- `app/api/admin/sync-paikat/route.ts` — MISSING (confirmed deleted, as expected)
- `app/api/admin/__tests__/sync-paikat-filter.test.ts` — MISSING (confirmed deleted, as expected)
- Commit `1a1eaa6` — FOUND in `git log --oneline`
