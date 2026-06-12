# Phase 35: Admin-hyväksyntäjärjestelmä — PLAN

**Phase goal:** Admin voi tarkistaa, hyväksyä tai hylätä yritystiliöinnit ja claim-pyynnöt `/admin`-sivulta. Sekä admin että yritys saavat asianmukaiset sähköposti-ilmoitukset Resend-palvelun kautta.

**Requirements:** ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04, ADMIN-05

**Success criteria:**
1. Uusi rekisteröityminen tai claim-pyyntö lähettää välittömästi ilmoituksen `joona.orava@gmail.com`-osoitteeseen
2. `/admin`-sivulla näkyy lista odottavista hakemuksista — admin näkee yrityksen tiedot, haetun paikan ja ladatut kuvat
3. Admin voi hyväksyä hakemuksen yhdellä klikkauksella tai hylätä sen syy-tekstillä — molemmat päivittävät tilan välittömästi
4. Hyväksytty/hylätty yritys saa sähköpostivahvistuksen — hylätty saa myös syyn
5. `/admin`-sivu näkyy vain käyttäjälle jonka `profiles.is_admin = true` — muut saavat 404

---

## Wave overview

| Wave | Plans | Parallelism | Blocker |
|------|-------|-------------|---------|
| 1 | 35-01, 35-02, 35-03 | All parallel | — |
| 2 | 35-04 | Sequential (blocking) | Wave 1 complete |
| 3 | 35-05, 35-06, 35-07 | All parallel | Wave 2 complete |
| 4 | 35-08, 35-09 | All parallel | Wave 3 complete |

---

## Wave 1 — Foundation (parallel, no runtime deps)

### 35-01-PLAN.md — DB migration: rejection_reason + role_in_company

**Goal:** Add the two new columns that Phase 35 features depend on.

**Files to create:**
- `supabase/migrations/20260610000002_admin_columns.sql`

**Migration content:**
```sql
-- Phase 35: Admin approval system columns
-- D-07: rejection_reason stored in business_paikka_links so /business page can display it
-- D-04: role_in_company collected at registration so admin sees the applicant's role

ALTER TABLE business_paikka_links
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT NULL;

ALTER TABLE business_accounts
  ADD COLUMN IF NOT EXISTS role_in_company TEXT NULL;
```

**Verification:** File exists and contains both `ALTER TABLE` statements. No TypeScript changes in this plan.

---

### 35-02-PLAN.md — i18n: Admin namespace + Business role keys

**Goal:** Add all Finnish and English strings needed by the admin page, rejection/approval emails, and the `role_in_company` registration form field.

**Files to modify:**
- `messages/fi.json` — add `Admin` namespace + `Business.roleInCompany*` keys
- `messages/en.json` — same structure in English

**Keys to add to `Business` namespace (both files):**
```json
"roleInCompanyLabel": "Roolisi yrityksessä",
"roleOwner": "Omistaja",
"roleManager": "Johtaja",
"roleMarketing": "Markkinointi",
"roleOther": "Muu",
"rejectionReasonLabel": "Hylkäyssyy",
"reapplyCta": "Hae uudelleen"
```

**New `Admin` namespace (both files):**
```json
"Admin": {
  "pageTitle": "Admin — Odottavat hakemukset",
  "emptyState": "Ei odottavia hakemuksia.",
  "applicationTypeClaim": "Haltuunotto",
  "applicationTypeCreated": "Uusi paikka",
  "companyLabel": "Yritys",
  "venueLabel": "Paikka",
  "roleLabel": "Rooli",
  "submittedLabel": "Lähetetty",
  "viewDetailsCta": "Tarkastele",
  "approveCta": "Hyväksy",
  "rejectCta": "Hylkää",
  "approving": "Hyväksytään...",
  "rejecting": "Hylätään...",
  "rejectReasonPlaceholder": "Syy hylkäykselle (pakollinen)",
  "rejectConfirmCta": "Vahvista hylkäys",
  "cancelCta": "Peruuta",
  "errorUnauthorized": "Ei käyttöoikeutta.",
  "errorGeneric": "Toiminto epäonnistui. Yritä uudelleen.",
  "successApproved": "Hyväksytty.",
  "successRejected": "Hylätty.",
  "detailTitle": "Hakemuksen tiedot",
  "detailMediaLabel": "Kuvat",
  "detailPricingLabel": "Hinnasto",
  "detailHoursLabel": "Aukioloajat",
  "detailContactLabel": "Yhteystiedot",
  "noMedia": "Ei kuvia"
}
```

**English equivalents (en.json):** Translate all keys to English with appropriate values.

**Verification:** Both JSON files parse without errors (`JSON.parse`). All keys present in both languages.

---

### 35-03-PLAN.md — npm install resend + lib/email.ts

**Goal:** Install the Resend SDK and create a reusable email helper module. No API calls are made in this plan — the helper is written but the API key is added in Wave 2.

**Commands:**
```bash
npm install resend
```

**File to create:** `lib/email.ts`

**Content spec for `lib/email.ts`:**

```typescript
// Server-only. Never import in client components.
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.EMAIL_FROM ?? 'onboarding@resend.dev'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'joona.orava@gmail.com'

// Sent when a new claim/create submission or onboarding submit arrives
export async function sendAdminNotificationEmail(params: {
  companyName: string
  venueName: string
  linkType: 'claim' | 'created'
  applicationId: number
  submittedAt: string
}) {
  const subject = `[Aktiivi] Uusi hakemus: ${params.companyName} — ${params.venueName}`
  const html = `
    <h2>Uusi ${params.linkType === 'claim' ? 'haltuunottopyyntö' : 'uusi paikka -hakemus'}</h2>
    <p><strong>Yritys:</strong> ${params.companyName}</p>
    <p><strong>Paikka:</strong> ${params.venueName}</p>
    <p><strong>Tyyppi:</strong> ${params.linkType === 'claim' ? 'Haltuunotto' : 'Uusi paikka'}</p>
    <p><strong>Hakemus ID:</strong> ${params.applicationId}</p>
    <p><strong>Lähetetty:</strong> ${params.submittedAt}</p>
    <p><a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/admin/${params.applicationId}">Tarkastele hakemusta →</a></p>
  `
  await resend.emails.send({ from: FROM, to: ADMIN_EMAIL, subject, html })
}

// Sent to business when their application is approved
export async function sendApprovalEmail(to: string, params: {
  companyName: string
  venueName: string
}) {
  const subject = `[Aktiivi] Hakemuksesi on hyväksytty — ${params.venueName}`
  const html = `
    <h2>Hakemuksesi on hyväksytty!</h2>
    <p>Hei ${params.companyName},</p>
    <p>Paikkasi <strong>${params.venueName}</strong> on nyt julkaistu Aktiivi-hakemistossa.</p>
    <p><a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/business">Siirry hallintapaneeliin →</a></p>
  `
  await resend.emails.send({ from: FROM, to, subject, html })
}

// Sent to business when their application is rejected
export async function sendRejectionEmail(to: string, params: {
  companyName: string
  venueName: string
  reason: string
}) {
  const subject = `[Aktiivi] Hakemuksesi on hylätty — ${params.venueName}`
  const html = `
    <h2>Hakemuksesi on hylätty</h2>
    <p>Hei ${params.companyName},</p>
    <p>Hakemuksesi paikalle <strong>${params.venueName}</strong> on hylätty.</p>
    <p><strong>Syy:</strong> ${params.reason}</p>
    <p>Voit hakea uudelleen korjaamalla hakemuksesi tiedot hallintapaneelista.</p>
    <p><a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/business">Siirry hallintapaneeliin →</a></p>
  `
  await resend.emails.send({ from: FROM, to, subject, html })
}
```

**Verification:** `lib/email.ts` exists. `package.json` and `package-lock.json` both contain `resend`. TypeScript types resolve (no import errors). No runtime call is made — the helper just exports functions.

---

## Wave 2 — Blocking: Apply schema + configure env

### 35-04-PLAN.md — [BLOCKING] supabase db push + env setup + smoke test

**Goal:** Apply the migration from 35-01 to the live Supabase project and ensure the environment is ready for Resend integration.

**Prerequisites:** 35-01, 35-02, 35-03 all complete.

**Steps:**

1. **Apply migration:**
   ```bash
   npx supabase db push
   ```
   Verify output shows `20260610000002_admin_columns` applied without errors.

2. **Verify columns in Supabase dashboard:**
   - `business_paikka_links` → `rejection_reason TEXT NULL` exists
   - `business_accounts` → `role_in_company TEXT NULL` exists

3. **Add env vars to `.env.local`:**
   ```
   RESEND_API_KEY=re_...        # Obtain from resend.com dashboard (free tier)
   EMAIL_FROM=noreply@aktiivi.app  # Or onboarding@resend.dev for dev
   ADMIN_EMAIL=joona.orava@gmail.com
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```
   > Dev note: Use `onboarding@resend.dev` as FROM until domain `aktiivi.app` is verified in Resend dashboard.

4. **Checkpoint questions (manual):**
   - [ ] Migration applied without errors?
   - [ ] Both new columns visible in Supabase table editor?
   - [ ] `RESEND_API_KEY` added to `.env.local`?
   - [ ] Dev server restarts cleanly with `npm run dev`?

**Verification:** `supabase db push` exits 0. Columns visible in Supabase dashboard. Dev server starts without errors. No code changes in this plan.

---

## Wave 3 — Route Handlers + UI updates (parallel)

### 35-05-PLAN.md — Extend existing Route Handlers with email notifications + role_in_company

**Goal:** Add Resend email notifications to the three existing submit routes (ADMIN-01) and save `role_in_company` in the register route (D-04).

**Files to modify:**

#### 1. `app/api/business/register/route.ts`
Add `role_in_company` to the insert:
```typescript
// Parse role_in_company from body (optional, trimmed)
const role_in_company = typeof body.role_in_company === 'string'
  ? body.role_in_company.trim().slice(0, 100) || null
  : null

// Include in INSERT
{ user_id: user.id, company_name, role_in_company }
```

#### 2. `app/api/business/claim-paikka/route.ts`
After the successful `is_claimed` update, add admin notification (non-critical, wrapped in try/catch so email failure doesn't block the claim):
```typescript
// Non-critical: send admin notification — failure does not rollback the claim
try {
  const { data: biz } = await supabaseAdmin
    .from('business_accounts')
    .select('company_name')
    .eq('user_id', user.id)
    .single()
  const { data: paikka } = await supabaseAdmin
    .from('liikuntapaikat')
    .select('nimi')
    .eq('id', paikkaId)
    .single()
  // Get link id for deep link in email
  const { data: link } = await supabaseAdmin
    .from('business_paikka_links')
    .select('id')
    .eq('business_account_id', user.id)
    .eq('paikka_id', paikkaId)
    .single()
  if (biz && paikka && link) {
    await sendAdminNotificationEmail({
      companyName: biz.company_name,
      venueName: paikka.nimi,
      linkType: 'claim',
      applicationId: link.id,
      submittedAt: new Date().toISOString(),
    })
  }
} catch (emailErr) {
  console.error('[claim-paikka] Admin notification email failed (non-critical):', emailErr)
}
```

#### 3. `app/api/business/create-paikka/route.ts`
Same pattern as claim-paikka, after step 3 (is_claimed update). `linkType: 'created'`. Use `newPaikkaId` and the new `link.id` for the link id.

#### 4. `app/api/business/onboarding/submit/route.ts`
After step 5 (`onboarding_completed` update), add admin notification (non-critical):
```typescript
try {
  const { data: biz } = await supabaseAdmin
    .from('business_accounts')
    .select('company_name')
    .eq('user_id', user.id)
    .single()
  const { data: paikka } = await supabaseAdmin
    .from('liikuntapaikat')
    .select('nimi')
    .eq('id', draft.paikka_id)
    .single()
  const { data: link } = await supabaseAdmin
    .from('business_paikka_links')
    .select('id, link_type')
    .eq('business_account_id', user.id)
    .eq('paikka_id', draft.paikka_id)
    .single()
  if (biz && paikka && link) {
    await sendAdminNotificationEmail({
      companyName: biz.company_name,
      venueName: paikka.nimi,
      linkType: link.link_type as 'claim' | 'created',
      applicationId: link.id,
      submittedAt: new Date().toISOString(),
    })
  }
} catch (emailErr) {
  console.error('[onboarding/submit] Admin notification email failed (non-critical):', emailErr)
}
```

**Import to add to routes 2–4:**
```typescript
import { sendAdminNotificationEmail } from '@/lib/email'
```

**Verification:** All four route files compile without TypeScript errors. Manual test: submit the onboarding wizard in dev → check joona.orava@gmail.com for notification (or check Resend dashboard logs if email domain not yet verified).

---

### 35-06-PLAN.md — New admin Route Handlers: approve + reject

**Goal:** Create two JWT-verified Route Handlers that check `is_admin = true` before mutating `claim_status`. These are the server-side actions for the admin page approve/reject buttons.

**Files to create:**
- `app/api/admin/approve/route.ts`
- `app/api/admin/reject/route.ts`

#### `app/api/admin/approve/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin.server'
import { sendApprovalEmail } from '@/lib/email'

export async function POST(request: Request) {
  // Step 1: verify JWT
  const token = request.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Step 2: verify is_admin
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Step 3: parse link_id from body
  let linkId: number
  try {
    const body = await request.json()
    linkId = parseInt(body.link_id, 10)
    if (isNaN(linkId)) return NextResponse.json({ error: 'Missing link_id' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Step 4: fetch link to get paikka_id + business_account_id + link_type
  const { data: link, error: linkFetchError } = await supabaseAdmin
    .from('business_paikka_links')
    .select('paikka_id, business_account_id, link_type')
    .eq('id', linkId)
    .maybeSingle()
  if (linkFetchError || !link) {
    return NextResponse.json({ error: 'Link not found' }, { status: 404 })
  }

  // Step 5: set claim_status = 'approved'
  const { error: updateLinkError } = await supabaseAdmin
    .from('business_paikka_links')
    .update({ claim_status: 'approved' })
    .eq('id', linkId)
  if (updateLinkError) {
    return NextResponse.json({ error: 'Update failed', detail: updateLinkError.message }, { status: 500 })
  }

  // Step 6: for link_type = 'created', set published = true (claim venues are already published)
  if (link.link_type === 'created') {
    const { error: publishError } = await supabaseAdmin
      .from('liikuntapaikat')
      .update({ published: true })
      .eq('id', link.paikka_id)
    if (publishError) {
      console.error('[admin/approve] published UPDATE failed (non-critical):', publishError.message)
    }
  }

  // Step 7: send confirmation email to business (non-critical)
  try {
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(link.business_account_id)
    const { data: biz } = await supabaseAdmin
      .from('business_accounts')
      .select('company_name')
      .eq('user_id', link.business_account_id)
      .single()
    const { data: paikka } = await supabaseAdmin
      .from('liikuntapaikat')
      .select('nimi')
      .eq('id', link.paikka_id)
      .single()
    if (authUser?.user?.email && biz && paikka) {
      await sendApprovalEmail(authUser.user.email, {
        companyName: biz.company_name,
        venueName: paikka.nimi,
      })
    }
  } catch (emailErr) {
    console.error('[admin/approve] Approval email failed (non-critical):', emailErr)
  }

  return NextResponse.json({ ok: true })
}
```

#### `app/api/admin/reject/route.ts`

Complete route file (Steps 1–2 identical to approve; Steps 3–6 differ):

```typescript
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin.server'
import { sendRejectionEmail } from '@/lib/email'

export async function POST(request: Request) {
  // Step 1: verify JWT
  const token = request.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Step 2: verify is_admin
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Step 3: parse link_id + rejection_reason
  let linkId: number
  let reason: string
  try {
    const body = await request.json()
    linkId = parseInt(body.link_id, 10)
    reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 1000) : ''
    if (isNaN(linkId) || !reason) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Step 4: fetch link to get paikka_id + business_account_id
  const { data: link, error: linkFetchError } = await supabaseAdmin
    .from('business_paikka_links')
    .select('paikka_id, business_account_id')
    .eq('id', linkId)
    .maybeSingle()
  if (linkFetchError || !link) {
    return NextResponse.json({ error: 'Link not found' }, { status: 404 })
  }

  // Step 5: set claim_status = 'rejected' + save rejection_reason
  const { error: updateError } = await supabaseAdmin
    .from('business_paikka_links')
    .update({ claim_status: 'rejected', rejection_reason: reason })
    .eq('id', linkId)
  if (updateError) {
    return NextResponse.json({ error: 'Update failed', detail: updateError.message }, { status: 500 })
  }

  // Step 6: send rejection email to business (non-critical)
  try {
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(link.business_account_id)
    const { data: biz } = await supabaseAdmin
      .from('business_accounts')
      .select('company_name')
      .eq('user_id', link.business_account_id)
      .single()
    const { data: paikka } = await supabaseAdmin
      .from('liikuntapaikat')
      .select('nimi')
      .eq('id', link.paikka_id)
      .single()
    if (authUser?.user?.email && biz && paikka) {
      await sendRejectionEmail(authUser.user.email, {
        companyName: biz.company_name,
        venueName: paikka.nimi,
        reason,
      })
    }
  } catch (emailErr) {
    console.error('[admin/reject] Rejection email failed (non-critical):', emailErr)
  }

  return NextResponse.json({ ok: true })
}
```

**Verification:** Both route files compile without TypeScript errors. Manual test: call via curl or browser console with a valid admin JWT and a `link_id` from the pending applications list.

---

### 35-07-PLAN.md — UI updates: rekisteroidy role_in_company + business page rejection display

**Goal:** Add the `role_in_company` dropdown to the registration form (D-04) and update the business panel to show rejection reasons with a "Hae uudelleen" button (D-08).

**Files to modify:**

#### 1. `app/business/rekisteroidy/page.tsx`

Add `roleInCompany` state and a `<select>` dropdown between the `companyName` and `email` inputs:

```typescript
const [roleInCompany, setRoleInCompany] = useState('')
```

Dropdown (using `inputClass` border style):
```tsx
<select
  value={roleInCompany}
  onChange={e => setRoleInCompany(e.target.value)}
  required
  disabled={loading}
  className={inputClass + ' cursor-pointer'}
>
  <option value="" disabled>{t('roleInCompanyLabel')}</option>
  <option value="Omistaja">{t('roleOwner')}</option>
  <option value="Johtaja">{t('roleManager')}</option>
  <option value="Markkinointi">{t('roleMarketing')}</option>
  <option value="Muu">{t('roleOther')}</option>
</select>
```

In `handleSubmit`, add `role_in_company: roleInCompany` to the POST body:
```typescript
body: JSON.stringify({ company_name: companyName.trim(), role_in_company: roleInCompany }),
```

#### 2. `app/business/page.tsx`

Update `VenueLink` type to include `rejection_reason`:
```typescript
type VenueLink = {
  paikka_id: number
  claim_status: string
  rejection_reason: string | null
  liikuntapaikat: { nimi: string } | null
}
```

Update the Supabase select query:
```typescript
.select('paikka_id, claim_status, rejection_reason, liikuntapaikat(nimi)')
```

In the venue list render, when `claim_status === 'rejected'`, show `rejection_reason` and the "Hae uudelleen" button:
```tsx
{link.claim_status === 'rejected' && (
  <div className="flex flex-col gap-2 mt-1">
    {link.rejection_reason && (
      <p className="text-xs text-[rgba(17,17,17,0.45)]">{t('rejectionReasonLabel')}: {link.rejection_reason}</p>
    )}
    <button
      type="button"
      onClick={() => setShowAddVenue(true)}
      className="text-xs font-bold text-[#111111] underline hover:no-underline text-left"
    >
      {t('reapplyCta')} →
    </button>
  </div>
)}
```

**Verification:** Registration form renders all 4 fields (company, role dropdown, email, password). Selecting a role and submitting stores it in `business_accounts.role_in_company`. On /business page, a rejected application shows the rejection reason text and "Hae uudelleen" button that opens ClaimSearchForm.

---

## Wave 4 — Admin UI (parallel)

### 35-08-PLAN.md — /admin/page.tsx Server Component + AdminApplicationList Client Component

**Goal:** Create the admin page that lists pending applications with approve/reject actions (ADMIN-02, ADMIN-05).

**Files to create:**
- `app/admin/page.tsx` (Server Component)
- `app/admin/AdminApplicationList.tsx` (Client Component — handles approve/reject API calls)

#### `app/admin/page.tsx` — Server Component

```typescript
import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabaseSSR'
import { supabaseAdmin } from '@/lib/supabaseAdmin.server'
import AdminApplicationList from './AdminApplicationList'

export default async function AdminPage() {
  // Step 1: auth guard — must be signed in
  const cookieStore = cookies()
  const supabase = createServerSupabase(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  // Step 2: is_admin guard
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!profile?.is_admin) notFound()

  // Step 3: fetch all pending applications (service role bypasses RLS)
  const { data: applications } = await supabaseAdmin
    .from('business_paikka_links')
    .select(`
      id,
      paikka_id,
      link_type,
      claim_status,
      created_at,
      business_accounts(company_name, role_in_company, user_id),
      liikuntapaikat(nimi, osoite, kaupunki)
    `)
    .eq('claim_status', 'pending')
    .order('created_at', { ascending: true })

  return (
    <main className="min-h-screen bg-white px-4 py-16">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <h1 className="text-xl font-bold text-[#111111]">Admin — Odottavat hakemukset</h1>
        <AdminApplicationList applications={applications ?? []} />
      </div>
    </main>
  )
}
```

> **Note on admin token:** The Server Component cannot easily pass the user's JWT to the Client Component without additional work. Instead, the Client Component (`AdminApplicationList`) should use `createBrowserSupabase().auth.getSession()` to get the JWT at call time — same pattern as other client-side route calls. Do NOT pass the token as a Server Component prop.

#### `app/admin/AdminApplicationList.tsx` — Client Component

```typescript
'use client'

import { useState } from 'react'
import { createBrowserSupabase } from '@/lib/supabaseSSR'
import Link from 'next/link'

type Application = {
  id: number
  paikka_id: number
  link_type: string
  claim_status: string
  created_at: string
  business_accounts: { company_name: string; role_in_company: string | null; user_id: string } | null
  liikuntapaikat: { nimi: string; osoite: string; kaupunki: string } | null
}

export default function AdminApplicationList({ applications: initial }: { applications: Application[] }) {
  const [applications, setApplications] = useState(initial)
  const [loadingId, setLoadingId] = useState<number | null>(null)
  const [rejectingId, setRejectingId] = useState<number | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function getToken() {
    const supabase = createBrowserSupabase()
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ?? ''
  }

  async function handleApprove(linkId: number) {
    setLoadingId(linkId)
    setError(null)
    const token = await getToken()
    const res = await fetch('/api/admin/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ link_id: linkId }),
    })
    setLoadingId(null)
    if (res.ok) {
      setApplications(prev => prev.filter(a => a.id !== linkId))
    } else {
      setError('Toiminto epäonnistui. Yritä uudelleen.')
    }
  }

  async function handleRejectConfirm(linkId: number) {
    if (!rejectReason.trim()) return
    setLoadingId(linkId)
    setError(null)
    const token = await getToken()
    const res = await fetch('/api/admin/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ link_id: linkId, reason: rejectReason.trim() }),
    })
    setLoadingId(null)
    if (res.ok) {
      setApplications(prev => prev.filter(a => a.id !== linkId))
      setRejectingId(null)
      setRejectReason('')
    } else {
      setError('Toiminto epäonnistui. Yritä uudelleen.')
    }
  }

  if (applications.length === 0) {
    return <p className="text-sm text-[rgba(17,17,17,0.45)]">Ei odottavia hakemuksia.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {applications.map(app => (
        <div key={app.id} className="glass rounded-2xl p-5 flex flex-col gap-3">
          {/* Header row */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-bold text-[#111111]">
                {app.business_accounts?.company_name ?? '—'}
              </span>
              {app.business_accounts?.role_in_company && (
                <span className="text-xs text-[rgba(17,17,17,0.45)]">{app.business_accounts.role_in_company}</span>
              )}
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full shrink-0 bg-amber-100 text-amber-700`}>
              {app.link_type === 'claim' ? 'Haltuunotto' : 'Uusi paikka'}
            </span>
          </div>

          {/* Venue info */}
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-[#111111]">{app.liikuntapaikat?.nimi ?? `Paikka ${app.paikka_id}`}</span>
            <span className="text-xs text-[rgba(17,17,17,0.45)]">
              {app.liikuntapaikat?.osoite}, {app.liikuntapaikat?.kaupunki}
            </span>
          </div>

          {/* Date + detail link */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-[rgba(17,17,17,0.45)]">
              {new Date(app.created_at).toLocaleDateString('fi-FI')}
            </span>
            <Link
              href={`/admin/${app.id}`}
              className="text-xs font-bold text-[#111111] underline hover:no-underline"
            >
              Tarkastele →
            </Link>
          </div>

          {/* Action buttons */}
          {rejectingId === app.id ? (
            <div className="flex flex-col gap-2">
              <input
                type="text"
                placeholder="Syy hylkäykselle (pakollinen)"
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                className="border border-[rgba(0,0,0,0.12)] rounded-lg h-10 px-3 text-sm text-[#111111] placeholder:text-[rgba(17,17,17,0.35)] bg-white focus:outline-none focus:border-[rgba(0,0,0,0.25)] w-full"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleRejectConfirm(app.id)}
                  disabled={!rejectReason.trim() || loadingId === app.id}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-full h-9 px-4 disabled:opacity-60 [transition:background-color_150ms]"
                >
                  {loadingId === app.id ? 'Hylätään...' : 'Vahvista hylkäys'}
                </button>
                <button
                  type="button"
                  onClick={() => { setRejectingId(null); setRejectReason('') }}
                  className="text-sm text-[rgba(17,17,17,0.45)] hover:text-[#111111] [transition:color_150ms]"
                >
                  Peruuta
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleApprove(app.id)}
                disabled={loadingId === app.id}
                className="bg-[#111111] hover:bg-[#333333] text-white font-bold text-sm rounded-full h-9 px-4 disabled:opacity-60 [transition:background-color_150ms_var(--ease-out)]"
              >
                {loadingId === app.id ? 'Hyväksytään...' : 'Hyväksy'}
              </button>
              <button
                type="button"
                onClick={() => setRejectingId(app.id)}
                disabled={loadingId === app.id}
                className="text-sm font-bold text-red-600 border border-red-200 hover:border-red-400 rounded-full h-9 px-4 disabled:opacity-60 [transition:border-color_150ms]"
              >
                Hylkää
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
```

**Verification:** Navigate to `/admin` as a user with `is_admin = true` in `profiles` → see list of pending applications. Approve one → application disappears from list, `claim_status` updated in DB. Reject one with reason → same, `rejection_reason` saved. Non-admin gets 404.

---

### 35-09-PLAN.md — /admin/[id]/page.tsx — application detail view

**Goal:** Create the detail page that admin opens via "Tarkastele →" to inspect all venue data, media, and onboarding-provided info before approving or rejecting (ADMIN-02).

**Files to create:**
- `app/admin/[id]/page.tsx` (Server Component)

**Content spec:**

```typescript
import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabaseSSR'
import { supabaseAdmin } from '@/lib/supabaseAdmin.server'
import Image from 'next/image'

export default async function AdminDetailPage({ params }: { params: { id: string } }) {
  // Auth guards (same as /admin/page.tsx)
  const cookieStore = cookies()
  const supabase = createServerSupabase(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!profile?.is_admin) notFound()

  // Fetch full application data
  const linkId = parseInt(params.id, 10)
  if (isNaN(linkId)) notFound()

  const { data: link } = await supabaseAdmin
    .from('business_paikka_links')
    .select(`
      id,
      link_type,
      claim_status,
      created_at,
      rejection_reason,
      business_accounts(company_name, role_in_company, user_id),
      liikuntapaikat(
        nimi, osoite, kaupunki, laji,
        kuvaus, puhelin, varauslinkki,
        hinta_kuvaus, aukioloajat,
        image_url, photo_urls
      )
    `)
    .eq('id', linkId)
    .maybeSingle()

  if (!link) notFound()

  // Get business email from auth.users
  const businessUserId = (link.business_accounts as { user_id: string } | null)?.user_id
  let businessEmail: string | null = null
  if (businessUserId) {
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(businessUserId)
    businessEmail = authUser?.user?.email ?? null
  }

  const paikka = link.liikuntapaikat as Record<string, unknown> | null
  const business = link.business_accounts as { company_name: string; role_in_company: string | null } | null
  const photoUrls: string[] = Array.isArray(paikka?.photo_urls) ? paikka.photo_urls as string[] : []

  return (
    <main className="min-h-screen bg-white px-4 py-16">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        {/* Back link */}
        <a href="/admin" className="text-sm text-[rgba(17,17,17,0.45)] hover:text-[#111111] [transition:color_150ms]">
          ← Takaisin listaan
        </a>

        <h1 className="text-xl font-bold text-[#111111]">Hakemuksen tiedot</h1>

        {/* Application meta */}
        <div className="glass rounded-2xl p-5 flex flex-col gap-3">
          <SectionLabel>Hakija</SectionLabel>
          <Field label="Yritys">{business?.company_name ?? '—'}</Field>
          <Field label="Rooli">{business?.role_in_company ?? '—'}</Field>
          <Field label="Sähköposti">{businessEmail ?? '—'}</Field>
          <Field label="Tyyppi">{link.link_type === 'claim' ? 'Haltuunotto' : 'Uusi paikka'}</Field>
          <Field label="Lähetetty">{new Date(link.created_at).toLocaleString('fi-FI')}</Field>
          <Field label="Tila">{link.claim_status}</Field>
        </div>

        {/* Venue basic info */}
        <div className="glass rounded-2xl p-5 flex flex-col gap-3">
          <SectionLabel>Paikka</SectionLabel>
          <Field label="Nimi">{String(paikka?.nimi ?? '—')}</Field>
          <Field label="Osoite">{String(paikka?.osoite ?? '—')}</Field>
          <Field label="Kaupunki">{String(paikka?.kaupunki ?? '—')}</Field>
          <Field label="Laji">{String(paikka?.laji ?? '—')}</Field>
        </div>

        {/* Media */}
        {photoUrls.length > 0 && (
          <div className="glass rounded-2xl p-5 flex flex-col gap-3">
            <SectionLabel>Kuvat</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {photoUrls.map((url, i) => (
                <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden border border-[rgba(0,0,0,0.07)]">
                  <Image
                    src={url}
                    alt={`Kuva ${i + 1}`}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pricing */}
        {paikka?.hinta_kuvaus && (
          <div className="glass rounded-2xl p-5 flex flex-col gap-3">
            <SectionLabel>Hinnasto</SectionLabel>
            <pre className="text-sm text-[#111111] whitespace-pre-wrap font-sans">{String(paikka.hinta_kuvaus)}</pre>
          </div>
        )}

        {/* Contact */}
        <div className="glass rounded-2xl p-5 flex flex-col gap-3">
          <SectionLabel>Yhteystiedot</SectionLabel>
          {paikka?.puhelin && <Field label="Puhelin">{String(paikka.puhelin)}</Field>}
          {paikka?.varauslinkki && <Field label="Website">{String(paikka.varauslinkki)}</Field>}
          {paikka?.kuvaus && <Field label="Kuvaus">{String(paikka.kuvaus)}</Field>}
        </div>
      </div>
    </main>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-bold uppercase tracking-widest text-[rgba(17,17,17,0.45)]">{children}</p>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <span className="text-sm text-[rgba(17,17,17,0.45)] shrink-0 w-24">{label}:</span>
      <span className="text-sm text-[#111111]">{children}</span>
    </div>
  )
}
```

**Note on photo URLs:** The `photo_urls` column stores Supabase Storage paths (not full URLs). Construct the public URL with this helper defined at the top of the file:
```typescript
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
function storageUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/business-media/${path}`
}
// Use storageUrl(path) for each Image src
```

**Verification:** Navigate to `/admin/[id]` for an existing pending application → see all venue details, photos, pricing, and contact info displayed correctly. Back link returns to `/admin`. Non-admin gets 404.

---

## Cross-cutting constraints

- All admin API routes follow the double-guard pattern: (1) JWT verification via `supabaseAdmin.auth.getUser(token)`, (2) `is_admin = true` check in `profiles` table
- Email sends are **always non-critical** — wrapped in try/catch, never blocking the main action
- `supabaseAdmin` (service role) is used for ALL admin data reads — anon client would be blocked by RLS
- New migration file timestamp: must be greater than `20260610000001` — use `20260610000002`
- `role_in_company` is saved as free text (from the dropdown options) — no CHECK constraint needed
- The admin token for API calls in `AdminApplicationList` is obtained client-side via `createBrowserSupabase().auth.getSession()` — same pattern as onboarding wizard

## Plan count

| # | Plan | Wave | Parallelism |
|---|------|------|-------------|
| 1 | 35-01 DB migration | 1 | ✦ parallel |
| 2 | 35-02 i18n keys | 1 | ✦ parallel |
| 3 | 35-03 lib/email.ts + npm install resend | 1 | ✦ parallel |
| 4 | 35-04 [BLOCKING] supabase db push + env | 2 | sequential |
| 5 | 35-05 Extend Route Handlers + email notifications | 3 | ✦ parallel |
| 6 | 35-06 New admin approve/reject Route Handlers | 3 | ✦ parallel |
| 7 | 35-07 UI: rekisteroidy + business page updates | 3 | ✦ parallel |
| 8 | 35-08 /admin/page.tsx + AdminApplicationList | 4 | ✦ parallel |
| 9 | 35-09 /admin/[id]/page.tsx detail view | 4 | ✦ parallel |

**Total: 9 plans, 4 waves**
