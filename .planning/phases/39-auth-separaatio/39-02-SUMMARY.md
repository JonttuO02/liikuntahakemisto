---
phase: 39-auth-separaatio
plan: "02"
subsystem: auth
tags: [middleware, cookie-namespace, i18n, business-auth, session-isolation]
dependency_graph:
  requires:
    - lib/supabase-business.ts (from 39-01)
  provides:
    - middleware.ts (path-conditional session refresh, business auth guard)
    - messages/fi.json (Business.loginTitle + 6 login keys)
    - messages/en.json (Business.loginTitle + 6 login keys)
  affects:
    - "39-03 (business/kirjaudu login page — consumes i18n keys)"
    - "39-04 (route protection — middleware guard active)"
tech_stack:
  added: []
  patterns:
    - "Path-conditional session refresh in middleware (isBusiness branch)"
    - "@supabase/ssr cookieOptions.name for cookie namespace isolation in middleware inline construction"
    - "Mutually exclusive client branches — each request touches exactly one cookie namespace"
key_files:
  created:
    - messages/fi.json (new in this worktree branch, carries master content + 7 new Business keys)
    - messages/en.json (new in this worktree branch, carries master content + 7 new Business keys)
  modified:
    - middleware.ts
decisions:
  - "Middleware constructs clients inline (not via createBusinessServerClient) — middleware has no cookieStore/ReadonlyRequestCookies, must use request.cookies/response.cookies directly"
  - "Both /business/rekisteroidy and /business/kirjaudu excluded from business auth guard per D-08"
  - "Consumer branch has no auth guard — only session refresh"
  - "cookieOptions: { name: 'sb-biz' } confirmed as correct API via 39-01 verification"
metrics:
  duration_minutes: 8
  completed: "2026-06-12"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 1
---

# Phase 39 Plan 02: Path-Conditional Middleware + Business Login i18n Summary

**One-liner:** middleware.ts now branches on `/business/*` to refresh `sb-biz-*` session (with guard to `/business/kirjaudu`) vs. consumer `sb-*` session; 7 login-page i18n keys added to both fi.json and en.json.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Rewrite middleware.ts with path-conditional session refresh | e0e7616 | middleware.ts |
| 2 | Add i18n strings for /business/kirjaudu | 1b24e76 | messages/fi.json, messages/en.json |

## What Was Built

### Task 1: middleware.ts

The middleware now determines `isBusiness = pathname.startsWith('/business')` and takes one of two mutually exclusive paths:

**Business branch (`/business/*`):**
- Constructs `createServerClient` with `cookieOptions: { name: 'sb-biz' }` and inline cookie handlers
- Calls `supabase.auth.getUser()` to refresh the `sb-biz-*` session
- Auth guard: if path is not `/business/rekisteroidy` and not `/business/kirjaudu`, and `user` is null, redirects to `/business/kirjaudu`

**Consumer branch (all other paths):**
- Constructs `createServerClient` without `cookieOptions` (default `sb-*` namespace)
- Calls `supabase.auth.getUser()` to refresh the `sb-*` session
- No redirect guard on consumer routes

No DB queries in either branch. `config.matcher` unchanged.

### Task 2: i18n strings

Added 7 new keys to the `Business` section in both message files:

| Key | fi.json | en.json |
|-----|---------|---------|
| loginTitle | Kirjaudu yritystilille | Sign in to business account |
| loginCta | Kirjaudu | Sign in |
| loggingIn | Kirjaudutaan... | Signing in... |
| loginEmailPlaceholder | Sähköpostiosoite | Email address |
| loginPasswordPlaceholder | Salasana | Password |
| noAccountLink | Ei tiliä? Rekisteröidy | No account? Register |
| errorInvalidCredentials | Virheellinen sähköposti tai salasana. | Invalid email or password. |

## Verification Results

```
grep -c "sb-biz" middleware.ts                                         -> 3 (OK, >= 1)
grep "business/kirjaudu" middleware.ts                                 -> redirect target + exclusion lines
grep -E "rekisteroidy|kirjaudu" middleware.ts                          -> both exclusions present
node -e "...JSON.parse both...console.log('ok')"                       -> ok
npx tsc --noEmit 2>&1 | grep middleware                                -> (empty, OK)
```

## Deviations from Plan

**[Rule 3 - Blocking] messages/ directory not in worktree — copied from master**

- **Found during:** Task 2 setup
- **Issue:** The worktree branch was forked before messages/fi.json and messages/en.json were committed to master. The files existed in master's history but were absent from the worktree working tree.
- **Fix:** Created `messages/` directory and copied both files from `git show master:messages/fi.json` and `git show master:messages/en.json` into the worktree before editing. The worktree commit includes full file content (master content + 7 new keys).
- **Files modified:** messages/fi.json, messages/en.json (new in worktree branch)
- **Impact:** None. When the orchestrator merges this worktree branch, the messages files will carry the correct master content plus the new login keys. If master already has those files with the same content, merge will be clean. If master has added additional keys since the fork, the merge will need conflict resolution — but since only the Business section was modified and no existing keys were touched, a standard merge should succeed.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. The middleware guard and cookie namespace isolation implement mitigations T-39-03, T-39-04, and T-39-05 as specified in the threat register.

## Self-Check: PASSED

- middleware.ts exists and contains path-conditional logic: VERIFIED
- messages/fi.json exists and parses as valid JSON: VERIFIED
- messages/en.json exists and parses as valid JSON: VERIFIED
- All 7 new Business i18n keys present in both files: VERIFIED
- Commit e0e7616 exists: VERIFIED
- Commit 1b24e76 exists: VERIFIED
- TypeScript compiles cleanly (no middleware errors): VERIFIED
