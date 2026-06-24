---
phase: 56-claim-create-rework-luo-paikka-alusta-nimik-yt-nt
reviewed: 2026-06-24T05:51:39Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - lib/normalizeNimi.ts
  - lib/normalizeNimi.test.ts
  - app/api/business/create-paikka/route.ts
  - app/components/ClaimSearchForm.tsx
  - messages/fi.json
  - messages/en.json
  - tests/api/create-paikka.test.ts
findings:
  critical: 2
  warning: 5
  info: 3
  total: 10
status: issues_found
---

# Phase 56: Code Review Report

**Reviewed:** 2026-06-24T05:51:39Z
**Depth:** standard
**Files Reviewed:** 7
**Status:** issues_found

## Summary

Reviewed the claim/create venue rework: a new `normalizeNimi` helper, the reshaped `create-paikka` route (two name fields, combined `nimi`, 23505→409 conflict handling), the rewritten `ClaimSearchForm.tsx` (create-only), i18n updates, and the orchestrator-patched test file. The backend correctly preserves the prior security posture (JWT verification, allowlist parsing of lat/lng, no `...body` spread). However there is a real data-integrity gap: the server trusts the client-supplied `kaupunki` field with only a non-empty-string check, and the client (`SijaintiPicker`) can legitimately produce an empty string for `city` that still passes that check in some paths, while in other cases blank/whitespace-only city values are not actually blocked by the route despite looking validated. There's also an asymmetry in `osoite`/`kaupunki` trimming between the client and server, and the new partial-rollback design in `create-paikka` has an unhandled failure mode that can silently orphan rows. Several smaller issues affect maintainability (duplicated `toLowerCase`-style helper naming clash risk, an unused `nimi` upper bound interaction, and an i18n key whose value no longer matches its semantic name).

## Critical Issues

### CR-01: `kaupunki` accepts whitespace-only strings, producing a falsy-but-truthy bypass of the "required field" guard

**File:** `app/api/business/create-paikka/route.ts:40,56`
**Issue:** The route does:
```ts
kaupunki = typeof body.kaupunki === 'string' ? body.kaupunki.trim().slice(0, 500) : ''
...
if (!yritysNimi || !osoite || !kaupunki || latitude === null || longitude === null) {
  return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
}
```
This looks safe (trim then falsy-check), so a whitespace-only `kaupunki` *is* correctly rejected. However, trace the actual client caller in `ClaimSearchForm.tsx:71`: `kaupunki: createKaupunki` is sent **without `.trim()`** (unlike `yritysNimi.trim()` and `createOsoite.trim()` two lines above it), and `createKaupunki` is set directly from `SijaintiPicker`'s `city` state (`app/components/SijaintiPicker.tsx:76,82,145`), which the user can freely edit via a plain `<input>` (line 140-146 in SijaintiPicker.tsx). A user can type a single space into the city field — the client does zero validation on `createKaupunki` before submit (`handleCreate` only validates `yritysNimi`, `createOsoite`, and lat/lng — never `createKaupunki`, see lines 41-52). The request reaches the server with `kaupunki: " "`, which the server's `.trim()` correctly catches as empty → 400. So today this is masked by the *server's* trim, but it means the client-side validation contract is incomplete: if the server's trim is ever loosened (e.g., to support cities with meaningful leading characters) the empty-city case ships straight into the database with no city value, since `liikuntapaikat.insert()` at line 72 does not re-validate after the initial body-parsing block.

More importantly: **reverse-geocoding failure silently leaves `city` as `''`** (`SijaintiPicker.tsx:82`: `setCity(result ?? '')`). If the user drags the pin or clicks the map in an area where `reverseGeocodeCity` returns `null` (geocoder error, rural address, API failure) and does not notice the auto-fill failed (no error message is shown to the user — `sijaintiVirhe` copy exists in i18n but is never rendered anywhere in `SijaintiPicker.tsx`), `createKaupunki` stays `''`. The route then correctly 400s — but the client surfaces this as a generic `errorCreateFailed` ("Paikan luonti epäonnistui") rather than the more specific guidance the i18n string `sijaintiVirhe` was clearly designed for. The user has no actionable feedback that they need to manually type a city.
**Fix:** Add a client-side guard mirroring the server's required-field check, and surface `sijaintiVirhe` when reverse geocoding fails:
```ts
// SijaintiPicker.tsx
async function handlePinChange(coords: Pin) {
  setPin(coords)
  const result = await reverseGeocodeCity(coords.lat, coords.lng)
  if (result === null) {
    // surface t('sijaintiVirhe') to the parent or local state
  }
  setCity(result ?? '')
}
```
```ts
// ClaimSearchForm.tsx handleCreate, alongside existing guards
if (!createKaupunki.trim()) {
  setError(t('sijaintiVirhe'))
  return
}
```
and trim before sending: `kaupunki: createKaupunki.trim()`.

### CR-02: Partial-failure rollback path can leave an orphaned `liikuntapaikat` row with no linked `business_paikka_links` entry if the rollback delete itself fails

**File:** `app/api/business/create-paikka/route.ts:96-110`
**Issue:**
```ts
if (linkError) {
  if (linkError.code === '23505') {
    await supabaseAdmin.from('liikuntapaikat').delete().eq('id', newPaikkaId)
    return NextResponse.json({ error: 'Already claimed' }, { status: 409 })
  }
  await supabaseAdmin.from('liikuntapaikat').delete().eq('id', newPaikkaId)
  return NextResponse.json({ error: 'Link insert failed', detail: linkError.message }, { status: 500 })
}
```
Both rollback branches fire-and-forget the `.delete()` call — the result (`error`) is never checked. If the delete itself fails (e.g., transient DB error, RLS edge case despite service-role bypass, network blip), the function still returns 409/500 to the client as if cleanup succeeded, but the orphaned `liikuntapaikat` row (with `published: false` but no `business_paikka_links` row) remains in the database permanently. Over time this creates unclaimed/unlinked dead rows with no owner, no admin visibility, and no retry mechanism — a real data-integrity issue, not just style. This is the same general class of issue the code explicitly tries to avoid for the *first* insert (rollback-on-failure, D-10) but doesn't apply consistently when the rollback itself can fail.
**Fix:** Check and log the delete result so at least operational visibility exists, and consider whether a real DB transaction (RPC) would remove the need for manual two-step rollback entirely:
```ts
const { error: rollbackError } = await supabaseAdmin.from('liikuntapaikat').delete().eq('id', newPaikkaId)
if (rollbackError) {
  console.error('[create-paikka] CRITICAL: rollback delete failed, orphaned row id=' + newPaikkaId, rollbackError.message)
}
```

## Warnings

### WR-01: `nimi` combined string can exceed reasonable display length without being re-capped

**File:** `app/api/business/create-paikka/route.ts:65`
**Issue:** `normalizeNimi` caps each of `yritysNimi` and `toimipisteNimi` individually at 200 chars, but the combined `nimi = ${yritysNimi} ${toimipisteNimi}` (line 65) can be up to 401 characters (200 + 1 space + 200). This combined value is written directly to `liikuntapaikat.nimi` with no further length cap, and is also used downstream for card titles which the project's design system caps visually to a single line / `line-clamp` treatments — a 400-char venue name will break card layouts that assume reasonably short names.
**Fix:** Cap the combined name too, e.g. `nimi = nimi.slice(0, 200)` after concatenation, or reduce each field's individual cap so the worst case fits a sane bound (e.g. 100 each).

### WR-02: `ClaimSearchForm.tsx` never trims `kaupunki` before sending, inconsistent with `yritysNimi`/`createOsoite`

**File:** `app/components/ClaimSearchForm.tsx:67-74`
**Issue:**
```ts
body: JSON.stringify({
  yritysNimi: yritysNimi.trim(),
  toimipisteNimi: toimipisteNimi.trim(),
  osoite: createOsoite.trim(),
  kaupunki: createKaupunki,          // <-- not trimmed
  latitude: createLat,
  longitude: createLng,
}),
```
Every other string field is explicitly `.trim()`-ed at the call site except `kaupunki`. This is inconsistent and relies entirely on the server doing the trim (which it does, see CR-01) — but it's a latent bug if the server contract ever changes, and it's inconsistent style within the same object literal.
**Fix:** `kaupunki: createKaupunki.trim(),`

### WR-03: `toimipisteNimi` passed to server without `normalizeNimi`-equivalent client-side trim consistency, and double-normalization on server is wasted work but not actually wrong — confirm intent

**File:** `app/api/business/create-paikka/route.ts:37-38`
**Issue:** Both `yritysNimi` and `toimipisteNimi` are run through `normalizeNimi()` server-side regardless of what the client already trimmed. This is fine for defense-in-depth, but note `normalizeNimi` collapses *internal* whitespace too (`\s+` → single space) — something the client's `.trim()` does not do. If a user types "Fit  Life Oy" (double internal space) the server will silently store "Fit Life Oy", which is correct behavior, but there is no test coverage in `tests/api/create-paikka.test.ts` exercising this path through the actual route (the unit tests for `normalizeNimi` cover it, but the route-level test suite never asserts that `nimi`/`company_name` reflects the normalized — not raw — value). This is a coverage gap, not a logic bug.
**Fix:** Add a route-level test asserting `mockLiikuntapaikatInsert` was called with a `nimi` that reflects whitespace-collapsed input, e.g. send `yritysNimi: '  Fit   Life   Oy  '` and assert insert payload `nimi === 'Fit Life Oy'`.

### WR-04: `errorClaimAlreadyTaken` key name and copy no longer match — the "claim" flow it described was removed in this same phase

**File:** `messages/fi.json:127`, `messages/en.json:127`
**Issue:** The key is still named `errorClaimAlreadyTaken`, and its copy was correctly reworded for the create-only flow ("Tämä paikka on jo rekisteröity. Ota yhteyttä tukeen..." / "This venue is already registered..."). But the key name itself is a leftover from the deleted claim/search flow (per `33-UI-SPEC.md` lineage) and is now semantically misleading in a codebase that no longer has a "claim" action — `33-02-PLAN.md` explicitly distinguishes claim-step keys (slated for deletion) from create-step keys, yet this one survived under its old claim-era name while its *meaning* changed to a generic "name conflict" message for the create flow. This is a naming/maintainability smell that will confuse the next person who greps for "claim" expecting to find claim-flow code (which is now fully removed per the route deletion).
**Fix:** Rename to `errorVenueAlreadyTaken` or `errorCreateConflict` across `fi.json`, `en.json`, and `ClaimSearchForm.tsx:84`. Low priority since it's cosmetic, but worth tracking as tech debt given the deletion of the claim flow this phase performed.

### WR-05: Test file's `linksBuilder.insert` mock cannot ever simulate the 23505 conflict path or generic link-insert failure path

**File:** `tests/api/create-paikka.test.ts:79-89`
**Issue:**
```ts
const linksBuilder = {
  insert: (payload: unknown) => {
    mockLinksInsert(payload)
    return Promise.resolve(mockLinksInsert.mock.results.length ? { error: null } : { error: null })
  },
  ...
}
```
Both branches of that ternary return `{ error: null }` — the mock is structurally incapable of ever returning a link-insert error, which means there is **no test coverage at all** for the new 23505→409 conflict branch (`route.ts:100-103`) or the generic link-insert-failure 500 branch (`route.ts:104-109`), despite this being one of the explicitly called-out new behaviors of this phase (D-11, T-56-03 per the route's own comments). This is a meaningful regression-test gap for a documented design decision.
**Fix:** Make the mock configurable like the others (`mockLinksInsert.mockResolvedValueOnce({ error: { code: '23505', message: 'duplicate key' } })`) and add two tests: one asserting 409 + rollback delete called, one asserting 500 + rollback delete called for a non-23505 error.

## Info

### IN-01: `normalizeNimi` JSDoc claims "never returns undefined" but the cast in its own test (`null as never`) signals an unenforced runtime gap

**File:** `lib/normalizeNimi.ts:13-15`, `lib/normalizeNimi.test.ts:17-19`
**Issue:** The function signature declares `(value: string): string`, but the test deliberately calls it with `null as never` to validate the `if (!value) return ''` guard against runtime nulls that bypass TypeScript's static check (e.g., from `JSON.parse` results typed loosely elsewhere). This works correctly today, but the `as never` cast is a code smell that hides the fact the function's real contract is `string | null | undefined -> string`, not `string -> string`. Future refactors of call sites may pass a TS-legitimate `string | undefined` and get a type error rather than relying on this defensive guard, or vice versa.
**Fix:** Widen the signature to declare intent: `export function normalizeNimi(value: string | null | undefined): string`.

### IN-02: Magic number `200` (and `500` for osoite/kaupunki) duplicated across files with no shared constant

**File:** `lib/normalizeNimi.ts:15`, `app/api/business/create-paikka/route.ts:39-40`
**Issue:** `200` (name cap) and `500` (address/city cap) are bare magic numbers with no named constant, making it easy for the two to drift if either limit changes (and per WR-01, the combined `nimi` length of up to 401 already exceeds the documented 200-char intent without anyone noticing).
**Fix:** Extract `const MAX_NIMI_LENGTH = 200` and `const MAX_ADDRESS_FIELD_LENGTH = 500` as named constants, ideally in a shared `lib/constants.ts`.

### IN-03: `ClaimSearchForm.tsx` still named for the deleted "claim/search" flow

**File:** `app/components/ClaimSearchForm.tsx`
**Issue:** The component is now create-only (per the phase's own description: "drop the search/claim steps entirely"), yet the file and component are still named `ClaimSearchForm`. This is purely cosmetic but will mislead future readers searching for claim-related logic, similar to WR-04.
**Fix:** Rename to `CreatePaikkaForm.tsx` in a follow-up cleanup phase (low priority, avoid scope creep in this phase).

---

_Reviewed: 2026-06-24T05:51:39Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
