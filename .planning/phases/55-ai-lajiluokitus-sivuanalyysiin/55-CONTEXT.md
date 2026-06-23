# Phase 55: AI-lajiluokitus sivuanalyysiin - Context

**Gathered:** 2026-06-23
**Status:** Ready for planning

<domain>
## Phase Boundary

The onboarding AI website-analysis pipeline (`lib/branding/analyzer.ts` + `lib/branding/prompt.ts`, surfaced in `app/business/onboarding/AnalysoiSivusto.tsx`) gains a sport-category suggestion: Claude proposes a `lib/lajit.ts` taxonomy key based on the scraped site, the user sees it as a distinct suggestion element, confirms or changes it, and only the confirmed value is ever written to `liikuntapaikat.laji`.

Requirements: AI-06.

Today `liikuntapaikat.laji` is hardcoded to `'Muu'` at creation (`app/api/business/create-paikka/route.ts:63`) and **nothing ever overwrites it** — `submit/route.ts`'s UPDATE doesn't touch `laji` at all. This phase adds the first real write path for `laji` during onboarding, gated on explicit user confirmation (success criterion 3). It does not touch `claim-paikka` (existing-place claim flow keeps whatever `laji` that place already had) or the consumer-facing filter/map components — only the business onboarding create-from-scratch path.

</domain>

<decisions>
## Implementation Decisions

### Suggestion UI & confirmation interaction
- **D-01:** In `AnalysoiSivusto.tsx`'s `preview` phase (`PreviewPhaseContent`/`editContent`), add a distinct suggestion card — separate from the logo/color/gallery pickers — showing "Ehdotettu laji: {label}" with two explicit actions: **Vahvista** (accept the AI's pick) and **Vaihda** (opens the category picker). This is a new interaction pattern on this screen (logo/colors use pre-selected-and-changeable pills/swatches instead), chosen deliberately because the ROADMAP calls for an "erottuva ehdotus-elementti" (a distinguishable suggestion element), not a blended pre-filled control.
- **D-02:** "Vaihda" opens a picker listing all 9 `lib/lajit.ts` taxonomy categories (padel, tennis, jooga, kuntosali, uinti, kiipeily, jääkiekko, liikuntahalli, liikunta) **plus a free-text input** for categories not on the list. The free-text path is a user-facing escape hatch only — see D-07, Claude's own suggestion must never be free text.
- **D-03 (fallback):** If Claude's analysis omits `laji`, returns a value outside the 9 taxonomy keys, or the site gives no sport-specific signal, the suggestion card does NOT show a pre-confirmed pick — render it in an "unconfirmed" state (no taxonomy label, no "Vahvista" target) that forces the user into the Vaihda picker (taxonomy list + free text) before they can continue. Never silently default to `'liikunta'`/`'liikuntahalli'`/`'Muu'`.

### Where Claude's suggestion comes from
- **D-07:** `lib/branding/prompt.ts`'s `BRANDING_ANALYSIS_PROMPT` gets a new `laji` field added to its JSON schema, with the prompt enumerating the exact 9 `lib/lajit.ts` keys as the only valid values (or `null`/omitted if uncertain) — mirrors the existing `type`/`role` enum-constrained fields for `logos`/`colors`. `lib/branding/analyzer.ts`'s `analyzeWithClaude` validates the returned value against the same 9-key allowlist (same pattern as `VALID_LOGO_TYPES`/`VALID_COLOR_ROLES`), discarding anything that doesn't match rather than passing through arbitrary text — satisfies AI-06/criterion 1 ("ei vapaata tekstiä"). `BrandingAnalysisResult`/`BrandingResult` gain a `suggested_laji: string | null` field (analogous to `logo_type`).

### Persistence timing
- **D-04:** `laji` is added to `app/api/business/onboarding/save-step/route.ts`'s `ALLOWED_FIELDS` (alongside `media_urls`/`hinnasto`/`aukioloajat`/`yhteystiedot`) and to `app/api/business/onboarding/submit/route.ts`'s `liikuntapaikat` UPDATE — same deferred-to-submit pattern as every other onboarding field. No immediate autosave PATCH (unlike `selected_logo_url`/`selected_background_color`, which use `PATCH /api/business/branding`) — confirming/changing laji in the UI writes to `onboarding_draft` via `save-step`, and only lands in `liikuntapaikat.laji` when the user finishes the whole flow via `submit`. This satisfies success criterion 3 (no write to `liikuntapaikat.laji` without explicit confirmation) by construction: the draft column is never read by `submit` unless it was set, and it's only ever set by an explicit Vahvista/Vaihda action.
- Both the quick-accept path (`AnalysoiSivusto.handleQuickAccept`'s `fieldsToWrite`) and the "Jatka velhoon" full-wizard path need the confirmed `laji` value included in their `save-step` writes — `handleQuickAccept` adds a `{ field: 'laji', value: confirmedLaji }` entry to its existing sequential `fieldsToWrite` loop; the full-wizard path needs the same `save-step` call wired in (likely from `page.tsx`'s `handleConfirm`, alongside its existing `media_urls` write — see Claude's Discretion).

### Re-analysis & skip-path edge interactions
- **D-05:** "Analysoi uudelleen" resets the confirmed/unconfirmed laji selection exactly like it already resets `selectedLogoUrl`/`bgColor`/`accentColor` (see `onReanalyze`'s reset block) — a fresh analysis re-suggests from scratch rather than preserving a stale pick across re-runs.
- **D-06:** The "Ohita" (skip analysis entirely) path also needs a manual category picker — otherwise `laji` stays permanently `'Muu'` with zero way to fix it anywhere in the app, which conflicts with the spirit of this phase. Reuse the same Vaihda picker UI (9 taxonomy categories + free text) without an AI suggestion badge, since there is no AI pick to show. Exact placement (e.g. inside `StepPaikka`, a small addition to the wizard, or shown right where `onSkip` currently fires) is left to the planner — see Claude's Discretion.

### Claude's Discretion
- Exact placement/component for the skip-path manual picker (D-06) — must reuse the same taxonomy-list-plus-free-text UI as the Vaihda picker, must write through the same `laji` `save-step` field, and must be presented before final submit. Whether it's a new small step component or an addition to an existing one (e.g. `StepPaikka`) is an implementation choice.
- Exact wiring of the full-wizard path's `laji` write (which component/handler calls `save-step` with `field: 'laji'` when the user clicks "Jatka velhoon →") — likely `page.tsx`'s `handleConfirm`, following the existing `media_urls` write's await-before-navigate pattern, but left to the planner.
- Visual styling of the suggestion card and the Vaihda picker (badge shape, picker as modal/dropdown/inline pill list) — follow CLAUDE.md's glassmorphism system and existing `editContent` patterns (LabelCaps, PrimaryButton/MutedButton) in `AnalysoiSivusto.tsx`; no new visual language.
- Whether `suggested_laji` validation happens entirely in `analyzeWithClaude` (server) or also re-validated client-side before persisting — server-side allowlist validation is required (D-07); client-side defense-in-depth is optional.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap / requirements
- `.planning/ROADMAP.md` §"Phase 55: AI-lajiluokitus sivuanalyysiin" — exact goal and 4 success criteria (criterion 4: existing logo/color/price/hours extraction must stay regression-free even if Claude's response omits the laji field).
- `.planning/REQUIREMENTS.md` — AI-06.

### Existing code to reuse / integrate with
- `lib/lajit.ts` — the 9-key taxonomy (`lajiKonfig` record) that both Claude's suggestion and the user-facing picker must draw from. No `'Muu'` key exists here today.
- `lib/branding/prompt.ts` — `BRANDING_ANALYSIS_PROMPT`, the versioned prompt string sent to Claude; needs a new `laji` field added to its JSON schema/field-rules sections, enum-constrained to the 9 taxonomy keys (mirrors the existing `logos[].type`/`colors[].role` enum pattern).
- `lib/branding/analyzer.ts` — `analyzeWithClaude`/`BrandingAnalysisResult`; needs a `suggested_laji: string | null` field with the same allowlist-validation pattern as `VALID_LOGO_TYPES`/`VALID_COLOR_ROLES` (lines 41-42, validation logic at steps 6-7 of the function).
- `lib/branding/brandingResult.ts` — `BrandingResult` client-safe type; needs `suggested_laji` added to mirror the GET response shape (same pattern as `logo_type`).
- `app/api/business/analyze-website/route.ts` — GET handler's `.select(...)` column list and response shape; the `business_branding` table/UPSERT in `runAnalysis` needs a `suggested_laji` column to persist Claude's raw suggestion (separate from the confirmed value, which lives in `onboarding_draft.laji` per D-04).
- `app/business/onboarding/AnalysoiSivusto.tsx` — `PreviewPhaseContent`'s `editContent` (lines ~187-484) is where the new suggestion card slots in, alongside the existing logo/color/gallery pickers. `handleQuickAccept`'s `fieldsToWrite` array (lines ~705-710) needs a `laji` entry added.
- `app/api/business/onboarding/save-step/route.ts` — `ALLOWED_FIELDS` (line 6) needs `'laji'` added; needs a validator analogous to `isValidAukioloajat` if laji values need shape-checking (likely just "non-empty string", since free text is allowed per D-02).
- `app/api/business/onboarding/submit/route.ts` — the `liikuntapaikat` UPDATE (lines ~75-87) needs `laji: draft.laji ?? undefined` (or similar) added — must NOT overwrite the existing value with null/undefined when the draft never set it, to avoid silently reverting a venue back to `'Muu'` for users on flows that bypass the new picker.
- `app/api/business/create-paikka/route.ts:63` — the hardcoded `laji: 'Muu'` insert this phase's confirmed-value write eventually supersedes (but does not remove — it's still the correct initial value before any AI suggestion or manual confirmation has happened).
- `app/business/onboarding/StepPaikka.tsx` — candidate location for D-06's skip-path manual picker (currently has no laji UI at all; `PaikkaBase`-shaped prop only has `nimi`/`osoite`/`kaupunki`).
- `app/business/onboarding/page.tsx` — `handleConfirm` (the "Jatka velhoon" callback) is where the full-wizard path's `laji` save-step write likely belongs, following the existing `media_urls` await-before-navigate pattern (lines ~171-212).
- `lib/branding/brandingResult.ts`'s `buildBrandingPreview` — already maps `paikkaBase.laji` straight through into the preview object; once `laji` is correctly set upstream, no change needed here.

### Prior-phase context relevant here
- `.planning/phases/54-sijainti-karttapinni-osoitehaku-onboardingissa/54-CONTEXT.md` — most recent prior phase; not directly coupled (Phase 55 is independent of 53/54 per ROADMAP dependency notes), but confirms the create-from-scratch onboarding path (`ClaimSearchForm` → `create-paikka` → `StepPaikka` → `AnalysoiSivusto` → wizard) this phase plugs into.
- CLAUDE.md — glassmorphism design system (`.glass`, `.glass-btn`) and 4-size/2-weight typography rules apply to the new suggestion card and picker UI.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- The `VALID_LOGO_TYPES`/`VALID_COLOR_ROLES` allowlist-and-filter pattern in `analyzer.ts` (steps 6-7) is the direct template for validating `suggested_laji` against `lib/lajit.ts`'s 9 keys.
- `AnalysoiSivusto.tsx`'s existing logo-candidate picker (button grid with `border-[#111111] ring-2 ring-[#111111]` selected state) and `LabelCaps`/`PrimaryButton`/`MutedButton` sub-components are the established visual vocabulary for the new suggestion card and Vaihda picker.
- The `onReanalyze` reset block (resets `selectedLogoUrl`/`bgColor`/`accentColor`/`selectedGallery` and `selectionInitialisedRef`) is the direct template for D-05's laji-reset-on-reanalyze behavior.

### Established Patterns
- Two persistence patterns coexist on this screen: immediate autosave PATCH (`patchBranding`, used for logo/colors/gallery, hits `/api/business/branding`) vs. deferred draft-then-submit (used for prices/hours/contact via `save-step`, hits `onboarding_draft`). D-04 deliberately puts `laji` in the second bucket.
- `handleQuickAccept`'s sequential `fieldsToWrite` loop is explicitly documented as "RECOVERABLE by design" via idempotent UPSERT retry — adding a `laji` entry follows the same idiom, no new error-handling needed.

### Integration Points
- `business_branding` table needs a new `suggested_laji` column (separate from `onboarding_draft.laji`, which holds the user-confirmed value) — a migration is required, following whatever pattern Phase 47/48's `business_branding` schema additions used.
- `onboarding_draft` table needs a `laji` column added (string, nullable) if it doesn't already have a spare JSONB/text slot.

</code_context>

<specifics>
## Specific Ideas

No specific visual mockup was provided. The suggestion card and Vaihda picker should look like a natural extension of the existing logo-candidate/color-swatch pickers in `AnalysoiSivusto.tsx` — same glass card, same button/badge vocabulary, no new visual language.

</specifics>

<deferred>
## Deferred Ideas

None — the skip-path manual picker (D-06) was initially flagged as a possible scope-creep candidate but the user explicitly chose to include it, since the alternative (`laji` permanently stuck at `'Muu'` for anyone who skips AI analysis) directly undermines this phase's own success criteria.

### Reviewed Todos (not folded)
None — `todo.match-phase` returned 0 matches for Phase 55.

</deferred>

---

*Phase: 55-ai-lajiluokitus-sivuanalyysiin*
*Context gathered: 2026-06-23*
