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
updated: 2026-06-16T12:00:00Z
---

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

### 2. URL auto-normalizes protocol prefix
expected: |
  Entering a URL without http/https prefix (e.g. "example.com") auto-prepends https://
  instead of showing a validation error.
result: pass
note: Fixed during UAT — changed from validation error to auto-prepend https://

### 3. Analyzing state: spinner and Ohita button visible
expected: |
  Enter a valid URL and submit. The UI transitions to an "analyzing" state showing a loading
  spinner. An "Ohita" button is visible and clickable at all times during analysis.
result: pass

### 4. Branding preview shows after successful analysis
expected: |
  After analysis completes, the UI shows: logo (if found), color swatches, prices section,
  opening hours section. When data is not extractable, muted "not found" placeholders appear
  instead of hidden sections. Two buttons: "Analysoi uudelleen" and "Jatka velhoon →".
  Logo updates correctly when re-analyzing.
result: pass
note: Fixed during UAT — added "Hintoja ei löydetty" / "Aukioloaikoja ei löydetty" placeholders; fixed logo cache-busting with ?t=Date.now()

### 5. "Analysoi uudelleen" resets to URL input
expected: |
  From the branding preview state, click "Analysoi uudelleen". The UI resets to the URL
  input screen and a fresh analysis can be run.
result: pass

### 6. "Jatka velhoon →" transitions to wizard with pre-filled data
expected: |
  After clicking "Jatka velhoon →", the wizard opens. Steps 3/4/5 are pre-filled with
  extracted branding data when available; show defaults when extraction found nothing.
result: pass
note: Pre-fill logic and prop threading verified correct. Prices/hours pre-fill depends on extraction quality (best-effort). Website field pre-fills when website_url is returned.

### 7. "Ohita" skips directly to wizard
expected: |
  Clicking "Ohita" transitions directly to the onboarding wizard without any branding data.
result: pass

### 8. Step 6 preview renders DiagonaalKortti with brand color
expected: |
  Step 6 (Esikatselu) shows DiagonaalKortti with the brand's primary color on the left panel.
  Text contrast is correct (black on light, white on dark).
result: pass

### 9. Draft data takes priority over branding pre-fills
expected: |
  For users with an existing draft, wizard steps show saved draft data, not branding data.
result: pass

## Summary

total: 9
passed: 9
issues: 0
skipped: 0
pending: 0

## Gaps

All issues found during UAT were diagnosed and fixed within the same session:

- Prices/hours not shown in preview → fixed: added "not found" placeholders so sections always render
- Logo not updating on re-analysis → fixed: appended ?t=Date.now() cache-buster to logo URL in uploadLogo
- URL requires protocol prefix → fixed: auto-prepend https:// instead of showing validation error

Commits: 4b62a4a, 7871ba0
