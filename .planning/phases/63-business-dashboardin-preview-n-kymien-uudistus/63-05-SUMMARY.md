---
phase: 63-business-dashboardin-preview-n-kymien-uudistus
plan: 05
subsystem: ui
tags: [next.js, react, diagonaalkortti, business-dashboard]

# Dependency graph
requires:
  - phase: 63-04
    provides: DiagonaalKortti dashboardActions variant + RejectionReasonPopup component
provides:
  - "/business dashboard renders DiagonaalKortti dashboard cards (DashboardVenueCard wrapper) instead of the old text-based VenueRow"
  - "Page-level RejectionReasonPopup wired via rejectionPopupLink state"
  - "handleReapply and all reapply CTAs removed; /api/business/reapply route deleted"
affects: [64-hallintaoikeuspyynn-t-dashboard-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "DashboardVenueCard: thin per-venue wrapper holding copied/handleCopyInviteLink local state, delegates all rendering to DiagonaalKortti's dashboardActions variant"

key-files:
  created: []
  modified:
    - app/business/page.tsx
    - app/api/business/reapply/route.ts (deleted)

key-decisions:
  - "handleReapply's replacement behavior is the automatic server-side status flip already implemented in update-paikka/route.ts (Plan 03) — no new fetch call was ported"
  - "app/api/business/reapply/route.ts deleted entirely (RESEARCH.md Pitfall 1 / Assumption A2, D-15); its migration column/index (20260610000004_reapply_cooldown.sql) left untouched as harmless dead weight"

patterns-established:
  - "Dashboard venue cards: page-level state (rejectionPopupLink) + single popup instance pattern, avoiding one popup mount per card"

requirements-completed: [BIZPANEL-06, BIZPANEL-07]

coverage:
  - id: D1
    description: "/business dashboard's venue list renders DiagonaalKortti dashboardActions cards (via DashboardVenueCard) instead of VenueRow, for every venueLink"
    requirement: "BIZPANEL-07"
    verification:
      - kind: unit
        ref: "npx tsc --noEmit"
        status: pass
      - kind: other
        ref: "grep -c \"function DashboardVenueCard\" app/business/page.tsx == 1; grep -c \"function VenueRow\" app/business/page.tsx == 0; grep -c \"dashboardActions=\" app/business/page.tsx == 1"
        status: pass
    human_judgment: true
    rationale: "Visual verification of rendered card layout, status pill placement, and icon-button subsets per status (approved/pending/rejected/kesken) requires human inspection of the live /business page — grep/tsc confirm wiring but not visual correctness."
  - id: D2
    description: "No 'Hae uudelleen' (reapply) button or fetch call to /api/business/reapply exists anywhere in the codebase; the route file is deleted"
    requirement: "BIZPANEL-07"
    verification:
      - kind: other
        ref: "grep -c handleReapply app/business/page.tsx == 0; grep -c reapplyCta app/business/page.tsx == 0; grep -rln \"api/business/reapply\" app --include=\"*.ts\" --include=\"*.tsx\" == empty; file app/api/business/reapply/route.ts does not exist"
        status: pass
      - kind: unit
        ref: "npm test (233 tests, 21 files) - full suite green after route deletion"
        status: pass
    human_judgment: false
  - id: D3
    description: "Rejected venues expose a rejection-info icon button opening a single page-level RejectionReasonPopup instance with that venue's rejection_reason and editHref of /business/{paikka_id}"
    requirement: "BIZPANEL-06"
    verification:
      - kind: other
        ref: "grep -c RejectionReasonPopup app/business/page.tsx == 2 (import + usage)"
        status: pass
    human_judgment: true
    rationale: "Confirming the popup opens with the correct venue's rejection reason and that its CTA navigates to the right edit route requires a manual click-through per RESEARCH.md's manual verification steps."
  - id: D4
    description: "Copy-invite-link icon button still only appears for approved && !kesken venues, still works via navigator.clipboard.writeText"
    requirement: "BIZPANEL-07"
    verification:
      - kind: other
        ref: "onCopyInviteLink gate `link.claim_status === 'approved' && !isKesken` copied verbatim from prior VenueRow; handleCopyInviteLink relocated verbatim (navigator.clipboard.writeText + 2s timeout)"
        status: pass
    human_judgment: true
    rationale: "Clipboard write behavior in a real browser and the copied-state UI toggle require manual verification; verbatim relocation gives high confidence but not proof."

duration: 3min
completed: 2026-07-01
status: complete
---

# Phase 63 Plan 05: Wire DiagonaalKortti Dashboard Cards into /business Summary

**Replaced /business dashboard's plain-text VenueRow/StatusCard reapply UI with DiagonaalKortti dashboardActions cards and a single page-level RejectionReasonPopup; deleted the now-dead /api/business/reapply route.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-07-01T15:08:20Z
- **Completed:** 2026-07-01T15:11:43Z
- **Tasks:** 2
- **Files modified:** 2 (1 modified, 1 deleted)

## Accomplishments
- `/business` venue list now renders `DashboardVenueCard` (a thin wrapper holding `copied`/`handleCopyInviteLink` local state) around `DiagonaalKortti`'s `dashboardActions` variant, for every `venueLink` — replacing the old `VenueRow` text-list rendering
- `StatusCard`'s "Hae uudelleen" CTA and `handleReapply` removed entirely; D-07's replacement behavior (automatic server-side status flip) already lives in `update-paikka/route.ts` (Plan 03) with no new fetch call ported
- Page-level `rejectionPopupLink` state + single `RejectionReasonPopup` instance wired after the existing `PreviewModal` `AnimatePresence` block — rejected venues expose a rejection-info icon button (via `DiagonaalKortti`'s `dashboardActions.onShowRejectionInfo`) that opens the popup with that venue's rejection reason and an `editHref` of `/business/{paikka_id}`
- `app/api/business/reapply/route.ts` deleted (zero remaining callers after Task 1); `20260610000004_reapply_cooldown.sql` migration left untouched per D-15

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace VenueRow/StatusCard's reapply UI with DiagonaalKortti-cards and RejectionReasonPopup** - `f4c9319` (feat)
2. **Task 2: Delete the now-dead /api/business/reapply route** - `b36b955` (chore)

_Note: no TDD tasks in this plan._

## Files Created/Modified
- `app/business/page.tsx` - `VenueRow` replaced with `DashboardVenueCard` (wraps `DiagonaalKortti` dashboardActions variant); `StatusCard`'s `onReapply` prop and CTA removed; `handleReapply` deleted; new `rejectionPopupLink` state + page-level `RejectionReasonPopup` instance added; render loop updated to map `DashboardVenueCard`
- `app/api/business/reapply/route.ts` - deleted (dead code, zero callers)

## Decisions Made
- None beyond what the plan specified — `handleReapply`'s replacement is the pre-existing server-side auto-resubmit in `update-paikka/route.ts` (Plan 03); no new fetch call was added anywhere.
- The `20260610000004_reapply_cooldown.sql` migration (column/index only, no trigger) was left in place untouched per D-15 — confirmed harmless since it only added schema, not active logic.

## Deviations from Plan

None - plan executed exactly as written. Both tasks' acceptance criteria (grep checks, `npx tsc --noEmit`, `npm test`) passed on the first attempt with no auto-fixes required.

## Issues Encountered

None. The referenced `63-PATTERNS.md` file (cited in Task 1's `<read_first>` for relocation guidance line numbers) was not present in this worktree — it exists only as an untracked file in the main repo's working tree, not committed to any shared branch, so worktree isolation excluded it. This did not block execution: the plan's `<action>` block contained fully explicit, self-sufficient instructions (exact prop shapes, exact code to relocate verbatim, exact render-loop replacement), and cross-referencing `DiagonaalKortti.tsx`/`RejectionReasonPopup.tsx` directly confirmed all prop contracts before writing code.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `/business` dashboard is fully migrated to `DiagonaalKortti` dashboard cards; BIZPANEL-06 and BIZPANEL-07 complete for this phase.
- `npx tsc --noEmit` clean; full test suite green (233/233 tests, 21 files).
- Manual UAT still needed (per plan's `<verification>` section): open `/business` with approved/pending/rejected/kesken venues and confirm correct status pill + icon-button subset per status; click the rejection-info icon and confirm the popup shows the rejection reason (or no-reason fallback) with no network request, navigating to `/business/{paikka_id}` via its CTA.
- No blockers for Phase 64 (access UI) — this plan's changes to `app/business/page.tsx` are the last planned change to that file in Phase 63.

---
*Phase: 63-business-dashboardin-preview-n-kymien-uudistus*
*Completed: 2026-07-01*
