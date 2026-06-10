# Phase 32: Yritysrekisteröinti & auth - Context

**Gathered:** 2026-06-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Yritys pystyy luomaan tilin (`/business/rekisteroidy`) ja kirjautumaan sisään (olemassa olevalla AuthModalilla), jonka jälkeen se ohjataan automaattisesti `/business`-hallintapaneeliin. Tavallinen käyttäjä ei ohjaudu `/business`-sivulle. `/business/page.tsx` on Phase 32:ssa stub-sivu — varsinainen hallintapaneeli toteutetaan Phase 36:ssa.

Vaatimukset: BIZ-01, BIZ-03

</domain>

<decisions>
## Implementation Decisions

### Rekisteröintilomake
- **D-01:** Erillinen sivu `/business/rekisteroidy` — ei modal. Kentät: yritysnimi (text), sähköposti (email), salasana (password).
- **D-02:** Ei NavBar-linkkiä v1.7:ssä — sivu on olemassa suoralla URL:lla mutta ei näy navigaatiossa (linkitetään myöhemmin markkinointisivuun).
- **D-03:** Ei Google OAuth yrityksille — vain sähköposti + salasana. Google OAuth sopii huonosti kun tarvitaan yritysnimi-kenttä rekisteröinnissä.

### Kirjautumispolku
- **D-04:** Yritys käyttää samaa `AuthModal`-komponenttia kuin tavalliset käyttäjät — ei erillistä kirjautumissivua yrityksille.
- **D-05:** Aina kun business-käyttäjä kirjautuu (mistä tahansa, myös etusivulta), ohjataan `/business`-sivulle — `router.push('/business')` AuthModal:in `onSuccess`-callbackissa. Ei kontekstiriippuvaista logiikkaa.

### Redirect-logiikka
- **D-06:** Client-side tarkistus AuthModal `onSuccess`-callbackissa: `SELECT 1 FROM business_accounts WHERE user_id = uid`. Jos rivi löytyy → `router.push('/business')`. Jos ei löydy → normaali käyttäjävirta (ei redirect).
- **D-07:** `/business/page.tsx` on Phase 32:ssa yksinkertainen stub ("Tervetuloa hallintapaneeliin — tulossa pian"). Phase 36 korvaa tämän varsinaisella sisällöllä.
- **D-08:** `/business`-reitti ei tarvitse middleware-suojaa Phase 32:ssa — stub-sivu voi olla kirjautumattomille näkyvissä, koska varsinainen sisältö (Phase 36) lisää suojauksen. Prioriteetti on redirect-toiminnallisuus, ei reitin suojaaminen.

### business_accounts-rivin luonti
- **D-09:** Rekisteröinnin flow: (1) `supabase.auth.signUp({email, password})`, (2) jos onnistuu: POST `/api/business/register` joka tekee `supabaseAdmin.from('business_accounts').insert({user_id, company_name})`. Service role key ohittaa RLS.
- **D-10:** Atomisuus-virheenkäsittely: jos `business_accounts` INSERT epäonnistuu signUp:n jälkeen → `supabaseAdmin.auth.admin.deleteUser(uid)` ja virheilmoitus käyttäjälle. Auth-tili ei jää orvoksi. Käyttäjä voi yrittää uudelleen.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Vaatimukset ja tiekartta
- `.planning/REQUIREMENTS.md` — BIZ-01, BIZ-03 (Phase 32 requirements)
- `.planning/ROADMAP.md` §Phase 32 — Success criteria ja phase details

### Phase 31 päätökset (DB-skeema — tarvitaan tässä vaiheessa)
- `.planning/phases/31-db-skeema-storage-perusta/31-CONTEXT.md` — `business_accounts`-taulun sarakkeet (D-01), RLS-politiikat (D-16–D-18)

### Olemassa oleva auth-infrastruktuuri (seuraa näitä malleja)
- `app/components/AuthModal.tsx` — olemassa oleva kirjautumis/rekisteröinti-modal; Phase 32 laajentaa `onSuccess`-callbackia business-tarkistuksella
- `lib/supabaseSSR.ts` — `createBrowserSupabase()` (client), `createServerSupabase()` (server); huom. `createBrowserSupabase` käyttää `createClient` (localStorage), ei `@supabase/ssr:n createBrowserClient` (tunnettu hanging-ongelma)
- `lib/supabaseAdmin.server.ts` — `supabaseAdmin` service role client — käytettävä `/api/business/register` routessa

### Olemassa olevat API route -mallit
- `app/api/saasuositus/route.ts` — Route Handler -rakenne (Next.js 14 App Router)
- `app/api/hae-paikat/route.ts` — Authorization-suojattu Route Handler

### RLS-mallit (business_accounts-tauluun on jo kirjoitettu RLS Phase 31:ssä)
- `supabase/migrations/20260528083110_profiles.sql` — user_id FK → auth.users, SELECT/INSERT/UPDATE policies

### i18n
- `messages/fi.json` ja `messages/en.json` — kaikki uudet UI-tekstit lisättävä molempiin

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app/components/AuthModal.tsx` — uudelleenkäytettävä sellaisenaan kirjautumiseen; `onSuccess`-callback laajennettavissa business-tarkistuksella
- `lib/supabaseSSR.ts#createBrowserSupabase` — client-side Supabase, käytettävä business-tarkistuskyselyssä
- `lib/supabaseAdmin.server.ts#supabaseAdmin` — server-side admin client, käytettävä `/api/business/register`:ssa
- `app/components/NavBar.tsx` — sivunvaihto-navigaatio; ei muutoksia Phase 32:ssa (ei linkkiä rekisteröintisivulle)

### Established Patterns
- **Server Route Handler**: `app/api/*/route.ts` — Next.js App Router Route Handlers POST-requesteille
- **Auth-tarkistus client-side**: `subscribeToAuthUser()` + `createBrowserSupabase()` — sama kaava `/api/business/register`-kutsun käynnistämiseen
- **Error mapping**: `AuthModal.tsx:mapError()` — virhekoodien muunto suomenkielisiksi teksteiksi; sama kaava rekisteröintisivulle
- **Glass UI**: `.glass`, `.glass-btn`, `rounded-2xl` — käytettävä rekisteröintilomakkeessa; sama visuaalinen tyyli kuin AuthModal

### Integration Points
- `AuthModal.tsx:onSuccess` — lisättävä `SELECT 1 FROM business_accounts` -tarkistus ja conditional `router.push('/business')`
- `app/business/page.tsx` — uusi sivu (stub), luotava Phase 32:ssa
- `app/business/rekisteroidy/page.tsx` — uusi rekisteröintisivu
- `app/api/business/register/route.ts` — uusi POST-endpoint; signUp + business_accounts INSERT

</code_context>

<specifics>
## Specific Ideas

- `/business/rekisteroidy`-sivu seuraa AuthModal:in visuaalista tyyliä: `.glass rounded-2xl p-6`, sama kenttätyyli (`border border-[rgba(0,0,0,0.12)] rounded-lg h-10 px-3`), sama painike-tyyli (`bg-[#111111] rounded-full`)
- `/business`-stubin teksti yksinkertainen: "Tervetuloa hallintapaneeliin — ominaisuudet lisätään pian"

</specifics>

<deferred>
## Deferred Ideas

- Google OAuth yrityksille — vaatisi post-OAuth yritysnimi-kentän, monimutkaisempi virta; siirretty tulevaisuuteen
- `/business`-reitin middleware-suojaus (kirjautumaton ei pääse sisään) — tehdään Phase 36:ssa kun sisältöä on
- NavBar-linkki "Rekisteröi yrityksesi" — lisätään kun markkinointisivu valmis (future)

</deferred>

---

*Phase: 32-yritysrekisterointi-auth*
*Context gathered: 2026-06-05*
