# Phase 61: Onboarding-vaiheiden uudelleenjärjestys — Research

**Researched:** 2026-06-26
**Domain:** Next.js React component refactor — onboarding wizard step reorder
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

No CONTEXT.md exists for this phase. Phase is independent (separate code path: onboarding wizard vs. dashboard/venuepage). No locked decisions beyond the active decisions in STATE.md.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ONBOARD-18 | PaikkaStep (vain nimi + siirry-painike) poistetaan kokonaan onboarding-virrasta | Delete `StepPaikka.tsx`; replace with `StepNimiJaURL` in `page.tsx` pre-phases |
| ONBOARD-19 | Onboardingin uusi step 1 kerää paikan nimen ja verkko-osoitteen yhdessä; verkko-osoitteen syöttö käynnistää AI-sivuanalyysin taustalla heti | New `StepNimiJaURL` component; fire-and-forget POST to `/api/business/analyze-website` |
| ONBOARD-20 | Sijainti-step (kartta + osoitehaku-autocomplete) siirretään step 2:ksi | New `StepSijainti` component wrapping existing `SijaintiPicker`; save via `update-paikka` 'sijainti' section |
| ONBOARD-21 | Jos verkko-osoite annettiin step 1:ssä, AI-analyysin tulokset näytetään tarkasteltavaksi omana stepinä sijainti-stepin jälkeen | `page.tsx` phase transition: `sijainti → analyze` if websiteUrl non-null; `sijainti → laji-skip` otherwise |
| ONBOARD-22 | Lopullinen Preview-step poistetaan kokonaan virrasta | Delete `StepEsikatselu.tsx`; remove from `WizardInner.tsx` |
| ONBOARD-23 | Yhteystiedot-stepistä poistetaan verkko-osoite-kenttä (kerätty jo step 1:ssä) | Conditionally hide website input in `StepYhteystiedot` when `editMode === false` |
| ONBOARD-24 | Onboardingin etenemispalkin poistettu "PREVIEW"-vaihe korvataan "SUBMIT"-vaiheella, joka saavutetaan onboardingin lähetyksen yhteydessä | `ProgressBar.tsx`: change `t('stepPreview')` to `t('stepSubmit')`; add i18n key |
</phase_requirements>

---

## Summary

Phase 61 is a pure frontend refactor of the onboarding wizard. No new API routes, no new DB migrations, no new third-party packages. The core work is: (1) two new pre-phase components (`StepNimiJaURL`, `StepSijainti`), (2) deletion of `StepPaikka` and `StepEsikatselu`, (3) modifications to `page.tsx` state machine, `WizardInner`, `StepYhteystiedot`, `ProgressBar`, `ClaimSearchForm`, and two API routes.

The `SijaintiPicker` component exists and is production-ready — `StepSijainti` wraps it verbatim. `AnalysoiSivusto` (the AI results review component) is unchanged; it just enters the flow later and via a different trigger. The AI analysis backend route is `/api/business/analyze-website`, not `/api/business/ai-analyze` as the UI-SPEC incorrectly calls it.

**Primary recommendation:** Proceed exactly per the approved UI-SPEC (61-UI-SPEC.md), with three explicit corrections: (1) use `/api/business/analyze-website` everywhere the UI-SPEC says `ai-analyze`; (2) add a website-URL persistence save-step call from page.tsx alongside the AI trigger; (3) pass submit as a callback from WizardInner rather than adding `useRouter` to `StepYhteystiedot`.

---

## Project Constraints (from CLAUDE.md)

| Directive | Impact on Phase 61 |
|-----------|-------------------|
| Tailwind v3 — no `@import "tailwindcss"` | Use `@tailwind` directives; no shadcn v4 imports |
| `.glass`, `.glass-hover`, `.glass-btn`, `.glass-nav` — never replicate inline | New cards must use `.glass rounded-2xl p-6` pattern |
| 4 font sizes only; 2 weights only (400, 700) | StepNimiJaURL and StepSijainti: stick to `text-sm`, `text-xl`, `text-[10px]` |
| Never generate `?nakyma=kartta` | Not applicable to onboarding routes |
| AI widget: never SSR, use `/api/saasuositus` Route Handler | AnalysoiSivusto already follows this — no changes |
| Supabase writes: service role key only | All API routes already use `supabaseAdmin` |
| `StepPaikka` removal subsumed by Phase 61 | Confirmed: P57-FOLLOWUP in STATE.md resolves within this phase |

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Venue name (read-only display) | Frontend Client | — | Already resolved at create-paikka; read from paikkaInfo state |
| Website URL collection | Frontend Client | — | Collected in StepNimiJaURL; passed to page.tsx state |
| AI analysis trigger | Frontend Client → API Route | — | Fire-and-forget POST to `/api/business/analyze-website` |
| Location (lat/lng) collection | Frontend Client | — | SijaintiPicker + reverse geocode |
| Location persistence | Frontend Client → API Route | — | StepSijainti calls `update-paikka` section 'sijainti' |
| Website URL persistence | Frontend Client → API Route | — | Page.tsx calls `save-step` with field 'yhteystiedot' alongside AI trigger |
| Onboarding submission | Frontend Client → API Route | — | StepYhteystiedot calls `onboarding/submit` inline (onboarding mode only) |
| Progress display | Frontend Client | — | ProgressBar — client-only, no API interaction |

---

## Standard Stack

### No new packages required

All libraries used in Phase 61 are already installed. [VERIFIED: codebase grep]

| Library | Already Used | How Used in Phase 61 |
|---------|-------------|---------------------|
| `framer-motion` | Yes | `motion.button`, `AnimatePresence` in new components — existing patterns |
| `next-intl` | Yes | `useTranslations('Business')` — existing pattern |
| `@vis.gl/react-google-maps` | Yes | Via `SijaintiPicker` (no changes to component) |
| `lucide-react` | Yes | `Check` (ProgressBar), `Locate` (SijaintiPicker — unchanged) |

**No npm install needed.** [VERIFIED: codebase grep]

---

## Architecture Patterns

### Current Flow (before Phase 61) [VERIFIED: reading page.tsx, WizardInner.tsx]

```
ClaimSearchForm (name + SijaintiPicker)
  → create-paikka API (requires name, osoite, kaupunki, lat, lng)
  → /business/onboarding?paikka_id=N
      pagePhase state machine:
        'paikka'     → StepPaikkaPrePhase + StepPaikka (name display + next)
        'analyze'    → PrePhase + AnalysoiSivusto (AI URL input + results)
        'laji-skip'  → LajiPicker (sport category, if AI skipped)
        'wizard'     → WizardInner (OnboardingMode, steps 1-5)
                        step 1: StepMediat
                        step 2: StepHinnasto
                        step 3: StepAukioloajat
                        step 4: StepYhteystiedot (has website field)
                        step 5: StepEsikatselu (preview + submit button)
```

ProgressBar labels: MEDIAT | HINNASTO | AUKIOLOAJAT | YHTEYSTIEDOT | ESIKATSELU

### Target Flow (after Phase 61) [VERIFIED: 61-UI-SPEC.md]

```
ClaimSearchForm (name only — no SijaintiPicker)
  → create-paikka API (name only; lat/lng null)
  → /business/onboarding?paikka_id=N
      pagePhase state machine:
        'nimi-url'   → StepNimiJaURLPrePhase + StepNimiJaURL
                        (name display + website URL input; "Seuraava" triggers AI)
        'sijainti'   → StepSijainti (SijaintiPicker + save lat/lng via update-paikka)
        'analyze'    → PrePhase + AnalysoiSivusto (AI results review — only if website given)
        'laji-skip'  → LajiPicker (only if no website / AI skipped)
        'wizard'     → WizardInner (OnboardingMode, steps 1-4)
                        step 1: StepMediat
                        step 2: StepHinnasto
                        step 3: StepAukioloajat
                        step 4: StepYhteystiedot (NO website field; submit inline)
```

ProgressBar labels: MEDIAT | HINNASTO | AUKIOLOAJAT | YHTEYSTIEDOT | SUBMIT

### Recommended Project Structure

```
app/business/onboarding/
├── page.tsx                  ← modified (new phases, new state)
├── StepNimiJaURL.tsx         ← NEW
├── StepSijainti.tsx          ← NEW
├── StepPaikka.tsx            ← DELETED
├── StepEsikatselu.tsx        ← DELETED
├── StepYhteystiedot.tsx      ← modified (remove website field; inline submit)
├── ProgressBar.tsx           ← modified (stepPreview → stepSubmit)
├── AnalysoiSivusto.tsx       ← unchanged
├── StepMediat.tsx            ← unchanged
├── StepHinnasto.tsx          ← unchanged
├── StepAukioloajat.tsx       ← unchanged
└── [other files unchanged]
app/components/
└── ClaimSearchForm.tsx       ← modified (remove SijaintiPicker + location state)
app/api/business/
├── create-paikka/route.ts    ← modified (lat/lng optional)
└── update-paikka/route.ts   ← modified (add 'sijainti' section)
messages/
├── fi.json                   ← modified (add stepSubmit + 5 new keys)
└── en.json                   ← modified (same)
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Location picker with map | Custom map + geocoder | `SijaintiPicker` (existing) | Already handles AdvancedMarker, GPS, PlaceAutocomplete, reverse geocode |
| AI analysis UI | Custom polling component | `AnalysoiSivusto` (existing) | Already handles 'checking' / 'url-input' / 'analyzing' / 'preview' / 'error' states |
| Sport category picker | Custom taxonomy UI | `LajiPicker` (exported from AnalysoiSivusto) | Already handles 9 taxonomy categories + free-text |
| Live preview layout | Custom preview pane | `LivePreviewPane`, `LivePreviewProvider`, `LivePreviewToggle` (existing) | Already handles desktop/mobile split |

---

## Common Pitfalls

### Pitfall 1: Wrong AI route name

**What goes wrong:** Code calls `/api/business/ai-analyze` (as the UI-SPEC mistakenly states) — returns 404 in production.
**Why it happens:** The UI-SPEC used an incorrect route name. The actual route is `/api/business/analyze-website`.
**How to avoid:** Every fire-and-forget AI trigger in `page.tsx` and `StepNimiJaURL` must use `POST /api/business/analyze-website` with body `{ url, paikka_id }`. The GET variant (`GET /api/business/analyze-website?paikka_id=N`) checks analysis status — used by `AnalysoiSivusto` polling internally, not by Phase 61 code.
**Warning signs:** Network tab shows 404 on AI trigger; `AnalysoiSivusto` shows 'url-input' phase instead of 'analyzing'.

### Pitfall 2: Website URL not persisted to draft → varauslinkki null after submit

**What goes wrong:** Website collected in `StepNimiJaURL` is stored only in page.tsx's `websiteUrl` state. React state does not survive page reload. `onboarding/submit/route.ts` reads `draft.yhteystiedot?.website` to write `liikuntapaikat.varauslinkki`. If no save-step call writes the website to the draft, `varauslinkki` will be null for all venues onboarded after Phase 61.
**Why it happens:** The UI-SPEC description "stores url in parent state" does not mention a save-step write. The submit route's dependency on `draft.yhteystiedot.website` is implicit.
**How to avoid:** When user clicks "Seuraava" on `StepNimiJaURL` with a non-empty URL, `page.tsx` must fire a `save-step` call (`field: 'yhteystiedot'`, `value: { website: url }`, `step: 0`) alongside the AI trigger. Since `save-step`'s UPSERT merges JSONB fields, this does not interfere with StepYhteystiedot's later save of `{ puhelin, email, kuvaus }` — the draft accumulates both.
**Warning signs:** Submitted venues have `varauslinkki = null` even when user provided URL; AI analysis shows correct website but venue profile page shows no booking link.

### Pitfall 3: create-paikka route rejects null lat/lng

**What goes wrong:** After removing SijaintiPicker from `ClaimSearchForm`, the lat/lng sent to `create-paikka` will be null. The current validation at line 56 rejects this: `if (!yritysNimi || !osoite || !kaupunki || latitude === null || longitude === null)` → 400.
**Why it happens:** The route was written when all fields were collected upfront.
**How to avoid:** Change the `create-paikka` validation to only require `yritysNimi`. Set `osoite`, `kaupunki`, `latitude`, `longitude` to empty string / null in the DB insert. The `liikuntapaikat` schema already has these columns as nullable (confirmed: TypeScript type `latitude: number | null`).
**Warning signs:** `ClaimSearchForm` POST returns 400; redirect to onboarding never happens.

### Pitfall 4: WizardInner step range still 5 after Phase 61

**What goes wrong:** `rawStep > 5` check, `Math.min(draft.current_step, 5)`, `Math.min(savedStep, 5)`, and `if (step !== 5) return` effect all reference the old step count. After removing StepEsikatselu, step 5 is invalid.
**Why it happens:** Three separate places in `WizardInner.tsx` hard-code the number 5. Missing any one causes: stale preview re-fetch effect, wrong completed-step highlighting, or incorrect resume URL.
**How to avoid:** Change all three to 4:
  - `rawStep > 5` → `rawStep > 4`
  - `Math.min(draft.current_step, 5)` → `Math.min(draft.current_step, 4)` (appears twice)
  - Remove the `step === 5` draft re-fetch effect entirely
**Warning signs:** Completed step circles show wrong state in ProgressBar; user resumes at wrong step.

### Pitfall 5: StepYhteystiedot website field shown in onboarding mode

**What goes wrong:** The website `<input type="url">` in `StepYhteystiedot` is currently rendered unconditionally — `editMode` prop only affects the footer CTA. After Phase 61, it must be hidden when `editMode === false` (onboarding path).
**Why it happens:** The current component has no editMode check on the website input.
**How to avoid:** Wrap the website input in `{editMode && (...)}`. The `debouncedYhteystiedot` dispatch must also exclude website when `editMode === false`, or keep website in dispatch with empty string (harmless for live preview).
**Warning signs:** Website field visible in onboarding step 4 after deployment.

### Pitfall 6: StepYhteystiedot submit in onboarding mode needs router

**What goes wrong:** The current `StepYhteystiedot` does not import `useRouter`. If the inline submit + redirect is placed inside `handleNext()` directly, `useRouter` must be added. Alternatively, passing a callback prop avoids this.
**Why it happens:** The component was designed to delegate navigation to the parent.
**How to avoid (recommended):** Keep submit logic in WizardInner. Change the `onNext` prop passed to `StepYhteystiedot` from `() => saveAndAdvance(4)` to an async function that: (1) calls `POST /api/business/onboarding/submit`, (2) calls `router.push('/business')` on success, or (3) surfaces an error. The component's footer CTA copy changes from `t('nextCta')` to `t('submitCta')` — controlled by an `isLastStep?: boolean` prop or the existing `editMode` inversion.
**Warning signs:** TypeScript error on `router` undefined in StepYhteystiedot, or submit never called.

### Pitfall 7: save-step validation rejects step: 4 for yhteystiedot after removing step 5

**What goes wrong:** Expecting save-step to reject `step: 4` since wizard now has 4 steps.
**Why it doesn't happen:** The save-step route validates `0-5` (not `0-4`). `step: 4` is already valid. AnalysoiSivusto's quick-accept path still sends `step: 5`. No changes needed to the save-step route. [VERIFIED: save-step/route.ts line 68]

### Pitfall 8: `handleBackToAnalyze` always routes to 'analyze' phase

**What goes wrong:** WizardInner step 1 (StepMediat) back button calls `onBackToAnalyze?.()` which hardcodes `setPagePhase('analyze')`. If the user provided no website (so they went through `laji-skip` into the wizard), this would show the AnalysoiSivusto empty 'url-input' phase instead of returning to `laji-skip`.
**Why it happens:** The current code assumed the pre-phase before the wizard is always 'analyze'.
**How to avoid:** Generalize to `handleBackToPrePhase` in `page.tsx`. Check `websiteUrl` state: if non-null, `setPagePhase('analyze')`; else `setPagePhase('laji-skip')`. Rename the WizardInner prop from `onBackToAnalyze` to `onBackToPrePhase` (or just wire the same prop name to the new logic without renaming, since it's only called here).

### Pitfall 9: `update-paikka` missing 'sijainti' section

**What goes wrong:** `StepSijainti` calls `POST /api/business/update-paikka` with `section: 'sijainti'`. Current route returns `{ error: 'Invalid section' }` (status 400) for unknown sections.
**Why it happens:** The 'sijainti' section was not in the original scope of `update-paikka`.
**How to avoid:** Add a `sijainti` branch in `update-paikka/route.ts` that validates and writes `{ osoite, kaupunki, latitude, longitude }` with the same coordinate-range validation currently in `create-paikka/route.ts` (finite check, lat within ±90, lng within ±180).
**Warning signs:** `StepSijainti` "Seuraava" returns error; sijainti never saved.

### Pitfall 10: Resumption fast-forward skips new pre-phases

**What goes wrong:** A user who starts onboarding, advances into the wizard (current_step >= 1), closes the tab, and returns — page.tsx currently shows `pagePhase = 'nimi-url'` first, forcing them through pre-phases they already completed.
**Why it happens:** The new pre-phases don't know their own completion state.
**How to avoid:** In `StepNimiJaURLPrePhase` (the Suspense wrapper in page.tsx), after resolving `paikkaInfo`, check if `paikkaInfo.latitude !== null`. If true, the sijainti step was already completed — call `onNext(paikkaInfo.website_url_somehow ?? null)` immediately to skip to 'wizard' directly. For the website URL: since `paikkaInfo` fetches from `liikuntapaikat`, and `varauslinkki` is not in `PaikkaBase`, the resume check can also query `onboarding_draft` and use `draft.current_step > 0` as the fast-forward trigger, OR simply check `latitude !== null` to skip to wizard and set `websiteUrl = null` (worst case: AI results won't show on resume, but wizard will work correctly).

---

## Code Examples

### Pattern 1: Pre-phase structure in page.tsx [VERIFIED: reading page.tsx]

```tsx
// StepNimiJaURLPrePhase — mirrors existing StepPaikkaPrePhase exactly.
// Must live inside <Suspense> (calls useSearchParams).
function StepNimiJaURLPrePhase({
  onNext,
  onPaikkaIdResolved,
  onPaikkaInfoResolved,
}: {
  onNext: (websiteUrl: string | null) => void
  onPaikkaIdResolved: (id: number) => void
  onPaikkaInfoResolved: (info: PaikkaBase) => void
}) {
  const searchParams = useSearchParams()
  const [paikkaId, setPaikkaId] = useState<number | null>(null)
  const [paikkaInfo, setPaikkaInfo] = useState<PaikkaBase | null>(null)

  useEffect(() => {
    // ... same resolution logic as existing StepPaikkaPrePhase ...
    // Fast-forward: if latitude already set, skip pre-phases
    if (paikka.latitude !== null) {
      onNext(null) // jump to wizard; website URL not recoverable without draft read
      return
    }
    setPaikkaInfo(paikka as PaikkaBase)
    onPaikkaInfoResolved(paikka as PaikkaBase)
  }, [])

  return <StepNimiJaURL paikkaInfo={paikkaInfo} paikkaId={paikkaId} onNext={onNext} />
}
```

### Pattern 2: AI trigger + website persistence in page.tsx [VERIFIED: analyze-website/route.ts]

```tsx
// In OnboardingWizardPage, 'nimi-url' onNext handler:
async function handleNimiUrlNext(websiteUrl: string | null) {
  setWebsiteUrl(websiteUrl)
  setPagePhase('sijainti')

  if (websiteUrl && paikkaId !== null) {
    const supabase = createBusinessBrowserClient()
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token ?? ''

    // Fire-and-forget AI trigger — correct route name
    fetch('/api/business/analyze-website', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ url: websiteUrl, paikka_id: paikkaId }),
    })

    // Persist website to draft so submit route writes varauslinkki (Pitfall 2 fix)
    fetch('/api/business/onboarding/save-step', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ paikka_id: paikkaId, step: 0, field: 'yhteystiedot', value: { website: websiteUrl } }),
    })
  }
}
```

### Pattern 3: StepSijainti save call [VERIFIED: update-paikka/route.ts pattern, SijaintiPicker props]

```tsx
// StepSijainti handleNext():
async function handleNext() {
  if (lat === null || lng === null) {
    setError(t('sijaintiPakollinen'))
    return
  }
  setLoading(true)
  const supabase = createBusinessBrowserClient()
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token ?? ''
  const res = await fetch('/api/business/update-paikka', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({
      paikka_id: paikkaId,
      section: 'sijainti',
      data: { osoite, kaupunki, latitude: lat, longitude: lng }
    }),
  })
  if (!res.ok) { setError(t('errorGeneric')); setLoading(false); return }
  setLoading(false)
  onNext()
}
```

### Pattern 4: WizardInner submit callback for StepYhteystiedot (Pitfall 6 fix) [VERIFIED: WizardInner.tsx pattern]

```tsx
// In OnboardingMode (WizardInner.tsx):
async function handleYhteystiedotSubmit() {
  const supabase = createBusinessBrowserClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session || paikkaId === null) return
  const res = await fetch('/api/business/onboarding/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token },
    body: JSON.stringify({ paikka_id: paikkaId }),
  })
  if (res.ok) {
    router.push('/business')
  } else {
    // Surface error back to StepYhteystiedot via error state — needs a callback
  }
}

// Pass to StepYhteystiedot instead of saveAndAdvance(4):
<StepYhteystiedot
  paikkaId={paikkaId}
  initialYhteystiedot={draft?.yhteystiedot}
  // initialBrandingWebsite REMOVED
  onNext={handleYhteystiedotSubmit}  // now submits instead of advancing
  onPrev={() => goToStep(3)}
/>
```

### Pattern 5: create-paikka optional fields [VERIFIED: create-paikka/route.ts current validation]

```ts
// Change validation from:
if (!yritysNimi || !osoite || !kaupunki || latitude === null || longitude === null) {
  return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
}

// To:
if (!yritysNimi) {
  return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
}

// And insert with nulls:
.insert({ nimi, osoite: osoite || null, kaupunki: kaupunki || null, latitude, longitude, laji: 'Muu', published: false })
```

### Pattern 6: update-paikka sijainti section [VERIFIED: update-paikka/route.ts structure]

```ts
// Add before the final else:
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
```

---

## File-by-File Change Summary

| File | Change | Key Details |
|------|--------|-------------|
| `app/business/onboarding/page.tsx` | Modified | `PagePhase` adds 'nimi-url', 'sijainti'; adds `websiteUrl`, `aiTriggered` state; new phase transitions; `handleBackToAnalyze` generalized |
| `app/business/onboarding/StepPaikka.tsx` | DELETED | Replaced by StepNimiJaURL |
| `app/business/onboarding/StepNimiJaURL.tsx` | NEW | Name read-only + website URL input; `onNext(websiteUrl)` |
| `app/business/onboarding/StepSijainti.tsx` | NEW | Wraps `SijaintiPicker`; saves via `update-paikka` 'sijainti'; `onNext()`, `onPrev()` |
| `app/business/onboarding/StepEsikatselu.tsx` | DELETED | Submit logic moves to WizardInner's submit callback |
| `app/business/onboarding/StepYhteystiedot.tsx` | Modified | Hide website input when `editMode === false`; CTA label switches to `t('submitCta')` when `!editMode`; `onNext` callback handles submit (provided by WizardInner) |
| `app/business/onboarding/ProgressBar.tsx` | Modified | `t('stepPreview')` → `t('stepSubmit')` |
| `app/business/WizardInner.tsx` | Modified | Remove StepEsikatselu import + render; clamp to 4; remove step-5 effect; `handleYhteystiedotSubmit` callback |
| `app/components/ClaimSearchForm.tsx` | Modified | Remove SijaintiPicker + location state + location validation; button enabled on `yritysNimi` only |
| `app/api/business/create-paikka/route.ts` | Modified | `osoite`, `kaupunki`, `latitude`, `longitude` optional; only `yritysNimi` required |
| `app/api/business/update-paikka/route.ts` | Modified | Add `'sijainti'` section |
| `messages/fi.json` | Modified | Add `stepSubmit`, `stepNimiJaURLHeading`, `stepNimiJaURLWebsiteLabel`, `stepNimiJaURLWebsiteHint`, `stepNimiJaURLWebsitePlaceholder`, `stepSijaintiHeading` |
| `messages/en.json` | Modified | Same 6 keys in English |

---

## DB Schema: No Migrations Required [VERIFIED: lib/types.ts, supabase migrations]

`liikuntapaikat.latitude` and `longitude` are already `number | null` in TypeScript types — they were nullable from the initial schema. The `create-paikka` API route currently enforces non-null at the application layer, which Phase 61 relaxes.

No new DB tables, columns, or migrations needed.

---

## Runtime State Inventory

Not applicable — this is a pure frontend refactor. No stored data contains the old step labels (ProgressBar labels are UI-only). No OS registrations, no scheduled jobs, no Redis keys affected.

---

## Environment Availability

| Dependency | Required By | Available | Notes |
|------------|------------|-----------|-------|
| Google Maps JS API | SijaintiPicker (existing) | ✓ | NEXT_PUBLIC_GOOGLE_MAPS_API_KEY already configured |
| Supabase | All API routes | ✓ | Already configured |
| `/api/business/analyze-website` | Background AI trigger | ✓ | Existing route, no changes |
| `/api/business/update-paikka` | StepSijainti | ✓ | Existing route, adding 'sijainti' section |
| `/api/business/onboarding/save-step` | Website URL persistence | ✓ | Existing route, no changes |
| `/api/business/onboarding/submit` | StepYhteystiedot final submit | ✓ | Existing route, no changes |

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected — manual UAT |
| Quick run command | `npx next build` (TypeScript check) |
| Full suite command | `npx tsc --noEmit` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Notes |
|--------|----------|-----------|-------|
| ONBOARD-18 | StepPaikka gone | Manual | Verify file deleted; no import errors |
| ONBOARD-19 | StepNimiJaURL collects name+URL; AI triggers | Manual UAT | Open onboarding; verify network POST to analyze-website on Seuraava |
| ONBOARD-20 | StepSijainti is step 2 pre-phase | Manual UAT | Verify map appears after nimi-url |
| ONBOARD-21 | AI results shown if URL given | Manual UAT | Enter URL in step 1; verify AnalysoiSivusto appears after sijainti |
| ONBOARD-22 | No preview step in wizard | Manual UAT | Confirm 4 wizard steps; no step 5 |
| ONBOARD-23 | No website field in StepYhteystiedot onboarding | Manual UAT | Inspect step 4 in onboarding vs edit mode |
| ONBOARD-24 | ProgressBar shows SUBMIT not ESIKATSELU | Manual UAT | Visual check |

### Wave 0 Gaps

None — no automated test files needed. All validation is manual UAT on the running app.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `supabaseAdmin.auth.getUser(token)` at every Route Handler — existing pattern, no change |
| V5 Input Validation | yes | `update-paikka` 'sijainti' section validates coordinate range (finite, ±90/±180) |
| V6 Cryptography | no | — |
| V4 Access Control | yes | `update-paikka` ownership check via `business_paikka_links` — existing pattern |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR via paikka_id in update-paikka 'sijainti' | Tampering | Existing ownership check in update-paikka already handles this — no new code needed |
| Coordinate injection (out-of-range lat/lng) | Tampering | Explicit finite + range validation in 'sijainti' section (same as create-paikka pattern) |
| XSS via website URL in save-step | Tampering | save-step stores website in JSONB; submit route validates http/https — existing guard at submit time |

---

## Open Questions

1. **Website persistence on resume with `current_step = 0`**
   - What we know: If user enters website in StepNimiJaURL, page.tsx fires save-step with `{ yhteystiedot: { website: url }, step: 0 }` — `current_step` becomes 1.
   - What's unclear: If the save-step call fails (network error), the website is lost but AI analysis continues. The `varauslinkki` will be null at submit.
   - Recommendation: Non-blocking save failure is acceptable (consistent with existing `handleConfirm`'s "Non-blocking: if the write fails, still allow navigation" comment). Log the error; user can add website in edit mode post-approval.

2. **`editMode` prop in StepYhteystiedot from WizardInner OnboardingMode**
   - What we know: WizardInner currently does NOT pass `editMode` to StepYhteystiedot in OnboardingMode (defaults to `false`). Edit mode passes `editMode={true}`.
   - What's unclear: Whether hiding the website field with `{editMode && ...}` is sufficient, or if `isLastStep` semantics should be separate.
   - Recommendation: Use `{editMode && ...}` for the website input. Change footer CTA to `{editMode ? t('saveCta') : t('submitCta')}` — `submitCta` ("Lähetä hyväksyttäväksi") is already the correct label per UI-SPEC.

3. **`debouncedYhteystiedot` dispatch includes website when editMode=false**
   - What we know: `StepYhteystiedot` dispatches `SET_YHTEYSTIEDOT` with `{ puhelin, email, website, kuvaus }`. After Phase 61, `website` state variable should also be removed when `editMode === false`.
   - What's unclear: Whether the live preview breaks if `website` is absent from the dispatch.
   - Recommendation: When `editMode === false`, initialize `website` to `''` and exclude it from the debounced dispatch. `LivePreviewContext` has `website?: string` as optional — falling back to `base.varauslinkki` (which the draft already stored via the nimi-url save-step).

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `liikuntapaikat.latitude` and `.longitude` DB columns are nullable | DB Schema | If NOT NULL constraint exists, `create-paikka` insert with null lat/lng would throw 500. Mitigation: verify with `supabase db pull` or check Supabase table editor before executing. | 

**Note:** The TypeScript type (`latitude: number | null`) and the fact that the codebase already uses `paikka.latitude` in null-checks strongly implies nullable. [ASSUMED based on type definition — not verified via live DB query]

---

## Sources

### Primary (HIGH confidence)

- `app/business/onboarding/page.tsx` — current PagePhase state machine, StepPaikkaPrePhase, PrePhase [VERIFIED: direct read]
- `app/business/WizardInner.tsx` — OnboardingMode steps 1-5, step clamping, saveAndAdvance, completedSteps, step-5 effect [VERIFIED: direct read]
- `app/business/onboarding/StepPaikka.tsx` — simple component, no side effects [VERIFIED: direct read]
- `app/business/onboarding/StepEsikatselu.tsx` — handleSubmit logic to transplant [VERIFIED: direct read]
- `app/business/onboarding/StepYhteystiedot.tsx` — website field location, editMode branching [VERIFIED: direct read]
- `app/business/onboarding/ProgressBar.tsx` — stepLabels array, `t('stepPreview')` [VERIFIED: direct read]
- `app/components/ClaimSearchForm.tsx` — SijaintiPicker usage, validation to remove [VERIFIED: direct read]
- `app/api/business/create-paikka/route.ts` — current mandatory field validation [VERIFIED: direct read]
- `app/api/business/update-paikka/route.ts` — existing sections, missing 'sijainti' [VERIFIED: direct read]
- `app/api/business/analyze-website/route.ts` — actual API route name (not 'ai-analyze') [VERIFIED: direct read]
- `app/api/business/onboarding/save-step/route.ts` — step range 0-5, ALLOWED_FIELDS [VERIFIED: direct read]
- `app/api/business/onboarding/submit/route.ts` — reads `draft.yhteystiedot?.website` for varauslinkki [VERIFIED: direct read]
- `app/components/SijaintiPicker.tsx` — props interface `onChange: { lat, lng, address, city }` [VERIFIED: direct read]
- `lib/onboardingUtils.ts` — `PaikkaBase` type, `OnboardingDraft` type [VERIFIED: direct read]
- `lib/types.ts` — `latitude: number | null` in `Liikuntapaikka` [VERIFIED: direct read]
- `messages/fi.json` — Business namespace i18n keys [VERIFIED: direct read]
- `.planning/phases/61-onboarding-vaiheiden-uudelleenj-rjestys/61-UI-SPEC.md` — approved design contract [VERIFIED: direct read]

### Tertiary (LOW confidence)

- DB column nullability inferred from TypeScript type — not verified via live DB query [ASSUMED]

---

## Metadata

**Confidence breakdown:**
- File inventory and change scope: HIGH — all files read directly
- API route contracts: HIGH — source code read
- DB schema nullability: MEDIUM — inferred from TypeScript type, not live query
- i18n key completeness: HIGH — fi.json read in full

**Research date:** 2026-06-26
**Valid until:** 2026-07-26 (stable codebase; no external dependencies to go stale)
