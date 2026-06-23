---
phase: 54-sijainti-karttapinni-osoitehaku-onboardingissa
plan: 02
subsystem: location-picker-ui
tags: [maps, places, autocomplete, checkpoint-resolved]
key-files:
  created:
    - app/components/SijaintiPicker.tsx
  modified:
    - app/components/MapProvider.tsx
    - app/components/PlaceAutocompleteInput.tsx
metrics:
  tasks: 4/4
---

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 3a31054 | Enable places library on existing APIProvider |
| 2 | ab1a608 | Create PlaceAutocompleteInput.tsx web-component wrapper (initial) |
| 3 | 1820e2a | Create SijaintiPicker.tsx (map, draggable pin, GPS center, reverse-geocode, autocomplete) |
| 4 (checkpoint fix) | 7c4343d | Replace crashing PlaceAutocompleteElement with AutocompleteSuggestion API |

## Deviations

**D-04 deviation (documented, user-approved):** The plan specified `PlaceAutocompleteElement` (Google's web-component widget) per D-04. Live browser verification found it threw `TypeError: Cannot read properties of undefined (reading 'keys')` on every construction attempt, reproducible identically on both the default and `beta` Maps JS channels. Root-caused via the `visgl/react-google-maps` maintainer's own GitHub guidance: the widget is alpha/beta-only and the maintainer recommends against using it, suggesting `AutocompleteSuggestion.fetchAutocompleteSuggestions()` instead. The crash only disappeared on `version="alpha"`, which Google explicitly disclaims as dev-only (visible banner, not shippable).

User chose to switch to the maintainer-recommended approach. `PlaceAutocompleteInput.tsx` was rewritten to use `useMapsLibrary('places').AutocompleteSuggestion.fetchAutocompleteSuggestions()` with a debounced controlled `<input>` and a custom dropdown list (glass-styled), instead of the web component. The `onPlaceSelected({ lat, lng, formattedAddress })` contract consumed by `SijaintiPicker.tsx` is unchanged, so no other files needed changes. `MapProvider.tsx` reverted to the stable channel (no `version` prop).

This means the UI-SPEC's "Google owns the shadow-DOM autocomplete dropdown chrome" exception no longer applies — the dropdown is now a normal React-owned list and should follow standard styling conventions in any future polish pass.

## Self-Check: PASSED

End-to-end browser verification (scratch test page, since removed) confirmed: single Maps load, GPS-or-Tampere center, click-to-place pin, drag-to-adjust pin, autocomplete suggestions appear while typing, selecting a suggestion moves+zooms the pin and fills the address field, city auto-fills from reverse-geocode, address/city fields remain freely editable.
