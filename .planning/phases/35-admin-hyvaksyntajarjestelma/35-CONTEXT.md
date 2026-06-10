# Phase 35: Admin-hyväksyntäjärjestelmä - Context

**Gathered:** 2026-06-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Admin voi tarkistaa, hyväksyä tai hylätä yritystiliöinnit ja claim-pyynnöt `/admin`-sivulta. Sekä admin että yritys saavat asianmukaiset sähköposti-ilmoitukset Resend-palvelun kautta. `/admin`-sivu on suojattu `is_admin = true` -flagilla. Hylätty yritys voi hakea uudelleen. Rekisteröintilomakkeeseen lisätään "rooli yrityksessä" -kenttä.

Vaatimukset: ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04, ADMIN-05

</domain>

<decisions>
## Implementation Decisions

### Sähköpostipalvelu (ADMIN-01, ADMIN-04)

- **D-01:** Sähköpostipalvelu: **Resend** (`resend` npm-paketti, `RESEND_API_KEY` server-only env-muuttuja). Ei SMTP:tä, ei Nodemailer-riippuvuuksia.
- **D-02:** From-osoite: `noreply@aktiivi.app`. Verifioidaan domain Resendissä. Kehityksessä voidaan käyttää Resendin testiosoitetta.
- **D-03:** Admin-ilmoitussähköposti (ADMIN-01) lähetetään **kahdessa vaiheessa**:
  1. Kun claim-pyyntö tai uuden paikan luontipyyntö hyväksytään → `/api/business/claim-paikka` ja `/api/business/create-paikka` Route Handlerit lähettävät ilmoituksen `joona.orava@gmail.com`:iin
  2. Kun onboarding on valmis ja "Lähetä hyväksyttäväksi" painetaan Step 6:ssa → `/api/business/onboarding/submit` lähettää toisen ilmoituksen
- **D-04:** "Rooli yrityksessä" -kenttä lisätään **rekisteröintilomakkeeseen** (`/business/rekisteroidy`). Uusi sarake: `business_accounts.role_in_company TEXT NULL`. Admin näkee arvon `/admin`-sivulla hakemuksen yhteydessä.

### Admin-sivun layout (ADMIN-02)

- **D-05:** `/admin`-sivu on **yksinkertainen lista** odottavista hakemuksista (`claim_status = 'pending'`). Jokainen rivi näyttää: yrityksen nimi, paikan nimi, hakemuksen tyyppi (claim / uusi paikka), päivämäärä, "Tarkastele"-nappi + Hyväksy/Hylkää-napit.
- **D-06:** Onboarding-data (kuvat, hinnasto, yhteystiedot) näytetään **modaalissa tai erillisellä `/admin/[id]`-sivulla** kun "Tarkastele" klikataan. Päälistassa ei näytetä kuvia suoraan.

### Hylkäyssyyn tallennus & uudelleenhaku (ADMIN-03, ADMIN-04)

- **D-07:** Hylkäyssyy tallennetaan `business_paikka_links`-tauluun uutena sarakkeena `rejection_reason TEXT NULL`. Lisäksi lähetetään sähköpostilla yritykselle (ADMIN-04).
- **D-08:** Hylätty yritys näkee `/business`-sivulla `statusRejected` + hylkäyssyyn + **"Hae uudelleen" -napin** joka käynnistää uuden claim/create-virran. Vanha rejected-rivi voidaan jättää historiana tai arkistoida.

### Admin-suojauksen toteutus (ADMIN-05)

- **D-09:** `app/admin/page.tsx` on **Server Component**. Suojaus: (1) `createServerSupabase().auth.getUser()` — ei kirjautunut → `redirect('/')`. (2) `SELECT is_admin FROM profiles WHERE user_id = uid` — `is_admin` ei ole `true` → `notFound()` (404). Sama kaava kuin muut business Server Componentit.
- **D-10:** `POST /api/admin/approve` ja `POST /api/admin/reject` Route Handlerit tarkistavat `is_admin = true` JWT-käyttäjältä ennen toimintoa. **Kaksinkertainen suojaus**: UI (Server Component) + API (Route Handler).

### Claude's Discretion

- Approve/reject API-routejen tarkka nimiavaruus ja polku (`/api/admin/approve` vs `/api/admin/applications/[id]/approve`)
- Sähköpostiviestin HTML-rakenne ja sisältö (plain text vs HTML template)
- `onboarding_draft`-datan hakustrategia admin-modaalissa (JOIN vs erillinen query)
- Modaali vs `/admin/[id]`-sivu valinta (suositellaan modaalia yksinkertaisuuden vuoksi mutta kumpi tahansa käy)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Vaatimukset ja tiekartta
- `.planning/REQUIREMENTS.md` — ADMIN-01–05 (Phase 35 requirements)
- `.planning/ROADMAP.md` §Phase 35 — Success criteria ja phase details

### Prior phase decisions (perusta)
- `.planning/phases/31-db-skeema-storage-perusta/31-CONTEXT.md` — `business_accounts`, `business_paikka_links` -skeema, `is_admin`-sarake profiles-taulussa
- `.planning/phases/32-yritysrekisterointi-auth/32-CONTEXT.md` — `/business/rekisteroidy` lomake (D-04 lisää `role_in_company` -kentän tähän), JWT + supabaseAdmin -kaava
- `.planning/phases/33-claim-paikan-luonti/33-CONTEXT.md` — `claim_status` pending/approved/rejected, `published`-sarake, claim/create Route Handler -kaavat
- `.planning/phases/34-onboarding-velhou/34-CONTEXT.md` — `onboarding_draft`-taulu, `/api/business/onboarding/submit` Route Handler (D-03 laajentaa tätä)

### Olemassa oleva infrastruktuuri
- `app/business/page.tsx` — näyttää jo `statusPending/Approved/Rejected` värikoodattuna; D-08 lisää `rejection_reason` + "Hae uudelleen" -nappi
- `app/api/business/register/route.ts` — JWT + supabaseAdmin -kaava; kaikki uudet admin Route Handlerit seuraavat tätä
- `app/api/business/claim-paikka/route.ts` ja `create-paikka/route.ts` — D-03: lisättävä Resend-sähköpostin lähetys tähän
- `app/api/business/onboarding/submit/route.ts` — D-03: lisättävä Resend-sähköpostin lähetys tähän
- `app/business/rekisteroidy/page.tsx` — D-04: lisättävä `role_in_company` -kenttä tähän
- `lib/supabaseAdmin.server.ts` — service role client; pakollinen admin Route Handlereille
- `lib/supabaseSSR.ts` — `createServerSupabase()` admin Server Componentille

### DB-migraatiot
- `supabase/migrations/20260605000000_business_accounts.sql` — `business_accounts`-taulun rakenne
- `supabase/migrations/20260605000002_profiles_is_admin.sql` — `profiles.is_admin` -sarake

### i18n
- `messages/fi.json` ja `messages/en.json` — Business-namespace; lisättävä admin-tekstit + rejection reason -näyttö

### Design system
- `app/globals.css` — `.glass`, `.glass-btn` utility-luokat
- `CLAUDE.md` — glassmorphism-suunnitteluohjeet, typografia

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app/business/page.tsx` — claim_status -värikoodi logiikka (pending=amber, approved=green, rejected=red) reusable `/admin`-sivulla
- `app/api/business/register/route.ts` — JWT-verified Route Handler -kaava; kopioitava kaikille admin API-routeille
- `lib/supabaseAdmin.server.ts` — service role client; pakollinen approve/reject-mutaatioille
- `lib/supabaseSSR.ts#createServerSupabase()` — Server Componentin Supabase; käytetään `is_admin`-tarkistukseen

### Established Patterns
- **Server Component auth guard:** `app/business/page.tsx` — `getUser()` + `maybeSingle()` check; uudelleenkäytettävä `/admin/page.tsx`:ssa (lisätään is_admin check)
- **Route Handler -kaava:** `Authorization: Bearer <JWT>` → `supabaseAdmin.auth.getUser(token)` → service role mutaatio
- **Glass UI:** `.glass rounded-2xl p-6` — admin-sivun listakortit

### Integration Points
- `app/api/business/claim-paikka/route.ts` — lisättävä Resend-kutsu (D-03)
- `app/api/business/create-paikka/route.ts` — lisättävä Resend-kutsu (D-03)
- `app/api/business/onboarding/submit/route.ts` — lisättävä Resend-kutsu (D-03)
- `app/business/rekisteroidy/page.tsx` — lisättävä `role_in_company` -kenttä (D-04)
- `app/business/page.tsx` — päivitettävä: `rejection_reason` näyttö + "Hae uudelleen" -nappi (D-08)
- `supabase/migrations/` — uusi migraatiotiedosto: `business_paikka_links.rejection_reason`, `business_accounts.role_in_company`

### Uudet tiedostot
- `app/admin/page.tsx` — Server Component, is_admin guard, pending-lista
- `app/admin/[id]/page.tsx` tai modaalikomponentti — onboarding-data detail view
- `app/api/admin/approve/route.ts` — POST, is_admin guard, claim_status → 'approved', published → true (uusille paikoille), Resend confirmation email
- `app/api/admin/reject/route.ts` — POST, is_admin guard, claim_status → 'rejected', rejection_reason tallennus, Resend rejection email
- `lib/resend.ts` tai `lib/email.ts` — Resend client + email helper functions

</code_context>

<specifics>
## Specific Ideas

- Admin-lista: sama glassmorphism-tyyli (`.glass rounded-2xl`) kuin muukin business UI
- Sähköpostiosoite jolle ilmoitukset menevät: `joona.orava@gmail.com` (kovakoodattu env-muuttujaan `ADMIN_EMAIL`)
- "Rooli yrityksessä" -kentän vaihtoehdot rekisteröintilomakkeessa: tekstikenttä (vapaa teksti) tai dropdown (Omistaja / Johtaja / Markkinointi / Muu) — Claude's discretion
- Hyväksymisen sivuvaikutus: `liikuntapaikat.published = true` (vain `link_type = 'created'` -tapauksessa); `link_type = 'claim'` -tapauksessa paikka on jo `published = true`

</specifics>

<deferred>
## Deferred Ideas

- Automaattinen admin-hyväksyntä (whitelist-domaineille) — ei Phase 35:ssä, manuaalinen hyväksyntä riittää
- Hakemuksen muokkausmahdollisuus ennen uudelleenlähetystä — lykätty Phase 36:een tai myöhemmin
- Useamman adminin tuki — `is_admin`-flag riittää v1.7:ssa

</deferred>

---

*Phase: 35-admin-hyvaksyntajarjestelma*
*Context gathered: 2026-06-10*
