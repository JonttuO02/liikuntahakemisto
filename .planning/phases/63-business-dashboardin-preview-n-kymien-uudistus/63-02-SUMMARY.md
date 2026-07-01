---
phase: 63-business-dashboardin-preview-n-kymien-uudistus
plan: 02
subsystem: ui
tags: [react, nextjs, framer-motion, preview, callout-card, paikka-sheet]

# Dependency graph
requires:
  - phase: 62-venuepage-konsolidaatio
    provides: PaikkaSheet as the single venue-detail surface with a `preview` prop already supporting close/bookmark/show-on-map suppression
provides:
  - PreviewModal renders CalloutCard (with lat/lng shim) instead of PaikkaKortti
  - LivePreviewPane renders a third PaikkaSheet(preview=true) section below CalloutCard/DiagonaalKortti
  - PaikkaSheet's booking-link ("Varaa aika") is suppressed whenever `preview` is true, in every preview surface
affects: [63-04, 63-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Preview-surface label+component wrapper: `<span className=\"text-[10px] font-bold uppercase tracking-widest text-[rgba(17,17,17,0.45)]\">{t('previewLabelX')}</span>` followed by the component, repeated for each stacked section"
    - "Preview inertness: gate every click-through/navigation affordance on `!preview` (close, bookmark, show-on-map, booking-link) rather than conditionally unmounting the whole component"

key-files:
  created: []
  modified:
    - app/components/PreviewModal.tsx
    - app/business/onboarding/LivePreviewPane.tsx
    - app/components/PaikkaSheet.tsx

key-decisions:
  - "PreviewModal's stack is now CalloutCard -> DiagonaalKortti -> PaikkaSheet (D-11/D-12); PaikkaKortti.tsx itself was left untouched since the main list view still uses it"
  - "LivePreviewPane's existing DiagonaalKortti call was left exactly as-is (no dashboard-variant props) so live preview keeps showing the real photo (D-14)"
  - "PaikkaSheet's booking link is gated on `!preview`, mirroring the guards already applied to close/bookmark/show-on-map (PREV-05, RESEARCH.md Pitfall 3)"

patterns-established:
  - "Any preview surface composing PaikkaSheet must pass `preview={true}` with no-op `onClose`/`onToggleTodo` — this is now the only way `<a target=\"_blank\">` booking navigation is disabled"

requirements-completed: [PREV-04, LIVEPREV-05, PREV-05]

coverage:
  - id: D1
    description: "PreviewModal's stack is CalloutCard -> DiagonaalKortti -> PaikkaSheet, no PaikkaKortti rendered"
    requirement: "PREV-04"
    verification:
      - kind: other
        ref: "grep -c \"PaikkaKortti\" app/components/PreviewModal.tsx == 0; grep -c \"CalloutCard\" app/components/PreviewModal.tsx >= 1"
        status: pass
      - kind: other
        ref: "npx tsc --noEmit"
        status: pass
    human_judgment: false
  - id: D2
    description: "LivePreviewPane renders a third PaikkaSheet(preview) section below CalloutCard and DiagonaalKortti"
    requirement: "LIVEPREV-05"
    verification:
      - kind: other
        ref: "grep -c \"PaikkaSheet\" app/business/onboarding/LivePreviewPane.tsx >= 2; grep -c \"preview={true}\" == 1; grep -c \"dashboardActions\" == 0"
        status: pass
      - kind: other
        ref: "npx tsc --noEmit"
        status: pass
    human_judgment: true
    rationale: "Visual confirmation that the third section renders correctly in both the desktop split-view sidebar and the mobile toggle context requires manual inspection (per plan's <verification> section)."
  - id: D3
    description: "PaikkaSheet's booking-link button does not render when preview={true} in any preview surface, and still renders unchanged in consumer mode"
    requirement: "PREV-05"
    verification:
      - kind: other
        ref: "grep -c \"isSafeUrl(paikka.varauslinkki) && !preview\" app/components/PaikkaSheet.tsx == 1; grep -c 'target=\"_blank\"' unchanged"
        status: pass
      - kind: other
        ref: "npx tsc --noEmit"
        status: pass
    human_judgment: true
    rationale: "Manual click-audit across PreviewModal and LivePreviewPane (confirming no navigation/new-tab occurs anywhere in the stack) requires human interaction per the plan's verification section."

duration: 12min
completed: 2026-07-01
status: complete
---

# Phase 63 Plan 02: PreviewModal/LivePreviewPane composition + booking-link inertness Summary

**PreviewModal swapped PaikkaKortti for CalloutCard, LivePreviewPane gained a third PaikkaSheet(preview) section, and PaikkaSheet's booking link is now gated on `!preview` across every preview surface.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-01T14:41:00Z
- **Completed:** 2026-07-01T14:53:47Z
- **Tasks:** 3 completed
- **Files modified:** 3

## Accomplishments
- `PreviewModal.tsx` now renders `CalloutCard` (with the mandatory `latitude ?? 0` / `longitude ?? 0` shim) in place of `PaikkaKortti`, giving all three plan-02-scoped preview surfaces the same `CalloutCard → DiagonaalKortti → PaikkaSheet` stack order (D-11/D-12)
- `LivePreviewPane.tsx` gained a third stacked section — `PaikkaSheet(preview=true)` with no-op `onClose`/`onToggleTodo` — below its existing `CalloutCard`/`DiagonaalKortti` pair, working in both the desktop sidebar and mobile toggle contexts without layout changes beyond a taller scroll column (D-13)
- `PaikkaSheet.tsx`'s "Varaa aika" booking-link `<a>` is now gated on `isSafeUrl(paikka.varauslinkki) && !preview`, closing the last click-through/navigation hole identified in RESEARCH.md Pitfall 3 — consumer-mode rendering is byte-for-byte unchanged

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace PaikkaKortti with CalloutCard in PreviewModal (PREV-04, D-11/D-12)** - `05f86f9` (feat)
2. **Task 2: Add PaikkaSheet as the third LivePreviewPane section (LIVEPREV-05, D-13/D-14)** - `93da2e2` (feat)
3. **Task 3: Suppress PaikkaSheet booking link in preview mode (PREV-05, Pitfall 3)** - `d7787ef` (fix)

_Note: This plan had no TDD tasks — all three were pure composition/wiring changes to already-compliant components._

## Files Created/Modified
- `app/components/PreviewModal.tsx` - Swapped `PaikkaKortti` import/render for `CalloutCard` with the lat/lng shim; stack order now CalloutCard → DiagonaalKortti → PaikkaSheet
- `app/business/onboarding/LivePreviewPane.tsx` - Added `PaikkaSheet(preview=true)` as a third stacked section; existing DiagonaalKortti call untouched; updated the file-header doc comment to reflect the new three-section stack
- `app/components/PaikkaSheet.tsx` - Added `&& !preview` to the booking-link render conditional, matching the pre-existing guards on close/bookmark/show-on-map

## Decisions Made
- Confirmed `PreviewModal`'s current props (`paikka`, `onClose`) have no `brandColor`/`accentColor` available, so `CalloutCard` was rendered without those two optional props (CalloutCard handles their absence gracefully) — no deviation from the plan, which explicitly allowed this fallback
- Left `PaikkaKortti.tsx` itself untouched — it remains the card component for the main consumer-facing list view; only its usage inside `PreviewModal` was removed
- Reworded a doc-comment edit in `LivePreviewPane.tsx` to avoid the literal substring `dashboardActions` so it wouldn't collide with Task 2's own acceptance-criteria grep check (`grep -c "dashboardActions" == 0`) — a self-inflicted false-positive caught and fixed before committing, not a deviation from the plan's actual code requirements

## Deviations from Plan

None - plan executed exactly as written. All three tasks matched their `<action>` blocks precisely; the only wrinkle (the doc-comment/grep collision above) was caught and corrected within Task 2's own verification loop before commit, so no separate deviation rule applies.

## Issues Encountered
- `.planning/phases/63-.../63-PATTERNS.md`, referenced in each task's `<read_first>` for exact JSX snippets, was not present in this worktree (present in the orchestrator's git status as untracked, but not copied into the per-agent worktree). Used the existing analogous code instead — `LivePreviewPane.tsx`'s pre-existing `CalloutCard` section as the Task 1 template, and `PreviewModal.tsx`'s pre-existing `PaikkaSheet(preview=true)` section (already present, likely landed by a sibling wave-1 plan) as the Task 2 template — both are the same source `<read_first>` pointed to as fallback analogs, so no information was actually missing.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- PREV-04, LIVEPREV-05, and PREV-05 are all implemented and type-check clean; ready for the manual click-audit and visual confirmation called out in this plan's `<verification>` section (desktop sidebar + mobile toggle rendering, click-through audit across CalloutCard/DiagonaalKortti/PaikkaSheet)
- No blockers for Plans 04/05, which build on the same dashboard/preview surfaces

---
*Phase: 63-business-dashboardin-preview-n-kymien-uudistus*
*Completed: 2026-07-01*

## Self-Check: PASSED

All modified files (`app/components/PreviewModal.tsx`, `app/business/onboarding/LivePreviewPane.tsx`, `app/components/PaikkaSheet.tsx`) and all four commits (`05f86f9`, `93da2e2`, `d7787ef`, `5e4af6b`) verified present on disk / in git log.
