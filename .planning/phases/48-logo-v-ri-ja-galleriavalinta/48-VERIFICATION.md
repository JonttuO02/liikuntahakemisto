---
phase: 48-logo-v-ri-ja-galleriavalinta
verified: 2026-06-16T19:51:50Z
status: gaps_found
score: 4/6 must-haves verified
overrides_applied: 0
gaps:
  - truth: "Submitting the gallery/logo selection and continuing into the wizard ('Jatka velhoon →') reliably shows the prefilled images in the Mediat step (Step 2), satisfying ROADMAP Success Criterion 3"
    status: failed
    reason: "page.tsx's handleConfirm POSTs save-step with step:2, which makes save-step's UPSERT set current_step:3. WizardInner's OnboardingMode loadDraft() effect reads savedStep=3, sees savedStep>1 && step===1, and redirects straight to ?step=3 (StepHinnasto). Step 2 (StepMediat) — the only place the prefilled gallery/logo render inside the wizard — is silently skipped for every business that uses 'Jatka velhoon →'. This is CR-01 from 48-REVIEW.md, confirmed still present at HEAD (no commit after the Phase 48 commits touches page.tsx)."
    artifacts:
      - path: "app/business/onboarding/page.tsx"
        issue: "handleConfirm writes save-step with step: 2 instead of step: 1, causing current_step to land one step past Step 2 (Media) in the wizard's auto-resume logic"
    missing:
      - "Change page.tsx handleConfirm's save-step call to step: 1 (so current_step becomes 2, landing the user ON Step 2, not past it) OR explicitly navigate WizardInner with ?step=2 instead of relying on current_step for resume positioning"
  - truth: "The business owner sees their actual chosen/role-correct brand color reflected in the Step 6 preview when no explicit selection exists yet, not an arbitrary AI-extracted color"
    status: failed
    reason: "StepEsikatselu.tsx's brandColor fallback is brandingData?.selected_background_color ?? brandingData?.colors?.[0]?.hex ?? undefined — colors[0] is taken regardless of its semantic role. The analyzer assigns roles ('background','accent','text', etc.) and AnalysoiSivusto.tsx itself filters by role (colors.find(c => c.role === 'background')) when initializing picker state, but StepEsikatselu does not mirror that role-aware lookup. This is CR-02 from 48-REVIEW.md, confirmed still present at HEAD. Reachable in practice via 'Jatka velhoon →' before the user has clicked any swatch (no field is required before the footer buttons are enabled), so an accent- or text-role color can render as the DiagonaalKortti panel's full background fill."
    artifacts:
      - path: "app/business/onboarding/StepEsikatselu.tsx"
        issue: "Line 47-48: brandColor fallback picks colors[0].hex without filtering by role==='background', unlike AnalysoiSivusto.tsx's equivalent role-aware fallback"
    missing:
      - "Mirror AnalysoiSivusto's role-aware fallback: brandingData?.selected_background_color ?? brandingData?.colors?.find(c => c.role === 'background')?.hex ?? undefined"
---

# Phase 48: Logo-, väri- ja galleriavalinta Verification Report

**Phase Goal:** A business owner can see every AI-found logo and color candidate, explicitly choose what represents their brand instead of the system silently auto-picking one, and can accept the AI's results immediately to submit for approval without stepping through the rest of the wizard.
**Verified:** 2026-06-16T19:51:50Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | When multiple logo candidates were found, the user sees them all and picks exactly one (AI's top pick pre-selected) | VERIFIED | `AnalysoiSivusto.tsx:585-631` renders every `logo_candidates` entry as a selectable `<button>` card; `selectedLogoUrl` initialized to `logo_candidates?.[0]?.url` (first/top pick pre-selected); click handler `selectLogo` calls `patchBranding({ selected_logo_url: url }, 'logo')` |
| 2 | The user picks 2 colors from the extracted palette — background + accent — rather than auto-assignment | VERIFIED | `AnalysoiSivusto.tsx:633-751` renders up to 6 swatches + `Tausta`/`Aksentti` slot cards + custom hex input; `handleSwatchClick`/slot-arming logic assigns to the armed slot and autosaves via `patchBranding` |
| 3 | Images discovered on the business's website automatically appear as selectable options in the Mediat step's photo picker | FAILED | Gallery picker UI itself is correct (`AnalysoiSivusto.tsx:753-804`, `StepMediat.tsx` reads `initialDraft.media_urls.photos` unconditionally at line 43) — but the only path that writes the gallery selection into the draft and navigates into the wizard ("Jatka velhoon →") triggers a `current_step` value that causes the wizard to skip Step 2 entirely (CR-01). The user navigating this path never sees the Mediat step, so the "appear as selectable options in the Mediat step" criterion is not met for the documented flow. |
| 4 | Submitting a logo/color selection that doesn't belong to that business's own stored analysis result is rejected by the server | VERIFIED | `app/api/business/branding/route.ts:123-148` — logo checked against `logo_candidates[].url` membership (400 on miss), AI-sourced color checked against `colors[].hex` membership (400 on miss), custom hex validated against `/^#[0-9a-fA-F]{6}$/`, gallery URLs checked against stored `image_urls` membership (400 on miss) |
| 5 | After AI analysis (and selection) completes, the user can accept results in one action and land directly in the admin approval queue without stepping through remaining wizard screens | VERIFIED | `AnalysoiSivusto.tsx:257-334` `handleQuickAccept` maps `raw_analysis` + selections into draft fields, sequentially POSTs `save-step` (step 6) for `hinnasto`/`aukioloajat`/`yhteystiedot`/`media_urls`, then POSTs `submit`, then `router.push('/business')` — entirely bypasses `setPagePhase('wizard')` and the wizard step machinery, so this specific button is unaffected by CR-01 |
| 6 | A quick-accepted submission passes through the same ownership/validation/draft-cleanup logic as a normal full-wizard submission — no second, less-guarded write path | VERIFIED | `git log` shows no Phase 48 commit touches `app/api/business/onboarding/submit/route.ts` or `save-step/route.ts` (last touch predates Phase 48 by 8 commits); quick-accept calls these routes verbatim with the same body shapes the full wizard uses |

**Score:** 4/6 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/api/business/branding/route.ts` | Validated PATCH autosave route | VERIFIED | Auth, ownership-only check, logo/color/gallery membership validation, scoped UPSERT — all present and substantive |
| `lib/branding/brandingResult.ts` | Reshaped BrandingResult + buildBrandingPreview(selectedLogoUrl) | VERIFIED | Type contains `logo_candidates`, `image_urls`, `selected_background_color`, `selected_accent_color`; `getContrastColor` unchanged |
| `app/api/business/analyze-website/route.ts` | POST ownership check relaxed to ownership-only | VERIFIED | No `claim_status` filter remains in POST; GET unchanged; business-account + SSRF guards intact |
| `app/business/onboarding/AnalysoiSivusto.tsx` | Logo/color/gallery pickers + autosave + quick-accept | VERIFIED (UI) / WIRED | All three pickers render, autosave via `patchBranding`, `handleQuickAccept` implemented and self-contained |
| `app/business/onboarding/page.tsx` | paikka_id resolution (Suspense-safe) + handleConfirm awaits save-step before navigating wizard | PARTIAL | Suspense pattern correct (`PrePhase` child calls `useSearchParams()`); `await fetch(...)` does precede `setPagePhase('wizard')` (closing the race per T-48-15) — but the awaited write itself encodes the wrong step number (CR-01), so the await is correct but the destination step is wrong |
| `app/business/onboarding/StepEsikatselu.tsx` | Role-aware brandColor fallback for DiagonaalKortti background | STUB-LIKE BUG | `colors[0]` fallback present without role filter (CR-02) — the artifact exists and compiles but produces incorrect data when the fallback path is taken |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `AnalysoiSivusto.tsx` (logo/color/gallery selection) | `/api/business/branding` PATCH | `patchBranding` fetch | WIRED | Confirmed 3 distinct `patchBranding(...)` call sites (logo, colors, gallery) + definition |
| `AnalysoiSivusto.tsx handleSubmit/checkStatus/poll` | `/api/business/analyze-website` | `paikka_id` query/body param | WIRED | `paikkaId` prop threaded into all three fetch call sites |
| `page.tsx handleConfirm` | `/api/business/onboarding/save-step` | awaited fetch before `setPagePhase('wizard')` | WIRED BUT WRONG VALUE | The await ordering is correct (closes the WizardInner draft-fetch race, T-48-15) but `step: 2` in the body causes `current_step=3`, which causes `WizardInner`'s auto-resume to skip past Step 2 — see CR-01 |
| `AnalysoiSivusto.tsx handleQuickAccept` | `/api/business/onboarding/submit` | unmodified submit route | WIRED | `submit/route.ts` confirmed unchanged via git log; same body shape `{ paikka_id }` |
| `StepEsikatselu.tsx` | `DiagonaalKortti` brandColor prop | `selected_background_color ?? colors[0].hex` | WIRED BUT DATA-INCORRECT | Link exists and renders, but the fallback value is not guaranteed to be a background-role color (CR-02) |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `StepMediat.tsx` `existingPhotoUrls` | `initialDraft.media_urls.photos` | `onboarding_draft` row written by `handleConfirm`'s save-step call | Real data when the draft write lands AND the user reaches Step 2 | DISCONNECTED — the write itself is correct, but the component never mounts for the "Jatka velhoon" flow because of CR-01's step-skip |
| `StepEsikatselu.tsx` `brandColor` | `brandingData.selected_background_color` or `colors[0].hex` | `business_branding` row (already analyzed) | Real data, but potentially wrong-role when no selection exists yet | STATIC/WRONG-ROLE FALLBACK per CR-02 |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| ONBOARD-14 | 48-02 | User selects one logo from multiple candidates | SATISFIED | Logo picker UI + autosave + server validation all present |
| ONBOARD-15 | 48-02 | User selects 2 colors (background + accent) | SATISFIED | Swatch + slot + custom-hex picker, autosave present |
| ONBOARD-16 | 48-03 | Scraped gallery images prefill the Mediat step's photo selection | BLOCKED | Gallery picker UI and the StepMediat read-side are both correct in isolation, but CR-01 makes Step 2 unreachable via the documented continuation path — the prefill is never seen by the user in the "Jatka velhoon →" flow |
| ONBOARD-17 | 48-01 | PATCH /api/business/branding validates selections against stored analysis | SATISFIED | `branding/route.ts` membership checks confirmed for logo, AI color, custom hex format, gallery |
| FLOW-02 | 48-03 | User can quick-accept and skip remaining wizard steps, submitting to admin queue | SATISFIED | `handleQuickAccept` fully bypasses the wizard, calls submit directly |
| FLOW-03 | 48-03 | Quick-accept reuses existing submit route's invariants unmodified | SATISFIED | `submit/route.ts` and `save-step/route.ts` confirmed unchanged by Phase 48 commits |

No orphaned requirements — all 6 IDs declared across the three plans (`ONBOARD-14`, `ONBOARD-15`, `ONBOARD-16`, `ONBOARD-17`, `FLOW-02`, `FLOW-03`) match the 6 IDs the ROADMAP and REQUIREMENTS.md assign to Phase 48 exactly.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `app/business/onboarding/page.tsx` | 106-118 | Logically incorrect `step` value passed to a working API contract (not a stub, but a wrong-value bug) | BLOCKER | Causes CR-01 — Step 2 of the wizard is silently unreachable via the primary continuation path, breaking ONBOARD-16/Success Criterion 3 |
| `app/business/onboarding/StepEsikatselu.tsx` | 47-48 | Non-role-aware color fallback duplicated incorrectly from a role-aware sibling implementation | BLOCKER (data-integrity, ties to phase goal "explicitly choose what represents their brand") | Can render the wrong color as the venue's preview background, undermining the "explicit choice over silent auto-pick" goal the phase exists to deliver |

No `TBD`/`FIXME`/`XXX` markers found in phase-modified files. No placeholder/"coming soon" copy found. No empty-array/empty-object hollow-prop patterns found in the picker or quick-accept logic — all rendered data traces back to live `brandingResult` state populated by the `analyze-website` GET/POST cycle.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `npx tsc --noEmit` across whole project | `npx tsc --noEmit` | No output (clean) | PASS |
| `save-step` UPSERT sets `current_step: step + 1` | Read `save-step/route.ts:107` | Confirmed `current_step: step + 1` | PASS (confirms CR-01's root cause) |
| `WizardInner` auto-resume redirect condition | Read `WizardInner.tsx:119-125` | `savedStep > 1 && step === 1` → redirect to `?step=savedStep` | PASS (confirms CR-01's mechanism) |
| `submit`/`save-step` routes unchanged by Phase 48 | `git log --oneline -- <path>` | Last touch predates Phase 48 commits | PASS |

### Probe Execution

No `scripts/*/tests/probe-*.sh` files found and none declared in PLAN/SUMMARY files for this phase. Skipped — no runnable probes for this phase.

### Human Verification Required

None — both remaining gaps (CR-01, CR-02) are deterministically traceable through code (save-step's `current_step: step + 1` arithmetic, WizardInner's resume-redirect condition, and the unguarded `colors[0]` fallback), so they do not require human/manual testing to confirm. They do require a human decision on whether to fix now or accept as a tracked follow-up, since both were already flagged by code review and intentionally left unresolved as of this verification.

### Gaps Summary

Two of six ROADMAP success criteria are not genuinely met despite SUMMARY.md claiming the phase complete:

1. **Success Criterion 3** (gallery images appear as selectable options in the Mediat step) is undermined by **CR-01**: `page.tsx`'s `handleConfirm` writes `save-step` with `step: 2`, which the save-step route turns into `current_step: 3`. `WizardInner`'s on-mount draft-resume logic then redirects every "Jatka velhoon →" user straight to Step 3 (Hinnasto), permanently skipping Step 2 (Media) for the entire session unless the user manually navigates back. The prefill data is correctly persisted and the read-side (`StepMediat.tsx`) is correctly wired — the break is purely in the step-number arithmetic feeding the wizard's resume logic. This is a one-line-class fix (use `step: 1` so `current_step` becomes 2, or navigate explicitly to `?step=2`), but it is unresolved at HEAD.

2. **CR-02** undermines the "explicitly choose what represents their brand" half of the phase's stated goal: `StepEsikatselu.tsx`'s `brandColor` fallback ignores color `role` and can select an accent/text-role color as the full DiagonaalKortti background panel fill whenever the user reaches Step 6 (or the preview state) without having explicitly clicked a swatch — which is possible since no color selection is required before the footer buttons activate. `AnalysoiSivusto.tsx` itself demonstrates the correct role-aware pattern in its own initialization logic, making this an inconsistency within the same phase's own code, not a hard problem.

Both gaps were already identified and documented with concrete fixes in `48-REVIEW.md` (dated the same day as this verification) but remain unaddressed in the current HEAD — no commit since the Phase 48 task commits touches either file. This verification independently re-derived both bugs from first principles (tracing `save-step`'s UPSERT and `WizardInner`'s resume-redirect logic; comparing `StepEsikatselu`'s fallback against `AnalysoiSivusto`'s role-aware equivalent) before consulting the review file, confirming the findings are not stale.

The remaining four success criteria (1, 2, 4, 5, 6) are genuinely implemented: the logo/color pickers are interactive and autosaved, server-side membership validation is real and substantive, and the quick-accept path is fully self-contained and correctly reuses the unmodified submit/save-step routes — FLOW-02 and FLOW-03 are solid because quick-accept never goes through `setPagePhase('wizard')` and is therefore unaffected by CR-01.

**This looks like an oversight, not an intentional deviation** — both CR-01 and CR-02 have a known, narrow fix already specified in `48-REVIEW.md`. No override is suggested; these should be closed via a follow-up plan (e.g. `/gsd:plan-phase 48 --gaps`) rather than accepted as-is, since they directly undermine ROADMAP Success Criterion 3 and the phase's core "explicit choice, not silent auto-pick" goal statement.

---

_Verified: 2026-06-16T19:51:50Z_
_Verifier: Claude (gsd-verifier)_
