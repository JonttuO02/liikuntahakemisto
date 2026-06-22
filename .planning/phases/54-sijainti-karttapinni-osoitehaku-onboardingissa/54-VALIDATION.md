---
phase: 54
slug: sijainti-karttapinni-osoitehaku-onboardingissa
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-22
---

# Phase 54 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Map/autocomplete/geocoding interactions are real Google Maps JS SDK behavior — not practically unit-testable in jsdom/vitest — so this phase leans on one automated API-route test (SIJAINTI-03 data-minimization) plus documented manual-only UAT for the interactive map behaviors (SIJAINTI-01/02).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.7 |
| **Config file** | none found at root — uses `vitest run` directly per `package.json` `"test"` script |
| **Quick run command** | `npx vitest run tests/api/create-paikka.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~2-5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/api/create-paikka.test.ts`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 54-01-T? | 54-01 | 1 | SIJAINTI-01 | — | Clicking the map places a pin and sets lat/lng state | manual | manual UAT walkthrough | N/A | ⬜ pending |
| 54-01-T? | 54-01 | 1 | SIJAINTI-02 | — | Selecting an autocomplete suggestion sets pin and zooms map | manual | manual UAT walkthrough | N/A | ⬜ pending |
| 54-01-T? | 54-01 | 2 | SIJAINTI-03 | T-54-01 | Only `latitude`/`longitude` + user-typed `osoite` persist; `place_id`/raw Places/Geocoding fields are never written even if present in the request body | unit (API route) | `npx vitest run tests/api/create-paikka.test.ts -t "does not persist place_id"` | ❌ Wave 0 (new file) | ⬜ pending |
| 54-01-T? | 54-01 | 2 | SIJAINTI-03 | T-54-01 | Server rejects non-finite/out-of-range `latitude`/`longitude` (NaN/Infinity/out-of-bounds) rather than silently coercing | unit (API route) | `npx vitest run tests/api/create-paikka.test.ts -t "rejects invalid lat/lng"` | ❌ Wave 0 (new file) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*
*Task IDs are placeholders — the planner assigns concrete `{phase}-{plan}-{task}` IDs; this table is updated once plans exist.*

---

## Wave 0 Requirements

- [ ] `tests/api/create-paikka.test.ts` — new file, covers SIJAINTI-03 (lat/lng persisted; `place_id`/raw Places/Geocoding fields never persisted even if sent) and the lat/lng validation threat pattern from RESEARCH.md's Security Domain section; mirrors the existing `tests/api/update-paikka.test.ts` mock-builder pattern (mock `supabaseAdmin.auth.getUser`, mock chainable `.from('liikuntapaikat').insert(...)`)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Map click places a pin and sets lat/lng | SIJAINTI-01 | Google Maps JS SDK real tile rendering/click handling is not practically unit-testable in jsdom/vitest without low-value, brittle mocking | In onboarding create flow's Sijainti step, click anywhere on the map; confirm a pin appears at the clicked coordinates and the underlying lat/lng state updates |
| Pin is draggable for fine-tuning | SIJAINTI-01 | Same as above — `<AdvancedMarker draggable>` drag interaction requires real pointer events on the Maps canvas | Drag the placed pin to a new position; confirm lat/lng updates to the new position on drag-end |
| Autocomplete suggestion selection sets pin and zooms map | SIJAINTI-02 | `PlaceAutocompleteElement` is a real Google web component requiring a live Maps JS bootstrap and real Places predictions — cannot be meaningfully simulated in jsdom | Type a partial address in the autocomplete field, select a suggestion from the dropdown; confirm the pin moves to the selected location, the map zooms in, and the address text input pre-fills with the formatted address |
| GPS default map center with Tampere fallback | SIJAINTI-01 (supporting, D-03) | Browser `navigator.geolocation` behavior depends on real permission prompts/device location | Load the Sijainti step with location permission granted — map centers on user's GPS position; with permission denied/unavailable — map centers on Tampere |
| Reverse-geocoded city auto-fill on pin placement/drag | D-06 (supports SIJAINTI-03 city capture) | Real Google Geocoding API response shape/locality extraction not meaningfully mockable without re-implementing Google's service | Place or drag the pin into a few different cities (e.g. Tampere, Helsinki, Turku); confirm the city field auto-populates with just the locality name, no other address data leaks into any visible field |
| Map loads in Sijainti step without double-loading Maps JS API | Roadmap success criterion 4 | Requires observing real network/script-tag behavior in a browser, not a unit-testable assertion | Open browser dev tools Network tab on `/business/onboarding`'s Sijainti step; confirm only one Maps JS API script load and no console warning about multiple `APIProvider`/loader instances |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending — planner must confirm Per-Task Verification Map against actual assigned task IDs before this can flip to `nyquist_compliant: true`.
