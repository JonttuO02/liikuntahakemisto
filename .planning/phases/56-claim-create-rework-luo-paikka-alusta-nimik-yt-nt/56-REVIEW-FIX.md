---
phase: 56-claim-create-rework-luo-paikka-alusta-nimik-yt-nt
fixed_at: 2026-06-24T09:05:00Z
review_path: .planning/phases/56-claim-create-rework-luo-paikka-alusta-nimik-yt-nt/56-REVIEW.md
iteration: 1
findings_in_scope: 7
fixed: 7
skipped: 0
status: all_fixed
---

# Phase 56: Code Review Fix Report

**Fixed at:** 2026-06-24T09:05:00Z
**Source review:** .planning/phases/56-claim-create-rework-luo-paikka-alusta-nimik-yt-nt/56-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 7 (2 Critical, 5 Warning — Info findings excluded per default scope)
- Fixed: 7
- Skipped: 0

## Fixed Issues

### CR-01: `kaupunki` accepts whitespace-only strings / reverse-geocoding failure is silent

**Files modified:** `app/components/ClaimSearchForm.tsx`, `app/components/SijaintiPicker.tsx`
**Commit:** f45f7aa
**Applied fix:** Added a client-side guard in `handleCreate` that blocks submit and shows `t('sijaintiVirhe')` when `createKaupunki.trim()` is empty, instead of relying solely on the server's silent 400. Added `geocodeError` state in `SijaintiPicker` that is set when `reverseGeocodeCity` returns `null`, and renders the existing `sijaintiVirhe` i18n string inline (`role="alert"`) so the user gets actionable feedback that auto-fill failed and they need to type the city manually.

### CR-02: Partial-failure rollback path can silently orphan a `liikuntapaikat` row

**Files modified:** `app/api/business/create-paikka/route.ts`
**Commit:** 7037d51
**Applied fix:** Both rollback `.delete()` calls (23505-conflict path and generic link-insert-failure path) now capture and check the `error` result. On failure, logs `console.error('[create-paikka] CRITICAL: rollback delete failed, orphaned row id=...', ...)` so an orphaned row is at least operationally visible, matching the project's existing log-don't-rollback pattern used elsewhere in the same route for non-critical secondary writes.

### WR-01: Combined `nimi` string can exceed 200 chars (up to 401)

**Files modified:** `app/api/business/create-paikka/route.ts`
**Commit:** 7037d51
**Applied fix:** Re-capped the combined `nimi` string with `.slice(0, 200)` after concatenating `yritysNimi` and `toimipisteNimi`, since each field is individually normalized/capped at 200 by `normalizeNimi` but the combined value could reach 401 chars. No explicit DB column length constraint was found on `liikuntapaikat.nimi` in the migrations, so 200 (matching the existing per-field cap and the design system's single-line card-title assumption) was used as the bound, per the review's suggested fix.

### WR-02: `kaupunki` never trimmed before sending, inconsistent with sibling fields

**Files modified:** `app/components/ClaimSearchForm.tsx`
**Commit:** f45f7aa
**Applied fix:** Changed `kaupunki: createKaupunki` to `kaupunki: createKaupunki.trim()` in the `handleCreate` request body, consistent with `yritysNimi.trim()`, `toimipisteNimi.trim()`, and `createOsoite.trim()` on the surrounding lines.

### WR-03: No route-level test coverage for whitespace-collapsing normalization

**Files modified:** `tests/api/create-paikka.test.ts`
**Commit:** c04b9bd
**Applied fix:** Added a test sending `yritysNimi: '  Fit   Life   Oy  '` through the full `POST` handler and asserting the `liikuntapaikat.insert` payload's `nimi` field equals the whitespace-collapsed `'Fit Life Oy'`, closing the coverage gap between the `normalizeNimi` unit tests and the route's actual usage of it.

### WR-04: `errorClaimAlreadyTaken` key name no longer matches its meaning

**Files modified:** `messages/fi.json`, `messages/en.json`, `app/components/ClaimSearchForm.tsx`
**Commit:** f45f7aa
**Applied fix:** Renamed the i18n key `errorClaimAlreadyTaken` to `errorVenueAlreadyTaken` in both `fi.json` and `en.json` (copy unchanged), and updated the single call site in `ClaimSearchForm.tsx` (`t('errorClaimAlreadyTaken')` → `t('errorVenueAlreadyTaken')`). Verified no other references to the old key name remain anywhere in `.ts`/`.tsx`/`.json` files.

### WR-05: `linksBuilder.insert` mock structurally cannot simulate conflict/failure paths

**Files modified:** `tests/api/create-paikka.test.ts`
**Commit:** c04b9bd
**Applied fix:** Replaced the always-`{ error: null }` ternary in the `linksBuilder.insert` mock with a configurable `mockLinksInsert(payload)` spy whose return value each test can set via `mockReturnValue(...)`. Also made `liikuntapaikat.delete().eq(...)` configurable via a new `mockLiikuntapaikatDelete` spy (previously hardcoded to always resolve `{ error: null }`) so rollback-call assertions are possible. Added two new tests: one asserting a `23505` link conflict returns 409 (`'Already claimed'`) and calls the rollback delete with the new row's id, and one asserting a generic (non-23505) link-insert error returns 500 (`'Link insert failed'`, with `detail`) and also triggers the rollback delete.

## Skipped Issues

None — all in-scope findings were fixed.

## Verification

- `npx tsc --noEmit`: no errors introduced in any modified file (pre-existing project errors, if any, are unrelated to these changes and were not touched)
- `npx vitest run` (full suite): 19 test files, 210 tests passed (207 pre-existing + 3 new from WR-03/WR-05)
- Info-level findings (IN-01, IN-02, IN-03) were intentionally left untouched per the requested scope (Critical + Warning only); none were trivially bundled since they involve separate concerns (JSDoc signature widening, shared constants file, component rename) that the review itself flagged as "avoid scope creep" / low priority.

---

_Fixed: 2026-06-24T09:05:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
