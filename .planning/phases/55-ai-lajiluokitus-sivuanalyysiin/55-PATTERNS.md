# Phase 55: AI-lajiluokitus sivuanalyysiin - Pattern Map

**Mapped:** 2026-06-23
**Files analyzed:** 9 (6 modified, 2 migrations, 1 new test file recommended)
**Analogs found:** 9 / 9 (all are direct same-file extensions — this is a "thread one more field through existing pipes" phase, not a new-component phase)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|---------------|
| `lib/branding/prompt.ts` | config (prompt template) | transform | same file, existing `logos[].type`/`colors[].role` enum sections | exact (self-extension) |
| `lib/branding/analyzer.ts` | service (AI response validator) | transform | same file, `VALID_LOGO_TYPES`/`VALID_COLOR_ROLES` allowlist-filter (lines 41-42, 111-136) | exact (self-extension) |
| `lib/branding/brandingResult.ts` | model (client-safe type) | transform | same file, `logo_type`/`selected_logo_url` field shape | exact (self-extension) |
| `app/api/business/analyze-website/route.ts` | route (GET + background UPSERT) | request-response / event-driven | same file's existing `.select()` column list + `business_branding` UPSERT in `runAnalysis` (not re-read this pass — confirmed via RESEARCH.md line-level citations) | exact (self-extension) |
| `app/api/business/onboarding/save-step/route.ts` | route (field-agnostic UPSERT) | CRUD | same file, `ALLOWED_FIELDS` + `aukioloajat`/`hinnasto` field-specific validation block (lines 6, 80-88) | exact (self-extension) |
| `app/api/business/onboarding/submit/route.ts` | route (atomic commit + delete) | CRUD | same file, `.update({...})` payload + `yhteystiedot`-derived optional fields (lines 75-87) | exact (self-extension) |
| `app/business/onboarding/AnalysoiSivusto.tsx` | component (client, suggestion card + picker) | request-response / event-driven | same file, Logo picker block (191-233) + color armed-slot pattern (276-324) + custom-hex free-text input (326-346) + `handleQuickAccept`'s `fieldsToWrite` (705-710) + `onReanalyze` reset block (955-971) | exact (self-extension, multiple sub-patterns) |
| `app/business/onboarding/page.tsx` | component (server-ish orchestrator, `handleConfirm`/`handleSkip`) | event-driven | same file, `handleConfirm`'s `media_urls` await-before-navigate write | exact (self-extension) |
| `app/business/onboarding/StepPaikka.tsx` (or new D-06 picker insertion) | component | event-driven | `AnalysoiSivusto.tsx`'s Vaihda picker (shared component once built) | role-match — no existing manual-category picker exists anywhere in the codebase; this is genuinely new UI reusing a pattern built in the SAME phase, not an external analog |
| `lib/branding/analyzer.test.ts` | test | unit | same file, existing `'defaults an invalid logo type to "unknown"'` / `'filters non-hex colors and defaults an invalid role to "unknown"'` test cases | exact (self-extension) |
| `tests/api/submit.test.ts` (new) | test | unit (route) | `tests/api/update-paikka.test.ts` (mock-builder pattern) | role-match |
| `tests/api/save-step.test.ts` (new, optional) | test | unit (route) | `tests/api/update-paikka.test.ts` | role-match |
| `supabase/migrations/<ts>_business_branding_suggested_laji.sql` | migration | transform | `supabase/migrations/20260616110000_business_branding_selected_logo_url.sql` | exact |
| `supabase/migrations/<ts>_onboarding_draft_add_laji.sql` | migration | transform | `supabase/migrations/20260606000000_onboarding.sql`'s `ALTER TABLE business_accounts ADD COLUMN IF NOT EXISTS onboarding_completed` | exact |

**Key framing:** every production file in this phase is a same-file extension of an already-established pattern — there is no genuinely new architectural shape anywhere except the Vaihda/D-06 picker UI, which itself reuses sibling patterns inside `AnalysoiSivusto.tsx` (button grid + free-text input, both pre-existing in the same file). Planner should NOT invent new validation/persistence idioms; every task is "copy this exact shape, change the field name."

---

## Pattern Assignments

### `lib/branding/prompt.ts`

**Analog:** same file — `logos[]`/`colors[]` enum-constrained field declarations (lines 32-46, field rules 50-73)

**JSON schema pattern** (lines 32-46):
```typescript
{
  "logos": [
    { "index": <integer 0-based index into the logo images array>, "type": "wordmark" | "icon" | "combination" }
  ],
  "colors": [
    { "hex": "#rrggbb", "role": "background" | "primary" | "secondary" | "accent" | "text" | "unknown" }
  ],
  // ...
  "website_url": <string canonical URL, or "">
}
```
Add a sibling top-level key `"laji": "padel" | "tennis" | "jooga" | "kuntosali" | "uinti" | "kiipeily" | "jääkiekko" | "liikuntahalli" | "liikunta" | null` — **build this enum string at module load via** `Object.keys(lajiKonfig).join('" | "')` interpolated into the template literal, NOT a hand-typed list, so it can never drift from `lib/lajit.ts` (RESEARCH.md Anti-Pattern explicitly flags this). `prompt.ts` is server-only-imported (only by `analyzer.ts`), so importing `lajiKonfig` here is safe.

**Field rules pattern** (lines 60-72, color section is the closest "rank/uncertain" precedent):
```
laji:
- Infer the single most likely sport/activity category for this venue from its website content.
- You MUST choose ONLY from this exact list of keys: <interpolated keys>. Do not invent new categories.
- If you are not confident, or the site gives no clear sport-specific signal, return null. Do NOT guess.
- Never return free text outside the listed keys.
```

**Output rules note:** existing line 92-96 footer ("Respond ONLY with the JSON object...If you genuinely find nothing for an array field, return an empty array [] — never invent data.") — extend the spirit but note `laji` is a scalar (use `null`, not `[]`), call this out explicitly to avoid Claude defaulting to an empty string.

---

### `lib/branding/analyzer.ts`

**Analog:** same file — `VALID_LOGO_TYPES`/`VALID_COLOR_ROLES` allowlist-and-filter pattern

**Imports pattern** (lines 1-6, add one line):
```typescript
import Anthropic from '@anthropic-ai/sdk'
import { BRANDING_ANALYSIS_PROMPT } from './prompt'
import { lajiKonfig } from '@/lib/lajit'   // NEW — single source of truth for the 9-key allowlist
```

**Type/interface pattern** (lines 28-39) — add `suggested_laji: string | null` to `BrandingAnalysisResult`, directly analogous to how `logo_index` was added as an additive backward-compat field:
```typescript
export interface BrandingAnalysisResult {
  logos: Array<{ index: number; type: LogoType }>
  colors: Array<{ hex: string; role: ColorRole }>
  prices: Array<{ label: string; price: string; source_page: string }>
  opening_hours: Array<{ day: string; open: string; close: string; source_page: string }>
  website_url: string
  raw_analysis: unknown
  logo_index: number
  suggested_laji: string | null   // NEW — validated against lib/lajit.ts's 9 keys; null if missing/invalid
}
```

**Allowlist constant pattern** (lines 41-42):
```typescript
const VALID_LOGO_TYPES: LogoType[] = ['wordmark', 'icon', 'combination', 'unknown']
const VALID_COLOR_ROLES: ColorRole[] = ['background', 'primary', 'secondary', 'accent', 'text', 'unknown']
const VALID_LAJI_KEYS: string[] = Object.keys(lajiKonfig)   // NEW — derived, never hardcoded
```

**Raw-result type-cast pattern** (lines 103-109) — add `laji?: unknown` to the inline parse type:
```typescript
const result = parseClaudeJson(rawText) as {
  logos?: Array<{ index?: unknown; type?: unknown }>
  colors?: Array<{ hex?: unknown; role?: unknown }>
  prices?: Array<{ label?: unknown; price?: unknown; source_page?: unknown }>
  opening_hours?: Array<{ day?: unknown; open?: unknown; close?: unknown; source_page?: unknown }>
  website_url?: unknown
  laji?: unknown   // NEW
}
```

**Validation pattern — DISCARD-to-null, NOT default-to-sentinel** (lines 111-124, the logos filter/map is the closest shape, but the *semantics* must follow D-03/D-07's discard-to-null requirement, which is closer to the color-hex-regex filter's "drop if invalid" spirit than the logo-type "default to unknown" spirit):
```typescript
// 6b. Validate suggested_laji: discard (→ null) anything not in the live taxonomy.
// Unlike logo type (defaults to 'unknown'), this MUST become null on any mismatch —
// the UI's "unconfirmed" state (D-03) is keyed on suggested_laji === null, not a sentinel string.
const rawLaji = typeof result.laji === 'string' ? result.laji : null
const suggested_laji: string | null =
  rawLaji && VALID_LAJI_KEYS.includes(rawLaji) ? rawLaji : null
```

**Return statement pattern** (lines 162-170):
```typescript
return {
  logos,
  colors,
  prices,
  opening_hours,
  website_url,
  raw_analysis: result,
  logo_index,
  suggested_laji,   // NEW
}
```

**Error handling:** unchanged — the existing top-level `try { ... } catch (err) { console.error(...); throw err }` (lines 49, 171-174) wraps the whole function; no new error handling needed since `suggested_laji` derivation can never throw (pure string check).

---

### `lib/branding/brandingResult.ts`

**Analog:** same file — `logo_type: string | null` field (mirrors exactly)

**Type pattern** (lines 31-53):
```typescript
export type BrandingResult = {
  status: 'pending' | 'analyzing' | 'analyzed' | 'failed'
  logo_url: string | null
  logo_type: string | null
  colors: Array<{ hex: string; role: string }> | null
  logo_candidates: Array<{ url: string; type: string }> | null
  image_urls: string[] | null
  selected_logo_url: string | null
  selected_background_color: string | null
  selected_accent_color: string | null
  suggested_laji: string | null   // NEW — mirrors logo_type's placement/nullability exactly
  raw_analysis: { prices: ...; opening_hours: ...; website_url: string } | null
  error_message: string | null
}
```
No change needed to `getContrastColor` or `buildBrandingPreview` (confirmed by RESEARCH.md — `buildBrandingPreview` already maps `paikkaBase.laji` straight through and is untouched by this phase).

---

### `app/api/business/onboarding/save-step/route.ts`

**Analog:** same file — `ALLOWED_FIELDS` const + `aukioloajat`/`hinnasto` field-specific validation block

**ALLOWED_FIELDS pattern** (line 6):
```typescript
const ALLOWED_FIELDS = ['media_urls', 'hinnasto', 'aukioloajat', 'yhteystiedot', 'laji'] as const
```

**Field-specific validation pattern** (lines 79-88, `hinnasto`'s shape is the closest template — simple type+bound check, no nested-object walk like `isValidAukioloajat`):
```typescript
if (field === 'aukioloajat' && !isValidAukioloajat(value)) {
  return NextResponse.json({ error: 'aukioloajat: invalid shape or time format' }, { status: 400 })
}
if (field === 'hinnasto') {
  const rows = value as unknown[]
  if (!Array.isArray(rows) || rows.length > 20) {
    return NextResponse.json({ error: 'hinnasto: max 20 rows' }, { status: 400 })
  }
}
// NEW — bounds the D-02 free-text escape hatch (RESEARCH.md Pitfall 5):
if (field === 'laji') {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > 100) {
    return NextResponse.json({ error: 'laji: invalid value' }, { status: 400 })
  }
}
```

**Auth/ownership pattern** (lines 24-33 JWT verify, 90-102 `business_paikka_links` ownership check) — unchanged, applies uniformly to every `ALLOWED_FIELDS` member with zero new code, `laji` included for free.

**UPSERT pattern** (lines 107-118) — unchanged, `[field]: value` computed property already handles any new field name generically.

---

### `app/api/business/onboarding/submit/route.ts`

**Analog:** same file — `varauslinkki`'s "validate-then-conditionally-include" pattern (lines 63-73) is the closest precedent for "don't blindly spread a possibly-null draft field into the UPDATE payload" — closer in spirit than the unconditional `kuvaus`/`puhelin: ?.trim() ?? null` fields, because those intentionally allow null-overwrite (blank-if-not-provided) while `laji` must NOT null-overwrite (RESEARCH.md Pitfall 2).

**Current UPDATE payload** (lines 75-87, verbatim — confirms `laji` is touched nowhere today):
```typescript
const { error: updateError } = await supabaseAdmin
  .from('liikuntapaikat')
  .update({
    hinta_kuvaus: hintaKuvaus,
    aukioloajat: draft.aukioloajat ?? null,
    kuvaus: draft.yhteystiedot?.kuvaus?.trim() ?? null,
    puhelin: draft.yhteystiedot?.puhelin?.trim() ?? null,
    varauslinkki,
    image_url: draft.media_urls?.photos?.[0] ?? null,
    photo_urls: draft.media_urls?.photos ?? null,
    logo_url: draft.media_urls?.logo ?? null,
  })
  .eq('id', draft.paikka_id)
```

**Required new pattern — conditional spread, NEVER an unconditional key** (mirrors `varauslinkki`'s try/catch-then-assign-or-leave-null shape, adapted to spread-omission since `laji` must not even appear in the payload when absent):
```typescript
const { error: updateError } = await supabaseAdmin
  .from('liikuntapaikat')
  .update({
    hinta_kuvaus: hintaKuvaus,
    aukioloajat: draft.aukioloajat ?? null,
    kuvaus: draft.yhteystiedot?.kuvaus?.trim() ?? null,
    puhelin: draft.yhteystiedot?.puhelin?.trim() ?? null,
    varauslinkki,
    image_url: draft.media_urls?.photos?.[0] ?? null,
    photo_urls: draft.media_urls?.photos ?? null,
    logo_url: draft.media_urls?.logo ?? null,
    ...(draft.laji ? { laji: draft.laji } : {}),   // NEW — omit key entirely when unset (Pitfall 2)
  })
  .eq('id', draft.paikka_id)
```
**Critical:** do NOT write `laji: draft.laji ?? undefined` as a plain object key — RESEARCH.md confirms Supabase's `.update()` only respects keys *present* in the object, and a present `undefined` value still risks driver-level inconsistency; the conditional spread is the only safe form.

**Error handling:** unchanged — existing `if (updateError) { return NextResponse.json({ error: 'Update failed', ... }, { status: 500 }) }` (lines 89-92) covers the widened payload with zero new code.

---

### `app/business/onboarding/AnalysoiSivusto.tsx`

**Analog:** same file — multiple sibling sub-patterns already present (logo picker, color armed-slot, custom-hex free text, quick-accept fieldsToWrite, onReanalyze reset)

**Imports pattern** (top of file — not re-read this pass, but `LabelCaps`/`PrimaryButton`/`MutedButton`/`Spinner`/`Check` from `lucide-react` are already imported and reused verbatim per UI-SPEC; `lajiKonfig` needs a new import):
```typescript
import { lajiKonfig } from '@/lib/lajit'
```

**Suggestion card "Suggested" state pattern** — closest analog is the Logo picker's "found vs not found" branching (lines 192-233) combined with the color-swatch selected-state styling (lines 256-270):
```tsx
{/* Laji suggestion card (AI-06, D-01/D-03) — insert between Galleria (ends 407) and Hinnat (starts 409) */}
<div className="flex flex-col gap-2">
  <LabelCaps>Laji</LabelCaps>
  {lajiState === 'suggested' && (
    <>
      <p className="text-sm font-bold text-[#111111]">
        Ehdotettu laji: {lajiKonfig[suggestedLajiKey!]?.label}
      </p>
      <div className="flex flex-row gap-2">
        <PrimaryButton onClick={handleVahvistaLaji}>Vahvista</PrimaryButton>
        <MutedButton onClick={() => setLajiPickerOpen(true)}>Vaihda</MutedButton>
      </div>
    </>
  )}
  {lajiState === 'confirmed' && (
    <>
      <p className="text-sm font-bold text-[#111111]">Laji: {lajiKonfig[confirmedLaji!]?.label ?? confirmedLaji}</p>
      <MutedButton onClick={() => setLajiPickerOpen(true)}>Vaihda</MutedButton>
    </>
  )}
  {lajiState === 'unconfirmed' && (
    <>
      <p className="text-sm text-[rgba(17,17,17,0.45)]">
        Lajia ei tunnistettu automaattisesti — valitse lajikategoria
      </p>
      <PrimaryButton onClick={() => setLajiPickerOpen(true)}>Valitse laji</PrimaryButton>
    </>
  )}
  {lajiPickerOpen && (/* picker block, see next pattern */)}
</div>
```

**Vaihda picker — taxonomy button grid pattern** (direct copy of the logo-candidate grid shape, lines 203-224, with color-armed-slot's selected-state border/ring, lines 280-282):
```tsx
<div className="flex flex-row flex-wrap gap-2">
  {Object.entries(lajiKonfig).map(([key, cfg]) => {
    const isSelected = pickerSelection === key
    return (
      <button
        key={key}
        type="button"
        onClick={() => setPickerSelection(key)}
        className={`border rounded-lg p-2 text-sm transition-colors ${
          isSelected ? 'border-[#111111] ring-2 ring-[#111111] font-bold text-[#111111]' : 'border-[rgba(0,0,0,0.12)] text-[rgba(17,17,17,0.45)]'
        }`}
      >
        {cfg.label}
      </button>
    )
  })}
</div>
```

**Vaihda picker — free-text input pattern** (direct copy of the custom-hex input block, lines 326-346):
```tsx
<div className="flex flex-col gap-1">
  <LabelCaps>Muu</LabelCaps>
  <div className="flex flex-row gap-2">
    <input
      type="text"
      value={freeTextLaji}
      onChange={e => {
        setFreeTextLaji(e.target.value)
        if (lajiFreeTextError) setLajiFreeTextError(null)
      }}
      placeholder="Muu laji…"
      aria-label="Muu laji"
      className="border border-[rgba(0,0,0,0.12)] rounded-lg h-10 px-3 text-sm text-[#111111] outline-none focus:border-[rgba(0,0,0,0.3)] flex-1"
    />
    <MutedButton onClick={handleFreeTextLajiSubmit}>Käytä</MutedButton>
  </div>
  {lajiFreeTextError && (
    <p className="text-sm text-red-600" role="alert">
      {lajiFreeTextError}
    </p>
  )}
</div>
```
Validation mirrors `handleCustomHexSubmit`'s shape (non-empty + bounded length, error set via local state — same idiom as `customHexError`).

**`onConfirm` call-site widening pattern** (lines 460-474) — confirmed laji must travel into `page.tsx`'s `handleConfirm`. Minimal-diff approach per RESEARCH.md: widen the second argument object:
```tsx
<PrimaryButton
  onClick={() =>
    onConfirm(
      { ...brandingResult, selected_background_color: bgColor, selected_accent_color: accentColor },
      { logoUrl: selectedLogoUrl, gallery: selectedGallery, laji: confirmedLaji }   // NEW: laji added
    )
  }
  disabled={submittingQuick}
>
  Jatka velhoon →
</PrimaryButton>
```
**Must also update:** `AnalysoiSivustoProps.onConfirm` type (this file, lines ~21-24) and `PrePhase`'s `onConfirm` prop type (page.tsx lines ~109-112) to keep the three declarations in sync (RESEARCH.md explicit warning).

**`handleQuickAccept`'s `fieldsToWrite` pattern** (lines 705-710) — widen the union type and array:
```typescript
const fieldsToWrite: Array<{ field: 'hinnasto' | 'aukioloajat' | 'yhteystiedot' | 'media_urls' | 'laji'; value: unknown }> = [
  { field: 'hinnasto', value: hinnasto },
  { field: 'aukioloajat', value: aukioloajat },
  { field: 'yhteystiedot', value: yhteystiedot },
  { field: 'media_urls', value: media_urls },
  { field: 'laji', value: confirmedLaji },   // NEW
]
```
Same sequential-not-transactional, idempotent-UPSERT-retry comment block (lines 712-719) applies unchanged — no new error handling needed, per the existing documented design.

**`onReanalyze` reset pattern** (lines 955-971) — add laji state resets to the same block, per D-05:
```typescript
onReanalyze={() => {
  selectionInitialisedRef.current = false
  setSelectedLogoUrl(null)
  setBgColor(null)
  setBgSource('ai')
  setAccentColor(null)
  setAccentSource('ai')
  setArmedSlot(null)
  setSelectedGallery([])
  setBrandingResult(null)
  setLajiState('suggested')      // NEW — or whatever sentinel represents "not yet evaluated"
  setSuggestedLajiKey(null)      // NEW
  setConfirmedLaji(null)         // NEW
  setLajiPickerOpen(false)       // NEW
  setPhase('url-input')
}}
```

**One-time init effect pattern** (referenced at lines 549-585 by RESEARCH.md, not re-read here to avoid duplicate context — same `selectionInitialisedRef`-guarded `useEffect` keyed on `brandingResult` that seeds `selectedLogoUrl`/`bgColor`/`accentColor` from the AI result; add laji seeding to the same effect body): seed `confirmedLaji`/`lajiState` from `brandingResult.suggested_laji`, defaulting to the unconfirmed state when null/invalid, per D-03.

**Error handling:** suggestion card and picker need zero new error-handling patterns beyond the free-text length/empty validation shown above — reuses the exact `text-sm text-red-600 role="alert"` idiom already used three times in this file (`customHexError`, `saveError`, `quickError`).

---

### `app/business/onboarding/page.tsx`

**Analog:** same file — `handleConfirm`'s `media_urls` await-before-navigate write

**Current pattern** (lines 171-212, RESEARCH.md verbatim):
```typescript
async function handleConfirm(
  result: BrandingResult,
  selections: { logoUrl: string | null; gallery: string[] }
) {
  setBrandingData(result)

  if (paikkaId !== null) {
    try {
      const supabase = createBusinessBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token ?? ''
      await fetch('/api/business/onboarding/save-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({
          paikka_id: paikkaId,
          step: 0,
          field: 'media_urls',
          value: { logo: selections.logoUrl, photos: selections.gallery },
        }),
      })
    } catch {
      // Non-blocking: if the write fails, still allow navigation.
    }
  }

  setPagePhase('wizard')
}
```

**Required extension** — widen `selections` type and add a second sequential `save-step` write (simplest option, per RESEARCH.md's stated preference for the existing single-try/catch precedent — but a second independent try/catch is equally valid):
```typescript
async function handleConfirm(
  result: BrandingResult,
  selections: { logoUrl: string | null; gallery: string[]; laji: string | null }   // NEW field
) {
  setBrandingData(result)

  if (paikkaId !== null) {
    try {
      const supabase = createBusinessBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token ?? ''
      await fetch('/api/business/onboarding/save-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({
          paikka_id: paikkaId,
          step: 0,
          field: 'media_urls',
          value: { logo: selections.logoUrl, photos: selections.gallery },
        }),
      })
      if (selections.laji) {   // NEW — only write if confirmed; never send null/empty
        await fetch('/api/business/onboarding/save-step', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
          body: JSON.stringify({ paikka_id: paikkaId, step: 0, field: 'laji', value: selections.laji }),
        })
      }
    } catch {
      // Non-blocking: if the write fails, still allow navigation.
    }
  }

  setPagePhase('wizard')
}
```

**`handleSkip` pattern** (lines 214-217, current shape per RESEARCH.md: `setBrandingData(null); setPagePhase('wizard')`) — D-06's manual picker needs to gate or precede this call. Planner's discretion on exact placement (inline in `AnalysoiSivusto`'s skip-triggering phases vs. a new intermediate `page.tsx` phase) — both options reuse the SAME Vaihda picker JSX pattern documented above, just rendered without the AI-suggestion framing (no "Ehdotettu" copy, no Vahvista button, picker opens directly per UI-SPEC's "Picker open" row).

---

### Skip-path manual picker (D-06) — new insertion, no external analog

**Analog:** the Vaihda picker built earlier in THIS SAME phase (`AnalysoiSivusto.tsx`'s taxonomy grid + free-text input) — there is no pre-existing "manual category picker" anywhere else in the codebase to copy from; `StepPaikka.tsx` (lines confirmed by RESEARCH.md, 65-line file, narrow `{ nimi, osoite, kaupunki }` prop type) has zero laji UI today.

**Recommendation for planner:** extract the picker body (taxonomy grid + free-text input + Käytä/Peruuta) into a small reusable sub-component (e.g. `LajiPicker`) inside `AnalysoiSivusto.tsx` or a new shared file, so both the Vaihda flow and the D-06 skip-path flow render the identical JSX/validation without duplicating it. This is a planner-level structural decision, not a pattern-mapping finding — flagging here so the plan doesn't accidentally hand-roll two divergent picker implementations.

---

### `lib/branding/analyzer.test.ts`

**Analog:** same file — existing `'defaults an invalid logo type to "unknown"'` / `'filters non-hex colors and defaults an invalid role to "unknown"'` test cases (exact names/shapes not re-read this pass; confirmed to exist via RESEARCH.md's Validation Architecture section, which cites these test titles directly from the file).

**Pattern to follow:** mock the Anthropic client's response to include a `laji` field, assert `result.suggested_laji` for: (a) valid key passes through, (b) invalid/out-of-taxonomy string becomes `null`, (c) missing field becomes `null`, (d) omitting `laji` from the mocked response entirely does not throw and other fields (`logos`/`colors`/`prices`/`opening_hours`) remain correctly shaped (criterion 4 regression guard).

---

### `tests/api/submit.test.ts` (new file)

**Analog:** `tests/api/update-paikka.test.ts` — mock `next/server`'s `NextResponse.json`, mock `@/lib/supabaseAdmin.server` with a chainable builder keyed by table name, import the route's exported `POST` handler AFTER mocks are set up.

**Pattern to follow:** two cases — (1) `draft.laji` set → UPDATE payload includes `laji: <value>`; (2) `draft.laji` falsy/absent → UPDATE payload key `laji` is entirely absent (not `null`) from the call args passed to the mocked `.update()`. This directly tests the conditional-spread fix for Pitfall 2/criterion 4.

---

### `tests/api/save-step.test.ts` (new file, optional per RESEARCH.md)

**Analog:** `tests/api/update-paikka.test.ts`'s field-validation test shape, applied to the new `laji` branch in `save-step/route.ts` (empty-string rejection, >100-char rejection, valid string accepted).

---

### Migrations

**`business_branding.suggested_laji`** — analog `supabase/migrations/20260616110000_business_branding_selected_logo_url.sql` (bare nullable TEXT, no default, `ADD COLUMN IF NOT EXISTS`):
```sql
ALTER TABLE business_branding
  ADD COLUMN IF NOT EXISTS suggested_laji TEXT;
```

**`onboarding_draft.laji`** — analog `supabase/migrations/20260606000000_onboarding.sql`'s `ALTER TABLE business_accounts ADD COLUMN IF NOT EXISTS onboarding_completed` idiom:
```sql
ALTER TABLE onboarding_draft
  ADD COLUMN IF NOT EXISTS laji TEXT;
```
Naming convention: `YYYYMMDDHHMMSS_description.sql`, header comment with `-- Phase 55 Task N: <summary> (AI-06)` + `-- Analog source: <file>`, always `ADD COLUMN IF NOT EXISTS`.

---

## Shared Patterns

### Allowlist-and-filter validation (the central cross-cutting pattern of this phase)
**Source:** `lib/branding/analyzer.ts` lines 41-42, 111-136 (`VALID_LOGO_TYPES`/`VALID_COLOR_ROLES`)
**Apply to:** `analyzer.ts`'s new `suggested_laji` derivation — the ONLY difference from the existing logo/color pattern is discard-to-`null` instead of default-to-sentinel-string, per D-03's explicit requirement.
```typescript
const VALID_LAJI_KEYS: string[] = Object.keys(lajiKonfig)
const rawLaji = typeof result.laji === 'string' ? result.laji : null
const suggested_laji: string | null = rawLaji && VALID_LAJI_KEYS.includes(rawLaji) ? rawLaji : null
```

### Deferred-to-submit persistence (NOT immediate PATCH)
**Source:** `app/api/business/onboarding/save-step/route.ts` + `submit/route.ts` (the `onboarding_draft` → atomic-copy-then-delete two-phase pattern, contrasted with `PATCH /api/business/branding`'s immediate write used by logo/colors)
**Apply to:** every laji write path in `AnalysoiSivusto.tsx`/`page.tsx` — confirming/changing laji must NEVER call `PATCH /api/business/branding`; it always goes through `save-step` then `submit`. This is the load-bearing architectural constraint of the whole phase (success criterion 3).

### Conditional-spread omission for "never overwrite with null" fields
**Source:** `app/api/business/onboarding/submit/route.ts`'s `varauslinkki` validate-then-assign-or-leave-null pattern (lines 63-73), adapted
**Apply to:** the `submit/route.ts` UPDATE payload's `laji` key — `...(draft.laji ? { laji: draft.laji } : {})`, never an unconditional key with `?? undefined`/`?? null`.

### Glass card / button vocabulary (UI-SPEC, no new visual language)
**Source:** `AnalysoiSivusto.tsx`'s `LabelCaps`/`PrimaryButton`/`MutedButton`/`Spinner` sub-components, button-grid selected-state class (`border-[#111111] ring-2 ring-[#111111]`)
**Apply to:** suggestion card, Vaihda picker, D-06 skip-path picker — all three reuse these exact sub-components and class strings, zero new colors/sizes/weights per CLAUDE.md and UI-SPEC.

### Idempotent sequential UPSERT writes (no new error handling needed)
**Source:** `AnalysoiSivusto.tsx`'s `handleQuickAccept` `fieldsToWrite` loop (lines 712-719 comment block)
**Apply to:** the new `laji` entry in `fieldsToWrite` — inherits the existing "RECOVERABLE by design" idempotent retry semantics for free; do not add new try/catch granularity per field.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| D-06 skip-path manual picker (exact component) | component | event-driven | No existing "manual category picker" exists anywhere in the codebase prior to this phase — its only analog is the Vaihda picker built in this SAME phase. Planner should design it as a shared/extracted component to avoid duplicating the Vaihda JSX twice. |

---

## Metadata

**Analog search scope:** `lib/branding/`, `app/api/business/`, `app/business/onboarding/`, `lib/lajit.ts`, `supabase/migrations/`, `tests/api/`
**Files scanned:** `lib/branding/analyzer.ts`, `lib/branding/prompt.ts`, `lib/branding/brandingResult.ts`, `app/api/business/onboarding/save-step/route.ts`, `app/api/business/onboarding/submit/route.ts`, `app/business/onboarding/AnalysoiSivusto.tsx` (lines 1-484, 700-740, 945-973), `lib/lajit.ts`
**Pattern extraction date:** 2026-06-23
