---
plan: 45-02
phase: 45
status: complete
completed_at: "2026-06-15T17:30:59Z"
self_check: PASSED
subsystem: branding-pipeline
tags: [scraper, sharp, claude, branding, tdd]
dependency_graph:
  requires: [45-01]
  provides: [scraper.ts, prompt.ts]
  affects: [45-03-analyzer, 45-04-route]
tech_stack:
  added: [sharp (image processing, installed during this plan)]
  patterns: [TDD red-green, AbortSignal.timeout, Promise.all parallel fetch, Set deduplication]
key_files:
  created:
    - lib/branding/scraper.ts
    - lib/branding/prompt.ts
  modified:
    - lib/branding/scraper.test.ts
decisions:
  - "toPngBase64 helper returns null (not throw) on sharp failure — Pitfall 8 mitigation"
  - "favicon.ico fallback added as default candidate when no <link rel=icon> found"
  - "Tests use ESM static import (not require()) for vitest compatibility"
  - "sharp npm install ran against main project directory (node_modules is shared)"
metrics:
  duration: "~30 minutes"
  completed_date: "2026-06-15"
  tasks_completed: 2
  files_changed: 3
---

# Phase 45 Plan 02: Scraper + Prompt Implementation Summary

## One-liner

Fetch-based HTML scraper with CSS color extraction + sharp PNG conversion, plus versioned Claude branding-analysis prompt including prices, opening_hours, and website_url fields.

## What Was Built

### Task 1: lib/branding/scraper.ts (TDD)

Implemented the full scraping pipeline as `scrapeWebsite(url: string): Promise<ScrapeResult>`:

1. HTML fetch with 10s timeout and Mozilla User-Agent
2. `<meta name="theme-color">` hex color extraction
3. Parallel CSS stylesheet fetch (max 3 files, 5s timeout each)
4. `:root` CSS hex variable extraction via regex
5. Logo candidates in priority order: `<link rel="icon">` / `/favicon.ico` fallback → `og:image` → `img[src/alt/class*=logo]`; max 5, deduplicated
6. Per-candidate PNG conversion via `toPngBase64()` helper (sharp resize 512px, try/catch returns null on failure)
7. Colors deduplication via `Set`; htmlSnippet = `html.slice(0, 8000)`

TDD cycle:
- RED: 7 failing tests covering all behaviors defined in the plan's `<behavior>` block
- GREEN: implementation passes all 7 tests

### Task 2: lib/branding/prompt.ts

Created versioned `BRANDING_ANALYSIS_PROMPT` constant (2545 chars) with all six JSON fields Claude must return:
- `logo_index` (0-based, -1 = none)
- `logo_type` (wordmark | icon | combination | unknown)
- `colors` (hex strings, max 5)
- `prices` (label + price pairs, Finnish format)
- `opening_hours` (Finnish day abbreviations Ma-Su, HH:MM times)
- `website_url` (canonical URL or empty string)

## Key Files

| File | Role | Exports |
|------|------|---------|
| `lib/branding/scraper.ts` | Web scraping utility | `scrapeWebsite`, `ScrapeResult` |
| `lib/branding/scraper.test.ts` | Unit tests (7 tests, all GREEN) | — |
| `lib/branding/prompt.ts` | Versioned Claude prompt | `BRANDING_ANALYSIS_PROMPT` |

## Verification

- `npx vitest run lib/branding/scraper.test.ts` — 7 tests PASS
- `lib/branding/scraper.ts` exports `scrapeWebsite` and `ScrapeResult`
- `lib/branding/prompt.ts` exports `BRANDING_ANALYSIS_PROMPT` (len=2545)
- `npx tsc --noEmit` — no TypeScript errors in branding/scraper or branding/prompt
- `grep -c "prices\|opening_hours\|website_url" lib/branding/prompt.ts` — returns 6 (all three fields present multiple times)

## Commits

1. `c9c913f`: `feat(45-02): implement lib/branding/scraper.ts with full TDD cycle`
2. `7f11407`: `feat(45-02): implement lib/branding/prompt.ts with versioned BRANDING_ANALYSIS_PROMPT`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Sharp not installed despite 45-01 claiming it was**
- **Found during:** Task 1 — TypeScript reported "Cannot find module 'sharp'"
- **Issue:** 45-01-SUMMARY.md stated sharp was added to package.json, but `node_modules/sharp` was missing. The worktree shares node_modules with the main project; `npm install` must have been run somewhere it didn't persist.
- **Fix:** Ran `npm install sharp` from the main project directory `/ClaudeCodeTestit/liikuntahakemisto`
- **Files modified:** `package-lock.json` (in main project)
- **Commit:** Included in task 1 context (not a separate commit — fix was pre-commit)

**2. [Rule 3 - Blocking] Tests used require() pattern incompatible with ESM vitest**
- **Found during:** Task 1 GREEN phase — tests showed MISSING_IMPL even after scraper.ts was created
- **Issue:** Stub pattern from 45-01 used `require('./scraper')` in a try/catch, which fails silently in vitest's ESM transform context
- **Fix:** Rewrote tests to use static ESM `import { scrapeWebsite } from './scraper'` — the correct vitest pattern
- **Files modified:** `lib/branding/scraper.test.ts`
- **Commit:** Included in task 1 (test file is part of the TDD commit)

## Threat Surface Scan

No new network endpoints introduced in this plan. `scraper.ts` contains an SSRF-relevant `fetch(url)` call, but this is documented in the file with:
```
// Caller (route.ts) must validate url protocol and block private IP ranges before calling scrapeWebsite
```
The SSRF guard is explicitly assigned to Plan 04 (route.ts) per T-45-02-01 in the plan's threat model. No new unmitigated surface introduced.

## Known Stubs

None. Both files are fully implemented.

## Self-Check

- [x] `lib/branding/scraper.ts` exists at correct path
- [x] `lib/branding/prompt.ts` exists at correct path
- [x] `lib/branding/scraper.test.ts` contains real assertions (not MISSING_IMPL stubs)
- [x] `npx vitest run lib/branding/scraper.test.ts` — 7/7 PASS
- [x] Commits c9c913f and 7f11407 exist in git log
- [x] No modifications to STATE.md or ROADMAP.md
- [x] TypeScript: no errors in branding/scraper or branding/prompt
