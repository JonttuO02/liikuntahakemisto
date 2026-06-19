# Phase 51: Live-esikatselu velhossa - Pattern Map

**Mapped:** 2026-06-18
**Files analyzed:** 9 (3 new, 6 modified)
**Analogs found:** 9 / 9

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `lib/livePreview/LivePreviewContext.tsx` (new) | provider | event-driven | none (first Context/reducer in `app/`) — closest structural analog is `lib/onboardingUtils.ts`'s `buildDraftAsPaikka` builder + `StepEsikatselu.tsx`'s derivation logic | no-direct-analog |
| `lib/livePreview/useDebouncedPreviewField.ts` (new, optional) | hook | transform | none (no debounce utility exists) — closest analog is `StepMediat.tsx`'s `useMemo`/`useEffect` cleanup pattern for `stagedPreviewUrls` (lines 59-65) | no-direct-analog |
| `app/business/onboarding/LivePreviewPane.tsx` (new) | component | request-response | `app/business/onboarding/StepEsikatselu.tsx` (preview-section JSX, lines 128-151) | exact |
| `app/business/onboarding/LivePreviewToggle.tsx` (new) | component | event-driven | `app/business/onboarding/ProgressBar.tsx` (tab/segment visual pattern) + `WizardInner.tsx` EditMode tab bar (lines 371-385) | role-match |
| `app/business/WizardInner.tsx` (modify) | controller/route | request-response | itself — `OnboardingMode`/`EditMode` already define the structure being extended; `previewOpen`/`PreviewModal` block (lines 316, 348-356, 386-392) is the removal target | exact (self) |
| `app/business/onboarding/StepHinnasto.tsx` (modify) | component | CRUD | itself — `updateRow` (line 114) is the mutation site to wire into preview context | exact (self) |
| `app/business/onboarding/StepMediat.tsx` (modify) | component | file-I/O | itself — `stagedPreviewUrls` (lines 59-65) is the instant-update mechanism to mirror into context | exact (self) |
| `app/business/onboarding/StepAukioloajat.tsx` (modify) | component | CRUD | `StepHinnasto.tsx` (same per-field local-state + onSaveComplete shape) | role-match |
| `app/business/onboarding/StepYhteystiedot.tsx` (modify) | component | CRUD | `StepHinnasto.tsx` (same per-field local-state + onSaveComplete shape, free-text fields need debounce like D-04) | role-match |
| `app/components/PreviewModal.tsx` (delete, dead code) | component | request-response | n/a — being removed per D-02 | n/a |

## Pattern Assignments

### `lib/livePreview/LivePreviewContext.tsx` (provider, event-driven)

**No direct analog** — this is the first `createContext`/`useReducer` in the codebase. Compose from two existing pieces instead of copying a single file:

**Builder pattern to reuse** — `lib/onboardingUtils.ts` lines 94-115 (`buildDraftAsPaikka`):
```typescript
export function buildDraftAsPaikka(draft: OnboardingDraft, paikka: PaikkaBase): Liikuntapaikka {
  return {
    id: draft.paikka_id,
    nimi: paikka.nimi,
    laji: paikka.laji,
    osoite: paikka.osoite,
    kaupunki: paikka.kaupunki,
    latitude: paikka.latitude,
    longitude: paikka.longitude,
    hinta_min: null,
    hinta_max: null,
    varauslinkki: draft.yhteystiedot?.website ?? null,
    kuvaus: draft.yhteystiedot?.kuvaus ?? null,
    puhelin: draft.yhteystiedot?.puhelin ?? null,
    hinta_kuvaus: hinnastaToHintaKuvaus(draft.hinnasto ?? []),
    aukioloajat: draft.aukioloajat ?? paikka.aukioloajat ?? null,
    image_url: draft.media_urls?.photos?.[0] ?? null,
    logo_url: draft.media_urls?.logo ?? null,
    photo_urls: draft.media_urls?.photos ?? null,
    featured: false,
  }
}
```
The provider's reducer state shape should mirror this function's input (`OnboardingDraft`-like fields: `hinnasto`, `aukioloajat`, `yhteystiedot`, `media_urls`) so `buildDraftAsPaikka`/`buildBrandingPreview` can be called unchanged on every state update to produce the `Liikuntapaikka` object passed to `CalloutCard`/`DiagonaalKortti`.

**brandColor/accentColor derivation to lift into the provider** — `StepEsikatselu.tsx` lines 48-61:
```typescript
const brandColor =
  brandingData?.selected_background_color ??
  brandingData?.colors?.find(c => c.role === 'background')?.hex ??
  undefined

const accentColor =
  brandingData?.selected_accent_color ??
  brandingData?.colors?.find(c => c.role === 'accent')?.hex ??
  undefined
```
Per CONTEXT.md's Claude's Discretion note, mount this derivation once at the provider level instead of duplicating it in every step.

**EditMode state to mirror into context** — `WizardInner.tsx` lines 320-331 (`local*` state already lifted above tab navigation):
```typescript
const [localHinnasto, setLocalHinnasto] = useState<Array<{ kategoria: string; hinta: string; lisatieto: string }> | null>(null)
const [localAukioloajat, setLocalAukioloajat] = useState<Record<string, { open: string; close: string }> | null>(
  (paikka.aukioloajat as Record<string, { open: string; close: string }> | null) ?? null
)
const [localYhteystiedot, setLocalYhteystiedot] = useState({
  puhelin: paikka.puhelin ?? '',
  email: '',
  website: paikka.varauslinkki ?? '',
  kuvaus: paikka.kuvaus ?? '',
})
const [localLogoUrl, setLocalLogoUrl] = useState<string | null>(paikka.logo_url ?? null)
const [localPhotoUrls, setLocalPhotoUrls] = useState<string[]>(paikka.photo_urls ?? [])
```
These five pieces of state are EditMode's natural seed for the shared context's initial value — reuse rather than re-derive.

---

### `lib/livePreview/useDebouncedPreviewField.ts` (hook, transform) — optional, Claude's discretion on inline vs hook

**No debounce utility exists in the codebase.** Closest precedent for the cleanup-on-unmount pattern is `StepMediat.tsx` lines 58-65:
```typescript
const stagedPreviewUrls = useMemo(
  () => photoFiles.map((f) => URL.createObjectURL(f)),
  [photoFiles]
)
useEffect(() => {
  return () => { stagedPreviewUrls.forEach((u) => URL.revokeObjectURL(u)) }
}, [stagedPreviewUrls])
```
If implemented as a custom hook, follow this same `useEffect`-with-cleanup shape (set a `setTimeout`, clear it in the cleanup function, re-run on dependency change) rather than introducing a new pattern style.

---

### `app/business/onboarding/LivePreviewPane.tsx` (component, request-response)

**Analog:** `app/business/onboarding/StepEsikatselu.tsx` lines 128-151 (preview-section JSX) — copy the two-card stacked structure verbatim, drop the third `PaikkaSheet` section (out of scope per LIVEPREV-04):
```tsx
<div className="flex flex-col gap-2">
  <span className="text-[10px] font-bold uppercase tracking-widest text-[rgba(17,17,17,0.45)]">
    {t('previewLabelCallout')}
  </span>
  <CalloutCard p={{ ...draftAsPaikka, latitude: draftAsPaikka.latitude ?? 0, longitude: draftAsPaikka.longitude ?? 0 }} brandColor={brandColor} accentColor={accentColor} />
</div>

<div className="flex flex-col gap-2">
  <span className="text-[10px] font-bold uppercase tracking-widest text-[rgba(17,17,17,0.45)]">
    {t('previewLabelDiag')}
  </span>
  <DiagonaalKortti paikka={draftAsPaikka} brandColor={brandColor} accentColor={accentColor} />
</div>
```

**Loading-state pattern** — `StepEsikatselu.tsx` lines 119-126 (spinner fallback when preview data isn't ready yet):
```tsx
{loadTimedOut && !draftAsPaikka ? (
  <p className="text-sm text-red-600 text-center py-8">
    Esikatselu ei latautunut. Palaa takaisin ja yritä uudelleen.
  </p>
) : !draftAsPaikka ? (
  <div className="flex justify-center py-8">
    <div className="w-6 h-6 rounded-full border-2 border-[rgba(17,17,17,0.12)] border-t-[#111111] animate-spin" />
  </div>
) : ( /* cards */ )}
```
UI-SPEC.md explicitly calls for reusing this exact spinner (`w-6 h-6 rounded-full border-2 ... animate-spin`) for `LivePreviewPane`'s empty state.

**Layout wrapper** — UI-SPEC.md's prescribed JSX (desktop split-view, `sticky top-6`, `w-[360px]`, `gap-4` between stacked cards) is the literal contract; do not invent alternate spacing.

---

### `app/business/onboarding/LivePreviewToggle.tsx` (component, event-driven)

**Analog 1 (active/inactive token reuse):** `WizardInner.tsx` lines 377-381 (EditMode tab bar):
```tsx
className={`text-sm font-bold rounded-full px-4 py-2 [transition:background-color_150ms_var(--ease-out),color_150ms_var(--ease-out)] ${
  currentStep === String(n)
    ? 'bg-[#111111] text-white'
    : 'text-[rgba(17,17,17,0.45)] hover:text-[#111111]'
}`}
```

**Analog 2 (circle/pill construction with step-state branching):** `ProgressBar.tsx` lines 38-62 — same `completed`/`current` ternary structure to model `activeView === 'edit' | 'preview'` against.

**Exact JSX contract** is given in UI-SPEC.md lines 127-140 (`.glass rounded-full p-1` track, two `flex-1 h-9` pill buttons, `Pencil`/`Eye` icons from `lucide-react`, `whileTap={{ scale: 0.95 }}`) — copy verbatim, this is load-bearing per the UI checker sign-off gate.

**Reset-on-step-change pattern (D-08)** — model on `WizardInner.tsx`'s existing `useEffect` keyed on `step`/`maxReachedStep` (lines 188-193):
```typescript
useEffect(() => {
  if (loading) return
  if (step > maxReachedStep + 1) {
    router.push('/business/onboarding?step=' + (maxReachedStep + 1))
  }
}, [step, maxReachedStep, loading, router])
```
Apply the same `useEffect`-keyed-on-step-value shape to reset `activeView` to `'edit'` whenever `step` (onboarding) or `currentStep` (EditMode) changes.

---

### `app/business/WizardInner.tsx` (modify — controller, request-response)

**Removal target (D-02)** — `previewOpen` state (line 316), the `<PreviewModal>` block (lines 348-356), and the `previewCta` button (lines 386-392):
```tsx
const [previewOpen, setPreviewOpen] = useState(false)
// ...
<AnimatePresence>
  {previewOpen && (
    <PreviewModal
      paikka={{ ...paikka, logo_url: localLogoUrl, photo_urls: localPhotoUrls }}
      onClose={() => setPreviewOpen(false)}
    />
  )}
</AnimatePresence>
// ...
<button type="button" onClick={() => setPreviewOpen(true)} className="...">
  {t('previewCta')}
</button>
```
Replace with `LivePreviewToggle` (mobile, sitting above tab bar per D-07) and `LivePreviewPane` (desktop, `lg:` split alongside the existing `<div className="flex flex-col gap-6">` form column).

**Insertion point for the shared provider** — wrap the existing top-level return in `WizardInner` (the default-exported component, lines 455-460) so a single `LivePreviewProvider` instance covers both `OnboardingMode` and `EditMode` without duplicating mount points, per CONTEXT.md's Claude's Discretion note ("a single `OnboardingPreviewProvider`/reducer mounted once above both ... in `WizardInner.tsx`").

**Existing crossfade wrapper to slot into** — lines 249-256 (`AnimatePresence mode="wait"` + `key={step}`, `duration: 0.2`, opacity-only) — the new split-view/toggle layout must nest inside this, not replace it.

---

### `app/business/onboarding/StepHinnasto.tsx` (modify — component, CRUD)

**Per-keystroke mutation site to wire into preview context** — `updateRow` (lines 114-116):
```typescript
function updateRow(id: string, field: keyof PricingRow, value: string) {
  setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
}
```
Add a parallel debounced dispatch to the shared preview context inside (or alongside) this function — debounce per D-04 since `hinta`/`lisatieto`/`kategoria` are free-text/numeric.

---

### `app/business/onboarding/StepMediat.tsx` (modify — component, file-I/O)

**Instant-preview mechanism to mirror (D-05)** — lines 58-65 (already covered above under the provider section) — `stagedPreviewUrls` via `URL.createObjectURL`. Wire `handleLogoFilesSelected`/`handlePhotoFilesSelected` (lines 67-78) to dispatch the blob URL into the shared context immediately (no debounce) instead of waiting for Supabase upload completion in `handleNext`/`handleSave`.

---

### `app/business/onboarding/StepAukioloajat.tsx`, `StepYhteystiedot.tsx` (modify — component, CRUD)

**Analog:** `StepHinnasto.tsx`'s `updateRow` + `onSaveComplete` shape (same file referenced above) — both step components follow the identical local-state-with-`onSaveComplete`-callback contract (`editMode` prop, `initial*` props, `onNext`/`onPrev`/`onSaveComplete`). Apply the same debounced-dispatch-into-context pattern to each field's `onChange` handler. `StepYhteystiedot`'s fields (puhelin/email/website/kuvaus) are all free-text per D-04 — debounce all of them; `StepAukioloajat`'s time inputs are also free-text/discrete-time-picker, debounce per the same rule unless implemented as a native time-select (then instant per D-05's "discrete-selection" carve-out — confirm exact input type during planning).

---

## Shared Patterns

### Glass surface + spacing tokens
**Source:** `app/globals.css` (`.glass`, `.glass-hover`, `.glass-btn` utility classes), reinforced by every Step component (`glass rounded-2xl p-6 w-full max-w-xl mx-auto`)
**Apply to:** `LivePreviewToggle`'s track (`.glass rounded-full p-1`); never wrap `LivePreviewPane`'s cards in an additional `.glass` div (UI-SPEC.md explicitly forbids double-glass)

### Active/inactive pill token
**Source:** `WizardInner.tsx` line 379 (`bg-[#111111] text-white` active / `text-[rgba(17,17,17,0.45)]` inactive), identical token in `ProgressBar.tsx`
**Apply to:** `LivePreviewToggle`'s two segments — exact color values, no deviation

### AnimatePresence crossfade
**Source:** `WizardInner.tsx` lines 249-256 (`mode="wait"`, opacity-only, `duration: 0.2`)
**Apply to:** Mobile toggle's edit/preview content swap (UI-SPEC.md line 148 explicitly calls for reusing this exact pattern)

### whileTap scale-only feedback
**Source:** `ProgressBar.tsx` line 42, `StepHinnasto.tsx` line 332/346 (`whileTap={{ scale: 0.95 }}`, no hover scale)
**Apply to:** `LivePreviewToggle`'s two segment buttons

### Liikuntapaikka builder functions
**Source:** `lib/onboardingUtils.ts` (`buildDraftAsPaikka`), `lib/branding/brandingResult.ts` (`buildBrandingPreview`)
**Apply to:** `LivePreviewContext`'s derived `livePreviewPaikka` value — call these unchanged rather than re-deriving field mapping logic

### i18n keys via next-intl
**Source:** every Step component (`useTranslations('Business')`), e.g. `StepEsikatselu.tsx` line 27
**Apply to:** `LivePreviewToggle`'s new keys (`previewToggleEdit`, `previewToggleLive`) added to `messages/fi.json`/`messages/en.json` under the `Business` namespace, following the existing `previewLabelCallout`/`previewLabelDiag` key precedent already in those files

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `lib/livePreview/LivePreviewContext.tsx` | provider | event-driven | First `createContext`/`useReducer` usage in `app/` — no existing Context provider to copy structurally; compose from `buildDraftAsPaikka` + `StepEsikatselu.tsx`'s color-derivation logic instead (see Pattern Assignments above) |
| `lib/livePreview/useDebouncedPreviewField.ts` | hook | transform | No debounce utility exists anywhere in the codebase; nearest precedent is `StepMediat.tsx`'s `useEffect`-cleanup-on-`useMemo`-dependency pattern, not a true debounce |

## Metadata

**Analog search scope:** `app/business/`, `app/business/onboarding/`, `app/components/`, `lib/`
**Files scanned:** `WizardInner.tsx`, `StepEsikatselu.tsx`, `StepHinnasto.tsx`, `StepMediat.tsx`, `ProgressBar.tsx`, `CalloutCard.tsx`, `DiagonaalKortti.tsx`, `PreviewModal.tsx`, `lib/onboardingUtils.ts`
**Pattern extraction date:** 2026-06-18
