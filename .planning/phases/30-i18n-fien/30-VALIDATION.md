---
phase: 30
slug: i18n-fien
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-04
---

# Phase 30 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.7 |
| **Config file** | `vitest.config.ts` (exists) |
| **Quick run command** | `npx vitest run lib/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run lib/`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 30-01-01 | 01 | 0 | I18N-02 | — | resolveLocale defaults to 'fi' for missing/invalid cookie | unit | `npx vitest run lib/i18nUtils.test.ts -x` | ❌ Wave 0 | ⬜ pending |
| 30-01-02 | 01 | 0 | I18N-02 | — | resolveLocale returns 'en' for valid NEXT_LOCALE=en | unit | `npx vitest run lib/i18nUtils.test.ts -x` | ❌ Wave 0 | ⬜ pending |
| 30-01-03 | 01 | 0 | I18N-02 | — | resolveLocale rejects arbitrary strings → 'fi' | unit | `npx vitest run lib/i18nUtils.test.ts -x` | ❌ Wave 0 | ⬜ pending |
| 30-02-01 | 02 | 1 | I18N-01 | — | LanguageToggle renders, calls changeLocaleAction on click | manual | — | — | ⬜ pending |
| 30-03-01 | 03 | 2 | I18N-03 | — | All PaikkaKortti/DiagonaalKortti strings switch locale | manual | — | — | ⬜ pending |
| 30-04-01 | 04 | 2 | I18N-03 | — | tsc --noEmit passes (all useTranslations keys type-safe) | automated | `npx tsc --noEmit` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `lib/i18nUtils.test.ts` — unit tests for `resolveLocale()` (I18N-02 fallback logic)
- [ ] `lib/i18nUtils.ts` — testable locale resolution extracted from `i18n/request.ts`

*Wave 0 must complete before Wave 1 (core i18n wiring) executes.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Language toggle visible on /profiili | I18N-01 | UI interaction — no DOM test infra | Open /profiili, confirm FI/EN toggle button present |
| NEXT_LOCALE cookie persists | I18N-02 | Requires browser cookie inspection | Toggle language, reload page, confirm language persists; DevTools → Application → Cookies |
| All UI strings switch | I18N-03 | Visual string check across 9 components | Toggle to EN, check NavPill, PaikkaKortti, DiagonaalKortti, PaikkaSheet, filters, /profiili, not-found, /paikat/[id] |
| Map/filter state preserved on toggle | I18N-03 | State preservation — requires manual check | Set city filter + open sheet, toggle language, confirm filter+sheet state unchanged |
| 'Kaikki' sentinel not broken | I18N-03 | Logic correctness — city filter | With city filter = "Kaikki"/"All", confirm all venues shown after language toggle |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
