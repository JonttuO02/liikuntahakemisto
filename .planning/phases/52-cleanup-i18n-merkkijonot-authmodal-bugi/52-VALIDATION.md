---
phase: 52
slug: cleanup-i18n-merkkijonot-authmodal-bugi
status: planned
nyquist_compliant: true
wave_0_complete: false
created: 2026-06-22
---

# Phase 52 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. This phase is primarily verification-only (CLEAN-06/CLEAN-07 already hold true in current code per RESEARCH.md); the only new automated work is one regression test for the AuthModal/business-registration error-classification precedence logic.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest `^4.1.7` |
| **Config file** | `vitest.config.ts` (`include: ['lib/**/*.test.ts', 'app/**/__tests__/*.test.ts', 'tests/**/*.test.ts']`) |
| **Quick run command** | `npx vitest run app/components/__tests__/AuthModal.mapError.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~1-2 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run app/components/__tests__/AuthModal.mapError.test.ts`
- **After every plan wave:** Run `npx vitest run` (full suite — currently 0 other tests in repo)
- **Before `/gsd-verify-work`:** Full suite must be green; CLEAN-06 re-confirmed via the file+line evidence table (no drift since research)
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 52-01-T1 | 52-01 | 1 | CLEAN-06 | — | EN-locale user sees English strings in AuthModal/CalloutCard/paikkasivu/DiagonaalKortti — no hardcoded Finnish (deferred DiagonaalKortti alt excepted per D-05) | manual (file/line assertion) | `grep -lE 'useTranslations\|getTranslations' app/components/AuthModal.tsx app/components/CalloutCard.tsx app/paikat/[id]/page.tsx app/components/DiagonaalKortti.tsx` (expect 4/4) | N/A | ⬜ pending |
| 52-01-T2 | 52-01 | 1 | CLEAN-07 | T-52-01 | `mapError`/`mapBusinessError` precedence produces correct classification when an error message matches multiple conditions | unit | `npx vitest run app/components/__tests__/AuthModal.mapError.test.ts -t "weak password"` | ❌ Wave 0 (created in 52-01-T2) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*
*Task IDs are placeholders — the planner assigns concrete `{phase}-{plan}-{task}` IDs; this table is updated once plans exist.*

---

## Wave 0 Requirements

- [ ] `app/components/__tests__/AuthModal.mapError.test.ts` — new file, covers CLEAN-07 (precedence regression test for `mapError`; also cover `mapBusinessError` from `app/business/rekisteroidy/page.tsx` in the same file or a sibling test, since both share the identical bug-prone pattern)
- [ ] `package.json` `"scripts"."test"` entry — currently missing; add `"test": "vitest run"` (trivial setup, not a blocker)
- [ ] No shared fixtures needed — `mapError`/`mapBusinessError` are pure functions with zero dependencies

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| EN-locale user sees English text in AuthModal/CalloutCard/paikkasivu/DiagonaalKortti | CLEAN-06 | Already proven via file+line citation in RESEARCH.md (every string routes through `t()`/`tLajit()` bound to verified `messages/en.json` namespaces); a JSON-structure test would test the file, not rendered behavior | Re-confirm no drift: `grep -n 'useTranslations\|getTranslations'` on the 4 named files, cross-check each key against `messages/en.json` |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (T1: grep-based file assertion; T2: `npx vitest run ...`)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (both of 2 tasks have automated verify)
- [x] Wave 0 covers all MISSING references (`AuthModal.mapError.test.ts` created in 52-01-T2, which exports the SUT functions in the same task)
- [x] No watch-mode flags (`vitest run`, not `vitest`)
- [x] Feedback latency < 5s (~1-2s suite)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-06-22 — plan 52-01 satisfies all sign-off criteria.
