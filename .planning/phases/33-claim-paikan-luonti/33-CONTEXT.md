# Phase 33: Claim & paikan luonti - Context

**Gathered:** 2026-06-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Yritys pystyy joko ottamaan haltuunsa olemassa olevan paikan (claim) tai luomaan uuden. `/business`-sivu korvaa Phase 32:ssa tehdyn stubin claim/luonti-UI:lla. Näkyvyyssäännöt toteutetaan: claim-paikka pysyy näkyvänä, uusi paikka `published = false` kunnes admin hyväksyy (Phase 35). DB-migraatio lisää `published`-sarakkeen (Phase 31:stä siirretty).

Vaatimukset: CLAIM-01, CLAIM-02, CLAIM-03

</domain>

<decisions>
## Implementation Decisions

### UI-sijoittelu & virta
- **D-01:** `/business/page.tsx` korvaa Phase 32:n stubin — Phase 33 rakentaa claim/luonti-näkymän suoraan `/business`-reitille. Erillistä `/business/claim`-sivua ei tarvita.
- **D-02:** `app/business/page.tsx` on **Server Component** — `business_paikka_links`-tarkistus tehdään palvelimella (ei client-side fetch + flikkeri). Sama kaava kuin `app/paikat/[id]/page.tsx`.
- **D-03:** Tarkistuslogiikka: `SELECT 1 FROM business_paikka_links WHERE business_account_id = uid LIMIT 1`. Jos **ei rivejä** → näytetään claim/luonti-UI. Jos **rivejä on** → näytetään tilaplaceholder ("Hakemuksesi on vastaanotettu — paikka [Nimi] — odottaa admin-hyväksyntää"). Phase 34/35/36 korvaavat tämän tilaplaceholderin.

### Paikkahaku-UX
- **D-04:** Haku on **real-time debounced** (300ms) — Supabase `ilike`-kysely suoraan clientiltä ilman API-routea. Sama kaava kuin olemassa oleva hakupaneeli (SearchPanel).
- **D-05:** Hakukentät: **nimi** (text input) + **kaupunki** (dropdown: Tampere / Helsinki / Turku). Kaupunki-dropdown käyttää samaa rakennetta kuin olemassa oleva city-filter.
- **D-06:** Tulokset näytetään **listana korteilla** (max 8) — nimi, osoite, laji. Klikki valitsee paikan ja siirtyy claim-vahvistukseen.
- **D-07:** Jos paikka on jo jonkun hallussa → "Jo hallittu" -merkki + klikki disabled. Tarkistus vaatii jonkin mekanismin jolla voidaan tarkistaa muiden yritysten linkit (RLS-ongelma — researcher selvittää sopivan ratkaisun: julkinen `is_claimed` boolean liikuntapaikat-taulussa, tai server-side tarkistus).

### Uuden paikan minimikentät
- **D-08:** Phase 33 kerää uuden paikan luomiseen vain minimaalin setin: **nimi** (text), **osoite** (text), **kaupunki** (dropdown Tampere/Helsinki/Turku). Phase 34 onboarding-velhou kerää loput (kuvat, hinnasto, aukioloajat, yhteystiedot).
- **D-09:** DB-migraatio Phase 33:ssa: `ALTER TABLE liikuntapaikat ADD COLUMN published BOOLEAN NOT NULL DEFAULT true`. Uusille paikoille asetetaan `published = false` luontivaiheessa. `hae-paikat` API (`app/api/hae-paikat/route.ts` + `app/api/admin/sync-paikat/route.ts`) lisää `.eq('published', true)` -suodattimen — niin että `published = false` paikat eivät näy käyttäjille.
- **D-10:** Luonti tallennetaan **POST `/api/business/create-paikka` Route Handler** — JWT-vahvistus ensin; atominen: (1) `INSERT INTO liikuntapaikat` (`published = false`) → (2) `INSERT INTO business_paikka_links` (`link_type = 'created'`, `claim_status = 'pending'`). Service role key. Sama kaava kuin `/api/business/register`.

### Claim-tallennus
- **D-11:** Claim tallennetaan **POST `/api/business/claim-paikka` Route Handler** — JWT-vahvistus; `INSERT INTO business_paikka_links` (`paikka_id`, `link_type = 'claim'`, `claim_status = 'pending'`). Ei muuteta olemassa olevan paikan `published`-tilaa (paikka pysyy näkyvänä).

### Submit-jälkeinen UX
- **D-12:** Sekä claim- että create-submitin jälkeen: **redirect `/business`** (router.push tai revalidatePath + redirect). Sivu renderöituu uudelleen Server Componenttina ja näyttää nyt tilaplaceholderin (D-03): paikan nimi + "odottaa admin-hyväksyntää".
- **D-13:** Yhtenäinen kokemus molemmille poluille — ei erillisiä kiitossivuja tai inline-viestejä.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Vaatimukset ja tiekartta
- `.planning/REQUIREMENTS.md` — CLAIM-01, CLAIM-02, CLAIM-03 (Phase 33 requirements)
- `.planning/ROADMAP.md` §Phase 33 — Success criteria ja phase details

### Prior phase decisions (DB-skeema)
- `.planning/phases/31-db-skeema-storage-perusta/31-CONTEXT.md` — `business_paikka_links`-sarakkeet (D-04, D-05, D-06, D-07), RLS-politiikat (D-16–D-18), `published`-sarakkeen siirto Phase 33:lle (Deferred-osio)
- `.planning/phases/32-yritysrekisterointi-auth/32-CONTEXT.md` — `/api/business/register` Route Handler -kaava (D-09, D-10), `/business/page.tsx` stub (D-07)

### Olemassa oleva auth & API-infrastruktuuri
- `app/business/page.tsx` — Phase 32:n stub; Phase 33 korvaa tämän
- `app/api/business/register/route.ts` — JWT-vahvistus + supabaseAdmin INSERT -kaava; seuraa tätä `/api/business/claim-paikka` ja `/api/business/create-paikka`
- `lib/supabaseAdmin.server.ts` — service role client; pakollinen molemmille uusille Route Handlereille
- `lib/supabaseSSR.ts` — `createServerSupabase()` Server Componentille (business_paikka_links check)

### Olemassa oleva hakuinfrastruktuuri (seuraa näitä kaavoja)
- `app/components/SearchPanel.tsx` (tai vastaava) — real-time debounced haku -kaava
- `app/page.tsx` — kaupunki-filtteri (city dropdown) toteutettu täällä tai lähikompissa

### Julkinen paikkakysely (published-suodatin lisätään tähän)
- `app/api/hae-paikat/route.ts` — lisättävä `.eq('published', true)` suodatin
- `app/api/admin/sync-paikat/route.ts` — jo suodattaa `business_managed = true`; tarkista lisätäänkö myös `published` suodatin

### i18n
- `messages/fi.json` ja `messages/en.json` — kaikki uudet UI-tekstit lisättävä; Business-namespace jo olemassa

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app/business/page.tsx` — Server Component stub; korvattava Phase 33:ssa
- `app/api/business/register/route.ts` — JWT-vahvistus + supabaseAdmin + atominen virheenkäsittely; kopioitava kaava uusiin Route Handlereihin
- `lib/supabaseSSR.ts#createServerSupabase()` — Server Componentin Supabase-asiakas; business_paikka_links-tarkistukseen
- Kaupunki-filtteri (dropdown Tampere/Helsinki/Turku) — jo olemassa hakupaneelissa; uudelleenkäytettävä

### Established Patterns
- **Server Component + palvelinpuolen fetch:** `app/paikat/[id]/page.tsx` — hae data palvelimella, renderöi suoraan
- **Route Handler -kaava:** `app/api/business/register/route.ts` — Authorization header JWT + supabaseAdmin + virheenkäsittely
- **Real-time debounced haku:** SearchPanel tai vastaava — käyttää Supabase ilike -kyselyä suoraan clientiltä
- **Glass UI:** `.glass rounded-2xl p-6` — claim/luonti-lomakkeen visuaalinen tyyli

### Integration Points
- `app/business/page.tsx` — korvattava claim/luonti-UI:lla; lisättävä `business_paikka_links` -tarkistus
- `app/api/hae-paikat/route.ts` — lisättävä `.eq('published', true)` suodatin
- `supabase/migrations/` — uusi migraatiotiedosto `published`-sarakkeelle
- `messages/fi.json` + `messages/en.json` — Business-namespace; lisättävä claim/luonti-tekstit

### RLS-rajoitus (researcher selvitettävä)
`business_paikka_links` SELECT-policy (`USING (auth.uid() = business_account_id)`) estää kirjautunutta business-käyttäjää näkemästä muiden yritysten linkkejä. "Jo hallittu" -tarkistus hakutuloksissa vaatii joko:
- Julkinen `is_claimed BOOLEAN` -sarake `liikuntapaikat`-taulussa (asetetaan trigger/Route Handlerissa claim-luonnin yhteydessä), tai
- Server-side tarkistus Route Handlerissa service role keylla

Researcher päättää sopivimman lähestymistavan.

</code_context>

<specifics>
## Specific Ideas

- `/business`-sivu claim-tilassa: sama glassmorphism-tyyli kuin rekisteröintisivu (`.glass rounded-2xl p-6`); hakukenttä + kaupunki-dropdown + tuloskorttilista alla
- Tilaplaceholder (pending-tila): yksinkertainen informaatiokortti paikan nimellä + "Hakemuksesi on vastaanotettu — odottaa admin-hyväksyntää" + sähköpostivahvistusmaininta
- "Jo hallittu" -merkki tuloskorteissa: muted-teksti `text-[rgba(17,17,17,0.45)]` + disabled-asetus; ei punainen virheteksti (ei virhe, vain tietoa)

</specifics>

<deferred>
## Deferred Ideas

- Laji-kenttä uuden paikan luomisessa — siirretty, nimi+osoite+kaupunki riittää Phase 33:ssa; Phase 34 onboarding-velhou kerää lajin
- Redirect suoraan Phase 34 onboarding-velhoon claim/create-submitin jälkeen — Phase 34 ei ole vielä rakennettu Phase 33:n aikana; toteutetaan kun Phase 34 on valmis
- `/business`-reitin middleware-suojaus kirjautumattomilta — Phase 36:ssa kun varsinainen hallintapaneeli on valmis (sama päätös kuin Phase 32 D-08)

</deferred>

---

*Phase: 33-claim-paikan-luonti*
*Context gathered: 2026-06-05*
