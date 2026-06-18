---
phase: 51-live-esikatselu-velhossa
verified: 2026-06-18T00:00:00Z
status: gaps_found
score: 4/5 must-haves verified
behavior_unverified: 0
overrides_applied: 0
gaps:
  - truth: "The live preview renders via CalloutCard/DiagonaalKortti using the current in-progress (unsaved) field values, not stale data from the last save"
    status: partial
    reason: "CR-01 (code review, confirmed independently): StepMediat dispatches local blob: URLs into the shared LivePreviewContext via SET_MEDIA with no debounce, then revokes those exact blob URLs on unmount (leaving the Mediat step) without ever dispatching a clearing/replacement action. The reducer's RESET action exists but is never dispatched anywhere in app/ (grep confirms zero call sites). Result: any staged (not-yet-uploaded) logo/photo selected on the Mediat step produces a permanently broken <img src=\"blob:...\"> in the live preview sidebar/toggle for the rest of the wizard session once the user navigates to the next step — a deterministic, always-reproducible regression of 'not stale data' for that one field path (media only; hinnasto/aukioloajat/yhteystiedot are unaffected since they don't use blob URLs)."
    artifacts:
      - path: "app/business/onboarding/StepMediat.tsx"
        issue: "Cleanup effects at lines 65-67 and 74-76 revoke stagedPreviewUrls/logoPreviewUrl on unmount/change, but no corresponding dispatch clears or replaces those URLs in LivePreviewContext state before they go stale."
      - path: "lib/livePreview/LivePreviewContext.tsx"
        issue: "RESET action (lines 55, 82-83) is defined but has no caller anywhere in the codebase — there is no wired mechanism to clear stale media_urls when the Mediat step unmounts."
    missing:
      - "An unmount-time dispatch in StepMediat.tsx that drops/replaces blob: URLs in context state with the last-known persisted (non-blob) existingLogoUrl/existingPhotoUrls before the blob is revoked (the review's suggested fix), OR an equivalent guard in LivePreviewPane/the reducer that falls back to non-blob URLs once a blob reference is known to be revoked."
deferred: []
---

# Phase 51: Live-esikatselu velhossa Verification Report

**Phase Goal:** A business owner sees their venue's card update in real time as they fill in any wizard step, instead of only seeing the final result at step 6 — in both the onboarding wizard and the existing-venue EditMode tabs.
**Verified:** 2026-06-18
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth (mapped from Success Criteria) | Status | Evidence |
|---|---------|--------|----------|
| 1 | Changing a field on any wizard step immediately updates a live preview without save/reload | ✓ VERIFIED (with caveat, see #4) | `StepHinnasto`/`StepAukioloajat`/`StepYhteystiedot` dispatch debounced (280ms) `SET_*` actions into `useLivePreview().dispatch`; `StepMediat` dispatches `SET_MEDIA` instantly on file selection (no debounce, confirmed `useDebouncedValue` absent from that file). `LivePreviewContext`'s `useMemo` re-derives `livePreviewPaikka` synchronously from dispatched state with zero network calls. `WizardInner.tsx` mounts `LivePreviewPane` in both modes consuming this context. |
| 2 | Desktop: live preview visible side-by-side with the step being edited | ✓ VERIFIED | `WizardInner.tsx` lines 258/337-339 (OnboardingMode) and 408/515-517 (EditMode) both render `<div className="flex gap-6 items-start justify-center">` wrapping the form column and a `hidden lg:flex flex-col gap-4 w-[360px] flex-shrink-0 sticky top-6` column rendering `<LivePreviewPane />`, matching 51-UI-SPEC.md's contract exactly. |
| 3 | Mobile: toggle between edit form and preview instead of permanent split | ✓ VERIFIED | Both modes render `<div className="lg:hidden"><LivePreviewToggle activeView={activeView} onChange={setActiveView} /></div>` above the content; `activeView === 'preview'` swaps the `AnimatePresence` content area to `<LivePreviewPane />` (full content swap, confirmed in both `OnboardingMode` and `EditMode` render blocks). A `useEffect` keyed on `[step]` / `[currentStep]` resets `activeView` to `'edit'` on navigation (D-08), confirmed in both modes. |
| 4 | Preview renders via CalloutCard/DiagonaalKortti using current in-progress (unsaved) values, not stale data | ⚠️ PARTIAL | `LivePreviewPane.tsx` renders both `CalloutCard` and `DiagonaalKortti` from `livePreviewPaikka` (no `PaikkaSheet`). Pricing/hours/contact fields correctly reflect live unsaved edits. **However**, CR-01 is confirmed independently (see Gaps below): staged logo/photo blob URLs become permanently stale (broken `<img>`) in the live preview once the user leaves the Mediat step, because the cleanup effect revokes the blob without clearing it from context, and `RESET` is dispatched nowhere in the codebase. This is "stale data" exactly in the sense criterion #4 prohibits, for the media field path specifically. |
| 5 | EditMode's existing-venue tabs get the same live preview pattern, replacing PreviewModal | ✓ VERIFIED | `previewOpen` and `<PreviewModal` both return 0 grep hits in `WizardInner.tsx`. `EditMode` mounts its own `LivePreviewProvider` (seeded from `local*` state) and renders the same `LivePreviewPane`/`LivePreviewToggle` pair as `OnboardingMode`. `app/components/PreviewModal.tsx` still exists on disk and `app/business/page.tsx` still imports (line 10) and renders it (line 331) independently — the dashboard usage is intact, confirming D-02's corrected scope (only the EditMode call site removed). |

**Score:** 4/5 truths fully verified, 1 partial (criterion 4 — media-path staleness bug confirmed).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `lib/livePreview/LivePreviewContext.tsx` | Provider + reducer + derived preview object | ✓ VERIFIED | 179 lines; exports `LivePreviewProvider`, `useLivePreview`, `LivePreviewAction`, `PreviewDraft`; imports and calls both `buildDraftAsPaikka` and `buildBrandingPreview`; no `fetch`/`supabase` calls present. |
| `lib/livePreview/useDebouncedPreviewField.ts` | `useDebouncedValue` hook, 280ms default | ✓ VERIFIED | Exports `useDebouncedValue<T>(value, delayMs = 280)`; `setTimeout`/`clearTimeout` pattern confirmed. |
| `app/business/onboarding/LivePreviewPane.tsx` | Stacked CalloutCard/DiagonaalKortti reading context | ✓ VERIFIED | Renders both cards, spinner empty state, no `PaikkaSheet`, no extra `.glass` wrapper. |
| `app/business/onboarding/LivePreviewToggle.tsx` | Muokkaa/Esikatselu segmented control | ✓ VERIFIED | Matches UI-SPEC JSX exactly: `.glass rounded-full p-1` track, `Pencil`/`Eye` icons, `whileTap scale 0.95`, active/inactive tokens. |
| `messages/fi.json` / `messages/en.json` | New `previewToggleEdit`/`previewToggleLive` keys | ✓ VERIFIED | `node -e` parse confirms `fi: Muokkaa/Esikatselu`, `en: Edit/Preview`. |
| `app/business/WizardInner.tsx` | Provider mount + split/toggle layout + EditMode modal removal | ✓ VERIFIED (wiring) / ⚠️ (data integrity, see CR-01) | All structural wiring present and correct; the underlying StepMediat data source feeding this component has the stale-blob-URL defect. |
| `.planning/REQUIREMENTS.md` | D-03 corrected Out-of-Scope wording | ✓ VERIFIED | D-03 scope-correction note present under "Live Preview" section (line 50). **However**, LIVEPREV-01 through LIVEPREV-04 are still marked `[ ]` (unchecked) and "Pending" in the Traceability table (lines 45-48, 81-84) — not yet marked complete, unlike every other shipped requirement in this milestone (SCRAP-*, BRDDB-*, ONBOARD-*, PREV-*, FLOW-* are all `[x]`/"Complete"). This is expected to be closed as part of phase wrap-up (the pattern in commits `3b6273b` for Phase 49, `fbb4c47` for Phase 50) but has not happened yet — flagged here since REQUIREMENTS.md is a verification input, not because it blocks the functional goal. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `LivePreviewContext.tsx` | `lib/onboardingUtils.ts buildDraftAsPaikka` | import + call | ✓ WIRED | Confirmed import line 24, call line 143. |
| `LivePreviewContext.tsx` | `lib/branding/brandingResult.ts buildBrandingPreview` | import + call | ✓ WIRED | Confirmed import line 25, call line 140. |
| `LivePreviewPane.tsx` | `useLivePreview` | hook call | ✓ WIRED | Line 22. |
| `LivePreviewPane.tsx` | `CalloutCard` + `DiagonaalKortti` | render | ✓ WIRED | Both rendered, confirmed. |
| `StepHinnasto.tsx` | `dispatch({ type: 'SET_HINNASTO' ...})` | debounced useEffect | ✓ WIRED | Line 126, `useDebouncedValue(rows, 280)`. |
| `StepAukioloajat.tsx` | `dispatch({ type: 'SET_AUKIOLOAJAT' ...})` | debounced useEffect | ✓ WIRED | Line 132. |
| `StepYhteystiedot.tsx` | `dispatch({ type: 'SET_YHTEYSTIEDOT' ...})` | debounced useEffect | ✓ WIRED | Line 52. |
| `StepMediat.tsx` | `dispatch({ type: 'SET_MEDIA' ...})` | instant useEffect | ⚠️ WIRED BUT LEAKY | Dispatch is wired and instant as designed (D-05), but no corresponding unmount-time dispatch clears stale blob URLs (CR-01). |
| `WizardInner.tsx` | `LivePreviewProvider` | wraps both modes | ✓ WIRED | 2 mount sites confirmed (OnboardingMode line 252, EditMode line 388). |
| `WizardInner.tsx` EditMode | `app/components/PreviewModal.tsx` | removed | ✓ CONFIRMED REMOVED | `previewOpen`/`<PreviewModal` both 0 hits; dashboard usage (`app/business/page.tsx`) intact. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Project-wide type safety | `npx tsc --noEmit -p tsconfig.json` | No output (zero errors) | ✓ PASS |
| i18n keys parse and contain expected values | `node -e "JSON.parse(...)"` | `fi: Muokkaa Esikatselu`, `en: Edit Preview` | ✓ PASS |
| `previewOpen`/`<PreviewModal` removed from WizardInner | `grep -c` | both 0 | ✓ PASS |
| `RESET` action ever dispatched anywhere in app/ | `grep -rn "RESET" app/business` | no matches | ✗ FAIL (confirms CR-01's root cause — no reset path exists) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| LIVEPREV-01 | 51-01, 51-03 | Each wizard step updates shared live-preview state on field change | ✓ SATISFIED (code) / REQUIREMENTS.md not yet marked complete | All four step components dispatch into context; debounce/instant split correctly per D-04/D-05. |
| LIVEPREV-02 | 51-02, 51-04 | Desktop shows live preview side-by-side | ✓ SATISFIED (code) / REQUIREMENTS.md not yet marked complete | `lg:` split-view column confirmed in both modes. |
| LIVEPREV-03 | 51-02, 51-04 | Mobile shows toggle, no side-by-side | ✓ SATISFIED (code) / REQUIREMENTS.md not yet marked complete | `LivePreviewToggle` + full content swap confirmed in both modes. |
| LIVEPREV-04 | 51-01, 51-02, 51-04 | Renders via CalloutCard/DiagonaalKortti using current unsaved values, both modes | ⚠️ PARTIAL — media field path has a stale-data defect (CR-01) | Pricing/hours/contact fields are correctly live; media (logo/photo) blob URLs go permanently stale once the Mediat step unmounts with an unsaved selection. |

No orphaned requirements — all 4 LIVEPREV IDs appear in plan frontmatter and are accounted for above.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `app/business/onboarding/StepMediat.tsx` | 65-76, 82-90 | Lifecycle bug: blob URL revoked without context cleanup (CR-01) | 🛑 Blocker | Produces a deterministic broken-image regression in the live preview for any user who selects a logo/photo and navigates away from the Mediat step before saving — directly contradicts success criterion #4 ("not stale data"). |
| `lib/livePreview/LivePreviewContext.tsx` | 55, 82-83 | Dead `RESET` action, never dispatched (WR-01) | ⚠️ Warning | Not a current functional bug on its own, but it is the missing mechanism that would have prevented CR-01 — flags incomplete wiring. |
| `app/business/onboarding/StepYhteystiedot.tsx` | 50 | Fresh object literal passed to `useDebouncedValue` every render (WR-02) | ⚠️ Warning | Can reset the debounce timer on unrelated re-renders, delaying preview updates during fast typing — does not break correctness but undermines the "immediately" framing of criterion #1 in edge cases. |
| `app/business/onboarding/StepMediat.tsx` | 114-128 | Storage-path regex silently no-ops on unexpected URL shapes (WR-03) | ⚠️ Warning | Pre-existing pattern, not introduced by this phase's live-preview goal; orphaned storage objects, not a live-preview defect. |
| `app/business/WizardInner.tsx` | 400-406 | `initialDraft` object literal reconstructed every render in EditMode (WR-04) | ⚠️ Warning | No functional bug today (provider only consumes on mount), but fragile for future refactors. |

No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` markers found in any of the 9 phase-modified files.

### Human Verification Required

None required to determine the gap above — the CR-01 defect is independently confirmed by static code reading (cleanup effects + absent RESET dispatch), not by a behavior that needs manual UI interaction to observe. The fix is also code-traceable: a missing dispatch call.

If/when CR-01 is fixed, a human should still spot-check once: select a logo on the Mediat step, navigate to Hinnasto, and confirm the sidebar/toggle preview still shows the logo (not a broken image) — this is the regression scenario the review and this verification both flag.

### Gaps Summary

The phase's structural goal — live preview wiring, desktop split-view, mobile toggle, EditMode parity, dead-code-safe PreviewModal removal — is fully and correctly implemented across all four plans, confirmed independently against the actual code (not just SUMMARY.md claims): `tsc --noEmit` is clean, all key links are wired, all artifacts exist and meet their min-line/content requirements, and the EditMode/PreviewModal split was handled exactly as the plan's CRITICAL CORRECTION specified (dashboard usage preserved).

One gap blocks a clean pass: **CR-01's blob URL staleness bug is real and reproducible**, confirmed by independently reading `StepMediat.tsx`'s cleanup effects and confirming the reducer's `RESET` action is dispatched nowhere in the codebase. This directly affects success criterion #4 ("not stale data from the last save") for the media (logo/photo) field specifically — a business owner who stages a logo/photo and moves to the next wizard step before saving will see a permanently broken image in the live preview sidebar/toggle for the rest of that session. Pricing, hours, and contact fields are unaffected (they don't use blob URLs). This is scoped narrowly (one field type, one specific navigation sequence) but is deterministic and always-reproducible per the code review's own analysis, which this verification independently corroborates rather than taking on faith.

Additionally, `.planning/REQUIREMENTS.md`'s LIVEPREV-01–04 rows remain unchecked/"Pending" rather than marked complete — inconsistent with how prior phases (49, 50) closed out their requirement rows as part of the verification/wrap-up commit. This is a documentation-completeness gap, not a functional one, and would normally be closed in the same commit that accepts this verification.

**Recommendation:** Fix CR-01 (the review's suggested fix — dispatch a clearing/replacement SET_MEDIA action on StepMediat unmount, or wire RESET — is a small, scoped, well-understood change) before considering this phase's success criterion #4 fully met. The other three criteria (#1 for non-media fields, #2, #3, #5) are solid.

---

*Verified: 2026-06-18*
*Verifier: Claude (gsd-verifier)*
