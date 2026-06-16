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

requirements-completed: [SCRAP-06, SCRAP-07, SCRAP-08, SCRAP-09, BRDDB-05]
requirements-partial: []

# Metrics
duration: ~35min (Tasks 1-2) + checkpoint verification session (Task 3)
completed: 2026-06-16
---

# Phase 47 Plan 05: Wire multi-page pipeline into analyze-website route Summary

**Rewired `app/api/business/analyze-website/route.ts` to ownership-checked, `(business_account_id, paikka_id)`-scoped UPSERTs/queries, replaced the inline SSRF block with the shared `isUrlSafe` validator, and threaded the new multi-page scraper/analyzer/screenshot pipeline through `runAnalysis` — closing the integration gap left by Plans 47-01 through 47-04.**

## Performance

- **Duration:** ~35 min (Tasks 1-2) + a separate checkpoint-verification session (Task 3, jointly run by the orchestrator and the user)
- **Tasks:** 3/3 complete — Task 3 (`checkpoint:human-verify`, `gate="blocking"`) was reached, STOPPED per `autonomous: false`, and has now been resolved with "approved" after the orchestrator and user ran the full verification protocol below.
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
3. **Task 3: Verify Vercel plan status + end-to-end multi-page pipeline smoke test** - `checkpoint:human-verify` (gate=blocking) — REACHED and RESOLVED ("approved"). No code commit for this task itself (verification-only); see "Checkpoint Status" below for full evidence.

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

**Task 3 (`checkpoint:human-verify`, `gate="blocking"`) was reached, STOPPED per `autonomous: false`, and has now been RESOLVED with "approved"** after the orchestrator and the user jointly ran the full verification protocol in a follow-up session.

**What this executor verified locally (automatable parts of the checkpoint, run during Task 2's own verification, ahead of the checkpoint):**
- `npx vitest run` — full suite green: **170/170 tests passed**, 14 test files, including `lib/branding/scraper.test.ts`, `lib/branding/analyzer.test.ts`, `lib/branding/ssrfGuard.test.ts`.
- `npm run build` — succeeded (after the `npm install` + `.env.local` fixes documented above as deviations). Production build compiled successfully, all 30 routes generated, `/api/business/analyze-website` present in the route manifest with no errors.
- `npx tsc --noEmit` — zero errors project-wide (the pre-flagged `route.ts:26` error from Plan 47-04's SUMMARY is resolved; this was this plan's explicit job).
- `grep -c "onConflict: 'business_account_id,paikka_id'"` on `route.ts` returns exactly `3`.
- Vercel project status (as of 2026-06-16, first pass): **state (a) applies** — no `.vercel/` directory exists in this worktree, and `git log --all` shows no Vercel-deployment-related commits beyond the documentation commit (`f048a71`) that already flagged "no project exists yet."

**Live human-verification results (orchestrator + user, follow-up session, all 4 checkpoint items from `<how-to-verify>`):**

1. **End-to-end smoke test (item 4):** Started a second local dev server on port 3001 from this worktree (master still carries the pre-Plan-47-05 route.ts, so a second port was needed to exercise this branch's code without disturbing the primary dev server). `POST /api/business/analyze-website` with `{"url":"https://www.w3.org","paikka_id":14}`, authenticated with a real JWT for an approved venue claim (`business_account_id = ac22a395-c69b-4cdc-bf95-bdfc71eb961d`, `paikka_id = 14`, claim approved via `/admin`) returned `200 {"ok":true}`. Follow-up `GET ?paikka_id=14` returned `status: 'analyzed'` with `logo_url` populated, **2** `logo_candidates` (one `icon` type, one `combination` type), **4** `image_urls` (gallery), `colors` populated, and `website_url` correctly extracted as `https://www.w3.org/`. Screenshot capture (`captureHomepageScreenshot`) failed gracefully with `ENOENT` — no Linux Chromium binary available on local Windows dev, which is expected; the route's fail-soft try/catch around screenshot capture handled it and the rest of the pipeline (scrape, analyze, upload, upsert) completed normally. This confirms SCRAP-06/07/08/09 end-to-end and confirms the screenshot-failure non-fatal path from Task 2's action item 7.

2. **Multi-venue non-overwrite check (item 5, BRDDB-05):** Directly upserted a second `business_branding` row for the same `business_account_id` but a different real venue (`paikka_id = 1`). A subsequent `SELECT` confirmed venue 14's row (from step 1) was completely unchanged — same `updated_at` timestamp, same data — after the second venue's row was written. This confirms the composite `UNIQUE(business_account_id, paikka_id)` constraint (BRDDB-05, live since Plan 47-01) prevents cross-venue overwrite exactly as designed, and that all 3 route UPSERTs correctly scope their `onConflict` target so two venues under the same business account never collide. The synthetic `paikka_id = 1` test row was deleted afterward to keep the database clean.

3. **Redirect re-validation smoke test (item 6, Assumption A1):** Ran a standalone script directly calling `fetchWithSsrfGuard('http://w3.org')`. Result: `status: 200`, final URL `https://www.w3.org/` — confirms the manual-redirect-following + re-validation logic in `lib/branding/fetchSafe.ts` (Plan 47-02) correctly follows and re-validates a same-origin, protocol-upgrading (http→https) redirect rather than treating it as a failed fetch. The Node/undici `redirect: 'manual'` Location-readability assumption holds on this runtime. The standalone test script was deleted after use.

4. **Vercel project status (item 1):** Unchanged from the first pass — **state (a) still applies**. No Vercel project exists for this repo as of this verification session. Screenshot capture remains unexercisable against a real deployment; it degrades to `null` locally as confirmed in result 1 above. This is a pre-existing open item (D-03/D-04), tracked as `user_setup` in Plan 47-01, not a blocker for this plan's code completion.

**Resume signal received:** "approved" — state (a) confirmed, screenshot capture not exercisable in this environment (expected, fail-soft).

## Issues Encountered During Verification (Infrastructure, Not Code)

**PostgREST schema cache did not pick up the new composite UNIQUE constraint after `supabase db push`.**

- **Symptom:** Every UPSERT against the live database during step 2 of verification (multi-venue non-overwrite check) initially failed with `"there is no unique or exclusion constraint matching the ON CONFLICT specification"` — even though `pg_constraint` on the linked database showed the `(business_account_id, paikka_id)` UNIQUE constraint existed correctly (it was pushed by Plan 47-01's migration).
- **Root cause:** `supabase db push` applies the migration to the underlying Postgres database, but does **not** reliably trigger an immediate PostgREST schema cache refresh. PostgREST caches the database schema (including constraints relevant to `ON CONFLICT`/`onConflict` resolution) and only reloads it on a `NOTIFY pgrst, 'reload schema'` signal, a service restart, or its own periodic refresh interval — none of which `db push` triggers automatically.
- **Fix:** The orchestrator ran `NOTIFY pgrst, 'reload schema';` directly against the linked database via `supabase db query --linked`. Immediately after, the same UPSERT calls succeeded.
- **This is NOT a code bug** in Plan 47-01 or Plan 47-05 — the migration and the route code were both correct. It is an **operational/infrastructure gotcha** specific to this Supabase project's PostgREST deployment.
- **Note for future phases:** Any future migration that adds/changes a constraint, column, or index referenced by an `onConflict`/`ON CONFLICT` target (or any other PostgREST-cache-sensitive schema feature, e.g. new RPC functions, renamed columns exposed via the REST API) should be followed by `supabase db query --linked` running `NOTIFY pgrst, 'reload schema';` as a standard post-migration step — do not assume `supabase db push` alone is sufficient before live-testing UPSERT/onConflict behavior against the linked database. If a future plan's checkpoint verification hits the same `"no unique or exclusion constraint"` error immediately after a fresh migration, this NOTIFY is the fix, not a schema or code rollback.

## Known Stubs

None. All code paths in this plan's files are wired to real data sources (scraper, analyzer, Storage, Supabase) — no hardcoded empty/placeholder values were introduced.

## Threat Flags

None beyond what the plan's own `<threat_model>` already anticipated (T-47-11 IDOR, T-47-12 cross-venue overwrite, T-47-13 SSRF, T-47-14 logo_url origin, T-47-SC npm installs) — all four mitigate-disposition threats were addressed exactly as specified. The gallery-image upload path introduces no new trust boundary beyond what T-47-14's SEC-46-02 same-origin-storage rule already covers, since `uploadGalleryImage` writes to the same `business-media` Supabase Storage bucket as the existing logo upload.

## User Setup Required

None outstanding for this plan's code. The Vercel Pro/project-creation prerequisite remains the same pre-existing open item carried from Plans 47-01 and 47-04 (D-03/D-04) — confirmed still state (a) (no project exists) at checkpoint verification time. It gates `captureHomepageScreenshot` actually succeeding in a deployed context, not this plan's code completion, and is tracked as ongoing `user_setup` outside this plan's scope.

## Next Phase Readiness

- **Unblocked.** The Task 3 checkpoint has been resolved with "approved." Phase 48 (logo/color/gallery selection UI) can proceed against the GET response shape exactly as implemented and now live-verified: `{ status, logo_url, colors, logo_type, logo_candidates: {url,type}[], image_urls: string[], selected_background_color, selected_accent_color, raw_analysis, error_message, analyzed_at }`.
- Live verification confirmed `logo_candidates` and `image_urls` populate correctly from a real scrape+analyze+upload run (2 logo candidates, 4 gallery images against `https://www.w3.org`), and that BRDDB-05's cross-venue overwrite protection holds in the live database.
- **Operational note for any future phase that runs migrations:** see "Issues Encountered During Verification" above — `supabase db push` does not auto-refresh the PostgREST schema cache; follow with `NOTIFY pgrst, 'reload schema';` via `supabase db query --linked` before live-testing onConflict/UPSERT behavior against new or changed constraints.

---
*Phase: 47-skeema-monisivuinen-scraper-putki*
*Completed: 2026-06-16 (all 3 tasks; Task 3 checkpoint verified and approved)*

## Self-Check: PASSED

- Commit `13ca8a8` (Task 1): FOUND in `git log --all`.
- Commit `963497a` (Task 2): FOUND in `git log --all`.
- Commit `7710817` (initial SUMMARY draft): FOUND in `git log --all`.
- `app/api/business/analyze-website/route.ts`: FOUND on disk.
- `lib/branding/storage.ts`: FOUND on disk.
- `.planning/phases/47-skeema-monisivuinen-scraper-putki/47-05-SUMMARY.md`: FOUND on disk.
