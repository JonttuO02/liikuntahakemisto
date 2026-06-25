---
phase: 61
slug: onboarding-vaiheiden-uudelleenjarjestys
status: draft
shadcn_initialized: false
preset: none
created: 2026-06-26
---

# Phase 61 — UI Design Contract

> Visual and interaction contract for the onboarding step reorder: name+URL first, sijainti second, AI results third (conditional), no separate preview step.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (custom glassmorphism) |
| Preset | not applicable |
| Component library | none |
| Icon library | lucide-react |
| Font | Inter (next/font/google, var --font-sans) |

---

## Spacing Scale

Declared values (must be multiples of 4):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon gaps, inline padding |
| sm | 8px | Compact element spacing |
| md | 16px | Default element spacing |
| lg | 24px | Section padding (card interior p-6) |
| xl | 32px | Layout gaps |
| 2xl | 48px | Major section breaks |
| 3xl | 64px | Page-level spacing |

Exceptions: card header/footer divider uses `pt-4 border-t border-[rgba(0,0,0,0.07)] mt-6` — existing pattern, keep.

---

## Typography

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Card heading | 20px (`text-xl`) | 700 | 1.4 |
| Label/input/CTA | 14px (`text-sm`) | 700 (bold) or 400 | 1.4 |
| Micro / caps label | 10px (`text-[10px]`) | 700 | 1 |
| Hint / muted text | 14px (`text-sm`) | 400 | 1.5 |

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#ffffff` | Page background, card backgrounds |
| Secondary (30%) | `rgba(255,255,255,0.60–0.95)` | `.glass` card surfaces |
| Foreground primary | `#111111` | Headings, active buttons, CTA labels |
| Foreground muted | `rgba(17,17,17,0.45)` | Hint text, addresses, muted labels |
| Foreground disabled | `rgba(17,17,17,0.35)` | Pending step numbers, disabled fields |
| Accent (10%) | `#111111` | Active progress step circle, submit CTA |
| Border default | `rgba(0,0,0,0.07)` | Card separators |
| Border interactive | `rgba(0,0,0,0.12)` | Input fields, outlined buttons |
| Destructive | `#dc2626` | Error messages only |

Accent reserved for: active progress step circle, "Seuraava"/"Lähetä" CTA button background.

---

## Flow Architecture

### Before Phase 61 (current)

```
ClaimSearchForm → create-paikka (name + sijainti) → /business/onboarding
  → page.tsx pre-phases:
      [paikka] StepPaikka: venue name display + next
      [analyze] AnalysoiSivusto: website URL → AI scrape
      [laji-skip] LajiPicker: manual sport category
  → WizardInner steps 1–5:
      1. StepMediat
      2. StepHinnasto
      3. StepAukioloajat
      4. StepYhteystiedot (has website field)
      5. StepEsikatselu (preview + submit)
```

ProgressBar: MEDIAT | HINNASTO | AUKIOLOAJAT | YHTEYSTIEDOT | ESIKATSELU

### After Phase 61 (target)

```
ClaimSearchForm (simplified: name only, no SijaintiPicker) → create-paikka (name only, lat/lng nullable)
  → /business/onboarding
      → page.tsx pre-phases:
          [nimi-url] StepNimiJaURL: venue name (read-only) + website URL input → triggers AI in background
          [sijainti] StepSijainti: SijaintiPicker map + autocomplete → saves lat/lng to paikka
          [analyze] AnalysoiSivusto: AI results review (ONLY if website given)
          [laji-skip] LajiPicker: manual sport category (ONLY if no website / AI skipped)
      → WizardInner steps 1–4:
          1. StepMediat
          2. StepHinnasto
          3. StepAukioloajat
          4. StepYhteystiedot (website field REMOVED; submit button replaces "next")
```

ProgressBar: MEDIAT | HINNASTO | AUKIOLOAJAT | YHTEYSTIEDOT | SUBMIT

---

## Component Contracts

### 1. StepNimiJaURL (new component — replaces StepPaikka)

**File:** `app/business/onboarding/StepNimiJaURL.tsx`

**Purpose:** Replaces the old `StepPaikka` (name-only display + next). Now shows venue name read-only AND collects website URL. Website entry triggers AI analysis in background immediately on blur/change.

**Layout:**
```
.glass rounded-2xl p-6 w-full max-w-xl mx-auto
└── flex flex-col gap-6
    ├── h2.text-xl.font-bold.text-[#111111] — "Paikkasi tiedot"
    ├── Venue name block (read-only)
    │   ├── caps label: "VALITTU PAIKKA"
    │   └── span.text-sm.font-bold.text-[#111111] — paikkaInfo.nimi
    ├── Website URL input
    │   ├── caps label: "VERKKO-OSOITE (VALINNAINEN)"
    │   ├── input[type="url"] — placeholder "https://..."
    │   └── hint: "text-sm text-[rgba(17,17,17,0.45)]" — "Verkko-osoitteen avulla täytämme tiedot automaattisesti"
    └── footer (border-t)
        ├── [no back button — first pre-phase]
        └── CTA: "Seuraava" — always enabled (website is optional)
```

**Primary focal point:** The website URL input is the key new data collection element in this card. It should be visually prominent — label in caps, full-width input with interactive border, hint text beneath. The venue name block is secondary (read-only, muted caps label + bold name). The eye should land on the URL input first after reading the heading.

**Behavior:**
- Website URL is OPTIONAL — "Seuraava" is never disabled
- On "Seuraava" click: if website is non-empty, calls `/api/business/ai-analyze` (fire-and-forget, non-blocking background fetch) AND stores url in parent state; navigates to sijainti step
- If website empty: skip AI entirely, navigate directly to sijainti step
- Loading spinner on AI fire-and-forget is NOT shown in this card — AI runs silently in background
- `disabled` state only when parent is resolving paikkaId (shows spinner inside card)

**Props:**
```ts
interface StepNimiJaURLProps {
  paikkaInfo: { nimi: string } | null
  paikkaId: number | null
  onNext: (websiteUrl: string | null) => void
}
```

---

### 2. StepSijainti (new component)

**File:** `app/business/onboarding/StepSijainti.tsx`

**Purpose:** Collects venue location (lat/lng + address) as wizard step 2. Reuses existing `SijaintiPicker` component verbatim. Saves location to paikka via `/api/business/save-sijainti` or `update-paikka` route before advancing.

**Layout:**
```
.glass rounded-2xl p-6 w-full max-w-xl mx-auto
└── flex flex-col gap-6
    ├── h2.text-xl.font-bold.text-[#111111] — "Missä paikka sijaitsee?"
    ├── SijaintiPicker (existing component, no changes)
    │   ├── 320px map (rounded-2xl, border-[rgba(0,0,0,0.07)])
    │   ├── PlaceAutocompleteInput
    │   └── address + city text inputs
    ├── error: text-sm text-red-600 (if lat/lng still null on Next)
    └── footer (border-t)
        ├── back button: "← Edellinen" — returns to [nimi-url] phase
        └── CTA: "Seuraava" — disabled until lat !== null
```

**Behavior:**
- CTA disabled until a pin has been placed on the map (lat/lng not null)
- On "Seuraava": calls `/api/business/update-paikka` (section: 'sijainti', data: { osoite, kaupunki, latitude, longitude })
- Shows inline loading spinner in CTA while saving
- Error: "Aseta paikan sijainti kartalle ennen tallentamista." (existing `sijaintiPakollinen` i18n key)

**Props:**
```ts
interface StepSijaintiProps {
  paikkaId: number
  onNext: () => void
  onPrev: () => void
}
```

---

### 3. ProgressBar (modified)

**File:** `app/business/onboarding/ProgressBar.tsx`

**Change:** Replace step 5 label from `t('stepPreview')` ("Esikatselu") to `t('stepSubmit')` ("Lähetys").

The SUBMIT step in the progress bar becomes "completed" when the user submits from StepYhteystiedot (step 4 triggers `saveAndAdvance(4)` which sets current_step = 5, marking step 4 complete and reaching the SUBMIT milestone).

**New step labels:**
```ts
const stepLabels = [
  t('stepMedia'),       // Mediat
  t('stepPricing'),     // Hinnasto
  t('stepHours'),       // Aukioloajat
  t('stepContact'),     // Yhteystiedot
  t('stepSubmit'),      // Lähetys  ← was stepPreview / Esikatselu
]
```

**i18n key to add:**
- `fi.json`: `"stepSubmit": "Lähetys"`
- `en.json`: `"stepSubmit": "Submit"`

---

### 4. StepYhteystiedot (modified)

**File:** `app/business/onboarding/StepYhteystiedot.tsx`

**Changes:**
1. Remove website URL input (`<input type="url">`) entirely
2. Remove `website` state variable and `initialBrandingWebsite` prop (no longer needed here)
3. Onboarding mode: after saving yhteystiedot, call `/api/business/onboarding/submit` inline (not as a separate step) — this replaces StepEsikatselu's submit logic
4. Submit CTA copy: "Lähetä hyväksyttäväksi" (existing `t('submitCta')`)
5. Loading state: existing `t('submitting')` spinner

**Modified handleNext():**
- In onboarding mode: after save-step succeeds, immediately calls `/api/business/onboarding/submit` then redirects to `/business`
- In edit mode: behavior unchanged (no submit, just save + advance to next tab)

**Layout change (onboarding mode only):**
- Footer CTA changes from "Seuraava" (advance to step 5) to "Lähetä hyväksyttäväksi" (submit)
- Remove `onNext` prop usage in onboarding path; instead call submit inline

**Updated props (onboarding mode):**
```ts
// website field removed:
initialYhteystiedot?: {
  puhelin?: string
  email?: string
  // website REMOVED
  kuvaus?: string
} | null
// initialBrandingWebsite REMOVED from onboarding path
```

**Data saved to save-step:**
```ts
{
  paikka_id: paikkaId,
  step: 4,
  field: 'yhteystiedot',
  value: {
    puhelin: puhelin.trim(),
    email: email.trim(),
    // website REMOVED
    kuvaus: kuvaus.trim(),
  }
}
```

---

### 5. StepEsikatselu (deleted)

**File:** `app/business/onboarding/StepEsikatselu.tsx`

**Action:** Delete the file entirely. Submission moves to `StepYhteystiedot`. The live preview (CalloutCard + DiagonaalKortti + PaikkaSheet) is always visible via `LivePreviewPane` on desktop and `LivePreviewToggle` on mobile — no dedicated preview step needed.

Import in `WizardInner.tsx` must be removed.

---

### 6. WizardInner (modified)

**File:** `app/business/WizardInner.tsx`

**Changes in OnboardingMode:**
1. Remove `StepEsikatselu` import and step 5 render
2. Clamp step range from `1–5` to `1–4` in `goToStep()` and URL validation (`rawStep > 4`)
3. Update `completedSteps` clamp from `Math.min(draft.current_step, 5)` to `Math.min(draft.current_step, 4)`
4. Remove the `step === 5` draft re-fetch effect
5. Step 4 (StepYhteystiedot) no longer calls `saveAndAdvance(4)` — instead it calls submit inline
6. Remove `initialBrandingWebsite` prop from StepYhteystiedot call

**Edit mode:** Unchanged — edit mode has 5 tabs, and StepYhteystiedot in edit mode still has the website field (edit mode is NOT affected by ONBOARD-23).

Wait — edit mode uses WizardInner's EditMode which renders StepYhteystiedot in tabs. The website field removal (ONBOARD-23) only applies to the ONBOARDING flow. In edit mode, the website is still editable (it's `varauslinkki` in the venue record). StepYhteystiedot needs to conditionally show website based on `editMode` prop — or we keep it only visible when `editMode={true}`.

**StepYhteystiedot props clarification:**
- `editMode={false}` (onboarding): NO website field shown
- `editMode={true}` (edit): website field shown (unchanged behavior)

---

### 7. page.tsx (modified)

**File:** `app/business/onboarding/page.tsx`

**pagePhase state machine changes:**
```ts
type PagePhase = 'nimi-url' | 'sijainti' | 'analyze' | 'laji-skip' | 'wizard'
// 'paikka' phase removed; new 'nimi-url' and 'sijainti' phases added
```

**New state:**
```ts
const [websiteUrl, setWebsiteUrl] = useState<string | null>(null)
const [aiTriggered, setAiTriggered] = useState(false)
```

**Phase transitions:**
- Initial: `pagePhase = 'nimi-url'` (paikkaId resolved via URL param / business_paikka_links)
- `nimi-url → sijainti`: after user confirms name/URL step
- `sijainti → analyze`: if `websiteUrl` is non-null AND AI has been triggered
- `sijainti → laji-skip`: if `websiteUrl` is null (no AI to show)
- `sijainti → wizard`: (fallback — if AI was triggered but user wants to skip waiting)
- `analyze → wizard`: after AI results confirmed
- `laji-skip → wizard`: after sport category picked

**Render structure:**
```tsx
{pagePhase === 'nimi-url' && (
  <Suspense fallback={<PreVaiheSpinner />}>
    <StepNimiJaURLPrePhase
      onNext={(url) => { setWebsiteUrl(url); setPagePhase('sijainti') }}
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
{pagePhase === 'analyze' && (
  <Suspense fallback={<PreVaiheSpinner />}>
    <PrePhase ... />
  </Suspense>
)}
{pagePhase === 'laji-skip' && <LajiPicker ... />}
{pagePhase === 'wizard' && <WizardInner ... />}
```

---

### 8. ClaimSearchForm (modified)

**File:** `app/components/ClaimSearchForm.tsx`

**Changes:**
1. Remove `SijaintiPicker` import and render
2. Remove `createLat`, `createLng`, `createKaupunki` state variables
3. Remove `createOsoite` state variable (address collected in StepSijainti now)
4. Update `handleCreate` — remove sijainti validation (`if (createLat === null)...`)
5. Update API call body — send only `{ yritysNimi, toimipisteNimi }` (no osoite/kaupunki/latitude/longitude)

**Form layout after change:**
```
form.flex.flex-col.gap-3
├── input[yritysNimi] — "Yrityksen nimi"
├── input[toimipisteNimi] — "Toimipisteen nimi (valinnainen)"
├── p.text-sm.muted — toimipisteNimiHelper hint
├── error block (AnimatePresence)
└── button "Luo paikka" — enabled when yritysNimi non-empty
```

---

### 9. create-paikka API (modified)

**File:** `app/api/business/create-paikka/route.ts`

**Change:** Accept request body without sijainti fields. `osoite`, `kaupunki`, `latitude`, `longitude` become optional. The DB insert uses `null` for these when not provided.

---

### 10. update-paikka API (modified or extended)

**File:** `app/api/business/update-paikka/route.ts`

**Change:** Add `'sijainti'` as a valid section in the switch/if-else. When `section === 'sijainti'`, update `liikuntapaikat` with `{ osoite, kaupunki, latitude, longitude }` using the service role client.

---

## Interaction Details

### Website URL → AI Background Trigger

In `StepNimiJaURL`, when user clicks "Seuraava" with a non-empty URL:
1. Parent (`page.tsx`) stores url in `websiteUrl` state
2. Parent fires background fetch to `/api/business/ai-analyze?paikka_id=...` (fire-and-forget, no `await`)
3. Sets `aiTriggered = true` in parent state
4. Navigates to `sijainti` phase immediately

The AI analysis runs in parallel while the user fills in sijainti. By the time they advance from sijainti to analyze, the result is likely ready (or AnalysoiSivusto shows its own loading state, which already handles this).

### Sijainti Save

`StepSijainti` `handleNext()`:
```ts
await fetch('/api/business/update-paikka', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
  body: JSON.stringify({
    paikka_id: paikkaId,
    section: 'sijainti',
    data: { osoite, kaupunki, latitude, longitude }
  })
})
```

### Submit on StepYhteystiedot (onboarding mode)

After save-step for yhteystiedot succeeds:
```ts
const submitRes = await fetch('/api/business/onboarding/submit', {
  method: 'POST',
  headers: { ... },
  body: JSON.stringify({ paikka_id: paikkaId })
})
if (submitRes.ok) { router.push('/business') }
```

Error handling: if save-step fails, show error before attempting submit. If save-step succeeds but submit fails, show `t('errorSubmitFailed')`.

---

## Copywriting Contract

| Element | Finnish copy |
|---------|-------------|
| StepNimiJaURL heading | "Paikkasi tiedot" |
| Website caps label | "VERKKO-OSOITE (VALINNAINEN)" |
| Website hint | "Verkko-osoitteen avulla täytämme tiedot automaattisesti" |
| Website input placeholder | "https://..." |
| StepSijainti heading | "Missä paikka sijaitsee?" |
| ProgressBar step 5 | "Lähetys" (fi) / "Submit" (en) |
| Sijainti CTA disabled error | existing `sijaintiPakollinen` key |
| StepYhteystiedot submit CTA | existing `submitCta` ("Lähetä hyväksyttäväksi") |
| StepYhteystiedot submitting | existing `submitting` ("Lähetetään...") |

---

## i18n Changes

**New keys to add to `messages/fi.json` and `messages/en.json` (Business namespace):**

| Key | Finnish | English |
|-----|---------|---------|
| `stepSubmit` | `"Lähetys"` | `"Submit"` |
| `stepNimiJaURLHeading` | `"Paikkasi tiedot"` | `"Your venue details"` |
| `stepNimiJaURLWebsiteLabel` | `"VERKKO-OSOITE (VALINNAINEN)"` | `"WEBSITE (OPTIONAL)"` |
| `stepNimiJaURLWebsiteHint` | `"Verkko-osoitteen avulla täytämme tiedot automaattisesti"` | `"We'll use your website to prefill venue details"` |
| `stepNimiJaURLWebsitePlaceholder` | `"https://..."` | `"https://..."` |
| `stepSijaintiHeading` | `"Missä paikka sijaitsee?"` | `"Where is your venue?"` |

**Keys to remove/deprecate:** `stepPreview` (`"Esikatselu"`) — replaced by `stepSubmit` in ProgressBar. Note: `stepPreview` may still be used elsewhere (edit mode tab labels) — keep it, just stop using it in ProgressBar for onboarding.

Wait — check `editStep` labels in WizardInner EditMode: they use `editStep2Label` etc., not `stepPreview`. So `stepPreview` is only used in ProgressBar. After Phase 61, `stepPreview` is unused; leave in i18n for now (cleanup in later phase).

---

## Animation

No new animation patterns. All new cards follow existing wizard card patterns:
- Wrap each new card in `<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>` inside `<AnimatePresence mode="wait">` when switching pagePhases
- `whileTap={{ scale: 0.95 }}` on CTA buttons (existing pattern)
- CTA loading: inline spinner `<span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block" />` (existing pattern)

---

## Live Preview Integration

`StepSijainti` does NOT need live preview integration — location is not currently displayed in CalloutCard/DiagonaalKortti. No `LivePreviewContext` dispatch needed.

`StepNimiJaURL` does NOT dispatch to live preview — venue name was already set at create-paikka time and is already in `paikkaInfo`.

`StepYhteystiedot` retains its existing `SET_YHTEYSTIEDOT` dispatch (minus the website field).

---

## Resumption / Deep-Link Behavior

Resume from `/business/onboarding?paikka_id=X` (existing draft, all pre-phases done):
- Always enters `pagePhase = 'nimi-url'` first, then user can advance
- OR: detect that sijainti is already saved (`latitude !== null` from paikkaInfo) and skip sijainti phase automatically — show it as pre-filled but jump to 'analyze' or 'wizard' directly

Recommended: skip pre-phases when already complete. In `StepNimiJaURLPrePhase`, after resolving paikkaInfo, if `paikkaInfo.latitude !== null`, call `onNext(null)` immediately to fast-forward to wizard (matching the existing resume logic that jumped into WizardInner based on `draft.current_step`).

For `current_step >= 1` in draft: still enter wizard via existing resume logic in `OnboardingMode` (unchanged).

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| lucide-react | `Check`, `Locate` (existing) | not required |

No new third-party component libraries introduced. `SijaintiPicker` is an existing project component — reused as-is.

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: FLAG → fixed (focal point declared)
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-06-26
