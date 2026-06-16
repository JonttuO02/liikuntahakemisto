---
phase: 47-skeema-monisivuinen-scraper-putki
plan: 05
subsystem: api
tags: [route-handler, ssrf, idor, multi-page-pipeline, business_branding, storage]

# Dependency graph
requires:
  - phase: 47-01
    provides: "business_branding paikka_id (NOT NULL FK) + composite UNIQUE(business_account_id, paikka_id) — live"
  - phase: 47-02
    provides: "lib/branding/ssrfGuard.ts (isUrlSafe), lib/branding/fetchSafe.ts (fetchWithSsrfGuard)"
  - phase: 47-03
    provides: "scrapeWebsite() returning labeledPages + imageUrls (multi-page crawl)"
  - phase: 47-04
    provides: "analyzeWithClaude(logoBuffers, labeledPages, screenshot?) array-based result; captureHomepageScreenshot()"
provides:
  - "POST/GET /api/business/analyze-website fully scoped by (business_account_id, paikka_id)"
  - "IDOR mitigation: business_paikka_links ownership check (approved claim) before analysis/write"
  - "lib/branding/storage.ts: uploadLogoCandidate, uploadGalleryImage"
  - "End-to-end wiring of Plans 47-01..04 into the live route — closes BRDDB-05, SCRAP-06/07/08/09"
affects: [phase-48-logo-vari-ja-galleriavalinta]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Ownership check modeled on existing CR-04 business-account check: .select().eq().eq().eq().maybeSingle() + 403 on null"
    - "Gallery image upload reuses scraper.ts's fetch+sharp-convert idiom inline in route.ts, capped at MAX_GALLERY_UPLOADS=8"

key-files:
  created: []
  modified:
    - app/api/business/analyze-website/route.ts
    - lib/branding/storage.ts

key-decisions:
  - "paikka_id read from POST JSON body (body?.paikka_id) and GET query param (?paikka_id=) per plan's interface note — lowest-friction match with existing url-from-body convention"
  - "Gallery image fetch+upload capped at MAX_GALLERY_UPLOADS=8 (not all up to 15 scraped imageUrls) to bound background-pipeline runtime/cost within the Vercel Hobby waitUntil budget — a Claude's-Discretion addition not explicitly specified as a number in the plan, but required by the plan's own action item 9 to 'cap and document' if fetching all is too costly"
  - "logo_type on the final UPSERT derived as result.logos[0]?.type ?? 'unknown' (no single logo_type field exists anymore on the array-based analyzer result) — preserves the existing DB column without inventing new schema in this plan"
  - "npm install was required before build/tsc would pass — package.json already declared @sparticuz/chromium and playwright-core (added by Plan 47-04) but this worktree's node_modules predated that commit; package-lock.json had zero diff after install, confirming this was a sync, not a new dependency"

requirements-completed: [SCRAP-06, SCRAP-07, SCRAP-08, SCRAP-09]
requirements-partial: [BRDDB-05]

# Metrics
duration: ~35min
completed: 2026-06-16
---

# Phase 47 Plan 05: Wire multi-page pipeline into analyze-website route Summary

**Rewired `app/api/business/analyze-website/route.ts` to ownership-checked, `(business_account_id, paikka_id)`-scoped UPSERTs/queries, replaced the inline SSRF block with the shared `isUrlSafe` validator, and threaded the new multi-page scraper/analyzer/screenshot pipeline through `runAnalysis` — closing the integration gap left by Plans 47-01 through 47-04.**

## Performance

- **Duration:** ~35 min
- **Tasks:** 2/2 auto tasks complete; Task 3 (checkpoint:human-verify, gate=blocking) reached and STOPPED per `autonomous: false` — awaiting human verification, not yet resolved
- **Files modified:** 2 (`lib/branding/storage.ts`, `app/api/business/analyze-website/route.ts`)

## Accomplishments

- `lib/branding/storage.ts` gained `uploadLogoCandidate(businessAccountId, pngBuffer, index)` (path `branding/{id}/logo-{index}.png`) and `uploadGalleryImage(businessAccountId, pngBuffer, index)` (path `branding/{id}/gallery/{index}.png`), both mirroring `uploadLogo`'s exact upload→getPublicUrl→`?t=Date.now()` shape; `uploadLogo` itself left unchanged.
- `route.ts` POST handler: inline SSRF try/catch block removed, replaced with a single `isUrlSafe(url)` guard imported from `@/lib/branding/ssrfGuard`.
- `paikka_id` is read and validated (positive integer) in both POST (JSON body) and GET (query param); missing/invalid returns 400.
- New ownership check (T-47-11/IDOR mitigation): after the existing CR-04 business-account check, queries `business_paikka_links` for `(business_account_id = user.id, paikka_id = paikkaId, claim_status = 'approved')` via `.select('id').eq().eq().eq().maybeSingle()`; returns 403 `{ error: 'You do not own this venue' }` when null.
- All 3 `business_branding` UPSERT call sites (status='analyzing' POST upsert, final-result upsert, failure-path upsert) now use `onConflict: 'business_account_id,paikka_id'` and carry `paikka_id: paikkaId` in their payloads — confirmed via grep (count == 3).
- GET query adds `.eq('paikka_id', paikkaId)` alongside the existing `.eq('business_account_id', ...)` filter, and the `.select(...)` list additively gains `logo_candidates, image_urls, selected_background_color, selected_accent_color` while keeping `logo_url, colors, logo_type, raw_analysis` for Phase-46 consumer compatibility.
- `runAnalysis` signature changed to `(url, businessAccountId, paikkaId: number)`. It now: calls `scrapeWebsite(url)` and destructures `{ logoBuffers, labeledPages, imageUrls, colors }`; captures an optional homepage screenshot via `captureHomepageScreenshot(url)` wrapped in its own try/catch so a screenshot failure never aborts the pipeline; calls `analyzeWithClaude(logoBuffers, labeledPages, screenshot)`; uploads the primary logo via `uploadLogo` (backward compat) plus every distinct Claude-identified logo candidate via `uploadLogoCandidate`, building a `logo_candidates: {url,type}[]` array; fetches, sharp-converts, and uploads up to `MAX_GALLERY_UPLOADS = 8` of the scraped `imageUrls` via `uploadGalleryImage` (each pre-validated with `isUrlSafe` and fetched via `fetchWithSsrfGuard`), building an `image_urls: string[]` array of same-origin Supabase Storage URLs (SEC-46-02 compliant); writes `logo_candidates` and `image_urls` into the final UPSERT alongside the existing `colors`/`logo_url` fields.

## Task Commits

1. **Task 1: Add gallery + multi-logo-candidate upload helpers to storage.ts** - `13ca8a8` (feat)
2. **Task 2: Scope the route by (business_account_id, paikka_id), add ownership check, use shared SSRF validator, thread the new pipeline** - `963497a` (feat)
3. **Task 3: Verify Vercel plan status + end-to-end multi-page pipeline smoke test** - `checkpoint:human-verify` (gate=blocking) — REACHED, NOT YET RESOLVED. See "Checkpoint Status" below.

## Files Created/Modified

- `lib/branding/storage.ts` - Added `uploadLogoCandidate` and `uploadGalleryImage`, mirroring the existing `uploadLogo` shape exactly
- `app/api/business/analyze-website/route.ts` - Full rewrite of POST/GET handlers and `runAnalysis`: ownership check, shared SSRF validator, `(business_account_id, paikka_id)` scoping on all 3 UPSERTs + the GET query, multi-page pipeline wiring (labeledPages, screenshot, logo_candidates, image_urls)

## Decisions Made

- `paikka_id` read from POST JSON body and GET query param, per the plan's interface note — matches the lowest-friction convention since `url` is already read from the body in POST.
- Gallery image fetch+upload is capped at `MAX_GALLERY_UPLOADS = 8` (not the full up-to-15 `imageUrls` the scraper can return) to bound the background pipeline's runtime/cost, since each gallery image requires its own fetch + sharp conversion + Storage upload round-trip on top of the existing logo and Claude API costs. This is a Claude's-Discretion addition — the plan's action item 9 explicitly says "cap and document" if fetching all is too costly, and 8 was chosen as a reasonable middle ground that still surfaces meaningful gallery content without risking the Vercel Hobby `waitUntil` 10s budget on top of everything else the pipeline already does.
- `logo_type` on the final UPSERT is derived as `result.logos[0]?.type ?? 'unknown'` since the analyzer's `BrandingAnalysisResult` no longer has a single `logo_type` field (it's array-based `logos[]` now) — this preserves the existing `logo_type` TEXT column without requiring a new migration in this plan.
- `npm install` was run as a Rule 3 (blocking-issue) auto-fix: `package.json` already declared `@sparticuz/chromium` and `playwright-core` (committed by Plan 47-04), but this worktree's `node_modules` predated that commit and didn't have them installed, causing `tsc --noEmit` to fail on `screenshot.ts`'s imports. Running `npm install` synced `node_modules` to the already-committed `package-lock.json` (confirmed zero diff on the lockfile after install — this was a sync of existing declared dependencies, not the introduction of a new one, so the package-manager-install exclusion under Rule 3 does not apply).
- `.env.local` was copied from the main repo's working directory into this worktree (gitignored, not tracked, never committed) so that `npm run build`'s page-data-collection step could successfully read `NEXT_PUBLIC_SUPABASE_URL`/keys. This is a local dev-environment setup step, not a code or config change — each git worktree needs its own copy of gitignored env files.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] `npm install` to sync node_modules with already-committed package.json**
- **Found during:** Task 2 verification (`npx tsc --noEmit`)
- **Issue:** `lib/branding/screenshot.ts` (created in Plan 47-04, committed) imports `@sparticuz/chromium` and `playwright-core`, both declared in `package.json` and `package-lock.json` by that same plan's commit — but this worktree's `node_modules` directory was stale and didn't have them installed, causing `tsc --noEmit` to report `Cannot find module '@sparticuz/chromium'`.
- **Fix:** Ran `npm install` (no version/package changes — `package-lock.json` diff was empty afterward, confirming pure sync).
- **Files modified:** none (node_modules is gitignored, not committed)
- **Commit:** N/A — no trackable file changes resulted

**2. [Rule 3 - Blocking issue] Copied `.env.local` from main repo into the worktree for build verification**
- **Found during:** `npm run build` verification step (this plan's success criteria explicitly requires `npm run build` to type-check/build cleanly)
- **Issue:** `npm run build`'s "Collecting page data" step crashed with `Error: supabaseUrl is required` while collecting `/api/business/onboarding/save-step` (an unrelated route) — because this worktree had no `.env.local` (gitignored, not shared between worktrees).
- **Fix:** Copied `.env.local` from the main repo checkout (`../../../.env.local`) into the worktree root. This is a local environment file, never committed.
- **Files modified:** none committed (gitignored)
- **Commit:** N/A

---

**Total deviations:** 2 auto-fixed (both environment-sync, Rule 3, no code changes).
**Impact on plan:** None on the delivered code — both fixes were required purely to run the plan's own verification commands (`tsc`, `npm run build`) inside this isolated worktree.

## Checkpoint Status

**Task 3 (`checkpoint:human-verify`, `gate="blocking"`) was reached and this executor STOPPED per `autonomous: false` and the checkpoint protocol — it has NOT been resolved.** No "approved" resume-signal was received in this session, and no live end-to-end smoke test against a real business website / real Supabase Auth session was performed (this plan is `autonomous: false` specifically because that checkpoint requires real human judgment: Vercel project status, an actual deployed/local smoke test with a real venue the human owns, and a multi-venue non-overwrite check).

**What this executor verified locally (automatable parts of the checkpoint, run during Task 2's own verification, ahead of the checkpoint):**
- `npx vitest run` — full suite green: **170/170 tests passed**, 14 test files, including `lib/branding/scraper.test.ts`, `lib/branding/analyzer.test.ts`, `lib/branding/ssrfGuard.test.ts`.
- `npm run build` — succeeded (after the `npm install` + `.env.local` fixes documented above as deviations). Production build compiled successfully, all 30 routes generated, `/api/business/analyze-website` present in the route manifest with no errors.
- `npx tsc --noEmit` — zero errors project-wide (the pre-flagged `route.ts:26` error from Plan 47-04's SUMMARY is resolved; this was this plan's explicit job).
- `grep -c "onConflict: 'business_account_id,paikka_id'"` on `route.ts` returns exactly `3`.
- Vercel project status: **state (a) applies** — no `.vercel/` directory exists in this worktree, and `git log --all` shows no Vercel-deployment-related commits beyond the documentation commit (`f048a71`) that already flagged "no project exists yet." This confirms the plan's own pre-flagged assumption; screenshot capture (`captureHomepageScreenshot`) cannot be exercised against a real deployment in this state — it will degrade to `null` (fail-soft, by design) whenever called from a local/non-deployed context lacking a working Chromium binary path, which is expected and non-fatal per Plan 47-04.

**What remains for a human (or a continuation agent acting on the human's "approved" signal) to do before this plan can be marked fully complete:**
1. Confirm current Vercel project/plan status (state a/b/c) as of right now — re-check in case a project was created since 2026-06-16's last check.
2. End-to-end smoke test: POST with a real `{ url, paikka_id }` for a venue the tester owns with an approved `business_paikka_links` claim; GET back and confirm `status: 'analyzed'`, non-empty `logo_candidates`, an `image_urls` array, and `source_page`-labeled `prices`/`opening_hours` in `raw_analysis`.
3. Multi-venue check (BRDDB-05 live confirmation): analyze venue A, then venue B under the same business account, then re-GET venue A and confirm A's row is untouched.
4. Redirect smoke test (Assumption A1): point at a URL with a same-origin 301 redirect and confirm `fetchWithSsrfGuard` follows it rather than treating it as a failed fetch.

## Known Stubs

None. All code paths in this plan's files are wired to real data sources (scraper, analyzer, Storage, Supabase) — no hardcoded empty/placeholder values were introduced.

## Threat Flags

None beyond what the plan's own `<threat_model>` already anticipated (T-47-11 IDOR, T-47-12 cross-venue overwrite, T-47-13 SSRF, T-47-14 logo_url origin, T-47-SC npm installs) — all four mitigate-disposition threats were addressed exactly as specified. The gallery-image upload path introduces no new trust boundary beyond what T-47-14's SEC-46-02 same-origin-storage rule already covers, since `uploadGalleryImage` writes to the same `business-media` Supabase Storage bucket as the existing logo upload.

## User Setup Required

None new. The Vercel Pro/project-creation prerequisite remains the same pre-existing open item carried from Plans 47-01 and 47-04 (D-03/D-04) — it gates `captureHomepageScreenshot` actually succeeding in a deployed context, not this plan's code completion. Resolving it is part of the Task 3 checkpoint, not a code change.

## Next Phase Readiness

- **Blocked on the Task 3 checkpoint.** Phase 48 (logo/color/gallery selection UI) consumes the GET response shape this plan produces (`logo_candidates`, `image_urls`, `selected_background_color`, `selected_accent_color` alongside the existing fields) — that shape is code-complete and build/test-verified, but the live end-to-end behavior (does a real scrape+analyze+upload run actually populate these fields correctly against a real website) has not been confirmed by a human yet.
- Once the checkpoint is resolved with "approved," Phase 48 can proceed against the GET response shape exactly as implemented: `{ status, logo_url, colors, logo_type, logo_candidates: {url,type}[], image_urls: string[], selected_background_color, selected_accent_color, raw_analysis, error_message, analyzed_at }`.

---
*Phase: 47-skeema-monisivuinen-scraper-putki*
*Completed: 2026-06-16 (Tasks 1-2; Task 3 checkpoint pending human verification)*
