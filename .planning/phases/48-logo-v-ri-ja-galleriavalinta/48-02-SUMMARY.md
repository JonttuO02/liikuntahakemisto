---
phase: 48-logo-v-ri-ja-galleriavalinta
plan: 02
subsystem: frontend
tags: [nextjs, react, suspense, onboarding, branding, autosave]

# Dependency graph
requires:
  - phase: 48-logo-v-ri-ja-galleriavalinta
    plan: 01
    provides: Reshaped BrandingResult type, validated PATCH /api/business/branding autosave route, selected_logo_url column
provides:
  - paikka_id resolved Suspense-safely in the onboarding pre-vaihe and threaded through every analyze-website GET/POST call
  - Interactive logo picker (radio-style cards, autosaved + server-validated selection)
  - Interactive color picker (swatch row + Tausta/Aksentti slots + custom hex override, autosaved)
affects: [48-03-quick-accept]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Suspense-boundary-descendant useSearchParams() pattern: a child component (PrePhase) calls the hook while the parent (OnboardingWizardPage) only instantiates the <Suspense> wrapper — mirrors WizardInner's OnboardingMode exactly, applied here to fix a pre-existing build-breaking gap"
    - "armedSlot UI pattern for two-slot color assignment: clicking a slot mini-card arms it, then a swatch/custom-hex click assigns into whichever slot is armed (defaults to 'tausta' when none armed) — avoids a dropdown-per-slot UI"

key-files:
  created: []
  modified:
    - app/business/onboarding/page.tsx
    - app/business/onboarding/AnalysoiSivusto.tsx

key-decisions:
  - "Resolved paikka_id via an extracted PrePhase child component (not window.location.search parsing) — keeps the codebase's one canonical Suspense+useSearchParams pattern (WizardInner's OnboardingMode) rather than introducing a second, divergent approach for the same problem."
  - "bgSource/accentSource state (AI vs custom origin) is surfaced as a small '(oma)' caption next to the slot's hex value rather than left as write-only state — avoids an eslint no-unused-vars error and gives the user visible confirmation when they've overridden an AI-extracted color with a custom hex."
  - "Single-card click on a color swatch defaults to assigning the 'tausta' slot when no slot is explicitly armed — keeps a single-click interaction working for the common case (first swatch click) without forcing the user to always tap a slot first."

patterns-established:
  - "patchBranding(partial, section) helper: fire-and-forget per-field autosave PATCH with a per-section saving indicator (savingSection) and a single shared saveError state surfaced inline near the pickers — model for any future per-field autosave UI in this onboarding flow."

requirements-completed: [ONBOARD-14, ONBOARD-15]

# Metrics
duration: 28min
completed: 2026-06-16
---

# Phase 48 Plan 02: Logo & Color Pickers + paikka_id Wiring Summary

**Reworked the onboarding pre-vaihe's read-only branding preview into interactive logo/color pickers with immediate PATCH autosave, and fixed the pre-existing paikka_id gap (Suspense-safe resolution) that was silently breaking every analyze-website call.**

## Performance

- **Duration:** 28 min
- **Started:** 2026-06-16T19:31:00Z
- **Completed:** 2026-06-16T19:59:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- `app/business/onboarding/page.tsx`: extracted a `PrePhase` child component that calls `useSearchParams()` as a descendant of a `<Suspense>` boundary (never in the parent `OnboardingWizardPage`), resolving `paikka_id` from the URL param first, then falling back to a `business_paikka_links` lookup — mirrors `WizardInner`'s `OnboardingMode` pattern exactly
- `AnalysoiSivustoProps` gained `paikkaId: number`; all three analyze-website call sites (checkStatus GET, poll GET, handleSubmit POST) now send `paikka_id`, closing the gap left by Phase 47's now-required parameter
- Logo picker: `logo_candidates` render as selectable `<button>` cards (first one pre-selected), each click autosaves via `patchBranding({ selected_logo_url })` — persisted and server-validated against `logo_candidates` membership (Plan 01's PATCH route), not purely client state
- Color picker: up to 6 swatches from `colors`, two labeled slots (`Tausta`/`Aksentti`) pre-filled from each color's AI `role` field, a custom hex input (`#rrggbb` validated) as fallback/override — every assignment autosaves via `patchBranding`
- Autosave failures surface inline (`Valinnan tallennus epäonnistui. Yritä uudelleen.`, `role="alert"`) without losing the local selection; footer CTA buttons are never disabled by color/logo state

## Task Commits

Each task was committed atomically:

1. **Task 1: Resolve and thread paikka_id (Suspense-safe) through page.tsx and AnalysoiSivusto's analyze-website calls** - `70bea06` (fix)
2. **Task 2: Replace the read-only logo/color blocks with interactive pickers + autosave PATCH** - `3e1b791` (feat)

**Plan metadata:** (this commit, made by orchestrator after wave merge)

## Files Created/Modified
- `app/business/onboarding/page.tsx` - new `PrePhase` child component resolves `paikka_id` (URL param → `business_paikka_links` lookup) inside a `<Suspense>` boundary; renders a spinner until resolved, then `<AnalysoiSivusto paikkaId={paikkaId} ...>`
- `app/business/onboarding/AnalysoiSivusto.tsx` - `paikkaId` prop threaded into all three analyze-website fetches; logo/color selection state (`selectedLogoUrl`, `bgColor`/`bgSource`, `accentColor`/`accentSource`, `armedSlot`, `saveError`, `savingSection`, `customHexInput`/`customHexError`); `patchBranding` autosave helper; interactive logo-card and color-swatch/slot/custom-hex picker UI replacing the old read-only blocks

## Decisions Made
- Used the extracted-child-component Suspense pattern (not `window.location.search` parsing) to keep one canonical pattern for `useSearchParams()` + `Suspense` across the codebase, matching `WizardInner`'s proven `OnboardingMode` approach
- Surfaced `bgSource`/`accentSource` in the UI as a small "(oma)" caption — necessary to avoid dead state (and an eslint error), and a genuine UX win showing the user when they've overridden an AI color
- Single swatch click without an explicitly armed slot defaults to the `tausta` slot, keeping the common one-click case (first color, first click) ergonomic

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused bgSource/accentSource state by surfacing them in the UI**
- **Found during:** Task 2 verification (`npm run build` ESLint pass)
- **Issue:** `bgSource` and `accentSource` state values were set (via `assignColorToSlot`) but never read anywhere in the render, tripping `@typescript-eslint/no-unused-vars` as a build-blocking ESLint error.
- **Fix:** Added a small `(oma)` caption next to each slot's hex value when its source is `'custom'`, so the state is read and the distinction is visible to the user (also a UX improvement aligned with D-09's AI-vs-custom distinction).
- **Files modified:** `app/business/onboarding/AnalysoiSivusto.tsx`
- **Verification:** `npx next lint --file app/business/onboarding/AnalysoiSivusto.tsx` reports zero errors (two pre-existing-pattern `react-hooks/exhaustive-deps` warnings remain, not errors)
- **Committed in:** `3e1b791` (part of Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix, Rule 1)
**Impact on plan:** No scope creep — the fix surfaces already-collected state as a UX detail rather than adding new functionality.

## Issues Encountered
`npm run build` in this worktree fails at the "Collecting page data" step for an unrelated pre-existing reason: no `.env.local` is present in the worktree, so `/api/admin/applications`'s route module throws `supabaseUrl is required` during static analysis. This is an environment limitation (missing secrets in the sandboxed worktree), not caused by this plan's changes, and out of scope per the deviation rules' scope boundary (pre-existing, unrelated file). The plan's authoritative build check — absence of a `useSearchParams() should be wrapped in a suspense boundary` / CSR-bailout / prerender error — was confirmed against the build output before that unrelated failure: `npm run build 2>&1 | grep -iE "useSearchParams|should be wrapped in a suspense|prerender|CSR bail"` returned no matches, and the build log showed `✓ Compiled successfully` and a clean type-check pass prior to the page-data-collection step.

## User Setup Required
None for this plan specifically. The worktree's missing `.env.local` (noted above) is a pre-existing environment gap unrelated to this plan's changes — it does not block code review or merge, only local production builds inside this sandboxed worktree.

## Next Phase Readiness
- Plan 03 (quick-accept) can read `selected_logo_url`/`selected_background_color`/`selected_accent_color` back from `business_branding`, knowing they were set via this plan's pickers and validated server-side by Plan 01's PATCH route
- `paikka_id` now flows correctly through the entire pre-vaihe — Plan 03's quick-accept submission flow can rely on the same resolved `paikkaId` prop already threaded into `AnalysoiSivusto`
- The gallery picker (also Plan 03 scope per the original CONTEXT.md split, or absorbed elsewhere) was NOT touched by this plan — `image_urls` selection remains for whichever plan implements it

---
*Phase: 48-logo-v-ri-ja-galleriavalinta*
*Completed: 2026-06-16*

## Self-Check: PASSED

- FOUND: app/business/onboarding/page.tsx
- FOUND: app/business/onboarding/AnalysoiSivusto.tsx
- FOUND commit: 70bea06
- FOUND commit: 3e1b791
