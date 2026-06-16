---
phase: 48-logo-v-ri-ja-galleriavalinta
plan: 01
subsystem: api
tags: [nextjs, supabase, route-handler, idor-mitigation, branding]

# Dependency graph
requires:
  - phase: 47-skeema-monisivuinen-scraper-putki
    provides: business_branding plural columns (logo_candidates, image_urls, selected_background_color, selected_accent_color) and (business_account_id, paikka_id) composite scoping
provides:
  - Unblocked 'preview' phase reachability — onboarding businesses (claim_status='pending') can now reach status='analyzed'
  - Reshaped client-safe BrandingResult type matching the live GET response 1:1
  - buildBrandingPreview accepting a user-selected logo override
  - Validated PATCH /api/business/branding autosave route (logo/color/gallery membership + ownership)
  - selected_logo_url column on business_branding
affects: [48-02-logo-color-gallery-pickers, 48-03-quick-accept]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Ownership-only business_paikka_links check (no claim_status filter) — the correct pattern for any route touched during onboarding, since claim_status stays 'pending' until post-submission admin review"
    - "Membership validation against a business's own stored analysis row before persisting a client-submitted selection (logo/color/gallery), rejecting non-member values with 400"

key-files:
  created:
    - app/api/business/branding/route.ts
    - supabase/migrations/20260616110000_business_branding_selected_logo_url.sql
  modified:
    - app/api/business/analyze-website/route.ts
    - lib/branding/brandingResult.ts
    - app/business/onboarding/AnalysoiSivusto.tsx
    - app/business/onboarding/StepEsikatselu.tsx

key-decisions:
  - "Corrected a Phase 47 (T-47-11) stale assumption: the analyze-website POST ownership check used .eq('claim_status', 'approved'), which 403s every onboarding business since links are 'pending' until post-submission admin review. Both the existing POST route (Task 0) and the new PATCH route (Task 2) now use ownership-only checks matching save-step/submit."
  - "PATCH route's color validation branches on an explicit *_source field ('ai' requires stored-colors membership; 'custom'/omitted requires well-formed #rrggbb) rather than inferring source from format, keeping the AI-vs-custom distinction explicit at the API boundary (D-09)."
  - "Added selected_logo_url as a new additive nullable TEXT column via migration, since Phase 47 added selected_background_color/selected_accent_color but not a logo equivalent."

patterns-established:
  - "Logo selection validated by exact URL membership in logo_candidates[].url before persistence — this is the only server-side gate before the value flows downstream into media_urls.logo (T-48-13)."

requirements-completed: [ONBOARD-17]

# Metrics
duration: 16min
completed: 2026-06-16
---

# Phase 48 Plan 01: Branding Data Contracts & PATCH Route Summary

**Relaxed analyze-website's POST ownership check to ownership-only (unblocking the 'preview' phase for onboarding businesses), reshaped BrandingResult to mirror the plural GET response, and added a validated PATCH /api/business/branding autosave route enforcing logo/color/gallery membership checks.**

## Performance

- **Duration:** 16 min
- **Started:** 2026-06-16T19:09:00Z
- **Completed:** 2026-06-16T19:25:31Z
- **Tasks:** 3
- **Files modified:** 6 (4 modified, 2 created)

## Accomplishments
- Removed the `claim_status='approved'` filter from `analyze-website`'s POST ownership check — onboarding businesses (`claim_status='pending'`) can now successfully trigger analysis and reach `status='analyzed'`, making the `'preview'` phase (and therefore all of Phase 48's UI) reachable for the first time
- Reshaped `BrandingResult` to mirror the live GET `.select(...)` column list exactly: plural `colors: {hex,role}[]`, `logo_candidates`, `image_urls`, `selected_background_color`, `selected_accent_color`
- `buildBrandingPreview` now accepts an optional `selectedLogoUrl` 4th argument, rendering the user's picked logo when provided while preserving the existing `logo_url` fallback for callers that omit it
- Created `PATCH /api/business/branding`: JWT auth, ownership-only check, logo-candidate membership validation (the load-bearing IDOR/tampering control per T-48-13), AI-color membership validation, custom-hex format validation, gallery-URL membership validation, 5-image cap, then a scoped UPSERT

## Task Commits

Each task was committed atomically:

1. **Task 0: Unblock the 'preview' phase — relax analyze-website POST ownership check** - `9f78b9b` (fix)
2. **Task 1: Reshape BrandingResult type and buildBrandingPreview** - `7efdd86` (feat)
3. **Task 2: Create validated PATCH /api/business/branding route** - `3bb94d7` (feat)

**Plan metadata:** (this commit, made by orchestrator after wave merge)

## Files Created/Modified
- `app/api/business/analyze-website/route.ts` - POST ownership check is now ownership-only (no `claim_status` filter); GET left untouched
- `lib/branding/brandingResult.ts` - `BrandingResult` reshaped to plural fields; `buildBrandingPreview` accepts optional `selectedLogoUrl`; `getContrastColor` unchanged
- `app/api/business/branding/route.ts` - new validated `PATCH` autosave route
- `supabase/migrations/20260616110000_business_branding_selected_logo_url.sql` - additive nullable `selected_logo_url TEXT` column
- `app/business/onboarding/AnalysoiSivusto.tsx` - updated swatch render to use `color.hex` instead of treating `colors` entries as raw strings
- `app/business/onboarding/StepEsikatselu.tsx` - `brandColor` now sourced from `selected_background_color`, falling back to the first AI color's `hex`

## Decisions Made
- Ownership-only is the correct check for both the analyze-website POST and the new PATCH route — `claim_status='approved'` never holds true during onboarding (links are created `'pending'` and submit resets them to `'pending'`), so any `claim_status` filter on an onboarding-flow route is a bug, not a security feature
- Color validation explicitly distinguishes AI-sourced vs custom via a `*_source` field rather than inferring intent from value shape, since a 6-character hex could otherwise coincidentally match a custom-input pattern without actually being an AI candidate
- `selected_logo_url` persisted via a new additive migration column, consistent with how `selected_background_color`/`selected_accent_color` were added in Phase 47

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed two pre-existing call sites broken by the BrandingResult.colors type reshape**
- **Found during:** Task 1 (Reshape BrandingResult type and buildBrandingPreview)
- **Issue:** `app/business/onboarding/AnalysoiSivusto.tsx` rendered `brandingResult.colors` as if it were `string[]` (iterating `hex => ...` directly as a color string), and `app/business/onboarding/StepEsikatselu.tsx` read `brandingData?.colors?.[0]` directly as a hex string for the `brandColor` prop. Both compiled against the old `colors: string[] | null` shape; the Task 1 reshape to `Array<{hex,role}>` broke `npx tsc --noEmit` in both files.
- **Fix:** Updated `AnalysoiSivusto.tsx`'s swatch map to destructure `color.hex`/`color.hex` for `key`/`style`/`title`. Updated `StepEsikatselu.tsx` to derive `brandColor` from `brandingData?.selected_background_color ?? brandingData?.colors?.[0]?.hex ?? undefined`, which also better matches the plan's stated intent that background/accent colors come from the `selected_*` fields rather than a raw `colors[0]`.
- **Files modified:** `app/business/onboarding/AnalysoiSivusto.tsx`, `app/business/onboarding/StepEsikatselu.tsx`
- **Verification:** `npx tsc --noEmit` reports zero errors project-wide; `npx next lint` on both files reports no warnings/errors
- **Committed in:** `7efdd86` (part of Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix, Rule 1)
**Impact on plan:** Necessary to keep the project compiling after the type reshape the plan explicitly required. No scope creep — both fixes are mechanical adaptations to the new type shape, not new features.

## Issues Encountered
None beyond the deviation documented above.

## User Setup Required
None - no external service configuration required. The new migration (`20260616110000_business_branding_selected_logo_url.sql`) will need to be applied via the project's normal Supabase migration deploy process, but requires no manual dashboard configuration.

## Next Phase Readiness
- Plan 02 (logo/color/gallery picker UI) can now build against the reshaped `BrandingResult` type and call the validated `PATCH /api/business/branding` route directly
- Plan 03 (quick-accept) can read back `selected_logo_url` from `business_branding` knowing it was already validated against `logo_candidates` membership
- The `'preview'` phase of `AnalysoiSivusto.tsx` is reachable end-to-end for onboarding businesses for the first time since Phase 47 shipped — no remaining blocker for Plan 02/03's UI to render against live data

---
*Phase: 48-logo-v-ri-ja-galleriavalinta*
*Completed: 2026-06-16*

## Self-Check: PASSED

- FOUND: app/api/business/branding/route.ts
- FOUND: supabase/migrations/20260616110000_business_branding_selected_logo_url.sql
- FOUND: lib/branding/brandingResult.ts
- FOUND: .planning/phases/48-logo-v-ri-ja-galleriavalinta/48-01-SUMMARY.md
- FOUND commit: 9f78b9b
- FOUND commit: 7efdd86
- FOUND commit: 3bb94d7
- FOUND commit: 22817a1
