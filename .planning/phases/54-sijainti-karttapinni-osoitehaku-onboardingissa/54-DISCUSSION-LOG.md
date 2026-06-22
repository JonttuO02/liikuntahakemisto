# Phase 54: Sijainti — karttapinni & osoitehaku onboardingissa - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-22
**Phase:** 54-sijainti-karttapinni-osoitehaku-onboardingissa
**Areas discussed:** Where this gets wired up, Map pin interaction & default view, Autocomplete widget & address text, City field source

---

## Where this gets wired up

| Option | Description | Selected |
|--------|-------------|----------|
| Standalone component, wire into ClaimSearchForm now | Build it as its own component and integrate it into ClaimSearchForm's existing 'create' branch right away, replacing the plain osoite text input. Phase 56 reuses the same component. | ✓ |
| Standalone component only, defer wiring to Phase 56 | Build and demo in isolation, don't touch ClaimSearchForm — Phase 56 does the integration. | |
| Replace osoite input directly, no separate component | Inline the map+autocomplete markup directly — fastest path but Phase 56 has to extract it later. | |

**User's choice:** Standalone component, wire into ClaimSearchForm now.
**Notes:** Avoids created venues getting NULL lat/lng while waiting for Phase 56; no throwaway work since Phase 56 reuses the component.

---

## Map pin interaction & default view

| Option | Description | Selected |
|--------|-------------|----------|
| Click-to-place + draggable | User clicks to drop a pin, can drag to fine-tune. `<AdvancedMarker draggable>` supports this natively. | ✓ |
| Click-to-place only | Clicking sets the pin; adjust by clicking a new spot. | |

**User's choice:** Click-to-place + draggable (recommended).

| Option | Description | Selected |
|--------|-------------|----------|
| Center on GPS location if available, else Tampere | Reuses existing client-side GPS pattern; falls back to Tampere. | ✓ |
| Always center on Tampere, no GPS request | Skips a permission prompt during onboarding. | |

**User's choice:** Center on GPS location if available, else Tampere.

---

## Autocomplete widget & address text

| Option | Description | Selected |
|--------|-------------|----------|
| google.maps.places.Autocomplete (legacy) | Classic widget, plain controlled input, soft-deprecated but stable. | |
| PlaceAutocompleteElement (newer web component) | Google's newer recommended replacement; needs glue code as a custom element. | ✓ |

**User's choice:** PlaceAutocompleteElement (newer web component).

| Option | Description | Selected |
|--------|-------------|----------|
| Editable text field, pre-filled from autocomplete | Selecting a suggestion sets the pin and pre-fills an editable address input; whatever's in the field at submit time is saved. | ✓ |
| Locked to the autocomplete selection | Address text fixed to exactly what Google returned, no editing. | |

**User's choice:** Editable text field, pre-filled from autocomplete (recommended).

---

## City field source

| Option | Description | Selected |
|--------|-------------|----------|
| Keep separate manual dropdown (initial framing) | Map sets lat/lng + address; kaupunki dropdown stays manual, untouched. | |
| Derive city from the pin automatically (initial framing) | Reverse-geocode the pin to auto-select the city; flagged risk of pulling in Places-family data. | (superseded — see below) |

**User's choice (round 1):** "Derive city from the pin automatically" — but raised via free-text: *"Is it allowed in google's terms to store the city name? Couldn't the city name be gotten from the lat/lng information?"*

**Claude's response:** Clarified that storing a derived city-name string (not raw Places content) is fine under Google's ToS — it's the same category of data the `kaupunki` field already stores. Confirmed yes, a city name can only come from reverse-geocoding the lat/lng (no other way), and flagged the irony of reintroducing a Google Places-family product (Geocoding API) right after Phase 53 removed a Google Places dependency. Asked whether to proceed with Google anyway or revert to manual.

**User's choice (round 2):** Free-text follow-up: *"Couldn't the placed pin's location from map just be transformed into lat/lng data and that transformed into address and city name etc.?"* — Claude clarified that lat/lng are just numbers; converting them to a place name requires querying *some* geocoding data source (a coordinate→boundary database), and the real decision is which provider does that lookup.

| Option | Description | Selected |
|--------|-------------|----------|
| Google Geocoding API (recommended) | Already covered by existing `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`/`MapProvider`, zero new setup. Extract locality string only, discard the rest. | ✓ |
| OpenStreetMap Nominatim (free, no Google) | Zero Google dependency, fits the milestone's decoupling spirit, but strict 1 req/sec rate limit + attribution requirement. | |
| Manual dropdown, no lookup at all | Simplest, zero new dependency, but no automation benefit. | |

**User's final choice:** Google Geocoding API (recommended — simplest).
**Notes:** Hard constraint carried into CONTEXT.md D-06 — only the locality string may be extracted and persisted; no `place_id`/`formatted_address`/address components/viewport from the Geocoding response may reach the database, preserving SIJAINTI-03.

---

## Claude's Discretion

- Exact glue-code approach for wrapping `PlaceAutocompleteElement` as a controlled-feeling input.
- Whether the reverse-geocode call runs client-side or via a thin server route.
- Exact component name/file location for the new location-picker component.

## Deferred Ideas

- **OpenStreetMap Nominatim as a Google-free geocoding alternative** — rejected for this phase (rate limit + attribution overhead) but noted as worth revisiting if reducing Google dependency further ever becomes a priority. Not scheduled to any phase.
