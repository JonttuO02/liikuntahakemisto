---
status: complete
phase: 36-hallintapaneeli
source: 36-01-SUMMARY.md, 36-02-SUMMARY.md, 36-03-SUMMARY.md, 36-04-SUMMARY.md, 36-05-SUMMARY.md, 36-06-SUMMARY.md, 36-07-SUMMARY.md
started: 2026-06-11T00:00:00Z
updated: 2026-06-11T00:00:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

[testing complete]

## Tests

### 1. /business list — venues + statuses visible
expected: Navigate to /business (logged in as an approved business account). The page lists your venues. Each row shows the venue name and a status badge (e.g. "Hyväksytty", "Odottaa hyväksyntää", or "Hylätty"). No crashes, no blank screen.
result: pass

### 2. /business list — Esikatselu opens PreviewModal
expected: On the /business venue list, click the "Esikatselu" button on any row. A modal slides in showing PaikkaKortti, DiagonaalKortti, and PaikkaSheet previews. Clicking the backdrop or the close (×) button dismisses it.
result: pass

### 3. /business list — Muokkaa navigates to /business/[id]
expected: On the /business venue list, click "Muokkaa" on any row. The browser navigates to /business/[id] (the edit wizard for that venue). URL changes correctly.
result: pass
note: fixed — moved auth guard to client-side (EditWizardInner useEffect)

### 4. /business/[id] — 5-tab bar + Step 1 locked
expected: On the edit wizard page /business/[id], you see a 5-tab bar. Tab 1 (Perustiedot / Step 1) is visually locked — clicking it shows a locked notice and does not allow editing. Tabs 2–5 are accessible.
result: pass

### 5. Edit Step 2 (Mediat) — Tallenna saves media
expected: Switch to tab 2 (Mediat / photos). Existing photos appear as thumbnails. You can delete one (×) and upload a new one (drag or click). "Tallenna" button saves changes; a success message appears. Max-5 cap disables the upload zone when 5 photos are present.
result: pass
note: fixed — unified photo grid for both edit and onboarding modes

### 6. Edit Step 3 (Hinnasto) — Tallenna saves pricing
expected: Switch to tab 3 (Hinnasto). Edit a pricing field. Click "Tallenna". A success toast/confirmation appears and the data is persisted (reload to verify if desired).
result: pass

### 7. Edit Step 4 (Aukioloajat) — pre-fill + Tallenna
expected: Switch to tab 4 (Aukioloajat). Fields are pre-filled with the venue's existing opening hours. Edit one value and click "Tallenna". Success confirmation appears.
result: pass

### 8. Edit Step 5 (Yhteystiedot) — pre-fill + Tallenna
expected: Switch to tab 5 (Yhteystiedot). Fields are pre-filled with existing contact info. Edit one field and click "Tallenna". Success confirmation appears.
result: pass

### 9. EditWizardInner — Näytä esikatselu opens modal
expected: On any tab of the edit wizard (/business/[id]), there is a "Näytä esikatselu" button in the tab bar (right-aligned). Clicking it opens the PreviewModal showing PaikkaKortti + DiagonaalKortti + PaikkaSheet. Closing works via backdrop click or close button.
result: pass

## Summary

total: 9
passed: 9
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none yet]
