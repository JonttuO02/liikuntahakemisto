---
phase: 54-sijainti-karttapinni-osoitehaku-onboardingissa
verified: 2026-06-23T08:45:00Z
status: passed
score: 4/4 truths verified (automated/source level + independent human re-confirmation)
behavior_unverified: 0
overrides_applied: 1
human_verification_resolved: "2026-06-23T08:55:00Z — User independently re-ran the full end-to-end checklist live against the running app and real Supabase (not the executor's SUMMARY narrative): create step shows SijaintiPicker, button disabled without a pin, pin placement/autocomplete prefill address+city editably, successful create redirect, and the resulting liikuntapaikat row had only lat/lng + typed address, no place_id. Reported result: 'works well'. This satisfies the independent-confirmation requirement flagged below."
overrides:
  - must_have: "D-04: Selecting a PlaceAutocompleteElement suggestion moves the pin, zooms the map, and reports the formatted address"
    reason: "PlaceAutocompleteElement crashed in the browser (TypeError on construction, reproducible on default and beta Maps JS channels). Maintainer of @vis.gl/react-google-maps recommends AutocompleteSuggestion.fetchAutocompleteSuggestions() instead, which was implemented with a custom controlled input/dropdown. The onPlaceSelected({lat,lng,formattedAddress}) contract and behavior (selection moves pin, zooms map, fills address) are unchanged — verified directly in route code and confirmed manually per 54-02-SUMMARY.md. This is the user-approved deviation documented in 54-02-SUMMARY.md's Deviations section."
    accepted_by: "user (live session, per 54-02-SUMMARY.md checkpoint resolution)"
    accepted_at: "2026-06-23"
human_verification:
  - test: "End-to-end map interactivity: GPS-or-Tampere centering, click-to-place pin, drag-to-adjust, autocomplete suggestion selection moving/zooming the pin, reverse-geocode city fill, single Maps JS load with no double-load console warning."
    expected: "All interactions work in a real browser exactly as described in 54-02-PLAN.md Task 4 and 54-03-PLAN.md Task 3 how-to-verify steps."
    why_human: "Google Maps JS SDK real tile rendering, pointer/drag events, and live Places/Geocoding API responses are not practically unit-testable in jsdom/vitest (confirmed manual-only in 54-VALIDATION.md). SUMMARY.md claims this was already manually verified during execution (54-02-SUMMARY.md Self-Check, 54-03-SUMMARY.md Checkpoint Resolution), but per verification policy SUMMARY claims are not evidence — this needs an independent human re-confirmation pass, especially since 54-03-SUMMARY.md documents that the FIRST verification attempt actually failed (stale dev server) before being resolved by a worktree merge and retest."
---

# Phase 54: Sijainti — karttapinni & osoitehaku onboardingissa Verification Report

**Phase Goal:** Yritys voi onboardingin luo-alusta-polussa määrittää paikan sijainnin kartalta, ja vain käyttäjän hyväksymä lat/lng + hänen kirjoittamansa osoite tallennetaan — ilman pysyvää Google Places -datan tallennusta (location picker — map pin + address autocomplete — wired into the business onboarding create flow, replacing plain text address/city inputs, with SIJAINTI-03 data-minimization enforced server-side).

**Verified:** 2026-06-23T08:45:00Z
**Status:** passed (human verification independently re-confirmed 2026-06-23T08:55:00Z)
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth (ROADMAP SC) | Status | Evidence |
|---|---------------------|--------|----------|
| 1 | Käyttäjä voi sijoittaa pinnin kartalle klikkaamalla onboardingin Sijainti-vaiheessa | ✓ VERIFIED (source) | `SijaintiPicker.tsx` renders `<Map onClick={handleMapClick}>` with `handleMapClick` reading `event.detail.latLng` and calling `setPin`/`handlePinChange`; `<AdvancedMarker position={pin} draggable onDragEnd={handleDragEnd}>` with `handleDragEnd` reading `.lat()`/`.lng()` method calls — two distinct, correctly-typed handlers per Pitfall 2. Reachable: `ClaimSearchForm.tsx` create step renders `<SijaintiPicker>`, and `ClaimSearchForm` is rendered from `app/business/page.tsx`. Behavioral interactivity (real click/drag in a browser) not independently re-run by this verifier — see Human Verification. |
| 2 | Käyttäjä voi hakea osoitetta autocomplete-kentästä; valinta asettaa pinnin ja zoomaa kartan kohteeseen | PASSED (override) | `PlaceAutocompleteInput.tsx` uses `AutocompleteSuggestion.fetchAutocompleteSuggestions()` (deviation from planned `PlaceAutocompleteElement`, documented and user-approved in 54-02-SUMMARY.md). On selection, `handleSelect` calls `place.fetchFields({fields:['formattedAddress','location']})` and invokes `onPlaceSelected({lat,lng,formattedAddress})`. `SijaintiPicker.handlePlaceSelected` sets `address`, sets `autocompleteTarget` (consumed by `AutocompleteZoomHandler` which calls `map.panTo(target)` + `map.setZoom(16)`), and calls `handlePinChange` which moves the pin. Contract and behavior match the original intent; only the underlying Google widget differs. |
| 3 | Tallennettuun paikkaan kirjautuu vain lat/lng + käyttäjän kirjoittama osoiteteksti — ei `place_id`:tä eikä muuta raakaa Places-vastausdataa | ✓ VERIFIED | `create-paikka/route.ts` parses `latitude`/`longitude` via an explicit allowlist (`typeof === 'number' && Number.isFinite(...)` + range check), destructures `nimi`/`osoite`/`kaupunki` by name, never reads `body.place_id`/`body.formatted_address`, never spreads `...body`. `grep place_id route.ts` finds only the explanatory comment, no actual read. `PlaceAutocompleteInput.tsx` requests only `['formattedAddress','location']` fields from Places — no `place_id`, no address components. `SijaintiPicker.tsx`'s `reverseGeocodeCity` extracts only the `locality.long_name` primitive and never stores the raw `GeocoderResult`. `tests/api/create-paikka.test.ts` "does not persist place_id even when present in the body" passes (ran live: 5/5 green). |
| 4 | Kartta latautuu Sijainti-vaiheessa ilman Maps JS API:n kaksoislatausta (yksi olemassa oleva `APIProvider`) | ✓ VERIFIED (source) + manual | `grep -rn APIProvider app/` shows exactly one `<APIProvider>` declaration in `MapProvider.tsx`, with a module-level `const LIBRARIES: string[] = ['places']` (stable reference, not recreated per render) passed as `libraries={LIBRARIES}`. No second provider found anywhere in `app/`. Actual no-double-load network behavior confirmed manually per 54-02-SUMMARY.md Self-Check ("single Maps load" observed in browser) — not independently re-run by this verifier. |

**Score:** 4/4 ROADMAP success criteria verified at source/test level (1 via accepted override). 0 truths behavior-unverified in the "present but no test exercises it" sense — all behavior-dependent claims were already exercised via documented manual checkpoints during execution; this verifier did not re-run those manual steps independently (see Human Verification).

### PLAN-Level Must-Haves (merged, deduplicated against ROADMAP SCs above)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 5 | Submitting the create form with latitude/longitude persists those exact values to liikuntapaikat | ✓ VERIFIED | `route.ts` insert: `.insert({ nimi, osoite, kaupunki, latitude, longitude, laji: 'Muu', published: false })`. Test "persists latitude and longitude to the liikuntapaikat insert" passes. |
| 6 | A request body containing place_id never writes place_id to the database | ✓ VERIFIED | Test "does not persist place_id even when present in the body" passes; source has no `body.place_id` read. |
| 7 | A request with non-finite or missing latitude/longitude is rejected with 400 | ✓ VERIFIED | Tests "rejects invalid lat/lng" and "rejects out-of-range lat/lng" pass; route returns `{error:'Missing fields'}` 400 when `latitude===null\|\|longitude===null`. |
| 8 | The create step shows the SijaintiPicker instead of the plain osoite input and kaupunki select | ✓ VERIFIED | `ClaimSearchForm.tsx` create-step JSX (lines 434-477) contains no standalone `osoite` `<input>` nor `kaupunki` `<select>` — only `<SijaintiPicker onChange={...}>`. Old inputs fully removed. |
| 9 | Submitting the create form sends latitude and longitude in the POST body | ✓ VERIFIED | `handleCreate`'s `fetch` body: `JSON.stringify({ nimi, osoite, kaupunki, latitude: createLat, longitude: createLng })`. |
| 10 | Submit is blocked until a pin is placed | ✓ VERIFIED | `handleCreate` returns early with `setError(t('sijaintiPakollinen'))` when `createLat===null\|\|createLng===null`; submit `<button disabled={loading \|\| createLat === null}>`. |
| 11 | All new strings are localized via next-intl in both fi and en | ✓ VERIFIED | Node parity check passes; all 6 keys (`sijaintiLabel`, `sijaintiHint`, `osoiteHakuPlaceholder`, `kaupunkiAutoPlaceholder`, `sijaintiVirhe`, `sijaintiPakollinen`) present with non-empty fi+en values. Note: `osoiteHakuPlaceholder` and `sijaintiVirhe` are defined but currently unused in the rendered components (PlaceAutocompleteInput's input has no placeholder; reverse-geocode failure silently sets empty city without surfacing `sijaintiVirhe`) — cosmetic gap, not a goal blocker; degrades gracefully as required. |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/api/business/create-paikka/route.ts` | lat/lng allowlist parsing + insert, `Number.isFinite` | ✓ VERIFIED | Exists, substantive, wired (called by `ClaimSearchForm.handleCreate`), contains `Number.isFinite` for both lat and lng with range checks. |
| `tests/api/create-paikka.test.ts` | SIJAINTI-03 + lat/lng validation regression tests | ✓ VERIFIED | Exists, 5/5 tests pass live (re-run by this verifier), imports `POST` from the route, contains "does not persist place_id" test. |
| `app/components/MapProvider.tsx` | APIProvider with places library, stable module-level array | ✓ VERIFIED | Exists, single `<APIProvider>`, `LIBRARIES` is module-level `const`. |
| `app/components/SijaintiPicker.tsx` | Map + draggable AdvancedMarker + GPS center + reverse-geocode + autocomplete composition | ✓ VERIFIED | Exists, 149 lines (>60 min), default export, composes `Map`, `AdvancedMarker`, `useGPS`, `PlaceAutocompleteInput`, `reverseGeocodeCity`. |
| `app/components/PlaceAutocompleteInput.tsx` | Autocomplete wrapper emitting onPlaceSelected | ✓ VERIFIED (with deviation) | Exists, default export, emits `onPlaceSelected({lat,lng,formattedAddress})`. Implementation uses `AutocompleteSuggestion` + custom dropdown instead of `PlaceAutocompleteElement` web component — documented, user-approved deviation; contract unchanged. |
| `app/components/ClaimSearchForm.tsx` | create-step wiring of SijaintiPicker + lat/lng in submit body + pin-required guard | ✓ VERIFIED | Imports and renders `SijaintiPicker`; `handleCreate` sends `latitude`/`longitude`; guard + disabled button block submission without a pin. |
| `messages/fi.json` / `messages/en.json` | Location-step i18n keys | ✓ VERIFIED | All 6 keys present, valid JSON, no existing Business keys removed. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `tests/api/create-paikka.test.ts` | `app/api/business/create-paikka/route.ts` | imports POST, asserts insert payload | ✓ WIRED | Live test run: 5/5 pass. |
| `app/components/SijaintiPicker.tsx` | `app/components/PlaceAutocompleteInput.tsx` | renders + handles onPlaceSelected | ✓ WIRED | `<PlaceAutocompleteInput onPlaceSelected={handlePlaceSelected}>`; `handlePlaceSelected` updates address, autocompleteTarget, pin. |
| `app/components/SijaintiPicker.tsx` | `hooks/useGPS.ts` | `useGPS({autoRequest:true})` for default center | ✓ WIRED | `const { coords } = useGPS({ autoRequest: true })`; `defaultCenter = coords ?? TAMPERE_CENTER`. |
| `app/components/ClaimSearchForm.tsx` | `app/components/SijaintiPicker.tsx` | renders in create step, stores onChange values | ✓ WIRED | `<SijaintiPicker onChange={({lat,lng,address,city}) => {...}}>` sets `createLat/createLng/createOsoite/createKaupunki`. |
| `app/components/ClaimSearchForm.tsx` | `app/api/business/create-paikka/route.ts` | POST body includes latitude/longitude | ✓ WIRED | Confirmed in `handleCreate` fetch body. |
| `app/business/page.tsx` | `app/components/ClaimSearchForm.tsx` | renders the form into the live onboarding entry | ✓ WIRED | `ClaimSearchForm` imported/rendered in `app/business/page.tsx` (the only other consumer besides itself). |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| create-paikka route data-minimization + validation suite | `npx vitest run tests/api/create-paikka.test.ts` | 5/5 passed | ✓ PASS |
| Type-check across modified files | `npx tsc --noEmit -p tsconfig.json` | exits 0 | ✓ PASS |
| Single APIProvider in app | `grep -rn APIProvider app/` | exactly one declaration, in MapProvider.tsx | ✓ PASS |
| place_id never read in route | `grep place_id route.ts` | only an explanatory comment, no code read | ✓ PASS |
| i18n key parity (fi/en) | node parity check script | `ok`, all 6 keys present | ✓ PASS |
| Real-browser map/autocomplete/geocode interactivity | N/A — requires live browser + Google APIs | not independently re-run | ? SKIP → human verification |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| SIJAINTI-01 | 54-02, 54-03 | Käyttäjä voi sijoittaa paikan kartalle klikkaamalla onboardingissa | ✓ SATISFIED | Click-to-place + drag implemented in `SijaintiPicker.tsx`; reachable via `ClaimSearchForm` create step. Real-browser interaction confirmed only via SUMMARY claims + manual checkpoint — see human verification. |
| SIJAINTI-02 | 54-02, 54-03 | Käyttäjä voi hakea osoitetta autocomplete-kentästä; valinta asettaa pinnin ja zoomaa karttaa | ✓ SATISFIED (override) | `AutocompleteSuggestion`-based implementation (deviation, user-approved) satisfies the onPlaceSelected→pin-move→zoom contract; source-verified. |
| SIJAINTI-03 | 54-01, 54-02, 54-03 | Tallennetaan vain lat/lng + käyttäjän kirjoittama osoiteteksti — ei pysyvää Google Places -datan tallennusta | ✓ SATISFIED | Server-side allowlist (route.ts) + client-side field minimization (PlaceAutocompleteInput, SijaintiPicker) + 5/5 passing regression tests. Strongest-evidenced requirement in the phase — fully automatable and automated. |

**Note on REQUIREMENTS.md:** The requirement rows for SIJAINTI-01/02/03 in `.planning/REQUIREMENTS.md` still show unchecked checkboxes (`- [ ]`) and a "Pending" status column, while ROADMAP.md correctly shows Phase 54 as `[x]` completed with all three requirement IDs attributed. This is a stale-bookkeeping issue in REQUIREMENTS.md, not a gap in the implementation — flagged for cleanup but not blocking phase goal achievement.

### Anti-Patterns Found

None. Scanned `SijaintiPicker.tsx`, `PlaceAutocompleteInput.tsx`, `MapProvider.tsx`, `create-paikka/route.ts`, `ClaimSearchForm.tsx` for `TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER` and stub patterns — zero matches except one in-context `place_id` mention that is an explanatory code comment about the security guard, not a debt marker or an actual unsafe read.

Minor (info-level, not blocking): two i18n keys (`osoiteHakuPlaceholder`, `sijaintiVirhe`) are defined in both locale files per plan but not currently consumed by any component — `PlaceAutocompleteInput`'s search `<input>` has no placeholder text, and reverse-geocode failures silently clear the city field without surfacing the `sijaintiVirhe` message to the user. Behavior still degrades gracefully (empty, editable city field) as required by the plan; this is a polish gap, not a functional one.

### Human Verification Required

### 1. End-to-end map interactivity in a real browser

**Test:** In the live onboarding flow (`/business` → search → "create instead" / create step), exercise: GPS-or-Tampere map centering, click-to-place pin, drag-to-adjust pin, typing a partial address and selecting an autocomplete suggestion (pin moves + map zooms + address fills), reverse-geocoded city auto-fill, editable address/city fields, disabled Create button with no pin, and successful create-with-location end-to-end persisting only lat/lng + typed address (no `place_id`) to the `liikuntapaikat` table. Also re-confirm only one Google Maps JS script loads with no console double-load warning.

**Expected:** All steps behave exactly as described in `54-02-PLAN.md` Task 4 and `54-03-PLAN.md` Task 3 `how-to-verify` sections, and as already claimed in `54-02-SUMMARY.md`/`54-03-SUMMARY.md` Self-Check sections.

**Why human:** Google Maps JS SDK rendering, pointer/drag interaction, live Places Autocomplete suggestions, and live Geocoding API responses are explicitly documented as not unit-testable in jsdom/vitest (`54-VALIDATION.md` Manual-Only Verifications table). This verifier confirmed all source code, wiring, and the one automatable surface (the create-paikka route + its test suite) directly, but cannot independently re-exercise live Google Maps interactions. SUMMARY.md claims these were already manually verified during execution — including a documented first-attempt failure in 54-03 (stale dev server serving the pre-merge form) that was caught and resolved by a retest — which is reassuring but is exactly the kind of claim this verification process is required to treat as non-authoritative rather than accept at face value.

### Gaps Summary

No gaps. Every automatable surface (server-side SIJAINTI-03 enforcement, type-checking, i18n parity, single-APIProvider source check, code-level wiring across all five touched files) is verified directly against the current codebase, with live test execution (not relying on SUMMARY claims). The single phase-wide need is a human re-confirmation of the real-browser map/autocomplete/geocode flow, because that surface is inherently non-unit-testable and the only existing evidence for it is the executor's own SUMMARY narrative. One documented, user-approved deviation (SIJAINTI-02's autocomplete widget implementation) is recorded as an override rather than a gap, since the behavioral contract it must satisfy is unchanged and verified in source. A stale REQUIREMENTS.md checkbox/status mismatch was flagged as informational cleanup, not a functional gap.

---

_Verified: 2026-06-23T08:45:00Z_
_Verifier: Claude (gsd-verifier)_
