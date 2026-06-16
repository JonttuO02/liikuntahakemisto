# Phase 48: Logo-, väri- ja galleriavalinta - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-16
**Phase:** 48-Logo-, väri- ja galleriavalinta
**Areas discussed:** Picker placement & flow, Gallery prefill in StepMediat, PATCH route validation, Color picker UX

---

## Picker placement & flow

| Option | Description | Selected |
|--------|-------------|----------|
| Inline in StepEsikatselu | Add picker to existing preview step (step 6), live preview update | |
| New dedicated step | Insert a new step between Mediat and Esikatselu | |
| You decide | Claude picks based on cleanest implementation | |

**User's choice:** Free text — "The whole AI-assisted workflow should be in the same step. Adding url, then choosing the logo and colors etc. Then possibility to see the results and submit." Resolved to: everything happens in the existing pre-vaihe screen (`AnalysoiSivusto.tsx`), not StepEsikatselu and not a new step.

| Option | Description | Selected |
|--------|-------------|----------|
| Selection only, continue to wizard | Quick-submit stays Phase 50's job | |
| Also allow direct submit here | Pulls Phase 50's quick-accept forward into Phase 48 | ✓ |

**User's choice:** Also allow direct submit here.
**Notes:** This required a roadmap edit (FLOW-02/03 moved from Phase 50 to Phase 48), confirmed and executed mid-discussion:

| Option | Description | Selected |
|--------|-------------|----------|
| Move FLOW-02/03 into 48, keep 01/04 in 50 | Phase 48 = selection + quick-accept; Phase 50 = reorder + draft migration only | ✓ |
| Move all of FLOW-01..04 into 48 too | Phase 48 absorbs all of Phase 50, which is then emptied | |

**User's choice:** Move FLOW-02/03 into 48, keep 01/04 in 50.
**Notes:** ROADMAP.md and REQUIREMENTS.md updated and committed (`f13369a`) before continuing discussion.

---

## Gallery prefill in StepMediat

| Option | Description | Selected |
|--------|-------------|----------|
| Select in pre-vaihe screen | Gallery picker added to the consolidated preview screen | ✓ |
| Keep selection in StepMediat | Gallery candidates only shown later in step 2 | |

**User's choice:** Select in pre-vaihe screen.

| Option | Description | Selected |
|--------|-------------|----------|
| Checkable thumbnail grid, pre-checked up to 5 | Up to 8 scraped images, first 5 pre-checked | ✓ |
| Checkable grid, nothing pre-checked | Same grid, no defaults | |

**User's choice:** Checkable thumbnail grid, pre-checked up to 5.

| Option | Description | Selected |
|--------|-------------|----------|
| Treated as existing photos | Flows into StepMediat's existingPhotoUrls, unified grid | ✓ |
| Re-shown as separate suggestion section | Distinct UI section in StepMediat | |

**User's choice:** Treated as existing photos.

---

## PATCH route validation

| Option | Description | Selected |
|--------|-------------|----------|
| Autosave on each pick | Every selection PATCHes immediately | ✓ |
| Batched on Continue/Quick-accept | One PATCH at action time | |

**User's choice:** Autosave on each pick.

| Option | Description | Selected |
|--------|-------------|----------|
| Modify submit route with submission_type flag | New param, branches on quick-accept | |
| Write a draft row, reuse submit unmodified | Map AI results into onboarding_draft, call existing submit route as-is | ✓ |

**User's choice:** Write a draft row, reuse submit unmodified.
**Notes:** REQUIREMENTS.md's FLOW-03 text originally said "via a submission_type flag" — corrected to match this decision (commit `33bf901`).

| Option | Description | Selected |
|--------|-------------|----------|
| Index/hex membership + ownership | Validates AI-candidate selections against stored analysis | |
| Ownership only, accept any logo/color value | No membership check | (initially selected) |

**User's choice:** Initially picked "Ownership only" — flagged by Claude as conflicting with ROADMAP.md success criterion 4 ("selection that doesn't belong to the stored analysis result is rejected"). Re-asked:

| Option | Description | Selected |
|--------|-------------|----------|
| Validate index/hex membership after all | Satisfies success criterion 4 | |
| Drop/relax success criterion 4 | Edit ROADMAP.md instead | |

**User's clarifying answer (free text):** "There should be possibility to add logo, photos and colours that havent been found by AI agent also." — revealed the real intent was a manual-override path, not relaxing validation. Resolved to: membership validation applies to AI-candidate selections (satisfying criterion 4); a separate manual-override path exists for values not from the AI's candidates.

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — add a custom hex input | Manual color override alongside AI swatches | ✓ |
| No — AI candidates only for colors | No manual override for colors | |

**User's choice:** Yes — add a custom hex input. (Logo/photos already have a manual path via StepMediat's existing upload flow — no new UI needed for those.)

---

## Color picker UX

| Option | Description | Selected |
|--------|-------------|----------|
| Swatches + two labeled slots | Click swatch, assign to background/accent slot | ✓ |
| Two dropdowns | <select> elements for background/accent | |

**User's choice:** Swatches + two labeled slots.

| Option | Description | Selected |
|--------|-------------|----------|
| Pre-fill from AI role tags | background/accent slots default from role-tagged colors | ✓ |
| Start empty, force explicit choice | No defaults | |

**User's choice:** Pre-fill from AI role tags.

| Option | Description | Selected |
|--------|-------------|----------|
| Fall back gracefully, allow continuing | Missing colors don't block Continue/Quick-accept | ✓ |
| Require at least 1 manual pick before continuing | Disable Continue until both slots set | |

**User's choice:** Fall back gracefully, allow continuing.

---

## Claude's Discretion

- Exact visual styling of logo radio-picker, swatch row, gallery checkbox grid (within existing glassmorphism design system)
- Exact PATCH request/response shape and error messages
- Exact `raw_analysis` → `onboarding_draft` mapping logic for quick-accept
- Native `<input type="color">` vs styled hex text field for the custom color override

## Deferred Ideas

- Modifying `submit/route.ts` directly (submission_type flag approach) — rejected in favor of draft-mapping approach
- FLOW-01/FLOW-04 (step reorder, draft migration) — remain Phase 50
- StepEsikatselu CalloutCard swap, contrast-safe logo primitive — Phase 49
- Live preview during wizard editing — Phase 51
