# Phase 50: Flow-uudelleenjärjestys - Context

**Gathered:** 2026-06-17
**Status:** Ready for planning

<domain>
## Phase Boundary

A business owner sees the venue-identification step (`StepPaikka`) before being asked to analyze a website (`AnalysoiSivusto`) — today it's the reverse: `AnalysoiSivusto` renders as a page-level pre-wizard phase first, and `StepPaikka` only appears afterward as wizard Step 1. This phase swaps that order and migrates in-flight `onboarding_draft.current_step` values so resuming drafts land on the correct step after the renumber. Venue creation/claiming itself (via `create-paikka`/`claim-paikka` on `/business/map`) already happens upstream of this wizard entirely — out of scope; `StepPaikka` only ever displayed a read-only confirmation and continues to do so.

</domain>

<decisions>
## Implementation Decisions

### Reorder architecture
- **D-01:** `StepPaikka` moves out of `WizardInner`'s numbered step machine and becomes a new page-level pre-phase in `app/business/onboarding/page.tsx`, mirroring `AnalysoiSivusto`'s existing pre-phase pattern exactly (paikka_id resolved the same way `PrePhase` already resolves it today — URL param first, then `business_paikka_links` lookup). New page-level phase order: `StepPaikka` (pre) → `AnalysoiSivusto` (pre) → wizard.
- **D-02:** The wizard (`WizardInner`, onboarding mode) shrinks to 5 numbered steps: 1=StepMediat, 2=StepHinnasto, 3=StepAukioloajat, 4=StepYhteystiedot, 5=StepEsikatselu. All hardcoded `step:N` literals in `StepMediat.tsx`, `StepHinnasto.tsx`, `StepAukioloajat.tsx`, `StepYhteystiedot.tsx` shift down by 1 from their current values (2→1, 3→2, 4→3, 5→4, 6→5 for `StepEsikatselu`'s implicit final state).
- **D-03:** `AnalysoiSivusto`'s `onSkip` keeps its current behavior unchanged — `setPagePhase('wizard')`, landing the user on the wizard's new Step 1 (StepMediat). No separate "go back to StepPaikka" path; venue identity doesn't change based on whether the user skips URL analysis.
- **D-04:** Quick-accept's media_urls pre-save in `page.tsx`'s `handleConfirm` (currently `step: 1` → `save-step` sets `current_step: 2`, landing the resumed wizard on old Step 2/StepMediat) becomes `step: 0` → `current_step: 1`, landing on new Step 1/StepMediat — same destination step, renumbered.
- **D-05:** `AnalysoiSivusto`'s quick-accept-to-admin-queue write (currently hardcoded `step: 6` before calling `submit`) becomes `step: 5`, staying within the new 1-5 valid range. This value is short-lived in the success path (`submit` deletes the `onboarding_draft` row outright on success) but matters if `submit` fails partway and the draft survives — `5` is the correct in-range value to leave it at.
- **EditMode is NOT part of this reorder.** `WizardInner`'s `EditMode` (existing-venue editing, tabs `[1,2,3,4,5]` at lines 358–430) is a separate mode from onboarding mode and does not include `StepPaikka` or `AnalysoiSivusto` at all today — leave its step numbers and routing untouched.

### In-flight draft migration (FLOW-04)
- **D-06:** A one-time Supabase migration runs at deploy time: `UPDATE onboarding_draft SET current_step = current_step - 1 WHERE current_step >= 2`. Old step 1 (still on `StepPaikka`) stays at 1 — correct either way, since under the new flow `current_step: 1` together with the wizard not yet started just means "show StepPaikka pre-phase," which is exactly where that user already was.
- **D-07:** Tighten the validation range from 1–6 to 1–5 in `app/api/business/onboarding/save-step/route.ts` (currently checks `parsedStep < 1 || parsedStep > 6`, line ~61). There is no DB-level `CHECK` constraint on `onboarding_draft.current_step` today (plain `INT NOT NULL DEFAULT 1`) — no schema change needed beyond the data migration itself, only the route's manual bounds check changes.
- **No app-level fallback/clamp logic needed** beyond the one-time migration — once migrated, all live `current_step` values are correct under the new numbering and the route's tightened bounds check is the only ongoing guard.

### Progress bar & step labels
- **D-08:** `ProgressBar.tsx`'s `stepLabels` array drops its `t('stepPlaceName')` entry — becomes `[stepMedia, stepPricing, stepHours, stepContact, stepPreview]` (5 entries, matching the renumbered 5-step wizard). The `stepPlaceName` i18n key itself is NOT deleted — `StepPaikka`'s own `<h2>{t('stepPlaceName')}</h2>` heading (now in its pre-phase form) still uses it.
- **D-09:** Pre-phases (`StepPaikka` and `AnalysoiSivusto`) show no progress bar at all — matches `AnalysoiSivusto`'s existing behavior exactly today. The progress bar only renders once the user reaches the actual numbered wizard. No new "step 1 of 2" pre-phase indicator — that would be UI scope beyond FLOW-01/FLOW-04.

### Claude's Discretion
- Exact prop/callback shape for the new `StepPaikka` pre-phase wrapper in `page.tsx` (e.g., whether it reuses a `PrePhase`-style wrapper component or a new small one) — follow the existing `PrePhase` function's paikka_id-resolution pattern as the template.
- Whether `paikkaInfo` (venue name/address/city) for the new `StepPaikka` pre-phase is fetched fresh or whether existing fetch logic from `WizardInner` can be reused/extracted — Claude's call based on what's cleanest given `WizardInner` no longer needs to render `StepPaikka` itself.
- Exact wording/order of the SQL migration file naming and comments — follow the existing `supabase/migrations/20260611000000_drop_onboarding_completed.sql` naming convention (timestamp prefix + descriptive slug).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` §FLOW-01, §FLOW-04 — exact requirement text
- `.planning/ROADMAP.md` §"Phase 50: Flow-uudelleenjärjestys" — goal narrowed to step-reorder only (FLOW-02/03 quick-accept moved to Phase 48, see that phase's note)
- `.planning/phases/48-logo-v-ri-ja-galleriavalinta/48-CONTEXT.md` D-03, D-10, D-11 — why quick-accept submission lives in `AnalysoiSivusto`/Phase 48, and why this phase must not touch `submit/route.ts`

### Existing code (read before modifying)
- `app/business/onboarding/page.tsx` — current `PrePhase` pattern (paikka_id resolution via URL param → `business_paikka_links` lookup, lines 24–81) is the template for the new `StepPaikka` pre-phase; `handleConfirm`'s `step: 1` media_urls pre-save (lines 94–126) becomes `step: 0` per D-04
- `app/business/WizardInner.tsx` — onboarding mode's numbered step rendering (lines 239–289, currently `step === 1` through `step === 6`), draft resume logic (`savedStep > 1 && step === 1`, line ~121), forward-skip guard (`step > maxReachedStep + 1`, line ~172); `EditMode` (lines 298+) is untouched per D-05's note
- `app/business/onboarding/StepPaikka.tsx` — read-only venue confirmation component, takes `paikkaInfo`/`paikkaId`/`onNext` props, no side effects; becomes the new pre-phase's rendered component
- `app/business/onboarding/AnalysoiSivusto.tsx` — `onSkip`/`onConfirm` props (D-03/D-04), the `step: 6` quick-accept literal (D-05, ~line 305)
- `app/business/onboarding/StepMediat.tsx`, `StepHinnasto.tsx`, `StepAukioloajat.tsx`, `StepYhteystiedot.tsx` — each has one hardcoded `step: N` literal in their `save-step` call that shifts down by 1 per D-02
- `app/business/onboarding/ProgressBar.tsx` — `stepLabels` array (lines 16–23) loses its first entry per D-08
- `app/api/business/onboarding/save-step/route.ts` — step bounds validation (~line 61, currently `1–6`) tightens to `1–5` per D-07
- `supabase/migrations/20260606000000_onboarding.sql` — `onboarding_draft.current_step INT NOT NULL DEFAULT 1` (line 46), no existing CHECK constraint; new migration file adds the one-time `UPDATE` per D-06
- `supabase/migrations/20260611000000_drop_onboarding_completed.sql` — naming/comment convention to follow for the new migration file

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PrePhase` function in `page.tsx` — paikka_id resolution logic (URL param → `business_paikka_links` lookup) is exactly what the new `StepPaikka` pre-phase needs; do not re-derive this logic, reuse or extract it.
- `StepPaikka.tsx` itself — unchanged component, just relocated from being rendered inside `WizardInner` to being rendered inside `page.tsx`.

### Established Patterns
- Page-level `PagePhase` state machine (`'pre' | 'wizard'`) in `page.tsx` — extend to a 3-phase sequence (e.g. `'paikka' | 'analyze' | 'wizard'`) rather than introducing a separate routing mechanism.
- `save-step` route's `current_step: step + 1` convention (saving at step N sets `current_step` to N+1, the step to resume to) — preserved, just the numeric range shifts.

### Integration Points
- `WizardInner`'s `completedSteps` calculation (`draft.current_step > 1` → steps 1 through current_step-1) automatically still works correctly once `current_step` values are migrated and the wizard's own numbering starts at 1 for StepMediat — no separate fix needed there.
- Phase 51 (live preview) depends on this phase's final wizard step shape being stable — per STATE.md's existing dependency note, unaffected by this reorder since it doesn't touch the field-level step components themselves, only their numbering and the pre-phase sequence ahead of them.

</code_context>

<specifics>
## Specific Ideas

No specific UI/visual requirements beyond what's captured above — this phase is purely a step-order/numbering change, no new screens or visual design needed.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope (FLOW-01, FLOW-04). FLOW-02/FLOW-03 (quick-accept) were already moved to Phase 48 before this discussion began; Phase 51 (live preview) remains untouched and sequenced after Phase 49 per existing roadmap dependencies.

</deferred>

---

*Phase: 50-Flow-uudelleenjärjestys*
*Context gathered: 2026-06-17*
