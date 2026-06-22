# Stack Research

**Domain:** Decommissioning Google Places venue-data sync + adding Places Autocomplete/Geocoding location picker + extending existing Claude analysis prompt
**Researched:** 2026-06-22
**Confidence:** MEDIUM (official Google docs + GitHub maintainer discussion, cross-checked across multiple sources; no Context7 library exists for Google Maps Platform itself)

## Recommended Stack

### Core Technologies — no new npm packages

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `@vis.gl/react-google-maps` | `^1.8.3` (already installed) | Loads the `places` library via `useMapsLibrary('places')`; hosts the pin map for the new Sijainti step | Already the project's map binding (MAP-03 decision) — no reason to add a second maps wrapper just for Autocomplete |
| `google.maps.places.AutocompleteSuggestion` (loaded at runtime via the Maps JS API, **not an npm package**) | Places API "(New)" — current stable channel as of 2026 | Address-suggestion-as-you-type for the Sijainti step | `google.maps.places.Autocomplete` (the old widget) has been closed to new customers since March 1, 2025 and now only receives major-regression bug fixes — do not start a new integration on it. `PlaceAutocompleteElement` (the fully-managed web-component replacement) is still alpha/beta-channel only as of this research, not GA, so it is not the safe production default this milestone needs |
| `google.maps.Geocoder` (Maps JS API core library, already loaded by the existing `APIProvider`) | Current stable Geocoding API | Reverse-geocode a manually-dropped map pin (click-to-place) into a human-readable address string | The milestone needs both directions: type → suggestion → pin, AND click pin → address text. Autocomplete only covers the first; `Geocoder.geocode({ location })` is the standard, stable API for the second. No separate geocoding library is needed — this ships with the Maps JS API already loaded by `MapProvider` |
| `@anthropic-ai/sdk` | `^0.97.1` (already installed) | Extend the existing single Claude call in `lib/branding/analyzer.ts` to also return a sport-category guess | Additive prompt/schema change only — explicitly NOT a new AI integration, just a new field in the same JSON response contract |

### Supporting Libraries — none required

No new npm packages are needed for any of the three milestone items. This is the central finding: everything is either (a) deletion of existing code, (b) runtime-loaded Google Maps JS API surface already available through the existing `APIProvider`/`useMapsLibrary` pattern, or (c) a prompt/schema change to an existing Claude call.

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Supabase SQL migration (existing `supabase/migrations/`) | Drop Google-sourced rows from `liikuntapaikat` and remove the now-dead sync route | One forward migration, auditable and re-runnable in staging — not an ad-hoc one-off script |
| `@types/google.maps` | Type the new Autocomplete/Geocoder calls | `^3.64.1` is already installed; verify it exposes `AutocompleteSuggestion` types — if narrow gaps appear, use targeted `as` casts at the call site rather than adding a new types package |

## Installation

```bash
# No installation needed — every capability above is either already in package.json
# (@vis.gl/react-google-maps, @anthropic-ai/sdk, @types/google.maps) or is part of the
# Google Maps JavaScript API surface loaded at runtime by the existing MapProvider/APIProvider.

# Google Cloud Console side (not npm):
# - Ensure "Places API (New)" is enabled on the project (the legacy Places API alone is not
#   sufficient for AutocompleteSuggestion).
# - Ensure "Geocoding API" is enabled (a separate API from Places, separate billing line item).
# - NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (already used for the map) needs both new APIs added to its
#   API restrictions allowlist, alongside the existing Maps JavaScript API restriction.
```

## (a) Removing Google Places Sync — Safe Migration/Cleanup Approach

**What exists today** (verified by reading the code): `app/api/admin/sync-paikat/route.ts` performs a `GET` guarded by `ADMIN_SECRET`, runs Places `textsearch` + `details` calls, and `upsert`s rows into the `liikuntapaikat` table keyed on `place_id`. It already has a `business_managed` boolean that excludes business-onboarded venues from being overwritten by sync — this is the load-bearing flag for a safe cleanup.

**Recommended approach:**

1. **Delete the route file outright** (`app/api/admin/sync-paikat/route.ts`) rather than disabling it — no value in keeping a half-dead admin endpoint around; git history is the rollback path if ever needed.
2. **Data cleanup is a single Supabase migration, not an ad-hoc admin script**: `DELETE FROM liikuntapaikat WHERE business_managed = false AND place_id IS NOT NULL;` — i.e. delete rows that originated from Google sync and were never claimed by a business. Keep `business_managed = true` rows untouched — those are the v3.0 target state (business-entered data) and must survive the cleanup.
3. **Do not drop the `place_id` column in the same migration.** Per Google's Places API caching policy, `place_id` is the one field exempt from caching/storage restrictions and may be stored indefinitely — so even though the sync mechanism is being removed, there's no compliance urgency to scrub `place_id` from rows you keep. Drop it in a later, separate cleanup phase only once confirmed unused, to avoid coupling a data-deletion migration with a schema migration (smaller, more reversible migrations are safer).
4. **Cron/scheduled trigger**: check for any Vercel Cron config pointing at `/api/admin/sync-paikat` and remove the cron entry in the same change — an orphaned cron hitting a deleted route 404s silently every run.
5. **Env var cleanup**: `GOOGLE_PLACES_API_KEY` becomes unused once `sync-paikat` is deleted — confirm no other route still reads it (the onboarding/branding pipeline uses `ANTHROPIC_API_KEY` + `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, not the Places key) before removing it from Vercel env config.
6. **Sequencing**: ship the code deletion (route + cron) in the same phase as the data-deletion migration, but only run the migration in production after confirming in staging that no UI path still depends on aukioloajat-only fields that exclusively came from the now-deleted sync — the new onboarding flow already provides its own hours input (`StepAukioloajat`), so this should be a non-issue, but verify before the destructive `DELETE`.

## (b) Places Autocomplete + Geocoding for the Sijainti Step

### Why not `google.maps.places.Autocomplete` (the old widget)

As of March 1, 2025, `google.maps.places.Autocomplete` is closed to new customers (any project that hasn't already used it) and now only receives fixes for major regressions — not new features, not most bug classes. Starting a brand-new integration on it in 2026 means building on a widget Google has explicitly told developers to migrate away from. **Do not use it.**

### Why not `PlaceAutocompleteElement` either (yet)

`PlaceAutocompleteElement` — the fully-managed, Google-hosted web component intended as the long-term replacement — was still gated to the alpha/beta release channel as of this research, not GA/stable. Building production functionality on an alpha-channel API risks breaking changes outside your control, and `@vis.gl/react-google-maps` maintainers themselves point away from it for production code today.

### Recommended approach: `AutocompleteSuggestion` (Places API "New", stable) + a custom input

This is the path the `@vis.gl/react-google-maps` maintainers point to for production right now (confirmed via the library's own GitHub discussion thread):

1. Load the `places` library the same way the project already loads map libraries: `const places = useMapsLibrary('places')`.
2. On debounced text input, call `places.AutocompleteSuggestion.fetchAutocompleteSuggestions({ input, ... })` — a stable, GA method, not an alpha widget.
3. Render the returned `placePrediction` list in a custom `.glass` dropdown styled to match the existing design system (no Google-hosted UI shell to fight — actually an advantage over the widget approaches).
4. On selection: `const { place } = await suggestion.placePrediction.toPlace().fetchFields({ fields: ['location', 'formattedAddress'] })`, then read `place.location.lat()` / `place.location.lng()`.
5. Use the returned `location` to move the map's `AdvancedMarker` (already the project's pin component per CLAUDE.md/MAP-08) and call `map.panTo()` / `map.setZoom()` to satisfy "selecting a suggestion zooms the map."
6. For the **reverse direction** (user clicks the map to drop a pin manually, no typing): attach a `click` listener to the `Map` component, take the clicked `LatLng`, and call `new google.maps.Geocoder().geocode({ location: latLng })` to get a `formatted_address` to populate the editable address text field. This is the Geocoding API — a separate, stable, long-standing API, unaffected by the Autocomplete deprecation.
7. **Persist only**: `lat`, `lng` (from either path), and the address **string** as currently displayed/edited in the text field (whether it came from an Autocomplete selection, a Geocoder reverse-lookup, or a manual edit). Never persist the raw `AutocompleteSuggestion`/`Place` response object, the predictions list, or any other Places fields from this flow into Supabase.

### Compliance note — refines, not contradicts, the milestone's stated assumption

The milestone brief states: "store only lat/lng + the user-typed address string... to stay compliant." Research confirms this is **directionally correct, but the legal basis is narrower than a blanket "ephemeral use is fine" reading** — worth stating precisely so it isn't over-generalized later:

- Google's Places API policy default is **no pre-fetching, caching, or storage** of Places content.
- One specific, narrow exception applies: when an end user uses Autocomplete to type a street address that "would have been completely and accurately provided by that end user without Autocomplete," **the selected address itself** becomes exempt from the caching restriction — but "solely for that end user's specific transaction." The exception does **not** extend to the list of suggestions, to other Place fields (ratings, hours, photos, types, etc.), or beyond the address text itself.
- `place_id` has its own, separate, indefinite-storage exemption regardless of how it was obtained.
- **Practical takeaway**: storing the final selected/edited address text + derived lat/lng for the business's own venue record is consistent with the Autocomplete exemption (it is the end user's own selected address, stored for their own venue, not redistributed as Places content to other users). The milestone's choice to store nothing else from the Places response (no `place_id`, no ratings/types/photos) is the right conservative interpretation and should not be loosened in a future milestone without re-checking the current terms.
- This reasoning does **not** extend to a hypothetical future feature like "cache nearby Places search results for 24h to cut API costs" — that would hit the general no-caching default and needs separate review if it ever comes up.

### Cost/quota consideration (architecture-relevant, not just compliance)

Autocomplete billing is per-session if an `AutocompleteSessionToken` is threaded correctly (bundles all keystroke-level autocomplete requests + the final `fetchFields` call into one session-priced unit instead of per-character billing). Create one `AutocompleteSessionToken` instance per "search attempt," reuse it across the debounced input lifecycle and the final `fetchFields` call, and only create a new token when the user starts a fresh search (after a selection, or after clearing the field). Skipping this is the most common Places Autocomplete cost mistake, and it has no functional symptom — only a billing one — so it is easy to miss in testing.

## (c) Extending the Claude Analysis Call with Sport-Category Classification

**Existing pattern** (`lib/branding/analyzer.ts` + `lib/branding/prompt.ts`): one `anthropic.messages.create()` call per analysis run, `model: 'claude-haiku-4-5-20251001'`, image content blocks (screenshot + logo candidates) followed by one text block containing the prompt + concatenated labeled-page HTML. Response is parsed as JSON (with markdown-fence stripping) into a typed `BrandingAnalysisResult`, with defensive per-field validation (e.g. `VALID_LOGO_TYPES.includes(...)`, hex-regex test on colors) before persisting.

**Recommended approach — purely additive, no new AI call:**

1. Add a `category` field to the same JSON response schema the prompt already requests — e.g. `{ "category": "padel", "category_confidence": "high" | "medium" | "low" }` — alongside the existing `logos`, `colors`, `prices`, `opening_hours`, `website_url` keys.
2. Inject the valid category set into the prompt **dynamically from `lib/lajit.ts`**, e.g. `Object.keys(lajiKonfig).join(', ')` interpolated into `BRANDING_ANALYSIS_PROMPT`, rather than hardcoding category names into the prompt string. This guarantees the prompt and the runtime category list (already the single source of truth per CLAUDE.md) never drift — any future sport added to `lajit.ts` automatically becomes a valid Claude output with zero prompt edit.
3. Validate Claude's `category` output the same defensive way `logos`/`colors` are already validated in `analyzeWithClaude`: check the returned string is a member of `Object.keys(lajiKonfig)`; default to `'liikunta'` (the existing generic fallback category already present in `lajiKonfig`) if missing/malformed/unrecognized. This follows the file's existing validation idiom exactly rather than introducing a new style.
4. Surface the field through the same `BrandingAnalysisResult` interface (add `category: string`, optionally `category_confidence`) and the same GET route response in `app/api/business/analyze-website/route.ts` (extend the `.select()` projection) — add `category` as a new nullable column on `business_branding` via an additive migration, mirroring how `colors`/`logo_type` are already stored and exposed.
5. Onboarding UI: per the milestone, the user "confirms/changes" the suggestion — reuse the existing pre-fill-then-edit pattern already used for prices/hours (`StepHinnasto`/`StepAukioloajat` pre-filled from `raw_analysis`, user edits before submit), not a new UI paradigm. The category picker should be sourced from `LAJIT_FILTTERI`/`lajiKonfig` (already the single source of truth), pre-selected to Claude's guess.
6. **Do not add a second Claude call** ("classify category" as its own request). The token cost of one extra JSON key on an existing response is negligible versus a second `messages.create()` round-trip, and a second call would break the explicit "one Claude API call" architecture decision already recorded in PROJECT.md ("Yksi Claude API -kutsu analysoi logo-kandidaatit (vision) + HTML-tekstisisällön"), which the milestone context explicitly says to preserve.

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|--------------------------|
| `AutocompleteSuggestion` (Places API New, stable) | `PlaceAutocompleteElement` (web component) | Only once Google promotes it out of alpha/beta to GA — re-check at that point since it removes the need to build a custom dropdown UI; not safe to build on today |
| `AutocompleteSuggestion` + custom `.glass` dropdown | Third-party address-autocomplete React libraries (e.g. `react-google-autocomplete`, `use-places-autocomplete`) | Never for this project — most current releases of these wrappers are themselves built on the deprecated `Autocomplete`/`AutocompleteService` classes underneath, so adopting one just hides the same deprecated dependency one layer down |
| `google.maps.Geocoder` for reverse-geocoding pin clicks | A geocoding npm package (e.g. `node-geocoder`, `react-geocode`) | Only if a provider-agnostic geocoding abstraction were needed (e.g. swappable to Mapbox/OSM later) — not justified here; the project is already 100% Google Maps Platform and the JS API's `Geocoder` is already loaded for free |
| One additive field in the existing Claude prompt/schema | A second, separate Claude call dedicated to category classification | Only if category classification needed a different model/temperature/image input than the branding analysis — it doesn't; the same HTML text input already gives sufficient signal |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|--------------|
| `google.maps.places.Autocomplete` (legacy widget) | Closed to new customers since March 1, 2025; receives only major-regression fixes, not active development | `places.AutocompleteSuggestion.fetchAutocompleteSuggestions()` |
| `google.maps.places.AutocompleteService` / `PlacesService` (legacy services) | Same deprecation track as the widget — explicitly named in Google's own migration guide as the classes to remove | `AutocompleteSuggestion` + `Place.fetchFields()` |
| `PlaceAutocompleteElement` in production right now | Alpha/beta channel only — not GA, breaking-change risk | Custom input + `AutocompleteSuggestion`; revisit when GA |
| A second Claude API call for category classification | Breaks the explicit "one Claude call" architecture decision in PROJECT.md; doubles per-onboarding AI cost and latency for no real benefit | Additive JSON field in the existing `analyzeWithClaude` call/prompt |
| Caching/storing raw Places API response content (predictions list, ratings, types, photos) anywhere in Supabase | Violates Google Maps Platform Terms' default no-cache rule; only the end-user-selected address text and `place_id` carry exemptions | Store only the final lat/lng + edited address string, as the milestone already specifies |
| A new geocoding/address npm package | Unnecessary dependency — Geocoding API ships with the Maps JS API already loaded by `MapProvider` | `new google.maps.Geocoder()` |

## Stack Patterns by Variant

**If the onboarding Sijainti step needs to work without the user ever typing (pure click-to-place):**
- Use `Geocoder.geocode({ location })` alone, skip Autocomplete entirely for that interaction path.
- Because Autocomplete only assists *typed* input — a pure map-click flow has no text to autocomplete, it only needs reverse geocoding to produce a human-readable string for the editable address field.

**If Autocomplete suggestions need to be biased toward Finland / the project's three cities (Tampere, Helsinki, Turku):**
- Pass `includedRegionCodes: ['fi']` (the new-API replacement for the legacy `componentRestrictions.country`) and/or a `locationBias`/`origin` centered on the relevant city coordinates (already available from `SUOMI_KAUPUNGIT` in `lib/constants`) in the `fetchAutocompleteSuggestions` request.
- Because unscoped global autocomplete will surface irrelevant international results for short Finnish street-name inputs, hurting the suggestion UX.

**If a future milestone needs the Autocomplete dropdown's accessibility/keyboard nav to exactly match Google's reference implementation:**
- Re-evaluate `PlaceAutocompleteElement` once GA, since the custom dropdown built today is intentionally minimal (matching `.glass` styling) and not a full ARIA-combobox reimplementation.
- Because building full accessibility semantics by hand for a custom dropdown is real, ongoing effort that Google's hosted element solves once it's stable.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|------------------|-------|
| `@vis.gl/react-google-maps@1.8.3` | `places` library loaded via `useMapsLibrary('places')`, exposing `AutocompleteSuggestion` | Confirmed pattern from the library's own maintainer discussion (GitHub Discussion #707) — no version bump needed for this capability |
| `@types/google.maps@3.64.1` | `google.maps.places.AutocompleteSuggestion`, `google.maps.Geocoder` | Should cover both; if `AutocompleteSuggestion` types are missing/incomplete in this exact version, use narrow `as` casts at the call site rather than pulling in a newer major or a duplicate types package |
| Places API (New) + Geocoding API (Cloud Console) | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (existing key, client-side, HTTP-referrer-restricted per CLAUDE.md env table) | Both new APIs must be explicitly enabled on the GCP project and added to the existing key's API restriction allowlist — the key itself doesn't need to change, only its restriction list |
| `@anthropic-ai/sdk@0.97.1` | `claude-haiku-4-5-20251001` (existing pinned model in `analyzer.ts`) | No SDK or model version change needed for the additive category field — same `messages.create()` call, same JSON-parsing path |

## Sources

- [Migrate to the new Place Autocomplete (Google Developers)](https://developers.google.com/maps/documentation/javascript/legacy/places-migration-autocomplete) — MEDIUM confidence, official docs, confirms March 1 2025 closure of legacy `Autocomplete` to new customers and the migration path to `AutocompleteSuggestion`/`PlaceAutocompleteElement`
- [visgl/react-google-maps GitHub Issue #736 — "As of March 1st, 2025, google.maps.places.Autocomplete is not available to new customers"](https://github.com/visgl/react-google-maps/issues/736) — MEDIUM confidence, maintainer-acknowledged issue confirming the deprecation's practical impact on this exact library
- [visgl/react-google-maps GitHub Discussion #707 — Autocomplete example with Places API (new)](https://github.com/visgl/react-google-maps/discussions/707) — MEDIUM confidence, maintainer-endorsed production pattern using `AutocompleteSuggestion` + `toPlace().fetchFields()`, explicitly recommends against `PlaceAutocompleteElement` for production due to alpha/beta channel status
- [Policies and attributions for Places API (Google Developers)](https://developers.google.com/maps/documentation/places/web-service/policies) — MEDIUM confidence, official policy page; confirms general no-cache rule, `place_id` indefinite-storage exemption, and the narrow end-user-selected-address exemption for Autocomplete
- [Policies and attributions for Geocoding API (Google Developers)](https://developers.google.com/maps/documentation/geocoding/policies) — MEDIUM confidence, official policy page; confirms Geocoding API results are subject to the same general no-permanent-storage default, with the same `place_id` exemption
- [Google Maps Platform Service Specific Terms (Cloud Google)](https://cloud.google.com/maps-platform/terms/maps-service-terms) — MEDIUM confidence, primary legal source for the end-user-selected-address exemption language; corroborated by the policies pages above and by independent web search results repeating the same exemption wording
- Direct codebase reads of `app/api/admin/sync-paikat/route.ts`, `app/api/business/analyze-website/route.ts`, `lib/branding/analyzer.ts`, `lib/lajit.ts`, `app/components/MapProvider.tsx`, `app/business/onboarding/StepPaikka.tsx` — HIGH confidence (primary source, current repository state)

---
*Stack research for: Liikuntahakemisto v3.0 — Google Places decommissioning + business location picker + AI category classification*
*Researched: 2026-06-22*
