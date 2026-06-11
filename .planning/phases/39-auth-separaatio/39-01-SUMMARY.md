---
phase: 39-auth-separaatio
plan: "01"
subsystem: auth
tags: [supabase, ssr, cookie-namespace, business-auth]
dependency_graph:
  requires: []
  provides:
    - lib/supabase-business.ts (createBusinessBrowserClient, createBusinessServerClient)
  affects:
    - "39-02 (business middleware)"
    - "39-03 (business auth hooks)"
    - "39-04 (route protection)"
tech_stack:
  added: []
  patterns:
    - "@supabase/ssr createBrowserClient with cookieOptions.name for cookie namespace isolation"
    - "Module-level singleton pattern for browser client (mirrors supabaseSSR.ts)"
key_files:
  created:
    - lib/supabase-business.ts
  modified: []
decisions:
  - "Used createBrowserClient from @supabase/ssr (not createClient from supabase-js) — SSR createBrowserClient handles cookie storage natively; no custom onAuthStateChange needed"
  - "cookieOptions.name = 'sb-biz' hardcoded string literal (T-39-01 mitigated — not user-supplied)"
  - "No onAuthStateChange listener in createBusinessBrowserClient — @supabase/ssr manages token refresh internally via cookie mechanism"
metrics:
  duration_minutes: 5
  completed: "2026-06-12"
  tasks_completed: 1
  tasks_total: 1
  files_created: 1
  files_modified: 0
---

# Phase 39 Plan 01: supabase-business.ts — sb-biz Cookie Namespace Foundation Summary

**One-liner:** New `lib/supabase-business.ts` establishes business auth isolation via `@supabase/ssr` clients using `cookieOptions.name = 'sb-biz'`, producing `sb-biz-auth-token` cookies completely separate from consumer `sb-auth-token`.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create lib/supabase-business.ts with sb-biz-* namespace clients | 132f9e2 | lib/supabase-business.ts |

## What Was Built

`lib/supabase-business.ts` exports two factory functions:

- **`createBusinessBrowserClient()`** — module-level singleton (`_bizBrowserClient`), uses `createBrowserClient` from `@supabase/ssr` with `cookieOptions: { name: 'sb-biz' }`. No `onAuthStateChange` listener (the SSR createBrowserClient handles token refresh internally). Returns cached instance on subsequent calls.

- **`createBusinessServerClient(cookieStore)`** — uses `createServerClient` from `@supabase/ssr` with `cookieOptions: { name: 'sb-biz' }`. Mirrors `createServerSupabase` from `lib/supabaseSSR.ts` exactly: `getAll()` returns `cookieStore.getAll()`, `setAll()` is a no-op.

## Verification Results

```
grep -c "cookieOptions.*sb-biz" lib/supabase-business.ts  -> 2 (OK)
grep -c "export function" lib/supabase-business.ts        -> 2 (OK)
grep -c "_bizBrowserClient" lib/supabase-business.ts      -> 4 (OK, >= 3 required)
npx tsc --noEmit 2>&1 | grep supabase-business            -> (empty, OK)
```

## Deviations from Plan

None — plan executed exactly as written.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. The `cookieOptions.name = 'sb-biz'` value is a hardcoded string literal (T-39-01 mitigated as specified in threat model).

## Self-Check: PASSED

- lib/supabase-business.ts exists: FOUND
- Commit 132f9e2 exists: FOUND
- TypeScript compiles cleanly: VERIFIED (no output from tsc grep)
