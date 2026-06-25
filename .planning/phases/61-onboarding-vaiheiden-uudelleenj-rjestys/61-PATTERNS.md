# Phase 61: Onboarding-vaiheiden uudelleenjärjestys — Pattern Map

**Mapped:** 2026-06-26
**Files analyzed:** 13
**Analogs found:** 13 / 13

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `app/business/onboarding/StepNimiJaURL.tsx` | component | request-response | `app/business/onboarding/StepPaikka.tsx` | exact |
| `app/business/onboarding/StepSijainti.tsx` | component | request-response | `app/business/onboarding/StepYhteystiedot.tsx` | role-match |
| `app/business/onboarding/StepPaikka.tsx` | — | — | — | DELETED |
| `app/business/onboarding/StepEsikatselu.tsx` | — | — | — | DELETED |
| `app/business/onboarding/page.tsx` | page / state machine | event-driven | self (existing file) | self |
| `app/business/onboarding/StepYhteystiedot.tsx` | component | request-response | self (existing file) | self |
| `app/business/onboarding/ProgressBar.tsx` | component | — | self (existing file) | self |
| `app/business/WizardInner.tsx` | orchestrator | event-driven | self (existing file) | self |
| `app/components/ClaimSearchForm.tsx` | component | request-response | self (existing file) | self |
| `app/api/business/create-paikka/route.ts` | API route | request-response | self (existing file) | self |
| `app/api/business/update-paikka/route.ts` | API route | request-response | self (existing file) | self |
| `messages/fi.json` | i18n | — | self (existing file) | self |
| `messages/en.json` | i18n | — | self (existing file) | self |

---

## Pattern Assignments

### `app/business/onboarding/StepNimiJaURL.tsx` (NEW component, request-response)

**Analog:** `app/business/onboarding/StepPaikka.tsx`

This is a direct evolution of StepPaikka: same card shell, same spinner-while-loading paikkaInfo pattern, same no-back-button footer. Add a URL input and change `onNext()` → `onNext(websiteUrl | null)`.

**Full analog to copy** (StepPaikka.tsx lines 1–64):

```tsx
'use client'

import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'

interface StepPaikkaProps {
  paikkaInfo: { nimi: string; osoite: string | null; kaupunki: string | null } | null
  paikkaId: number | null
  onNext: () => void
}

export default function StepPaikka({ paikkaInfo, paikkaId, onNext }: StepPaikkaProps) {
  const t = useTranslations('Business')

  return (
    <div className="glass rounded-2xl p-6 w-full max-w-xl mx-auto">
      <div className="flex flex-col gap-6">
        <h2 className="text-xl font-bold text-[#111111]">{t('stepPlaceName')}</h2>
        {/* Venue info */}
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[rgba(17,17,17,0.45)]">
            {t('selectedVenueLabel')}
          </span>
          {paikkaInfo === null ? (
            <div className="flex items-center justify-center py-4">
              <div className="w-6 h-6 rounded-full border-2 border-[rgba(17,17,17,0.12)] border-t-[#111111] animate-spin" />
            </div>
          ) : (
            <span className="text-sm font-bold text-[#111111]">{paikkaInfo.nimi}</span>
          )}
        </div>
        {/* Footer */}
        <footer className="flex justify-between items-center pt-4 border-t border-[rgba(0,0,0,0.07)]">
          <div />
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={onNext}
            disabled={paikkaId === null}
            className="bg-[#111111] hover:bg-[#333333] text-white font-bold text-sm rounded-full h-10 px-6 [transition:background-color_150ms_var(--ease-out)] disabled:opacity-60 disabled:pointer-events-none"
          >
            {t('nextCta')}
          </motion.button>
        </footer>
      </div>
    </div>
  )
}
```

**Diff from analog:**
- Props: `onNext: (websiteUrl: string | null) => void` (was `() => void`); `paikkaInfo` shape simplifies to `{ nimi: string } | null`
- Add `useState('')` for `websiteUrl`
- Add URL `<input type="url">` block after the venue name block (see UI-SPEC layout)
- Add caps label + hint text below URL input using `text-[10px] font-bold uppercase` / `text-sm text-[rgba(17,17,17,0.45)]`
- `onClick`: call `onNext(websiteUrl.trim() || null)` — never disable the CTA (website optional)
- Input field class to reuse from StepYhteystiedot (line 27):
  `'border border-[rgba(0,0,0,0.12)] rounded-lg h-10 px-3 text-sm text-[#111111] placeholder:text-[rgba(17,17,17,0.35)] bg-white focus:outline-none focus:border-[rgba(0,0,0,0.25)] disabled:opacity-60 w-full [transition:border-color_150ms_var(--ease-out)]'`

---

### `app/business/onboarding/StepSijainti.tsx` (NEW component, request-response)

**Analog:** `app/business/onboarding/StepYhteystiedot.tsx` (lines 109–155 for handleNext pattern) + `app/components/ClaimSearchForm.tsx` (lines 127–134 for SijaintiPicker usage)

**handleNext pattern** (StepYhteystiedot.tsx lines 109–155):

```tsx
async function handleNext() {
  if (loading) return
  setLoading(true)
  setError(null)
  try {
    const supabase = createBusinessBrowserClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setError(t('errorGeneric')); return }
    const res = await fetch('/api/business/...', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ paikka_id: paikkaId, ... }),
    })
    if (!res.ok) { setError(t('errorGeneric')); return }
    onNext()
  } catch {
    setError(t('errorGeneric'))
  } finally {
    setLoading(false)
  }
}
```

**SijaintiPicker usage** (ClaimSearchForm.tsx lines 127–134):

```tsx
<SijaintiPicker
  onChange={({ lat, lng, address, city }) => {
    setCreateLat(lat)
    setCreateLng(lng)
    setCreateOsoite(address)
    setCreateKaupunki(city)
  }}
/>
```

**CTA disabled-until-lat pattern** (ClaimSearchForm.tsx line 154):

```tsx
<button type="submit" className={CTA_CLASS} disabled={loading || createLat === null}>
```

**Error display pattern** (StepYhteystiedot.tsx lines 218–247, AnimatePresence + motion.p):

```tsx
<AnimatePresence>
  {error && (
    <motion.p
      key="contact-error"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      role="alert" aria-live="polite"
      className="text-sm text-red-600"
    >
      {error}
    </motion.p>
  )}
</AnimatePresence>
```

**Footer with back+next** (StepYhteystiedot.tsx lines 251–286):

```tsx
<footer className="flex justify-between items-center pt-4 border-t border-[rgba(0,0,0,0.07)] mt-6">
  <button
    type="button"
    onClick={onPrev}
    disabled={loading}
    className="text-sm text-[rgba(17,17,17,0.45)] hover:text-[#111111] [transition:color_150ms_var(--ease-out)] flex items-center gap-1 disabled:opacity-60"
  >
    {t('prevCta')}
  </button>
  <motion.button
    type="button"
    onClick={handleNext}
    disabled={loading}
    whileTap={{ scale: 0.95 }}
    className="bg-[#111111] hover:bg-[#333333] text-white font-bold text-sm rounded-full h-10 px-6 [transition:background-color_150ms_var(--ease-out)] disabled:opacity-60 disabled:pointer-events-none"
  >
    {loading ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block" /> : t('nextCta')}
  </motion.button>
</footer>
```

**Props interface for StepSijainti:**

```ts
interface StepSijaintiProps {
  paikkaId: number
  onNext: () => void
  onPrev: () => void
}
```

**State:**

```ts
const [lat, setLat] = useState<number | null>(null)
const [lng, setLng] = useState<number | null>(null)
const [osoite, setOsoite] = useState('')
const [kaupunki, setKaupunki] = useState('')
const [loading, setLoading] = useState(false)
const [error, setError] = useState<string | null>(null)
```

**API call body** (from RESEARCH.md Pattern 3):

```ts
body: JSON.stringify({
  paikka_id: paikkaId,
  section: 'sijainti',
  data: { osoite, kaupunki, latitude: lat, longitude: lng }
})
```

---

### `app/business/onboarding/page.tsx` (MODIFIED — state machine)

**Analog:** self (current file: `app/business/onboarding/page.tsx`)

**PagePhase type** — change (line 12):

```ts
// FROM:
type PagePhase = 'paikka' | 'analyze' | 'laji-skip' | 'wizard'
// TO:
type PagePhase = 'nimi-url' | 'sijainti' | 'analyze' | 'laji-skip' | 'wizard'
```

**StepNimiJaURLPrePhase** — replace entire `StepPaikkaPrePhase` function (lines 26–90). Structure is identical; diff:
- `onNext` signature: `(websiteUrl: string | null) => void`
- Fast-forward check: if `paikka.latitude !== null` after resolving, call `onNext(null)` immediately
- Renders `<StepNimiJaURL>` instead of `<StepPaikka>`

**paikkaId resolution pattern** (StepPaikkaPrePhase lines 39–87 — copy verbatim):

```tsx
useEffect(() => {
  let cancelled = false
  async function resolvePaikkaIdAndInfo() {
    const urlPaikkaId = searchParams.get('paikka_id')
    const parsed = urlPaikkaId ? parseInt(urlPaikkaId, 10) : null
    let resolved: number | null = parsed !== null && !isNaN(parsed) ? parsed : null
    const supabase = createBusinessBrowserClient()
    if (!resolved) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: link } = await supabase
          .from('business_paikka_links')
          .select('paikka_id')
          .eq('business_account_id', user.id)
          .limit(1)
          .maybeSingle()
        if (link) resolved = link.paikka_id
      }
    }
    if (!cancelled) {
      setPaikkaId(resolved)
      if (resolved !== null) onPaikkaIdResolved(resolved)
    }
    if (resolved !== null) {
      const { data: paikka } = await supabase
        .from('liikuntapaikat')
        .select('nimi, laji, osoite, kaupunki, latitude, longitude')
        .eq('id', resolved)
        .single()
      if (!cancelled && paikka) {
        setPaikkaInfo(paikka as PaikkaBase)
        onPaikkaInfoResolved(paikka as PaikkaBase)
      }
    }
  }
  resolvePaikkaIdAndInfo()
  return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [])
```

**New state in OnboardingWizardPage** (add alongside existing state):

```ts
const [websiteUrl, setWebsiteUrl] = useState<string | null>(null)
const [aiTriggered, setAiTriggered] = useState(false)
```

**handleNimiUrlNext** (fire-and-forget AI + website persistence — RESEARCH.md Pattern 2):

```tsx
async function handleNimiUrlNext(url: string | null) {
  setWebsiteUrl(url)
  setPagePhase('sijainti')
  if (url && paikkaId !== null) {
    const supabase = createBusinessBrowserClient()
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token ?? ''
    fetch('/api/business/analyze-website', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ url, paikka_id: paikkaId }),
    })
    fetch('/api/business/onboarding/save-step', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ paikka_id: paikkaId, step: 0, field: 'yhteystiedot', value: { website: url } }),
    })
    setAiTriggered(true)
  }
}
```

**handleBackToAnalyze → handleBackToPrePhase** (generalized, replacing lines 276–278):

```ts
function handleBackToPrePhase() {
  setPagePhase(websiteUrl ? 'analyze' : 'laji-skip')
}
```

**Render block** (replacing lines 283–291):

```tsx
{pagePhase === 'nimi-url' && (
  <Suspense fallback={<PreVaiheSpinner />}>
    <StepNimiJaURLPrePhase
      onNext={handleNimiUrlNext}
      onPaikkaIdResolved={setPaikkaId}
      onPaikkaInfoResolved={setPaikkaInfo}
    />
  </Suspense>
)}
{pagePhase === 'sijainti' && paikkaId !== null && (
  <StepSijainti
    paikkaId={paikkaId}
    onNext={() => websiteUrl ? setPagePhase('analyze') : handleSkip()}
    onPrev={() => setPagePhase('nimi-url')}
  />
)}
```

---

### `app/business/onboarding/StepYhteystiedot.tsx` (MODIFIED)

**Analog:** self (current file lines 1–289)

**Changes:**

1. **Hide website input** — wrap lines 183–190 with `{editMode && (...)}`:

```tsx
{editMode && (
  <input
    type="url"
    placeholder={t('contactWebsitePlaceholder')}
    value={website}
    onChange={e => setWebsite(e.target.value)}
    disabled={loading}
    className={inputClass}
  />
)}
```

2. **Remove `initialBrandingWebsite` prop** — in onboarding mode website is no longer collected here.

3. **CTA label switch** (onboarding: submit instead of next) — the footer's else-branch CTA (lines 276–284):

```tsx
// Change: t('nextCta') → t('submitCta') when !editMode
{loading
  ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block" />
  : editMode ? t('nextCta') : t('submitCta')
}
```

4. **`onNext` in onboarding now submits** — `onNext` is passed by WizardInner as `handleYhteystiedotSubmit`; `handleNext()` inside the component still calls `onNext()` after save-step succeeds. No component-internal router needed.

5. **Debounced dispatch** — when `editMode === false`, initialize `website` as `''` and keep it excluded or pass `''` — `LivePreviewContext` has `website?: string` as optional.

---

### `app/business/onboarding/ProgressBar.tsx` (MODIFIED)

**Analog:** self (current file lines 1–88)

**One-line change** (line 22):

```ts
// FROM:
t('stepPreview'),
// TO:
t('stepSubmit'),
```

Full stepLabels array after change (lines 16–23):

```ts
const stepLabels = [
  t('stepMedia'),
  t('stepPricing'),
  t('stepHours'),
  t('stepContact'),
  t('stepSubmit'),   // was t('stepPreview')
]
```

---

### `app/business/WizardInner.tsx` (MODIFIED)

**Analog:** self (current file)

**Changes — all in OnboardingMode:**

1. **Remove import** (line 17): `import StepEsikatselu from './onboarding/StepEsikatselu'`

2. **Step range clamp** (line 69):

```ts
// FROM:
const step = isNaN(rawStep) || rawStep < 1 || rawStep > 5 ? 1 : rawStep
// TO:
const step = isNaN(rawStep) || rawStep < 1 || rawStep > 4 ? 1 : rawStep
```

3. **goToStep clamp** (line 73):

```ts
// FROM:
const clamped = Math.min(Math.max(n, 1), 5)
// TO:
const clamped = Math.min(Math.max(n, 1), 4)
```

4. **completedSteps clamp** (line 83):

```ts
// FROM:
Math.min(draft.current_step, 5)
// TO:
Math.min(draft.current_step, 4)
```

5. **savedStep resume clamp** (line 152):

```ts
// FROM:
const clampedSavedStep = Math.min(savedStep, 5)
// TO:
const clampedSavedStep = Math.min(savedStep, 4)
```

6. **Remove step-5 re-fetch effect** (lines 215–232): delete the entire `useEffect` guarded by `if (step !== 5) return`.

7. **handleYhteystiedotSubmit callback** — add after `saveAndAdvance` (RESEARCH.md Pattern 4). Transplanted from StepEsikatselu.tsx `handleSubmit` (lines 69–113):

```tsx
async function handleYhteystiedotSubmit() {
  const supabase = createBusinessBrowserClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session || paikkaId === null) return
  const res = await fetch('/api/business/onboarding/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ paikka_id: paikkaId }),
  })
  if (res.ok) {
    router.push('/business')
  } else {
    // Surface error — pass setError back to StepYhteystiedot or show inline
  }
}
```

8. **StepYhteystiedot render** — change `onNext={() => saveAndAdvance(4)}` to `onNext={handleYhteystiedotSubmit}`, remove `initialBrandingWebsite` prop.

9. **Remove StepEsikatselu render block** from `step === 5` branch.

10. **Rename prop** `onBackToAnalyze` → kept but wired to new `handleBackToPrePhase` in page.tsx (prop name unchanged is fine; only the page.tsx implementation changes).

---

### `app/components/ClaimSearchForm.tsx` (MODIFIED)

**Analog:** self (current file lines 1–160)

**Remove:**
- Line 8: `import SijaintiPicker from './SijaintiPicker'`
- Lines 27–30: `createOsoite`, `createKaupunki`, `createLat`, `createLng` state
- Lines 40–53: sijainti validation block in `handleCreate`
- Lines 72–77: `osoite`, `kaupunki`, `latitude`, `longitude` from fetch body
- Lines 123–134: `<h3>` sijainti label + `<SijaintiPicker>` render

**Change CTA disabled condition** (line 154):

```tsx
// FROM:
disabled={loading || createLat === null}
// TO:
disabled={loading || !yritysNimi.trim()}
```

**Remove sijainti validations** (lines 44–56):

```tsx
// Remove:
if (!createOsoite.trim()) { setError(t('errorAddressRequired')); return }
if (createLat === null || createLng === null) { setError(t('sijaintiPakollinen')); return }
if (!createKaupunki.trim()) { setError(t('sijaintiVirhe')); return }
```

**Resulting fetch body** (lines 71–78 after change):

```ts
body: JSON.stringify({
  yritysNimi: yritysNimi.trim(),
  toimipisteNimi: toimipisteNimi.trim(),
  // osoite/kaupunki/latitude/longitude REMOVED
})
```

---

### `app/api/business/create-paikka/route.ts` (MODIFIED)

**Analog:** self (current file)

**Validation change** (lines 56–58 — RESEARCH.md Pattern 5):

```ts
// FROM:
if (!yritysNimi || !osoite || !kaupunki || latitude === null || longitude === null) {
  return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
}
// TO:
if (!yritysNimi) {
  return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
}
```

**Insert change** (line 74):

```ts
// FROM:
.insert({ nimi, osoite, kaupunki, latitude, longitude, laji: 'Muu', published: false })
// TO:
.insert({ nimi, osoite: osoite || null, kaupunki: kaupunki || null, latitude, longitude, laji: 'Muu', published: false })
```

(latitude/longitude will now be null when not provided — coordinate parse at lines 47–53 already returns null for missing values.)

---

### `app/api/business/update-paikka/route.ts` (MODIFIED)

**Analog:** self (current file)

**Add sijainti section** before the final `else` at line 135 (RESEARCH.md Pattern 6):

```ts
} else if (section === 'sijainti') {
  const d = data as { osoite?: string; kaupunki?: string; latitude?: unknown; longitude?: unknown }
  const lat = typeof d.latitude === 'number' && Number.isFinite(d.latitude) && d.latitude >= -90 && d.latitude <= 90
    ? d.latitude : null
  const lng = typeof d.longitude === 'number' && Number.isFinite(d.longitude) && d.longitude >= -180 && d.longitude <= 180
    ? d.longitude : null
  if (lat === null || lng === null) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 })
  }
  updatePayload = {
    osoite: typeof d.osoite === 'string' ? d.osoite.trim().slice(0, 500) : null,
    kaupunki: typeof d.kaupunki === 'string' ? d.kaupunki.trim().slice(0, 500) : null,
    latitude: lat,
    longitude: lng,
  }
} else {
  return NextResponse.json({ error: 'Invalid section' }, { status: 400 })
}
```

The coordinate validation mirrors create-paikka/route.ts lines 47–53 exactly — same finite + range pattern.

---

### `messages/fi.json` and `messages/en.json` (MODIFIED)

**Analog:** self (existing Business namespace keys)

Add 6 keys to the `Business` object in each file:

**fi.json additions:**

```json
"stepSubmit": "Lähetys",
"stepNimiJaURLHeading": "Paikkasi tiedot",
"stepNimiJaURLWebsiteLabel": "VERKKO-OSOITE (VALINNAINEN)",
"stepNimiJaURLWebsiteHint": "Verkko-osoitteen avulla täytämme tiedot automaattisesti",
"stepNimiJaURLWebsitePlaceholder": "https://...",
"stepSijaintiHeading": "Missä paikka sijaitsee?"
```

**en.json additions:**

```json
"stepSubmit": "Submit",
"stepNimiJaURLHeading": "Your venue details",
"stepNimiJaURLWebsiteLabel": "WEBSITE (OPTIONAL)",
"stepNimiJaURLWebsiteHint": "We'll use your website to prefill venue details",
"stepNimiJaURLWebsitePlaceholder": "https://...",
"stepSijaintiHeading": "Where is your venue?"
```

Note: `stepPreview` key stays in both files (may still be referenced elsewhere — cleanup deferred).

---

## Shared Patterns

### Glass card shell
**Source:** `app/business/onboarding/StepPaikka.tsx` lines 20–21, also StepYhteystiedot.tsx line 158
**Apply to:** StepNimiJaURL and StepSijainti

```tsx
<div className="glass rounded-2xl p-6 w-full max-w-xl mx-auto">
  <div className="flex flex-col gap-6">
```

### Auth token retrieval before fetch
**Source:** `app/business/onboarding/StepYhteystiedot.tsx` lines 115–119, `app/business/onboarding/page.tsx` lines 191–196
**Apply to:** StepSijainti handleNext, page.tsx handleNimiUrlNext

```ts
const supabase = createBusinessBrowserClient()
const { data: { session } } = await supabase.auth.getSession()
const token = session?.access_token ?? ''
```

### Spinner inside CTA (loading state)
**Source:** `app/business/onboarding/StepYhteystiedot.tsx` line 270, `app/business/onboarding/StepEsikatselu.tsx` line 191
**Apply to:** StepSijainti CTA, StepYhteystiedot submit CTA

```tsx
{loading
  ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block" />
  : t('nextCta')
}
```

### Card-level spinner (waiting for paikkaInfo)
**Source:** `app/business/onboarding/StepPaikka.tsx` lines 31–34
**Apply to:** StepNimiJaURL when `paikkaInfo === null`

```tsx
<div className="flex items-center justify-center py-4">
  <div className="w-6 h-6 rounded-full border-2 border-[rgba(17,17,17,0.12)] border-t-[#111111] animate-spin" />
</div>
```

### Caps label
**Source:** `app/business/onboarding/StepPaikka.tsx` lines 28–30
**Apply to:** All new label-above-field patterns in StepNimiJaURL

```tsx
<span className="text-[10px] font-bold uppercase tracking-widest text-[rgba(17,17,17,0.45)]">
  {t('...')}
</span>
```

### AnimatePresence error
**Source:** `app/business/onboarding/StepYhteystiedot.tsx` lines 218–247, `app/components/ClaimSearchForm.tsx` lines 137–151
**Apply to:** StepSijainti error display

```tsx
<AnimatePresence>
  {error && (
    <motion.p
      key="step-error"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      role="alert" aria-live="polite"
      className="text-sm text-red-600"
    >
      {error}
    </motion.p>
  )}
</AnimatePresence>
```

### Back button (muted text)
**Source:** `app/business/onboarding/StepYhteystiedot.tsx` lines 253–258
**Apply to:** StepSijainti and StepYhteystiedot (already present)

```tsx
<button
  type="button"
  onClick={onPrev}
  disabled={loading}
  className="text-sm text-[rgba(17,17,17,0.45)] hover:text-[#111111] [transition:color_150ms_var(--ease-out)] flex items-center gap-1 disabled:opacity-60"
>
  {t('prevCta')}
</button>
```

---

## No Analog Found

None — all files have close or exact analogs in the existing codebase.

---

## Metadata

**Analog search scope:** `app/business/`, `app/components/`, `app/api/business/`
**Files scanned:** 11 source files read directly
**Pattern extraction date:** 2026-06-26
