# Phase 49: Esikatselu- ja kontrastikorjaukset - Context

**Gathered:** 2026-06-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Two independent bugfixes to existing onboarding/preview UI, no new capabilities:

1. **Step 6 card swap (PREV-02):** `StepEsikatselu.tsx`'s first preview section currently renders `PaikkaKortti` (a component unused anywhere live) — swap it for `CalloutCard`, the component actually used on the live map (`Etusivu.tsx`, `app/business/map/page.tsx`). `DiagonaalKortti` and `PaikkaSheet` preview sections in the same file are untouched.
2. **Logo contrast fix (PREV-03), narrowed scope:** Only `AnalysoiSivusto.tsx`'s logo-candidate picker (`'preview'` phase, ~line 585-623) has a real contrast bug — each candidate's `<img>` sits directly on the white `.glass` card with no backdrop, so white/transparent logos vanish. `DiagonaalKortti` and `PaikkaSheet` already render `logo_url` safely (their logo boxes sit inside a user-selected `brandColor`/translucent background from Phase 48) and are explicitly NOT touched in this phase.

REQUIREMENTS.md PREV-03 and ROADMAP.md Phase 49 success criterion 2 were both reworded 2026-06-17 to reflect this narrowed scope (originally said "everywhere logo_url renders").

</domain>

<decisions>
## Implementation Decisions

### Step 6 CalloutCard swap
- **D-01:** Swap only the first preview slot in `StepEsikatselu.tsx` — replace `<PaikkaKortti paikka={draftAsPaikka} />` with `<CalloutCard p={...} />`. Leave the `DiagonaalKortti` and `PaikkaSheet` sections below it untouched. Relabel that section's caption (currently `t('previewLabelCard')`, rendered as "listakortti"-style text) to something accurate for a map-callout card — exact FI copy is Claude's discretion.
- **D-02:** `CalloutCard` requires `p: Liikuntapaikka & { latitude: number; longitude: number }` (non-null), but `draftAsPaikka`'s coordinates can be `null` (venue not yet geocoded). The user confirmed this card is shown purely as a static visual mockup in Step 6 — it is never placed on an actual map there, and `CalloutCard`'s own render logic never reads `p.latitude`/`p.longitude` (confirmed by reading the component: it only uses `nimi`, `laji`, `hinta_min/max`, `hinta_kuvaus`). So the fix is purely a type-satisfaction shim: pass through real coordinates when present, otherwise pass a dummy value (e.g. `0`) — no special "missing coordinates" UI variant is needed, and no separate fallback card design. Do not build a placeholder/empty-state component for this.

### Logo-candidate picker contrast fix
- **D-03:** Build one shared contrast-safe logo display primitive (e.g. a small `LogoThumbnail`/`ContrastSafeLogo` component) and use it specifically inside `AnalysoiSivusto.tsx`'s logo-candidate picker buttons (replacing the bare `<img src={candidate.url} ... />` at ~line 611). This is the only call site for this phase — do not refactor `DiagonaalKortti.tsx` or `PaikkaSheet.tsx`'s existing logo-box markup; their contrast already works via Phase 48's user-selected brand color and touching them is out of scope (and the user explicitly said so).
- **D-04:** Backdrop style: a fixed mid-gray box behind the logo thumbnail — same tint already used by `DiagonaalKortti`'s logo box (`rgba(0,0,0,0.06)`), rounded corners to match the existing picker button's `rounded-lg`. Not a checkerboard/transparency-aware pattern — keep it simple and consistent with the one existing precedent in the codebase.
- **D-05 (requirement/roadmap correction):** REQUIREMENTS.md PREV-03 and ROADMAP.md Phase 49 criterion 2 were edited in this discussion (uncommitted as of context-write; `git_commit` step will include them) to say the primitive is used in AnalysoiSivusto's logo-candidate picker specifically, not "everywhere logo_url renders" — matching D-03's scope decision.

### Claude's Discretion
- Exact component name/file location for the new shared logo-thumbnail primitive (e.g. `app/components/ContrastSafeLogo.tsx` or co-located in `app/business/onboarding/`).
- Exact Finnish caption text for Step 6's relabeled CalloutCard section (D-01).
- Whether the dummy coordinate fallback (D-02) uses `paikkaInfo?.latitude ?? 0` directly inline or a small named constant/helper — whichever is more consistent with existing code style in `StepEsikatselu.tsx`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` §PREV-02–03 — reworded 2026-06-17 to match D-05's narrowed contrast-fix scope
- `.planning/ROADMAP.md` §"Phase 49: Esikatselu- ja kontrastikorjaukset" — success criterion 2 reworded 2026-06-17 to match D-05

### Prior phase context (data shape this phase consumes)
- `.planning/phases/48-logo-v-ri-ja-galleriavalinta/48-CONTEXT.md` — D-12/D-13 color-role logic and `selected_background_color`/`selected_accent_color` that `DiagonaalKortti`'s `brandColor` prop already consumes (why its logo box doesn't need this phase's fix); `BrandingResult.logo_candidates` shape this phase's picker renders
- `.planning/phases/47-skeema-monisivuinen-scraper-putki/47-CONTEXT.md` — `logo_candidates: Array<{url, type}>` schema origin

### Existing code (read before modifying)
- `app/business/onboarding/StepEsikatselu.tsx` — Step 6 preview; lines 117-141 render the three stacked preview sections; line 123 is the `PaikkaKortti` call site to replace (D-01); `draftAsPaikka`/`brandColor` construction (lines 37-50) is what feeds all three sections
- `app/components/CalloutCard.tsx` — the swap target; confirmed it never reads `p.latitude`/`p.longitude` in its render body (D-02)
- `app/components/PaikkaKortti.tsx` — the component being removed from Step 6 (still used nowhere live — confirm this hasn't changed before deleting the import)
- `app/business/onboarding/AnalysoiSivusto.tsx` — lines 580-630, the `'preview'` phase logo-candidate picker; line 611's bare `<img>` is the exact bug site for D-03/D-04
- `app/components/DiagonaalKortti.tsx` lines 94-107 — existing logo-box pattern (`rgba(0,0,0,0.06)` backdrop) that D-04 reuses for visual consistency, but the file itself is NOT modified
- `app/components/PaikkaSheet.tsx` lines 158-170 — second existing logo-box pattern (`rgba(255,255,255,0.15)` backdrop); NOT modified, included here only so planner/researcher don't mistake it for in-scope
- `lib/onboardingUtils.ts` `PaikkaBase` type (lines 19-27) — confirms `latitude`/`longitude` are `number | null`, the source of D-02's type mismatch with `CalloutCard`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `DiagonaalKortti`'s `rgba(0,0,0,0.06)` logo-box backdrop tint — reused (not abstracted into a shared component) as the visual reference for D-04's new primitive's backdrop color.

### Established Patterns
- Three-section stacked preview pattern in `StepEsikatselu.tsx` (each section: `LabelCaps`-style uppercase caption + the rendered card) — D-01 keeps this pattern, just swaps one card type.
- `.glass rounded-2xl` card surface + `border-[rgba(0,0,0,0.12)]` button border in `AnalysoiSivusto.tsx`'s picker buttons — the new logo-thumbnail primitive should nest inside this existing button markup, not replace it.

### Integration Points
- `CalloutCard` import already exists nowhere in `StepEsikatselu.tsx` or `AnalysoiSivusto.tsx` — this phase adds the first import of `CalloutCard` outside `Etusivu.tsx`/`app/business/map/page.tsx`.
- The new logo-thumbnail primitive only needs `logo_candidates[].url` (a string) as input — no dependency on `BrandingResult`'s other fields, so it can be a small presentational component with a single `src`/`alt` prop, not branding-aware.

</code_context>

<specifics>
## Specific Ideas

- Logo-thumbnail backdrop: match `DiagonaalKortti`'s exact tint (`rgba(0,0,0,0.06)`) — explicit user preference for consistency with an existing precedent rather than inventing a new visual treatment.
- CalloutCard in Step 6 is purely decorative/static there — never wired to real map/position logic, confirmed explicitly by the user ("Calloutcard shouldn't be in the map on previews... user should just see the visual look of the actual card").

</specifics>

<deferred>
## Deferred Ideas

- Refactoring `DiagonaalKortti.tsx`/`PaikkaSheet.tsx` to use the new shared logo primitive for architectural consistency — explicitly rejected by the user this phase; their contrast already works via Phase 48's brand color selection. Revisit only if a future phase reports an actual contrast bug in either component.
- A dedicated "missing coordinates" placeholder/empty-state UI for Step 6 — rejected; D-02's dummy-coordinate type shim is sufficient since `CalloutCard` never reads coordinates in its render logic.

None — discussion stayed within phase scope otherwise.

</deferred>

---

*Phase: 49-Esikatselu- ja kontrastikorjaukset*
*Context gathered: 2026-06-17*
