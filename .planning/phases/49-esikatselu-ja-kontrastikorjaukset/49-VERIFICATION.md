---
phase: 49-esikatselu-ja-kontrastikorjaukset
verified: 2026-06-17T09:00:00Z
status: passed
score: 2/2 must-haves verified
overrides_applied: 0
---

# Phase 49: Esikatselu- ja kontrastikorjaukset Verification Report

**Phase Goal:** What the business owner sees in the onboarding preview matches what will actually be published, and a white or transparent logo is never invisible against a white background anywhere in the app (scope narrowed to AnalysoiSivusto's picker per D-05).
**Verified:** 2026-06-17
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Step 6 of the onboarding wizard shows the same `CalloutCard` venues see live on the map, not the unused `PaikkaKortti` — and venues without coordinates still render a sensible fallback instead of breaking (PREV-02) | VERIFIED | `app/business/onboarding/StepEsikatselu.tsx:10` imports `CalloutCard` from `@/app/components/CalloutCard`; no `PaikkaKortti` import or usage remains anywhere in the file (`grep -n "PaikkaKortti"` returns zero matches). Line 123: `<CalloutCard p={{ ...draftAsPaikka, latitude: draftAsPaikka.latitude ?? 0, longitude: draftAsPaikka.longitude ?? 0 }} />`. Confirmed `CalloutCard`'s render body (`app/components/CalloutCard.tsx`) never references `p.latitude`/`p.longitude` (zero grep matches), so the `?? 0` shim is safe and a null-coordinate draft cannot crash the render. `DiagonaalKortti`/`PaikkaSheet` sections below (lines 127-140) are untouched and still present. |
| 2 | A white or transparent logo is visibly distinguishable in AnalysoiSivusto's logo-candidate picker because the picker uses a shared contrast-safe logo display primitive (PREV-03) | VERIFIED | `app/components/ContrastSafeLogo.tsx` exists: a presentational component rendering an outer `div.w-full.h-12.rounded-lg.bg-[rgba(0,0,0,0.06)]...` wrapping an `<img object-contain>`. `app/business/onboarding/AnalysoiSivusto.tsx:8` imports it; line 611 renders `<ContrastSafeLogo src={candidate.url} />` inside the existing candidate `.map()` button (confirmed surrounding `<button>`, `isSelected` ring classes, `candidate.type` label, and empty-state branch at lines 619+ are all unchanged). |

**Score:** 2/2 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/components/ContrastSafeLogo.tsx` | New shared contrast-safe logo primitive, `rgba(0,0,0,0.06)` backdrop, `h-12`, `object-contain`, no `'use client'`, no fallback icon | VERIFIED | File exists, 23 lines, matches UI-SPEC markup contract exactly (verified by reading full file contents). |
| `app/business/onboarding/AnalysoiSivusto.tsx` | Picker uses `ContrastSafeLogo` instead of bare `<img>` | VERIFIED | Import present; `<ContrastSafeLogo src={candidate.url} />` present at the single bug call site; old bare `<img className="h-12 w-auto object-contain rounded">` confirmed absent. |
| `app/business/onboarding/StepEsikatselu.tsx` | First preview slot renders `CalloutCard` with coordinate shim; `previewLabelCallout` caption; sibling sections unchanged | VERIFIED | All three confirmed by direct file read: `CalloutCard` import + render with `?? 0` shim (line 123), `t('previewLabelCallout')` caption (line 121), `DiagonaalKortti`/`PaikkaSheet` sections present unmodified (lines 127-140). |
| `messages/fi.json` | New `previewLabelCallout: "KARTTAKORTTI"` key, `previewLabelCard` untouched | VERIFIED | Line 182: `"previewLabelCallout": "KARTTAKORTTI"`; line 181 `previewLabelCard: "LISTAKORTTI"` still present. |
| `messages/en.json` | New `previewLabelCallout: "MAP CALLOUT"` key, `previewLabelCard` untouched | VERIFIED | Line 182: `"previewLabelCallout": "MAP CALLOUT"`; line 181 `previewLabelCard: "LIST CARD"` still present. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `AnalysoiSivusto.tsx` | `ContrastSafeLogo.tsx` | import + render inside logo-candidate `.map()` button | WIRED | `import ContrastSafeLogo from '@/app/components/ContrastSafeLogo'` (line 8); rendered at line 611 inside the candidate button, receiving `candidate.url` as `src`. |
| `StepEsikatselu.tsx` | `CalloutCard.tsx` | import + render with coordinate type shim | WIRED | Import at line 10; rendered at line 123 with `latitude`/`longitude` `?? 0` shim satisfying the non-null prop type. |
| `StepEsikatselu.tsx` | `messages/fi.json` / `messages/en.json` | `t('previewLabelCallout')` | WIRED | `useTranslations('Business')` at line 27; `t('previewLabelCallout')` called at line 121; key present in both message namespaces. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `ContrastSafeLogo` (in picker) | `candidate.url` | `brandingResult.logo_candidates[].url` (AI/scraper pipeline result, server-validated per code comment at AnalysoiSivusto.tsx:279) | Yes — real scraped logo URLs, not static/empty | FLOWING |
| `CalloutCard` (Step 6) | `draftAsPaikka` (built via `buildBrandingPreview`/`buildDraftAsPaikka`) | Business owner's actual draft venue data (name, sport, price) | Yes — real in-progress draft fields, not hardcoded | FLOWING |

### Regression / Build Verification

| Check | Command | Result | Status |
|-------|---------|--------|--------|
| Type check | `npx tsc --noEmit` | No output, exit clean | PASS |
| Test suite | `npx vitest run` | 14 test files, 176 tests, all passed | PASS |
| `DiagonaalKortti.tsx`/`PaikkaSheet.tsx` unmodified | `git log` + `git status` | No phase-49 commits touch either file; both clean in working tree | PASS |
| `PaikkaKortti.tsx` removed only from Step 6 | `grep -rn PaikkaKortti app/` | Still correctly used in `app/admin/[id]/page.tsx` and `PreviewModal.tsx` (out of scope, unchanged); zero references in `StepEsikatselu.tsx` | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| PREV-02 | 49-02-PLAN.md | Step 6 preview renders `CalloutCard` instead of unused `PaikkaKortti`, with fallback for missing coordinates | SATISFIED | Code confirmed above; `npx tsc --noEmit` passes confirming the coordinate shim type-resolves correctly. |
| PREV-03 | 49-01-PLAN.md | Shared contrast-safe logo primitive used in AnalysoiSivusto's logo-candidate picker | SATISFIED | Code confirmed above. |

Note: `.planning/REQUIREMENTS.md` checkbox markers (line 33-34, `- [ ]`) and the coverage table (lines 74-75, "Pending") have not been flipped to reflect completion. This is a documentation-tracking lag, not a functional gap — the ROADMAP.md phase entry is correctly marked `[x]` and completed, and the code-level implementation is verified above. Flagged as an info item for housekeeping, not a blocker.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `app/components/ContrastSafeLogo.tsx` | 14-23 | No guard against empty/falsy `src` (WR-01 from code review) | Info/Warning (pre-existing exposure, not introduced by this phase) | A malformed scraper result could render a broken-image icon inside the backdrop box. Documented in 49-REVIEW.md as non-blocking; the bare `<img>` it replaced had the same exposure. |
| `app/components/ContrastSafeLogo.tsx` | 20 | Missing `aria-hidden` for decorative image (IN-01 from code review) | Info | Minor a11y consistency gap vs. `DiagonaalKortti` precedent; non-blocking. |
| `app/business/onboarding/AnalysoiSivusto.tsx` | 602 | `key={candidate.url}` could collide if AI pipeline returns duplicate URLs (IN-02 from code review) | Info | Pre-existing pattern, not introduced by this phase; one line adjacent to changed code. |
| `.planning/REQUIREMENTS.md` | 33-34, 74-75 | PREV-02/PREV-03 checkboxes and coverage table still show "Pending"/unchecked despite phase completion | Info | Documentation lag only; does not affect code-level verification. |

None of these rise to BLOCKER — all were already surfaced and accepted as non-blocking in `49-REVIEW.md` (0 critical, 2 warning, 2 info), and independently confirmed here not to affect the phase's observable truths.

### Human Verification Required

None outstanding. Both blocking human-verify checkpoints (Task 3 in each plan) were already completed and approved by the user on 2026-06-17, per both SUMMARY.md files:
- 49-01-SUMMARY.md: "approved by user on 2026-06-17 — white/transparent logos are visible against the new backdrop, and selection ring/type label/empty-state behavior is unchanged."
- 49-02-SUMMARY.md: "Approved by user on 2026-06-17 — Step 6's first preview slot renders the map-style CalloutCard with the new 'KARTTAKORTTI'/'MAP CALLOUT' caption, renders without crashing for a draft missing coordinates, and the DiagonaalKortti/PaikkaSheet sections below are unchanged."

No further human verification is needed since these were not deferred — they were executed and resolved within the phase itself, and I independently re-confirmed the underlying code claims rather than trusting the summaries alone.

### Gaps Summary

No gaps. Both observable truths (PREV-02, PREV-03) are verified directly against the code on disk: `ContrastSafeLogo.tsx` exists and is wired into the single bug call site in `AnalysoiSivusto.tsx`; `StepEsikatselu.tsx` renders `CalloutCard` (not `PaikkaKortti`) in Step 6's first preview slot with a safe coordinate shim, while `DiagonaalKortti`/`PaikkaSheet` sections remain untouched. `npx tsc --noEmit` and `npx vitest run` (176/176 tests) both pass with no regressions. The only finding is a minor documentation-tracking lag in REQUIREMENTS.md's checkbox/coverage-table status, which does not affect the phase's functional goal achievement.

---

_Verified: 2026-06-17_
_Verifier: Claude (gsd-verifier)_
