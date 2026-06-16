# Phase 48: Logo-, väri- ja galleriavalinta - Context

**Gathered:** 2026-06-16
**Status:** Ready for planning

<domain>
## Phase Boundary

The entire AI-assisted onboarding interaction — URL input, analysis, logo/color/gallery selection, and submission — consolidates into the existing pre-vaihe screen (`AnalysoiSivusto.tsx`). The user explicitly picks one logo from AI-found candidates, picks 2 colors (background + accent) from the extracted palette, selects which scraped gallery images to keep, and can either continue into the rest of the wizard or quick-accept and submit directly from that screen. A new `PATCH /api/business/branding` route persists and validates these selections. This phase also absorbs FLOW-02/FLOW-03 (quick-accept submission), moved here from Phase 50 at the user's explicit request — see `<canonical_refs>` for the roadmap edit.

</domain>

<decisions>
## Implementation Decisions

### Picker placement & flow (consolidated pre-vaihe screen)
- **D-01:** All AI-assisted interaction — URL input, analyzing, logo/color/gallery selection, results, and submission — happens in the existing `AnalysoiSivusto.tsx` (`'preview'` phase specifically). Do NOT add a new wizard step and do NOT move this into `StepEsikatselu.tsx` (step 6) — step 6 remains the final wizard preview for users who continue through the full wizard, untouched by this phase except where Phase 49 later swaps it to `CalloutCard`.
- **D-02:** The `'preview'` phase of `AnalysoiSivusto.tsx` gains: a logo picker (radio-style, one of N candidates), a color picker (2 of up to 6 swatches assigned to background/accent slots), a gallery picker (checkable grid, up to 5 of up to 8 images), and a second action button alongside the existing "Jatka velhoon →" — a "Hyväksy ja lähetä" (quick-accept) button that submits directly.
- **D-03 (scope/roadmap change):** FLOW-02 and FLOW-03 moved from Phase 50 into Phase 48 — quick-accept submission belongs with the selection UI it submits, not as separate later work. ROADMAP.md and REQUIREMENTS.md were updated and committed (`f13369a`, `33bf901`) during this discussion. Phase 50 retains only FLOW-01 (step reorder) and FLOW-04 (draft migration after reorder); its goal/success-criteria text was correspondingly narrowed.

### Gallery selection
- **D-04:** Gallery image selection happens in the pre-vaihe `'preview'` phase, not in `StepMediat`. `StepMediat` (step 2) still exists unchanged for: (a) businesses who skipped AI analysis entirely, (b) adding/removing photos manually after the fact, in both onboarding and edit mode.
- **D-05:** Gallery picker UI: checkable thumbnail grid of up to 8 scraped `image_urls` (Phase 47's `MAX_GALLERY_UPLOADS` cap). The first 5 (or fewer, if fewer were found) start pre-checked by default — matches the existing 5-photo cap already enforced in `StepMediat` (`photosAtMax = totalPhotos >= 5`). User can uncheck/recheck, capped at 5 total selected.
- **D-06:** If the user continues to the wizard instead of quick-accepting, the gallery selections made in pre-vaihe flow into `StepMediat` as `existingPhotoUrls` (treated exactly like already-uploaded photos — shown in the unified grid, individually deletable, counted toward the 5-cap). No separate "suggested from your website" section in `StepMediat` — one unified grid.

### PATCH /api/business/branding — validation & save timing
- **D-07:** Every selection (logo pick, color slot assignment, gallery checkbox toggle) triggers an immediate PATCH call (autosave) — no batching, no "save" button for selections specifically. By the time the user clicks "Jatka velhoon" or "Hyväksy ja lähetä", all selections are already persisted to `business_branding`.
- **D-08:** PATCH validation: (1) ownership check via `business_paikka_links` — same `(business_account_id, paikka_id)` pattern as `analyze-website` route's IDOR mitigation (T-47-11); (2) for AI-sourced selections, membership validation — submitted logo index must exist in that row's stored `logo_candidates`, submitted color hex (when claimed to be AI-sourced) must exist in stored `colors`. Reject with 400/403 on failure. This satisfies ROADMAP.md success criterion 4 ("selection that doesn't belong to the business's own stored analysis result is rejected").
- **D-09:** Custom/manual override path exists alongside AI-candidate selection, but through different mechanisms per field:
  - **Colors:** Add a manual custom-hex input (native `<input type="color">` or hex text field) next to the AI swatch picker. PATCH accepts either a validated candidate-array hex OR a well-formed custom `#rrggbb` hex — the membership check (D-08) only applies when the value is asserted as AI-sourced, not when it's explicitly a custom override.
  - **Logo & photos:** No new manual-input UI in this phase — the existing `StepMediat` `UploadDropZone` upload flow already covers manual logo/photo upload (untouched, separate code path, not gated by this PATCH route's membership check at all).

### Quick-accept submission (FLOW-02/FLOW-03)
- **D-10:** Quick-accept does NOT modify `app/api/business/onboarding/submit/route.ts` at all — zero changes to that file, zero new `submission_type` parameter. (REQUIREMENTS.md FLOW-03 wording was corrected during discussion to match this — the original draft wording mentioning a `submission_type` flag was inaccurate to what was actually decided.)
- **D-11:** Instead, "Hyväksy ja lähetä" first maps the AI analysis result (`business_branding.raw_analysis` prices/opening_hours/website_url, plus the user's logo/color/gallery selections already persisted via PATCH) into the existing `onboarding_draft` row shape (`hinnasto`, `aukioloajat`, `yhteystiedot`, `media_urls` — same shape `StepHinnasto`/`StepAukioloajat`/`StepYhteystiedot`/`StepMediat` already write into via `save-step`). Then it calls the existing `submit` route exactly as a full-wizard completion would — same ownership check, same `liikuntapaikat` update, same `claim_status` reset to `'pending'`, same draft deletion, same admin notification email. No parallel write path.

### Color picker UX
- **D-12:** Color picker layout: a row of up to 6 swatches (from `business_branding.colors`, max 6 per Phase 47's analyzer prompt), plus two labeled slots ("Tausta" / background, "Aksentti" / accent) showing the current pick for each. User clicks a swatch, then assigns it to a slot (or clicks directly into a slot to change it) — not two `<select>` dropdowns.
- **D-13:** Background/accent slots pre-fill from the AI's `role` field on each color entry (`role: 'background' | 'primary' | 'secondary' | 'accent' | 'text' | 'unknown'`, per Phase 47's D-01 prompt reshape) — first `role: 'background'` color → background slot, first `role: 'accent'` color → accent slot. User can override either slot by clicking a different swatch (or the custom hex input from D-09). Matches the logo's "top pick pre-selected, not silently final" pattern from success criterion 1.
- **D-14:** Graceful fallback when fewer than 2 colors exist: if only 1 color extracted, pre-fill background and leave accent unset (defaulting to the custom hex input, `selected_accent_color` stays `null` until the user picks). If 0 colors extracted, both slots default to the custom hex input with no swatches shown. Either way, "Jatka velhoon"/"Hyväksy ja lähetä" stay enabled — color selection is never a hard blocker on continuing.

### Claude's Discretion
- Exact visual styling of the logo radio-picker, swatch row, and gallery checkbox grid (within the project's glassmorphism + monochrome design system per CLAUDE.md).
- Exact PATCH request/response shape (body fields, error message text) — follow the existing `analyze-website` route's JSON error pattern (`{ error: string }` + appropriate status code).
- Exact mapping logic from `raw_analysis` → `onboarding_draft` shape for quick-accept (D-11) — follow `hinnastaToHintaKuvaus` and existing `save-step` field shapes as the source of truth for what each draft field expects.
- Whether the custom hex input (D-09) is a native `<input type="color">` or a styled hex text field — pick whichever fits the existing form input patterns in the codebase more consistently.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` §ONBOARD-14–17, §FLOW-02–03 — exact requirement text (FLOW-03 wording corrected 2026-06-16, commit `33bf901`)
- `.planning/ROADMAP.md` §"Phase 48: Logo-, väri- ja galleriavalinta" — updated success criteria including the absorbed FLOW-02/03 (commit `f13369a`)
- `.planning/ROADMAP.md` §"Phase 50: Flow-uudelleenjärjestys" — narrowed scope (FLOW-01/04 only) after this discussion's roadmap edit

### Prior phase context (data shape this phase consumes)
- `.planning/phases/47-skeema-monisivuinen-scraper-putki/47-CONTEXT.md` — D-12 schema (`logo_candidates`, `image_urls`, `selected_background_color`, `selected_accent_color` columns), the new prompt's `role`-tagged colors and `type`-tagged logos this phase's pickers read
- `.planning/phases/46-pre-vaihe-ui-velhointegraatio/46-CONTEXT.md` — original pre-vaihe architecture (D-PA-01–04), `getContrastColor`/`buildBrandingPreview` utilities this phase extends rather than replaces
- `.planning/phases/45-scraper-claude-api-putki/45-CONTEXT.md` — original UPSERT/status-machine pattern the PATCH route's writes must stay consistent with

### Existing code (read before modifying)
- `app/business/onboarding/AnalysoiSivusto.tsx` — the pre-vaihe component; this phase adds pickers and a quick-accept button to its `'preview'` phase render block (lines 344–429 currently render read-only results)
- `lib/branding/brandingResult.ts` — `BrandingResult` client type is STILL THE OLD SHAPE (`colors: string[] | null`, single `logo_url`, no `logo_candidates`/`image_urls`/`selected_*_color` fields) even though the server (`GET /api/business/analyze-website`) already returns the new array-based shape (confirmed live during Phase 47's verification). This phase MUST reshape `BrandingResult` and `buildBrandingPreview` to match the new GET response — this was explicitly deferred from Phase 47 to this phase.
- `app/api/business/analyze-website/route.ts` — GET handler is the source of truth for the current response shape (`logo_candidates`, `image_urls`, `colors` with `role`, `selected_background_color`, `selected_accent_color`, all already live per Phase 47)
- `app/business/onboarding/StepMediat.tsx` — existing manual photo/logo upload flow (`UploadDropZone`, `existingPhotoUrls` state, 5-photo cap at `photosAtMax`). Gallery selections from pre-vaihe must flow into this component's `existingPhotoUrls`-equivalent state without duplicating upload logic.
- `app/api/business/onboarding/submit/route.ts` — the submit route quick-accept (D-10/D-11) calls UNMODIFIED; reads `onboarding_draft` joined with `liikuntapaikat`, requires `business_paikka_links` ownership, resets `claim_status` to `pending`, deletes the draft
- `app/api/business/onboarding/save-step/route.ts` (referenced by `StepMediat.tsx`'s `handleNext`) — the existing pattern for writing into `onboarding_draft` field-by-field; quick-accept's draft-mapping step (D-11) should follow this same draft shape
- `app/components/DiagonaalKortti.tsx` — already accepts a `brandColor` prop (Phase 46); this phase's color picker selections should ultimately drive this prop via the reshaped `BrandingResult`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `getContrastColor` (`lib/branding/brandingResult.ts`) — YIQ contrast utility, reusable for any text-on-swatch legibility need in the new color picker UI.
- `UploadDropZone` / `UploadProgressBar` (`app/business/onboarding/`) — existing upload UI primitives; do not duplicate for the new gallery/logo pickers, which are selection-from-existing-URLs UIs, not upload UIs.
- `hinnastaToHintaKuvaus` (`lib/onboardingUtils.ts`) — converts price arrays to the draft's string format; needed for D-11's raw_analysis → draft mapping.

### Established Patterns
- JWT verification at every route boundary: `supabaseAdmin.auth.getUser(token)` → 401 on failure. The new PATCH route follows this exactly (same as `analyze-website`, `submit`, `save-step`).
- Ownership check via `business_paikka_links` with `.eq('business_account_id', ...).eq('paikka_id', ...)` — repeated pattern across `analyze-website`, `submit`, `update-paikka`. The PATCH route's ownership check (D-08) follows this exactly.
- `onConflict: 'business_account_id,paikka_id'` UPSERT pattern (Phase 47) — the PATCH route's writes to `business_branding` should use the same composite key.
- Finnish-language UI copy throughout (`Hyväksy ja lähetä`, `Tausta`, `Aksentti` are placeholder Finnish labels in this CONTEXT — exact final copy is Claude's discretion within the project's established Finnish vocabulary).

### Integration Points
- `AnalysoiSivusto.tsx`'s `onConfirm` prop currently takes `(brandingData: BrandingResult) => void` and is called from "Jatka velhoon →". A new quick-accept path needs its own callback or an extended `onConfirm` signature — Claude's discretion on exact prop shape, but it must NOT change `onSkip`'s existing behavior.
- Phase 49 (`PREV-02`/`PREV-03`) depends on this phase's logo/color selection existing — the contrast-safe logo primitive Phase 49 builds will consume `selected_background_color` set here.
- Phase 51 (live preview) depends on this phase's final selection data shape — building live preview before this phase's shape stabilizes would mean rework (per STATE.md's existing "Active Decisions").

</code_context>

<specifics>
## Specific Ideas

- Quick-accept button label (placeholder, Claude's discretion on exact Finnish copy): "Hyväksy ja lähetä" — distinct from the existing "Jatka velhoon →".
- Color slot labels (placeholder): "Tausta" (background) / "Aksentti" (accent) — matches existing Finnish UI vocabulary conventions (CLAUDE.md design guidelines).
- The gallery picker, logo picker, and color picker should visually fit within `AnalysoiSivusto.tsx`'s existing `.glass rounded-2xl` card structure and `LabelCaps` section-header pattern already used for "Logo" / "Brändivärit" / "Hinnat" / "Aukioloajat" sections in the current preview render.

</specifics>

<deferred>
## Deferred Ideas

- Modifying `submit/route.ts` itself (a `submission_type` flag approach) — explicitly rejected in favor of D-10/D-11's unmodified-route + draft-mapping approach.
- FLOW-01 (StepPaikka reorder) and FLOW-04 (draft migration after reorder) — remain Phase 50 scope, unaffected by this phase's quick-accept work.
- `StepEsikatselu.tsx` CalloutCard swap and contrast-safe logo primitive — explicitly Phase 49 scope (PREV-02/PREV-03), not touched here even though this phase produces the color/logo data Phase 49 will render.
- Live preview during wizard editing — explicitly Phase 51 scope (LIVEPREV-01–04), sequenced after this phase per STATE.md's existing dependency note.

</deferred>

---

*Phase: 48-Logo-, väri- ja galleriavalinta*
*Context gathered: 2026-06-16*
