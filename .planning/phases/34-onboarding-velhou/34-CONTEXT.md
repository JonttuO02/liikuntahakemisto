# Phase 34: Onboarding-velhou - Context

**Gathered:** 2026-06-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Ensimmäistä kertaa kirjautunut yritys käy läpi 6-vaiheisen ohjatun velhon (`/business/onboarding`) ja toimittaa kaikki tarvittavat tiedot: paikka → mediat → hinnasto → aukioloajat → yhteystiedot → esikatselu. Velhousta ei voi ohittaa; pakolliset vaiheet on täytettävä ennen kuin hallintapaneeli avautuu.

Vaatimukset: ONBOARD-01, ONBOARD-02, ONBOARD-03, ONBOARD-04, ONBOARD-05, ONBOARD-06, ONBOARD-07

</domain>

<decisions>
## Implementation Decisions

### Wizard trigger & routing

- **D-01:** Claim-paikka- ja create-paikka-submit ohjaa suoraan `/business/onboarding` — ei jäädä pending-placeholderiin. Phase 33:n placeholder korvautuu tällä redirectillä.
- **D-02:** Vaiheet seurataan URL query paramilla: `/business/onboarding?step=N` (1–6). Komponentti lukee `useSearchParams()`. Selain back/forward toimivat oikein.
- **D-03:** `onboarding_completed` boolean lisätään `business_accounts`-tauluun. Asetetaan `true` kun Step 6 (Esikatselu) submitataan. `/business`-sivu tarkistaa tämän ja ohjaa joko velhoon tai hallintapaneeliin.
- **D-04:** Aiemmin täytetyt vaiheet ovat uudelleen avattavissa (edistymispalkki näyttää valmiit vaiheet klikattavina). Validointi vain eteenpäin liikuttaessa.

### Data persistence — onboarding_draft

- **D-05:** Wizard-data tallennetaan askel kerrallaan erilliseen `onboarding_draft`-tauluun (ei suoraan `liikuntapaikat`). Isolaatio: live-data pysyy koskemattomana kunnes submit on valmis.
- **D-06:** Step 6 (Esikatselu) -submitin Route Handler kopioi draft-kentät atomisesti `liikuntapaikat`-riville ja asettaa `onboarding_completed = true`. Draft-rivi poistetaan onnistuneen kopioinnin jälkeen.
- **D-07:** Wizard lataa olemassa olevan `onboarding_draft`-rivin mountissa — palaa viimeisimpään kesken jääneeseen vaiheeseen jos draft on olemassa. Edistymispalkki renderöityy datan mukaan.

### Media upload (Step 2)

- **D-08:** Kaksi erillistä upload-aluetta: **logo** (1 tiedosto, neliöesikatselu) + **kuvat** (1–5 tiedostoa, vaakasuuntainen thumbnail-rivi). Visuaalisesti selkeästi erotettu.
- **D-09:** Drag-and-drop -vyöhyke + click-fallback molemmissa alueissa. Dotted border drop zone; dragattu tai klikattu tiedosto lisätään esikatseluun.
- **D-10:** Upload tapahtuu "Seuraava"-klikkauksen yhteydessä (ei heti valinnassa). Edistymispalkki näkyy uploadauksen ajan. Seuraava-nappi ei aktivoidu ennen kuin upload on valmis.
- **D-11:** Tiedostot tallennetaan `business-media`-buckettiin. Polkurakenne: `{business_account_id}/{paikka_id}/photos/` ja `{business_account_id}/{paikka_id}/logo/`. Tallennetut URL:t kirjoitetaan `onboarding_draft`-kenttiin.

### Pricing input (Step 3 — Hinnasto)

- **D-12:** Kiinteät kategoriarivit ensin: Kertakäynti / Kuukausijäsenyys / 10-kerran kortti / Vuosijäsenyys. Jokainen rivi: kategorialabel + hintakenttä (€) + valinnainen lisätieto. Tyhjät rivit ohitetaan tallennuksessa.
- **D-13:** "+ Lisää hintarivi" -nappi lisää vapaaehtoisen vapaamuotoisen rivin (käyttäjä itse nimeää). Ainakin yksi rivi (kiinteä tai vapaa) täytettynä ennen kuin voi jatkaa.
- **D-14:** Hinnasto tallennetaan `onboarding_draft`-tauluun JSONB-kenttänä. Mergetään `liikuntapaikat.hinnasto`-kenttään Step 6 -submitissa.

### Opening hours input (Step 4 — Aukioloajat)

- **D-15:** 7 riviä (Ma–Su). Jokainen rivi: päivän nimi + "Auki"-toggle + aloitusaika-input + lopetusaika-input. Jos Google Places -data on saatavilla, esitäytetään.
- **D-16:** Aukioloajat tallennetaan `onboarding_draft`-tauluun JSONB-kenttänä. Mergetään `liikuntapaikat`-rivisiin Step 6 -submitissa.

### Preview step (Step 6)

- **D-17:** Esikatselu käyttää `onboarding_draft`-datan live-renderöintiä — näyttää PaikkaKortin, DiagonaalKortin ja PaikkaSheetin yrityksen tiedoilla. Data haetaan clientiltä ennen renderöintiä.
- **D-18:** "Lähetä hyväksyttäväksi" -nappi Step 6:ssa käynnistää Route Handlerilla: (1) kopioi draft → liikuntapaikat atomisesti, (2) asettaa `onboarding_completed = true`, (3) poistaa draft-rivin, (4) redirectaa `/business` -sivulle joka nyt näyttää pending-tilan.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Vaatimukset ja tiekartta
- `.planning/REQUIREMENTS.md` — ONBOARD-01–07 (Phase 34 requirements)
- `.planning/ROADMAP.md` §Phase 34 — Success criteria ja phase details

### Prior phase decisions (perusta)
- `.planning/phases/31-db-skeema-storage-perusta/31-CONTEXT.md` — `business_accounts`, `business_paikka_links`, `business-media` bucket, RLS-politiikat
- `.planning/phases/32-yritysrekisterointi-auth/32-CONTEXT.md` — `/api/business/register` Route Handler -kaava (JWT + supabaseAdmin + atominen virheenkäsittely)
- `.planning/phases/33-claim-paikan-luonti/33-CONTEXT.md` — claim/create-virta, `published`-sarake, D-12 (submit-jälkeinen redirect-paikka nyt muuttuu → `/business/onboarding`)

### Olemassa oleva infrastruktuuri
- `app/business/page.tsx` — redirecti `/business/onboarding` lisättävä kun `onboarding_completed = false`
- `app/api/business/register/route.ts` — JWT-vahvistus + supabaseAdmin + atominen virheenkäsittely; kaikki uudet Route Handlerit seuraavat tätä kaavaa
- `app/api/business/claim-paikka/route.ts` ja `app/api/business/create-paikka/route.ts` — submitin jälkeinen redirect muutetaan `/business/onboarding`-osoitteeseen
- `lib/supabaseAdmin.server.ts` — service role client (pakollinen kaikille wizard Route Handlereille)
- `lib/supabaseSSR.ts` — `createServerSupabase()` Server Componentille

### UI-komponentit (reuse)
- `app/components/PaikkaKortti.tsx` — käytetään Step 6 esikatselussa
- `app/components/DiagonaalKortti.tsx` — käytetään Step 6 esikatselussa
- `app/components/PaikkaSheet.tsx` — käytetään Step 6 esikatselussa

### i18n
- `messages/fi.json` ja `messages/en.json` — kaikki wizard-tekstit lisättävä Business-namespaceen

### Design system
- `app/globals.css` — `.glass`, `.glass-hover`, `.glass-btn` utility-luokat; käytettävä wizard-UI:ssa
- `CLAUDE.md` — glassmorphism-suunnitteluohjeet, typografia, animaatioperiatteet

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app/components/PaikkaKortti.tsx`, `DiagonaalKortti.tsx`, `PaikkaSheet.tsx` — Step 6 esikatselussa; ne vaativat `Liikuntapaikka`-tyyppisen objektin, joka rakennetaan draft-datasta
- `app/api/business/register/route.ts` — JWT + supabaseAdmin + atominen INSERT -kaava; kaikki wizard Route Handlerit seuraavat tätä
- Kaupunki-dropdown (Tampere/Helsinki/Turku) — jo olemassa hakupaneelissa; uudelleenkäytettävä Step 1:ssä

### Established Patterns
- **Route Handler -kaava:** Authorization header JWT → `supabaseAdmin.auth.getUser(token)` → supabaseAdmin mutaatio → virheenkäsittely
- **Glass UI:** `.glass rounded-2xl p-6` — wizard-vaiheiden visuaalinen tyyli
- **Client Component + useEffect/useState:** `app/business/page.tsx` — sama kaava wizard-sivulle (business-auth vaatii client-side session)
- **i18n:** `useTranslations('Business')` — kaikki uudet tekstit Business-namespaceen

### Integration Points
- `app/business/page.tsx` — lisättävä `onboarding_completed`-tarkistus ja redirect `/business/onboarding`
- `app/api/business/claim-paikka/route.ts` ja `create-paikka/route.ts` — muutettava redirect-kohde Phase 33:n `/business` → `/business/onboarding`
- `supabase/migrations/` — uusi migraatiotiedosto: `onboarding_draft`-taulu + `onboarding_completed`-sarake `business_accounts`-tauluun
- `messages/fi.json` + `messages/en.json` — wizard-tekstit Business-namespaceen

### Uudet DB-rakenteet (tutkittavaksi)
- `onboarding_draft`-taulun skeema: `business_account_id`, `paikka_id`, vaihekohtaiset JSONB-kentät (`media_urls`, `hinnasto`, `aukioloajat`, `yhteystiedot`), `current_step int`, `updated_at`
- `business_accounts`-taulu: lisättävä `onboarding_completed BOOLEAN NOT NULL DEFAULT false`
- RLS `onboarding_draft`-tauluun: `USING (auth.uid() = business_account_id)` — sama kaava kuin `business_paikka_links`

</code_context>

<specifics>
## Specific Ideas

- Edistymispalkki: numeroitu vaiheindikaattori (1–6) wizard-yläreunassa; valmiit vaiheet täytetty/checkmark-ikoni, nykyinen korostettu, tulevat muted
- Drag-and-drop upload: dotted border -vyöhyke; dragatessa vyöhyke korostuu (`border-[#111111]`); pudotettu tiedosto lisätään thumbnail-esikatseluna
- Upload progress: yksinkertainen progress bar (Tailwind `w-[{pct}%]` transition) koko uploadauksen ajan — ei per-tiedosto
- Step 6 esikatselu: kolme rinnakkaista esikatselua (PaikkaKortti / DiagonaalKortti / PaikkaSheet) glassmorphism-kortteina
- "Lähetä hyväksyttäväksi" -nappi Step 6:ssa: `bg-[#111111] text-white` — pääprimary-CTA, sama tyyli kuin olemassa oleva rekisteröintipainike

</specifics>

<deferred>
## Deferred Ideas

- Laji-valinta Step 1:ssä — paikan laji syötetään jo Phase 33:ssa tai voitaisiin lisätä; mutta ONBOARD-vaatimukset eivät mainitse lajia erikseen → researcher selvittää onko `laji`-kenttä jo olemassa Phase 33:n create-paikka-datan perusteella
- Kuvien järjestyksen muokkaus drag-and-drop:lla Step 2:ssa — lykätty, yksinkertainen järjestys (latausjärjestys) riittää Phase 34:ssa
- Sähköpostivahvistus submit-hetkellä yritykselle — Phase 35 (Admin-hyväksyntäjärjestelmä) hoitaa tämän

</deferred>

---

*Phase: 34-onboarding-velhou*
*Context gathered: 2026-06-06*
