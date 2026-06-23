---
phase: 54-sijainti-karttapinni-osoitehaku-onboardingissa
plan: 03
subsystem: claim-search-form-wiring
tags: [maps, places, checkpoint-resolved]
key-files:
  modified:
    - app/components/ClaimSearchForm.tsx
    - messages/fi.json
    - messages/en.json
metrics:
  tasks: 3/3
---

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | (wave 1 merge) | next-intl keys for the location step already present in fi.json/en.json |
| 2 | 0597768 | Wire SijaintiPicker into ClaimSearchForm create step + send lat/lng on submit |
| 3 (checkpoint) | af3ae3d | Worktree merge; human-verify checkpoint approved after live retest |

## Checkpoint Resolution

Initial verification attempt failed because the user's dev server was running from the main checkout (master), which already had Plan 54-01's stricter server-side validation merged but not yet this plan's frontend wiring — the old form (plain address input + city select) was still live and could never satisfy the now-mandatory `latitude`/`longitude` fields, producing a generic "Failed to create venue" error. Resolved by merging this plan's worktree into master so the running dev server picked up the change via hot-reload. Re-tested end-to-end and all steps passed.

## Self-Check: PASSED

End-to-end verification on the live app confirmed: create step shows SijaintiPicker (old osoite input + kaupunki select gone), Create button disabled without a pin, pin placement/autocomplete prefill address+city with both remaining editable, successful submission redirects correctly, and the resulting `liikuntapaikat` row persisted only lat/lng + typed address — no `place_id` or other Google Places fields (SIJAINTI-03 confirmed at the real database).
