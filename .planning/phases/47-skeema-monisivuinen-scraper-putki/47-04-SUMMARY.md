---
phase: 47-skeema-monisivuinen-scraper-putki
plan: 04
subsystem: api
tags: [claude-vision, anthropic-sdk, playwright, sparticuz-chromium, vercel, nextjs-config, branding-analyzer]

# Dependency graph
requires:
  - phase: 45-scraper-claude-api-putki
    provides: original single-page analyzeWithClaude/BRANDING_ANALYSIS_PROMPT this plan reshapes
provides:
  - "Verbatim user-authored multi-page BRANDING_ANALYSIS_PROMPT (D-01)"
  - "analyzeWithClaude(logoCandidatesBuffers, labeledPages, screenshot?) — array-based logos/colors with runtime validation"
  - "captureHomepageScreenshot — fail-soft Playwright + @sparticuz/chromium homepage screenshot module"
  - "Next.js 14.2 serverComponentsExternalPackages + outputFileTracingIncludes config for shipping Chromium on Vercel"
affects: [47-05-wire-scraper-pipeline, 48-logo-vari-ja-galleriavalinta]

# Tech tracking
tech-stack:
  added: ["playwright-core@1.61.0 (production dep)", "@sparticuz/chromium@149.0.0 (production dep)"]
  patterns:
    - "Array-based logos/colors with per-entry runtime validation (out-of-bounds index drop, invalid enum default to 'unknown') mirrors existing VALID_LOGO_TYPES/WR-04 idiom"
    - "Fail-soft Buffer | null screenshot module — never throws, logs [branding/screenshot] prefix"
    - "Additive backward-compat field (logo_index) alongside new array shape to avoid breaking pre-Phase-48 callers"

key-files:
  created:
    - lib/branding/screenshot.ts
  modified:
    - package.json
    - next.config.mjs
    - lib/branding/prompt.ts
    - lib/branding/analyzer.ts
    - lib/branding/analyzer.test.ts

key-decisions:
  - "Installed playwright-core (not full playwright) as the production runtime import, per RESEARCH.md option (b) — keeps the existing playwright devDependency untouched and avoids bundling browser binaries twice"
  - "Re-verified playwright-core/@sparticuz-chromium versions against the live npm registry immediately before install — both matched RESEARCH.md's recommended versions exactly (1.61.0 / 149.0.0), no newer pair was published"
  - "Kept app/api/business/analyze-website/route.ts on the old analyzeWithClaude signature/logo_type field for now — wiring it to the new shape is explicitly Plan 47-05's scope per this plan's <interfaces> note ('wired in Plan 47-05')"

patterns-established:
  - "Screenshot-before-logos-before-text content array ordering for Claude vision calls"
  - "[PAGE: <label>] section labeling convention for multi-page HTML assembled into a single text content block"

requirements-completed: [SCRAP-08]

# Metrics
duration: 20min
completed: 2026-06-16
---

# Phase 47 Plan 04: Branding prompt + multi-page analyzer reshape + homepage screenshot Summary

**Replaced the v2.1 branding prompt with the verbatim multi-page version, reshaped `analyzeWithClaude` to return array-based `logos`/`colors` with per-page `source_page` provenance and an optional homepage screenshot input, and added a fail-soft Playwright + `@sparticuz/chromium` screenshot module with Next.js 14.2 serverless-externalization config.**

## Performance

- **Duration:** 20 min
- **Started:** 2026-06-16T11:23:00Z
- **Completed:** 2026-06-16T11:43:04Z
- **Tasks:** 3 (Task 3 is TDD: test → feat)
- **Files modified:** 6 (1 created, 5 modified)

## Accomplishments
- `lib/branding/prompt.ts` now holds the exact user-authored prompt from CONTEXT.md `<specifics>` (array `logos`, `{hex,role}[]` colors, `source_page` on prices/opening_hours, "only use content that belongs to THIS company" scope instruction) — copied verbatim, not paraphrased.
- `lib/branding/screenshot.ts` created: `captureHomepageScreenshot(url)` launches `playwright-core` with `@sparticuz/chromium`'s `executablePath()`, returns `Buffer | null`, never throws (errors caught and logged with `[branding/screenshot]` prefix).
- `lib/branding/analyzer.ts` reshaped: new signature `analyzeWithClaude(logoCandidatesBuffers, labeledPages, screenshot?)`; returns array-based `logos: {index,type}[]` and `colors: {hex,role}[]` with defensive runtime validation (out-of-bounds logo indexes dropped, invalid `type`/`role` defaulted to `'unknown'`, non-hex colors filtered, colors capped at 6); `prices`/`opening_hours` entries always carry a string `source_page` (coerced, never `undefined`); screenshot — when provided — is sent as an image content block before the logo candidate images and the text block; text content is assembled from `labeledPages` as `[PAGE: <label>]\n<html>` sections; backward-compat `logo_index` (`= logos[0]?.index ?? -1`) kept additively.
- `package.json` gained `playwright-core@1.61.0` and `@sparticuz/chromium@149.0.0` as production dependencies (existing `playwright` devDependency untouched); `next.config.mjs` gained `experimental.serverComponentsExternalPackages` (Next 14.2 key, not Next-15's `serverExternalPackages`) and `experimental.outputFileTracingIncludes` mapping the analyze-website route to the Chromium bin directory.

## Task Commits

Each task was committed atomically:

1. **Task 1: Install playwright-core + @sparticuz/chromium and configure Next.js 14.2 externalization** - `34d9e1a` (feat)
2. **Task 2: Replace the prompt and build the fail-soft screenshot module** - `fe117a5` (feat)
3. **Task 3: Reshape analyzeWithClaude for labeled multi-page input + array-based logos/colors** - `0843445` (test, RED) → `18153bd` (feat, GREEN)

**Plan metadata:** committed as part of this SUMMARY.md commit (worktree mode — STATE.md/ROADMAP.md updates owned by orchestrator).

_Note: Task 3 is TDD — test commit (RED, 10 failing/6 passing against old shape) followed by feat commit (GREEN, all 16 passing). No refactor commit was needed; the GREEN implementation was already clean._

## Files Created/Modified
- `lib/branding/screenshot.ts` - NEW: fail-soft `captureHomepageScreenshot(url): Promise<Buffer | null>` using `playwright-core` + `@sparticuz/chromium`
- `lib/branding/prompt.ts` - Replaced `BRANDING_ANALYSIS_PROMPT` verbatim with the D-01 multi-page prompt + HUOM comment block
- `lib/branding/analyzer.ts` - Reshaped `analyzeWithClaude` signature and `BrandingAnalysisResult` to array-based `logos`/`colors`, added `LogoType`/`ColorRole`/`LabeledPage` exports
- `lib/branding/analyzer.test.ts` - Rewritten for the new signature; added `describe('analyzeWithClaude multi-page / SCRAP-08', ...)` covering every behavior-block case
- `package.json` - Added `playwright-core` and `@sparticuz/chromium` production dependencies
- `next.config.mjs` - Added `experimental.serverComponentsExternalPackages` + `experimental.outputFileTracingIncludes`

## Decisions Made
- Chose RESEARCH.md option (b): `playwright-core` as its own explicit production dependency, leaving the existing unused `playwright` devDependency alone for clean dev/prod separation — avoids importing the full `playwright` package (with bundled browser binaries) into the production background-pipeline code.
- Re-verified both package versions against the live npm registry immediately before installing (`npm view @sparticuz/chromium version` → `149.0.0`, `npm view playwright-core version` → `1.61.0`) — both matched RESEARCH.md's pinned versions exactly; no newer compatible pair needed to be substituted.
- Kept the additive backward-compat `logo_index` field (rather than only `logos[0]?.index`) so Plan 47-05's existing upload/UPSERT call sites and the Phase-46 GET consumer have an unambiguous, directly-derivable field once wired — per RESEARCH.md Pitfall 5 guidance to keep this phase's analyzer change non-breaking for currently-deployed consumers.

## Deviations from Plan

None - plan executed exactly as written. The package versions, Next.js config keys, prompt text, screenshot implementation, and analyzer reshape all matched the plan's `<action>`/`<interfaces>` specifications verbatim.

## Issues Encountered

`npx tsc --noEmit` surfaces 2 pre-existing type errors in `app/api/business/analyze-website/route.ts` (line 26: passing a `string` where `LabeledPage[]` is now expected; line 44: `result.logo_type` no longer exists on `BrandingAnalysisResult`). This is expected, in-scope breakage explicitly called out in the plan's `<interfaces>` section ("New analyzer input shape ... consumed from Plan 47-03's ScrapeResult, wired in Plan 47-05") and in RESEARCH.md ("Plan 47-05 Task 2 (additive GET response shape)"). Plan 47-04's `files_modified` frontmatter does not include `route.ts` — fixing these call sites is Plan 47-05's responsibility, not a deviation to auto-fix here. The plan's own verification command (`npx vitest run lib/branding/analyzer.test.ts`) is scoped to exactly the files this plan owns and passes cleanly (16/16).

## User Setup Required

None for this plan specifically — the Vercel Pro / project-creation prerequisite (`user_setup` block in this plan's frontmatter) is the same out-of-band action already flagged by Plan 47-01; it gates `captureHomepageScreenshot` actually succeeding in production (the function degrades to `null` on Hobby/no-deployment, which is the intended fail-soft behavior, not a blocker for this plan's completion).

## Next Phase Readiness

- `analyzeWithClaude`'s new signature and `BrandingAnalysisResult` shape are ready for Plan 47-05 to wire against: `analyzeWithClaude(logoCandidatesBuffers: Buffer[], labeledPages: Array<{label: string; html: string}>, screenshot?: Buffer | null)` returning `{ logos: {index,type}[], colors: {hex,role}[], prices: {label,price,source_page}[], opening_hours: {day,open,close,source_page}[], website_url: string, raw_analysis: unknown, logo_index: number }`.
- `captureHomepageScreenshot(url: string): Promise<Buffer | null>` is ready to be called from Plan 47-05's `runAnalysis` background pipeline, gated by a Vercel-Pro-availability check (per D-04/Pitfall 3 — do not attempt to fit it into Hobby's 10s `waitUntil` budget).
- **Caveat to smoke-test in a preview deployment (RESEARCH.md Assumption A2 / Pitfall 2):** `outputFileTracingIncludes` for the Chromium bin directory should be verified against a real Vercel preview deployment once a Vercel project exists — local `tsc`/`vitest` cannot confirm the binary actually ships with the deployed function bundle.
- `app/api/business/analyze-website/route.ts` currently fails `tsc --noEmit` against the new analyzer shape (2 errors, both at known call sites) — this is intentional, pre-flagged, and blocks Plan 47-05 from skipping its own Task on wiring the route to the new shape.

---
*Phase: 47-skeema-monisivuinen-scraper-putki*
*Completed: 2026-06-16*
