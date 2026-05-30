---
status: partial
phase: 20-navigaatio-korjaukset
source: [20-VERIFICATION.md]
started: 2026-05-30T14:00:00Z
updated: 2026-05-30T14:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Bottom sheet open animation
expected: Sheet initialises in closed pill state, then animates open via spring (~damping 28, stiffness 280, delay 0.1) without any user interaction
result: [pending]

### 2. Auto-open guard on /?id=X
expected: Load /?id=5 — sheet does NOT auto-open; map centres on venue coordinates instead
result: [pending]

### 3. Back-scroll restore
expected: Open search overlay, scroll down, tap a card → navigate to /paikat/ID → tap "Takaisin hakemistoon" → land at exact scroll position with filters restored and search overlay open
result: [pending]

### 4. "Näytä kartalla" uses venue coordinates
expected: Tap "Näytä kartalla" from any venue profile → map centres on venue's own lat/lng, not GPS location; bottom sheet stays closed
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
