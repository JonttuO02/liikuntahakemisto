# Phase 34: Onboarding-velhou - Pattern Map

**Mapped:** 2026-06-06
**Files analyzed:** 16
**Analogs found:** 14 / 16

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `app/business/onboarding/page.tsx` | page (Server wrapper) | request-response | `app/page.tsx` | exact |
| `app/business/onboarding/OnboardingWizardInner.tsx` | component (Client) | event-driven | `app/components/ClaimSearchForm.tsx` | exact |
| `app/business/onboarding/ProgressBar.tsx` | component (Client, display) | event-driven | `app/components/ClaimSearchForm.tsx` step indicator markup | role-match |
| `app/business/onboarding/StepPaikka.tsx` | component (Client, read-only) | request-response | `app/business/page.tsx` | role-match |
| `app/business/onboarding/StepMediat.tsx` | component (Client, file upload) | file-I/O | `app/components/ClaimSearchForm.tsx` (form patterns) | partial |
| `app/business/onboarding/StepHinnasto.tsx` | component (Client, form) | CRUD | `app/business/rekisteroidy/page.tsx` | role-match |
| `app/business/onboarding/StepAukioloajat.tsx` | component (Client, form) | CRUD | `app/business/rekisteroidy/page.tsx` | role-match |
| `app/business/onboarding/StepYhteystiedot.tsx` | component (Client, form) | CRUD | `app/business/rekisteroidy/page.tsx` | exact |
| `app/business/onboarding/StepEsikatselu.tsx` | component (Client, preview) | request-response | `app/business/page.tsx` | role-match |
| `app/business/onboarding/UploadDropZone.tsx` | component (Client, file-I/O) | file-I/O | no direct analog — HTML5 drag events only | none |
| `app/business/onboarding/UploadProgressBar.tsx` | component (Client, display) | event-driven | no direct analog — Tailwind transition | none |
| `app/api/business/onboarding/save-step/route.ts` | Route Handler | CRUD | `app/api/business/claim-paikka/route.ts` | exact |
| `app/api/business/onboarding/submit/route.ts` | Route Handler | CRUD | `app/api/business/create-paikka/route.ts` | exact |
| `supabase/migrations/20260606000000_onboarding.sql` | migration | CRUD | `supabase/migrations/20260605000000_business_accounts.sql` | exact |
| `messages/fi.json` + `messages/en.json` | i18n | transform | existing `Business` namespace in same files | exact |
| `app/business/page.tsx` (modification) | page (Client) | request-response | itself (read existing) | exact |
| `app/components/ClaimSearchForm.tsx` (modification) | component (Client) | event-driven | itself (read existing) | exact |
| `tests/onboarding-*.test.ts` | test (unit) | transform | `lib/priceUtils.test.ts` | exact |
| `vitest.config.ts` (modification) | config | — | itself (read existing) | exact |

---

## Pattern Assignments

### `app/business/onboarding/page.tsx` (Server Component wrapper)

**Analog:** `app/page.tsx` (lines 1–26)

**Purpose:** Export a default Server Component that wraps the inner Client Component in `<Suspense>`. Required by Next.js 14 whenever `useSearchParams()` is used in a child.

**Imports pattern** (lines 1–3):
```tsx
import { Suspense } from 'react'
import Etusivu from './components/Etusivu'
```

**Core Suspense wrapper pattern** (lines 4–26):
```tsx
export default async function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <Etusivu paikat={data} />
    </Suspense>
  )
}
```

**Adaptation for wizard:** No server data fetch needed (wizard loads draft client-side). The page is a thin wrapper only:
```tsx
import { Suspense } from 'react'
import OnboardingWizardInner from './OnboardingWizardInner'

export default function OnboardingWizardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-[rgba(17,17,17,0.12)] border-t-[#111111] animate-spin" />
      </div>
    }>
      <OnboardingWizardInner />
    </Suspense>
  )
}
```

---

### `app/business/onboarding/OnboardingWizardInner.tsx` (Client Component, wizard orchestrator)

**Analog:** `app/components/ClaimSearchForm.tsx` (multi-step client form with `AnimatePresence`)

**Imports pattern** (ClaimSearchForm.tsx lines 1–7):
```tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { createBrowserSupabase } from '@/lib/supabaseSSR'
```

**Additional imports for wizard** (from RESEARCH.md Pattern 1):
```tsx
import { useSearchParams } from 'next/navigation'
```

**URL step routing pattern** (new — no codebase analog; from RESEARCH.md Pattern 1):
```tsx
const searchParams = useSearchParams()
const step = parseInt(searchParams.get('step') ?? '1', 10)
const router = useRouter()
function goToStep(n: number) {
  router.push(`/business/onboarding?step=${n}`)
}
```

**Loading/spinner pattern** (app/business/page.tsx lines 34–40):
```tsx
if (loading) {
  return (
    <main className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-6 h-6 rounded-full border-2 border-[rgba(17,17,17,0.12)] border-t-[#111111] animate-spin" />
    </main>
  )
}
```

**Draft load on mount pattern** (app/business/page.tsx lines 14–32 — useEffect + createBrowserSupabase):
```tsx
useEffect(() => {
  async function loadDraft() {
    const supabase = createBrowserSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data: draft } = await supabase
      .from('onboarding_draft')
      .select('*')
      .eq('business_account_id', user.id)
      .maybeSingle()
    if (draft) {
      // populate step state, jump to draft.current_step
    }
    setLoading(false)
  }
  loadDraft()
}, [])
```

**AnimatePresence step crossfade pattern** (ClaimSearchForm.tsx lines 183–198):
```tsx
<AnimatePresence mode="wait">
  {step === 'search' && (
    <motion.div
      key="search"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col gap-4"
    >
      {/* step content */}
    </motion.div>
  )}
</AnimatePresence>
```

**Page layout wrapper** (app/business/page.tsx lines 54–61):
```tsx
<main className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-16">
  <div className="glass rounded-2xl p-6 w-full max-w-md flex flex-col gap-4">
    {/* wizard content */}
  </div>
</main>
```
Wizard uses `max-w-xl` (576px) per UI-SPEC. Page wrapper is `py-12` (not `py-16`) per UI-SPEC.

---

### `app/business/onboarding/ProgressBar.tsx` (Client Component, step indicator)

**Analog:** `app/components/ClaimSearchForm.tsx` caps label pattern + `app/components/NavBar.tsx` glass container

**Caps label pattern** (ClaimSearchForm.tsx line 269):
```tsx
<span className="text-[10px] font-bold uppercase tracking-widest text-[rgba(17,17,17,0.45)]">
  JO HALLITTU
</span>
```

**Glass container pattern** (NavBar.tsx line 33):
```tsx
<header className="glass-nav">
```
For ProgressBar use `.glass rounded-2xl px-6 py-4 mb-6` per UI-SPEC.

**Completed step check icon** — use `lucide-react` Check icon (already imported in DiagonaalKortti/PaikkaSheet). The step circle states follow the UI-SPEC:
- Completed: `bg-white border border-[rgba(0,0,0,0.12)]` + `<Check className="w-4 h-4 text-[#111111]" />`
- Current: `bg-[#111111] text-white`
- Future: `bg-white border border-[rgba(0,0,0,0.07)] text-[rgba(17,17,17,0.35)]`

**Clickable completed steps** — follow whileTap pattern from ClaimSearchForm.tsx line 346:
```tsx
<motion.button
  type="button"
  whileTap={{ scale: 0.95 }}
  onClick={() => goToStep(stepNum)}
  className="..."
>
```

---

### `app/business/onboarding/StepPaikka.tsx` (Client Component, read-only display)

**Analog:** `app/business/page.tsx` (pending state display, lines 42–52)

**Read-only venue info display pattern** (app/business/page.tsx lines 42–52):
```tsx
<div className="glass rounded-2xl p-6 w-full max-w-sm flex flex-col items-center gap-4 text-center">
  <h1 className="text-xl font-bold text-[#111111]">{t('pendingTitle')}</h1>
  <p className="text-sm text-[rgba(17,17,17,0.45)]">{t('pendingVenueLabel')}: {venueName}</p>
</div>
```

**Caps label for section** (ClaimSearchForm.tsx line 358):
```tsx
<span className="text-[10px] font-bold uppercase tracking-widest text-[rgba(17,17,17,0.45)]">
  {t('selectedVenueLabel')}
</span>
```

**Venue data display** (ClaimSearchForm.tsx lines 363–368):
```tsx
<span className="text-sm font-bold text-[#111111]">{selectedVenue?.nimi}</span>
<span className="text-sm text-[rgba(17,17,17,0.45)]">
  {[selectedVenue?.osoite, selectedVenue?.kaupunki].filter(Boolean).join(', ')}
</span>
```

---

### `app/business/onboarding/StepYhteystiedot.tsx` (and all text-field step components)

**Analog:** `app/business/rekisteroidy/page.tsx` — canonical form component in this codebase

**'use client' + imports pattern** (rekisteroidy/page.tsx lines 1–7):
```tsx
'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { createBrowserSupabase } from '@/lib/supabaseSSR'
import { useTranslations } from 'next-intl'
```

**Input class constant** (rekisteroidy/page.tsx lines 92–93 — definitive pattern):
```tsx
const inputClass =
  'border border-[rgba(0,0,0,0.12)] rounded-lg h-10 px-3 text-sm text-[#111111] placeholder:text-[rgba(17,17,17,0.35)] bg-white focus:outline-none focus:border-[rgba(0,0,0,0.25)] disabled:opacity-60 w-full'
```

**Submit/primary CTA class** (rekisteroidy/page.tsx lines 95–96):
```tsx
const submitButtonClass =
  'bg-[#111111] hover:bg-[#333333] text-white font-bold text-sm rounded-full h-10 w-full [transition:background-color_150ms_var(--ease-out)] disabled:opacity-60 disabled:pointer-events-none'
```
For wizard "Seuraava" button, use `px-6` instead of `w-full` (right-aligned in step footer).

**Secondary back button** (ClaimSearchForm.tsx lines 343–354):
```tsx
<motion.button
  type="button"
  whileTap={{ scale: 0.95 }}
  className="text-sm text-[rgba(17,17,17,0.45)] flex items-center gap-1 w-fit"
  onClick={() => { setStep('search'); setError(null) }}
>
  {t('backToSearch')}
</motion.button>
```
Per UI-SPEC, add `hover:text-[#111111] [transition:color_150ms_var(--ease-out)]`.

**Error message AnimatePresence pattern** (rekisteroidy/page.tsx lines 140–155):
```tsx
<AnimatePresence>
  {error && (
    <motion.p
      key="error"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="text-sm text-red-600"
      role="alert"
      aria-live="polite"
    >
      {error}
    </motion.p>
  )}
</AnimatePresence>
```

**Step card wrapper** (adapt from rekisteroidy/page.tsx lines 99–105):
```tsx
<motion.div
  className="glass rounded-2xl p-6 w-full max-w-xl mx-auto"
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  transition={{ duration: 0.2, ease: 'easeOut' }}
>
  <div className="flex flex-col gap-6">
    <h2 className="text-xl font-bold text-[#111111]">{t('stepContact')}</h2>
    {/* step content */}
    <footer className="flex justify-between items-center pt-4 border-t border-[rgba(0,0,0,0.07)]">
      {/* back + next buttons */}
    </footer>
  </div>
</motion.div>
```

**Loading state button text** (rekisteroidy/page.tsx line 163):
```tsx
{loading ? t('registering') : t('registerCta')}
```

**fetch with JWT Authorization header** (rekisteroidy/page.tsx lines 67–76):
```tsx
const response = await fetch('/api/business/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + data.session.access_token,
  },
  body: JSON.stringify({ company_name: companyName.trim() }),
})
```

For wizard steps, get token from:
```tsx
const supabase = createBrowserSupabase()
const { data: { session } } = await supabase.auth.getSession()
const token = session?.access_token ?? ''
```
(Pattern from ClaimSearchForm.tsx lines 100–102.)

---

### `app/business/onboarding/StepHinnasto.tsx` (pricing table, dynamic rows)

**Analog:** `app/business/rekisteroidy/page.tsx` for form patterns; no pricing table analog exists.

Copy all patterns from StepYhteystiedot above (input class, error pattern, step card wrapper).

**"+ Lisää hintarivi" button** (style from ClaimSearchForm.tsx "createInstead" link pattern, line 321):
```tsx
<motion.button
  type="button"
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  transition={{ duration: 0.15 }}
  className="text-sm text-[#111111] underline-offset-2 hover:underline text-left"
  onClick={() => addPriceRow()}
>
  {t('addPriceRowCta')}
</motion.button>
```

**Delete row button** — icon button pattern from `lucide-react` `X` icon (NavBar.tsx line 6 uses `X`):
```tsx
<button type="button"
  className="text-[rgba(17,17,17,0.35)] hover:text-red-600 [transition:color_150ms_var(--ease-out)]"
  onClick={() => removeRow(i)}
>
  <X className="w-4 h-4" />
</button>
```

**Pricing validation disabled button** (rekisteroidy/page.tsx line 159):
```tsx
<button type="submit" disabled={loading} className={submitButtonClass}>
```
`disabled:opacity-60 disabled:pointer-events-none` already in submitButtonClass.

---

### `app/business/onboarding/StepAukioloajat.tsx` (opening hours editor)

**Analog:** `app/business/rekisteroidy/page.tsx` for form structure; `lib/aukiolo.ts` for day key mapping.

Copy all patterns from StepYhteystiedot (input class, error, step card wrapper).

**Day key mapping** (lib/aukiolo.ts lines 1–2 and 43–47):
```typescript
// Storage keys (English) — required by getOpenStatus() and formatGroupedHours()
const ORDERED_DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']
const FI_ABBR: Record<string, string> = {
  monday: 'Ma', tuesday: 'Ti', wednesday: 'Ke', thursday: 'To',
  friday: 'Pe', saturday: 'La', sunday: 'Su'
}
```
The wizard must store JSONB with English keys. UI shows Finnish labels. See RESEARCH.md Pitfall 5.

**Toggle (Auki switch)** — no existing analog; implement as `role="switch"` + `aria-checked` per UI-SPEC:
```tsx
<button
  type="button"
  role="switch"
  aria-checked={isOpen}
  aria-label={t('hoursToggleLabel')}
  onClick={() => toggleDay(dayKey)}
  className={`w-10 h-6 rounded-full [transition:background-color_150ms_var(--ease-out)] ${
    isOpen ? 'bg-[#111111]' : 'bg-[rgba(17,17,17,0.12)]'
  }`}
>
  <span className={`w-5 h-5 rounded-full bg-white block transition-transform ${
    isOpen ? 'translate-x-[18px]' : 'translate-x-0.5'
  }`} />
</button>
```

**Pre-fill from liikuntapaikat** — caps label pattern (ClaimSearchForm.tsx line 269):
```tsx
{wasPreFilled && (
  <span className="text-[10px] font-bold uppercase tracking-widest text-[rgba(17,17,17,0.45)]">
    {t('hoursPrefilledLabel')}
  </span>
)}
```

---

### `app/business/onboarding/StepMediat.tsx` (media upload step)

**Analog:** `app/business/rekisteroidy/page.tsx` for step card shell; `app/components/ClaimSearchForm.tsx` for loading/error patterns. `UploadDropZone` and `UploadProgressBar` are separate components.

Copy step card wrapper, error pattern, and JWT fetch pattern from StepYhteystiedot.

**"Seuraava" disabled during upload** (rekisteroidy/page.tsx line 159):
```tsx
<button type="submit" disabled={loading || isUploading} className={submitButtonClass}>
  {isUploading ? t('uploadingLabel') : t('nextCta')}
</button>
```

---

### `app/business/onboarding/UploadDropZone.tsx` (drag-and-drop upload zone)

**Analog:** No existing analog — new pattern for this codebase.

**HTML5 drag-and-drop pattern** (from RESEARCH.md "Don't Hand-Roll"):
```tsx
'use client'

function handleDragOver(e: React.DragEvent) {
  e.preventDefault()
  setIsDragging(true)
}
function handleDragLeave() { setIsDragging(false) }
function handleDrop(e: React.DragEvent) {
  e.preventDefault()
  setIsDragging(false)
  const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
  // call onFilesSelected(files)
}
```

**Drop zone div** (from UI-SPEC Visual Anatomy):
```tsx
<div
  role="button"
  tabIndex={0}
  aria-label={label}
  onDragOver={handleDragOver}
  onDragLeave={handleDragLeave}
  onDrop={handleDrop}
  onClick={() => fileInputRef.current?.click()}
  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click() }}
  className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-3 min-h-[96px] [transition:border-color_150ms_var(--ease-out)] ${
    isDragging
      ? 'border-[#111111] bg-[rgba(17,17,17,0.03)]'
      : 'border-[rgba(0,0,0,0.12)] hover:border-[rgba(0,0,0,0.25)]'
  }`}
>
  {/* icon + label or preview thumbnails */}
</div>
{/* visually hidden file input — accessible fallback */}
<input
  ref={fileInputRef}
  type="file"
  accept="image/*"
  multiple={allowMultiple}
  className="sr-only"
  onChange={e => { if (e.target.files) onFilesSelected(Array.from(e.target.files)) }}
/>
```

**Thumbnail fade-in** (from RESEARCH.md Code Examples — AnimatePresence error fade adapted):
```tsx
<motion.img
  key={file.name}
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.15 }}
  src={URL.createObjectURL(file)}
  className="w-16 h-16 object-cover rounded-lg"
/>
```

**Storage upload** (from RESEARCH.md Pattern 3):
```typescript
const supabase = createBrowserSupabase()
const { error } = await supabase.storage
  .from('business-media')
  .upload(
    `${businessAccountId}/${paikkaId}/photos/${filename}`,
    file,
    { contentType: file.type, upsert: true }
  )
const { data: { publicUrl } } = supabase.storage
  .from('business-media')
  .getPublicUrl(`${businessAccountId}/${paikkaId}/photos/${filename}`)
```
Upload progress is simulated: set state to 10 on start, 100 on completion (supabase-js v2 has no progress events).

---

### `app/business/onboarding/UploadProgressBar.tsx` (upload progress indicator)

**Analog:** No direct analog — new Tailwind transition pattern.

**Progress bar pattern** (from UI-SPEC Visual Anatomy):
```tsx
'use client'

interface Props { pct: number }  // 0–100

export default function UploadProgressBar({ pct }: Props) {
  if (pct === 0) return null
  return (
    <div className="w-full h-1 bg-[rgba(17,17,17,0.07)] rounded-full overflow-hidden">
      <div
        className="h-full bg-[#111111] rounded-full transition-[width] duration-300 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
```
No Framer Motion — pure CSS transition per UI-SPEC Animation Contract.

---

### `app/business/onboarding/StepEsikatselu.tsx` (Step 6, preview + submit)

**Analog:** `app/business/page.tsx` for data fetch on mount; `app/components/PaikkaKortti.tsx` / `DiagonaalKortti.tsx` are reused as-is.

**Preview label caps pattern** (ClaimSearchForm.tsx line 269):
```tsx
<span className="text-[10px] font-bold uppercase tracking-widest text-[rgba(17,17,17,0.45)]">
  {t('previewLabelCard')}
</span>
```

**Draft-to-Liikuntapaikka mapping** (from RESEARCH.md Pattern 4 — pure function, testable):
```typescript
// lib/onboardingUtils.ts (new utility — extracted for testability)
export function buildDraftAsPaikka(
  draft: OnboardingDraft,
  paikka: { nimi: string; laji: string; osoite: string | null; kaupunki: string | null; latitude: number | null; longitude: number | null; aukioloajat?: Record<string, { open: string; close: string }> | null }
): Liikuntapaikka {
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
    featured: false,
  }
}

export function hinnastaToHintaKuvaus(
  hinnasto: Array<{ kategoria: string; hinta: string; lisatieto?: string }>
): string {
  return hinnasto
    .filter(row => row.hinta.trim() !== '')
    .map(row => `${row.kategoria}: ${row.hinta}€${row.lisatieto ? ` (${row.lisatieto})` : ''}`)
    .join('\n')
}
```
**Important:** PaikkaSheet uses `position: fixed` — do NOT render it in StepEsikatselu. Render only `PaikkaKortti` and `DiagonaalKortti` in the preview, plus a simplified inline version of sheet content (price, hours, contact fields in a `.glass rounded-2xl` card). See RESEARCH.md Pitfall 1.

**Submit "Lähetä" button** — same class as primary CTA, adapted for `w-auto`:
```tsx
<button
  type="button"
  disabled={loading}
  className="bg-[#111111] hover:bg-[#333333] text-white font-bold text-sm rounded-full h-10 px-6 [transition:background-color_150ms_var(--ease-out)] disabled:opacity-60 disabled:pointer-events-none"
>
  {loading ? t('submitting') : t('submitCta')}
</button>
```

---

### `app/api/business/onboarding/save-step/route.ts` (Route Handler, UPSERT draft)

**Analog:** `app/api/business/claim-paikka/route.ts` (lines 1–64) — exact structure

**Full JWT + admin pattern** (claim-paikka/route.ts lines 1–13):
```typescript
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin.server'

export async function POST(request: Request) {
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '') ?? ''
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // ...
}
```

**JSON parse + validation pattern** (claim-paikka/route.ts lines 15–26):
```typescript
let paikkaId: number
try {
  const body = await request.json()
  const parsed = parseInt(body.paikka_id, 10)
  if (isNaN(parsed)) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  paikkaId = parsed
} catch {
  return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
}
```

**UPSERT pattern** (from RESEARCH.md Pattern 5):
```typescript
const { error } = await supabaseAdmin
  .from('onboarding_draft')
  .upsert(
    {
      business_account_id: user.id,
      paikka_id: body.paikka_id,
      [body.field]: body.value,
      current_step: body.step,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'business_account_id,paikka_id' }
  )
if (error) {
  return NextResponse.json({ error: 'Upsert failed', detail: error.message }, { status: 500 })
}
return NextResponse.json({ ok: true })
```

**Security note:** Use `user.id` from verified token as `business_account_id`. Never accept `business_account_id` from request body.

---

### `app/api/business/onboarding/submit/route.ts` (Route Handler, atomic commit)

**Analog:** `app/api/business/create-paikka/route.ts` (lines 1–84) — multi-step atomic pattern

**Full structure** (create-paikka/route.ts lines 1–9, 32–83):
```typescript
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin.server'

export async function POST(request: Request) {
  // JWT verify (same as all other route handlers — lines 1-13 of claim-paikka)

  // Step 1: Fetch draft + paikka join
  const { data: draft } = await supabaseAdmin
    .from('onboarding_draft')
    .select('*, liikuntapaikat(nimi, osoite, kaupunki, laji, latitude, longitude, aukioloajat)')
    .eq('business_account_id', user.id)
    .single()

  // Step 2: Update liikuntapaikat
  const { error: updateError } = await supabaseAdmin
    .from('liikuntapaikat')
    .update({ hinta_kuvaus: ..., aukioloajat: ..., kuvaus: ..., puhelin: ..., varauslinkki: ..., image_url: ..., business_managed: true })
    .eq('id', draft.paikka_id)
  if (updateError) return NextResponse.json({ error: 'Update failed' }, { status: 500 })

  // Step 3: Set onboarding_completed = true
  await supabaseAdmin
    .from('business_accounts')
    .update({ onboarding_completed: true })
    .eq('user_id', user.id)

  // Step 4: Delete draft
  await supabaseAdmin
    .from('onboarding_draft')
    .delete()
    .eq('business_account_id', user.id)

  return NextResponse.json({ ok: true })
}
```

**Rollback pattern on error** (create-paikka/route.ts lines 62–65):
```typescript
if (linkError) {
  await supabaseAdmin.from('liikuntapaikat').delete().eq('id', newPaikkaId)
  return NextResponse.json({ error: 'Link insert failed', detail: linkError.message }, { status: 500 })
}
```
Adapt: if `liikuntapaikat` update fails, do NOT delete draft — preserve for retry (RESEARCH.md Pattern 6).

**Ownership verify** (security — RESEARCH.md Threat Patterns): Before updating `liikuntapaikat`, verify `business_paikka_links` row exists for `(user.id, draft.paikka_id)`.

---

### `supabase/migrations/20260606000000_onboarding.sql` (DB migration)

**Analog:** `supabase/migrations/20260605000000_business_accounts.sql` (lines 1–85) — exact structure

**File header comment convention** (business_accounts.sql lines 1–18):
```sql
-- Describe what the migration does and which decision log items it implements
-- Analog sources: reference prior migrations
-- Decision log: list the D-xx decisions implemented here
-- NOT included: list deferred items
```

**ALTER TABLE add column pattern** (from research — no existing ALTER ADD in migrations; use standard SQL):
```sql
ALTER TABLE business_accounts
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;
```

**CREATE TABLE + UNIQUE pattern** (business_accounts.sql lines 55–65):
```sql
CREATE TABLE IF NOT EXISTS business_paikka_links (
  id                  BIGSERIAL PRIMARY KEY,
  business_account_id UUID NOT NULL REFERENCES business_accounts(user_id) ON DELETE CASCADE,
  paikka_id           BIGINT NOT NULL REFERENCES liikuntapaikat(id) ON DELETE CASCADE,
  -- ...
  UNIQUE(paikka_id)
);
```

**RLS triple policy pattern** (business_accounts.sql lines 32–48):
```sql
ALTER TABLE onboarding_draft ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business reads own draft"
  ON onboarding_draft FOR SELECT
  USING (auth.uid() = business_account_id);

CREATE POLICY "Business inserts own draft"
  ON onboarding_draft FOR INSERT
  WITH CHECK (auth.uid() = business_account_id);

CREATE POLICY "Business updates own draft"
  ON onboarding_draft FOR UPDATE
  USING (auth.uid() = business_account_id)
  WITH CHECK (auth.uid() = business_account_id);
```
Also add DELETE policy — wizard reads and deletes own draft.

---

### `messages/fi.json` + `messages/en.json` (i18n additions)

**Analog:** Existing `Business` namespace in `messages/fi.json` (lines 98–140)

**Key naming convention** — camelCase, descriptive, no prefix redundancy (e.g., `onboardingTitle` not `onboardingWizardTitle`). All 34 new wizard keys go directly under `"Business": { ... }` alongside existing keys.

**Existing key structure to extend** (fi.json lines 98–100):
```json
"Business": {
  "registerTitle": "Rekisteröi yrityksesi",
  ...
  "pendingBody": "Odottaa admin-hyväksyntää. Lähetimme vahvistuksen sähköpostiisi.",
  "onboardingTitle": "Tietojesi täydentäminen",
  "stepPlaceName": "Paikkasi",
  "stepMedia": "Mediat",
  ...
}
```
Full key list specified in `34-UI-SPEC.md` Copywriting Contract (34 keys).

---

### `app/business/page.tsx` (modification — add onboarding_completed check)

**Analog:** Itself — read the file (already read above, lines 1–62)

**Where to add** (after line 22, inside `checkLinks`):
```typescript
// After confirming user has business_accounts row, check onboarding_completed
const { data: account } = await supabase
  .from('business_accounts')
  .select('onboarding_completed')
  .eq('user_id', user.id)
  .maybeSingle()

if (account && !account.onboarding_completed) {
  router.push('/business/onboarding')
  return
}
```
`useRouter` is already imported via `next/navigation` (check: currently not imported — must add import). Add `const router = useRouter()` at the top of the component.

---

### `app/components/ClaimSearchForm.tsx` (modification — change redirect on claim/create success)

**Analog:** Itself — already read (lines 113–117 and 166–169)

**Current code** (lines 113–116 — handleClaim success):
```tsx
if (res.ok) {
  window.location.reload()
  return
}
```

**Required change** (D-01 from CONTEXT.md):
```tsx
if (res.ok) {
  const data = await res.json()
  router.push(`/business/onboarding${data.paikka_id ? `?paikka_id=${data.paikka_id}` : ''}`)
  return
}
```
`router` is already imported and used in the component (line 7). Apply same change in `handleCreate` (lines 166–169).

---

### `tests/onboarding-*.test.ts` (unit tests)

**Analog:** `lib/priceUtils.test.ts` — exact test file structure for this project

**Test file structure** (priceUtils.test.ts lines 1–3):
```typescript
import { describe, it, expect } from 'vitest'
import { isMembershipOnly, marqueePriceLines } from './priceUtils'

describe('isMembershipOnly', () => {
  it('palauttaa true kun ...', () => {
    expect(isMembershipOnly({ ... })).toBe(true)
  })
})
```

**Test naming convention** — Finnish descriptions: `'palauttaa true kun ...'` / `'palauttaa false kun ...'`. Pure function tests only — no Supabase mocking.

**vitest.config.ts** — existing config already covers `lib/**/*.test.ts`. The wizard utility functions (`buildDraftAsPaikka`, `hinnastaToHintaKuvaus`) must be extracted to `lib/onboardingUtils.ts` so they are covered by the existing vitest glob. Test files go in `lib/` as `onboardingPricing.test.ts`, `onboardingHours.test.ts`, `onboardingDraftMap.test.ts`.

**vitest.config.ts modification** (add `tests/` glob if tests go there instead):
```typescript
import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts', 'app/**/__tests__/*.test.ts', 'tests/**/*.test.ts'],
  },
})
```

---

## Shared Patterns

### JWT Authentication (apply to all Route Handlers)

**Source:** `app/api/business/claim-paikka/route.ts` lines 4–13
```typescript
const authHeader = request.headers.get('Authorization')
const token = authHeader?.replace('Bearer ', '') ?? ''
const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
if (authError || !user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
// Use user.id — never body.user_id or body.business_account_id
```
**Apply to:** `save-step/route.ts`, `submit/route.ts`

### supabaseAdmin import (apply to all Route Handlers)

**Source:** `lib/supabaseAdmin.server.ts` lines 1–8; `app/api/business/register/route.ts` line 2
```typescript
import { supabaseAdmin } from '@/lib/supabaseAdmin.server'
```
**Apply to:** `save-step/route.ts`, `submit/route.ts`
**Never import in:** `'use client'` components — use `createBrowserSupabase()` from `lib/supabaseSSR` instead.

### createBrowserSupabase for client-side Supabase access

**Source:** `lib/supabaseSSR.ts` lines 22–40; pattern used in `app/business/page.tsx` line 5
```typescript
import { createBrowserSupabase } from '@/lib/supabaseSSR'
const supabase = createBrowserSupabase()
const { data: { user } } = await supabase.auth.getUser()
```
**Apply to:** All `'use client'` wizard components that query Supabase (draft load, Storage upload).

### Error Handling (apply to all step components and Route Handlers)

**Source:** `app/business/rekisteroidy/page.tsx` lines 140–155
```tsx
<AnimatePresence>
  {error && (
    <motion.p
      key="error"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="text-sm text-red-600"
      role="alert"
      aria-live="polite"
    >
      {error}
    </motion.p>
  )}
</AnimatePresence>
```
**Apply to:** All 6 step components (error state display), OnboardingWizardInner.

### i18n useTranslations (apply to all new components)

**Source:** `app/business/rekisteroidy/page.tsx` line 31; `app/components/ClaimSearchForm.tsx` line 6
```typescript
import { useTranslations } from 'next-intl'
const t = useTranslations('Business')
```
**Apply to:** All wizard components, ProgressBar, UploadDropZone.

### Input class constant (apply to all form inputs in wizard steps)

**Source:** `app/business/rekisteroidy/page.tsx` lines 92–93
```typescript
const inputClass =
  'border border-[rgba(0,0,0,0.12)] rounded-lg h-10 px-3 text-sm text-[#111111] placeholder:text-[rgba(17,17,17,0.35)] bg-white focus:outline-none focus:border-[rgba(0,0,0,0.25)] disabled:opacity-60 w-full'
```
**Apply to:** StepYhteystiedot, StepHinnasto (price and notes inputs), StepAukioloajat (time inputs use `w-24` instead of `w-full`), StepPaikka (none — read-only).

### Glass card surface (apply to all wizard step cards and ProgressBar)

**Source:** `app/globals.css` `.glass` utility class; used in `app/business/page.tsx` line 45 and `app/business/rekisteroidy/page.tsx` line 100
```tsx
className="glass rounded-2xl p-6 ..."
```
**Apply to:** ProgressBar container (`px-6 py-4`), all step cards (`p-6 max-w-xl`).

### Primary CTA button class (apply to all "Seuraava" and submit buttons)

**Source:** `app/business/rekisteroidy/page.tsx` lines 95–96
```typescript
'bg-[#111111] hover:bg-[#333333] text-white font-bold text-sm rounded-full h-10 [transition:background-color_150ms_var(--ease-out)] disabled:opacity-60 disabled:pointer-events-none'
```
Use `w-full` when filling a column; use `px-6` when in step footer row.
**Apply to:** All step "Seuraava" buttons, Step 6 "Lähetä hyväksyttäväksi" button.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `app/business/onboarding/UploadDropZone.tsx` | component | file-I/O | No drag-and-drop upload exists in the codebase; HTML5 native events are used directly |
| `app/business/onboarding/UploadProgressBar.tsx` | component | event-driven | No progress bar component exists; simple Tailwind `transition-[width]` on a div |

Both files are simple enough (< 60 lines each) that they are fully specified in the Pattern Assignments above.

---

## Metadata

**Analog search scope:** `app/business/`, `app/api/business/`, `app/components/`, `lib/`, `supabase/migrations/`, `messages/`
**Files scanned:** 18
**Pattern extraction date:** 2026-06-06
