---
phase: 27-siivous-pienet-korjaukset
plan: 01
subsystem: navigation
tags: [cleanup, dead-route, nav-links, suosikit]
dependency_graph:
  requires: []
  provides: [NAV-06, NAV-07]
  affects: [app/components/NavBar.tsx, app/components/NavPill.tsx]
tech_stack:
  added: []
  patterns: []
key_files:
  created: []
  modified:
    - app/components/NavBar.tsx
    - app/components/NavPill.tsx
  deleted:
    - app/suosikit/page.tsx
    - app/suosikit/SuosikitClient.tsx
decisions:
  - Delete suosikit route files entirely (superseded by TODO overlay in v1.5)
  - Remove Bookmark import from both NavBar and NavPill after link removal
  - Update NavPill comment to only reference ProfiiliClient guest guard
metrics:
  duration: "1m 5s"
  completed_date: "2026-06-03"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 4
---

# Phase 27 Plan 01: Remove /suosikit Route and Nav Links Summary

**One-liner:** Deleted standalone /suosikit page route and removed all navigation links pointing to it from NavBar.tsx and NavPill.tsx.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Delete /suosikit route files | 7c20b43 | app/suosikit/page.tsx (deleted), app/suosikit/SuosikitClient.tsx (deleted) |
| 2 | Remove /suosikit nav links from NavBar.tsx and NavPill.tsx | 2d27cc2 | app/components/NavBar.tsx, app/components/NavPill.tsx |

## What Was Done

**Task 1 — Delete /suosikit route files:**
The `app/suosikit/page.tsx` and `app/suosikit/SuosikitClient.tsx` files were deleted. These formed the standalone TO DO list route that was superseded by the inline TODO overlay introduced in v1.5. The `/suosikit` URL now returns a Next.js 404 automatically. The Supabase `suosikit` table queries in `app/components/Etusivu.tsx` were NOT touched — they power the TODO overlay feature.

**Task 2 — Remove /suosikit nav links:**
- `NavBar.tsx`: Removed the `{clientEmail && (...)}` block containing `<Link href="/suosikit">` with the TO DO label and Bookmark icon. Removed the now-unused `Bookmark` import from lucide-react.
- `NavPill.tsx`: Removed the `<Link href="/suosikit">` TO DO block from the `user && (...)` section. The `<Link href="/profiili">` block immediately above it remains intact. Updated the comment to remove the defunct reference to `SuosikitClient`. Removed the now-unused `Bookmark` import from lucide-react.

## Verification Results

All three plan verification steps passed:
1. `npx tsc --noEmit` — PASS (zero errors)
2. suosikit files deleted check — PASS
3. nav link removal check — PASS

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None — deletion of a file-based route causes Next.js to return 404 for /suosikit automatically. No new surface introduced.

## Self-Check: PASSED

- app/suosikit/page.tsx: DELETED (confirmed)
- app/suosikit/SuosikitClient.tsx: DELETED (confirmed)
- app/components/NavBar.tsx: MODIFIED — no href="/suosikit" (confirmed)
- app/components/NavPill.tsx: MODIFIED — no href="/suosikit", href="/profiili" intact (confirmed)
- Commit 7c20b43: FOUND
- Commit 2d27cc2: FOUND
