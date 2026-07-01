---
status: testing
phase: 63-business-dashboardin-preview-n-kymien-uudistus
source: [63-VERIFICATION.md]
started: 2026-07-01T18:35:00Z
updated: 2026-07-01T18:35:00Z
---

## Current Test

number: 1
name: Dashboard card visual correctness (status pill + controls-panel shade)
expected: |
  Open /business as a business account with an approved, a pending, a rejected, and a 'kesken' (draft) venue.
  Each DiagonaalKortti dashboard card shows the correct status pill (Kesken/Odottaa hyväksyntää/Hyväksytty/Hylätty)
  in the image-side bottom corner. Controls-panel background is a visibly different shade from the left
  brand-colored panel when the venue has a brandColor set (getPanelShade(brandColor)), and falls back to a
  plain glass panel when brandColor is unset.
awaiting: user response

## Tests

### 1. Dashboard card visual correctness (status pill + controls-panel shade)
expected: Status pill text/color matches claim_status; controls panel background is getPanelShade(brandColor), clearly distinguishable from the left panel's brandColor background; falls back to plain glass panel when brandColor is unset.
result: [pending]

### 2. Icon-button click-through + inert left panel
expected: Icon buttons trigger their respective action (open PreviewModal / navigate to edit or onboarding / copy link to clipboard / open RejectionReasonPopup); clicking anywhere on the left info panel does nothing (D-01/D-10 — permanently visible controls, no hover/tap reveal, no click-catcher).
result: [pending]

### 3. RejectionReasonPopup interaction
expected: Popup opens with the correct venue's rejection_reason text (escaped, no HTML injection); backdrop click, Escape key, and the close (X) button all dismiss without navigating; 'Korjaa tiedot' CTA navigates once to the right paikka_id. Note WR-06 (63-REVIEW.md): the close button's aria-label reads "Sulje esikatselu" ("Close preview") — a copy-paste leftover, worth confirming/fixing.
result: [pending]

### 4. Cross-surface preview inertness click-audit
expected: PreviewModal, LivePreviewPane, and onboarding preview surfaces are purely visual — no navigation, no fetch calls, regardless of what is clicked (CalloutCard, DiagonaalKortti, PaikkaSheet's image carousel, any buttons).
result: [pending]

### 5. End-to-end auto-resubmit UX
expected: Saving any section (e.g. hinnasto) of a previously-rejected venue flips its status from Hylätty to Odottaa hyväksyntää (pending) immediately after the save succeeds, with no separate 'Hae uudelleen' step.
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
