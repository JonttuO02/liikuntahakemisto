---
phase: 61
slug: onboarding-vaiheiden-uudelleenjarjestys
status: draft
nyquist_compliant: false
wave_0_complete: true
created: 2026-06-26
---

# Phase 61 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — manual UAT (no test framework detected in project) |
| **Config file** | none |
| **Quick run command** | `npx tsc --noEmit` |
| **Full suite command** | `npx next build` |
| **Estimated runtime** | ~60 seconds (tsc), ~120 seconds (build) |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit`
- **After every plan wave:** Run `npx next build`
- **Before `/gsd-verify-work`:** Full build must be green
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 61-01-01 | 01 | 1 | ONBOARD-18 | — | N/A | manual | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 61-01-02 | 01 | 1 | ONBOARD-19 | — | N/A | manual | `npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 61-01-03 | 01 | 1 | ONBOARD-20 | — | N/A | manual | `npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 61-02-01 | 02 | 1 | ONBOARD-21 | — | N/A | manual | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 61-02-02 | 02 | 1 | ONBOARD-22 | — | N/A | manual | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 61-02-03 | 02 | 1 | ONBOARD-23 | — | N/A | manual | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 61-02-04 | 02 | 1 | ONBOARD-24 | — | N/A | manual | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 61-03-01 | 03 | 2 | ONBOARD-19 | T-sijainti | Coordinate range ±90/±180 validated | manual | `npx tsc --noEmit` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

New files (`StepNimiJaURL.tsx`, `StepSijainti.tsx`) are created during execution — no stub files needed before Wave 1.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| StepPaikka deleted, no import errors | ONBOARD-18 | File deletion + TypeScript scope | Build passes; open /business/onboarding, confirm name+URL card appears first |
| AI triggers on Seuraava with URL | ONBOARD-19 | Network request observable only in browser | Open DevTools Network tab; enter URL in StepNimiJaURL; click Seuraava; confirm POST to /api/business/analyze-website |
| Sijainti map appears as step 2 | ONBOARD-20 | Visual flow | After nimi-url step, confirm SijaintiPicker map renders |
| AI results shown when URL given | ONBOARD-21 | Flow gate conditional | Enter URL; advance through sijainti; confirm AnalysoiSivusto appears |
| No preview step (4 wizard steps) | ONBOARD-22 | Visual + step count | In wizard, confirm ProgressBar shows 4 checkboxes; step 5 unreachable |
| No website field in onboarding step 4 | ONBOARD-23 | Visual + editMode branch | Confirm no website input in StepYhteystiedot during onboarding; confirm it IS present in edit mode |
| ProgressBar shows SUBMIT not ESIKATSELU | ONBOARD-24 | Visual | Confirm 5th ProgressBar circle label reads "Lähetys" |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
