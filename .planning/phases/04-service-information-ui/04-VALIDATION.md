---
phase: 4
slug: service-information-ui
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-21
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (no test runner detected — Wave 0 installs) |
| **Config file** | `vitest.config.ts` — Wave 0 creates |
| **Quick run command** | `npx vitest run lib/aukiolo.test.ts` |
| **Full suite command** | `npx vitest run && npx tsc --noEmit` |
| **Estimated runtime** | ~5 seconds (unit tests only) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run lib/aukiolo.test.ts`
- **After every plan wave:** Run `npx vitest run && npx tsc --noEmit`
- **Before `/gsd:verify-work`:** Full suite must be green + `npx tsc --noEmit` clean
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 04-01 | 1 | UI-01, UI-02, UI-03, UI-04 | — | N/A (display only) | unit (TDD) | `npx vitest run lib/aukiolo.test.ts` | ❌ Wave 0 | ⬜ pending |
| 04-02-01 | 04-02 | 2 | UI-01, UI-02, UI-03 | — | N/A | smoke (tsc) | `npx tsc --noEmit` | ✅ existing | ⬜ pending |
| 04-03-01 | 04-03 | 2 | UI-02 | — | N/A | smoke (tsc) | `npx tsc --noEmit` | ✅ existing | ⬜ pending |
| 04-04-01 | 04-04 | 2 | UI-04 | — | N/A | smoke (tsc) | `npx tsc --noEmit` | ✅ existing | ⬜ pending |
| 04-04-02 | 04-04 | 2 | UI-04 | — | N/A | smoke (tsc) | `npx tsc --noEmit` | ❌ Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — minimal config for Next.js 14 project (ESM, TypeScript)
- [ ] `lib/aukiolo.test.ts` — stubs for `getOpenStatus()` and `formatGroupedHours()` covering: open, closed, no-data, after-midnight, empty strings, grouped ranges, single days, all-closed
- [ ] `npm install -D vitest @vitest/ui` — no test runner detected in package.json

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| "Auki nyt" badge renders green in browser | UI-02 | Visual rendering requires browser | Start dev server, load a venue with today's aukioloajat, verify green badge appears |
| "Auki nyt" filter toggle hides closed venues | UI-02 | Requires browser interaction | Click toggle, verify only open venues remain (or null-hours venues with "Aukioloajat tuntematon") |
| Profile page today's hours row is bold | UI-04 | Requires browser timezone | Load profile page in Finnish browser, verify today's row is bold |
| Drop-in badge appears for "kertakäynti" venues | UI-03 | Requires real seed data | Load a venue with "kertakäynti" in hinta_kuvaus, verify "Kertakäynti OK" badge |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
