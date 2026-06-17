# Phase 51: Live-esikatselu velhossa - Context

**Gathered:** 2026-06-18
**Status:** Ready for planning

<domain>
## Phase Boundary

A business owner sees their venue's card update in real time as they edit fields — in **both** of `WizardInner`'s modes:

1. **Onboarding mode** — any of the 4 numbered wizard steps (StepMediat, StepHinnasto, StepAukioloajat, StepYhteystiedot; post-Phase-50 renumbering, steps 1-4) plus the existing static preview at step 5 (StepEsikatselu, unchanged).
2. **EditMode** — the existing-venue tab editor (`app/business/[id]` route), which today only shows a preview on-demand via a button that opens `PreviewModal`. That button/modal flow is replaced by the same live, side-by-side/toggle preview pattern used in onboarding.

Both modes converge on the same live-preview state mechanism and the same two preview components (`CalloutCard`, `DiagonaalKortti`) — `PaikkaSheet` remains preview-on-demand only at onboarding's step 5, per LIVEPREV-04's exact component list. Pre-phases ahead of the numbered wizard (`StepPaikka`, `AnalysoiSivusto` in `app/business/onboarding/page.tsx`) are NOT in scope — they happen before any previewable field exists yet.

**REQUIREMENTS.md correction needed:** The existing Out-of-Scope row "`PreviewModal.tsx` (used in EditMode dashboard) CalloutCard swap — Out of v2.2's stated scope" is superseded by this phase's decision to bring EditMode into live-preview scope using `CalloutCard`. This row must be removed/reworded when this phase's requirements are finalized (`git_commit` step should include the edit, mirroring how Phase 49 corrected PREV-03's wording).

</domain>

<decisions>
## Implementation Decisions

### Scope: onboarding wizard AND EditMode
- **D-01:** Live preview ships in both `WizardInner` modes. Onboarding mode (steps 1-4) and EditMode (tabs 1-5) both get the live side-by-side (desktop) / toggle (mobile) preview, sharing the same preview-state plumbing and the same two card components.
- **D-02:** EditMode's current `previewOpen` + `<PreviewModal>` button-and-modal flow (`WizardInner.tsx` lines 316, 348-356, 386-392) is removed and replaced by the live panel/toggle. `PreviewModal.tsx` itself becomes dead code once this lands — confirm no other call site exists before deleting (its only known usage today is this one in EditMode).
- **D-03 (REQUIREMENTS.md update):** EditMode's live preview renders `CalloutCard` + `DiagonaalKortti` (matching onboarding), not `PaikkaKortti`. The Out-of-Scope table row excluding the PreviewModal→CalloutCard swap must be removed/reworded to reflect this — same pattern Phase 49 used to correct PREV-03's wording when scope was clarified mid-discussion.

### Update trigger granularity
- **D-04:** Free-text/numeric inputs (pricing rows' kategoria/hinta/lisätieto, opening-hours times, contact fields — puhelin/email/website/kuvaus) debounce preview updates at ~250-300ms after the user stops typing. Avoids re-rendering `CalloutCard`+`DiagonaalKortti` on every keystroke across all 4 steps.
- **D-05:** Discrete-selection fields update the preview instantly, no debounce: logo/photo file selection (StepMediat — already produces local `URL.createObjectURL` blob previews before upload, reuse those blob URLs as the live preview's image source so nothing waits on the Supabase upload), and any color/branding selection. Debounce only applies to character-by-character text entry.

### Desktop split-view layout
- **D-06:** Desktop shows a fixed-width right-hand preview column alongside the form (form keeps its current `max-w-xl` centered column). The column renders `CalloutCard` stacked above `DiagonaalKortti` — both visible simultaneously, not a single-card switcher. This 2-column layout only activates above a wide-enough breakpoint (Claude's call on exact Tailwind breakpoint, e.g. `lg:`); narrower viewports fall back to the mobile toggle pattern (D-08) rather than a cramped 2-column squeeze.

### Mobile toggle UX
- **D-07:** Below the split-view breakpoint, a segmented control ("Muokkaa" / "Esikatselu") sits above the step/tab content — visually consistent with existing tab-bar styling already used in `ProgressBar.tsx` (onboarding) and the tab bar in `WizardInner.tsx`'s EditMode (lines 371-385).
- **D-08:** The toggle resets to "Muokkaa" (form view) every time the user navigates to a different step/tab — it does NOT persist the "Esikatselu" selection across step changes. Each new step starts on the form side; the user re-taps "Esikatselu" if they want to check that step's live update.

### Claude's Discretion
- Exact Tailwind breakpoint for the desktop split-view vs mobile-toggle switch (D-06) — pick whatever already matches this codebase's existing responsive conventions (check `Etusivu.tsx`/`app/business/map/page.tsx` for precedent).
- Exact shape of the shared preview-state mechanism: a single `OnboardingPreviewProvider`/reducer mounted once above both `OnboardingMode` and `EditMode` in `WizardInner.tsx`, vs two separate instances — per the project's existing Out-of-Scope note ("React Context + reducer scoped to the wizard tree is sufficient"), but the exact mounting point and reducer action shape are Claude's call.
- Whether debounce (D-04) is implemented via a small custom hook (e.g. `useDebouncedPreviewField`) or inline `setTimeout`/`useEffect` per field — whichever is more consistent with existing code style (no debounce utility exists in the codebase today per a quick scan).
- Exact segmented-control visual styling for D-07 (colors/sizing) — follow the `.glass`/button conventions in CLAUDE.md's design system, no new visual language needed.
- How `brandColor`/`accentColor` (currently derived in `StepEsikatselu.tsx` from `brandingData.selected_background_color`/`selected_accent_color`) get threaded into the live preview's `CalloutCard`/`DiagonaalKortti` calls during steps 1-4, before the user has necessarily reached the branding-aware step — likely just reuse the same derivation logic, mounted once at the shared preview-state level instead of duplicated in `StepEsikatselu.tsx`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` §LIVEPREV-01–04 — exact requirement text; the Out-of-Scope table's PreviewModal/CalloutCard row needs editing per D-03
- `.planning/ROADMAP.md` §"Phase 51: Live-esikatselu velhossa" — goal and 4 success criteria (note: criterion 1 still says "step 6" in places informally; actual wizard is now 5 steps + EditMode per Phase 50's renumber)
- `.planning/phases/50-flow-uudelleenj-rjestys/50-CONTEXT.md` D-02 — confirms the post-renumber 5-step onboarding wizard shape (StepMediat=1 ... StepEsikatselu=5) this phase builds on
- `.planning/phases/49-esikatselu-ja-kontrastikorjaukset/49-CONTEXT.md` D-01–D-05 — `CalloutCard` swap precedent in `StepEsikatselu.tsx`, contrast-safe logo handling pattern (relevant if live preview also needs a contrast-safe logo thumbnail during steps 1-4, before full StepEsikatselu rendering)

### Existing code (read before modifying)
- `app/business/WizardInner.tsx` — both modes live here: `OnboardingMode` (lines 34-309, steps 1-5 via `step` state) and `EditMode` (lines 312-452, tabs 1-5 via `currentStep` URL param + `local*` state lifted per-field); EditMode's `previewOpen`/`PreviewModal` flow (lines 316, 348-356, 386-392) is the removal target per D-02
- `app/business/onboarding/StepEsikatselu.tsx` — existing static-preview pattern: `draftAsPaikka` construction (lines 37-46), `brandColor`/`accentColor` derivation (lines 51-61), `CalloutCard`/`DiagonaalKortti` call shape (lines 134, 142) — the live preview reuses this derivation logic rather than re-deriving it
- `app/business/onboarding/StepHinnasto.tsx` — representative step component: local `rows` state (line 53), `updateRow` (line 114) is the per-keystroke mutation site live preview needs to observe/debounce
- `app/business/onboarding/StepMediat.tsx` — `stagedPreviewUrls` via `URL.createObjectURL` (lines 59-65) already gives instant local photo previews pre-upload; reuse this exact mechanism for D-05's instant logo/photo preview updates
- `app/components/CalloutCard.tsx`, `app/components/DiagonaalKortti.tsx` — the two preview components both modes render; confirmed (Phase 49) neither requires real lat/lng in render logic
- `app/components/PreviewModal.tsx` — current EditMode preview trigger, becomes dead code per D-02; uses `PaikkaKortti` (not `CalloutCard`) today
- `app/business/onboarding/ProgressBar.tsx` — existing tab-bar visual pattern to match for the new segmented "Muokkaa"/"Esikatselu" control (D-07)
- `lib/onboardingUtils.ts` — `buildDraftAsPaikka`/`PaikkaBase` types; the live preview's per-step field accumulation needs to produce the same shape these helpers consume

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `URL.createObjectURL` staged-preview pattern in `StepMediat.tsx` — directly reusable for instant (non-debounced) photo/logo live-preview updates without waiting on Supabase upload completion.
- `buildDraftAsPaikka`/`buildBrandingPreview` in `lib/onboardingUtils.ts` / `lib/branding/brandingResult.ts` — existing logic to convert in-progress draft + branding data into the `Liikuntapaikka`-shaped object `CalloutCard`/`DiagonaalKortti` need; the shared live-preview state should produce input compatible with these existing builders rather than duplicating their logic.

### Established Patterns
- No `createContext`/`useContext`/`useReducer` usage exists anywhere in `app/` today — this phase introduces the first one. Per `.planning/REQUIREMENTS.md`'s existing Out-of-Scope note, this is intentional: "React Context + reducer scoped to the wizard tree is sufficient at this scale," explicitly ruling out Zustand/Redux/Jotai.
- Each step component (`StepMediat`, `StepHinnasto`, `StepAukioloajat`, `StepYhteystiedot`) currently owns its form state entirely locally and only communicates outward via `onNext`/`onSaveComplete` callbacks fired on submit — none of them currently expose per-keystroke state to a parent. This phase requires adding an additional outward channel (writes to the new shared preview context) alongside the existing save-on-submit flow, without changing the existing save behavior.
- `AnimatePresence mode="wait"` + `key={step}` crossfade pattern in `WizardInner.tsx` (lines 249-256) — the new split-view/toggle layout should slot into this existing structure rather than replacing it.

### Integration Points
- EditMode's `local*` state variables (`localHinnasto`, `localAukioloajat`, `localYhteystiedot`, `localLogoUrl`, `localPhotoUrls` — `WizardInner.tsx` lines 320-331) already exist specifically to persist field values across EditMode's tab navigation; these are a natural source to mirror into the new shared preview state rather than re-deriving from scratch.
- Onboarding mode has no equivalent lifted state today — each step's local state is thrown away once `saveAndAdvance` fires and the next step mounts fresh from `draft` (re-fetched from Supabase). The new shared preview context becomes the first cross-step state in onboarding mode that survives step navigation without a DB round-trip.

</code_context>

<specifics>
## Specific Ideas

No specific visual/copy requirements beyond the decisions above — exact breakpoints, debounce hook shape, and segmented-control styling are explicitly left to Claude's discretion (see Claude's Discretion above).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. Expanding scope to include EditMode (D-01) was a deliberate scope decision made during this discussion, not a deferral; it required REQUIREMENTS.md's Out-of-Scope table to be corrected (D-03) rather than treating it as a future phase.

</deferred>

---

*Phase: 51-Live-esikatselu velhossa*
*Context gathered: 2026-06-18*
