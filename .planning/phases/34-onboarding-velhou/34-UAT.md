---
status: diagnosed
phase: 34-onboarding-velhou
source:
  - 34-11-SUMMARY.md
started: "2026-06-10T18:30:00Z"
updated: "2026-06-10T18:30:00Z"
note: "Targeted re-test of the 4 gaps closed by plan 34-11 + previously blocked test 9"
---

## Current Test

[testing complete]

## Tests

### 1. Media upload — multiple thumbnails + delete
expected: |
  Go to Step 2 (Mediat) in the onboarding wizard.
  Upload 2–3 images via the drop zone.
  Expected: all uploaded thumbnails appear in a strip below the drop zone (not just the most recent one).
  Each thumbnail has a visible X button. Clicking an X removes that specific image.
  The drop zone itself remains clickable for adding more images.
result: pass

### 2. Character counter shows "N/300"
expected: |
  Go to Step 5 (Yhteystiedot). Click into the Kuvaus (description) textarea.
  Type a few characters.
  Expected: a counter like "12/300" appears below the textarea and updates with each keystroke.
  When the text reaches 300 characters the counter turns red.
  No raw translation key (e.g. "Business.contactDescCount") is visible anywhere.
result: pass

### 3. Step 6 preview loads within a few seconds
expected: |
  Advance to Step 6 (Esikatselu).
  Expected: all three preview sections load within a few seconds —
  (1) LISTAKORTTI with a PaikkaKortti card,
  (2) DIAGONAALIKORTTI with a DiagonaalKortti card,
  (3) PROFIILISIVU with an inline PaikkaSheet.
  No infinite spinner. If data cannot be fetched, a Finnish error message appears instead of a forever-spinning loader.
result: issue
reported: "it works well except the using of uploaded photos doesnt work. Uploaded logo doesnt show in cards at all, one of the rest uploaded photos is used in diagonaalkortti right side, but we must create system to choose the photo used in there. venue page doesnt show logo or any photos in hero section. Also when going backwards on steps and changing the contents, the preview page doesnt update automaticly but needs an manual refresh"
severity: major

### 4. Submit from step 6 redirects to /business
expected: |
  On Step 6 (Esikatselu), click "Lähetä hyväksyttäväksi".
  Expected: the application is submitted without an error. You are redirected to /business (the business panel).
result: issue
reported: "it shows text: Submission failed. Check your information and try again."
severity: major

### 5. Back navigation preserves entered data
expected: |
  Fill in Step 3 (Hinnasto) with at least one price row, advance to step 4, then click Edellinen (back).
  Expected: Step 3 shows the price rows you entered — they are not cleared.
  Do the same for Steps 4 and 5: enter data, advance, go back, data is still visible.
result: issue
reported: "only pricing and contact details -steps keep their contents. Also I can see that step5 contact details never gets done-status on the uprow icons"
severity: major

## Summary

total: 5
passed: 2
issues: 3
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "Step 6 preview shows uploaded logo in cards, lets user choose which photo appears in DiagonaalKortti, and shows logo + photos in venue page hero section. Preview auto-updates when user changes data on a previous step."
  status: failed
  reason: "User reported: uploaded logo doesn't show in cards; only one photo used in DiagonaalKortti with no way to choose; venue page hero shows no logo or photos; preview doesn't auto-update after back navigation + edits (needs manual refresh)"
  severity: major
  test: 3
  root_cause: |
    Four converging issues: (1) Liikuntapaikka type has no logo_url field; buildDraftAsPaikka maps only photos[0] to image_url and drops logo entirely. (2) DiagonaalKortti left panel is hardcoded <Building2> placeholder — never reads any logo field. (3) PaikkaSheet hero carousel renders 3 static placeholder divs; never reads paikka.image_url or photo arrays. (4) OnboardingWizardInner loads draft once on mount with empty useEffect deps — draft state is never refreshed after step saves, so StepEsikatselu receives a stale draftAsPaikka when user returns to step 6 after editing.
  artifacts:
    - path: "lib/onboardingUtils.ts"
      issue: "buildDraftAsPaikka line 110 maps photos[0] to image_url only; logo from media_urls silently dropped"
    - path: "lib/types.ts"
      issue: "Liikuntapaikka has no logo_url field — no way to carry logo through preview pipeline"
    - path: "app/components/DiagonaalKortti.tsx"
      issue: "Lines 86-90: logo slot always renders hardcoded <Building2>; no read of logo_url"
    - path: "app/components/PaikkaSheet.tsx"
      issue: "Lines 126-133: hero carousel renders 3 static placeholder divs; never reads image_url or photo array"
    - path: "app/business/onboarding/OnboardingWizardInner.tsx"
      issue: "useEffect at line 111 has empty deps []; draft state never refreshed after step saves; StepEsikatselu receives stale draft on re-visit"
  missing:
    - "Add logo_url?: string | null to Liikuntapaikka in lib/types.ts"
    - "Map logo_url: draft.media_urls?.logo ?? null in buildDraftAsPaikka"
    - "In DiagonaalKortti: replace hardcoded <Building2> with conditional <img> when paikka.logo_url is set"
    - "In PaikkaSheet: replace 3 static placeholder slides with real slides driven by paikka.image_url (and photo array if available)"
    - "In OnboardingWizardInner: add draft refresh on step 6 entry, or merge saved fields into draft state after each saveAndAdvance call"
  debug_session: ""

- truth: "Clicking Lähetä hyväksyttäväksi on step 6 submits the application and redirects to /business"
  status: failed
  reason: "User reported: it shows text: Submission failed. Check your information and try again."
  severity: major
  test: 4
  root_cause: |
    Migration 20260530000000_add_image_url_to_paikat.sql runs ALTER TABLE paikat but the actual table is liikuntapaikat. The column image_url was therefore never added. The submit route's UPDATE includes image_url: draft.media_urls?.photos?.[0] ?? null, which causes Postgres error "column image_url of relation liikuntapaikat does not exist" → HTTP 500 → StepEsikatselu shows generic "Submission failed" (swallowing the real error).
  artifacts:
    - path: "supabase/migrations/20260530000000_add_image_url_to_paikat.sql"
      issue: "ALTER TABLE paikat — wrong table name; should be liikuntapaikat; column was never added to the actual table"
    - path: "app/api/business/onboarding/submit/route.ts"
      issue: "Line 73: writes image_url in the UPDATE payload; column does not exist on liikuntapaikat → Postgres error → HTTP 500"
    - path: "app/business/onboarding/StepEsikatselu.tsx"
      issue: "Lines 66-68/77: error handler shows generic Finnish error string and never logs the actual Postgres error detail"
  missing:
    - "Create new corrective migration: ALTER TABLE liikuntapaikat ADD COLUMN IF NOT EXISTS image_url TEXT"
    - "In StepEsikatselu error handler: log res.json() before showing user-facing error so real errors surface during QA"
  debug_session: ""

- truth: "Back navigation preserves data in all steps (hinnasto, aukioloajat, yhteystiedot); step 5 progress icon shows done-state after completing yhteystiedot"
  status: failed
  reason: "User reported: only pricing and contact details steps keep their contents (aukioloajat/hours is lost); step 5 contact details never gets done-status on the progress bar icons"
  severity: major
  test: 5
  root_cause: |
    Two sub-issues sharing one root cause. (B1) saveAndAdvance only calls goToStep — it never merges the saved step data back into local draft state. So when user goes back to StepAukioloajat, initialDraftAukioloajat={draft?.aukioloajat} is still the stale mount-time value (null or old data), not the hours just saved. (B2) completedSteps formula = Array.from({ length: draft.current_step - 1 }) so step 5 only appears complete when current_step >= 6. The API sets current_step = 5 when step 5 saves. Step 6 has no save call, only a submit — so current_step never reaches 6 and step 5 never enters completedSteps.
  artifacts:
    - path: "app/business/onboarding/OnboardingWizardInner.tsx"
      issue: "saveAndAdvance (line 114) only calls goToStep; never merges saved data into draft state; useEffect loadDraft has empty deps — draft perpetually stale"
    - path: "app/business/onboarding/OnboardingWizardInner.tsx"
      issue: "Lines 45-47: completedSteps = steps 1..(current_step-1); step 5 requires current_step=6 but step 6 has no save call so it never advances"
    - path: "app/api/business/onboarding/save-step/route.ts"
      issue: "Line 107: sets current_step = step (the step that saved), so completing step 5 sets current_step=5, not 6"
    - path: "app/business/onboarding/StepYhteystiedot.tsx"
      issue: "Sends step: 5 — API sets current_step=5; completedSteps formula means step 5 needs current_step=6 to appear done"
  missing:
    - "In saveAndAdvance: after API call succeeds, merge the saved field into local draft state (setDraft(prev => ({ ...prev, [field]: value, current_step: step + 1 }))) OR re-fetch draft from Supabase"
    - "Fix off-by-one: change API to write current_step = step + 1, OR change completedSteps formula to include current_step itself"
    - "StepYhteystiedot should send step: 6 (or API uses step+1 consistently)"
  debug_session: ""
