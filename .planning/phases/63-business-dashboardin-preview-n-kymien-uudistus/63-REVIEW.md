---
phase: 63-business-dashboardin-preview-n-kymien-uudistus
reviewed: 2026-07-02T00:00:00Z
depth: standard
files_reviewed: 19
files_reviewed_list:
  - app/api/business/analyze-website/route.ts
  - app/api/business/branding/route.ts
  - app/api/business/update-paikka/route.ts
  - app/business/onboarding/LivePreviewPane.tsx
  - app/business/onboarding/page.tsx
  - app/business/onboarding/StepBrandingPick.tsx
  - app/business/page.tsx
  - app/business/WizardInner.tsx
  - app/components/CalloutCard.tsx
  - app/components/DiagonaalKortti.tsx
  - app/components/PaikkaSheet.tsx
  - app/components/PreviewModal.tsx
  - app/components/RejectionReasonPopup.tsx
  - lib/branding/brandingResult.test.ts
  - lib/branding/brandingResult.ts
  - lib/branding/ssrfGuard.ts
  - messages/en.json
  - messages/fi.json
  - tests/api/update-paikka.test.ts
findings:
  critical: 5
  warning: 14
  info: 5
  total: 24
status: issues_found
---

# Phase 63: Code Review Report

**Reviewed:** 2026-07-01 (Pass 1, plans 01-05) + 2026-07-02 (Pass 2, gap-closure plans 06-07 and related fixes)
**Depth:** standard
**Files Reviewed:** 19 (13 in Pass 1, 9 in Pass 2, 3 overlapping)
**Status:** issues_found

> **Note:** This report combines two review passes run against this phase. Pass 2 was
> originally run with a file scope that did not overlap Pass 1's, but the reviewer agent
> replaced rather than appended to the existing report — this file reconstructs the
> combination from git history (`8f12b16`) so no findings from either pass are lost.
> Finding IDs are renumbered sequentially across both passes to avoid collisions.

## Summary — Pass 1 (2026-07-01, plans 01-05)

Reviewed the dashboard-preview restyle (`DiagonaalKortti` dashboard variant, `RejectionReasonPopup`, `PreviewModal`/`LivePreviewPane` CalloutCard swap) and the `update-paikka` route's D-07 auto-resubmit branch. The new UI-only components (RejectionReasonPopup, LivePreviewPane's 3rd section, PreviewModal) are generally sound and match the phase's own pattern map (63-PATTERNS.md) closely. The two Critical findings are both in `update-paikka/route.ts` and predate the D-07 change but are squarely in scope (the file was modified in this phase and is fully re-reviewed): the `mediat`/`hinnasto`/`sijainti` sections silently null out any field the client omits from the request body (no distinction between "not sent" and "explicitly cleared"), and the `yhteystiedot` section's `varauslinkki` field can never be cleared once set, because an emptied field is left `undefined` and silently dropped by the client before it reaches Postgres. Warnings cover a bypassable body-size guard, an inconsistent color-utility edge case, an unhandled clipboard-write failure path, and a latent UI-overlap risk in `DiagonaalKortti`.

## Summary — Pass 2 (2026-07-02, gap-closure plans 06-07 + follow-up fixes)

Reviewed the branding-analysis backend (analyze-website, branding PATCH, ssrfGuard), the onboarding pre-phase/wizard glue (page.tsx, WizardInner.tsx, StepBrandingPick.tsx), and the dashboard preview surface (business/page.tsx, DiagonaalKortti, PreviewModal) as they stood after this session's UAT-driven fixes (grid width, brand-color persistence, URL normalization).

The most significant finding is a genuine SSRF filter gap in `lib/branding/ssrfGuard.ts`: the loopback and link-local blocklists only match a single exact IP literal each (`127.0.0.1` and `169.254.169.254`) instead of the full `127.0.0.0/8` and `169.254.0.0/16` ranges, so an attacker-supplied business website URL like `http://127.0.0.2/` or `http://169.254.1.1/` sails through `isUrlSafe()` and gets fetched server-side by the analysis pipeline.

The onboarding "back to URL step" flow also has two related correctness bugs: the URL input is never pre-filled on back-navigation (so clicking "Next" without retyping silently wipes the saved website URL and detours the user away from their already-completed AI analysis), and separately the `aiTriggered` guard is never reset, so even when the user *does* retype a different URL, the AI analysis pipeline is never re-run for it — the wizard can end up permanently showing branding data for a website that no longer matches what will be submitted.

Additional warnings cover an un-cancelled background pipeline race in analyze-website, out-of-order autosave requests in StepBrandingPick, missing error handling on several Supabase reads in the dashboard page, and an inconsistent/incomplete branded preview in PreviewModal (PaikkaSheet never receives the selected brand colors that CalloutCard and DiagonaalKortti do).

## Critical Issues

### CR-01 (Pass 1): Omitted fields in mediat/hinnasto/sijainti section saves silently wipe existing data

**File:** `app/api/business/update-paikka/route.ts:67-70` (mediat), `:86-90` (hinnasto), `:150-155` (sijainti)
**Issue:** Each of these three sections builds `updatePayload` with a `?? null` / `?? []` fallback applied directly to the raw parsed value:

```ts
updatePayload = {
  logo_url: d.logo_url ?? null,
  photo_urls: d.photo_urls ?? [],
}
```

If a caller posts a `mediat` update with only `logo_url` (e.g. a future logo-only save call, or any client bug that omits `photo_urls`), `d.photo_urls` is `undefined`, and the fallback silently coerces it to `[]` — **deleting every photo the venue has**, not leaving them untouched. The same pattern applies to `hinta_min`/`hinta_max`/`hinta_kuvaus` in `hinnasto` and `osoite`/`kaupunki` in `sijainti`: any omitted key is written as `null` rather than left alone.

The `mediat` branch's own validation gate (`if (d.photo_urls !== undefined) { ... }`, line 58) implies the field is *meant* to be optional/partial — but the final assignment ignores that and unconditionally overwrites it anyway, so the "optional" validation is misleading. Contrast this with the `yhteystiedot` branch (see CR-02), which correctly leaves omitted fields `undefined` so they are dropped from the JSON body and never touch the DB. This inconsistency across sections in the same file is the root problem: three of five sections silently destroy data on partial submission, one section correctly no-ops on partial submission.

Even if every current caller of this endpoint happens to always submit the full section payload today, this is a landmine for the next caller (or the next refactor of the dashboard edit forms) and there is no test guarding the "resubmit only part of a section" case.
**Fix:** Only include a key in `updatePayload` when the corresponding field was actually present in the request body, e.g.:
```ts
updatePayload = {
  ...(d.logo_url !== undefined ? { logo_url: d.logo_url } : {}),
  ...(d.photo_urls !== undefined ? { photo_urls: d.photo_urls } : {}),
}
```
Apply the same pattern to `hinnasto` and `sijainti` (subject to `sijainti`'s existing hard requirement that `latitude`/`longitude` must both be present).

### CR-02 (Pass 1): `varauslinkki` can never be cleared once set

**File:** `app/api/business/update-paikka/route.ts:117-134`
**Issue:**
```ts
let varauslinkki: string | undefined
if (typeof d.varauslinkki === 'string') {
  const trimmed = d.varauslinkki.trim()
  if (trimmed) {
    // ...validate + set varauslinkki = trimmed
  }
}
// ...
updatePayload = { puhelin, varauslinkki, kuvaus }
```
When the user clears the booking-link input (submits `""` or whitespace), `trimmed` is falsy, so the `if (trimmed)` block never runs and `varauslinkki` stays `undefined`. `undefined` properties are dropped by `JSON.stringify` before the Supabase client sends the update, so the column is never touched — the old (possibly wrong/dead) booking link silently remains in the database. The route returns `{ ok: true }` (200), so the user has no indication their edit to that specific field was ignored. `puhelin` and `kuvaus` in the same section correctly handle the empty-string case (`d.puhelin.trim()` / `d.kuvaus.trim().slice(...)` both produce a defined `""`, which *does* clear the column) — `varauslinkki` is the one field with this special-cased, broken behavior. Not covered by `tests/api/update-paikka.test.ts` (no test submits an empty `varauslinkki` to a previously-set link).
**Fix:** Distinguish "omitted" from "explicitly empty":
```ts
let varauslinkki: string | undefined
if (typeof d.varauslinkki === 'string') {
  const trimmed = d.varauslinkki.trim()
  if (!trimmed) {
    varauslinkki = null as unknown as string // or restructure updatePayload to allow null
  } else {
    // existing http/https validation, then varauslinkki = trimmed
  }
}
```
and update `updatePayload`'s type/shape to allow `varauslinkki: string | null` so an explicit clear reaches the DB.

### CR-03 (Pass 2): SSRF blocklist only matches single exact IPs, not the loopback/link-local ranges

**File:** `lib/branding/ssrfGuard.ts:60-72`
**Issue:** `isPrivate` blocks `hostname === '127.0.0.1'` and `hostname === '169.254.169.254'`
as exact-string matches only. It does not block the rest of `127.0.0.0/8` (all of which route
to loopback on virtually every OS/container) or the rest of `169.254.0.0/16` (link-local,
used by several cloud metadata services beyond the one hardcoded Azure/GCP IP, e.g. AWS ECS
task metadata at `169.254.170.2`). Compare this to the `192.168.`, `10.`, `172.16-31.x`, and
`100.64-127.x` checks, which correctly use range/prefix logic.

`fetchWithSsrfGuard` (`lib/branding/fetchSafe.ts`) has no independent DNS/IP-level validation
— it relies entirely on `isUrlSafe`. Since the hostname in these URLs is a literal IP (no DNS
involved), a request to `http://127.0.0.2:PORT/` or `http://169.254.1.1/` passes `isUrlSafe`
unmodified and is fetched directly by the analyze-website background pipeline
(`app/api/business/analyze-website/route.ts`), giving an authenticated business-account
attacker a way to reach loopback-bound services or other link-local endpoints from the server.
**Fix:**
```ts
const isPrivate =
  hostname === 'localhost' ||
  hostname === '0.0.0.0' ||
  hostname.startsWith('127.') ||        // whole 127.0.0.0/8 loopback range
  hostname === '::1' ||
  hostname === '[::1]' ||
  hostname === '[::]' ||
  hostname.startsWith('169.254.') ||    // whole 169.254.0.0/16 link-local range
  hostname.startsWith('192.168.') ||
  hostname.startsWith('10.') ||
  (isIPv6Literal && (hostname.startsWith('fd') || hostname.startsWith('fc') || hostname.startsWith('[fd') || hostname.startsWith('[fc'))) ||
  (oct1 === 172 && oct2 >= 16 && oct2 <= 31) ||
  (oct1 === 100 && oct2 >= 64 && oct2 <= 127)
```

### CR-04 (Pass 2): Website URL is silently wiped when the user goes back to the URL step without retyping it

**File:** `app/business/onboarding/page.tsx:361-363` (root cause: `StepNimiJaURL.tsx:18`, out of review scope but referenced for context)
**Issue:** When `StepSijainti`'s `onPrev` fires, `page.tsx` sets `skipFastForward=true` and
routes back to `pagePhase === 'nimi-url'`. This fully remounts `StepNimiJaURLPrePhase` →
`StepNimiJaURL`, whose input is `useState('')` — it is never initialized from the
already-known parent `websiteUrl` state, because `onNext` is the only prop threaded down
(`page.tsx:122`: `<StepNimiJaURL paikkaInfo={paikkaInfo} paikkaId={paikkaId} onNext={onNext} />`).
If the user simply clicks "Next" again (expecting to continue, not realizing the field reset),
`StepNimiJaURL` calls `onNext(null)` (`websiteUrl.trim() || null` with an empty input).
`handleNimiUrlNext(null, ...)` then:
- overwrites the parent's previously non-null `websiteUrl` state with `null`,
- skips the entire `if (url && effectivePaikkaId !== null)` block, so no `save-step` PATCH
  fires and the AI trigger is skipped,
- and later, on `StepSijainti`'s `onNext`, routes to `'laji-skip'` instead of `'waiting'`
  (`onNext={() => setPagePhase(websiteUrl ? 'waiting' : 'laji-skip')}` at line 403), throwing
  away the already-completed AI branding analysis for the venue.

**Fix:** Thread the current `websiteUrl` down as an initial value:
```tsx
// page.tsx
<StepNimiJaURLPrePhase
  onNext={handleNimiUrlNext}
  onPaikkaIdResolved={setPaikkaId}
  skipFastForward={skipFastForward}
  initialWebsiteUrl={websiteUrl}
/>
// ...pass through to StepNimiJaURL:
return <StepNimiJaURL paikkaInfo={paikkaInfo} paikkaId={paikkaId} onNext={onNext} initialWebsiteUrl={initialWebsiteUrl} />

// StepNimiJaURL.tsx
const [websiteUrl, setWebsiteUrl] = useState(initialWebsiteUrl ?? '')
```

### CR-05 (Pass 2): `aiTriggered` guard never resets, so a corrected URL is never (re-)analyzed

**File:** `app/business/onboarding/page.tsx:250,333`
**Issue:** `aiTriggered` is a one-shot boolean (`useState(false)`) that is set to `true` the
first time `handleNimiUrlNext` fires the analyze-website POST and is never reset afterwards.
If the user goes back to the URL step (see CR-04) and enters a *different* URL, `setWebsiteUrl(url)`
updates state and the new URL is even persisted via `save-step` (that call is unconditional),
but the `if (!alreadyHasLocation && !aiTriggered)` guard at line 333 prevents the
analyze-website POST from ever firing again for the new URL — the pipeline keeps whatever
`business_branding` row was written for the *original* URL. Because `brandingData` is now
non-null, `canRunAnalysis` (`!brandingData && !!websiteUrl && paikkaId !== null`,
`WizardInner.tsx:441`) also evaluates to `false`, so the manual "Analysoi →" retry button in
the wizard is hidden too — there is no UI path left to re-trigger analysis for the corrected
URL. The venue ends up submitted with a website URL that does not match the logo/colors/prices
that were AI-extracted and shown to the business owner.
**Fix:** Reset the guard whenever the URL actually changes, e.g. track the URL that was last
analyzed and compare instead of a one-shot boolean:
```ts
const [analyzedUrl, setAnalyzedUrl] = useState<string | null>(null)
// ...
if (!alreadyHasLocation && url !== analyzedUrl) {
  fetch('/api/business/analyze-website', { /* ... */ })
  setAnalyzedUrl(url)
}
```

## Warnings

### WR-01 (Pass 1): 64KB body-size cap is bypassed by omitting Content-Length

**File:** `app/api/business/update-paikka/route.ts:6-9`
**Issue:** `if (contentLength && parseInt(contentLength, 10) > 65536)` only rejects the request when the `Content-Length` header is present and too large. A client using chunked transfer encoding (or one that simply omits the header) sails through this guard entirely, and `request.json()` will still read and parse the full body regardless of size. The comment ("D-02: Reject oversized bodies") states an intent that this code does not actually guarantee.
**Fix:** Enforce a hard cap while reading the body instead of trusting the header, e.g. read `request.body` via a size-limited reader, or use `await request.text()` and check `.length` before `JSON.parse`, rejecting if it exceeds the cap regardless of what `Content-Length` claimed.

### WR-02 (Pass 1): `logo_url` has no type validation in the mediat section

**File:** `app/api/business/update-paikka/route.ts:57-70`
**Issue:** `photo_urls` items are explicitly checked to be strings (T-03), but `d.logo_url` is used directly (`logo_url: d.logo_url ?? null`) with no `typeof` check. A caller sending a number, object, or array for `logo_url` will pass validation and hit the DB update, likely surfacing as an opaque 500 from Postgres rather than a clean 400.
**Fix:** Mirror the `photo_urls` string check:
```ts
if (d.logo_url !== undefined && d.logo_url !== null && typeof d.logo_url !== 'string') {
  return NextResponse.json({ error: 'logo_url must be a string or null' }, { status: 400 })
}
```

### WR-03 (Pass 1): `darkenHex`/`lightenHex` don't support 3-digit shorthand hex, silently breaking `getPanelShade`'s contract

**File:** `lib/branding/brandingResult.ts:95-117, 132-136`
**Issue:** `getContrastColor` explicitly expands 3-digit shorthand hex (`'fff'` → `'ffffff'`, lines 74-76) before parsing, but `darkenHex`/`lightenHex` use a regex that only matches full 6-digit hex (`/^#?([0-9a-f]{6})$/i`). For a 3-digit `brandColor`, the regex fails to match and the function returns the **unchanged input** (per the guard comment). Since `getPanelShade` is documented as "guaranteed to visibly differ from `brandColor` itself" (lines 122-124), this guarantee silently breaks whenever a 3-digit hex reaches it — `getPanelShade('#fff')` returns `'#fff'` unchanged, and the dashboard controls panel would render with the exact same background as the card's brand-colored left panel. The existing test suite (`brandingResult.test.ts`) only exercises 6-digit / malformed inputs, not the 3-digit case, so this gap isn't caught.
**Fix:** Expand 3-digit shorthand in `darkenHex`/`lightenHex` the same way `getContrastColor` does, or route all three functions through one shared hex-normalization helper.

### WR-04 (Pass 1): `handleCopyInviteLink` doesn't handle clipboard failures

**File:** `app/business/page.tsx:100-105`
**Issue:** (Note: this finding predates this session's own copy-link fix in Plan 06 — `handleCopyInviteLink` in the current codebase already wraps the write in `try`/`await`/`catch`, per the 63-06 SUMMARY. Retained here for traceability; verify against current source before acting.)
```ts
function handleCopyInviteLink() {
  const url = window.location.origin + '/business/liity?paikka_id=' + link.paikka_id
  navigator.clipboard.writeText(url)
  setCopied(true)
  setTimeout(() => setCopied(false), 2000)
}
```
`navigator.clipboard` is undefined in non-secure contexts (plain `http://`) and in some older/embedded browsers, which would throw synchronously on `.writeText`. Even when it exists, `writeText` returns a `Promise` that can reject (e.g. clipboard permission denied) with no `.catch()`.
**Fix:** Already applied in Plan 06 (`app/business/page.tsx`'s current `handleCopyInviteLink` is `async` with `try`/`catch`) — confirm no regression.

### WR-05 (Pass 1): `onToggleTodo` button and dashboard status pill can occupy the same slot

**File:** `app/components/DiagonaalKortti.tsx:335-355, 367-375`
**Issue:** The `dashboardActions` status pill renders at `absolute bottom-3 right-3 z-20`, and the `onToggleTodo` bookmark button renders at the identical `absolute bottom-3 right-3 z-20`. The `MapPin` "show on map" button just above it is explicitly guarded with `!dashboardActions` (line 357: `{hasCoords && !dashboardActions && (...)}`) to prevent it from co-existing with the dashboard controls panel, but no equivalent guard exists for `onToggleTodo` (line 367: `{onToggleTodo && (...)}`, no `!dashboardActions` check). No current call site passes both `dashboardActions` and `onToggleTodo` together, but nothing in the component prevents it, and the two elements would visually overlap if it ever happened.
**Fix:** Add the same guard used for `MapPin`: `{onToggleTodo && !dashboardActions && (...)}`.

### WR-06 (Pass 1): RejectionReasonPopup's close button has a misleading accessible name

**File:** `app/components/RejectionReasonPopup.tsx:73-79`
**Issue:** `aria-label={t('previewClose')}` resolves to "Close preview" / "Sulje esikatselu" — copy written for the unrelated `PreviewModal`/venue-preview flow. A screen-reader user closing the rejection-reason dialog hears "Close preview," which doesn't describe what's being closed. (The phase's own pattern doc, `63-PATTERNS.md` line 203, called for a dedicated `t('close')` key here; that key doesn't currently exist in the `Business` i18n namespace, which is presumably why `previewClose` was reused instead.)
**Fix:** Add a namespace-appropriate key (e.g. `Business.close` = "Close" / "Sulje") to `messages/en.json`/`fi.json` and use it here instead of reusing `previewClose`.

### WR-07 (Pass 1): `hinnasto` and `sijainti` sections have zero test coverage

**File:** `tests/api/update-paikka.test.ts`
**Issue:** The test suite covers auth, body-size, JSON parsing, ownership, `mediat`, `aukioloajat`, `yhteystiedot`, unknown-section, and the D-07 flip branch — but never exercises the `hinnasto` section (numeric type checks on `hinta_min`/`hinta_max`, string check on `hinta_kuvaus`) or the `sijainti` section (lat/lng range validation, `osoite`/`kaupunki` truncation). Both sections contain non-trivial validation logic (CR-01 above lives in these exact branches) that ships with no regression protection.
**Fix:** Add positive/negative test cases for both sections, mirroring the existing `mediat`/`aukioloajat` test structure (invalid type → 400, valid payload → 200, boundary values for lat/lng ±90/±180).

### WR-08 (Pass 2): Analysis timeout race can let a stale 'failed' status be silently overwritten later

**File:** `app/api/business/analyze-website/route.ts:170-194`
**Issue:** `runAnalysis` races `runAnalysisPipeline` against a `setTimeout` that rejects after
`MAX_ANALYSIS_DURATION_MS`. `Promise.race` does not cancel the losing promise — if the
timeout wins and the catch block writes `status: 'failed'`, `runAnalysisPipeline` keeps
running in the background (still consuming the `waitUntil` budget) and, if it later succeeds,
its own UPSERT (line 114-162) unconditionally overwrites the row back to `status: 'analyzed'`.
Meanwhile `WaitingForAI` (`app/business/onboarding/page.tsx:157-183`) already stopped polling
and showed the user the failure screen the moment it observed `status: 'failed'` — the user
may have already clicked "Ohita" and moved on with `brandingData: null`, while the DB
retroactively flips to a fully analyzed row that nothing in the UI will surface again short of
a page reload hitting the fast-forward re-fetch path.
**Fix:** Have the timeout branch use a conditional update (`.eq('status', 'analyzing')`,
mirroring the staleness self-heal pattern at line 319-329) so it never clobbers a row the
pipeline manages to finish writing concurrently, and/or thread an `AbortController` into
`runAnalysisPipeline`'s fetch calls so losing the race actually stops the work.

### WR-09 (Pass 2): Branding autosave PATCH requests are unordered and uncancellable

**File:** `app/business/onboarding/StepBrandingPick.tsx:124-202`
**Issue:** `patchBranding` fires a fetch per user interaction (`selectLogo`,
`assignColorToSlot`, `toggleGalleryImage`) with no request sequencing, debouncing, or
cancellation of superseded requests. If a user toggles a gallery image on/off/on quickly, or
clicks multiple color swatches in succession, the resulting PATCH requests can resolve out of
send-order (e.g. under variable network latency), and since each request carries only a
snapshot of local state at click time, a slower "add" request that completes after a faster
"remove" request can silently persist a selection the user believes was undone.
**Fix:** Attach a monotonically increasing request id (or `AbortController`) per section and
ignore/abort responses for requests that have been superseded by a newer one before they
resolve.

### WR-10 (Pass 2): Logo image has no error fallback, unlike the photo image in the same component

**File:** `app/components/DiagonaalKortti.tsx:123-133`
**Issue:** The photo `<img>` in the same file (lines 293-305) has an explicit `onError`
handler that hides the broken image and reveals a `data-fallback` placeholder. The logo
`<img>` (`paikka.logo_url`) has no equivalent — a dead/expired logo URL (a real possibility
since `logo_url` is a user-selected/AI-derived storage URL) renders a broken-image glyph
inside the 10x10 box instead of falling back to the `Building2` icon used when `logo_url` is
null.
**Fix:**
```tsx
{paikka.logo_url ? (
  <img
    src={paikka.logo_url}
    alt=""
    aria-hidden
    className="w-full h-full object-cover rounded-lg"
    onError={(e) => { e.currentTarget.style.display = 'none' }}
  />
) : (
  <Building2 size={20} className="text-[rgba(0,0,0,0.25)]" />
)}
```
(requires restructuring to a stateful fallback, similar to the photo panel, since simply
hiding the `<img>` here leaves an empty box rather than swapping in the icon).

### WR-11 (Pass 2): Dashboard data fetch swallows all Supabase errors and has no failure recovery

**File:** `app/business/page.tsx:153-221`
**Issue:** None of the Supabase queries in `checkState` (`business_accounts`,
`onboarding_draft`, `business_paikka_links` join, `business_branding`,
`business_access_requests`) check the returned `error`. A transient DB/RLS error on the
`business_accounts` lookup (line 159-163) is indistinguishable from "not a business account"
and would show the registration screen (`isNotBusinessAccount`) to a legitimate business user.
Additionally, the whole `checkState` function has no `try/catch` — if any awaited call throws
(e.g. `supabase.auth.getUser()`), `setLoading(false)` is never reached and the page is stuck
on the spinner indefinitely with no retry affordance.
**Fix:** Wrap `checkState`'s body in `try { ... } catch { setLoading(false); /* show error state */ } finally { }`, and check `.error` on at least the `business_accounts` query before deciding `isNotBusinessAccount`.

### WR-12 (Pass 2): Unsafe blanket cast on the joined venue-links query result

**File:** `app/business/page.tsx:187`
**Issue:** `setVenueLinks((links as unknown as VenueLink[]) ?? [])` casts through `unknown`,
bypassing type-checking entirely on data coming straight off the wire. If the Supabase
relationship cardinality ever changes (or the join is misconfigured) such that
`liikuntapaikat` comes back as an array instead of a single object, this cast hides it and
`DashboardVenueCard`'s `link.liikuntapaikat as unknown as Liikuntapaikka` (line 119) would
silently receive an array where an object is expected, with no compiler or runtime signal.
**Fix:** Validate/narrow the shape at the boundary (e.g. `Array.isArray(row.liikuntapaikat) ? row.liikuntapaikat[0] : row.liikuntapaikat`) instead of a raw `as unknown as` cast.

### WR-13 (Pass 2): PreviewModal's PaikkaSheet section never shows the business's selected brand colors

**File:** `app/components/PreviewModal.tsx:74-85`
**Issue:** `CalloutCard` and `DiagonaalKortti` both receive `brandColor`/`accentColor` in this
same modal (lines 54-71, wired in this session's Plan 06 fix), but `PaikkaSheet` is rendered
with neither prop — and `PaikkaSheet.tsx` does not even declare those props (confirmed: no
`brandColor`/`accentColor` references anywhere in that file). The modal's purpose is to
preview the venue's branded appearance across card types; the "PaikkaSheet" section is
silently unbranded while the other two sections are, producing an inconsistent preview.
**Fix:** Either add brand-color support to `PaikkaSheet` and pass the props through, or
explicitly document/label that the sheet preview is unbranded by design.

### WR-14 (Pass 2): Fire-and-forget fetches with no error handling in onboarding flow

**File:** `app/business/onboarding/page.tsx:338-356,381-385`
**Issue:** The analyze-website POST and save-step POST calls in `handleNimiUrlNext`, and the
analyze-website POST in `handleRunAnalysis`, are not `await`ed and have no `.catch()`. A
network failure on any of these produces an unhandled promise rejection and silently fails to
persist the draft or start analysis, with zero user-visible feedback — the user only finds out
indirectly (if at all) when `WaitingForAI` eventually times out after ~40s.
**Fix:** At minimum, attach `.catch(err => console.error(...))` to surface failures in
telemetry; consider surfacing a toast/banner for the save-step failure specifically, since a
silently-lost `website` field write directly causes the CR-04/CR-05 class of bugs to be harder
to diagnose.

## Info

### IN-01 (Pass 1): Redundant nested `AnimatePresence` in PreviewModal

**File:** `app/components/PreviewModal.tsx:19-94`
**Issue:** `PreviewModal` wraps its single top-level `motion.div` in its own local `<AnimatePresence>`, but the component is only ever rendered as the sole conditional child of an outer `<AnimatePresence>` in `app/business/page.tsx:289-293`. Because `PreviewModal` itself is mounted/unmounted as a unit by the parent, its own internal `AnimatePresence` never observes a child being removed from its own subtree and does nothing useful — it's dead complexity, not a functional bug.
**Fix:** Remove the inner `<AnimatePresence>` wrapper; the outer one already manages enter/exit for the whole modal. (Reported independently in Pass 2 as IN-04 — same finding, confirmed still present after this session's PreviewModal edits.)

### IN-02 (Pass 1): `previewLabelCard` i18n key orphaned by this phase's own refactor

**File:** `messages/en.json:190`, `messages/fi.json:190`
**Issue:** Per `63-PATTERNS.md` ("Section to remove"), this phase deletes the `PaikkaKortti`/`previewLabelCard` section from `PreviewModal.tsx` in favor of the `CalloutCard` section. The JSX usage is gone, but the `Business.previewLabelCard` translation key itself remains in both message files with no remaining reference anywhere in `.tsx` source — dead i18n content left behind by this exact change.
**Fix:** Remove `previewLabelCard` from both `messages/en.json` and `messages/fi.json` (or confirm no other planned call site still needs it before removing).

### IN-03 (Pass 2): `as any` type escape for the sport-label translation key

**File:** `app/components/DiagonaalKortti.tsx:140-141`
**Issue:** `tLajit(paikka.laji as any)` bypasses `next-intl`'s key typing entirely via an
inline eslint-disable. `paikka.laji` is a plain `string`, so any typo/unknown sport key would
be masked instead of caught at compile time. Note: also the source of the separately-observed
`MISSING_MESSAGE: Lajit.Muu` console warning for the English locale (the `Lajit` namespace in
`messages/en.json` has no `Muu` key) — a real, user-visible consequence of this type escape.
**Fix:** Type `laji` as a proper union/enum where feasible, or narrow via `lajiKonfig`'s keys
instead of `as any`. Separately, add the missing `Lajit.Muu` key to `messages/en.json`.

### IN-04 (Pass 2): Redundant nested `AnimatePresence` in PreviewModal

**File:** `app/components/PreviewModal.tsx:20-98`
**Issue:** Same finding as IN-01 (Pass 1) — `PreviewModal` wraps its own single root `motion.div` in its own `<AnimatePresence>`, but the only caller (`app/business/page.tsx:329-338`) already wraps the conditionally-rendered `<PreviewModal>` in an outer `<AnimatePresence>`.
**Fix:** Remove the inner `<AnimatePresence>` wrapper; the outer one already manages enter/exit for the whole modal.

### IN-05 (Pass 2): PATCH branding route doesn't validate `image_urls` element types

**File:** `app/api/business/branding/route.ts:80-82,142-148`
**Issue:** `image_urls` is checked with `Array.isArray(image_urls) && image_urls.length <= MAX_GALLERY_SELECTION`, but individual elements are never checked to be strings before being
used in `storedSet.has(url)` (line 144) and later written verbatim to the DB. This is not
currently exploitable (a non-string element simply fails the membership check and 400s), but
it's an inconsistency versus the rest of the file's validation rigor and would silently allow
malformed values through if the membership check is ever loosened.
**Fix:** `image_urls.every(u => typeof u === 'string' && storedSet.has(u))`.

---

_Reviewed: 2026-07-01 (Pass 1) + 2026-07-02 (Pass 2)_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
