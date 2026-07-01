---
status: complete
phase: 63-business-dashboardin-preview-n-kymien-uudistus
source: [63-VERIFICATION.md]
started: 2026-07-01T18:35:00Z
updated: 2026-07-01T19:25:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Dashboard card visual correctness (status pill + controls-panel shade)
expected: Status pill text/color matches claim_status; controls panel background is getPanelShade(brandColor), clearly distinguishable from the left panel's brandColor background; falls back to plain glass panel when brandColor is unset.
result: issue
reported: "Works almost fine, but some things to fix still. The card should always be sliced into two sides even if the brand colout hasnt been set. So when its not set the background could be maybe the same gray that the image placeholder had, just without the camera icon. With approved status there appears a new button on the row but it doesnt do anything when clicking it, what button is that? I tried to test how the brandcolour works but when trying to edit one of the venues drafts there was a bug in the analyzing. I waited for a long time but it never finished the analyze. Also at this point I think it might be good idea to make atleast the business side also desktop compatible. Now on wider screen the cards are being streched, They should always keep the same right width and on desktop they could be organized into rows also."
severity: blocker

### 2. Icon-button click-through + inert left panel
expected: Icon buttons trigger their respective action (open PreviewModal / navigate to edit or onboarding / copy link to clipboard / open RejectionReasonPopup); clicking anywhere on the left info panel does nothing (D-01/D-10 — permanently visible controls, no hover/tap reveal, no click-catcher).
result: pass

### 3. RejectionReasonPopup interaction
expected: Popup opens with the correct venue's rejection_reason text (escaped, no HTML injection); backdrop click, Escape key, and the close (X) button all dismiss without navigating; 'Korjaa tiedot' CTA navigates once to the right paikka_id. Note WR-06 (63-REVIEW.md): the close button's aria-label reads "Sulje esikatselu" ("Close preview") — a copy-paste leftover, worth confirming/fixing.
result: pass

### 4. Cross-surface preview inertness click-audit
expected: PreviewModal, LivePreviewPane, and onboarding preview surfaces are purely visual — no navigation, no fetch calls, regardless of what is clicked (CalloutCard, DiagonaalKortti, PaikkaSheet's image carousel, any buttons).
result: pass

### 5. End-to-end auto-resubmit UX
expected: Saving any section (e.g. hinnasto) of a previously-rejected venue flips its status from Hylätty to Odottaa hyväksyntää (pending) immediately after the save succeeds, with no separate 'Hae uudelleen' step.
result: pass

## Summary

total: 5
passed: 4
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "Controls panel is always visibly two-sided (split layout), even when brandColor is unset — falls back to the same neutral gray as the image placeholder (minus the camera icon) instead of a plain glass panel."
  status: failed
  reason: "User reported: the card should always be sliced into two sides even if the brand colour hasn't been set. When it's not set the background could be the same gray that the image placeholder had, just without the camera icon."
  severity: cosmetic
  test: 1
  artifacts: []
  missing: []

- truth: "Every dashboard icon button performs its designated action when clicked."
  status: failed
  reason: "User reported: with approved status there appears a new button on the row but it doesn't do anything when clicking it — user could not identify what the button is for."
  severity: major
  test: 1
  artifacts: []
  missing: []

- truth: "Editing a draft venue and re-triggering brand-color analysis completes in reasonable time."
  status: failed
  reason: "User reported: tried to test how the brandcolour works but when trying to edit one of the venue's drafts there was a bug in the analyzing — waited a long time but it never finished the analyze."
  severity: blocker
  test: 1
  artifacts: []
  missing: []

- truth: "Business dashboard is usable on desktop/wide viewports — cards keep a fixed width and lay out in a multi-column grid instead of stretching full-width."
  status: failed
  reason: "User reported: on wider screen the cards are being stretched; they should always keep the same width and on desktop could be organized into rows."
  severity: minor
  test: 1
  artifacts: []
  missing: []
