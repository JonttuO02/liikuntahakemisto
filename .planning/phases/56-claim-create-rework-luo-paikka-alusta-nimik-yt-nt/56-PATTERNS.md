# Phase 56: Claim/create-rework — Pattern Map

**Mapped:** 2026-06-24
**Files analyzed:** 5 (2 modified existing, 1 new helper, 2 modified i18n files)
**Analogs found:** 5 / 5

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `app/components/ClaimSearchForm.tsx` (rewrite, create-only) | component | request-response | itself (`create` step, lines 405-479) | exact — self-analog, strip search/claim steps |
| `app/api/business/create-paikka/route.ts` (modify body shape + company_name write) | route/controller | CRUD | itself (existing route) + `app/api/business/register/route.ts` for the company_name UPDATE pattern | exact |
| `lib/normalizeNimi.ts` (new shared helper) | utility | transform | `lib/sanitizeKotikaupunki.ts` | exact — same shape: pure string-in/string-out helper, JSDoc header, single exported function |
| `app/api/business/claim-paikka/route.ts` (delete) | route/controller | CRUD | n/a (deletion only) | n/a |
| `messages/fi.json` / `messages/en.json` (modify `Business` namespace keys) | config (i18n) | CRUD (key add/remove) | itself — existing `Business` namespace block | exact |

## Pattern Assignments

### `lib/normalizeNimi.ts` (utility, transform — NEW FILE)

**Analog:** `lib/sanitizeKotikaupunki.ts` (full file, 19 lines)

**Full pattern to copy** (JSDoc header + guard + single regex/transform chain + return):
```typescript
/**
 * Sanitizes a kotikaupunki (home city) value from user input before inserting
 * it into an AI prompt. Uses the same character allowlist as suosikit names.
 *
 * Returns undefined when:
 * - Input is falsy/blank
 * - After stripping and trimming, the value is empty
 *
 * Returns the sanitized string otherwise (max 80 chars, trimmed).
 */
export function sanitizeKotikaupunki(value: string): string | undefined {
  if (!value || !value.trim()) return undefined
  const sanitized = value
    .replace(/[^\w\sÄäÖöÅå\-,.'()&]/g, '')
    .slice(0, 80)
    .trim()
  return sanitized || undefined
}
```

**Apply to `normalizeNimi`:** Per D-01/D-02, this new helper differs from the analog in two ways — no character allowlist regex (preserve all casing/characters, only trim + collapse whitespace), and a `200` char cap instead of `80`. Suggested signature consuming D-01 through D-04:

```typescript
/**
 * Normalizes a yritysNimi/toimipisteNimi value by trimming, collapsing
 * internal whitespace, and capping max length. Does NOT transform casing —
 * preserves user's exact casing (avoids mangling "CrossFit", "Oy", "Ay").
 *
 * Forward-only (D-04): apply only to new writes, never backfill existing data.
 *
 * Returns empty string for falsy/blank input (caller decides if that's an error).
 */
export function normalizeNimi(value: string): string {
  if (!value) return ''
  return value.trim().replace(/\s+/g, ' ').slice(0, 200)
}
```

Note: unlike `sanitizeKotikaupunki`, do not return `undefined` for blank — `create-paikka`'s required-field check on `yritysNimi` needs a plain string to test `if (!yritysNimi)`, matching the existing inline-trim convention's truthiness checks (see `create-paikka` line 51).

---

### `app/api/business/create-paikka/route.ts` (route/controller, CRUD — MODIFY)

**Analog:** itself (current file, full 142 lines, already read) + `app/api/business/register/route.ts` lines ~15-30 for the `company_name` trim/slice precedent on the same column.

**JWT-verification + business_accounts check pattern to preserve unchanged** (lines 1-24 of current file):
```typescript
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin.server'
import { sendAdminNotificationEmail } from '@/lib/email'

export async function POST(request: Request) {
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '') ?? ''
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: bizAccount } = await supabaseAdmin
    .from('business_accounts')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!bizAccount) {
    return NextResponse.json({ error: 'No business account' }, { status: 403 })
  }
```

**Body-parsing/validation pattern to extend** (lines 26-56) — replace single `nimi` field with `yritysNimi`/`toimipisteNimi`, call `normalizeNimi()` instead of inline `.trim().slice(0, 500)`, then combine per D-06/D-07:
```typescript
  let yritysNimi: string
  let toimipisteNimi: string
  let osoite: string
  let kaupunki: string
  let latitude: number | null
  let longitude: number | null
  try {
    const body = await request.json()
    yritysNimi = typeof body.yritysNimi === 'string' ? normalizeNimi(body.yritysNimi) : ''
    toimipisteNimi = typeof body.toimipisteNimi === 'string' ? normalizeNimi(body.toimipisteNimi) : ''
    osoite = typeof body.osoite === 'string' ? body.osoite.trim().slice(0, 500) : ''
    kaupunki = typeof body.kaupunki === 'string' ? body.kaupunki.trim().slice(0, 500) : ''

    latitude = /* unchanged allowlist parse, lines 42-49 */
    longitude = /* unchanged allowlist parse, lines 42-49 */

    if (!yritysNimi || !osoite || !kaupunki || latitude === null || longitude === null) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // D-06/D-07: combined string, no trailing-space artifact when toimipisteNimi is empty (D-08)
  const nimi = toimipisteNimi ? `${yritysNimi} ${toimipisteNimi}` : yritysNimi
```

**`liikuntapaikat` INSERT** — unchanged shape, just uses the computed `nimi` (lines 61-72 of current file — keep `published: false`, `laji: 'Muu'`).

**Atomicity rollback pattern to preserve unchanged** (lines 76-94 — link insert + rollback-on-failure):
```typescript
  const { error: linkError } = await supabaseAdmin
    .from('business_paikka_links')
    .insert({
      business_account_id: user.id,
      paikka_id: newPaikkaId,
      link_type: 'created',
      claim_status: 'pending',
    })

  if (linkError) {
    // D-11: 23505 (UNIQUE(paikka_id) violation) must be handled the same way claim-paikka does
    if (linkError.code === '23505') {
      await supabaseAdmin.from('liikuntapaikat').delete().eq('id', newPaikkaId)
      return NextResponse.json({ error: 'Already claimed' }, { status: 409 })
    }
    await supabaseAdmin.from('liikuntapaikat').delete().eq('id', newPaikkaId)
    return NextResponse.json(
      { error: 'Link insert failed', detail: linkError.message },
      { status: 500 }
    )
  }
```
Note: current `create-paikka` does NOT yet special-case `23505` — it currently treats any link error generically. Per D-11/PITFALLS Pitfall 7, the planner must add the `23505` → 409 branch here, mirroring `claim-paikka/route.ts` lines 50-54:
```typescript
// app/api/business/claim-paikka/route.ts:50-54 (existing pattern to copy)
if (linkError.code === '23505') {
  return NextResponse.json({ error: 'Already claimed' }, { status: 409 })
}
```

**New `business_accounts.company_name` UPDATE (D-05)** — insert before or after the `liikuntapaikat` insert, using the same `supabaseAdmin` + verified `user.id` pattern already used for every other write in this file. No existing UPDATE-on-`business_accounts` write exists in `create-paikka` (it currently only reads `company_name`, lines 110-114) — closest analog for a verified-identity `business_accounts` UPDATE is the read-side pattern in this same file plus the general "trust `user.id`, never body" convention from the JWT block above:
```typescript
  const { error: companyUpdateError } = await supabaseAdmin
    .from('business_accounts')
    .update({ company_name: yritysNimi })
    .eq('user_id', user.id)

  if (companyUpdateError) {
    // Treat as non-critical (consistent with is_claimed/email patterns below) or
    // as a hard failure before the liikuntapaikat insert — planner's call based on
    // whether company_name is considered load-bearing for venue creation to proceed.
    console.error('[create-paikka] company_name UPDATE failed:', companyUpdateError.message)
  }
```

**Non-critical is_claimed UPDATE + admin email pattern** — unchanged (lines 96-138), just reads back the already-combined `nimi`.

---

### `app/components/ClaimSearchForm.tsx` (component, request-response — REWRITE, create-only)

**Analog:** itself, `create` step block (lines 405-479, already in context above) — this is the surviving step; `search` (lines 186-336) and `claim` (lines 338-403) steps are deleted per D-10.

**Shared class constants to keep verbatim** (lines 26-33):
```typescript
const INPUT_CLASS =
  'flex-1 border border-[rgba(0,0,0,0.12)] focus:border-[rgba(0,0,0,0.25)] rounded-lg h-10 px-3 text-sm outline-none [transition:border-color_150ms_var(--ease-out)]'

const CTA_CLASS =
  'bg-[#111111] rounded-full h-10 w-full text-sm font-bold text-white hover:bg-[#333333] disabled:opacity-60 disabled:pointer-events-none [transition:background-color_150ms_var(--ease-out)]'
```
(`SELECT_CLASS` was only used by the deleted `search` step's city dropdown — drop it unless a future field needs a `<select>`.)

**State to keep, renamed per CONTEXT.md body-shape change** (was lines 50-55):
```typescript
const [yritysNimi, setYritysNimi] = useState('')
const [toimipisteNimi, setToimipisteNimi] = useState('')
const [createOsoite, setCreateOsoite] = useState('')
const [createKaupunki, setCreateKaupunki] = useState('')
const [createLat, setCreateLat] = useState<number | null>(null)
const [createLng, setCreateLng] = useState<number | null>(null)
```
Delete entirely: `step`, `query`, `kaupunki` (search-city filter), `results`, `selectedVenue`, the debounce `useEffect` (lines 61-93), and `handleClaim` (lines 97-130).

**`handleCreate` pattern to keep, with validation message + body-shape changes** (was lines 132-182):
```typescript
async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault()

  if (!yritysNimi.trim()) {
    setError(t('errorNameRequired')) // new copy per UI-SPEC: "Yrityksen nimi on pakollinen."
    return
  }
  if (!createOsoite.trim()) {
    setError(t('errorAddressRequired'))
    return
  }
  if (createLat === null || createLng === null) {
    setError(t('sijaintiPakollinen'))
    return
  }

  setLoading(true)
  setError(null)

  const { data: { session } } = await createBusinessBrowserClient().auth.getSession()
  const token = session?.access_token ?? ''

  try {
    const res = await fetch('/api/business/create-paikka', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        yritysNimi: yritysNimi.trim(),
        toimipisteNimi: toimipisteNimi.trim(),
        osoite: createOsoite.trim(),
        kaupunki: createKaupunki,
        latitude: createLat,
        longitude: createLng,
      }),
    })

    if (res.ok) {
      const data = await res.json()
      router.push(`/business/onboarding${data.paikka_id ? `?paikka_id=${data.paikka_id}` : ''}`)
      return
    }

    if (res.status === 409) {
      setError(t('errorClaimAlreadyTaken')) // reworded per UI-SPEC, key may be renamed
    } else {
      setError(t('errorCreateFailed'))
    }
  } catch {
    setError(t('errorCreateFailed'))
  } finally {
    setLoading(false)
  }
}
```
Note: the current `handleCreate` does not branch on 409 at all (only `handleClaim` did) — per D-11/UI-SPEC, the new single create path must now ALSO handle 409, since claim-paikka is deleted and create-paikka is the only write path left that can hit the `UNIQUE(paikka_id)` constraint.

**Render pattern to keep** (was lines 405-479, `create` step JSX) — strip the back button (`backToSearch`, no longer has a destination per UI-SPEC "Step Structure" section), keep crossfade wrapper only if planner decides a transition is still needed (UI-SPEC explicitly allows dropping `AnimatePresence` if there's truly one render branch):
```typescript
<form onSubmit={handleCreate} className="flex flex-col gap-3">
  <input
    type="text"
    placeholder={t('yritysNimiPlaceholder')} // "esim. FitLife Oy"
    aria-label={t('yritysNimiLabel')}
    className={INPUT_CLASS}
    value={yritysNimi}
    onChange={e => setYritysNimi(e.target.value)}
  />

  <input
    type="text"
    placeholder={t('toimipisteNimiPlaceholder')} // "esim. Keskusta"
    aria-label={t('toimipisteNimiLabel')}
    className={INPUT_CLASS}
    value={toimipisteNimi}
    onChange={e => setToimipisteNimi(e.target.value)}
  />
  <p className="text-sm text-[rgba(17,17,17,0.45)]">{t('toimipisteNimiHelper')}</p>

  <h3 className="text-sm font-bold text-[#111111]">{t('sijaintiLabel')}</h3>

  <SijaintiPicker
    onChange={({ lat, lng, address, city }) => {
      setCreateLat(lat)
      setCreateLng(lng)
      setCreateOsoite(address)
      setCreateKaupunki(city)
    }}
  />

  {/* Error block — unchanged AnimatePresence pattern, lines 457-471 */}
  <AnimatePresence>
    {error && (
      <motion.div
        key="create-error"
        role="alert"
        aria-live="polite"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
      >
        <p className="text-sm text-red-600">{error}</p>
      </motion.div>
    )}
  </AnimatePresence>

  <button type="submit" className={CTA_CLASS} disabled={loading || createLat === null}>
    {loading ? t('creating') : t('createCta')}
  </button>
</form>
```

`SijaintiPicker` import and usage (line 9, line 447-454) — unchanged, reuse as-is per Phase 54 integration, do not rebuild.

---

### `messages/fi.json` / `messages/en.json` (config/i18n — MODIFY `Business` namespace)

**Analog:** itself — existing `Business` namespace block, lines 117-145 of `messages/fi.json` (current key set):
```json
"claimTitle": "Hae tai luo paikka",
"searchNamePlaceholder": "Paikan nimi",
"searchAllCities": "Kaikki kaupungit",
"createInstead": "Luo uusi paikka sen sijaan →",
"searchNoResults": "Hakusanallasi ei löytynyt paikkoja.",
"resultSelectCta": "Valitse",
"backToSearch": "← Takaisin hakuun",
"selectedVenueLabel": "Valittu paikka",
"claimCta": "Ota haltuun",
"claiming": "Lähetetään...",
"createTitle": "Luo uusi paikka",
"createNamePlaceholder": "Paikan nimi",
"createCta": "Luo paikka",
"creating": "Luodaan...",
"errorClaimFailed": "Haltuunotto epäonnistui. Yritä uudelleen.",
"errorClaimAlreadyTaken": "Tämä paikka on jo jonkun hallussa.",
"errorCreateFailed": "Paikan luonti epäonnistui. Yritä uudelleen.",
"errorNameRequired": "Paikan nimi on pakollinen.",
"errorAddressRequired": "Osoite on pakollinen.",
"sijaintiLabel": "Sijainti",
"sijaintiPakollinen": "Aseta paikan sijainti kartalle ennen tallentamista."
```

**Keys to delete** (both `fi.json` and `en.json`, per D-10 + UI-SPEC "Deleted" rows): `searchNamePlaceholder`, `searchAllCities`, `createInstead`, `searchNoResults`, `resultSelectCta`, `backToSearch`, `selectedVenueLabel`, `claimCta`, `claiming`, `errorClaimFailed`.

**Keys to modify (value change only, same key)**: `claimTitle` → `"Luo paikka"` (was "Hae tai luo paikka"); `errorClaimAlreadyTaken` → reworded per UI-SPEC ("Tämä paikka on jo rekisteröity. Ota yhteyttä tukeen, jos uskot tämän olevan virhe."); `errorNameRequired` → now refers specifically to company name ("Yrityksen nimi on pakollinen.").

**Keys to add (new)**: `yritysNimiLabel`/`yritysNimiPlaceholder`, `toimipisteNimiLabel`/`toimipisteNimiPlaceholder`/`toimipisteNimiHelper`. Maintain the same flat-key-under-`Business`-namespace convention as the existing block — no nesting.

`createNamePlaceholder` becomes orphaned once the single `nimi` field is split — delete or repurpose (planner discretion).

---

## Shared Patterns

### JWT-verified `supabaseAdmin` write authentication
**Source:** `app/api/business/create-paikka/route.ts` lines 1-24, identical block in `app/api/business/claim-paikka/route.ts` lines 1-24
**Apply to:** any write inside `create-paikka` touching `business_accounts.company_name` — never trust `body.user_id`/`body.business_account_id`, always use verified `user.id`.

### `23505` unique-violation → 409 mapping
**Source:** `app/api/business/claim-paikka/route.ts` lines 50-54
```typescript
if (linkError.code === '23505') {
  return NextResponse.json({ error: 'Already claimed' }, { status: 409 })
}
```
**Apply to:** `create-paikka/route.ts`'s `business_paikka_links` insert error branch — currently missing this exact check (D-11, PITFALLS Pitfall 7).

### Inline trim+slice → shared helper migration
**Source:** `app/api/business/register/route.ts` lines 21-27 (current inline convention for `company_name`/`role_in_company`), now superseded for name fields by `lib/normalizeNimi.ts` (D-03). Other non-name fields (`osoite`, `kaupunki`, free-text `kuvaus` in `update-paikka`) keep their existing inline `.trim().slice(0, N)` convention unchanged — only `yritysNimi`/`toimipisteNimi` route through the new helper.

### Non-critical write pattern (log-don't-rollback)
**Source:** `app/api/business/create-paikka/route.ts` lines 96-138 (`is_claimed` UPDATE, admin email) — console.error + continue, no rollback. Candidate pattern for the new `company_name` UPDATE if planner decides it should be non-blocking.

### Crossfade transition
**Source:** `app/components/ClaimSearchForm.tsx` (all `motion.div`/`AnimatePresence` blocks) — `initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.2}}` (step-level) or `duration: 0.15` (sub-block level, e.g. error messages). UI-SPEC mandates reusing this exact timing if any transition survives the single-step restructure — do not introduce a new duration/easing.

## No Analog Found

None — every file in scope has a same-file (modify-in-place) or near-identical sibling-file analog. This phase is a pure restructure of existing code, not new architectural surface.

## Metadata

**Analog search scope:** `app/components/ClaimSearchForm.tsx`, `app/api/business/*`, `lib/*.ts`, `messages/*.json`, `app/business/page.tsx`
**Files scanned:** ~12 (ClaimSearchForm.tsx, create-paikka/route.ts, claim-paikka/route.ts, register/route.ts, update-paikka/route.ts, admin/reject/route.ts, sanitizeKotikaupunki.ts, lib/*.ts glob listing, messages/fi.json Business block, business/page.tsx integration points)
**Pattern extraction date:** 2026-06-24
