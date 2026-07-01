---
phase: 63
slug: business-dashboardin-preview-n-kymien-uudistus
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-01
---

# Phase 63 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (`vitest.config.ts`) |
| **Config file** | `vitest.config.ts` — `environment: 'node'`, includes `lib/**/*.test.ts`, `app/**/__tests__/*.test.ts`, `tests/**/*.test.ts` |
| **Quick run command** | `npx vitest run tests/api/update-paikka.test.ts` |
| **Full suite command** | `npm test` (= `vitest run`) |
| **Estimated runtime** | ~10-30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/api/update-paikka.test.ts`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 63-01-01 | 63-01 | 1 | BIZPANEL-07 (supports D-03 color foundation) | T-63-01A | getPanelShade never used with a raw/unescaped style sink | unit | `npx vitest run lib/branding/brandingResult.test.ts` | ✅ existing, extended | ⬜ pending |
| 63-01-02 | 63-01 | 1 | BIZPANEL-07 | — | N/A | type-check | `npx tsc --noEmit` | ✅ existing | ⬜ pending |
| 63-02-01 | 63-02 | 1 | PREV-04 | — | N/A | type-check + manual | `npx tsc --noEmit` | ✅ existing | ⬜ pending |
| 63-02-02 | 63-02 | 1 | LIVEPREV-05 | — | N/A | type-check + manual | `npx tsc --noEmit` | ✅ existing | ⬜ pending |
| 63-02-03 | 63-02 | 1 | PREV-05 | T-63-02A | Booking-link `<a>` gated on `!preview` — no external navigation from a preview surface | type-check + manual | `npx tsc --noEmit` | ✅ existing | ⬜ pending |
| 63-03-01 | 63-03 | 1 | PREV-05 (D-07 backend half) | T-63-01, T-63-02 | update-paikka derives claim_status server-side only, never trusts request body; flip UPDATE is concurrency-guarded | unit | `npx vitest run tests/api/update-paikka.test.ts` | ✅ existing, extended | ⬜ pending |
| 63-03-02 | 63-03 | 1 | PREV-05 (D-07 backend half) | T-63-01 | Test asserts client-supplied claim_status is ignored | unit | `npx vitest run tests/api/update-paikka.test.ts` | ✅ existing, extended | ⬜ pending |
| 63-04-01 | 63-04 | 2 | BIZPANEL-06, BIZPANEL-07 | — | N/A | script | `node -e "require('./messages/fi.json'); require('./messages/en.json')"` | ✅ existing, extended | ⬜ pending |
| 63-04-02 | 63-04 | 2 | BIZPANEL-06, BIZPANEL-07 | T-63-04C | Dashboard variant left panel has no click-catcher/handler; controls-panel chip contrast derived from getPanelShade | type-check + manual | `npx tsc --noEmit` | ✅ existing | ⬜ pending |
| 63-04-03 | 63-04 | 2 | BIZPANEL-06 (D-06) | T-63-04A, T-63-04B | rejection_reason rendered as plain JSX text (no dangerouslySetInnerHTML); CTA is a navigation-only `<a href>`, never a fetch call | type-check + manual | `npx tsc --noEmit` | ✅ new file | ⬜ pending |
| 63-05-01 | 63-05 | 3 | BIZPANEL-06, BIZPANEL-07 | T-63-05B | Icon-button visibility is UI-affordance only; server enforces ownership/authorization independently | type-check + manual | `npx tsc --noEmit` | ✅ existing | ⬜ pending |
| 63-05-02 | 63-05 | 3 | BIZPANEL-06, BIZPANEL-07 | T-63-05A | Confirmed-dead route removed only after zero callers remain | full suite | `npm test` | ✅ existing | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- Existing infrastructure covers all phase requirements. No new test files or framework installs needed — `tests/api/update-paikka.test.ts` already exists with the chainable-Supabase-mock pattern required to add D-07's new "rejected venue save resets claim_status" case.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dashboard card renders DiagonaalKortti dashboard variant with permanent controls panel and status pill in bottom corner | BIZPANEL-06, BIZPANEL-07 | No component test harness exists for `DiagonaalKortti` in this repo (codebase convention: manual/UAT for visual components) | Open `/business`, confirm each venue row renders as a DiagonaalKortti card with no-photo controls panel always visible (no hover/tap needed), status pill visible in bottom corner matching venue's actual status |
| `PreviewModal` renders `CalloutCard` instead of `PaikkaKortti` | PREV-04 | Visual UI, no snapshot-testing convention in this codebase | Open a venue's preview modal from `/business`, confirm stack order is CalloutCard → DiagonaalKortti → PaikkaSheet, no PaikkaKortti visible |
| `LivePreviewPane` renders `PaikkaSheet` as 3rd section | LIVEPREV-05 | Visual UI | Open onboarding or edit-mode live-preview sidebar (desktop + mobile toggle), confirm CalloutCard → DiagonaalKortti → PaikkaSheet(preview) all render in one scrollable column |
| No click inside any preview surface triggers navigation or a side effect (visual half) | PREV-05 | Requires interactive click-through audit across multiple surfaces | In `PreviewModal` and `LivePreviewPane`, click every element inside `PaikkaSheet` (including "Varaa aika" booking link) and confirm nothing navigates away or opens a new tab once the Pitfall 3 fix (`!preview` guard) lands |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (none — existing infra covers everything)
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** plans created (63-01 through 63-05); pending execution
