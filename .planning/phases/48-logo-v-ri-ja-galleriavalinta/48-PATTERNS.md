# Phase 48: Logo-, väri- ja galleriavalinta - Pattern Map

**Mapped:** 2026-06-16
**Files analyzed:** 7 (5 modify, 1 new route, 0 new components — pickers are inline JSX inside `AnalysoiSivusto.tsx`)
**Analogs found:** 7 / 7 (all files have a same-codebase analog)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `app/api/business/branding/route.ts` (new) | route/controller | request-response (autosave PATCH) | `app/api/business/onboarding/save-step/route.ts` (field-allowlist UPSERT pattern) + `app/api/business/analyze-website/route.ts` (auth + ownership pattern) | exact (composite of two near-identical sibling routes) |
| `lib/branding/brandingResult.ts` (modify — reshape type + `buildBrandingPreview`) | utility/type | transform | itself (extend in place); GET handler in `app/api/business/analyze-website/route.ts` is the shape source-of-truth | exact |
| `app/business/onboarding/AnalysoiSivusto.tsx` (modify — add pickers + quick-accept) | component | request-response (autosave PATCH per selection) + CRUD-like local state | itself (extend `'preview'` phase block in place); `StepMediat.tsx` for thumbnail-grid/checkbox-overlay precedent | exact |
| `app/business/onboarding/StepMediat.tsx` (modify — accept gallery selections) | component | CRUD (existing-photo state) | itself (extend in place) — `existingPhotoUrls` initializer is the exact splice point | exact |
| Quick-accept submit logic (new function inside `AnalysoiSivusto.tsx`, calls existing `submit` route) | service-like (client-side draft mapper) | event-driven (button click) → request-response (2 sequential fetches) | `app/api/business/onboarding/save-step/route.ts` (field-shape target) + `lib/onboardingUtils.ts::buildDraftAsPaikka`/`hinnastaToHintaKuvaus` (mapping source) + `app/api/business/onboarding/submit/route.ts` (call target, read-only) | exact |
| `app/components/DiagonaalKortti.tsx` (read-only — consumes reshaped `BrandingResult`) | component | transform (render) | n/a — reference only, not modified by this phase | n/a |
| `supabase/migrations/*` (none new — Phase 47 already added all needed columns) | migration | n/a | `supabase/migrations/20260616100000_business_branding_plural_and_paikka_scoping.sql` | n/a — no new migration in this phase |

## Pattern Assignments

### `app/api/business/branding/route.ts` (new — controller, request-response PATCH)

**Analog 1 (auth + ownership shape):** `app/api/business/analyze-website/route.ts` lines 144-199
**Analog 2 (field-allowlist UPSERT shape):** `app/api/business/onboarding/save-step/route.ts` (full file, 122 lines)

**Auth pattern to copy verbatim** (`save-step/route.ts` lines 28-33, identical in every business route):
```typescript
const authHeader = request.headers.get('Authorization')
const token = authHeader?.replace('Bearer ', '') ?? ''
const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
if (authError || !user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

**Ownership check pattern to copy** (`save-step/route.ts` lines 86-95 — same `business_paikka_links` `.eq().eq().maybeSingle()` shape used by `analyze-website`'s T-47-11 check):
```typescript
const { data: link } = await supabaseAdmin
  .from('business_paikka_links')
  .select('id')
  .eq('business_account_id', user.id)
  .eq('paikka_id', paikkaId)
  .maybeSingle()

if (!link) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```
Note: `save-step` does not also check `claim_status = 'approved'`, but `analyze-website`'s POST does (line 195: `.eq('claim_status', 'approved')`). Per D-08, the PATCH route's ownership check should follow whichever is more correct for "the venue this business is actively onboarding/managing" — `analyze-website`'s stricter `approved`-only check is the safer template since `business_branding` rows are venue-scoped financial/identity data, not draft scratch data.

**Body parsing + field validation pattern to copy** (`save-step/route.ts` lines 35-70 — try/catch JSON parse, then per-field validation before any DB call):
```typescript
let paikkaId: number
let field: AllowedField
// ...
try {
  const body = await request.json()
  const parsed = parseInt(body.paikka_id, 10)
  if (isNaN(parsed) || parsed < 1) {
    return NextResponse.json({ error: 'Missing or invalid paikka_id' }, { status: 400 })
  }
  paikkaId = parsed
  // field-specific checks...
} catch {
  return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
}
```

**Membership validation (D-08 — new pattern, no existing direct analog, build from `analyzer.ts`'s validation style per 47-PATTERNS.md):** Before accepting a logo-index or AI-sourced color hex, fetch the stored row and check membership:
```typescript
// Fetch current row to validate selection membership (D-08)
const { data: brandingRow } = await supabaseAdmin
  .from('business_branding')
  .select('logo_candidates, colors')
  .eq('business_account_id', user.id)
  .eq('paikka_id', paikkaId)
  .maybeSingle()

if (!brandingRow) {
  return NextResponse.json({ error: 'No branding analysis found for this venue' }, { status: 404 })
}

// Example: validating a selected_background_color claimed as AI-sourced
if (body.background_color_source === 'ai') {
  const candidateColors = (brandingRow.colors as Array<{ hex: string; role: string }> | null) ?? []
  const isMember = candidateColors.some(c => c.hex.toLowerCase() === body.selected_background_color?.toLowerCase())
  if (!isMember) {
    return NextResponse.json({ error: 'Color is not among the analyzed candidates' }, { status: 400 })
  }
}
// Custom-hex path (D-09) skips this check entirely — only validate well-formed #rrggbb:
const HEX_RE = /^#[0-9a-fA-F]{6}$/
if (!HEX_RE.test(body.selected_background_color)) {
  return NextResponse.json({ error: 'Anna värikoodi muodossa #rrggbb' }, { status: 400 })
}
```
Apply the identical shape for logo index membership (`logo_candidates` array, checking submitted index/url exists) and for gallery image membership against `image_urls`.

**UPSERT pattern to copy** (`save-step/route.ts` lines 97-111 — single dynamic-field UPSERT with `onConflict`):
```typescript
const { error } = await supabaseAdmin
  .from('business_branding')
  .upsert(
    {
      business_account_id: user.id, // Security: from verified JWT, not body
      paikka_id: paikkaId,
      selected_background_color: ...,
      selected_accent_color: ...,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'business_account_id,paikka_id' }
  )

if (error) {
  return NextResponse.json({ error: 'Upsert failed', detail: error.message }, { status: 500 })
}
return NextResponse.json({ ok: true })
```
Note `onConflict: 'business_account_id,paikka_id'` is the composite key established by Phase 47's migration (`20260616100000_business_branding_plural_and_paikka_scoping.sql` line 79) — do NOT use the old single-column `business_account_id` target.

**Runtime: `route.ts` should declare `export const runtime = 'nodejs'` only if it needs Node-only APIs — `save-step`/`update-paikka` do not declare a runtime override, so the PATCH route likely doesn't need one either** (no sharp/Node-binary usage in a pure UPSERT route).

---

### `lib/branding/brandingResult.ts` (modify — reshape `BrandingResult` + `buildBrandingPreview`)

**Analog:** itself (extend in place) + `app/api/business/analyze-website/route.ts` GET handler lines 240-261 (source-of-truth shape)

**Current (stale) type to replace** (lines 27-38):
```typescript
export type BrandingResult = {
  status: 'pending' | 'analyzing' | 'analyzed' | 'failed'
  logo_url: string | null
  logo_type: string | null
  colors: string[] | null
  raw_analysis: {
    prices: Array<{ label: string; price: string }>
    opening_hours: Array<{ day: string; open: string; close: string }>
    website_url: string
  } | null
  error_message: string | null
}
```

**New shape must mirror the GET response exactly** — copy the `.select(...)` column list from `analyze-website/route.ts` line 242 verbatim as the type's field list:
```typescript
.select('status, logo_url, colors, logo_type, logo_candidates, image_urls, selected_background_color, selected_accent_color, raw_analysis, error_message, analyzed_at')
```
So `BrandingResult` becomes (additive — keep `logo_url`/`colors` for backward compat per CONTEXT.md's "additive only" framing in 47-PATTERNS.md, but CONTEXT.md for Phase 48 explicitly requires the reshape; the GET response already includes both old and new fields side by side):
```typescript
export type BrandingResult = {
  status: 'pending' | 'analyzing' | 'analyzed' | 'failed'
  logo_url: string | null
  logo_type: string | null
  logo_candidates: Array<{ url: string; type: string }> | null
  colors: Array<{ hex: string; role: string }> | null
  image_urls: string[] | null
  selected_background_color: string | null
  selected_accent_color: string | null
  raw_analysis: {
    prices: Array<{ label: string; price: string; source_page?: string }>
    opening_hours: Array<{ day: string; open: string; close: string; source_page?: string }>
    website_url: string
  } | null
  error_message: string | null
}
```

**`getContrastColor` (lines 52-70) — keep unchanged, it's pure and reusable as-is** for the new color-swatch/slot UI's text-legibility needs.

**`buildBrandingPreview` (lines 97-148) — must update 2 call sites:**
- Line 143 `logo_url: brandingResult.logo_url` — now should prefer the user's *selected* logo from `logo_candidates` once that selection exists (this phase introduces logo selection state but the PATCH route only persists color/gallery selections per D-08's literal field list; CONTEXT.md doesn't mention a `selected_logo_url`/`selected_logo_index` column — confirm with planner whether logo selection needs its own persisted field or stays purely client-state until quick-accept/continue. If no DB column exists, `buildBrandingPreview` should accept the locally-selected logo URL as a parameter rather than reading `brandingResult.logo_url` directly).
- The `colors[0]` comment at line 90 ("colors[0] is NOT embedded... passed separately as brandColor prop") — replace with `selected_background_color`/`selected_accent_color`-driven logic once those are set; `DiagonaalKortti`'s `brandColor` prop (line 35 of `DiagonaalKortti.tsx`) should now be fed `selected_background_color` directly.

---

### `app/business/onboarding/AnalysoiSivusto.tsx` (modify — add logo/color/gallery pickers + quick-accept)

**Analog:** itself — the `'preview'` phase render block (lines 344-429) is the exact splice point; local sub-components `LabelCaps` (lines 37-43), `PrimaryButton` (lines 45-67), `MutedButton` (lines 69-85) are the established primitives to reuse, not replace.

**Existing read-only swatch row to replace with an interactive picker** (lines 362-377 — this is the literal code being upgraded):
```typescript
{brandingResult.colors && brandingResult.colors.length > 0 && (
  <div className="flex flex-col gap-2">
    <LabelCaps>Brändivärit</LabelCaps>
    <div className="flex flex-row gap-2">
      {brandingResult.colors.map(hex => (
        <div
          key={hex}
          className="w-8 h-8 rounded-full border border-[rgba(0,0,0,0.07)]"
          style={{ backgroundColor: hex }}
          title={hex}
        />
      ))}
    </div>
  </div>
)}
```
New version: same `w-8 h-8 rounded-full border` swatch, but `colors` is now `Array<{hex, role}>`, each swatch becomes a `<button>` (not a `<div>`), selected state adds `ring-2 ring-[#111111] ring-offset-2` per 48-UI-SPEC.md Component Inventory. Pre-fill background/accent slots from `role` field (D-13) on first render.

**Existing logo block to upgrade from static `<img>` to radio-picker** (lines 350-360):
```typescript
{brandingResult.logo_url && (
  <div className="flex flex-col gap-2">
    <LabelCaps>Logo</LabelCaps>
    <img src={brandingResult.logo_url} alt="" className="h-12 w-auto object-contain rounded" />
  </div>
)}
```
New version iterates `brandingResult.logo_candidates` (array of `{url, type}`), each candidate wrapped in a `<button>` card (`border border-[rgba(0,0,0,0.12)] rounded-lg p-2`, selected gets `border-[#111111] ring-2 ring-[#111111]`), reusing the exact `h-12 w-auto object-contain` image sizing from the line above.

**Footer button row to extend with quick-accept** (lines 412-427 — existing two-button footer pattern, `PrimaryButton` already imported/defined):
```typescript
<div className="flex items-center justify-between pt-4 border-t border-[rgba(0,0,0,0.07)]">
  <button type="button" onClick={() => { setBrandingResult(null); setPhase('url-input') }} className="text-sm text-[rgba(17,17,17,0.45)] underline-offset-2 hover:underline hover:text-[#111111] transition-colors">
    Analysoi uudelleen
  </button>
  <PrimaryButton onClick={() => onConfirm(brandingResult)}>
    Jatka velhoon →
  </PrimaryButton>
</div>
```
Add a second `PrimaryButton` for "Hyväksy ja lähetä" next to the existing one (per 48-UI-SPEC.md Component Inventory — "both share the same visual weight... stack vertically with 8px gap on mobile"). New button needs its own `loading`/`submitting` state, reusing the existing `PrimaryButton` `loading` prop exactly as `handleSubmit`'s URL-input submit button already does (line 300-302).

**Autosave PATCH call pattern (D-07) — model on `handleSubmit`'s existing fetch shape** (lines 227-254, the POST-to-analyze-website call):
```typescript
const token = await getAuthToken()
const res = await fetch('/api/business/analyze-website', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify({ url: trimmed }),
})
if (!res.ok) { /* set error state */ }
```
New `patchBranding(partialSelection)` helper should follow this identical `getAuthToken()` → `fetch` → `if (!res.ok)` shape, called from each picker's `onClick`/`onChange` handler (logo pick, swatch pick, slot assignment, gallery checkbox toggle) — fire-and-forget per D-07, but surface failure inline per 48-UI-SPEC.md's error copy (`Valinnan tallennus epäonnistui. Yritä uudelleen.`).

**`getAuthToken` helper (lines 18-24) — reuse verbatim, do not duplicate:**
```typescript
async function getAuthToken(): Promise<string> {
  const supabase = createBusinessBrowserClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? ''
}
```

---

### Quick-accept draft-mapping logic (D-11 — new client-side function inside `AnalysoiSivusto.tsx` or a new helper, calls existing routes unmodified)

**Mapping source pattern 1:** `lib/onboardingUtils.ts::hinnastaToHintaKuvaus` (lines 65-75) — NOT directly usable in reverse (it serializes draft rows → display string), but the *type shape it consumes* (`{kategoria, hinta, lisatieto}[]`) is exactly what `onboarding_draft.hinnasto` expects, per `OnboardingDraft` type (lines 5-17 of the same file). The mapping function needed for D-11 goes the other way: `raw_analysis.prices` (`{label, price, source_page}[]`) → `hinnasto` shape:
```typescript
const hinnasto = brandingResult.raw_analysis.prices.map(p => ({
  kategoria: p.label,
  hinta: p.price,
  lisatieto: '',
}))
```
This is the exact inverse of `buildBrandingPreview`'s existing call (`brandingResult.ts` lines 118-124):
```typescript
hinnastaToHintaKuvaus(
  brandingResult.raw_analysis.prices.map(p => ({ kategoria: p.label, hinta: p.price, lisatieto: '' }))
)
```
Copy this exact `{kategoria, hinta, lisatieto: ''}` mapping shape, just stop short of calling `hinnastaToHintaKuvaus` — store the intermediate array directly into the draft's `hinnasto` field instead (since `save-step`/`submit` expect `hinnasto` as the array, not the serialized string — `submit/route.ts` line 57 calls `hinnastaToHintaKuvaus(draft.hinnasto ?? [])` itself).

**Mapping source pattern 2 (opening hours):** `brandingResult.ts` lines 105-113 — the existing `aukioloajat` conversion (`Array<{day,open,close}>` → `Record<day,{open,close}>`) is the exact transform needed for the draft's `aukioloajat` field:
```typescript
const aukioloajat = Object.fromEntries(
  brandingResult.raw_analysis.opening_hours.map(entry => [entry.day, { open: entry.open, close: entry.close }])
)
```

**Mapping source pattern 3 (yhteystiedot/media_urls):** Follow `OnboardingDraft` type shape (`onboardingUtils.ts` lines 5-17) — `yhteystiedot: {website: raw_analysis.website_url}`, `media_urls: {logo: <selected logo URL>, photos: <selected gallery URLs, capped at 5>}`.

**Write-then-submit sequence (D-11) — two sequential fetches, both following the existing `save-step`/`submit` call shape already used by `StepMediat.tsx` (lines 183-201 for save-step) and would need a new direct `submit` call:**
```typescript
// 1. Write each draft field via save-step (one call per field, matching ALLOWED_FIELDS)
await fetch('/api/business/onboarding/save-step', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify({ paikka_id: paikkaId, step: 6, field: 'hinnasto', value: hinnasto }),
})
// ... repeat for aukioloajat, yhteystiedot, media_urls

// 2. Call submit exactly as full-wizard completion does (UNMODIFIED per D-10)
const submitRes = await fetch('/api/business/onboarding/submit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify({ paikka_id: paikkaId }),
})
```
Note `save-step`'s `ALLOWED_FIELDS` allowlist (`save-step/route.ts` line 6: `['media_urls', 'hinnasto', 'aukioloajat', 'yhteystiedot']`) already covers every field D-11 needs to write — no changes needed there either. `step` parameter must be 1-6 per its validation (line 61) — use `6` (final step) for all quick-accept writes since this bypasses the stepped wizard entirely.

---

### `app/business/onboarding/StepMediat.tsx` (modify — accept gallery selections as `existingPhotoUrls` seed)

**Analog:** itself — the `existingPhotoUrls` initializer (lines 40-44) is the exact splice point:
```typescript
const [existingPhotoUrls, setExistingPhotoUrls] = useState<string[]>(
  editMode
    ? ((initialPaikka?.photo_urls as string[] | null) ?? [])
    : (initialDraft?.media_urls?.photos ?? [])
)
```
Per D-06, when the user continues to the wizard (not quick-accept), pre-vaihe gallery selections must already be written into `onboarding_draft.media_urls.photos` via the autosave PATCH→draft sync (or via an explicit `save-step` call when transitioning from `'preview'` to wizard mode in `page.tsx`'s `handleConfirm`). Since `StepMediat` already reads `initialDraft?.media_urls?.photos` unconditionally, **no code change to `StepMediat.tsx` itself may be required** if `handleConfirm` (in `app/business/onboarding/page.tsx`) is updated to first persist the pre-vaihe gallery selection into `onboarding_draft.media_urls` before navigating into the wizard. Confirm with planner whether the integration point is `page.tsx`'s `handleConfirm` (zero `StepMediat.tsx` changes) or `StepMediat.tsx`'s prop signature (new `prefilledGalleryUrls` prop merged into the existing `existingPhotoUrls` initializer) — CONTEXT.md's wording ("flow into `StepMediat` as `existingPhotoUrls`") slightly favors the latter, but the former achieves the same UI result with less surface area changed.

**5-photo cap pattern already established** (line 56, reused verbatim by the gallery picker per D-05/48-UI-SPEC.md):
```typescript
const totalPhotos = existingPhotoUrls.length + photoFiles.length
const photosAtMax = totalPhotos >= 5
```

**Checkbox/delete-badge corner-overlay visual pattern to mirror for the gallery picker's checkmark badge** (lines 384-395 — `×` delete badge on existing photos):
```typescript
<div key={url} className="relative">
  <img src={url} alt={t('photoDeleteAlt')} className="w-16 h-16 object-cover rounded-lg" />
  <button
    type="button"
    onClick={() => handleDeleteExistingPhoto(url)}
    className="absolute -top-1 -right-1 bg-[#111111] text-white rounded-full w-5 h-5 text-xs flex items-center justify-center leading-none"
    aria-label={t('photoDeleteAlt')}
  >
    ×
  </button>
</div>
```
Per 48-UI-SPEC.md Component Inventory, the gallery picker in `AnalysoiSivusto.tsx` reuses this exact corner-badge shape but swaps `×` for a checkmark icon (lucide `Check`) and the action from delete to toggle-select.

---

## Shared Patterns

### JWT auth verification (applies to: new PATCH route, all modified files that call routes)
**Source:** `app/api/business/onboarding/save-step/route.ts` lines 28-33, identical in `analyze-website/route.ts`, `submit/route.ts`, `update-paikka/route.ts`
```typescript
const authHeader = request.headers.get('Authorization')
const token = authHeader?.replace('Bearer ', '') ?? ''
const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
if (authError || !user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

### Ownership check via business_paikka_links (applies to: new PATCH route)
**Source:** `app/api/business/onboarding/save-step/route.ts` lines 86-95; stricter `claim_status='approved'` variant in `app/api/business/analyze-website/route.ts` lines 190-199
```typescript
const { data: link } = await supabaseAdmin
  .from('business_paikka_links')
  .select('id')
  .eq('business_account_id', user.id)
  .eq('paikka_id', paikkaId)
  .maybeSingle()
if (!link) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

### UPSERT with composite onConflict (applies to: new PATCH route)
**Source:** `app/api/business/analyze-website/route.ts` (3 call sites, all `{ onConflict: 'business_account_id,paikka_id' }` post-Phase-47) and `save-step/route.ts` line 110
```typescript
{ onConflict: 'business_account_id,paikka_id' }
```

### Client-side auth token retrieval (applies to: AnalysoiSivusto.tsx new autosave calls)
**Source:** `app/business/onboarding/AnalysoiSivusto.tsx` lines 18-24
```typescript
async function getAuthToken(): Promise<string> {
  const supabase = createBusinessBrowserClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? ''
}
```

### JSON error response shape (applies to: new PATCH route)
**Source:** every business route, e.g. `app/api/business/analyze-website/route.ts` line 175
```typescript
return NextResponse.json({ error: 'Invalid or private URL' }, { status: 400 })
```

### Hex color validation (applies to: PATCH route's custom-hex override path, D-09)
**Source:** `lib/branding/analyzer.ts` (per 47-PATTERNS.md WR-04 excerpt) — existing hex regex precedent
```typescript
/^#[0-9a-fA-F]{3,6}$/
```
D-09 requires a 6-digit-only custom override (`#rrggbb`); use the stricter `/^#[0-9a-fA-F]{6}$/` for that specific path while membership-validated AI colors can keep the looser 3-or-6 form already stored.

### Finnish UI copy + glassmorphism primitives (applies to: AnalysoiSivusto.tsx new picker UI)
**Source:** `app/business/onboarding/AnalysoiSivusto.tsx` `LabelCaps`/`PrimaryButton`/`MutedButton` (lines 37-85); exact copy strings specified in `.planning/phases/48-logo-v-ri-ja-galleriavalinta/48-UI-SPEC.md` Copywriting Contract table — use these strings verbatim.

## No Analog Found

None — every file in scope has at least a role-match analog within the existing `app/api/business/`, `app/business/onboarding/`, and `lib/branding/` directories. The one genuinely new mechanic (D-08's AI-candidate membership validation) has no literal precedent but is a straightforward composition of the existing ownership-check query shape + an array-membership filter, both well established elsewhere in this codebase.

## Metadata

**Analog search scope:** `app/api/business/` (analyze-website, onboarding/submit, onboarding/save-step, update-paikka — all read in full), `app/business/onboarding/` (AnalysoiSivusto.tsx, StepMediat.tsx, page.tsx — all read in full), `app/business/WizardInner.tsx` (read in full for integration-point confirmation), `lib/branding/brandingResult.ts` (read in full), `lib/onboardingUtils.ts` (read in full), `app/components/DiagonaalKortti.tsx` (read in full), `supabase/migrations/20260616100000_business_branding_plural_and_paikka_scoping.sql` (read in full, confirms no new migration needed), Phase 47's PATTERNS.md (referenced for established SSRF/UPSERT/ownership conventions this phase inherits)
**Files scanned:** 11
**Pattern extraction date:** 2026-06-16
