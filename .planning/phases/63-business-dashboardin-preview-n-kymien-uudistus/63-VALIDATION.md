---
phase: 63
slug: business-dashboardin-preview-n-kymien-uudistus
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| 63-0X-0X | TBD | TBD | BIZPANEL-06 | — | N/A | manual | — | ❌ W0 (no component test harness) | ⬜ pending |
| 63-0X-0X | TBD | TBD | BIZPANEL-07 | — | N/A | manual | — | ❌ W0 (no component test harness) | ⬜ pending |
| 63-0X-0X | TBD | TBD | PREV-04 | — | N/A | manual | — | ❌ W0 (no component test harness) | ⬜ pending |
| 63-0X-0X | TBD | TBD | LIVEPREV-05 | — | N/A | manual | — | ❌ W0 (no component test harness) | ⬜ pending |
| 63-0X-0X | TBD | TBD | PREV-05 | T-63-01 | update-paikka never trusts client-supplied claim_status; rejection_reason rendered as plain text (no dangerouslySetInnerHTML) | unit + manual | `npx vitest run tests/api/update-paikka.test.ts` | ✅ existing, needs new case | ⬜ pending |

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

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
