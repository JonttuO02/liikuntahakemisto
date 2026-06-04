---
phase: 29
slug: kortit-sheet-redesign
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-04
---

# Phase 29 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.7 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run && npx tsc --noEmit` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run && npx tsc --noEmit`
- **Before `/gsd:verify-work`:** Full suite must be green + visual QA checklist
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| globals.css marquee keyframe | 01 | 1 | UI-25 | — | N/A | unit (lib) | `npx vitest run` | ✅ existing | ⬜ pending |
| PaikkaKortti marquee guard | 01 | 1 | UI-25 | — | N/A | unit | `npx vitest run lib/priceUtils.test.ts` | ❌ W0 | ⬜ pending |
| PaikkaSheet hero carousel | 02 | 2 | SHEET-01 | — | N/A | manual | visual QA | ❌ W0 | ⬜ pending |
| PaikkaSheet pricing SheetRow | 02 | 2 | SHEET-02 | — | N/A | manual | visual QA | ❌ W0 | ⬜ pending |
| PaikkaSheet collapsible reviews | 02 | 2 | SHEET-03 | — | N/A | manual | visual QA | ❌ W0 | ⬜ pending |
| DiagonaalKortti logo placeholder | 03 | 3 | UI-26 | — | N/A | manual | visual QA | ❌ W0 | ⬜ pending |
| DiagonaalKortti right panel | 03 | 3 | UI-27 | — | N/A | manual | visual QA | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `lib/priceUtils.test.ts` — add test: `split('\n').filter(Boolean).length >= 2` activates marquee; 1-line or null → static; empty lines filtered

*All other phase behaviors are visual-only (carousel, overlays, placeholders, animations) — no automated component tests exist in this project's test setup.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PaikkaSheet hero: 3 slides with Camera placeholder, drag handle floats over image, close+bookmark buttons top-right, name+address gradient overlay | SHEET-01 | No jsdom/React Testing Library configured | Open sheet, verify hero renders, swipe slides, verify dot indicators update |
| PaikkaSheet pricing: SheetRow with CircleDollarSign below hero | SHEET-02 | Visual layout | Open sheet, scroll past hero, verify Hinta row appears |
| PaikkaSheet reviews: collapsed by default, expands on tap, no chevron when 0 reviews | SHEET-03 | Interaction state | Open sheet with venue that has reviews; verify collapsed; tap; verify expands smoothly |
| PaikkaKortti marquee: scrolls left for 2+ price lines, static for 1 line | UI-25 | CSS animation visual | Find venue with multi-line hinta_kuvaus; verify marquee scrolls; verify single-line is static |
| DiagonaalKortti logo placeholder: 40×40 rounded box with Building2 in top-left of left panel | UI-26 | Visual layout | View card list in map; verify logo box left of sport pill |
| DiagonaalKortti right panel: gray+Camera replaces sport-color fallback | UI-27 | Visual layout | View venue with no image; verify gray placeholder (not sport color) |
| No drag conflict: horizontal carousel swipe doesn't close sheet | SHEET-01 | Interaction | Open sheet, swipe carousel horizontally; verify sheet stays open |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
