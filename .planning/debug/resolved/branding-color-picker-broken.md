---
slug: branding-color-picker-broken
status: resolved
trigger: "AI-agent isn't picking colours correctly during onboarding website analysis. For most tested websites it returns 'couldn't find colours.' The manual colour picker works (you can select a color), but the selected color never shows on the preview, and if the user navigates back to the website-analyze step, the previously selected color is gone."
created: 2026-06-17
updated: 2026-06-17
related_phase: 47-skeema-monisivuinen-scraper-putki, 48-logo-vari-ja-galleriavalinta, 50-flow-uudelleenj-rjestys
---

# Debug Session: branding-color-picker-broken

## Symptoms

- **Expected:** The AI website analyzer should extract one or more candidate brand colors from most real venue websites. The manual color picker should let the user override/select a color, and that selection should both persist (survive navigating back to the analyze step) and actually render in the preview (CalloutCard/DiagonaalKortti background).
- **Actual:** Three related symptoms:
  1. For the websites tested, the AI color extraction returns "couldn't find colours" (i.e. no candidates) almost universally.
  2. The manual color picker UI itself appears to work (a color can be selected), but the selected color is never reflected in the preview.
  3. If the user goes back to the analyze step (e.g. via the wizard step-1 "back" button added in Phase 50, or any other path that re-renders AnalysoiSivusto), the previously manually-selected color is lost — analyze step re-renders with no memory of the prior pick.
- **Errors:** Not checked yet (user hasn't opened browser DevTools console/network tab for either symptom).
- **Timeline:** Discovered during Phase 50 UAT (2026-06-17). Color extraction/selection was built across Phase 47 (scraper) and Phase 48 (logo/color/gallery selection UI) — unknown whether this ever worked for real-world sites or only for whatever fixtures were used during those phases' UAT.
- **Reproduction:**
  - Symptom 1: Go through onboarding, reach the website-analysis step (AnalysoiSivusto), enter a real venue website URL, let it analyze — color extraction result is "couldn't find colours" for most sites tried.
  - Symptom 2: On the same step, manually pick a color from the picker UI — proceed forward (e.g. confirm/skip into the wizard) — the picked color does not appear on the Step 6 preview (CalloutCard/DiagonaalKortti background stays default).
  - Symptom 3: After picking a color manually, navigate back to the analyze step (e.g. via wizard step 1's "back" button) — the previously picked color is no longer selected/shown.

## Current Focus

reasoning_checkpoint:
  hypothesis: "Two independent bugs explain all 3 symptoms. (1) app/api/business/analyze-website/route.ts runAnalysis() writes the scraper's flat colors:string[] (from <meta theme-color>/CSS :root vars only) into business_branding.colors instead of Claude's role-tagged result.colors (from analyzeWithClaude, screenshot-based). Since theme-color/CSS-var colors are rare on real sites, colors is almost always [] -> 'couldn't find colours' (Symptom 1). When colors IS non-empty (a string[] instead of {hex,role}[]), every .role read downstream is undefined, breaking swatch rendering too. (2) AnalysoiSivusto.tsx's onConfirm(brandingResult, selections) call (around line 858) passes the brandingResult state object captured when phase->'preview', which is NEVER updated when the user manually picks a color via assignColorToSlot (that function only updates separate bgColor/accentColor/bgSource/accentSource state + PATCHes the server — it never calls setBrandingResult). So the parent page.tsx's handleConfirm receives a stale brandingResult missing selected_background_color/selected_accent_color, stores it as brandingData, and StepEsikatselu's brandColor derivation (reads brandingData.selected_background_color) never sees the user's pick (Symptom 2). Re-entering analyze (Symptom 3) remounts AnalysoiSivusto, whose mount-time GET correctly restores the DB-persisted color into local state — but pressing 'Jatka velhoon' again re-triggers the same stale-snapshot bug, so it still looks lost downstream."
  confirming_evidence:
    - "app/api/business/analyze-website/route.ts line 30 destructures `colors` from scrapeWebsite() (flat string[] of theme-color/CSS-var hexes only); line 43 computes `result` from analyzeWithClaude() with result.colors as {hex,role}[] (richer, screenshot-derived per lib/branding/prompt.ts); line 106 upserts `colors: colors` (the scraper's, NOT result.colors) into business_branding.colors."
    - "lib/branding/brandingResult.ts BrandingResult.colors type and every consumer (AnalysoiSivusto.tsx colors.find(c => c.role===...), route.ts PATCH StoredBrandingRow.colors) expect Array<{hex,role}> — a plain string[] written into that column silently breaks all .role/.hex reads."
    - "AnalysoiSivusto.tsx: assignColorToSlot() (lines 209-219) calls setBgColor/setAccentColor/setBgSource/setAccentSource + patchBranding(...) but never calls setBrandingResult — brandingResult is fully immutable after the one-time init effect (selectionInitialisedRef guard, lines 130-163) sets it."
    - "AnalysoiSivusto.tsx line 858: onConfirm(brandingResult, { logoUrl: selectedLogoUrl, gallery: selectedGallery }) — note logo/gallery ARE forwarded via the separate `selections` param, but color is not forwarded at all; onConfirm only receives the stale brandingResult object for color data."
    - "app/business/onboarding/page.tsx handleConfirm(result, selections) does setBrandingData(result) directly — no merge with bgColor/accentColor — so brandingData.selected_background_color is whatever was in the original GET/poll response, not the user's manual pick."
    - "StepEsikatselu.tsx lines 47-50: brandColor = brandingData?.selected_background_color ?? colors.find(role==='background') — sources brandColor exclusively from the stale brandingData prop."
  falsification_test: "If colors stored in business_branding.colors for a freshly analyzed real venue site is a string[] (not {hex,role}[]), and/or if selecting a color and clicking 'Jatka velhoon' still shows the OLD/default color in StepEsikatselu's preview even though GET /api/business/analyze-website?paikka_id=X (re-fetched independently) shows the correct selected_background_color in the DB row, both hypotheses are confirmed. If colors already contains role-tagged objects, or if brandColor in StepEsikatselu reflects the manual pick correctly, this hypothesis is wrong."
  fix_rationale: "Fix 1: change `colors: colors` to `colors: result.colors` in route.ts upsert so the persisted column matches the type every consumer expects and contains Claude's richer screenshot-derived palette. Fix 2: after a manual color/logo selection succeeds, sync the change back into brandingResult state (or have onConfirm receive an explicit colors override) so the object passed to onConfirm/parent always reflects the latest selected_background_color/selected_accent_color — addressing the root data-flow gap rather than patching the symptom in StepEsikatselu alone."
  blind_spots: "Have not yet run the actual pipeline against a real test site to directly observe colors:string[] vs {hex,role}[] in the DB — relying on static code-path tracing. Have not checked whether scraper.ts's flat `colors` field is used/relied upon elsewhere (e.g. tests) such that removing it from the upsert could break something else. Have not yet decided exact fix shape for the stale-brandingResult issue (sync brandingResult vs. restructure onConfirm signature) — needs to preserve PATCH validation precedent (server is source of truth) without introducing a race with patchBranding's async PATCH."
- next_action: "Apply Fix 1 (route.ts colors:result.colors) and Fix 2 (sync brandingResult after manual color picks in AnalysoiSivusto.tsx), then verify against original symptoms."

## Evidence

- timestamp: 2026-06-17
  checked: lib/branding/scraper.ts, lib/branding/analyzer.ts, app/api/business/analyze-website/route.ts
  found: scrapeWebsite() returns `colors: string[]` from <meta theme-color> + :root CSS vars only (lines 177-225 of scraper.ts). analyzeWithClaude() returns `colors: Array<{hex,role}>` from screenshot-based Claude analysis (analyzer.ts lines 126-137, prompt.ts lines 60-73). route.ts runAnalysis() destructures BOTH (`colors` from scraper at line 30, `result` from Claude at line 43) but the UPSERT at line 106 writes `colors: colors` — the scraper's flat array — not `result.colors`.
  implication: business_branding.colors is populated with the wrong, much sparser source. Most real sites lack theme-color meta/CSS custom properties, so this array is usually empty -> "couldn't find colours" (Symptom 1). Even when non-empty, it's string[] not {hex,role}[], breaking every .role-based consumer.

- timestamp: 2026-06-17
  checked: app/business/onboarding/AnalysoiSivusto.tsx (assignColorToSlot, handleSwatchClick, handleCustomHexSubmit, onConfirm call site), app/business/onboarding/page.tsx (handleConfirm), app/business/onboarding/StepEsikatselu.tsx (brandColor derivation)
  found: Manual color selection updates only bgColor/accentColor/bgSource/accentSource local state + PATCHes /api/business/branding; it never updates the `brandingResult` state object. The "Jatka velhoon" button passes `brandingResult` (stale, from before any manual pick) into onConfirm. page.tsx's handleConfirm stores this stale object verbatim as brandingData. StepEsikatselu derives brandColor from brandingData.selected_background_color, which is therefore stale/missing.
  implication: This fully explains Symptom 2 (pick never shows in preview) and contributes to the perceived Symptom 3 (re-confirming after navigating back hits the same stale-snapshot bug, even though the GET-based remount itself correctly restores DB state into AnalysoiSivusto's own local UI).

## Eliminated

- hypothesis: "Color selection is lost from the database on back-navigation (a persistence/reload bug in the GET route or init effect)."
  evidence: "GET /api/business/analyze-website (route.ts lines 243-248) selects selected_background_color/selected_accent_color and AnalysoiSivusto's init effect (lines 130-163) correctly reads them back into bgColor/accentColor on mount. The DB round-trip itself is correct — the loss is purely in the stale brandingResult object passed to onConfirm, not in persistence or reload."
  timestamp: 2026-06-17

## Resolution

- root_cause: "(1) app/api/business/analyze-website/route.ts's runAnalysis() upserts the scraper's flat theme-color/CSS-derived `colors: string[]` into business_branding.colors instead of Claude's screenshot-based, role-tagged `result.colors`, causing color extraction to appear empty/broken for nearly all real sites (Symptom 1) and breaking role-based color consumers when colors IS present. (2) AnalysoiSivusto.tsx never syncs manual color picks (bgColor/accentColor) back into the `brandingResult` state object, so the stale brandingResult passed to onConfirm() — and thus into page.tsx's brandingData and StepEsikatselu's brandColor — never reflects the user's manual selection (Symptoms 2 and 3)."
- fix: "(1) app/api/business/analyze-website/route.ts: changed `colors: colors` to `colors: result.colors` in the runAnalysis() UPSERT, and removed `colors` from the scrapeWebsite() destructure since it's no longer used — Claude's role-tagged, screenshot-derived palette is now what's persisted. (2) app/business/onboarding/AnalysoiSivusto.tsx: the 'Jatka velhoon →' button's onConfirm call now passes a merged object `{ ...brandingResult, selected_background_color: bgColor, selected_accent_color: accentColor }` instead of the raw stale `brandingResult`, so the user's latest manual color picks (or AI defaults if untouched) flow into page.tsx's brandingData and StepEsikatselu's brandColor."
- verification: "All 176 existing vitest tests pass (60 in lib/branding/*, including scraper.test.ts and analyzer.test.ts — unaffected by the route-level change since scrapeWebsite()'s own colors field/tests are untouched). `npx tsc --noEmit` clean across the whole project, confirming the merged-object spread in AnalysoiSivusto.tsx type-checks against BrandingResult. No dedicated unit tests existed for analyze-website/route.ts or AnalysoiSivusto.tsx prior to this fix. **User confirmed in-browser (2026-06-17): color extraction now finds colors, manual picks show in the preview and survive back-navigation.** Both fixes verified working as intended.

Follow-up observations from the same verification session (NOT caused by this fix — tracked separately): (a) the same test website returned only 1 logo candidate this run vs 2 in an earlier run — Claude's logo detection is not perfectly deterministic between analysis runs and `colors:result.colors` change did not touch `result.logos`/`logoCandidates` derivation at all, so this is most likely run-to-run AI variance, not a regression; (b) CalloutCard's brandColor rendering (added in the callout-card-no-logo-color session) has a glassy/overlay effect that's too strong, washing out the actual color, and the logo image gets cropped to fit the small circular slot instead of being fully shown — these are visual-polish gaps in that *other* session's fix, tracked as a new debug session rather than reopening this one."
- files_changed:
  - app/api/business/analyze-website/route.ts
  - app/business/onboarding/AnalysoiSivusto.tsx
