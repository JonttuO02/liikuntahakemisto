---
phase: 60-hallintaoikeuspyynn-t-backend-s-hk-posti
plan: "06"
subsystem: middleware
tags: [middleware, auth-guard, business, access-requests, gap-fix]
status: complete

dependency_graph:
  requires: [60-05]
  provides: [public /business/liity route access for unauthenticated users]
  affects: [middleware.ts, app/business/liity/page.tsx (runtime behavior)]

tech_stack:
  added: []
  patterns: [middleware public-path exclusion, client-side auth redirect]

key_files:
  modified:
    - middleware.ts

decisions:
  - "isPublicBusinessPath extended with startsWith('/business/liity') — the liity page is a thin public deep-link landing page that serves no authenticated data before its client-side useEffect runs"
  - "Documenting comment in middleware updated to name /business/liity alongside the existing public paths"

metrics:
  duration: "~1 min"
  completed_date: "2026-06-25"
  tasks_completed: 1
  files_changed: 1
---

# Phase 60 Plan 06: Middleware liity Public Path Fix Summary

Surgical one-line fix: add `/business/liity` to the `isPublicBusinessPath` predicate in `middleware.ts` so unauthenticated visitors reach the liity invite-landing page and its own `useEffect` redirect logic can run (redirecting to `/business/rekisteroidy?paikka_id=X`).

## What Was Built

Extended the business auth guard in `middleware.ts` from two public paths (`/business/rekisteroidy`, `/business/kirjaudu`) to three, adding `/business/liity` as a third `||` clause. Updated the documenting comment above the predicate to name `/business/liity` and explain it is the public deep-link invite landing page whose client-side useEffect handles the unauthenticated redirect.

No other changes: the consumer branch, the cookie/session refresh logic, the auth-guard redirect (`!isPublicBusinessPath && !user` → `/business/kirjaudu`), and the matcher config are byte-for-byte identical.

## Verification

- `grep` confirms all three `startsWith` clauses are present in `middleware.ts`
- `npx tsc --noEmit` passes clean (no output)
- UAT Test 2 (unauthenticated visitor to `/business/liity?paikka_id=X` must reach the liity page, not `/business/kirjaudu`) is now unblocked
- UAT Tests 3 and 4 (previously blocked by this same bug) are now runnable

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

No new threat surface introduced. The `/business/liity` exclusion from the auth guard was audited in the plan's threat model (T-60-16, T-60-17) and accepted: the page serves no privileged data before routing; the `useEffect` redirect sends unauthenticated users to `/business/rekisteroidy`; authenticated POSTs to `/api/business/access-request/submit` re-run all server-side guards (Plan 03).

## Self-Check: PASSED

- `middleware.ts` modified and committed: 0f0553c
- All three `isPublicBusinessPath` clauses verified present via grep
- TypeScript check passed clean
