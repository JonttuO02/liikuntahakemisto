---
phase: 35-admin-hyvaksyntajarjestelma
plan: 10
subsystem: admin-backend
tags: [gap-closure, logo_url, migration, onboarding, admin-api]
dependency_graph:
  requires: []
  provides: [logo_url column in liikuntapaikat, logo_url written on submit, logo_url in admin detail response]
  affects: [app/api/business/onboarding/submit, app/api/admin/applications/[id], supabase/migrations]
tech_stack:
  added: []
  patterns: [Supabase ALTER TABLE migration, optional chaining for JSONB access]
key_files:
  created:
    - supabase/migrations/20260610000003_add_logo_url_to_liikuntapaikat.sql
    - app/api/admin/applications/[id]/route.ts
    - app/api/admin/applications/route.ts
  modified:
    - app/api/business/onboarding/submit/route.ts
decisions:
  - "Cast business_accounts join via unknown to satisfy TypeScript (pre-existing bug fixed)"
metrics:
  duration: "~6 minutes"
  completed: "2026-06-10T16:02:00Z"
  tasks_completed: 3
  files_changed: 4
---

# Phase 35 Plan 10: logo_url gap closure — migration, write path, and admin select Summary

**One-liner:** Added `logo_url TEXT NULL` column to liikuntapaikat, wired the write path in onboarding/submit, and added the column to the admin detail API select.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Migration 20260610000003 — ADD COLUMN logo_url TEXT NULL | 9a14261 |
| 2 | onboarding/submit writes logo_url from draft.media_urls?.logo | 5bf29a4 |
| 3 | admin applications/[id] route selects logo_url | aa6ce3e |

## What Was Built

- **`supabase/migrations/20260610000003_add_logo_url_to_liikuntapaikat.sql`** — single `ALTER TABLE liikuntapaikat ADD COLUMN IF NOT EXISTS logo_url TEXT NULL;` statement, following the same minimal pattern as migration 20260610000001.
- **`app/api/business/onboarding/submit/route.ts`** — added `logo_url: draft.media_urls?.logo ?? null` to the liikuntapaikat UPDATE block, positioned after `photo_urls` and before `business_managed`.
- **`app/api/admin/applications/[id]/route.ts`** — added `logo_url` to the liikuntapaikat subselect (`image_url, photo_urls, logo_url, latitude, longitude`). Also created the co-located `applications/route.ts` (list endpoint) which was untracked in the main repo.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript cast for business_accounts join result**
- **Found during:** Task 3 TypeScript compile check
- **Issue:** `link.business_accounts as { user_id: string }` caused TS2352 because Supabase types infer joined tables as arrays; the cast lacked the `unknown` intermediate step recommended by the error message.
- **Fix:** Changed cast to `link.business_accounts as unknown as { user_id: string } | null`
- **Files modified:** `app/api/admin/applications/[id]/route.ts`
- **Commit:** aa6ce3e

**2. [Rule 3 - Blocking] Created applications/ routes that were untracked in the main repo**
- **Found during:** Task 3 — the directory `app/api/admin/applications/` did not exist in the worktree (only in the main repo as untracked files from a parallel agent).
- **Fix:** Created both `route.ts` and `[id]/route.ts` in the worktree from the main repo versions, then applied the `logo_url` fix on top.
- **Files modified:** `app/api/admin/applications/route.ts`, `app/api/admin/applications/[id]/route.ts`
- **Commit:** aa6ce3e

### Pre-existing TypeScript Errors (Out of Scope)

`app/admin/[id]/page.tsx` and `app/admin/page.tsx` have pre-existing TS errors from the parallel agent's plan 35-08/35-09 work. These are outside the scope of plan 35-10 and have been noted here for awareness. The three files specified in this plan compile without errors.

## Verification Results

1. Migration grep count: **1** — `ADD COLUMN IF NOT EXISTS logo_url TEXT NULL` present
2. Submit route grep count: **1** — `logo_url: draft.media_urls?.logo ?? null` present
3. Admin route grep count: **1** — `photo_urls, logo_url, latitude` present in select string
4. TypeScript: plan 35-10 files compile clean; pre-existing errors in admin page components are out-of-scope

## Manual Steps Required (Supabase Dashboard)

Before testing the logo upload flow end-to-end:
1. Run migration: `ALTER TABLE liikuntapaikat ADD COLUMN IF NOT EXISTS logo_url TEXT NULL;`
2. Ensure admin access: `UPDATE profiles SET is_admin = true WHERE user_id = (SELECT id FROM auth.users WHERE email = 'joona.orava@gmail.com');`

## Self-Check: PASSED

- [x] `supabase/migrations/20260610000003_add_logo_url_to_liikuntapaikat.sql` exists
- [x] `app/api/business/onboarding/submit/route.ts` modified (commit 5bf29a4 exists)
- [x] `app/api/admin/applications/[id]/route.ts` exists with logo_url in select (commit aa6ce3e)
- [x] All 3 task commits verified: 9a14261, 5bf29a4, aa6ce3e
