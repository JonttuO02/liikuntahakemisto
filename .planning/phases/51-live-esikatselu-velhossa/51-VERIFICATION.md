---
phase: 51-live-esikatselu-velhossa
verified: 2026-06-18T01:00:00Z
status: gaps_found
score: 4/5 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 4/5
  gaps_closed:
    - "CR-01: StepMediat dispatched local blob: URLs into LivePreviewContext with no debounce and revoked them on unmount without ever clearing/replacing them in context state — fixed by plan 51-05's new unmount-only useEffect (lines 99-110) that dispatches SET_MEDIA with existingLogoUrl/existingPhotoUrls before the revocation effects' blobs go dead."
  gaps_remaining:
    - "WR-01 (newly found by the post-gap-closure code review, independently confirmed by this verification): the plan 51-05 fix itself has a stale-closure bug. The unmount effect has an empty dependency array, so it only runs (and its cleanup closure is only created) once, at mount. If the user saves new media in EditMode (handleSave calls setExistingLogoUrl/setExistingPhotoUrls at lines 344-345) and then unmounts StepMediat by switching tabs WITHOUT an intervening remount, the cleanup closure still references the pre-save existingLogoUrl/existingPhotoUrls captured at the original mount, not the just-saved values. The unmount dispatch therefore re-broadcasts stale (pre-save) data into the shared live preview — the exact 'stale data' failure mode criterion #4 prohibits, now manifesting on the save path instead of the staged-blob path."
  regressions: []
gaps:
  - truth: "The live preview renders via CalloutCard/DiagonaalKortti using the current in-progress (unsaved) field values, not stale data from the last save"
    status: partial
    reason: "Independently confirmed via direct code reading of app/business/onboarding/StepMediat.tsx (lines 99-110). The CR-01 staged-blob-URL staleness bug from the prior verification round IS fixed (confirmed: dispatches existingLogoUrl/existingPhotoUrls, no blob: URLs in the unmount payload). However, the fix introduces a new, narrower staleness bug (WR-01): the unmount effect's cleanup closure captures existingLogoUrl/existingPhotoUrls at mount time only (empty dependency array means the effect body — and therefore the closure formed inside it — runs exactly once, at mount, and never again). In EditMode, calling handleSave updates existingLogoUrl/existingPhotoUrls via setState (lines 344-345), causing a re-render with fresh values, but the unmount effect does not re-run on that re-render (deps are []), so its already-created cleanup closure keeps referencing the original pre-save values. If the user then switches EditMode tabs (unmounting StepMediat) without any earlier remount of the component, the cleanup dispatch sends the stale pre-save existingLogoUrl/existingPhotoUrls into LivePreviewContext, overwriting whatever value the instant SET_MEDIA effect (lines 82-90) had previously synced post-save. This reverts the live preview's media to data from before the save — directly the 'stale data from the last save' scenario criterion #4 names, just relocated from the staged-but-unsaved path (CR-01, now fixed) to the saved-then-navigated-away path (WR-01, not yet fixed)."
    artifacts:
      - path: "app/business/onboarding/StepMediat.tsx"
        issue: "Lines 99-110: unmount-only useEffect ([] deps) whose cleanup closure captures existingLogoUrl/existingPhotoUrls at the single mount-time invocation of the effect body, not at unmount time. A ref (e.g. latestMediaRef, updated via a separate effect keyed on [existingLogoUrl, existingPhotoUrls]) is needed so the cleanup reads current values, not stale ones."
    missing:
      - "Track existingLogoUrl/existingPhotoUrls in a ref (updated on every change via a dependency-tracking useEffect) and have the unmount cleanup read from that ref instead of closing directly over the props/state values, exactly as 51-REVIEW.md's WR-01 fix suggests."
deferred: []
---

# Phase 51: Live-esikatselu velhossa Verification Report

**Phase Goal:** A business owner sees their venue's card update in real time as they fill in any wizard step, instead of only seeing the final result at step 6 — in both the onboarding wizard and the existing-venue EditMode tabs.
**Verified:** 2026-06-18 (second pass)
**Status:** gaps_found
**Re-verification:** Yes — after gap closure (plan 51-05 closed the prior CR-01 gap; this pass independently confirms that closure AND independently investigates a new finding (WR-01) raised by the subsequent code review)

## Goal Achievement

### Observable Truths

| # | Truth (mapped from Success Criteria) | Status | Evidence |
|---|---------|--------|----------|
| 1 | Changing a field on any wizard step immediately updates a live preview without save/reload | ✓ VERIFIED | Unchanged from prior pass: `StepHinnasto`/`StepAukioloajat`/`StepYhteystiedot` dispatch debounced (280ms) `SET_*` actions; `StepMediat` dispatches `SET_MEDIA` instantly on file selection. `LivePreviewContext`'s `useMemo` re-derives synchronously, zero network calls. |
| 2 | Desktop: live preview visible side-by-side with the step being edited | ✓ VERIFIED | Unchanged from prior pass — `WizardInner.tsx` split-view columns confirmed present in both modes (file not touched by plan 51-05). |
| 3 | Mobile: toggle between edit form and preview instead of permanent split | ✓ VERIFIED | Unchanged from prior pass — `LivePreviewToggle` + full content swap confirmed in both modes (file not touched by plan 51-05). |
| 4 | Preview renders via CalloutCard/DiagonaalKortti using current in-progress (unsaved) values, not stale data | ✗ FAILED (gap re-opened under a new defect) | The previously-confirmed CR-01 bug (revoked blob URLs left dangling in context) is fixed by plan 51-05. Independently re-reading the fixed file (`StepMediat.tsx` lines 99-110) surfaces a second, narrower bug (WR-01, first raised by the post-fix code review and independently traced by this verification, not taken on faith): the new unmount effect's cleanup closure is created once at mount (empty deps `[]`) and therefore can never observe `existingLogoUrl`/`existingPhotoUrls` values that change later via `setState` inside `handleSave` (lines 344-345). In EditMode specifically — open Mediat tab, save a new logo, switch to another tab before any remount — the unmount cleanup dispatches the captured pre-save URLs, overwriting the post-save state the instant-SET_MEDIA effect had already pushed into the shared preview context. This is a genuine, reproducible staleness regression on the save-then-navigate path, not a false positive. |
| 5 | EditMode's existing-venue tabs get the same live preview pattern, replacing PreviewModal | ✓ VERIFIED | Unchanged from prior pass — `previewOpen`/`<PreviewModal` both 0 grep hits in `WizardInner.tsx`; file untouched by plan 51-05; dashboard usage in `app/business/page.tsx` intact. |

**Score:** 4/5 truths verified, 1 failed (criterion 4 — gap re-opened by a new, narrower defect introduced by the previous gap-closure fix).

### Independent WR-01 Investigation (requested focus)

**Question:** Does `StepMediat.tsx`'s new unmount effect (added by plan 51-05) dispatch stale (pre-save) or fresh (post-save) values when: user opens Mediat tab in EditMode → saves a new logo (`existingLogoUrl` state updates via `handleSave`) → switches to another tab before any remount?

**Trace, read directly from `app/business/onboarding/StepMediat.tsx`:**

1. Line 33: `const { dispatch } = useLivePreview()`.
2. Lines 37-46: `existingLogoUrl`/`existingPhotoUrls` are component `useState`, seeded once from props at the initial render.
3. Lines 99-110:
   ```tsx
   useEffect(() => {
     return () => {
       dispatch({
         type: 'SET_MEDIA',
         payload: { logo: existingLogoUrl ?? null, photos: existingPhotoUrls },
       })
     }
     // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [])
   ```
   The dependency array is `[]`. React only invokes the effect body once, at mount, in that render's closure scope. The *cleanup function* returned by that single invocation is the only cleanup that will ever run for this effect (until actual unmount) — and that cleanup function's lexical closure captures `existingLogoUrl`/`existingPhotoUrls` as bound in the **mount-time render**, not any later render's values. React does not "refresh" a `[]`-deps effect's closure on subsequent re-renders; that's the entire point of the empty array.
4. Lines 257-356 (`handleSave`): on a successful save, lines 344-345 call `setExistingLogoUrl(finalLogoUrl)` / `setExistingPhotoUrls(finalPhotoUrls)`. This triggers a re-render where the component's local state is fresh, and the **other** effect (lines 82-90, deps include `existingLogoUrl`/`existingPhotoUrls`) re-runs and dispatches the fresh, post-save value into `LivePreviewContext` — so immediately after a save, the live preview *is* correct.
5. The bug: if the user now switches tabs (unmounting `StepMediat`) without `StepMediat` ever having remounted in between, the `[]`-deps effect's cleanup (created once, back at the original mount) fires and dispatches the **original mount-time** `existingLogoUrl`/`existingPhotoUrls` — i.e., whatever the logo/photos were *before* this session's save — overwriting the correct post-save value that step 4 had just pushed into context moments earlier.

**Conclusion: this is a genuine bug, not a false positive.** In the described EditMode scenario, the unmount effect dispatches **stale (pre-save) values**, not fresh (post-save) ones, reverting the shared live preview to outdated media data. This directly violates success criterion #4 ("not stale data from the last save") — ironically using almost the same wording the criterion itself uses. The code reviewer's WR-01 finding and suggested fix (track current values in a `ref` updated by a separate `useEffect` keyed on `[existingLogoUrl, existingPhotoUrls]`, and read from the ref inside the unmount cleanup instead of closing over the values directly) is correct and would resolve this without reintroducing CR-01 or the out-of-scope `RESET` action.

**Scope note:** This bug only manifests in the save-then-navigate-without-remount sequence. The staged-but-unsaved-blob scenario from CR-01 (the original gap) remains fixed — a user who stages a logo and leaves *without* saving still correctly falls back to the persisted media, because in that path `existingLogoUrl` never changed since mount, so the stale closure value and the "correct" value are identical. The bug is specifically about the *save* path.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/business/onboarding/StepMediat.tsx` | Unmount-time SET_MEDIA dispatch replacing stale blob URLs | ✓ EXISTS, ✓ SUBSTANTIVE, ⚠️ WIRED-BUT-DEFECTIVE | The artifact required by plan 51-05's must_haves exists exactly where specified (lines 99-110), dispatches `SET_MEDIA` with non-blob `existingLogoUrl`/`existingPhotoUrls` as required, contains zero `RESET` dispatches (confirmed via grep), and the two pre-existing revocation effects + the instant SET_MEDIA effect are unchanged. It closes CR-01 exactly as designed. It does NOT, however, satisfy the broader "not stale data" truth in all scenarios — see WR-01 above. |
| `lib/livePreview/LivePreviewContext.tsx` | SET_MEDIA reducer, full replacement semantics | ✓ VERIFIED | Lines 54, 68-81: `SET_MEDIA` accepts `{ logo?, photos? }` and the reducer branch fully replaces both keys when supplied — confirmed unchanged from prior pass. `RESET` (lines 55, 82-83) remains dead code (zero dispatch call sites in `app/`), unchanged — flagged again as IN-01 in the fresh review but not blocking. |
| `.planning/REQUIREMENTS.md` | LIVEPREV-01–04 traceability rows | ✗ STILL UNCHECKED | LIVEPREV-01 through LIVEPREV-04 remain `[ ]` / "Pending" in both the requirements list (lines 45-48) and the Traceability table (lines 81-84), unchanged from the prior verification pass. Plan 51-05's SUMMARY claims `requirements-completed: [LIVEPREV-04]` but this was never reflected back into REQUIREMENTS.md. Given criterion #4 / LIVEPREV-04 is in fact still failing (WR-01), leaving it unchecked is now the *correct* state — but it should remain unchecked for the right reason (the gap is still open) rather than by omission. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `StepMediat.tsx` (unmount effect) | `LivePreviewContext.tsx` SET_MEDIA reducer | dispatch in cleanup | ✓ WIRED, but dispatches a stale payload in the EditMode save-then-navigate sequence (see WR-01 trace above) — wiring itself is correct, the value flowing through it is sometimes wrong. |
| All other key links from the prior pass (StepHinnasto/StepAukioloajat/StepYhteystiedot → dispatch; WizardInner → LivePreviewProvider/Pane/Toggle; PreviewModal removal) | — | — | ✓ WIRED (unchanged) | None of these files were touched by plan 51-05; re-confirmed via `grep -n "StepMediat" app/business/WizardInner.tsx` showing both mode mount sites (lines 285, 469) still present, consistent with the EditMode scenario being reachable. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Project-wide type safety | `npx tsc --noEmit -p tsconfig.json` | No output (zero errors) | ✓ PASS |
| `RESET` action ever dispatched anywhere in app/ | `grep -rn "RESET" app/business` | no matches | ✗ still none (expected — RESET intentionally out of scope per plan 51-05) |
| `SET_MEDIA` reducer action shape | `grep -n "RESET\|SET_MEDIA" lib/livePreview/LivePreviewContext.tsx` | Lines 54 (type), 68 (case), 55/82 (RESET, dead) | ✓ Confirms full-replacement semantics used correctly by both StepMediat dispatch sites |
| `StepMediat` mounted in both modes | `grep -n "StepMediat" app/business/WizardInner.tsx` | Lines 285 (OnboardingMode), 469 (EditMode) | ✓ Confirms the EditMode save-then-tab-switch scenario in WR-01 is reachable in the actual wired component tree, not hypothetical |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| LIVEPREV-01 | 51-01, 51-03 | Each wizard step updates shared live-preview state on field change | ✓ SATISFIED | Unchanged from prior pass. |
| LIVEPREV-02 | 51-02, 51-04 | Desktop shows live preview side-by-side | ✓ SATISFIED | Unchanged from prior pass. |
| LIVEPREV-03 | 51-02, 51-04 | Mobile shows toggle, no side-by-side | ✓ SATISFIED | Unchanged from prior pass. |
| LIVEPREV-04 | 51-01, 51-02, 51-04, 51-05 | Renders via CalloutCard/DiagonaalKortti using current unsaved values, both modes | ✗ BLOCKED | Plan 51-05's SUMMARY claims this complete, but the fix it shipped introduces WR-01 (independently confirmed above): EditMode save-then-navigate-without-remount re-broadcasts stale pre-save media into the shared preview. The original CR-01 defect (staged-but-unsaved blob staleness) IS fixed; the requirement as a whole is not yet satisfied because a different reproducible staleness path now exists. |

REQUIREMENTS.md correctly still shows all four LIVEPREV IDs as "Pending" — this pass confirms that state is accurate (not stale documentation) given LIVEPREV-04 remains genuinely open.

No orphaned requirements — all 4 LIVEPREV IDs appear in plan frontmatter (51-01 through 51-05) and are accounted for above.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `app/business/onboarding/StepMediat.tsx` | 99-110 | Stale-closure bug: `[]`-deps unmount effect captures `existingLogoUrl`/`existingPhotoUrls` at mount time, never refreshed (WR-01, independently confirmed) | 🛑 Blocker | Re-broadcasts pre-save media URLs into the shared live preview when EditMode's Mediat tab is saved then unmounted without remount — directly violates criterion #4. |
| `lib/livePreview/LivePreviewContext.tsx` | 55, 82-83 | Dead `RESET` action, never dispatched (carried over as IN-01) | ℹ️ Info | Not blocking; flagged again for completeness. |
| `app/business/onboarding/StepHinnasto.tsx` | 253-291 | Table inputs/row buttons not disabled during save/loading (WR-02 in fresh review) | ⚠️ Warning | Race risk between in-flight save and concurrent edits; does not affect live-preview correctness. |
| `app/business/onboarding/StepHinnasto.tsx` | 305-319 | Save-success banner uses inconsistent ternary idiom vs. sibling steps (WR-03 in fresh review) | ⚠️ Warning | Stylistic only. |
| `app/business/onboarding/StepMediat.tsx` | 125-128 | `removeLogoFile` ignores its parameter via blanket eslint-disable (IN-02) | ℹ️ Info | Pre-existing, not introduced by this phase's live-preview goal. |
| `app/business/onboarding/StepAukioloajat.tsx` | 12-20 | `EN_TO_FI` duplicates `FI_TO_EN` by hand (IN-03) | ℹ️ Info | Latent consistency risk, not a live-preview defect. |

No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` markers found in any of the phase-modified files (re-confirmed for `StepMediat.tsx` after the plan 51-05 edit).

### Human Verification Required

None required to establish the gap — WR-01 is confirmed by static closure-semantics reasoning over code actually read in this pass (React's well-defined empty-deps behavior), the same kind of independently-traceable defect as CR-01 was. No UI interaction is needed to know the cleanup closure cannot see post-mount state changes.

If/when WR-01 is fixed (the review's suggested `ref`-based fix), a human should spot-check the exact regression sequence once: open EditMode → Mediat tab → upload and save a new logo → switch to Hinnasto tab without revisiting Mediat → confirm the live preview (sidebar/toggle) still shows the just-saved logo, not the previous one.

### Gaps Summary

**What's fixed:** Plan 51-05 correctly closes the original CR-01 gap. The unmount effect dispatches non-blob `existingLogoUrl`/`existingPhotoUrls`, declared after the two revocation effects and the instant SET_MEDIA effect exactly as specified, with no `RESET` dispatch introduced. `tsc --noEmit` is clean. The staged-but-never-saved blob staleness scenario from the first verification round no longer reproduces.

**What's still open:** The fix itself has a stale-closure defect (WR-01), surfaced by the post-fix code review and independently re-derived and confirmed in this verification by reading `StepMediat.tsx` directly rather than trusting either the review or the plan 51-05 SUMMARY's "complete" claim. Because the unmount effect's dependency array is `[]`, its cleanup closure is fixed at the component's initial mount and can never see values updated later by `setState` (specifically `handleSave`'s `setExistingLogoUrl`/`setExistingPhotoUrls` calls). In EditMode — save a new logo on the Mediat tab, then switch tabs without an intervening remount — the unmount cleanup re-broadcasts the pre-save logo/photo URLs, overwriting the correct post-save value already in the shared preview context. This is a different, narrower instance of the same class of bug success criterion #4 is meant to prevent ("not stale data from the last save") — it just moved from the staged-unsaved-blob path to the saved-then-navigated-away path. It is deterministic and reproducible whenever that exact sequence occurs, not an edge case requiring rare timing.

Pricing, hours, and contact field paths remain correct and unaffected (confirmed unchanged from the prior pass — none of their files were touched by plan 51-05).

**Recommendation:** Apply the review's suggested fix — track `existingLogoUrl`/`existingPhotoUrls` in a `useRef`, updated by a small dependency-tracking `useEffect`, and have the unmount cleanup dispatch from the ref instead of closing over the state variables directly. This is a small, well-scoped change (same shape as plan 51-05's own fix) and should be the basis of a plan 51-06 gap-closure plan before LIVEPREV-04 / criterion #4 can be marked fully satisfied.

---

*Verified: 2026-06-18*
*Verifier: Claude (gsd-verifier)*
