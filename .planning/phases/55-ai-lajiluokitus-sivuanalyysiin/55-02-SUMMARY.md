---
phase: 55-ai-lajiluokitus-sivuanalyysiin
plan: 02
subsystem: Business onboarding wizard — draft persistence API
tags: [onboarding, save-step, submit, laji, taxonomy, deferred-to-submit]
status: complete
dependency-graph:
  requires:
    - onboarding_draft.laji (DB column, Phase 55 Plan 01)
  provides:
    - "save-step ALLOWED_FIELDS + 'laji' validator"
    - "submit conditional-spread write of laji into liikuntapaikat"
  affects:
    - app/api/business/onboarding/save-step/route.ts
    - app/api/business/onboarding/submit/route.ts
tech-stack:
  added: []
  patterns:
    - "Conditional spread `...(value ? { key: value } : {})` to omit a key entirely instead of writing null — prevents Supabase .update() from clobbering existing column values"
key-files:
  created:
    - tests/api/save-step.test.ts
    - tests/api/submit.test.ts
  modified:
    - app/api/business/onboarding/save-step/route.ts
    - app/api/business/onboarding/submit/route.ts
decisions:
  - "laji validation mirrors the existing hinnasto/aukioloajat field-specific block shape — non-empty string, max 100 chars, 400 on violation; no new validation helper function needed"
  - "submit's conditional spread is the only safe form: draft.laji ?? null would unconditionally write the key and clobber a create-paikka-seeded laji for any flow that bypassed the picker"
metrics:
  duration: ~20min
  completed: 2026-06-23
---

# Phase 55 Plan 2: Wire confirmed laji through save-step → submit Summary

Wired the deferred-to-submit persistence path for the AI-suggested sport category: `save-step` now accepts and bounds a `laji` field into `onboarding_draft.laji` (non-empty string, ≤100 chars), and `submit` copies `draft.laji` into `liikuntapaikat.laji` using a conditional spread that omits the key entirely (never writes `null`) when the draft never set it.

## What Was Built

**Task 1 — save-step ALLOWED_FIELDS + validation (TDD).**
- `app/api/business/onboarding/save-step/route.ts`: `'laji'` added to the `ALLOWED_FIELDS` tuple (`['media_urls', 'hinnasto', 'aukioloajat', 'yhteystiedot', 'laji']`). New `if (field === 'laji')` validation block mirroring the existing `hinnasto` shape — rejects non-string, empty (post-trim), or >100-char values with a 400. The JWT verify, `business_paikka_links` ownership check, and `[field]: value` computed-property UPSERT all apply to `laji` automatically since it is now an `ALLOWED_FIELDS` member.
- `tests/api/save-step.test.ts` (new): 4 tests covering valid acceptance (writes `laji: 'padel'` into the UPSERT payload), empty-string rejection, >100-char rejection, and non-string rejection — all asserting no UPSERT call on the rejection paths.

**Task 2 — submit conditional-spread write (TDD).**
- `app/api/business/onboarding/submit/route.ts`: added `...(draft.laji ? { laji: draft.laji } : {})` to the `liikuntapaikat` `.update({...})` payload. This is the only safe form — Supabase's `.update()` writes every key present in the object, so an unconditional `laji: draft.laji ?? null` would clobber an existing create-paikka-seeded `laji` value to `null` for any flow that bypassed the AI suggestion/picker.
- `tests/api/submit.test.ts` (new): 3 tests — "writes confirmed laji" (update args include `laji: 'padel'` when `draft.laji` is set), "does not overwrite laji" (asserts `!('laji' in updateArgs)` when `draft.laji` is `null` — key-absence, not `laji === null`), and a regression test confirming `hinta_kuvaus`/`aukioloajat`/`image_url` are still written correctly in both cases.

## TDD Gate Compliance

RED → GREEN sequence followed and verified in git log:
- `test(55-02): add failing tests for save-step laji field validation` (6fc536e) — 4 new tests, confirmed failing (`"Invalid field"` error, since `laji` was not yet in `ALLOWED_FIELDS`) before implementation.
- `feat(55-02): add laji to save-step ALLOWED_FIELDS with bounded validation` (d27de17) — implementation; all 4 tests pass.
- `test(55-02): add failing test for submit draft.laji conditional spread` (e93a774) — 3 new tests; 1 failed as expected (laji write missing), 2 passed by construction (key-absence and field-preservation were already true of the unmodified route, since it never touched `laji` at all).
- `feat(55-02): submit writes draft.laji into liikuntapaikat via conditional spread` (218ebad) — implementation; all 3 tests pass.

No REFACTOR commits were needed — both changes were minimal, single-purpose additions matching existing code shape (field-specific validation block; conditional-spread idiom already documented in RESEARCH.md Pitfall 2).

## Deviations from Plan

None — plan executed exactly as written. Task 2's mock-builder setup required slightly more scaffolding than `update-paikka.test.ts`'s pattern (the `submit` route touches four tables — `onboarding_draft`, `business_paikka_links`, `liikuntapaikat`, `business_accounts` — versus one), but this is test-infrastructure detail, not a deviation from the specified behavior or acceptance criteria.

## Verification

- `npx vitest run tests/api/save-step.test.ts` — 4/4 passed.
- `npx vitest run tests/api/save-step.test.ts -t "laji"` — 4/4 matched and passed.
- `npx vitest run tests/api/submit.test.ts` — 3/3 passed.
- `npx vitest run tests/api/submit.test.ts -t "writes confirmed laji"` — 1/1 matched and passed.
- `npx vitest run tests/api/submit.test.ts -t "does not overwrite laji"` — 1/1 matched and passed.
- `npm test` (full suite) — 199/199 passed (up from 192 in Plan 01), no regressions.
- `npx tsc --noEmit` — clean, no new type errors.
- `grep -n "'laji'" app/api/business/onboarding/save-step/route.ts` — confirms `ALLOWED_FIELDS` membership + validation block.
- `grep -n "draft.laji" app/api/business/onboarding/submit/route.ts` — confirms the conditional spread, not an unconditional key with `?? null`/`?? undefined`.

## Known Stubs

None.

## Threat Flags

None — both threats in the plan's threat model (T-55-03 free-text bounding, T-55-04 IDOR via inherited ownership check) were mitigated exactly as specified; no new trust boundary or sink introduced.

## Self-Check: PASSED

- FOUND: tests/api/save-step.test.ts
- FOUND: tests/api/submit.test.ts
- FOUND: app/api/business/onboarding/save-step/route.ts (laji in ALLOWED_FIELDS)
- FOUND: app/api/business/onboarding/submit/route.ts (draft.laji conditional spread)
- FOUND: commit 6fc536e (Task 1 RED)
- FOUND: commit d27de17 (Task 1 GREEN)
- FOUND: commit e93a774 (Task 2 RED)
- FOUND: commit 218ebad (Task 2 GREEN)
