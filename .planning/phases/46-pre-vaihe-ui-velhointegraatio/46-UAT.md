---
status: complete
phase: 46-pre-vaihe-ui-velhointegraatio
source:
  - .planning/phases/46-pre-vaihe-ui-velhointegraatio/46-01-SUMMARY.md
  - .planning/phases/46-pre-vaihe-ui-velhointegraatio/46-02-SUMMARY.md
  - .planning/phases/46-pre-vaihe-ui-velhointegraatio/46-03-SUMMARY.md
  - .planning/phases/46-pre-vaihe-ui-velhointegraatio/46-04-SUMMARY.md
  - .planning/phases/46-pre-vaihe-ui-velhointegraatio/46-05-SUMMARY.md
started: 2026-06-16T00:00:00Z
updated: 2026-06-16T00:00:00Z
---

## Current Test

## Current Test

[testing complete]

## Tests

### 1. Pre-screen appears on /business/onboarding
expected: |
  Navigate to /business/onboarding while logged in as a business user.
  Instead of the wizard appearing immediately, you should see a "Analysoi sivustosi" pre-screen
  with a heading, a short description paragraph, and a URL input field with a submit button.
  The wizard steps (Perustiedot, Hinnasto, etc.) should NOT be visible yet.
result: pass

### 2. URL validation requires http:// or https:// prefix
expected: |
  On the pre-screen URL input, type a URL without a protocol prefix (e.g. "example.com" or
  "www.example.fi") and click the submit button. The form should reject it client-side with
  a validation error — it should NOT submit to the server. The error should appear inline.
result: pass
note: UX feedback — consider auto-prepending https:// instead of showing an error

### 3. Analyzing state: spinner and Ohita button visible
expected: |
  Enter a valid URL (e.g. "https://example.fi") and submit. The UI should transition to an
  "analyzing" state showing a loading spinner or progress indicator with a message that
  analysis is in progress. An "Ohita" (skip) button should be visible and clickable at all
  times during analysis — you should not need to wait for it to appear.
result: pass

### 4. Branding preview shows after successful analysis
expected: |
  After a successful website analysis completes, the UI transitions to a "preview" state
  showing the extracted branding data. You should see: a logo image (if found), color swatches
  for the detected brand colors, extracted price items, and extracted opening hours.
  Two buttons appear: "Analysoi uudelleen" and "Jatka velhoon →".
result: issue
reported: "Only logo and one colour shown. No prices or opening hours. Also when running new analysis the logo doesn't update — stays from previous analysis but colour does update."
severity: major

### 5. "Analysoi uudelleen" resets to URL input
expected: |
  From the branding preview state, click "Analysoi uudelleen". The UI should reset back to
  the URL input screen, clearing the previous analysis result. You should be able to enter
  a new URL and run a fresh analysis.
result: pass

### 6. "Jatka velhoon →" transitions to wizard with pre-filled data
expected: |
  From the branding preview, click "Jatka velhoon →". The page should transition to the
  normal onboarding wizard (Vaihe 1: Perustiedot). The URL stays at /business/onboarding
  (no navigation). Proceed to step 3 (Hinnasto) — it should be pre-filled with prices
  extracted from the website. Step 4 (Aukioloajat) should be pre-filled with opening hours.
  Step 5 (Yhteystiedot) website field should be pre-filled with the analyzed URL.
result: issue
reported: "No pre-fillings in any wizard steps after clicking Jatka velhoon →"
severity: major

### 7. "Ohita" skips directly to wizard
expected: |
  On either the analyzing state or the URL input screen, click "Ohita". The UI should
  transition directly to the onboarding wizard without any branding data — steps 3, 4, 5
  will show their default empty/placeholder values rather than any extracted data.
result: pass

### 8. Step 6 preview renders DiagonaalKortti with brand color
expected: |
  When arriving at step 6 (Esikatselu) after going through the branding flow ("Jatka velhoon →"),
  the DiagonaalKortti card preview should have its left panel rendered in the brand's primary
  color (not the default white/grey). The text on that colored panel should be readable
  (black text on light brand colors, white text on dark brand colors).
result: pass
result: [pending]

### 9. Draft data takes priority over branding pre-fills
expected: |
  If a business user with an existing onboarding draft (has saved step 3 prices previously)
  goes through the branding flow and clicks "Jatka velhoon →", the draft data should appear
  in the wizard steps — NOT the branding extracted data. The branding data is only a fallback
  for first-time users with no existing draft.
result: pass

## Summary

total: 9
passed: 7
issues: 3
skipped: 0
pending: 0

## Gaps

- truth: "Branding preview shows logo, color swatches, extracted prices, and extracted opening hours"
  status: failed
  reason: "User reported: Only logo and one colour shown — no prices or opening hours rendered in the preview state"
  severity: major
  test: 4
  root_cause: "Claude returns empty prices:[] and opening_hours:[] arrays for most websites because the scraped HTML snippet does not contain machine-readable structured data. Preview JSX is correctly gated on array.length > 0 (AnalysoiSivusto.tsx:375,389), so both sections are hidden. Code is correct — extraction quality is the issue."
  artifacts:
    - app/business/onboarding/AnalysoiSivusto.tsx:375
    - app/business/onboarding/AnalysoiSivusto.tsx:389
    - lib/branding/analyzer.ts:106-107
  fix: "Add a 'Hintoja ei löydetty automaattisesti' / 'Aukioloaikoja ei löydetty' fallback message when arrays are empty, so the user understands extraction ran but found nothing. Long-term: improve scraper to fetch pricing/contact subpages."

- truth: "Re-analysis clears previous branding result including logo"
  status: failed
  reason: "User reported: After running a new analysis, the logo stays from the previous analysis but the colour updates — logo display is not reset/updated when new analysis result arrives"
  severity: major
  test: 4
  root_cause: "uploadLogo always writes to the fixed path branding/{businessAccountId}/logo.png and getPublicUrl returns the same URL string regardless of new file content. The <img> element has no cache-busting key, so the browser serves the cached old image."
  artifacts:
    - lib/branding/storage.ts:14
    - lib/branding/storage.ts:28
    - app/business/onboarding/AnalysoiSivusto.tsx:349
  fix: "Append ?t=Date.now() to the publicUrl returned by uploadLogo so each upload produces a distinct URL that forces cache invalidation."

- truth: "Wizard steps 3/4/5 are pre-filled with branding data after clicking Jatka velhoon →"
  status: failed
  reason: "User reported: No pre-fillings in any wizard steps after clicking Jatka velhoon →"
  severity: major
  test: 6
  root_cause: "Same root as Bug 1 — raw_analysis.prices and .opening_hours are empty arrays. In WizardInner brandingHours is set to null when hrs?.length is falsy (line 203). In StepHinnasto brandSource?.length is falsy for [] (line 70). Prop threading is correct. StepYhteystiedot website field WOULD pre-fill if website_url is returned."
  artifacts:
    - app/business/WizardInner.tsx:198-212
    - app/business/WizardInner.tsx:203
    - app/business/onboarding/StepHinnasto.tsx:70
    - app/business/onboarding/StepAukioloajat.tsx:74
  fix: "Same as Bug 1 fix for prices/hours. The pre-fill logic and prop threading are correct — no code fix needed beyond improving extraction quality or showing a 'not found' fallback."
