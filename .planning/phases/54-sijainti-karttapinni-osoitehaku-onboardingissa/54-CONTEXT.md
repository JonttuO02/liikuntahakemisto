# Phase 54: Sijainti — karttapinni & osoitehaku onboardingissa - Context

**Gathered:** 2026-06-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Give business users a way to set a venue's location during the create-from-scratch onboarding path: click/drag a pin on a map, or search an address via autocomplete (which moves the pin and zooms the map). Only the resulting lat/lng plus the user's own (editable) address text get persisted — no `place_id`, no raw Places/Geocoding response payload, ever written to the database.

Requirements: SIJAINTI-01, SIJAINTI-02, SIJAINTI-03.

This phase builds the location-picking capability itself. It does NOT rework the claim/create flow structure — that's Phase 56's job. It wires the new component into the existing `ClaimSearchForm` create branch as a drop-in improvement, on the explicit understanding that Phase 56 will reuse (not rebuild) it.

</domain>

<decisions>
## Implementation Decisions

### Where this gets wired up
- **D-01:** Build the location picker as a standalone, reusable component (not inlined markup). Wire it into `ClaimSearchForm.tsx`'s existing `create` step now, replacing the plain `osoite` text input — don't wait for Phase 56. Rationale: avoids NULL lat/lng on newly created venues in the meantime, and Phase 56 reuses the same component rather than building it from scratch.

### Map pin interaction & default view
- **D-02:** Click-to-place pin, and the placed pin must also be draggable for fine-tuning (`@vis.gl/react-google-maps`'s `<AdvancedMarker>` supports `draggable` natively).
- **D-03:** Before the user places a pin or searches, the map centers on the user's GPS location if available (client-side only, consistent with the existing consumer-map GPS pattern per CLAUDE.md — never via URL params), falling back to a Tampere center if permission is denied/unavailable.

### Autocomplete widget & address text
- **D-04:** Use `PlaceAutocompleteElement` (Google's newer recommended web-component widget), not the legacy `google.maps.places.Autocomplete`. It will need glue code to match the project's controlled-input styling conventions since it's a custom element, not a plain React-controlled `<input>`.
- **D-05:** Selecting an autocomplete suggestion sets the pin and pre-fills an editable text input with the formatted address — the user can still edit that text before saving. Whatever is in the text field at submit time is what gets persisted as the address (satisfies SIJAINTI-03's "user-typed address text" even when it originated from an autocomplete pick).

### City field source
- **D-06:** Replace the manual `kaupunki` `<select>` (Tampere/Helsinki/Turku) in the create branch with an automatic lookup: when the pin is placed/dragged, reverse-geocode the lat/lng via the **Google Geocoding API** (already covered by the existing `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`/`MapProvider` — no new key or billing setup) and extract ONLY the locality (city) string from the response.
  - **Hard constraint (ties to SIJAINTI-03):** discard everything else from the Geocoding response — no `place_id`, no `formatted_address`, no address components beyond the single locality string, no viewport/bounds. Only the city name string and the lat/lng ever reach the database.
  - Considered alternative: OpenStreetMap Nominatim (zero Google dependency, fits the milestone's Google-Places-decoupling spirit better) — rejected for this phase because of Nominatim's strict 1 req/sec rate limit and attribution/User-Agent requirements; revisit if Google dependency ever becomes a hard blocker.
  - Considered alternative: keep the manual dropdown — rejected because it's an extra manual step the auto-lookup removes for free, given the Geocoding call is already justified by D-04/D-05's autocomplete flow.

### Claude's Discretion
- Exact glue-code approach for wrapping `PlaceAutocompleteElement` as a controlled-feeling input (event listener bridging, ref management) is left to the planner/executor.
- Whether the Geocoding API call for reverse-geocoding happens client-side (browser, same `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`) or via a thin server route is an implementation detail — either is fine as long as only the locality string is extracted and nothing else is persisted.
- Exact component name/file location for the new location-picker component (e.g. `app/components/SijaintiPicker.tsx`) is left to the planner.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap / requirements
- `.planning/ROADMAP.md` §"Phase 54: Sijainti — karttapinni & osoitehaku onboardingissa" — exact goal and 4 success criteria (note criterion 4: must reuse the existing single `APIProvider`, no double-loading of Maps JS API).
- `.planning/REQUIREMENTS.md` — SIJAINTI-01, SIJAINTI-02, SIJAINTI-03.

### Existing code to reuse / integrate with
- `app/components/MapProvider.tsx` — the existing global `APIProvider` (wraps `app/layout.tsx`, already covers `/business/onboarding`). Do NOT add a second `APIProvider` — reuse this one. May need a `libraries` prop addition (e.g. `['places']`) for the autocomplete widget — verify this doesn't trigger a reload/double-load warning.
- `app/components/ClaimSearchForm.tsx` — the `create` step (lines ~396-474) currently has plain text inputs for `nimi`/`osoite` and a `kaupunki` `<select>` (Tampere/Helsinki/Turku, same options used in the search-step city filter). This is what D-01 wires the new component into; the `osoite` input and `kaupunki` select in the create branch are replaced per D-05/D-06. The search-step's own `kaupunki` filter dropdown (lines ~199-209) is unrelated and stays untouched.
- `app/business/onboarding/StepPaikka.tsx` — read-only venue summary shown after claim/create completes; not modified by this phase (it just displays whatever name/address ended up on the venue).
- `app/api/business/create-paikka/route.ts` — the insert path that currently only accepts `nimi`/`osoite`/`kaupunki` (no lat/lng at all). Must be extended to accept and persist `latitude`/`longitude` alongside the existing fields.
- `lib/types.ts` — confirms `liikuntapaikat.latitude`/`longitude` columns already exist (used by the consumer map); this phase populates them for business-created venues, it does not add new columns.

### Prior-phase context relevant here
- `.planning/phases/53-google-places-datan-ja-synkkauksen-poisto/53-CONTEXT.md` (Integration Points) — confirms `GOOGLE_PLACES_API_KEY` (server-only, used by the now-deleted sync route) is a *different* credential from `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (client-side, used by Maps JS/autocomplete/geocoding) — this phase only ever touches the latter.
- CLAUDE.md — "GPS: client-side only, never URL params — auto-requests on mount" — the default-view GPS behavior (D-03) must follow this existing pattern, not introduce a new one.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app/components/MapProvider.tsx` — global `APIProvider`, already wraps the whole app including `/business/onboarding`. Satisfies ROADMAP success criterion 4 (no double-load) automatically as long as no new `APIProvider` is added.
- `@vis.gl/react-google-maps`'s `<AdvancedMarker draggable>` — directly supports D-02's click + drag interaction.
- Existing client-side GPS pattern (used on the consumer homepage map) — reuse for D-03's default-view fallback logic; do not reinvent.

### Established Patterns
- Controlled-input styling constants (`INPUT_CLASS`, `SELECT_CLASS`, `CTA_CLASS`) defined at the top of `ClaimSearchForm.tsx` — the new address text input (D-05) should reuse `INPUT_CLASS` for visual consistency.
- `AnimatePresence mode="wait"` + opacity-only crossfade is the established step-transition pattern in `ClaimSearchForm.tsx` — the new location-picker UI should follow the same animation conventions as CLAUDE.md's Animation Principles section.

### Integration Points
- `app/api/business/create-paikka/route.ts` is the single write path for the create-from-scratch flow — extending its accepted body fields (lat/lng) is required, but the existing JWT-verification and `business_paikka_links` insert logic stays untouched.
- The reverse-geocode call (D-06) is a NEW integration point with the Google Geocoding API — distinct from the Maps JS SDK already loaded via `MapProvider`. Confirm whether it needs the Geocoding API enabled separately on the Google Cloud project tied to `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (a planning/research question, not decided here).

</code_context>

<specifics>
## Specific Ideas

No specific visual mockup was provided. Follow CLAUDE.md's existing glassmorphism design system (`.glass`, `.glass-btn`) and animation principles for the new step — no new visual language should be introduced.

</specifics>

<deferred>
## Deferred Ideas

- **OpenStreetMap Nominatim as a Google-free geocoding alternative** — considered during the City field source discussion (D-06) and explicitly rejected for this phase due to its 1 req/sec rate limit and attribution requirements, but flagged as worth revisiting if a future phase wants to reduce Google dependency further. Not scheduled.

### Reviewed Todos (not folded)
None — `todo.match-phase` returned 0 matches for Phase 54.

</deferred>

---

*Phase: 54-sijainti-karttapinni-osoitehaku-onboardingissa*
*Context gathered: 2026-06-22*
