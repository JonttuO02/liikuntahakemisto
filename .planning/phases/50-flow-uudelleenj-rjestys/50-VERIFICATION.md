---
phase: 50-flow-uudelleenj-rjestys
verified: 2026-06-17T14:10:00Z
status: passed
score: 2/2 must-haves verified
overrides_applied: 0
---

# Phase 50: Flow-uudelleenjärjestys Verification Report

**Phase Goal (ROADMAP.md):** "A business owner identifies or creates their venue before being asked to analyze a website."
**Requirements (ROADMAP.md / REQUIREMENTS.md):** FLOW-01, FLOW-04
**Verified:** 2026-06-17T14:10:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Scope Note: "Quick-Accept" Wording in the Roadmap One-Liner

The milestone summary line in ROADMAP.md reads "Phase 50: Flow-uudelleenjärjestys & pikahyväksyntä — StepPaikka before URL-analysis; quick-accept into admin queue". This is stale/leftover wording from before a scope change. The authoritative **Phase Details** section for Phase 50 (ROADMAP.md lines 246-261) lists only FLOW-01 and FLOW-04 as this phase's requirements, with an explicit note: *"FLOW-02/FLOW-03 (quick-accept) moved to Phase 48 at user request — see Phase 48's note."* REQUIREMENTS.md confirms FLOW-02/FLOW-03 are mapped to Phase 48 and marked Complete there. Both 50-01-PLAN.md and 50-02-PLAN.md declare `requirements: [FLOW-04]` and `[FLOW-01, FLOW-04]` respectively — neither plan claims FLOW-02/03.

**Conclusion:** Quick-accept is NOT in scope for Phase 50. This is not a gap; the roadmap one-liner is just an unedited artifact of an earlier scope draft. Verification proceeds against FLOW-01 and FLOW-04 only, per the authoritative Phase Details / REQUIREMENTS.md mapping.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A new business owner sees the venue-identification step (StepPaikka) before being asked for a website URL to analyze (FLOW-01) | VERIFIED | `app/business/onboarding/page.tsx`: `PagePhase = 'paikka' \| 'analyze' \| 'wizard'`, initial state `'paikka'` (line 164). `pagePhase === 'paikka'` branch (lines 225-232) renders `StepPaikkaPrePhase` → `<StepPaikka>`, and only on `onNext` does `pagePhase` advance to `'analyze'` which renders `AnalysoiSivusto` via `PrePhase` (lines 233-242). StepPaikka.tsx itself is untouched (`git log` shows last touch was Phase 34's creation commit `84cd476`, confirming it was relocated, not rewritten). `WizardInner.tsx`'s `OnboardingMode` no longer imports or renders `StepPaikka` at all. |
| 2 | A business that started onboarding before this reorder shipped can resume their in-flight draft without getting stuck on a stale step number (FLOW-04) | VERIFIED | Backend: `supabase/migrations/20260617000000_renumber_onboarding_steps.sql` contains exactly `UPDATE onboarding_draft SET current_step = current_step - 1 WHERE current_step >= 2;`, confirmed applied to the **live** remote DB via `npx supabase migration list` (20260617000000 appears in both local and remote columns). App side: all 5 step-literal callers (`StepMediat`→1, `StepHinnasto`→2, `StepAukioloajat`→3, `StepYhteystiedot`→4, `AnalysoiSivusto.handleQuickAccept`→5) and `WizardInner.tsx`'s bounds (`rawStep > 5`), resume-bounce guard (clamped to 5, `WizardInner.tsx:131-143`), and preview-refetch trigger (`step !== 5`) all consistently use the new 1-5 numbering matching the migrated DB values. `save-step/route.ts` accepts input 0-5 (was 1-6), with the 0-floor specifically required to support `handleConfirm`'s non-blocking `step:0` pre-save without a silent 400. |

**Score:** 2/2 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260617000000_renumber_onboarding_steps.sql` | One-time UPDATE decrementing in-flight `current_step` (D-06) | VERIFIED | Exact statement present, no DDL, comment header naming D-06; confirmed applied remotely |
| `app/api/business/onboarding/save-step/route.ts` | Tightened bounds check (D-07) | VERIFIED | `parsedStep < 0 \|\| parsedStep > 5` (line 68); comment explicitly documents the 1-6 quick-accept exception post-review-fix (WR-02, commit `95b1627`) |
| `app/business/onboarding/page.tsx` | 3-phase page router: StepPaikka → AnalysoiSivusto → wizard (D-01) | VERIFIED | `PagePhase` 3-value union; `StepPaikkaPrePhase` resolves paikka_id/info and renders `<StepPaikka>`; `PrePhase` now accepts an already-resolved `paikkaId` prop (WR-01 fix, commit `3c056eb`) to avoid redundant fetch |
| `app/business/WizardInner.tsx` | 5-step `OnboardingMode` (StepMediat=1...StepEsikatselu=5), StepPaikka removed (D-02) | VERIFIED | No `step === 6` literal; no `<StepPaikka` render; `rawStep > 5` bound; `step !== 5` preview guard; `goToStep` and `completedSteps`/resume-bounce math now clamp to the 1-5 range (CR-01/WR-03 fix, commit `2396203`); EditMode (`[1,2,3,4,5].map`, `router.push` targets) unchanged |
| `app/business/onboarding/ProgressBar.tsx` | 5-entry `stepLabels`, no Place-name label (D-08) | VERIFIED | `stepLabels` array has exactly 5 entries (Media, Pricing, Hours, Contact, Preview); `stepPlaceName` i18n key preserved in `messages/en.json`/`messages/fi.json` and still used by `StepPaikka.tsx` line 22 |
| `app/business/onboarding/StepMediat.tsx` / `StepHinnasto.tsx` / `StepAukioloajat.tsx` / `StepYhteystiedot.tsx` / `AnalysoiSivusto.tsx` | Renumbered `step:` literals (1,2,3,4,5) | VERIFIED | Grep confirms `step: 1`, `step: 2`, `step: 3`, `step: 4`, `step: 5` respectively, matching plan exactly |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `page.tsx` (`pagePhase==='paikka'`) | `StepPaikka` | `StepPaikkaPrePhase` wrapper render | WIRED | Renders before `analyze`/`wizard` phases; `onNext` advances phase |
| `WizardInner.tsx` step components | `/api/business/onboarding/save-step` | `saveAndAdvance` → fetch with renumbered `step` args | WIRED | All 4 wizard-step callers send 0-4-equivalent literals (1-4 input mapped from plan's task), `AnalysoiSivusto` sends 5 |
| `save-step` route | `onboarding_draft.current_step` | `current_step: step + 1` UPSERT | WIRED | Unchanged mapping; confirmed consistent with migration's decremented values |
| `WizardInner.tsx` StepMediat `onPrev` | `page.tsx` `handleBackToAnalyze` | `onBackToAnalyze` callback prop threaded through `WizardInnerProps` | WIRED | Confirmed in both files; this was the UAT-caught dead-end bug (commit `31714be`), now fixed and live-reverified by the user per 50-02-SUMMARY.md |

### Post-Review Fix Verification (50-REVIEW.md: 1 Critical + 3 Warning)

| Finding | Severity | Fix Commit | Verified in Code |
|---------|----------|------------|-------------------|
| CR-01: stale `current_step=6` from quick-accept causes spurious step-6 redirect / wrongly marks StepEsikatselu completed | Critical | `2396203` | `WizardInner.tsx` lines 57-58 (`goToStep` clamps `Math.min(Math.max(n,1),5)`), lines 68-73 (`clampedCurrentStep` for `completedSteps`), line 138 (`clampedSavedStep` for resume-bounce) — all present |
| WR-01: `StepPaikkaPrePhase` and `PrePhase` both independently re-resolve `paikka_id` | Warning | `3c056eb` | `PrePhase` now accepts `paikkaId: knownPaikkaId` prop and skips its own `useEffect` resolution when `knownPaikkaId !== null` (page.tsx lines 100-101, 115, 118); call site passes `paikkaId={paikkaId}` (line 236) |
| WR-02: route comment overstates the "1-5" stored-range guarantee | Warning | `95b1627` | `save-step/route.ts` lines 59-66 now explicitly documents the 1-6 quick-accept exception and the downstream clamp obligation |
| WR-03: `goToStep`/resume-bounce URL builder don't clamp the target step | Warning | `2396203` (same commit as CR-01) | Same `goToStep` clamp covers this; resume-bounce block (lines 138-143) also clamps |
| IN-01 (info): StepPaikka has no error state when paikkaId never resolves | Info | Not fixed | Pre-existing since Phase 34; informational only, not a Phase 50 blocker |
| IN-02 (info): migration has no idempotency-warning comment | Info | Not fixed | Informational only, accepted risk per plan's threat model T-50-02 |

All Critical and Warning findings are fixed and confirmed present on master. The two Info-level findings were not addressed, which is consistent with their non-blocking classification in the review.

### Anti-Patterns Found

None. Grepped all 10 files touched across both plans (`page.tsx`, `WizardInner.tsx`, 4 Step* components, `AnalysoiSivusto.tsx`, `ProgressBar.tsx`, `save-step/route.ts`, the migration file) for `TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER` — zero matches.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Type safety across all modified files | `npx tsc --noEmit` | 0 errors | PASS |
| Full test suite | `npx vitest run` | 14 test files, 176 tests, all passed | PASS |
| Migration applied to live remote DB | `npx supabase migration list` | `20260617000000` present in both local and remote columns | PASS |
| Step literal renumbering across all callers | `grep -n "step:" Step*.tsx AnalysoiSivusto.tsx` | `1, 2, 3, 4, 5` in StepMediat/Hinnasto/Aukioloajat/Yhteystiedot/AnalysoiSivusto respectively | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|--------------|--------|----------|
| FLOW-01 | 50-02 | StepPaikka renders before URL-analysis step | SATISFIED | page.tsx 3-phase router confirmed; StepPaikka renders first |
| FLOW-04 | 50-01, 50-02 | In-flight drafts resume correctly after reorder | SATISFIED | Migration applied live + app-side literals/bounds all consistent with migrated values |

**Note:** REQUIREMENTS.md still shows FLOW-01 and FLOW-04 as `[ ]` (unchecked/"Pending") at time of this verification — this reflects that the checkbox-update commit (the `docs(N): verification passed, mark X complete` pattern seen for Phase 49 at commit `3b6273b`) has not yet been made. This is a documentation bookkeeping step that follows verification, not a code gap. It should be updated as part of phase close-out.

### Human Verification Required

None. 50-02's plan included a `checkpoint:human-verify` task (Task 4) that was already executed live by the user during phase execution — per 50-02-SUMMARY.md, the user verified the reordered flow twice: once for the initial reorder, and again after the back-button dead-end fix (commit `31714be`). No further human verification items remain outstanding for this phase's goal.

### Gaps Summary

No gaps. Both observable truths (FLOW-01, FLOW-04) are verified in the actual codebase, not just claimed in SUMMARY.md. All artifacts exist, are substantive (no stubs/placeholders), and are wired correctly. The post-review fixes for the 1 Critical + 3 Warning findings from 50-REVIEW.md are all present and verified directly in the current code (not just claimed by commit message) on master. `npx tsc --noEmit` and `npx vitest run` both pass cleanly. The live database migration is confirmed applied via `supabase migration list`. The "quick-accept into admin queue" wording in the ROADMAP milestone summary line is stale; the authoritative Phase Details section and REQUIREMENTS.md confirm that scope belongs to Phase 48 (already shipped), not Phase 50 — so its absence here is correctly out of scope, not a missed requirement.

The only outstanding administrative item is updating REQUIREMENTS.md's FLOW-01/FLOW-04 checkboxes from `[ ]` to `[x]`, which is a documentation step that normally follows a passing verification report such as this one.

---

_Verified: 2026-06-17T14:10:00Z_
_Verifier: Claude (gsd-verifier)_
