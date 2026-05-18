# Requirements — Liikuntahakemisto

## v1 Requirements

### Security & Foundation

- [ ] **SEC-01**: Käyttäjä ei voi triggeröidä Google Places API -hakuja ilman admin-autentikaatiota (`/api/hae-paikat` vaatii Authorization-headerin)
- [ ] **SEC-02**: URL-routaus on yhtenäinen — `?nakyma=kartta` toimii kaikkialta (BottomNav, siirtymät, suorat linkit)
- [ ] **SEC-03**: Supabase-tauluissa on RLS-politiikat — anon-avain sallii vain lukemisen
- [ ] **SEC-04**: Käyttäjä näkee ystävällisen virhe- ja lataussivun (ei Next.js stacktrace tai tyhjää ruutua)

### Map & GPS

- [ ] **MAP-01**: Käyttäjä voi pyytää sijaintinsa ja nähdä lähellä olevat palvelut kartalla; jos lupa evätään, Tampere-keskusta on hiljaa oletussijainti
- [ ] **MAP-02**: Jokainen palvelukortti näyttää etäisyyden käyttäjästä ("1,2 km")
- [ ] **MAP-03**: Karttakomponentti toimii `@vis.gl/react-google-maps` -kirjastolla (AdvancedMarker, ei double-load flashia)

### Data Architecture

- [ ] **DATA-01**: Palveluiden aukioloajat haetaan automaattisesti Google Place Details -haulla ja tallennetaan Supabaseen
- [ ] **DATA-02**: Tietokanta kattaa useita lajikategorioita: kuntosali, padel, uinti, jooga, kiipeily, jääkiekko ja muut
- [ ] **DATA-03**: Tampere-alueen top 20 palvelun kertakäyntihinta on syötetty manuaalisesti Supabaseen
- [ ] **DATA-04**: Supabase-schema sisältää kentät: `hinta_kuvaus text`, `aukioloajat jsonb`, `lajit_lista jsonb`, `featured boolean`

### UI & Service Information

- [ ] **UI-01**: Palvelukortti näyttää aukioloajat ilman klikkaamista
- [ ] **UI-02**: Palvelukortti näyttää "Auki nyt" / "Suljettu" -badgen ja käyttäjä voi suodattaa vain avoinna olevat
- [ ] **UI-03**: Palvelukortti näyttää "Kertakäynti OK" -badgen kun palvelu sallii kertakäynnin
- [ ] **UI-04**: Palvelun profiilisivu näyttää hinta- ja aukioloajat kattavasti

### AI Widget

- [ ] **AI-01**: Etusivun AI-widget näyttää sääpohjaisen suosituksen (Claude Haiku + Open-Meteo) suomeksi
- [ ] **AI-02**: AI-widget latautuu ei-blokkaavasti — staattinen fallback näkyy heti, AI-teksti täydentää kun valmis
- [ ] **AI-03**: AI-widgetin vastaus tallennetaan `sessionStorage`-välimuistiin — saman päivän uudelleenlataukset eivät hae API:sta uudestaan

### Ad Placeholder

- [ ] **ADS-01**: Supabasessa on `featured boolean` -kenttä palveluille — mainostilan infrastruktuuri varattuna (ei myyntiä v1:ssä)

---

## v2 Requirements (Deferred)

Nämä ovat tunnistettuja jatkokehityskohteita jotka eivät kuulu v1:een.

- PostGIS-spatiaali-indeksi sijaintikyselyille (skaalautuvuus, tarvitaan >1000 palvelua)
- LIPAS-integraatio (Suomen liikuntapaikkarekisteri) — datakattavuus vahvistettava ensin
- Käyttäjätilit ja kirjautuminen — personoitu suosittelu, suosikit pysyvät
- Suosikit (tallentuvat selaimeen sessioniin v1, tiliin v2)
- Monikielinen tuki (suomi / englanti) — matkailijat hyötyisivät
- PWA (offline-tuki, kotinäyttöön lisääminen)
- Tampere-laajentuminen muihin kaupunkeihin
- GDPR-tietosuojasivu (pakollinen ennen laajaa käyttäjähankintaa)
- Toimiva mainosmyynti (nostetut kortit "Sponsoroitu"-badgellä)

---

## Out of Scope

- Varausjärjestelmä — linkitetään palveluntarjoajan omalle sivulle
- Arvostelut ja käyttäjäkommentit — sosiaalinen elementti v2+
- Reaaliaikainen paikkatieto (kapasiteetti, jonot) — vaatii venue-API-integraation per paikka
- Mobiiliappi (iOS/Android) — web-first ensin
- Maksujärjestelmä — ei osteta sovelluksessa

---

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| SEC-01 | — | Pending |
| SEC-02 | — | Pending |
| SEC-03 | — | Pending |
| SEC-04 | — | Pending |
| MAP-01 | — | Pending |
| MAP-02 | — | Pending |
| MAP-03 | — | Pending |
| DATA-01 | — | Pending |
| DATA-02 | — | Pending |
| DATA-03 | — | Pending |
| DATA-04 | — | Pending |
| UI-01 | — | Pending |
| UI-02 | — | Pending |
| UI-03 | — | Pending |
| UI-04 | — | Pending |
| AI-01 | — | Pending |
| AI-02 | — | Pending |
| AI-03 | — | Pending |
| ADS-01 | — | Pending |

---

## Definition of Done

Vaatimus on valmis kun:
1. Toiminnallisuus toimii mobiililla (375px) ja desktop-leveydellä
2. Virhetilanteet käsitelty (GPS evätty, API ei vastaa, data puuttuu)
3. Animaatiot vastaavat CLAUDE.md:n Emil Kowalski -periaatteita
4. TypeScript-virheitä ei ole (strict mode)
