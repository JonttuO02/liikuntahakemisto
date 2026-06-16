---
phase: 47-skeema-monisivuinen-scraper-putki
plan: 02
subsystem: security
tags: [ssrf, fetch, vitest, tdd, redirect-validation]

# Dependency graph
requires:
  - phase: 45-scraper-claude-api-putki
    provides: "lib/branding/scraper.ts fetch idiom (User-Agent + AbortSignal.timeout) and the inline SSRF check in route.ts that this plan extracts"
provides:
  - "lib/branding/ssrfGuard.ts — pure isUrlSafe(url) validator (no next/server import), usable from both route.ts and scraper.ts"
  - "lib/branding/fetchSafe.ts — fetchWithSsrfGuard wrapper that re-validates every redirect hop via isUrlSafe with a 2-hop cap"
  - "lib/branding/ssrfGuard.test.ts — full unit coverage for both modules"
affects: [47-03-multi-page-scraper, 47-05-route-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shared server-only validator pattern: pure boolean function with no framework imports, callable from both Route Handlers and library code"
    - "Manual-redirect re-validation loop: redirect: 'manual' + isUrlSafe() re-check on every hop + hard hop cap"

key-files:
  created:
    - lib/branding/ssrfGuard.ts
    - lib/branding/fetchSafe.ts
    - lib/branding/ssrfGuard.test.ts
  modified: []

key-decisions:
  - "isUrlSafe logic copied character-for-character from route.ts lines 115-127 — no range 'improvements', preserving the documented DNS-rebinding gap as carried-forward (P45-DNS) rather than silently changing security behavior"
  - "route.ts itself is NOT modified in this plan — inline-block replacement is deferred to Plan 47-05 to keep route.ts under single-plan ownership"
  - "fetchWithSsrfGuard re-validates currentUrl at the top of every loop iteration (including hop 0), so the entry URL and every redirect target go through the same isUrlSafe gate"

patterns-established:
  - "Pattern 2 (RESEARCH.md): manual-redirect fetch wrapper — all future outbound fetches in the scraper pipeline (Plan 47-03) and route (Plan 47-05) should call fetchWithSsrfGuard instead of bare fetch()"

requirements-completed: [SCRAP-07]

# Metrics
duration: 12min
completed: 2026-06-16
---

# Phase 47 Plan 02: SSRF Guard Extraction & Redirect Re-validation Summary

**Extracted route.ts's inline SSRF check into a shared, pure `isUrlSafe(url)` validator and built a `fetchWithSsrfGuard` wrapper that re-validates every 3xx redirect hop against it with a 2-hop cap, closing the SSRF-via-redirect vector for the upcoming multi-page scraper.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-06-16T11:38:00Z
- **Completed:** 2026-06-16T11:40:30Z
- **Tasks:** 2 completed
- **Files modified:** 3 (2 created source files, 1 created test file)

## Accomplishments
- `isUrlSafe(url)` extracted as a pure, framework-free boolean validator with the exact same private-IP/IPv6-ULA/CGNAT blocklist as the existing route.ts inline check
- `fetchWithSsrfGuard` wrapper switches every underlying fetch to `redirect: 'manual'` and re-validates the `Location` header target before following it, with a hard 2-hop cap
- Full unit coverage: 17 tests across both modules, all green
- DNS-rebinding gap explicitly documented as carried-forward (P45-DNS), not silently closed

## Task Commits

Each task was committed atomically (TDD: test → feat per task):

1. **Task 1: Extract isUrlSafe validator into lib/branding/ssrfGuard.ts**
   - `fefd388` (test) — failing test added for isUrlSafe
   - `1264a6d` (feat) — isUrlSafe implementation, 11/11 tests passing
2. **Task 2: Build fetchWithSsrfGuard wrapper with manual redirect re-validation**
   - `c446a57` (test) — failing tests added for fetchWithSsrfGuard
   - `20ba0b8` (feat) — fetchWithSsrfGuard implementation, 17/17 tests passing

**Plan metadata:** committed alongside this SUMMARY.md (see final commit)

_Note: both tasks were TDD — each has a test commit followed by a feat commit; no refactor commit was needed._

## Files Created/Modified
- `lib/branding/ssrfGuard.ts` - Pure `isUrlSafe(url): boolean` validator; protocol allowlist + private-IP/IPv6-ULA/CGNAT blocklist copied verbatim from route.ts
- `lib/branding/fetchSafe.ts` - `fetchWithSsrfGuard(url, init)` wrapper; manual-redirect loop with isUrlSafe re-validation per hop and a `MAX_REDIRECT_HOPS = 2` cap
- `lib/branding/ssrfGuard.test.ts` - Vitest coverage for both modules (`describe('isUrlSafe / SCRAP-07', ...)` and `describe('fetchWithSsrfGuard / SCRAP-07', ...)`)

## Decisions Made
- Kept the private-IP boolean expression character-for-character identical to route.ts (no "improving" the ranges) — the known DNS-rebinding limitation is intentionally carried forward as P45-DNS rather than addressed or hidden in this plan
- Did not touch `route.ts` — per plan's explicit interface note, the inline-block replacement (swapping route.ts's check for a call to `isUrlSafe`) is Plan 47-05's responsibility, keeping route.ts under single-plan ownership this wave
- `fetchWithSsrfGuard` validates `currentUrl` at the top of each loop iteration so the same gate covers both the original URL and every subsequent redirect target — no special-casing needed for hop 0 vs. later hops

## Deviations from Plan

None - plan executed exactly as written. Both tasks followed the TDD RED/GREEN flow specified, used the verbatim logic from route.ts, and matched the mock-fetch test convention from `scraper.test.ts`.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required. Both new modules are pure TypeScript with no new dependencies.

## Next Phase Readiness

- `isUrlSafe` and `fetchWithSsrfGuard` are ready to be imported by Plan 47-03 (multi-page scraper — every discovered subpage link must call `isUrlSafe` before fetching) and Plan 47-05 (route.ts integration — replace the inline check with a call to `isUrlSafe`, and swap scraper/route fetches to `fetchWithSsrfGuard`).
- **Carry forward to Plan 47-05 / production deploy:** the Assumption A1 comment in `fetchSafe.ts` flags that Node's undici-based `fetch()` exposing `status`/`headers.get('location')` for `redirect: 'manual'` responses should be smoke-tested against the actual deployed Vercel Node runtime before relying on it in production — this was verified only against RESEARCH.md's documented assumption and unit-test mocks, not a live network call.
- No blockers for downstream plans.

---
*Phase: 47-skeema-monisivuinen-scraper-putki*
*Completed: 2026-06-16*
