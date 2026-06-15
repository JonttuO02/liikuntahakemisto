---
plan: 45-03
phase: 45
status: complete
completed_at: "2026-06-15T20:38:00Z"
self_check: PASSED
subsystem: branding-pipeline
tags: [claude-api, vision, storage, supabase, tdd, analyzer]
dependency_graph:
  requires: [45-02]
  provides: [analyzer.ts, storage.ts]
  affects: [45-04-route]
tech_stack:
  added: []
  patterns: [TDD red-green, vi.mock constructor pattern, Claude multi-image vision content array, Supabase Storage upload + getPublicUrl]
key_files:
  created:
    - lib/branding/analyzer.ts
    - lib/branding/storage.ts
  modified:
    - lib/branding/analyzer.test.ts
decisions:
  - "vi.mock factory uses function constructor (not vi.fn()) for class-style Anthropic mock — avoids hoisting issues with TDZ"
  - "vi.clearAllMocks() in beforeEach prevents call-count bleed between tests"
  - "parseClaudeJson strips both backtick-only and json-labeled code fences before JSON.parse"
  - "logo_index === -1 treated as valid (no suitable logo); only values < -1 or >= candidates.length throw"
metrics:
  duration: "~10 minutes"
  completed_date: "2026-06-15"
  tasks_completed: 2
  files_changed: 3
---

# Phase 45 Plan 03: Claude Analyzer + Storage Implementation Summary

## One-liner

Multi-image Claude Haiku vision analyzer returning BrandingAnalysisResult (prices, opening_hours, website_url) + Supabase Storage uploadLogo function establishing the first supabaseAdmin.storage pattern in the project.

## What Was Built

### Task 1: lib/branding/analyzer.ts (TDD)

Implemented `analyzeWithClaude(logoCandidatesBuffers: Buffer[], htmlSnippet: string): Promise<BrandingAnalysisResult>`:

1. **PNG buffers to raw base64** — `buffer.toString('base64')` — NO `data:image/png;base64,` prefix (Pitfall 3 avoided)
2. **Content array** — image items placed BEFORE the text item (official Claude API best practice)
3. **Claude call** — `claude-haiku-4-5-20251001`, `max_tokens: 2048`, no temperature parameter
4. **parseClaudeJson helper** — strips ` ```json ` or ` ``` ` fences before `JSON.parse`
5. **logo_index bounds guard** — throws `out-of-bounds logo_index` if result is not -1 AND is < 0 or >= candidates.length
6. **Extended BrandingAnalysisResult** — includes `prices`, `opening_hours`, `website_url`, `raw_analysis`

TDD cycle:
- RED: 8 failing tests (import error — analyzer.ts did not exist)
- GREEN: all 8 tests pass with mocked `@anthropic-ai/sdk`

### Task 2: lib/branding/storage.ts

Implemented `uploadLogo(businessAccountId: string, pngBuffer: Buffer): Promise<string>`:

1. Path: `branding/${businessAccountId}/logo.png`
2. Upload: `supabaseAdmin.storage.from('business-media').upload(path, pngBuffer, { contentType: 'image/png', upsert: true })`
3. Public URL: `supabaseAdmin.storage.from('business-media').getPublicUrl(path)` — no error field (safe destructure)
4. Returns full `https://...supabase.co/storage/...` URL

This is the first `supabaseAdmin.storage` usage in the project — establishes the upload pattern for Phase 45 and future phases.

## Key Files

| File | Role | Exports |
|------|------|---------|
| `lib/branding/analyzer.ts` | Claude Haiku vision service | `analyzeWithClaude`, `BrandingAnalysisResult` |
| `lib/branding/storage.ts` | Supabase Storage upload utility | `uploadLogo` |
| `lib/branding/analyzer.test.ts` | Unit tests (8 tests, all GREEN) | — |

## Verification

- `npx vitest run lib/branding/analyzer.test.ts` — 8 tests PASS
- `npx vitest run lib/branding` — 15 tests PASS (scraper + analyzer combined)
- `npx tsc --noEmit` — no TypeScript errors in branding/analyzer or branding/storage
- `lib/branding/analyzer.ts` contains `model: 'claude-haiku-4-5-20251001'` and `max_tokens: 2048`
- `lib/branding/analyzer.ts` does NOT contain `temperature` parameter
- `lib/branding/analyzer.ts` does NOT contain `data:image/png;base64,` prefix
- `lib/branding/storage.ts` contains `supabaseAdmin.storage.from('business-media')`, `upsert: true`, `getPublicUrl`
- `grep -c "prices\|opening_hours\|website_url" lib/branding/analyzer.ts` → 9 matches

## Commits

1. `e4ef9d1`: `feat(45-03): implement lib/branding/analyzer.ts with TDD cycle`
2. `3688e67`: `feat(45-03): implement lib/branding/storage.ts — uploadLogo to Supabase Storage`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] vi.mock factory cannot reference module-level variables (TDZ hoisting)**
- **Found during:** Task 1 RED phase — `ReferenceError: Cannot access 'mockCreate' before initialization`
- **Issue:** `vi.mock` is hoisted above variable declarations; the factory function's closure cannot reference `const mockCreate = vi.fn()` declared at module level
- **Fix:** Rewrote mock using a named function constructor (`function MockAnthropic`) that creates its own internal `createFn = vi.fn()`. Attached the spy as `MockAnthropic._mockCreate` so tests can retrieve it via `import Anthropic from '@anthropic-ai/sdk'` and access the shared reference.
- **Files modified:** `lib/branding/analyzer.test.ts`
- **Commit:** Included in Task 1 commit

**2. [Rule 1 - Bug] vi.clearAllMocks() missing in beforeEach caused call-count bleed**
- **Found during:** Task 1 GREEN phase — two tests failed because `mockCreate` call count accumulated across tests
- **Issue:** Without `vi.clearAllMocks()`, call counts from previous tests leaked into assertions like `toHaveBeenCalledOnce()` and `mock.calls[0]`
- **Fix:** Added `vi.clearAllMocks()` at the start of `beforeEach` and restored the default mock response afterwards
- **Files modified:** `lib/branding/analyzer.test.ts`
- **Commit:** Included in Task 1 commit (same iteration)

## Threat Surface Scan

No new network endpoints introduced. `analyzer.ts` is the first file in the project to send multi-image content to Claude API. T-45-03-04 (ANTHROPIC_API_KEY) is mitigated — key accessed via `process.env.ANTHROPIC_API_KEY` (no NEXT_PUBLIC_ prefix). T-45-03-01 (logo_index bounds) is mitigated — bounds guard implemented and covered by unit tests.

No new threat flags beyond the plan's documented threat register.

## Known Stubs

None. Both files are fully implemented with real logic.

## Self-Check

- [x] `lib/branding/analyzer.ts` exists and exports `analyzeWithClaude` and `BrandingAnalysisResult`
- [x] `lib/branding/storage.ts` exists and exports `uploadLogo`
- [x] `lib/branding/analyzer.test.ts` contains 8 real assertions (no MISSING_IMPL stubs)
- [x] `npx vitest run lib/branding/analyzer.test.ts` — 8/8 PASS
- [x] `npx vitest run lib/branding` — 15/15 PASS (scraper + analyzer)
- [x] TypeScript: no errors in branding/analyzer or branding/storage
- [x] analyzer.ts: `model: 'claude-haiku-4-5-20251001'`, `max_tokens: 2048`, no temperature
- [x] analyzer.ts: no `data:image/png;base64,` prefix on base64 strings
- [x] analyzer.ts: bounds check `logo_index >= logoCandidatesBuffers.length`
- [x] storage.ts: `upsert: true`, `contentType: 'image/png'`, `.getPublicUrl(path)`
- [x] Commits e4ef9d1 and 3688e67 exist in git log
- [x] No modifications to STATE.md or ROADMAP.md
