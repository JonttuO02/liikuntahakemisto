---
phase: 47-skeema-monisivuinen-scraper-putki
reviewed: 2026-06-16T14:56:06Z
depth: standard
files_reviewed: 14
files_reviewed_list:
  - app/api/business/analyze-website/route.ts
  - lib/branding/analyzer.test.ts
  - lib/branding/analyzer.ts
  - lib/branding/fetchSafe.ts
  - lib/branding/prompt.ts
  - lib/branding/scraper.test.ts
  - lib/branding/scraper.ts
  - lib/branding/screenshot.ts
  - lib/branding/ssrfGuard.test.ts
  - lib/branding/ssrfGuard.ts
  - lib/branding/storage.ts
  - next.config.mjs
  - package.json
  - supabase/migrations/20260616100000_business_branding_plural_and_paikka_scoping.sql
findings:
  critical: 4
  warning: 3
  info: 2
  total: 9
status: issues_found
---

# Phase 47: Code Review Report

**Reviewed:** 2026-06-16T14:56:06Z
**Depth:** standard
**Files Reviewed:** 14
**Status:** issues_found

## Summary

This phase reshapes `business_branding` for per-venue scoping, extracts a shared SSRF guard with redirect re-validation, extends the scraper into a multi-page crawler, and reshapes the Claude analyzer for multi-page input + optional screenshot. The DB-layer scoping work (migration, route UPSERT `onConflict`, IDOR ownership check via `business_paikka_links`) is correctly implemented and schema-consistent — `business_paikka_links.business_account_id` does directly equal `auth.users.id`, so the route's `.eq('business_account_id', user.id)` ownership check is valid.

However, the **storage layer was never updated to match the new per-venue model**: all three Supabase Storage upload paths (`uploadLogo`, `uploadLogoCandidate`, `uploadGalleryImage`) are keyed only by `businessAccountId`, with `upsert: true` and no `paikkaId` component. A business account with two venues will silently overwrite venue A's logo/gallery files with venue B's on the next analysis run, even though the two `business_branding` rows are now correctly distinct in the database. This directly undermines the BRDDB-05 per-venue scoping goal that is the stated purpose of this phase, and is the most serious finding here.

Two further SSRF gaps remain in the dedicated SSRF-hardening surface: the IPv6 loopback literal `[::1]` (the actual `URL.hostname` value, brackets included) is never matched by the blocklist's `'::1'` string check, and IPv4-mapped IPv6 addresses (`::ffff:127.0.0.1`, `::ffff:169.254.169.254`, `::ffff:192.168.1.1`) bypass every rule in `isUrlSafe`. Both were verified by direct execution against the shipped logic. Additionally, the new `captureHomepageScreenshot` (Playwright) navigates directly to the caller-supplied URL and follows the target site's redirect chain with zero re-validation — a second, independent SSRF vector that completely bypasses the `fetchWithSsrfGuard` hardening done elsewhere in this same phase.

## Critical Issues

### CR-01: Storage upload paths not scoped by paikka_id — cross-venue file overwrite

**File:** `lib/branding/storage.ts:14,44,74`
**Issue:** `uploadLogo`, `uploadLogoCandidate`, and `uploadGalleryImage` all build storage paths as `branding/{businessAccountId}/...` with `upsert: true`, and never include `paikkaId`. This phase scoped `business_branding` DB rows by `(business_account_id, paikka_id)` (migration `20260616100000`, route `onConflict: 'business_account_id,paikka_id'`), but the storage layer that backs `logo_url`, `logo_candidates`, and `image_urls` was not updated to match. `uploadLogoCandidate` and `uploadGalleryImage` are brand-new functions added in this phase — this is not legacy debt, it is a fresh per-venue scoping gap introduced by this phase's own changes.

Concretely: a business account that owns venue A and venue B, running analysis on both, will have venue B's `logo.png` / `logo-N.png` / `gallery/N.png` overwrite venue A's files at the identical storage path. Both `business_branding` rows will end up with `logo_url`/`logo_candidates`/`image_urls` pointing at the same (now venue-B) objects — venue A silently loses its branding images, with no error surfaced anywhere.

**Fix:**
```ts
// lib/branding/storage.ts
export async function uploadLogo(
  businessAccountId: string,
  paikkaId: number,
  pngBuffer: Buffer
): Promise<string> {
  const path = 'branding/' + businessAccountId + '/' + paikkaId + '/logo.png'
  // ...same upload/getPublicUrl logic
}
// Apply the same paikkaId segment to uploadLogoCandidate and uploadGalleryImage,
// and thread paikkaId through from route.ts's runAnalysis() call sites
// (uploadLogo(businessAccountId, paikkaId, ...), etc.)
```

### CR-02: SSRF guard never blocks the IPv6 loopback literal `[::1]`

**File:** `lib/branding/ssrfGuard.ts:33-34`
**Issue:** `parsed.hostname` for a URL like `http://[::1]/` is the bracketed string `"[::1]"` in Node's URL implementation (verified directly: `new URL('http://[::1]').hostname === '[::1]'`), not `"::1"`. The guard's blocklist checks `hostname === '::1'` and `hostname === '[::]'` but never `hostname === '[::1]'`. As a result `isUrlSafe('http://[::1]')` returns `true` — the most common IPv6 loopback notation is never rejected, allowing SSRF to localhost services via IPv6. This logic was "extracted verbatim" from the pre-phase-47 route.ts, but this phase's explicit task was to harden this exact guard (redirect re-validation, shared extraction) — the bug ships unfixed in the consolidated module that is now reused by `scrapeWebsite`'s logo/CSS/subpage fetches, the gallery-image fetch in `route.ts`, and any future caller.
**Fix:**
```ts
const isPrivate =
  hostname === 'localhost' ||
  hostname === '0.0.0.0' ||
  hostname === '127.0.0.1' ||
  hostname === '::1' ||
  hostname === '[::1]' ||   // bracketed form — this is the actual URL.hostname value
  hostname === '[::]' ||
  // ...
```
Add a regression test asserting `isUrlSafe('http://[::1]/')` is `false` — the current test suite only exercises `127.0.0.1`, not the IPv6 loopback, which is how this slipped through.

### CR-03: SSRF guard bypassed by IPv4-mapped IPv6 addresses

**File:** `lib/branding/ssrfGuard.ts:25-43`
**Issue:** Verified by direct execution: `isUrlSafe('http://[::ffff:127.0.0.1]')`, `isUrlSafe('http://[::ffff:169.254.169.254]')`, and `isUrlSafe('http://[::ffff:192.168.1.1]')` all return `true`. Node's `URL` parser normalizes these to `[::ffff:7f00:1]`, `[::ffff:a9fe:a9fe]`, `[::ffff:c0a8:101]` respectively — none of which match `127.0.0.1`, `169.254.169.254`, `192.168.`-prefix, or any other blocklist entry. This is a complete bypass of the private-IP and cloud-metadata-endpoint protections via a well-known SSRF technique (IPv4-mapped IPv6 literals), reachable through every consumer of `isUrlSafe`/`fetchWithSsrfGuard` (homepage fetch, CSS fetch, logo fetch, subpage fetch, gallery image fetch, and the route's top-level URL validation).
**Fix:** Detect and reject `::ffff:`-prefixed hostnames (mapped-IPv4) before applying the dotted-decimal checks, or better: extract the embedded IPv4 portion and re-run it through the existing dotted-decimal logic.
```ts
// after lowercasing hostname, before the isPrivate block:
const ipv4MappedMatch = /^\[?::ffff:([\da-f:]+|\d{1,3}(?:\.\d{1,3}){3})\]?$/i.exec(hostname)
if (ipv4MappedMatch) {
  // reject mapped IPv6 literals outright, or decode the embedded IPv4 and re-check it
  return false
}
```
Add regression tests for `::ffff:127.0.0.1`, `::ffff:169.254.169.254`, and `::ffff:192.168.1.1`.

### CR-04: Homepage screenshot capture bypasses SSRF redirect guard entirely

**File:** `lib/branding/screenshot.ts:22`
**Issue:** `captureHomepageScreenshot` is a new file added in this phase. It calls `page.goto(url, { waitUntil: 'networkidle', timeout: 15000 })` directly via Playwright. The initial `url` is checked once by `isUrlSafe` in `route.ts` before `runAnalysis` is invoked, but Playwright's `page.goto` follows the target server's full redirect chain natively with no re-validation of intermediate or final hostnames. A malicious or compromised site can serve a `302` to `http://169.254.169.254/latest/meta-data/iam/security-credentials/` (cloud metadata) or any other internal address, and Playwright will navigate there and screenshot it — completely sidestepping the `fetchWithSsrfGuard` redirect-revalidation work that this same phase introduced for every other fetch path (CSS, logos, subpages, gallery images). The screenshot itself isn't returned to the attacker directly, but it is fed into the Claude analyzer prompt and could leak metadata-endpoint contents (e.g. IAM credentials rendered as text) into `raw_analysis`, which is readable by the business account via the GET endpoint.
**Fix:** Either disable redirect-following in the Playwright navigation and manually re-validate each hop (mirroring `fetchWithSsrfGuard`), or intercept navigation/redirect requests via Playwright's request interception API and reject any target that fails `isUrlSafe`:
```ts
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
page.on('request', (req) => {
  if (req.isNavigationRequest() && !isUrlSafe(req.url())) {
    req.abort()
  }
})
await page.route('**/*', (route) => {
  if (!isUrlSafe(route.request().url())) return route.abort()
  return route.continue()
})
await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 })
```

## Warnings

### WR-01: `uploadLogo` call sites pass only `businessAccountId`, silently dropping per-venue context

**File:** `app/api/business/analyze-website/route.ts:49,57,83`
**Issue:** Even after fixing CR-01 in `storage.ts`, the call sites in `route.ts` (`uploadLogo(businessAccountId, ...)`, `uploadLogoCandidate(businessAccountId, ...)`, `uploadGalleryImage(businessAccountId, ...)`) need `paikkaId` threaded through — it is already in scope as a parameter of `runAnalysis(url, businessAccountId, paikkaId)`, so this is a small follow-on change once CR-01 lands, but it's worth calling out explicitly since the storage and route fixes must ship together.
**Fix:** Update all three call sites to pass `paikkaId` as shown in CR-01's fix.

### WR-02: Hex color regex accepts invalid 4- and 5-digit hex strings

**File:** `lib/branding/analyzer.ts:131`
**Issue:** `/^#[0-9a-fA-F]{3,6}$/.test(c.hex)` accepts `#1234` (4 digits) and `#12345` (5 digits), neither of which is a valid CSS hex color (valid lengths are 3, 6, or 8-with-alpha; never 4 or 5 without a leading `#` + alpha channel convention that this code doesn't otherwise support). This validation is new in this phase — the pre-phase-47 analyzer passed `colors: string[]` through with no format validation at all. A malformed hex from Claude's output would pass validation here and later fail or render incorrectly wherever `selected_background_color`/`selected_accent_color` or `colors[].hex` is consumed as CSS.
**Fix:**
```ts
typeof c?.hex === 'string' && /^#[0-9a-fA-F]{6}$/.test(c.hex)
```
(or explicitly allow 3 OR 6: `/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/`)

### WR-03: `isUrlSafe` false-positives on legitimate domains starting with `fc`/`fd`

**File:** `lib/branding/ssrfGuard.ts:38-39`
**Issue:** `hostname.startsWith('fd')` and `hostname.startsWith('fc')` are intended to catch IPv6 ULA literals (`fd00::/8`, `fc00::/8`), but they are applied to the raw hostname string without first confirming the hostname is actually an IPv6 literal (bracketed or hex-colon form). Verified by direct execution: `isUrlSafe('http://fcbank.com')` and `isUrlSafe('http://fdating.com')` both return `false`. Any legitimate business website whose domain happens to start with `fc`/`fd` will be rejected by the SSRF guard with "Invalid or private URL", a functional regression for an indeterminate but real set of customer domains.
**Fix:** Only apply the `fd`/`fc` prefix check when the hostname is actually an IPv6 literal (contains `:` or is wrapped in `[...]`):
```ts
const isIPv6Literal = hostname.startsWith('[') || hostname.includes(':')
const isPrivate =
  // ...
  (isIPv6Literal && (hostname.startsWith('[fd') || hostname.startsWith('[fc') || hostname.startsWith('fd') || hostname.startsWith('fc'))) ||
  // ...
```

## Info

### IN-01: `ON CONFLICT (business_account_id, paikka_id)` requires the new composite UNIQUE constraint to exist at upsert time — no migration ordering guard

**File:** `app/api/business/analyze-website/route.ts:123,139,213` ; `supabase/migrations/20260616100000_business_branding_plural_and_paikka_scoping.sql:78-79`
**Issue:** The route's three `.upsert(..., { onConflict: 'business_account_id,paikka_id' })` calls depend on the composite UNIQUE constraint `business_branding_unique_account_paikka` existing in the database. This is purely a deploy-ordering concern (the migration must run before this route code is live) rather than a code defect, but it's worth flagging since there's no runtime guard or health check verifying the constraint is present — if the migration fails partway (e.g. the backfill UPDATE leaves residual NULLs that block the `NOT NULL` ALTER), the route's upserts will fail with a generic Postgres error rather than a clear diagnostic.
**Fix:** No code change required; ensure deployment order is migration-before-route-deploy (standard practice), and consider a one-time post-deploy smoke test asserting the constraint exists.

### IN-02: `MAX_GALLERY_UPLOADS` re-fetches images that `scrapeWebsite` already fetched once for gallery extraction

**File:** `app/api/business/analyze-website/route.ts:73-90` ; `lib/branding/scraper.ts:362-375`
**Issue:** `extractGalleryImages` (in `scraper.ts`) only parses `<img>` tags for `src`/`width`/`height`/`alt`/`class` attributes — it never fetches the image bytes. The route's pipeline then fetches each of those URLs again (`fetchWithSsrfGuard` + `sharp` conversion) in step 5. This is not a correctness bug (no double-fetch of the same bytes actually occurs — `scrapeWebsite` itself never downloads gallery images, only the route does), but the comment at `scraper.ts:160-164` step list could be clearer that gallery image bytes are never touched by the scraper, only their URLs are discovered. No functional defect, just worth a doc clarification to avoid future confusion about where the SSRF-guarded gallery fetch actually happens.
**Fix:** Optional comment clarification only; no behavior change needed.

---

_Reviewed: 2026-06-16T14:56:06Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
