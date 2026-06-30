---
phase: 62
slug: venuepage-konsolidaatio
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-01
---

# Phase 62 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — no automated test framework installed in this project |
| **Config file** | none |
| **Quick run command** | `npm run build` |
| **Full suite command** | `npm run build` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run build`
- **After every plan wave:** Run `npm run build` + manual smoke test of DiagonaalKortti click → PaikkaSheet open
- **Before `/gsd-verify-work`:** Full manual UAT checklist must pass
- **Max feedback latency:** 30 seconds (build) + manual UAT

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 62-01-01 | P01 | 1 | VENUEPAGE-02 | — | N/A | build | `npm run build` | ✅ | ⬜ pending |
| 62-01-02 | P01 | 1 | VENUEPAGE-02 | — | N/A | manual | Open PaikkaSheet for venue with coords; confirm "Näytä kartalla" row visible | N/A | ⬜ pending |
| 62-01-03 | P01 | 1 | VENUEPAGE-02 | — | N/A | manual | Open PaikkaSheet with preview=true; confirm row absent | N/A | ⬜ pending |
| 62-02-01 | P02 | 1 | VENUEPAGE-03 | — | N/A | build | `npm run build` | ✅ | ⬜ pending |
| 62-02-02 | P02 | 1 | VENUEPAGE-03 | — | N/A | manual | Click DiagonaalKortti in search list; confirm PaikkaSheet opens (no navigation) | N/A | ⬜ pending |
| 62-02-03 | P02 | 1 | VENUEPAGE-03 | — | N/A | manual | Click DiagonaalKortti in PreviewModal; confirm no action | N/A | ⬜ pending |
| 62-03-01 | P03 | 2 | VENUEPAGE-03 | — | N/A | build | `npm run build` | ✅ | ⬜ pending |
| 62-03-02 | P03 | 2 | VENUEPAGE-03 | — | N/A | manual | Click DiagonaalKortti in TODO overlay; confirm PaikkaSheet opens and overlay dismisses | N/A | ⬜ pending |
| 62-04-01 | P04 | 3 | VENUEPAGE-01 | — | N/A | manual | `ls app/paikat/` → directory absent | N/A | ⬜ pending |
| 62-04-02 | P04 | 3 | VENUEPAGE-04 | — | N/A | manual | Navigate to `/paikat/1` in browser; confirm 404 page | N/A | ⬜ pending |
| 62-04-03 | P04 | 3 | VENUEPAGE-01 | — | N/A | build | `npm run build` (no PaikkaPage imports) | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No test framework to install — project uses `npm run build` as the sole automated check.

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PaikkaSheet shows "Näytä kartalla" row when venue has coordinates | VENUEPAGE-02 | No test framework; visual UI check required | Open app, search for a venue with coords, open PaikkaSheet, verify row with MapPin icon and "Näytä kartalla" link appears |
| "Näytä kartalla" row absent when coords null | VENUEPAGE-02 | Conditional rendering; requires data fixture | Find/use a venue without coordinates, open PaikkaSheet, verify row absent |
| "Näytä kartalla" row absent in preview=true mode | VENUEPAGE-02 | Preview mode context required | Open business PreviewModal, verify no "Näytä kartalla" row in PaikkaSheet preview |
| DiagonaalKortti click opens PaikkaSheet in search list | VENUEPAGE-03 | Client-side state transition; requires browser | Open search, click a DiagonaalKortti card, verify PaikkaSheet opens without page navigation |
| DiagonaalKortti click in TODO overlay opens PaikkaSheet + dismisses overlay | VENUEPAGE-03 | Multiple state interactions | Open TODO overlay, click card, verify PaikkaSheet opens and TODO overlay closes |
| DiagonaalKortti in PreviewModal has no click action | VENUEPAGE-03 | Preview context behavior | Open PreviewModal (business side), click card, verify no action occurs |
| DiagonaalKortti in LivePreviewPane has no click action | VENUEPAGE-03 | Onboarding context behavior | Use onboarding live preview, click card, verify no action |
| GET /paikat/123 returns 404 | VENUEPAGE-04 | Requires running Next.js server | Run `npm run dev`, navigate to `/paikat/1`, verify Next.js 404 page |
| `app/paikat/[id]/` directory does not exist | VENUEPAGE-01 | Filesystem check | `ls app/paikat/ 2>&1` should show no `[id]` subdirectory |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
