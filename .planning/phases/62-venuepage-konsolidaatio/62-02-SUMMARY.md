---
phase: 62-venuepage-konsolidaatio
plan: 02
subsystem: ui
tags: [react, nextjs, framer-motion, card-component]

# Dependency graph
requires:
  - phase: 62-venuepage-konsolidaatio (plan 01)
    provides: "Näytä kartalla SheetRow + i18n keys in PaikkaSheet (not a hard runtime dependency for this plan, but the content-migration prerequisite for the phase as a whole)"
provides:
  - "DiagonaalKortti onOpen?: (paikka: Liikuntapaikka) => void prop replacing onCardClick"
  - "Conditional overlay element: interactive role=button div when onOpen is provided, inert no-op div otherwise"
  - "Removal of the next/link Link import and the /paikat/[id] navigation path from DiagonaalKortti"
affects: [62-03-PLAN.md (Etusivu wiring), venuepage-konsolidaatio]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Prop-conditional overlay div (interactive vs inert) replacing a navigating Link, used as the card-to-sheet trigger pattern"

key-files:
  created: []
  modified:
    - app/components/DiagonaalKortti.tsx

key-decisions:
  - "Overlay div is self-closing/empty and a sibling of the LEFT/RIGHT panels (not a wrapper), per RESEARCH.md Pitfall 1 — preserves card layout exactly"
  - "Keyboard activation (Enter/Space) added to the interactive overlay div since role=button on a div needs explicit key handling for accessibility parity with the removed Link"

patterns-established:
  - "Card components that need to be context-aware (navigate in consumer views, inert in preview views) use an optional onOpen callback prop with a conditional overlay element, not a navigating Link"

requirements-completed: [VENUEPAGE-03]

coverage:
  - id: D1
    description: "DiagonaalKortti calls onOpen(paikka) on click (and Enter/Space) when onOpen is provided, with no page navigation"
    requirement: VENUEPAGE-03
    verification:
      - kind: other
        ref: "grep -c next/link app/components/DiagonaalKortti.tsx == 0; grep -c /paikat/ app/components/DiagonaalKortti.tsx == 0; grep -c onCardClick app/components/DiagonaalKortti.tsx == 0"
        status: pass
      - kind: unit
        ref: "npx tsc --noEmit (DiagonaalKortti.tsx specifically — zero errors; one unrelated pre-existing error in Etusivu.tsx, see Deviations)"
        status: pass
    human_judgment: true
    rationale: "Click/keyboard-activation behavior and visual card rendering require a manual smoke test in a running app (no automated test framework in this project); deferred to wave-merge UAT once Plan 03 wires onOpen in Etusivu.tsx"
  - id: D2
    description: "DiagonaalKortti renders an inert non-navigating overlay when onOpen is absent (preview contexts)"
    requirement: VENUEPAGE-03
    verification:
      - kind: other
        ref: "Source review: app/components/DiagonaalKortti.tsx lines 90-100 — falsy-onOpen branch renders <div className=\"absolute inset-0 block z-10\" /> with no onClick/onKeyDown handlers"
        status: pass
    human_judgment: true
    rationale: "Preview-context inertness (PreviewModal, LivePreviewPane, admin/[id]) requires visual confirmation that clicking does nothing — manual UAT, no test framework available"
  - id: D3
    description: "DiagonaalKortti no longer imports or renders a next/link Link, and no longer accepts onCardClick"
    requirement: VENUEPAGE-03
    verification:
      - kind: other
        ref: "grep -c next/link app/components/DiagonaalKortti.tsx == 0; grep -c onCardClick app/components/DiagonaalKortti.tsx == 0"
        status: pass
    human_judgment: false

duration: 17min
completed: 2026-06-30
status: complete
---

# Phase 62 Plan 02: DiagonaalKortti onOpen refactor Summary

**Replaced DiagonaalKortti's invisible `next/link` navigation overlay with a prop-conditional `onOpen` callback div — interactive when wired by a consumer, inert no-op in preview contexts.**

## Performance

- **Duration:** 17 min
- **Started:** 2026-06-30T21:50:00Z
- **Completed:** 2026-06-30T22:07:08Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- `DiagonaalKortti` exposes `onOpen?: (paikka: Liikuntapaikka) => void`, replacing the navigation-only `onCardClick?: () => void`
- The invisible `<Link href="/paikat/${id}">` overlay (which wrapped both the LEFT info panel and RIGHT photo panel as children) is replaced by a conditional overlay `<div>`: `role="button"` + `tabIndex={0}` + click/keydown handlers firing `onOpen(paikka)` when `onOpen` is provided, or a plain inert `<div>` with no handlers when it is not
- LEFT and RIGHT panels are now direct siblings of the overlay div inside the existing container, not its children — card layout and content are unaffected
- `Link` import from `next/link` removed (no longer used anywhere in the file)

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace onCardClick with onOpen and the Link overlay with a conditional overlay div** - `8d27671` (feat)

**Plan metadata:** committed alongside this SUMMARY (worktree mode — orchestrator handles the final docs commit across the merged wave)

## Files Created/Modified
- `app/components/DiagonaalKortti.tsx` - `onOpen` prop replaces `onCardClick`; `Link` overlay replaced with conditional overlay `<div>`; `next/link` import removed

## Decisions Made
- Followed RESEARCH.md Pattern 2 / UI-SPEC code contract exactly: overlay div is self-closing (no children), LEFT/RIGHT panels remain siblings at their original nesting depth.
- Added `onKeyDown` handling (Enter/Space) on the interactive overlay div for keyboard-accessibility parity, matching the plan's `<action>` instructions.

## Deviations from Plan

None — plan executed exactly as written. One pre-existing, out-of-scope issue was discovered and logged (not fixed) per the SCOPE BOUNDARY rule; see `.planning/phases/62-venuepage-konsolidaatio/deferred-items.md`:

- `app/business/onboarding/page.tsx:205` has a pre-existing `@typescript-eslint/no-unused-vars` error (`paikkaInfo` unused) from Phase 61 commit `096f218`, unrelated to this plan's `files_modified`. It causes `npm run build`'s bundled ESLint check to exit non-zero project-wide, even though `app/components/DiagonaalKortti.tsx` itself compiles cleanly. Verified isolation via `npx tsc --noEmit`, which reports zero TypeScript errors for `DiagonaalKortti.tsx`.

Also noted (not a deviation, an expected cross-plan hand-off): `app/components/Etusivu.tsx:1471` still passes `onCardClick={handleCardClick}` to `DiagonaalKortti`, producing a transient `tsc` error after this plan removes `onCardClick` from the props interface. This is the explicit, planned scope of Plan 03 (wave 2, `depends_on: ["62-01", "62-02"]`), which wires `onOpen` at both Etusivu call sites and removes the stale prop per RESEARCH.md Pattern 3 / Pitfall 5. `Etusivu.tsx` is outside this plan's `files_modified` (`app/components/DiagonaalKortti.tsx` only).

## Issues Encountered

`npm run build` fails project-wide due to the pre-existing unrelated ESLint error described above (not caused by this plan). Verification for this plan instead relied on:
1. Source-level grep assertions (all four required assertions pass — `next/link`, `/paikat/`, `onCardClick` all return 0 matches; `onOpen?:` prop and `onClick={() => onOpen(paikka)}` confirmed present)
2. `npx tsc --noEmit`, isolating that `DiagonaalKortti.tsx` itself has zero TypeScript errors (the only remaining project-wide error is the expected, Plan-03-scoped `Etusivu.tsx` stale prop reference)

Full `npm run build` should be re-verified once Plan 03 (Etusivu wiring) and the unrelated Phase 61 lint-debt item are both resolved.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

`onOpen` is ready for Plan 03 to wire at both `DiagonaalKortti` call sites in `Etusivu.tsx` (search list at line ~1460, TODO overlay at line ~1074), replacing `onCardClick={handleCardClick}` and the now-superfluous `handleCardClick` function/scroll-state effect (D-06, Claude's discretion). Preview contexts (`PreviewModal`, `LivePreviewPane`, `admin/[id]`) already pass no `onOpen`/`onCardClick` and will automatically render the new inert overlay with zero changes required on their side.

## Known Stubs

None.

## Threat Flags

None — this plan only changes a client-side callback wiring pattern on an existing component; no new network endpoints, auth paths, file access, or schema changes were introduced. Matches the plan's own `<threat_model>` (T-62-03, T-62-04 both accepted/low, no new surface).

---
*Phase: 62-venuepage-konsolidaatio*
*Completed: 2026-06-30*
