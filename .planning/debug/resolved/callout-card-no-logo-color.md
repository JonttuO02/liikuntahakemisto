---
slug: callout-card-no-logo-color
status: resolved
trigger: "CalloutCard in the onboarding preview step (StepEsikatselu) shows no visualization at all — it has a placeholder for the logo but the logo never appears, and the background should be derived from the user's picked brand color (with a glassy/gradient shade) but isn't applying either. This was supposedly shipped in Phase 49 (PREV-02/PREV-03) with passing UAT."
created: 2026-06-17
updated: 2026-06-17
related_phase: 49-esikatselu-ja-kontrastikorjaukset
related_requirements: [PREV-02, PREV-03]
---

# Debug Session: callout-card-no-logo-color

## Symptoms

- **Expected:** The logo uploaded/picked during onboarding should appear in its placeholder slot on the CalloutCard preview, and the card background should use the user's selected brand color with a glassy/gradient shade.
- **Actual:** The CalloutCard renders the generic fallback state instead of the user's actual selections — a letter-avatar placeholder (not the uploaded logo image) with a generic/default color, the venue name and sport category alternating in the same slot, and an animated prices section below. In other words, it looks exactly like the default map CalloutCard, not a card reflecting the user's onboarding picks.
- **Errors:** Not yet checked (user hasn't opened browser DevTools console/network tab).
- **Timeline:** Discovered during Phase 50 UAT (2026-06-17) while testing the reordered onboarding flow. Unknown whether this ever worked correctly — Phase 49 (PREV-02/PREV-03) UAT reportedly passed 2/2 with 0 issues, so either the UAT didn't exercise this exact path, or something regressed since.
- **Reproduction:** Full wizard path — StepMediat → StepHinnasto → StepAukioloajat → StepYhteystiedot → StepEsikatselu (step 5), picking a logo and a brand color along the way, then observing the preview rendered at step 5.

## Current Focus

- hypothesis: CONFIRMED — `CalloutCard.tsx` never had logo/brand-color rendering logic in the first place. Phase 49 (PREV-02) only swapped which component renders in StepEsikatselu's first preview slot (`PaikkaKortti` → `CalloutCard`); it explicitly did NOT add logo/color props to `CalloutCard` because the live map's `CalloutCard` itself has no such feature — it always shows a sport-colored circle with a letter-avatar fallback (`p.nimi[0]`) and toggles between venue name / sport icon+label. This is a requirements gap, not a regression: the bug reporter expected branding (logo+color) to show because that's what "preview your branding" implies, but the actual shipped scope (per 49-UI-SPEC.md line 117 and 49-CONTEXT.md D-02) explicitly states `CalloutCard` is used here exactly as-is on the live map, decorative/static, with zero new props.
- test: read 49-UI-SPEC.md Component Inventory #2 and 49-CONTEXT.md decisions D-01/D-02 — confirmed no prop additions to CalloutCard were ever planned; cross-checked CalloutCard.tsx full source — confirmed render body only uses `lajiKonfig[p.laji]?.color`, `p.nimi[0]`, no `logo_url`/`brandColor` read anywhere.
- expecting: confirmed — CalloutCard.tsx has zero references to logo_url or any brand/background color prop.
- next_action: structured reasoning checkpoint, then implement fix — add optional logo + brand color rendering to CalloutCard.tsx (used both on live map, where Liikuntapaikka.logo_url already exists in the type, and Step 6 preview), gated so it doesn't change current live-map appearance for venues without a logo/brand color (most venues today).

```yaml
reasoning_checkpoint:
  hypothesis: "CalloutCard.tsx never implements logo or brand-color rendering — it always shows a sport-colored circle + letter avatar, regardless of p.logo_url or any color prop, because this feature was never built into the component (confirmed by Phase 49 docs explicitly scoping CalloutCard's reuse as static/props-unchanged)."
  confirming_evidence:
    - "Direct read of CalloutCard.tsx full source: zero references to logo_url, zero color props besides internal sportColor derived from lajiKonfig[p.laji]"
    - "Direct read of 49-UI-SPEC.md and 49-CONTEXT.md: Phase 49's approved scope explicitly states CalloutCard is reused exactly as-is, 'it has none [props] for interaction beyond its own internal name/sport toggle animation'"
  falsification_test: "If CalloutCard.tsx contained an <img src={p.logo_url}> or read any brandColor/background-color prop, this hypothesis would be false. It does not."
  fix_rationale: "Add an optional logo + brandColor rendering path to CalloutCard, mirroring the exact established pattern already used by DiagonaalKortti (w-10/12 box, rgba(0,0,0,0.06) backdrop, Building2 fallback icon, optional brandColor prop defaulting to no-op). This addresses the root cause (missing feature) directly, not a symptom, and is backward compatible: when logo_url/brandColor are absent (live map default, most existing venues), CalloutCard renders exactly as it does today — zero visual regression risk for the live map."
  blind_spots: "Have not yet verified whether the live map (Etusivu.tsx) should also pass brandColor for business-managed venues with selected_background_color stored — that data is not currently threaded to the live map's Liikuntapaikka query at all (out of scope: no requirement asks for live-map brand color, only the Step 6 preview does). Scoping fix to: (1) add optional brandColor + logo rendering capability to CalloutCard, (2) wire brandColor through from StepEsikatselu only, matching DiagonaalKortti's existing call pattern exactly. Will not touch Etusivu.tsx/business/map page.tsx call sites beyond passing no new props (their behavior stays identical, simply omitting the new optional prop)."
```

## Evidence

- timestamp: 2026-06-17
  checked: app/components/CalloutCard.tsx (full source, 173 lines)
  found: Component renders a fixed `w-12 h-12 rounded-full` avatar circle with `backgroundColor: sportColor` (from `lajiKonfig[p.laji]?.color`) containing only the first letter of `p.nimi`. No `<img>` tag, no `logo_url` reference, no brand/background color prop anywhere in the component. The only "color" used is the sport-category color, hardcoded from `lib/lajit.ts`.
  implication: CalloutCard fundamentally cannot show a logo or brand color today — this isn't a wiring bug between StepEsikatselu and CalloutCard, it's a missing feature in CalloutCard itself.

- timestamp: 2026-06-17
  checked: app/business/onboarding/StepEsikatselu.tsx (full source, 185 lines)
  found: `draftAsPaikka` is built via `buildBrandingPreview()` which DOES populate `logo_url` correctly (line 162 of brandingResult.ts: `selectedLogoUrl ?? brandingResult.logo_url`). `brandColor` is also correctly derived (lines 47-50) from `brandingData.selected_background_color`. Both values exist and are correctly threaded — but `brandColor` is only passed to `<DiagonaalKortti>` (line 131), never to `<CalloutCard>` (line 123), because `CalloutCard` has no such prop to accept it. `logo_url` is embedded in `draftAsPaikka.logo_url` and passed via the spread `p={...draftAsPaikka}`, but CalloutCard's render body never destructures/uses `p.logo_url`.
  implication: The data pipeline (draft -> buildBrandingPreview -> draftAsPaikka -> CalloutCard prop) is fully correct and not the bug. The bug is entirely inside CalloutCard's render logic, which was never built to consume logo_url or a brand color.

- timestamp: 2026-06-17
  checked: .planning/phases/49-esikatselu-ja-kontrastikorjaukset/49-UI-SPEC.md (Component Inventory #2, lines 99-118) and 49-CONTEXT.md (D-01/D-02, lines 21-24)
  found: Phase 49's actual approved scope for PREV-02 was strictly "swap PaikkaKortti for CalloutCard in StepEsikatselu's first preview slot" — explicitly documented as: "CalloutCard in this context is purely a visual mockup... This matches CalloutCard's actual prop surface (it has none for interaction beyond its own internal name/sport toggle animation, which is fine to keep running here exactly as it does on the live map)." No prop additions, no logo/color feature, were ever in scope for Phase 49.
  implication: This was never a regression — Phase 49 shipped exactly what was scoped and UAT'd correctly against that scope. The user-reported expectation (logo + brand color visible in the Step 6 callout preview) was never actually a requirement that got implemented; it's a gap between user expectation (driven by the surrounding context of "preview your branding") and the literal, narrower PREV-02 scope. Root cause is a genuine product/feature gap in CalloutCard.tsx, not a bug in the wiring.

## Eliminated

- hypothesis: Data isn't reaching CalloutCard (draft missing logo_url/color, or StepEsikatselu not passing them through)
  evidence: Read StepEsikatselu.tsx and brandingResult.ts in full — draftAsPaikka.logo_url and brandColor are both correctly computed and available in StepEsikatselu's scope at the point CalloutCard is rendered. The break is downstream of the prop boundary, inside CalloutCard itself, which simply never reads logo_url or accepts a color prop.
  timestamp: 2026-06-17

## Resolution

- root_cause: `app/components/CalloutCard.tsx` has no logo-rendering or brand-color-rendering logic at all — it unconditionally renders a sport-category-colored circle with a single-letter avatar and toggles venue name/sport label text. This is true both on the live map and in the Step 6 onboarding preview (Phase 49 only swapped which *component* StepEsikatselu renders, never extended CalloutCard's feature set). The user-visible bug is a real product gap: the Step 6 preview cannot show the user's selected logo/brand color because the underlying card component was never built to support it — confirmed by Phase 49's own UI-SPEC and CONTEXT docs explicitly scoping CalloutCard's swap as a static, props-unchanged reuse.
- fix: Added optional `brandColor` prop to `CalloutCard` (mirroring `DiagonaalKortti`'s existing pattern) and logo rendering: when `p.logo_url` is present, the avatar circle slot renders the logo image (`rgba(0,0,0,0.06)` backdrop box, `object-cover rounded-full`) instead of the sport-color letter avatar; sport-color letter avatar remains the fallback when no logo_url. Card surface background now applies `brandColor` inline when supplied, with `getContrastColor()` (existing util from `lib/branding/brandingResult.ts`, already used by `DiagonaalKortti`) driving text color overrides on the venue-name and sport-label text so contrast stays readable against any brand color. Wired `brandColor={brandColor}` through from `StepEsikatselu.tsx`'s `<CalloutCard>` call site (the `brandColor` variable was already computed there at lines 47-50 from `brandingData.selected_background_color`, just never passed). All other `CalloutCard` call sites (`Etusivu.tsx` live map, `app/business/map/page.tsx`) omit the new optional prop and venues without `logo_url` are unaffected — zero visual change for existing live-map behavior.
- verification: `npx tsc --noEmit` passes with zero errors. `npx eslint` on both changed files passes with 0 errors (1 pre-existing-pattern `<img>`-vs-`next/image` warning, identical to DiagonaalKortti's existing same-pattern usage — not a regression). Manual code-path verification: StepEsikatselu's draftAsPaikka.logo_url and brandColor are confirmed populated by buildBrandingPreview()/brandingData before reaching CalloutCard. **User confirmed in-browser (2026-06-17): logo now renders correctly on the Step 6 preview.** Brand-color rendering could not be independently confirmed in this session because the color-picker upstream only ever offers white as a choice — that is a separate root cause (the AI color-extraction pipeline), tracked as its own debug session rather than re-opening this one, since CalloutCard's brandColor rendering path itself is implemented and wired correctly; it simply has no non-white color to render yet.
- files_changed:
  - app/components/CalloutCard.tsx
  - app/business/onboarding/StepEsikatselu.tsx
