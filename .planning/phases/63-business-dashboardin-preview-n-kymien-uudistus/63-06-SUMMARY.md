---
phase: 63-business-dashboardin-preview-n-kymien-uudistus
plan: 06
subsystem: ui
tags: [react, nextjs, tailwind, supabase, business-dashboard, branding]

requires:
  - phase: 63-business-dashboardin-preview-n-kymien-uudistus
    provides: DiagonaalKortti dashboardActions variant, RejectionReasonPopup (Plan 04/05)
provides:
  - Neutral-gray controls-panel fallback on DiagonaalKortti's dashboard variant when brandColor is unset
  - Visible copy-invite-link confirmation (Check icon) that only fires after navigator.clipboard.writeText genuinely resolves
  - Fixed-width (396px), non-stretching /business venue card grid matching mobile card size
  - Chosen brand colors (business_branding.selected_background_color/selected_accent_color) actually wired through to the dashboard card and PreviewModal
  - Working color persistence end-to-end: onboarding wizard save path + underlying PATCH endpoint, both previously broken
affects: [business-dashboard, onboarding-wizard, branding]

tech-stack:
  added: []
  patterns:
    - "Fixed-width flex-wrap tiling (w-full sm:w-[396px] wrapper + flex flex-wrap gap-3) instead of CSS Grid equal-fraction columns, when cards must never resize by breakpoint"

key-files:
  created: []
  modified:
    - app/components/DiagonaalKortti.tsx
    - app/business/page.tsx
    - app/components/PreviewModal.tsx
    - app/business/onboarding/StepBrandingPick.tsx
    - app/business/WizardInner.tsx
    - app/api/business/branding/route.ts

key-decisions:
  - "Card sizing: replaced sm:grid-cols-2 lg:grid-cols-3 (stretchy CSS Grid columns) with flex-wrap + a fixed per-card width wrapper, since a grid's equal-fraction tracks inherently resize each card by breakpoint — the opposite of the UAT requirement."
  - "Fixed card width (396px) was measured empirically from the operator's actual mobile rendering (DiagonaalKortti's price-area max-width, back-solved from floor(cardWidth*0.57)-16=209px) rather than guessed, after an initial 360px estimate proved visibly too narrow."
  - "business_branding.selected_background_color/selected_accent_color are fetched by /business's dashboard query and PreviewModal's call site, not derived on the liikuntapaikat row — colors live per-venue in business_branding (Phase 47 paikka_id scoping), and no persistent color column exists on liikuntapaikat."
  - "/api/business/branding PATCH changed from .upsert() to a scoped .update() — the endpoint only ever mutates a row whose existence was already confirmed by the ownership check a few lines above; upsert's INSERT-path NOT NULL validation on the unrelated website_url column made every call to this endpoint fail with a 500, for any field (colors, logo, gallery), since project inception."

patterns-established:
  - "When a UAT checkpoint reports a UI change 'not showing', verify the underlying data was ever persisted before assuming a display/prop-wiring bug — trace the full write path (client dispatch -> autosave/PATCH -> DB row) with a temporary console.log at each hop rather than guessing forward from the render layer."

requirements-completed: [BIZPANEL-06, BIZPANEL-07]

coverage:
  - id: D1
    description: "Dashboard card's controls panel shows a neutral-gray split (not .glass) when brandColor is unset"
    requirement: BIZPANEL-06
    verification:
      - kind: manual_procedural
        ref: "operator UAT re-verification round 1"
        status: pass
    human_judgment: true
    rationale: "Visual/contrast verification requires human judgment of legibility and split-panel distinguishability."
  - id: D2
    description: "Copy-invite-link button shows a genuine, non-false-positive Check-icon confirmation"
    requirement: BIZPANEL-07
    verification:
      - kind: manual_procedural
        ref: "operator UAT re-verification round 1"
        status: pass
    human_judgment: true
    rationale: "Visual icon-swap timing/behavior requires human observation."
  - id: D3
    description: "/business venue cards are fixed-width on desktop, matching mobile card size, laid out in a responsive multi-column tile"
    requirement: BIZPANEL-06
    verification:
      - kind: manual_procedural
        ref: "operator UAT re-verification round 3 (after 396px width correction)"
        status: pass
    human_judgment: true
    rationale: "Exact pixel-width matching against the operator's actual device required their own DevTools measurement; not derivable from automated tests."
  - id: D4
    description: "Chosen brand colors from onboarding actually display on the dashboard card and preview modal after submission"
    verification:
      - kind: manual_procedural
        ref: "operator UAT re-verification round 4, after fixing StepBrandingPick persistence gap and the branding PATCH upsert/update bug"
        status: pass
    human_judgment: true
    rationale: "End-to-end onboarding-to-dashboard color propagation requires a human to run the actual wizard flow and inspect the rendered result."

duration: ~3h (including 3 rounds of UAT-driven follow-up fixes)
completed: 2026-07-02
status: complete
---

# Phase 63 Plan 06: Dashboard Card Visual/Grid Fixes + Brand Color Persistence Summary

**Fixed-width (396px) non-stretching dashboard card grid, neutral-gray controls-panel fallback, genuine copy-link confirmation, and a full end-to-end fix for brand colors never actually persisting from onboarding to the dashboard/preview.**

## Performance

- **Duration:** ~3h across the original plan tasks plus 3 rounds of operator-driven follow-up fixes
- **Tasks:** 2 planned auto tasks + 1 checkpoint (originally) + 5 follow-up fix commits discovered during checkpoint re-verification
- **Files modified:** 6

## Accomplishments
- DiagonaalKortti's dashboard controls panel now always renders a visibly two-sided split — neutral gray (`bg-[rgba(0,0,0,0.06)]`) when `brandColor` is unset, `panelShade` when set
- Copy-invite-link button shows a `Check` icon for ~2s after a genuinely successful `navigator.clipboard.writeText`, never on a failed write
- `/business`'s venue-card grid switched from stretchy CSS Grid (`sm:grid-cols-2 lg:grid-cols-3`) to `flex flex-wrap` with a fixed `w-full sm:w-[396px]` per-card wrapper — cards no longer resize by breakpoint, matching the operator's actual mobile card width exactly
- Brand colors chosen during onboarding (`business_branding.selected_background_color`/`selected_accent_color`) now actually reach the dashboard card and `PreviewModal` — neither previously fetched or forwarded them at all
- Fixed the deeper reason colors were never selected in the first place: `StepBrandingPick` auto-initializes colors from the AI's suggested default on mount and shows them in the live preview, but only an explicit swatch re-click ever triggered a save — `WizardInner`'s `handleBrandingPickNext` now persists whatever color is showing when the wizard advances
- Fixed the underlying `/api/business/branding` PATCH endpoint, which was returning `500` on **every** call (not just the color path) because it used `.upsert()` against a table with a NOT NULL `website_url` column not present in the payload — Postgres validates NOT NULL constraints for the INSERT half of `ON CONFLICT DO UPDATE` unconditionally, so this endpoint had never successfully persisted any field (colors, logo, gallery selection) since it was introduced

## Task Commits

Original plan tasks:
1. **Task 1: Neutral-gray controls-panel fallback + copy-confirmation icon + grid-safe min-width** - `886026a` (feat)
2. **Task 2: Responsive desktop grid layout + awaited clipboard write** - `3272ef5` (feat)

**Merge to master:** `2d94d32` (early merge, requested by operator to enable live dev-server testing before checkpoint approval)

Follow-up fixes from operator UAT re-verification (see Deviations below):
3. **Fixed-width flex-wrap grid (initial estimate)** - `2a7146f` (fix)
4. **Fixed-width correction to measured 396px** - `f8ad592` (fix)
5. **Wire brand colors into dashboard card + preview** - `ad541d7` (fix)
6. **Persist AI-default colors on wizard advance** - `905ad92` (fix)
7. **Fix branding PATCH upsert->update bug** - `8ef89d8` (fix)

## Files Created/Modified
- `app/components/DiagonaalKortti.tsx` - neutral-gray fallback, Check-icon copy confirmation, `min-w-0` card root
- `app/business/page.tsx` - fixed-width flex-wrap venue grid, fetches `business_branding` colors and forwards to `DashboardVenueCard`/`PreviewModal`
- `app/components/PreviewModal.tsx` - accepts and forwards `brandColor`/`accentColor` to `CalloutCard` and `DiagonaalKortti`
- `app/business/onboarding/StepBrandingPick.tsx` - `BrandingSelections` now carries `bgColorSource`/`accentColorSource` so the wizard's advance handler can persist the color regardless of whether it was explicitly re-clicked
- `app/business/WizardInner.tsx` - `handleBrandingPickNext` now PATCHes `business_branding` with the current bg/accent color when advancing
- `app/api/business/branding/route.ts` - `.upsert()` -> scoped `.update()`, fixing a standing 500 on every call to this endpoint

## Decisions Made
- Card width fix went through two iterations: an initial 360px estimate (deviations section), then a precise 396px value derived from the operator's actual DevTools measurement of a mobile card. Chose to match the real device measurement exactly rather than a round Tailwind size, since the UAT requirement was explicitly "same width as mobile."
- Brand color persistence bug spanned three independent root causes across the write path (dashboard/preview never reading `business_branding`; the wizard never saving the AI-default color; the save endpoint itself always failing). Fixed all three rather than stopping at the first found, since each was independently necessary for the feature to work end-to-end.
- Used temporary `console.log` diagnostics (removed before each commit) at each hop of the color write path to get ground truth instead of guessing forward — this is what surfaced the `/api/business/branding` 500 that a code-review-only approach would likely have missed, since the endpoint's own error response was swallowed by the caller (`await fetch(...)` with no status check).

## Deviations from Plan

### Auto-fixed Issues (discovered during checkpoint re-verification, not part of the original plan scope)

**1. [Post-checkpoint UAT] Dashboard grid stretched cards by breakpoint instead of keeping them fixed-width**
- **Found during:** Operator re-verification of the Task 3 checkpoint
- **Issue:** `sm:grid-cols-2 lg:grid-cols-3` (mirroring `app/loading.tsx`'s skeleton pattern, per the original plan) uses CSS Grid's default equal-fraction column tracks, which stretch/shrink each card to fill its column — changing card width by breakpoint, the opposite of "keep the same width and size as on mobile."
- **Fix:** Switched the venue-list wrapper to `flex flex-wrap gap-3` with a fixed `w-full sm:w-[396px]` wrapper div per card. 396px was derived from the operator's own DevTools measurement (back-solved from `DiagonaalKortti`'s price-area `max-width: 209px` computed as `floor(cardWidth*0.57)-16`), after an initial 360px estimate proved visibly too narrow.
- **Files modified:** `app/business/page.tsx`
- **Verification:** Operator confirmed cards are consistently sized among themselves and match mobile width, across two follow-up rounds.
- **Committed in:** `2a7146f`, `f8ad592`

**2. [Post-checkpoint UAT, cross-cutting] Brand colors chosen in onboarding never appeared on the dashboard card or preview**
- **Found during:** Operator re-verification of the Task 3 checkpoint
- **Issue:** Three independent, compounding bugs, all discovered via a debug-logging trace of the full write path:
  1. `/business/page.tsx`'s dashboard query and `PreviewModal.tsx` never fetched or accepted `brandColor`/`accentColor` at all — `DiagonaalKortti`/`CalloutCard` both already supported these props, but no call site outside the onboarding wizard's own live preview ever supplied them.
  2. `StepBrandingPick.tsx` auto-initializes `bgColor`/`accentColor` from the AI's suggested default on mount and shows them in the live preview and in `onNext()`'s payload — but `WizardInner.tsx`'s `handleBrandingPickNext` silently ignored those fields, only persisting `logoUrl`/`gallery`/`laji`. A user who accepted the AI default without re-clicking a swatch (the only path that autosaves via `assignColorToSlot`) never had anything written to the database.
  3. Even when a PATCH to `/api/business/branding` was correctly triggered, the endpoint's `.upsert()` call unconditionally failed with a 500 ("null value in column `website_url` ... violates not-null constraint") — Postgres validates NOT NULL constraints for the INSERT half of `ON CONFLICT DO UPDATE` before conflict detection runs, and `website_url` was never part of this endpoint's payload. This affected every field the endpoint touches (colors, logo, gallery selection), not just colors, and had been broken since the endpoint was introduced.
- **Fix:** Wired `business_branding` colors through to `DashboardVenueCard`/`PreviewModal` (fetch + prop threading); extended `BrandingSelections` with `bgColorSource`/`accentColorSource` and had `handleBrandingPickNext` PATCH the color on wizard advance; changed the branding PATCH route from `.upsert()` to a scoped `.update()`.
- **Files modified:** `app/business/page.tsx`, `app/components/PreviewModal.tsx`, `app/business/onboarding/StepBrandingPick.tsx`, `app/business/WizardInner.tsx`, `app/api/business/branding/route.ts`
- **Verification:** Operator confirmed colors now display correctly on both the dashboard card and preview modal after re-running the onboarding branding step.
- **Committed in:** `ad541d7`, `905ad92`, `8ef89d8`

---

**Total deviations:** 2 discovered during checkpoint re-verification, 5 commits, all necessary corrections to genuinely broken behavior (not scope creep — both were required for the plan's own UAT gaps to be actually closed rather than superficially addressed).
**Impact on plan:** Significant additional root-cause investigation beyond the original plan's estimated scope, but all fixes are directly load-bearing for BIZPANEL-06/BIZPANEL-07's real-world usability, which is exactly what this gap-closure plan exists to guarantee.

## Issues Encountered
- Initial merge to master happened *before* checkpoint approval, at the operator's explicit request, because their dev server runs against the main checkout and the isolated worktree branch was otherwise untestable live. All subsequent fixes were applied directly to `master` rather than routed back through the (now-deleted-in-spirit) worktree — documented here since it deviates from the standard "verify in isolation, then merge" wave contract.
- The brand-color bug required three rounds of console.log-based tracing (dashboard fetch result → wizard PATCH request/response → server upsert error) to reach the true root cause; each earlier fix was necessary but insufficient on its own.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `/business` dashboard card visuals, grid layout, and brand-color display are now confirmed working end-to-end by the operator.
- The `/api/business/branding` PATCH fix (upsert -> update) is a general-purpose correctness fix that also unblocks logo/gallery selection persistence via the same endpoint, though that wasn't directly UAT-tested in this round.

---
*Phase: 63-business-dashboardin-preview-n-kymien-uudistus*
*Completed: 2026-07-02*
