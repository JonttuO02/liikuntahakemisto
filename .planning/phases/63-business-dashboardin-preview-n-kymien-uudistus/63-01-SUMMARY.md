---
phase: 63-business-dashboardin-preview-n-kymien-uudistus
plan: 01
subsystem: ui
tags: [color-utils, branding, react, vitest, tdd]

# Dependency graph
requires: []
provides:
  - "getPanelShade(brandColor, amount?) exported from lib/branding/brandingResult.ts — computed complementary shade for controls-panel background (D-03)"
  - "darkenHex(hex, amount) and lightenHex(hex, amount) promoted to named exports of lib/branding/brandingResult.ts (previously private to CalloutCard.tsx)"
affects: [63-04-dashboard-controls-variant]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shared color-derivation helpers live in lib/branding/brandingResult.ts as the single source of truth — components import rather than re-declare"

key-files:
  created: []
  modified:
    - lib/branding/brandingResult.ts
    - lib/branding/brandingResult.test.ts
    - app/components/CalloutCard.tsx

key-decisions:
  - "getPanelShade composes existing getContrastColor + darkenHex/lightenHex rather than a new luminance calculation, avoiding duplicated color math (RESEARCH.md Don't Hand-Roll)"
  - "amount = 0.3 locked default per D-03, matching 63-PATTERNS.md spec"

patterns-established:
  - "Pattern 1: color-derivation helpers (darkenHex/lightenHex/getContrastColor/getPanelShade) centralized in lib/branding/brandingResult.ts; components import instead of declaring private copies"

requirements-completed: [BIZPANEL-07]

coverage:
  - id: D1
    description: "getPanelShade(brandColor) returns a hex color that is never equal to brandColor for any valid 6-digit hex input, and passes through malformed input unchanged"
    requirement: "BIZPANEL-07"
    verification:
      - kind: unit
        ref: "lib/branding/brandingResult.test.ts#getPanelShade"
        status: pass
    human_judgment: false
  - id: D2
    description: "darkenHex/lightenHex extracted from CalloutCard.tsx into brandingResult.ts as named exports, math/regex-guard copied verbatim"
    requirement: "BIZPANEL-07"
    verification:
      - kind: unit
        ref: "lib/branding/brandingResult.test.ts#darkenHex / lightenHex"
        status: pass
    human_judgment: false
  - id: D3
    description: "CalloutCard.tsx imports darkenHex/lightenHex from the shared module instead of declaring them privately; accent-ring conic-gradient visual output unchanged"
    verification:
      - kind: unit
        ref: "npx tsc --noEmit (no errors)"
        status: pass
    human_judgment: true
    rationale: "Visual regression (accent ring rendering) requires a human spot-check in the running app per the plan's own verification section — no screenshot/e2e test exists for CalloutCard's conic-gradient ring in this repo."

duration: 2min
completed: 2026-07-01
status: complete
---

# Phase 63 Plan 01: Color-Derivation Foundation Summary

**Extracted darkenHex/lightenHex from CalloutCard into a shared brandingResult.ts module and added getPanelShade(brandColor) — a YIQ-based complementary-shade helper for the dashboard controls-panel background (D-03).**

## Performance

- **Duration:** 2 min
- **Started:** 2026-07-01T14:51:33Z
- **Completed:** 2026-07-01T14:53:04Z
- **Tasks:** 2 completed
- **Files modified:** 3

## Accomplishments
- `getPanelShade(brandColor, amount = 0.3)` exported from `lib/branding/brandingResult.ts`, composing the existing `getContrastColor` with the newly-promoted `darkenHex`/`lightenHex` — guarantees the result never equals the input for any valid 6-digit hex
- `darkenHex`/`lightenHex` promoted from CalloutCard-private functions to named exports of `brandingResult.ts`, math and regex-guard copied verbatim (no rewrite)
- `CalloutCard.tsx` de-duplicated: now imports both helpers from the shared module instead of declaring private copies; accent-ring conic-gradient call sites unchanged
- 6 new unit tests added covering direction (light→darken, dark→lighten), inequality across representative brandColors, malformed-input passthrough, and channel-clamping

## Task Commits

Each task was committed atomically, following the TDD RED → GREEN cycle for Task 1:

1. **Task 1 (RED): add failing tests for getPanelShade/darkenHex/lightenHex** - `5deb8e1` (test)
2. **Task 1 (GREEN): add getPanelShade and export darkenHex/lightenHex** - `e697bbf` (feat)
3. **Task 2: repoint CalloutCard to shared darkenHex/lightenHex** - `d428527` (refactor)

_TDD gate sequence verified: test(...) commit precedes feat(...) commit in git log; no refactor-phase commit was needed since Task 1's implementation required no cleanup._

## Files Created/Modified
- `lib/branding/brandingResult.ts` - Added `darkenHex`, `lightenHex` (promoted from CalloutCard, verbatim math) and new `getPanelShade(brandColor, amount=0.3)` composed from `getContrastColor` + the two shade helpers
- `lib/branding/brandingResult.test.ts` - Added `describe('getPanelShade')` and `describe('darkenHex / lightenHex')` blocks (6 new tests)
- `app/components/CalloutCard.tsx` - Removed private `darkenHex`/`lightenHex` declarations; added them to the existing `brandingResult` import; no behavior/visual change to call sites

## Decisions Made
- `getPanelShade` composes existing primitives (`getContrastColor` + `darkenHex`/`lightenHex`) rather than a new luminance calculation, per RESEARCH.md's "Don't Hand-Roll" guidance
- `amount = 0.3` locked as the default per D-03 / 63-PATTERNS.md spec (note: 63-PATTERNS.md is untracked in this worktree — the plan's own `<action>` block contains the exact spec text, which was followed directly)

## Deviations from Plan

None - plan executed exactly as written. `.planning/phases/.../63-PATTERNS.md` referenced in the plan's `<read_first>` is an untracked file not present in this git worktree (only committed files exist in worktree checkouts); the plan's own task description (line 64 of 63-01-PLAN.md) already contained the exact implementation spec, so no information was missing.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `getPanelShade` is exported and ready for Plan 04 (dashboard controls variant) to consume for the controls-panel background color
- Manual visual spot-check of `CalloutCard`'s accent ring (no regression expected — call sites unchanged) deferred to Plan 02/04 landing per the plan's own verification note, since those plans are what render CalloutCard in the `/business` preview context

---
*Phase: 63-business-dashboardin-preview-n-kymien-uudistus*
*Completed: 2026-07-01*
