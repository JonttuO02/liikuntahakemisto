---
phase: 42
plan: "01"
subsystem: business-dashboard
tags: [dashboard, business, i18n, ui-redesign]
dependency_graph:
  requires: [41-navigation-foundation]
  provides: [business-dashboard-v2]
  affects: [app/business/page.tsx, messages/fi.json, messages/en.json]
tech_stack:
  added: []
  patterns: [StatusCard-helper, VenueRow-helper, extracted-reapply-fn]
key_files:
  created: []
  modified:
    - app/business/page.tsx
    - messages/fi.json
    - messages/en.json
decisions:
  - StatusCard derives overall status from venueLinks (approved if any approved, rejected if all rejected, else pending)
  - VenueRow extracted from inline map() body to keep BusinessPage clean
  - handleReapply extracted as named function called from both StatusCard and VenueRow
  - Dashboard layout uses full-width pt-16 main (not centered glass card) to match BusinessNav fixed positioning
  - Map quick-action card links to /business/map (built in plan 42-02)
metrics:
  duration: "~8 minutes"
  completed: "2026-06-12T13:04:00Z"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 3
---

# Phase 42 Plan 01: Dashboard Redesign Summary

**One-liner:** Business dashboard redesigned with account StatusCard (approved/pending/rejected with left-border color), VenueRow helper, and /business/map quick-action card.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Add i18n keys to fi/en Business namespace | 6c59221 | messages/fi.json, messages/en.json |
| 2 | Redesign /business dashboard page | 6f575af | app/business/page.tsx |

## What Was Built

### i18n additions (Task 1)
Added 9 new keys to the `Business` namespace in both `messages/fi.json` and `messages/en.json`:
- `dashboardStatusPendingTitle/Body` — pending state messaging
- `dashboardStatusApprovedTitle/Body` — approved state messaging
- `dashboardStatusRejectedTitle/Body/BodyNoReason` — rejected state with optional reason
- `dashboardMapCta` — "Avaa kartta" / "Open map"
- `dashboardVenuesHeading` — "Paikkasi" / "Your venues"

### Dashboard redesign (Task 2)
`app/business/page.tsx` was refactored:

**New helpers (non-exported, defined above BusinessPage):**
- `StatusCard` — derives overall account status from `venueLinks`: shows green/amber/red left-border `.glass rounded-2xl` card. If allRejected, shows reapply CTA.
- `VenueRow` — extracts the per-venue render from inline `.map()` body. Preserves name+badge, esikatselu/muokkaa buttons, per-row reapply for rejected status.

**Extracted function:**
- `handleReapply(paikkaId: number)` — replaces inline async onClick, called from both StatusCard and VenueRow.

**New layout (venueLinks.length > 0 branch):**
- `<main className="min-h-screen bg-white pt-16 px-4 pb-24">` — full-width, pt-16 clears fixed BusinessNav
- StatusCard at top
- Venues section with `dashboardVenuesHeading` label
- Add venue section (preserved toggle behavior)
- Quick-action card linking to `/business/map`
- PreviewModal AnimatePresence at bottom

**Unchanged:** auth logic, draft redirect, data fetching, loading spinner, not-business-account state, empty-venue ClaimSearchForm branch.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — map quick-action links to `/business/map` which is built in plan 42-02. The link itself is functional; the destination route is implemented in the next plan.

## Self-Check: PASSED

- [x] `app/business/page.tsx` exists and modified
- [x] `messages/fi.json` contains `dashboardStatusPendingTitle` key
- [x] `messages/en.json` contains `dashboardStatusPendingTitle` key
- [x] `npx tsc --noEmit` — no errors
- [x] Commit 6c59221 exists (i18n keys)
- [x] Commit 6f575af exists (dashboard redesign)
