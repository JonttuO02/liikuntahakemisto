# Liikuntahakemisto

## What This Is

Suomalainen liikuntapalveluiden hakemisto ja löytämisalusta. Kokoaa suomalaisten kaupunkien liikuntapalvelut yhteen — aukioloajat, hinnat, GPS-pohjainen sijaintihaku, ja sääpohjainen AI-suositus. Tarkoitettu sekä paikallisille että matkailijoille jotka etsivät kertakäyntiä läheltä.

## Current Milestone: v1.1 Käyttäjät, Kartta & Laatu

**Goal:** Lisätään käyttäjätilit ja suosikit, parannetaan karttakokemusta merkittävästi, hiotaan listakorttien UI, laajennetaan Helsinki + Turku, ja lisätään PWA, GDPR-sivu sekä toimiva mainosmyynti.

**Target features:**
- Supabase Auth: email + Google OAuth, suosikit tietokannassa
- Kartta: re-center-nappi, zoom-perusteinen ryppäät→info-kortit, GPS-tarkkuusrengas
- "Näytä kartalla" avaa oman karttanäkymän zoomattuna (ei Google Maps)
- Listakorttien UI: hinnat ylös, "vain jäsenyys" -teksti, "Varaa aika" pois listasta
- Lajifiltteri: pudotusvalikko (yksivalinta)
- AI-widget: paikkakunnan nimi lämpötilan vieressä
- Kaupunkilaajennus: Helsinki + Turku (Google Places sync)
- GDPR-tietosuojasivu
- Mainosmyynti: "Sponsoroitu"-badge featured-paikoille
- PWA: offline-tuki + "Lisää kotinäyttöön"

## History: v1.0 MVP (shipped 2026-05-21)

- **Stack:** Next.js 14 App Router, TypeScript strict, Tailwind v3, Framer Motion, Supabase, @vis.gl/react-google-maps, @anthropic-ai/sdk
- **Data:** Tampere-alueen liikuntapaikat, aukioloajat (Google Places), hinnat (manuaalisesti top 20)
- **Features:** GPS-kartta, aukioloajat-badget, "Auki nyt" filter, profiilisivu, AI-sääwidget
- **Codebase:** ~48 muutettua tiedostoa, +6640 riviä tuotantokoodia

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

### Active (v1.1)

- [ ] AUTH-01: Supabase Auth kirjautuminen (email + Google OAuth)
- [ ] AUTH-02: Suosikit Supabasessa, synkkaantuu eri laitteiden välillä
- [ ] AUTH-03: Personoitu AI-suosittelu suosikkien perusteella
- [ ] MAP-04: Re-center-nappi käyttäjän sijaintiin kartalla
- [ ] MAP-05: GPS-tarkkuusrengas sijaintimerkissä
- [ ] MAP-06: Zoom-perusteinen näkymä — ryppäät → info-kortit
- [ ] MAP-07: "Näytä kartalla" avaa oman karttanäkymän zoomattuna
- [ ] UI-05: "Kertakäynti OK" → hinta jos saatavilla, muuten "vain jäsenyys"
- [ ] UI-06: Hintatiedot ylös kortissa, useampi hinta omille riveille
- [ ] UI-07: "Varaa aika" -nappi pois listakortista; profiilisivulla URL-teksti
- [ ] UI-08: Lajifiltteri pudotusvalikkona (yksivalinta)
- [ ] AI-04: Paikkakunnan nimi lämpötilan vieressä AI-widgetissä
- [ ] DATA-05: Helsinki-alueen liikuntapaikat tietokannassa
- [ ] DATA-06: Turku-alueen liikuntapaikat tietokannassa
- [ ] DATA-07: Kaupunki-kenttä skeemassa + kaupunkifiltteri UI:ssa
- [ ] LEGAL-01: GDPR-tietosuojasivu (/tietosuoja)
- [ ] ADS-02: "Sponsoroitu"-badge featured-paikoille listassa ja kartalla
- [ ] PWA-01: Service worker + offline-tuki perusnäkymille
- [ ] PWA-02: Web App Manifest + "Lisää kotinäyttöön" -prompt

### Out of Scope

- Varausjärjestelmä — linkitetään palveluntarjoajan omaan sivuun
- Arvostelut ja käyttäjäkommentit — v2+
- Reaaliaikainen paikkatieto (kapasiteetti, jonot) — vaatii venue-API-integraation per paikka
- Mobiiliappi (iOS/Android) — web-first ensin
- Maksujärjestelmä — ei osteta sovelluksessa

## Context

**Nykytila:** v1.1 suunnitteilla. v1.0 kaikki 19 vaatimusta toimitettu ja arkistoitu.

**Data-arkkitehtuuri:** Google Places API hakee automaattisesti aukioloajat → upsertit Supabaseen. Kertakäyntihinnat manuaalisesti top 20 palvelulle. AI-widget: Claude Haiku + Open-Meteo, sessionStorage-cache per kalenteripäivä. v1.1 lisää kaupunki-kentän skeemaan ja Supabase Auth -käyttäjätaulut.

**Tekninen ympäristö:** Next.js 14 App Router, React 18, TypeScript strict, Tailwind v3, Framer Motion, Supabase (Postgres + RLS + Auth), Google Maps/Places API, Open-Meteo, @anthropic-ai/sdk, Vitest.

**Data ops (manuaaliset):** `/api/admin/sync-paikat` — aukioloajat, `npx tsx scripts/seed-hinnat.ts` — hinnat.

## Constraints

- **Stack**: Next.js 14 + Supabase + Tailwind v3 — ei vaihdeta runkoa
- **Design**: Indigo-väripaletti (CLAUDE.md), Emil Kowalski -animaatiofilosofia
- **Data**: GOOGLE_PLACES_API_KEY server-only, kartta client-side (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)
- **Kirjautuminen**: Supabase Auth v1.1:ssä — suosikit vaativat tilin, kaikki muu toimii anonyymisti

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js App Router + Supabase | Nopea kehitys, skaalautuva, hyvä SSR-tuki | ✓ Toimii hyvin |
| Kartta etusivun pääominaisuus | GPS-pohjainen löytäminen on ydinkokemus | ✓ Toteutettu 3D→fullscreen |
| Ei kirjautumista v1:ssä | Matala kynnys, nähdään käyttö ennen pakottamista | ✓ Kaikki anonyymi |
| Tampere-first | Fokus ensin, skaalaus myöhemmin | ✓ v1.0 Tampere |
| Sääpohjainen AI-suosittelu | Erilaistava ominaisuus, Open-Meteo ilmainen | ✓ Claude Haiku + sessionStorage |
| Mainostila bisnesmalliksi | Käyttäjille ilmainen, liikunta-ala kohderyhmä | — featured boolean valmis |
| @vis.gl/react-google-maps | Korvasi @react-google-maps/api — ei double-load flashia | ✓ MAP-03 |
| lib/aukiolo.ts single source of truth | Aukioloaika-logiikka yhdessä paikassa, TDD | ✓ Vitest + 100% coverage |
| sessionStorage cache aina (myös fallback) | AI-03: ei re-fetch samana päivänä riippumatta Claude-tilasta | ✓ Bugi korjattu UAT:ssa |

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

*Last updated: 2026-05-21 — v1.1 milestone started*
