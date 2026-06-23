---
phase: 55
slug: ai-lajiluokitus-sivuanalyysiin
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-23
---

# Phase 55 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. This phase has real automated-test leverage: `analyzer.ts`'s allowlist-and-filter logic and the `submit`/`save-step` route payload shape are pure-logic/route-mock testable with Vitest, mirroring existing patterns in this codebase. Only the suggestion-card/picker UI interaction (criterion 2) has no automated coverage and stays manual-only.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.7 |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `npx vitest run lib/branding/analyzer.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~3-6 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run <file the task touched>` (`lib/branding/analyzer.test.ts`, `tests/api/submit.test.ts`, or `tests/api/save-step.test.ts`)
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green, plus manual UAT walkthrough of confirm/change/skip paths
- **Max feedback latency:** ~6 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 55-0?-T? | TBD | TBD | AI-06 (criterion 1) | T-55-01 | `suggested_laji` is one of the 9 `lajiKonfig` keys or `null` — never an out-of-taxonomy string, even when Claude returns one | unit | `npx vitest run lib/branding/analyzer.test.ts -t "laji"` | ✅ extend existing `lib/branding/analyzer.test.ts` | ⬜ pending |
| 55-0?-T? | TBD | TBD | AI-06 (criterion 4) | — | Omitting `laji` from Claude's mocked response does not throw and leaves `logos`/`colors`/`prices`/`opening_hours` unaffected | unit | `npx vitest run lib/branding/analyzer.test.ts` | ✅ extend existing `lib/branding/analyzer.test.ts` | ⬜ pending |
| 55-0?-T? | TBD | TBD | AI-06 (criterion 3) / Pitfall 1 | — | `submit/route.ts`'s `liikuntapaikat` UPDATE writes `laji` when `draft.laji` is set (closes today's "submit never touches laji" gap) | unit (API route) | `npx vitest run tests/api/submit.test.ts -t "writes confirmed laji"` | ❌ Wave 0 (new file) | ⬜ pending |
| 55-0?-T? | TBD | TBD | AI-06 (criterion 3+4) / Pitfall 2 | T-55-02 | `submit/route.ts`'s UPDATE omits the `laji` key entirely when `draft.laji` is falsy — never sends `laji: null`/clobbers an existing value | unit (API route) | `npx vitest run tests/api/submit.test.ts -t "does not overwrite laji"` | ❌ Wave 0 (same new file) | ⬜ pending |
| 55-0?-T? | TBD | TBD | AI-06 (criterion 3) / Pitfall 5 | T-55-03 | `save-step/route.ts` rejects empty-string / >100-char `laji` values from the free-text Vaihda escape hatch | unit (API route) | `npx vitest run tests/api/save-step.test.ts -t "laji"` | ❌ Wave 0 (new file — planner's discretion whether to automate or leave manual, see note below) | ⬜ pending |
| 55-0?-T? | TBD | TBD | AI-06 (criterion 2) | — | Suggestion card renders distinctly; Vahvista confirms, Vaihda opens picker; unconfirmed state (D-03) shows no pre-confirmed pick and forces Vaihda | manual | manual UAT walkthrough | N/A | ⬜ pending |
| 55-0?-T? | TBD | TBD | D-05 | — | "Analysoi uudelleen" resets the confirmed/unconfirmed laji state along with the existing logo/color resets | manual | manual UAT walkthrough | N/A | ⬜ pending |
| 55-0?-T? | TBD | TBD | D-06 | — | Skip-path ("Ohita") flow presents a manual category picker before final submit | manual | manual UAT walkthrough | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*
*Task IDs are placeholders — the planner assigns concrete `{phase}-{plan}-{task}` IDs; this table is updated once plans exist.*

---

## Wave 0 Requirements

- [ ] `tests/api/submit.test.ts` — new file, mirrors `tests/api/update-paikka.test.ts`'s mock-builder pattern (mock `supabaseAdmin.auth.getUser`, mock chainable `.from('liikuntapaikat').update(...)`). Covers Pitfall 1 (submit currently never touches `laji`) and Pitfall 2 (null-overwrite regression) — the single highest-value automated test in this phase since it directly guards success criterion 4.
- [ ] `lib/branding/analyzer.test.ts` — already exists; extend with `laji` cases (allowlist-pass, invalid-string-to-`null`, missing-field-to-`null`, criterion-4 omission-doesn't-break-other-fields). Not a new file, but required before this phase can be considered Nyquist-compliant.
- [ ] `tests/api/save-step.test.ts` — new file, optional (planner's discretion). `save-step/route.ts` has no dedicated test file today for any field. Automating Pitfall 5 (free-text length/non-empty bound) is cheap given the established `update-paikka.test.ts` pattern, but the planner may judge it acceptable to leave as a manual-only check if Wave 0 budget is tight — if skipped, move its row in the Per-Task Verification Map above to Manual-Only Verifications and note the deferral rationale in the relevant PLAN.md.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Suggestion card renders as a distinct "ehdotus" element with Vahvista/Vaihda actions | AI-06 (criterion 2) | No component-level test infra in this project (no React Testing Library/jsdom component tests exist — only route + lib unit tests) | In onboarding's preview phase after a real or mocked analysis, confirm the suggestion card is visually distinct from the logo/color/gallery pickers, shows "Ehdotettu laji: {label}", and both Vahvista and Vaihda buttons work |
| Unconfirmed state forces the Vaihda picker (D-03) | AI-06 (criterion 2, 3) | Same as above — requires real browser interaction to confirm no silent default occurs | Trigger an analysis where Claude's response omits `laji` or returns an invalid value; confirm the card shows no pre-confirmed pick and no Vahvista target, only the Vaihda picker path |
| Vaihda picker lists all 9 taxonomy categories plus free text | AI-06 (criterion 1, 2) | UI rendering/interaction, not unit-testable without component infra | Open Vaihda; confirm all 9 `lib/lajit.ts` categories are listed plus a free-text input |
| "Analysoi uudelleen" resets laji selection (D-05) | D-05 | Requires triggering the real re-analysis flow and observing state reset in the browser | Confirm a laji pick, click "Analysoi uudelleen", confirm the suggestion card returns to its initial (unconfirmed or freshly-suggested) state, not the prior pick |
| Skip-path manual picker appears before submit (D-06) | D-06 | UI flow/placement decision, not unit-testable | Trigger "Ohita" from the analysis step; confirm a manual category picker (taxonomy + free text, no AI badge) appears before the user can finish the wizard |
| Quick-accept and full-wizard paths both persist confirmed laji | AI-06 (criterion 3) | End-to-end persistence across two different UI flows; the unit tests above cover the route-level logic but not the full UI→API wiring | Run both `handleQuickAccept` and "Jatka velhoon →" paths to completion; confirm `liikuntapaikat.laji` reflects the confirmed value in both cases via DB inspection |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 6s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending — planner must confirm the Per-Task Verification Map against actual assigned task IDs before this can flip to `nyquist_compliant: true`.
