---
phase: 48-logo-v-ri-ja-galleriavalinta
reviewed: 2026-06-16T19:47:06Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - app/api/business/branding/route.ts
  - supabase/migrations/20260616110000_business_branding_selected_logo_url.sql
  - app/api/business/analyze-website/route.ts
  - lib/branding/brandingResult.ts
  - app/business/onboarding/AnalysoiSivusto.tsx
  - app/business/onboarding/StepEsikatselu.tsx
  - app/business/onboarding/page.tsx
findings:
  critical: 2
  warning: 5
  info: 4
  total: 11
status: issues_found
---

# Phase 48: Code Review Report

**Reviewed:** 2026-06-16T19:47:06Z
**Depth:** standard
**Files Reviewed:** 7
**Status:** issues_found

## Summary

Reviewed the logo/color/gallery picker and quick-accept flow added in Phase 48: the PATCH
`/api/business/branding` route, the additive `selected_logo_url` migration, the
`analyze-website` route's gallery-upload extension, the client-safe `brandingResult.ts`
helpers, and three onboarding UI components (`AnalysoiSivusto`, `StepEsikatselu`, `page.tsx`).

Server-side validation in `branding/route.ts` is generally solid — logo/color/gallery
selections are all checked against the business's own stored candidate rows before being
persisted, and ownership is re-derived from the verified JWT rather than the request body.
However, tracing the "Jatka velhoon →" navigation path against `WizardInner.tsx`'s
auto-resume logic surfaces a genuine step-skip bug (CR-01) that causes the wizard to silently
skip the Media step for every onboarding business that uses the quick-confirm path. There is
also a real data-integrity gap in `StepEsikatselu`'s brand-colour fallback that can select a
non-background-role colour as the DiagonaalKortti panel background (CR-02). Several warnings
cover duplicate validation logic, unbounded list rendering vs. validated caps, and a few
silently-swallowed error paths.

## Critical Issues

### CR-01: Quick-accept "Jatka velhoon" path causes wizard to silently skip Step 2 (Media)

**File:** `app/business/onboarding/page.tsx:106-118`
**Issue:**
`handleConfirm` writes the `media_urls` field via `save-step` using `step: 2`:
```ts
body: JSON.stringify({
  paikka_id: paikkaId,
  step: 2,
  field: 'media_urls',
  value: { logo: selections.logoUrl, photos: selections.gallery },
}),
```
In `save-step/route.ts`, the UPSERT sets `current_step: step + 1`, i.e. `current_step: 3`.

When `setPagePhase('wizard')` then mounts `<WizardInner mode="onboarding" .../>` with no
`step` URL param, `OnboardingMode`'s `loadDraft()` effect (`app/business/WizardInner.tsx:117-125`)
reads `savedStep = existingDraft?.current_step ?? 0` (now `3`), sees `savedStep > 1 && step === 1`,
and immediately redirects to `?step=3`. It also seeds `maxReachedStep` to `3`
(`app/business/WizardInner.tsx:120`), so the forward-skip guard at line 172 never blocks this.

The practical effect: every business that uses "Jatka velhoon →" after the logo/color/gallery
picker lands directly on Step 3 (Hinnasto) and never sees Step 2 (`StepMediat`) in the wizard
at all — there is no way to review or change the media selection inside the wizard UI for this
flow, even though `StepMediat` is the step intended to let the user adjust media. This silently
breaks the "Jatka velhoon" continuation contract: the user believes they are continuing the
full wizard from where they left off, but a whole step is invisible.

**Fix:** Use `step: 1` (so `current_step` becomes 2, landing the user on Step 2 itself) so the
media step is shown, not skipped — or explicitly navigate `WizardInner` with `?step=2` instead
of relying on the draft's `current_step` for resume positioning:
```ts
// page.tsx — write with step: 1 so current_step becomes 2 (Step 2 itself, not past it)
body: JSON.stringify({
  paikka_id: paikkaId,
  step: 1,
  field: 'media_urls',
  value: { logo: selections.logoUrl, photos: selections.gallery },
}),
```

---

### CR-02: StepEsikatselu's brandColor fallback can pick a non-background-role colour

**File:** `app/business/onboarding/StepEsikatselu.tsx:47-48`
**Issue:**
```ts
const brandColor =
  brandingData?.selected_background_color ?? brandingData?.colors?.[0]?.hex ?? undefined
```
When the user has not yet made a selection (`selected_background_color` is `null`), this falls
back to `colors[0].hex` — the *first* entry in the AI-extracted colour array, regardless of its
`role`. The analyzer prompt assigns colors semantic roles (`'background'`, `'accent'`, etc. — see
`AnalysoiSivusto.tsx:145` and `:156`, which explicitly `.find(c => c.role === 'background')` and
`.find(c => c.role === 'accent')`). There is no guarantee `colors[0]` has `role === 'background'`;
it could be an accent or text colour. `DiagonaalKortti` then renders this arbitrary colour as the
left-panel background, with `getContrastColor` computing the text colour to match it — for an
accent-role colour this can be jarring or — if the colour is meant as a small accent rather than
a large background fill — visually broken (e.g. a bright saturated accent used as a full panel
fill, with contrast text chosen for it rather than for an actual background tone).

This is reachable in practice: `StepEsikatselu` is rendered via `WizardInner`'s step 6 using the
draft path's `brandingData` prop, which is set once at `page.tsx`'s `handleConfirm` and never
re-synced with `AnalysoiSivusto`'s in-progress (autosaved) `selected_background_color` state if
the user navigates "Jatka velhoon →" before explicitly picking a background color (it is possible
to reach the footer buttons without ever clicking a swatch, since no field is required).

**Fix:** Mirror the same role-aware fallback `AnalysoiSivusto` uses:
```ts
const brandColor =
  brandingData?.selected_background_color ??
  brandingData?.colors?.find(c => c.role === 'background')?.hex ??
  undefined
```

## Warnings

### WR-01: Hex validation regex duplicated between client and server with no shared source

**File:** `app/api/business/branding/route.ts:5`, `app/business/onboarding/AnalysoiSivusto.tsx:228`
**Issue:** The `#rrggbb` validation regex `/^#[0-9a-fA-F]{6}$/` is defined independently in both
the API route (`HEX_RE`) and the client component (`handleCustomHexSubmit`'s inline regex). They
happen to match today, but any future change to one (e.g. supporting 3-digit shorthand) without
updating the other will silently desync client and server validation, producing confusing
"works in UI, rejected by API" behavior.
**Fix:** Extract the regex into a shared constant in `lib/branding/brandingResult.ts` (already a
client-safe shared module) and import it from both the route and the component.

### WR-02: `validateColorField` is case-insensitive for AI membership but case-sensitive for custom hex format

**File:** `app/api/business/branding/route.ts:32-45`
**Issue:** The `'ai'` branch lower-cases both sides before comparing
(`c.hex.toLowerCase() === hex.toLowerCase()`), but the `'custom'` branch's `HEX_RE` accepts mixed
case (`[0-9a-fA-F]`) and stores the value as-is. This means a user-submitted custom hex like
`#AABBCC` is stored verbatim, while AI-membership checks normalize case. Downstream consumers
(`getContrastColor`, inline `style={{ backgroundColor }}`) tolerate any case, so this is not a
crash risk, but it is an inconsistency that can produce duplicate-looking but textually different
values in storage (e.g. `#AABBCC` vs `#aabbcc`) for what should be the same logical colour,
complicating any future exact-string comparison (such as the `isSelected` check in
`AnalysoiSivusto.tsx:652`, which does an exact string match, not case-insensitive).
**Fix:** Normalize all stored hex values to lowercase before persisting:
```ts
if (!HEX_RE.test(hex)) return 'Anna värikoodi muodossa #rrggbb'
return null
// caller: updatePayload.selected_background_color = selected_background_color.toLowerCase()
```

### WR-03: `image_urls` validation runs `Array.isArray` only on the gallery field — same gap not present on logo/colors, but worth confirming `image_urls` empty array semantics

**File:** `app/api/business/branding/route.ts:80-82`
**Issue:** `image_urls.length > MAX_GALLERY_SELECTION` is checked correctly (`> 5` allows
exactly 5), but an explicitly-submitted empty array (`image_urls: []`) is accepted and will
overwrite any previously-selected gallery images with an empty selection — there is no
distinction between "field omitted" (skip) and "field explicitly cleared to empty". This may be
intentional (allowing a user to deselect all gallery images), but there's no test or comment
confirming this is the intended behavior versus an oversight, and the client
(`toggleGalleryImage` in `AnalysoiSivusto.tsx:239-252`) never actually sends an empty array since
it always sends `next` which is a subset/superset of the previous selection — so this path is
currently unreachable from the shipped UI but is a latent contract gap for any future caller.
**Fix:** Add a one-line comment clarifying that `image_urls: []` is a valid "clear all" request,
or explicitly guard against it if unintended.

### WR-04: `analyze-website` POST `runAnalysis` per-candidate logo upload failures are silently swallowed without surfacing partial failure to the user

**File:** `app/api/business/analyze-website/route.ts:54-63`
**Issue:**
```ts
for (const logo of result.logos) {
  if (logo.index < 0 || logo.index >= logoBuffers.length) continue
  try {
    const candidateUrl = await uploadLogoCandidate(...)
    logoCandidates.push({ url: candidateUrl, type: logo.type })
  } catch (err) {
    console.error('[analyze-website] logo candidate upload error:', err)
    // Skip this candidate — non-fatal
  }
}
```
If every candidate upload fails (e.g. transient Supabase Storage outage), `logoCandidates` ends
up empty and the final UPSERT still reports `status: 'analyzed'` with `logo_candidates: []`. The
UI (`AnalysoiSivusto.tsx:585`) falls back to the "no logo found" message, which is misleading —
the AI did find logo candidates, but storage uploads failed. The user has no way to distinguish
"no logo on the site" from "upload infrastructure failure," and will not retry the right action.
**Fix:** Track upload failures separately and either retry once, or surface a distinct
`error_message` annotation (e.g. `logo_upload_partial_failure: true`) so the UI can show
"logo detection succeeded but upload failed — try analyzing again" instead of "no logo found."

### WR-05: `StepEsikatselu`'s 8-second timeout never clears if `draftAsPaikka` becomes available after the timer already fired

**File:** `app/business/onboarding/StepEsikatselu.tsx:50-54`
**Issue:**
```ts
useEffect(() => {
  if (draftAsPaikka) return
  const timer = setTimeout(() => setLoadTimedOut(true), 8000)
  return () => clearTimeout(timer)
}, [draftAsPaikka])
```
This effect re-runs whenever `draftAsPaikka` changes identity. Since `draftAsPaikka` is
recomputed on every render (it's a `const` derived directly in the function body from `draft`,
`paikkaInfo`, and `brandingData` — not memoized with `useMemo`), the effect's cleanup/re-run
cycle fires on every parent re-render while `draftAsPaikka` is still falsy, resetting the 8-second
timer each time. In practice this means `loadTimedOut` may never fire if any parent state update
happens within the 8-second window (e.g. `WizardInner`'s `refreshDraftForPreview` effect setting
`draft` via `setDraft`), masking the "stuck loading" state the timeout is meant to catch.
Conversely, once `draftAsPaikka` does become truthy, the `if (draftAsPaikka) return` guard exits
without setting a new timer — correct — but the inconsistent firing behavior beforehand is a
latent reliability gap for the timeout UX.
**Fix:** Memoize `draftAsPaikka` with `useMemo` (object-identity stable across renders unless its
real inputs change) and/or track only whether the object is non-null with a primitive boolean
dependency in the effect:
```ts
useEffect(() => {
  if (draftAsPaikka) return
  const timer = setTimeout(() => setLoadTimedOut(true), 8000)
  return () => clearTimeout(timer)
}, [!!draftAsPaikka])
```

## Info

### IN-01: `AnalysoiSivusto.tsx` renders unbounded `logo_candidates` list without a cap matching server-side limits

**File:** `app/business/onboarding/AnalysoiSivusto.tsx:597`
**Issue:** `brandingResult.logo_candidates.map(candidate => ...)` renders every candidate with no
`.slice()` cap, unlike the gallery picker which explicitly caps at `.slice(0, 8)`
(`AnalysoiSivusto.tsx:764`). There's no server-side cap on `logoCandidates` length either
(`analyze-website/route.ts:53-63` loops over all of `result.logos` with no upper bound). If the
analyzer ever returns an unusually large number of logo candidates, the picker UI will render
all of them with no visual limit.
**Fix:** Add a reasonable cap (e.g. `.slice(0, 6)`) for consistency with the gallery picker, or
add an explicit comment if unbounded is intentional because the analyzer is trusted to return a
small number.

### IN-02: `assignColorToSlot`'s default-to-'tausta' fallback can silently overwrite an already-set background when accent was intended

**File:** `app/business/onboarding/AnalysoiSivusto.tsx:220-224`
**Issue:**
```ts
function handleSwatchClick(hex: string) {
  const slot = armedSlot ?? 'tausta'
  assignColorToSlot(slot, hex, 'ai')
}
```
If a user has already set both background and accent colors and then clicks a third swatch
without first clicking either "Tausta" or "Aksentti" to arm a slot, the click silently overwrites
the background (defaulting to `'tausta'`) rather than prompting the user to pick a slot. This is a
UX ambiguity rather than a crash, but it can cause a confusing "my background color changed when
I just clicked a swatch" experience for users who intended to update the accent.
**Fix:** Consider requiring an explicit slot selection before allowing swatch clicks to take effect
(disable swatches until a slot is armed), or visually indicate which slot will be affected before
the click (e.g. highlight the default-armed slot continuously, not just on `armedSlot !== null`).

### IN-03: `analyze-website` GET response doesn't strip unsafe `image_urls` entries the way it strips `logo_url`

**File:** `app/api/business/analyze-website/route.ts:254-261`
**Issue:** The SEC-46-02 origin check is applied only to `data.logo_url`:
```ts
if (data?.logo_url) {
  const storageBase = process.env.NEXT_PUBLIC_SUPABASE_URL + '/storage/v1/'
  if (!data.logo_url.startsWith(storageBase)) {
    data.logo_url = null
  }
}
```
`data.logo_candidates[].url` and `data.image_urls[]` are returned unfiltered. Given the upload
pipeline (`uploadLogoCandidate`/`uploadGalleryImage`) always writes Supabase Storage URLs today,
this is not currently exploitable, but it is an inconsistent application of the same security
principle the comment explicitly names (SEC-46-02: "preventing a compromised analysis pipeline
from surfacing arbitrary image origins") — the principle is only half-enforced.
**Fix:** Apply the same origin-allowlist filter to `logo_candidates` and `image_urls` entries for
defense-in-depth:
```ts
const isOwnStorage = (u: string) => u.startsWith(storageBase)
if (data?.logo_candidates) data.logo_candidates = data.logo_candidates.filter(c => isOwnStorage(c.url))
if (data?.image_urls) data.image_urls = data.image_urls.filter(isOwnStorage)
```

### IN-04: Magic number `5` for gallery cap repeated as a literal in client code instead of importing a shared constant

**File:** `app/business/onboarding/AnalysoiSivusto.tsx:138, 246, 280, 764, 766, 795`
**Issue:** The gallery cap of `5` appears as a bare literal at least six times across
`AnalysoiSivusto.tsx` (initial slice, cap check, quick-accept slice, render slice comment, disabled
check, and count display), while the server (`branding/route.ts:4`) defines
`MAX_GALLERY_SELECTION = 5` as a named constant. If the cap changes, all six client call sites
must be updated by hand with no compiler assistance.
**Fix:** Export `MAX_GALLERY_SELECTION` from `lib/branding/brandingResult.ts` (client-safe) and
import it in `AnalysoiSivusto.tsx` instead of repeating the literal `5`.

---

_Reviewed: 2026-06-16T19:47:06Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
