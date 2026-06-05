# Phase 34: Onboarding-velhou - Research

**Researched:** 2026-06-06
**Domain:** Next.js 14 multi-step wizard, Supabase Storage upload, draft persistence, glassmorphism UI
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Wizard trigger & routing**
- D-01: Claim-paikka- ja create-paikka-submit ohjaa suoraan `/business/onboarding` — ei jäädä pending-placeholderiin. Phase 33:n placeholder korvautuu tällä redirectillä.
- D-02: Vaiheet seurataan URL query paramilla: `/business/onboarding?step=N` (1–6). Komponentti lukee `useSearchParams()`.
- D-03: `onboarding_completed` boolean lisätään `business_accounts`-tauluun. Asetetaan `true` kun Step 6 submitataan. `/business`-sivu tarkistaa tämän ja ohjaa joko velhoon tai hallintapaneeliin.
- D-04: Aiemmin täytetyt vaiheet ovat uudelleen avattavissa (edistymispalkki näyttää valmiit vaiheet klikattavina). Validointi vain eteenpäin liikuttaessa.

**Data persistence — onboarding_draft**
- D-05: Wizard-data tallennetaan askel kerrallaan erilliseen `onboarding_draft`-tauluun (ei suoraan `liikuntapaikat`). Isolaatio: live-data pysyy koskemattomana kunnes submit on valmis.
- D-06: Step 6 -submitin Route Handler kopioi draft-kentät atomisesti `liikuntapaikat`-riville ja asettaa `onboarding_completed = true`. Draft-rivi poistetaan onnistuneen kopioinnin jälkeen.
- D-07: Wizard lataa olemassa olevan `onboarding_draft`-rivin mountissa — palaa viimeisimpään kesken jääneeseen vaiheeseen jos draft on olemassa. Edistymispalkki renderöityy datan mukaan.

**Media upload (Step 2)**
- D-08: Kaksi erillistä upload-aluetta: logo (1 tiedosto, neliöesikatselu) + kuvat (1–5 tiedostoa, vaakasuuntainen thumbnail-rivi). Visuaalisesti selkeästi erotettu.
- D-09: Drag-and-drop -vyöhyke + click-fallback molemmissa alueissa. Dotted border drop zone.
- D-10: Upload tapahtuu "Seuraava"-klikkauksen yhteydessä (ei heti valinnassa). Edistymispalkki näkyy uploadauksen ajan.
- D-11: Tiedostot tallennetaan `business-media`-buckettiin. Polkurakenne: `{business_account_id}/{paikka_id}/photos/` ja `{business_account_id}/{paikka_id}/logo/`. Tallennetut URL:t kirjoitetaan `onboarding_draft`-kenttiin.

**Pricing input (Step 3 — Hinnasto)**
- D-12: Kiinteät kategoriarivit ensin: Kertakäynti / Kuukausijäsenyys / 10-kerran kortti / Vuosijäsenyys. Jokainen rivi: kategorialabel + hintakenttä (€) + valinnainen lisätieto. Tyhjät rivit ohitetaan tallennuksessa.
- D-13: "+ Lisää hintarivi" -nappi lisää vapaaehtoisen vapaamuotoisen rivin. Ainakin yksi rivi täytettynä ennen kuin voi jatkaa.
- D-14: Hinnasto tallennetaan `onboarding_draft`-tauluun JSONB-kenttänä. Mergetään `liikuntapaikat.hinnasto`-kenttään Step 6 -submitissa.

**Opening hours input (Step 4 — Aukioloajat)**
- D-15: 7 riviä (Ma–Su). Jokainen rivi: päivän nimi + "Auki"-toggle + aloitusaika-input + lopetusaika-input. Jos Google Places -data on saatavilla, esitäytetään.
- D-16: Aukioloajat tallennetaan `onboarding_draft`-tauluun JSONB-kenttänä.

**Preview step (Step 6)**
- D-17: Esikatselu käyttää `onboarding_draft`-datan live-renderöintiä — näyttää PaikkaKortin, DiagonaalKortin ja PaikkaSheetin yrityksen tiedoilla.
- D-18: "Lähetä hyväksyttäväksi" käynnistää Route Handlerilla: (1) kopioi draft → liikuntapaikat atomisesti, (2) asettaa `onboarding_completed = true`, (3) poistaa draft-rivin, (4) redirectaa `/business`.

### Claude's Discretion

None specified — all implementation areas have locked decisions.

### Deferred Ideas (OUT OF SCOPE)

- Laji-valinta Step 1:ssä — researcher selvittää onko `laji`-kenttä jo olemassa Phase 33:n create-paikka-datan perusteella
- Kuvien järjestyksen muokkaus drag-and-drop:lla Step 2:ssa — yksinkertainen järjestys (latausjärjestys) riittää Phase 34:ssa
- Sähköpostivahvistus submit-hetkellä yritykselle — Phase 35 hoitaa tämän
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ONBOARD-01 | Ensimmäisellä kirjautumisella käynnistyy automaattisesti vaiheistettu onboarding-velhoui — ei voi ohittaa ennen kuin kaikki pakolliset vaiheet on täytetty | `onboarding_completed` boolean + `/business` redirect logic |
| ONBOARD-02 | Vaihe 1 — Paikka: hae olemassa oleva tai luo uusi; paikan nimi ja osoite esitäytetty haun perusteella | `business_paikka_links` join → `liikuntapaikat` fetch; Step 1 is read-only display |
| ONBOARD-03 | Vaihe 2 — Mediat: ladataan 1–5 kuvaa ja logo Supabase Storageen (`business-media`-bucket); edistymispalkki latauksen ajan | Supabase `storage.from('business-media').upload()` with anon client + RLS |
| ONBOARD-04 | Vaihe 3 — Hinnasto: hinnat kategorioittain; vähintään yksi hintarivi pakollinen | JSONB field in `onboarding_draft`, client-side validation before save |
| ONBOARD-05 | Vaihe 4 — Aukioloajat: Google Places -data esitäytettynä (jos saatavilla), yritys voi muokata tai syöttää manuaalisesti | `liikuntapaikat.aukioloajat` JSONB read; `type="time"` inputs |
| ONBOARD-06 | Vaihe 5 — Yhteystiedot: puhelin, sähköposti, website, lyhyt kuvaus palvelusta (max 300 merkkiä) | Simple text fields; `maxLength` attribute for description |
| ONBOARD-07 | Vaihe 6 — Esikatselu: näyttää miltä paikka näyttää sovelluksessa (PaikkaKortti, DiagonaalKortti, PaikkaSheet) | Construct `Liikuntapaikka`-shaped object from draft data; pass to existing components |
</phase_requirements>

---

## Summary

Phase 34 builds a 6-step onboarding wizard at `/business/onboarding`. The wizard is the mandatory gate between a new business account completing Phase 33 (claim/create venue) and accessing the Phase 36 management panel. All wizard data accumulates in a new `onboarding_draft` table, isolated from live `liikuntapaikat` data until Step 6 atomic commit.

The codebase investigation reveals that **no new npm packages are needed** — lucide-react, framer-motion, next-intl, and @supabase/supabase-js are already installed and cover every requirement. The `Liikuntapaikka` type already has `aukioloajat`, `hinta_kuvaus`, `kuvaus`, `puhelin`, and `image_url` fields that the preview components consume. The `aukioloajat` shape (`Record<string, {open: string; close: string}>`) is already understood by `getOpenStatus()` and `formatGroupedHours()` in `lib/aukiolo.ts`.

The two most important technical findings for the planner are: (1) `useSearchParams()` in a Client Component requires a `<Suspense>` boundary in the parent — the wizard page itself must be wrapped in Suspense in `app/business/onboarding/page.tsx`, following the pattern already used in `app/page.tsx`; and (2) Supabase Storage upload from the browser uses the anon client (the existing RLS policy on `business-media` allows the authenticated business user to write to their own path), NOT the admin client — admin client is server-only and cannot be used in client components.

**Primary recommendation:** Build the wizard as a single Client Component page that manages step state from `useSearchParams()`, loads draft on mount, saves each step to `onboarding_draft` via Route Handlers (JWT-authenticated), and delegates the Step 6 atomic commit to a dedicated `/api/business/onboarding/submit` Route Handler. Keep component files small and flat inside `app/business/onboarding/`.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Wizard step routing (URL `?step=N`) | Browser / Client | — | `useSearchParams()` + `router.push()` — URL state, no server involvement |
| Draft load on mount | Browser / Client | API / Backend | Client fetches its own draft via anon Supabase client (RLS allows self-read) |
| Per-step draft save | API / Backend | — | Route Handler with JWT verification; supabaseAdmin UPSERT to bypass RLS |
| File upload to Storage | Browser / Client | — | Supabase anon client with Storage RLS; upload progress tracked in client state |
| Opening hours Google Places pre-fill | API / Backend | — | Read `liikuntapaikat.aukioloajat` (already stored as JSONB from Google sync) |
| Step 6 atomic commit | API / Backend | — | supabaseAdmin: copy draft → liikuntapaikat, set onboarding_completed, delete draft |
| `/business` onboarding gate check | Browser / Client | — | Client reads `business_accounts.onboarding_completed`; router.push to /business/onboarding if false |
| Preview card rendering | Browser / Client | — | Existing PaikkaKortti/DiagonaalKortti/PaikkaSheet accept `Liikuntapaikka` prop directly |

---

## Standard Stack

### Core (all already installed)

| Library | Version in package.json | Purpose | Why Standard |
|---------|------------------------|---------|--------------|
| `@supabase/supabase-js` | ^2.105.4 | DB queries + Storage upload | Project standard; anon client for client-side Storage upload |
| `framer-motion` | ^12.38.0 | Step crossfade, error fade, thumbnail fade | Already used for all animations in this codebase |
| `next-intl` | ^4.13.0 | All wizard text strings via `useTranslations('Business')` | Project i18n standard |
| `lucide-react` | ^1.16.0 | Upload icon, check icons in progress bar | Already used in PaikkaSheet, DiagonaalKortti |
| `next` (useSearchParams, useRouter) | 14.2.35 | URL step state; navigation | Built-in; already used in Etusivu.tsx |

[VERIFIED: codebase] — all packages confirmed present in `package.json`.

### No New Packages Required

The UI-SPEC explicitly states: "No new dependencies are introduced in Phase 34 beyond what already exists in the project." [VERIFIED: codebase — 34-UI-SPEC.md Registry Safety section]

---

## Package Legitimacy Audit

No new packages are introduced in Phase 34. All dependencies are existing project dependencies already on disk.

| Package | Registry | Status | Disposition |
|---------|----------|--------|-------------|
| All existing deps | npm | Already installed | Approved — no audit needed |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
User Browser
    │
    ├─► GET /business/onboarding?step=N
    │       └─► OnboardingWizard (Client Component)
    │               ├─ mount: fetch onboarding_draft (anon client, RLS SELECT)
    │               ├─ step=1: display paikka info (read-only, from draft.paikka_id)
    │               ├─ step=2: UploadDropZone → collect files → on "Seuraava":
    │               │           anon client Storage.upload() → URLs → POST /api/business/onboarding/save-step
    │               ├─ step=3–5: form inputs → on "Seuraava":
    │               │           POST /api/business/onboarding/save-step (JWT + supabaseAdmin UPSERT)
    │               └─ step=6: StepEsikatselu renders PaikkaKortti/DiagonaalKortti/PaikkaSheet
    │                           "Lähetä" → POST /api/business/onboarding/submit
    │
    └─► GET /business
            └─► BusinessPage (Client Component)
                    ├─ fetch business_accounts (anon, RLS)
                    ├─ if onboarding_completed = false → router.push('/business/onboarding')
                    └─ if onboarding_completed = true → show management panel (Phase 36)

Supabase
    ├─ DB: onboarding_draft (new table, Phase 34 migration)
    ├─ DB: business_accounts.onboarding_completed (new column, Phase 34 migration)
    ├─ DB: liikuntapaikat (updated atomically on submit)
    └─ Storage: business-media/{business_account_id}/{paikka_id}/
```

### Recommended Project Structure

```
app/business/onboarding/
├── page.tsx              # OnboardingWizard — 'use client'; Suspense wrapper + useSearchParams
├── ProgressBar.tsx       # 6-step indicator circles, completed/active/future states
├── StepPaikka.tsx        # Step 1: read-only paikka display
├── StepMediat.tsx        # Step 2: logo + images upload zones
├── StepHinnasto.tsx      # Step 3: pricing table with fixed + dynamic rows
├── StepAukioloajat.tsx   # Step 4: 7-row hours editor with Auki toggles
├── StepYhteystiedot.tsx  # Step 5: contact fields + description textarea
├── StepEsikatselu.tsx    # Step 6: preview cards + submit button
├── UploadDropZone.tsx    # Shared drag-and-drop component (logo + images)
└── UploadProgressBar.tsx # Upload progress indicator (0–100%)

app/api/business/onboarding/
├── save-step/route.ts    # POST: JWT-verified UPSERT into onboarding_draft
└── submit/route.ts       # POST: atomic copy draft → liikuntapaikat + cleanup

supabase/migrations/
└── 20260606000000_onboarding.sql  # onboarding_draft table + onboarding_completed column + RLS
```

### Pattern 1: Step URL Routing with useSearchParams + Suspense

**What:** The wizard page reads `?step=N` from the URL. Navigation calls `router.replace()` to change step without adding history entries (or `router.push()` to enable browser back).

**When to use:** Any Client Component that reads URL search params in Next.js 14.

**Critical requirement:** `useSearchParams()` requires a `<Suspense>` boundary in the **parent** component, otherwise the page opts out of static generation and shows a build warning. The wizard page itself wraps its content in Suspense.

```tsx
// Source: app/page.tsx (existing pattern)
// app/business/onboarding/page.tsx
import { Suspense } from 'react'
import OnboardingWizardInner from './OnboardingWizardInner'

export default function OnboardingWizardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-6 h-6 rounded-full border-2 border-[rgba(17,17,17,0.12)] border-t-[#111111] animate-spin" />
    </div>}>
      <OnboardingWizardInner />
    </Suspense>
  )
}
```

```tsx
// OnboardingWizardInner.tsx — 'use client'
'use client'
import { useSearchParams, useRouter } from 'next/navigation'
const searchParams = useSearchParams()
const step = parseInt(searchParams.get('step') ?? '1', 10)
const router = useRouter()
function goToStep(n: number) {
  router.push(`/business/onboarding?step=${n}`)
}
```

[VERIFIED: codebase — app/page.tsx uses `<Suspense>` wrapping Etusivu which calls `useSearchParams()`]

### Pattern 2: JWT-Verified Route Handler (existing canonical pattern)

**What:** Every wizard write operation goes through a Route Handler. Client sends JWT in Authorization header; handler calls `supabaseAdmin.auth.getUser(token)` before any mutation.

**When to use:** All `/api/business/*` write endpoints.

```typescript
// Source: app/api/business/register/route.ts (existing)
const authHeader = request.headers.get('Authorization')
const token = authHeader?.replace('Bearer ', '') ?? ''
const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
if (authError || !user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
// Use user.id — never body.user_id
```

[VERIFIED: codebase — identical pattern in claim-paikka/route.ts, create-paikka/route.ts, register/route.ts]

### Pattern 3: Supabase Storage Upload (client-side, anon key)

**What:** Storage upload uses the anon Supabase client (not admin) from the browser. The `business-media` bucket has an RLS policy that allows the authenticated owner to write to their own path. The anon key with an active session satisfies this policy.

**When to use:** Step 2 upload from UploadDropZone — file upload must happen in the browser, not a Route Handler (binary data streaming complexity). After upload, the resulting public URL is sent to the save-step Route Handler.

```typescript
// Source: @supabase/supabase-js docs [ASSUMED — no existing Storage upload in codebase]
const supabase = createBrowserSupabase()
const { data, error } = await supabase.storage
  .from('business-media')
  .upload(
    `${businessAccountId}/${paikkaId}/photos/${filename}`,
    file,
    { contentType: file.type, upsert: true }
  )
if (error) { /* handle */ }
const { data: { publicUrl } } = supabase.storage
  .from('business-media')
  .getPublicUrl(`${businessAccountId}/${paikkaId}/photos/${filename}`)
```

**Upload progress tracking:** `@supabase/supabase-js` v2 does not expose upload progress events. Progress is simulated: set to 10% when upload starts, jump to 100% on completion. This is acceptable per D-10 (single progress bar for all uploads together).

[ASSUMED — supabase-js v2 upload progress limitation; no existing upload code in codebase to verify against]

### Pattern 4: Constructing Liikuntapaikka from Draft for Step 6 Preview

**What:** The preview components (PaikkaKortti, DiagonaalKortti, PaikkaSheet) all accept `paikka: Liikuntapaikka`. The draft data must be mapped to match this type.

**Critical fields from `lib/types.ts`:**
- `id: number` — use `paikka_id` from draft
- `nimi: string` — from `liikuntapaikat` (join in draft fetch)
- `laji: string` — from `liikuntapaikat` (join in draft fetch)
- `osoite: string | null` — from `liikuntapaikat`
- `kaupunki: string | null` — from `liikuntapaikat`
- `hinta_min: number | null`, `hinta_max: number | null` — null (pricing shown via `hinta_kuvaus`)
- `hinta_kuvaus?: string | null` — constructed from `onboarding_draft.hinnasto` JSONB
- `aukioloajat?: Record<string, { open: string; close: string }> | null` — from `onboarding_draft.aukioloajat`
- `kuvaus?: string | null` — from `onboarding_draft.yhteystiedot.kuvaus`
- `puhelin?: string | null` — from `onboarding_draft.yhteystiedot.puhelin`
- `varauslinkki?: string | null` — from `onboarding_draft.yhteystiedot.website`
- `image_url?: string | null` — first URL from `onboarding_draft.media_urls.photos[0]`
- `latitude: number | null`, `longitude: number | null` — from `liikuntapaikat` join
- `featured?: boolean | null` — false (not featured during onboarding)

**hinta_kuvaus construction from hinnasto JSONB:**

The `priceItemList()` function in `lib/priceUtils.ts` parses `hinta_kuvaus` by splitting on `\n` and `, `. The wizard's pricing data must be serialized into this format for the preview to work:

```typescript
// Convert onboarding_draft.hinnasto to hinta_kuvaus string
function hinnastaToHintaKuvaus(
  hinnasto: Array<{ kategoria: string; hinta: string; lisatieto?: string }>
): string {
  return hinnasto
    .filter(row => row.hinta.trim() !== '')
    .map(row => `${row.kategoria}: ${row.hinta}€${row.lisatieto ? ` (${row.lisatieto})` : ''}`)
    .join('\n')
}
```

[VERIFIED: codebase — `lib/types.ts`, `lib/priceUtils.ts`, `app/components/PaikkaKortti.tsx` all read]

### Pattern 5: onboarding_draft UPSERT via supabaseAdmin

**What:** Each "Seuraava" click saves the current step's data via the save-step Route Handler, which does a UPSERT keyed on `(business_account_id, paikka_id)`.

```typescript
// app/api/business/onboarding/save-step/route.ts
const { error } = await supabaseAdmin
  .from('onboarding_draft')
  .upsert(
    {
      business_account_id: user.id,
      paikka_id: body.paikka_id,
      [body.field]: body.value,  // e.g. field='hinnasto', value=JSONB
      current_step: body.step,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'business_account_id,paikka_id' }
  )
```

[ASSUMED — UPSERT conflict target syntax; standard Supabase JS v2 pattern]

### Pattern 6: Atomic Step 6 Submit

**What:** The submit Route Handler runs three operations. If any fail, the draft is NOT deleted (draft preserved for retry). `liikuntapaikat` update uses `supabaseAdmin` to bypass RLS.

```typescript
// app/api/business/onboarding/submit/route.ts
// 1. Fetch draft
const { data: draft } = await supabaseAdmin
  .from('onboarding_draft')
  .select('*, liikuntapaikat(nimi, osoite, kaupunki, laji, latitude, longitude, aukioloajat)')
  .eq('business_account_id', user.id)
  .single()

// 2. Update liikuntapaikat
const { error: updateError } = await supabaseAdmin
  .from('liikuntapaikat')
  .update({
    hinta_kuvaus: buildHintaKuvaus(draft.hinnasto),
    aukioloajat: draft.aukioloajat,
    kuvaus: draft.yhteystiedot?.kuvaus ?? null,
    puhelin: draft.yhteystiedot?.puhelin ?? null,
    varauslinkki: draft.yhteystiedot?.website ?? null,
    image_url: draft.media_urls?.photos?.[0] ?? null,
    business_managed: true,
  })
  .eq('id', draft.paikka_id)
if (updateError) return NextResponse.json({ error: 'Update failed' }, { status: 500 })

// 3. Set onboarding_completed = true
await supabaseAdmin
  .from('business_accounts')
  .update({ onboarding_completed: true })
  .eq('user_id', user.id)

// 4. Delete draft
await supabaseAdmin
  .from('onboarding_draft')
  .delete()
  .eq('business_account_id', user.id)

return NextResponse.json({ ok: true })
```

[VERIFIED: codebase — supabaseAdmin pattern from claim-paikka/route.ts and register/route.ts]

### Anti-Patterns to Avoid

- **Using supabaseAdmin in client components:** `lib/supabaseAdmin.server.ts` must NEVER be imported in `'use client'` components. Storage upload from browser must use `createBrowserSupabase()` (anon key + active session).
- **Forgetting Suspense around useSearchParams:** Without `<Suspense>`, Next.js 14 shows a build warning and the page may not work correctly in production builds.
- **Putting all 6 steps in one giant component:** Each step is its own component file. OnboardingWizard renders the active step component only. This keeps each file reviewable.
- **Saving to liikuntapaikat on each step:** Only Step 6 touches `liikuntapaikat`. Steps 1–5 only touch `onboarding_draft`. This is the isolation guarantee from D-05.
- **Deriving hinta_kuvaus format incorrectly:** `priceItemList()` splits on `\n` then `, `. The stored format must be one item per line for preview to render correctly.
- **PaikkaSheet in preview context:** PaikkaSheet normally appears as a bottom-sheet with drag-to-close, `position: fixed`, `height: calc(100dvh - 116px)`. In the Step 6 preview it should be rendered in a static container — either in a scrollable div or with overridden styles. The full sheet UI is unsuitable for inline preview; StepEsikatselu should render a simplified or mock version of the sheet content (or just PaikkaKortti + DiagonaalKortti which embed cleanly).

---

## Existing DB Schema — Verified Findings

### `business_accounts` table (from migration 20260605000000)

Current columns: `user_id UUID PK`, `company_name TEXT`, `approval_status TEXT`, `created_at TIMESTAMPTZ`

**Missing for Phase 34:** `onboarding_completed BOOLEAN NOT NULL DEFAULT false` — must be added in Phase 34 migration.

[VERIFIED: codebase — read migration file 20260605000000_business_accounts.sql]

### `liikuntapaikat` relevant columns (from migrations)

- `aukioloajat JSONB` — exists since Phase 1 migration (20260519000000). Shape: `Record<string, { open: string; close: string }>` with day keys `monday`–`sunday`. [VERIFIED: codebase — lib/aukiolo.ts uses this exact shape]
- `hinta_kuvaus TEXT` — exists since Phase 1 migration. Newline-separated price lines. [VERIFIED: codebase — lib/priceUtils.ts]
- `kuvaus TEXT` — exists (in Liikuntapaikka type, queried in app/page.tsx). [VERIFIED: codebase]
- `puhelin TEXT` — exists (in Liikuntapaikka type). [VERIFIED: codebase]
- `varauslinkki TEXT` — exists (in Liikuntapaikka type). [VERIFIED: codebase]
- `image_url TEXT` — exists (added in migration 20260530000000, used in DiagonaalKortti). [VERIFIED: codebase]
- `laji TEXT` — exists (required field in Liikuntapaikka type). [VERIFIED: codebase]
- `business_managed BOOLEAN` — exists since Phase 31 (20260605000001). [VERIFIED: codebase]
- `published BOOLEAN` — exists since Phase 33 (20260605000004). [VERIFIED: codebase]

**Missing for Phase 34:** No `hinnasto JSONB` column on `liikuntapaikat` — the wizard converts `onboarding_draft.hinnasto` to a `hinta_kuvaus` TEXT string on submit. No separate `hinnasto` column is needed.

### `onboarding_draft` table — does NOT yet exist

Must be created in Phase 34 migration. Required columns:

| Column | Type | Notes |
|--------|------|-------|
| `id` | BIGSERIAL PRIMARY KEY | Surrogate PK |
| `business_account_id` | UUID NOT NULL REFERENCES business_accounts(user_id) ON DELETE CASCADE | FK to business account |
| `paikka_id` | BIGINT NOT NULL REFERENCES liikuntapaikat(id) ON DELETE CASCADE | FK to venue |
| `media_urls` | JSONB | `{ logo: string \| null, photos: string[] }` |
| `hinnasto` | JSONB | Array of `{ kategoria: string, hinta: string, lisatieto: string }` |
| `aukioloajat` | JSONB | Same shape as `liikuntapaikat.aukioloajat` |
| `yhteystiedot` | JSONB | `{ puhelin: string, email: string, website: string, kuvaus: string }` |
| `current_step` | INT NOT NULL DEFAULT 1 | Last completed step |
| `updated_at` | TIMESTAMPTZ NOT NULL DEFAULT now() | Last save time |
| UNIQUE | (business_account_id, paikka_id) | One draft per business per venue |

RLS: Same pattern as `business_paikka_links`. SELECT/INSERT/UPDATE: `USING (auth.uid() = business_account_id)`.

[VERIFIED: codebase — confirmed by reading all existing migrations; onboarding_draft does not exist in any migration file]

### Migration naming convention

Existing pattern: `YYYYMMDDNNNNNN_description.sql` (14-digit timestamp prefix). Latest migration: `20260605000004_published_is_claimed.sql`. Phase 34 migration should be `20260606000000_onboarding.sql`.

[VERIFIED: codebase — read all 12 migration filenames]

---

## Integration Points — What Must Change

### 1. `app/business/page.tsx` — add onboarding_completed check

Current: Checks `business_paikka_links` → if has links shows pending placeholder, else shows ClaimSearchForm.

Required change (D-03): After confirming user has a business_accounts row, check `onboarding_completed`. If `false`, `router.push('/business/onboarding')`. If `true`, show management panel (Phase 36) — for now, show existing pending placeholder with updated messaging.

The current page is a Client Component using `useEffect` + `createBrowserSupabase()`. The onboarding_completed check fits the same pattern:

```typescript
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

[VERIFIED: codebase — read app/business/page.tsx]

### 2. `app/api/business/claim-paikka/route.ts` — change success response

Current: Returns `{ ok: true }` — client does `window.location.reload()`.

Required change (D-01): Route Handler currently cannot redirect (it returns JSON). The **client** (ClaimSearchForm) must change `window.location.reload()` → `router.push('/business/onboarding')`.

Similarly for `create-paikka`: `router.push('/business/onboarding')` instead of `window.location.reload()`.

[VERIFIED: codebase — read claim-paikka/route.ts and ClaimSearchForm.tsx]

### 3. `app/components/ClaimSearchForm.tsx` — redirect after claim/create

In `handleClaim()` and `handleCreate()`:
- Currently: `window.location.reload()`
- Required: `router.push('/business/onboarding')`

The `create-paikka` route already returns `{ ok: true, paikka_id: newPaikkaId }`. This `paikka_id` could be passed as a query param: `router.push('/business/onboarding?paikka_id=123')` so Step 1 can pre-load without a separate DB lookup. However, this is an optimization — the wizard can also look up `paikka_id` from `business_paikka_links` on mount. Both approaches work.

[VERIFIED: codebase — create-paikka/route.ts already returns paikka_id]

### 4. `messages/fi.json` and `messages/en.json` — Business namespace additions

Current Business namespace has 31 keys (from Phase 32–33). Phase 34 adds ~34 new keys as specified in 34-UI-SPEC.md Copywriting Contract. All go under `"Business": { ... }`.

[VERIFIED: codebase — read messages/fi.json; counted existing keys]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Opening hours display | Custom hours formatter | `getOpenStatus()` + `formatGroupedHours()` from `lib/aukiolo.ts` | Already handles all edge cases (closed days, overnight hours) |
| Price string parsing for preview | Custom parser | `priceItemList()` from `lib/priceUtils.ts` | Already handles newline + comma splitting |
| Drag-and-drop file detection | Custom drag event handler | HTML5 `dragover`/`drop` events on a `<div>` | No library needed; the codebase uses no dnd library |
| File type/size validation | Custom MIME checker | `file.type.startsWith('image/')` + `file.size <= maxBytes` | Browser `File` API is sufficient |
| Upload progress simulation | Polling-based tracker | Client state: 10% on start → 100% on complete | supabase-js v2 has no progress events; simulation is the correct approach |
| JWT extraction | Custom auth middleware | `request.headers.get('Authorization')?.replace('Bearer ', '')` | Established pattern in all 3 existing Route Handlers |
| Time input formatting | Custom time picker | `<input type="time">` | Native HTML5; already in UI-SPEC |
| Glass card styling | Inline backdrop-filter | `.glass rounded-2xl` CSS utility class | Defined in `app/globals.css`; project standard |

---

## Common Pitfalls

### Pitfall 1: PaikkaSheet not suitable for inline preview

**What goes wrong:** StepEsikatselu renders `<PaikkaSheet>` directly — but PaikkaSheet uses `position: fixed`, `height: calc(100dvh - 116px)`, and `motion.div` with `drag="y"`. It will overlay the entire screen and break the wizard layout.

**Why it happens:** PaikkaSheet was designed as an on-map bottom sheet, not as an inline component.

**How to avoid:** In StepEsikatselu, render PaikkaSheet's content sections inline (price, hours, contact) without the outer `motion.div` shell — or create a `PaikkaSheetPreview` wrapper that renders only the content inside a `.glass rounded-2xl` container. The preview just needs to convey the visual result; it doesn't need to be interactive.

**Warning signs:** If preview renders and the screen goes black or the wizard disappears, PaikkaSheet's `position: fixed` has taken over.

### Pitfall 2: supabaseAdmin imported in client component

**What goes wrong:** TypeScript won't catch this at build time. At runtime, `SUPABASE_SERVICE_ROLE_KEY` is `undefined` on the client (no `NEXT_PUBLIC_` prefix), so the admin client silently creates a broken client that returns 401 on all calls.

**Why it happens:** `lib/supabaseAdmin.server.ts` has no runtime guard — it relies on convention.

**How to avoid:** Only import `supabaseAdmin` in files under `app/api/**` and server-only lib files. In all `'use client'` components, import only from `lib/supabaseSSR` (`createBrowserSupabase`).

**Warning signs:** All API calls from the wizard return 401 or silently fail.

### Pitfall 3: Forgetting Suspense boundary for useSearchParams

**What goes wrong:** Next.js 14 requires `useSearchParams()` callers to be wrapped in `<Suspense>`. Without it, the page opts out of static generation and Next.js logs a warning; in some deployment configurations the page may fail to render.

**Why it happens:** `useSearchParams()` triggers dynamic rendering — Next.js enforces the Suspense boundary requirement.

**How to avoid:** The wizard page file (`app/business/onboarding/page.tsx`) exports a default Server Component that wraps the inner Client Component in `<Suspense>`. The inner component (e.g., `OnboardingWizardInner`) is a separate file that contains `'use client'` and `useSearchParams()`.

**Warning signs:** Build output shows "useSearchParams() should be wrapped in a suspense boundary" warning.

### Pitfall 4: Storage upload with wrong client

**What goes wrong:** If upload is attempted from a Route Handler using `supabaseAdmin`, Storage operations still work (service role bypasses RLS), but the file path ownership check is skipped — this creates a security hole where any authenticated user could overwrite another business's files if they knew the path.

**Why it happens:** supabaseAdmin bypasses all RLS including Storage policies.

**How to avoid:** Storage uploads for user-owned content must use the anon client with the user's session token. The RLS policy on `business-media` verifies ownership via `auth.uid()`.

**Warning signs:** Uploads work in tests but the security model is wrong.

### Pitfall 5: aukioloajat day key mismatch

**What goes wrong:** Step 4 collects hours using Finnish weekday labels (Ma/Ti/Ke/To/Pe/La/Su). If these are stored as-is in the JSONB, `getOpenStatus()` and `formatGroupedHours()` in `lib/aukiolo.ts` will fail to read them — they expect English keys: `monday`, `tuesday`, `wednesday`, `thursday`, `friday`, `saturday`, `sunday`.

**Why it happens:** The existing hours data from Google Places uses English day keys; the UI shows Finnish labels but the storage key must be English.

**How to avoid:** Map Finnish UI labels → English storage keys before saving. The display label and the storage key are separate concerns.

```typescript
const FI_TO_EN = { 'Ma': 'monday', 'Ti': 'tuesday', 'Ke': 'wednesday',
  'To': 'thursday', 'Pe': 'friday', 'La': 'saturday', 'Su': 'sunday' }
```

[VERIFIED: codebase — lib/aukiolo.ts uses `DAY_KEYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']` and `ORDERED_DAYS = ['monday',...,'sunday']`]

### Pitfall 6: Deferred Laji field

**What goes wrong:** The `laji` field is required by `Liikuntapaikka` type and used by `lajiKonfig[paikka.laji]` in PaikkaKortti. For venues created via Phase 33 `create-paikka`, the route handler inserts `laji: 'Muu'` as the default. For claimed venues, `laji` exists from the original data.

**How to avoid:** Step 6 preview should read `laji` from the `liikuntapaikat` row (via draft join) — not from the draft itself. No wizard step collects `laji`, which is correct per CONTEXT.md Deferred section.

[VERIFIED: codebase — create-paikka/route.ts inserts `laji: 'Muu'` explicitly]

---

## Code Examples

### Verified pattern: spinner while loading (reuse exactly)

```tsx
// Source: app/business/page.tsx (existing)
<div className="w-6 h-6 rounded-full border-2 border-[rgba(17,17,17,0.12)] border-t-[#111111] animate-spin" />
```

### Verified pattern: AnimatePresence error fade

```tsx
// Source: app/business/rekisteroidy/page.tsx (existing)
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

### Verified pattern: primary CTA button

```tsx
// Source: app/business/rekisteroidy/page.tsx
className="bg-[#111111] hover:bg-[#333333] text-white font-bold text-sm rounded-full h-10 w-full [transition:background-color_150ms_var(--ease-out)] disabled:opacity-60 disabled:pointer-events-none"
```

### Verified pattern: input field

```tsx
// Source: app/components/ClaimSearchForm.tsx (INPUT_CLASS)
className="border border-[rgba(0,0,0,0.12)] focus:border-[rgba(0,0,0,0.25)] rounded-lg h-10 px-3 text-sm outline-none [transition:border-color_150ms_var(--ease-out)]"
```

### Verified pattern: secondary / back button

```tsx
// Source: app/components/ClaimSearchForm.tsx (back button)
className="text-sm text-[rgba(17,17,17,0.45)] flex items-center gap-1 w-fit"
```

### Verified aukioloajat shape

```typescript
// Source: lib/aukiolo.ts — getOpenStatus() expects:
aukioloajat: Record<string, { open: string; close: string }>
// Keys: 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
// Values: { open: 'HH:MM', close: 'HH:MM' }
// Absent key = day is closed
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|-----------------|--------|
| `window.location.reload()` after claim/create | `router.push('/business/onboarding')` | Enables smooth wizard entry; Phase 33's ClaimSearchForm must be updated |
| No onboarding gate | `onboarding_completed` boolean + redirect | New businesses blocked from panel until wizard complete |
| Google Places data only in `liikuntapaikat` | Business-supplied data overwrites via `business_managed` flag | `business_managed=true` rows are protected from sync-script overwrite |

**Deprecated in Phase 33 (already resolved):**
- `window.location.reload()` in ClaimSearchForm — must be replaced in Phase 34 with router.push

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Supabase Storage upload progress: supabase-js v2 has no progress events; use 10%→100% simulation | Pattern 3, Pitfall region | Low — visual only; upload still completes correctly |
| A2 | UPSERT conflict target syntax `{ onConflict: 'business_account_id,paikka_id' }` works in supabase-js v2 | Pattern 5 | Medium — if syntax differs, UPSERT may fail or insert duplicates; fallback is DELETE+INSERT |
| A3 | `business-media` bucket allows anon client (with user session) to upload to own path via RLS | Pattern 3 | High — if RLS policy was configured to require service role only, client uploads fail entirely; Route Handler proxy upload would be needed |
| A4 | `router.push('/business/onboarding')` from ClaimSearchForm sufficiently handles the Phase 33→34 redirect without further changes to route handlers | Integration Points §2 | Low — both route handlers already return `{ ok: true }` which the client checks before navigating |

**A3 is the highest risk item.** If the `business-media` RLS policy was set up in Phase 31 to require service role (no client-side writes), then upload must go through a Route Handler that receives the binary file. The Phase 31 CONTEXT.md (D-12) states the policy checks `auth.uid()` ownership — this implies anon client with a valid session should work.

---

## Open Questions

1. **PaikkaSheet preview strategy**
   - What we know: PaikkaSheet uses `position: fixed` and is designed as a bottom-sheet overlay
   - What's unclear: Does the planner want a full PaikkaSheet wrapper with static positioning, or a simplified content-only preview?
   - Recommendation: Create a `PaikkaSheetPreview` wrapper in StepEsikatselu that renders the sheet content sections (`price`, `hours`, `phone`, `description`) inside a `.glass rounded-2xl` card without the motion/fixed positioning overhead

2. **paikka_id delivery to wizard on first load**
   - What we know: `create-paikka` returns `paikka_id` in the response; `claim-paikka` does not
   - What's unclear: Should the wizard receive `paikka_id` as a URL param (`/business/onboarding?paikka_id=123`) or look it up from `business_paikka_links` on mount?
   - Recommendation: Pass as URL param from ClaimSearchForm on success redirect (simpler, avoids an extra DB roundtrip); wizard falls back to `business_paikka_links` lookup if param is absent (handles direct navigation)

3. **Draft save strategy: save on "Seuraava" click vs. debounced auto-save**
   - What we know: D-07 says wizard loads existing draft on mount (resume support)
   - What's unclear: Are drafts saved only on "Seuraava" click (confirmed by D-10 for uploads), or also on field change for text fields?
   - Recommendation: Save only on "Seuraava" click for all steps. This matches D-10 and avoids excessive Route Handler calls. The draft is a checkpoint, not a real-time sync.

---

## Environment Availability

Step 2.6: SKIPPED (no new external tool dependencies identified — Supabase is already live, no new CLI tools needed).

---

## Validation Architecture

`nyquist_validation` is enabled (not explicitly false in config.json).

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest ^4.1.7 |
| Config file | Not found — Wave 0 gap |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ONBOARD-01 | `/business` redirects to `/business/onboarding` when `onboarding_completed = false` | manual-only | — (requires Supabase session) | ❌ Wave 0 |
| ONBOARD-02 | Step 1 displays paikka name/address from business_paikka_links join | manual-only | — (requires DB state) | ❌ Wave 0 |
| ONBOARD-03 | Storage upload stores file at correct path; URL saved to draft | manual-only | — (requires Storage bucket) | ❌ Wave 0 |
| ONBOARD-04 | Pricing validation: "Seuraava" disabled when no price row has value | unit | `npx vitest run --reporter=verbose tests/onboarding-pricing.test.ts` | ❌ Wave 0 |
| ONBOARD-05 | Aukioloajat pre-fill: Google Places data loaded from `liikuntapaikat.aukioloajat` | unit | `npx vitest run tests/onboarding-hours.test.ts` | ❌ Wave 0 |
| ONBOARD-06 | Yhteystiedot: description textarea enforces maxLength=300 | unit | `npx vitest run tests/onboarding-contact.test.ts` | ❌ Wave 0 |
| ONBOARD-07 | Preview: `buildDraftAsPaikka()` maps draft fields to Liikuntapaikka type correctly | unit | `npx vitest run tests/onboarding-draft-map.test.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run` (unit tests only)
- **Per wave merge:** `npx vitest run` + manual smoke test in browser
- **Phase gate:** All unit tests green + manual full wizard flow before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `vitest.config.ts` — no vitest config found; needs creation
- [ ] `tests/onboarding-pricing.test.ts` — pricing validation unit test
- [ ] `tests/onboarding-hours.test.ts` — aukioloajat pre-fill unit test (mock `liikuntapaikat` row)
- [ ] `tests/onboarding-contact.test.ts` — description maxLength unit test
- [ ] `tests/onboarding-draft-map.test.ts` — `buildDraftAsPaikka()` mapping unit test

The most valuable unit tests are ONBOARD-04 (pricing validation gating) and ONBOARD-07 (draft-to-Liikuntapaikka mapping) — these are pure functions that are easy to test without Supabase.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | JWT from Authorization header → `supabaseAdmin.auth.getUser(token)` before any mutation |
| V3 Session Management | no | Session managed by Supabase Auth; wizard does not create sessions |
| V4 Access Control | yes | RLS on `onboarding_draft` (SELECT/UPDATE own row only); supabaseAdmin for writes bypasses RLS but verifies JWT first |
| V5 Input Validation | yes | Trim + slice all text inputs in Route Handlers; file type/size validation before upload |
| V6 Cryptography | no | No new crypto; Storage uses Supabase-managed URL signing |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Attacker POSTs arbitrary `business_account_id` in body | Tampering | JWT from header → `user.id` from verified token; body `business_account_id` ignored |
| Path traversal in Storage upload path | Tampering | Path constructed server-side from verified `user.id` + `paikka_id`; never from client body |
| Oversized file bypassing client validation | Denial of Service | Server-side: check file size in Route Handler if upload goes through server; for client-side upload, rely on `file.size` check before calling Storage.upload() |
| Business writes to another business's venue via paikka_id | Elevation of Privilege | On submit Route Handler, verify `business_paikka_links` row exists for `(user.id, body.paikka_id)` before updating `liikuntapaikat` |
| XSS via stored kuvaus/company name | Tampering | React renders text content as text nodes (not innerHTML); no dangerouslySetInnerHTML in wizard |

---

## Project Constraints (from CLAUDE.md)

The following directives from `CLAUDE.md` apply to Phase 34:

1. **Tailwind v3** — `globals.css` uses `@tailwind base/components/utilities`. Do NOT add v4 imports.
2. **Glass utilities** — Always use `.glass`, `.glass-hover`, `.glass-btn` from `globals.css`. Never replicate inline.
3. **4 font sizes only** — `text-[10px]` / `text-sm` / `text-xl` / `text-3xl sm:text-4xl`. No other sizes.
4. **2 font weights only** — 400 (normal) and 700 (bold). Never use 600 (semibold).
5. **Animation durations** — Hover: 0.18s. Card enter: 0.35s. View transitions: 0.2s. No spring physics without drag.
6. **Supabase writes** — Service role key only; anon key is read-only after RLS. (Exception: Storage upload uses anon key with user session per A3 assumption.)
7. **No SSR for business auth** — `app/business/page.tsx` uses client-side auth check (useEffect + useState). Wizard page follows same pattern.
8. **i18n** — `useTranslations('Business')` for all new wizard strings.
9. **No `?nakyma=kartta` generation** — Not relevant to wizard but must not generate this param.
10. **`lucide-react` for icons** — Already used; MapPin, Bookmark, Building2, Camera, Check icons available.

---

## Sources

### Primary (HIGH confidence)

- Codebase: `app/api/business/register/route.ts`, `claim-paikka/route.ts`, `create-paikka/route.ts` — JWT pattern
- Codebase: `lib/types.ts` — Liikuntapaikka type definition
- Codebase: `lib/aukiolo.ts` — aukioloajat shape, day key format
- Codebase: `lib/priceUtils.ts` — hinta_kuvaus parsing
- Codebase: `lib/supabaseAdmin.server.ts` — server-only pattern
- Codebase: `lib/supabaseSSR.ts` — createBrowserSupabase pattern
- Codebase: `app/components/PaikkaKortti.tsx`, `DiagonaalKortti.tsx`, `PaikkaSheet.tsx` — component prop types
- Codebase: `app/components/ClaimSearchForm.tsx` — existing form patterns
- Codebase: `app/business/rekisteroidy/page.tsx` — button/input CSS classes
- Codebase: `app/globals.css` — glass utility classes
- Codebase: `app/page.tsx` — Suspense + useSearchParams pattern
- Codebase: `messages/fi.json` — existing Business namespace
- Codebase: All 12 migration files in `supabase/migrations/` — confirmed onboarding_draft does not exist
- Planning: `34-CONTEXT.md` — locked decisions
- Planning: `34-UI-SPEC.md` — visual contract and copywriting

### Secondary (MEDIUM confidence)

- Planning: `31-CONTEXT.md`, `32-CONTEXT.md`, `33-CONTEXT.md` — prior phase decisions
- Planning: `REQUIREMENTS.md` — ONBOARD-01–07 requirements
- Planning: `ROADMAP.md` — Phase 34 success criteria

### Tertiary (LOW confidence — assumed)

- A1: supabase-js v2 Storage upload progress behavior
- A2: UPSERT conflict target syntax
- A3: business-media RLS allows anon client upload

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified in package.json; no new packages
- DB schema findings: HIGH — all migration files read directly
- Architecture: HIGH — existing Route Handler pattern verified in 3 files
- Storage upload pattern: MEDIUM — no existing upload code in codebase; Supabase docs not fetched (see A1–A3)
- PaikkaSheet preview concern: HIGH — read PaikkaSheet.tsx directly; fixed positioning confirmed

**Research date:** 2026-06-06
**Valid until:** 2026-07-06 (stable stack — @supabase/supabase-js and Next.js are pinned in package.json)
