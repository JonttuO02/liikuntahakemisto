---
phase: 47-skeema-monisivuinen-scraper-putki
fixed_at: 2026-06-16T15:47:15Z
review_path: .planning/phases/47-skeema-monisivuinen-scraper-putki/47-REVIEW.md
iteration: 1
findings_in_scope: 7
fixed: 7
skipped: 0
status: all_fixed
---

# Phase 47: Code Review Fix Report

**Fixed at:** 2026-06-16T15:47:15Z
**Source review:** .planning/phases/47-skeema-monisivuinen-scraper-putki/47-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 7 (4 critical, 3 warning — `fix_scope: critical_warning`; IN-01 and IN-02 excluded)
- Fixed: 7
- Skipped: 0

## Fixed Issues

### CR-01: Storage upload paths not scoped by paikka_id — cross-venue file overwrite

**Files modified:** `lib/branding/storage.ts`, `app/api/business/analyze-website/route.ts`
**Commit:** 70e0066
**Applied fix:** Added a `paikkaId: number` parameter to `uploadLogo`, `uploadLogoCandidate`, and `uploadGalleryImage`, and inserted it into the storage path (`branding/{businessAccountId}/{paikkaId}/...`) ahead of the filename segment. Fixed together with WR-01 in the same commit since the storage and route changes are not independently valid (a storage-only or route-only change would break the build).

### WR-01: `uploadLogo` call sites pass only `businessAccountId`, silently dropping per-venue context

**Files modified:** `app/api/business/analyze-website/route.ts` (same commit as CR-01)
**Commit:** 70e0066
**Applied fix:** Updated all three call sites in `runAnalysis` (`uploadLogo`, `uploadLogoCandidate`, `uploadGalleryImage`) to pass the already-in-scope `paikkaId` parameter through to the storage functions.

### CR-02: SSRF guard never blocks the IPv6 loopback literal `[::1]`

**Files modified:** `lib/branding/ssrfGuard.ts`, `lib/branding/ssrfGuard.test.ts`
**Commit:** d22b323
**Applied fix:** Added `hostname === '[::1]'` to the blocklist — verified directly that `new URL('http://[::1]').hostname` produces the bracketed string `"[::1]"` in this Node version, matching the review's claim exactly. Fixed together with CR-03 and WR-03 since all three modify the same tight `isPrivate` expression block in the same function. Added regression test `rejects the bracketed IPv6 loopback literal [::1]`.

### CR-03: SSRF guard bypassed by IPv4-mapped IPv6 addresses

**Files modified:** `lib/branding/ssrfGuard.ts`, `lib/branding/ssrfGuard.test.ts` (same commit as CR-02)
**Commit:** d22b323
**Applied fix:** Verified directly that Node normalizes `::ffff:127.0.0.1`, `::ffff:169.254.169.254`, and `::ffff:192.168.1.1` to hex-colon form (`[::ffff:7f00:1]` etc.), not dotted-decimal — confirming the review's exact claim. Implemented two-stage detection: (1) a regex that catches a dotted-decimal IPv4-mapped form if one were ever present and re-runs it recursively through `isUrlSafe`, and (2) a hex-form fallback regex (`/^\[?::ffff:[\da-f]+:[\da-f]+\]?$/`) that rejects the actual normalized form Node produces. Verified the hex fallback correctly returns `false` for all three documented bypass cases. Added 3 regression tests covering each documented bypass URL.

### CR-04: Homepage screenshot capture bypasses SSRF redirect guard entirely

**Files modified:** `lib/branding/screenshot.ts`
**Commit:** d824b80
**Applied fix:** Added `page.route('**/*', ...)` request interception in `captureHomepageScreenshot`, routing every navigation and sub-resource request (including redirect hops) through the existing `isUrlSafe` guard and aborting any that target a private/internal address. Used the `page.route` approach from the review's fix suggestion (single interception point covers all redirects, simpler than manual hop re-validation). Verified the existing try/catch/finally still fully wraps the new code — an aborted navigation throws inside `page.goto`, is caught by the existing catch block, logs the error, and returns `null`, preserving the fail-soft contract. No test file existed for this module (Playwright requires a browser context not exercised by the existing unit test suite) — flagged below for human verification since this is a security-relevant runtime behavior change that unit tests in this codebase do not currently cover.

**Note:** This fix involves Playwright runtime/browser behavior that cannot be fully exercised by the existing test suite (no `screenshot.test.ts` exists, and adding one would require mocking Playwright's browser/page/route APIs). Status: **fixed: requires human verification** — recommend manually confirming the redirect-abort behavior against a live or mocked scenario before this phase proceeds to verification.

### WR-02: Hex color regex accepts invalid 4- and 5-digit hex strings

**Files modified:** `lib/branding/analyzer.ts`, `lib/branding/analyzer.test.ts`
**Commit:** 84ca280
**Applied fix:** Tightened the regex from `/^#[0-9a-fA-F]{3,6}$/` to `/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/`, accepting only valid 3-digit shorthand or 6-digit hex strings (rejecting 4- and 5-digit strings). Chose the "allow 3 OR 6" variant over the review's strict 6-only alternative since 3-digit shorthand is valid CSS and existing test fixtures don't rule it out. Added a regression test confirming `#1234`/`#12345` are rejected while `#abc`/`#aabbcc` are accepted.

### WR-03: `isUrlSafe` false-positives on legitimate domains starting with `fc`/`fd`

**Files modified:** `lib/branding/ssrfGuard.ts`, `lib/branding/ssrfGuard.test.ts` (same commit as CR-02/CR-03)
**Commit:** d22b323
**Applied fix:** Added an `isIPv6Literal` guard (`hostname.startsWith('[') || hostname.includes(':')`) and scoped the `fd`/`fc` ULA prefix check to only apply when the hostname is an actual IPv6 literal. Verified directly that `isUrlSafe('http://fcbank.com')` and `isUrlSafe('http://fdating.com')` returned `false` before the fix and `true` after. Added regression test `allows legitimate domains starting with fc/fd (not IPv6 ULA literals)`.

## Skipped Issues

None — all in-scope findings were fixed.

## Verification

- All 22 tests in `ssrfGuard.test.ts` pass (17 pre-existing + 5 new regression tests).
- All 17 tests in `analyzer.test.ts` pass (16 pre-existing + 1 new regression test).
- Full suite: `npx vitest run` → 176 tests passed across 14 test files, no regressions.
- `npm run build` → compiles successfully, type checking passes with no new errors (only pre-existing `<img>`-element ESLint warnings unrelated to this fix set). An initial build failure (`supabaseUrl is required`) was traced to the worktree missing the untracked `.env.local` file (by design — worktrees only contain git-tracked files); the build was re-verified after temporarily copying the env file and completed successfully with all routes compiling, confirming the failure was a worktree environment artifact, not a defect from these fixes.
- IN-01 and IN-02 were excluded per `fix_scope: critical_warning` and remain undocumented in this report — see source REVIEW.md for details if a future iteration with `fix_scope: all` is run.

---

_Fixed: 2026-06-16T15:47:15Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
