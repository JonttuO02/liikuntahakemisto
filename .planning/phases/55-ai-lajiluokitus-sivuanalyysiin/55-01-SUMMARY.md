---
phase: 55-ai-lajiluokitus-sivuanalyysiin
plan: 01
subsystem: AI branding analysis pipeline
tags: [ai, claude, branding, taxonomy, lajiluokitus, onboarding]
status: complete
dependency-graph:
  requires: []
  provides:
    - business_branding.suggested_laji (DB column)
    - onboarding_draft.laji (DB column)
    - BrandingAnalysisResult.suggested_laji
    - BrandingResult.suggested_laji
  affects:
    - lib/branding/prompt.ts
    - lib/branding/analyzer.ts
    - lib/branding/brandingResult.ts
    - app/api/business/analyze-website/route.ts
tech-stack:
  added: []
  patterns:
    - "Allowlist validation via Object.keys(lajiKonfig) discard-to-null pattern (same shape as VALID_LOGO_TYPES/VALID_COLOR_ROLES but discards instead of defaulting to a sentinel)"
key-files:
  created:
    - supabase/migrations/20260623190347_business_branding_suggested_laji.sql
    - supabase/migrations/20260623190348_onboarding_draft_add_laji.sql
  modified:
    - lib/branding/prompt.ts
    - lib/branding/analyzer.ts
    - lib/branding/brandingResult.ts
    - app/api/business/analyze-website/route.ts
    - lib/branding/analyzer.test.ts
decisions:
  - "suggested_laji discards out-of-taxonomy/missing values to null, never to a sentinel string like the existing logo/color 'unknown' pattern, because the UI's unconfirmed state (D-03) keys on null"
  - "Prompt enum is built at module load via Object.keys(lajiKonfig).join, never hand-typed, so it can never drift from lib/lajit.ts"
metrics:
  duration: ~25min
  completed: 2026-06-23
---

# Phase 55 Plan 1: AI laji-suggestion source + schema foundation Summary

Added Claude-driven sport-category suggestion to the existing branding-analysis pipeline, validated against the live `lib/lajit.ts` 9-key taxonomy with discard-to-null on any mismatch, plus the two additive schema migrations (`business_branding.suggested_laji`, `onboarding_draft.laji`) the rest of the phase depends on.

## What Was Built

**Task 1 — Schema migrations.** Two additive, idempotent (`ADD COLUMN IF NOT EXISTS`) nullable-TEXT migrations following the verified analog style (`20260616110000_business_branding_selected_logo_url.sql`):
- `supabase/migrations/20260623190347_business_branding_suggested_laji.sql` — `business_branding.suggested_laji TEXT`, the unconfirmed AI suggestion.
- `supabase/migrations/20260623190348_onboarding_draft_add_laji.sql` — `onboarding_draft.laji TEXT`, the user-confirmed staging value for Plans 02/03.

Both files are sorted last in `supabase/migrations/` (timestamps after `20260622120000`). Not applied (`supabase db push`) — file-authoring only, per plan instructions.

**Task 2 — Prompt schema + analyzer allowlist validation (TDD).**
- `lib/branding/prompt.ts`: imports `lajiKonfig` from `@/lib/lajit`; builds `LAJI_ENUM` at module load via `Object.keys(lajiKonfig).join('" | "')`; added a `"laji": "<enum>" | null` field to the JSON schema and a `laji:` field-rules block instructing Claude to pick one taxonomy key or return `null` when uncertain (never free text, never an array).
- `lib/branding/analyzer.ts`: imports `lajiKonfig`; added `VALID_LAJI_KEYS = Object.keys(lajiKonfig)`; added `suggested_laji: string | null` to `BrandingAnalysisResult`; added `laji?: unknown` to the raw-parse cast; added the discard-to-null validation (`rawLaji && VALID_LAJI_KEYS.includes(rawLaji) ? rawLaji : null`); added `suggested_laji` to the return object.
- `lib/branding/brandingResult.ts`: added `suggested_laji: string | null` to the client-safe `BrandingResult` type, next to `logo_type`.
- `lib/branding/analyzer.test.ts`: added a 5-test suite (`analyzeWithClaude laji suggestion / AI-06`) covering valid key passthrough, non-taxonomy string discard, free-text discard, omission (with a regression guard asserting logos/colors/prices/opening_hours stay correctly shaped), and explicit `null` discard.

**Task 3 — Persist + surface in the route.**
- `app/api/business/analyze-website/route.ts`: `runAnalysis`'s `business_branding` UPSERT now writes `suggested_laji: result.suggested_laji`. The GET handler's `.select(...)` column list now includes `suggested_laji`; since the handler returns the `data` row object directly (no field-by-field remapping), no additional changes were needed for the field to appear in the response.

## TDD Gate Compliance

RED → GREEN sequence followed and verified in git log:
- `test(55-01): add failing tests for suggested_laji allowlist validation` (481c499) — 5 new tests, confirmed failing (`undefined` vs expected `null`/`'padel'`) before any implementation.
- `feat(55-01): validate AI laji suggestion against lib/lajit.ts allowlist` (9c05c0e) — implementation; all 22 tests in `analyzer.test.ts` pass.

No REFACTOR commit was needed — the implementation matched the existing allowlist-validation idiom (`VALID_LOGO_TYPES`/`VALID_COLOR_ROLES`) with no follow-up cleanup required.

## Deviations from Plan

None — plan executed exactly as written. The GET handler's response object in the plan description ("add `suggested_laji: <row>.suggested_laji ?? null` to the BrandingResult object") turned out to be unnecessary extra work: the actual GET handler returns the Supabase `data` row directly rather than constructing a separate response object, so adding the column to `.select(...)` alone was sufficient and exactly equivalent in effect.

## Verification

- `npx vitest run lib/branding/analyzer.test.ts` — 22/22 passed (5 new `laji` cases + 17 pre-existing).
- `npx vitest run lib/branding/analyzer.test.ts -t "laji"` — 5/5 matched and passed.
- `npm test` (full suite) — 192/192 passed, no regressions.
- `npx tsc --noEmit` — clean, no new type errors.
- `grep -c 'suggested_laji' app/api/business/analyze-website/route.ts` — 4 references (UPSERT write, GET select, plus comment lines), satisfies the `>=2` acceptance gate.
- Both migration files verified present with correct `ADD COLUMN IF NOT EXISTS` DDL.

## Known Stubs

None.

## Threat Flags

None — the AI-06 derivation is covered by the plan's own threat model (T-55-01 allowlist mitigation, implemented exactly as specified; T-55-02 accepted, no new sink introduced).

## Self-Check: PASSED

- FOUND: supabase/migrations/20260623190347_business_branding_suggested_laji.sql
- FOUND: supabase/migrations/20260623190348_onboarding_draft_add_laji.sql
- FOUND: commit 7a30e28 (Task 1)
- FOUND: commit 481c499 (Task 2 RED)
- FOUND: commit 9c05c0e (Task 2 GREEN)
- FOUND: commit 21f1457 (Task 3)
