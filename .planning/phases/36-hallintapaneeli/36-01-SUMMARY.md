---
phase: 36
plan: "01"
subsystem: i18n
tags: [i18n, business, hallintapaneeli, translation-keys]
dependency_graph:
  requires: []
  provides: [Business.editTitle, Business.editStep2Label, Business.editStep3Label, Business.editStep4Label, Business.editStep5Label, Business.saveCta, Business.saving, Business.saveSuccess, Business.previewCta, Business.previewClose, Business.editBackToList, Business.editLockedStep1, Business.muokkaaCta, Business.esikatseluCta, Business.photoDeleteAlt, Business.photoMaxReached]
  affects: [messages/fi.json, messages/en.json]
tech_stack:
  added: []
  patterns: [next-intl Business namespace extension]
key_files:
  created: []
  modified:
    - messages/fi.json
    - messages/en.json
decisions:
  - Added 16 keys (including "saving") to Business namespace in both fi.json and en.json, inserted after reapplyCta
metrics:
  duration: "2 minutes"
  completed: "2026-06-10T20:24:53Z"
  tasks_completed: 2
  files_changed: 2
---

# Phase 36 Plan 01: i18n — hallintapaneeli edit keys Summary

**One-liner:** Added 16 Business namespace translation keys for the edit wizard, preview modal, and venue list buttons in both fi.json and en.json.

## What Was Built

Extended the `Business` i18n namespace in both `messages/fi.json` and `messages/en.json` by appending 16 new keys after the existing `reapplyCta` key. These keys support:

- Edit wizard navigation and titles (`editTitle`, `editStep2Label`–`editStep5Label`, `editBackToList`)
- Save/persist actions (`saveCta`, `saving`, `saveSuccess`)
- Preview modal controls (`previewCta`, `previewClose`)
- Step 1 locked-state notice (`editLockedStep1`)
- Venue list action buttons (`muokkaaCta`, `esikatseluCta`)
- Photo management feedback (`photoDeleteAlt`, `photoMaxReached`)

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Add 16 edit keys to fi.json Business namespace | efffdd8 | messages/fi.json |
| 2 | Add 16 matching English keys to en.json Business namespace | efffdd8 | messages/en.json |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- `messages/fi.json` — 16 keys present after `reapplyCta`, valid JSON structure confirmed by inspection
- `messages/en.json` — 16 keys present after `reapplyCta`, valid JSON structure confirmed by inspection
- Commit efffdd8 exists: confirmed
- No existing keys modified or removed
