---
phase: 6
slug: ui-polish-and-data-foundation
status: approved
nyquist_compliant: true
wave_0_complete: true
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
| 06-01-T1 | 06-01 | 1 | ADS-02 | T-06-01 | anon key RLS SELECT-only; `featured` not writable by anon | source assertion | node -e grep on app/page.tsx SELECT string | ❌ created by task | ⬜ pending |
| 06-02-T1 | 06-02 | 1 | LEGAL-01 | T-06-02 | server component, no dangerouslySetInnerHTML, no 'use client' | source + smoke | node -e + manual /tietosuoja | ❌ new file | ⬜ pending |
| 06-03-T1 | 06-03 | 1 | UI-07 | T-06-03 | rel="noopener noreferrer" on external link | source assertion | node -e grep on app/paikat/[id]/page.tsx | ❌ existing edit | ⬜ pending |
| 06-04-T1 | 06-04 | 1 | UI-05 | — | N/A | unit | `npx vitest run lib/priceUtils.test.ts` | ❌ W0 — created by this task | ⬜ pending |
| 06-04-T2 | 06-04 | 1 | DATA-07 | — | N/A | unit | `npx vitest run lib/cityFilter.test.ts` | ❌ W0 — created by this task | ⬜ pending |
| 06-05-T1 | 06-05 | 2 | UI-05, UI-06, UI-07, ADS-02 | T-06-07 | no dangerouslySetInnerHTML; price display from DB, not user input | source + smoke | node -e grep + manual card inspect | ❌ existing edit | ⬜ pending |
| 06-06-T1 | 06-06 | 2 | UI-08 | T-06-11 | React escapes option values (kaupunki strings) | source assertion | node -e grep on LiikuntapaikatLista.tsx | ❌ existing edit | ⬜ pending |
| 06-06-T2 | 06-06 | 2 | DATA-07 | T-06-11 | as above | source + test | node -e grep + npx vitest run | ❌ existing edit | ⬜ pending |
| 06-06-T3 | 06-06 | 2 | LEGAL-01 | T-06-12 | intentional public link | source assertion | node -e grep on LiikuntapaikatLista.tsx | ❌ existing edit | ⬜ pending |
| 06-07-T1 | 06-07 | 2 | AI-04 | — | N/A | source + smoke | node -e grep + manual widget inspect | ❌ existing edit | ⬜ pending |
| 06-07-T2 | 06-07 | 2 | ADS-02 | T-06-16 | React escapes featured check | source assertion | node -e grep on Etusivu.tsx | ❌ existing edit | ⬜ pending |

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

**Approval:** approved
