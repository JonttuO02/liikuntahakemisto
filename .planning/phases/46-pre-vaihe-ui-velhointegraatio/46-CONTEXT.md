# Phase 46: Pre-vaihe UI & velhointegraatio - Context

**Gathered:** 2026-06-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Uusi "pre-vaihe" onboarding-virran alussa: käyttäjä syöttää verkkosivunsa URL:n, analyysi käynnistetään taustalla (Phase 45 API), frontend pollaa tulosta, onnistuneen analyysin jälkeen näytetään täysi korttipreview (CalloutCard, DiagonaalKortti, venue-sivu) brändidatalla, ja käyttäjä jatkaa velhoon jossa steps 3–5 on esitäytetty ja step 6 renderöi brändivärillä ja logolla. Kuluttajapuoli ei muutu.

</domain>

<decisions>
## Implementation Decisions

### Pre-vaihe arkkitehtuuri
- **D-PA-01:** Pre-vaihe toteutetaan uutena komponenttina `onboarding/page.tsx`:ssä state-kytkimellä (`'pre' | 'wizard'`). Kun state = `'pre'`, renderöidään uusi `AnalysoiSivusto`-komponentti. Kun state = `'wizard'`, renderöidään nykyinen `WizardInner`. URL pysyy `/business/onboarding` — ei uusia reittejä.
- **D-PA-02:** Brändidataa kuljetetaan React state -propina ylhäältä alas: `onboarding/page.tsx` omistaa `brandingData: BrandingResult | null` -tilan, joka välitetään `WizardInner`:ille propina, joka edelleen jakaa sen alaspäin `StepHinnasto`, `StepAukioloajat`, `StepYhteystiedot` ja `StepEsikatselu` -komponenteille. Ei ylimääräisiä Supabase-kyselyitä step-kohtaisesti.
- **D-PA-03:** Pre-vaihe tarkistaa mountissa onko analyysi jo tehty (GET `/api/business/analyze-website` → `status === 'analyzed'`). Jos kyllä, ohitetaan URL-syöttönäkymä ja näytetään suoraan esikatseluruutu. Jos ei, näytetään URL-syöttönäkymä.
- **D-PA-04:** "Ohita — täytä tiedot manuaalisesti" -nappi asettaa state `'wizard'` ja `brandingData = null`. WizardInner avautuu step 1:stä normaalisti; steps 3–5 ovat tyhjiä kuten ennenkin.

### Paikkainfo pre-vaiheessa
- **D-PI-01:** Paikka on jo linkitetty (`business_paikka_links` olemassa) kun pre-vaihe näytetään. Pre-vaihe lataa paikkainfon (nimi, osoite, laji, latitude, longitude) samoin kuin `WizardInner` nyt tekee — `business_paikka_links`-taulun kautta.

### Pollauksen UX
- **D-PU-01:** Analyysiprosessin aikana näytetään yksinkertainen spinner + teksti "Analysoidaan sivustoasi..." (ei vaiheistettua edistymistekstiä). "Ohita"-nappi pysyy näkyvissä koko pollauksen ajan.
- **D-PU-02:** Frontend pollaa `GET /api/business/analyze-website` 2 sekunnin välein, max 30 yritystä (= 60 sekunnin timeout).
- **D-PU-03:** Virhetilanne (`status = 'failed'`): näytetään suomenkielinen virheilmoitus + "Yritä uudelleen" -nappi (nollaa URL-syöttönäkymään) + "Ohita" -nappi.
- **D-PU-04:** Timeout (60s, status yhä `'analyzing'`): sama käyttäytyminen kuin `'failed'` — viesti "Analyysi kestää odotettua kauemmin — yritä uudelleen tai jatka manuaalisesti".

### Esikatseluruutu
- **D-ES-01:** Onnistuneen analyysin jälkeen pre-vaiheessa näytetään täysi korttipreview: `CalloutCard`, `DiagonaalKortti` ja venue-sivu-näkymä, kaikki samalla tasolla kuin step 6 — mutta brändidatalla (ei velhodraft-tilaa).
- **D-ES-02:** Erillinen `buildBrandingPreview(paikkaInfo, brandingData)` -apufunktio rakentaa preview-objektin. Ei laajenneta olemassa olevaa `buildDraftAsPaikka`:a.
- **D-ES-03:** Esikatselussa näkyy "Jatka velhoon →" -nappi (siirtää state `'wizard'`) sekä "Analysoi uudelleen" -linkki (palauttaa URL-syöttönäkymään).

### Step 6 brändirendering (StepEsikatselu)
- **D-BR-01:** `business_branding.logo_url` (Supabase Storage PNG) → `paikka.logo_url` preview-objektissa. Näkyy olemassa olevassa logo-slotissa (pieni 40×40 px neliö ylävasemmalla DiagonaalKortissa) — ei muutoksia komponenttirakenteeseen.
- **D-BR-02:** `colors[0]` (analysoitu pääväri) → DiagonaalKortin vasemman diagonaalin taustaväri (`backgroundColor: brandColor` vasemmalle panel-diville).
- **D-BR-03:** Tekstin luettavuus: `getContrastColor(brandColor)` -utiliteetti laskee YIQ-luminanssin ja palauttaa `'#000000'` tai `'#ffffff'`. Nimi + hinta -teksti saa tämän arvon tekstivärikseen kun `brandColor` on käytössä.
- **D-BR-04:** Fallback: jos brändidataa ei ole (käyttäjä ohitti tai analyysi epäonnistui), renderöinti palaa olemassa olevaan toimintaan — lajikohtainen väri `laji.color` sport pillin taustana, Building2-ikoni logo-slotissa.

### Velhointegraatio (steps 3–5)
- **D-WI-01:** `StepHinnasto` (step 3): jos `brandingData?.prices` on saatavilla, esitäytetään rivirivi muokattavina kenttinä. Käyttäjä voi muokata tai poistaa rivejä ennen tallennusta.
- **D-WI-02:** `StepAukioloajat` (step 4): jos `brandingData?.opening_hours` on saatavilla, esitäytetään päiväkohtaiset ajat. Käyttäjä voi muokata.
- **D-WI-03:** `StepYhteystiedot` (step 5): `brandingData?.website_url` esitäyttää website-kentän.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Vaatimukset
- `.planning/REQUIREMENTS.md` §ONBOARD-08–13, §PREV-01 — kaikki Phase 46 -vaatimukset
- `.planning/ROADMAP.md` §"Phase 46: Pre-vaihe UI & velhointegraatio" — success criteria ja phase goal

### Phase 45 API-sopimus
- `.planning/phases/45-scraper-claude-api-putki/45-CONTEXT.md` — D-04 (async fire-and-forget), D-05 (waitUntil), D-06 (GET polling route), D-15–16 (UPSERT + status machine)

### Olemassa olevat komponentit
- `app/business/WizardInner.tsx` — onboarding/edit-tilojen rakenne, draft-latauslogiikka, step-navigaatio. Pre-vaihe wrap-paa tämän.
- `app/business/onboarding/page.tsx` — muutetaan tässä vaiheessa lisäämään pre-vaihe state.
- `app/business/onboarding/StepHinnasto.tsx` — step 3, tulee saada `initialPrices?: PriceRow[]` propina.
- `app/business/onboarding/StepAukioloajat.tsx` — step 4, tulee saada `initialHours?: HoursRow[]` propina.
- `app/business/onboarding/StepYhteystiedot.tsx` — step 5, tulee saada `initialWebsiteUrl?: string` propina.
- `app/business/onboarding/StepEsikatselu.tsx` — step 6, tulee saada `brandingData?: BrandingResult` propina.
- `app/components/DiagonaalKortti.tsx` — logo-slot (rivi 88), vasemman diagonaalin div (rivi 80–83). `brandColor`-prop lisätään.

### API-reitit
- `app/api/business/analyze-website/route.ts` — POST käynnistää analyysin, GET palauttaa statuksen (`{ status, logo_url, colors, logo_type, raw_analysis, error_message }`)

### Tietokantaskeema
- `supabase/migrations/20260615000001_business_branding.sql` — `business_branding`-taulun DDL
- `supabase/migrations/20260616000001_business_media_bucket.sql` — business-media Storage bucket

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app/business/WizardInner.tsx` `loadDraft()` — paikkainfo-latauslogiikka (`business_paikka_links` → `liikuntapaikat`). Pre-vaihe tarvitsee saman logiikan; siirretään tai jaetaan.
- `lib/onboardingUtils.ts` `buildDraftAsPaikka` — esikuva `buildBrandingPreview`-funktiolle.
- `app/components/DiagonaalKortti.tsx` rivi 88 — logo-slot, käyttää `paikka.logo_url`.
- `app/api/business/onboarding/submit/route.ts` — JWT-verifikaatiomalli (`supabaseAdmin.auth.getUser(token)`), kopioitavissa pre-vaiheen fetch-kutsuihin.

### Established Patterns
- Onboarding-virta: state-kytkin `onboarding/page.tsx`:ssä on tunnettu pattern (`WizardInner` mode-prop). Pre-vaiheen `'pre' | 'wizard'` state lisätään samaan tiedostoon.
- Framer Motion AnimatePresence: käytössä WizardInner:ssä step-siirtymissä. Sama pattern pre-vaiheen → velhosiirtymälle.
- Pollaus: `setInterval`-pohjainen pollaus on projektin standardi (ei react-query). Poistetaan `clearInterval` cleanup-funktiossa.
- Business-auth: `createBusinessBrowserClient()` kaikissa client-puolen business-komponenteissa.

### Integration Points
- `onboarding/page.tsx` sisältää jatkossa: pre-vaihe state, paikkainfo-lataus, brandingData state, komponenttikytkentä pre vs. wizard.
- `WizardInner.tsx` saa uuden optional prop `brandingData?: BrandingResult` joka välitetään alaspäin. Ei muita rakenteellisia muutoksia WizardInner:iin.
- `DiagonaalKortti.tsx` saa optional prop `brandColor?: string` — käytetään vasemman diagonaalin backgroundColor:ina ja laukaistaan `getContrastColor`-utiliteetin käyttö.
- `GET /api/business/analyze-website` — pre-vaihe pollaa tätä; yhteys Phase 45 koodiin.

</code_context>

<specifics>
## Specific Ideas

- Pre-vaihe: kolme näkymää (state machine sisällä komponentissa):
  1. `url-input` — URL-kenttä + "Analysoi"-nappi + "Ohita"-nappi
  2. `analyzing` — spinner + "Analysoidaan sivustoasi..." + "Ohita"-nappi (pollaa taustalla)
  3. `preview` — täysi korttipreview (CalloutCard + DiagonaalKortti + venue-sivu) + "Jatka velhoon →" + "Analysoi uudelleen"-linkki

- `getContrastColor(hex: string): '#000000' | '#ffffff'` — YIQ-kaava:
  ```ts
  const [r, g, b] = hexToRgb(hex)
  const yiq = (r * 299 + g * 587 + b * 114) / 1000
  return yiq >= 128 ? '#000000' : '#ffffff'
  ```

- `buildBrandingPreview(paikkaInfo, brandingData)` palauttaa objektin joka on yhteensopiva `DiagonaalKortti`/`CalloutCard` prop-tyypeillä, lisättynä `brandColor` ja `logo_url` kentillä.

- Ohita-teksti: "Ohita — täytä tiedot manuaalisesti" (suomeksi, sama tyyli kuin muut sekundaarinapit velhossa)

- Analyysin uudelleenajo: "Analysoi uudelleen" -linkki (ei nappi) esikatselussa palauttaa `url-input` -näkymään.

</specifics>

<deferred>
## Deferred Ideas

- Analyysin uudelleenajo onboarding-jälkeen (edit-flow) — deferred post-v2.1.
- Tulosten manuaalinen muokkaus esikatselussa (värien korjaus käsin, logon vaihtaminen) — käyttäjä muokkaa step 3–5:ssä manuaalisesti.
- CalloutCard -komponentin brändivärituki — Phase 46 priorisoi DiagonaalKortin; CalloutCard voi pysyä nykyisessä tyylissään ellei toteutus ole triviaali.

</deferred>

---

*Phase: 46-Pre-vaihe UI & velhointegraatio*
*Context gathered: 2026-06-15*
