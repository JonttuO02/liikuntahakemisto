---
phase: 45-scraper-claude-api-putki
verified: 2026-06-15T22:20:00Z
status: human_needed
score: 5/5 must-haves verified
overrides_applied: 0
human_verification:
  - test: "POST /api/business/analyze-website triggers real full pipeline against a live URL"
    expected: "After ~30s, business_branding row shows status='analyzed', logo_url points to business-media Storage, colors is non-empty, raw_analysis contains prices and opening_hours keys"
    why_human: "Pipeline uses waitUntil fire-and-forget with real network I/O, real Claude API, and real Supabase Storage upload — none of these can be verified without a running dev server and valid ANTHROPIC_API_KEY + business JWT"
  - test: "GET /api/business/analyze-website returns {status:'pending'} when no row exists for the caller"
    expected: "{\"status\":\"pending\"} response with 200"
    why_human: "Requires a business account that has not triggered POST yet — database state-dependent"
  - test: "Error path: status='failed' with error_message set in business_branding when pipeline fails"
    expected: "When given a URL that returns non-200 (e.g., https://httpstat.us/500), business_branding shows status='failed' and error_message='Sivua ei saatu ladattua: ...'"
    why_human: "Requires live network call through waitUntil; error path is inside async fire-and-forget that cannot be intercepted by grep"
---

# Phase 45: Scraper & Claude API -putki Verification Report

**Phase Goal:** Build a server-side Route Handler that accepts a URL, fetches its HTML, extracts branding candidates (CSS colors, logo images), converts them to PNG via sharp, and sends a single Claude vision API call returning structured JSON for logo, colors, prices, opening_hours, and website_url.
**Verified:** 2026-06-15T22:20:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC-1 | POST /api/business/analyze-website fetches the given URL server-side with correct User-Agent header and doesn't expose API keys to the client | VERIFIED | `scraper.ts:45` sets `User-Agent: 'Mozilla/5.0 (compatible; AktiiviBot/1.0)'`; `analyzer.ts:6` uses `process.env.ANTHROPIC_API_KEY` (server-env only, no `NEXT_PUBLIC_` prefix); route is Node.js runtime-only |
| SC-2 | Endpoint extracts `<meta name="theme-color">`, CSS `:root` variables (external .css fetched in parallel), and logo candidates: favicon, og:image, img[*=logo] | VERIFIED | `scraper.ts:54–95` extracts theme-color and `:root` hex vars; parallel CSS fetch via `Promise.all` at line 74; logo candidates collected in priority order: favicon (line 101), og:image (line 120), img[*=logo] (line 134) |
| SC-3 | Logo candidates (SVG, AVIF, WebP) converted to PNG via sharp before Claude call — passed as base64 in vision content | VERIFIED | `scraper.ts:17–28` `toPngBase64()` uses `sharp().resize(512,512).png().toBuffer()`; `analyzer.ts:36` encodes as raw base64 (no data-URI prefix); `analyzer.ts:39–46` builds image vision content items |
| SC-4 | Single Claude API call: logo candidates as vision content + HTML text as text content → Claude returns `{ logo_url, logo_type, colors: string[], prices: PriceRow[], opening_hours: HoursRow[], website_url }` | VERIFIED | `analyzer.ts:56–59` makes exactly one `anthropic.messages.create` call; `analyzer.ts:53` places image items before text (official best practice); response shape matches at lines 67–74; `prompt.ts` defines full structured JSON schema |
| SC-5 | Endpoint stores analysis result in `business_branding` table with status `analyzed`; on error sets status `failed` with error message | VERIFIED | `route.ts:37–54` UPSERTs `status:'analyzed'` with `logo_url`, `logo_type`, `colors`, `website_url`, `raw_analysis`, `error_message: null`; `route.ts:58–68` catch block UPSERTs `status:'failed'` with `error_message` |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/api/business/analyze-website/route.ts` | POST trigger + GET status poll | VERIFIED | 161 lines; exports POST, GET, runtime='nodejs'; imports all lib/branding/* modules |
| `lib/branding/scraper.ts` | HTML fetch + CSS/logo extraction | VERIFIED | 200 lines; substantive implementation with sharp conversion, parallel CSS fetch |
| `lib/branding/analyzer.ts` | Claude API call | VERIFIED | 100 lines; real Anthropic SDK call, JSON fence stripping, bounds validation |
| `lib/branding/storage.ts` | Supabase Storage upload | VERIFIED | 31 lines; uploads PNG to `branding/{accountId}/logo.png` in `business-media` bucket |
| `lib/branding/prompt.ts` | Claude prompt | VERIFIED | 43 lines; full structured prompt defining all required output fields |
| `lib/branding/scraper.test.ts` | Unit tests for scraper | VERIFIED | 7 test cases covering SC-01 through SC-05; all 15 tests pass |
| `lib/branding/analyzer.test.ts` | Unit tests for analyzer | VERIFIED | 8 test cases; mocks Anthropic SDK; tests bounds validation, markdown fence stripping, content ordering |
| `supabase/migrations/20260615000001_business_branding.sql` | business_branding table + RLS | VERIFIED | Creates table with all required columns; enables RLS; SELECT/INSERT/UPDATE policies |
| `supabase/migrations/20260615000002_fix_logo_type_constraint.sql` | Fix logo_type constraint | VERIFIED | Drops old constraint (icon/icon_with_text/text_only) and adds correct one (wordmark/icon/combination/unknown) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `route.ts` | `lib/branding/scraper.ts` | `import { scrapeWebsite }` | WIRED | `route.ts:4` imports; `route.ts:23` calls `scrapeWebsite(url)` |
| `route.ts` | `lib/branding/analyzer.ts` | `import { analyzeWithClaude }` | WIRED | `route.ts:5` imports; `route.ts:26` calls `analyzeWithClaude(logoBuffers, htmlSnippet)` — correctly passes buffers not URLs |
| `route.ts` | `lib/branding/storage.ts` | `import { uploadLogo }` | WIRED | `route.ts:6` imports; `route.ts:31` calls `uploadLogo(businessAccountId, logoBuffers[result.logo_index])` |
| `route.ts` | `business_branding` table | `supabaseAdmin.from('business_branding').upsert` | WIRED | Three UPSERT calls: analyzing (line 119), analyzed (line 38), failed (line 59) |
| `analyzer.ts` | `lib/branding/prompt.ts` | `import { BRANDING_ANALYSIS_PROMPT }` | WIRED | `analyzer.ts:4` imports; `analyzer.ts:51` uses in text content |
| `scraper.ts` | `sharp` | `import sharp from 'sharp'` | WIRED | `scraper.ts:4` imports; `scraper.ts:19` calls `sharp(buffer).resize().png().toBuffer()` |

### Data-Flow Trace (Level 4)

| Stage | Data Variable | Source | Produces Real Data | Status |
|-------|--------------|--------|--------------------|--------|
| scraper → analyzer | `logoBuffers: Buffer[]` | `sharp().toBuffer()` on fetched image bytes | Yes — real PNG conversion | FLOWING |
| analyzer → Claude | `base64Images` | `Buffer.toString('base64')` from logoBuffers | Yes — real base64 encoding | FLOWING |
| Claude response → DB | `result` (BrandingAnalysisResult) | `anthropic.messages.create` JSON parse | Yes — real API result parsed | FLOWING |
| DB UPSERT → storage | `logo_url`, `status`, `colors`, etc. | `supabaseAdmin.from('business_branding').upsert` | Yes — real Supabase write | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Unit tests green | `npx vitest run lib/branding/scraper.test.ts lib/branding/analyzer.test.ts` | 2 files, 15 tests passed | PASS |
| TypeScript no errors | `npx tsc --noEmit \| grep branding` | No output (no errors) | PASS |
| runtime='nodejs' declared | grep in route.ts | `export const runtime = 'nodejs'` at line 10 | PASS |
| SSRF guard: 169.254.169.254 blocked | grep in route.ts | line 109: `hostname === '169.254.169.254'` | PASS |
| SSRF guard: protocol check | grep in route.ts | line 98: `parsed.protocol !== 'http:' && parsed.protocol !== 'https:'` | PASS |
| Status machine complete | grep in route.ts | 'analyzing' (line 122), 'analyzed' (line 44), 'failed' (line 63) | PASS |
| error_message in catch | grep in route.ts | line 64: `error_message: err instanceof Error ? err.message : 'Tuntematon virhe'` | PASS |
| analyzeWithClaude receives logoBuffers not logoUrls | grep in route.ts | line 26: `analyzeWithClaude(logoBuffers, htmlSnippet)` | PASS |

### Probe Execution

Step 7c: SKIPPED — no `scripts/*/tests/probe-*.sh` files exist for this phase. Human checkpoint in plan 45-04-PLAN.md provides the equivalent verification via curl commands.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| SCRAP-01 | 45-02, 45-04 | Fetch URL with Mozilla User-Agent, server-side | SATISFIED | `scraper.ts:45` |
| SCRAP-02 | 45-02 | Extract theme-color meta + :root CSS variables from parallel-fetched stylesheets | SATISFIED | `scraper.ts:54–95`, parallel fetch at line 74 |
| SCRAP-03 | 45-02 | Collect logo candidates: favicon, og:image, img[*=logo] | SATISFIED | `scraper.ts:98–165` |
| SCRAP-04 | 45-03 | Single Claude API call with vision + text → structured JSON including prices, opening_hours, website_url | SATISFIED | `analyzer.ts:56–95`, `prompt.ts` |
| SCRAP-05 | 45-02, 45-03 | sharp PNG conversion before Claude call | SATISFIED | `scraper.ts:17–28`, `route.ts:26` passes logoBuffers |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None found | — | No TBD/FIXME/XXX markers; no placeholder returns; no stub handlers | — | — |

No debt markers, no unreferenced TODOs, no empty implementations detected in any Phase 45 file.

### Human Verification Required

#### 1. Full end-to-end pipeline with live URL

**Test:** With dev server running and ANTHROPIC_API_KEY set, POST to the endpoint with a real public URL (e.g., `https://yle.fi`), then poll GET until status changes from 'analyzing'.
**Expected:** After pipeline completes: `status='analyzed'`, `logo_url` is a non-null Supabase Storage URL, `colors` is a non-empty array, `raw_analysis` object contains `prices` and `opening_hours` keys (may be empty arrays), `website_url` is a string.
**Why human:** End-to-end pipeline runs through `waitUntil` fire-and-forget with real network I/O, real Claude API call, and real Supabase Storage upload. Cannot be verified with grep or unit tests.

#### 2. Pending state when no branding row exists

**Test:** Use a business account that has never called POST. Issue GET `/api/business/analyze-website` with that account's JWT.
**Expected:** `{"status":"pending"}` with HTTP 200.
**Why human:** Requires a specific database state (no row for account) that cannot be asserted programmatically without a live Supabase connection.

#### 3. Error path: status='failed' with error_message

**Test:** POST with a URL that will fail (e.g., `https://httpstat.us/500` or an unreachable domain). Poll GET after ~10 seconds.
**Expected:** `status='failed'`, `error_message` contains the error text (e.g., "Sivua ei saatu ladattua").
**Why human:** Requires the waitUntil background function to complete its catch path against a real failing URL — cannot be replicated via mocks in grep-based verification.

### Gaps Summary

No gaps found. All 5 roadmap success criteria are verified in the codebase:

- SC-1: Server-side fetch with correct User-Agent; ANTHROPIC_API_KEY is a server-only env var (no `NEXT_PUBLIC_` prefix); route is Node.js runtime only.
- SC-2: Full extraction of theme-color meta, parallel CSS stylesheet fetch, :root hex variable parsing, and three-tier logo candidate collection.
- SC-3: sharp conversion to PNG with 512px max resize before Claude; raw base64 encoding without data-URI prefix; image content items built correctly.
- SC-4: Exactly one Claude API call; images-before-text content ordering; structured JSON response with all required fields including prices, opening_hours, website_url; markdown fence stripping; logo_index bounds validation.
- SC-5: Status machine with three states (analyzing → analyzed/failed); error_message column set on failure; raw_analysis stores full result; `analyzed_at` column populated on success.

The only outstanding items are three human verifications that require a live dev server, valid JWT, and real ANTHROPIC_API_KEY — they cannot be replicated through static analysis.

---

_Verified: 2026-06-15T22:20:00Z_
_Verifier: Claude (gsd-verifier)_
