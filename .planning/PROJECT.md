# Liikuntahakemisto

## What This Is

Suomalainen liikuntapalveluiden hakemisto ja löytämisalusta. Kokoaa suomalaisten kaupunkien liikuntapalvelut yhteen — aukioloajat, hinnat, GPS-pohjainen sijaintihaku, ja sääpohjainen AI-suositus. Käyttäjät voivat luoda tilin, tallentaa suosikkipaikkoja ja saada personoituja AI-suosituksia. Sovellus toimii offline-tilassa ja on asennettavissa kotinäyttöön (PWA). Tarkoitettu sekä paikallisille että matkailijoille jotka etsivät kertakäyntiä läheltä — kolmessa kaupungissa (Tampere, Helsinki, Turku).

## Current Milestone: v1.3 AKTIIVI — Redesign & Polish

**Goal:** Uudistetaan brändi AKTIIVIKSI, rakennetaan animoitu logo-uloke bottom sheetiin, korjataan toolbar/haku-UX ja uudistetaan kartan pinnit sekä korttianimaatiot.

**Target features:**
- Rebrand: sovelluksen nimi → AKTIIVI (meta-tagit, manifest, otsikko)
- Bottom sheet logo-uloke — aina näkyvä tab, AKTIIVI-logo SVG, värianimaatio avatessa
- Toolbar UX-korjaus — haku+filtteri yhdistetty, lista-toggle erillinen nappi
- Kartan pinnit — yhtenäinen väri + custom SVG -ikonit lajeittain
- Päällekkäisten pinnien klusterointi samassa osoitteessa
- Kartan korttianimaatio — in-place laajeneminen, ei alareuna-kortti

---

## Shipped: v1.2 UI-uudistus & Arvostelut (2026-05-28)

**Delivered:** Hakupaneeli etusivulle (LiikuntapaikatLista poistettu), DiagonaalKortti diagonal split -korttimalli, /profiili-sivu kotikaupunki-kentällä, AI kotona/reissussa -konteksti, arvostelusysteemi (tähtiarvosana + teksti + anonyymi/julkinen + käyntipäivä + ruuhka-arvio, max 1/käyttäjä/paikka).

## Core Value

Löydät läheltäsi minkä tahansa liikuntapalvelun, näet hinnan ja aukioloajat, ja pääset liikkumaan — ilman hakua, ilman kirjautumista.

## Requirements

### Validated (v1.0)

- ✓ Liikuntapaikkojen listausnäkymä lajifiltterillä — existing
- ✓ Karttatoggle (lista ↔ kartta) — existing
- ✓ Google Maps -karttakomponentti pineineen — existing
- ✓ Paikan profiilisivu (detail view) — existing
- ✓ Supabase-backend paikkatiedoille — existing
- ✓ Google Places API -integraatio automaattiseen datahakuun — existing
- ✓ PaikkaKortti-komponentti (nimi, laji, osoite, CTA) — existing
- ✓ Mobiilinavigaatio (BottomNav + NavBar) — existing
- ✓ Framer Motion -animaatiot (scroll, card hover, filter) — existing
- ✓ SEC-01: /api/hae-paikat Authorization-suojattu — v1.0
- ✓ SEC-02: URL-routaus yhtenäinen (?nakyma=kartta) — v1.0
- ✓ SEC-03: RLS-politiikat, anon-avain read-only — v1.0
- ✓ SEC-04: Ystävälliset virhesivut suomeksi — v1.0
- ✓ MAP-01: GPS-sijaintihaku + Tampere-fallback — v1.0
- ✓ MAP-02: Etäisyysmerkkijono palvelukorteilla — v1.0
- ✓ MAP-03: @vis.gl/react-google-maps, ei double-load — v1.0
- ✓ DATA-01: Aukioloajat Google Places -haulla Supabaseen — v1.0
- ✓ DATA-02: 7+ lajikategoriaa tietokannassa — v1.0
- ✓ DATA-03: Top 20 hinnat syötetty Supabaseen — v1.0
- ✓ DATA-04: Schema: hinta_kuvaus, aukioloajat, lajit_lista, featured — v1.0
- ✓ UI-01: Aukioloajat palvelukortilla ilman klikkaamista — v1.0
- ✓ UI-02: "Auki nyt" badge + filter — v1.0
- ✓ UI-03: "Kertakäynti OK" badge — v1.0
- ✓ UI-04: Profiilisivu: täydet aukioloajat + hinta — v1.0
- ✓ AI-01: Claude Haiku sääsuositus suomeksi — v1.0
- ✓ AI-02: Non-blocking AI widget, fallback heti — v1.0
- ✓ AI-03: sessionStorage cache, ei re-fetch samana päivänä — v1.0
- ✓ ADS-01: featured boolean -kenttä Supabasessa — v1.0

### Validated (v1.1)

- ✓ LEGAL-01: GDPR-tietosuojasivu (/tietosuoja) — v1.1
- ✓ ADS-02: "Sponsoroitu"-badge featured-paikoille listassa ja kartalla — v1.1
- ✓ AI-04: AI-widgetissä näkyy paikkakunnan nimi lämpötilan vieressä — v1.1
- ✓ UI-05: Listakortissa näytetään kertakäyntihinta; muuten "vain jäsenyys" — v1.1
- ✓ UI-06: Hintatiedot kortin yläosassa, useampi hinta omilla riveillään — v1.1
- ✓ UI-07: "Varaa aika" poistettu listakortista; profiilisivulla URL-teksti — v1.1
- ✓ UI-08: Lajifiltteri pudotusvalikko (yksivalinta) — v1.1
- ✓ DATA-07: Kaupunki-kenttä skeemassa + kaupunkifiltteri UI:ssa — v1.1
- ✓ MAP-04: Re-center-nappi karttanäkymässä — v1.1
- ✓ MAP-05: GPS-tarkkuusrengas sijaintimerkissä — v1.1
- ✓ MAP-06: Zoom-perusteinen pin→info-kortti-muutos — v1.1
- ✓ MAP-07: "Näytä kartalla" avaa oman karttanäkymän zoomattuna — v1.1
- ✓ AUTH-01: Supabase Auth kirjautuminen (email + Google OAuth) — v1.1
- ✓ AUTH-02: Suosikit Supabasessa, synkkaantuu laitteiden välillä — v1.1
- ✓ AUTH-03: Personoitu AI-suosittelu suosikkien perusteella — v1.1
- ✓ DATA-05: Helsinki-alueen liikuntapaikat tietokannassa — v1.1
- ✓ DATA-06: Turku-alueen liikuntapaikat tietokannassa — v1.1
- ✓ PWA-01: Service worker + offline-tuki perusnäkymille — v1.1
- ✓ PWA-02: Web App Manifest + "Lisää kotinäyttöön" -prompt — v1.1

### Validated (v1.2)

- ✓ UI-09: Hakukenttä etusivun vasemmasta toolbarista (ei erillistä listasivua) — Phase 12
- ✓ UI-10: Hakutulokset korttilistana etusivulla (diagonaalinen korttimalli) — Phase 12
- ✓ UI-11: /?nakyma=lista poistettu; LiikuntapaikatLista-komponentti poistettu — Phase 12
- ✓ UI-12: Uusi korttimalli — vasen: tiedot, oikea: Google Static Maps snapshot — Phase 13
- ✓ REVIEW-01: Kirjautunut käyttäjä voi jättää arvostelun (tähtiarvosana + teksti), max 1/paikka — Phase 15
- ✓ REVIEW-02: Arvostelija valitsee näkyykö nimi vai anonyymi — Phase 15
- ✓ REVIEW-03: Arvostelu sisältää käyntipäivän + ruuhka-arvion — Phase 15
- ✓ REVIEW-04: Paikan profiilisivu näyttää arvostelut + tähtiarvosanojen keskiarvo — Phase 15
- ✓ AI-05: Kotikaupunki profiiliin; AI-suositus tunnistaa kotona/reissussa-kontekstin — Phase 14

### Active (v1.3)

- [ ] BRAND-01: Sovelluksen brändinimi → AKTIIVI (meta-tagit, manifest, otsikko)
- [ ] UI-13: Bottom sheet -uloke aina näkyvissä, toimii avauspainikkeena
- [ ] UI-14: AKTIIVI-logo ulokkeessa ja sheetin yläreunassa auki-tilassa
- [ ] UI-15: Logon tekstiväri vaihtuu animaatiolla joka kerta kun sheet avataan (5 sporttista liukuväriä)
- [ ] UI-16: Sulkiessa väri pysyy — ei resetoidu
- [ ] UI-17: Haku + filtterit yhdistetty yhteen nappiin, toimii kartta- ja listanäkymässä
- [ ] UI-18: Erillinen nappi lista-näkymän toggle
- [ ] MAP-08: Pinnit yhtenäinen väri + custom SVG -ikonit lajeittain
- [ ] MAP-09: Sama-osoite-pinnit klusteriksi
- [ ] MAP-10: Pinnikortti laajenee in-place animaatiolla — ei alareuna-kortti

### Future (deferred from v1.1)

- Suosikkipaikat-sivu kirjautuneelle käyttäjälle (/suosikit)
- Kartta: etäisyyspohjainen suodatus
- Käyttäjäprofiili ja asetukset (laaja)

### Out of Scope

- Varausjärjestelmä — linkitetään palveluntarjoajan omaan sivuun
- Reaaliaikainen paikkatieto (kapasiteetti, jonot) — vaatii venue-API-integraation per paikka
- Mobiiliappi (iOS/Android) — web-first ensin, PWA riittää
- Maksujärjestelmä — ei osteta sovelluksessa
- Klusterointi (cluster markers) — korvattu zoom-perusteisella pin→kortti-muutoksella
- Push-ilmoitukset — ei tarvetta v1.1:ssä
- Anonyymi Supabase-tili — suosikit vaativat oikean kirjautumisen

## Context

**Nykytila:** v1.2 toimitettu 2026-05-28. Kaikki 9 v1.2-vaatimusta toteutettu. Sovellus toimii Tampereen, Helsingin ja Turun alueella. Käyttäjätilit, suosikit, profiilisivu, arvostelusysteemi ja personoitu AI-suosittelu live. PWA asennettavissa ja toimii offline-tilassa. Erillinen listanäkymäsivu poistettu — haku ja korttilistaus integroitu etusivulle.

**Data-arkkitehtuuri:** Google Places API hakee automaattisesti aukioloajat → upsertit Supabaseen. Kertakäyntihinnat manuaalisesti top 20 palvelulle. AI-widget: Claude Haiku + Open-Meteo, sessionStorage-cache per kalenteripäivä + per kaupunki. Supabase Auth käyttäjätaulut + suosikit (user_id → paikka_id). Sync-skripti tukee ?kaupunki= parametria Helsinki/Turku/Tampere-datalle.

**Tekninen ympäristö:** Next.js 14 App Router, React 18, TypeScript strict, Tailwind v3, Framer Motion, Supabase (Postgres + RLS + Auth + @supabase/ssr), Google Maps/Places API, Open-Meteo, @anthropic-ai/sdk, @serwist/next + serwist (PWA), Vitest.

**Data ops (manuaaliset):** `/api/admin/sync-paikat?kaupunki=Helsinki|Turku|Tampere` — aukioloajat, `npx tsx scripts/seed-hinnat.ts` — hinnat.

## Constraints

- **Stack**: Next.js 14 + Supabase + Tailwind v3 — ei vaihdeta runkoa
- **Design**: Glassmorphism + Indigo-väripaletti (CLAUDE.md), Emil Kowalski -animaatiofilosofia
- **Data**: GOOGLE_PLACES_API_KEY server-only, kartta client-side (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)
- **Kirjautuminen**: Supabase Auth — suosikit vaativat tilin, kaikki muu toimii anonyymisti
- **PWA**: Serwist (@serwist/next + serwist) — next-pwa ja @ducanh2912/next-pwa hylätty

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js App Router + Supabase | Nopea kehitys, skaalautuva, hyvä SSR-tuki | ✓ Toimii hyvin |
| Kartta etusivun pääominaisuus | GPS-pohjainen löytäminen on ydinkokemus | ✓ Toteutettu bottom sheet -arkkitehtuurilla |
| Ei kirjautumista v1:ssä | Matala kynnys, nähdään käyttö ennen pakottamista | ✓ Kaikki anonyymi v1.0:ssa |
| Tampere-first | Fokus ensin, skaalaus myöhemmin | ✓ v1.0 Tampere; v1.1 +Helsinki +Turku |
| Sääpohjainen AI-suosittelu | Erilaistava ominaisuus, Open-Meteo ilmainen | ✓ Claude Haiku + sessionStorage + personointi |
| Mainostila bisnesmalliksi | Käyttäjille ilmainen, liikunta-ala kohderyhmä | ✓ Sponsoroitu-badge v1.1 |
| @vis.gl/react-google-maps | Korvasi @react-google-maps/api — ei double-load flashia | ✓ MAP-03 |
| lib/aukiolo.ts single source of truth | Aukioloaika-logiikka yhdessä paikassa, TDD | ✓ Vitest + 100% coverage |
| sessionStorage cache aina (myös fallback) | AI-03: ei re-fetch samana päivänä riippumatta Claude-tilasta | ✓ Bugi korjattu UAT:ssa |
| Supabase Auth per-request createServerClient | Ei jaeta auth-singletoneja requestien välillä | ✓ Phase 9 |
| toggleSuosikki kutsuu getUser() joka kerta | Vältää vanhentuneen auth-staten closureen jääminen | ✓ Phase 9 |
| AI route: GET anon / POST kirjautunut | Cache-avain sisältää suosikkimäärän suffiksin | ✓ Phase 9 |
| Map focus URL: /?id=<paikka_id> | Ei ?nakyma=kartta (dead param per CLAUDE.md); sheet ei aukea | ✓ Phase 8 |
| Serwist PWA (ei next-pwa) | next-pwa ja @ducanh2912/next-pwa hylätty/abandoned | ✓ Phase 11 |
| themeColor viewport exportissa | Next.js 14 metadata deprecation vältetty | ✓ Phase 11 |
| offline/page.tsx käyttää <a href> | SW voi interceptoida kun client-side router ei saatavilla | ✓ Phase 11 |
| kotikaupunki erillisessä profiles-taulussa | user_id FK → auth.users; browser client + RLS writes (anon key) | ✓ Phase 14 |
| buildReissuKonteksti palauttaa string \| null | null = ei kotikaupunkia → prompt identtinen Phase 9:n kanssa | ✓ Phase 14 |
| reviews SELECT USING(true) | Arvostelut ovat julkisia (REVIEW-04); poikkeaa profiles/suosikit-mallista | ✓ Phase 15 |
| reviewer_name = email prefix (split('@')[0]) | T-15-02: user_id ja täysi sähköposti eivät koskaan renderöidy julkisesti | ✓ Phase 15 |
| computeAvgRating palauttaa raakakeskiarvon | Pyöristys renderöintiaikaan — helppo testata tasavertaisesti | ✓ Phase 15 |
| onConflict: 'user_id,paikka_id' upsertissä | Max 1 arvostelu/käyttäjä/paikka compositeUNIQUE:lla | ✓ Phase 15 |

---

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---

*Last updated: 2026-05-29 — v1.3 milestone started (AKTIIVI — Redesign & Polish)*
