---
phase: 63-business-dashboardin-preview-n-kymien-uudistus
plan: 04
subsystem: ui
tags: [react, framer-motion, next-intl, lucide-react, tailwind, glassmorphism]

# Dependency graph
requires:
  - phase: 63-01
    provides: getPanelShade() helper (lib/branding/brandingResult.ts) built from existing darkenHex/lightenHex + getContrastColor
provides:
  - "DiagonaalKortti dashboardActions prop bundle — swaps the RIGHT panel for a permanent icon-button controls panel + status pill (BIZPANEL-06/07)"
  - "RejectionReasonPopup component — AuthModal-pattern dialog showing rejection_reason as escaped text with a navigation-only CTA (D-06)"
  - "Business.fixDetailsCta / Business.showRejectionInfoLabel i18n keys (fi/en)"
affects: [63-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Prop-presence-toggles-behavior convention extended: dashboardActions?: {...} bundle on DiagonaalKorttiProps, following the existing onOpen/onToggleTodo pattern exactly"
    - "Computed panel-shade + chip-contrast color math (getPanelShade + getContrastColor) mirrored from the existing accentColor inline-style-vs-glass-btn conditional"

key-files:
  created:
    - app/components/RejectionReasonPopup.tsx
  modified:
    - app/components/DiagonaalKortti.tsx
    - messages/fi.json
    - messages/en.json

key-decisions:
  - "Icon-button aria-labels and status-pill labels pull from the Business i18n namespace (useTranslations('Business')) rather than DiagonaalKortti's existing PaikkaKortti namespace, since esikatseluCta/muokkaaCta/jatkaCta/copyInviteLinkCta/inviteLinkCopied/showRejectionInfoLabel and the 4 status keys all live under Business — added a second `tBusiness` translations hook alongside the existing `t`/`tLajit`"

patterns-established:
  - "Dashboard-only component variants extend an existing consumer component via a single optional prop bundle rather than a mode enum or component fork — locked pattern for Plan 05's wiring"

requirements-completed: [BIZPANEL-06, BIZPANEL-07]

coverage:
  - id: D1
    description: "DiagonaalKortti's right panel renders a permanent no-photo controls panel (never hover/tap-revealed) whenever dashboardActions is present; unchanged real-photo panel when absent"
    requirement: BIZPANEL-06
    verification:
      - kind: unit
        ref: "npx tsc --noEmit (type-checks the new conditional render branches); grep -c dashboardActions/getPanelShade/Eye|Pencil|Link2|AlertCircle/hasCoords thresholds all pass"
        status: pass
    human_judgment: true
    rationale: "Visual correctness (icon layout, panel color contrast, status-pill placement) requires human eyes once Plan 05 wires this into a live /business page — no component test harness exists for DiagonaalKortti per RESEARCH.md"
  - id: D2
    description: "Controls panel background is getPanelShade(brandColor) when set, plain .glass fallback when not (D-04)"
    requirement: BIZPANEL-06
    verification:
      - kind: unit
        ref: "npx tsc --noEmit; grep -c getPanelShade app/components/DiagonaalKortti.tsx >= 1"
        status: pass
    human_judgment: true
    rationale: "Color contrast/legibility is a visual judgment call, deferred to Plan 05 manual verification"
  - id: D3
    description: "Dashboard variant's left info panel has zero click handlers and no click-catcher div (D-10)"
    requirement: BIZPANEL-07
    verification:
      - kind: unit
        ref: "code inspection — {dashboardActions ? null : onOpen ? (...) : (...)} ternary in app/components/DiagonaalKortti.tsx"
        status: pass
    human_judgment: false
  - id: D4
    description: "Rejected-status card exposes a rejection-info icon button opening RejectionReasonPopup, whose CTA navigates (never fetches) to the edit flow"
    requirement: BIZPANEL-07
    verification:
      - kind: unit
        ref: "grep -c dangerouslySetInnerHTML/fetch(/api\\/business\\/reapply/role=\"dialog\" in app/components/RejectionReasonPopup.tsx — all pass thresholds"
        status: pass
    human_judgment: true
    rationale: "Popup open/close/backdrop/Escape interaction and CTA navigation require human click-through once Plan 05 wires it into the live dashboard"

duration: 5min
completed: 2026-07-01
status: complete
---

# Phase 63 Plan 04: Dashboard DiagonaalKortti Variant + RejectionReasonPopup Summary

**Built the `dashboardActions` prop bundle on `DiagonaalKortti` (permanent icon-button controls panel + status pill, replacing the right photo panel) and a new `RejectionReasonPopup` component, both in isolation ahead of Plan 05's wiring into `/business`.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-07-01T15:00:27Z
- **Completed:** 2026-07-01T15:04:52Z
- **Tasks:** 3
- **Files modified:** 4 (1 created, 3 modified)

## Accomplishments
- `DiagonaalKortti` accepts an optional `dashboardActions` prop bundle (`status`, `onPreview`, `onEditOrContinue`, `onCopyInviteLink?`, `copied?`, `onShowRejectionInfo?`) that swaps the RIGHT (photo) panel for a permanent icon-button controls panel (`Eye`/`Pencil`/`Link2`/`AlertCircle`) with a bottom-right status pill — every existing call site (no `dashboardActions` passed) is unchanged
- Controls-panel background uses the new `getPanelShade(brandColor)` helper (from Plan 01) with a `.glass` fallback, and icon-button chip contrast follows the exact `getContrastColor` formula from the UI-SPEC
- New `RejectionReasonPopup` component mirrors `AuthModal`'s lightweight dialog pattern exactly (backdrop/panel/close-button, same durations/easing), renders the admin-authored `rejection_reason` as plain escaped JSX text, and its CTA is a plain `<a href>` navigation — never a fetch call
- Added the two new i18n keys (`Business.fixDetailsCta`, `Business.showRejectionInfoLabel`) required by the Copywriting Contract, in both `fi.json` and `en.json`

## Task Commits

Each task was committed atomically:

1. **Task 1: Add the two new i18n keys required by the Copywriting Contract** - `413e903` (feat)
2. **Task 2: Add the dashboard-only controls-panel variant to DiagonaalKortti** - `c4d8de8` (feat)
3. **Task 3: Build RejectionReasonPopup component** - `2cd54c9` (feat)

_No TDD tasks in this plan._

## Files Created/Modified
- `messages/fi.json` - Added `Business.fixDetailsCta` ("Korjaa tiedot") and `Business.showRejectionInfoLabel` ("Näytä hylkäyssyy")
- `messages/en.json` - Added `Business.fixDetailsCta` ("Fix details") and `Business.showRejectionInfoLabel` ("Show rejection reason")
- `app/components/DiagonaalKortti.tsx` - New `dashboardActions` prop, `panelShade`/`panelShadeContrastText`/`panelChipBg` computed color derivations, conditional RIGHT-panel render (controls panel vs. photo), status pill, inert-LEFT-panel handling (no click-catcher when `dashboardActions` present), conditional `cursor-pointer` on the outer card, `hasCoords && !dashboardActions` gate on the "show on map" button
- `app/components/RejectionReasonPopup.tsx` (new) - Dialog component with `{ open, onClose, rejectionReason, editHref }` props

## Decisions Made
- Icon-button `aria-label`s and the status pill's labels pull from a second `useTranslations('Business')` hook (`tBusiness`) inside `DiagonaalKortti`, since all the referenced strings (`esikatseluCta`, `muokkaaCta`, `jatkaCta`, `copyInviteLinkCta`, `inviteLinkCopied`, `showRejectionInfoLabel`, and the 4 status keys) live in the `Business` i18n namespace — not the component's existing `PaikkaKortti` namespace. This was necessary to satisfy the plan's exact-copy-reuse requirement without introducing new strings.

## Deviations from Plan

**1. [Rule 1 - Bug] Reworded a JSDoc comment in RejectionReasonPopup.tsx to avoid a literal-string false-positive**
- **Found during:** Task 3 (RejectionReasonPopup component)
- **Issue:** The plan's own acceptance criteria run a blind `grep -c "dangerouslySetInnerHTML"` check expecting `0` matches. My first draft's JSDoc comment explained the security mitigation using the literal string `dangerouslySetInnerHTML`, which the grep counted as a match (count `1`), failing the acceptance criteria even though no actual usage existed in code.
- **Fix:** Reworded the comment to describe the mitigation without using the literal API name (now reads "no raw-HTML injection of any kind").
- **Files modified:** app/components/RejectionReasonPopup.tsx
- **Verification:** `grep -c "dangerouslySetInnerHTML" app/components/RejectionReasonPopup.tsx` now returns `0`; `npx tsc --noEmit` clean.
- **Committed in:** `2cd54c9` (Task 3 commit — comment was reworded before the single commit for this task, not as a separate fix commit)

---

**Total deviations:** 1 auto-fixed (1 bug/acceptance-criteria false-positive)
**Impact on plan:** Cosmetic comment change only; no behavioral or security impact. No scope creep.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 05 can now wire `dashboardActions` into `/business`'s venue list (replacing `VenueRow`'s current text-link actions) and mount `RejectionReasonPopup` from the new `AlertCircle` icon button
- `getPanelShade` (Plan 01), the `dashboardActions` prop contract, and `RejectionReasonPopup`'s props are all locked and type-checked; no blockers for Plan 05

---
*Phase: 63-business-dashboardin-preview-n-kymien-uudistus*
*Completed: 2026-07-01*

## Self-Check: PASSED

- FOUND: app/components/DiagonaalKortti.tsx
- FOUND: app/components/RejectionReasonPopup.tsx
- FOUND: messages/fi.json
- FOUND: messages/en.json
- FOUND: .planning/phases/63-business-dashboardin-preview-n-kymien-uudistus/63-04-SUMMARY.md
- FOUND commit: 413e903 (Task 1)
- FOUND commit: c4d8de8 (Task 2)
- FOUND commit: 2cd54c9 (Task 3)
- FOUND commit: 5ba23c4 (docs: SUMMARY.md)
