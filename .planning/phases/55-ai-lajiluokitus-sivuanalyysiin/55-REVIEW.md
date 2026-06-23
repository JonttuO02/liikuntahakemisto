---
phase: 55-ai-lajiluokitus-sivuanalyysiin
reviewed: 2026-06-23T21:38:04Z
depth: standard
files_reviewed: 14
files_reviewed_list:
  - supabase/migrations/20260623190347_business_branding_suggested_laji.sql
  - supabase/migrations/20260623190348_onboarding_draft_add_laji.sql
  - lib/branding/prompt.ts
  - lib/branding/analyzer.ts
  - lib/branding/brandingResult.ts
  - app/api/business/analyze-website/route.ts
  - lib/branding/analyzer.test.ts
  - app/api/business/onboarding/save-step/route.ts
  - app/api/business/onboarding/submit/route.ts
  - tests/api/save-step.test.ts
  - tests/api/submit.test.ts
  - app/business/onboarding/AnalysoiSivusto.tsx
  - app/business/onboarding/page.tsx
  - app/business/WizardInner.tsx
findings:
  critical: 2
  warning: 4
  info: 3
  total: 9
status: resolved
resolution:
  CR-01: "fixed in 8df4547 — FI_TO_EN translation added at WizardInner.tsx brandingHours, brandingResult.ts buildBrandingPreview, AnalysoiSivusto.tsx handleQuickAccept; regression test added in lib/branding/brandingResult.test.ts"
  CR-02: "fixed in 3d3c7db — save-step now persists value.trim() for the laji field"
  warnings_info: "not fixed — WR-01..WR-04, IN-01..IN-03 left as documented findings, not blocking"
---

# Phase 55: Code Review Report

**Reviewed:** 2026-06-23T21:38:04Z
**Depth:** standard
**Files Reviewed:** 14
**Status:** resolved (both Critical findings fixed; Warning/Info left as documented, non-blocking)

## Summary

Phase 55 adds an AI-suggested sport-category (`laji`) field to the website-analysis pipeline and a "Vahvista/Vaihda" confirmation UI, with reasonable allowlist validation of the AI's `laji` output (`analyzer.ts`) and a sound "never write `laji: null`" invariant at submit time. The data-flow design for `suggested_laji` → `confirmed laji` is careful and well-documented.

However, the same phase's prompt change instructs Claude to return `opening_hours[].day` as **Finnish day abbreviations** ("Ma, Ti, Ke, To, Pe, La, Su") while every consumer of `aukioloajat` records elsewhere in the codebase (`lib/aukiolo.ts`, `StepAukioloajat.tsx`) expects **English lowercase day keys** ("monday".."sunday"). A working Finnish→English translation map (`lib/onboardingUtils.ts:FI_TO_EN`) already exists in the codebase but is never invoked by any of the three places this phase wires AI-derived opening hours into that pipeline. This breaks the AI opening-hours feature across the preview, the quick-accept "Hyväksy ja lähetä" flow, and the wizard's Step 3 pre-fill — likely the most user-visible regression in this phase. A second, narrower bug: `save-step` validates `laji` is non-blank after trimming but persists the **untrimmed** string, which then fails to match `lajiKonfig` lookups whenever the client sends leading/trailing whitespace.

## Critical Issues

### CR-01: AI-extracted opening_hours day keys are Finnish abbreviations but every consumer expects English day names — opening-hours pre-fill/quick-accept is silently/loudly broken

**File:** `lib/branding/prompt.ts:91`, `app/business/WizardInner.tsx:237-245`, `app/business/onboarding/AnalysoiSivusto.tsx:864-869`, `lib/branding/brandingResult.ts:125-136`

**Issue:** The branding-analysis prompt instructs Claude to use Finnish day abbreviations for `opening_hours[].day`:

```
opening_hours:
- Use short Finnish day abbreviations: Ma, Ti, Ke, To, Pe, La, Su.
```

But every downstream consumer of the resulting `Record<string,...>` keys by English lowercase day names:

- `lib/aukiolo.ts` (`DAY_KEYS = ['sunday','monday',...]`, `ORDERED_DAYS = ['monday',...]`)
- `StepAukioloajat.tsx:75` — explicit comment: `"CRITICAL: all sources use English day keys (monday, tuesday, ...)"`
- `app/api/business/onboarding/save-step/route.ts:12` — `isValidAukioloajat`'s `VALID_DAYS` set is `{monday, tuesday, ..., sunday}`

Three call sites in this phase build the `aukioloajat` record directly from `entry.day` / `h.day` / `e.day` without translating Finnish → English:

1. `WizardInner.tsx:237-245` (`brandingHours`) — passed as `initialBrandingAukioloajat` to `StepAukioloajat`, which will find zero matching keys against `ORDERED_DAYS`, so the AI-detected hours never pre-fill Step 3.
2. `brandingResult.ts:buildBrandingPreview` (lines 125-136) — feeds the `aukioloajat` shown in the live preview pane; `getOpenStatus`/`formatGroupedHours` (`lib/aukiolo.ts`) will report `'no-data'`/`'suljettu'` for every day even though hours were extracted.
3. `AnalysoiSivusto.tsx:864-869` (`handleQuickAccept`) — builds `aukioloajat` keyed by `e.day` and POSTs it to `/api/business/onboarding/save-step` with `field: 'aukioloajat'`. `isValidAukioloajat` rejects any key not in the English `VALID_DAYS` set, so **this request will always return 400** whenever Claude found opening hours, breaking "Hyväksy ja lähetä" (quick-accept) for any site with detected hours.

A working translation map already exists and is unused by all three sites:

```ts
// lib/onboardingUtils.ts
export const FI_TO_EN: Record<string, string> = {
  'Ma': 'monday', 'Ti': 'tuesday', 'Ke': 'wednesday', 'To': 'thursday',
  'Pe': 'friday', 'La': 'saturday', 'Su': 'sunday',
}
```

**Fix:** Translate every `day` field through `FI_TO_EN` before building the keyed record at all three sites, e.g.:

```ts
// WizardInner.tsx
import { FI_TO_EN } from '@/lib/onboardingUtils'
...
for (const h of hrs) {
  const enKey = FI_TO_EN[h.day] ?? h.day
  result[enKey] = { open: h.open, close: h.close }
}
```

```ts
// brandingResult.ts buildBrandingPreview
Object.fromEntries(
  brandingResult.raw_analysis.opening_hours.map(entry => [
    FI_TO_EN[entry.day] ?? entry.day,
    { open: entry.open, close: entry.close },
  ]),
)
```

```ts
// AnalysoiSivusto.tsx handleQuickAccept
const aukioloajat = Object.fromEntries(
  (brandingResult.raw_analysis?.opening_hours ?? []).map(e => [
    FI_TO_EN[e.day] ?? e.day,
    { open: e.open, close: e.close },
  ])
)
```

Add a regression test asserting the round trip from a Claude-shaped `opening_hours` response through to a `monday`-keyed record, since none of the current tests (`analyzer.test.ts`, `tests/api/save-step.test.ts`, `tests/api/submit.test.ts`) exercise this boundary.

---

### CR-02: `save-step` validates the trimmed `laji` value but persists the untrimmed string, breaking taxonomy-key lookups

**File:** `app/api/business/onboarding/save-step/route.ts:89-93,118`

**Issue:**

```ts
if (field === 'laji') {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > 100) {
    return NextResponse.json({ error: 'laji: invalid value' }, { status: 400 })
  }
}
...
const { error } = await supabaseAdmin
  .from('onboarding_draft')
  .upsert({
    business_account_id: user.id,
    paikka_id: paikkaId,
    [field]: value,   // <-- untrimmed `value`, not the validated/trimmed form
    ...
```

The validation checks `value.trim().length === 0`, so a value like `"  padel  "` (or `"padel\n"`) passes validation, but the **raw, untrimmed** `value` is what gets written to `onboarding_draft.laji`. Downstream, `submit/route.ts` copies this directly into `liikuntapaikat.laji` (`...(draft.laji ? { laji: draft.laji } : {})`), and UI lookups such as `lajiKonfig[confirmedLaji]` (`AnalysoiSivusto.tsx:532`, `WizardInner.tsx` `paikkaInfo.laji`) use strict key equality — `lajiKonfig['padel ']` is `undefined`, silently falling back to showing the raw (whitespace-padded) string instead of the proper label, or `undefined` rendering as blank.

In practice the AI-suggested path (`confirmedLaji` from `analyzer.ts`) is already allowlist-validated and exact, so this only bites the free-text `LajiPicker` input — but that input field's client-side `handleFreeTextSubmit` (`AnalysoiSivusto.tsx:121-130`) does call `.trim()` before calling `onPick`, so this is reachable only via direct API calls bypassing the UI, or a future caller of `save-step` that doesn't pre-trim. Still a real divergence between what is validated and what is stored.

**Fix:**

```ts
if (field === 'laji') {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > 100) {
    return NextResponse.json({ error: 'laji: invalid value' }, { status: 400 })
  }
  value = value.trim()
}
```

## Warnings

### WR-01: `analyze-website` GET route's allowlisted SELECT list omits `error_message` ordering consistency but is otherwise fine — actual issue: `suggested_laji` is exposed even when `status` is not `'analyzed'`

**File:** `app/api/business/analyze-website/route.ts:266`

**Issue:** The GET handler's `.select(...)` includes `suggested_laji` unconditionally. When status is `'pending'`/`'analyzing'`/`'failed'`, the row may still carry a stale `suggested_laji` value from a *previous* analysis run (e.g. after "Analysoi uudelleen" sets `status: 'analyzing'` via the POST handler, which does NOT clear `suggested_laji` — only the final UPSERT in `runAnalysis` resets it, and only on success). If the re-analysis later fails, the client could briefly observe a stale `suggested_laji` paired with `status: 'failed'`. `AnalysoiSivusto.tsx`'s consumption is gated behind `phase === 'preview' && brandingResult` reached only via `status === 'analyzed'`, so the current UI is not directly exploitable by this, but it is a latent inconsistency if any other consumer reads `suggested_laji` without checking `status` first.

**Fix:** Either explicitly null out `suggested_laji` in the `status: 'analyzing'` UPSERT in the POST handler (mirroring how the failure-path UPSERT in `runAnalysis`'s catch block resets other fields), or document that `suggested_laji` is only meaningful when `status === 'analyzed'`.

### WR-02: `handleQuickAccept`'s sequential `save-step` calls can partially fail without rolling back already-confirmed `laji`/draft writes, and the user is given no way to see *which* field failed

**File:** `app/business/onboarding/AnalysoiSivusto.tsx:893-907`

**Issue:** The loop POSTs `hinnasto`, `aukioloajat`, `yhteystiedot`, `media_urls`, and optionally `laji` sequentially; on the first non-OK response, it sets `quickError` and `return`s, leaving prior writes uncommitted reconciliation aside (no `submit` call happens). Combined with CR-01, the `aukioloajat` write will reliably fail validation whenever opening hours were detected, meaning `media_urls` and `hinnasto` (whichever were sent before it in the array) succeed but `yhteystiedot` and `laji` (sent after it) are never attempted, and the route exits with the generic message "Lähetys epäonnistui. Yritä uudelleen tai jatka velhon kautta." The comment block above the loop documents this as an accepted partial-write risk in general, but does not anticipate a write that is *unconditionally* going to fail (CR-01) rather than transiently failing — so the "click again to retry" recovery path will loop forever on the same 400 until CR-01 is fixed.

**Fix:** Once CR-01 is fixed this becomes a true transient-failure case as documented. Until then, consider logging/surfacing the specific failing field name in dev to make this class of bug easier to catch in QA (e.g. `console.error('[quick-accept] save-step failed for field', field, await res.text())`).

### WR-03: `LajiPicker` free-text input has no duplicate/case-insensitive guard against existing taxonomy labels

**File:** `app/business/onboarding/AnalysoiSivusto.tsx:121-130`

**Issue:** `handleFreeTextSubmit` accepts any non-empty string ≤100 chars, including values that collide with existing taxonomy labels under different casing (e.g. `"Padel"`, `"PADEL "`) or are near-duplicates of an existing key's label. This produces a `liikuntapaikat.laji` value that doesn't match any `lajiKonfig` key, so the venue would silently fall through every `lajiKonfig[laji] ?? fallback` site (badge colors, `getInfoWindowStyle`) to default grey styling. Not a regression introduced by this phase's allowlist logic for AI suggestions (which is correctly validated) but the free-text escape hatch undermines that protection for the manual-pick path.

**Fix:** Either case-fold and compare free text against existing labels and suggest the matching taxonomy key instead of accepting a near-duplicate, or accept this as intended scope (the comment in `prompt.ts`/`analyzer.ts` frames the allowlist as specifically protecting *AI* suggestions, not manual input) — but if the latter, document the intentional asymmetry.

### WR-04: `analyzer.test.ts` and `tests/api/*.test.ts` have no test coverage for the opening_hours Finnish-day-key boundary that CR-01 breaks

**File:** `lib/branding/analyzer.test.ts`, `tests/api/save-step.test.ts`, `tests/api/submit.test.ts`

**Issue:** `analyzer.test.ts` verifies that `opening_hours` entries are coerced/passed through with the raw `day` string preserved (e.g. `'Ma'` round-trips as `'Ma'`), and `save-step.test.ts`'s `isValidAukioloajat` is never exercised at all in the AI-06 test additions (only `laji` field validation is tested in the new describe block). No test in this phase asserts that a Claude-shaped `opening_hours` payload survives the full pipeline into a `StepAukioloajat`-compatible record. This gap is exactly why CR-01 shipped undetected.

**Fix:** Add an integration-style test (or at minimum a unit test against the day-key mapping function once extracted) that feeds a `{day: 'Ma', open: '09:00', close: '17:00'}` entry through `buildBrandingPreview` / the `handleQuickAccept` payload builder and asserts the resulting record key is `'monday'`, not `'Ma'`.

## Info

### IN-01: `analyzer.ts`'s `VALID_LAJI_KEYS` includes generic fallback categories (`liikunta`, `liikuntahalli`) as valid AI suggestions

**File:** `lib/branding/analyzer.ts:48`, `lib/lajit.ts:9-17`

**Issue:** `VALID_LAJI_KEYS` is derived from all 9 keys of `lajiKonfig`, including `liikunta` and `liikuntahalli`, which read as generic/fallback categories elsewhere in the codebase (e.g. `getInfoWindowStyle`'s catch-all). If Claude is uncertain but still returns one of these generic keys instead of `null`, the AI-06 invariant "uncertain → null, never guess" (per the prompt's own instructions) is bypassed by the model picking a vague-but-technically-valid category rather than abstaining. This is a prompt/data-design observation, not a code bug — flagging for awareness since it weakens the "never guess" guarantee criterion 3 is meant to provide.

**Fix:** Consider excluding `liikunta`/`liikuntahalli` from the prompt's enum list (`LAJI_ENUM`) if they are meant only as manual fallback categories, not AI-suggestable ones, or explicitly instruct the model to prefer `null` over these two keys when uncertain.

### IN-02: `runAnalysis`'s gallery-upload SSRF guard re-checks `isUrlSafe` per image but the check happens after `imageUrls` was already produced by `scrapeWebsite` — defense in depth is fine, but `MAX_GALLERY_UPLOADS` slicing happens before the safety filter, wasting the cap on URLs that get skipped

**File:** `app/api/business/analyze-website/route.ts:75-92`

**Issue:** `imageUrls.slice(0, MAX_GALLERY_UPLOADS)` takes the first 8 URLs, then each is checked with `isUrlSafe` and may be skipped (`continue`) — meaning if the first several scraped URLs happen to fail the SSRF check, the effective gallery could end up empty even though `scrapeWebsite` returned up to 15 valid candidates further down the list. This is a pre-existing pattern from prior phases reused here, not new in Phase 55, but noting it since it interacts with this phase's gallery code path that was touched.

**Fix:** Out of scope for this phase's review (not new code) — filter for `isUrlSafe` before slicing to `MAX_GALLERY_UPLOADS` if revisited.

### IN-03: `PreviewPhaseContent`'s `onConfirm` button passes `confirmedLaji` even when `lajiState === 'unconfirmed'` and no laji has been picked

**File:** `app/business/onboarding/AnalysoiSivusto.tsx:608`

**Issue:** The "Jatka velhoon →" button calls `onConfirm(..., { logoUrl, gallery, laji: confirmedLaji })` unconditionally; `confirmedLaji` is `null` until `handleVahvistaLaji`/`handleLajiPick` runs, so a user can click through to the wizard with `lajiState === 'unconfirmed'` and `laji: null` — which is handled correctly downstream (`page.tsx`'s `handleConfirm` only writes `laji` `if (selections.laji)`), so no crash or wrong write occurs, but the user is allowed to skip past Laji confirmation entirely with no nudge/blocking, unlike the `'Ohita'`(skip) path which is routed through a forced `laji-skip` picker phase. This is an inconsistency in UX strictness between the two entry paths, not a functional bug.

**Fix:** Consider whether "Jatka velhoon" should require `confirmedLaji` to be set (disable button / show inline prompt) for parity with the skip path's forced picker, or confirm this asymmetry is intentional (continuing to the wizard still allows fixing laji later via Step 1, whereas the skip path has no later opportunity before submit defaults it).

---

_Reviewed: 2026-06-23T21:38:04Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
