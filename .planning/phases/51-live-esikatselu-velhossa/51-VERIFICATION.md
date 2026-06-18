---
phase: 51-live-esikatselu-velhossa
verified: 2026-06-18T02:00:00Z
status: gaps_found
score: 4/5 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 4/5
  gaps_closed:
    - "WR-01 (StepMediat unmount-cleanup stale-closure bug, found in the second verification pass): independently re-confirmed FIXED by plan 51-06 (commit adcdf4b). StepMediat.tsx now maintains a latestMediaRef (lines 100-103) synced via a useEffect keyed on [existingLogoUrl, existingPhotoUrls], and the unmount-only ([] deps) cleanup effect (lines 112-123) reads latestMediaRef.current.logo/.photos instead of closing directly over the mount-time state values. Because React runs the ref-sync effect on every render that changes those values — including the final render before a true unmount — the ref is guaranteed current by the time the cleanup fires. EditMode save-then-navigate-without-remount no longer re-broadcasts stale pre-save media."
  gaps_remaining:
    - "NEW (CR-01 in fresh 51-REVIEW.md, independently confirmed by this verification, was NOT covered by plan 51-06 and has no closure plan yet): LivePreviewContext.tsx's livePreviewPaikka derivation (lines 138-146) ignores state.hinnasto/state.aukioloajat/state.yhteystiedot entirely whenever brandingData is present. It calls buildBrandingPreview(paikkaInfo, brandingData, state.paikka_id, state.media_urls?.logo) — no hinnasto/aukioloajat/yhteystiedot parameter exists on that function's signature at all. buildBrandingPreview (lib/branding/brandingResult.ts:117-169) derives hinta_kuvaus/aukioloajat solely from brandingResult.raw_analysis (the frozen AI-scraped snapshot) and hardcodes puhelin/kuvaus to null, unconditionally. For any venue that went through the website-analysis onboarding flow (brandingData truthy), editing pricing (StepHinnasto, step 2), opening hours (StepAukioloajat, step 3), or contact info (StepYhteystiedot, step 4) dispatches the live values into the shared reducer (confirmed: dispatch({type:'SET_HINNASTO'|...}) calls exist and fire on debounced change in all three step components) but the rendered preview never reflects them — it stays frozen on AI-scraped or null data for the rest of the wizard session. This is the exact 'stale data' failure mode criterion #4 and LIVEPREV-04 prohibit, on a path (brandingData-driven onboarding) that the product steers most businesses toward."
  regressions: []
gaps:
  - truth: "The live preview renders via CalloutCard/DiagonaalKortti using the current in-progress (unsaved) field values, not stale data from the last save"
    status: partial
    reason: "Independently confirmed by direct code reading (not taken on the SUMMARY's or even the code review's word) that plan 51-06 correctly fixed the previously-open WR-01 stale-closure bug in StepMediat.tsx — that part of criterion #4 now holds. However, an independent trace of lib/livePreview/LivePreviewContext.tsx (requested as the specific focus of this verification pass) confirms a separate, more severe pre-existing gap: the brandingData branch of the livePreviewPaikka useMemo never threads state.hinnasto/state.aukioloajat/state.yhteystiedot into buildBrandingPreview, and buildBrandingPreview itself has no parameters to receive them — it only reads brandingResult.raw_analysis and hardcodes puhelin/kuvaus null. Confirmed reachable: app/business/WizardInner.tsx line 255 passes the real brandingData into OnboardingMode's LivePreviewProvider (line 399 passes brandingData={null} for EditMode, so EditMode is unaffected). For any AI-website-analysis-onboarded venue, criterion #1/#4 fails specifically for the pricing/hours/contact steps: the user's keystrokes are dispatched into shared state correctly but the rendered CalloutCard/DiagonaalKortti preview ignores them and keeps showing AI-scraped (or null) values for the rest of the session."
    artifacts:
      - path: "lib/livePreview/LivePreviewContext.tsx"
        issue: "Lines 138-146: livePreviewPaikka useMemo's brandingData branch calls buildBrandingPreview(paikkaInfo, brandingData, state.paikka_id, state.media_urls?.logo) and returns its result directly with no overlay of state.hinnasto/state.aukioloajat/state.yhteystiedot onto the result."
      - path: "lib/branding/brandingResult.ts"
        issue: "Lines 117-169 (buildBrandingPreview): function signature has no hinnasto/aukioloajat/yhteystiedot parameters; hinta_kuvaus and aukioloajat are derived solely from brandingResult.raw_analysis, and puhelin/kuvaus are unconditionally hardcoded to null — there is no code path inside this function that could ever reflect live wizard state even if a caller wanted it to."
    missing:
      - "Overlay the live draft state onto the branding-derived base object in the brandingData branch of livePreviewPaikka, e.g.: const base = buildBrandingPreview(...); return { ...base, hinta_kuvaus: state.hinnasto?.length ? hinnastaToHintaKuvaus(state.hinnasto) : base.hinta_kuvaus, aukioloajat: state.aukioloajat ?? base.aukioloajat, puhelin: state.yhteystiedot?.puhelin ?? base.puhelin, kuvaus: state.yhteystiedot?.kuvaus ?? base.kuvaus, varauslinkki: state.yhteystiedot?.website ?? base.varauslinkki } — exactly as proposed in 51-REVIEW.md's CR-01 fix."
deferred: []
---

# Phase 51: Live-esikatselu velhossa Verification Report

**Phase Goal:** A business owner sees their venue's card update in real time as they fill in any wizard step, instead of only seeing the final result at step 6 — in both the onboarding wizard and the existing-venue EditMode tabs.
**Verified:** 2026-06-18 (third pass — re-verification after gap-closure plan 51-06)
**Status:** gaps_found
**Re-verification:** Yes — after gap closure (plan 51-06 closed the prior WR-01 gap; this pass independently confirms that closure AND independently investigates a new CR-01 finding raised by the post-51-06 code review, per the task brief's explicit instruction to trace the code myself rather than trust either the review or the SUMMARY)

## Goal Achievement

### Observable Truths

| # | Truth (mapped from Success Criteria) | Status | Evidence |
|---|---------|--------|----------|
| 1 | Changing a field on any wizard step immediately updates a live preview without save/reload | ✗ FAILED (newly scoped) | Holds for media (StepMediat — instant dispatch, confirmed fixed end-to-end including the unmount fallback) and for EditMode/non-branding-onboarding pricing/hours/contact (buildDraftAsPaikka path, confirmed correct). FAILS specifically for pricing/hours/contact during AI-website-analysis onboarding (brandingData branch) — see independent CR-01 investigation below. |
| 2 | Desktop: live preview visible side-by-side with the step being edited | ✓ VERIFIED | Unchanged from prior passes — `WizardInner.tsx` lines 337-339 (`hidden lg:flex ... <LivePreviewPane />`) confirmed present; file not touched by plan 51-06. |
| 3 | Mobile: toggle between edit form and preview instead of permanent split | ✓ VERIFIED | Unchanged from prior passes — `LivePreviewToggle` + `activeView === 'preview'` full-content-swap confirmed at `WizardInner.tsx` lines 266-281; file not touched by plan 51-06. |
| 4 | Preview renders via CalloutCard/DiagonaalKortti using current in-progress (unsaved) values, not stale data | ✗ FAILED (gap re-scoped, not closed) | The previously-confirmed WR-01 bug (StepMediat unmount-cleanup stale closure) IS fixed by plan 51-06 (independently re-traced below). But an independent trace of `LivePreviewContext.tsx`, performed as the specific focus of this pass, surfaces a separate, pre-existing, unaddressed gap (CR-01 from the fresh code review): the `brandingData` branch of `livePreviewPaikka` never threads `state.hinnasto`/`state.aukioloajat`/`state.yhteystiedot` through, so pricing/hours/contact edits never reach the preview for AI-onboarded venues. Confirmed genuine, not a false positive — full trace below. |
| 5 | EditMode's existing-venue tabs get the same live preview pattern, replacing PreviewModal | ✓ VERIFIED | Unchanged from prior passes — `previewOpen`/`<PreviewModal` both 0 grep hits anywhere in `app/business/`; `EditMode`'s `LivePreviewProvider` (line 388) and `LivePreviewPane` usage confirmed; file's relevant sections not touched by plan 51-06 (only `StepMediat.tsx` was modified). |

**Score:** 3/5 truths verified, 2 failed (criteria #1 and #4 — narrower than before, but a different defect than WR-01 keeps both open).

### Independent WR-01 Re-Verification (closed by plan 51-06)

**Question:** Does the `latestMediaRef`-based fix in `StepMediat.tsx` (commit `adcdf4b`) actually resolve the prior stale-closure bug, without reintroducing it or a different one?

**Trace, read directly from `app/business/onboarding/StepMediat.tsx`:**

1. Lines 100-103: `const latestMediaRef = useRef({ logo: existingLogoUrl, photos: existingPhotoUrls })` followed by `useEffect(() => { latestMediaRef.current = { logo: existingLogoUrl, photos: existingPhotoUrls } }, [existingLogoUrl, existingPhotoUrls])`. This effect re-runs on every render where either value changes — including the render triggered by `handleSave`'s `setExistingLogoUrl`/`setExistingPhotoUrls` calls (lines 357-358).
2. Lines 112-123: the unmount-only effect (`[]` deps, unchanged in shape from the prior fix) now reads `latestMediaRef.current.logo`/`.photos` inside its cleanup instead of closing over the state variables directly.
3. Because the ref-sync effect (step 1) runs on every relevant render — including the final render before any subsequent unmount — by the time the component actually unmounts, `latestMediaRef.current` is guaranteed to hold whatever was most recently set, post-save or not.
4. Re-confirmed the eslint-disable on the unmount effect's `[]` deps is unchanged (intentional — the effect must only fire at true unmount, not on every state change), and the ref-sync effect's own deps array is the correct, complete `[existingLogoUrl, existingPhotoUrls]`.

**Conclusion: WR-01 is genuinely fixed.** This is a correct, idiomatic application of the "ref synced by a full-deps effect, read by a no-deps effect's cleanup" pattern and closes the bug without reintroducing CR-01 (the original staged-blob-URL bug) or any out-of-scope `RESET` dispatch (confirmed zero `RESET` dispatch call sites remain, via grep). `npx tsc --noEmit` reported no errors against the current tree.

### Independent CR-01 Investigation (requested focus — newly raised in fresh 51-REVIEW.md)

**Question (verbatim from task brief):** For a venue going through the AI-website-analysis onboarding flow, does editing pricing (StepHinnasto), hours (StepAukioloajat), or contact info (StepYhteystiedot) actually update the live preview pane, or does it stay frozen on AI-scraped/null data?

**Trace, read directly from the source files (not from the review's text):**

1. **`lib/livePreview/LivePreviewContext.tsx` lines 138-146:**
   ```ts
   const livePreviewPaikka = useMemo<Liikuntapaikka | null>(() => {
     if (brandingData && paikkaInfo && typeof state.paikka_id === 'number') {
       return buildBrandingPreview(paikkaInfo, brandingData, state.paikka_id, state.media_urls?.logo)
     }
     if (paikkaInfo) {
       return buildDraftAsPaikka(state as OnboardingDraft, paikkaInfo)
     }
     return null
   }, [state, paikkaInfo, brandingData])
   ```
   When `brandingData` is truthy, the only pieces of `state` (the live reducer state accumulating every dispatched field) passed into the branding branch are `state.paikka_id` and `state.media_urls?.logo`. `state.hinnasto`, `state.aukioloajat`, and `state.yhteystiedot` are never referenced in this branch at all, despite being present on `state` and despite the `useMemo`'s dependency array including the full `state` object (so the memo *does* recompute on every dispatch — it just throws the new pricing/hours/contact data away inside the branding branch).

2. **`lib/branding/brandingResult.ts` lines 117-169 (`buildBrandingPreview`'s actual signature and body):**
   ```ts
   export function buildBrandingPreview(
     paikkaBase: PaikkaBase,
     brandingResult: BrandingResult,
     draftPaikkaId: number,
     selectedLogoUrl?: string | null,
   ): Liikuntapaikka {
     const aukioloajat = brandingResult.raw_analysis?.opening_hours?.length ? /* ...from raw_analysis... */ : null
     const hinta_kuvaus = brandingResult.raw_analysis?.prices?.length ? /* ...from raw_analysis... */ : ''
     return {
       ...
       puhelin: null,
       kuvaus: null,
       hinta_kuvaus,
       aukioloajat,
       ...
     }
   }
   ```
   There is no parameter on this function through which live `hinnasto`/`aukioloajat`/`yhteystiedot` could be threaded even if the caller wanted to — `aukioloajat` and `hinta_kuvaus` are derived exclusively from `brandingResult.raw_analysis` (the one-time AI-scrape snapshot captured before the wizard even starts), and `puhelin`/`kuvaus` are unconditionally `null` regardless of any input.

3. **Reachability — is the broken branch actually exercised in onboarding?** `app/business/WizardInner.tsx`:
   - Line 255: `<LivePreviewProvider paikkaInfo={paikkaInfo} paikkaId={paikkaId} brandingData={brandingData} initialDraft={draft}>` — `OnboardingMode` passes the real `brandingData` prop straight through.
   - Line 399: `<LivePreviewProvider ... brandingData={null} ...>` — `EditMode` always passes `null`, so EditMode's `livePreviewPaikka` always takes the `buildDraftAsPaikka` branch and is unaffected by this bug.
   - So whenever a business owner reached onboarding via the website-analysis flow (`brandingData` populated and `status === 'analyzed'`), the broken branch is the one used for the entire onboarding session, steps 1 through 5.

4. **Do the edit steps actually dispatch live data that gets discarded?** Confirmed via direct grep of each step component:
   - `StepHinnasto.tsx` line 54 (`const { dispatch } = useLivePreview()`), lines 121-131: a debounced effect calls `dispatch({ type: 'SET_HINNASTO', payload: ... })` on `[debouncedRows, dispatch]` change.
   - `StepAukioloajat.tsx` line 59, lines 121-133: same pattern, `dispatch({ type: 'SET_AUKIOLOAJAT', payload: openDaysObject })`.
   - `StepYhteystiedot.tsx` line 40, lines 49-53: same pattern, `dispatch({ type: 'SET_YHTEYSTIEDOT', payload: debouncedYhteystiedot })`.
   - The reducer (`LivePreviewContext.tsx` lines 59-67) correctly merges each of these into `state.hinnasto`/`state.aukioloajat`/`state.yhteystiedot`. The data genuinely reaches `state` — it's the *consumption* side (the branding branch of `livePreviewPaikka`) that drops it.

5. **Is the non-branding onboarding path or EditMode affected?** No. `buildDraftAsPaikka` (`lib/onboardingUtils.ts` lines 87-109) correctly reads `draft.hinnasto ?? []`, `draft.aukioloajat ?? paikka.aukioloajat ?? null`, and `draft.yhteystiedot?.{puhelin,kuvaus,website}` — confirmed by direct read. Since `state` is passed as `OnboardingDraft`-shaped into this function in the non-branding branch, and EditMode always uses this branch (per point 3 above), both of those paths correctly reflect live keystrokes.

**Conclusion: this is a genuine, confirmed bug — not a false positive, and not the same defect as WR-01.** It is scoped exactly as suspected: only the `brandingData`-present onboarding path (AI-website-analysis flow) is affected; EditMode and the non-branding onboarding path are unaffected because they use `buildDraftAsPaikka`, which already receives and correctly threads the full `state`. For a branding-onboarded venue, a business owner who edits pricing in step 2, hours in step 3, or contact info in step 4 will see the live preview pane continue showing AI-scraped (or, for contact info, always-null) values for the rest of the session — directly violating criterion #1 ("immediately updates a live preview... as they fill in any wizard step") and criterion #4 ("not stale data") for three of the wizard's five data-entry steps, on what the review correctly notes is "the flow the product steers most businesses toward."

This was not addressed by plan 51-06 — that plan's `requires`/`provides`/`key-files` frontmatter scopes it exclusively to `StepMediat.tsx`'s unmount-cleanup ref fix (WR-01). `LivePreviewContext.tsx` and `brandingResult.ts` were not modified by 51-06 and were not in scope for any prior plan in this phase either (per `requirements: [LIVEPREV-04]` on plan 51-06, addressing only WR-01).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/business/onboarding/StepMediat.tsx` | Stale-closure-free unmount SET_MEDIA dispatch | ✓ EXISTS, ✓ SUBSTANTIVE, ✓ WIRED | `latestMediaRef` (lines 100-103) + ref-sync effect + unmount cleanup reading from the ref (lines 112-123) confirmed present and correctly wired — WR-01 genuinely closed. |
| `lib/livePreview/LivePreviewContext.tsx` | `livePreviewPaikka` reflects live state in all reducer-fed fields, for all provider configurations | ✓ EXISTS, ✓ SUBSTANTIVE, ✗ **INCOMPLETE WIRING** | `useMemo` correctly recomputes on every `state` change (deps include `state`), and the non-branding branch (`buildDraftAsPaikka`) is fully correct. The branding branch (lines 139-141) is the gap: it discards `state.hinnasto`/`state.aukioloajat`/`state.yhteystiedot` entirely. This is the artifact requiring the fix. |
| `lib/branding/brandingResult.ts` (`buildBrandingPreview`) | N/A — pre-existing from phases 44-49, out of phase 51's file scope per its own plans | ✓ EXISTS as designed | Confirmed it has no parameters for live hinnasto/aukioloajat/yhteystiedot and was never intended to — the fix belongs in the *caller* (`LivePreviewContext.tsx`), which should overlay live state onto this function's output rather than modifying the function itself. Listed here only because the bug's root cause spans both files. |
| `.planning/REQUIREMENTS.md` | LIVEPREV-01–04 traceability rows | ✓ CORRECTLY STILL UNCHECKED | LIVEPREV-01 through LIVEPREV-04 remain `[ ]` / "Pending" (lines 45-48, 81-84) — correct given LIVEPREV-04 (criterion #4) remains genuinely unsatisfied, just for a different underlying reason than the prior two verification rounds found. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `StepMediat.tsx` unmount effect | `LivePreviewContext.tsx` SET_MEDIA reducer | `latestMediaRef`-backed dispatch in cleanup | ✓ WIRED, correctly dispatches post-save values | WR-01 re-verified closed. |
| `StepHinnasto.tsx` / `StepAukioloajat.tsx` / `StepYhteystiedot.tsx` debounced effects | `LivePreviewContext.tsx` reducer (`state.hinnasto`/`aukioloajat`/`yhteystiedot`) | `dispatch({ type: 'SET_*' })` | ✓ WIRED — data reaches `state` correctly | Confirmed via grep in all three files; reducer cases (lines 59-67) correctly merge each payload. |
| `LivePreviewContext.tsx` `state.{hinnasto,aukioloajat,yhteystiedot}` | `livePreviewPaikka` (rendered by `LivePreviewPane`) | `buildBrandingPreview(...)` call inside the `useMemo`'s branding branch | ✗ **NOT WIRED** | The data sits correctly in `state` (previous row) but the branding branch of the derivation never reads it — `buildBrandingPreview`'s call site (line 140) passes only `paikkaInfo`, `brandingData`, `state.paikka_id`, `state.media_urls?.logo`. This is the broken link that causes criteria #1/#4 to fail for the branding-onboarding path. |
| `LivePreviewPane.tsx` | `livePreviewPaikka` | `useLivePreview()` destructure + direct render into `CalloutCard`/`DiagonaalKortti` | ✓ WIRED | Confirmed lines 22, 39-54 — pure presentation, correctly renders whatever `livePreviewPaikka` resolves to; not itself at fault. |
| `WizardInner.tsx` `OnboardingMode` | `LivePreviewProvider` `brandingData` prop | `brandingData={brandingData}` (line 255) | ✓ WIRED (confirms reachability of the bug) | `EditMode` passes `brandingData={null}` (line 399), confirming the bug's scope is exclusively the branding-onboarding path. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Project-wide type safety | `npx tsc --noEmit -p tsconfig.json` | No output (zero errors) | ✓ PASS |
| `RESET` action ever dispatched anywhere in app/ | grep `RESET` across `app/business` | no matches | ✓ still none (expected — out of scope) |
| All three onboarding edit steps dispatch their `SET_*` action | grep `dispatch(` in StepHinnasto/StepAukioloajat/StepYhteystiedot | confirmed in all three (lines 125-131, 132-133, 52-53 respectively) | ✓ Confirms data reaches `state` — the bug is purely in `state` → `livePreviewPaikka` derivation, not in the dispatch chain |
| `buildBrandingPreview` accepts hinnasto/aukioloajat/yhteystiedot params | grep function signature, `lib/branding/brandingResult.ts:117-122` | no such parameters exist | ✓ Confirms the fix must live in the caller (`LivePreviewContext.tsx`), not this function |
| EditMode always passes `brandingData={null}` | grep `brandingData` in `WizardInner.tsx` | line 399 confirmed `null` | ✓ Confirms EditMode is unaffected by this bug |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| LIVEPREV-01 | 51-01, 51-03 | Each wizard step updates shared live-preview state on field change | ⚠️ PARTIALLY SATISFIED | The *dispatch* side is fully satisfied for all steps (confirmed all step components dispatch correctly). The *rendered* side fails for pricing/hours/contact specifically in the brandingData-onboarding path — see CR-01 above. Media and the non-branding/EditMode paths are fully correct. |
| LIVEPREV-02 | 51-02, 51-04 | Desktop shows live preview side-by-side | ✓ SATISFIED | Unchanged from prior passes. |
| LIVEPREV-03 | 51-02, 51-04 | Mobile shows toggle, no side-by-side | ✓ SATISFIED | Unchanged from prior passes. |
| LIVEPREV-04 | 51-01, 51-02, 51-04, 51-05, 51-06 | Renders via CalloutCard/DiagonaalKortti using current unsaved values, both modes | ✗ BLOCKED | Plan 51-06's SUMMARY claims this complete (`requirements-completed: [LIVEPREV-04]`), and it IS correct that the specific defect 51-06 targeted (WR-01, StepMediat stale closure) is fixed. But the requirement as a whole is not satisfied: the independently-confirmed CR-01 gap above means pricing/hours/contact live preview is broken for any AI-website-analysis-onboarded venue — a different, larger-impact failure of the same requirement. |

REQUIREMENTS.md correctly still shows all four LIVEPREV IDs as "Pending" — this pass confirms that state remains accurate.

No orphaned requirements — all 4 LIVEPREV IDs appear in plan frontmatter (51-01 through 51-06) and are accounted for above.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `lib/livePreview/LivePreviewContext.tsx` | 138-146 | `livePreviewPaikka`'s brandingData branch silently discards `state.hinnasto`/`aukioloajat`/`yhteystiedot` with no fallback, no warning, no indication anything is stale | 🛑 Blocker | Live preview silently shows wrong/stale data under the "live preview" label for the branding-onboarding path's pricing/hours/contact steps — the core failure mode this phase exists to prevent. |
| `lib/livePreview/LivePreviewContext.tsx` | 55, 82-83 | Dead `RESET` action, never dispatched (carried over as IN-01 across all three verification passes) | ℹ️ Info | Not blocking; flagged again for completeness. |
| `app/business/onboarding/StepYhteystiedot.tsx` | 50 | Fresh object literal passed to `useDebouncedValue` every render, restarting the debounce timer on unrelated re-renders (WR-01 in fresh code review, distinct from the now-fixed WR-01 in the prior verification round — name collision across rounds, not the same bug) | ⚠️ Warning | Could in rare cases delay the live preview's contact-info update beyond the intended ~280ms window if `StepYhteystiedot` re-renders for unrelated reasons; does not cause the CR-01 staleness bug above. |
| `app/business/onboarding/StepHinnasto.tsx` | 253-291 | Table inputs/row buttons not disabled during save/loading | ⚠️ Warning | Race risk between in-flight save and concurrent edits; does not affect live-preview correctness. |
| `app/business/onboarding/StepHinnasto.tsx` | 305-319 | Save-success banner uses inconsistent ternary idiom vs. sibling steps | ⚠️ Warning | Stylistic only. |
| `app/business/onboarding/StepAukioloajat.tsx` | 248-263 | Day-toggle `aria-label` identical for all seven days | ⚠️ Warning | Accessibility gap, not a live-preview defect. |
| `app/business/onboarding/StepMediat.tsx` | 138-141 | `removeLogoFile` ignores its parameter via blanket eslint-disable | ℹ️ Info | Pre-existing, not introduced by this phase. |
| `app/business/onboarding/StepAukioloajat.tsx` | 12-20 | `EN_TO_FI` duplicates `FI_TO_EN` by hand | ℹ️ Info | Latent consistency risk, not a live-preview defect. |
| `app/business/onboarding/LivePreviewToggle.tsx` | 28-49 | Toggle lacks `aria-pressed`/`role="tab"` semantics | ℹ️ Info | Accessibility gap, not a live-preview correctness defect. |

No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` markers found in any of the phase-modified files.

### Human Verification Required

None required to establish the CR-01 gap — it is confirmed by direct, deterministic code reading (function signatures, branch logic, and a confirmed-reachable call site), the same evidentiary standard used for the now-closed WR-01 and CR-01(original) findings in prior rounds. No UI interaction is needed to know `buildBrandingPreview` cannot reflect data it is never given.

If/when the CR-01 fix (overlaying live `state.hinnasto`/`aukioloajat`/`yhteystiedot` onto the branding-derived base object) lands, a human should spot-check once: start onboarding via the website-analysis flow for a venue with scraped prices/hours → on step 2, change a price → confirm the live preview pane updates instantly → repeat for step 3 (hours) and step 4 (contact info, including verifying `puhelin`/`kuvaus` now show typed values instead of permanently blank).

### Gaps Summary

**What's fixed (this pass, re-verified independently):** Plan 51-06 correctly and completely closes WR-01. The `latestMediaRef` pattern is textbook-correct for avoiding stale closures in unmount-only effects, `tsc --noEmit` is clean, and the original CR-01(round 2)/staged-blob-URL behavior remains correctly preserved. EditMode save-then-navigate-without-remount no longer reverts the live preview to pre-save media.

**What's still open (newly scoped, not previously caught):** A separate, pre-existing defect in `LivePreviewContext.tsx`'s `livePreviewPaikka` derivation means that for any business owner who onboards via the AI-website-analysis flow (the path the product steers most users toward), editing pricing, opening hours, or contact info on steps 2-4 dispatches correctly into shared reducer state but the rendered preview ignores that state and keeps showing AI-scraped or hardcoded-null values for the entire onboarding session. This was independently re-derived from the actual source (not taken from the code review's prose) by: (1) reading the exact `useMemo` branch and confirming it never references `state.hinnasto`/`aukioloajat`/`yhteystiedot`; (2) reading `buildBrandingPreview`'s full signature and body and confirming it has no parameters or code path that could ever consume those fields; (3) confirming via grep that `WizardInner.tsx` actually passes live `brandingData` into the onboarding provider (making the bug reachable) while EditMode always passes `null` (making EditMode provably unaffected); (4) confirming via grep that all three step components do dispatch their live values, ruling out "the data was never sent" as an alternative, milder explanation. The bug is real, deterministic, and scoped exactly as suspected: branding-onboarding-path-only, not EditMode, not the non-branding onboarding path (both of which use `buildDraftAsPaikka`, confirmed correct).

This is not a regression introduced by plan 51-06 (which only touched `StepMediat.tsx`) — it is a pre-existing gap in the original phase-51 implementation that escaped the first two verification rounds because those rounds were focused on the media-staleness defect chain (CR-01 original → WR-01) and did not independently trace the branding/non-branding split in `livePreviewPaikka`'s derivation.

**Recommendation:** A plan 51-07 gap-closure plan should overlay `state.hinnasto`/`aukioloajat`/`yhteystiedot` onto `buildBrandingPreview`'s output inside `LivePreviewContext.tsx`'s branding branch, exactly as proposed in the fresh `51-REVIEW.md`'s CR-01 fix snippet (using `hinnastaToHintaKuvaus` for the price serialization, falling back to the branding-derived base values when the live state field is empty/unset so a fresh AI-onboarding session still shows scraped data before the user edits anything). This is a small, single-file, well-scoped change matching the shape of plans 51-05/51-06's own fixes. Until it lands, LIVEPREV-04 and success criterion #4 (and, more narrowly now, criterion #1 for three of five onboarding steps) remain unsatisfied for the branding-onboarding path specifically.

---

*Verified: 2026-06-18*
*Verifier: Claude (gsd-verifier)*
