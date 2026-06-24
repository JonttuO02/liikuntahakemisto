---
phase: 58-admin-p-sy-kartta-qa
plan: 01
subsystem: ui
tags: [google-maps, vis.gl-react-google-maps, framer-motion, admin, clip-path]

# Dependency graph
requires:
  - phase: 07-advancedmarker-migration
    provides: AdvancedMarker/SportPin/CalloutCard primitives shared with the customer-facing map
provides:
  - Read-only "Sijainti" venue-location map section on /admin/[id], inlined in the page
  - Zoom-driven pin-to-CalloutCard transition matching the main map's interaction model
  - Fix for a real cross-cutting CSS bug (filter/clip-path shadow corruption under an overflow:hidden ancestor) discovered via this phase, applicable to any future map container needing rounded corners
affects: [admin, map, ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Map containers needing rounded corners should use `clip-path: inset(0 round Npx)` instead of `overflow-hidden` + `border-radius` when they contain AdvancedMarker content using CSS `filter` (e.g. CalloutCard's drop-shadow) — overflow:hidden on the ancestor corrupts filter compositing on the absolutely-positioned marker content, producing an oversized/squared shadow with no visible code-level cause."
    - "CalloutCard's outer .glass shadow is applied via filter: drop-shadow(...) (not box-shadow) so it follows the clip-path notch silhouette instead of the box's rectangular bounds; the inset highlight stays as box-shadow since drop-shadow has no inset form."

key-files:
  created: []
  modified:
    - app/admin/[id]/page.tsx
    - app/components/CalloutCard.tsx

key-decisions:
  - "Map inlined directly in app/admin/[id]/page.tsx — not extracted to a separate AdminVenueMap.tsx component (D-11 left this to executor discretion; inlining was simpler for a single-use admin page)."
  - "Lat/lng narrowing: outer guard (`paikka.latitude != null && paikka.longitude != null`) wraps the whole Sijainti section; a non-null assertion (`paikka.latitude!`/`paikka.longitude!`) is used inside the pin's onClick closure specifically, since TypeScript cannot narrow a nullable field through a nested arrow-function closure even when the outer guard covers it at render time."
  - "Pin↔CalloutCard transition uses plain conditional divs, not Framer Motion's AnimatePresence/motion.div — removing the fade animation was the actual fix for a shape-rendering bug (see Issues Encountered), and the admin tool doesn't need the polish of an animated transition."
  - "Centering on click uses a single custom zoom+pan animation (AdminCardZoom, local to this file) that computes an offset target via the map's own projection (map.getProjection()) up front, rather than the shared MapAutoZoom component plus a separate panBy() afterward — avoids a visible two-step (zoom, then pan) motion."
  - "The customer-facing main map's CalloutCard wraps its card in an extra plain layoutId motion.div (Etusivu.tsx); the admin map didn't originally include that nesting level, which (combined with overflow:hidden on the map container) was implicated in the shadow bug. A matching plain wrapper div was added even after the real fix (overflow:hidden → clip-path) for structural parity with the main map."

patterns-established:
  - "Pattern: rounded-corner map containers holding filtered (drop-shadow) marker content must use clip-path-based rounding, not overflow-hidden."

requirements-completed: [ADMIN-07]

# Metrics
duration: ~3h (multi-round interactive checkpoint with iterative human-verify feedback)
completed: 2026-06-25
status: complete
---

# Phase 58: Admin venue-location map Summary

**Read-only interactive Sijainti map on /admin/[id] with a zoom-driven pin↔CalloutCard transition, matching the main map's behavior after fixing a real overflow:hidden + CSS filter compositing bug.**

## Performance

- **Duration:** ~3h across one extended human-verify checkpoint cycle
- **Tasks:** 2 (1 auto + 1 checkpoint:human-verify)
- **Files modified:** 2 (`app/admin/[id]/page.tsx`, `app/components/CalloutCard.tsx`)

## Accomplishments
- Added a "Sijainti" map section to the admin detail page: single AdvancedMarker, fixed initial zoom 15, zoomable/pannable, matching the main map's `disableDefaultUI` control set
- Implemented zoom-driven pin↔CalloutCard switching (pin below zoom 16, card at/above), with click-to-zoom centering on the card's visual midpoint rather than the venue's raw anchor point
- Removed the now-redundant "Listakortti" preview section (the map's CalloutCard already surfaces the same summary)
- Found and fixed a genuine, previously-latent CSS bug: `overflow-hidden` on a map container corrupts `filter`/shadow compositing for `position:absolute` marker content, applicable beyond this phase
- Logged a separately-discovered, out-of-scope finding (business accounts can authenticate on the customer-facing site) as a todo for a future milestone, per user direction

## Task Commits

1. **Task 1: Add Sijainti map section** - `3bd2188` (feat)
2. **Task 1 follow-up: zoom-driven interaction, main-map controls, drop Listakortti** - `b7e9b42` (fix)
3. **Task 1 follow-up: gate card mount on camera settle, recenter on midpoint** - `a537dba` (fix)
4. **Task 1 follow-up: combined zoom+center animation, shadow-clipping fix** - `ec6dbe8` (fix)
5. **Task 2: checkpoint:human-verify** - resolved interactively across the above commits; final state approved by operator

_Note: this plan's single checkpoint (`gate="blocking"`) was held open across several iterative fix rounds rather than approved on the first pass — see Issues Encountered._

## Files Created/Modified
- `app/admin/[id]/page.tsx` - New inlined Sijainti map section: zoom-driven pin/card marker, `AdminCardZoom` local animation component, `disableDefaultUI`, `clip-path`-based rounded container; Listakortti section removed
- `app/components/CalloutCard.tsx` - Outer `.glass` shadow switched from `box-shadow` to `filter: drop-shadow(...)` so it follows the clip-path notch silhouette (shared component — also affects the main map, where the change is a latent-bug fix, not a behavior change visible to users)

## Decisions Made
See `key-decisions` in frontmatter above.

## Deviations from Plan

### Auto-fixed Issues

**1. [Scope refinement during checkpoint] Pin↔CalloutCard interaction changed from click-toggle to zoom-driven**
- **Found during:** Task 2 checkpoint, first human-verify pass
- **Issue:** Original Task 1 implementation used a simple boolean click-toggle (not zoom-driven), per the plan's literal text. The operator requested the main map's actual zoom-threshold behavior (pin→card at zoom 16, click-to-zoom-and-center) instead.
- **Fix:** Replaced the toggle with zoom-level tracking mirroring `Etusivu.tsx`, plus a custom zoom+center animation
- **Files modified:** `app/admin/[id]/page.tsx`
- **Verification:** Manual human-verify, multiple rounds (see below)
- **Committed in:** `b7e9b42`, `a537dba`, `ec6dbe8`

**2. [Bug found during checkpoint] Map showed full default Google Maps UI (satellite/fullscreen/street-view buttons) not present on the main map**
- **Fix:** Added `disableDefaultUI` to match the main map exactly
- **Committed in:** `b7e9b42`

**3. [Scope refinement] Removed "Listakortti" preview section**
- **Issue:** Operator noted it was now redundant with the map's own CalloutCard
- **Fix:** Removed the section and its now-unused `PaikkaKortti` import
- **Committed in:** `b7e9b42`

**4. [Bug found during checkpoint] CalloutCard rendered as a plain square (no notch/tail) on the admin map only**
- **Root cause:** Wrapping the pin/card switch in Framer Motion's `AnimatePresence`/`motion.div` (an attempt to port the main map's fade transition) broke `CalloutCard`'s internal `clip-path` shape computation in this context. Diagnosed via temporary `console.log` instrumentation and live DOM/computed-style inspection (`getComputedStyle`) comparing the admin and main-map instances directly — the inline `clip-path` value was provably correct and applied, ruling out a logic bug, before identifying the actual cause.
- **Fix:** Removed `AnimatePresence`/`motion.div` from the admin marker entirely (plain conditional divs, no fade animation)
- **Committed in:** `ec6dbe8`

**5. [Bug found during checkpoint] Visible gap where neither pin nor card showed during the zoom-in animation**
- **Issue:** An intermediate fix had gated the card's visibility on `!autoZoomTarget` (waiting for the full animation to finish) to address bug #4, but the real cause was #4's Framer Motion wrapper — the gate just introduced a new ~300ms gap.
- **Fix:** Removed the `!autoZoomTarget` gate, restoring the original `zoomLevel >= 16` check
- **Committed in:** `ec6dbe8`

**6. [Bug found during checkpoint] Click-to-zoom centered the venue's raw coordinate (the card's bottom anchor) instead of the card's visual midpoint**
- **Fix:** Built `AdminCardZoom`, a local single-animation component that computes an offset target via `map.getProjection()` before animating, landing directly on the corrected center in one motion (avoiding an initial two-step zoom-then-pan approach that was tried and rejected as visually disjointed)
- **Committed in:** `ec6dbe8`

**7. [Bug found during checkpoint] Soft drop-shadow visible under the CalloutCard, not present on the main map**
- **Root cause:** `overflow-hidden` on the admin map's outer container (used for the `rounded-2xl` corner clipping) corrupts `filter`/`box-shadow` compositing for the `position:absolute` marker content — confirmed by temporarily removing `overflow-hidden` (shadow disappeared) and comparing full DOM ancestor chains between the admin and main-map marker instances side by side.
- **Fix:** Replaced `overflow-hidden` with `clip-path: inset(0 round 16px)` on the container (same visual rounding, no compositing bug); also switched `CalloutCard`'s outer shadow from `box-shadow` to `filter: drop-shadow(...)` (shape-correct, though this alone did not fix the root cause) and added a wrapper `<div>` around `CalloutCard` matching the main map's DOM nesting depth
- **Files modified:** `app/admin/[id]/page.tsx`, `app/components/CalloutCard.tsx`
- **Committed in:** `ec6dbe8`

---

**Total deviations:** 7 found/fixed during the single checkpoint cycle (1 scope refinement requested by operator, 1 redundant-section removal, 5 genuine bugs — 2 shape/timing, 1 centering math, 1 cross-cutting CSS compositing bug, 1 contributing structural difference).
**Impact on plan:** All changes stayed within the plan's single modified file (plus the shared `CalloutCard.tsx` for the shadow fix) and its stated success criteria. No scope creep beyond what the operator explicitly requested during verification. The `overflow-hidden`/`filter` compositing bug (#7) is a reusable finding for any future rounded-corner map container.

## Issues Encountered
The blocking human-verify checkpoint required multiple iterative fix rounds rather than a single pass — the operator caught: a zoom-behavior mismatch with the main map, leftover default map UI controls, a redundant preview section, a shape-rendering regression, a timing gap, incorrect centering math, and a shadow-compositing bug. The shape and shadow bugs in particular required live browser DOM/computed-style inspection (relayed through the operator, since no direct browser tool was available) to diagnose correctly rather than guessing from static code review — two earlier guesses (a GPU-layer-promotion `transform: translateZ(0)` hack, and a `filter: drop-shadow()` swap) did not address the actual root causes and were reverted/superseded once the real causes (the `AnimatePresence` wrapper, and `overflow-hidden`, respectively) were found via direct comparison against the working main-map instance.

A separate, out-of-scope finding (business accounts can log into the customer-facing site with no guard) surfaced during verification and was logged as a todo (`.planning/todos/pending/2026-06-24-block-business-accounts-from-logging-into-customer-site.md`, commit `1a6ec0f`) rather than fixed here, per explicit operator direction.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- ADMIN-07 fully delivered and verified live by the operator.
- The `clip-path`-instead-of-`overflow-hidden` rounding pattern and the `filter: drop-shadow()`-for-clipped-shadows pattern are worth keeping in mind for any future map UI work in this codebase.

---
*Phase: 58-admin-p-sy-kartta-qa*
*Completed: 2026-06-25*
