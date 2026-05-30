---
phase: 20
slug: navigaatio-korjaukset
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-30
---

# Phase 20 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Not detected — no jest.config, vitest.config, or test directories found |
| **Config file** | none |
| **Quick run command** | `npm run build` |
| **Full suite command** | `npm run build` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run build`
- **After every plan wave:** Run `npm run build` + manual walkthrough in browser
- **Before `/gsd:verify-work`:** Build green + manual verification of all 5 NAV requirements
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| NAV-04 fix | TBD | 1 | NAV-04 | — | N/A | manual-visual | `npm run build` | ✅ NavPill.tsx | ⬜ pending |
| NAV-05 fix | TBD | 1 | NAV-05 | — | N/A | manual + build | `npm run build` | ✅ SuosikitClient.tsx | ⬜ pending |
| NAV-03 fix | TBD | 1 | NAV-03 | — | N/A | manual | `npm run build` | ✅ Etusivu.tsx | ⬜ pending |
| NAV-01 impl | TBD | 2 | NAV-01 | — | N/A | manual | `npm run build` | ✅ Etusivu.tsx, DiagonaalKortti.tsx | ⬜ pending |
| NAV-02 confirm | TBD | 2 | NAV-02 | — | N/A | manual | — | ✅ paikat/[id]/page.tsx (no change) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new test files needed — all validation is manual + TypeScript type-check via `npm run build`.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Returning from venue profile restores scroll position and filter state | NAV-01 | No test framework; sessionStorage behavior requires browser interaction | 1. Open app, scroll list, apply a filter. 2. Click a venue card. 3. Press "Takaisin hakemistoon". 4. Verify: list is at previous scroll position, same filters active, search overlay open. |
| "Näytä kartalla" centers map on venue, no GPS activation, sheet stays closed | NAV-02 | Requires map interaction in browser | 1. Open a venue profile page. 2. Click "Näytä kartalla". 3. Verify: map centers on venue, GPS ring not active, bottom sheet closed. |
| Homepage bottom sheet starts closed then animates open | NAV-03 | Visual animation — cannot be asserted by build | 1. Load `/` fresh. 2. Verify: map visible briefly, then bottom sheet slides up smoothly. |
| No "Haku" link in NavPill dropdown | NAV-04 | Visual check | 1. Open navbar on /suosikit or /profiili. 2. Open NavPill dropdown. 3. Verify: no Haku/Search option. |
| "Takaisin" buttons in /suosikit go to `/` | NAV-05 | Href check | 1. Visit /suosikit as logged-out user. 2. Click "Takaisin" in unauthenticated state. 3. Verify: navigates to `/` (homepage), not 404. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
