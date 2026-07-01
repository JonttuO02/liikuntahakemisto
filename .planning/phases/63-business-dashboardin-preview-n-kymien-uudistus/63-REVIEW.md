---
phase: 63-business-dashboardin-preview-n-kymien-uudistus
reviewed: 2026-07-01T00:00:00Z
depth: standard
files_reviewed: 13
files_reviewed_list:
  - app/api/business/update-paikka/route.ts
  - app/business/onboarding/LivePreviewPane.tsx
  - app/business/page.tsx
  - app/components/CalloutCard.tsx
  - app/components/DiagonaalKortti.tsx
  - app/components/PaikkaSheet.tsx
  - app/components/PreviewModal.tsx
  - app/components/RejectionReasonPopup.tsx
  - lib/branding/brandingResult.test.ts
  - lib/branding/brandingResult.ts
  - messages/en.json
  - messages/fi.json
  - tests/api/update-paikka.test.ts
findings:
  critical: 2
  warning: 7
  info: 2
  total: 11
status: issues_found
---

# Phase 63: Code Review Report

**Reviewed:** 2026-07-01
**Depth:** standard
**Files Reviewed:** 13
**Status:** issues_found

## Summary

Reviewed the dashboard-preview restyle (`DiagonaalKortti` dashboard variant, `RejectionReasonPopup`, `PreviewModal`/`LivePreviewPane` CalloutCard swap) and the `update-paikka` route's D-07 auto-resubmit branch. The new UI-only components (RejectionReasonPopup, LivePreviewPane's 3rd section, PreviewModal) are generally sound and match the phase's own pattern map (63-PATTERNS.md) closely. The two Critical findings are both in `update-paikka/route.ts` and predate the D-07 change but are squarely in scope (the file was modified in this phase and is fully re-reviewed): the `mediat`/`hinnasto`/`sijainti` sections silently null out any field the client omits from the request body (no distinction between "not sent" and "explicitly cleared"), and the `yhteystiedot` section's `varauslinkki` field can never be cleared once set, because an emptied field is left `undefined` and silently dropped by the client before it reaches Postgres. Warnings cover a bypassable body-size guard, an inconsistent color-utility edge case, an unhandled clipboard-write failure path, and a latent UI-overlap risk in `DiagonaalKortti`.

## Critical Issues

### CR-01: Omitted fields in mediat/hinnasto/sijainti section saves silently wipe existing data

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

### CR-02: `varauslinkki` can never be cleared once set

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

## Warnings

### WR-01: 64KB body-size cap is bypassed by omitting Content-Length

**File:** `app/api/business/update-paikka/route.ts:6-9`
**Issue:** `if (contentLength && parseInt(contentLength, 10) > 65536)` only rejects the request when the `Content-Length` header is present and too large. A client using chunked transfer encoding (or one that simply omits the header) sails through this guard entirely, and `request.json()` will still read and parse the full body regardless of size. The comment ("D-02: Reject oversized bodies") states an intent that this code does not actually guarantee.
**Fix:** Enforce a hard cap while reading the body instead of trusting the header, e.g. read `request.body` via a size-limited reader, or use `await request.text()` and check `.length` before `JSON.parse`, rejecting if it exceeds the cap regardless of what `Content-Length` claimed.

### WR-02: `logo_url` has no type validation in the mediat section

**File:** `app/api/business/update-paikka/route.ts:57-70`
**Issue:** `photo_urls` items are explicitly checked to be strings (T-03), but `d.logo_url` is used directly (`logo_url: d.logo_url ?? null`) with no `typeof` check. A caller sending a number, object, or array for `logo_url` will pass validation and hit the DB update, likely surfacing as an opaque 500 from Postgres rather than a clean 400.
**Fix:** Mirror the `photo_urls` string check:
```ts
if (d.logo_url !== undefined && d.logo_url !== null && typeof d.logo_url !== 'string') {
  return NextResponse.json({ error: 'logo_url must be a string or null' }, { status: 400 })
}
```

### WR-03: `darkenHex`/`lightenHex` don't support 3-digit shorthand hex, silently breaking `getPanelShade`'s contract

**File:** `lib/branding/brandingResult.ts:95-117, 132-136`
**Issue:** `getContrastColor` explicitly expands 3-digit shorthand hex (`'fff'` → `'ffffff'`, lines 74-76) before parsing, but `darkenHex`/`lightenHex` use a regex that only matches full 6-digit hex (`/^#?([0-9a-f]{6})$/i`). For a 3-digit `brandColor`, the regex fails to match and the function returns the **unchanged input** (per the guard comment). Since `getPanelShade` is documented as "guaranteed to visibly differ from `brandColor` itself" (lines 122-124), this guarantee silently breaks whenever a 3-digit hex reaches it — `getPanelShade('#fff')` returns `'#fff'` unchanged, and the dashboard controls panel would render with the exact same background as the card's brand-colored left panel. The existing test suite (`brandingResult.test.ts`) only exercises 6-digit / malformed inputs, not the 3-digit case, so this gap isn't caught.
**Fix:** Expand 3-digit shorthand in `darkenHex`/`lightenHex` the same way `getContrastColor` does, or route all three functions through one shared hex-normalization helper.

### WR-04: `handleCopyInviteLink` doesn't handle clipboard failures

**File:** `app/business/page.tsx:100-105`
**Issue:**
```ts
function handleCopyInviteLink() {
  const url = window.location.origin + '/business/liity?paikka_id=' + link.paikka_id
  navigator.clipboard.writeText(url)
  setCopied(true)
  setTimeout(() => setCopied(false), 2000)
}
```
`navigator.clipboard` is undefined in non-secure contexts (plain `http://`) and in some older/embedded browsers, which would throw synchronously on `.writeText`. Even when it exists, `writeText` returns a `Promise` that can reject (e.g. clipboard permission denied) with no `.catch()`. In both cases `setCopied(true)` still fires (or the whole handler throws before reaching it, leaving the user with no feedback at all), so the UI can show "Link copied" when nothing was actually copied.
**Fix:**
```ts
async function handleCopyInviteLink() {
  const url = window.location.origin + '/business/liity?paikka_id=' + link.paikka_id
  try {
    await navigator.clipboard?.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  } catch {
    // optionally surface a failure state
  }
}
```

### WR-05: `onToggleTodo` button and dashboard status pill can occupy the same slot

**File:** `app/components/DiagonaalKortti.tsx:335-355, 367-375`
**Issue:** The `dashboardActions` status pill renders at `absolute bottom-3 right-3 z-20`, and the `onToggleTodo` bookmark button renders at the identical `absolute bottom-3 right-3 z-20`. The `MapPin` "show on map" button just above it is explicitly guarded with `!dashboardActions` (line 357: `{hasCoords && !dashboardActions && (...)}`) to prevent it from co-existing with the dashboard controls panel, but no equivalent guard exists for `onToggleTodo` (line 367: `{onToggleTodo && (...)}`, no `!dashboardActions` check). No current call site passes both `dashboardActions` and `onToggleTodo` together, but nothing in the component prevents it, and the two elements would visually overlap if it ever happened.
**Fix:** Add the same guard used for `MapPin`: `{onToggleTodo && !dashboardActions && (...)}`.

### WR-06: RejectionReasonPopup's close button has a misleading accessible name

**File:** `app/components/RejectionReasonPopup.tsx:73-79`
**Issue:** `aria-label={t('previewClose')}` resolves to "Close preview" / "Sulje esikatselu" — copy written for the unrelated `PreviewModal`/venue-preview flow. A screen-reader user closing the rejection-reason dialog hears "Close preview," which doesn't describe what's being closed. (The phase's own pattern doc, `63-PATTERNS.md` line 203, called for a dedicated `t('close')` key here; that key doesn't currently exist in the `Business` i18n namespace, which is presumably why `previewClose` was reused instead.)
**Fix:** Add a namespace-appropriate key (e.g. `Business.close` = "Close" / "Sulje") to `messages/en.json`/`fi.json` and use it here instead of reusing `previewClose`.

### WR-07: `hinnasto` and `sijainti` sections have zero test coverage

**File:** `tests/api/update-paikka.test.ts`
**Issue:** The test suite covers auth, body-size, JSON parsing, ownership, `mediat`, `aukioloajat`, `yhteystiedot`, unknown-section, and the D-07 flip branch — but never exercises the `hinnasto` section (numeric type checks on `hinta_min`/`hinta_max`, string check on `hinta_kuvaus`) or the `sijainti` section (lat/lng range validation, `osoite`/`kaupunki` truncation). Both sections contain non-trivial validation logic (CR-01 above lives in these exact branches) that ships with no regression protection.
**Fix:** Add positive/negative test cases for both sections, mirroring the existing `mediat`/`aukioloajat` test structure (invalid type → 400, valid payload → 200, boundary values for lat/lng ±90/±180).

## Info

### IN-01: Redundant nested `AnimatePresence` in PreviewModal

**File:** `app/components/PreviewModal.tsx:19-94`
**Issue:** `PreviewModal` wraps its single top-level `motion.div` in its own local `<AnimatePresence>`, but the component is only ever rendered as the sole conditional child of an outer `<AnimatePresence>` in `app/business/page.tsx:289-293`. Because `PreviewModal` itself is mounted/unmounted as a unit by the parent, its own internal `AnimatePresence` never observes a child being removed from its own subtree and does nothing useful — it's dead complexity, not a functional bug.
**Fix:** Remove the inner `<AnimatePresence>` wrapper; the outer one already manages enter/exit for the whole modal.

### IN-02: `previewLabelCard` i18n key orphaned by this phase's own refactor

**File:** `messages/en.json:190`, `messages/fi.json:190`
**Issue:** Per `63-PATTERNS.md` ("Section to remove"), this phase deletes the `PaikkaKortti`/`previewLabelCard` section from `PreviewModal.tsx` in favor of the `CalloutCard` section. The JSX usage is gone, but the `Business.previewLabelCard` translation key itself remains in both message files with no remaining reference anywhere in `.tsx` source — dead i18n content left behind by this exact change.
**Fix:** Remove `previewLabelCard` from both `messages/en.json` and `messages/fi.json` (or confirm no other planned call site still needs it before removing).

---

_Reviewed: 2026-07-01_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
