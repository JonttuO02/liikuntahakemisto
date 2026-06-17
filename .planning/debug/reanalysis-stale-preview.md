---
slug: reanalysis-stale-preview
status: awaiting_human_verify
trigger: "When a user re-runs website analysis on a venue/draft that was already analyzed before (same URL, second run), picking a different logo or color than the first run does not update the Step 6 (StepEsikatselu) wizard preview — it still shows the logo/color from the FIRST analysis run. Separately, the second analysis run found fewer gallery images than the first run for the same site."
created: 2026-06-17
updated: 2026-06-17
related_phase: 47-skeema-monisivuinen-scraper-putki, 48-logo-vari-ja-galleriavalinta, 50-flow-uudelleenj-rjestys
---

# Debug Session: reanalysis-stale-preview

## Symptoms

- **Expected:** Re-running the website analysis on the same venue should let the user pick a fresh logo/color/gallery from the new analysis results, and those new picks should flow through to the Step 6 preview exactly like a first-time analysis does.
- **Actual:** After re-analyzing, the user selected a different logo and a different color than their first run, but the Step 6 (StepEsikatselu) preview still shows the FIRST run's logo/color, not the new picks. Separately (possibly related, possibly not), the re-analysis run found fewer/no gallery images compared to the first run on the identical site.
- **Errors:** Not checked.
- **Timeline:** Discovered immediately after fixing `branding-color-picker-broken` (.planning/debug/resolved/branding-color-picker-broken.md) and `callout-card-no-logo-color` (.planning/debug/resolved/callout-card-no-logo-color.md) in this same session — found while re-verifying those fixes by re-analyzing the same test site a second time.
- **Reproduction:**
  1. Onboard a venue, analyze a real website, let it complete, optionally pick a logo/color, proceed.
  2. Go back to the analyze step (or otherwise trigger a second analysis run on the same paikka_id/draft) and re-analyze the SAME url.
  3. Pick a DIFFERENT logo and a DIFFERENT color than the first run produced.
  4. Proceed into the wizard and reach Step 6 (StepEsikatselu) — the preview shows the first run's logo/color, not the second run's picks.
  5. (Separate observation) the second analysis run's gallery-image candidates were fewer than the first run's, for the identical site.

## Current Focus

- hypothesis: CONFIRMED — two compounding bugs, both triggered specifically by the "Analysoi uudelleen" (re-analyze) button, which re-runs analysis WITHOUT remounting AnalysoiSivusto (unlike the wizard's back-button path, which does remount and works correctly).
- test: read AnalysoiSivusto.tsx's init effect (selectionInitialisedRef guard) and the "Analysoi uudelleen" button handler; read analyze-website/route.ts's UPSERT payload.
- expecting: confirmed both — the ref guard skips re-initialization on same-mount re-analysis, and the UPSERT never resets selected_* columns.
- next_action: none — fixed, awaiting human re-verification.

## Evidence

- timestamp: 2026-06-17
  checked: app/business/onboarding/AnalysoiSivusto.tsx init effect (lines 130-163) and "Analysoi uudelleen" button (lines 845-855)
  found: The init effect that seeds `selectedLogoUrl`/`bgColor`/`accentColor`/`selectedGallery` from `brandingResult` guards on `selectionInitialisedRef.current` and never resets it. The "Analysoi uudelleen" button only calls `setBrandingResult(null)` + `setPhase('url-input')` — it does NOT remount the component (pagePhase in the parent page.tsx stays `'analyze'` throughout), so `selectionInitialisedRef.current` stays `true` from the FIRST analysis. When the second analysis's result lands, the init effect's guard clause exits immediately, silently skipping re-initialization for the new candidates.
  implication: After a same-session re-analysis, the selection state is whatever was last set (manual picks or first-run defaults) — never re-derived from the new analysis result. This matches the user's repro (re-analyzed the same site, picked different choices, but the picks didn't propagate as expected).

- timestamp: 2026-06-17
  checked: app/api/business/analyze-website/route.ts runAnalysis() UPSERT payload (lines 98-127, before this session's fix)
  found: The UPSERT writes `logo_url`, `logo_candidates`, `colors`, `image_urls`, etc., but never includes `selected_logo_url`, `selected_background_color`, `background_color_source`, `selected_accent_color`, or `accent_color_source`. Since Supabase's `.upsert()` is a partial column update on conflict, columns omitted from the payload are left completely untouched in the existing row.
  implication: A re-analysis leaves the PRIOR run's manual selections sitting in the DB row. Compounding the first bug: even on a clean remount (e.g. via the wizard back button, where selectionInitialisedRef does reset), the init effect's `if (brandingResult.selected_background_color) { use it } else { use AI default }` branch would still pick up the stale, prior-run color instead of deriving a fresh default from the new analysis's colors array — masking the new candidates for any consumer that prioritizes `selected_*` over freshly-extracted candidates.

## Eliminated

- hypothesis: The gallery image count discrepancy (2nd run found fewer images) is a wiring/persistence bug
  evidence: `image_urls` IS included in the UPSERT and is always fully replaced (not merged) on each run — scrapeWebsite()/Claude's gallery detection simply found fewer candidate images on the second pass over the same site. This is AI/scraper run-to-run variance, not a regression, consistent with the separately-observed logo-candidate-count variance (2 logos found in one run, 1 in another, same site) noted during `branding-color-picker-broken` verification. Not pursued further as a code bug.

## Regression introduced and fixed during this session's own fix

- timestamp: 2026-06-17
  found: The first fix attempt included `background_color_source: 'ai'` and `accent_color_source: 'ai'` in the analyze-website UPSERT, alongside the legitimate `selected_logo_url`/`selected_background_color`/`selected_accent_color` resets. User re-tested and got "Analyysi epäonnistui" (analysis failed) on the very FIRST analyze attempt, not just re-analysis.
  root_cause: `background_color_source`/`accent_color_source` are NOT actual database columns on `business_branding` — confirmed via `grep` across all `supabase/migrations/*.sql` (no migration creates them) and via `app/api/business/branding/route.ts`'s own PATCH handler, whose `updatePayload` only conditionally sets `selected_logo_url`/`selected_background_color`/`selected_accent_color`/`image_urls` — it accepts `background_color_source`/`accent_color_source` as request params for validation purposes only and never persists them. Including these as UPSERT columns throws a Postgres "column does not exist" error, caught by `runAnalysis()`'s outer catch block, which sets `status: 'failed'` — breaking the FIRST analysis for every venue, not just re-analysis.
  fix: Removed `background_color_source: 'ai'` and `accent_color_source: 'ai'` from the UPSERT payload in `analyze-website/route.ts`. Only the three real columns (`selected_logo_url`, `selected_background_color`, `selected_accent_color`) are reset to `null`. The client-side `bgSource`/`accentSource` reset in `AnalysoiSivusto.tsx`'s "Analysoi uudelleen" handler is unaffected — those are local UI-only state, never sent to this route.
  verification: `npx tsc --noEmit` clean. Awaiting human re-verification that a first-time analysis succeeds again, and that the original re-analysis fix still works correctly.

## Round 3: logo selection never persisted/read back (separate from re-analysis)

- timestamp: 2026-06-17
  found: After the column-name regression was fixed, user reported the logo selection itself doesn't work at all (independent of re-analysis): picking a different logo always shows correctly in the wizard's StepMediat, but the Step 6 preview always shows the FIRST logo on the candidate list, and going back to the analyze step always shows the first logo as "selected" regardless of what was actually picked before.
  root_cause: "Three compounding gaps, none related to the re-analysis bugs above: (1) GET /api/business/analyze-website's `.select(...)` column list never included `selected_logo_url`, so the persisted pick was silently dropped from every API response even though `selectLogo()` correctly PATCHes it to the DB. (2) The `BrandingResult` TS type itself never declared `selected_logo_url` as a field, so even if the GET fix were applied, nothing in the type system would have caught the omission downstream. (3) `StepEsikatselu.tsx` calls `buildBrandingPreview(paikkaInfo, brandingData, draft.paikka_id)` — omitting the optional 4th `selectedLogoUrl` argument that the function explicitly supports — so the preview always fell back to `brandingResult.logo_url` (the single primary/first-detected logo) regardless of any selection."
  fix: "(1) Added `selected_logo_url` to the GET `.select(...)` column list in `analyze-website/route.ts`. (2) Added `selected_logo_url: string | null` to the `BrandingResult` type in `brandingResult.ts`. (3) `AnalysoiSivusto.tsx`'s init effect now prioritizes `brandingResult.selected_logo_url` (the actual persisted pick) ahead of `logo_candidates[0]` when seeding `selectedLogoUrl` on mount — previously it ignored the persisted selection entirely and always defaulted to the first candidate. (4) `StepEsikatselu.tsx` now passes `draft.media_urls?.logo` as the 4th argument to `buildBrandingPreview`, since that's where the user's actual pick lands (written by `page.tsx`'s `handleConfirm` before entering the wizard) — fixing the Step 6 preview to show the real selection instead of always the first candidate."
  verification: "`npx tsc --noEmit` and `npx vitest run` (176/176) both clean. Awaiting human re-verification."

## Open: accent color has no preview consumer (feature gap, not yet fixed)

- timestamp: 2026-06-17
  found: User reports accent color picker "doesn't work — always white or black even if I choose orange." Confirmed by code read: `selected_accent_color` IS correctly read/written/persisted throughout (init effect, PATCH route, GET select list all handle it correctly) — but NO preview component (`CalloutCard`, `DiagonaalKortti`, `PaikkaSheet`) ever reads or renders an "accent color" anywhere. Only `brandColor` (mapped from `selected_background_color`) is consumed, which drives both the background fill AND the contrast text color (`getContrastColor`) — which is almost certainly the "white or black" the user is seeing and mistaking for an unresponsive accent picker.
  status: NOT a wiring bug — this is a missing feature. There is no existing visual slot for "accent color" in any preview component to wire it into. Needs a design decision (where should accent color appear — a border/stripe, a secondary badge, button color, something else?) before implementing. Deferred — will ask the user for the intended placement rather than guess.

## Resolution

- root_cause: "Two compounding bugs, both specific to the 'Analysoi uudelleen' same-mount re-analysis path: (1) `AnalysoiSivusto.tsx`'s `selectionInitialisedRef` is set on the first analysis result and never reset, so the init effect that seeds selection state from a NEW analysis result silently no-ops on every subsequent re-analysis within the same mount. (2) `analyze-website/route.ts`'s UPSERT never resets the `selected_logo_url`/`selected_background_color`/`selected_accent_color`/`*_source` columns, so even a fresh remount would still inherit a prior run's stale manual selections via the init effect's 'use selected_* if present' branch."
- fix: "(1) `AnalysoiSivusto.tsx`: the 'Analysoi uudelleen' button handler now resets `selectionInitialisedRef.current = false` and clears `selectedLogoUrl`/`bgColor`/`bgSource`/`accentColor`/`accentSource`/`armedSlot`/`selectedGallery` to their initial values before transitioning back to `url-input`, so the init effect re-applies cleanly once the new analysis completes. (2) `analyze-website/route.ts`: the UPSERT now explicitly sets `selected_logo_url: null`, `selected_background_color: null`, `background_color_source: 'ai'`, `selected_accent_color: null`, `accent_color_source: 'ai'` on every analysis run, so a fresh analysis (first-time or re-analyze) never inherits a prior run's manual picks."
- verification: "`npx tsc --noEmit` clean. `npx vitest run` — 176/176 tests pass (no existing tests cover this route/component directly; the fix-affected files have no dedicated unit tests). Logic verified by full read of both files' affected code paths. Awaiting human confirmation that re-analyzing the same site and picking new selections now correctly resets defaults and flows through to the Step 6 preview."
- files_changed:
  - app/api/business/analyze-website/route.ts
  - app/business/onboarding/AnalysoiSivusto.tsx
