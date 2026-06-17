---
phase: 49-esikatselu-ja-kontrastikorjaukset
reviewed: 2026-06-17T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - app/components/ContrastSafeLogo.tsx
  - app/business/onboarding/AnalysoiSivusto.tsx
  - app/business/onboarding/StepEsikatselu.tsx
  - messages/fi.json
  - messages/en.json
findings:
  critical: 0
  warning: 2
  info: 2
  total: 4
status: issues_found
---

# Phase 49: Code Review Report

**Reviewed:** 2026-06-17
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Phase 49 makes two small, well-scoped UI fixes: (1) a new `ContrastSafeLogo` presentational primitive wraps logo candidates in `AnalysoiSivusto.tsx`'s picker in a `rgba(0,0,0,0.06)` backdrop so white/transparent logos are visible, and (2) `StepEsikatselu.tsx`'s Step 6 preview swaps the unused `PaikkaKortti` for the live-map `CalloutCard`, with a coordinate type-shim (`?? 0`) and a new `previewLabelCallout` i18n key.

Both plans were executed essentially as specified. `npx tsc --noEmit` passes clean, the diffs are minimal (31 insertions / 10 deletions across 5 files), `previewLabelCard` is untouched and still used by `PreviewModal.tsx`, and `DiagonaalKortti.tsx`/`PaikkaSheet.tsx` are byte-for-byte unchanged as required. No critical defects (security, data loss, crashes) were found. Two warnings concern minor robustness/accessibility gaps in the new component and one stale code comment; two info items note small inconsistencies versus the sibling pattern this primitive was modeled on.

## Warnings

### WR-01: ContrastSafeLogo has no guard against empty/falsy `src`

**File:** `app/components/ContrastSafeLogo.tsx:14-23`
**Issue:** The component renders `<img src={src} ...>` unconditionally. `candidate.url` comes from `BrandingResult.logo_candidates`, an AI/scraper-derived field typed `Array<{ url: string; type: string }>` — the type system guarantees a `string` but not a non-empty, well-formed URL. If the upstream pipeline ever returns an empty string or a malformed value for `url` (e.g. a partial scrape result), the `<img>` will silently render a broken-image icon inside the gray backdrop box rather than failing gracefully or being filtered out before reaching this component. This isn't a new bug introduced by this phase (the bare `<img>` it replaces had the same exposure), but the new component is the right place to harden against it since it is now the single point of contrast-safe logo rendering.
**Fix:** Either guard at the call site (filter `logo_candidates` to truthy non-empty `url` before `.map()`), or add a minimal defensive check in the component, e.g.:
```tsx
if (!src) return null
```

### WR-02: Stale/inaccurate leading comment after caption relabel

**File:** `app/business/onboarding/StepEsikatselu.tsx:118`
**Issue:** The leading comment for the first preview section reads `{/* KARTTAKORTTI */}`, mirroring the FI translation value. This matches the plan's instruction ("Optionally update... to `{/* KARTTAKORTTI */}`"), but it's slightly misleading as in-code documentation because it hardcodes the Finnish-only display string as a structural label, while the actual i18n key is `previewLabelCallout`. The sibling comments `{/* DIAGONAALIKORTTI */}` and `{/* PROFIILISIVU */}` follow the same pre-existing (Finnish-string-as-comment) convention, so this isn't a regression, but it's worth flagging since a future EN-only contributor reading the source has no comment hint to the actual i18n key name.
**Fix:** Not blocking — optionally change comments project-wide to reference the i18n key directly (e.g. `{/* previewLabelCallout */}`) in a future cleanup, consistent across all three sections.

## Info

### IN-01: ContrastSafeLogo omits `aria-hidden` present in the pattern it mirrors

**File:** `app/components/ContrastSafeLogo.tsx:20`
**Issue:** The component this primitive is explicitly modeled on, `DiagonaalKortti.tsx` (lines 96-103), renders its logo `<img>` with both `alt=""` and `aria-hidden` for purely decorative images. `ContrastSafeLogo` only sets `alt={alt ?? ''}` without `aria-hidden`. For a purely decorative logo thumbnail (the adjacent `<span>` already conveys `candidate.type` as the text label), some screen readers/AT may still attempt to announce an empty-alt image's presence or fall back to filename-based announcements in edge cases (browser-dependent). This is a minor a11y consistency gap versus the precedent pattern the plan explicitly cites.
**Fix:**
```tsx
<img src={src} alt={alt ?? ''} aria-hidden={!alt} className="h-full w-auto object-contain" />
```

### IN-02: `key={candidate.url}` risks duplicate React keys if the AI pipeline ever returns two candidates with the same URL

**File:** `app/business/onboarding/AnalysoiSivusto.tsx:602`
**Issue:** Not introduced by this phase (pre-existing pattern, untouched by either plan), but worth noting since this phase touched the immediately adjacent line. `brandingResult.logo_candidates` is typed `Array<{ url: string; type: string }>` with no uniqueness guarantee on `url` from the analyzer. If two candidates (e.g. one detected via `<link rel="icon">` and one via OG image scraping) happen to resolve to the identical URL, React will warn about duplicate keys and only one will render/react to clicks correctly.
**Fix:** Use a composite key, e.g. `key={`${candidate.type}-${candidate.url}`}`, or dedupe candidates by URL before rendering. Out of this phase's scope to fix, but flagging since it sits one line above the changed code.

---

_Reviewed: 2026-06-17_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
