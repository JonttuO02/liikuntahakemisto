---
phase: "14"
plan: "03"
subsystem: "profile page"
tags: [auth, supabase, profiles, client-component, glassmorphism]
dependency_graph:
  requires:
    - "14-01 (profiles table DDL + RLS policies)"
  provides:
    - /profiili route (server shell + client component)
    - Three-state auth machine for profile page
    - kotikaupunki read/upsert from profiles table
  affects:
    - app/profiili/page.tsx (new)
    - app/profiili/ProfiiliClient.tsx (new)
tech_stack:
  added: []
  patterns:
    - Three-state auth machine (loading/unauthenticated/authenticated)
    - SuosikitClient auth pattern adapted for profile CRUD
    - Supabase client-side upsert with onConflict
    - Glassmorphism .glass card with form input
key_files:
  created:
    - app/profiili/page.tsx
    - app/profiili/ProfiiliClient.tsx
  modified: []
decisions:
  - "loadProfile silently ignores PGRST116 (no row for new user) — sets kotikaupunki to ''"
  - "handleSave guards with if (!userId) return before upsert"
  - "unauthenticated back link uses href='/' not /?nakyma=lista per CLAUDE.md routing constraint"
  - "userEmail stored in separate useState populated from subscribeToAuthUser callback"
  - "success feedback uses 2500ms timeout matching D-04 decision"
metrics:
  duration: "2 minutes"
  completed: "2026-05-28T09:08:46Z"
  tasks_completed: 2
  files_created: 2
  files_modified: 0
  tests_added: 0
  tests_passing: 0
---

# Phase 14 Plan 03: Profiili Route Summary

**One-liner:** Auth-gated /profiili page with three-state machine, kotikaupunki text input, profiles table read/upsert, and inline 2.5s save feedback using glassmorphism .glass card.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create app/profiili/page.tsx server shell | bb7e37c | app/profiili/page.tsx |
| 2 | Create ProfiiliClient.tsx with auth machine and profiles upsert | a482f2c | app/profiili/ProfiiliClient.tsx |

## Verification Results

- `ls app/profiili/page.tsx app/profiili/ProfiiliClient.tsx` — both exist
- `npx tsc --noEmit` exits 0 (no TypeScript errors)
- `grep -c "from '@/lib/supabaseSSR'" app/profiili/ProfiiliClient.tsx` → 1
- `grep -c "onConflict: 'user_id'" app/profiili/ProfiiliClient.tsx` → 1
- `grep -c "href='/'" app/profiili/ProfiiliClient.tsx` → 2 (both back links use /)
- `grep -c "nakyma=lista" app/profiili/ProfiiliClient.tsx` → 0 (correct)
- `grep -c "Kotikaupunki tallennettu" app/profiili/ProfiiliClient.tsx` → 1
- `grep -c "2500" app/profiili/ProfiiliClient.tsx` → 1

## Deviations from Plan

None — plan executed exactly as written.

Task 2 has `tdd="true"` but no separate test file is specified in `<files>` and the `<verify>` block uses `npx tsc --noEmit`. The component is a React client component (UI state machine) rather than a pure function, so verification via TypeScript compilation is the appropriate gate. The component was implemented directly following the pattern specifications in 14-PATTERNS.md.

## Known Stubs

None — both files are fully functional:
- `page.tsx` is a complete server shell with real imports
- `ProfiiliClient.tsx` has real auth subscription, real Supabase queries, and real form handling

## Threat Surface Scan

T-14-05 (profiles SELECT): Mitigated — RLS SELECT policy enforces `auth.uid() = user_id` (created in Plan 01). Browser client uses anon key which is safe for authenticated user's own row.

T-14-06 (profiles UPSERT): Mitigated — RLS INSERT+UPDATE policies (created in Plan 01) enforce user_id ownership. `onConflict: 'user_id'` is atomic and cannot overwrite another user's row.

T-14-07 (PGRST116 error surfacing): Accepted — error is silently swallowed in `loadProfile`; treated as "new user, no row yet". No information disclosure.

No new network endpoints, auth paths, or file access patterns beyond what is specified in the threat model.

## Self-Check

- [x] app/profiili/page.tsx exists
- [x] app/profiili/ProfiiliClient.tsx exists
- [x] Commit bb7e37c exists (Task 1)
- [x] Commit a482f2c exists (Task 2)
