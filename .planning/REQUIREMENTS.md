# Requirements — Liikuntahakemisto v1.7

**Milestone:** v1.7 Yritysportaali
**Status:** Active
**Last updated:** 2026-06-05

## v1.7 Requirements

### Yritystili & Auth (BIZ)

- [ ] **BIZ-01**: Yritys voi rekisteröityä palveluun erillisellä lomakkeella (yritysnimi, sähköposti, salasana)
- [ ] **BIZ-02**: `business_accounts`-taulu linkittää Supabase Auth -käyttäjän yritykseen; `business_paikka_links` yhdistää useita paikkoja yhteen tiliin
- [ ] **BIZ-03**: Kirjautunut yritys ohjataan automaattisesti `/business`-hallintapaneeliin

### Paikan haltuunotto & luonti (CLAIM)

- [ ] **CLAIM-01**: Yritys voi hakea olemassa olevaa paikkaa nimellä tai osoitteella ja lähettää claim-pyynnön
- [ ] **CLAIM-02**: Jos paikkaa ei löydy hakemistosta, yritys voi luoda uuden paikan
- [ ] **CLAIM-03**: Claim-paikka pysyy näkyvänä käyttäjille; uusi paikka piilotettu (`published = false`) kunnes admin hyväksyy

### Ohjattu onboarding-velhou (ONBOARD)

- [ ] **ONBOARD-01**: Ensimmäisellä kirjautumisella käynnistyy automaattisesti vaiheistettu onboarding-velhoui — ei voi ohittaa ennen kuin kaikki pakolliset vaiheet on täytetty
- [ ] **ONBOARD-02**: Vaihe 1 — Paikka: hae olemassa oleva tai luo uusi; paikan nimi ja osoite esitäytetty haun perusteella
- [ ] **ONBOARD-03**: Vaihe 2 — Mediat: ladataan 1–5 kuvaa ja logo Supabase Storageen (`business-media`-bucket); edistymispalkki latauksen ajan
- [ ] **ONBOARD-04**: Vaihe 3 — Hinnasto: hinnat kategorioittain (kertakäynti, jäsenyys, kuukausihinta jne.); vähintään yksi hintarivi pakollinen
- [ ] **ONBOARD-05**: Vaihe 4 — Aukioloajat: Google Places -data esitäytettynä (jos saatavilla), yritys voi muokata tai syöttää manuaalisesti
- [ ] **ONBOARD-06**: Vaihe 5 — Yhteystiedot: puhelin, sähköposti, website, lyhyt kuvaus palvelusta (max 300 merkkiä)
- [ ] **ONBOARD-07**: Vaihe 6 — Esikatselu: näyttää miltä paikka näyttää sovelluksessa (PaikkaKortti, DiagonaalKortti, PaikkaSheet) yrityksen syöttämillä tiedoilla

### Admin-hyväksyntä (ADMIN)

- [ ] **ADMIN-01**: Uusi rekisteröityminen ja claim-pyyntö lähettää sähköposti-ilmoituksen admin-osoitteeseen (joona.orava@gmail.com)
- [ ] **ADMIN-02**: `/admin`-sivu listaa odottavat hakemukset; admin näkee yrityksen tiedot, pyydetyn paikan ja ladatut kuvat
- [ ] **ADMIN-03**: Admin voi hyväksyä tai hylätä hakemuksen; hylkäykseen kirjoitetaan syy
- [ ] **ADMIN-04**: Hyväksytty yritys saa vahvistussähköpostin; hylätty yritys saa ilmoituksen syyllä
- [ ] **ADMIN-05**: `/admin`-sivu on suojattu: näkyy vain Supabase Auth -käyttäjälle jolla `is_admin = true` profiles-taulussa

### Hallintapaneeli (BIZPANEL)

- [ ] **BIZPANEL-01**: `/business`-sivu näyttää listan yrityksen paikoista ja niiden tilan (pending / approved)
- [ ] **BIZPANEL-02**: Yritys voi muokata kaikkia onboarding-tietoja (kuvat, logo, hinnasto, aukioloajat, yhteystiedot) — muutokset julkaistaan heti ilman erillistä hyväksyntää
- [ ] **BIZPANEL-03**: Hallintapaneelissa on esikatselu-näkymä joka näyttää miten paikka näyttää sovelluksen käyttäjille

### Data & tietoturva (DATA)

- [ ] **DATA-09**: `business_managed`-boolean paikat-taulussa; Google Places sync-skripti ohittaa managed-paikat kokonaan
- [ ] **DATA-10**: Supabase Storage `business-media`-bucket; RLS-politiikka: vain paikan omistava yritys (`business_paikka_links`) voi kirjoittaa omaan hakemistoonsa

## Future Requirements (deferred)

- Automaattinen väriteemat kuvista (dominant color extraction → teksti-/taustaväri korteille)
- Maksullisuus: sponsored-paketti yrityksille (näkyvyysnosto, Sponsoroitu-badge)
- Ketjuadmin: yksi yritystili, useita toimipisteitä eri omistajilla
- Yritysanalytiikka: näyttökerrat, klikkaukset, suosikki-lisäykset per paikka
- Yrityksen vastaus arvosteluihin
- Lisäkielet hallintapaneelissa (FI/EN)

## Out of Scope

- Maksuintegraatio (Stripe tms.) — ei osteta sovelluksessa v1.7:ssä
- Erillinen Supabase-projekti yrityksille — sama Auth kuin tavallisilla käyttäjillä
- URL-pohjainen locale-routing — säilytetään nykyinen URL-sopimus
- Automaattinen yritysverifikaatio (Y-tunnus-tarkistus tms.) — manuaalinen admin-hyväksyntä riittää

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| BIZ-01 | TBD | Pending |
| BIZ-02 | TBD | Pending |
| BIZ-03 | TBD | Pending |
| CLAIM-01 | TBD | Pending |
| CLAIM-02 | TBD | Pending |
| CLAIM-03 | TBD | Pending |
| ONBOARD-01 | TBD | Pending |
| ONBOARD-02 | TBD | Pending |
| ONBOARD-03 | TBD | Pending |
| ONBOARD-04 | TBD | Pending |
| ONBOARD-05 | TBD | Pending |
| ONBOARD-06 | TBD | Pending |
| ONBOARD-07 | TBD | Pending |
| ADMIN-01 | TBD | Pending |
| ADMIN-02 | TBD | Pending |
| ADMIN-03 | TBD | Pending |
| ADMIN-04 | TBD | Pending |
| ADMIN-05 | TBD | Pending |
| BIZPANEL-01 | TBD | Pending |
| BIZPANEL-02 | TBD | Pending |
| BIZPANEL-03 | TBD | Pending |
| DATA-09 | TBD | Pending |
| DATA-10 | TBD | Pending |
