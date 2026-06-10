---
status: resolved
phase: 34-onboarding-velhou
source:
  - 34-01-SUMMARY.md
  - 34-02-SUMMARY.md
  - 34-03-SUMMARY.md
  - 34-04-SUMMARY.md
  - 34-05-SUMMARY.md
  - 34-06-SUMMARY.md
  - 34-07-SUMMARY.md
  - 34-08-SUMMARY.md
  - 34-09-SUMMARY.md
  - 34-10-SUMMARY.md
started: "2026-06-10T00:00:00Z"
updated: "2026-06-10T18:00:00Z"
---

## Current Test

[testing complete]

## Tests

### 1. Onboarding gate — first login redirects to wizard
expected: Business user with onboarding_completed=false visiting /business is redirected to /business/onboarding automatically. Cannot skip to /business panel until onboarding is done.
result: pass

### 2. Progress bar renders — 6 steps
expected: At /business/onboarding the ProgressBar shows 6 step circles. Step 1 circle is filled black (active). Steps 2-6 are unfilled (future). Step labels appear below circles.
result: pass

### 3. Step 1 — Paikka shows linked venue
expected: Step 1 shows the name and address of the claimed/created venue (pre-filled from claim). A "Seuraava" (Next) button is present. The Back button is absent (it's step 1).
result: pass

### 4. Step 2 — Mediat upload
expected: Step 2 shows a file upload area (UploadDropZone). Selecting 1–5 images shows an upload progress bar while uploading to Supabase Storage. After upload completes, thumbnails or filenames appear. "Seuraava" becomes enabled.
result: issue
reported: "each drop area only shows one thumbnail, the recently uploaded photo. So I dont know if it takes only one photo or takes multiple but only shows the recent one. Also theres no x-button in thumbnails so they cannot be deleted after uploading."
severity: major

### 5. Step 3 — Hinnasto price entry
expected: Step 3 shows a price table. You can add a row with category (e.g. "Kertakäynti") and price. "Seuraava" is disabled until at least 1 price row exists. Adding a row enables it.
result: pass

### 6. Step 4 — Aukioloajat hours
expected: Step 4 shows opening hours fields. If Google Places data was available it's pre-filled. You can edit or enter hours manually. "Seuraava" advances to step 5.
result: pass

### 7. Step 5 — Yhteystiedot contact form
expected: Step 5 shows fields for phone, email, website, and description. The description textarea shows a character counter (e.g. "0/300") that updates as you type. At 300 characters the counter turns red. "Seuraava" saves and advances.
result: issue
reported: "works well but instead of characters counter theres text: Business.contactDescCount under the textfield and it turns red when character limit is hit."
severity: major

### 8. Step 6 — Esikatselu shows all 3 preview formats
expected: Step 6 shows three preview sections: (1) "LISTAKORTTI" with a PaikkaKortti card, (2) "DIAGONAALIKORTTI" with a DiagonaalKortti card, (3) "PROFIILISIVU" with a PaikkaSheet rendered inline (not as an overlay). All three use the data you entered. A "Lähetä hyväksyttäväksi" submit button is present.
result: issue
reported: "waited more than 5 minutes for those previews but its still loading — never completes"
severity: blocker

### 9. Submit → redirect to /business
expected: Clicking "Lähetä hyväksyttäväksi" on step 6 sends the application. After success you're redirected to /business (the business panel). No error is shown.
result: blocked
blocked_by: prior-phase
reason: "Step 6 preview never finishes loading — submit button unreachable"

### 10. Back navigation works
expected: From any step 2–6, clicking the back button (← Edellinen or similar) goes to the previous step. The ProgressBar updates to show the new current step. Data entered is preserved (not cleared).
result: issue
reported: "when advancing in the onboarding and using the previous-button the previous step and site it enters doesnt show the previously entered contents. So I dont know if its still saved and it only doesnt show them or is it completely lost."
severity: major

## Summary

total: 10
passed: 5
issues: 4
pending: 0
skipped: 0
blocked: 1
skipped: 0

## Gaps

- truth: "Upload area shows all uploaded files and allows deleting individual uploads"
  status: resolved
  reason: "User reported: only the most recent thumbnail is shown per drop zone (unclear if multiple accepted); no delete (X) button on thumbnails"
  severity: major
  test: 4
  root_cause: "UploadDropZone.tsx has no X/delete button in its JSX and no onRemove prop. Thumbnail clicks lack stopPropagation so clicking a thumbnail re-triggers the file picker, replacing the visible selection."
  artifacts:
    - path: "app/business/onboarding/UploadDropZone.tsx"
      issue: "No onRemove prop, no X button rendered on thumbnails (lines 110–123), thumbnails wrapped inside clickable drop zone with no stopPropagation"
    - path: "app/business/onboarding/StepMediat.tsx"
      issue: "No removePhotoFile handler exists, none passed to UploadDropZone"
  missing:
    - "Add onRemove prop to UploadDropZone and render absolute X button on each thumbnail with stopPropagation"
    - "Add removePhotoFile handler in StepMediat, pass as onRemove to photos zone"
  debug_session: ""

- truth: "Character counter below description textarea shows e.g. '0/300' and updates as user types"
  status: resolved
  reason: "User reported: text 'Business.contactDescCount' shows instead of the counter; it turns red at limit but the translation key is raw/unresolved"
  severity: major
  test: 7
  root_cause: "StepYhteystiedot.tsx line 138 calls t('contactDescCount').replace('{n}', String(descCount)) — next-intl v4 uses ICU interpolation and returns the raw key fallback when no values object is passed to t()."
  artifacts:
    - path: "app/business/onboarding/StepYhteystiedot.tsx"
      issue: "Line 138: t('contactDescCount').replace('{n}', ...) — should be t('contactDescCount', { n: descCount })"
  missing:
    - "Replace .replace() call with correct next-intl interpolation: t('contactDescCount', { n: descCount })"
  debug_session: ""

- truth: "Step 6 preview renders all 3 card formats immediately (or within a few seconds)"
  status: resolved
  reason: "User reported: waited more than 5 minutes for those previews but still loading — never completes"
  severity: blocker
  test: 8
  root_cause: "paikkaInfo stays null permanently because the business_paikka_links lookup fails/returns empty and draft.paikka_id is never used as fallback. StepEsikatselu shows an infinite spinner with no timeout or error path when paikkaInfo is null."
  artifacts:
    - path: "app/business/onboarding/OnboardingWizardInner.tsx"
      issue: "Lines 63–100: resolvedPaikkaId from business_paikka_links lookup; if null, paikkaInfo is never fetched. draft.paikka_id is never used as fallback."
    - path: "app/business/onboarding/StepEsikatselu.tsx"
      issue: "Lines 31–32 and 81–84: draftAsPaikka null guard shows infinite spinner with no timeout or error state"
  missing:
    - "In loadDraft(): use draft.paikka_id as fallback — resolvedPaikkaId = resolvedPaikkaId ?? existingDraft.paikka_id"
    - "In StepEsikatselu: replace infinite spinner with error state after timeout or when paikkaInfo missing"
  debug_session: ""

- truth: "Back navigation preserves previously entered data in each step"
  status: resolved
  reason: "User reported: going back does not show previously entered contents — unclear if data is lost or just not rendered"
  severity: major
  test: 10
  root_cause: "All step components (StepMediat, StepHinnasto, StepAukioloajat, StepYhteystiedot) initialize exclusively from empty useState defaults. draft is loaded in OnboardingWizardInner but never passed as props to steps 2–5. AnimatePresence key={step} destroys and remounts each step on navigation, wiping local state."
  artifacts:
    - path: "app/business/onboarding/OnboardingWizardInner.tsx"
      issue: "draft loaded from Supabase but step-specific slices (hinnasto, yhteystiedot, media_urls, aukioloajat) never forwarded as props to step components 2–5"
    - path: "app/business/onboarding/StepHinnasto.tsx"
      issue: "useState initialized with empty defaults, no initialValues prop"
    - path: "app/business/onboarding/StepYhteystiedot.tsx"
      issue: "useState initialized with empty defaults, no initialValues prop"
    - path: "app/business/onboarding/StepMediat.tsx"
      issue: "useState initialized with empty file array, no initialValues prop"
    - path: "app/business/onboarding/StepAukioloajat.tsx"
      issue: "Partially hydrates from existingAukioloajat (Google Places) but not from draft's previously submitted data"
  missing:
    - "Pass relevant draft slice as initialValues prop to each step component in OnboardingWizardInner"
    - "Each step's useState initializer should read initialValues ?? empty default"
    - "For StepAukioloajat: pass draft?.aukioloajat ?? paikkaInfo?.aukioloajat so user-entered hours win"
  debug_session: ""
