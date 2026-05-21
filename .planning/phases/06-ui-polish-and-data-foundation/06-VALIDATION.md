---
phase: 6
slug: ui-polish-and-data-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-21
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^4.1.7 |
| **Config file** | `vitest.config.ts` — `include: ['lib/**/*.test.ts']`, `environment: 'node'` |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run` + manual browser smoke (list view, card price, GDPR page)
- **Before `/gsd:verify-work`:** Full suite must be green + manual success criteria checklist
- **Max feedback latency:** ~5 seconds (automated); manual smoke ~2 min

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 6-01-01 | 01 | 1 | LEGAL-01 | — | Server component, no dangerouslySetInnerHTML | smoke (manual) | `next build` compiles page | ❌ W0 — manual verify | ⬜ pending |
| 6-02-01 | 02 | 1 | ADS-02 | — | anon key RLS SELECT-only; featured not writable | unit | `npx vitest run lib/` | ❌ W0 | ⬜ pending |
| 6-03-01 | 03 | 1 | UI-05 | — | N/A | unit | `npx vitest run lib/` | ❌ W0 | ⬜ pending |
| 6-03-02 | 03 | 1 | UI-06 | — | N/A | smoke (manual) | manual browser check | ❌ W0 | ⬜ pending |
| 6-03-03 | 03 | 1 | UI-07 | — | N/A | smoke (manual) | manual browser check | ❌ W0 | ⬜ pending |
| 6-04-01 | 04 | 1 | UI-08 | — | N/A | smoke (manual) | manual browser check | ❌ W0 | ⬜ pending |
| 6-05-01 | 05 | 1 | AI-04 | — | N/A | smoke (manual) | manual browser check | ❌ W0 | ⬜ pending |
| 6-06-01 | 06 | 2 | DATA-07 | — | N/A | unit | `npx vitest run lib/` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `lib/priceUtils.test.ts` — unit tests for "vain jäsenyys" price heuristic (UI-05)
- [ ] `lib/cityFilter.test.ts` — unit tests for city filter dedup logic (DATA-07)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `/tietosuoja` page renders GDPR content | LEGAL-01 | Server component with static content | Navigate to `/tietosuoja`, verify text visible |
| City name shows next to temperature | AI-04 | UI layout check | Open app, see "Tampere" next to °C in widget |
| Price shown at top of card | UI-06 | Layout order check | Check card renders price before description |
| "Varaa aika" button absent from list | UI-07 | Button presence check | List view must not show booking button |
| Sport filter is dropdown not pills | UI-08 | DOM element type check | Filter is `<select>` element |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
